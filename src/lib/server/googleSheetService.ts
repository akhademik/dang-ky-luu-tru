import { CONFIG } from "./config.js";
import { logger } from "./logger.js";

export interface TabInfo {
	name: string;
	gid: string;
	dateStr?: string | null;
	isDateTab?: boolean;
	isDefault?: boolean;
}

export class GoogleSheetService {
	public sheetId: string;
	private tabHeadersMap = new Map<string, string[]>();
	private tabsCache = new Map<
		string,
		{
			time: number;
			data: { success: boolean; tabs: TabInfo[]; defaultGid: string };
		}
	>();

	public constructor(sheetId: string = CONFIG.GOOGLE_SHEET_ID) {
		this.sheetId = sheetId;
	}

	public parseSheetIdentifier(input: string = this.sheetId): {
		sheetId: string;
		gid: string;
	} {
		if (!input) return { sheetId: this.sheetId, gid: "0" };
		const str = String(input).trim();

		const idMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
		const gidMatch = str.match(/[#&?]gid=([0-9]+)/);

		const sheetId = idMatch
			? idMatch[1]
			: str.length > 20 && !str.includes("/")
				? str
				: this.sheetId;
		const gid = gidMatch ? gidMatch[1] : "0";

		return { sheetId, gid };
	}

	public async fetchSheetTabs(
		input: string = this.sheetId,
		forceRefresh = false,
	): Promise<{ success: boolean; tabs: TabInfo[]; defaultGid: string }> {
		const { sheetId } = this.parseSheetIdentifier(input);
		if (!sheetId) {
			logger.error("GoogleSheetService", "Không xác định được Sheet ID");
			return { success: false, tabs: [], defaultGid: "0" };
		}

		const cacheKey = sheetId;
		const now = Date.now();
		if (!forceRefresh && this.tabsCache.has(cacheKey)) {
			const cached = this.tabsCache.get(cacheKey);
			if (cached && now - cached.time < 60000) {
				logger.debug("GoogleSheetService", "Sử dụng cache danh sách tab", {
					count: cached.data.tabs.length,
				});
				return cached.data;
			}
		}

		const htmlViewUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
		logger.info(
			"GoogleSheetService",
			`Đang quét danh sách Tabs từ: ${htmlViewUrl}`,
		);
		try {
			const res = await fetch(htmlViewUrl, {
				redirect: "follow",
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				},
			});
			const html = await res.text();

			// Dùng itemsRegex quét chính xác JavaScript items.push của Google Sheets
			const itemsRegex =
				/items\.push\(\{\s*name:\s*"([^"]+)",\s*pageUrl:[^}]+gid:\s*"([^"]+)"/g;
			const tabs: Array<TabInfo & { parsedDate?: Date | null }> = [];
			let match: RegExpExecArray | null;

			while ((match = itemsRegex.exec(html)) !== null) {
				const name = match[1];
				const gid = match[2];
				const parsedDate = this._parseDateFromTabName(name);

				tabs.push({
					name,
					gid,
					dateStr: parsedDate ? parsedDate.toISOString().split("T")[0] : null,
					isDateTab: !!parsedDate,
					parsedDate,
				});
			}

			if (tabs.length === 0) {
				// Fallback quét li tab hoặc thẻ a
				const fallbackRegex =
					/<li\s+id="sheet-button-([0-9]+)"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
				while ((match = fallbackRegex.exec(html)) !== null) {
					const gid = match[1];
					const name = match[2].trim().replace(/<[^>]+>/g, "");
					const parsedDate = this._parseDateFromTabName(name);
					tabs.push({
						name,
						gid,
						dateStr: parsedDate ? parsedDate.toISOString().split("T")[0] : null,
						isDateTab: !!parsedDate,
						parsedDate,
					});
				}
			}

			if (tabs.length === 0) {
				tabs.push({ name: "Sheet 1", gid: "0", isDateTab: false });
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
				bestTab =
					tabs.find((t) => t.isDateTab) || tabs[tabs.length - 1] || tabs[0];
			}

			const cleanTabs: TabInfo[] = tabs.map((t) => {
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
			logger.info(
				"GoogleSheetService",
				`Quét thành công ${cleanTabs.length} tabs. Tab mặc định: GID ${result.defaultGid}`,
			);
			this.tabsCache.set(cacheKey, { time: Date.now(), data: result });
			return result;
		} catch (err) {
			logger.error(
				"GoogleSheetService",
				`Lỗi khi lấy tabs: ${(err as Error).message}`,
			);
			return {
				success: false,
				tabs: [
					{ name: "Mặc định", gid: "0", isDefault: true, isDateTab: false },
				],
				defaultGid: "0",
			};
		}
	}

	private _parseDateFromTabName(tabName: string): Date | null {
		if (!tabName) return null;
		const clean = String(tabName)
			.toLowerCase()
			.replace(/ngày|ngay/g, "")
			.trim();
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

	public async fetchSheetData(
		input: string = this.sheetId,
		specificGid: string | null = null,
		apiKey?: string,
	) {
		const parsed = this.parseSheetIdentifier(input);
		const sheetId = parsed.sheetId;
		const gid =
			specificGid !== null && specificGid !== undefined
				? specificGid
				: parsed.gid;

		logger.info(
			"GoogleSheetService",
			`Bắt đầu kéo dữ liệu từ Sheet ID: ${sheetId}, GID: ${gid}`,
		);

		if (!sheetId) {
			logger.error("GoogleSheetService", "Thiếu Google Sheet ID");
			return {
				success: false,
				rows: [],
				message: "Thiếu Google Sheet ID",
				source: "error",
			};
		}

		// 1. Thử export CSV công khai
		try {
			const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
			logger.debug("GoogleSheetService", `Gửi yêu cầu tải CSV: ${csvUrl}`);
			const res = await fetch(csvUrl, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
				},
			});

			logger.debug(
				"GoogleSheetService",
				`Phản hồi tải CSV HTTP status: ${res.status}`,
			);

			if (res.ok) {
				const text = await res.text();
				logger.debug(
					"GoogleSheetService",
					`Nhận được nội dung CSV độ dài ${text.length} ký tự`,
				);
				const rows = this.parseCsv(text, `${sheetId}_${gid}`);
				if (rows.length > 0) {
					logger.info(
						"GoogleSheetService",
						`Kéo thành công ${rows.length} dòng từ CSV export (GID: ${gid})`,
					);
					return {
						success: true,
						rows,
						source: "csv_export",
						sheetId,
						gid,
					};
				} else {
					logger.warn(
						"GoogleSheetService",
						`CSV export tải về rỗng hoặc không trích xuất được dòng dữ liệu (GID: ${gid})`,
					);
				}
			}
		} catch (csvErr) {
			logger.error(
				"GoogleSheetService",
				`Không thể kéo CSV: ${(csvErr as Error).message}`,
			);
		}

		// 2. Thử Google Sheets API v4 nếu có apiKey
		if (apiKey) {
			try {
				const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z100?key=${apiKey}`;
				logger.debug("GoogleSheetService", "Thử gọi Google Sheets API v4");
				const res = await fetch(apiUrl);
				if (res.ok) {
					const data = await res.json();
					const rows = this._parseApiValues(data.values || []);
					logger.info(
						"GoogleSheetService",
						`Kéo thành công ${rows.length} dòng qua API v4`,
					);
					return {
						success: true,
						rows,
						source: "api_v4",
						sheetId,
						gid,
					};
				}
			} catch (apiErr) {
				logger.error(
					"GoogleSheetService",
					`Lỗi gọi API v4: ${(apiErr as Error).message}`,
				);
			}
		}

		return {
			success: false,
			rows: [],
			message:
				"Không thể kéo dữ liệu từ Google Sheet. Vui lòng kiểm tra quyền chia sẻ công khai.",
			source: "failed",
		};
	}

	public parseCsv(
		csvText: string,
		cacheKey?: string,
	): Record<string, string>[] {
		if (!csvText || !csvText.trim()) {
			logger.warn("GoogleSheetService", "Nội dung CSV rỗng");
			return [];
		}

		const lines: string[][] = [];
		let currentLine: string[] = [];
		let currentField = "";
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
			} else if (char === "," && !inQuotes) {
				currentLine.push(currentField);
				currentField = "";
			} else if ((char === "\r" || char === "\n") && !inQuotes) {
				if (char === "\r" && nextChar === "\n") i++;
				currentLine.push(currentField);
				if (currentLine.some((f) => f.trim().length > 0)) {
					lines.push(currentLine);
				}
				currentLine = [];
				currentField = "";
			} else {
				currentField += char;
			}
		}

		if (currentField.length > 0 || currentLine.length > 0) {
			currentLine.push(currentField);
			if (currentLine.some((f) => f.trim().length > 0)) {
				lines.push(currentLine);
			}
		}

		if (lines.length === 0) return [];

		if (cacheKey && lines[0]) {
			this.tabHeadersMap.set(
				cacheKey,
				lines[0].map((h) => h.trim()),
			);
		}

		logger.debug(
			"GoogleSheetService",
			`Đã phân tách CSV thành ${lines.length} dòng`,
			{
				headerLine: lines[0],
			},
		);

		// Quy chuẩn chuẩn 16 cột theo Google Sheet (Thứ tự từ cột 0 đến 15)
		// 0: STT | 1: Họ tên | 2: D.O.B | 3: Giới tính | 4: Quốc tịch | 5: Loại giấy tờ | 6: Tên giấy tờ | 7: Số giấy tờ
		// 8: Tỉnh | 9: Quận/Huyện | 10: Phường/Xã | 11: Địa chỉ | 12: (từ ngày) | 13: (đến ngày) | 14: Số phòng | 15: Đã đăng ký
		const standardCols = [
			"stt", // 0: STT
			"hoTen", // 1: Họ tên
			"ngaySinh", // 2: D.O.B
			"gioiTinh", // 3: Giới tính
			"quocTich", // 4: Quốc tịch
			"loaiGiayTo", // 5: Loại giấy tờ
			"tenGiayTo", // 6: Tên giấy tờ
			"soGiayTo", // 7: Số giấy tờ
			"tinhTp", // 8: Tỉnh
			"quanHuyen", // 9: Quận/Huyện
			"phuongXa", // 10: Phường/Xã
			"diaChi", // 11: Địa chỉ
			"ngayDen", // 12: (từ ngày)
			"ngayDi", // 13: (đến ngày)
			"soPhong", // 14: Số phòng
			"daDangKy", // 15: Đã đăng ký
		];

		// Dòng 1 luôn luôn là header cột, dữ liệu khách bắt đầu từ dòng 2 (index 1)
		const rawHeaders = lines[0].map((h) => h.trim());
		const dataObjects: Record<string, string>[] = [];

		for (let i = 1; i < lines.length; i++) {
			const row = lines[i];
			const obj: Record<string, string> = {};
			let hasData = false;

			// 1. Ánh xạ ưu tiên theo vị trí 16 cột chuẩn
			standardCols.forEach((colKey, colIdx) => {
				const val = (row[colIdx] || "").trim();
				if (val) hasData = true;
				obj[colKey] = val;
			});

			// 2. Ánh xạ theo tên header thực tế trên dòng 1 nếu có
			row.forEach((valRaw, colIdx) => {
				const val = (valRaw || "").trim();
				if (val) hasData = true;

				const header = rawHeaders[colIdx];
				if (header) {
					obj[header] = val;
					const normalizedKey = this._mapHeaderToKey(header);
					if (normalizedKey && !obj[normalizedKey]) {
						obj[normalizedKey] = val;
					}
				}
			});

			// 3. Đảm bảo các trường khóa chính được điền đầy đủ
			if (!obj.soPhong && row[14]) {
				obj.soPhong = row[14].trim();
			}
			if (!obj.hoTen && row[1]) {
				obj.hoTen = row[1].trim();
			}
			if (!obj.ngaySinh && row[2]) {
				obj.ngaySinh = row[2].trim();
			}
			if (!obj.gioiTinh && row[3]) {
				obj.gioiTinh = row[3].trim();
			}
			if (!obj.quocTich && row[4]) {
				obj.quocTich = row[4].trim();
			}
			if (!obj.loaiGiayTo && row[5]) {
				obj.loaiGiayTo = row[5].trim();
			}
			if (!obj.tenGiayTo && row[6]) {
				obj.tenGiayTo = row[6].trim();
			}
			if (!obj.soGiayTo && row[7]) {
				obj.soGiayTo = row[7].trim();
			}
			if (!obj.tinhTp && row[8]) {
				obj.tinhTp = row[8].trim();
			}
			if (!obj.quanHuyen && row[9]) {
				obj.quanHuyen = row[9].trim();
			}
			if (!obj.phuongXa && row[10]) {
				obj.phuongXa = row[10].trim();
			}
			if (!obj.diaChi && row[11]) {
				obj.diaChi = row[11].trim();
			}
			if (!obj.ngayDen && row[12]) {
				obj.ngayDen = row[12].trim();
			}
			if (!obj.ngayDi && row[13]) {
				obj.ngayDi = row[13].trim();
			}
			if (!obj.daDangKy && row[15]) {
				obj.daDangKy = row[15].trim();
			}

			// Gán số dòng chính xác trên Google Sheet (1-based, dòng 1 là header, data từ dòng 2)
			obj._sheetRow = String(i + 1);
			obj.sheetRowIndex = String(i + 1);

			// Lọc bỏ dòng trống hoàn toàn
			if (hasData) {
				const hoTen = obj.hoTen || "";
				const soGiayTo = obj.soGiayTo || "";
				if (
					hoTen ||
					soGiayTo ||
					obj.diaChi ||
					obj.ngayDen ||
					obj.soPhong ||
					row.some((cell) => cell.trim().length > 0)
				) {
					dataObjects.push(obj);
				}
			}
		}

		logger.info(
			"GoogleSheetService",
			`Đã trích xuất ${dataObjects.length} bản ghi hợp lệ từ CSV (bắt đầu từ dòng 2)`,
		);
		return dataObjects;
	}

	private _parseApiValues(values: string[][]): Record<string, string>[] {
		if (!values || values.length < 2) return [];
		const rawHeaders = values[0].map((h) => String(h).trim());
		const standardCols = [
			"stt",
			"hoTen",
			"ngaySinh",
			"gioiTinh",
			"quocTich",
			"loaiGiayTo",
			"tenGiayTo",
			"soGiayTo",
			"tinhTp",
			"quanHuyen",
			"phuongXa",
			"diaChi",
			"ngayDen",
			"ngayDi",
			"soPhong",
			"daDangKy",
		];
		const result: Record<string, string>[] = [];

		for (let i = 1; i < values.length; i++) {
			const row = values[i];
			const obj: Record<string, string> = {};
			let hasData = false;

			standardCols.forEach((colKey, colIdx) => {
				const val = String(row[colIdx] || "").trim();
				if (val) hasData = true;
				obj[colKey] = val;
			});

			row.forEach((valRaw, colIdx) => {
				const val = String(valRaw || "").trim();
				if (val) hasData = true;
				const header = rawHeaders[colIdx];
				if (header) {
					obj[header] = val;
					const k = this._mapHeaderToKey(header);
					if (k && !obj[k]) obj[k] = val;
				}
			});

			obj._sheetRow = String(i + 1);
			obj.sheetRowIndex = String(i + 1);

			if (hasData) result.push(obj);
		}
		return result;
	}

	private _mapHeaderToKey(headerName: string): string | null {
		const clean = String(headerName || "")
			.toLowerCase()
			.trim();
		if (clean === "stt" || clean.includes("số thứ tự")) return "stt";
		if (
			clean.includes("họ tên") ||
			clean.includes("họ và tên") ||
			clean === "ho ten" ||
			clean === "name" ||
			clean === "full name"
		)
			return "hoTen";
		if (
			clean.includes("ngày sinh") ||
			clean.includes("d.o.b") ||
			clean === "dob" ||
			clean.includes("ngay sinh") ||
			clean.includes("date of birth")
		)
			return "ngaySinh";
		if (
			clean.includes("giới tính") ||
			clean === "gioi tinh" ||
			clean === "sex" ||
			clean === "gender"
		)
			return "gioiTinh";
		if (
			clean.includes("quốc tịch") ||
			clean.includes("quốc gia") ||
			clean === "nationality" ||
			clean === "country"
		)
			return "quocTich";
		if (clean.includes("loại giấy tờ") || clean === "loai giay to")
			return "loaiGiayTo";
		if (clean.includes("tên giấy tờ") || clean === "ten giay to")
			return "tenGiayTo";
		if (
			clean.includes("số cccd") ||
			clean.includes("số cmnd") ||
			clean.includes("số giấy tờ") ||
			clean.includes("số hộ chiếu") ||
			clean === "so giay to" ||
			clean === "passport"
		)
			return "soGiayTo";
		if (
			clean.includes("tỉnh/tp") ||
			clean.includes("tỉnh") ||
			clean === "tinh" ||
			clean === "province" ||
			clean === "city"
		)
			return "tinhTp";
		if (
			clean.includes("quận/huyện") ||
			clean.includes("quận") ||
			clean.includes("huyện") ||
			clean === "quan" ||
			clean === "huyen" ||
			clean === "district"
		)
			return "quanHuyen";
		if (
			clean.includes("phường/xã") ||
			clean.includes("phường") ||
			clean.includes("xã") ||
			clean === "phuong" ||
			clean === "xa" ||
			clean === "ward"
		)
			return "phuongXa";
		if (
			clean.includes("địa chỉ chi tiết") ||
			clean.includes("địa chỉ") ||
			clean === "dia chi" ||
			clean === "address"
		)
			return "diaChi";
		if (
			clean.includes("ngày đến") ||
			clean.includes("(từ ngày)") ||
			clean.includes("từ ngày") ||
			clean === "tu ngay" ||
			clean === "check in"
		)
			return "ngayDen";
		if (
			clean.includes("ngày đi") ||
			clean.includes("(đến ngày)") ||
			clean.includes("đến ngày") ||
			clean === "den ngay" ||
			clean === "check out"
		)
			return "ngayDi";
		if (
			clean.includes("số phòng") ||
			clean.includes("phòng") ||
			clean === "so phong" ||
			clean === "room"
		)
			return "soPhong";
		if (
			clean.includes("đã đăng ký") ||
			clean.includes("da dang ky") ||
			clean.includes("trạng thái") ||
			clean === "status"
		)
			return "daDangKy";
		if (clean.includes("thời hạn tạm trú")) return "thoiHanTamTru";
		return null;
	}

	public buildOrderedRowValues(
		rowData: Record<string, unknown>,
		fallbackIndex = 0,
	): string[] {
		const stt = String(rowData.stt || rowData.STT || fallbackIndex + 1);
		const hoTen = String(rowData.hoTen || rowData["Họ tên"] || "");
		const ngaySinh = String(
			rowData.ngaySinh || rowData["Ngày sinh"] || rowData["D.O.B"] || "",
		);
		const gioiTinh = String(rowData.gioiTinh || rowData["Giới tính"] || "Nam");
		const quocTich = String(
			rowData.quocTich || rowData["Quốc tịch"] || rowData["Quốc gia"] || "VNM",
		).toUpperCase();
		const loaiGiayTo = String(
			rowData.loaiGiayTo || rowData["Loại giấy tờ"] || "CCCD",
		);
		const tenGiayTo = String(
			rowData.tenGiayTo || rowData["Tên giấy tờ"] || loaiGiayTo,
		);
		const soGiayTo = String(
			rowData.soGiayTo ||
				rowData["Số giấy tờ"] ||
				rowData["Số CCCD"] ||
				rowData.soHoChieu ||
				rowData["Số hộ chiếu"] ||
				"",
		);
		const tinhTp = String(
			rowData.tinhTp ||
				rowData.tinh ||
				rowData["Tỉnh"] ||
				rowData["Tỉnh/TP"] ||
				"",
		);
		const quanHuyen = String(
			rowData.quanHuyen ||
				rowData.huyen ||
				rowData["Quận/Huyện"] ||
				rowData["Quận"] ||
				rowData["Huyện"] ||
				"",
		);
		const phuongXa = String(
			rowData.phuongXa ||
				rowData.xa ||
				rowData["Phường/Xã"] ||
				rowData["Phường"] ||
				rowData["Xã"] ||
				"",
		);
		const diaChi = String(
			rowData.diaChi || rowData["Địa chỉ"] || rowData["Địa chỉ chi tiết"] || "",
		);
		const ngayDen = String(
			rowData.ngayDen ||
				rowData["(từ ngày)"] ||
				rowData["Ngày đến"] ||
				rowData.tuNgay ||
				"",
		);
		const ngayDi = String(
			rowData.ngayDi ||
				rowData["(đến ngày)"] ||
				rowData["Ngày đi"] ||
				rowData.denNgay ||
				"",
		);
		const rawRoom =
			rowData.soPhong || rowData["Số phòng"] || rowData.room || "1";
		const matchRoom = String(rawRoom).match(/\d+/);
		const soPhong = matchRoom ? matchRoom[0] : String(rawRoom || "1");
		const daDangKy = String(
			rowData.daDangKy || rowData["Đã đăng ký"] || "Chưa đăng ký",
		);

		return [
			stt,
			hoTen,
			ngaySinh,
			gioiTinh,
			quocTich,
			loaiGiayTo,
			tenGiayTo,
			soGiayTo,
			tinhTp,
			quanHuyen,
			phuongXa,
			diaChi,
			ngayDen,
			ngayDi,
			soPhong,
			daDangKy,
		];
	}

	public async updateSheetRow(params: {
		sheetId: string;
		gid: string;
		sheetName?: string;
		rowIndex?: number;
		sheetRowIndex?: number;
		rowData: Record<string, unknown>;
		orderedValues?: string[];
	}): Promise<{ success: boolean; message: string; notConfigured?: boolean }> {
		const appsScriptUrl = (
			process.env.GOOGLE_APPS_SCRIPT_URL ||
			CONFIG.GOOGLE_APPS_SCRIPT_URL ||
			""
		).trim();
		if (!appsScriptUrl) {
			return {
				success: false,
				notConfigured: true,
				message:
					"GOOGLE_APPS_SCRIPT_URL chưa được cấu hình. Dữ liệu đã lưu tạm thời trên UI.",
			};
		}

		// Dòng 1 luôn là Header, dữ liệu bắt đầu từ dòng 2 (1-based sheetRowIndex >= 2)
		const sheetRowIndex =
			params.sheetRowIndex !== undefined && Number(params.sheetRowIndex) >= 2
				? Number(params.sheetRowIndex)
				: params.rowIndex !== undefined && Number(params.rowIndex) >= 0
					? Number(params.rowIndex) + 2
					: undefined;

		const orderedValues =
			params.orderedValues &&
			Array.isArray(params.orderedValues) &&
			params.orderedValues.length > 0
				? params.orderedValues
				: this.buildOrderedRowValues(params.rowData, params.rowIndex ?? 0);

		const cacheKey = `${params.sheetId || CONFIG.GOOGLE_SHEET_ID}_${params.gid || "0"}`;
		const rawHeaders = this.tabHeadersMap.get(cacheKey) || [];

		const enrichedRow: Record<string, unknown> = {
			...params.rowData,
			STT: orderedValues[0],
			stt: orderedValues[0],
			"Họ tên": orderedValues[1],
			hoTen: orderedValues[1],
			"D.O.B": orderedValues[2],
			"Ngày sinh": orderedValues[2],
			ngaySinh: orderedValues[2],
			"Giới tính": orderedValues[3],
			gioiTinh: orderedValues[3],
			"Quốc tịch": orderedValues[4],
			"Quốc gia": orderedValues[4],
			quocTich: orderedValues[4],
			"Loại giấy tờ": orderedValues[5],
			loaiGiayTo: orderedValues[5],
			"Tên giấy tờ": orderedValues[6],
			tenGiayTo: orderedValues[6],
			"Số giấy tờ": orderedValues[7],
			"Số CCCD": orderedValues[7],
			"Số hộ chiếu": orderedValues[7],
			soGiayTo: orderedValues[7],
			Tỉnh: orderedValues[8],
			"Tỉnh/TP": orderedValues[8],
			tinhTp: orderedValues[8],
			"Quận/Huyện": orderedValues[9],
			Quận: orderedValues[9],
			Huyện: orderedValues[9],
			quanHuyen: orderedValues[9],
			"Phường/Xã": orderedValues[10],
			Phường: orderedValues[10],
			Xã: orderedValues[10],
			phuongXa: orderedValues[10],
			"Địa chỉ": orderedValues[11],
			"Địa chỉ chi tiết": orderedValues[11],
			diaChi: orderedValues[11],
			"(từ ngày)": orderedValues[12],
			"Ngày đến": orderedValues[12],
			"Từ ngày": orderedValues[12],
			ngayDen: orderedValues[12],
			"(đến ngày)": orderedValues[13],
			"Ngày đi": orderedValues[13],
			"Đến ngày": orderedValues[13],
			ngayDi: orderedValues[13],
			"Số phòng": orderedValues[14],
			Phòng: orderedValues[14],
			soPhong: orderedValues[14],
			"Đã đăng ký": orderedValues[15],
			daDangKy: orderedValues[15],
		};

		// Ánh xạ mọi header thực tế đang tồn tại trên Sheet dòng 1
		rawHeaders.forEach((h, idx) => {
			if (h && orderedValues[idx] !== undefined) {
				enrichedRow[h] = orderedValues[idx];
			}
		});

		try {
			const res = await fetch(appsScriptUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "updateRow",
					sheetId: params.sheetId || CONFIG.GOOGLE_SHEET_ID,
					gid: params.gid || "0",
					sheetName: params.sheetName,
					rowIndex: params.rowIndex,
					sheetRowIndex,
					row: enrichedRow,
					data: enrichedRow,
					orderedValues,
					values: orderedValues,
				}),
			});

			if (!res.ok) {
				const text = await res.text();
				return {
					success: false,
					message: `Lỗi Webhook (${res.status}): ${text}`,
				};
			}

			const data = await res.json();
			return {
				success: Boolean(data.success),
				message:
					(data.message as string) ||
					(data.success
						? "Cập nhật Google Sheet thành công!"
						: "Apps Script báo lỗi."),
			};
		} catch (err) {
			return {
				success: false,
				message: `Lỗi mạng khi gọi Apps Script: ${(err as Error).message}`,
			};
		}
	}

	public async deleteSheetRow(params: {
		sheetId: string;
		gid: string;
		sheetName?: string;
		rowIndex?: number;
		sheetRowIndex?: number;
	}): Promise<{ success: boolean; message: string; notConfigured?: boolean }> {
		const appsScriptUrl = (
			process.env.GOOGLE_APPS_SCRIPT_URL ||
			CONFIG.GOOGLE_APPS_SCRIPT_URL ||
			""
		).trim();
		if (!appsScriptUrl) {
			return {
				success: false,
				notConfigured: true,
				message:
					"GOOGLE_APPS_SCRIPT_URL chưa được cấu hình. Dòng đã được xóa trên giao diện.",
			};
		}

		const sheetRowIndex =
			params.sheetRowIndex !== undefined && Number(params.sheetRowIndex) >= 2
				? Number(params.sheetRowIndex)
				: params.rowIndex !== undefined && Number(params.rowIndex) >= 0
					? Number(params.rowIndex) + 2
					: undefined;

		if (!sheetRowIndex || sheetRowIndex < 2) {
			return {
				success: false,
				message: "Chỉ số dòng không hợp lệ hoặc cố gắng xóa dòng tiêu đề.",
			};
		}

		try {
			const res = await fetch(appsScriptUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "deleteRow",
					sheetId: params.sheetId || CONFIG.GOOGLE_SHEET_ID,
					gid: params.gid || "0",
					sheetName: params.sheetName,
					rowIndex: params.rowIndex,
					sheetRowIndex,
				}),
			});

			if (!res.ok) {
				const text = await res.text();
				return {
					success: false,
					message: `Lỗi Webhook (${res.status}): ${text}`,
				};
			}

			const data = await res.json();
			return {
				success: Boolean(data.success),
				message:
					(data.message as string) ||
					(data.success
						? `Đã xóa dòng ${sheetRowIndex} trên Google Sheet!`
						: "Apps Script báo lỗi khi xóa dòng."),
			};
		} catch (err) {
			return {
				success: false,
				message: `Lỗi mạng khi xóa dòng trên Sheet: ${(err as Error).message}`,
			};
		}
	}
}
