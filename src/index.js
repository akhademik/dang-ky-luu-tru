export { CONFIG } from './config.js';
export { CatalogManager } from './catalogManager.js';
export { TokenManager } from './tokenManager.js';
export { DataTransformer } from './dataTransformer.js';
export { KbttClient } from './kbttClient.js';
export { SyncPipeline } from './syncPipeline.js';

import { SyncPipeline } from './syncPipeline.js';

/**
 * Hàm demo chạy thử kiểm thử tích hợp tự động đồng bộ mẫu
 */
async function runDemo() {
  console.log('=== BẮT ĐẦU CHẠY MODULE KIỂM THỬ ĐỒNG BỘ KBTT ===\n');

  const pipeline = new SyncPipeline();
  await pipeline.initialize();

  // Dữ liệu mẫu giả lập đọc từ Google Sheets sau khi OCR
  const mockSheetRows = [
    {
      'Họ tên': 'NGUYỄN VĂN AN',
      'Ngày sinh': '15/08/1990',
      'Giới tính': 'Nam',
      'Quốc tịch': 'Việt Nam',
      'Loại giấy tờ': 'Thẻ CCCD',
      'Số giấy tờ': '001090012345',
      'Số điện thoại': '0912345678',
      'Tỉnh/TP': 'Hà Nội',
      'Phường/Xã': 'Phường Hàng Bạc',
      'Địa chỉ chi tiết': '123 Hàng Bạc, Hoàn Kiếm, Hà Nội',
      'Ngày đến': '2026-09-16 14:00:00',
      'Ngày đi': '2026-09-18 12:00:00',
      'Lý do': 'Du lịch',
      'Số phòng': 'P302',
      'Ảnh mặt trước': 'data:image/jpeg;base64,...(cccd_front)...',
      'Ảnh mặt sau': 'data:image/jpeg;base64,...(cccd_back)...',
    },
    {
      'Họ tên': 'JOHN DOE',
      'Ngày sinh': '1985-05-20',
      'Giới tính': 'M',
      'Quốc tịch': 'USA',
      'Loại giấy tờ': 'Hộ chiếu',
      'Số giấy tờ': 'C1234567',
      'Địa chỉ chi tiết': 'California, USA',
      'Ngày đến': '2026-09-16 15:30:00',
      'Ngày đi': '2026-09-20 11:00:00',
      'Thời hạn tạm trú': '2026-09-20 23:59:59',
      'Số phòng': 'P501',
      'Ảnh hộ chiếu': 'data:image/jpeg;base64,...(passport)...',
    },
    {
      'Họ tên': 'TRẦN THỊ LỖI',
      'Ngày sinh': '01/01/1995',
      'Giới tính': 'Nữ',
      'Quốc tịch': 'VNM',
      'Loại giấy tờ': 'Thẻ CCCD',
      'Số giấy tờ': '12345', // Lỗi: CCCD không đủ 12 số
      'Số phòng': 'P101',
      'Ngày đến': '2026-09-16 14:00:00',
      'Ngày đi': '2026-09-17 12:00:00',
    }
  ];

  console.log(`\n--- Bắt đầu xử lý ${mockSheetRows.length} dòng dữ liệu từ Google Sheets ---`);
  const results = await pipeline.processRows(mockSheetRows);

  console.log('\n--- KẾT QUẢ XỬ LÝ ĐỒNG BỘ VÀ GHI LOG SHEETS ---');
  results.forEach((res, i) => {
    console.log(`\n[Dòng ${i + 1}] Khách: ${mockSheetRows[i]['Họ tên']}`);
    console.log(`- Nhánh xử lý: ${res.branch || 'N/A'}`);
    console.log(`- Trạng thái: ${res.status}`);
    console.log(`- Log/Phản hồi: ${res.message}`);
    if (res.payload) {
      console.log(`- Payload JSON gửi đi:\n`, JSON.stringify(res.payload, null, 2));
    }
  });

  // Thu hồi phiên
  await pipeline.closeSession();
  console.log('\n=== KẾT THÚC KIỂM THỬ ===');
}

// Chạy demo nếu file được gọi trực tiếp
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  runDemo().catch(err => {
    console.error('Lỗi thực thi demo:', err);
  });
}
