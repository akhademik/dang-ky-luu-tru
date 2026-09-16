import { CONFIG } from "./config.js";
import { tokenManager, TokenManager } from "./tokenManager.js";
import { DataTransformer } from "./dataTransformer.js";

export interface ApiResponse<T = unknown> {
	success: boolean;
	code: string | number;
	message: string;
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

	public async submitForeignGuests(
		payloads: Record<string, unknown>[],
	): Promise<ApiResponse> {
		return this._postPayload(
			CONFIG.ENDPOINTS.KBTT_FOREIGN,
			payloads,
			"Thông báo lưu trú (Nước ngoài)",
		);
	}

	private async _postPayload(
		endpoint: string,
		payloads: unknown[],
		actionName: string,
	): Promise<ApiResponse> {
		const token = await this.tokenManager.getValidToken();
		if (!token) {
			throw new Error("Token không được rỗng");
		}

		const url = `${CONFIG.BASE_URL}${endpoint}`;
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(payloads),
		});

		let resData: Record<string, unknown> = {};
		try {
			resData = (await res.json()) as Record<string, unknown>;
		} catch {
			resData = { message: await res.text() };
		}

		const isSuccess =
			res.ok && (resData.code === "200" || resData.code === 200);
		return {
			success: isSuccess,
			code: (resData.code as string | number) || res.status,
			message:
				(resData.message as string) ||
				(isSuccess ? "Thành công" : `Lỗi ${res.status}`),
			raw: resData,
		};
	}
}
