import { CONFIG } from "./config.js";

export interface TokenState {
	accessToken: string | null;
	refreshToken: string | null;
	expiresAt: number;
	tokenType: string;
}

export class TokenManager {
	private static instance: TokenManager;
	public accessToken: string | null = null;
	public refreshToken: string | null = null;
	public expiresAt: number = 0;
	public tokenType: string = "Bearer";

	public constructor() {}

	public static getInstance(): TokenManager {
		if (!TokenManager.instance) {
			TokenManager.instance = new TokenManager();
		}
		return TokenManager.instance;
	}

	public async getValidToken(): Promise<string | null> {
		const now = Date.now();
		const bufferMs = CONFIG.TOKEN_REFRESH_BUFFER_SECONDS * 1000;
		if (this.accessToken && this.expiresAt - now > bufferMs) {
			return this.accessToken;
		}

		try {
			if (this.refreshToken) {
				const ok = await this.refresh();
				if (ok) return this.accessToken;
			}
			await this.login();
			return this.accessToken;
		} catch {
			return null;
		}
	}

	public async login(): Promise<string> {
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TOKEN}`;
		const params = new URLSearchParams({
			grant_type: CONFIG.AUTH.GRANT_TYPE,
			username: CONFIG.AUTH.USERNAME,
			password: CONFIG.AUTH.PASSWORD,
		});

		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: CONFIG.AUTH.BASIC_AUTH,
			},
			body: params.toString(),
		});

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Đăng nhập thất bại (${res.status}): ${err}`);
		}

		const data = await res.json();
		this.saveToken(data);
		return this.accessToken as string;
	}

	public async refresh(): Promise<string> {
		if (!this.refreshToken) throw new Error("Không có refresh token");
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}`;
		const params = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: this.refreshToken,
		});

		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: CONFIG.AUTH.BASIC_AUTH,
			},
			body: params.toString(),
		});

		if (!res.ok) {
			return this.login();
		}

		const data = await res.json();
		this.saveToken(data);
		return this.accessToken as string;
	}

	public async revoke(): Promise<boolean> {
		if (!this.accessToken) return true;
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REVOKE}`;
		const params = new URLSearchParams({ token: this.accessToken });

		try {
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: CONFIG.AUTH.BASIC_AUTH,
				},
				body: params.toString(),
			});
			this.clear();
			return res.ok;
		} catch {
			this.clear();
			return false;
		}
	}

	private saveToken(data: Record<string, unknown>): void {
		const token = (data.access_token || data.accessToken) as string;
		const refresh = (data.refresh_token || data.refreshToken || null) as
			| string
			| null;
		const expiresIn = Number(data.expires_in || data.expiresIn || 3600);
		this.accessToken = token;
		this.refreshToken = refresh;
		this.expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
	}

	private clear(): void {
		this.accessToken = null;
		this.refreshToken = null;
		this.expiresAt = 0;
	}

	public getStatus() {
		const nowSec = Math.floor(Date.now() / 1000);
		return {
			hasToken: Boolean(this.accessToken),
			accessToken: this.accessToken
				? `${this.accessToken.substring(0, 15)}...`
				: null,
			expiresAt: this.expiresAt,
			expiresInSeconds: this.expiresAt
				? Math.max(0, this.expiresAt - nowSec)
				: 0,
		};
	}
}

export const tokenManager = TokenManager.getInstance();
