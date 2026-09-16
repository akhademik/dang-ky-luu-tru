import { CONFIG } from './config.js';
import { tokenManager } from './tokenManager.js';
import type { KbttVnPayload, KbttForeignPayload } from './dataTransformer.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string | number;
  message: string;
  raw?: T;
}

export class KbttClient {
  public static async sendBatchVn(payloadList: KbttVnPayload[]): Promise<ApiResponse> {
    return this.sendRequest(CONFIG.ENDPOINTS.KBTT_VIETNAM, payloadList, 'Thông báo lưu trú (VN)');
  }

  public static async sendBatchForeign(payloadList: KbttForeignPayload[]): Promise<ApiResponse> {
    return this.sendRequest(CONFIG.ENDPOINTS.KBTT_FOREIGN, payloadList, 'Thông báo lưu trú (Nước ngoài)');
  }

  private static async sendRequest(endpoint: string, payloadList: unknown[], label: string): Promise<ApiResponse> {
    const token = await tokenManager.getValidToken();
    if (!token) {
      throw new Error('[KbttClient] Không thể lấy Access Token hợp lệ.');
    }

    const url = `${CONFIG.BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadList),
    });

    let resData: Record<string, unknown> = {};
    try {
      resData = (await res.json()) as Record<string, unknown>;
    } catch {
      resData = { message: await res.text() };
    }

    const isSuccess = res.ok && (resData.code === '200' || resData.code === 200 || !resData.code);
    return {
      success: isSuccess,
      code: (resData.code as string | number) || res.status,
      message: (resData.message as string) || (isSuccess ? 'Thành công' : `Lỗi ${res.status}`),
      raw: resData,
    };
  }
}
