<script lang="ts">
import { onMount } from "svelte";

interface CatalogItem {
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

interface TabItem {
	gid: string;
	name: string;
	isDefault?: boolean;
	isDateTab?: boolean;
}

interface RowData {
	_sheetRow?: number | string;
	sheetRowIndex?: number | string;
	stt?: string | number;
	hoTen?: string;
	gioiTinh?: string;
	ngaySinh?: string;
	quocTich?: string;
	loaiGiayTo?: string;
	tenGiayTo?: string;
	soGiayTo?: string;
	soHoChieu?: string;
	soPhong?: string;
	diaChi?: string;
	tinhTp?: string;
	phuongXa?: string;
	quanHuyen?: string;
	ngayDen?: string;
	ngayDi?: string;
	thoiHanTamTru?: string;
	daDangKy?: string;
	[key: string]: unknown;
}

interface ValidationState {
	isComplete: boolean;
	missingFields: string[];
	fieldStatus: Record<
		string,
		{ valid: boolean; value: unknown; error?: string }
	>;
}

interface SyncResult {
	branch?: string;
	status: string;
	success?: boolean;
	message: string;
	payload?: unknown;
	row?: RowData;
}

// App State
let activeTab = $state<"dataTab" | "syncTab" | "catalogTab">("dataTab");
let selectedGid = $state("0");
let availableTabs = $state<TabItem[]>([]);
let currentSourceLabel = $state("Đang tải dữ liệu từ Google Sheets...");
let tabFetchStatus = $state("");
let isLoadingSheet = $state(false);

// Rows & Selection
let currentRows = $state<RowData[]>([]);
let selectedIndices = $state<Set<number>>(new Set());
let editingIndices = $state<Set<number>>(new Set());
let validationStates = $state<ValidationState[]>([]);
let eligibleRowsCount = $derived(
	currentRows.filter((r, i) => !isRowRegistered(r) && !deletingIndices.has(i))
		.length,
);

// Payloads Preview
let vnPayloads = $state<unknown[]>([]);
let foreignPayloads = $state<unknown[]>([]);

// Sync Results
let syncResults = $state<SyncResult[]>([]);
let isSyncing = $state(false);
let syncActionTitle = $state("");

// Token status
let tokenStatus = $state<{ hasToken: boolean; expiresInSeconds: number }>({
	hasToken: false,
	expiresInSeconds: 0,
});

// Catalogs
let catalogs = $state<{
	tinhTp: CatalogItem[];
	quocTich: CatalogItem[];
	loaiGiayTo: CatalogItem[];
	lyDoCuTru: CatalogItem[];
}>({
	tinhTp: [],
	quocTich: [],
	loaiGiayTo: [],
	lyDoCuTru: [],
});
let filterTinh = $state("");
let filterQuocTich = $state("");

// Toast
let toastVisible = $state(false);
let toastCode = $state("");
let toastMsg = $state("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// Edit Modal State
let modalOpen = $state(false);
let modalIndex = $state<number | null>(null);
let modalForm = $state({
	hoTen: "",
	gioiTinh: "Nam",
	ngaySinh: "",
	quocTich: "VNM",
	soPhong: "1",
	loaiGiayTo: "CCCD",
	soGiayTo: "",
	ngayDen: "",
	ngayDi: "",
	thoiHanTamTru: "",
	diaChiFull: "",
});

// Custom Delete Confirmation Modal State
let deleteModalOpen = $state(false);
let deleteTargetIdx = $state<number | null>(null);
let deleteTargetName = $state("");
let deleteTargetSheetRow = $state<number | null>(null);
let deletingIndices = $state<Set<number>>(new Set());

function validateDateString(val: string): boolean {
	if (!val) return false;
	const str = val.trim();
	// Bắt buộc chuẩn DD/MM/YYYY (không chấp nhận YYYY-MM-DD)
	const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (dmy) {
		const d = parseInt(dmy[1], 10);
		const m = parseInt(dmy[2], 10);
		const y = parseInt(dmy[3], 10);
		return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100;
	}
	return false;
}

function formatToDisplayDate(val: string): string {
	if (!val) return "";
	const str = String(val).trim();
	const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(.*)/);
	if (dmy) {
		const d = dmy[1].padStart(2, "0");
		const m = dmy[2].padStart(2, "0");
		const y = dmy[3];
		const rest = dmy[4] || "";
		return `${d}/${m}/${y}${rest}`;
	}
	const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(.*)/);
	if (ymd) {
		const y = ymd[1];
		const m = ymd[2].padStart(2, "0");
		const d = ymd[3].padStart(2, "0");
		const rest = ymd[4] || "";
		return `${d}/${m}/${y}${rest}`;
	}
	return str;
}

function validateArrivalDate(val: string): { valid: boolean; error?: string } {
	if (!val || !val.trim())
		return { valid: false, error: "Vui lòng nhập ngày đến" };
	const str = val.trim();
	// Bắt buộc chuẩn DD/MM/YYYY hoặc DD/MM/YYYY HH:mm:ss (không chấp nhận YYYY-MM-DD)
	const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (!dmy) {
		return {
			valid: false,
			error: "Định dạng ngày đến phải là DD/MM/YYYY (ví dụ: 16/09/2026)",
		};
	}
	const day = parseInt(dmy[1], 10);
	const month = parseInt(dmy[2], 10);
	const year = parseInt(dmy[3], 10);

	const arrivalDay = new Date(year, month - 1, day);
	const today = new Date();
	const currentDay = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);
	const yesterday = new Date(currentDay);
	yesterday.setDate(yesterday.getDate() - 1);

	if (
		arrivalDay.getTime() === currentDay.getTime() ||
		arrivalDay.getTime() === yesterday.getTime()
	) {
		return { valid: true };
	}
	if (arrivalDay.getTime() < yesterday.getTime()) {
		return { valid: false, error: "Ngày đến ở quá khứ (> 1 ngày trước)" };
	}
	if (arrivalDay.getTime() > currentDay.getTime()) {
		return { valid: false, error: "Ngày đến ở tương lai" };
	}
	return { valid: true };
}

function getCountryInfo(
	codeRaw: string,
): { maQT: string; tenQT: string; tenQTEn: string } | null {
	const code = String(codeRaw || "")
		.trim()
		.toUpperCase();
	if (!code) return null;
	if (catalogs.quocTich && catalogs.quocTich.length > 0) {
		const found = catalogs.quocTich.find((item) => {
			const ma = String(item.maQT || item.id || item.code || "")
				.trim()
				.toUpperCase();
			return ma === code;
		});
		if (found) {
			return {
				maQT: String(found.maQT || code).toUpperCase(),
				tenQT: String(found.tenQT || found.ten || ""),
				tenQTEn: String(
					found.tenQTEn || found.tenEn || found.name || found.tenQT || "",
				),
			};
		}
	}
	const fallbackMap: Record<string, { tenQT: string; tenQTEn: string }> = {
		VNM: { tenQT: "Việt Nam", tenQTEn: "Vietnam" },
		USA: { tenQT: "Hoa Kỳ", tenQTEn: "United States" },
		RUS: { tenQT: "Nga", tenQTEn: "Russia" },
		CHN: { tenQT: "Trung Quốc", tenQTEn: "China" },
		KOR: { tenQT: "Hàn Quốc", tenQTEn: "South Korea" },
		JPN: { tenQT: "Nhật Bản", tenQTEn: "Japan" },
		GBR: { tenQT: "Vương quốc Anh", tenQTEn: "United Kingdom" },
		FRA: { tenQT: "Pháp", tenQTEn: "France" },
		DEU: { tenQT: "CH Liên bang Đức", tenQTEn: "Germany" },
		D: { tenQT: "CH Liên bang Đức", tenQTEn: "Germany" },
		AUS: { tenQT: "Úc", tenQTEn: "Australia" },
		THA: { tenQT: "Thái Lan", tenQTEn: "Thailand" },
		LAO: { tenQT: "Lào", tenQTEn: "Laos" },
		KHM: { tenQT: "Campuchia", tenQTEn: "Cambodia" },
		SGP: { tenQT: "Singapore", tenQTEn: "Singapore" },
		MYS: { tenQT: "Malaysia", tenQTEn: "Malaysia" },
		IDN: { tenQT: "Indonesia", tenQTEn: "Indonesia" },
		PHL: { tenQT: "Philippines", tenQTEn: "Philippines" },
		IND: { tenQT: "Ấn Độ", tenQTEn: "India" },
		ITA: { tenQT: "Ý (Italia)", tenQTEn: "Italy" },
		ESP: { tenQT: "Tây Ban Nha", tenQTEn: "Spain" },
		CAN: { tenQT: "Canada", tenQTEn: "Canada" },
		BRA: { tenQT: "Brazil", tenQTEn: "Brazil" },
		ARG: { tenQT: "Ac-hen-ti-na", tenQTEn: "Argentina" },
		TWN: { tenQT: "Đài Loan", tenQTEn: "Taiwan" },
	};
	if (fallbackMap[code]) {
		return { maQT: code, ...fallbackMap[code] };
	}
	return null;
}

function isValidAlpha3Country(code: string): boolean {
	const clean = String(code || "")
		.trim()
		.toUpperCase();
	if (!clean) return false;
	if (getCountryInfo(clean)) return true;
	if (clean.length === 3 && /^[A-Z]{3}$/.test(clean)) {
		return true;
	}
	return false;
}

function isNumericDocType(docTypeRaw: unknown): boolean {
	const clean = String(docTypeRaw || "").toLowerCase();
	return (
		clean.includes("cccd") ||
		clean.includes("cmnd") ||
		clean.includes("căn cước") ||
		clean.includes("1") ||
		clean.includes("2") ||
		clean.includes("8")
	);
}

function cleanDocNumberInput(val: string, docTypeRaw: unknown): string {
	if (!val) return "";
	if (isNumericDocType(docTypeRaw)) {
		// Chỉ cho phép chữ số (0-9), cấm ký tự chữ cái và ký tự đặc biệt (*, /, (, -, ...)
		return val.replace(/\D/g, "").slice(0, 12);
	}
	// Hộ chiếu (Passport) / Giấy phép lái xe: chỉ cho phép chữ cái và số, cấm tất cả ký tự đặc biệt (*, /, @, #, v.v.)
	return val
		.replace(/[^a-zA-Z0-9]/g, "")
		.toUpperCase()
		.slice(0, 12);
}

function handleDocNumberKeyDown(e: KeyboardEvent, docTypeRaw: unknown): void {
	if (
		[
			"Backspace",
			"Delete",
			"Tab",
			"ArrowLeft",
			"ArrowRight",
			"ArrowUp",
			"ArrowDown",
			"Home",
			"End",
			"Enter",
		].includes(e.key) ||
		e.ctrlKey ||
		e.metaKey
	) {
		return;
	}

	if (isNumericDocType(docTypeRaw)) {
		// CCCD/CMND: Chặn tất cả ký tự không phải số 0-9
		if (!/^[0-9]$/.test(e.key)) {
			e.preventDefault();
		}
	} else {
		// Hộ chiếu: Chặn tất cả ký tự đặc biệt, chỉ cho phép chữ cái A-Z và số 0-9
		if (!/^[a-zA-Z0-9]$/.test(e.key)) {
			e.preventDefault();
		}
	}
}

let countryInfoHint = $derived.by(() => {
	const qt = modalForm.quocTich.trim().toUpperCase();
	if (!qt) return null;
	return getCountryInfo(qt);
});

let liveVal = $derived.by(() => {
	const isVN =
		["VNM", "VN", "VIỆT NAM", "VIET NAM", "VIETNAM"].includes(
			modalForm.quocTich.trim().toUpperCase(),
		) ||
		modalForm.loaiGiayTo.toLowerCase().includes("cccd") ||
		modalForm.loaiGiayTo.toLowerCase().includes("cmnd") ||
		modalForm.loaiGiayTo.toLowerCase().includes("căn cước");

	const hoTenValid = Boolean(modalForm.hoTen.trim());
	const ngaySinhValid = validateDateString(modalForm.ngaySinh);
	const roomNum = parseInt(modalForm.soPhong, 10);
	const soPhongValid = roomNum >= 1 && roomNum <= 9;
	const arrivalCheck = validateArrivalDate(modalForm.ngayDen);

	let ngayDiValid = true;
	let ngayDiError = "";
	if (modalForm.ngayDi.trim()) {
		const dmyDi = modalForm.ngayDi
			.trim()
			.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
		if (!dmyDi) {
			ngayDiValid = false;
			ngayDiError =
				"Ngày đi phải theo định dạng DD/MM/YYYY (ví dụ: 18/09/2026 12:00:00)";
		} else {
			const d = parseInt(dmyDi[1], 10);
			const m = parseInt(dmyDi[2], 10);
			const y = parseInt(dmyDi[3], 10);
			if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
				ngayDiValid = false;
				ngayDiError = "Ngày đi không hợp lệ";
			}
		}
	}

	let thoiHanTamTruValid = true;
	let thoiHanTamTruError = "";
	if (modalForm.thoiHanTamTru.trim()) {
		const dmyTh = modalForm.thoiHanTamTru
			.trim()
			.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
		if (!dmyTh) {
			thoiHanTamTruValid = false;
			thoiHanTamTruError =
				"Thời hạn thị thực phải theo định dạng DD/MM/YYYY (ví dụ: 31/12/2026)";
		}
	}

	const docNum = modalForm.soGiayTo.trim();
	let soGiayToValid = true;
	let soGiayToError = "";

	const docType = modalForm.loaiGiayTo.toLowerCase();
	if (docType.includes("cccd") || docType.includes("căn cước")) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 12) {
			soGiayToValid = false;
			soGiayToError = "Số CCCD phải đủ 12 chữ số";
		}
	} else if (docType.includes("cmnd")) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 9 && digits.length !== 12) {
			soGiayToValid = false;
			soGiayToError = "Số CMND phải 9 hoặc 12 chữ số";
		}
	} else if (
		docType.includes("hộ chiếu") ||
		docType.includes("passport") ||
		!isVN
	) {
		const clean = docNum.replace(/[^a-zA-Z0-9]/g, "");
		if (clean.length < 6 || clean.length > 12) {
			soGiayToValid = false;
			soGiayToError = "Số hộ chiếu phải từ 6 đến 12 ký tự";
		}
	} else if (!docNum) {
		soGiayToValid = false;
		soGiayToError = "Vui lòng nhập số giấy tờ";
	}

	let quocTichValid = true;
	let quocTichError = "";
	const qt = modalForm.quocTich.trim().toUpperCase();
	if (!qt) {
		quocTichValid = false;
		quocTichError = "Vui lòng nhập mã quốc gia (ví dụ: VNM, USA, CHN)";
	} else if (!isValidAlpha3Country(qt)) {
		quocTichValid = false;
		quocTichError = `Mã quốc gia không hợp lệ: "${qt}" (Phải là 3 chữ cái chuẩn ISO, vd: VNM, USA, CHN, DEU)`;
	}

	const allValid =
		hoTenValid &&
		ngaySinhValid &&
		soPhongValid &&
		arrivalCheck.valid &&
		ngayDiValid &&
		thoiHanTamTruValid &&
		soGiayToValid &&
		quocTichValid;

	return {
		allValid,
		hoTen: {
			valid: hoTenValid,
			error: !hoTenValid ? "Họ và tên không được để trống" : undefined,
		},
		ngaySinh: {
			valid: ngaySinhValid,
			error: !ngaySinhValid
				? "Ngày sinh phải theo định dạng DD/MM/YYYY (ví dụ: 22/09/2002)"
				: undefined,
		},
		soPhong: {
			valid: soPhongValid,
			error: !soPhongValid ? "Số phòng phải từ 1 đến 9" : undefined,
		},
		ngayDen: arrivalCheck,
		ngayDi: {
			valid: ngayDiValid,
			error: ngayDiError || undefined,
		},
		thoiHanTamTru: {
			valid: thoiHanTamTruValid,
			error: thoiHanTamTruError || undefined,
		},
		soGiayTo: { valid: soGiayToValid, error: soGiayToError || undefined },
		quocTich: { valid: quocTichValid, error: quocTichError || undefined },
	};
});

function showToast(code: string, msg: string) {
	toastCode = code;
	toastMsg = msg;
	toastVisible = true;
	if (toastTimer) clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		toastVisible = false;
	}, 2500);
}

function cleanRoomNumber(rawRoom: unknown): string {
	if (rawRoom === null || rawRoom === undefined) return "";
	const str = String(rawRoom).trim();
	if (!str) return "";
	const matches = str.match(/\d+/g);
	if (!matches || matches.length === 0) return "";
	for (const m of matches) {
		const num = parseInt(m, 10);
		if (num >= 1 && num <= 9) {
			return String(num);
		}
	}
	return "";
}

function isGuestVN(row: RowData): boolean {
	const qt = String(row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "")
		.trim()
		.toLowerCase();
	const docType = String(
		row.loaiGiayTo || row["Loại giấy tờ"] || row["Tên giấy tờ"] || "",
	).toLowerCase();
	const docNum = String(
		row.soGiayTo || row["Số giấy tờ"] || row["Số CCCD"] || "",
	).replace(/\D/g, "");

	if (
		docType.includes("cccd") ||
		docType.includes("cmnd") ||
		docType.includes("căn cước")
	)
		return true;
	if (
		["vn", "vnm", "viet nam", "vietnam", "vvv", "vv", "v", "viet"].includes(qt)
	)
		return true;
	if (
		qt &&
		!["vn", "vnm", "viet nam", "vietnam", "vvv", "vv", "v", "viet"].includes(qt)
	)
		return false;
	if (docNum.length === 12 || docNum.length === 9) return true;
	return false;
}

function getCombinedAddress(row: RowData): string {
	const loaiGiayToName = String(
		row.loaiGiayTo || row["Loại giấy tờ"] || "",
	).toLowerCase();
	if (
		loaiGiayToName.includes("hộ chiếu") ||
		loaiGiayToName.includes("passport")
	) {
		return "";
	}
	const rawAddress = String(
		row.diaChi || row["Địa chỉ"] || row["Địa chỉ chi tiết"] || "",
	).trim();
	const tinhRaw = String(
		row.tinhTp || row["Tỉnh"] || row["Tỉnh/TP"] || "",
	).trim();
	const phuongXaRaw = String(row.phuongXa || row["Phường/Xã"] || "").trim();
	const quanHuyenRaw = String(row.quanHuyen || row["Quận/Huyện"] || "").trim();

	const parts = [rawAddress, phuongXaRaw, quanHuyenRaw, tinhRaw].filter(
		Boolean,
	);
	return parts.length > 0 ? parts.join(", ") : "";
}

function getDisplayAddress(row: RowData): {
	shortText: string;
	fullText: string;
} {
	const isVN = isGuestVN(row);
	if (!isVN) {
		const val = String(row.thoiHanTamTru || row["Thời hạn tạm trú"] || "-");
		return { shortText: val, fullText: `Thời hạn tạm trú: ${val}` };
	}
	const loaiGiayToName = String(
		row.loaiGiayTo || row["Loại giấy tờ"] || "",
	).toLowerCase();
	if (
		loaiGiayToName.includes("hộ chiếu") ||
		loaiGiayToName.includes("passport")
	) {
		return { shortText: "-", fullText: "Khách hộ chiếu: địa chỉ để trống" };
	}
	const fullAddr = getCombinedAddress(row);
	if (!fullAddr) {
		return { shortText: "-", fullText: "Chưa có địa chỉ" };
	}
	const tinhRaw = String(
		row.tinhTp || row["Tỉnh"] || row["Tỉnh/TP"] || "",
	).trim();
	if (tinhRaw) {
		return { shortText: tinhRaw, fullText: fullAddr };
	}
	const parts = fullAddr
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	return { shortText: parts[parts.length - 1] || fullAddr, fullText: fullAddr };
}

function normalizeStr(str: unknown): string {
	return String(str || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/[^a-z0-9]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

async function fetchSheetTabsList() {
	tabFetchStatus = "Đang quét tabs...";
	try {
		const res = await fetch("/api/sheets/tabs");
		const data = await res.json();
		if (data.success && data.tabs && data.tabs.length > 0) {
			availableTabs = data.tabs;
			tabFetchStatus = `Tìm thấy ${availableTabs.length} tabs`;

			let defaultGid = data.defaultGid;
			const foundDef = availableTabs.find((t) => t.isDefault);
			if (foundDef) defaultGid = foundDef.gid;
			else defaultGid = availableTabs[0].gid;

			selectedGid = defaultGid;
			await pullDataFromGoogleSheet(defaultGid);
		} else {
			availableTabs = [{ name: "Tab Mặc định", gid: "0", isDefault: true }];
			selectedGid = "0";
			tabFetchStatus = "Tab mặc định";
			await pullDataFromGoogleSheet("0");
		}
	} catch (err) {
		console.warn("Lỗi khi lấy tabs:", err);
		tabFetchStatus = "Lỗi nạp tabs";
	}
}

async function pullDataFromGoogleSheet(forcedGid: string | null = null) {
	const gid = forcedGid !== null ? forcedGid : selectedGid;
	isLoadingSheet = true;
	currentSourceLabel = "Đang kéo dữ liệu từ Google Sheets...";

	try {
		const res = await fetch("/api/sheets/pull", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gid }),
		});
		const data = await res.json();
		if (data.success && data.rows && data.rows.length > 0) {
			currentRows = data.rows.map((row: RowData, idx: number) => {
				const rawRoom = row.soPhong || row["Số phòng"] || row.room || "";
				const cleaned = cleanRoomNumber(rawRoom);
				if (cleaned) {
					row.soPhong = cleaned;
					row["Số phòng"] = cleaned;
				}
				// Chuẩn hóa định dạng ngày sinh dd/MM/yyyy
				const rawDob = String(
					row.ngaySinh || row["Ngày sinh"] || row["D.O.B"] || "",
				);
				const formattedDob = formatToDisplayDate(rawDob);
				if (formattedDob) {
					row.ngaySinh = formattedDob;
					row["Ngày sinh"] = formattedDob;
					row["D.O.B"] = formattedDob;
				}
				// Chuẩn hóa Loại giấy tờ: Thẻ CCCD -> CCCD
				if (
					row.loaiGiayTo === "Thẻ CCCD" ||
					row["Loại giấy tờ"] === "Thẻ CCCD"
				) {
					row.loaiGiayTo = "CCCD";
					row["Loại giấy tờ"] = "CCCD";
				}
				// Gán chính xác số dòng trên Sheet (luôn >= 2)
				const sheetRow = Math.max(
					2,
					Number(row._sheetRow || row.sheetRowIndex || idx + 2),
				);
				row._sheetRow = sheetRow;
				row.sheetRowIndex = sheetRow;
				return row;
			});
			selectedIndices = new Set();
			editingIndices = new Set();

			const currentTab = availableTabs.find(
				(t) => String(t.gid) === String(gid),
			);
			const tabName = currentTab ? currentTab.name : `GID ${gid}`;
			currentSourceLabel = `Tab: "${tabName}" (${currentRows.length} dòng dữ liệu)`;
			await updatePayloadPreview();
			showToast("NẠP", `Đã tải ${currentRows.length} dòng từ Google Sheet!`);
		} else {
			currentSourceLabel = "Tab đã chọn không có dữ liệu phù hợp";
			currentRows = [];
			await updatePayloadPreview();
		}
	} catch (err) {
		currentSourceLabel = `Lỗi kéo dữ liệu: ${(err as Error).message}`;
	} finally {
		isLoadingSheet = false;
	}
}

function handleTabChange() {
	pullDataFromGoogleSheet(selectedGid);
}

async function updatePayloadPreview() {
	try {
		const res = await fetch("/api/transform", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rows: currentRows }),
		});
		const data = await res.json();
		vnPayloads = (data.vnPayloads || []).map(
			(item: { payload: unknown }) => item.payload,
		);
		foreignPayloads = (data.foreignPayloads || []).map(
			(item: { payload: unknown }) => item.payload,
		);
		validationStates = (data.completenessList || []).map(
			(item: { completeness: ValidationState }) => item.completeness,
		);
	} catch (err) {
		console.error("Lỗi phân tích payloads:", err);
	}
}

function isRowRegistered(row: unknown): boolean {
	if (!row || typeof row !== "object") return false;
	const r = row as Record<string, unknown>;
	const val = String(
		r.daDangKy || r["Đã đăng ký"] || r["da_dang_ky"] || r["status"] || "",
	)
		.trim()
		.toLowerCase();

	if (!val) return false;
	if (
		val === "chưa" ||
		val === "chưa đăng ký" ||
		val === "chua" ||
		val === "chua dang ky" ||
		val === "chưa khai báo" ||
		val === "chua khai bao" ||
		val === "false" ||
		val === "0"
	) {
		return false;
	}
	return (
		val.includes("đã đăng ký") ||
		val.includes("da dang ky") ||
		val.includes("đã khai báo") ||
		val.includes("da khai bao") ||
		val === "true" ||
		val === "1"
	);
}

function toggleRowSelect(idx: number, checked: boolean) {
	if (isRowRegistered(currentRows[idx])) return;
	const next = new Set(selectedIndices);
	if (checked) next.add(idx);
	else next.delete(idx);
	selectedIndices = next;
}

function toggleSelectAll(checked: boolean) {
	if (checked) {
		const unregIndices = currentRows
			.map((r, i) => ({ r, i }))
			.filter(({ r, i }) => !isRowRegistered(r) && !deletingIndices.has(i))
			.map(({ i }) => i);
		selectedIndices = new Set(unregIndices);
	} else {
		selectedIndices = new Set();
	}
}

function parseAndApplyAddress(row: RowData, fullAddress: string) {
	const cleanAddr = (fullAddress || "").trim();
	row.diaChi = cleanAddr;
	row["Địa chỉ"] = cleanAddr;
	row["Địa chỉ chi tiết"] = cleanAddr;

	if (cleanAddr.includes(",")) {
		const parts: string[] = cleanAddr
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (parts.length >= 4) {
			const detail = parts.slice(0, parts.length - 3).join(", ");
			row["Địa chỉ chi tiết"] = detail;
			row.diaChi = detail;
			row["Phường/Xã"] = parts[parts.length - 3];
			row.phuongXa = parts[parts.length - 3];
			row["Quận/Huyện"] = parts[parts.length - 2];
			row.quanHuyen = parts[parts.length - 2];
			row["Tỉnh/TP"] = parts[parts.length - 1];
			row.tinhTp = parts[parts.length - 1];
			row["Tỉnh"] = parts[parts.length - 1];
		} else if (parts.length === 3) {
			row["Địa chỉ chi tiết"] = parts[0];
			row.diaChi = parts[0];
			row["Quận/Huyện"] = parts[1];
			row.quanHuyen = parts[1];
			row["Tỉnh/TP"] = parts[2];
			row.tinhTp = parts[2];
			row["Tỉnh"] = parts[2];
		} else if (parts.length === 2) {
			row["Địa chỉ chi tiết"] = parts[0];
			row.diaChi = parts[0];
			row["Tỉnh/TP"] = parts[1];
			row.tinhTp = parts[1];
			row["Tỉnh"] = parts[1];
		}
	}
}

function updateCell(idx: number, field: string, value: string) {
	if (!currentRows[idx]) return;
	currentRows[idx][field] = value;
	if (field === "soPhong") {
		currentRows[idx]["Số phòng"] = value;
	} else if (field === "hoTen") {
		currentRows[idx]["Họ tên"] = value;
	} else if (field === "ngaySinh") {
		currentRows[idx]["Ngày sinh"] = value;
		currentRows[idx]["D.O.B"] = value;
	} else if (field === "gioiTinh") {
		currentRows[idx]["Giới tính"] = value;
	} else if (field === "quocTich") {
		const upper = String(value || "")
			.trim()
			.toUpperCase();
		currentRows[idx].quocTich = upper;
		currentRows[idx]["Quốc tịch"] = upper;
		currentRows[idx]["Quốc gia"] = upper;
	} else if (field === "loaiGiayTo") {
		currentRows[idx]["Loại giấy tờ"] = value;
		currentRows[idx].loaiGiayTo = value;
		const curDoc = String(currentRows[idx].soGiayTo || "");
		const cleanedDoc = cleanDocNumberInput(curDoc, value);
		currentRows[idx].soGiayTo = cleanedDoc;
		currentRows[idx]["Số giấy tờ"] = cleanedDoc;
		currentRows[idx]["Số CCCD"] = cleanedDoc;
		currentRows[idx].soHoChieu = cleanedDoc;
	} else if (field === "soGiayTo") {
		const docType =
			currentRows[idx].loaiGiayTo ||
			currentRows[idx]["Loại giấy tờ"] ||
			"Thẻ CCCD";
		const cleaned = cleanDocNumberInput(value, docType);
		currentRows[idx]["Số giấy tờ"] = cleaned;
		currentRows[idx]["Số CCCD"] = cleaned;
		currentRows[idx]["Số hộ chiếu"] = cleaned;
		currentRows[idx].soHoChieu = cleaned;
		currentRows[idx].soGiayTo = cleaned;
	} else if (field === "ngayDen") {
		currentRows[idx]["Ngày đến"] = value;
		currentRows[idx]["(từ ngày)"] = value;
	} else if (field === "ngayDi") {
		currentRows[idx]["Ngày đi"] = value;
		currentRows[idx]["(đến ngày)"] = value;
	} else if (field === "diaChi") {
		parseAndApplyAddress(currentRows[idx], value);
	}
	updatePayloadPreview();
}

function toggleEditInline(idx: number) {
	const next = new Set(editingIndices);
	if (next.has(idx)) {
		next.delete(idx);
		editingIndices = next;
		syncRowToGoogleSheet(idx);
	} else {
		next.add(idx);
		editingIndices = next;
	}
}

function openEditModal(idx: number) {
	const row = currentRows[idx];
	if (!row) return;
	modalIndex = idx;
	const formattedDob = formatToDisplayDate(
		String(row.ngaySinh || row["Ngày sinh"] || row["D.O.B"] || ""),
	);
	const rawDocType = String(row.loaiGiayTo || row["Loại giấy tờ"] || "CCCD");
	const normalizedDocType = rawDocType === "Thẻ CCCD" ? "CCCD" : rawDocType;

	modalForm = {
		hoTen: String(row.hoTen || row["Họ tên"] || ""),
		gioiTinh:
			row.gioiTinh === "Nữ" ||
			row["Giới tính"] === "Nữ" ||
			row.gioiTinh === "F" ||
			row["Giới tính"] === "F"
				? "Nữ"
				: "Nam",
		ngaySinh: formattedDob,
		quocTich: String(
			row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "VNM",
		).toUpperCase(),
		soPhong: cleanRoomNumber(row.soPhong || row["Số phòng"]) || "1",
		loaiGiayTo: normalizedDocType,
		soGiayTo: cleanDocNumberInput(
			String(
				row.soGiayTo ||
					row["Số giấy tờ"] ||
					row.soHoChieu ||
					row["Số hộ chiếu"] ||
					"",
			),
			normalizedDocType,
		),
		ngayDen: String(row.ngayDen || row["(từ ngày)"] || row["Ngày đến"] || ""),
		ngayDi: String(row.ngayDi || row["(đến ngày)"] || row["Ngày đi"] || ""),
		thoiHanTamTru: String(row.thoiHanTamTru || row["Thời hạn tạm trú"] || ""),
		diaChiFull: getCombinedAddress(row),
	};
	modalOpen = true;
}

function closeEditModal() {
	modalOpen = false;
	modalIndex = null;
}

function saveModal() {
	if (modalIndex === null || !currentRows[modalIndex]) return;
	const row = currentRows[modalIndex];
	row.hoTen = modalForm.hoTen.trim();
	row["Họ tên"] = row.hoTen;
	row.gioiTinh = modalForm.gioiTinh;
	row["Giới tính"] = row.gioiTinh;
	const savedDob = formatToDisplayDate(modalForm.ngaySinh.trim());
	row.ngaySinh = savedDob;
	row["Ngày sinh"] = savedDob;
	row["D.O.B"] = savedDob;
	row.quocTich = modalForm.quocTich.trim().toUpperCase();
	row["Quốc tịch"] = row.quocTich;
	row.soPhong = modalForm.soPhong;
	row["Số phòng"] = row.soPhong;
	row.loaiGiayTo = modalForm.loaiGiayTo;
	row["Loại giấy tờ"] = row.loaiGiayTo;
	row.soGiayTo = cleanDocNumberInput(
		modalForm.soGiayTo.trim(),
		modalForm.loaiGiayTo,
	);
	row["Số giấy tờ"] = row.soGiayTo;
	row["Số CCCD"] = row.soGiayTo;
	row.soHoChieu = row.soGiayTo;
	row.ngayDen = modalForm.ngayDen.trim();
	row["Ngày đến"] = row.ngayDen;
	row.ngayDi = modalForm.ngayDi.trim();
	row["Ngày đi"] = row.ngayDi;
	if (modalForm.thoiHanTamTru) {
		row.thoiHanTamTru = modalForm.thoiHanTamTru.trim();
		row["Thời hạn tạm trú"] = row.thoiHanTamTru;
	}
	parseAndApplyAddress(row, modalForm.diaChiFull);

	const savedIdx = modalIndex;
	closeEditModal();
	updatePayloadPreview();
	syncRowToGoogleSheet(savedIdx);
}

function buildOrderedRowValues(row: RowData, idx = 0): string[] {
	const stt = String(row.stt || row.STT || idx + 1);
	const hoTen = String(row.hoTen || row["Họ tên"] || "");
	const rawDob = String(row.ngaySinh || row["Ngày sinh"] || row["D.O.B"] || "");
	const ngaySinh = formatToDisplayDate(rawDob);
	const gioiTinh = String(row.gioiTinh || row["Giới tính"] || "Nam");
	const quocTich = String(
		row.quocTich || row["Quốc tịch"] || row["Quốc gia"] || "VNM",
	).toUpperCase();
	const rawDocType = String(row.loaiGiayTo || row["Loại giấy tờ"] || "CCCD");
	const loaiGiayTo = rawDocType === "Thẻ CCCD" ? "CCCD" : rawDocType;
	const tenGiayTo = String(row.tenGiayTo || row["Tên giấy tờ"] || loaiGiayTo);
	const soGiayTo = String(
		row.soGiayTo ||
			row["Số giấy tờ"] ||
			row["Số CCCD"] ||
			row.soHoChieu ||
			row["Số hộ chiếu"] ||
			"",
	);
	const tinhTp = String(
		row.tinhTp || row.tinh || row["Tỉnh"] || row["Tỉnh/TP"] || "",
	);
	const quanHuyen = String(
		row.quanHuyen ||
			row.huyen ||
			row["Quận/Huyện"] ||
			row["Quận"] ||
			row["Huyện"] ||
			"",
	);
	const phuongXa = String(
		row.phuongXa ||
			row.xa ||
			row["Phường/Xã"] ||
			row["Phường"] ||
			row["Xã"] ||
			"",
	);
	const diaChi = String(
		row.diaChi || row["Địa chỉ"] || row["Địa chỉ chi tiết"] || "",
	);
	const ngayDen = String(
		row.ngayDen || row["(từ ngày)"] || row["Ngày đến"] || row.tuNgay || "",
	);
	const ngayDi = String(
		row.ngayDi || row["(đến ngày)"] || row["Ngày đi"] || row.denNgay || "",
	);
	const rawRoom = row.soPhong || row["Số phòng"] || row.room || "1";
	const matchRoom = String(rawRoom).match(/\d+/);
	const soPhong = matchRoom ? matchRoom[0] : String(rawRoom || "1");
	const daDangKy = String(row.daDangKy || row["Đã đăng ký"] || "Chưa đăng ký");

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

async function syncRowToGoogleSheet(idx: number) {
	const row = currentRows[idx];
	if (!row) return;

	// Dòng 1 luôn là Header, dòng thực tế trên Sheet là row._sheetRow hoặc idx + 2 (luôn >= 2)
	const targetSheetRow = Math.max(
		2,
		Number(row._sheetRow || row.sheetRowIndex || idx + 2),
	);
	row._sheetRow = targetSheetRow;
	row.sheetRowIndex = targetSheetRow;

	showToast("LƯU", `Đang lưu dòng ${targetSheetRow} lên Google Sheet...`);
	const selectedTab = availableTabs.find(
		(t) => String(t.gid) === String(selectedGid),
	);
	const sheetName = selectedTab ? selectedTab.name : "";
	const orderedValues = buildOrderedRowValues(row, idx);

	try {
		const res = await fetch("/api/sheets/update-row", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				rowIndex: targetSheetRow,
				sheetRowIndex: targetSheetRow,
				row: currentRows[idx],
				orderedValues,
				gid: selectedGid,
				sheetName,
			}),
		});
		const data = await res.json();
		if (data.success) {
			showToast("OK", `Đã cập nhật dòng ${targetSheetRow} lên Google Sheet!`);
		} else if (data.notConfigured) {
			showToast("LƯU", `Đã lưu dòng ${targetSheetRow} vào bộ nhớ.`);
		} else {
			showToast("CẢNH BÁO", `Lỗi cập nhật Sheet: ${data.message}`);
		}
	} catch (err) {
		showToast("LỖI", `Lỗi mạng khi lưu Sheet: ${(err as Error).message}`);
	}
}

function promptDeleteRow(idx: number) {
	const row = currentRows[idx];
	if (!row) return;
	deleteTargetIdx = idx;
	deleteTargetName = String(row.hoTen || row["Họ tên"] || `Dòng ${idx + 1}`);
	deleteTargetSheetRow = Math.max(
		2,
		Number(row._sheetRow || row.sheetRowIndex || idx + 2),
	);
	deleteModalOpen = true;
}

function cancelDeleteRow() {
	deleteModalOpen = false;
	deleteTargetIdx = null;
	deleteTargetName = "";
	deleteTargetSheetRow = null;
}

async function confirmDeleteRow() {
	if (deleteTargetIdx === null) return;
	const idx = deleteTargetIdx;
	const row = currentRows[idx];
	const targetSheetRow =
		deleteTargetSheetRow ||
		Math.max(2, Number(row?._sheetRow || row?.sheetRowIndex || idx + 2));

	// Đóng modal và kích hoạt hiệu ứng strikethrough ngay lập tức
	deleteModalOpen = false;
	const nextDeleting = new Set(deletingIndices);
	nextDeleting.add(idx);
	deletingIndices = nextDeleting;

	showToast("XÓA", `Đang xóa dòng ${targetSheetRow} trên Google Sheet...`);
	const selectedTab = availableTabs.find(
		(t) => String(t.gid) === String(selectedGid),
	);
	const sheetName = selectedTab ? selectedTab.name : "";

	try {
		const res = await fetch("/api/sheets/delete-row", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				rowIndex: targetSheetRow,
				sheetRowIndex: targetSheetRow,
				gid: selectedGid,
				sheetName,
			}),
		});
		const data = await res.json();
		if (data.success) {
			showToast("OK", `Đã xóa dòng ${targetSheetRow} trên Google Sheet!`);
		} else if (data.notConfigured) {
			showToast("XÓA", `Đã xóa dòng ${targetSheetRow} trên giao diện.`);
		} else {
			showToast("CẢNH BÁO", `Lỗi xóa Sheet: ${data.message}`);
		}
	} catch (err) {
		showToast("LỖI", `Lỗi mạng khi xóa Sheet: ${(err as Error).message}`);
	} finally {
		// Dọn dẹp trạng thái deleting và xóa bản ghi khỏi mảng dữ liệu
		const cleanDeleting = new Set(deletingIndices);
		cleanDeleting.delete(idx);
		deletingIndices = cleanDeleting;

		currentRows = currentRows
			.filter((_, i) => i !== idx)
			.map((r, i) => {
				const oldRow = Number(r._sheetRow || r.sheetRowIndex || i + 2);
				if (i >= idx && oldRow > targetSheetRow) {
					const newSheetRow = oldRow - 1;
					r._sheetRow = newSheetRow;
					r.sheetRowIndex = newSheetRow;
				}
				return r;
			});

		const nextSel = new Set<number>();
		selectedIndices.forEach((i) => {
			if (i < idx) nextSel.add(i);
			else if (i > idx) nextSel.add(i - 1);
		});
		selectedIndices = nextSel;
		updatePayloadPreview();
	}
}

function addNewGuest() {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
	const next2Days = new Date(now);
	next2Days.setDate(next2Days.getDate() + 2);
	const next2DaysStr = `${pad(next2Days.getDate())}/${pad(next2Days.getMonth() + 1)}/${next2Days.getFullYear()} 12:00:00`;

	// Tính toán dòng Google Sheet tiếp theo (bắt đầu từ dòng 2 trở đi, không bao giờ ghi vào dòng 1)
	let nextSheetRow = 2;
	if (currentRows.length > 0) {
		const maxRow = currentRows.reduce((max, r) => {
			const rNum = Number(r._sheetRow || r.sheetRowIndex || 0);
			return Math.max(max, rNum);
		}, 1);
		nextSheetRow = Math.max(2, maxRow + 1);
	}

	const newRow: RowData = {
		_sheetRow: nextSheetRow,
		sheetRowIndex: nextSheetRow,
		stt: String(currentRows.length + 1),
		STT: String(currentRows.length + 1),
		hoTen: "KHÁCH MỚI",
		"Họ tên": "KHÁCH MỚI",
		ngaySinh: "01/01/1995",
		"Ngày sinh": "01/01/1995",
		"D.O.B": "01/01/1995",
		gioiTinh: "Nam",
		"Giới tính": "Nam",
		quocTich: "VNM",
		"Quốc tịch": "VNM",
		"Quốc gia": "VNM",
		loaiGiayTo: "CCCD",
		"Loại giấy tờ": "CCCD",
		soGiayTo: "",
		"Số giấy tờ": "",
		"Số CCCD": "",
		soPhong: "1",
		"Số phòng": "1",
		diaChi: "",
		"Địa chỉ": "",
		"Địa chỉ chi tiết": "",
		ngayDen: todayStr,
		"Ngày đến": todayStr,
		"(từ ngày)": todayStr,
		ngayDi: next2DaysStr,
		"Ngày đi": next2DaysStr,
		"(đến ngày)": next2DaysStr,
		daDangKy: "Chưa đăng ký",
		"Đã đăng ký": "Chưa đăng ký",
	};

	currentRows = [...currentRows, newRow];
	const newIdx = currentRows.length - 1;
	updatePayloadPreview();
	syncRowToGoogleSheet(newIdx);
	openEditModal(newIdx);
}

async function executeSyncBatch(rows: RowData[], title: string) {
	activeTab = "syncTab";
	isSyncing = true;
	syncActionTitle = title;
	syncResults = [];

	try {
		const res = await fetch("/api/sync", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rows }),
		});
		const data = await res.json();
		syncResults = data.results || [];
		await checkToken();

		// Tự động cập nhật 'Đã đăng ký' vào local state và tự động đồng bộ lên Google Sheet cột 16
		const nextSelected = new Set(selectedIndices);
		let updatedCount = 0;
		for (const result of syncResults) {
			if (result.success && result.row) {
				const rowDoc = String(
					result.row.soGiayTo ||
						result.row["Số giấy tờ"] ||
						result.row.soHoChieu ||
						result.row["Số hộ chiếu"] ||
						"",
				).trim();
				const rowName = String(
					result.row.hoTen || result.row["Họ tên"] || "",
				).trim();
				const rowSheetIdx = Number(
					result.row._sheetRow || result.row.sheetRowIndex || 0,
				);

				const targetIdx = currentRows.findIndex((r) => {
					if (
						rowSheetIdx > 0 &&
						(r._sheetRow === rowSheetIdx || r.sheetRowIndex === rowSheetIdx)
					) {
						return true;
					}
					const curDoc = String(
						r.soGiayTo ||
							r["Số giấy tờ"] ||
							r.soHoChieu ||
							r["Số hộ chiếu"] ||
							"",
					).trim();
					const curName = String(r.hoTen || r["Họ tên"] || "").trim();
					return curDoc.length > 0 && curDoc === rowDoc && curName === rowName;
				});

				if (targetIdx !== -1) {
					currentRows[targetIdx].daDangKy = "Đã đăng ký";
					currentRows[targetIdx]["Đã đăng ký"] = "Đã đăng ký";
					nextSelected.delete(targetIdx);
					updatedCount++;
					// Tự động ghi nhận lên Google Sheet cột 16
					await syncRowToGoogleSheet(targetIdx);
				}
			}
		}
		selectedIndices = nextSelected;
		updatePayloadPreview();
		if (updatedCount > 0) {
			showToast(
				"THÀNH CÔNG",
				`Đã đăng ký và cập nhật trạng thái "Đã đăng ký" cho ${updatedCount} khách lên Sheet!`,
			);
		}
	} catch (err) {
		syncResults = [
			{
				status: "Thất bại",
				message: `Lỗi thực thi: ${(err as Error).message}`,
			},
		];
	} finally {
		isSyncing = false;
	}
}

async function pushSelectedRows() {
	if (currentRows.length === 0) {
		alert("Bảng danh sách khách đang trống!");
		return;
	}
	const unregRows = currentRows.filter((r) => !isRowRegistered(r));
	if (unregRows.length === 0) {
		showToast(
			"THÔNG BÁO",
			"Tất cả khách trong danh sách đều đã hoàn tất đăng ký lưu trú!",
		);
		return;
	}
	const rows =
		selectedIndices.size > 0
			? Array.from(selectedIndices)
					.map((i) => currentRows[i])
					.filter((r) => r && !isRowRegistered(r))
			: unregRows;

	if (rows.length === 0) {
		showToast(
			"THÔNG BÁO",
			"Vui lòng chọn khách chưa đăng ký để gửi lên hệ thống!",
		);
		return;
	}

	const title =
		selectedIndices.size > 0
			? `Đăng ký ${rows.length} khách đã chọn`
			: `Đăng ký tất cả ${rows.length} khách chưa đăng ký`;
	await executeSyncBatch(rows, title);
}

async function pushSingleRow(idx: number) {
	if (!currentRows[idx]) return;
	if (isRowRegistered(currentRows[idx])) {
		showToast(
			"THÔNG BÁO",
			"Khách này đã được đăng ký lưu trú thành công trước đó!",
		);
		return;
	}
	await executeSyncBatch(
		[currentRows[idx]],
		`Đăng ký khách: ${currentRows[idx].hoTen || currentRows[idx]["Họ tên"]}`,
	);
}

async function checkToken() {
	try {
		const res = await fetch("/api/token");
		const data = await res.json();
		tokenStatus = {
			hasToken: Boolean(data.hasToken),
			expiresInSeconds: data.expiresInSeconds || 0,
		};
	} catch {}
}

async function handleManualLogin() {
	try {
		const res = await fetch("/api/token", { method: "POST" });
		const data = await res.json();
		if (data.success) {
			showToast("OK", "Đăng nhập lấy Token thành công!");
		} else {
			alert(`Đăng nhập thất bại: ${data.error}`);
		}
		await checkToken();
	} catch (err) {
		alert(`Lỗi kết nối: ${(err as Error).message}`);
	}
}

async function loadCatalogs() {
	try {
		const res = await fetch("/api/catalogs");
		const data = await res.json();
		if (data.catalogs) {
			catalogs = data.catalogs;
		}
	} catch (err) {
		console.error("Lỗi nạp danh mục:", err);
	}
}

function copyCode(code: string | undefined, name: string | undefined) {
	if (!code) return;
	navigator.clipboard.writeText(code);
	showToast(code, name || "");
}

let filteredTinhList = $derived(
	catalogs.tinhTp.filter((t) => {
		const q = normalizeStr(filterTinh);
		if (!q) return true;
		const ten = normalizeStr(t.tenTT);
		const ma = String(t.maTT || "");
		const maChu = normalizeStr(t.maTTChu || "");
		return ten.includes(q) || ma.includes(q) || maChu.includes(q);
	}),
);

let filteredQuocTichList = $derived(
	catalogs.quocTich.filter((q) => {
		const query = normalizeStr(filterQuocTich);
		if (!query) return true;
		const ten = normalizeStr(q.tenQT);
		const ma = normalizeStr(q.maQT);
		const tenEn = normalizeStr(q.tenQTEn || "");
		return ten.includes(query) || ma.includes(query) || tenEn.includes(query);
	}),
);

onMount(() => {
	loadCatalogs();
	checkToken();
	fetchSheetTabsList();
});
</script>

<svelte:head>
  <title>KBTT - Hệ Thống Đồng Bộ Tự Động Khai Báo Tạm Trú & Lưu Trú (v1.4)</title>
</svelte:head>

<!-- Header -->
<header class="bg-slate-800 text-white shadow-sm sticky top-0 z-50 border-b border-slate-700/80">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 rounded-xl bg-indigo-600/90 flex items-center justify-center shadow-sm">
        <i class="fa-solid fa-hotel text-xl text-white"></i>
      </div>
      <div>
        <h1 class="text-base font-bold tracking-tight flex items-center gap-2 text-slate-100">
          Hệ Thống Tích Hợp KBTT v1.4
          <span class="text-[10px] bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span> Live Sync
          </span>
        </h1>
        <p class="text-xs text-slate-400">Đồng bộ tự động OCR từ Google Sheets lên api-kbtt.ai-vlab.com</p>
      </div>
    </div>

    <!-- Auth & System Badges -->
    <div class="flex items-center space-x-3 text-xs">
      <div class="bg-slate-900/60 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-slate-300">Danh mục: <strong class="text-white">{catalogs.quocTich.length > 0 ? 'Đã nạp' : 'Đang nạp...'}</strong></span>
      </div>

      <div class="bg-slate-900/60 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
        <span class={`w-2 h-2 rounded-full ${tokenStatus.hasToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
        <span class="text-slate-300">Token:</span>
        <span class="font-mono font-bold text-slate-100">{tokenStatus.hasToken ? `Hợp lệ (${tokenStatus.expiresInSeconds}s)` : 'Chưa nạp'}</span>
      </div>

      <button onclick={handleManualLogin} class="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium transition shadow-sm flex items-center gap-1.5">
        <i class="fa-solid fa-key"></i> Đăng nhập / Refresh
      </button>
    </div>
  </div>
</header>

<!-- Main Content Area -->
<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
  <!-- Navigation Tabs -->
  <div class="flex border-b border-slate-300 gap-2 overflow-x-auto text-sm font-medium">
    <button onclick={() => activeTab = 'dataTab'} class={`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 ${activeTab === 'dataTab' ? 'border-indigo-600 text-indigo-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      <i class="fa-solid fa-table-list"></i> Dữ Liệu Google Sheets / OCR
    </button>
    <button onclick={() => activeTab = 'syncTab'} class={`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 ${activeTab === 'syncTab' ? 'border-indigo-600 text-indigo-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      <i class="fa-solid fa-cloud-arrow-up"></i> Thực Thi Đồng Bộ & Log Phản Hồi
    </button>
    <button onclick={() => activeTab = 'catalogTab'} class={`tab-btn px-4 py-2.5 border-b-2 flex items-center gap-2 ${activeTab === 'catalogTab' ? 'border-indigo-600 text-indigo-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
      <i class="fa-solid fa-book-bookmark"></i> Tra Cứu Danh Mục Rút Gọn
    </button>
  </div>

  <!-- TAB 1: Google Sheets / OCR Data Table -->
  {#if activeTab === 'dataTab'}
    <section class="space-y-4">
      <!-- Google Sheets Connection Panel with Date Tab Selection (Sheet ID Hidden) -->
      <div class="bg-slate-800 text-white p-4 rounded-xl border border-slate-700 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-white text-lg">
              <i class="fa-solid fa-file-excel"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-100">Google Sheets Tích Hợp & Lựa Chọn Ngày</h3>
              <p class="text-xs text-slate-300">Kéo dữ liệu tự động theo từng Tab ngày (Mặc định tab ngày gần hiện tại nhất)</p>
            </div>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-emerald-300 font-mono">{tabFetchStatus}</span>
            <button onclick={fetchSheetTabsList} class="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-600 transition shadow-sm flex items-center gap-1.5 text-slate-200" title="Làm mới danh sách Tab ngày">
              <i class={`fa-solid fa-arrows-rotate ${isLoadingSheet ? 'fa-spin' : ''}`}></i> Nạp lại Tabs
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <!-- Tab Selection Dropdown -->
          <div class="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-lg border border-slate-700">
            <label for="tabSelectInput" class="text-xs font-semibold text-slate-300 whitespace-nowrap pl-1.5"><i class="fa-regular fa-calendar-days mr-1"></i> Chọn Tab Ngày:</label>
            <select id="tabSelectInput" bind:value={selectedGid} onchange={handleTabChange} class="text-xs text-slate-800 bg-[#f1f5f9] border border-slate-400 rounded-md px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-bold">
              {#each availableTabs as t}
                <option value={t.gid}>{t.name} {t.isDefault ? '⭐ (Gần nhất)' : ''}</option>
              {/each}
            </select>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2">
            <button onclick={() => pullDataFromGoogleSheet()} disabled={isLoadingSheet} class="px-4 py-2 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50" title="Lấy dữ liệu từ Google Sheets về bảng">
              <i class="fa-solid fa-cloud-arrow-down"></i> Lấy thông tin từ sheet
            </button>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-slate-800">Danh sách bản ghi OCR cần đồng bộ</h2>
          <p class="text-xs text-slate-500">{currentSourceLabel}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick={addNewGuest} class="px-3.5 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm" title="Thêm khách mới vào danh sách và đồng bộ Google Sheets">
            <i class="fa-solid fa-user-plus"></i> Thêm khách
          </button>
          <button onclick={pushSelectedRows} class="px-4 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold transition flex items-center gap-1.5 shadow-sm" title="Đăng ký các khách chưa đăng ký lên hệ thống KBTT">
            <i class="fa-solid fa-paper-plane"></i> Đăng ký ({selectedIndices.size > 0 ? `${selectedIndices.size}` : `${currentRows.filter(r => !isRowRegistered(r)).length}`} khách)
          </button>
        </div>
      </div>

      <!-- Table with Read-only / Edit Mode & Checkbox Selection -->
      <div class="bg-slate-100/90 rounded-xl border border-slate-300/80 shadow-sm overflow-hidden">
        <div class="overflow-x-auto max-h-[520px]">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-300/80 text-slate-800 uppercase font-bold text-[11px] sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th class="p-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={eligibleRowsCount > 0 && selectedIndices.size === eligibleRowsCount}
                    disabled={eligibleRowsCount === 0}
                    onchange={(e) => toggleSelectAll((e.target as HTMLInputElement).checked)}
                    class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title={eligibleRowsCount === 0 ? "Tất cả khách đều đã hoàn tất đăng ký lưu trú" : "Chọn tất cả khách chưa đăng ký"}
                  >
                </th>
                <th class="p-3 w-8 text-center">#</th>
                <th class="p-3">Họ tên</th>
                <th class="p-3">Ngày sinh</th>
                <th class="p-3">Giới tính</th>
                <th class="p-3">Quốc tịch</th>
                <th class="p-3">Loại giấy tờ</th>
                <th class="p-3">Số giấy tờ</th>
                <th class="p-3">Phòng</th>
                <th class="p-3">Ngày đến / đi</th>
                <th class="p-3">Địa chỉ</th>
                <th class="p-3 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200/90 bg-[#f8fafc]">
              {#each currentRows as row, idx}
                {@const valState = validationStates[idx] || { isComplete: true, missingFields: [], fieldStatus: {} }}
                {@const isComplete = valState.isComplete}
                {@const fStatus = valState.fieldStatus || {}}
                {@const isEditing = editingIndices.has(idx)}
                {@const isChecked = selectedIndices.has(idx)}
                {@const isDeleting = deletingIndices.has(idx)}
                {@const isRegistered = isRowRegistered(row)}
                {@const addrInfo = getDisplayAddress(row)}

                <tr ondblclick={() => !isDeleting && !isRegistered && openEditModal(idx)} class={`transition-all duration-200 ${isDeleting ? 'line-through opacity-40 bg-rose-100/70 pointer-events-none select-none grayscale' : isRegistered ? 'bg-slate-100/75 text-slate-500 hover:bg-slate-200/50' : 'hover:bg-slate-100/80'} ${!isComplete && !isDeleting && !isRegistered ? 'bg-rose-50/30' : ''} ${isChecked && !isDeleting && !isRegistered ? 'bg-indigo-50/30' : ''}`}>
                  <td class="p-3 text-center">
                    <input type="checkbox" checked={isChecked} disabled={isDeleting || isRegistered} onchange={(e) => toggleRowSelect(idx, (e.target as HTMLInputElement).checked)} class="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" title={isRegistered ? "Khách này đã được đăng ký lưu trú thành công" : "Chọn khách"}>
                  </td>

                  <td class="p-3 text-center font-mono text-slate-400">{idx + 1}</td>

                  <!-- Họ tên -->
                  <td class="p-3 font-medium {isRegistered ? 'text-slate-600' : 'text-slate-900'}">
                    {#if isRegistered}
                      <span class="uppercase font-bold text-slate-600 select-none cursor-default" title="Khách này đã hoàn tất đăng ký lưu trú">{row.hoTen || row['Họ tên']}</span>
                    {:else if isEditing}
                      <input type="text" value={row.hoTen || row['Họ tên'] || ''} onchange={(e) => updateCell(idx, 'hoTen', (e.target as HTMLInputElement).value)} class="w-full rounded px-2 py-1 outline-none uppercase font-bold text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                    {:else if fStatus.hoTen?.valid ?? (row.hoTen || row['Họ tên'])}
                      <button type="button" class="uppercase font-bold text-slate-800 cursor-pointer hover:text-indigo-600 transition text-left" onclick={() => openEditModal(idx)}>{row.hoTen || row['Họ tên']}</button>
                    {:else}
                      <button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-semibold px-2 py-0.5 rounded text-xs cursor-pointer" onclick={() => openEditModal(idx)}>Thiếu họ tên *</button>
                    {/if}
                  </td>

                  <!-- Ngày sinh -->
                  <td class="p-3 font-mono">
                    {#if isRegistered}
                      <span class="text-slate-500">{formatToDisplayDate(String(row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || ''))}</span>
                    {:else if isEditing}
                      <input type="text" value={formatToDisplayDate(String(row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || ''))} onchange={(e) => updateCell(idx, 'ngaySinh', (e.target as HTMLInputElement).value)} placeholder="DD/MM/YYYY" class="w-24 rounded px-2 py-1 outline-none text-xs font-mono transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                    {:else if fStatus.ngaySinh?.valid ?? (row.ngaySinh || row['D.O.B'] || row['Ngày sinh'])}
                      <button type="button" class="cursor-pointer hover:text-indigo-600 transition" onclick={() => openEditModal(idx)}>{formatToDisplayDate(String(row.ngaySinh || row['D.O.B'] || row['Ngày sinh'] || ''))}</button>
                    {:else}
                      <button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-2 py-0.5 rounded text-xs cursor-pointer" onclick={() => openEditModal(idx)}>Thiếu ngày sinh *</button>
                    {/if}
                  </td>

                  <!-- Giới tính -->
                  <td class="p-3">
                    {#if isEditing}
                      <select onchange={(e) => updateCell(idx, 'gioiTinh', (e.target as HTMLSelectElement).value)} class="bg-emerald-50/50 border border-emerald-400 rounded px-2 py-1 outline-none text-xs font-medium transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="Nam" selected={(row.gioiTinh || row['Giới tính']) === 'Nam' || (row.gioiTinh || row['Giới tính']) === 'M'}>Nam</option>
                        <option value="Nữ" selected={(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F'}>Nữ</option>
                      </select>
                    {:else}
                      <span class={`px-2 py-0.5 rounded font-semibold text-xs ${isRegistered ? 'bg-slate-200 text-slate-500' : 'bg-slate-200/80 text-slate-700'}`}>{(row.gioiTinh || row['Giới tính']) === 'Nữ' || (row.gioiTinh || row['Giới tính']) === 'F' ? 'Nữ' : 'Nam'}</span>
                    {/if}
                  </td>

                  <!-- Quốc tịch -->
                  <td class="p-3">
                    {#if isEditing}
                      <input
                        type="text"
                        value={row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM'}
                        oninput={(e) => {
                          const upper = (e.target as HTMLInputElement).value.toUpperCase();
                          (e.target as HTMLInputElement).value = upper;
                          updateCell(idx, 'quocTich', upper);
                        }}
                        maxlength="3"
                        class="w-20 rounded px-1.5 py-1 outline-none uppercase font-bold text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800"
                      >
                    {:else if fStatus.quocTich?.valid ?? isValidAlpha3Country(String(row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM'))}
                      <span class={`font-bold text-xs ${isRegistered ? 'text-slate-500' : 'text-slate-700'}`}>{String(row.quocTich || row['Quốc tịch'] || row['Quốc gia'] || 'VNM').toUpperCase()}</span>
                    {:else}
                      <span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-bold px-1.5 py-0.5 rounded text-xs cursor-help" title={fStatus.quocTich?.error || 'Mã quốc tịch Alpha-3 không hợp lệ'}>{String(row.quocTich || 'LỖI').toUpperCase()} <i class="fa-solid fa-circle-exclamation"></i></span>
                    {/if}
                  </td>

                  <!-- Loại giấy tờ -->
                  <td class="p-3">
                    {#if isEditing}
                      <select onchange={(e) => updateCell(idx, 'loaiGiayTo', (e.target as HTMLSelectElement).value)} class="bg-emerald-50/50 border border-emerald-400 rounded px-1.5 py-1 outline-none text-xs max-w-[130px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="CCCD" selected={row.loaiGiayTo === 'CCCD' || row.loaiGiayTo === 'Thẻ CCCD' || row['Loại giấy tờ'] === 'CCCD' || row['Loại giấy tờ'] === 'Thẻ CCCD'}>CCCD (1)</option>
                        <option value="CMND" selected={row.loaiGiayTo === 'CMND' || row.loaiGiayTo === 'Thẻ CMND' || row['Loại giấy tờ'] === 'CMND' || row['Loại giấy tờ'] === 'Thẻ CMND'}>CMND (2)</option>
                        <option value="GPLX" selected={row.loaiGiayTo === 'GPLX' || row.loaiGiayTo === 'Giấy phép lái xe' || row['Loại giấy tờ'] === 'GPLX' || row['Loại giấy tờ'] === 'Giấy phép lái xe'}>GPLX (3)</option>
                        <option value="Hộ chiếu" selected={row.loaiGiayTo === 'Hộ chiếu' || row['Loại giấy tờ'] === 'Hộ chiếu'}>Hộ chiếu (4)</option>
                        <option value="Căn Cước" selected={row.loaiGiayTo === 'Căn Cước' || row.loaiGiayTo === 'Thẻ Căn Cước' || row['Loại giấy tờ'] === 'Căn Cước' || row['Loại giấy tờ'] === 'Thẻ Căn Cước'}>Căn Cước (8)</option>
                      </select>
                    {:else}
                      {@const curLt = String(row.loaiGiayTo || row['Loại giấy tờ'] || 'CCCD')}
                      <span class={`text-xs ${isRegistered ? 'text-slate-500' : 'text-slate-700'}`}>{curLt === 'Thẻ CCCD' ? 'CCCD' : curLt}</span>
                    {/if}
                  </td>

                  <!-- Số giấy tờ -->
                  <td class="p-3 font-mono font-bold {isRegistered ? 'text-slate-500' : 'text-indigo-700'}">
                    {#if isRegistered}
                      <span class="font-mono font-bold text-slate-500 select-none">{row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu']}</span>
                    {:else if isEditing}
                      {@const curDocType = row.loaiGiayTo || row['Loại giấy tờ'] || 'Thẻ CCCD'}
                      <input
                        type="text"
                        value={row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu'] || ''}
                        onkeydown={(e) => handleDocNumberKeyDown(e, curDocType)}
                        oninput={(e) => {
                          const cleaned = cleanDocNumberInput((e.target as HTMLInputElement).value, curDocType);
                          (e.target as HTMLInputElement).value = cleaned;
                          updateCell(idx, 'soGiayTo', cleaned);
                        }}
                        placeholder={isNumericDocType(curDocType) ? "Chỉ nhập số" : "Số hộ chiếu (chữ & số)"}
                        maxlength="12"
                        class="w-28 rounded px-2 py-1 outline-none font-bold font-mono text-xs transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-indigo-700"
                      >
                    {:else if fStatus.soGiayTo?.valid ?? (fStatus.soHoChieu?.valid ?? true)}
                      <button type="button" class="cursor-pointer hover:underline font-mono font-bold text-indigo-700" onclick={() => openEditModal(idx)}>{row.soGiayTo || row['Số giấy tờ'] || row.soHoChieu || row['Số hộ chiếu']}</button>
                    {:else}
                      <button type="button" class="inline-block bg-rose-100 border border-rose-300 text-rose-700 font-mono font-bold px-2 py-0.5 rounded text-xs cursor-pointer" onclick={() => openEditModal(idx)} title={fStatus.soGiayTo?.error || fStatus.soHoChieu?.error}>{row.soGiayTo || row['Số giấy tờ'] || 'Thiếu số *'}</button>
                    {/if}
                  </td>

                  <!-- Số phòng -->
                  <td class="p-3 text-center">
                    {#if isEditing}
                      <select onchange={(e) => updateCell(idx, 'soPhong', (e.target as HTMLSelectElement).value)} class="rounded px-2 py-1 outline-none text-xs font-semibold transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800 text-center">
                        <option value="">--</option>
                        {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
                          <option value={num} selected={cleanRoomNumber(row.soPhong || row['Số phòng']) === String(num)}>{num}</option>
                        {/each}
                      </select>
                    {:else if fStatus.soPhong?.valid ?? (row.soPhong || row['Số phòng'])}
                      <span class={`font-bold px-2 py-0.5 rounded text-xs ${isRegistered ? 'text-slate-500 bg-slate-200' : 'text-slate-800 bg-slate-200/80'}`}>{cleanRoomNumber(row.soPhong || row['Số phòng'])}</span>
                    {:else}
                      <span class="inline-block bg-rose-100 border border-rose-300 text-rose-700 px-1.5 py-0.5 rounded text-xs cursor-help" title="Thiếu hoặc sai số phòng">Thiếu</span>
                    {/if}
                  </td>

                  <!-- Ngày đến / đi -->
                  <td class="p-3 text-[11px] {isRegistered ? 'text-slate-400' : 'text-slate-500'}">
                    {#if isRegistered}
                      <div class="space-y-0.5">
                        <div>Đến: <strong>{row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || 'N/A'}</strong></div>
                        <div>Đi: <strong>{row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || 'N/A'}</strong></div>
                      </div>
                    {:else if isEditing}
                      <div class="space-y-1">
                        <input type="text" value={row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || ''} onchange={(e) => updateCell(idx, 'ngayDen', (e.target as HTMLInputElement).value)} placeholder="Đến (hôm nay/qua)" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                        <input type="text" value={row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || ''} onchange={(e) => updateCell(idx, 'ngayDi', (e.target as HTMLInputElement).value)} placeholder="Đi" class="w-28 rounded px-1.5 py-0.5 outline-none text-[11px] transition-all duration-150 focus:scale-105 focus:shadow-lg focus:ring-2 focus:ring-indigo-500 bg-emerald-50/50 border border-emerald-400 text-slate-800">
                      </div>
                    {:else}
                      <button type="button" class="space-y-0.5 cursor-pointer text-left" onclick={() => openEditModal(idx)} title="Bấm để chỉnh sửa">
                        {#if fStatus.ngayDen?.valid ?? true}
                          <div>Đến: <strong>{row.ngayDen || row['(từ ngày)'] || row['Ngày đến'] || 'N/A'}</strong></div>
                        {:else}
                          <div class="bg-rose-100 border border-rose-300 text-rose-800 px-1.5 py-0.5 rounded cursor-help font-semibold text-[10px]" title={fStatus.ngayDen?.error}>Đến: {row.ngayDen || 'Thiếu'} <i class="fa-solid fa-triangle-exclamation"></i></div>
                        {/if}
                        <div>Đi: <strong>{row.ngayDi || row['(đến ngày)'] || row['Ngày đi'] || 'N/A'}</strong></div>
                      </button>
                    {/if}
                  </td>

                  <!-- Địa chỉ -->
                  <td class="p-3 text-[11px] max-w-[150px] {isRegistered ? 'text-slate-400' : 'text-slate-700'}">
                    {#if isRegistered}
                      <span class="font-medium truncate inline-block max-w-[130px]" title={addrInfo.fullText}>{addrInfo.shortText}</span>
                    {:else if isEditing}
                      <input type="text" value={getCombinedAddress(row) || row.diaChi || row['Địa chỉ'] || ''} onchange={(e) => updateCell(idx, 'diaChi', (e.target as HTMLInputElement).value)} placeholder="Chi tiết, Xã, Huyện, Tỉnh" class="w-32 rounded px-1.5 py-0.5 outline-none text-[11px] bg-emerald-50/50 border border-emerald-400 text-slate-800 transition-all duration-150 focus:scale-110 focus:shadow-xl focus:ring-2 focus:ring-indigo-500">
                    {:else}
                      <button type="button" onclick={() => openEditModal(idx)} class="cursor-pointer hover:text-indigo-600 transition underline decoration-dotted decoration-slate-400 font-medium truncate inline-block max-w-[130px] text-left" title={`Bấm để chỉnh sửa: ${addrInfo.fullText}`}>
                        {addrInfo.shortText}
                      </button>
                    {/if}
                  </td>

                  <!-- Thao tác -->
                  <td class="p-3 text-center whitespace-nowrap">
                    {#if isDeleting}
                      <span class="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px] animate-pulse">
                        <i class="fa-solid fa-spinner fa-spin"></i> Đang xóa...
                      </span>
                    {:else if isRegistered}
                      <div class="inline-flex items-center gap-1.5 justify-center">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300" title="Khách này đã được đăng ký lưu trú thành công">
                          <i class="fa-solid fa-circle-check text-emerald-600"></i> Đã đăng ký
                        </span>
                        <button onclick={() => promptDeleteRow(idx)} class="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer" title="Xóa dòng khỏi bảng & Google Sheet">
                          <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    {:else}
                      <div class="inline-flex items-center gap-1">
                        <button onclick={() => openEditModal(idx)} class="text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-100 transition cursor-pointer" title="Chỉnh sửa chi tiết">
                          <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick={() => pushSingleRow(idx)} class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition cursor-pointer" title="Đăng ký riêng dòng này">
                          <i class="fa-solid fa-paper-plane"></i>
                        </button>
                        <button onclick={() => promptDeleteRow(idx)} class="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition cursor-pointer" title="Xóa dòng khỏi bảng & Google Sheet">
                          <i class="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  {/if}

  <!-- TAB 2: Execution & Logs -->
  {#if activeTab === 'syncTab'}
    <section class="space-y-4">
      <div class="bg-slate-100/90 p-5 rounded-xl border border-slate-300/80 shadow-sm">
        <h3 class="text-base font-semibold text-slate-800 mb-3">Kết quả thực thi và Nhật ký ghi nhận</h3>
        {#if isSyncing}
          <div class="text-center py-6 text-indigo-600 font-medium animate-pulse text-xs">
            <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Đang thực thi: {syncActionTitle} lên hệ thống KBTT...</p>
          </div>
        {:else if syncResults.length === 0}
          <div class="text-center py-8 text-slate-400 text-xs">
            <i class="fa-solid fa-inbox text-3xl mb-2"></i>
            <p>Chưa có lượt chạy đồng bộ nào. Nhấn "Push đăng ký đã chọn" hoặc "Push tất cả" để bắt đầu.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each syncResults as r, idx}
              {@const isSuccess = r.status === 'Thành công'}
              <div class={`p-4 rounded-xl border ${isSuccess ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'} transition`}>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isSuccess ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      {idx + 1}
                    </span>
                    <strong class="text-sm font-semibold text-slate-800">{r.row ? (r.row.hoTen || r.row['Họ tên']) : `Dòng ${idx + 1}`}</strong>
                    <span class={`text-xs px-2 py-0.5 rounded-full font-medium ${r.branch === 'VN' ? 'bg-indigo-100 text-indigo-800' : 'bg-cyan-100 text-cyan-800'}`}>
                      {r.branch === 'VN' ? 'Khách Việt Nam (API 5)' : 'Khách Nước ngoài (API 4)'}
                    </span>
                  </div>
                  <span class={`text-xs px-2.5 py-1 rounded-md font-semibold ${isSuccess ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {r.status}
                  </span>
                </div>
                <p class="text-xs text-slate-600 mb-2"><strong>Phản hồi:</strong> {r.message}</p>
                {#if r.payload}
                  <details class="text-[11px]">
                    <summary class="cursor-pointer text-indigo-600 hover:underline font-medium">Xem Request Payload gửi đi</summary>
                    <pre class="bg-slate-900 text-slate-200 p-2.5 rounded mt-1.5 overflow-x-auto">{JSON.stringify(r.payload, null, 2)}</pre>
                  </details>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- TAB 3: Catalog Browser -->
  {#if activeTab === 'catalogTab'}
    <section class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Tỉnh / TP -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Tỉnh / TP (API 7)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.tinhTp.length}</span>
        </h4>
        <input type="text" bind:value={filterTinh} placeholder="Tìm tỉnh (vd: ha noi, hn, 101)..." class="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 mb-2 focus:ring-1 focus:ring-indigo-500 outline-none">
        <ul class="text-xs space-y-1 overflow-y-auto max-h-72 divide-y divide-slate-200">
          {#each filteredTinhList as t}
            <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
              <span class="font-semibold text-slate-800">{t.tenTT}</span>
              <span class="font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">{t.maTT} ({t.maTTChu || ''})</span>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Quốc Tịch -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Quốc Tịch (API 6)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.quocTich.length} quốc gia</span>
        </h4>
        <input type="text" bind:value={filterQuocTich} placeholder="Tìm quốc gia (vd: viet nam, rus)..." class="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 mb-2 focus:ring-1 focus:ring-indigo-500 outline-none">
        <ul class="text-xs space-y-1 overflow-y-auto max-h-72 divide-y divide-slate-200">
          {#each filteredQuocTichList as q}
            <li class="border-b border-slate-100 last:border-0">
              <button type="button" onclick={() => copyCode(q.maQT, q.tenQT)} class="w-full text-left py-1.5 px-2 flex items-center justify-between hover:bg-indigo-50/80 cursor-pointer rounded transition group" title={`Bấm để copy mã: ${q.maQT}`}>
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-slate-800 group-hover:text-indigo-700 transition">{q.tenQT}</span>
                  {#if q.tenQTEn}
                    <span class="text-slate-400 font-normal text-[11px]">({q.tenQTEn})</span>
                  {/if}
                </div>
                <span class="font-mono text-indigo-600 font-bold bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded text-[11px] transition shadow-xs flex items-center gap-1">
                  <i class="fa-regular fa-copy text-[10px] opacity-70"></i> {q.maQT}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Loại Giấy Tờ -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Loại Giấy Tờ (API 10)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.loaiGiayTo.length} loại</span>
        </h4>
        <ul class="text-xs space-y-1.5 bg-slate-200/60 p-3 rounded-lg border border-slate-300">
          {#each catalogs.loaiGiayTo as lg}
            <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
              <span class="font-medium text-slate-800">{lg.name}</span>
              <span class="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">Mã API: {lg.id}</span>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Lý Do Cư Trú -->
      <div class="bg-slate-100/90 p-4 rounded-xl border border-slate-300/80 shadow-sm flex flex-col">
        <h4 class="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Lý Do Cư Trú (API 9)</span>
          <span class="text-indigo-700 font-mono font-bold">{catalogs.lyDoCuTru.length} lý do</span>
        </h4>
        <ul class="text-xs space-y-1.5 bg-slate-200/60 p-3 rounded-lg border border-slate-300">
          {#each catalogs.lyDoCuTru as ld}
            <li class="py-1.5 flex items-center justify-between border-b border-slate-100 last:border-0">
              <span class="font-medium text-slate-800">{ld.name}</span>
              <span class="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">Mã API: {ld.id}</span>
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}
</main>

<!-- Quick-Edit Modal -->
{#if modalOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
      <div class="bg-slate-800 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
        <div class="flex items-center gap-2.5">
          <i class="fa-solid fa-pen-to-square text-indigo-400 text-base"></i>
          <h3 class="font-bold text-sm tracking-wide">Chỉnh sửa thông tin khách lưu trú #{modalIndex !== null ? modalIndex + 1 : ''}</h3>
          {#if liveVal.allValid}
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <i class="fa-solid fa-circle-check text-emerald-400"></i> Hợp lệ
            </span>
          {:else}
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <i class="fa-solid fa-triangle-exclamation text-rose-400"></i> Cần sửa thông tin
            </span>
          {/if}
        </div>
        <button onclick={closeEditModal} aria-label="Đóng cửa sổ chỉnh sửa" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <!-- Họ tên -->
          <div class="md:col-span-8">
            <label for="modalHoTen" class="block font-semibold text-slate-700 mb-1">
              Họ và tên <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="modalHoTen"
              bind:value={modalForm.hoTen}
              class={`w-full px-3 py-2 text-sm uppercase font-bold rounded-lg outline-none transition ${!liveVal.hoTen.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
              placeholder="NGUYEN VAN A"
            >
            {#if !liveVal.hoTen.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.hoTen.error}
              </p>
            {/if}
          </div>

          <!-- Giới tính -->
          <div class="md:col-span-4">
            <label for="modalGioiTinh" class="block font-semibold text-slate-700 mb-1">Giới tính</label>
            <select id="modalGioiTinh" bind:value={modalForm.gioiTinh} class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition">
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>

          <!-- Ngày sinh -->
          <div class="md:col-span-3">
            <label for="modalNgaySinh" class="block font-semibold text-slate-700 mb-1">
              Ngày sinh (DD/MM/YYYY) <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="modalNgaySinh"
              bind:value={modalForm.ngaySinh}
              class={`w-full px-3 py-2 text-sm font-mono rounded-lg outline-none transition ${!liveVal.ngaySinh.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
              placeholder="22/09/2002"
            >
            {#if !liveVal.ngaySinh.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.ngaySinh.error}
              </p>
            {/if}
          </div>

          <!-- Mã Quốc gia -->
          <div class="md:col-span-6">
            <label for="modalQuocTich" class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Mã Quốc gia <span class="text-rose-500">*</span></span>
              {#if countryInfoHint}
                <span class="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1 whitespace-nowrap" title={countryInfoHint.tenQTEn || countryInfoHint.tenQT}>
                  <i class="fa-solid fa-earth-americas text-emerald-600"></i> {countryInfoHint.tenQTEn || countryInfoHint.tenQT}
                </span>
              {/if}
            </label>
            <input
              type="text"
              id="modalQuocTich"
              value={modalForm.quocTich}
              oninput={(e) => {
                const upper = (e.target as HTMLInputElement).value.toUpperCase();
                modalForm.quocTich = upper;
              }}
              class={`w-full px-3 py-2 text-sm uppercase font-bold rounded-lg outline-none transition ${!liveVal.quocTich.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
              placeholder="VNM, USA, RUS, KOR, DEU..."
              maxlength="3"
            >
            {#if !liveVal.quocTich.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.quocTich.error}
              </p>
            {:else if countryInfoHint}
              <p class="text-emerald-700 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-check"></i> Quốc gia: <strong>{countryInfoHint.tenQTEn || countryInfoHint.tenQT}</strong>
              </p>
            {/if}
          </div>

          <!-- Số phòng -->
          <div class="md:col-span-3">
            <label for="modalSoPhong" class="block font-semibold text-slate-700 mb-1">
              Số phòng <span class="text-rose-500">*</span>
            </label>
            <select
              id="modalSoPhong"
              bind:value={modalForm.soPhong}
              class={`w-full px-3 py-2 text-sm font-bold rounded-lg outline-none bg-white transition ${!liveVal.soPhong.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
            >
              {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
                <option value={String(num)}>Phòng {num}</option>
              {/each}
            </select>
            {#if !liveVal.soPhong.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.soPhong.error}
              </p>
            {/if}
          </div>

          <!-- Loại giấy tờ -->
          <div class="md:col-span-4">
            <label for="modalLoaiGiayTo" class="block font-semibold text-slate-700 mb-1">Loại giấy tờ</label>
            <select
              id="modalLoaiGiayTo"
              value={modalForm.loaiGiayTo}
              onchange={(e) => {
                const newType = (e.target as HTMLSelectElement).value;
                modalForm.loaiGiayTo = newType;
                modalForm.soGiayTo = cleanDocNumberInput(modalForm.soGiayTo, newType);
              }}
              class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition"
            >
              <option value="CCCD">CCCD (1)</option>
              <option value="CMND">CMND (2)</option>
              <option value="GPLX">GPLX (3)</option>
              <option value="Hộ chiếu">Hộ chiếu (4)</option>
              <option value="Căn Cước">Căn Cước (8)</option>
            </select>
          </div>

          <!-- Số giấy tờ -->
          <div class="md:col-span-8">
            <label for="modalSoGiayTo" class="block font-semibold text-slate-700 mb-1">
              Số giấy tờ {isNumericDocType(modalForm.loaiGiayTo) ? "(Chỉ nhập số, không chữ/ký tự đặc biệt)" : "(Chữ và số, không ký tự đặc biệt)"} <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="modalSoGiayTo"
              value={modalForm.soGiayTo}
              onkeydown={(e) => handleDocNumberKeyDown(e, modalForm.loaiGiayTo)}
              oninput={(e) => {
                const cleaned = cleanDocNumberInput((e.target as HTMLInputElement).value, modalForm.loaiGiayTo);
                (e.target as HTMLInputElement).value = cleaned;
                modalForm.soGiayTo = cleaned;
              }}
              class={`w-full px-3 py-2 text-sm font-mono font-bold text-indigo-700 rounded-lg outline-none transition ${!liveVal.soGiayTo.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
              placeholder={isNumericDocType(modalForm.loaiGiayTo) ? "Số CCCD (12 chữ số)" : "Số Hộ chiếu (6-12 ký tự chữ và số)"}
              maxlength="12"
            >
            {#if !liveVal.soGiayTo.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.soGiayTo.error}
              </p>
            {/if}
          </div>

          <!-- Ngày đến -->
          <div class="md:col-span-4">
            <label for="modalNgayDen" class="block font-semibold text-slate-700 mb-1">
              Ngày đến (DD/MM/YYYY) <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="modalNgayDen"
              bind:value={modalForm.ngayDen}
              class={`w-full px-3 py-2 text-xs font-mono rounded-lg outline-none transition ${!liveVal.ngayDen.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
              placeholder="16/09/2026 14:00:00"
            >
            {#if !liveVal.ngayDen.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.ngayDen.error}
              </p>
            {/if}
          </div>

          <!-- Ngày đi -->
          <div class="md:col-span-4">
            <label for="modalNgayDi" class="block font-semibold text-slate-700 mb-1">Ngày đi (DD/MM/YYYY)</label>
            <input
              type="text"
              id="modalNgayDi"
              bind:value={modalForm.ngayDi}
              class={`w-full px-3 py-2 text-xs font-mono rounded-lg outline-none transition ${!liveVal.ngayDi.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
              placeholder="18/09/2026 12:00:00"
            >
            {#if !liveVal.ngayDi.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.ngayDi.error}
              </p>
            {/if}
          </div>

          <!-- Thời hạn thị thực -->
          <div class="md:col-span-4">
            <label for="modalThoiHanTamTru" class="block font-semibold text-slate-700 mb-1">
              Thời hạn thị thực (Khách quốc tế)
            </label>
            <input
              type="text"
              id="modalThoiHanTamTru"
              bind:value={modalForm.thoiHanTamTru}
              class={`w-full px-3 py-2 text-xs font-mono rounded-lg outline-none transition ${!liveVal.thoiHanTamTru.valid ? 'border-2 border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'}`}
              placeholder="31/12/2026"
            >
            {#if !liveVal.thoiHanTamTru.valid}
              <p class="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                <i class="fa-solid fa-circle-exclamation"></i> {liveVal.thoiHanTamTru.error}
              </p>
            {/if}
          </div>

          <!-- Toàn bộ Địa chỉ đầy đủ -->
          <div class="md:col-span-12">
            <label for="modalDiaChiFull" class="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Địa chỉ đầy đủ (Cách nhau bởi dấu phẩy: [Chi tiết], [Phường/Xã], [Quận/Huyện], [Tỉnh/TP])</span>
              <span class="text-indigo-600 text-[11px] font-normal">Tự động phân tách và đồng bộ vào Sheet</span>
            </label>
            <textarea id="modalDiaChiFull" rows="2" bind:value={modalForm.diaChiFull} class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" placeholder="Ví dụ: Tổ Dân Phố 5, Krông Năng, Krông Năng, Đắk Lắk"></textarea>
          </div>
        </div>
      </div>

      <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
        <div class="text-[11px] text-slate-500">
          {#if !liveVal.allValid}
            <span class="text-rose-600 font-medium"><i class="fa-solid fa-triangle-exclamation"></i> Vui lòng sửa các trường báo đỏ trước khi lưu.</span>
          {:else}
            <span class="text-emerald-600 font-medium"><i class="fa-solid fa-check"></i> Thông tin đã hợp lệ, có thể lưu ngay.</span>
          {/if}
        </div>
        <div class="flex items-center gap-3">
          <button onclick={closeEditModal} class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-xs">
            Hủy bỏ
          </button>
          <button onclick={saveModal} class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow flex items-center gap-1.5">
            <i class="fa-solid fa-floppy-disk"></i> Lưu & Cập nhật Sheet
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Custom Delete Confirmation Modal -->
{#if deleteModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-base font-bold text-slate-900 mb-1">Xác nhận xóa khách lưu trú</h3>
            <p class="text-xs text-slate-600 leading-relaxed mb-3">
              Bạn có chắc chắn muốn xóa khách <strong class="text-slate-900 font-bold">"{deleteTargetName}"</strong> (dòng {deleteTargetSheetRow} trên Google Sheet) không?
            </p>
            <div class="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 font-medium flex items-center gap-2">
              <i class="fa-solid fa-circle-info shrink-0"></i>
              <span>Dòng này sẽ bị xóa hoàn toàn khỏi bảng và xóa vật lý trên Google Sheet.</span>
            </div>
          </div>
        </div>
      </div>
      <div class="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
        <button onclick={cancelDeleteRow} class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-xs cursor-pointer">
          Hủy bỏ
        </button>
        <button onclick={confirmDeleteRow} class="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-trash-can"></i> Xác nhận xóa
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notification -->
{#if toastVisible}
  <div class="fixed bottom-5 right-5 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 z-50 transition-all duration-300">
    <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
    <span><strong>{toastCode}</strong>: {toastMsg}</span>
  </div>
{/if}

<!-- Footer -->
<footer class="bg-slate-800 text-slate-300 border-t border-slate-700 py-3 text-center text-xs mt-auto">
  Module kiểm thử tích hợp KBTT API v1.4 &copy; 2026. Chuẩn hóa kiến trúc SvelteKit & TypeScript.
</footer>
