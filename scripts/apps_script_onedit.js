/**
 * GOOGLE APPS SCRIPT: Tự Động Đẩy Dữ Liệu OCR Lên Cloudflare Database
 * Hỗ trợ Trigger: onEdit, onChange, và Menu Đồng Bộ Thủ Công
 */

// Cấu hình URL Cloudflare App của bạn (Sau khi deploy lên Cloudflare Pages/Workers)
const CLOUDFLARE_API_URL = "https://dang-ky-luu-tru.pages.dev/api/ingest/ocr";
const API_SECRET_KEY = "kbtt-secret-key-2026"; // Tùy chọn nếu cấu hình secret

/**
 * Tạo Menu tiện ích trên Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Cloudflare DB Sync')
    .addItem('Đồng bộ tab hiện tại lên Cloudflare', 'syncCurrentSheetToCloudflare')
    .addItem('Cài đặt Trigger Tự Động onEdit', 'installTrigger')
    .addToUi();
}

/**
 * Hàm trigger khi có chỉnh sửa (onEdit)
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  
  // Bỏ qua dòng tiêu đề (Dòng 1)
  if (row <= 1) return;
  
  // Đọc dữ liệu dòng hiện tại
  syncRowToCloudflare(sheet, row);
}

/**
 * Đồng bộ 1 dòng cụ thể lên Cloudflare Database
 */
function syncRowToCloudflare(sheet, row) {
  const tabName = sheet.getName();
  const lastCol = Math.max(sheet.getLastColumn(), 15);
  const rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  
  const hoTen = String(rowData[1] || "").trim();
  const soGiayTo = String(rowData[6] || "").trim();
  
  // Chỉ gửi nếu có ít nhất Họ tên và Số giấy tờ
  if (!hoTen || !soGiayTo) return;
  
  const payload = {
    tabName: tabName,
    rows: [{
      stt: rowData[0],
      hoTen: hoTen,
      ngaySinh: rowData[2],
      gioiTinh: rowData[3],
      quocTich: rowData[4],
      loaiGiayTo: rowData[5],
      soGiayTo: soGiayTo,
      tinh: rowData[7],
      quanHuyen: rowData[8],
      phuongXa: rowData[9],
      diaChi: rowData[10],
      ngayDen: rowData[11],
      ngayDi: rowData[12],
      soPhong: rowData[13],
      daDangKy: rowData[14]
    }]
  };
  
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': API_SECRET_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(CLOUDFLARE_API_URL, options);
    const code = response.getResponseCode();
    
    if (code === 200) {
      // Đánh dấu nhẹ lên Sheet nếu cột 15 còn trống
      const statusCol = sheet.getRange(row, 15);
      if (!statusCol.getValue()) {
        statusCol.setValue("✓ Đã nạp DB");
      }
    }
  } catch (err) {
    Logger.log("Lỗi đồng bộ Cloudflare: " + err.message);
  }
}

/**
 * Đồng bộ toàn bộ tab hiện tại lên Cloudflare
 */
function syncCurrentSheetToCloudflare() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const tabName = sheet.getName();
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 15);
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert("Tab này chưa có dòng dữ liệu nào!");
    return;
  }
  
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const rows = [];
  
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    const hoTen = String(r[1] || "").trim();
    const soGiayTo = String(r[6] || "").trim();
    if (!hoTen || !soGiayTo) continue;
    
    rows.push({
      stt: r[0],
      hoTen: hoTen,
      ngaySinh: r[2],
      gioiTinh: r[3],
      quocTich: r[4],
      loaiGiayTo: r[5],
      soGiayTo: soGiayTo,
      tinh: r[7],
      quanHuyen: r[8],
      phuongXa: r[9],
      diaChi: r[10],
      ngayDen: r[11],
      ngayDi: r[12],
      soPhong: r[13],
      daDangKy: r[14]
    });
  }
  
  if (rows.length === 0) {
    SpreadsheetApp.getUi().alert("Không có dòng khách nào hợp lệ để đồng bộ.");
    return;
  }
  
  const payload = {
    tabName: tabName,
    rows: rows
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': API_SECRET_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(CLOUDFLARE_API_URL, options);
  const resJson = JSON.parse(response.getContentText());
  
  SpreadsheetApp.getUi().alert(
    `Đồng bộ hoàn tất!\nTổng cộng: ${resJson.total || rows.length} khách.\nThành công nạp vào Cloudflare DB.`
  );
}

/**
 * Cài đặt Trigger onChange để tự động nhận dữ liệu n8n đẩy vào
 */
function installTrigger() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  
  SpreadsheetApp.getUi().alert("Đã kích hoạt Trigger onEdit thành công!");
}
