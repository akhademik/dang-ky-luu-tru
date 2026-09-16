import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";

export interface CatalogItem {
	id?: number | string;
	name?: string;
	tenTT?: string;
	maTT?: string | number;
	tenTTEn?: string;
	maTTChu?: string;
	tenQT?: string;
	maQT?: string;
	tenQTEn?: string;
	[key: string]: unknown;
}

export class CatalogManager {
	private static instance: CatalogManager;
	public quocTichList: CatalogItem[] = [];
	public tinhTpList: CatalogItem[] = [];
	public lyDoCuTruList: CatalogItem[] = [];
	public loaiGiayToList: CatalogItem[] = [];
	public noiCuTruList: CatalogItem[] = [];
	public isLoaded = false;
	private standardQuocTichMap = new Map<
		string,
		{ ten_quoc_gia: string; ten_tieng_anh: string }
	>();
	private aliasMap = new Map<string, string>();

	public constructor() {
		this.initAliases();
		this.loadStandardQuocTich();
	}

	public static getInstance(): CatalogManager {
		if (!CatalogManager.instance) {
			CatalogManager.instance = new CatalogManager();
		}
		return CatalogManager.instance;
	}

	private initAliases(): void {
		const aliases: [string[], string][] = [
			[["VN", "VNM", "VIET NAM", "VIỆT NAM", "VIETNAM", "VIET", "KINH"], "VNM"],
			[
				[
					"USA",
					"US",
					"HOA KỲ",
					"HOA KY",
					"MY",
					"MỸ",
					"UNITED STATES",
					"AMERICA",
				],
				"USA",
			],
			[
				[
					"RUS",
					"RU",
					"NGA",
					"LIEN BANG NGA",
					"LIÊN BANG NGA",
					"RUSSIA",
					"RUSSIAN",
				],
				"RUS",
			],
			[["CHN", "CN", "TRUNG QUOC", "TRUNG QUỐC", "CHINA", "CHINESE"], "CHN"],
			[["KOR", "KR", "HAN QUOC", "HÀN QUỐC", "KOREA", "SOUTH KOREA"], "KOR"],
			[
				[
					"JPN",
					"JP",
					"NHAT BAN",
					"NHẬT BẢN",
					"NHAT",
					"NHẬT",
					"JAPAN",
					"JAPANESE",
				],
				"JPN",
			],
			[["TWN", "TW", "DAI LOAN", "ĐÀI LOAN", "TAIWAN"], "TWN"],
			[
				[
					"GBR",
					"GB",
					"UK",
					"ANH",
					"VUONG QUOC ANH",
					"VƯƠNG QUỐC ANH",
					"UNITED KINGDOM",
					"ENGLAND",
				],
				"GBR",
			],
			[["AUS", "AU", "UC", "ÚC", "AUSTRALIA"], "AUS"],
			[["FRA", "FR", "PHAP", "PHÁP", "FRANCE", "FRENCH"], "FRA"],
			[["DEU", "DE", "DUC", "ĐỨC", "GERMANY", "GERMAN", "D"], "D"],
			[["THA", "TH", "THAI LAN", "THÁI LAN", "THAILAND"], "THA"],
			[["LAO", "LA", "LAO", "LÀO", "LAOS"], "LAO"],
			[["KHM", "KH", "CAMPUCHIA", "CAMBODIA"], "KHM"],
			[["SGP", "SG", "SINGAPORE", "XIN-GA-PO"], "SGP"],
			[["MYS", "MY", "MALAYSIA", "MA-LAI-XI-A"], "MYS"],
			[["IDN", "ID", "INDONESIA", "IN-DO-NE-XI-A"], "IDN"],
			[["PHL", "PH", "PHILIPPINES", "PHI-LIP-PIN"], "PHL"],
			[["IND", "IN", "AN DO", "ẤN ĐỘ", "INDIA"], "IND"],
			[["ITA", "IT", "Y", "Ý", "ITALY", "ITALIAN"], "ITA"],
			[["ESP", "ES", "TAY BAN NHA", "TÂY BAN NHA", "SPAIN", "SPANISH"], "ESP"],
			[["CAN", "CA", "CANADA", "CA-NA-DA"], "CAN"],
			[["BRA", "BR", "BRAZIL", "BRA-XIN", "BRA-DIN"], "BRA"],
			[["VAA"], "VAA"],
		];

		for (const [names, code] of aliases) {
			for (const name of names) {
				this.aliasMap.set(name.toUpperCase(), code);
			}
		}
	}

	private loadStandardQuocTich(): void {
		try {
			const candidates = [
				path.resolve(process.cwd(), "data/catalogs/quoc_tich.json"),
				path.resolve(process.cwd(), "quoc_tich.json"),
				path.resolve(process.cwd(), "src/lib/server/quoc_tich.json"),
			];
			for (const jsonPath of candidates) {
				if (fs.existsSync(jsonPath)) {
					const raw = fs.readFileSync(jsonPath, "utf8");
					const parsed = JSON.parse(raw);
					const list = Array.isArray(parsed) ? parsed : parsed.data || [];
					if (Array.isArray(list) && list.length > 0) {
						list.forEach((item) => {
							const code = String(
								item.maQT || item.ma_alpha3 || item.code || "",
							)
								.trim()
								.toUpperCase();
							const nameVi = String(
								item.tenQT || item.ten_quoc_gia || item.name || "",
							).trim();
							const nameEn = String(
								item.tenQTEn || item.ten_tieng_anh || item.nameEn || "",
							).trim();
							if (code) {
								this.standardQuocTichMap.set(code, {
									ten_quoc_gia: nameVi,
									ten_tieng_anh: nameEn,
								});
							}
						});
						break;
					}
				}
			}
		} catch (err) {
			console.warn("[CatalogManager] Không thể nạp quoc_tich.json:", err);
		}
	}

	public async fetchPublicCatalog(endpoint: string): Promise<CatalogItem[]> {
		try {
			const res = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) return [];
			const data = await res.json();
			return (data.data || data || []) as CatalogItem[];
		} catch {
			return [];
		}
	}

	public async initialize(): Promise<void> {
		if (this.isLoaded) return;
		try {
			const [qt, tinh, lyDo, loaiGt, noiCt] = await Promise.all([
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_QUOC_TICH),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_TINH_TP),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_LY_DO_CU_TRU),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_LOAI_GIAY_TO),
				this.fetchPublicCatalog(CONFIG.ENDPOINTS.DM_NOI_CU_TRU),
			]);

			this.quocTichList = qt.length > 0 ? qt : this.getFallbackQuocTich();
			this.tinhTpList = tinh.length > 0 ? tinh : this.getFallbackTinhTp();

			// Show only 2 reasons: Du lịch (1) and Mục đích khác (20)
			if (lyDo.length > 0) {
				const filtered = lyDo.filter((item) => {
					const id = Number(item.id);
					const name = String(item.name || item.ten || "").toLowerCase();
					return (
						id === 1 ||
						id === 20 ||
						name.includes("du lịch") ||
						name.includes("du lich") ||
						name.includes("mục đích khác") ||
						name.includes("muc dich khac")
					);
				});
				this.lyDoCuTruList =
					filtered.length > 0 ? filtered : this.getFallbackLyDoCuTru();
			} else {
				this.lyDoCuTruList = this.getFallbackLyDoCuTru();
			}

			this.loaiGiayToList =
				loaiGt.length > 0 ? loaiGt : this.getFallbackLoaiGiayTo();
			this.noiCuTruList = noiCt.length > 0 ? noiCt : this.getFallbackNoiCuTru();

			this.isLoaded = true;
		} catch (err) {
			console.error("[CatalogManager] Lỗi khởi tạo danh mục:", err);
		}
	}

	public isValidQuocTichCode(code: string): boolean {
		if (!code) return false;
		const clean = String(code).trim().toUpperCase();
		if (this.aliasMap.has(clean)) return true;
		if (
			this.standardQuocTichMap.size > 0 &&
			this.standardQuocTichMap.has(clean)
		) {
			return true;
		}
		return this.quocTichList.some((item) => {
			const ma = String(item.maQT || item.id || item.code || "")
				.trim()
				.toUpperCase();
			return ma === clean;
		});
	}

	public findQuocTich(keyword: string): string | null {
		if (!keyword) return null;
		const clean = String(keyword).trim().toUpperCase();

		// 1. Check alias map
		if (this.aliasMap.has(clean)) {
			return this.aliasMap.get(clean)!;
		}

		// 2. Check direct standard alpha-3 codes
		if (this.standardQuocTichMap.has(clean)) {
			return clean;
		}

		// 3. Check loaded quocTichList
		const item = this.quocTichList.find((i) => {
			const ma = String(i.maQT || i.id || i.code || "")
				.trim()
				.toUpperCase();
			const ten = String(i.tenQT || i.name || "")
				.trim()
				.toUpperCase();
			const tenEn = String(i.tenQTEn || "")
				.trim()
				.toUpperCase();
			return (
				ma === clean ||
				ten === clean ||
				tenEn === clean ||
				ten.includes(clean) ||
				tenEn.includes(clean)
			);
		});
		if (item && item.maQT) return String(item.maQT).toUpperCase();

		// 4. Check standard map values
		for (const [code, info] of this.standardQuocTichMap.entries()) {
			const vi = info.ten_quoc_gia.toUpperCase();
			const en = info.ten_tieng_anh.toUpperCase();
			if (
				vi === clean ||
				en === clean ||
				vi.includes(clean) ||
				en.includes(clean)
			) {
				return code;
			}
		}

		return null;
	}

	public findLoaiGiayTo(name: string): number {
		if (!name) return 1;
		const clean = String(name).toLowerCase();
		if (clean.includes("căn cước") && !clean.includes("thẻ cccd")) return 8;
		if (clean.includes("cccd")) return 1;
		if (clean.includes("cmnd")) return 2;
		if (clean.includes("lái xe") || clean.includes("gplx")) return 3;
		if (clean.includes("hộ chiếu") || clean.includes("passport")) return 4;
		return 1;
	}

	private getFallbackQuocTich(): CatalogItem[] {
		if (this.standardQuocTichMap.size > 0) {
			return Array.from(this.standardQuocTichMap.entries()).map(
				([ma, val]) => ({
					maQT: ma,
					tenQT: val.ten_quoc_gia,
					tenQTEn: val.ten_tieng_anh,
				}),
			);
		}
		return [
			{ maQT: "VNM", tenQT: "Việt Nam", tenQTEn: "Vietnam" },
			{ maQT: "RUS", tenQT: "Liên bang Nga", tenQTEn: "Russian Federation" },
			{ maQT: "USA", tenQT: "Hoa Kỳ", tenQTEn: "United States" },
			{ maQT: "CHN", tenQT: "Trung Quốc", tenQTEn: "China" },
			{ maQT: "KOR", tenQT: "Hàn Quốc", tenQTEn: "Korea, Republic of" },
			{ maQT: "JPN", tenQT: "Nhật Bản", tenQTEn: "Japan" },
			{
				maQT: "VAA",
				tenQT: "Cơ quan ngoại giao VAA",
				tenQTEn: "VAA Diplomatic",
			},
		];
	}

	private getFallbackTinhTp(): CatalogItem[] {
		return [
			{ maTT: 101, maTTChu: "HN", tenTT: "Hà Nội" },
			{ maTT: 103, maTTChu: "HP", tenTT: "Hải Phòng" },
			{ maTT: 201, maTTChu: "DN", tenTT: "Đà Nẵng" },
			{ maTT: 701, maTTChu: "HCM", tenTT: "Hồ Chí Minh" },
			{ maTT: 606, maTTChu: "DL", tenTT: "Đắk Lắk" },
		];
	}

	private getFallbackLyDoCuTru(): CatalogItem[] {
		return [
			{ id: 1, name: "Du lịch" },
			{ id: 20, name: "Mục đích khác" },
		];
	}

	private getFallbackLoaiGiayTo(): CatalogItem[] {
		return [
			{ id: 1, name: "CCCD" },
			{ id: 2, name: "Thẻ CMND" },
			{ id: 3, name: "Giấy phép lái xe" },
			{ id: 4, name: "Hộ chiếu" },
			{ id: 8, name: "Thẻ Căn Cước" },
		];
	}

	private getFallbackNoiCuTru(): CatalogItem[] {
		return [
			{ id: 1, name: "Thường trú" },
			{ id: 2, name: "Tạm trú" },
		];
	}
}

export const catalogManager = CatalogManager.getInstance();
