// Standard catalogs embedded directly for zero-fs runtime compatibility on Cloudflare Edge and Node.js

export interface StandardCatalogItem {
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

export const LOAI_GIAY_TO_DATA: StandardCatalogItem[] = [
	{ id: 1, name: "Thẻ CCCD (1)", for: "VN" },
	{ id: 2, name: "Thẻ CMND (2)", for: "VN" },
	{ id: 3, name: "Giấy phép lái xe (3)", for: "VN" },
	{ id: 4, name: "Hộ chiếu / Passport (4)", for: "VN,FOREIGN" },
	{ id: 8, name: "Thẻ Căn Cước (8)", for: "VN" },
];

export const LY_DO_CU_TRU_DATA: StandardCatalogItem[] = [
	{ id: 1, name: "Du lịch (1)" },
	{ id: 20, name: "Mục đích khác (20)" },
];

export const TINH_TP_DATA: StandardCatalogItem[] = [
	{ maTT: "101", tenTT: "TP. Hà Nội", tenTTEn: "HA NOI City", maTTChu: "HN" },
	{
		maTT: "701",
		tenTT: "TP. Hồ Chí Minh",
		tenTTEn: "HO CHI MINH City",
		maTTChu: "HM",
	},
	{ maTT: "501", tenTT: "TP. Đà Nẵng", tenTTEn: "DA NANG City", maTTChu: "DN" },
	{
		maTT: "103",
		tenTT: "TP. Hải Phòng",
		tenTTEn: "HAI PHONG City",
		maTTChu: "HP",
	},
	{ maTT: "815", tenTT: "TP. Cần Thơ", tenTTEn: "CAN THO City", maTTChu: "CT" },
	{ maTT: "411", tenTT: "TP. Huế", tenTTEn: "HUE City", maTTChu: "HU" },
	{
		maTT: "225",
		tenTT: "TP. Quảng Ninh",
		tenTTEn: "QUANG NINH City",
		maTTChu: "QN",
	},
	{
		maTT: "713",
		tenTT: "TP. Đồng Nai",
		tenTTEn: "DONG NAI City",
		maTTChu: "DA",
	},
	{ maTT: "805", tenTT: "An Giang", tenTTEn: "AN GIANG", maTTChu: "AG" },
	{ maTT: "223", tenTT: "Bắc Ninh", tenTTEn: "BAC NINH", maTTChu: "BN" },
	{ maTT: "203", tenTT: "Cao Bằng", tenTTEn: "CAO BANG", maTTChu: "CB" },
	{ maTT: "823", tenTT: "Cà Mau", tenTTEn: "CA MAU", maTTChu: "CM" },
	{ maTT: "603", tenTT: "Gia Lai", tenTTEn: "GIA LAI", maTTChu: "GL" },
	{ maTT: "405", tenTT: "Hà Tĩnh", tenTTEn: "HA TINH", maTTChu: "HI" },
	{ maTT: "109", tenTT: "Hưng Yên", tenTTEn: "HUNG YEN", maTTChu: "HY" },
	{ maTT: "511", tenTT: "Khánh Hòa", tenTTEn: "KHANH HOA", maTTChu: "KH" },
	{ maTT: "301", tenTT: "Lai Châu", tenTTEn: "LAI CHAU", maTTChu: "LH" },
	{ maTT: "205", tenTT: "Lào Cai", tenTTEn: "LAO CAI", maTTChu: "LC" },
	{ maTT: "703", tenTT: "Lâm Đồng", tenTTEn: "LAM DONG", maTTChu: "LD" },
	{ maTT: "209", tenTT: "Lạng Sơn", tenTTEn: "LANG SON", maTTChu: "LS" },
	{ maTT: "403", tenTT: "Nghệ An", tenTTEn: "NGHE AN", maTTChu: "NA" },
	{ maTT: "117", tenTT: "Ninh Bình", tenTTEn: "NINH BINH", maTTChu: "NB" },
	{ maTT: "217", tenTT: "Phú Thọ", tenTTEn: "PHU THO", maTTChu: "PT" },
	{ maTT: "505", tenTT: "Quảng Ngãi", tenTTEn: "QUANG NGAI", maTTChu: "QG" },
	{ maTT: "409", tenTT: "Quảng Trị", tenTTEn: "QUANG TRI", maTTChu: "QT" },
	{ maTT: "303", tenTT: "Sơn La", tenTTEn: "SON LA", maTTChu: "SL" },
	{ maTT: "401", tenTT: "Thanh Hóa", tenTTEn: "THANH HOA", maTTChu: "TH" },
	{ maTT: "215", tenTT: "Thái Nguyên", tenTTEn: "THAI NGUYEN", maTTChu: "TN" },
	{ maTT: "211", tenTT: "Tuyên Quang", tenTTEn: "TUYEN QUANG", maTTChu: "TQ" },
	{ maTT: "709", tenTT: "Tây Ninh", tenTTEn: "TAY NINH", maTTChu: "TI" },
	{ maTT: "809", tenTT: "Vĩnh Long", tenTTEn: "VINH LONG", maTTChu: "VL" },
	{ maTT: "302", tenTT: "Điện Biên", tenTTEn: "DIEN BIEN", maTTChu: "DB" },
	{ maTT: "605", tenTT: "Đắk Lắk", tenTTEn: "DAK LAK", maTTChu: "DL" },
	{ maTT: "803", tenTT: "Đồng Tháp", tenTTEn: "DONG THAP", maTTChu: "DT" },
];

export const QUOC_TICH_DATA: StandardCatalogItem[] = [
	{ maQT: "VNM", tenQT: "Việt Nam", tenQTEn: "Viet Nam" },
	{ maQT: "USA", tenQT: "Hoa Kỳ", tenQTEn: "United States of America" },
	{ maQT: "D", tenQT: "CH Liên bang Đức", tenQTEn: "Germany" },
	{ maQT: "KOR", tenQT: "CH Hàn Quốc", tenQTEn: "Korea (South)" },
	{ maQT: "JPN", tenQT: "Nhật Bản", tenQTEn: "Japan" },
	{ maQT: "CHN", tenQT: "Trung Quốc", tenQTEn: "China" },
	{ maQT: "TWN", tenQT: "Trung Quốc (Đài Loan)", tenQTEn: "China (Taiwan)" },
	{
		maQT: "GBR",
		tenQT: "Vương quốc Anh và Bắc Ai len",
		tenQTEn: "United Kingdom",
	},
	{ maQT: "FRA", tenQT: "Pháp", tenQTEn: "France" },
	{ maQT: "RUS", tenQT: "Liên bang Nga", tenQTEn: "Russia" },
	{ maQT: "AUS", tenQT: "Ô-xtrây-li-a", tenQTEn: "Australia" },
	{ maQT: "CAN", tenQT: "Ca-na-da", tenQTEn: "Canada" },
	{ maQT: "SGP", tenQT: "Xin-ga-po", tenQTEn: "Singapore" },
	{ maQT: "THA", tenQT: "Thái Lan", tenQTEn: "Thailand" },
	{ maQT: "MYS", tenQT: "Ma-lai-xi-a", tenQTEn: "Malaysia" },
	{ maQT: "IDN", tenQT: "In-đô-nê-xi-a", tenQTEn: "Indonesia" },
	{ maQT: "PHL", tenQT: "Phi-líp-pin", tenQTEn: "Philippines" },
	{
		maQT: "LAO",
		tenQT: "CHDCND Lào",
		tenQTEn: "Lao Peoples Democratic Republic",
	},
	{ maQT: "KHM", tenQT: "Căm-pu-chia", tenQTEn: "Cambodia" },
	{ maQT: "IND", tenQT: "Ấn Độ", tenQTEn: "India" },
	{ maQT: "ITA", tenQT: "I-ta-li-a", tenQTEn: "Italy" },
	{ maQT: "ESP", tenQT: "Tây Ban Nha", tenQTEn: "Spain" },
	{ maQT: "NLD", tenQT: "Hà Lan", tenQTEn: "Netherland" },
	{ maQT: "CHE", tenQT: "Thuỵ Sĩ", tenQTEn: "Switzerland" },
	{ maQT: "SWE", tenQT: "Thuỵ Điển", tenQTEn: "Sweden" },
	{ maQT: "NOR", tenQT: "Vương quốc Na-uy", tenQTEn: "Norway" },
	{ maQT: "DNK", tenQT: "Đan Mạch", tenQTEn: "Denmark" },
	{ maQT: "FIN", tenQT: "Phần Lan", tenQTEn: "Finland" },
	{ maQT: "POL", tenQT: "Ba Lan", tenQTEn: "Poland" },
	{ maQT: "CZE", tenQT: "Cộng hoà Séc", tenQTEn: "Czech Republic" },
	{ maQT: "AUT", tenQT: "Áo", tenQTEn: "Austria" },
	{ maQT: "BEL", tenQT: "Bỉ", tenQTEn: "Belgium" },
	{ maQT: "NZL", tenQT: "Niu Di-lân", tenQTEn: "New Zealand" },
	{ maQT: "BRA", tenQT: "Bra-din", tenQTEn: "Brazil" },
	{ maQT: "ARG", tenQT: "Ac-hen-ti-na", tenQTEn: "Argentina" },
	{ maQT: "MEX", tenQT: "Mê-xi-cô", tenQTEn: "Mexico" },
	{ maQT: "ZAF", tenQT: "Nam Phi", tenQTEn: "South Africa" },
	{ maQT: "EGY", tenQT: "Ai Cập", tenQTEn: "Egypt" },
	{ maQT: "TUR", tenQT: "Thổ Nhĩ Kỳ", tenQTEn: "Turkey" },
	{ maQT: "ARE", tenQT: "A-rập thống nhất", tenQTEn: "United Arab Emirates" },
	{ maQT: "SAU", tenQT: "A-rập Xau-đi", tenQTEn: "Saudi Arabia" },
	{ maQT: "ISR", tenQT: "I-xra-en", tenQTEn: "Israel" },
	{ maQT: "UKR", tenQT: "U-crai-na", tenQTEn: "Ukraine" },
	{
		maQT: "PRK",
		tenQT: "CHDCND Triều Tiên",
		tenQTEn: "Korea Democratic Peoples Republic of",
	},
	{ maQT: "0RQ", tenQT: "Không rõ quốc tịch", tenQTEn: "Unidentified" },
];
