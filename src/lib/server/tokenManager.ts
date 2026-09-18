import { CONFIG } from "./config.js";
import { logger } from "./logger.js";

export class TokenManager {
	private static instance: TokenManager;
	public accessToken: string | null = null;
	public refreshToken: string | null = null;
	public expiresAt: number = 0; // Milliseconds Unix timestamp
	public tokenType: string = "Bearer";

	public static getInstance(): TokenManager {
		if (!TokenManager.instance) {
			TokenManager.instance = new TokenManager();
		}
		return TokenManager.instance;
	}

	public async getValidToken(): Promise<string> {
		const now = Date.now();
		const bufferMs = CONFIG.TOKEN_REFRESH_BUFFER_SECONDS * 1000;
		if (this.accessToken && this.expiresAt - now > bufferMs) {
			return this.accessToken;
		}

		if (this.refreshToken) {
			try {
				const ok = await this.refresh();
				if (ok) return this.accessToken as string;
			} catch (err) {
				logger.warn(
					"TokenManager",
					`Làm mới token thất bại, chuyển sang đăng nhập lại: ${(err as Error).message}`,
				);
			}
		}

		return await this.login();
	}

	public async login(): Promise<string> {
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TOKEN}`;
		const grantType = CONFIG.AUTH.GRANT_TYPE || "api_cslt";
		const params = new URLSearchParams({
			username: CONFIG.AUTH.USERNAME,
			password: CONFIG.AUTH.PASSWORD,
			"grant-type": grantType,
			grant_type: grantType,
		});

		logger.info(
			"TokenManager",
			`Gửi yêu cầu đăng nhập OAuth tới: ${url} (username=${CONFIG.AUTH.USERNAME})`,
		);

		let res: Response;
		try {
			res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: CONFIG.AUTH.BASIC_AUTH,
				},
				body: params.toString(),
			});
		} catch (fetchErr) {
			const rawMsg =
				fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
			const errMsg = `Không thể kết nối đến máy chủ OAuth BCA (${url}): ${rawMsg}`;
			logger.error("TokenManager", errMsg);
			throw new Error(errMsg);
		}

		if (!res.ok) {
			const err = await res.text();
			const errMsg = `Đăng nhập OAuth thất bại (HTTP ${res.status}): ${err}`;
			logger.error("TokenManager", errMsg);
			throw new Error(errMsg);
		}

		const data = (await res.json()) as Record<string, unknown>;
		this.saveToken(data);
		if (!this.accessToken) {
			const errMsg = `Phản hồi OAuth không chứa AccessToken: ${JSON.stringify(data)}`;
			logger.error("TokenManager", errMsg);
			throw new Error(errMsg);
		}
		logger.info(
			"TokenManager",
			`Đăng nhập OAuth thành công! Token có hiệu lực đến ${new Date(this.expiresAt).toISOString()}`,
		);
		return this.accessToken;
	}

	public async refresh(): Promise<string> {
		if (!this.refreshToken) throw new Error("Không có refresh token");
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}?refresh_token=${encodeURIComponent(this.refreshToken)}`;
		const res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: "Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA=",
			},
		});

		if (!res.ok) {
			return this.login();
		}

		const data = (await res.json()) as Record<string, unknown>;
		this.saveToken(data);
		if (!this.accessToken) {
			return this.login();
		}
		return this.accessToken;
	}

	public async revoke(): Promise<boolean> {
		if (!this.accessToken) return true;
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REVOKE}?access_token=${encodeURIComponent(this.accessToken)}`;

		try {
			const res = await fetch(url, {
				method: "DELETE",
				headers: {
					Authorization: "Basic QVBJX0MwNjp4aGhtUWE2eVZJbGZDRHA=",
				},
			});
			this.clear();
			return res.ok;
		} catch {
			this.clear();
			return false;
		}
	}

	public async revokeToken(): Promise<boolean> {
		return this.revoke();
	}

	private saveToken(resData: Record<string, unknown>): void {
		const payload = (resData.data || resData) as Record<string, unknown>;
		const token = (payload.AccessToken ||
			payload.access_token ||
			payload.accessToken ||
			resData.AccessToken ||
			resData.access_token ||
			resData.accessToken) as string;
		const refresh = (payload.RefreshToken ||
			payload.refresh_token ||
			payload.refreshToken ||
			resData.RefreshToken ||
			resData.refresh_token ||
			resData.refreshToken ||
			null) as string | null;

		let expMs: number;
		if (payload.Exp || resData.Exp) {
			const expSec = Number(payload.Exp || resData.Exp);
			expMs = expSec * 1000;
		} else {
			const expiresIn = Number(
				payload.expires_in ||
					payload.expiresIn ||
					resData.expires_in ||
					resData.expiresIn ||
					3600,
			);
			expMs = Date.now() + expiresIn * 1000;
		}

		this.accessToken = token || null;
		this.refreshToken = refresh;
		this.expiresAt = expMs;
		this.tokenType =
			(payload.TokenType as string) ||
			(payload.token_type as string) ||
			"Bearer";
	}

	public clear(): void {
		this.accessToken = null;
		this.refreshToken = null;
		this.expiresAt = 0;
	}

	public getStatus() {
		const now = Date.now();
		return {
			hasToken: Boolean(this.accessToken),
			accessToken: this.accessToken
				? `${this.accessToken.substring(0, 15)}...`
				: null,
			expiresAt: Math.floor(this.expiresAt / 1000),
			expiresInSeconds: this.expiresAt
				? Math.max(0, Math.floor((this.expiresAt - now) / 1000))
				: 0,
		};
	}
}

export const tokenManager = TokenManager.getInstance();
