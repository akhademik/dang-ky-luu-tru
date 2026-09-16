export { CONFIG } from './lib/server/config.js';
export { CatalogManager, catalogManager } from './lib/server/catalogManager.js';
export { TokenManager, tokenManager } from './lib/server/tokenManager.js';
export { DataTransformer } from './lib/server/dataTransformer.js';
export { GoogleSheetService } from './lib/server/googleSheetService.js';
export { KbttClient } from './lib/server/kbttClient.js';
export { SyncPipeline } from './lib/server/syncPipeline.js';

import { SyncPipeline } from './lib/server/syncPipeline.js';
import type { RawOcrRow } from './lib/server/dataTransformer.js';

/**
 * CLI runner cho module đồng bộ
 */
export async function runCli(): Promise<void> {
  console.log('🚀 Khởi chạy pipeline đồng bộ khai báo tạm trú KBTT (API v1.4 - SvelteKit/TS)...');

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const next2Days = new Date(now);
  next2Days.setDate(next2Days.getDate() + 2);
  const next2DaysStr = `${next2Days.getFullYear()}-${pad(next2Days.getMonth() + 1)}-${pad(next2Days.getDate())}`;

  const mockSheetRows: RawOcrRow[] = [
    {
      'Họ tên': 'BUI TAN DUNG',
      'Giới tính': 'M',
      'Số điện thoại': '0987654321',
      'Ngày sinh': '2001-10-16',
      'Nơi cư trú': 'Thường trú',
      'Tỉnh/TP': 'Đắk Lắk',
      'Quận/Huyện': 'Krông Năng',
      'Phường/Xã': 'Krông Năng',
      'Địa chỉ chi tiết': 'Tổ Dân Phố 5',
      'Ngày đến': `${todayStr} 12:00:00`,
      'Ngày đi': `${next2DaysStr} 12:00:00`,
      'Số phòng': '6',
      'Lý do': 'Du lịch',
      'Loại giấy tờ': 'Thẻ CCCD',
      'Số giấy tờ': '066201008768',
      'Ảnh mặt trước': '',
      'Ảnh mặt sau': '',
    },
    {
      'Họ tên': 'GRACHEV NIKITA',
      'Quốc tịch': 'RUS',
      'Số giấy tờ': '552165656',
      'Giới tính': 'Nam',
      'Ngày sinh': '1995-11-25',
      'Ngày đến': `${todayStr} 12:00:00`,
      'Ngày đi': `${next2DaysStr} 12:00:00`,
      'Thời hạn tạm trú': '2026-12-31 23:59:59',
      'Số phòng': '9',
      'Loại giấy tờ': 'Hộ chiếu',
      'Ảnh hộ chiếu': '',
    },
  ];

  console.log(`[SyncPipeline] Xử lý ${mockSheetRows.length} dòng dữ liệu mẫu...`);
  const results = await SyncPipeline.processAndSyncRows(mockSheetRows);

  console.log('\n--- KẾT QUẢ XỬ LÝ ĐỒNG BỘ VÀ GHI LOG SHEETS ---');
  results.forEach((res, i) => {
    console.log(`\n[Dòng ${i + 1}] Khách: ${mockSheetRows[i]['Họ tên']}`);
    console.log(` - Phân nhánh: ${res.branch}`);
    console.log(` - Trạng thái: ${res.status}`);
    console.log(` - Thông báo ghi Sheets: ${res.message}`);
  });
}
