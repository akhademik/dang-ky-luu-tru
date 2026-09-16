# HƯỚNG DẪN VÀ TOÀN BỘ MÃ NGUỒN GOOGLE APPS SCRIPT (FULL CODE)

Dưới đây là toàn bộ mã nguồn Google Apps Script đã được gộp hoàn chỉnh (bao gồm Webhook xử lý cập nhật hai chiều từ Web UI, hàm dọn dẹp `cleanupSheets` và hàm tự động căn chỉnh kích thước cột `autoResizeTodaySheet`).

---

## 1. Hướng dẫn cài đặt nhanh (Copy & Deploy)

1. Mở Google Sheet: `https://docs.google.com/spreadsheets/d/16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q/edit`
2. Chọn menu **Tiện ích mở rộng (Extensions)** $\rightarrow$ **Apps Script**.
3. **Xóa toàn bộ mã cũ** trong file `Code.gs` và copy toàn bộ khối mã ở **Mục 2** bên dưới dán vào.
4. Bấm **Lưu (Save / 💾)** (hoặc `Ctrl + S`).
5. Bấm **Triển khai (Deploy)** $\rightarrow$ **Quản lý bản triển khai (Manage deployments)**:
   - Bấm vào biểu tượng **Chỉnh sửa (Bút chì ✏️)** ở góc phải.
   - Tại mục **Phiên bản (Version)**: chọn **Phiên bản mới (New version)**.
   - Bấm **Triển khai (Deploy)**.
6. Hoàn tất! Khi bạn sửa dữ liệu trên Web UI và bấm **Lưu (💾)**, dữ liệu sẽ được ghi trực tiếp vào đúng hàng và cột trên Google Sheet.

---

## 2. Toàn bộ mã nguồn Google Apps Script (Code.gs)

```javascript
/**
 * =========================================================================
 * GOOGLE APPS SCRIPT CHO HỆ THỐNG ĐĂNG KÝ LƯU TRÚ (KBTT)
 * Tích hợp: 
 * 1. Webhook cập nhật 2 chiều từ Web UI (doGet / doPost)
 * 2. Tự động dọn dẹp các tab cũ (cleanupSheets)
 * 3. Tự động căn chỉnh độ rộng cột kèm padding (autoResizeTodaySheet)
 * =========================================================================
 */

var SPREADSHEET_ID = "16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q";

/**
 * Xử lý yêu cầu GET để kiểm tra trạng thái Webhook
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: "Google Sheet Webhook is active and running!"
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Xử lý yêu cầu POST từ Web UI để cập nhật dữ liệu dòng đã chỉnh sửa
 */
function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "{}";
    var body = JSON.parse(contents);
    
    // Tự động lấy Spreadsheet đang mở hoặc mở theo ID
    var ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch(err) {}
    
    if (!ss) {
      try {
        ss = SpreadsheetApp.openById(body.id || body.sheetId || body.spreadsheetId || SPREADSHEET_ID);
      } catch(err) {}
    }
    
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Không tìm thấy Spreadsheet."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Tìm tab theo sheetName hoặc gid hoặc active sheet
    var sheets = ss.getSheets();
    var targetSheet = null;
    
    if (body.sheetName) {
      targetSheet = ss.getSheetByName(body.sheetName);
    }
    if (!targetSheet && body.gid !== undefined && body.gid !== null) {
      for (var i = 0; i < sheets.length; i++) {
        if (String(sheets[i].getSheetId()) === String(body.gid)) {
          targetSheet = sheets[i];
          break;
        }
      }
    }
    if (!targetSheet) {
      targetSheet = sheets[0];
    }
    
    // XỬ LÝ HÀNH ĐỘNG XÓA DÒNG (deleteRow)
    if (body.action === "deleteRow") {
      var rowToDelete = null;
      if (body.sheetRowIndex !== undefined && body.sheetRowIndex !== null && Number(body.sheetRowIndex) >= 2) {
        rowToDelete = Number(body.sheetRowIndex);
      } else if (body.rowIndex !== undefined && body.rowIndex !== null && Number(body.rowIndex) >= 0) {
        rowToDelete = Number(body.rowIndex) + 2;
      }
      
      if (!rowToDelete || rowToDelete < 2) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Không được phép xóa dòng tiêu đề hoặc chỉ số dòng không hợp lệ."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var lastRow = targetSheet.getLastRow();
      if (rowToDelete <= lastRow) {
        // Xóa sạch toàn bộ nội dung cả 16 cột trước khi xóa vật lý dòng
        try {
          var numCols = Math.max(16, targetSheet.getLastColumn());
          targetSheet.getRange(rowToDelete, 1, 1, numCols).clearContent();
        } catch(errClear) {}
        targetSheet.deleteRow(rowToDelete);
        SpreadsheetApp.flush();
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã xóa hoàn toàn dòng " + rowToDelete + " trên sheet [" + targetSheet.getName() + "]",
        sheetName: targetSheet.getName(),
        deletedRow: rowToDelete
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Xác định dòng trên Google Sheet (Tuyệt đối không bao giờ ghi vào Dòng 1 Tiêu đề)
    // 1. Nếu có body.sheetRowIndex (1-based): dùng trực tiếp (yêu cầu >= 2)
    // 2. Nếu có body.rowIndex (0-based): sheetRowIndex = body.rowIndex + 2
    // 3. Nếu là thêm mới hoặc không xác định: ghi vào dòng trống tiếp theo (targetSheet.getLastRow() + 1)
    var targetRow = null;
    if (body.sheetRowIndex !== undefined && body.sheetRowIndex !== null && Number(body.sheetRowIndex) >= 2) {
      targetRow = Number(body.sheetRowIndex);
    } else if (body.rowIndex !== undefined && body.rowIndex !== null && Number(body.rowIndex) >= 0) {
      targetRow = Number(body.rowIndex) + 2;
    } else {
      targetRow = Math.max(2, targetSheet.getLastRow() + 1);
    }
    
    // Tự động khôi phục hàng tiêu đề Dòng 1 nếu dòng 1 bị sai hoặc ghi đè dữ liệu
    var STANDARD_HEADERS = [
      "STT", "Họ tên", "D.O.B", "Giới tính", "Quốc tịch", "Loại giấy tờ", "Tên giấy tờ", "Số giấy tờ",
      "Tỉnh", "Quận/Huyện", "Phường/Xã", "Địa chỉ", "(từ ngày)", "(đến ngày)", "Số phòng", "Đã đăng ký"
    ];
    try {
      var firstRowVal = targetSheet.getRange(1, 2).getValue();
      if (String(firstRowVal).trim() !== "Họ tên") {
        targetSheet.getRange(1, 1, 1, 16).setValues([STANDARD_HEADERS]);
      }
    } catch(errHeader) {}

    var rowData = body.row || body.data || {};
    var orderedValues = body.orderedValues || body.values;
    
    // Nếu có orderedValues được truyền trực tiếp từ Web UI (16 cột chuẩn)
    if (orderedValues && Array.isArray(orderedValues) && orderedValues.length > 0) {
      var finalValues = [];
      for (var v = 0; v < 16; v++) {
        finalValues.push(orderedValues[v] !== undefined && orderedValues[v] !== null ? String(orderedValues[v]) : "");
      }
      targetSheet.getRange(targetRow, 1, 1, 16).setValues([finalValues]);
    } else {
      // 16 cột chuẩn của Google Sheet theo thứ tự
      var colValues = [
        rowData.stt || rowData.STT || String(targetRow - 1),
        rowData.hoTen || rowData["Họ tên"] || "",
        rowData.ngaySinh || rowData["Ngày sinh"] || rowData["D.O.B"] || "",
        rowData.gioiTinh || rowData["Giới tính"] || "Nam",
        (rowData.quocTich || rowData["Quốc tịch"] || rowData["Quốc gia"] || "VNM").toString().toUpperCase(),
        rowData.loaiGiayTo || rowData["Loại giấy tờ"] || "Thẻ CCCD",
        rowData.tenGiayTo || rowData["Tên giấy tờ"] || rowData.loaiGiayTo || rowData["Loại giấy tờ"] || "Thẻ CCCD",
        rowData.soGiayTo || rowData["Số giấy tờ"] || rowData["Số CCCD"] || rowData.soHoChieu || rowData["Số hộ chiếu"] || "",
        rowData.tinhTp || rowData.tinh || rowData["Tỉnh"] || rowData["Tỉnh/TP"] || "",
        rowData.quanHuyen || rowData.huyen || rowData["Quận/Huyện"] || rowData["Quận"] || rowData["Huyện"] || "",
        rowData.phuongXa || rowData.xa || rowData["Phường/Xã"] || rowData["Phường"] || rowData["Xã"] || "",
        rowData.diaChi || rowData["Địa chỉ"] || rowData["Địa chỉ chi tiết"] || "",
        rowData.ngayDen || rowData["(từ ngày)"] || rowData["Ngày đến"] || rowData.tuNgay || "",
        rowData.ngayDi || rowData["(đến ngày)"] || rowData["Ngày đi"] || rowData.denNgay || "",
        (String(rowData.soPhong || rowData["Số phòng"] || "1").match(/\d+/) || ["1"])[0],
        rowData.daDangKy || rowData["Đã đăng ký"] || "Chưa đăng ký"
      ];
      targetSheet.getRange(targetRow, 1, 1, 16).setValues([colValues]);
    }
    
    // Bắt buộc flush để Google Sheets ghi đè dữ liệu ngay lập tức
    SpreadsheetApp.flush();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã cập nhật đầy đủ 16 cột dòng " + targetRow + " trên sheet [" + targetSheet.getName() + "]",
      sheetName: targetSheet.getName(),
      rowIndex: targetRow - 2,
      sheetRowIndex: targetRow
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Dọn dẹp các tab cũ, chỉ giữ lại tối đa 5 tab gần nhất
 */
function cleanupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var sheets = ss.getSheets();
  var totalSheets = sheets.length;
  var maxSheetsToKeep = 5; 
  
  if (totalSheets <= maxSheetsToKeep) {
    return;
  }
  
  var deleteStart = 1;
  var deleteEnd = totalSheets - 4; 
  
  for (var i = deleteEnd - 1; i >= deleteStart; i--) {
    try {
      ss.deleteSheet(sheets[i]);
    } catch (e) {
      // Bỏ qua lỗi nếu có sheet bị khóa hoặc không thể xóa
    }
  }
}

/**
 * Tự động căn chỉnh độ rộng cột của tab ngày hôm nay kèm thêm padding chống che chữ
 */
function autoResizeTodaySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  
  var today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd-MM-yy');
  var sheetName = 'ngay ' + today;
  var sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      // Bước 1: Để Google tự động căn chỉnh
      sheet.autoResizeColumns(1, lastCol);
      
      // Bước 2: Thêm padding bù trừ pixel cho từng cột
      var extraPadding = 15;
      for (var col = 1; col <= lastCol; col++) {
        var currentWidth = sheet.getColumnWidth(col);
        sheet.setColumnWidth(col, currentWidth + extraPadding);
      }
    }
  }
}
```
