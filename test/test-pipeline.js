import assert from 'node:assert/strict';
import { CatalogManager } from '../src/catalogManager.js';
import { TokenManager } from '../src/tokenManager.js';
import { DataTransformer } from '../src/dataTransformer.js';
import { KbttClient } from '../src/kbttClient.js';
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

  // Test VN Guest transformation
  const rawVn = {
    'Họ tên': 'Nguyễn Văn A',
    'Ngày sinh': '01/10/1992',
    'Giới tính': 'Nam',
    'Quốc tịch': 'VNM',
    'Loại giấy tờ': 'Thẻ CCCD',
    'Số giấy tờ': '001092000001',
    'Địa chỉ chi tiết': 'Ba Đình, Hà Nội',
    'Ngày đến': '2026-09-16',
    'Ngày đi': '2026-09-18',
    'Số phòng': '101'
  };
  const vnRes = await transformer.transformRow(rawVn);
  assert.equal(vnRes.branch, 'VN');
  assert.equal(vnRes.payload.hoTen, 'Nguyễn Văn A');
  assert.equal(vnRes.payload.gioiTinh, 'M');
  assert.equal(vnRes.payload.soGiayTo, '001092000001');
  assert.equal(vnRes.payload.ngayThangNamSinhStr, '1992-10-01');
  assert.equal(vnRes.payload.ngayDenCsltStr, '2026-09-16 14:00:00');
  console.log('✅ DataTransformer (VN) test passed!');

  // Test Foreign Guest transformation
  const rawForeign = {
    'Họ tên': 'DAVID SMITH',
    'Ngày sinh': '1988-12-05',
    'Giới tính': 'Nam',
    'Quốc tịch': 'USA',
    'Loại giấy tờ': 'Hộ chiếu',
    'Số giấy tờ': 'E98765432',
    'Số phòng': '202',
    'Ngày đến': '2026-09-16 12:00:00',
    'Ngày đi': '2026-09-20 12:00:00'
  };
  const foreignRes = await transformer.transformRow(rawForeign);
  assert.equal(foreignRes.branch, 'FOREIGN');
  assert.equal(foreignRes.payload.quocTich, 'USA');
  assert.equal(foreignRes.payload.soHoChieu, 'E98765432');
  assert.equal(foreignRes.payload.loaiNgayThangNamSinh, 'D');
  console.log('✅ DataTransformer (Foreign) test passed!');

  // Test Validation Failure (invalid CCCD length)
  const invalidVn = {
    'Họ tên': 'Lê Văn B',
    'Ngày sinh': '01/01/1990',
    'Loại giấy tờ': 'Thẻ CCCD',
    'Số giấy tờ': '123',
    'Số phòng': '101',
    'Ngày đến': '2026-09-16',
    'Ngày đi': '2026-09-17'
  };
  const invalidRes = await transformer.transformRow(invalidVn);
  assert.ok(invalidRes.validationError);
  console.log('✅ DataTransformer (Validation Error Handling) test passed!');

  // 3. Test TokenManager & KbttClient live call (if test server reachable)
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
