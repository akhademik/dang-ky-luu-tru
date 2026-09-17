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
	{
		"id": 1,
		"name": "Thẻ CCCD (1)",
		"for": "VN"
	},
	{
		"id": 2,
		"name": "Thẻ CMND (2)",
		"for": "VN"
	},
	{
		"id": 3,
		"name": "Giấy phép lái xe (3)",
		"for": "VN"
	},
	{
		"id": 4,
		"name": "Hộ chiếu / Passport (4)",
		"for": "VN,FOREIGN"
	},
	{
		"id": 8,
		"name": "Thẻ Căn Cước (8)",
		"for": "VN"
	}
];

export const LY_DO_CU_TRU_DATA: StandardCatalogItem[] = [
	{
		"id": 1,
		"name": "Du lịch (1)"
	},
	{
		"id": 20,
		"name": "Mục đích khác (20)"
	}
];

export const TINH_TP_DATA: StandardCatalogItem[] = [
	{
		"maTT": "101",
		"tenTT": "TP. Hà Nội",
		"tenTTEn": "HA NOI City",
		"maTTChu": "HN"
	},
	{
		"maTT": "701",
		"tenTT": "TP. Hồ Chí Minh",
		"tenTTEn": "HO CHI MINH City",
		"maTTChu": "HM"
	},
	{
		"maTT": "501",
		"tenTT": "TP. Đà Nẵng",
		"tenTTEn": "DA NANG City",
		"maTTChu": "DN"
	},
	{
		"maTT": "103",
		"tenTT": "TP. Hải Phòng",
		"tenTTEn": "HAI PHONG City",
		"maTTChu": "HP"
	},
	{
		"maTT": "815",
		"tenTT": "TP. Cần Thơ",
		"tenTTEn": "CAN THO City",
		"maTTChu": "CT"
	},
	{
		"maTT": "411",
		"tenTT": "TP. Huế",
		"tenTTEn": "HUE City",
		"maTTChu": "HU"
	},
	{
		"maTT": "225",
		"tenTT": "TP. Quảng Ninh",
		"tenTTEn": "QUANG NINH City",
		"maTTChu": "QN"
	},
	{
		"maTT": "713",
		"tenTT": "TP. Đồng Nai",
		"tenTTEn": "DONG NAI City",
		"maTTChu": "DA"
	},
	{
		"maTT": "805",
		"tenTT": "An Giang",
		"tenTTEn": "AN GIANG",
		"maTTChu": "AG"
	},
	{
		"maTT": "223",
		"tenTT": "Bắc Ninh",
		"tenTTEn": "BAC NINH",
		"maTTChu": "BN"
	},
	{
		"maTT": "203",
		"tenTT": "Cao Bằng",
		"tenTTEn": "CAO BANG",
		"maTTChu": "CB"
	},
	{
		"maTT": "823",
		"tenTT": "Cà Mau",
		"tenTTEn": "CA MAU",
		"maTTChu": "CM"
	},
	{
		"maTT": "603",
		"tenTT": "Gia Lai",
		"tenTTEn": "GIA LAI",
		"maTTChu": "GL"
	},
	{
		"maTT": "405",
		"tenTT": "Hà Tĩnh",
		"tenTTEn": "HA TINH",
		"maTTChu": "HI"
	},
	{
		"maTT": "109",
		"tenTT": "Hưng Yên",
		"tenTTEn": "HUNG YEN",
		"maTTChu": "HY"
	},
	{
		"maTT": "511",
		"tenTT": "Khánh Hòa",
		"tenTTEn": "KHANH HOA",
		"maTTChu": "KH"
	},
	{
		"maTT": "301",
		"tenTT": "Lai Châu",
		"tenTTEn": "LAI CHAU",
		"maTTChu": "LH"
	},
	{
		"maTT": "205",
		"tenTT": "Lào Cai",
		"tenTTEn": "LAO CAI",
		"maTTChu": "LC"
	},
	{
		"maTT": "703",
		"tenTT": "Lâm Đồng",
		"tenTTEn": "LAM DONG",
		"maTTChu": "LD"
	},
	{
		"maTT": "209",
		"tenTT": "Lạng Sơn",
		"tenTTEn": "LANG SON",
		"maTTChu": "LS"
	},
	{
		"maTT": "403",
		"tenTT": "Nghệ An",
		"tenTTEn": "NGHE AN",
		"maTTChu": "NA"
	},
	{
		"maTT": "117",
		"tenTT": "Ninh Bình",
		"tenTTEn": "NINH BINH",
		"maTTChu": "NB"
	},
	{
		"maTT": "217",
		"tenTT": "Phú Thọ",
		"tenTTEn": "PHU THO",
		"maTTChu": "PT"
	},
	{
		"maTT": "505",
		"tenTT": "Quảng Ngãi",
		"tenTTEn": "QUANG NGAI",
		"maTTChu": "QG"
	},
	{
		"maTT": "409",
		"tenTT": "Quảng Trị",
		"tenTTEn": "QUANG TRI",
		"maTTChu": "QT"
	},
	{
		"maTT": "303",
		"tenTT": "Sơn La",
		"tenTTEn": "SON LA",
		"maTTChu": "SL"
	},
	{
		"maTT": "401",
		"tenTT": "Thanh Hóa",
		"tenTTEn": "THANH HOA",
		"maTTChu": "TH"
	},
	{
		"maTT": "215",
		"tenTT": "Thái Nguyên",
		"tenTTEn": "THAI NGUYEN",
		"maTTChu": "TN"
	},
	{
		"maTT": "211",
		"tenTT": "Tuyên Quang",
		"tenTTEn": "TUYEN QUANG",
		"maTTChu": "TQ"
	},
	{
		"maTT": "709",
		"tenTT": "Tây Ninh",
		"tenTTEn": "TAY NINH",
		"maTTChu": "TI"
	},
	{
		"maTT": "809",
		"tenTT": "Vĩnh Long",
		"tenTTEn": "VINH LONG",
		"maTTChu": "VL"
	},
	{
		"maTT": "302",
		"tenTT": "Điện Biên",
		"tenTTEn": "DIEN BIEN",
		"maTTChu": "DB"
	},
	{
		"maTT": "605",
		"tenTT": "Đắk Lắk",
		"tenTTEn": "DAK LAK",
		"maTTChu": "DL"
	},
	{
		"maTT": "803",
		"tenTT": "Đồng Tháp",
		"tenTTEn": "DONG THAP",
		"maTTChu": "DT"
	}
];

export const QUOC_TICH_DATA: StandardCatalogItem[] = [
	{
		"maQT": "AZE",
		"tenQT": "A-déc-bai-gian",
		"tenQTEn": "Azerbaijan"
	},
	{
		"maQT": "ABW",
		"tenQT": "A-ru-ba",
		"tenQTEn": "Aruba"
	},
	{
		"maQT": "ARE",
		"tenQT": "A-rập thống nhất",
		"tenQTEn": "United Arab Emirates"
	},
	{
		"maQT": "SAU",
		"tenQT": "A-rập Xau-đi",
		"tenQTEn": "Saudi Arabia"
	},
	{
		"maQT": "ARG",
		"tenQT": "Ac-hen-ti-na",
		"tenQTEn": "Argentina"
	},
	{
		"maQT": "ARM",
		"tenQT": "Ac-mê-ni-a",
		"tenQTEn": "Armenia"
	},
	{
		"maQT": "EGY",
		"tenQT": "Ai Cập",
		"tenQTEn": "Egypt"
	},
	{
		"maQT": "IRL",
		"tenQT": "Ai-rơ-len",
		"tenQTEn": "Ireland"
	},
	{
		"maQT": "ISL",
		"tenQT": "Ai-xơ-len",
		"tenQTEn": "Iceland"
	},
	{
		"maQT": "ALB",
		"tenQT": "An-ba-ni",
		"tenQTEn": "Albania"
	},
	{
		"maQT": "DZA",
		"tenQT": "An-giê-ri",
		"tenQTEn": "Algeria"
	},
	{
		"maQT": "AFG",
		"tenQT": "Ap-ga-ni-xtan",
		"tenQTEn": "Afghanistan"
	},
	{
		"maQT": "POL",
		"tenQT": "Ba Lan",
		"tenQTEn": "Poland"
	},
	{
		"maQT": "BHS",
		"tenQT": "Ba-ha-ma",
		"tenQTEn": "Bahamas"
	},
	{
		"maQT": "BHR",
		"tenQT": "Ba-ra-in",
		"tenQTEn": "Bahrain"
	},
	{
		"maQT": "BRA",
		"tenQT": "Bra-din",
		"tenQTEn": "Brazil"
	},
	{
		"maQT": "BRN",
		"tenQT": "Brunei",
		"tenQTEn": "Bruney"
	},
	{
		"maQT": "BDI",
		"tenQT": "Bu-run-đi",
		"tenQTEn": "Burundi"
	},
	{
		"maQT": "BTN",
		"tenQT": "Bu-tan",
		"tenQTEn": "Bhutan"
	},
	{
		"maQT": "BGR",
		"tenQT": "Bun-ga-ri",
		"tenQTEn": "Bulgaria"
	},
	{
		"maQT": "BFA",
		"tenQT": "Buốc-ki-na Pha-xô",
		"tenQTEn": "Burkina Faso"
	},
	{
		"maQT": "BRB",
		"tenQT": "Bác-ba-đốt",
		"tenQTEn": "Barbados"
	},
	{
		"maQT": "BMU",
		"tenQT": "Béc-mu-đa",
		"tenQTEn": "Bermuda"
	},
	{
		"maQT": "BLR",
		"tenQT": "Bê-la-rút",
		"tenQTEn": "Belarus"
	},
	{
		"maQT": "BLZ",
		"tenQT": "Bê-li-xê",
		"tenQTEn": "Belize"
	},
	{
		"maQT": "BEN",
		"tenQT": "Bê-nanh",
		"tenQTEn": "Benin"
	},
	{
		"maQT": "BOL",
		"tenQT": "Bô-li-vi-a",
		"tenQTEn": "Bolivia"
	},
	{
		"maQT": "BIH",
		"tenQT": "Bô-xni-a Héc-dê-gô-vi-na",
		"tenQTEn": "Bosnia and Herzegovina"
	},
	{
		"maQT": "BGD",
		"tenQT": "Băng-la-đét",
		"tenQTEn": "Bangladesh"
	},
	{
		"maQT": "BEL",
		"tenQT": "Bỉ",
		"tenQTEn": "Belgium"
	},
	{
		"maQT": "BWA",
		"tenQT": "Bốt-xoa-na",
		"tenQTEn": "Botswana"
	},
	{
		"maQT": "PRT",
		"tenQT": "Bồ Đào Nha",
		"tenQTEn": "Portugal"
	},
	{
		"maQT": "CMR",
		"tenQT": "Ca-mơ-run",
		"tenQTEn": "Cameroon"
	},
	{
		"maQT": "CAN",
		"tenQT": "Ca-na-da",
		"tenQTEn": "Canada"
	},
	{
		"maQT": "SYR",
		"tenQT": "CH A-rập Xy-ri",
		"tenQTEn": "Syrian Arab Republic"
	},
	{
		"maQT": "KOR",
		"tenQT": "CH Hàn Quốc",
		"tenQTEn": "Korea (South)"
	},
	{
		"maQT": "IRN",
		"tenQT": "CH Hồi giáo I-ran",
		"tenQTEn": "Iran Ilasmic Republic of"
	},
	{
		"maQT": "D",
		"tenQT": "CH Liên bang Đức",
		"tenQTEn": "Germany"
	},
	{
		"maQT": "TZA",
		"tenQT": "CH thống nhất Tan-da-ni-a",
		"tenQTEn": "Tanzania United Republic of"
	},
	{
		"maQT": "TTO",
		"tenQT": "CH Tơ-ri-ni-đát và Tô-ba-gô",
		"tenQTEn": "Trinidad and Tobago"
	},
	{
		"maQT": "DOM",
		"tenQT": "CH Đô-mi-ni-ca-na",
		"tenQTEn": "Dominican Republic"
	},
	{
		"maQT": "LAO",
		"tenQT": "CHDCND Lào",
		"tenQTEn": "Lao Peoples Democratic Republic"
	},
	{
		"maQT": "PRK",
		"tenQT": "CHDCND Triều Tiên",
		"tenQTEn": "Korea Democratic Peoples Republic of"
	},
	{
		"maQT": "CHL",
		"tenQT": "Chi-lê",
		"tenQTEn": "Chile"
	},
	{
		"maQT": "HRV",
		"tenQT": "Crô-a-ti-a",
		"tenQTEn": "Croatia"
	},
	{
		"maQT": "CUB",
		"tenQT": "Cu Ba",
		"tenQTEn": "Cuba"
	},
	{
		"maQT": "CPV",
		"tenQT": "Cáp-ve",
		"tenQTEn": "Cape Verde"
	},
	{
		"maQT": "COL",
		"tenQT": "Cô-lôm-bi-a",
		"tenQTEn": "Colombia"
	},
	{
		"maQT": "COM",
		"tenQT": "Cô-mo",
		"tenQTEn": "Comoros"
	},
	{
		"maQT": "KWT",
		"tenQT": "Cô-oét",
		"tenQTEn": "Kuwait"
	},
	{
		"maQT": "CRI",
		"tenQT": "Cô-xta Ri-ca",
		"tenQTEn": "Costa Rica"
	},
	{
		"maQT": "GBD",
		"tenQT": "Công dân các địa phận thuộc Vương quốc liên hiệp Anh",
		"tenQTEn": "United Kingdom British Territories Citizen"
	},
	{
		"maQT": "AND",
		"tenQT": "Công quốc An-đơ-ra",
		"tenQTEn": "Andorra"
	},
	{
		"maQT": "LIE",
		"tenQT": "Công quốc Lích-ten-xtên",
		"tenQTEn": "Liechtenstein"
	},
	{
		"maQT": "MCO",
		"tenQT": "Công quốc Mô-na-cô",
		"tenQTEn": "Monaco"
	},
	{
		"maQT": "COG",
		"tenQT": "Công-gô",
		"tenQTEn": "Congo"
	},
	{
		"maQT": "KHM",
		"tenQT": "Căm-pu-chia",
		"tenQTEn": "Cambodia"
	},
	{
		"maQT": "CIV",
		"tenQT": "Cốt Đi-voa",
		"tenQTEn": "Cote d' Ivoire"
	},
	{
		"maQT": "CZE",
		"tenQT": "Cộng hoà Séc",
		"tenQTEn": "Czech Republic"
	},
	{
		"maQT": "CAF",
		"tenQT": "Cộng hoà Trung Phi",
		"tenQTEn": "Central African Republic"
	},
	{
		"maQT": "COD",
		"tenQT": "Cộng hòa dân chủ Công-gô",
		"tenQTEn": "Democratic Republic of the Congo"
	},
	{
		"maQT": "ZAR",
		"tenQT": "Da-i-re",
		"tenQTEn": "Zaire"
	},
	{
		"maQT": "ZWE",
		"tenQT": "Dim-ba-bu-ê",
		"tenQTEn": "Zimbabwe"
	},
	{
		"maQT": "ZMB",
		"tenQT": "Dăm-bi-a",
		"tenQTEn": "Zambia"
	},
	{
		"maQT": "SLV",
		"tenQT": "En Xan-va-đo",
		"tenQTEn": "El Salvado"
	},
	{
		"maQT": "FRO",
		"tenQT": "Fa-rô",
		"tenQTEn": "Faroe"
	},
	{
		"maQT": "FJI",
		"tenQT": "Fi-ji",
		"tenQTEn": "Fiji"
	},
	{
		"maQT": "GAB",
		"tenQT": "Ga-bông",
		"tenQTEn": "Gabon"
	},
	{
		"maQT": "GHA",
		"tenQT": "Ga-na",
		"tenQTEn": "Ghana"
	},
	{
		"maQT": "GIN",
		"tenQT": "Ghi-nê",
		"tenQTEn": "Guinea"
	},
	{
		"maQT": "GNB",
		"tenQT": "Ghi-nê Bít-xao",
		"tenQTEn": "Guinea-Bissau"
	},
	{
		"maQT": "GNQ",
		"tenQT": "Ghi-nê Xích đạo",
		"tenQTEn": "Equatorial Guinea"
	},
	{
		"maQT": "GIB",
		"tenQT": "Gi-bran-ta",
		"tenQTEn": "Gibraltar"
	},
	{
		"maQT": "LBY",
		"tenQT": "Gia-ma-hi-ri-i-a A-rập Li-bi Nhân dân",
		"tenQTEn": "Libyan Arab Jamahiriya"
	},
	{
		"maQT": "GTM",
		"tenQT": "Goa-tê-ma-la",
		"tenQTEn": "Guatemala"
	},
	{
		"maQT": "GRL",
		"tenQT": "Grin-lơn",
		"tenQTEn": "Greenland"
	},
	{
		"maQT": "GEO",
		"tenQT": "Gru-di-a",
		"tenQTEn": "Georgia"
	},
	{
		"maQT": "GRD",
		"tenQT": "Grê-na-đa",
		"tenQTEn": "Grenada"
	},
	{
		"maQT": "GUM",
		"tenQT": "Gu-am",
		"tenQTEn": "Guam"
	},
	{
		"maQT": "GLP",
		"tenQT": "Gua-đờ-lúp",
		"tenQTEn": "Guadeloupe"
	},
	{
		"maQT": "GUY",
		"tenQT": "Gui-na",
		"tenQTEn": "Guyana"
	},
	{
		"maQT": "GUF",
		"tenQT": "Guy-a-na thuộc Pháp",
		"tenQTEn": "French Guiana"
	},
	{
		"maQT": "GMB",
		"tenQT": "Găm-bi-a",
		"tenQTEn": "Gambia"
	},
	{
		"maQT": "HTI",
		"tenQT": "Ha-i-ti",
		"tenQTEn": "Haiti"
	},
	{
		"maQT": "UNO",
		"tenQT": "HC Liên hiệp quốc",
		"tenQTEn": "United Nations Organization"
	},
	{
		"maQT": "USA",
		"tenQT": "Hoa Kỳ",
		"tenQTEn": "United States of America"
	},
	{
		"maQT": "HND",
		"tenQT": "Hon-du-rat",
		"tenQTEn": "Honduras"
	},
	{
		"maQT": "HUN",
		"tenQT": "Hung-ga-ri",
		"tenQTEn": "Hungary"
	},
	{
		"maQT": "GRC",
		"tenQT": "Hy Lạp",
		"tenQTEn": "Greece"
	},
	{
		"maQT": "NLD",
		"tenQT": "Hà Lan",
		"tenQTEn": "Netherland"
	},
	{
		"maQT": "IRQ",
		"tenQT": "I-rắc",
		"tenQTEn": "Iraq"
	},
	{
		"maQT": "ITA",
		"tenQT": "I-ta-li-a",
		"tenQTEn": "Italy"
	},
	{
		"maQT": "ISR",
		"tenQT": "I-xra-en",
		"tenQTEn": "Israel"
	},
	{
		"maQT": "IDN",
		"tenQT": "In-đô-nê-xi-a",
		"tenQTEn": "Indonesia"
	},
	{
		"maQT": "JAM",
		"tenQT": "Ja-mai-ca",
		"tenQTEn": "Jamaica"
	},
	{
		"maQT": "JOR",
		"tenQT": "Joc-đan",
		"tenQTEn": "Jordan"
	},
	{
		"maQT": "KAZ",
		"tenQT": "Ka-dắc-xtan",
		"tenQTEn": "Kazakhstan"
	},
	{
		"maQT": "0RQ",
		"tenQT": "Không rõ quốc tịch",
		"tenQTEn": "Unidentified"
	},
	{
		"maQT": "KIR",
		"tenQT": "Ki-ri-ba-ti",
		"tenQTEn": "Kiribati"
	},
	{
		"maQT": "KGZ",
		"tenQT": "Kiếc-ghi-di-a",
		"tenQTEn": "Kyrgyzstan"
	},
	{
		"maQT": "KEN",
		"tenQT": "Kê-ni-a",
		"tenQTEn": "Kenya"
	},
	{
		"maQT": "RKS",
		"tenQT": "Kô-sô-vô",
		"tenQTEn": "Kosovo"
	},
	{
		"maQT": "LBN",
		"tenQT": "Li-ban",
		"tenQTEn": "Lebanon"
	},
	{
		"maQT": "LBR",
		"tenQT": "Li-bê-ri-a",
		"tenQTEn": "Liberia"
	},
	{
		"maQT": "LTU",
		"tenQT": "Lit-hua-ni-a",
		"tenQTEn": "Lithuania"
	},
	{
		"maQT": "RUS",
		"tenQT": "Liên bang Nga",
		"tenQTEn": "Russia"
	},
	{
		"maQT": "KNA",
		"tenQT": "Liên bang Xanh Kít và Nê-vít",
		"tenQTEn": "Saint Kitts and Nevis"
	},
	{
		"maQT": "LUX",
		"tenQT": "Luých-xem-bua",
		"tenQTEn": "Luxembourg"
	},
	{
		"maQT": "LVA",
		"tenQT": "Lát-vi-a",
		"tenQTEn": "Latvia"
	},
	{
		"maQT": "LSO",
		"tenQT": "Lê-xô-thô",
		"tenQTEn": "Lesotho"
	},
	{
		"maQT": "MWI",
		"tenQT": "Ma-la-uy",
		"tenQTEn": "Malawi"
	},
	{
		"maQT": "MYS",
		"tenQT": "Ma-lai-xi-a",
		"tenQTEn": "Malaysia"
	},
	{
		"maQT": "MLI",
		"tenQT": "Ma-li",
		"tenQTEn": "Mali"
	},
	{
		"maQT": "MAR",
		"tenQT": "Ma-rốc",
		"tenQTEn": "Morocco"
	},
	{
		"maQT": "MKD",
		"tenQT": "Ma-xê-đô-ni-a",
		"tenQTEn": "Macedonia"
	},
	{
		"maQT": "MDG",
		"tenQT": "Ma-đa-ga-xca",
		"tenQTEn": "Madagascar"
	},
	{
		"maQT": "MTQ",
		"tenQT": "Mac-ti-nic",
		"tenQTEn": "Martinique"
	},
	{
		"maQT": "FSM",
		"tenQT": "Mai-crô-nê-xi-a",
		"tenQTEn": "Micronesia"
	},
	{
		"maQT": "MLT",
		"tenQT": "Man-ta",
		"tenQTEn": "Malta"
	},
	{
		"maQT": "MDV",
		"tenQT": "Man-đi-vơ",
		"tenQTEn": "Maldives"
	},
	{
		"maQT": "MYT",
		"tenQT": "May-ốt",
		"tenQTEn": "Mayotte"
	},
	{
		"maQT": "MMR",
		"tenQT": "Mi-an-ma",
		"tenQTEn": "Myanmar"
	},
	{
		"maQT": "MEX",
		"tenQT": "Mê-xi-cô",
		"tenQTEn": "Mexico"
	},
	{
		"maQT": "MOZ",
		"tenQT": "Mô-dăm-bích",
		"tenQTEn": "Mozambique"
	},
	{
		"maQT": "MRT",
		"tenQT": "Mô-ra-ta-ni",
		"tenQTEn": "Mauritania"
	},
	{
		"maQT": "MUS",
		"tenQT": "Mô-ri-xơ",
		"tenQTEn": "Mauritius"
	},
	{
		"maQT": "MNE",
		"tenQT": "Môn-tê-nê-grô",
		"tenQTEn": "Montenegro"
	},
	{
		"maQT": "MSR",
		"tenQT": "Môn-xê-rat",
		"tenQTEn": "Montserrat"
	},
	{
		"maQT": "MDA",
		"tenQT": "Môn-đô-va",
		"tenQTEn": "Moldova"
	},
	{
		"maQT": "MNG",
		"tenQT": "Mông Cổ",
		"tenQTEn": "Mongolia"
	},
	{
		"maQT": "NAM",
		"tenQT": "Na-mi-bi-a",
		"tenQTEn": "Namibia"
	},
	{
		"maQT": "NRU",
		"tenQT": "Na-u-ru",
		"tenQTEn": "Nauru"
	},
	{
		"maQT": "ATA",
		"tenQT": "Nam Cực",
		"tenQTEn": "Antarctica"
	},
	{
		"maQT": "ZAF",
		"tenQT": "Nam Phi",
		"tenQTEn": "South Africa"
	},
	{
		"maQT": "YUG",
		"tenQT": "Nam-tư",
		"tenQTEn": "Yugoslavia"
	},
	{
		"maQT": "GBP",
		"tenQT": "Người được Liên hiệp Anh bảo hộ",
		"tenQTEn": "United Kingdom"
	},
	{
		"maQT": "JPN",
		"tenQT": "Nhật Bản",
		"tenQTEn": "Japan"
	},
	{
		"maQT": "NIC",
		"tenQT": "Ni-ca-ra-goa",
		"tenQTEn": "Nicaragua"
	},
	{
		"maQT": "NER",
		"tenQT": "Ni-giê",
		"tenQTEn": "Niger"
	},
	{
		"maQT": "NGA",
		"tenQT": "Ni-giê-ri-a",
		"tenQTEn": "Nigeria"
	},
	{
		"maQT": "NIU",
		"tenQT": "Ni-u-ê",
		"tenQTEn": "Niue"
	},
	{
		"maQT": "NCL",
		"tenQT": "Niu Ca-le-đô-ni-a",
		"tenQTEn": "New Caledonia"
	},
	{
		"maQT": "NZL",
		"tenQT": "Niu Di-lân",
		"tenQTEn": "New Zealand"
	},
	{
		"maQT": "NPL",
		"tenQT": "Nê-pan",
		"tenQTEn": "Nepal"
	},
	{
		"maQT": "PAK",
		"tenQT": "Pa-ki-xtan",
		"tenQTEn": "Pakistan"
	},
	{
		"maQT": "PLW",
		"tenQT": "Pa-lau",
		"tenQTEn": "Palau"
	},
	{
		"maQT": "PSE",
		"tenQT": "Pa-le-xtin",
		"tenQTEn": "Palestine"
	},
	{
		"maQT": "PLX",
		"tenQT": "Pa-le-xtin",
		"tenQTEn": "Palestine"
	},
	{
		"maQT": "PAN",
		"tenQT": "Pa-na-ma",
		"tenQTEn": "Panama"
	},
	{
		"maQT": "PNG",
		"tenQT": "Pa-pua Niu Ghi-nê",
		"tenQTEn": "Papua New Guinea"
	},
	{
		"maQT": "PRY",
		"tenQT": "Pa-ra-goay",
		"tenQTEn": "Paraguay"
	},
	{
		"maQT": "PHL",
		"tenQT": "Phi-líp-pin",
		"tenQTEn": "Philippines"
	},
	{
		"maQT": "FRA",
		"tenQT": "Pháp",
		"tenQTEn": "France"
	},
	{
		"maQT": "FIN",
		"tenQT": "Phần Lan",
		"tenQTEn": "Finland"
	},
	{
		"maQT": "PCN",
		"tenQT": "Pi-ca-in",
		"tenQTEn": "Pitcairn"
	},
	{
		"maQT": "PYF",
		"tenQT": "Po-ly-nê-si-a",
		"tenQTEn": "French Polynesia"
	},
	{
		"maQT": "PRI",
		"tenQT": "Pu-éc-tô Ri-cô",
		"tenQTEn": "Puerto Rico"
	},
	{
		"maQT": "PER",
		"tenQT": "Pê-ru",
		"tenQTEn": "Peru"
	},
	{
		"maQT": "QAT",
		"tenQT": "Qua-ta",
		"tenQTEn": "Qatar"
	},
	{
		"maQT": "ANT",
		"tenQT": "Quần đảo An-ti thuộc Hà Lan",
		"tenQTEn": "Netherland Antilles"
	},
	{
		"maQT": "MNP",
		"tenQT": "Quần đảo Bắc Ma-ri-a-na",
		"tenQTEn": "Nothern Mariana Islands"
	},
	{
		"maQT": "CYM",
		"tenQT": "Quần đảo Cây-man",
		"tenQTEn": "Cayman Island"
	},
	{
		"maQT": "COK",
		"tenQT": "Quần đảo Cúc",
		"tenQTEn": "Cook Islands"
	},
	{
		"maQT": "CCK",
		"tenQT": "Quần đảo Dừa",
		"tenQTEn": "Cocos (Keeling ) Islands"
	},
	{
		"maQT": "HMD",
		"tenQT": "Quần đảo Hớt và Mac-đô-nan",
		"tenQTEn": "Heard and McDonald Islands"
	},
	{
		"maQT": "FLK",
		"tenQT": "Quần đảo Man-vi-na",
		"tenQTEn": "Falkland Islands"
	},
	{
		"maQT": "MHL",
		"tenQT": "Quần đảo Mác-san",
		"tenQTEn": "Marshall Islands"
	},
	{
		"maQT": "SGS",
		"tenQT": "Quần đảo Nam Gru-di-a và Nam San-uých",
		"tenQTEn": "South Georgia and the South S"
	},
	{
		"maQT": "UMI",
		"tenQT": "Quần đảo nhỏ thuộc Mỹ",
		"tenQTEn": "United States Minor Outlying"
	},
	{
		"maQT": "WLF",
		"tenQT": "Quần đảo Oa-li và Fu-tu-na",
		"tenQTEn": "Wallis and Futuna Islands"
	},
	{
		"maQT": "TCA",
		"tenQT": "Quần đảo Tuc và Ca-i-ô",
		"tenQTEn": "Turks and Caicos Islands"
	},
	{
		"maQT": "VGB",
		"tenQT": "Quần đảo Vi-gin (Anh)",
		"tenQTEn": "Virgin Islands UK"
	},
	{
		"maQT": "VIR",
		"tenQT": "Quần đảo Vi-gin (Mỹ)",
		"tenQTEn": "Virgin Islands US"
	},
	{
		"maQT": "SLB",
		"tenQT": "Quần đảo Xa-lô-mông",
		"tenQTEn": "Solomon Islands"
	},
	{
		"maQT": "SJM",
		"tenQT": "Quần đảo Xvan-ba và Gan Mai-en",
		"tenQTEn": "Svalbd and Jan Mayen Islands"
	},
	{
		"maQT": "SYC",
		"tenQT": "Quần đảo Xây-sen",
		"tenQTEn": "Seychelles"
	},
	{
		"maQT": "RWA",
		"tenQT": "Ru-an-đa",
		"tenQTEn": "Rwanda"
	},
	{
		"maQT": "ROU",
		"tenQT": "Rumani",
		"tenQTEn": "Romania"
	},
	{
		"maQT": "REU",
		"tenQT": "Rê-u-ni-on",
		"tenQTEn": "Reunion"
	},
	{
		"maQT": "SVN",
		"tenQT": "Slo-vê-ni-a",
		"tenQTEn": "Slovenia"
	},
	{
		"maQT": "TCD",
		"tenQT": "Sát",
		"tenQTEn": "Chad"
	},
	{
		"maQT": "TJK",
		"tenQT": "Ta-gi-ki-xtan",
		"tenQTEn": "Tajikistan"
	},
	{
		"maQT": "CHE",
		"tenQT": "Thuỵ Sĩ",
		"tenQTEn": "Switzerland"
	},
	{
		"maQT": "SWE",
		"tenQT": "Thuỵ Điển",
		"tenQTEn": "Sweden"
	},
	{
		"maQT": "THA",
		"tenQT": "Thái Lan",
		"tenQTEn": "Thailand"
	},
	{
		"maQT": "GBS",
		"tenQT": "Thần dân của Vương quốc Liên hiệp Anh",
		"tenQTEn": "United Kingdom"
	},
	{
		"maQT": "TUR",
		"tenQT": "Thổ Nhĩ Kỳ",
		"tenQTEn": "Turkey"
	},
	{
		"maQT": "CHN",
		"tenQT": "Trung Quốc",
		"tenQTEn": "China"
	},
	{
		"maQT": "TWN",
		"tenQT": "Trung Quốc (Đài Loan)",
		"tenQTEn": "China (Taiwan)"
	},
	{
		"maQT": "TUN",
		"tenQT": "Tu-ni-di",
		"tenQTEn": "Tunisia"
	},
	{
		"maQT": "TUV",
		"tenQT": "Tu-va-lu",
		"tenQTEn": "Tuvalu"
	},
	{
		"maQT": "TKM",
		"tenQT": "Tuốc-mê-ni-xtan",
		"tenQTEn": "Turkmenistan"
	},
	{
		"maQT": "ESP",
		"tenQT": "Tây Ban Nha",
		"tenQTEn": "Spain"
	},
	{
		"maQT": "ESH",
		"tenQT": "Tây Xa-ha-ra",
		"tenQTEn": "Western Sahara"
	},
	{
		"maQT": "TGO",
		"tenQT": "Tô-gô",
		"tenQTEn": "Togo"
	},
	{
		"maQT": "TKL",
		"tenQT": "Tô-ke-lau",
		"tenQTEn": "Tokelau"
	},
	{
		"maQT": "TON",
		"tenQT": "Tôn-ga",
		"tenQTEn": "Tonga"
	},
	{
		"maQT": "UKR",
		"tenQT": "U-crai-na",
		"tenQTEn": "Ukraine"
	},
	{
		"maQT": "UZB",
		"tenQT": "U-dơ-bê-ki-xtan",
		"tenQTEn": "Uzbekistan"
	},
	{
		"maQT": "UGA",
		"tenQT": "U-gan-da",
		"tenQTEn": "Uganda"
	},
	{
		"maQT": "URY",
		"tenQT": "U-ru-goay",
		"tenQTEn": "Uruguay"
	},
	{
		"maQT": "VUT",
		"tenQT": "Va-nu-a-tu",
		"tenQTEn": "Vanuatu"
	},
	{
		"maQT": "VAT",
		"tenQT": "Va-ti-căng",
		"tenQTEn": "Holy See (Vatican City State )"
	},
	{
		"maQT": "VNM",
		"tenQT": "Việt Nam",
		"tenQTEn": "Viet Nam"
	},
	{
		"maQT": "VEN",
		"tenQT": "Vê-nê-du-ê-la",
		"tenQTEn": "Venezuela"
	},
	{
		"maQT": "ATF",
		"tenQT": "Vùng Nam bán cầu thuộc Pháp",
		"tenQTEn": "French Southern Territories"
	},
	{
		"maQT": "FXX",
		"tenQT": "Vùng Thủ đô Pháp",
		"tenQTEn": "France Metropolitan"
	},
	{
		"maQT": "NTZ",
		"tenQT": "Vùng Trung lập",
		"tenQTEn": "Neutral Zone"
	},
	{
		"maQT": "IOT",
		"tenQT": "Vùng đất thuộc Anh ở Ấn Độ Dương",
		"tenQTEn": "British India Ocean Territory"
	},
	{
		"maQT": "GBR",
		"tenQT": "Vương quốc Anh và Bắc Ai len",
		"tenQTEn": "United Kingdom of Great Britain and Northern Ireland"
	},
	{
		"maQT": "NOR",
		"tenQT": "Vương quốc Na-uy",
		"tenQTEn": "Norway"
	},
	{
		"maQT": "WSM",
		"tenQT": "Xa-moa",
		"tenQTEn": "Western Samoa"
	},
	{
		"maQT": "SMR",
		"tenQT": "Xan Ma-ri-nô",
		"tenQTEn": "San Marino"
	},
	{
		"maQT": "LCA",
		"tenQT": "Xanh Lu-xi-a",
		"tenQTEn": "Saint Lucia"
	},
	{
		"maQT": "SPM",
		"tenQT": "Xanh Pi-ê và Mi-cơ-lông",
		"tenQTEn": "St.Pierre and Miquelon"
	},
	{
		"maQT": "VCT",
		"tenQT": "Xanh Vin-xen và Grê-na-din",
		"tenQTEn": "Saint Vincent and the Grenadines"
	},
	{
		"maQT": "STP",
		"tenQT": "Xao Tô-mê và Prin-xi-pê",
		"tenQTEn": "Sao Tome and Principe"
	},
	{
		"maQT": "SC-",
		"tenQT": "Xcô-lent",
		"tenQTEn": "Scotland"
	},
	{
		"maQT": "SEN",
		"tenQT": "Xe-ne-gan",
		"tenQTEn": "Senegal"
	},
	{
		"maQT": "SLE",
		"tenQT": "Xi-ê-ra Li-ôn",
		"tenQTEn": "Sierra Leone"
	},
	{
		"maQT": "SGP",
		"tenQT": "Xin-ga-po",
		"tenQTEn": "Singapore"
	},
	{
		"maQT": "SVK",
		"tenQT": "Xlô-va-ki-a",
		"tenQTEn": "Slovakia"
	},
	{
		"maQT": "SWZ",
		"tenQT": "Xoa-di-len",
		"tenQTEn": "Swaziland"
	},
	{
		"maQT": "LKA",
		"tenQT": "Xri-Lan-ca",
		"tenQTEn": "Sri Lanka"
	},
	{
		"maQT": "SUR",
		"tenQT": "Xu-ri-nam",
		"tenQTEn": "Suriname"
	},
	{
		"maQT": "SDN",
		"tenQT": "Xu-đăng",
		"tenQTEn": "Sudan"
	},
	{
		"maQT": "SRB",
		"tenQT": "Xéc-bi-a",
		"tenQTEn": "Serbia"
	},
	{
		"maQT": "SOM",
		"tenQT": "Xô-ma-li",
		"tenQTEn": "Somalia"
	},
	{
		"maQT": "YEM",
		"tenQT": "Y-ê-men",
		"tenQTEn": "Yemen"
	},
	{
		"maQT": "AUT",
		"tenQT": "Áo",
		"tenQTEn": "Austria"
	},
	{
		"maQT": "ECU",
		"tenQT": "Ê-cu-a-đo",
		"tenQTEn": "Ecuador"
	},
	{
		"maQT": "ERI",
		"tenQT": "Ê-ri-tơ-ri-a",
		"tenQTEn": "Eritrea"
	},
	{
		"maQT": "ETH",
		"tenQT": "Ê-ti-ô-pi-a",
		"tenQTEn": "Ethiopia"
	},
	{
		"maQT": "EST",
		"tenQT": "Ê-xtô-ni-a",
		"tenQTEn": "Estonia"
	},
	{
		"maQT": "OMN",
		"tenQT": "Ô-man",
		"tenQTEn": "Oman"
	},
	{
		"maQT": "AUS",
		"tenQT": "Ô-xtrây-li-a",
		"tenQTEn": "Australia"
	},
	{
		"maQT": "AIA",
		"tenQT": "Ăng-gui-la",
		"tenQTEn": "Anguilla"
	},
	{
		"maQT": "AGO",
		"tenQT": "Ăng-gô-la",
		"tenQTEn": "Angola"
	},
	{
		"maQT": "ATG",
		"tenQT": "Ăng-ti-gua và Bác-bu-da",
		"tenQTEn": "Antigua and Barbuda"
	},
	{
		"maQT": "DNK",
		"tenQT": "Đan Mạch",
		"tenQTEn": "Denmark"
	},
	{
		"maQT": "DJI",
		"tenQT": "Đi-bô-u-ti",
		"tenQTEn": "Djibouti"
	},
	{
		"maQT": "DMA",
		"tenQT": "Đô-mi-ni-ca",
		"tenQTEn": "Dominica"
	},
	{
		"maQT": "ASM",
		"tenQT": "Đông Sa-moa",
		"tenQTEn": "American Samoa"
	},
	{
		"maQT": "TLS",
		"tenQT": "Đông Ti-mo",
		"tenQTEn": "Timor-Leste"
	},
	{
		"maQT": "BVT",
		"tenQT": "Đảo Bô-u-vet",
		"tenQTEn": "Bouvet Island"
	},
	{
		"maQT": "CXR",
		"tenQT": "Đảo Chri-xma",
		"tenQTEn": "Christmas Island"
	},
	{
		"maQT": "NFK",
		"tenQT": "Đảo Nô-rốc",
		"tenQTEn": "Norgolk Island"
	},
	{
		"maQT": "CYP",
		"tenQT": "Đảo Síp",
		"tenQTEn": "Cyprus"
	},
	{
		"maQT": "SHN",
		"tenQT": "Đảo Xanh Hê-lê-na",
		"tenQTEn": "St.Helena"
	},
	{
		"maQT": "GBO",
		"tenQT": "Địa phận hải ngoại thuộc Liên hiệpAnh",
		"tenQTEn": "United Kingdom"
	},
	{
		"maQT": "GBN",
		"tenQT": "Địa phận thuộc Liên hiệp Anh",
		"tenQTEn": "United Kingdom"
	},
	{
		"maQT": "IND",
		"tenQT": "Ấn Độ",
		"tenQTEn": "India"
	}
];
