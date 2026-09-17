import {
	LOAI_GIAY_TO_DATA,
	LY_DO_CU_TRU_DATA,
	QUOC_TICH_DATA,
	type StandardCatalogItem,
} from "../data/catalogs.js";
import { CONFIG } from "./config.js";

export type CatalogItem = StandardCatalogItem;

export class CatalogManager {
	private static instance: CatalogManager;
	public quocTichList: CatalogItem[] = [];
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
		this.loadInitialCatalogs();
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
			[
				[
					"KOR",
					"KR",
					"HAN QUOC",
					"HÀN QUỐC",
					"KOREA",
					"SOUTH KOREA",
					"DAI HAN",
				],
				"KOR",
			],
			[["JPN", "JP", "NHAT BAN", "NHẬT BẢN", "JAPAN", "JAPANESE"], "JPN"],
			[["CHN", "CN", "TRUNG QUOC", "TRUNG QUỐC", "CHINA", "CHINESE"], "CHN"],
			[
				[
					"TWN",
					"TW",
					"DAI LOAN",
					"ĐÀI LOAN",
					"TAIWAN",
					"TRUNG QUOC (DAI LOAN)",
					"TRUNG QUỐC (ĐÀI LOAN)",
				],
				"TWN",
			],
			[
				[
					"GBR",
					"UK",
					"GB",
					"ANH",
					"VUONG QUOC ANH",
					"VƯƠNG QUỐC ANH",
					"UNITED KINGDOM",
					"BRITAIN",
					"BRITISH",
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
		for (const item of QUOC_TICH_DATA) {
			const code = String(item.maQT || "")
				.trim()
				.toUpperCase();
			const nameVi = String(item.tenQT || "").trim();
			const nameEn = String(item.tenQTEn || "").trim();
			if (code) {
				this.standardQuocTichMap.set(code, {
					ten_quoc_gia: nameVi,
					ten_tieng_anh: nameEn,
				});
			}
		}
	}

	private loadInitialCatalogs(): void {
		this.quocTichList = [...QUOC_TICH_DATA];
		this.lyDoCuTruList = [...LY_DO_CU_TRU_DATA];
		this.loaiGiayToList = [...LOAI_GIAY_TO_DATA];
		this.noiCuTruList = this.getFallbackNoiCuTru();
		this.isLoaded = true;
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
		if (this.isLoaded && this.quocTichList.length > 0) return;
		this.loadInitialCatalogs();
	}

	public getFallbackQuocTich(): CatalogItem[] {
		return [...QUOC_TICH_DATA];
	}

	public getFallbackLyDoCuTru(): CatalogItem[] {
		return [...LY_DO_CU_TRU_DATA];
	}

	public getFallbackLoaiGiayTo(): CatalogItem[] {
		return [...LOAI_GIAY_TO_DATA];
	}

	public getFallbackNoiCuTru(): CatalogItem[] {
		return [
			{ id: 1, name: "Thường trú (1)" },
			{ id: 2, name: "Tạm trú (2)" },
			{ id: 3, name: "Nơi ở hiện tại (3)" },
		];
	}

	public normalizeQuocTich(raw: string): string {
		if (!raw) return "VNM";
		const cleaned = raw.trim().toUpperCase();

		if (this.aliasMap.has(cleaned)) {
			return this.aliasMap.get(cleaned) || cleaned;
		}

		if (this.standardQuocTichMap.has(cleaned)) {
			return cleaned;
		}

		for (const [code, info] of this.standardQuocTichMap.entries()) {
			if (
				info.ten_quoc_gia.toUpperCase() === cleaned ||
				info.ten_tieng_anh.toUpperCase() === cleaned
			) {
				return code;
			}
		}

		return cleaned;
	}

	public getQuocTichInfo(
		code: string,
	): { ten_quoc_gia: string; ten_tieng_anh: string } | null {
		const norm = this.normalizeQuocTich(code);
		return this.standardQuocTichMap.get(norm) || null;
	}

	public isValidQuocTich(code: string): boolean {
		const norm = this.normalizeQuocTich(code);
		return this.standardQuocTichMap.has(norm);
	}

	public findQuocTich(raw: string): string {
		return this.normalizeQuocTich(raw);
	}

	public isValidQuocTichCode(code: string): boolean {
		return this.isValidQuocTich(code);
	}

	public findLoaiGiayTo(raw: string | number): number {
		if (!raw) return 1;
		const num = Number(raw);
		if (!Number.isNaN(num) && [1, 2, 3, 4, 8].includes(num)) {
			return num;
		}
		const str = String(raw).toLowerCase().trim();
		if (str.includes("hộ chiếu") || str.includes("passport")) return 4;
		if (
			str.includes("thẻ căn cước") ||
			str === "căn cước" ||
			str === "can cuoc"
		)
			return 8;
		if (str.includes("cccd") || str.includes("căn cước công dân")) return 1;
		if (str.includes("cmnd")) return 2;
		if (str.includes("bằng lái") || str.includes("gplx")) return 3;
		return 1;
	}

	public findLyDoCuTru(raw: string | number): number {
		if (!raw) return 1;
		const num = Number(raw);
		if (num === 20) return 20;
		if (num === 1) return 1;
		const str = String(raw).toLowerCase();
		if (str.includes("khác") || str.includes("khac")) return 20;
		return 1;
	}
}

export const catalogManager = CatalogManager.getInstance();
