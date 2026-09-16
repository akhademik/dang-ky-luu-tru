import fs__default from 'node:fs';
import path from 'node:path';

//#region src/lib/server/config.ts
function loadEnv() {
	try {
		const envPath = path.resolve(process.cwd(), ".env");
		if (fs__default.existsSync(envPath)) fs__default.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith("#")) {
				const eqIdx = trimmed.indexOf("=");
				if (eqIdx > 0) {
					const key = trimmed.substring(0, eqIdx).trim();
					const val = trimmed.substring(eqIdx + 1).trim();
					if (key && !process.env[key]) process.env[key] = val;
				}
			}
		});
	} catch {}
}
loadEnv();
var CONFIG = {
	BASE_URL: process.env.KBTT_BASE_URL || "https://api-kbtt.ai-vlab.com",
	GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || "16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q",
	GOOGLE_APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL || "",
	AUTH: {
		USERNAME: process.env.AUTH_USERNAME || "demo_tich_hop",
		PASSWORD: process.env.AUTH_PASSWORD || "Demo@#$12345",
		BASIC_AUTH: process.env.AUTH_BASIC_AUTH || "Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ",
		GRANT_TYPE: process.env.AUTH_GRANT_TYPE || "api_cslt"
	},
	ENDPOINTS: {
		TOKEN: "/authorization-service/oauth/token",
		REFRESH_TOKEN: "/authorization-service/oauth/refresh-token",
		REVOKE: "/authorization-service/oauth/revoke",
		DM_QUOC_TICH: "/cms-backend/public/dm-qt/3th/get-all",
		DM_TINH_TP: "/cms-backend/public/dm-tinh-tp/get-all",
		DM_PHUONG_XA: "/cms-backend/public/dm-phuong-xa",
		DM_LY_DO_CU_TRU: "/cms-backend/public/ly-do-cu-tru/get-all",
		DM_LOAI_GIAY_TO: "/cms-backend/public/loai-giay-to/get-all",
		DM_NOI_CU_TRU: "/cms-backend/public/noi-cu-tru/get-all",
		KBTT_FOREIGN: "/client-service/kbtt/kbtt-3th",
		KBTT_VIETNAM: "/client-service/kbtt-vn/kbtt-3th"
	},
	TOKEN_REFRESH_BUFFER_SECONDS: 60
};
var catalogManager = class CatalogManager {
	static instance;
	quocTichList = [];
	tinhTpList = [];
	lyDoCuTruList = [];
	loaiGiayToList = [];
	noiCuTruList = [];
	isLoaded = false;
	standardQuocTichMap = /* @__PURE__ */ new Map();
	constructor() {
		this.loadStandardQuocTich();
	}
	static getInstance() {
		if (!CatalogManager.instance) CatalogManager.instance = new CatalogManager();
		return CatalogManager.instance;
	}
	loadStandardQuocTich() {
		try {
			const candidates = [path.resolve(process.cwd(), "quoc_tich.json"), path.resolve(process.cwd(), "src/lib/server/quoc_tich.json")];
			for (const jsonPath of candidates) if (fs__default.existsSync(jsonPath)) {
				const raw = fs__default.readFileSync(jsonPath, "utf8");
				const list = JSON.parse(raw);
				if (Array.isArray(list)) {
					list.forEach((item) => {
						if (item.ma_alpha3) this.standardQuocTichMap.set(String(item.ma_alpha3).trim().toUpperCase(), {
							ten_quoc_gia: item.ten_quoc_gia,
							ten_tieng_anh: item.ten_tieng_anh
						});
					});
					break;
				}
			}
		} catch (err) {
			console.warn("[CatalogManager] Không thể nạp quoc_tich.json:", err);
		}
	}
	async fetchPublicCatalog(endpoint) {
		try {
			const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			});
			if (!res.ok) return [];
			const data = await res.json();
			return data.data || data || [];
		} catch {
			return [];
		}
	}
	async initialize() {
		if (this.isLoaded) return;
		try {
			const [qt, tinh, lyDo, loaiGt, noiCt] = await Promise.all([
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_QUOC_TICH),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_TINH_TP),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_LY_DO_CU_TRU),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_LOAI_GIAY_TO),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_NOI_CU_TRU)
			]);
			this.quocTichList = qt.length > 0 ? qt : this.getFallbackQuocTich();
			this.tinhTpList = tinh.length > 0 ? tinh : this.getFallbackTinhTp();
			this.lyDoCuTruList = lyDo.length > 0 ? lyDo : this.getFallbackLyDoCuTru();
			this.loaiGiayToList = loaiGt.length > 0 ? loaiGt : this.getFallbackLoaiGiayTo();
			this.noiCuTruList = noiCt.length > 0 ? noiCt : this.getFallbackNoiCuTru();
			this.isLoaded = true;
		} catch (err) {
			console.error("[CatalogManager] Lỗi khởi tạo danh mục:", err);
		}
	}
	isValidQuocTichCode(code) {
		if (!code) return false;
		const clean = String(code).trim().toUpperCase();
		if (this.standardQuocTichMap.size > 0 && this.standardQuocTichMap.has(clean)) return true;
		return this.quocTichList.some((item) => {
			return String(item.maQT || item.id || item.code || "").trim().toUpperCase() === clean;
		});
	}
	findQuocTich(keyword) {
		if (!keyword) return null;
		const clean = String(keyword).trim().toUpperCase();
		return this.quocTichList.find((i) => {
			const ma = String(i.maQT || i.id || i.code || "").toUpperCase();
			const ten = String(i.tenQT || i.name || "").toUpperCase();
			const tenEn = String(i.tenQTEn || "").toUpperCase();
			return ma === clean || ten.includes(clean) || tenEn.includes(clean);
		})?.maQT || null;
	}
	findLoaiGiayTo(name) {
		if (!name) return 1;
		const clean = String(name).toLowerCase();
		if (clean.includes("căn cước") && !clean.includes("thẻ cccd")) return 8;
		if (clean.includes("cccd")) return 1;
		if (clean.includes("cmnd")) return 2;
		if (clean.includes("lái xe") || clean.includes("gplx")) return 3;
		if (clean.includes("hộ chiếu") || clean.includes("passport")) return 4;
		return 1;
	}
	getFallbackQuocTich() {
		if (this.standardQuocTichMap.size > 0) return Array.from(this.standardQuocTichMap.entries()).map(([ma, val]) => ({
			maQT: ma,
			tenQT: val.ten_quoc_gia,
			tenQTEn: val.ten_tieng_anh
		}));
		return [
			{
				maQT: "VNM",
				tenQT: "Việt Nam",
				tenQTEn: "Vietnam"
			},
			{
				maQT: "RUS",
				tenQT: "Liên bang Nga",
				tenQTEn: "Russian Federation"
			},
			{
				maQT: "USA",
				tenQT: "Hoa Kỳ",
				tenQTEn: "United States"
			},
			{
				maQT: "CHN",
				tenQT: "Trung Quốc",
				tenQTEn: "China"
			},
			{
				maQT: "KOR",
				tenQT: "Hàn Quốc",
				tenQTEn: "Korea, Republic of"
			},
			{
				maQT: "JPN",
				tenQT: "Nhật Bản",
				tenQTEn: "Japan"
			},
			{
				maQT: "VAA",
				tenQT: "Cơ quan ngoại giao VAA",
				tenQTEn: "VAA Diplomatic"
			}
		];
	}
	getFallbackTinhTp() {
		return [
			{
				maTT: 101,
				maTTChu: "HN",
				tenTT: "Hà Nội"
			},
			{
				maTT: 103,
				maTTChu: "HP",
				tenTT: "Hải Phòng"
			},
			{
				maTT: 201,
				maTTChu: "DN",
				tenTT: "Đà Nẵng"
			},
			{
				maTT: 701,
				maTTChu: "HCM",
				tenTT: "Hồ Chí Minh"
			},
			{
				maTT: 606,
				maTTChu: "DL",
				tenTT: "Đắk Lắk"
			}
		];
	}
	getFallbackLyDoCuTru() {
		return [{
			id: 1,
			name: "Du lịch"
		}, {
			id: 20,
			name: "Mục đích khác"
		}];
	}
	getFallbackLoaiGiayTo() {
		return [
			{
				id: 1,
				name: "Thẻ CCCD"
			},
			{
				id: 2,
				name: "Thẻ CMND"
			},
			{
				id: 3,
				name: "Giấy phép lái xe"
			},
			{
				id: 4,
				name: "Hộ chiếu"
			},
			{
				id: 8,
				name: "Thẻ Căn Cước"
			}
		];
	}
	getFallbackNoiCuTru() {
		return [{
			id: 1,
			name: "Thường trú"
		}, {
			id: 2,
			name: "Tạm trú"
		}];
	}
}.getInstance();
var tokenManager = class TokenManager {
	static instance;
	accessToken = null;
	refreshToken = null;
	expiresAt = 0;
	tokenType = "Bearer";
	constructor() {}
	static getInstance() {
		if (!TokenManager.instance) TokenManager.instance = new TokenManager();
		return TokenManager.instance;
	}
	async getValidToken() {
		const now = Date.now();
		const bufferMs = CONFIG.TOKEN_REFRESH_BUFFER_SECONDS * 1e3;
		if (this.accessToken && this.expiresAt - now > bufferMs) return this.accessToken;
		try {
			if (this.refreshToken) {
				if (await this.refresh()) return this.accessToken;
			}
			await this.login();
			return this.accessToken;
		} catch {
			return null;
		}
	}
	async login() {
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.TOKEN}`;
		const params = new URLSearchParams({
			grant_type: CONFIG.AUTH.GRANT_TYPE,
			username: CONFIG.AUTH.USERNAME,
			password: CONFIG.AUTH.PASSWORD
		});
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Authorization": CONFIG.AUTH.BASIC_AUTH
			},
			body: params.toString()
		});
		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Đăng nhập thất bại (${res.status}): ${err}`);
		}
		const data = await res.json();
		this.saveToken(data);
		return this.accessToken;
	}
	async refresh() {
		if (!this.refreshToken) throw new Error("Không có refresh token");
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}`;
		const params = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: this.refreshToken
		});
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Authorization": CONFIG.AUTH.BASIC_AUTH
			},
			body: params.toString()
		});
		if (!res.ok) return this.login();
		const data = await res.json();
		this.saveToken(data);
		return this.accessToken;
	}
	async revoke() {
		if (!this.accessToken) return true;
		const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REVOKE}`;
		const params = new URLSearchParams({ token: this.accessToken });
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": CONFIG.AUTH.BASIC_AUTH
				},
				body: params.toString()
			});
			this.clear();
			return res.ok;
		} catch {
			this.clear();
			return false;
		}
	}
	saveToken(data) {
		const token = data.access_token || data.accessToken;
		const refresh = data.refresh_token || data.refreshToken || null;
		const expiresIn = Number(data.expires_in || data.expiresIn || 3600);
		this.accessToken = token;
		this.refreshToken = refresh;
		this.expiresAt = Math.floor(Date.now() / 1e3) + expiresIn;
	}
	clear() {
		this.accessToken = null;
		this.refreshToken = null;
		this.expiresAt = 0;
	}
	getStatus() {
		const nowSec = Math.floor(Date.now() / 1e3);
		return {
			hasToken: Boolean(this.accessToken),
			accessToken: this.accessToken ? `${this.accessToken.substring(0, 15)}...` : null,
			expiresAt: this.expiresAt,
			expiresInSeconds: this.expiresAt ? Math.max(0, this.expiresAt - nowSec) : 0
		};
	}
}.getInstance();
//#endregion
//#region src/lib/server/dataTransformer.ts
var DataTransformer = class DataTransformer {
	catalogManager;
	constructor(catalog = catalogManager) {
		this.catalogManager = catalog;
	}
	cleanRoomNumber(roomRaw) {
		return DataTransformer.cleanRoomNumber(roomRaw);
	}
	static cleanRoomNumber(roomRaw) {
		const raw = String(roomRaw ?? "").trim();
		if (!raw) return "";
		const matches = raw.match(/\d+/g);
		if (!matches || matches.length === 0) return "";
		for (const m of matches) {
			const num = parseInt(m, 10);
			if (num >= 1 && num <= 9) return String(num);
		}
		return "";
	}
	formatDateOnly(dateRaw) {
		return DataTransformer.formatDateOnly(dateRaw);
	}
	static formatDateOnly(dateRaw) {
		if (!dateRaw) return "";
		const str = String(dateRaw).trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
		const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
		if (dmy) {
			const [, d, m, y] = dmy;
			return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
		}
		const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
		if (ymd) {
			const [, y, m, d] = ymd;
			return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
		}
		return str;
	}
	normalizeGender(genderRaw) {
		return DataTransformer.mapGender(genderRaw);
	}
	static mapGender(genderRaw) {
		if (!genderRaw) return "M";
		const str = String(genderRaw).trim().toLowerCase();
		if ([
			"f",
			"female",
			"nữ",
			"nu",
			"gái",
			"w"
		].includes(str)) return "F";
		return "M";
	}
	cleanDocNumber(docRaw) {
		return DataTransformer.cleanDocNumber(docRaw);
	}
	static cleanDocNumber(docRaw) {
		if (!docRaw) return "";
		return String(docRaw).replace(/[^a-zA-Z0-9]/g, "").trim();
	}
	static isArrivalDateValid(dateStr) {
		if (!dateStr) return {
			valid: false,
			error: "Thiếu ngày đến"
		};
		const str = String(dateStr).trim();
		const arrivalDate = new Date(str.includes("T") ? str : str.replace(" ", "T"));
		if (isNaN(arrivalDate.getTime())) {
			if (!str.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)) return {
				valid: false,
				error: "Định dạng ngày đến không hợp lệ"
			};
		}
		const arrivalDay = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());
		const today = /* @__PURE__ */ new Date();
		const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const yesterday = new Date(currentDay);
		yesterday.setDate(yesterday.getDate() - 1);
		if (arrivalDay.getTime() === currentDay.getTime() || arrivalDay.getTime() === yesterday.getTime()) return { valid: true };
		if (arrivalDay.getTime() < yesterday.getTime()) return {
			valid: false,
			error: "Ngày đến ở quá khứ (> 1 ngày trước)"
		};
		if (arrivalDay.getTime() > currentDay.getTime()) return {
			valid: false,
			error: "Ngày đến ở tương lai"
		};
		return { valid: true };
	}
	static isGuestVN(row) {
		const qt = String(row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "").trim().toLowerCase();
		const docType = String(row.loaiGiayTo || row["Loại giấy tờ"] || row["Tên giấy tờ"] || "").toLowerCase();
		const docNum = String(row.soGiayTo || row["Số giấy tờ"] || row["Số CCCD"] || "").replace(/\D/g, "");
		if (docType.includes("cccd") || docType.includes("cmnd") || docType.includes("căn cước")) return true;
		if ([
			"vn",
			"vnm",
			"viet nam",
			"vietnam",
			"vvv",
			"vv",
			"v",
			"viet"
		].includes(qt)) return true;
		if (qt && ![
			"vn",
			"vnm",
			"viet nam",
			"vietnam",
			"vvv",
			"vv",
			"v",
			"viet"
		].includes(qt)) return false;
		if (docNum.length === 12 || docNum.length === 9) return true;
		return false;
	}
	async checkRowCompleteness(row) {
		return DataTransformer.checkCompleteness(row);
	}
	static checkCompleteness(row) {
		const isVN = this.isGuestVN(row);
		const missing = [];
		const status = {};
		const hoTen = String(row.hoTen || row["Họ tên"] || "").trim();
		status.hoTen = {
			valid: Boolean(hoTen),
			value: hoTen
		};
		if (!hoTen) missing.push("Họ tên");
		const ngaySinh = String(row.ngaySinh || row["D.O.B"] || row["Ngày sinh"] || "").trim();
		const dobValid = Boolean(ngaySinh && this.formatDateOnly(ngaySinh));
		status.ngaySinh = {
			valid: dobValid,
			value: ngaySinh
		};
		if (!dobValid) missing.push("Ngày sinh");
		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomValid = Boolean(cleanedRoom);
		status.soPhong = {
			valid: roomValid,
			value: cleanedRoom,
			error: !roomValid ? "Số phòng không hợp lệ (Phải từ 1 đến 9)" : void 0
		};
		if (!roomValid) missing.push("Số phòng (1-9)");
		const ngayDenRaw = row.ngayDen || row["(từ ngày)"] || row["Ngày đến"];
		const arrivalCheck = this.isArrivalDateValid(ngayDenRaw);
		status.ngayDen = {
			valid: arrivalCheck.valid,
			value: ngayDenRaw,
			error: arrivalCheck.error
		};
		if (!arrivalCheck.valid) missing.push(`Ngày đến (${arrivalCheck.error})`);
		const docTypeName = String(row.loaiGiayTo || row["Loại giấy tờ"] || (isVN ? "Thẻ CCCD" : "Hộ chiếu")).toLowerCase();
		const docNumRaw = String(row.soGiayTo || row["Số giấy tờ"] || row.soHoChieu || row["Số CCCD"] || row["Số hộ chiếu"] || "").trim();
		if (isVN) {
			if (docTypeName.includes("cccd") || docTypeName.includes("căn cước")) {
				const valid = docNumRaw.replace(/\D/g, "").length === 12;
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Số CCCD phải đủ 12 số" : void 0
				};
				if (!valid) missing.push("Số CCCD (12 chữ số)");
			} else if (docTypeName.includes("cmnd")) {
				const digits = docNumRaw.replace(/\D/g, "");
				const valid = digits.length === 9 || digits.length === 12;
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Số CMND phải 9 hoặc 12 số" : void 0
				};
				if (!valid) missing.push("Số CMND (9 hoặc 12 số)");
			} else {
				const valid = Boolean(docNumRaw);
				status.soGiayTo = {
					valid,
					value: docNumRaw,
					error: !valid ? "Thiếu số giấy tờ" : void 0
				};
				if (!valid) missing.push("Số giấy tờ");
			}
		} else {
			const rawQt = String(row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "").trim();
			const mappedQt = this.mapQuocTich(rawQt);
			const isQtValid = Boolean(mappedQt && catalogManager.isValidQuocTichCode(mappedQt));
			status.quocTich = {
				valid: isQtValid,
				value: rawQt,
				error: !isQtValid ? `Mã quốc tịch không hợp lệ: "${rawQt}"` : void 0
			};
			if (!isQtValid) missing.push("Mã quốc tịch chuẩn");
			const cleanPassport = this.cleanDocNumber(docNumRaw);
			const isPassportValid = cleanPassport.length >= 6 && cleanPassport.length <= 12;
			status.soHoChieu = {
				valid: isPassportValid,
				value: docNumRaw,
				error: !isPassportValid ? "Số hộ chiếu phải từ 6 đến 12 ký tự" : void 0
			};
			if (!isPassportValid) missing.push("Số hộ chiếu (6-12 ký tự)");
		}
		return {
			isComplete: missing.length === 0,
			missingFields: missing,
			fieldStatus: status
		};
	}
	async transformRow(row) {
		const completeness = DataTransformer.checkCompleteness(row);
		const isVN = DataTransformer.isGuestVN(row);
		const branch = isVN ? "VN" : "FOREIGN";
		let validationError;
		if (!completeness.isComplete) validationError = `Dữ liệu chưa hoàn thiện: ${completeness.missingFields.join(", ")}`;
		return {
			branch,
			payload: isVN ? DataTransformer.transformToPayloadVn(row) : DataTransformer.transformToPayloadForeign(row),
			completeness,
			validationError,
			originalRow: row
		};
	}
	async transformBatch(rows) {
		const vnPayloads = [];
		const foreignPayloads = [];
		const completenessList = [];
		rows.forEach((row, idx) => {
			const completeness = DataTransformer.checkCompleteness(row);
			completenessList.push({
				index: idx,
				completeness
			});
			if (DataTransformer.isGuestVN(row)) vnPayloads.push({
				originalIndex: idx,
				payload: DataTransformer.transformToPayloadVn(row)
			});
			else foreignPayloads.push({
				originalIndex: idx,
				payload: DataTransformer.transformToPayloadForeign(row)
			});
		});
		return {
			success: true,
			totalRows: rows.length,
			vnPayloads,
			foreignPayloads,
			completenessList
		};
	}
	static transformToPayloadVn(row) {
		const rawAddress = String(row.diaChi || row["Địa chỉ"] || row["Địa chỉ chi tiết"] || "").trim();
		const tinhRaw = String(row.tinhTp || row["Tỉnh"] || row["Tỉnh/TP"] || "").trim();
		const phuongXaRaw = String(row.phuongXa || row["Phường/Xã"] || "").trim();
		const quanHuyenRaw = String(row.quanHuyen || row["Quận/Huyện"] || "").trim();
		let fullAddress = "";
		const loaiGiayToName = String(row.loaiGiayTo || row["Loại giấy tờ"] || "").toLowerCase();
		if (!loaiGiayToName.includes("hộ chiếu") && !loaiGiayToName.includes("passport")) {
			const addressParts = [
				rawAddress,
				phuongXaRaw,
				quanHuyenRaw,
				tinhRaw
			].filter(Boolean);
			fullAddress = addressParts.length > 0 ? addressParts.join(", ") : rawAddress;
		}
		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";
		return {
			hoTen: String(row.hoTen || row["Họ tên"] || "").trim().toUpperCase(),
			gioiTinh: this.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: String(row.soDienThoai || row["Số điện thoại"] || "").replace(/[^\d+]/g, ""),
			ngayThangNamSinhStr: this.formatDateOnly(row.ngaySinh || row["D.O.B"] || row["Ngày sinh"]),
			noiCuTru: 1,
			maTT: "",
			maPX: "",
			diaChi: fullAddress,
			ngayDenCsltStr: this.formatDateTime(row.ngayDen || row["(từ ngày)"] || row["Ngày đến"], "14:00:00"),
			ngayDiDuKienStr: this.formatDateTime(row.ngayDi || row["(đến ngày)"] || row["Ngày đi"], "12:00:00"),
			soPhong: roomFormatted,
			lyDoCuTru: 1,
			lyDoChiTiet: "",
			loaiGiayTo: this.mapLoaiGiayTo(row.loaiGiayTo || row["Loại giấy tờ"] || "Thẻ CCCD"),
			soGiayTo: this.cleanDocNumber(row.soGiayTo || row["Số giấy tờ"] || row["Số CCCD"]),
			anhTruocB64: "",
			anhSauB64: "",
			ghiChu: ""
		};
	}
	static transformToPayloadForeign(row) {
		const cleanedRoom = this.cleanRoomNumber(row.soPhong || row["Số phòng"]);
		const roomFormatted = cleanedRoom ? `Phong so ${cleanedRoom}` : "";
		return {
			hoTen: String(row.hoTen || row["Họ tên"] || "").trim().toUpperCase(),
			gioiTinh: this.mapGender(row.gioiTinh || row["Giới tính"]),
			soDienThoai: String(row.soDienThoai || row["Số điện thoại"] || "").replace(/[^\d+]/g, ""),
			ngayThangNamSinhStr: this.formatDateOnly(row.ngaySinh || row["D.O.B"] || row["Ngày sinh"]),
			loaiNgayThangNamSinh: "D",
			quocTich: this.mapQuocTich(row.quocTich || row["Quốc tịch"] || row["Quốc gia"]),
			maQuocTich: this.mapQuocTich(row.quocTich || row["Quốc tịch"] || row["Quốc gia"]),
			ngayDenCsltStr: this.formatDateTime(row.ngayDen || row["(từ ngày)"] || row["Ngày đến"], "14:00:00"),
			ngayDiDuKienStr: this.formatDateTime(row.ngayDi || row["(đến ngày)"] || row["Ngày đi"], "12:00:00"),
			soPhong: roomFormatted,
			thoiHanTamTruStr: this.formatDateTime(row.thoiHanTamTru || row.thoiHanTamTruStr || row["Thời hạn tạm trú"], "23:59:59"),
			loaiGiayTo: 4,
			soHoChieu: this.cleanDocNumber(row.soHoChieu || row.soGiayTo || row["Số hộ chiếu"] || row["Số giấy tờ"]),
			anhHoChieuB64: "",
			ghiChu: ""
		};
	}
	static formatDateTime(dateRaw, defaultTime = "12:00:00") {
		if (!dateRaw) return "";
		const str = String(dateRaw).trim();
		if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) return str;
		const dateOnly = this.formatDateOnly(str);
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return `${dateOnly} ${defaultTime}`;
		return str;
	}
	static mapLoaiGiayTo(val) {
		return catalogManager.findLoaiGiayTo(String(val || ""));
	}
	static mapQuocTich(val) {
		if (!val) return "VNM";
		const clean = String(val).trim().toUpperCase();
		if (clean.length === 3) return clean;
		return catalogManager.findQuocTich(clean) || clean;
	}
};
//#endregion
//#region src/lib/server/googleSheetService.ts
var GoogleSheetService = class {
	sheetId;
	tabsCache = /* @__PURE__ */ new Map();
	constructor(sheetId = CONFIG.GOOGLE_SHEET_ID) {
		this.sheetId = sheetId;
	}
	parseSheetIdentifier(input = this.sheetId) {
		if (!input) return {
			sheetId: this.sheetId,
			gid: "0"
		};
		const str = String(input).trim();
		const idMatch = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
		const gidMatch = str.match(/[#&?]gid=([0-9]+)/);
		return {
			sheetId: idMatch ? idMatch[1] : str.length > 20 && !str.includes("/") ? str : this.sheetId,
			gid: gidMatch ? gidMatch[1] : "0"
		};
	}
	async fetchSheetTabs(input = this.sheetId, forceRefresh = false) {
		const { sheetId } = this.parseSheetIdentifier(input);
		if (!sheetId) return {
			success: false,
			tabs: [],
			defaultGid: "0"
		};
		const cacheKey = sheetId;
		const now = Date.now();
		if (!forceRefresh && this.tabsCache.has(cacheKey)) {
			const cached = this.tabsCache.get(cacheKey);
			if (cached && now - cached.time < 6e4) return cached.data;
		}
		const htmlViewUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
		try {
			const html = await (await fetch(htmlViewUrl, {
				redirect: "follow",
				headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
			})).text();
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
					dateStr: parsedDate ? parsedDate.toISOString().split("T")[0] : null,
					isDateTab: !!parsedDate,
					parsedDate
				});
			}
			if (tabs.length === 0) {
				const fallbackRegex = /<li\s+id="sheet-button-([0-9]+)"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
				while ((match = fallbackRegex.exec(html)) !== null) {
					const gid = match[1];
					const name = match[2].trim().replace(/<[^>]+>/g, "");
					const parsedDate = this._parseDateFromTabName(name);
					tabs.push({
						name,
						gid,
						dateStr: parsedDate ? parsedDate.toISOString().split("T")[0] : null,
						isDateTab: !!parsedDate,
						parsedDate
					});
				}
			}
			if (tabs.length === 0) tabs.push({
				name: "Sheet 1",
				gid: "0",
				isDateTab: false
			});
			const nowDate = /* @__PURE__ */ new Date();
			let bestTab = null;
			let minDiff = Infinity;
			for (const tab of tabs) if (tab.parsedDate) {
				const diff = Math.abs(tab.parsedDate.getTime() - nowDate.getTime());
				if (diff < minDiff) {
					minDiff = diff;
					bestTab = tab;
				}
			}
			if (!bestTab) bestTab = tabs.find((t) => t.isDateTab) || tabs[tabs.length - 1] || tabs[0];
			const result = {
				success: true,
				tabs: tabs.map((t) => {
					const isDef = Boolean(bestTab && t.gid === bestTab.gid);
					return {
						name: t.name,
						gid: t.gid,
						dateStr: t.dateStr,
						isDateTab: t.isDateTab,
						isDefault: isDef
					};
				}),
				defaultGid: bestTab ? bestTab.gid : tabs[0].gid
			};
			this.tabsCache.set(cacheKey, {
				time: Date.now(),
				data: result
			});
			return result;
		} catch (err) {
			console.warn("[GoogleSheetService] Lỗi khi lấy tabs:", err.message);
			return {
				success: false,
				tabs: [{
					name: "Mặc định",
					gid: "0",
					isDefault: true,
					isDateTab: false
				}],
				defaultGid: "0"
			};
		}
	}
	_parseDateFromTabName(tabName) {
		if (!tabName) return null;
		const match = String(tabName).toLowerCase().replace(/ngày|ngay/g, "").trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
		if (match) {
			const day = parseInt(match[1], 10);
			const month = parseInt(match[2], 10) - 1;
			let year = parseInt(match[3], 10);
			if (year < 100) year += 2e3;
			const d = new Date(year, month, day);
			if (!isNaN(d.getTime())) return d;
		}
		return null;
	}
	async fetchSheetData(input = this.sheetId, specificGid = null, apiKey) {
		const parsed = this.parseSheetIdentifier(input);
		const sheetId = parsed.sheetId;
		const gid = specificGid !== null && specificGid !== void 0 ? specificGid : parsed.gid;
		if (!sheetId) return {
			success: false,
			rows: [],
			message: "Thiếu Google Sheet ID",
			source: "error"
		};
		try {
			const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
			const res = await fetch(csvUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" } });
			if (res.ok) {
				const text = await res.text();
				const rows = this.parseCsv(text);
				if (rows.length > 0) return {
					success: true,
					rows,
					source: "csv_export",
					sheetId,
					gid
				};
			}
		} catch (csvErr) {
			console.warn("[GoogleSheetService] Không thể kéo CSV:", csvErr.message);
		}
		if (apiKey) try {
			const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z100?key=${apiKey}`;
			const res = await fetch(apiUrl);
			if (res.ok) {
				const data = await res.json();
				return {
					success: true,
					rows: this._parseApiValues(data.values || []),
					source: "api_v4",
					sheetId,
					gid
				};
			}
		} catch (apiErr) {
			console.warn("[GoogleSheetService] Không thể gọi API v4:", apiErr.message);
		}
		return {
			success: false,
			rows: [],
			message: "Không thể kéo dữ liệu từ Google Sheet. Vui lòng đảm bảo Sheet được chia sẻ công khai.",
			source: "failed"
		};
	}
	parseCsv(csvText) {
		if (!csvText || !csvText.trim()) return [];
		const lines = [];
		let currentLine = [];
		let currentField = "";
		let inQuotes = false;
		for (let i = 0; i < csvText.length; i++) {
			const char = csvText[i];
			const nextChar = csvText[i + 1];
			if (char === "\"") {
				if (inQuotes && nextChar === "\"") {
					currentField += "\"";
					i++;
				} else inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				currentLine.push(currentField);
				currentField = "";
			} else if ((char === "\r" || char === "\n") && !inQuotes) {
				if (char === "\r" && nextChar === "\n") i++;
				currentLine.push(currentField);
				if (currentLine.some((f) => f.trim().length > 0)) lines.push(currentLine);
				currentLine = [];
				currentField = "";
			} else currentField += char;
		}
		if (currentField.length > 0 || currentLine.length > 0) {
			currentLine.push(currentField);
			if (currentLine.some((f) => f.trim().length > 0)) lines.push(currentLine);
		}
		if (lines.length < 2) return [];
		const rawHeaders = lines[0].map((h) => h.trim());
		const dataObjects = [];
		for (let i = 1; i < lines.length; i++) {
			const row = lines[i];
			const obj = {};
			let hasData = false;
			rawHeaders.forEach((header, colIdx) => {
				const val = (row[colIdx] || "").trim();
				if (val) hasData = true;
				obj[header] = val;
				const normalizedKey = this._mapHeaderToKey(header);
				if (normalizedKey && !obj[normalizedKey]) obj[normalizedKey] = val;
			});
			if (hasData && (obj.hoTen || obj["Họ tên"] || obj.soGiayTo || obj["Số CCCD"] || obj["Số giấy tờ"])) dataObjects.push(obj);
		}
		return dataObjects;
	}
	_parseApiValues(values) {
		if (!values || values.length < 2) return [];
		const headers = values[0].map((h) => String(h).trim());
		const result = [];
		for (let i = 1; i < values.length; i++) {
			const row = values[i];
			const obj = {};
			let hasData = false;
			headers.forEach((h, col) => {
				const val = String(row[col] || "").trim();
				if (val) hasData = true;
				obj[h] = val;
				const k = this._mapHeaderToKey(h);
				if (k && !obj[k]) obj[k] = val;
			});
			if (hasData) result.push(obj);
		}
		return result;
	}
	_mapHeaderToKey(headerName) {
		const clean = String(headerName || "").toLowerCase().trim();
		if (clean.includes("họ tên") || clean.includes("họ và tên") || clean === "ho ten") return "hoTen";
		if (clean.includes("ngày sinh") || clean.includes("d.o.b") || clean === "dob") return "ngaySinh";
		if (clean.includes("giới tính") || clean === "gioi tinh" || clean === "sex" || clean === "gender") return "gioiTinh";
		if (clean.includes("quốc tịch") || clean.includes("quốc gia") || clean === "nationality") return "quocTich";
		if (clean.includes("số phòng") || clean.includes("phòng") || clean === "room") return "soPhong";
		if (clean.includes("ngày đến") || clean.includes("(từ ngày)") || clean.includes("từ ngày") || clean === "check in") return "ngayDen";
		if (clean.includes("ngày đi") || clean.includes("(đến ngày)") || clean.includes("đến ngày") || clean === "check out") return "ngayDi";
		if (clean.includes("loại giấy tờ") || clean.includes("tên giấy tờ")) return "loaiGiayTo";
		if (clean.includes("số cccd") || clean.includes("số cmnd") || clean.includes("số giấy tờ") || clean.includes("số hộ chiếu")) return "soGiayTo";
		if (clean.includes("địa chỉ chi tiết") || clean.includes("địa chỉ") || clean === "dia chi") return "diaChi";
		if (clean.includes("tỉnh/tp") || clean.includes("tỉnh") || clean === "province") return "tinhTp";
		if (clean.includes("phường/xã") || clean.includes("xã") || clean === "ward") return "phuongXa";
		if (clean.includes("quận/huyện") || clean.includes("huyện") || clean === "district") return "quanHuyen";
		if (clean.includes("thời hạn tạm trú")) return "thoiHanTamTru";
		return null;
	}
	async updateSheetRow(params) {
		const appsScriptUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || CONFIG.GOOGLE_APPS_SCRIPT_URL || "").trim();
		if (!appsScriptUrl) return {
			success: false,
			notConfigured: true,
			message: "GOOGLE_APPS_SCRIPT_URL chưa được cấu hình. Dữ liệu đã lưu tạm thời trên UI."
		};
		try {
			const res = await fetch(appsScriptUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "updateRow",
					sheetId: params.sheetId || CONFIG.GOOGLE_SHEET_ID,
					gid: params.gid || "0",
					rowIndex: params.rowIndex,
					row: params.rowData
				})
			});
			if (!res.ok) {
				const text = await res.text();
				return {
					success: false,
					message: `Lỗi Webhook (${res.status}): ${text}`
				};
			}
			const data = await res.json();
			return {
				success: Boolean(data.success),
				message: data.message || (data.success ? "Cập nhật Google Sheet thành công!" : "Apps Script báo lỗi.")
			};
		} catch (err) {
			return {
				success: false,
				message: `Lỗi mạng khi gọi Apps Script: ${err.message}`
			};
		}
	}
};
//#endregion
//#region src/lib/server/kbttClient.ts
var KbttClient = class {
	tokenManager;
	constructor(tm = tokenManager) {
		this.tokenManager = tm;
	}
	async submitVietnameseGuests(payloads) {
		return this._postPayload(CONFIG.ENDPOINTS.KBTT_VIETNAM, payloads, "Thông báo lưu trú (VN)");
	}
	async submitForeignGuests(payloads) {
		return this._postPayload(CONFIG.ENDPOINTS.KBTT_FOREIGN, payloads, "Thông báo lưu trú (Nước ngoài)");
	}
	async _postPayload(endpoint, payloads, actionName) {
		const token = await this.tokenManager.getValidToken();
		if (!token) throw new Error("Token không được rỗng");
		const url = `${CONFIG.BASE_URL}${endpoint}`;
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`
			},
			body: JSON.stringify(payloads)
		});
		let resData = {};
		try {
			resData = await res.json();
		} catch {
			resData = { message: await res.text() };
		}
		const isSuccess = res.ok && (resData.code === "200" || resData.code === 200);
		return {
			success: isSuccess,
			code: resData.code || res.status,
			message: resData.message || (isSuccess ? "Thành công" : `Lỗi ${res.status}`),
			raw: resData
		};
	}
};
//#endregion
//#region src/lib/server/syncPipeline.ts
var SyncPipeline = class {
	catalogManager;
	tokenManager;
	dataTransformer;
	googleSheetService;
	kbttClient;
	constructor() {
		this.catalogManager = catalogManager;
		this.tokenManager = tokenManager;
		this.dataTransformer = new DataTransformer(this.catalogManager);
		this.googleSheetService = new GoogleSheetService();
		this.kbttClient = new KbttClient(this.tokenManager);
	}
	async initialize() {
		await this.catalogManager.initialize();
	}
	async processRows(rows) {
		const results = [];
		const vnBatch = [];
		const foreignBatch = [];
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const check = DataTransformer.checkCompleteness(row);
			const isVN = DataTransformer.isGuestVN(row);
			if (!check.isComplete) {
				results.push({
					step: "VALIDATION",
					row,
					branch: isVN ? "VN" : "FOREIGN",
					success: false,
					status: "Thiếu thông tin",
					message: `Dòng ${i + 1} thiếu: ${check.missingFields.join(", ")}`
				});
				continue;
			}
			if (isVN) vnBatch.push({
				row,
				payload: DataTransformer.transformToPayloadVn(row),
				index: i
			});
			else foreignBatch.push({
				row,
				payload: DataTransformer.transformToPayloadForeign(row),
				index: i
			});
		}
		if (vnBatch.length > 0) try {
			const res = await this.kbttClient.submitVietnameseGuests(vnBatch.map((b) => b.payload));
			vnBatch.forEach((b) => {
				results.push({
					step: "API_5_VN",
					row: b.row,
					branch: "VN",
					payload: b.payload,
					success: res.success,
					status: res.success ? "Thành công" : "Thất bại",
					message: res.message,
					response: res.raw
				});
			});
		} catch (err) {
			vnBatch.forEach((b) => {
				results.push({
					step: "API_5_VN",
					row: b.row,
					branch: "VN",
					payload: b.payload,
					success: false,
					status: "Lỗi",
					message: err.message
				});
			});
		}
		if (foreignBatch.length > 0) try {
			const res = await this.kbttClient.submitForeignGuests(foreignBatch.map((b) => b.payload));
			foreignBatch.forEach((b) => {
				results.push({
					step: "API_4_FOREIGN",
					row: b.row,
					branch: "FOREIGN",
					payload: b.payload,
					success: res.success,
					status: res.success ? "Thành công" : "Thất bại",
					message: res.message,
					response: res.raw
				});
			});
		} catch (err) {
			foreignBatch.forEach((b) => {
				results.push({
					step: "API_4_FOREIGN",
					row: b.row,
					branch: "FOREIGN",
					payload: b.payload,
					success: false,
					status: "Lỗi",
					message: err.message
				});
			});
		}
		return results;
	}
};
var syncPipeline = new SyncPipeline();

export { CONFIG as C, syncPipeline as s };
//# sourceMappingURL=syncPipeline.js-Ur5OIb-G.js.map
