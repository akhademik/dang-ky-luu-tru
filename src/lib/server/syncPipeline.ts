import { catalogManager } from './catalogManager.js';
import { tokenManager } from './tokenManager.js';
import { DataTransformer, type RawOcrRow, type KbttVnPayload, type KbttForeignPayload } from './dataTransformer.js';
import { GoogleSheetService, type SheetTabInfo } from './googleSheetService.js';
import { KbttClient } from './kbttClient.js';
import { CONFIG } from './config.js';

export interface SyncPipelineResult {
  step: string;
  success: boolean;
  status: string;
  message: string;
  row?: RawOcrRow;
  branch?: 'VN' | 'FOREIGN' | 'UNKNOWN';
  payload?: KbttVnPayload | KbttForeignPayload;
  response?: unknown;
}

export interface FullSyncReport {
  timestamp: string;
  sheetId: string;
  selectedTab: SheetTabInfo | null;
  totalFetched: number;
  results: SyncPipelineResult[];
}

export class SyncPipeline {
  public static async runFromGoogleSheet(sheetId: string = CONFIG.GOOGLE_SHEET_ID, targetGid?: string): Promise<FullSyncReport> {
    const report: FullSyncReport = {
      timestamp: new Date().toISOString(),
      sheetId,
      selectedTab: null,
      totalFetched: 0,
      results: [],
    };

    try {
      await catalogManager.initialize();
      const tabs = await GoogleSheetService.fetchPublicSheetTabs(sheetId);
      const chosenTab = targetGid ? tabs.find(t => t.gid === targetGid) || tabs[0] : GoogleSheetService.findClosestTab(tabs);
      report.selectedTab = chosenTab || null;

      const gid = chosenTab ? chosenTab.gid : '0';
      const csv = await GoogleSheetService.fetchPublicSheetCsv(sheetId, gid);
      const rawRows = GoogleSheetService.parseCsv(csv);
      report.totalFetched = rawRows.length;

      if (rawRows.length === 0) {
        report.results.push({
          step: 'PARSE_CSV',
          success: true,
          status: 'Cảnh báo',
          message: 'Không tìm thấy dòng dữ liệu nào trong tab đã chọn.',
        });
        return report;
      }

      report.results = await this.processAndSyncRows(rawRows);
    } catch (error) {
      report.results.push({
        step: 'PIPELINE_ERROR',
        success: false,
        status: 'Thất bại',
        message: (error as Error).message,
      });
    }

    return report;
  }

  public static async processAndSyncRows(rawRows: RawOcrRow[]): Promise<SyncPipelineResult[]> {
    const results: SyncPipelineResult[] = [];
    const vnBatch: { row: RawOcrRow; payload: KbttVnPayload; originalIndex: number }[] = [];
    const foreignBatch: { row: RawOcrRow; payload: KbttForeignPayload; originalIndex: number }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const check = DataTransformer.checkCompleteness(row);
      const isVN = DataTransformer.isGuestVN(row);

      if (!check.isComplete) {
        results.push({
          step: 'VALIDATION',
          row,
          branch: isVN ? 'VN' : 'FOREIGN',
          success: false,
          status: 'Thiếu thông tin bắt buộc',
          message: `Dòng ${i + 1} thiếu hoặc sai trường: ${check.missingFields.join(', ')}`,
        });
        continue;
      }

      if (isVN) {
        const payload = DataTransformer.transformToPayloadVn(row);
        vnBatch.push({ row, payload, originalIndex: i });
      } else {
        const payload = DataTransformer.transformToPayloadForeign(row);
        foreignBatch.push({ row, payload, originalIndex: i });
      }
    }

    if (vnBatch.length > 0) {
      try {
        const payloads = vnBatch.map(item => item.payload);
        const res = await KbttClient.sendBatchVn(payloads);
        vnBatch.forEach(item => {
          results.push({
            step: 'API_5_VN',
            row: item.row,
            branch: 'VN',
            payload: item.payload,
            success: res.success,
            status: res.success ? 'Thành công' : 'Thất bại',
            message: res.message,
            response: res.raw,
          });
        });
      } catch (err) {
        vnBatch.forEach(item => {
          results.push({
            step: 'API_5_VN',
            row: item.row,
            branch: 'VN',
            payload: item.payload,
            success: false,
            status: 'Lỗi gửi yêu cầu',
            message: (err as Error).message,
          });
        });
      }
    }

    if (foreignBatch.length > 0) {
      try {
        const payloads = foreignBatch.map(item => item.payload);
        const res = await KbttClient.sendBatchForeign(payloads);
        foreignBatch.forEach(item => {
          results.push({
            step: 'API_4_FOREIGN',
            row: item.row,
            branch: 'FOREIGN',
            payload: item.payload,
            success: res.success,
            status: res.success ? 'Thành công' : 'Thất bại',
            message: res.message,
            response: res.raw,
          });
        });
      } catch (err) {
        foreignBatch.forEach(item => {
          results.push({
            step: 'API_4_FOREIGN',
            row: item.row,
            branch: 'FOREIGN',
            payload: item.payload,
            success: false,
            status: 'Lỗi gửi yêu cầu',
            message: (err as Error).message,
          });
        });
      }
    }

    return results;
  }
}
