import { C as CONFIG } from './config.js-MrK2uMye.js';

var tokenManager = class TokenManager {
	static instance;
	tokenState = {
		accessToken: null,
		refreshToken: null,
		expiresAt: 0,
		tokenType: "Bearer"
	};
	isAuthenticating = false;
	authPromise = null;
	constructor() {}
	static getInstance() {
		if (!TokenManager.instance) TokenManager.instance = new TokenManager();
		return TokenManager.instance;
	}
	async getValidToken() {
		if (this.isTokenValid()) return this.tokenState.accessToken;
		if (this.isAuthenticating && this.authPromise) return this.authPromise;
		this.isAuthenticating = true;
		this.authPromise = (async () => {
			try {
				if (this.tokenState.refreshToken && this.canRefreshToken()) {
					if (await this.refreshAccessToken()) return this.tokenState.accessToken;
				}
				await this.login();
				return this.tokenState.accessToken;
			} finally {
				this.isAuthenticating = false;
				this.authPromise = null;
			}
		})();
		return this.authPromise;
	}
	isTokenValid() {
		if (!this.tokenState.accessToken) return false;
		const now = Date.now();
		const bufferMs = CONFIG.TOKEN_REFRESH_BUFFER_SECONDS * 1e3;
		return this.tokenState.expiresAt - now > bufferMs;
	}
	canRefreshToken() {
		return Boolean(this.tokenState.refreshToken);
	}
	async login() {
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TOKEN}`;
		const params = new URLSearchParams({
			grant_type: CONFIG.AUTH.GRANT_TYPE,
			username: CONFIG.AUTH.USERNAME,
			password: CONFIG.AUTH.PASSWORD
		});
		const headers = {
			"Content-Type": "application/x-www-form-urlencoded",
			"Authorization": CONFIG.AUTH.BASIC_AUTH
		};
		const res = await fetch(url, {
			method: "POST",
			headers,
			body: params.toString()
		});
		if (!res.ok) {
			const errBody = await res.text();
			throw new Error(`[TokenManager] Đăng nhập thất bại (${res.status}): ${errBody}`);
		}
		const data = await res.json();
		this.saveTokenResponse(data);
		return this.tokenState;
	}
	async refreshAccessToken() {
		if (!this.tokenState.refreshToken) return false;
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}`;
		const params = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: this.tokenState.refreshToken
		});
		const headers = {
			"Content-Type": "application/x-www-form-urlencoded",
			"Authorization": CONFIG.AUTH.BASIC_AUTH
		};
		try {
			const res = await fetch(url, {
				method: "POST",
				headers,
				body: params.toString()
			});
			if (!res.ok) return false;
			const data = await res.json();
			this.saveTokenResponse(data);
			return true;
		} catch {
			return false;
		}
	}
	async revokeToken() {
		if (!this.tokenState.accessToken) return true;
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REVOKE}`;
		const params = new URLSearchParams({ token: this.tokenState.accessToken });
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": CONFIG.AUTH.BASIC_AUTH
				},
				body: params.toString()
			});
			this.clearToken();
			return res.ok;
		} catch {
			this.clearToken();
			return false;
		}
	}
	saveTokenResponse(data) {
		const accessToken = data.access_token || data.accessToken;
		const refreshToken = data.refresh_token || data.refreshToken || null;
		const expiresIn = Number(data.expires_in || data.expiresIn || 3600);
		const tokenType = data.token_type || data.tokenType || "Bearer";
		this.tokenState = {
			accessToken,
			refreshToken,
			expiresAt: Date.now() + expiresIn * 1e3,
			tokenType
		};
	}
	clearToken() {
		this.tokenState = {
			accessToken: null,
			refreshToken: null,
			expiresAt: 0,
			tokenType: "Bearer"
		};
	}
	getTokenStatus() {
		const now = Date.now();
		const remaining = Math.max(0, Math.floor((this.tokenState.expiresAt - now) / 1e3));
		return {
			hasToken: Boolean(this.tokenState.accessToken),
			expiresInSeconds: remaining,
			tokenType: this.tokenState.tokenType
		};
	}
}.getInstance();

export { tokenManager as t };
//# sourceMappingURL=tokenManager.js-Ch4CH6Dv.js.map
