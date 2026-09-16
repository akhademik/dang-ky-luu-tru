import { CONFIG } from './config.js';

/**
 * Module 1: Quản lý Phiên xác thực (OAuth 2.0 Token Manager)
 */
export class TokenManager {
  constructor(config = CONFIG) {
    this.config = config;
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null; // Unix timestamp in seconds
    this.isRefreshing = null; // Promise mutex for concurrent requests
  }

  /**
   * Đăng nhập để lấy AccessToken & RefreshToken mới (API 1)
   */
  async login() {
    const url = `${this.config.BASE_URL}${this.config.ENDPOINTS.TOKEN}`;
    const params = new URLSearchParams({
      username: this.config.AUTH.USERNAME,
      password: this.config.AUTH.PASSWORD,
      grant_type: this.config.AUTH.GRANT_TYPE,
    });

    try {
      console.log('[TokenManager] Đang thực hiện đăng nhập...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.config.AUTH.BASIC_AUTH,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok || (data.code && data.code !== '200' && data.code !== 200)) {
        throw new Error(data.message || data.error_description || `Login failed with status ${response.status}`);
      }

      this._saveTokenData(data);
      console.log('[TokenManager] Đăng nhập thành công! Token có hiệu lực đến:', new Date(this.expiresAt * 1000).toLocaleString());
      return this.accessToken;
    } catch (err) {
      console.error('[TokenManager] Lỗi đăng nhập:', err.message);
      throw err;
    }
  }

  /**
   * Làm mới AccessToken bằng RefreshToken (API 2)
   */
  async refresh() {
    if (!this.refreshToken) {
      console.log('[TokenManager] Không có refresh token, tiến hành đăng nhập lại...');
      return this.login();
    }

    const url = `${this.config.BASE_URL}${this.config.ENDPOINTS.REFRESH_TOKEN}?refresh_token=${encodeURIComponent(this.refreshToken)}`;
    try {
      console.log('[TokenManager] Đang làm mới access token...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.config.AUTH.BASIC_AUTH,
        },
      });

      const data = await response.json();
      if (!response.ok || (data.code && data.code !== '200' && data.code !== 200)) {
        console.warn('[TokenManager] Refresh token thất bại, chuyển sang đăng nhập lại:', data.message || response.statusText);
        return this.login();
      }

      this._saveTokenData(data);
      console.log('[TokenManager] Làm mới token thành công!');
      return this.accessToken;
    } catch (err) {
      console.warn('[TokenManager] Lỗi khi refresh token, thử đăng nhập lại:', err.message);
      return this.login();
    }
  }

  /**
   * Lấy token hợp lệ trước mỗi request, tự động refresh nếu sắp hết hạn (< 60s)
   */
  async getValidToken() {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const buffer = this.config.TOKEN_REFRESH_BUFFER_SECONDS || 60;

    // Nếu chưa có token hoặc đã hết hạn
    if (!this.accessToken || !this.expiresAt) {
      return this.login();
    }

    // Nếu thời hạn còn lại dưới ngưỡng an toàn (60s)
    if (this.expiresAt - nowInSeconds <= buffer) {
      if (!this.isRefreshing) {
        this.isRefreshing = this.refresh().finally(() => {
          this.isRefreshing = null;
        });
      }
      return this.isRefreshing;
    }

    return this.accessToken;
  }

  /**
   * Thu hồi Token khi kết thúc phiên / tắt ứng dụng (API 3)
   */
  async revoke() {
    if (!this.accessToken) return true;

    const url = `${this.config.BASE_URL}${this.config.ENDPOINTS.REVOKE}?access_token=${encodeURIComponent(this.accessToken)}`;
    try {
      console.log('[TokenManager] Đang thu hồi access token...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.config.AUTH.BASIC_AUTH,
        },
      });
      const data = await response.json().catch(() => ({}));
      console.log('[TokenManager] Đã thu hồi token thành công.');
      this.accessToken = null;
      this.refreshToken = null;
      this.expiresAt = null;
      return true;
    } catch (err) {
      console.warn('[TokenManager] Lỗi khi thu hồi token:', err.message);
      return false;
    }
  }

  _saveTokenData(data) {
    const payload = data.data || data;
    this.accessToken = payload.access_token || payload.accessToken;
    this.refreshToken = payload.refresh_token || payload.refreshToken || this.refreshToken;

    const nowInSec = Math.floor(Date.now() / 1000);
    if (payload.exp) {
      // Nếu exp là timestamp tính bằng giây hoặc mili-giây
      this.expiresAt = payload.exp > 1e11 ? Math.floor(payload.exp / 1000) : payload.exp;
    } else if (payload.expires_in || payload.expiresIn) {
      const expiresIn = Number(payload.expires_in || payload.expiresIn);
      this.expiresAt = nowInSec + expiresIn;
    } else {
      // Mặc định 3600s nếu không có
      this.expiresAt = nowInSec + 3600;
    }
  }
}
