import { CONFIG } from "./config.js";
import { logger } from "./logger.js";
import { type TokenManager, tokenManager } from "./tokenManager.js";

export interface ApiResponse<T = unknown> {
	success: boolean;
	code: string | number;
	message: string;
	requestId?: string;
	raw?: T;
}

export class KbttClient {
	private tokenManager: TokenManager;

	public constructor(tm: TokenManager = tokenManager) {
		this.tokenManager = tm;
	}

	public async submitVietnameseGuests(
		payloads: Record<string, unknown>[],
	): Promise<ApiResponse> {
		return this._postPayload(
			CONFIG.ENDPOINTS.KBTT_VIETNAM,
			payloads,
			"Thông báo lưu trú (VN)",
		);
	}

	public async sendVietnam(
		payloads: Record<string, unknown>[],
	): Promise<ApiResponse> {
		return this.submitVietnameseGuests(payloads);
	}

	public async submitForeignGuests(
		payloads: Record<string, unknown>[],
	): Promise<ApiResponse> {
		return this._postPayload(
			CONFIG.ENDPOINTS.KBTT_FOREIGN,
			payloads,
			"Thông báo lưu trú (Nước ngoài)",
		);
	}

	public async sendForeign(
		payloads: Record<string, unknown>[],
	): Promise<ApiResponse> {
		return this.submitForeignGuests(payloads);
	}

	public async doiNgayTraPhong(
		payloads: {
			loai: "TS" | "GH";
			soGiayTo: string;
			loaiGiayTo: number;
			thoiGianStr?: string;
		}[],
	): Promise<ApiResponse> {
		return this._postPayload(
			CONFIG.ENDPOINTS.DOI_NGAY_TRA_PHONG,
			payloads,
			"Đổi ngày trả phòng / Gia hạn lưu trú (VN)",
		);
	}

	private async _postPayload(
		endpoint: string,
		payloads: unknown[],
		actionName: string,
	): Promise<ApiResponse> {
		const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		const token = await this.tokenManager.getValidToken();
		if (!token) {
			const errMsg = `[${requestId}] Không tìm thấy hoặc không thể lấy AccessToken hợp lệ`;
			logger.error("KbttClient", errMsg);
			throw new Error(errMsg);
		}

		const url = `${CONFIG.BASE_URL}${endpoint}`;
		logger.info(
			"KbttClient",
			`[${requestId}] [${CONFIG.currentEnv.toUpperCase()}] Gửi ${actionName} tới: ${url} (${payloads.length} bản ghi)`,
			{ requestId, payloads },
		);

		let res: Response | null = null;
		let lastError: Error | null = null;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				res = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
						"X-Request-ID": requestId,
					},
					body: JSON.stringify(payloads),
				});
				break;
			} catch (networkErr) {
				lastError = networkErr as Error;
				if (attempt < 3) {
					logger.warn(
						"KbttClient",
						`[${requestId}] Kết nối tới KBTT Server lần ${attempt} thất bại (${lastError.message}), đang thử lại lần ${attempt + 1}...`,
					);
					await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
				}
			}
		}

		if (!res) {
			const errMsg = `[${requestId}] Lỗi mạng khi kết nối tới KBTT Server: ${lastError?.message || "Không thể kết nối"}`;
			logger.error("KbttClient", errMsg);
			throw new Error(errMsg);
		}

		let resData: Record<string, unknown> = {};
		const rawText = await res.text();
		try {
			resData = JSON.parse(rawText) as Record<string, unknown>;
		} catch {
			resData = { message: rawText };
		}

		const isSuccess =
			res.ok && (resData.code === "200" || resData.code === 200);

		const rawMsg =
			(resData.message as string) ||
			(resData.error as string) ||
			(resData.error_description as string);

		const responseMessage =
			rawMsg && String(rawMsg).trim()
				? String(rawMsg).trim()
				: isSuccess
					? "Thành công"
					: `Lỗi HTTP ${res.status}${rawText ? `: ${rawText}` : " (Máy chủ C06 không thể xử lý payload)"}`;

		if (isSuccess) {
			logger.info(
				"KbttClient",
				`[${requestId}] [${CONFIG.currentEnv.toUpperCase()}] ${actionName} THÀNH CÔNG! (HTTP ${res.status}): ${responseMessage}`,
				{ requestId, resData },
			);
		} else {
			logger.error(
				"KbttClient",
				`[${requestId}] [${CONFIG.currentEnv.toUpperCase()}] ${actionName} THẤT BẠI (HTTP ${res.status}, code: ${resData.code}): ${responseMessage}`,
				{ requestId, resData, payloads },
			);
		}

		return {
			success: isSuccess,
			code: (resData.code as string | number) || res.status,
			message: responseMessage,
			requestId,
			raw: resData,
		};
	}
}
