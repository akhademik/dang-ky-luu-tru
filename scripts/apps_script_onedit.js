/**
 * GOOGLE APPS SCRIPT: Tự Động Đẩy Dữ Liệu OCR Lên Cloudflare Database
 *
 * ⚠️ LƯU Ý QUAN TRỌNG VỀ BẢO MẬT CỦA GOOGLE APPS SCRIPT:
 * Hàm `onEdit(e)` đơn giản mặc định chạy dưới quyền ẩn danh (Simple Trigger) nên Google
 * CHẶN không cho phép gọi UrlFetchApp.fetch (lỗi: You do not have permission to call UrlFetchApp.fetch).
 * 
 * 👉 CÁCH KÍCH HOẠT:
 * 1. Mở Google Sheet -> Extensions (Tiện ích mở rộng) -> Apps Script.
 * 2. Dán toàn bộ mã nguồn này vào `Code.gs`.
 * 3. Đổi hằng số `CLOUDFLARE_API_URL` bên dưới thành URL ứng dụng Cloudflare của bạn (hoặc URL domain production).
 * 4. Bấm Lưu (Save).
 * 5. Chọn hàm `installTrigger` trên thanh công cụ và bấm Chạy (Run) 1 lần duy nhất để cấp quyền Installable Trigger.
 *    (Hoặc reload Google Sheet rồi chọn Menu: "⚡ Cloudflare DB Sync" -> "1. Cài đặt Trigger Tự Động onEdit/onChange").
 */

// Cấu hình URL Cloudflare App của bạn (Khi deploy lên Cloudflare Pages / Cloudflare Workers hoặc Custom Domain)
const CLOUDFLARE_API_URL = "https://dang-ky-luu-tru.pages.dev/api/ingest/ocr";
const API_SECRET_KEY = "kbtt-secret-key-2026"; // Tùy chọn nếu cấu hình secret

/**
 * Tạo Menu tiện ích trực tiếp trên giao diện Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Cloudflare DB Sync')
    .addItem('1. Cài đặt Trigger Tự Động onEdit/onChange (Chạy 1 lần)', 'installTrigger')
    .addSeparator()
    .addItem('2. Đồng bộ TAB HIỆN TẠI lên Cloudflare DB', 'syncCurrentSheetToCloudflare')
    .addItem('3. Đồng bộ TOÀN BỘ CÁC TAB lên Cloudflare DB', 'syncAllSheetsToCloudflare')
    .addToUi();
}

/**
 * Cài đặt Installable Trigger tự động cho Spreadsheet (cho phép gọi mạng UrlFetchApp)
 */
function installTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Xóa các trigger cũ để tránh trùng lặp
  const triggers = ScriptApp.getUserTriggers(ss);
  for (let i = 0; i < triggers.length; i++) {
    const fnName = triggers[i].getHandlerFunction();
    if (fnName === 'handleSheetEdit' || fnName === 'handleSheetChange' || fnName === 'onEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Tạo Installable Trigger cho onEdit
  ScriptApp.newTrigger('handleSheetEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // Tạo Installable Trigger cho onChange (bắt sự kiện khi n8n hoặc công cụ thứ 3 insert/paste dòng mới)
  ScriptApp.newTrigger('handleSheetChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();

  SpreadsheetApp.getUi().alert("✅ Đã kích hoạt Trigger Tự Động thành công!\nTừ bây giờ mỗi khi sửa hoặc thêm dòng mới, dữ liệu sẽ tự động đẩy vào Cloudflare Database và đánh dấu '✓ Đã nạp DB' ở cột 15.");
}

/**
 * Hàm xử lý khi có thao tác chỉnh sửa (Installable onEdit)
 */
function handleSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();

  for (let r = startRow; r < startRow + numRows; r++) {
    if (r <= 1) continue; // Bỏ qua tiêu đề
    syncRowToCloudflare(sheet, r);
  }
}

/**
 * Hàm xử lý khi có thay đổi cấu trúc bảng / n8n append dòng mới (Installable onChange)
 */
function handleSheetChange(e) {
  if (!e) return;
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  // Kiểm tra 10 dòng gần nhất xem dòng nào chưa có "✓ Đã nạp DB" thì đẩy lên
  const checkStart = Math.max(2, lastRow - 10);
  for (let r = checkStart; r <= lastRow; r++) {
    const statusVal = String(sheet.getRange(r, 15).getValue() || "").trim();
    if (!statusVal || !statusVal.includes("Đã nạp DB")) {
      syncRowToCloudflare(sheet, r);
    }
  }
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

  // Bỏ qua nếu dòng trống hoặc thiếu họ tên / số giấy tờ
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

    if (code >= 200 && code < 300) {
      // Đánh dấu thành công lên Cột 15 (Đã đăng ký)
      const statusCell = sheet.getRange(row, 15);
      const curVal = String(statusCell.getValue() || "").trim();
      if (!curVal || !curVal.includes("Đã nạp DB")) {
        statusCell.setValue("✓ Đã nạp DB");
      }
    } else {
      Logger.log(`Lỗi API trả về HTTP ${code}: ` + response.getContentText());
    }
  } catch (err) {
    Logger.log(`Lỗi kết nối Cloudflare (Dòng ${row}): ` + err.message);
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
  const rowIndices = [];

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
    rowIndices.push(i + 2);
  }

  if (rows.length === 0) {
    SpreadsheetApp.getUi().alert("Không tìm thấy dòng khách hợp lệ nào (cần có Họ tên và Số giấy tờ).");
    return;
  }

  const payload = {
    tabName: tabName,
    rows: rows
  };

  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': API_SECRET_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(CLOUDFLARE_API_URL, options);
    const code = response.getResponseCode();

    if (code >= 200 && code < 300) {
      for (let j = 0; j < rowIndices.length; j++) {
        const cell = sheet.getRange(rowIndices[j], 15);
        const curVal = String(cell.getValue() || "").trim();
        if (!curVal || !curVal.includes("Đã nạp DB")) {
          cell.setValue("✓ Đã nạp DB");
        }
      }
      SpreadsheetApp.getUi().alert(`✅ Đồng bộ thành công ${rows.length} khách từ tab "${tabName}" vào Cloudflare Database!`);
    } else {
      SpreadsheetApp.getUi().alert(`❌ Đồng bộ thất bại (HTTP ${code}):\n${response.getContentText()}`);
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert(`❌ Lỗi kết nối: ${err.message}`);
  }
}

/**
 * Đồng bộ tất cả các tab trong Spreadsheet
 */
function syncAllSheetsToCloudflare() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let totalSynced = 0;

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s];
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) continue;

    const values = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 15)).getValues();
    const rows = [];
    const rowIndices = [];

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
      rowIndices.push(i + 2);
    }

    if (rows.length > 0) {
      try {
        const options = {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-api-key': API_SECRET_KEY },
          payload: JSON.stringify({ tabName: sheet.getName(), rows }),
          muteHttpExceptions: true
        };
        const response = UrlFetchApp.fetch(CLOUDFLARE_API_URL, options);
        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
          for (let j = 0; j < rowIndices.length; j++) {
            const cell = sheet.getRange(rowIndices[j], 15);
            if (!String(cell.getValue() || "").includes("Đã nạp DB")) {
              cell.setValue("✓ Đã nạp DB");
            }
          }
          totalSynced += rows.length;
        }
      } catch (err) {
        Logger.log(`Lỗi tab ${sheet.getName()}: ${err.message}`);
      }
    }
  }

  SpreadsheetApp.getUi().alert(`✅ Đã quét toàn bộ các tab. Tổng cộng đồng bộ thành công ${totalSynced} khách vào Cloudflare Database!`);
}
