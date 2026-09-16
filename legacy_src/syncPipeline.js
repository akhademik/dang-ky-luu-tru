import { CatalogManager } from './catalogManager.js';
import { TokenManager } from './tokenManager.js';
import { DataTransformer } from './dataTransformer.js';
import { KbttClient } from './kbttClient.js';
import { GoogleSheetService } from './googleSheetService.js';
import { CONFIG } from './config.js';

/**
 * Pipeline đồng bộ tự động từ Google Sheets/OCR lên hệ thống KBTT
 */
export class SyncPipeline {
  constructor(config = CONFIG) {
    this.config = config;
    this.catalogManager = new CatalogManager(config.BASE_URL);
    this.tokenManager = new TokenManager(config);
    this.dataTransformer = new DataTransformer(this.catalogManager);
    this.kbttClient = new KbttClient(this.tokenManager, config.BASE_URL);
    this.googleSheetService = new GoogleSheetService(config.GOOGLE_SHEET_ID);
  }

  /**
   * Khởi tạo hệ thống (Nạp cache danh mục và chuẩn bị phiên)
   */
  async initialize() {
    await this.catalogManager.initialize();
  }

  /**
   * Xử lý đồng bộ danh sách dòng dữ liệu
   * @param {Array<Object>} rawRows Danh sách các dòng dữ liệu thô từ Google Sheets/OCR
   * @returns {Promise<Array<{ index: number, status: string, message: string, branch?: string, payload?: any }>>}
   */
  async processRows(rawRows) {
    if (!this.catalogManager.isInitialized) {
      await this.initialize();
    }

    const results = new Array(rawRows.length);
    const { vnPayloads, foreignPayloads, logs } = await this.dataTransformer.transformBatch(rawRows);

    // Ghi nhận các dòng lỗi validation trước khi gửi API
    for (const log of logs) {
      results[log.rowIndex] = {
        index: log.rowIndex,
        status: 'Thất bại',
        message: log.message,
        row: log.row,
      };
    }

    // Gửi dữ liệu khách Việt Nam (API 5)
    if (vnPayloads.length > 0) {
      const payloadsOnly = vnPayloads.map(item => item.payload);
      const apiRes = await this.kbttClient.submitVietnameseGuests(payloadsOnly);

      for (const item of vnPayloads) {
        results[item.rowIndex] = {
          index: item.rowIndex,
          branch: 'VN',
          status: apiRes.success ? 'Thành công' : 'Thất bại',
          message: apiRes.message,
          payload: item.payload,
          row: item.row,
        };
      }
    }

    // Gửi dữ liệu khách Nước ngoài (API 4)
    if (foreignPayloads.length > 0) {
      const payloadsOnly = foreignPayloads.map(item => item.payload);
      const apiRes = await this.kbttClient.submitForeignGuests(payloadsOnly);

      for (const item of foreignPayloads) {
        results[item.rowIndex] = {
          index: item.rowIndex,
          branch: 'FOREIGN',
          status: apiRes.success ? 'Thành công' : 'Thất bại',
          message: apiRes.message,
          payload: item.payload,
          row: item.row,
        };
      }
    }

    return results;
  }

  /**
   * Kéo dữ liệu từ Google Sheets và thực hiện đồng bộ tự động
   * @param {string} [sheetId]
   * @param {string} [gid]
   */
  async pullAndProcessGoogleSheet(sheetId = this.config.GOOGLE_SHEET_ID, gid = null) {
    console.log(`[SyncPipeline] Đang kéo dữ liệu từ Google Sheet ID: ${sheetId} (gid: ${gid || 'default'})...`);
    const sheetRes = await this.googleSheetService.fetchSheetData(sheetId, gid);
    if (!sheetRes.success || !sheetRes.rows || sheetRes.rows.length === 0) {
      return {
        success: false,
        message: sheetRes.message || 'Không thể kéo dữ liệu từ Google Sheet hoặc bảng tính trống',
        results: [],
        rawRows: [],
      };
    }

    console.log(`[SyncPipeline] Đã kéo được ${sheetRes.rows.length} dòng dữ liệu. Bắt đầu chuẩn hóa và gửi API...`);
    const results = await this.processRows(sheetRes.rows);
    return {
      success: true,
      message: `Đồng bộ hoàn tất ${sheetRes.rows.length} bản ghi (${sheetRes.source})`,
      results,
      rawRows: sheetRes.rows,
    };
  }

  /**
   * Kết thúc phiên và thu hồi token
   */
  async closeSession() {
    await this.tokenManager.revoke();
  }
}
