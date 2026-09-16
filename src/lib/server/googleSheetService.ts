import { CONFIG } from './config.js';

export interface SheetTabInfo {
  gid: string;
  name: string;
  dateStr?: string;
  parsedDate?: Date;
}

export interface RawRowObject {
  [key: string]: string;
}

export class GoogleSheetService {
  public static async fetchPublicSheetTabs(sheetId: string = CONFIG.GOOGLE_SHEET_ID): Promise<SheetTabInfo[]> {
    const htmlUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
    try {
      const res = await fetch(htmlUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!res.ok) {
        return [{ gid: '0', name: 'Trang tính 1' }];
      }
      const html = await res.text();
      const tabs: SheetTabInfo[] = [];

      const itemRegex = /<li\s+id="sheet-button-([0-9]+)"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;
      let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(html)) !== null) {
        const gid = match[1];
        const name = match[2].trim().replace(/<[^>]+>/g, '');
        if (gid && name) {
          tabs.push({ gid, name });
        }
      }

      if (tabs.length === 0) {
        const fallbackRegex = /#gid=([0-9]+)["'][^>]*>([^<]+)<\/a>/gi;
        while ((match = fallbackRegex.exec(html)) !== null) {
          const gid = match[1];
          const name = match[2].trim();
          if (gid && name && !tabs.some(t => t.gid === gid)) {
            tabs.push({ gid, name });
          }
        }
      }

      return tabs.length > 0 ? tabs : [{ gid: '0', name: 'Trang tính 1' }];
    } catch {
      return [{ gid: '0', name: 'Trang tính 1' }];
    }
  }

  public static findClosestTab(tabs: SheetTabInfo[]): SheetTabInfo | null {
    if (!tabs || tabs.length === 0) return null;

    const parsedTabs = tabs.map(t => {
      const match = t.name.match(/(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const currentYear = new Date().getFullYear();
        let year = currentYear;
        if (match[3]) {
          const yNum = parseInt(match[3], 10);
          year = yNum < 100 ? 2000 + yNum : yNum;
        }
        const d = new Date(year, month, day);
        return { ...t, dateStr: t.name, parsedDate: d };
      }
      return { ...t, parsedDate: undefined };
    });

    const datedTabs = parsedTabs.filter(t => t.parsedDate && !isNaN(t.parsedDate.getTime()));
    if (datedTabs.length === 0) {
      return tabs[tabs.length - 1];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    datedTabs.sort((a, b) => {
      const diffA = Math.abs((a.parsedDate as Date).getTime() - today.getTime());
      const diffB = Math.abs((b.parsedDate as Date).getTime() - today.getTime());
      return diffA - diffB;
    });

    return datedTabs[0];
  }

  public static async fetchPublicSheetCsv(sheetId: string = CONFIG.GOOGLE_SHEET_ID, gid = '0'): Promise<string> {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!res.ok) {
      throw new Error(`[GoogleSheetService] Không thể tải Google Sheet CSV (${res.status}): ${res.statusText}`);
    }

    return await res.text();
  }

  public static parseCsv(csvText: string): RawRowObject[] {
    if (!csvText || !csvText.trim()) return [];

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        if (currentRow.some(field => field.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some(field => field.trim().length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) return [];

    const rawHeaders = rows[0].map(h => h.trim());
    const headerMapping = this.buildHeaderMapping(rawHeaders);

    const dataObjects: RawRowObject[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const obj: RawRowObject = {};
      let hasData = false;

      rawHeaders.forEach((header, colIdx) => {
        const value = (row[colIdx] || '').trim();
        if (value) hasData = true;
        obj[header] = value;
        const normalizedKey = headerMapping[header];
        if (normalizedKey && !obj[normalizedKey]) {
          obj[normalizedKey] = value;
        }
      });

      if (hasData && (obj.hoTen || obj['Họ tên'] || obj['Họ và tên'] || obj.soGiayTo || obj['Số CCCD'] || obj['Số giấy tờ'])) {
        dataObjects.push(obj);
      }
    }

    return dataObjects;
  }

  public static buildHeaderMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    headers.forEach(h => {
      const clean = h.toLowerCase().trim();
      if (clean.includes('họ tên') || clean.includes('họ và tên') || clean === 'ho ten') {
        mapping[h] = 'hoTen';
      } else if (clean.includes('ngày sinh') || clean.includes('d.o.b') || clean === 'dob' || clean === 'ngay sinh') {
        mapping[h] = 'ngaySinh';
      } else if (clean.includes('giới tính') || clean === 'gioi tinh' || clean === 'sex' || clean === 'gender') {
        mapping[h] = 'gioiTinh';
      } else if (clean.includes('quốc tịch') || clean.includes('quốc gia') || clean === 'nationality' || clean === 'quoc gia') {
        mapping[h] = 'quocTich';
      } else if (clean.includes('số phòng') || clean.includes('phòng') || clean === 'room' || clean === 'so phong') {
        mapping[h] = 'soPhong';
      } else if (clean.includes('ngày đến') || clean.includes('(từ ngày)') || clean.includes('từ ngày') || clean === 'check in' || clean === 'ngay den') {
        mapping[h] = 'ngayDen';
      } else if (clean.includes('ngày đi') || clean.includes('(đến ngày)') || clean.includes('đến ngày') || clean === 'check out' || clean === 'ngay di') {
        mapping[h] = 'ngayDi';
      } else if (clean.includes('loại giấy tờ') || clean.includes('tên giấy tờ') || clean === 'loai giay to') {
        mapping[h] = 'loaiGiayTo';
      } else if (clean.includes('số cccd') || clean.includes('số cmnd') || clean.includes('số giấy tờ') || clean.includes('số hộ chiếu') || clean === 'so giay to') {
        mapping[h] = 'soGiayTo';
      } else if (clean.includes('địa chỉ chi tiết') || clean.includes('địa chỉ') || clean === 'dia chi') {
        mapping[h] = 'diaChi';
      } else if (clean.includes('tỉnh/tp') || clean.includes('tỉnh') || clean === 'tinh tp' || clean === 'province') {
        mapping[h] = 'tinhTp';
      } else if (clean.includes('phường/xã') || clean.includes('xã') || clean === 'phuong xa' || clean === 'ward') {
        mapping[h] = 'phuongXa';
      } else if (clean.includes('quận/huyện') || clean.includes('huyện') || clean === 'quan huyen' || clean === 'district') {
        mapping[h] = 'quanHuyen';
      } else if (clean.includes('thời hạn tạm trú') || clean === 'thoi han tam tru') {
        mapping[h] = 'thoiHanTamTru';
      }
    });
    return mapping;
  }

  public static async updateRowViaAppsScript(params: {
    sheetId?: string;
    gid?: string;
    sheetName?: string;
    rowIndex: number;
    row: Record<string, unknown>;
  }): Promise<{ success: boolean; message: string; notConfigured?: boolean; rawResponse?: unknown }> {
    const appsScriptUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || CONFIG.GOOGLE_APPS_SCRIPT_URL || '').trim();
    if (!appsScriptUrl) {
      return {
        success: false,
        notConfigured: true,
        message: 'GOOGLE_APPS_SCRIPT_URL chưa được cấu hình. Dữ liệu đã lưu tạm thời trên frontend.',
      };
    }

    try {
      const payload = {
        action: 'updateRow',
        sheetId: params.sheetId || CONFIG.GOOGLE_SHEET_ID,
        gid: params.gid || '0',
        sheetName: params.sheetName || '',
        rowIndex: params.rowIndex,
        row: params.row,
      };

      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          message: `Lỗi kết nối Webhook (${res.status}): ${text}`,
        };
      }

      const data = await res.json();
      return {
        success: Boolean(data.success),
        message: (data.message as string) || (data.success ? 'Cập nhật Google Sheet thành công!' : 'Apps Script báo lỗi.'),
        rawResponse: data,
      };
    } catch (err) {
      return {
        success: false,
        message: `Lỗi mạng khi gọi Apps Script: ${(err as Error).message}`,
      };
    }
  }
}
