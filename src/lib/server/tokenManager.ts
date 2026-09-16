import { CONFIG } from './config.js';

export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number; // Unix timestamp in ms
  tokenType: string;
}

export class TokenManager {
  private static instance: TokenManager;
  private tokenState: TokenState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: 0,
    tokenType: 'Bearer',
  };
  private isAuthenticating = false;
  private authPromise: Promise<string | null> | null = null;

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  public async getValidToken(): Promise<string | null> {
    if (this.isTokenValid()) {
      return this.tokenState.accessToken;
    }

    if (this.isAuthenticating && this.authPromise) {
      return this.authPromise;
    }

    this.isAuthenticating = true;
    this.authPromise = (async () => {
      try {
        if (this.tokenState.refreshToken && this.canRefreshToken()) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) return this.tokenState.accessToken;
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

  public isTokenValid(): boolean {
    if (!this.tokenState.accessToken) return false;
    const now = Date.now();
    const bufferMs = CONFIG.TOKEN_REFRESH_BUFFER_SECONDS * 1000;
    return this.tokenState.expiresAt - now > bufferMs;
  }

  public canRefreshToken(): boolean {
    return Boolean(this.tokenState.refreshToken);
  }

  public async login(): Promise<TokenState> {
    const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TOKEN}`;
    const params = new URLSearchParams({
      grant_type: CONFIG.AUTH.GRANT_TYPE,
      username: CONFIG.AUTH.USERNAME,
      password: CONFIG.AUTH.PASSWORD,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': CONFIG.AUTH.BASIC_AUTH,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`[TokenManager] Đăng nhập thất bại (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    this.saveTokenResponse(data);
    return this.tokenState;
  }

  public async refreshAccessToken(): Promise<boolean> {
    if (!this.tokenState.refreshToken) return false;

    const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}`;
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokenState.refreshToken,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': CONFIG.AUTH.BASIC_AUTH,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: params.toString(),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      this.saveTokenResponse(data);
      return true;
    } catch {
      return false;
    }
  }

  public async revokeToken(): Promise<boolean> {
    if (!this.tokenState.accessToken) return true;

    const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REVOKE}`;
    const params = new URLSearchParams({
      token: this.tokenState.accessToken,
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': CONFIG.AUTH.BASIC_AUTH,
        },
        body: params.toString(),
      });

      this.clearToken();
      return res.ok;
    } catch {
      this.clearToken();
      return false;
    }
  }

  public saveTokenResponse(data: Record<string, unknown>): void {
    const accessToken = (data.access_token || data.accessToken) as string;
    const refreshToken = (data.refresh_token || data.refreshToken || null) as string | null;
    const expiresIn = Number(data.expires_in || data.expiresIn || 3600);
    const tokenType = (data.token_type || data.tokenType || 'Bearer') as string;

    this.tokenState = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      tokenType,
    };
  }

  public clearToken(): void {
    this.tokenState = {
      accessToken: null,
      refreshToken: null,
      expiresAt: 0,
      tokenType: 'Bearer',
    };
  }

  public getTokenStatus(): { hasToken: boolean; expiresInSeconds: number; tokenType: string } {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((this.tokenState.expiresAt - now) / 1000));
    return {
      hasToken: Boolean(this.tokenState.accessToken),
      expiresInSeconds: remaining,
      tokenType: this.tokenState.tokenType,
    };
  }
}

export const tokenManager = TokenManager.getInstance();
