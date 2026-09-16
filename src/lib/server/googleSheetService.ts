import { CONFIG } from './config.js';

export interface TabInfo {
  name: string;
  gid: string;
  dateStr?: string | null;
  isDateTab?: boolean;
  isDefault?: boolean;
}

export class GoogleSheetService {
  public sheetId: string;
  private tabsCache = new Map<string, { time: number; data: { success: boolean; tabs: TabInfo[]; defaultGid: string } }>();

  public constructor(sheetId: string = CONFIG.GOOGLE_SHEET_ID) {
    this.sheetId = sheetId;
  }

  public parseSheetIdentifier(input: string = this.sheetId): { sheetId: string; gid: string } {
    if (!input) return { sheetId: this.sheetId, gid: '0' };
    const str = String(input).trim();

    const idMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = str.match(/[#&?]gid=([0-9]+)/);

    const sheetId = idMatch ? idMatch[1] : (str.length > 20 && !str.includes('/') ? str : this.sheetId);
    const gid = gidMatch ? gidMatch[1] : '0';

    return { sheetId, gid };
  }

  public async fetchSheetTabs(input: string = this.sheetId, forceRefresh = false): Promise<{ success: boolean; tabs: TabInfo[]; defaultGid: string }> {
    const { sheetId } = this.parseSheetIdentifier(input);
    if (!sheetId) return { success: false, tabs: [], defaultGid: '0' };

    const cacheKey = sheetId;
    const now = Date.now();
    if (!forceRefresh && this.tabsCache.has(cacheKey)) {
      const cached = this.tabsCache.get(cacheKey);
      if (cached && now - cached.time < 60000) {
        return cached.data;
      }
    }

    const htmlViewUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
    try {
      const res = await fetch(htmlViewUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const html = await res.text();

      // Dùng itemsRegex quét chính xác JavaScript items.push của Google Sheets
      const itemsRegex = /items\.push\(\{\s*name:\s*"([^"]+)",\s*pageUrl:[^}]+gid:\s*"([^"]+)"/g;
      const tabs: Array<TabInfo & { parsedDate?: Date | null }> = [];
      let match: RegExpExecArray | null;

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
        // Fallback quét li tab hoặc thẻ a
        const fallbackRegex = /<li\s+id="sheet-button-([0-9]+)"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
        while ((match = fallbackRegex.exec(html)) !== null) {
          const gid = match[1];
          const name = match[2].trim().replace(/<[^>]+>/g, '');
          const parsedDate = this._parseDateFromTabName(name);
          tabs.push({
            name,
            gid,
            dateStr: parsedDate ? parsedDate.toISOString().split('T')[0] : null,
            isDateTab: !!parsedDate,
            parsedDate,
          });
        }
      }

      if (tabs.length === 0) {
        tabs.push({ name: 'Sheet 1', gid: '0', isDateTab: false });
      }

      // Tìm tab gần với ngày hiện tại nhất
      const nowDate = new Date();
      let bestTab: (TabInfo & { parsedDate?: Date | null }) | null = null;
      let minDiff = Infinity;

      for (const tab of tabs) {
        if (tab.parsedDate) {
          const diff = Math.abs(tab.parsedDate.getTime() - nowDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            bestTab = tab;
          }
        }
      }

      if (!bestTab) {
        bestTab = tabs.find(t => t.isDateTab) || tabs[tabs.length - 1] || tabs[0];
      }

      const cleanTabs: TabInfo[] = tabs.map(t => {
        const isDef = Boolean(bestTab && t.gid === bestTab.gid);
        return {
          name: t.name,
          gid: t.gid,
          dateStr: t.dateStr,
          isDateTab: t.isDateTab,
          isDefault: isDef,
        };
      });

      const result = {
        success: true,
        tabs: cleanTabs,
        defaultGid: bestTab ? bestTab.gid : tabs[0].gid,
      };
      this.tabsCache.set(cacheKey, { time: Date.now(), data: result });
      return result;
    } catch (err) {
      console.warn('[GoogleSheetService] Lỗi khi lấy tabs:', (err as Error).message);
      return {
        success: false,
        tabs: [{ name: 'Mặc định', gid: '0', isDefault: true, isDateTab: false }],
        defaultGid: '0',
      };
    }
  }

  private _parseDateFromTabName(tabName: string): Date | null {
    if (!tabName) return null;
    const clean = String(tabName).toLowerCase().replace(/ngày|ngay/g, '').trim();
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

  public async fetchSheetData(input: string = this.sheetId, specificGid: string | null = null, apiKey?: string) {
    const parsed = this.parseSheetIdentifier(input);
    const sheetId = parsed.sheetId;
    const gid = specificGid !== null && specificGid !== undefined ? specificGid : parsed.gid;

    if (!sheetId) {
      return { success: false, rows: [], message: 'Thiếu Google Sheet ID', source: 'error' };
    }

    // 1. Thử export CSV công khai
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const res = await fetch(csvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });

      if (res.ok) {
        const text = await res.text();
        const rows = this.parseCsv(text);
        if (rows.length > 0) {
          return {
            success: true,
            rows,
            source: 'csv_export',
            sheetId,
            gid,
          };
        }
      }
    } catch (csvErr) {
      console.warn('[GoogleSheetService] Không thể kéo CSV:', (csvErr as Error).message);
    }

    // 2. Thử Google Sheets API v4 nếu có apiKey
    if (apiKey) {
      try {
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z100?key=${apiKey}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          const rows = this._parseApiValues(data.values || []);
          return {
            success: true,
            rows,
            source: 'api_v4',
            sheetId,
            gid,
          };
        }
      } catch (apiErr) {
        console.warn('[GoogleSheetService] Không thể gọi API v4:', (apiErr as Error).message);
      }
    }

    return {
      success: false,
      rows: [],
      message: 'Không thể kéo dữ liệu từ Google Sheet. Vui lòng đảm bảo Sheet được chia sẻ công khai.',
      source: 'failed',
    };
  }

  public parseCsv(csvText: string): Record<string, string>[] {
    if (!csvText || !csvText.trim()) return [];

    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField);
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentLine.push(currentField);
        if (currentLine.some(f => f.trim().length > 0)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentLine.length > 0) {
      currentLine.push(currentField);
      if (currentLine.some(f => f.trim().length > 0)) {
        lines.push(currentLine);
      }
    }

    if (lines.length < 2) return [];

    const rawHeaders = lines[0].map(h => h.trim());
    const dataObjects: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const obj: Record<string, string> = {};
      let hasData = false;

      rawHeaders.forEach((header, colIdx) => {
        const val = (row[colIdx] || '').trim();
        if (val) hasData = true;
        obj[header] = val;
        const normalizedKey = this._mapHeaderToKey(header);
        if (normalizedKey && !obj[normalizedKey]) {
          obj[normalizedKey] = val;
        }
      });

      if (hasData && (obj.hoTen || obj['Họ tên'] || obj.soGiayTo || obj['Số CCCD'] || obj['Số giấy tờ'])) {
        dataObjects.push(obj);
      }
    }

    return dataObjects;
  }

  private _parseApiValues(values: string[][]): Record<string, string>[] {
    if (!values || values.length < 2) return [];
    const headers = values[0].map(h => String(h).trim());
    const result: Record<string, string>[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj: Record<string, string> = {};
      let hasData = false;
      headers.forEach((h, col) => {
        const val = String(row[col] || '').trim();
        if (val) hasData = true;
        obj[h] = val;
        const k = this._mapHeaderToKey(h);
        if (k && !obj[k]) obj[k] = val;
      });
      if (hasData) result.push(obj);
    }
    return result;
  }

  private _mapHeaderToKey(headerName: string): string | null {
    const clean = String(headerName || '').toLowerCase().trim();
    if (clean.includes('họ tên') || clean.includes('họ và tên') || clean === 'ho ten') return 'hoTen';
    if (clean.includes('ngày sinh') || clean.includes('d.o.b') || clean === 'dob') return 'ngaySinh';
    if (clean.includes('giới tính') || clean === 'gioi tinh' || clean === 'sex' || clean === 'gender') return 'gioiTinh';
    if (clean.includes('quốc tịch') || clean.includes('quốc gia') || clean === 'nationality') return 'quocTich';
    if (clean.includes('số phòng') || clean.includes('phòng') || clean === 'room') return 'soPhong';
    if (clean.includes('ngày đến') || clean.includes('(từ ngày)') || clean.includes('từ ngày') || clean === 'check in') return 'ngayDen';
    if (clean.includes('ngày đi') || clean.includes('(đến ngày)') || clean.includes('đến ngày') || clean === 'check out') return 'ngayDi';
    if (clean.includes('loại giấy tờ') || clean.includes('tên giấy tờ')) return 'loaiGiayTo';
    if (clean.includes('số cccd') || clean.includes('số cmnd') || clean.includes('số giấy tờ') || clean.includes('số hộ chiếu')) return 'soGiayTo';
    if (clean.includes('địa chỉ chi tiết') || clean.includes('địa chỉ') || clean === 'dia chi') return 'diaChi';
    if (clean.includes('tỉnh/tp') || clean.includes('tỉnh') || clean === 'province') return 'tinhTp';
    if (clean.includes('phường/xã') || clean.includes('xã') || clean === 'ward') return 'phuongXa';
    if (clean.includes('quận/huyện') || clean.includes('huyện') || clean === 'district') return 'quanHuyen';
    if (clean.includes('thời hạn tạm trú')) return 'thoiHanTamTru';
    return null;
  }

  public async updateSheetRow(params: {
    sheetId: string;
    gid: string;
    rowIndex: number;
    rowData: Record<string, unknown>;
  }): Promise<{ success: boolean; message: string; notConfigured?: boolean }> {
    const appsScriptUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || CONFIG.GOOGLE_APPS_SCRIPT_URL || '').trim();
    if (!appsScriptUrl) {
      return {
        success: false,
        notConfigured: true,
        message: 'GOOGLE_APPS_SCRIPT_URL chưa được cấu hình. Dữ liệu đã lưu tạm thời trên UI.',
      };
    }

    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateRow',
          sheetId: params.sheetId || CONFIG.GOOGLE_SHEET_ID,
          gid: params.gid || '0',
          rowIndex: params.rowIndex,
          row: params.rowData,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Lỗi Webhook (${res.status}): ${text}` };
      }

      const data = await res.json();
      return {
        success: Boolean(data.success),
        message: (data.message as string) || (data.success ? 'Cập nhật Google Sheet thành công!' : 'Apps Script báo lỗi.'),
      };
    } catch (err) {
      return { success: false, message: `Lỗi mạng khi gọi Apps Script: ${(err as Error).message}` };
    }
  }
}
