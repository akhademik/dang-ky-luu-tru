import { t as CONFIG } from "./config.js";
import fs from "node:fs";
import path from "node:path";
var catalogManager = class CatalogManager {
	static instance;
	catalogs = {
		quocTich: [],
		tinhTp: [],
		phuongXa: {},
		lyDoCuTru: [],
		loaiGiayTo: [],
		noiCuTru: []
	};
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
			const candidates = [
				path.resolve(process.cwd(), "quoc_tich.json"),
				path.resolve(process.cwd(), "src/lib/server/quoc_tich.json"),
				path.resolve(process.cwd(), "src/quoc_tich.json")
			];
			for (const jsonPath of candidates) if (fs.existsSync(jsonPath)) {
				const raw = fs.readFileSync(jsonPath, "utf8");
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
			console.warn("[CatalogManager] Không thể nạp file quoc_tich.json cục bộ:", err);
		}
	}
	async fetchPublicCatalog(endpoint) {
		try {
			const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			});
			if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
			const data = await res.json();
			return data.data || data || [];
		} catch (error) {
			console.warn(`[CatalogManager] Không thể nạp danh mục từ ${endpoint}:`, error.message);
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
			this.catalogs.quocTich = qt.length > 0 ? qt : this.getFallbackQuocTich();
			this.catalogs.tinhTp = tinh.length > 0 ? tinh : this.getFallbackTinhTp();
			this.catalogs.lyDoCuTru = lyDo.length > 0 ? lyDo : this.getFallbackLyDoCuTru();
			this.catalogs.loaiGiayTo = loaiGt.length > 0 ? loaiGt : this.getFallbackLoaiGiayTo();
			this.catalogs.noiCuTru = noiCt.length > 0 ? noiCt : this.getFallbackNoiCuTru();
			this.isLoaded = true;
		} catch (err) {
			console.error("[CatalogManager] Lỗi khởi tạo danh mục:", err);
		}
	}
	getQuocTichList() {
		return this.catalogs.quocTich;
	}
	getTinhTpList() {
		return this.catalogs.tinhTp;
	}
	getLyDoCuTruList() {
		return this.catalogs.lyDoCuTru;
	}
	getLoaiGiayToList() {
		return this.catalogs.loaiGiayTo;
	}
	getNoiCuTruList() {
		return this.catalogs.noiCuTru;
	}
	isValidQuocTichCode(code) {
		if (!code) return false;
		const clean = String(code).trim().toUpperCase();
		if (this.standardQuocTichMap.size > 0 && this.standardQuocTichMap.has(clean)) return true;
		return this.catalogs.quocTich.some((item) => {
			return String(item.maQT || item.id || item.code || "").trim().toUpperCase() === clean;
		});
	}
	findQuocTich(keyword) {
		if (!keyword) return null;
		const clean = String(keyword).trim().toUpperCase();
		return this.catalogs.quocTich.find((item) => {
			const ma = String(item.maQT || item.id || item.code || "").toUpperCase();
			const ten = String(item.tenQT || item.name || "").toUpperCase();
			const tenEn = String(item.tenQTEn || "").toUpperCase();
			return ma === clean || ten.includes(clean) || tenEn.includes(clean);
		}) || null;
	}
	findTinhTp(keyword) {
		if (!keyword) return null;
		const clean = String(keyword).trim().toLowerCase();
		return this.catalogs.tinhTp.find((item) => {
			const ten = String(item.tenTT || item.name || "").toLowerCase();
			const ma = String(item.maTT || item.id || "").toLowerCase();
			return ten.includes(clean) || ma === clean;
		}) || null;
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
//#endregion
export { catalogManager as t };
