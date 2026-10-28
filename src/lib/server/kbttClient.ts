import type { KbttApiResponse, KbttErrorClass } from "../types/index.js";
import { CONFIG } from "./config.js";
import { classifyKbttResponse } from "./kbttClassifier.js";
import { logger } from "./logger.js";
import { type ITokenManager, tokenManager } from "./tokenManager.js";

type ApiResponse<T = unknown> = KbttApiResponse<T>;

export class KbttClient {
	private tokenManager: ITokenManager;

	public constructor(tm: ITokenManager = tokenManager) {
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
		const startTime = performance.now();
		const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		const token = await this.tokenManager.getValidToken();
		if (!token) {
			const errMsg = `[${requestId}] Không tìm thấy hoặc không thể lấy AccessToken hợp lệ`;
			logger.error("KbttClient", errMsg);
			throw new Error(errMsg);
		}

		const url = `${CONFIG.BASE_URL}${endpoint}`;
		const host = new URL(url).host;
		logger.info(
			"KbttClient",
			`[${requestId}] [${CONFIG.currentEnv.toUpperCase()}] Gửi ${actionName} tới: ${url} (${payloads.length} bản ghi)`,
			{ requestId, payloads },
		);

		let res: Response | null = null;
		let lastError: Error | null = null;
		let ttfbMs: number | undefined;

		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const reqStart = performance.now();
				res = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
						"X-Request-ID": requestId,
					},
					body: JSON.stringify(payloads),
					signal: AbortSignal.timeout(60000),
				});
				ttfbMs = Math.round(performance.now() - reqStart);
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
			const totalMs = Math.round(performance.now() - startTime);
			const classification = classifyKbttResponse({ error: lastError });
			const errMsg = `[${requestId}] Lỗi kết nối tới KBTT Server: ${lastError?.message || "Không thể kết nối"}`;
			logger.error("KbttClient", errMsg);

			return {
				success: false,
				code: "0",
				httpStatus: 0,
				message: classification.message || errMsg,
				requestId,
				durationMs: totalMs,
				ttfbMs,
				errorClass: classification.errorClass,
				outcomeUnknown: classification.outcomeUnknown,
				host,
				raw: { error: lastError?.message || errMsg },
			};
		}

		const cfRay = res.headers.get("cf-ray") || undefined;
		const serverHeader = res.headers.get("server") || undefined;
		const contentType = res.headers.get("content-type") || "";

		let resData: Record<string, unknown> = {};
		const rawText = await res.text();
		const totalMs = Math.round(performance.now() - startTime);

		try {
			resData = JSON.parse(rawText) as Record<string, unknown>;
		} catch {
			resData = { message: rawText };
		}

		const isSuccess =
			res.ok && (resData.code === "200" || resData.code === 200);

		let errorClass: KbttErrorClass | undefined;
		let outcomeUnknown = false;
		let responseMessage = "";

		if (isSuccess) {
			responseMessage = String(resData.message || "Thành công").trim();
			logger.info(
				"KbttClient",
				`[${requestId}] [${CONFIG.currentEnv.toUpperCase()}] ${actionName} THÀNH CÔNG! (HTTP ${res.status}, ${totalMs}ms): ${responseMessage}`,
				{ requestId, resData },
			);
		} else {
			const classification = classifyKbttResponse({
				status: res.status,
				rawText,
				resData,
				contentType,
				serverHeader,
				cfRay,
			});
			errorClass = classification.errorClass;
			outcomeUnknown = classification.outcomeUnknown;
			responseMessage = classification.message;

			logger.error(
				"KbttClient",
				`[${requestId}] [${CONFIG.currentEnv.toUpperCase()}] ${actionName} THẤT BẠI [${errorClass}] (HTTP ${res.status}, code: ${resData.code}, ${totalMs}ms): ${responseMessage}`,
				{ requestId, resData, payloads, cfRay, serverHeader },
			);
		}

		return {
			success: isSuccess,
			code: (resData.code as string | number) || res.status,
			httpStatus: res.status,
			message: responseMessage,
			requestId,
			durationMs: totalMs,
			ttfbMs,
			errorClass,
			outcomeUnknown,
			cfRay,
			serverHeader,
			host,
			raw: resData,
		};
	}
}
