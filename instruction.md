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
    
    var rowData = body.row || body.data || {};
    
    // Đọc hàng tiêu đề ở dòng 1
    var lastCol = targetSheet.getLastColumn() || 16;
    var headers = [];
    if (targetSheet.getLastColumn() > 0) {
      headers = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }
    
    // Hàm chuẩn hóa loại bỏ dấu và ký tự đặc biệt để so khớp tên cột linh hoạt
    function cleanKey(str) {
      return String(str || '').toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '');
    }
    
    // 16 cột chuẩn của Google Sheet
    var standardCols = [
      'stt', 'hoten', 'ngaysinh', 'gioitinh', 'quoctich', 'loaigiayto', 'tengiayto', 'sogiayto',
      'tinh', 'quanhuyen', 'phuongxa', 'diachi', 'tungay', 'denngay', 'sophong', 'dadangky'
    ];
    
    var cleanMap = {};
    for (var k in rowData) {
      cleanMap[cleanKey(k)] = rowData[k];
    }
    
    // Ghi dữ liệu vào từng cột
    for (var col = 0; col < Math.max(headers.length, 16); col++) {
      var h = headers[col] || '';
      var cKey = cleanKey(h);
      var standardKey = standardCols[col] || '';
      var valToSet = undefined;
      
      if (h && rowData[h] !== undefined && rowData[h] !== '') {
        valToSet = rowData[h];
      } else if (cKey && cleanMap[cKey] !== undefined && cleanMap[cKey] !== '') {
        valToSet = cleanMap[cKey];
      } else if (standardKey && cleanMap[standardKey] !== undefined && cleanMap[standardKey] !== '') {
        valToSet = cleanMap[standardKey];
      }
      
      if (valToSet !== undefined) {
        targetSheet.getRange(targetRow, col + 1).setValue(valToSet);
      }
    }
    
    // Bắt buộc flush để Google Sheets ghi đè dữ liệu ngay lập tức
    SpreadsheetApp.flush();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã cập nhật dòng " + targetRow + " trên sheet [" + targetSheet.getName() + "]",
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
