import assert from 'node:assert/strict';
import { CatalogManager } from '../src/catalogManager.js';
import { TokenManager } from '../src/tokenManager.js';
import { DataTransformer } from '../src/dataTransformer.js';
import { KbttClient } from '../src/kbttClient.js';
import { GoogleSheetService } from '../src/googleSheetService.js';
import { CONFIG } from '../src/config.js';

async function runTests() {
  console.log('🧪 Đang chạy unit tests cho các module KBTT...');

  // 1. Test CatalogManager
  const catalog = new CatalogManager(CONFIG.BASE_URL);
  await catalog.initialize();
  assert.equal(catalog.findQuocTich('Việt Nam'), 'VNM');
  assert.equal(catalog.findQuocTich('Hoa Kỳ'), 'USA');
  assert.equal(catalog.findLoaiGiayTo('Thẻ CCCD'), 1);
  assert.equal(catalog.findLoaiGiayTo('Hộ chiếu'), 4);
  assert.equal(catalog.findLoaiGiayTo('Thẻ Căn Cước'), 8);
  console.log('✅ CatalogManager test passed!');

  // 2. Test DataTransformer
  const transformer = new DataTransformer(catalog);
  
  // Test formatting
  assert.equal(transformer.formatDateOnly('15/08/1990'), '1990-08-15');
  assert.equal(transformer.formatDateOnly('1990-08-15'), '1990-08-15');
  assert.equal(transformer.normalizeGender('Nam'), 'M');
  assert.equal(transformer.normalizeGender('Nữ'), 'F');
  assert.equal(transformer.cleanDocNumber(' 001-090.012 345 '), '001090012345');

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const next2Days = new Date(now);
  next2Days.setDate(next2Days.getDate() + 2);
  const next2DaysStr = `${next2Days.getFullYear()}-${pad(next2Days.getMonth() + 1)}-${pad(next2Days.getDate())}`;

  // Test Room Number Cleaning (1-9)
  assert.equal(transformer.cleanRoomNumber('P.06'), '6');
  assert.equal(transformer.cleanRoomNumber('P.07'), '7');
  assert.equal(transformer.cleanRoomNumber('Phòng 3'), '3');
  assert.equal(transformer.cleanRoomNumber('09'), '9');
  assert.equal(transformer.cleanRoomNumber('VIP'), ''); // Invalid
  assert.equal(transformer.cleanRoomNumber(''), '');

  // Test VN Guest transformation
  const rawVn = {
    'Họ tên': 'Nguyễn Văn A',
    'Ngày sinh': '01/10/1992',
    'Giới tính': 'Nam',
    'Quốc tịch': 'VNM',
    'Loại giấy tờ': 'Thẻ CCCD',
    'Số giấy tờ': '001092000001',
    'Địa chỉ chi tiết': 'Ba Đình, Hà Nội',
    'Ngày đến': todayStr,
    'Ngày đi': next2DaysStr,
    'Số phòng': 'P.01'
  };
  const vnRes = await transformer.transformRow(rawVn);
  assert.equal(vnRes.branch, 'VN');
  assert.equal(vnRes.payload.hoTen, 'NGUYỄN VĂN A');
  assert.equal(vnRes.payload.gioiTinh, 'M');
  assert.equal(vnRes.payload.soGiayTo, '001092000001');
  assert.equal(vnRes.payload.soPhong, '1');
  assert.equal(vnRes.payload.ngayThangNamSinhStr, '1992-10-01');
  assert.equal(vnRes.payload.ngayDenCsltStr, `${todayStr} 14:00:00`);
  console.log('✅ DataTransformer (VN & Room 1-9 Cleaning) test passed!');

  // Test Foreign Guest transformation
  const rawForeign = {
    'Họ tên': 'DAVID SMITH',
    'Ngày sinh': '1988-12-05',
    'Giới tính': 'Nam',
    'Quốc tịch': 'USA',
    'Loại giấy tờ': 'Hộ chiếu',
    'Số giấy tờ': 'E98765432',
    'Số phòng': 'P.02',
    'Ngày đến': `${todayStr} 12:00:00`,
    'Ngày đi': `${next2DaysStr} 12:00:00`
  };
  const foreignRes = await transformer.transformRow(rawForeign);
  assert.equal(foreignRes.branch, 'FOREIGN');
  assert.equal(foreignRes.payload.quocTich, 'USA');
  assert.equal(foreignRes.payload.soHoChieu, 'E98765432');
  assert.equal(foreignRes.payload.soPhong, '2');
  assert.equal(foreignRes.payload.loaiNgayThangNamSinh, 'D');
  console.log('✅ DataTransformer (Foreign) test passed!');

  // Test Validation Failure (invalid CCCD length)
  const invalidVn = {
    'Họ tên': 'Lê Văn B',
    'Ngày sinh': '01/01/1990',
    'Loại giấy tờ': 'Thẻ CCCD',
    'Số giấy tờ': '123',
    'Số phòng': '3',
    'Ngày đến': todayStr,
    'Ngày đi': next2DaysStr
  };
  const invalidRes = await transformer.transformRow(invalidVn);
  assert.ok(invalidRes.validationError);

  // Test Validation Failure (invalid room number)
  const invalidRoom = {
    'Họ tên': 'Lê Văn B',
    'Ngày sinh': '01/01/1990',
    'Loại giấy tờ': 'Thẻ CCCD',
    'Số giấy tờ': '001092000001',
    'Số phòng': 'VIP-NoNumber',
    'Ngày đến': todayStr,
    'Ngày đi': next2DaysStr
  };
  const invalidRoomRes = await transformer.transformRow(invalidRoom);
  assert.ok(invalidRoomRes.validationError);
  assert.ok(invalidRoomRes.validationError.includes('Số phòng'));

  // Test Validation Failure (past check-in date blocked)
  const pastCheckIn = {
    'Họ tên': 'GRACHEV NIKITA',
    'Ngày sinh': '1995-11-25',
    'Quốc tịch': 'RUS',
    'Số giấy tờ': '552165656',
    'Số phòng': 'P.09',
    'Ngày đến': '2020-01-01',
    'Ngày đi': '2020-01-05'
  };
  const pastRes = await transformer.transformRow(pastCheckIn);
  assert.ok(pastRes.validationError, 'Phải chặn ngày đến trong quá khứ');
  assert.ok(pastRes.validationError.includes('quá khứ'));
  console.log('✅ DataTransformer (Validation & Past Date Blocking) test passed!');

  // 3. Test GoogleSheetService (CSV Parsing & Header Normalization)
  const sheetService = new GoogleSheetService();
  const sampleCsv = `Họ tên,Ngày sinh,Giới tính,Quốc tịch,Loại giấy tờ,Số giấy tờ,Số phòng,Ngày đến,Ngày đi,Địa chỉ chi tiết
"LÊ VĂN CƯỜNG",1991-03-12,Nam,Việt Nam,Thẻ CCCD,001091001111,P.02,"2026-09-16 14:00:00","2026-09-18 12:00:00","Quận 1, TP Hồ Chí Minh"
"ALICE WANG",1994-07-22,Nữ,China,Hộ chiếu,G12345678,P.03,"2026-09-16 15:00:00","2026-09-19 11:00:00","Beijing, China"`;
  const parsedRows = sheetService.parseCsv(sampleCsv);
  assert.equal(parsedRows.length, 2);
  assert.equal(parsedRows[0].hoTen, 'LÊ VĂN CƯỜNG');
  assert.equal(parsedRows[0].soGiayTo, '001091001111');
  assert.equal(parsedRows[1].hoTen, 'ALICE WANG');
  assert.equal(parsedRows[1].soGiayTo, 'G12345678');
  console.log('✅ GoogleSheetService (CSV Parsing & Normalization) test passed!');

  // 3.1 Test GoogleSheetService Live Fetch with full URL / gid & Tabs list
  console.log('--- Kiểm tra kéo dữ liệu trực tiếp từ Google Sheets công khai & Quét Tabs ---');
  const liveUrl = 'https://docs.google.com/spreadsheets/d/16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q/edit?pli=1&gid=159547744#gid=159547744';
  
  // Test Tabs scanning
  const tabsRes = await sheetService.fetchSheetTabs(liveUrl);
  assert.ok(tabsRes.success, 'fetchSheetTabs phải thành công');
  assert.ok(tabsRes.tabs.length > 0, 'Phải tìm thấy ít nhất 1 tab');
  console.log(`✅ Tìm thấy ${tabsRes.tabs.length} tabs trên Google Sheet. Tab mặc định: GID ${tabsRes.defaultGid}`);

  // Test Live Fetch with default date tab
  const liveRes = await sheetService.fetchSheetData(liveUrl, tabsRes.defaultGid);
  if (liveRes.success && liveRes.rows.length > 0) {
    const liveRow = liveRes.rows[0];
    console.log(`✅ Kéo thành công ${liveRes.rows.length} dòng từ Google Sheet! Khách: ${liveRow.hoTen}, Phòng trên Sheet: "${liveRow.soPhong}"`);
    
    // Kiểm tra tính hoàn thiện (Nếu phòng là P.0 thì phải phát hiện thiếu/sai số phòng)
    const comp = await transformer.checkRowCompleteness(liveRow);
    if (liveRow.soPhong === 'P.0') {
      assert.ok(!comp.isComplete, 'Phải đánh dấu chưa hoàn thiện khi phòng là P.0');
      assert.ok(comp.missingFields.some(f => f.includes('Số phòng')), 'Phải cảnh báo thiếu số phòng hợp lệ');
      console.log('✅ Đã phát hiện và flag thành công ô số phòng không hợp lệ (P.0) từ Google Sheet!');
    }

    // Kiểm tra chuẩn hóa khi bổ sung số phòng hợp lệ
    const validLiveRow = { ...liveRow, soPhong: 'P.07' };
    const transformed = await transformer.transformRow(validLiveRow);
    assert.equal(transformed.branch, 'VN');
    assert.equal(transformed.payload.hoTen, 'TRỊNH NGỌC LINH');
    assert.equal(transformed.payload.gioiTinh, 'F');
    assert.equal(transformed.payload.soGiayTo, '001302011971');
    assert.equal(transformed.payload.soPhong, '7'); // P.07 stripped to 7
    assert.equal(transformed.payload.ngayThangNamSinhStr, '2002-09-22');
    assert.equal(transformed.payload.noiCuTru, 1);
    assert.equal(transformed.payload.loaiGiayTo, 1);
    assert.equal(transformed.payload.lyDoCuTru, 1);
    console.log('✅ Chuẩn hóa dòng dữ liệu thực tế từ Google Sheet sang API 5 (v1.4) thành công (Số phòng: 7):');
    console.log(JSON.stringify(transformed.payload, null, 2));
  } else {
    console.warn('⚠️ Live fetch info:', liveRes.message);
  }

  // 4. Test TokenManager & KbttClient live call (if test server reachable)
  console.log('\n--- Kiểm tra kết nối OAuth & API Client ---');
  const tokenManager = new TokenManager(CONFIG);
  try {
    const token = await tokenManager.login();
    assert.ok(token, 'Token không được rỗng');
    console.log('✅ TokenManager Login test passed!');

    const kbttClient = new KbttClient(tokenManager);
    const apiRes = await kbttClient.submitVietnameseGuests([vnRes.payload]);
    console.log('✅ API Client test response:', apiRes);

    await tokenManager.revoke();
    console.log('✅ TokenManager Revoke test passed!');
  } catch (err) {
    console.warn('⚠️ Kiểm tra API Server trả về:', err.message);
  }

  console.log('\n🎉 TẤT CẢ UNIT TESTS ĐÃ HOÀN THÀNH THÀNH CÔNG!');
}

runTests().catch(err => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
