import { CONFIG } from './config.js';

/**
 * Module 3: API Client
 * Thực thi lệnh gửi payload tương ứng (API 4, API 5) và xử lý response/lỗi
 */
export class KbttClient {
  /**
   * @param {import('./tokenManager.js').TokenManager} tokenManager
   * @param {string} baseUrl
   */
  constructor(tokenManager, baseUrl = CONFIG.BASE_URL) {
    this.tokenManager = tokenManager;
    this.baseUrl = baseUrl;
  }

  /**
   * Gửi thông báo lưu trú cho khách Việt Nam (API 5)
   * @param {Array<Object>} payloads Mảng danh sách thông tin khách Việt Nam
   * @returns {Promise<{ success: boolean, code: number|string, message: string, raw: any }>}
   */
  async submitVietnameseGuests(payloads) {
    if (!Array.isArray(payloads) || payloads.length === 0) {
      return { success: true, code: 200, message: 'Không có dữ liệu cần gửi', data: [] };
    }

    const url = `${this.baseUrl}${CONFIG.ENDPOINTS.KBTT_VIETNAM}`;
    return this._postPayload(url, payloads, 'Thông báo lưu trú (VN)');
  }

  /**
   * Gửi khai báo tạm trú cho khách Nước ngoài (API 4)
   * @param {Array<Object>} payloads Mảng danh sách thông tin khách Nước ngoài
   * @returns {Promise<{ success: boolean, code: number|string, message: string, raw: any }>}
   */
  async submitForeignGuests(payloads) {
    if (!Array.isArray(payloads) || payloads.length === 0) {
      return { success: true, code: 200, message: 'Không có dữ liệu cần gửi', data: [] };
    }

    const url = `${this.baseUrl}${CONFIG.ENDPOINTS.KBTT_FOREIGN}`;
    return this._postPayload(url, payloads, 'Khai báo tạm trú (Nước ngoài)');
  }

  /**
   * Phương thức gửi POST chung có gắn AccessToken và xử lý lỗi
   */
  async _postPayload(url, payloadArray, actionName) {
    try {
      const token = await this.tokenManager.getValidToken();
      console.log(`[KbttClient] Đang gửi ${payloadArray.length} bản ghi đến [${actionName}]...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payloadArray),
      });

      let resData = null;
      try {
        resData = await response.json();
      } catch (parseErr) {
        resData = { message: await response.text() };
      }

      const statusCode = resData.code || response.status;
      const isSuccess = statusCode === 200 || statusCode === '200' || response.ok;

      if (isSuccess) {
        console.log(`[KbttClient] [${actionName}] Thành công 200: ${resData.message || 'Thành công'}`);
        return {
          success: true,
          code: 200,
          message: resData.message || 'Thành công',
          raw: resData,
        };
      } else {
        const errorMsg = resData.message || resData.error_description || resData.error || `HTTP ${response.status}`;
        console.warn(`[KbttClient] [${actionName}] Thất bại (${statusCode}): ${errorMsg}`);
        return {
          success: false,
          code: statusCode,
          message: errorMsg,
          raw: resData,
        };
      }
    } catch (networkErr) {
      console.error(`[KbttClient] [${actionName}] Lỗi kết nối mạng:`, networkErr.message);
      return {
        success: false,
        code: 500,
        message: `Lỗi kết nối hoặc hệ thống: ${networkErr.message}`,
        raw: null,
      };
    }
  }
}
