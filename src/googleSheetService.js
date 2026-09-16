import { CONFIG } from './config.js';

/**
 * Service kéo và xử lý dữ liệu từ Google Sheets
 */
export class GoogleSheetService {
  constructor(defaultSheetId = CONFIG.GOOGLE_SHEET_ID) {
    this.sheetId = defaultSheetId;
  }

  /**
   * Phân tích chuỗi đầu vào (có thể là Sheet ID hoặc Full URL) để trích xuất Sheet ID và GID
   * @param {string} input Sheet ID hoặc Full URL
   * @returns {{ sheetId: string, gid?: string }}
   */
  parseSheetIdentifier(input) {
    if (!input) return { sheetId: this.sheetId };
    const str = String(input).trim();

    const urlMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = str.match(/[?&#]gid=([0-9]+)/);

    if (urlMatch) {
      return {
        sheetId: urlMatch[1],
        gid: gidMatch ? gidMatch[1] : undefined,
      };
    }

    return { sheetId: str };
  }

  /**
   * Lấy danh sách các Tab (Sheets) trong Google Spreadsheet và tìm tab theo ngày
   * @param {string} [input] Sheet ID hoặc Full URL
   * @returns {Promise<{ success: boolean, tabs: Array<{ name: string, gid: string, dateStr?: string, isDateTab: boolean, isDefault: boolean }>, defaultGid?: string }>}
   */
  async fetchSheetTabs(input = this.sheetId) {
    const { sheetId } = this.parseSheetIdentifier(input);
    if (!sheetId) return { success: false, tabs: [] };

    const htmlViewUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
    try {
      const res = await fetch(htmlViewUrl, { redirect: 'follow' });
      const html = await res.text();

      // Trích xuất các items từ JavaScript object trong htmlview
      const itemsRegex = /items\.push\(\{\s*name:\s*"([^"]+)",\s*pageUrl:[^}]+gid:\s*"([^"]+)"/g;
      const tabs = [];
      let match;

      while ((match = itemsRegex.exec(html)) !== null) {
        const name = match[1];
        const gid = match[2];
        const parsedDate = this._parseDateFromTabName(name);

        tabs.push({
          name,
          gid,
          dateStr: parsedDate ? parsedDate.toISOString().split('T')[0] : null,
          isDateTab: !!parsedDate,
          parsedDate,
        });
      }

      if (tabs.length === 0) {
        // Fallback default gid 0
        tabs.push({ name: 'Sheet 1', gid: '0', isDateTab: false });
      }

      // Tìm tab gần với ngày hiện tại nhất
      const now = new Date();
      let bestTab = null;
      let minDiff = Infinity;

      for (const tab of tabs) {
        if (tab.parsedDate) {
          const diff = Math.abs(tab.parsedDate.getTime() - now.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            bestTab = tab;
          }
        }
      }

      // Nếu không tìm thấy date tab, chọn tab cuối cùng (hoặc tab đầu tiên nếu có 1 tab)
      if (!bestTab) {
        bestTab = tabs.find(t => t.isDateTab) || tabs[tabs.length - 1] || tabs[0];
      }

      tabs.forEach(t => {
        t.isDefault = bestTab && t.gid === bestTab.gid;
        delete t.parsedDate; // Dọn sạch object để trả về JSON
      });

      return {
        success: true,
        tabs,
        defaultGid: bestTab ? bestTab.gid : tabs[0].gid,
      };
    } catch (err) {
      console.warn('[GoogleSheetService] Lỗi khi lấy danh sách tab:', err.message);
      return {
        success: false,
        tabs: [{ name: 'Mặc định', gid: '0', isDefault: true, isDateTab: false }],
        defaultGid: '0',
      };
    }
  }

  /**
   * Phân tích tên tab (ví dụ: 'ngay 15-09-26' hoặc '15-09-2026') thành đối tượng Date
   */
  _parseDateFromTabName(tabName) {
    if (!tabName) return null;
    const clean = String(tabName).toLowerCase().replace(/ngày|ngay/g, '').trim();

    // Định dạng DD-MM-YY hoặc DD-MM-YYYY hoặc DD/MM/YYYY
    const match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;

      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  /**
   * Kéo dữ liệu từ Google Sheets theo Sheet ID và GID cụ thể
   * @param {string} [input] Sheet ID hoặc URL đầy đủ
   * @param {string} [specificGid] GID của tab cần lấy
   * @param {string} [apiKey]
   * @returns {Promise<{ success: boolean, rows: Array<Object>, message?: string, source: string, sheetId?: string, gid?: string }>}
   */
  async fetchSheetData(input = this.sheetId, specificGid = null, apiKey = process.env.GOOGLE_API_KEY) {
    const parsed = this.parseSheetIdentifier(input);
    const sheetId = parsed.sheetId;
    const gid = specificGid !== null && specificGid !== undefined ? specificGid : parsed.gid;

    if (!sheetId) {
      return { success: false, rows: [], message: 'Thiếu Google Sheet ID' };
    }

    // 1. Kéo qua CSV Export công khai kết hợp gid
    const gidParam = gid ? `&gid=${gid}` : '';
    const exportCsvUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`,
    ];

    for (const url of exportCsvUrls) {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        const text = await res.text();

        if (res.ok && text && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
          const rows = this.parseCsv(text);
          if (rows && rows.length > 0) {
            return {
              success: true,
              rows,
              source: `Google Sheets CSV Export (Tab GID: ${gid || '0'})`,
              sheetId,
              gid: gid || '0',
            };
          }
        }
      } catch (err) {
        console.warn(`[GoogleSheetService] Không thể tải CSV từ ${url}:`, err.message);
      }
    }

    return {
      success: false,
      rows: [],
      message:
        'Không thể truy cập Google Sheet trực tiếp. Hãy đảm bảo Google Sheet đã được mở quyền: "Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link can view).',
      source: 'Direct Web Access',
      sheetId,
      gid,
    };
  }

  /**
   * Parser CSV an toàn hỗ trợ dấu ngoặc kép và ngắt dòng bên trong ô
   * @param {string} csvText
   * @returns {Array<Object>}
   */
  parseCsv(csvText) {
    const lines = [];
    let row = [];
    let cell = '';
    let insideQuote = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          cell += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(cell.trim());
        if (row.length > 0 && row.some(c => c !== '')) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell || row.length > 0) {
      row.push(cell.trim());
      if (row.some(c => c !== '')) {
        lines.push(row);
      }
    }

    return this._parseMatrixToObjects(lines);
  }

  /**
   * Chuyển ma trận 2 chiều thành mảng các Object dựa trên Header ở dòng đầu
   */
  _parseMatrixToObjects(matrix) {
    if (!matrix || matrix.length < 2) return [];

    const rawHeaders = matrix[0].map(h => String(h || '').trim());
    const objects = [];

    for (let r = 1; r < matrix.length; r++) {
      const rowValues = matrix[r];
      if (!rowValues || rowValues.every(val => !val || String(val).trim() === '')) {
        continue;
      }

      const rowObj = {};
      rawHeaders.forEach((header, colIdx) => {
        if (header) {
          const val = rowValues[colIdx] !== undefined ? String(rowValues[colIdx]).trim() : '';
          rowObj[header] = val;

          // Map chuẩn hóa tên trường
          const normalizedKey = this._mapHeaderToKey(header);
          if (normalizedKey && !rowObj[normalizedKey]) {
            rowObj[normalizedKey] = val;
          }
        }
      });

      objects.push(rowObj);
    }

    return objects;
  }

  /**
   * Ánh xạ tiêu đề cột từ Google Sheets sang thuộc tính chuẩn
   */
  _mapHeaderToKey(headerName) {
    const clean = String(headerName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (clean.includes('ho ten') || clean.includes('ten khach') || clean === 'name') return 'hoTen';
    if (clean === 'd o b' || clean === 'dob' || clean.includes('ngay sinh') || clean === 'birth') return 'ngaySinh';
    if (clean.includes('gioi tinh') || clean === 'gender') return 'gioiTinh';
    if (clean.includes('quoc tich') || clean.includes('quoc gia') || clean === 'nationality') return 'quocTich';
    if (clean.includes('loai giay to') || clean.includes('ten giay to') || clean === 'id type') return 'loaiGiayTo';
    if (clean.includes('so giay to') || clean.includes('so cccd') || clean.includes('so ho chieu') || clean === 'id number') return 'soGiayTo';
    if (clean.includes('dia chi chi tiet') || clean === 'dia chi' || clean === 'address') return 'diaChi';
    if (clean.includes('tinh') || clean.includes('thanh pho') || clean === 'province') return 'tinhTp';
    if (clean.includes('phuong') || clean.includes('xa') || clean === 'ward') return 'phuongXa';
    if (clean.includes('quan') || clean.includes('huyen') || clean === 'district') return 'quanHuyen';
    if (clean.includes('tu ngay') || clean.includes('ngay den') || clean === 'check in' || clean === 'checkin') return 'ngayDen';
    if (clean.includes('den ngay') || clean.includes('ngay di') || clean === 'check out' || clean === 'checkout') return 'ngayDi';
    if (clean.includes('thoi han tam tru')) return 'thoiHanTamTru';
    if (clean.includes('ly do chi tiet')) return 'lyDoChiTiet';
    if (clean.includes('ly do') || clean === 'reason') return 'lyDo';
    if (clean.includes('so phong') || clean.includes('phong') || clean === 'room') return 'soPhong';
    if (clean.includes('dien thoai') || clean === 'sdt' || clean.includes('sdt') || clean === 'phone') return 'soDienThoai';
    if (clean.includes('loai cu tru') || clean.includes('noi cu tru')) return 'noiCuTru';
    if (clean.includes('anh truoc') || clean.includes('mat truoc')) return 'anhTruocB64';
    if (clean.includes('anh sau') || clean.includes('mat sau')) return 'anhSauB64';
    if (clean.includes('anh ho chieu') || clean.includes('passport')) return 'anhHoChieuB64';
    if (clean.includes('ghi chu') || clean === 'note') return 'ghiChu';

    return null;
  }
}
