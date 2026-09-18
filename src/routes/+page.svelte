<script lang="ts">
import { onMount } from "svelte";

import {
	COUNTRY_OPTIONS,
	getCountryFullName,
	LOAI_GIAY_TO_OPTIONS,
	ROOM_OPTIONS,
} from "$lib/utils/format";

function getFullAddress(
	stay:
		| {
				dia_chi_chi_tiet?: string;
				phuong_xa?: string;
				quan_huyen?: string;
				tinh_thanh?: string;
		  }
		| null
		| undefined,
): string {
	if (!stay) return "-";
	const detail = (stay.dia_chi_chi_tiet || "").trim();
	const phuong = (stay.phuong_xa || "").trim();
	const quan = (stay.quan_huyen || "").trim();
	const tinh = (stay.tinh_thanh || "").trim();

	if (!detail) {
		const combined = [phuong, quan, tinh].filter(Boolean).join(", ");
		return combined || "-";
	}

	const lower = detail.toLowerCase();
	const hasTinh = Boolean(tinh && lower.includes(tinh.toLowerCase()));
	const hasQuan = Boolean(quan && lower.includes(quan.toLowerCase()));
	const hasPhuong = Boolean(phuong && lower.includes(phuong.toLowerCase()));

	if (hasTinh && (hasQuan || !quan) && (hasPhuong || !phuong)) {
		return detail;
	}

	const parts = [detail];
	if (phuong && !hasPhuong) parts.push(phuong);
	if (quan && !hasQuan) parts.push(quan);
	if (tinh && !hasTinh) parts.push(tinh);

	return parts.filter(Boolean).join(", ") || "-";
}

function getShortAddress(
	stay:
		| {
				dia_chi_chi_tiet?: string;
				phuong_xa?: string;
				quan_huyen?: string;
				tinh_thanh?: string;
		  }
		| null
		| undefined,
): string {
	if (!stay) return "-";
	if (stay.tinh_thanh?.trim()) {
		return stay.tinh_thanh.trim();
	}
	const full = getFullAddress(stay);
	if (full && full !== "-") {
		const lastPart = full.split(",").pop()?.trim();
		if (lastPart) return lastPart;
	}
	return "-";
}

type StayStatus =
	| "PENDING_VALIDATION"
	| "READY_TO_SYNC"
	| "NOT_CHECKED_IN"
	| "SYNCED_KBTT"
	| "CHECKED_IN"
	| "EXTENDED"
	| "CHECKED_OUT"
	| "ERROR"
	| "CANCELLED";

interface StayDetail {
	id: string;
	guest_id: string;
	so_phong: string;
	ngay_den: string;
	ngay_di_du_kien?: string;
	ngay_di_thuc_te?: string;
	thoi_han_thi_thuc?: string;
	ly_do_luu_tru?: number;
	status: StayStatus;
	ma_ho_so_kbtt?: string;
	ghi_chu?: string;
	source_sheet_tab?: string;
	source_sheet_row?: number;
	created_at?: string;
	updated_at?: string;
	loai_giay_to: string;
	so_giay_to: string;
	ho_ten: string;
	ngay_sinh?: string;
	gioi_tinh?: string;
	quoc_tich: string;
	dia_chi_chi_tiet?: string;
	phuong_xa?: string;
	quan_huyen?: string;
	tinh_thanh?: string;
}

interface KbttLog {
	id: string;
	stay_id?: string;
	api_endpoint: string;
	guest_name?: string;
	so_giay_to?: string;
	so_phong?: string;
	request_payload?: string;
	response_payload?: string;
	http_status?: number;
	code?: string;
	is_success: number;
	error_message?: string;
	created_at?: string;
}

interface Stats {
	totalGuests: number;
	totalStays: number;
	readyToSync: number;
	syncedKbtt: number;
	inHouse: number;
	checkedOut: number;
}

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

// Svelte 5 Runes State
let activeTab = $state<
	"register" | "inhouse" | "all_guests" | "audit" | "catalogs"
>("register");
let rawStays = $state<StayDetail[]>([]);
let auditLogs = $state<KbttLog[]>([]);
let stats = $state<Stats>({
	totalGuests: 0,
	totalStays: 0,
	readyToSync: 0,
	syncedKbtt: 0,
	inHouse: 0,
	checkedOut: 0,
});
let catalogs = $state<{
	quocTich: CatalogItem[];
	loaiGiayTo: CatalogItem[];
	lyDoCuTru: CatalogItem[];
}>({
	quocTich: [],
	loaiGiayTo: [],
	lyDoCuTru: [],
});

let loading = $state(false);
let searchTerm = $state("");
let filterRoom = $state("");
let debouncedSearchTerm = $state("");
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function onSearchInput() {
	const val = searchTerm.trim();
	if (!val) {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		debouncedSearchTerm = "";
		if (activeTab === "audit") loadAuditLogs();
		return;
	}
	if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
	searchDebounceTimer = setTimeout(() => {
		debouncedSearchTerm = val;
		if (activeTab === "audit") {
			loadAuditLogs();
		}
	}, 150);
}

function stripVietnameseAccents(str?: string | null): string {
	if (!str) return "";
	return String(str)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.trim();
}

let stays = $derived.by(() => {
	const term = stripVietnameseAccents(debouncedSearchTerm || searchTerm);
	const room = filterRoom.trim();

	return rawStays.filter((stay) => {
		if (
			activeTab === "inhouse" &&
			stay.status !== "SYNCED_KBTT" &&
			stay.status !== "EXTENDED" &&
			stay.status !== "CHECKED_IN"
		) {
			return false;
		}
		if (
			activeTab === "register" &&
			stay.status !== "READY_TO_SYNC" &&
			stay.status !== "PENDING_VALIDATION" &&
			stay.status !== "NOT_CHECKED_IN" &&
			stay.status !== "ERROR"
		) {
			return false;
		}
		if (room && String(stay.so_phong || "").trim() !== room) {
			return false;
		}
		if (!term) return true;
		const hoTen = stripVietnameseAccents(stay.ho_ten);
		const soGiayTo = stripVietnameseAccents(stay.so_giay_to);
		const soPhong = stripVietnameseAccents(String(stay.so_phong || ""));
		const quocTich = stripVietnameseAccents(stay.quoc_tich);
		const countryName = stripVietnameseAccents(
			getCountryFullName(stay.quoc_tich),
		);
		const diaChi = stripVietnameseAccents(stay.dia_chi_chi_tiet);
		const tinh = stripVietnameseAccents(stay.tinh_thanh);
		const phuong = stripVietnameseAccents(stay.phuong_xa);
		const quan = stripVietnameseAccents(stay.quan_huyen);

		return (
			hoTen.includes(term) ||
			soGiayTo.includes(term) ||
			soPhong.includes(term) ||
			quocTich.includes(term) ||
			countryName.includes(term) ||
			diaChi.includes(term) ||
			tinh.includes(term) ||
			phuong.includes(term) ||
			quan.includes(term)
		);
	});
});

interface GuestGroup {
	guest_id: string;
	ho_ten: string;
	so_giay_to: string;
	quoc_tich: string;
	gioi_tinh: string;
	stay_count: number;
	latestStay: StayDetail;
	stays: StayDetail[];
}

let expandedGuestIds = $state<Set<string>>(new Set());

function toggleGuestExpand(guestId: string) {
	const next = new Set(expandedGuestIds);
	if (next.has(guestId)) {
		next.delete(guestId);
	} else {
		next.add(guestId);
	}
	expandedGuestIds = next;
}

function expandAllGuests() {
	expandedGuestIds = new Set(
		guestGroups.filter((g) => g.stay_count > 1).map((g) => g.guest_id),
	);
}

function collapseAllGuests() {
	expandedGuestIds = new Set();
}

let guestGroups = $derived.by(() => {
	const map = new Map<string, GuestGroup>();
	for (const s of stays) {
		const gKey = s.guest_id || s.so_giay_to;
		if (!map.has(gKey)) {
			map.set(gKey, {
				guest_id: s.guest_id || s.id,
				ho_ten: s.ho_ten || "",
				so_giay_to: s.so_giay_to || "",
				quoc_tich: s.quoc_tich || "VNM",
				gioi_tinh: s.gioi_tinh || "M",
				stay_count: 0,
				latestStay: s,
				stays: [],
			});
		}
		const group = map.get(gKey);
		if (group) {
			group.stay_count += 1;
			group.stays.push(s);
		}
	}

	for (const group of map.values()) {
		group.stays.sort((a, b) =>
			(b.created_at || b.ngay_den || "").localeCompare(
				a.created_at || a.ngay_den || "",
			),
		);
		group.latestStay = group.stays[0];
	}

	return Array.from(map.values());
});

let { data } = $props<{ data?: { authenticated?: boolean } }>();

let currentEnv = $state<"dev" | "prod">("dev");
let isProdFixed = $state(false);
let isAuthenticated = $state(false);
let authUsername = $state("root");
let authPassword = $state("");
let authError = $state("");
let authLoading = $state(false);

$effect(() => {
	if (data?.authenticated) {
		isAuthenticated = true;
	}
});

let filterQuocTich = $state("");

function copyCode(code?: string, name?: string) {
	if (!code) return;
	if (typeof navigator !== "undefined" && navigator.clipboard) {
		navigator.clipboard.writeText(code);
	}
	showToast(`Đã sao chép: ${code} (${name || ""})`, "info");
}

let notification = $state<{
	message: string;
	type: "success" | "error" | "info";
} | null>(null);

// Modal States
let showEditModal = $state(false);
let editStay = $state<StayDetail | null>(null);
let editErrors = $state<Record<string, string>>({});

let showExtendModal = $state(false);
let extendTargetStay = $state<StayDetail | null>(null);
let extendNewDate = $state("");

let showCheckoutModal = $state(false);
let checkoutTargetStay = $state<StayDetail | null>(null);

let showReRegisterModal = $state(false);
let reRegisterTargetStay = $state<StayDetail | null>(null);
let reRegisterRoom = $state("1");
let reRegisterArrivalDate = $state("");
let reRegisterDepartureDate = $state("");

let showDeleteModal = $state(false);
let deleteTargetStay = $state<StayDetail | null>(null);
let deletingIds = $state<Set<string>>(new Set());

let showPayloadModal = $state(false);
let selectedLog = $state<KbttLog | null>(null);

let showStatusModal = $state(false);
let statusTargetStay = $state<StayDetail | null>(null);
let selectedNewStatus = $state<StayStatus>("SYNCED_KBTT");

let showCustomConfirmModal = $state(false);
let confirmDialogState = $state<{
	title: string;
	message: string;
	subMessage?: string;
	confirmText: string;
	cancelText: string;
	icon?: string;
	isDanger?: boolean;
	onConfirm: () => Promise<void> | void;
} | null>(null);

let showAddModal = $state(false);
let newGuestForm = $state({
	ho_ten: "",
	so_giay_to: "",
	quoc_tich: "VNM",
	loai_giay_to: "1",
	ngay_sinh: "01/01/2000",
	gioi_tinh: "M",
	so_phong: "1",
	ngay_den: "",
	ngay_di_du_kien: "",
	thoi_han_thi_thuc: "",
	dia_chi_chi_tiet: "",
	phuong_xa: "",
	quan_huyen: "",
	tinh_thanh: "",
	ghi_chu: "",
});

const CACHE_KEY_PREFIX = "kbtt_stays_cache_v2_";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry<T> {
	timestamp: number;
	data: T;
}

function getLocalCache<T>(key: string): T | null {
	if (typeof window === "undefined" || !window.localStorage) return null;
	try {
		const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
		if (!raw) return null;
		const parsed: CacheEntry<T> = JSON.parse(raw);
		if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
			return parsed.data;
		}
		localStorage.removeItem(CACHE_KEY_PREFIX + key);
		return null;
	} catch {
		return null;
	}
}

function setLocalCache<T>(key: string, data: T) {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		const entry: CacheEntry<T> = {
			timestamp: Date.now(),
			data,
		};
		localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
	} catch {}
}

function clearLocalCache() {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		const toRemove: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k?.startsWith(CACHE_KEY_PREFIX)) {
				toRemove.push(k);
			}
		}
		for (const k of toRemove) {
			localStorage.removeItem(k);
		}
	} catch {}
}

function showToast(
	message: string,
	type: "success" | "error" | "info" = "info",
) {
	notification = { message, type };
	setTimeout(() => {
		if (notification?.message === message) notification = null;
	}, 4000);
}

let statsInFlight: Promise<void> | null = null;
let lastStatsFetchTime = 0;
const CLIENT_STATS_CACHE_TTL_MS = 15_000; // 15s

async function loadStats(force = false) {
	const now = Date.now();
	if (!force && stats.totalStays > 0 && now - lastStatsFetchTime < CLIENT_STATS_CACHE_TTL_MS) {
		return;
	}
	if (statsInFlight) return statsInFlight;
	statsInFlight = (async () => {
		try {
			const res = await fetch(`/api/stats${force ? "?force=true" : ""}`);
			const data = await res.json();
			if (data.success && data.data) {
				stats = data.data;
				lastStatsFetchTime = Date.now();
			}
		} catch {
		} finally {
			statsInFlight = null;
		}
	})();
	return statsInFlight;
}

let staysInFlight: Promise<void> | null = null;
async function loadStays(_force?: boolean) {
	if (staysInFlight) return staysInFlight;
	staysInFlight = (async () => {
		try {
			if (rawStays.length === 0) {
				loading = true;
			}
			const url = new URL("/api/stays", window.location.origin);
			if (activeTab === "register") {
				url.searchParams.set("status", "READY_TO_SYNC");
			} else if (activeTab === "inhouse") {
				url.searchParams.set("status", "IN_HOUSE");
			}
			const res = await fetch(url.toString());
			const data = await res.json();
			if (data.success) {
				rawStays = data.data || [];
			}
		} catch (err) {
			showToast("Không thể tải danh sách lưu trú từ CSDL", "error");
		} finally {
			loading = false;
			staysInFlight = null;
		}
	})();
	return staysInFlight;
}

async function refreshDashboard(forceStats = false) {
	await Promise.all([loadStays(), loadStats(forceStats)]);
}

function setTab(tab: typeof activeTab) {
	activeTab = tab;
	if (tab === "audit") {
		loadAuditLogs();
	} else if (tab === "register" || tab === "inhouse" || tab === "all_guests") {
		loadStays();
		loadStats();
	} else if (tab === "catalogs") {
		loadCatalogs();
	}
}

let pullInFlight: Promise<void> | null = null;
async function pullFromGoogleSheets(options?: { silent?: boolean }) {
	if (pullInFlight) {
		if (!options?.silent) {
			showToast("Tiến trình đồng bộ đang chạy, vui lòng chờ...", "info");
		}
		return pullInFlight;
	}

	loading = true;
	if (!options?.silent) {
		showToast("Đang đồng bộ dữ liệu mới nhất vào CSDL...", "info");
	}

	pullInFlight = (async () => {
		try {
			const res = await fetch("/api/sheets/pull", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			const data = await res.json();
			if (data.success) {
				const count =
					data.ingested !== undefined || data.updated !== undefined
						? (data.ingested || 0) + (data.updated || 0)
						: data.rows?.length || 0;
				const tabMsg = data.tabName ? ` [Tab: ${data.tabName}]` : "";
				showToast(
					`✓ Đã đồng bộ thành công ${count} khách vào CSDL!${tabMsg}`,
					"success",
				);
			} else if (!options?.silent) {
				showToast(
					`Lỗi kéo dữ liệu: ${data.message || "Không có dữ liệu mới"}`,
					"error",
				);
			}
		} catch (err) {
			if (!options?.silent) {
				showToast("Lỗi khi kết nối đồng bộ dữ liệu", "error");
			}
		} finally {
			clearLocalCache();
			await refreshDashboard(true);
			loading = false;
			pullInFlight = null;
		}
	})();

	return pullInFlight;
}

async function loadAuditLogs() {
	try {
		const url = new URL("/api/stays/audit", window.location.origin);
		if (searchTerm) url.searchParams.set("search", searchTerm);
		const res = await fetch(url.toString());
		const data = await res.json();
		if (data.success) {
			auditLogs = data.data;
		}
	} catch {}
}

async function checkAuth() {
	try {
		const res = await fetch("/api/auth/login");
		const data = await res.json();
		isAuthenticated = Boolean(data.authenticated);
	} catch {
		isAuthenticated = false;
	}
}

async function handleLogin() {
	if (!authPassword.trim()) {
		authError = "Vui lòng nhập mật khẩu truy cập";
		return;
	}
	authLoading = true;
	authError = "";
	try {
		const res = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: authUsername.trim() || "root",
				password: authPassword.trim(),
			}),
		});
		const data = await res.json();
		if (data.success) {
			isAuthenticated = true;
			authPassword = "";
			showToast("Đăng nhập thành công!", "success");
			await loadEnv();
			loadCatalogs();
			await loadStays();
			loadStats();
		} else {
			authError = data.message || "Tài khoản hoặc mật khẩu không chính xác";
		}
	} catch {
		authError = "Lỗi kết nối máy chủ";
	} finally {
		authLoading = false;
	}
}

async function handleLogout() {
	try {
		await fetch("/api/auth/login", { method: "DELETE" });
		isAuthenticated = false;
		showToast("Đã đăng xuất khỏi hệ thống", "info");
	} catch {}
}

async function loadCatalogs() {
	try {
		const res = await fetch("/api/catalogs");
		const data = await res.json();
		if (data.catalogs) {
			catalogs = data.catalogs;
		} else if (data.data) {
			catalogs = data.data;
		}
	} catch {}
}

async function loadEnv() {
	try {
		const res = await fetch("/api/env");
		const data = await res.json();
		if (data) {
			currentEnv = data.env;
			isProdFixed = !!data.isProdFixed;
		}
	} catch {}
}

async function switchEnv(env: "dev" | "prod") {
	if (isProdFixed) {
		showToast("Môi trường PROD đã cố định trên hệ thống", "info");
		return;
	}
	try {
		const res = await fetch("/api/env", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ env }),
		});
		const data = await res.json();
		if (data.success) {
			currentEnv = env;
			showToast(`Đã chuyển sang môi trường: ${env.toUpperCase()}`, "info");
		}
	} catch {}
}

// Single Register
async function registerStay(stayId: string) {
	const stay = rawStays.find((s) => s.id === stayId);
	if (stay) {
		const val = validateStayDetail(stay);
		if (val.hasErrors) {
			const errorMsgs = Object.values(val.errors).join(", ");
			showToast(
				`⛔ Không thể gửi: Dữ liệu khách "${stay.ho_ten || stayId}" chưa hợp lệ (${errorMsgs}). Vui lòng sửa trước khi khai báo!`,
				"error",
			);
			openEdit(stay);
			return;
		}
	}

	try {
		showToast("Đang gửi khai báo lên Cổng KBTT Bộ Công An...", "info");
		const res = await fetch("/api/stays/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stayId }),
		});
		const data = await res.json();
		if (data.success) {
			clearLocalCache();
			showToast("✓ Đăng ký lưu trú thành công!", "success");
			const maHoSo = data.data?.maHoSo || data.maHoSo;
			rawStays = rawStays.map((s) =>
				s.id === stayId
					? {
							...s,
							status: "SYNCED_KBTT",
							ma_ho_so_kbtt: maHoSo || s.ma_ho_so_kbtt,
						}
					: s,
			);
			if (activeTab === "register") {
				rawStays = rawStays.filter((s) => s.id !== stayId);
			}
			setLocalCache(`stays_master_${activeTab}`, rawStays);
			loadStats();
		} else {
			showToast(`Lỗi: ${data.message || "Đăng ký thất bại"}`, "error");
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		showToast(`Lỗi kết nối: ${msg}`, "error");
	}
}

// Batch Register
async function registerAllReady() {
	const readyStays = rawStays.filter((s) => s.status === "READY_TO_SYNC");
	if (readyStays.length === 0) {
		showToast("Không có khách nào đang chờ đăng ký", "info");
		return;
	}

	const invalidStays = readyStays.filter(
		(s) => validateStayDetail(s).hasErrors,
	);
	if (invalidStays.length > 0) {
		showToast(
			`⛔ Không thể gửi hàng loạt: Có ${invalidStays.length} khách chưa hợp lệ (ví dụ: "${invalidStays[0].ho_ten}"). Vui lòng chỉnh sửa trước khi khai báo!`,
			"error",
		);
		openEdit(invalidStays[0]);
		return;
	}

	try {
		showToast(
			"Đang gửi đăng ký hàng loạt cho tất cả khách sẵn sàng...",
			"info",
		);
		const res = await fetch("/api/stays/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const data = await res.json();
		if (data.success) {
			clearLocalCache();
			showToast(data.message || "Đăng ký hàng loạt thành công!", "success");
		} else {
			showToast(data.message || "Có lỗi trong quá trình đăng ký", "error");
		}
		await loadStays(true);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		showToast(`Lỗi kết nối: ${msg}`, "error");
	}
}

// Extend Stay
function openExtendModal(stay: StayDetail) {
	if (stay.status !== "SYNCED_KBTT" && stay.status !== "EXTENDED") {
		showToast(
			"Chỉ có thể gia hạn cho khách đã khai báo lưu trú thành công!",
			"error",
		);
		return;
	}
	extendTargetStay = stay;
	extendNewDate = stay.ngay_di_du_kien || "";
	showExtendModal = true;
}

async function submitExtend() {
	if (!extendTargetStay || !extendNewDate) return;
	const targetId = extendTargetStay.id;
	const newDate = extendNewDate;
	showExtendModal = false;

	clearLocalCache();
	// Optimistically update
	rawStays = rawStays.map((s) =>
		s.id === targetId
			? { ...s, ngay_di_du_kien: newDate, status: "EXTENDED" }
			: s,
	);
	showToast("Đang gia hạn lưu trú...", "info");

	try {
		const res = await fetch("/api/stays/extend", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				stayId: targetId,
				newNgayDi: newDate,
			}),
		});
		const data = await res.json();
		if (data.success) {
			showToast("✓ Gia hạn thành công!", "success");
			clearLocalCache();
			await loadStays(true);
			await loadStats(true);
		} else {
			showToast(`Lỗi: ${data.message || data.error}`, "error");
			clearLocalCache();
			await loadStays(true);
		}
	} catch {
		showToast("Lỗi khi gia hạn", "error");
		clearLocalCache();
		await loadStays(true);
	}
}

// Checkout
function openCheckoutModal(stay: StayDetail) {
	if (stay.status === "CHECKED_OUT") {
		showToast("Khách này đã trả phòng trước đó!", "info");
		return;
	}
	checkoutTargetStay = stay;
	showCheckoutModal = true;
}

async function submitCheckout() {
	if (!checkoutTargetStay) return;
	const targetId = checkoutTargetStay.id;
	showCheckoutModal = false;

	clearLocalCache();
	// Optimistically update
	if (activeTab === "inhouse" || activeTab === "register") {
		rawStays = rawStays.filter((s) => s.id !== targetId);
	} else {
		rawStays = rawStays.map((s) =>
			s.id === targetId ? { ...s, status: "CHECKED_OUT" } : s,
		);
	}
	showToast("Đang xử lý checkout...", "info");

	try {
		const res = await fetch("/api/stays/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stayId: targetId }),
		});
		const data = await res.json();
		if (data.success) {
			showToast("✓ Checkout thành công!", "success");
			clearLocalCache();
			await loadStays(true);
			await loadStats(true);
		} else {
			showToast(`Lỗi: ${data.message || data.error}`, "error");
			clearLocalCache();
			await loadStays(true);
		}
	} catch {
		showToast("Lỗi khi checkout", "error");
		clearLocalCache();
		await loadStays(true);
	}
}

// Overwrite / Change Stay Status in DB
function openStatusModal(stay: StayDetail) {
	statusTargetStay = stay;
	selectedNewStatus = stay.status;
	showStatusModal = true;
}

async function submitStatusOverride() {
	if (!statusTargetStay) return;
	const targetId = statusTargetStay.id;
	const newStatus = selectedNewStatus;
	showStatusModal = false;

	clearLocalCache();
	// Optimistically update
	rawStays = rawStays.map((s) =>
		s.id === targetId ? { ...s, status: newStatus } : s,
	);
	showToast("Đang cập nhật trạng thái...", "info");

	try {
		const res = await fetch(`/api/stays/${targetId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: newStatus }),
		});
		const data = await res.json();
		if (data.success) {
			showToast(`✓ Đã cập nhật trạng thái thành "${newStatus}"!`, "success");
			clearLocalCache();
			await loadStays(true);
			await loadStats(true);
		} else {
			showToast(`Lỗi: ${data.message || data.error}`, "error");
			clearLocalCache();
			await loadStays(true);
		}
	} catch {
		showToast("Lỗi khi cập nhật trạng thái", "error");
		clearLocalCache();
		await loadStays(true);
	}
}

// Re-Register Stay (Lượt mới / Khách quay lại / Tự động gửi BCA ngay)
function openReRegisterModal(stay: StayDetail) {
	reRegisterTargetStay = stay;
	reRegisterRoom = stay.so_phong || "1";

	const now = new Date(Date.now() + 7 * 3600 * 1000);
	const nextDay = new Date(now.getTime() + 24 * 3600 * 1000);

	const pad = (n: number) => String(n).padStart(2, "0");
	const nowStr = `${pad(now.getUTCDate())}/${pad(now.getUTCMonth() + 1)}/${now.getUTCFullYear()} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
	const nextDayDateInput = `${nextDay.getUTCFullYear()}-${pad(nextDay.getUTCMonth() + 1)}-${pad(nextDay.getUTCDate())}`;

	reRegisterArrivalDate = nowStr;
	reRegisterDepartureDate = nextDayDateInput;
	showReRegisterModal = true;
}

async function submitReRegister() {
	if (!reRegisterTargetStay) return;
	const targetId = reRegisterTargetStay.id;
	showReRegisterModal = false;
	showToast("⚡ Đang tạo lượt lưu trú mới và gửi báo cáo Công An...", "info");

	try {
		const res = await fetch("/api/stays/re-register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				stayId: targetId,
				so_phong: reRegisterRoom,
				ngay_den: reRegisterArrivalDate,
				ngay_di_du_kien: reRegisterDepartureDate,
				autoSendToKbtt: true,
			}),
		});
		const data = await res.json();
		clearLocalCache();
		if (data.success) {
			showToast(
				data.message || "✓ Đã khai báo lưu trú thành công lên Bộ Công An!",
				"success",
			);
			setTab("inhouse");
		} else {
			showToast(
				`Thông báo: ${data.message || data.error || "Gửi BCA chưa thành công"}`,
				"error",
			);
			setTab("register");
		}
	} catch {
		showToast("Lỗi kết nối khi gửi khai báo lại", "error");
		await loadStays(true);
	}
}

// Delete Stay with Strikethrough and Non-blocking Async Execution
function openDeleteModal(stay: StayDetail) {
	deleteTargetStay = stay;
	showDeleteModal = true;
}

async function submitDelete() {
	if (!deleteTargetStay) return;
	const deletedId = deleteTargetStay.id;
	showDeleteModal = false;

	// Immediate visual feedback: strikethrough row & disable function buttons
	deletingIds = new Set([...deletingIds, deletedId]);
	showToast("Đang xóa bản ghi khỏi CSDL...", "info");

	try {
		const res = await fetch(`/api/stays/${deletedId}`, {
			method: "DELETE",
		});
		const data = await res.json();
		if (data.success) {
			showToast("✓ Đã xóa lượt lưu trú thành công", "success");
			rawStays = rawStays.filter((s) => s.id !== deletedId);
			setLocalCache(`stays_master_${activeTab}`, rawStays);
			loadStats();
		} else {
			showToast(`Lỗi xóa: ${data.message}`, "error");
		}
	} catch {
		showToast("Lỗi kết nối khi xóa", "error");
	} finally {
		const next = new Set(deletingIds);
		next.delete(deletedId);
		deletingIds = next;
	}
}

// Date Formatting & Validation Utilities (aligned with sheet-works)
function formatDateDisplay(val?: string | null): string {
	if (!val) return "-";
	const str = String(val).trim();
	const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (dmy) {
		const d = dmy[1].padStart(2, "0");
		const m = dmy[2].padStart(2, "0");
		const y = dmy[3];
		return `${d}/${m}/${y}`;
	}
	const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
	if (ymd) {
		const y = ymd[1];
		const m = ymd[2].padStart(2, "0");
		const d = ymd[3].padStart(2, "0");
		return `${d}/${m}/${y}`;
	}
	return str;
}

function formatDateTimeDisplay(dt?: string | null): string {
	if (!dt) return "-";
	const str = String(dt).trim();
	const dmy = str.match(
		/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
	);
	if (dmy) {
		const d = dmy[1].padStart(2, "0");
		const m = dmy[2].padStart(2, "0");
		const y = dmy[3];
		const hr = (dmy[4] || "00").padStart(2, "0");
		const min = (dmy[5] || "00").padStart(2, "0");
		return `${d}/${m}/${y} ${hr}:${min}`;
	}
	const ymd = str.match(
		/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
	);
	if (ymd) {
		const y = ymd[1];
		const m = ymd[2].padStart(2, "0");
		const d = ymd[3].padStart(2, "0");
		const hr = (ymd[4] || "00").padStart(2, "0");
		const min = (ymd[5] || "00").padStart(2, "0");
		return `${d}/${m}/${y} ${hr}:${min}`;
	}
	return str.replace("T", " ").substring(0, 16);
}

function formatDepartureDisplay(dt?: string | null): string {
	if (!dt) return "-";
	const str = String(dt).trim();
	const dmy = str.match(
		/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
	);
	if (dmy) {
		const d = dmy[1].padStart(2, "0");
		const m = dmy[2].padStart(2, "0");
		const y = dmy[3];
		const hasExplicitTime =
			dmy[4] !== undefined &&
			(dmy[4] !== "00" || (dmy[5] !== undefined && dmy[5] !== "00"));
		const hr = (hasExplicitTime ? dmy[4] : "12").padStart(2, "0");
		const min = (hasExplicitTime ? dmy[5] || "00" : "00").padStart(2, "0");
		return `${d}/${m}/${y} ${hr}:${min}`;
	}
	const ymd = str.match(
		/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
	);
	if (ymd) {
		const y = ymd[1];
		const m = ymd[2].padStart(2, "0");
		const d = ymd[3].padStart(2, "0");
		const hasExplicitTime =
			ymd[4] !== undefined &&
			(ymd[4] !== "00" || (ymd[5] !== undefined && ymd[5] !== "00"));
		const hr = (hasExplicitTime ? ymd[4] : "12").padStart(2, "0");
		const min = (hasExplicitTime ? ymd[5] || "00" : "00").padStart(2, "0");
		return `${d}/${m}/${y} ${hr}:${min}`;
	}
	return str.replace("T", " ").substring(0, 16);
}

function validateDateString(val?: string | null): boolean {
	if (!val) return false;
	const str = String(val).trim();
	const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (dmy) {
		const d = parseInt(dmy[1], 10);
		const m = parseInt(dmy[2], 10);
		const y = parseInt(dmy[3], 10);
		return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100;
	}
	const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
	if (ymd) {
		const y = parseInt(ymd[1], 10);
		const m = parseInt(ymd[2], 10);
		const d = parseInt(ymd[3], 10);
		return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100;
	}
	return false;
}

function validateArrivalDate(val?: string | null): {
	valid: boolean;
	error?: string;
} {
	if (!val || !String(val).trim()) {
		return { valid: false, error: "Vui lòng nhập ngày đến" };
	}
	const str = String(val).trim();
	const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);

	let day: number, month: number, year: number;
	if (dmy) {
		day = parseInt(dmy[1], 10);
		month = parseInt(dmy[2], 10);
		year = parseInt(dmy[3], 10);
	} else if (ymd) {
		year = parseInt(ymd[1], 10);
		month = parseInt(ymd[2], 10);
		day = parseInt(ymd[3], 10);
	} else {
		return {
			valid: false,
			error: "Ngày đến phải theo định dạng DD/MM/YYYY HH:mm:ss",
		};
	}

	const arrivalDay = new Date(Date.UTC(year, month - 1, day));
	const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
	const currentDay = new Date(
		Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()),
	);
	const yesterday = new Date(
		Date.UTC(
			vnNow.getUTCFullYear(),
			vnNow.getUTCMonth(),
			vnNow.getUTCDate() - 1,
		),
	);

	if (
		arrivalDay.getTime() === currentDay.getTime() ||
		arrivalDay.getTime() === yesterday.getTime()
	) {
		return { valid: true };
	}
	if (arrivalDay.getTime() < yesterday.getTime()) {
		return {
			valid: false,
			error:
				"Ngày đến không được quá 1 ngày trước hôm nay (chỉ chấp nhận hôm nay hoặc hôm qua)",
		};
	}
	if (arrivalDay.getTime() > currentDay.getTime()) {
		return { valid: false, error: "Ngày đến không được ở tương lai" };
	}
	return { valid: true };
}

function validateDepartureDate(val?: string | null): {
	valid: boolean;
	error?: string;
} {
	if (!val || !String(val).trim()) return { valid: true };
	const str = String(val).trim();
	const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	const ymd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);

	if (!dmy && !ymd) {
		return {
			valid: false,
			error: "Ngày đi phải theo định dạng DD/MM/YYYY HH:mm:ss",
		};
	}
	return { valid: true };
}

function formatLoaiGiayTo(raw?: string | number): string {
	const str = String(raw || "")
		.toLowerCase()
		.trim();
	if (
		str === "4" ||
		str.includes("hộ chiếu") ||
		str.includes("passport") ||
		str.includes("ho_chieu")
	) {
		return "Hộ chiếu (4)";
	}
	if (
		str === "8" ||
		str.includes("thẻ căn cước") ||
		str === "căn cước" ||
		str.includes("can_cuoc")
	) {
		return "Thẻ Căn Cước (8)";
	}
	if (str === "2" || str.includes("cmnd")) {
		return "CMND (2)";
	}
	if (str === "3" || str.includes("lái xe") || str.includes("gplx")) {
		return "GPLX (3)";
	}
	return "CCCD (1)";
}

function isNumericDocType(docTypeRaw: unknown): boolean {
	const clean = String(docTypeRaw || "").toLowerCase();
	return (
		clean.includes("cccd") ||
		clean.includes("cmnd") ||
		clean.includes("căn cước") ||
		clean.includes("lái xe") ||
		clean.includes("gplx") ||
		clean === "1" ||
		clean === "2" ||
		clean === "3" ||
		clean === "8"
	);
}

function normalizeLoaiGiayTo(val?: string | number): string {
	const clean = String(val || "")
		.trim()
		.toLowerCase();
	if (
		clean === "4" ||
		clean.includes("hộ chiếu") ||
		clean.includes("passport") ||
		clean.includes("ho_chieu")
	)
		return "4";
	if (
		clean === "8" ||
		clean.includes("thẻ căn cước") ||
		clean === "căn cước" ||
		clean.includes("can_cuoc")
	)
		return "8";
	if (clean === "2" || clean.includes("cmnd")) return "2";
	if (clean === "3" || clean.includes("lái xe") || clean.includes("gplx"))
		return "3";
	return "1";
}

function normalizeQuocTich(val?: string): string {
	const clean = String(val || "")
		.trim()
		.toUpperCase();
	if (
		!clean ||
		clean === "VN" ||
		clean === "VIỆT NAM" ||
		clean === "VIET NAM" ||
		clean === "VIETNAM"
	)
		return "VNM";
	const info = getCountryInfo(clean);
	return info ? info.maQT : clean.length === 3 ? clean : "VNM";
}

function normalizeSoPhong(val?: string): string {
	const clean = String(val || "").trim();
	if (ROOM_OPTIONS.includes(clean)) return clean;
	const num = parseInt(clean, 10);
	if (!Number.isNaN(num) && num >= 1 && num <= 9) return String(num);
	return "1";
}

function cleanDocNumberInput(val: string, docTypeRaw: unknown): string {
	if (!val) return "";
	if (isNumericDocType(docTypeRaw)) {
		return val.replace(/\D/g, "").slice(0, 12);
	}
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
		if (!/^[0-9]$/.test(e.key)) {
			e.preventDefault();
		}
	} else {
		if (!/^[a-zA-Z0-9]$/.test(e.key)) {
			e.preventDefault();
		}
	}
}

function getCountryInfo(
	codeRaw: string,
): { maQT: string; tenQT: string; tenQTEn: string } | null {
	const code = String(codeRaw || "")
		.trim()
		.toUpperCase();
	if (!code) return null;
	const found = COUNTRY_OPTIONS.find((item) => item.maQT === code);
	if (found) {
		return {
			maQT: found.maQT,
			tenQT: found.name,
			tenQTEn: found.name,
		};
	}
	return null;
}

function isValidAlpha3Country(code: string): boolean {
	const clean = String(code || "")
		.trim()
		.toUpperCase();
	if (!clean) return false;
	if (getCountryInfo(clean)) return true;
	return clean.length === 3 && /^[A-Z]{3}$/.test(clean);
}

function onEditQuocTichChange() {
	if (!editStay) return;
	const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM", "VIETNAM"].includes(
		editStay.quoc_tich?.trim().toUpperCase() || "",
	);
	if (!isVN && editStay.loai_giay_to !== "4") {
		editStay.loai_giay_to = "4";
	} else if (isVN && editStay.loai_giay_to === "4") {
		editStay.loai_giay_to = "1";
	}
}

function onAddQuocTichChange() {
	const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM", "VIETNAM"].includes(
		newGuestForm.quoc_tich?.trim().toUpperCase() || "",
	);
	if (!isVN && newGuestForm.loai_giay_to !== "4") {
		newGuestForm.loai_giay_to = "4";
	} else if (isVN && newGuestForm.loai_giay_to === "4") {
		newGuestForm.loai_giay_to = "1";
	}
}

interface ValidationErrors {
	ho_ten?: string;
	so_phong?: string;
	so_giay_to?: string;
	quoc_tich?: string;
	ngay_sinh?: string;
	ngay_den?: string;
	ngay_di_du_kien?: string;
	thoi_han_thi_thuc?: string;
}

function validateStayDetail(stay: StayDetail): {
	hasErrors: boolean;
	errors: ValidationErrors;
} {
	const errors: ValidationErrors = {};
	const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM", "VIETNAM"].includes(
		(stay.quoc_tich || "").trim().toUpperCase(),
	);

	if (!stay.ho_ten?.trim()) {
		errors.ho_ten = "Thiếu họ tên";
	}

	const roomStr = String(stay.so_phong || "").trim();
	if (!roomStr || !ROOM_OPTIONS.includes(roomStr)) {
		errors.so_phong = "Phòng không hợp lệ (1-9)";
	}

	const docNum = String(stay.so_giay_to || "").trim();
	const docType = String(stay.loai_giay_to || "").toLowerCase();
	if (!docNum) {
		errors.so_giay_to = "Thiếu số giấy tờ";
	} else if (
		!isVN ||
		docType === "4" ||
		docType.includes("hộ chiếu") ||
		docType.includes("passport")
	) {
		const clean = docNum.replace(/[^a-zA-Z0-9]/g, "");
		if (clean.length < 6 || clean.length > 12) {
			errors.so_giay_to = "Hộ chiếu phải từ 6-12 ký tự";
		}
	} else if (
		docType === "1" ||
		docType.includes("cccd") ||
		docType === "8" ||
		docType.includes("căn cước") ||
		(isVN &&
			docType !== "4" &&
			!docType.includes("hộ chiếu") &&
			!docType.includes("cmnd") &&
			!docType.includes("3") &&
			!docType.includes("lái xe"))
	) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 12) {
			errors.so_giay_to = "Số CCCD phải đủ 12 số";
		}
	} else if (docType === "2" || docType.includes("cmnd")) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 9 && digits.length !== 12) {
			errors.so_giay_to = "Số CMND phải 9 hoặc 12 số";
		}
	} else if (
		docType === "3" ||
		docType.includes("lái xe") ||
		docType.includes("gplx")
	) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 12) {
			errors.so_giay_to = "Số GPLX phải đủ 12 số";
		}
	}

	const qt = (stay.quoc_tich || "").trim().toUpperCase();
	if (!qt) {
		errors.quoc_tich = "Thiếu quốc tịch";
	} else if (!isValidAlpha3Country(qt)) {
		errors.quoc_tich = `Mã QT sai: "${qt}"`;
	}

	if (stay.ngay_sinh?.trim() && !validateDateString(stay.ngay_sinh)) {
		errors.ngay_sinh = "Ngày sinh sai định dạng (DD/MM/YYYY)";
	}

	const arrCheck = validateArrivalDate(stay.ngay_den);
	if (!arrCheck.valid) {
		errors.ngay_den = arrCheck.error || "Ngày đến không hợp lệ";
	}

	if (stay.ngay_di_du_kien?.trim()) {
		const depCheck = validateDepartureDate(stay.ngay_di_du_kien);
		if (!depCheck.valid) {
			errors.ngay_di_du_kien = depCheck.error || "Ngày đi không hợp lệ";
		}
	}

	if (!isVN) {
		const visa = (stay.thoi_han_thi_thuc || "").trim();
		if (!visa) {
			errors.thoi_han_thi_thuc =
				"Thiếu thời hạn thị thực (bắt buộc đối với khách quốc tế)";
		} else if (!validateDateString(visa)) {
			errors.thoi_han_thi_thuc = "Thị thực sai định dạng (DD/MM/YYYY)";
		}
	}

	return {
		hasErrors: Object.keys(errors).length > 0,
		errors,
	};
}

// Edit Stay with Instant Optimistic Update
function openEdit(stay: StayDetail) {
	const fullAddr = getFullAddress(stay);

	editStay = {
		...stay,
		dia_chi_chi_tiet: fullAddr === "-" ? "" : fullAddr,
		so_phong: normalizeSoPhong(stay.so_phong),
		loai_giay_to: normalizeLoaiGiayTo(stay.loai_giay_to),
		quoc_tich: normalizeQuocTich(stay.quoc_tich),
		thoi_han_thi_thuc: stay.thoi_han_thi_thuc
			? formatDateDisplay(stay.thoi_han_thi_thuc)
			: "",
		ngay_sinh: formatDateDisplay(stay.ngay_sinh),
		ngay_den: formatDateTimeDisplay(stay.ngay_den),
		ngay_di_du_kien: stay.ngay_di_du_kien
			? formatDepartureDisplay(stay.ngay_di_du_kien)
			: "",
	};
	editErrors = {};
	showEditModal = true;
}

let editLiveVal = $derived.by(() => {
	if (!editStay)
		return { allValid: false, errors: {} as Record<string, string> };
	const errors: Record<string, string> = {};

	const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM", "VIETNAM"].includes(
		editStay.quoc_tich?.trim().toUpperCase() || "",
	);

	if (!editStay.ho_ten?.trim()) {
		errors.ho_ten = "Họ tên không được để trống";
	}

	const roomStr = String(editStay.so_phong || "").trim();
	if (!roomStr || !ROOM_OPTIONS.includes(roomStr)) {
		errors.so_phong = "Vui lòng chọn số phòng từ 1 đến 9";
	}

	const docNum = (editStay.so_giay_to || "").trim();
	const docType = String(editStay.loai_giay_to || "").toLowerCase();
	if (!docNum) {
		errors.so_giay_to = "Vui lòng nhập số giấy tờ";
	} else if (
		docType === "1" ||
		docType.includes("cccd") ||
		docType === "8" ||
		docType.includes("căn cước") ||
		(isVN &&
			docType !== "4" &&
			!docType.includes("hộ chiếu") &&
			!docType.includes("cmnd") &&
			!docType.includes("3") &&
			!docType.includes("lái xe"))
	) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 12) {
			errors.so_giay_to = "Số CCCD/Căn cước phải đủ 12 chữ số";
		}
	} else if (docType === "2" || docType.includes("cmnd")) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 9 && digits.length !== 12) {
			errors.so_giay_to = "Số CMND phải 9 hoặc 12 chữ số";
		}
	} else if (
		docType === "3" ||
		docType.includes("lái xe") ||
		docType.includes("gplx")
	) {
		const digits = docNum.replace(/\D/g, "");
		if (digits.length !== 12) {
			errors.so_giay_to = "Số GPLX phải đủ 12 chữ số";
		}
	} else if (
		docType === "4" ||
		docType.includes("hộ chiếu") ||
		docType.includes("passport") ||
		!isVN
	) {
		const clean = docNum.replace(/[^a-zA-Z0-9]/g, "");
		if (clean.length < 6 || clean.length > 12) {
			errors.so_giay_to = "Số hộ chiếu quốc tế phải từ 6 đến 12 ký tự";
		}
	}

	const qt = (editStay.quoc_tich || "").trim().toUpperCase();
	if (!qt) {
		errors.quoc_tich = "Vui lòng chọn mã quốc tịch";
	} else if (!isValidAlpha3Country(qt)) {
		errors.quoc_tich = `Mã quốc tịch không hợp lệ: "${qt}" (Phải là mã 3 ký tự ISO)`;
	}

	if (editStay.ngay_sinh?.trim() && !validateDateString(editStay.ngay_sinh)) {
		errors.ngay_sinh =
			"Ngày sinh phải theo định dạng DD/MM/YYYY (ví dụ: 22/09/2002)";
	}

	const arrCheck = validateArrivalDate(editStay.ngay_den);
	if (!arrCheck.valid) {
		errors.ngay_den =
			arrCheck.error ||
			"Ngày đến phải theo định dạng DD/MM/YYYY HH:mm:ss (ví dụ: 17/09/2026 14:00:00)";
	}

	const depCheck = validateDepartureDate(editStay.ngay_di_du_kien);
	if (!depCheck.valid) {
		errors.ngay_di_du_kien =
			depCheck.error ||
			"Ngày đi phải theo định dạng DD/MM/YYYY HH:mm:ss (ví dụ: 19/09/2026 12:00:00)";
	}

	if (!isVN) {
		const visa = (editStay.thoi_han_thi_thuc || "").trim();
		if (!visa) {
			errors.thoi_han_thi_thuc =
				"Thời hạn thị thực là bắt buộc đối với khách quốc tế (DD/MM/YYYY)";
		} else if (!validateDateString(visa)) {
			errors.thoi_han_thi_thuc =
				"Thời hạn thị thực phải theo định dạng DD/MM/YYYY (ví dụ: 31/12/2026)";
		}
	}

	return {
		allValid: Object.keys(errors).length === 0,
		errors,
	};
});

function validateEdit() {
	if (!editStay) return false;
	editErrors = editLiveVal.errors;
	return editLiveVal.allValid;
}

async function submitEdit() {
	if (!editStay || !validateEdit()) {
		showToast("Vui lòng kiểm tra và sửa các trường báo đỏ", "error");
		return;
	}
	const updatedItem = {
		...editStay,
		ngay_sinh: formatDateDisplay(editStay.ngay_sinh),
		ngay_den: formatDateTimeDisplay(editStay.ngay_den),
		ngay_di_du_kien: editStay.ngay_di_du_kien
			? formatDateTimeDisplay(editStay.ngay_di_du_kien)
			: "",
		thoi_han_thi_thuc:
			editStay.quoc_tich !== "VNM" && editStay.thoi_han_thi_thuc
				? formatDateDisplay(editStay.thoi_han_thi_thuc)
				: "",
	};
	showEditModal = false;

	clearLocalCache();
	// Optimistically update local array immediately
	rawStays = rawStays.map((s) =>
		s.id === updatedItem.id ? { ...s, ...updatedItem } : s,
	);
	showToast("Đang cập nhật thay đổi vào CSDL...", "info");

	try {
		const res = await fetch(`/api/stays/${updatedItem.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updatedItem),
		});
		const data = await res.json();
		if (data.success) {
			showToast("✓ Cập nhật thông tin khách thành công!", "success");
			clearLocalCache();
			await loadStays(true);
			await loadStats(true);
		} else {
			showToast(`Lỗi: ${data.message || data.error}`, "error");
			clearLocalCache();
			await loadStays(true);
		}
	} catch {
		showToast("Lỗi kết nối khi lưu thông tin", "error");
		clearLocalCache();
		await loadStays(true);
	}
}

// Add New Stay
async function submitAddGuest() {
	if (!newGuestForm.ho_ten.trim() || !newGuestForm.so_giay_to.trim()) {
		showToast("Vui lòng điền đủ Họ tên và Số CCCD/Hộ chiếu", "error");
		return;
	}
	const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM", "VIETNAM"].includes(
		newGuestForm.quoc_tich?.trim().toUpperCase() || "",
	);
	if (!isVN && !newGuestForm.thoi_han_thi_thuc?.trim()) {
		showToast(
			"Vui lòng nhập Thời hạn thị thực cho khách quốc tế (DD/MM/YYYY)",
			"error",
		);
		return;
	}
	try {
		const payload = {
			...newGuestForm,
			ngay_sinh: formatDateDisplay(newGuestForm.ngay_sinh),
			ngay_den: formatDateTimeDisplay(newGuestForm.ngay_den),
			ngay_di_du_kien: newGuestForm.ngay_di_du_kien
				? formatDateTimeDisplay(newGuestForm.ngay_di_du_kien)
				: "",
			thoi_han_thi_thuc:
				newGuestForm.quoc_tich !== "VNM" && newGuestForm.thoi_han_thi_thuc
					? formatDateDisplay(newGuestForm.thoi_han_thi_thuc)
					: "",
		};
		const res = await fetch("/api/stays", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		const data = await res.json();
		if (data.success) {
			showToast("Thêm khách mới vào CSDL thành công!", "success");
			if (data.data?.stay && data.data?.guest) {
				const newDetail: StayDetail = {
					...data.data.guest,
					...data.data.stay,
				};
				const existingIdx = rawStays.findIndex((s) => s.id === newDetail.id);
				if (existingIdx >= 0) {
					rawStays[existingIdx] = newDetail;
				} else {
					rawStays = [newDetail, ...rawStays];
				}
				setLocalCache(`stays_master_${activeTab}`, rawStays);
			}
			showAddModal = false;
			loadStats();
		} else {
			showToast(`Lỗi: ${data.message}`, "error");
		}
	} catch {
		showToast("Lỗi khi thêm khách", "error");
	}
}

function openPayloadViewer(log: KbttLog) {
	selectedLog = log;
	showPayloadModal = true;
}

function getStatusBadge(status: string, hasErrors = false) {
	if (status === "READY_TO_SYNC" && hasErrors) {
		return {
			label: "⚠️ Cần sửa lỗi",
			class: "bg-rose-950/90 text-rose-300 border-rose-600 font-bold",
		};
	}
	switch (status) {
		case "READY_TO_SYNC":
			return {
				label: "Sẵn sàng khai báo",
				class:
					"bg-emerald-950/80 text-emerald-300 border-emerald-600 font-semibold",
			};
		case "SYNCED_KBTT":
			return {
				label: "Đang ở",
				class:
					"bg-emerald-950/80 text-emerald-300 border-emerald-600 font-semibold",
			};
		case "EXTENDED":
			return {
				label: "Đã gia hạn",
				class: "bg-indigo-100 text-indigo-800 border-indigo-300",
			};
		case "CHECKED_OUT":
			return {
				label: "Đã trả phòng",
				class: "bg-gray-100 text-gray-700 border-gray-300",
			};
		case "PENDING_VALIDATION":
			return {
				label: "Thiếu thông tin",
				class: "bg-rose-100 text-rose-800 border-rose-300",
			};
		default:
			return {
				label: status,
				class: "bg-slate-100 text-slate-700 border-slate-300",
			};
	}
}

function formatAuditAction(endpoint?: string): { name: string; class: string } {
	const ep = (endpoint || "").toUpperCase();
	if (
		ep.includes("API_5_VN") ||
		ep.includes("API_4_NN") ||
		ep.includes("REGISTER") ||
		ep.includes("CHECKIN")
	) {
		return {
			name: "checkin",
			class: "bg-sky-950/90 text-sky-300 border-sky-700/80",
		};
	}
	if (ep.includes("CHECKOUT")) {
		return {
			name: "checkout",
			class: "bg-slate-900 text-slate-300 border-slate-700",
		};
	}
	if (ep.includes("EXTEND")) {
		return {
			name: "extend",
			class: "bg-indigo-950/90 text-indigo-300 border-indigo-700/80",
		};
	}
	return {
		name: (endpoint || "-").toLowerCase(),
		class: "bg-slate-800 text-slate-300 border-slate-700",
	};
}

function getAuditLogFailureReason(log: KbttLog): string {
	if (log.is_success) return "";

	// 1. Check request payload first for missing required fields (domain constraint analysis)
	if (log.request_payload) {
		try {
			let req = JSON.parse(log.request_payload);
			if (Array.isArray(req) && req.length > 0) {
				req = req[0];
			}
			const ep = (log.api_endpoint || "").toUpperCase();
			const isForeign =
				ep.includes("4_NN") ||
				(req.quocTich && req.quocTich !== "VNM") ||
				req.soHoChieu !== undefined;

			if (isForeign) {
				const visa =
					req.thoiHanTamTruStr ||
					req.thoiHanThiThuc ||
					req.ngayTamTruDenStr ||
					req.thoi_han_thi_thuc;
				if (!visa || String(visa).trim() === "") {
					return "Thiếu ngày hiệu lực của thị thực (visa)";
				}
				if (!req.soHoChieu && !req.soGiayTo) {
					return "Thiếu số hộ chiếu của khách nước ngoài";
				}
				if (!req.quocTich) {
					return "Thiếu thông tin quốc tịch";
				}
				if (!req.ngaySinhStr && !req.ngayThangNamSinhStr && !req.ngaySinh) {
					return "Thiếu ngày tháng năm sinh";
				}
			} else {
				// Vietnamese guest
				if (!req.soGiayTo) {
					return "Thiếu số CCCD / giấy tờ tùy thân";
				}
				if (!req.hoTen) {
					return "Thiếu họ và tên khách lưu trú";
				}
				if (!req.ngayDenCsltStr && !req.ngayDen) {
					return "Thiếu thời gian nhận phòng";
				}
				if (!req.ngayDiDuKienStr && !req.ngayDiDuKien) {
					return "Thiếu ngày đi dự kiến";
				}
			}

			if (!req.soPhong) {
				return "Thiếu thông tin số phòng lưu trú";
			}
		} catch {}
	}

	// 2. Check response_payload or server error_message for explicit messages
	let serverMsg = (log.error_message || "").trim();
	if (log.response_payload) {
		try {
			const res = JSON.parse(log.response_payload);
			if (
				res.message &&
				typeof res.message === "string" &&
				res.message.trim() &&
				res.message !== "Lỗi khi gọi API KBTT"
			) {
				serverMsg = res.message.trim();
			} else if (
				res.resData?.message &&
				typeof res.resData.message === "string"
			) {
				serverMsg = res.resData.message.trim();
			} else if (res.error && typeof res.error === "string") {
				serverMsg = res.error.trim();
			}
		} catch {}
	}

	if (serverMsg) {
		if (serverMsg.includes("đang tạm trú tại CSLT và chưa checkout")) {
			return "Khách đang có lượt lưu trú tại cơ sở và chưa checkout lượt cũ.";
		}
		if (
			serverMsg.includes("fetch failed") ||
			serverMsg.includes("Failed to fetch") ||
			serverMsg.includes("ECONNREFUSED") ||
			serverMsg.includes("ETIMEDOUT") ||
			serverMsg.includes("timeout") ||
			serverMsg.includes("network")
		) {
			return "Không thể kết nối đến máy chủ API BCA (Lỗi đường truyền mạng hoặc máy chủ BCA phản hồi chậm / quá tải).";
		}
		if (
			serverMsg.includes("Hết hạn") ||
			serverMsg.includes("token") ||
			serverMsg.includes("unauthorized") ||
			log.code === "401" ||
			log.http_status === 401
		) {
			return "Hết hạn phiên làm việc hoặc Token API không hợp lệ.";
		}
		// Clean technical prefixes
		if (
			serverMsg.startsWith("Lỗi HTTP 500:") ||
			serverMsg.startsWith("Lỗi HTTP 400:")
		) {
			const clean = serverMsg.replace(/^Lỗi HTTP \d+:\s*/, "").trim();
			if (
				clean &&
				clean !== "Internal Server Error" &&
				clean !== "ERR" &&
				clean !== "Error"
			) {
				return clean;
			}
		} else if (
			serverMsg !== "Lỗi khi gọi API KBTT" &&
			serverMsg !== "ERR" &&
			serverMsg !== "Error" &&
			!serverMsg.toLowerCase().includes("internal server error")
		) {
			return serverMsg;
		}
	}

	// 3. Fallback on HTTP / error code
	if (log.http_status === 500 || log.code === "500") {
		return "Lỗi máy chủ kết nối hoặc hệ thống BCA tạm thời gián đoạn.";
	}
	if (log.code === "400" || log.http_status === 400) {
		return "Dữ liệu gửi lên không đúng định dạng quy định của Cổng Dịch Vụ Công BCA.";
	}

	return "Yêu cầu không thành công";
}

function openCustomConfirm(options: {
	title: string;
	message: string;
	subMessage?: string;
	confirmText?: string;
	cancelText?: string;
	icon?: string;
	isDanger?: boolean;
	onConfirm: () => Promise<void> | void;
}) {
	confirmDialogState = {
		title: options.title,
		message: options.message,
		subMessage: options.subMessage,
		confirmText: options.confirmText || "Xác nhận",
		cancelText: options.cancelText || "Hủy",
		icon: options.icon || "⚠️",
		isDanger: options.isDanger !== false,
		onConfirm: options.onConfirm,
	};
	showCustomConfirmModal = true;
}

async function handleCustomConfirm() {
	if (confirmDialogState?.onConfirm) {
		const fn = confirmDialogState.onConfirm;
		showCustomConfirmModal = false;
		await fn();
	} else {
		showCustomConfirmModal = false;
	}
}

function deleteAuditLogItem(logId: string) {
	openCustomConfirm({
		title: "Xác nhận xóa bản ghi nhật ký",
		icon: "🗑️",
		isDanger: true,
		confirmText: "Xóa log",
		cancelText: "Hủy",
		message: "Bạn có chắc chắn muốn xóa bản ghi này khỏi Dev Logs?",
		subMessage:
			"Thao tác này chỉ xóa bản ghi lịch sử API và hoàn toàn không ảnh hưởng đến dữ liệu khách lưu trú trong CSDL.",
		onConfirm: async () => {
			try {
				const res = await fetch(`/api/stays/audit?id=${logId}`, {
					method: "DELETE",
				});
				const data = await res.json();
				if (data.success) {
					auditLogs = auditLogs.filter((l) => l.id !== logId);
					showToast("✓ Đã xóa bản ghi nhật ký khỏi Dev Logs", "success");
				} else {
					showToast(`Không thể xóa log: ${data.error || "Lỗi"}`, "error");
				}
			} catch {
				showToast("Lỗi khi kết nối xóa log", "error");
			}
		},
	});
}

function clearAllAuditLogs() {
	openCustomConfirm({
		title: "Xác nhận xóa TOÀN BỘ nhật ký",
		icon: "🗑️",
		isDanger: true,
		confirmText: "Xóa tất cả logs",
		cancelText: "Hủy",
		message:
			"Bạn có chắc chắn muốn xóa toàn bộ lịch sử API trong Dev Logs không?",
		subMessage:
			"Tất cả bản ghi trong bảng kbtt_logs sẽ bị xóa. Dữ liệu khách hàng và các lượt ở vẫn được bảo toàn nguyên vẹn trong CSDL.",
		onConfirm: async () => {
			try {
				const res = await fetch("/api/stays/audit?clear=true", {
					method: "DELETE",
				});
				const data = await res.json();
				if (data.success) {
					auditLogs = [];
					showToast("✓ Đã xóa toàn bộ nhật ký Dev Logs", "success");
				} else {
					showToast(`Không thể xóa logs: ${data.error || "Lỗi"}`, "error");
				}
			} catch {
				showToast("Lỗi khi xóa logs", "error");
			}
		},
	});
}

onMount(async () => {
	clearLocalCache();
	const now = new Date(Date.now() + 7 * 3600 * 1000);
	newGuestForm.ngay_den = now.toISOString().replace("T", " ").substring(0, 19);
	const future = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
	newGuestForm.ngay_di_du_kien = future.toISOString().substring(0, 10);

	await checkAuth();
	await loadEnv();

	if (isAuthenticated) {
		loadCatalogs();
		await loadStays();
		loadStats();
	}
});
</script>

{#if !isAuthenticated}
	<!-- DEDICATED FULL-SCREEN LOGIN PAGE -->
	<div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden text-slate-100">
		<!-- Background Ambient Glow -->
		<div class="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
		<div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

		<!-- Toast Notification -->
		{#if notification}
			<div class="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 {notification.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600' : notification.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-600' : 'bg-sky-950/90 text-sky-200 border-sky-600'}">
				<span class="text-xl">{notification.type === 'success' ? '✓' : notification.type === 'error' ? '⚠' : 'ℹ'}</span>
				<span class="font-medium text-sm">{notification.message}</span>
			</div>
		{/if}

		<div class="w-full max-w-md bg-slate-900/90 border border-slate-700/80 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-xl relative z-10">
			<!-- Header / Brand -->
			<div class="text-center mb-6">
				<div class="w-16 h-16 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-sky-500/5">
					🛡️
				</div>
				<h1 class="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400">
					KHAI BÁO LƯU TRÚ
				</h1>
				<p class="text-xs text-slate-400 mt-1 font-medium">Hệ Thống Tích Hợp & Quản Lý Lưu Trú C06 BCA</p>
			</div>

			<!-- Error Alert -->
			{#if authError}
				<div class="mb-4 p-3 bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs rounded-xl flex items-center gap-2">
					<span>⚠</span>
					<span>{authError}</span>
				</div>
			{/if}

			<!-- Login Form -->
			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
				<div>
					<label for="app_username" class="block text-xs font-semibold text-slate-300 mb-1">Tài khoản quản trị:</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">👤</span>
						<input
							id="app_username"
							type="text"
							bind:value={authUsername}
							placeholder="Tài khoản (root)"
							class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors shadow-inner font-mono"
							required
						/>
					</div>
				</div>

				<div>
					<label for="app_password" class="block text-xs font-semibold text-slate-300 mb-1">Mật khẩu truy cập:</label>
					<div class="relative">
						<span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">🔑</span>
						<input
							id="app_password"
							type="password"
							bind:value={authPassword}
							placeholder="Nhập mật khẩu..."
							class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors shadow-inner font-mono"
							required
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={authLoading}
					class="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
				>
					{#if authLoading}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						<span>Đang xác thực...</span>
					{:else}
						<span>Đăng Nhập Hệ Thống ➔</span>
					{/if}
				</button>
			</form>

			<div class="mt-6 pt-4 border-t border-slate-800 text-center">
				<p class="text-[11px] text-slate-500">Mật khẩu được đồng bộ qua biến <code class="text-sky-400 font-mono">APP_PASSWORD</code> trên Cloudflare.</p>
			</div>
		</div>
	</div>
{:else}
<div class="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 font-sans">
	<!-- Toast Notification -->
	{#if notification}
		<div class="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 {notification.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600' : notification.type === 'error' ? 'bg-rose-950/90 text-rose-200 border-rose-600' : 'bg-sky-950/90 text-sky-200 border-sky-600'}">
			<span class="text-xl">{notification.type === 'success' ? '✓' : notification.type === 'error' ? '⚠' : 'ℹ'}</span>
			<span class="font-medium text-sm">{notification.message}</span>
		</div>
	{/if}

	<!-- Header Bar -->
	<header class="max-w-7xl mx-auto mb-6 bg-slate-800/80 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-slate-700 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-2xl">⚡</span>
				<h1 class="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400">
					QUẢN LÝ & KHAI BÁO LƯU TRÚ
				</h1>
			</div>
			
		</div>

		<!-- Action Controls -->
		<div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
			<!-- User Profile Badge -->
			<div class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-sky-300 font-mono">
				<span>👤</span>
				<span>root</span>
			</div>

			<!-- Environment Switcher (Only visible in DEV / Non-fixed mode) -->
			{#if !isProdFixed}
				<div class="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
					<button
						type="button"
						onclick={() => switchEnv("dev")}
						class="px-3 py-1.5 rounded-lg transition-all {currentEnv === 'dev' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
					>
						DEV (Sandbox)
					</button>
					<button
						type="button"
						onclick={() => switchEnv("prod")}
						class="px-3 py-1.5 rounded-lg transition-all {currentEnv === 'prod' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}"
					>
						PROD (BCA)
					</button>
				</div>
			{/if}

			<!-- Pull From Sheet Button -->
			<button
				type="button"
				onclick={() => pullFromGoogleSheets()}
				title="Kéo dữ liệu trực tiếp từ Google Sheet vào CSDL"
				class="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl border border-emerald-600 transition-all shadow-md active:scale-95"
			>
				<span class="{loading ? 'animate-spin' : ''}">📥</span>
				<span>Kéo từ Sheet vào DB</span>
			</button>

			<!-- Refresh Data Button -->
			<button
				type="button"
				onclick={async () => {
					loading = true;
					showToast("Đang làm mới dữ liệu từ CSDL...", "info");
					await loadStays();
					await loadStats();
					if (activeTab === "audit") await loadAuditLogs();
					if (activeTab === "catalogs") await loadCatalogs();
					loading = false;
					showToast("✓ Đã làm mới dữ liệu", "success");
				}}
				title="Làm mới danh sách từ CSDL"
				class="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition-all active:scale-95"
			>
				<span class="{loading ? 'animate-spin' : ''}">🔄</span>
				<span>Làm mới DB</span>
			</button>

			<!-- Add Guest Button -->
			<button
				type="button"
				onclick={() => { showAddModal = true; }}
				class="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all transform active:scale-95"
			>
				<span>+</span>
				<span>Thêm Khách</span>
			</button>

			<!-- Logout / Lock Session Button -->
			<button
				type="button"
				onclick={handleLogout}
				title="Đăng xuất phiên làm việc"
				class="flex items-center gap-1.5 px-3 py-2 bg-slate-700/80 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 text-xs font-semibold rounded-xl border border-slate-600 transition-all cursor-pointer"
			>
				<span>🔒</span>
				<span>Đăng xuất</span>
			</button>
		</div>
	</header>

	<!-- Metric Cards -->
	<section class="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
		<div class="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-md">
			<div class="text-xs text-amber-400 font-medium">Chưa Đăng Ký</div>
			<div class="text-2xl font-bold mt-1 text-amber-300">{stats.readyToSync}</div>
			<div class="text-[11px] text-slate-400 mt-0.5">Sẵn sàng gửi khai báo</div>
		</div>

		<div class="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-md">
			<div class="text-xs text-sky-400 font-medium">Đang Ở</div>
			<div class="text-2xl font-bold mt-1 text-sky-300">{stats.inHouse}</div>
			<div class="text-[11px] text-slate-400 mt-0.5">Khách đang lưu trú</div>
		</div>

		<div class="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-md">
			<div class="text-xs text-emerald-400 font-medium">Đã Đăng Ký</div>
			<div class="text-2xl font-bold mt-1 text-emerald-300">{stats.syncedKbtt}</div>
			<div class="text-[11px] text-slate-400 mt-0.5">Hồ sơ đã đồng bộ thành công</div>
		</div>

		<div class="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-md">
			<div class="text-xs text-slate-400 font-medium">Đã Checkout</div>
			<div class="text-2xl font-bold mt-1 text-slate-300">{stats.checkedOut}</div>
			<div class="text-[11px] text-slate-500 mt-0.5">Tổng lượt đã trả phòng</div>
		</div>
	</section>

	<!-- Main Navigation Tabs -->
	<div class="max-w-7xl mx-auto flex border-b border-slate-700 mb-6 space-x-2 md:space-x-4 overflow-x-auto pb-1">
		<button
			type="button"
			onclick={() => setTab("register")}
			class="px-4 py-2.5 font-medium text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap {activeTab === 'register' ? 'border-sky-400 text-sky-400 bg-slate-800/80' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
		>
			<span>⚡</span>
			<span>Khai Báo Lưu Trú Mới</span>
			{#if stats.readyToSync > 0}
				<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-900">{stats.readyToSync}</span>
			{/if}
		</button>

		<button
			type="button"
			onclick={() => setTab("inhouse")}
			class="px-4 py-2.5 font-medium text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap {activeTab === 'inhouse' ? 'border-teal-400 text-teal-400 bg-slate-800/80' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
		>
			<span>🏨</span>
			<span>Khách Đang Ở</span>
		</button>

		<button
			type="button"
			onclick={() => setTab("all_guests")}
			class="px-4 py-2.5 font-medium text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap {activeTab === 'all_guests' ? 'border-amber-400 text-amber-400 bg-slate-800/80' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
		>
			<span>👥</span>
			<span>Danh sách guests</span>
			{#if stats.totalStays > 0}
				<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-700 text-slate-200">{stats.totalStays}</span>
			{/if}
		</button>

		<button
			type="button"
			onclick={() => setTab("audit")}
			class="px-4 py-2.5 font-medium text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap {activeTab === 'audit' ? 'border-indigo-400 text-indigo-400 bg-slate-800/80' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
		>
			<span>🔍</span>
			<span>Dev Logs</span>
		</button>

		<button
			type="button"
			onclick={() => setTab("catalogs")}
			class="px-4 py-2.5 font-medium text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap {activeTab === 'catalogs' ? 'border-purple-400 text-purple-400 bg-slate-800/80' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
		>
			<span>📚</span>
			<span>Danh Mục Chuẩn</span>
		</button>
	</div>

	<!-- Content Area -->
	<main class="max-w-7xl mx-auto">
		<!-- Search & Filter Header -->
		{#if activeTab !== "catalogs"}
			<div class="bg-slate-800/60 p-4 rounded-xl border border-slate-700 mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
				<div class="flex flex-1 items-center gap-3 w-full">
					<div class="relative flex-1">
						<input
							type="text"
							bind:value={searchTerm}
							oninput={onSearchInput}
							placeholder="Tìm kiếm theo Họ tên, CCCD/Hộ chiếu, Số phòng, Quốc tịch, Địa chỉ..."
							class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 pr-8 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
						/>
						{#if searchTerm}
							<button
								type="button"
								onclick={() => {
									searchTerm = "";
									onSearchInput();
								}}
								class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1 rounded transition-colors"
								title="Xóa tìm kiếm"
							>
								✕
							</button>
						{/if}
					</div>
					{#if activeTab !== 'audit'}
						<div class="w-32 md:w-40">
							<select
								bind:value={filterRoom}
								class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-100 focus:outline-none focus:border-sky-500"
							>
								<option value="">Tất cả phòng</option>
								{#each ROOM_OPTIONS as r}
									<option value={r}>Phòng {r}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>

				<div class="flex items-center gap-2 w-full md:w-auto justify-end">
					{#if activeTab === 'register'}
						<button
							type="button"
							onclick={() => registerAllReady()}
							disabled={stays.length === 0}
							class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5"
						>
							<span>🚀</span>
							<span>Đăng Ký Tất Cả ({stays.length})</span>
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- TAB 1: KHAI BÁO LƯU TRÚ MỚI -->
		{#if activeTab === "register"}
			<div class="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs border-collapse">
						<thead class="bg-slate-900/90 text-slate-300 uppercase font-semibold border-b border-slate-700">
							<tr>
								<th class="p-3.5">Họ & Tên</th>
								<th class="p-3.5">Phòng</th>
								<th class="p-3.5">Số Giấy Tờ</th>
								<th class="p-3.5">Quốc Tịch</th>
								<th class="p-3.5">Ngày Đến</th>
								<th class="p-3.5">Ngày Đi (DK)</th>
								<th class="p-3.5">Địa Chỉ</th>
								<th class="p-3.5 text-center">Thao Tác</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-700/60">
							{#if loading}
								<tr>
									<td colspan="8" class="p-8 text-center text-slate-400">Đang tải dữ liệu từ Cloudflare Database...</td>
								</tr>
							{:else if stays.length === 0}
								<tr>
									<td colspan="8" class="p-12 text-center text-slate-400">
										<div class="text-3xl mb-2">✨</div>
										<div>Hiện không có khách nào đang chờ đăng ký.</div>
										<div class="text-xs text-slate-500 mt-1">Dữ liệu từ Google Sheets OCR hoặc nút "Thêm Khách" sẽ tự động hiển thị ở đây.</div>
									</td>
								</tr>
							{:else}
								{#each stays as stay (stay.id)}
									{@const isDeleting = deletingIds.has(stay.id)}
									{@const val = validateStayDetail(stay)}
									{@const fullAddr = getFullAddress(stay)}
									{@const shortAddr = getShortAddress(stay)}
									{@const countryFullName = getCountryFullName(stay.quoc_tich)}
									<tr class="hover:bg-slate-700/30 transition-all duration-300 {isDeleting ? 'line-through opacity-30 bg-rose-950/30 select-none pointer-events-none' : ''} {val.hasErrors ? 'border-l-4 border-l-rose-500 bg-rose-950/10' : ''}">
										<td class="p-3.5 font-semibold text-slate-100 flex items-center gap-2">
											<span class="{val.errors.ho_ten ? 'text-rose-400 font-bold underline decoration-rose-500 decoration-wavy' : ''}">{stay.ho_ten}</span>
											{#if val.errors.ho_ten}
												<span class="text-[10px] px-1 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700" title={val.errors.ho_ten}>⚠️ {val.errors.ho_ten}</span>
											{/if}
											{#if stay.gioi_tinh === 'F'}
												<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40">Nữ ♀</span>
											{:else}
												<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">Nam ♂</span>
											{/if}
										</td>
										<td class="p-3.5 font-mono font-bold">
											{#if val.errors.so_phong}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title={val.errors.so_phong}>⚠️ {stay.so_phong || 'Trống'}</span>
											{:else}
												<span class="text-sky-400">{stay.so_phong}</span>
											{/if}
										</td>
										<td class="p-3.5 font-mono">
											{#if val.errors.so_giay_to}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title={val.errors.so_giay_to}>⚠️ {stay.so_giay_to || 'Trống'}</span>
											{:else}
												<span class="text-slate-300">{stay.so_giay_to}</span>
											{/if}
										</td>
										<td class="p-3.5">
											{#if val.errors.quoc_tich}
												<span class="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-900/80 border border-rose-700 text-rose-200" title={val.errors.quoc_tich}>
													⚠️ {stay.quoc_tich || 'Trống'}
												</span>
											{:else}
												<span class="group relative inline-block cursor-pointer">
													<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-700 {stay.quoc_tich === 'VNM' ? 'text-emerald-400' : 'text-amber-400'}">
														{stay.quoc_tich}
													</span>
													{#if countryFullName}
														<div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-none duration-0 pointer-events-none bg-slate-950 text-slate-100 text-[11px] font-normal px-2.5 py-1.5 rounded-lg border border-slate-700 shadow-2xl whitespace-nowrap max-w-xs truncate">
															🌐 {countryFullName}
														</div>
													{/if}
												</span>
											{/if}
											{#if val.errors.thoi_han_thi_thuc}
												<div class="text-[10px] text-rose-400 font-medium whitespace-nowrap mt-1 flex items-center gap-1" title={val.errors.thoi_han_thi_thuc}>
													<span>⚠️ Thiếu Visa</span>
												</div>
											{/if}
										</td>
										<td class="p-3.5">
											{#if val.errors.ngay_den}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title={val.errors.ngay_den}>⚠️ {formatDateTimeDisplay(stay.ngay_den) || 'Trống'}</span>
											{:else}
												<span class="text-slate-300">{formatDateTimeDisplay(stay.ngay_den)}</span>
											{/if}
										</td>
										<td class="p-3.5">
											{#if val.errors.ngay_di_du_kien}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title={val.errors.ngay_di_du_kien}>⚠️ {formatDepartureDisplay(stay.ngay_di_du_kien)}</span>
											{:else}
												<span class="text-slate-400">{formatDepartureDisplay(stay.ngay_di_du_kien)}</span>
											{/if}
										</td>
										<td class="p-3.5 text-slate-300 max-w-[150px] truncate group relative cursor-pointer" title={fullAddr}>
											<span class="border-b border-dotted border-slate-500 hover:border-sky-400 hover:text-sky-300 transition-none">{shortAddr}</span>
											{#if fullAddr && fullAddr !== '-'}
												<div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-none duration-0 pointer-events-none bg-slate-950 text-slate-100 text-[11px] font-normal px-2.5 py-1.5 rounded-lg border border-slate-700 shadow-2xl whitespace-nowrap max-w-xs truncate">
													📍 {fullAddr}
												</div>
											{/if}
										</td>
										<td class="p-3.5 text-center">
											{#if isDeleting}
												<span class="text-[11px] text-rose-400 italic animate-pulse">Đang xóa...</span>
											{:else}
												<div class="flex items-center justify-center gap-1.5">
													<button
														type="button"
														onclick={() => registerStay(stay.id)}
														class="px-2.5 py-1 {val.hasErrors ? 'bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-600' : 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold'} rounded text-[11px] shadow transition-all flex items-center gap-1"
														title={val.hasErrors ? 'Dữ liệu chưa hợp lệ - Bấm để xem và sửa lỗi' : 'Gửi khai báo lên Bộ Công An'}
													>
														{#if val.hasErrors}
															<span>⚠️ Cần Sửa</span>
														{:else}
															<span>Khai Báo ⚡</span>
														{/if}
													</button>
													<button
														type="button"
														onclick={() => openEdit(stay)}
														class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] transition-all"
													>
														Sửa ✎
													</button>
													<button
														type="button"
														onclick={() => openDeleteModal(stay)}
														class="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[11px] transition-all"
													>
														Xóa ✕
													</button>
												</div>
											{/if}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- TAB 2: KHÁCH ĐANG Ở & GIA HẠN / CHECKOUT -->
		{#if activeTab === "inhouse"}
			<div class="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs border-collapse">
						<thead class="bg-slate-900/90 text-slate-300 uppercase font-semibold border-b border-slate-700">
							<tr>
								<th class="p-3.5">Họ & Tên</th>
								<th class="p-3.5">Phòng</th>
								<th class="p-3.5">CCCD / Hộ Chiếu</th>
								<th class="p-3.5">Ngày Đến</th>
								<th class="p-3.5">Ngày Đi Dự Kiến</th>
								<th class="p-3.5">Trạng Thái</th>
								<th class="p-3.5 text-center">Quản Lý</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-700/60">
							{#if stays.length === 0}
								<tr>
									<td colspan="7" class="p-8 text-center text-slate-400">Không tìm thấy lượt lưu trú nào phù hợp.</td>
								</tr>
							{:else}
								{#each stays as stay (stay.id)}
									{@const isDeleting = deletingIds.has(stay.id)}
									{@const val = validateStayDetail(stay)}
									{@const badge = getStatusBadge(stay.status, val.hasErrors)}
									<tr class="hover:bg-slate-700/30 transition-all duration-300 {stay.status === 'CHECKED_OUT' ? 'opacity-50' : ''} {isDeleting ? 'line-through opacity-30 bg-rose-950/30 select-none pointer-events-none' : ''} {val.hasErrors ? 'border-l-4 border-l-rose-500 bg-rose-950/10' : ''}">
										<td class="p-3.5 font-semibold text-slate-100 flex items-center gap-2">
											<span class="{val.errors.ho_ten ? 'text-rose-400 font-bold underline decoration-rose-500 decoration-wavy' : ''}">{stay.ho_ten}</span>
											{#if val.errors.ho_ten}
												<span class="text-[10px] px-1 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700" title={val.errors.ho_ten}>⚠️</span>
											{/if}
											{#if stay.gioi_tinh === 'F'}
												<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40">Nữ ♀</span>
											{:else}
												<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">Nam ♂</span>
											{/if}
										</td>
										<td class="p-3.5 font-mono font-bold">
											{#if val.errors.so_phong}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title={val.errors.so_phong}>⚠️ {stay.so_phong || 'Trống'}</span>
											{:else}
												<span class="text-sky-400">{stay.so_phong}</span>
											{/if}
										</td>
										<td class="p-3.5 font-mono">
											{#if val.errors.so_giay_to || val.errors.quoc_tich}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title="{val.errors.so_giay_to || ''} {val.errors.quoc_tich || ''}">
													⚠️ {stay.so_giay_to || 'Trống'} ({stay.quoc_tich})
												</span>
											{:else}
												{@const countryFullName = getCountryFullName(stay.quoc_tich)}
												<span class="text-slate-300 group relative inline-block cursor-pointer">
													<span>{stay.so_giay_to} ({stay.quoc_tich})</span>
													{#if countryFullName}
														<div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-none duration-0 pointer-events-none bg-slate-950 text-slate-100 text-[11px] font-normal px-2.5 py-1.5 rounded-lg border border-slate-700 shadow-2xl whitespace-nowrap max-w-xs truncate font-sans">
															🌐 {countryFullName}
														</div>
													{/if}
												</span>
											{/if}
										</td>
										<td class="p-3.5">
											{#if val.errors.ngay_den}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title={val.errors.ngay_den}>⚠️ {formatDateTimeDisplay(stay.ngay_den)}</span>
											{:else}
												<span class="text-slate-300">{formatDateTimeDisplay(stay.ngay_den)}</span>
											{/if}
										</td>
										<td class="p-3.5 font-medium">
											{#if val.errors.ngay_di_du_kien}
												<span class="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px]" title={val.errors.ngay_di_du_kien}>⚠️ {formatDepartureDisplay(stay.ngay_di_du_kien)}</span>
											{:else}
												<span class="text-amber-300">{formatDepartureDisplay(stay.ngay_di_du_kien)}</span>
											{/if}
										</td>
										<td class="p-3.5">
											<button
												type="button"
												onclick={() => openStatusModal(stay)}
												class="px-2 py-0.5 rounded-full text-[10px] font-semibold border {badge.class} hover:ring-2 hover:ring-sky-400 hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 group/badge"
												title="Bấm để ghi đè / đổi trạng thái CSDL"
											>
												<span>{badge.label}</span>
												<span class="text-[9px] opacity-0 group-hover/badge:opacity-100 transition-opacity">✎</span>
											</button>
										</td>
										<td class="p-3.5 text-center">
											{#if isDeleting}
												<span class="text-[11px] text-rose-400 italic animate-pulse">Đang xóa...</span>
											{:else}
												<div class="flex items-center justify-center gap-1.5">
													{#if stay.status !== 'CHECKED_OUT'}
														<button
															type="button"
															onclick={() => openExtendModal(stay)}
															class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded text-[11px] transition-all"
														>
															Gia Hạn ⏱
														</button>
														<button
															type="button"
															onclick={() => openCheckoutModal(stay)}
															class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded text-[11px] transition-all"
														>
															Checkout 🚪
														</button>
													{/if}
													<button
														type="button"
														onclick={() => openEdit(stay)}
														class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] transition-all"
													>
														✎
													</button>
													<button
														type="button"
														onclick={() => openDeleteModal(stay)}
														class="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[11px] transition-all"
													>
														✕
													</button>
												</div>
											{/if}
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- TAB 3: TẤT CẢ GUESTS (GUEST-CENTRIC ACCORDION & LỊCH SỬ LƯU TRÚ) -->
		{#if activeTab === "all_guests"}
			<div class="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
				<div class="p-3.5 bg-slate-900/70 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<span class="text-amber-400 text-base">👥</span>
						<span class="text-xs md:text-sm font-semibold text-slate-200">Lịch Sử Khách & Các Lượt Lưu Trú (Cloudflare D1 Remote)</span>
						<span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
							{guestGroups.length} Khách ({stays.length} lượt lưu trú)
						</span>
					</div>
					<div class="flex items-center gap-2 text-xs">
						<button
							type="button"
							onclick={expandAllGuests}
							class="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-600 text-slate-200 rounded-lg transition-all"
						>
							▼ Mở rộng tất cả
						</button>
						<button
							type="button"
							onclick={collapseAllGuests}
							class="px-2.5 py-1 bg-slate-700/80 hover:bg-slate-600 text-slate-200 rounded-lg transition-all"
						>
							▲ Thu gọn tất cả
						</button>
					</div>
				</div>

				<div class="p-4 space-y-3">
					{#if loading}
						<div class="p-10 text-center text-slate-400 text-xs">
							Đang tải dữ liệu hồ sơ khách từ Cloudflare D1...
						</div>
					{:else if guestGroups.length === 0}
						<div class="p-12 text-center text-slate-400">
							<div class="text-3xl mb-2">📭</div>
							<div class="font-semibold text-slate-300">Chưa có bản ghi nào trong Database.</div>
							<div class="text-xs text-slate-500 mt-1">Bấm nút "Đồng Bộ Sheets" hoặc "Thêm Khách Mới" để nạp dữ liệu vào CSDL.</div>
						</div>
					{:else}
						{#each guestGroups as group, gIdx (group.guest_id)}
							{@const isExpanded = expandedGuestIds.has(group.guest_id)}
							{@const latestVal = validateStayDetail(group.latestStay)}
							{@const latestBadge = getStatusBadge(group.latestStay.status, latestVal.hasErrors)}
							{@const countryFullName = getCountryFullName(group.quoc_tich)}

							{#if group.stay_count === 1}
								{@const stay = group.latestStay}
								{@const isDeleting = deletingIds.has(stay.id)}
								{@const val = validateStayDetail(stay)}
								{@const badge = getStatusBadge(stay.status, val.hasErrors)}
								<div class="border border-slate-700/80 rounded-xl bg-slate-900/60 overflow-hidden transition-all duration-200 hover:border-slate-600 shadow-md p-3 flex items-center justify-between gap-3 overflow-x-auto {isDeleting ? 'line-through opacity-30 bg-rose-950/30' : ''}">
									<!-- Col 1: STT, Họ Tên, Giới Tính -->
									<div class="w-60 min-w-[15rem] max-w-[15rem] flex items-center gap-2 flex-shrink-0">
										<span class="text-xs font-mono text-slate-500 w-6 flex-shrink-0">#{gIdx + 1}</span>
										<div class="font-bold text-slate-100 text-xs md:text-sm flex items-center gap-1.5 min-w-0">
											<span class="truncate max-w-[130px]" title={group.ho_ten}>{group.ho_ten}</span>
											{#if group.gioi_tinh === 'F'}
												<span class="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex-shrink-0">Nữ ♀</span>
											{:else}
												<span class="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex-shrink-0">Nam ♂</span>
											{/if}
										</div>
									</div>

									<!-- Col 2: Số giấy tờ & Quốc tịch -->
									<div class="w-44 min-w-[11rem] max-w-[11rem] flex items-center gap-1 flex-shrink-0 font-mono text-xs text-slate-300">
										<span class="truncate max-w-[105px]">{group.so_giay_to}</span>
										<span class="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 flex-shrink-0 {group.quoc_tich === 'VNM' ? 'text-emerald-400' : 'text-amber-400'}" title={countryFullName || ''}>
											{group.quoc_tich}
										</span>
									</div>

									<!-- Col 3: Phòng -->
									<div class="w-24 min-w-[6rem] max-w-[6rem] flex-shrink-0 font-mono font-bold text-sky-400 text-xs">
										Phòng {stay.so_phong}
									</div>

									<!-- Col 4: Cặp Ngày In / Out -->
									<div class="w-56 min-w-[14rem] max-w-[14rem] flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
										<span class="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
											In: {formatDateDisplay(stay.ngay_den)}
										</span>
										<span class="text-slate-500 font-bold">➔</span>
										{#if stay.ngay_di_thuc_te}
											<span class="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
												Out: {formatDateDisplay(stay.ngay_di_thuc_te)}
											</span>
										{:else}
											<span class="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
												Out(DK): {formatDateDisplay(stay.ngay_di_du_kien)}
											</span>
										{/if}
									</div>

									<!-- Col 5: Trạng thái -->
									<div class="w-32 min-w-[8rem] max-w-[8rem] flex-shrink-0">
										<button
											type="button"
											onclick={(e) => { e.stopPropagation(); openStatusModal(stay); }}
											class="px-2 py-0.5 rounded-full text-[10px] font-semibold border {badge.class} hover:ring-2 hover:ring-sky-400 hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 group/badge"
											title="Bấm để ghi đè / đổi trạng thái CSDL"
										>
											<span>{badge.label}</span>
											<span class="text-[9px] opacity-0 group-hover/badge:opacity-100 transition-opacity">✎</span>
										</button>
									</div>

									<!-- Col 6: Thao tác -->
									<div class="flex items-center justify-end gap-1.5 flex-shrink-0 min-w-[13rem]">
										<button
											type="button"
											onclick={() => openReRegisterModal(stay)}
											class="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded text-[11px] shadow transition-all flex items-center gap-1"
											title="Khai báo lại lượt mới và tự động gửi BCA ngay"
										>
											<span>🔄</span> Khai Báo Lại
										</button>
										<button
											type="button"
											onclick={() => openEdit(stay)}
											class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] transition-all"
										>
											Sửa ✎
										</button>
										<button
											type="button"
											onclick={() => openDeleteModal(stay)}
											class="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[11px] transition-all"
										>
											Xóa ✕
										</button>
									</div>
								</div>
							{:else}
								<!-- Multiple stays: Accordion Dropdown -->
								<div class="border border-slate-700/80 rounded-xl bg-slate-900/60 overflow-hidden transition-all duration-200 hover:border-slate-600 shadow-md">
									<!-- Header Accordion Row -->
									<div
										role="button"
										tabindex="0"
										onclick={() => toggleGuestExpand(group.guest_id)}
										onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleGuestExpand(group.guest_id); }}
										class="p-3 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-900/90 hover:bg-slate-800/80 transition-colors overflow-x-auto"
									>
										<!-- Col 1: Arrow, STT, Họ Tên, Giới Tính, Lượt ở -->
										<div class="w-60 min-w-[15rem] max-w-[15rem] flex items-center gap-2 flex-shrink-0">
											<span class="text-slate-400 text-xs font-mono transition-transform duration-200 {isExpanded ? 'rotate-90 text-amber-400' : ''}">
												▶
											</span>
											<span class="text-xs font-mono text-slate-500 w-5 flex-shrink-0">#{gIdx + 1}</span>
											<div class="font-bold text-slate-100 text-xs md:text-sm flex items-center gap-1.5 min-w-0">
												<span class="truncate max-w-[95px]" title={group.ho_ten}>{group.ho_ten}</span>
												{#if group.gioi_tinh === 'F'}
													<span class="text-[10px] px-1 py-0.2 rounded font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40 flex-shrink-0">Nữ ♀</span>
												{:else}
													<span class="text-[10px] px-1 py-0.2 rounded font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex-shrink-0">Nam ♂</span>
												{/if}
											</div>
											<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0 animate-pulse">
												{group.stay_count} lượt
											</span>
										</div>

										<!-- Col 2: Số giấy tờ & Quốc tịch -->
										<div class="w-44 min-w-[11rem] max-w-[11rem] flex items-center gap-1 flex-shrink-0 font-mono text-xs text-slate-300">
											<span class="truncate max-w-[105px]">{group.so_giay_to}</span>
											<span class="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 flex-shrink-0 {group.quoc_tich === 'VNM' ? 'text-emerald-400' : 'text-amber-400'}" title={countryFullName || ''}>
												{group.quoc_tich}
											</span>
										</div>

										<!-- Col 3: Phòng gần nhất -->
										<div class="w-24 min-w-[6rem] max-w-[6rem] flex-shrink-0 font-mono font-bold text-sky-400 text-xs">
											Phòng {group.latestStay.so_phong}
										</div>

										<!-- Col 4: Cặp Ngày gần nhất -->
										<div class="w-56 min-w-[14rem] max-w-[14rem] flex items-center gap-1.5 flex-shrink-0 font-mono text-[11px]">
											<span class="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
												In: {formatDateDisplay(group.latestStay.ngay_den)}
											</span>
											<span class="text-slate-500 font-bold">➔</span>
											{#if group.latestStay.ngay_di_thuc_te}
												<span class="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
													Out: {formatDateDisplay(group.latestStay.ngay_di_thuc_te)}
												</span>
											{:else}
												<span class="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
													Out(DK): {formatDateDisplay(group.latestStay.ngay_di_du_kien)}
												</span>
											{/if}
										</div>

										<!-- Col 5: Trạng thái gần nhất -->
										<div class="w-32 min-w-[8rem] max-w-[8rem] flex-shrink-0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="toolbar" tabindex="-1">
											<button
												type="button"
												onclick={() => openStatusModal(group.latestStay)}
												class="px-2 py-0.5 rounded-full text-[10px] font-semibold border {latestBadge.class} hover:ring-2 hover:ring-sky-400 hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 group/badge"
												title="Bấm để ghi đè / đổi trạng thái CSDL"
											>
												<span>{latestBadge.label}</span>
												<span class="text-[9px] opacity-0 group-hover/badge:opacity-100 transition-opacity">✎</span>
											</button>
										</div>

										<!-- Col 6: Thao tác -->
										<div class="flex items-center justify-end gap-1.5 flex-shrink-0 min-w-[13rem]" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="toolbar" tabindex="-1">
											<button
												type="button"
												onclick={() => openReRegisterModal(group.latestStay)}
												class="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded text-[11px] shadow transition-all flex items-center gap-1"
												title="Khai báo lại lượt mới và tự động gửi BCA ngay"
											>
												<span>🔄</span> Khai Báo Lại
											</button>
											<button
												type="button"
												onclick={() => toggleGuestExpand(group.guest_id)}
												class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-all border border-slate-700 flex items-center gap-1"
											>
												<span>{isExpanded ? 'Thu gọn ▲' : `Lịch sử (${group.stay_count}) ▼`}</span>
											</button>
										</div>
									</div>

									<!-- Expanded Stay Pairs Detail Table -->
									{#if isExpanded}
										<div class="border-t border-slate-700/60 bg-slate-950/40 p-3">
											<div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
												<span>Danh Sách Các Lượt Lưu Trú Của Khách ({group.stay_count} lượt)</span>
												<span class="text-slate-500 text-[10px] lowercase">Sắp xếp theo thứ tự mới nhất</span>
											</div>

											<div class="overflow-x-auto">
												<table class="w-full text-left text-xs border-collapse">
													<thead class="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
														<tr>
															<th class="p-2.5 w-16 text-center">Lượt</th>
															<th class="p-2.5">Phòng</th>
															<th class="p-2.5">Cặp Thời Gian Lưu Trú [Check-In ➔ Check-Out]</th>
															<th class="p-2.5">Trạng Thái</th>
															<th class="p-2.5">Ghi Chú</th>
															<th class="p-2.5 text-center">Thao Tác</th>
														</tr>
													</thead>
													<tbody class="divide-y divide-slate-800/80 font-mono">
														{#each group.stays as stay, sIdx (stay.id)}
															{@const isDeleting = deletingIds.has(stay.id)}
															{@const val = validateStayDetail(stay)}
															{@const badge = getStatusBadge(stay.status, val.hasErrors)}
															<tr class="hover:bg-slate-800/40 transition-colors {isDeleting ? 'line-through opacity-30 bg-rose-950/30' : ''}">
																<td class="p-2.5 text-center text-slate-500 font-bold">
																	#{group.stays.length - sIdx}
																	{#if sIdx === 0}
																		<span class="ml-1 text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-sans">Mới nhất</span>
																	{/if}
																</td>
																<td class="p-2.5 font-bold text-sky-400">
																	Phòng {stay.so_phong}
																</td>
																<td class="p-2.5">
																	<div class="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
																		<span class="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
																			In: {formatDateDisplay(stay.ngay_den)}
																		</span>
																		<span class="text-slate-500 font-bold">➔</span>
																		{#if stay.ngay_di_thuc_te}
																			<span class="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
																				Out: {formatDateDisplay(stay.ngay_di_thuc_te)}
																			</span>
																		{:else}
																			<span class="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
																				Out(DK): {formatDateDisplay(stay.ngay_di_du_kien)}
																			</span>
																		{/if}
																	</div>
																</td>
																<td class="p-2.5 font-sans">
																	<button
																		type="button"
																		onclick={() => openStatusModal(stay)}
																		class="px-2 py-0.5 rounded-full text-[10px] font-semibold border {badge.class} hover:ring-2 hover:ring-sky-400 hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 group/badge"
																		title="Bấm để ghi đè / đổi trạng thái CSDL"
																	>
																		<span>{badge.label}</span>
																		<span class="text-[9px] opacity-0 group-hover/badge:opacity-100 transition-opacity">✎</span>
																	</button>
																</td>
																<td class="p-2.5 text-slate-400 max-w-xs truncate font-sans">
																	{stay.ghi_chu || '-'}
																</td>
																<td class="p-2.5 text-center font-sans">
																	<div class="flex items-center justify-center gap-1">
																		<button
																			type="button"
																			onclick={() => openEdit(stay)}
																			class="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] transition-all"
																		>
																			Sửa ✎
																		</button>
																		<button
																			type="button"
																			onclick={() => openDeleteModal(stay)}
																			class="px-2 py-0.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[10px] transition-all"
																		>
																			Xóa ✕
																		</button>
																	</div>
																</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										</div>
									{/if}
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- TAB 4: AUDIT TRAIL & LOGS -->
		{#if activeTab === "audit"}
			<div class="space-y-3">
				<!-- Top Bar Actions for Logs -->
				<div class="flex items-center justify-between bg-slate-800/80 p-3 px-4 rounded-xl border border-slate-700">
					<div class="flex items-center gap-2">
						<span class="text-xs font-bold uppercase tracking-wider text-slate-300">Nhật Ký Dev Logs</span>
						<span class="text-xs font-mono font-bold bg-slate-950 text-sky-400 border border-slate-700 px-2 py-0.5 rounded-full">
							{auditLogs.length} bản ghi
						</span>
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={loadAuditLogs}
							class="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-600 flex items-center gap-1"
						>
							<span>🔄</span> Làm mới
						</button>
						{#if auditLogs.length > 0}
							<button
								type="button"
								onclick={clearAllAuditLogs}
								class="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-rose-800 flex items-center gap-1"
								title="Xóa toàn bộ các bản ghi nhật ký trong Dev Logs (không ảnh hưởng thông tin khách)"
							>
								<span>🗑️</span> Xóa toàn bộ logs
							</button>
						{/if}
					</div>
				</div>

				<div class="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
					<div class="overflow-x-auto">
						<table class="w-full text-left text-xs border-collapse">
							<thead class="bg-slate-900/90 text-slate-300 uppercase font-semibold border-b border-slate-700">
								<tr>
									<th class="p-3.5 whitespace-nowrap">Thời Gian</th>
									<th class="p-3.5 whitespace-nowrap">Hành Động</th>
									<th class="p-3.5 whitespace-nowrap">Khách Hàng</th>
									<th class="p-3.5 whitespace-nowrap">Phòng</th>
									<th class="p-3.5 whitespace-nowrap">CCCD / Hộ Chiếu</th>
									<th class="p-3.5 whitespace-nowrap">Kết Quả</th>
									<th class="p-3.5 text-center whitespace-nowrap">Thao Tác</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-700/60">
								{#if auditLogs.length === 0}
									<tr>
										<td colspan="7" class="p-8 text-center text-slate-400">Chưa có bản ghi nhật ký nào.</td>
									</tr>
								{:else}
									{#each auditLogs as log (log.id)}
										{@const act = formatAuditAction(log.api_endpoint)}
										<tr class="hover:bg-slate-700/30 transition-colors">
											<td class="p-3.5 text-slate-400 font-mono whitespace-nowrap">{formatDateTimeDisplay(log.created_at)}</td>
											<td class="p-3.5 whitespace-nowrap">
												<span class="px-2 py-0.5 rounded font-mono font-bold text-[11px] border {act.class}">
													{act.name}
												</span>
											</td>
											<td class="p-3.5 font-semibold text-slate-200 whitespace-nowrap">{log.guest_name || '-'}</td>
											<td class="p-3.5 font-mono text-sky-400 whitespace-nowrap">{log.so_phong ? `Phòng ${log.so_phong}` : '-'}</td>
											<td class="p-3.5 font-mono text-slate-300 whitespace-nowrap">{log.so_giay_to || '-'}</td>
											<td class="p-3.5 whitespace-nowrap">
												{#if log.is_success}
													<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-medium text-[10px]">
														✓ Thành công
													</span>
												{:else}
													{@const failReason = getAuditLogFailureReason(log)}
													<span
														class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold text-[10px] cursor-help hover:bg-rose-900 transition-all"
														title={log.error_message && log.error_message !== failReason ? `${failReason}\n(Chi tiết kỹ thuật: ${log.error_message})` : failReason}
													>
														✕ Thất bại ({log.code || '500'})
													</span>
												{/if}
											</td>
											<td class="p-3.5 text-center whitespace-nowrap">
												<div class="flex items-center justify-center gap-1.5">
													<button
														type="button"
														onclick={() => openPayloadViewer(log)}
														class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[11px] rounded transition-all"
														title="Xem chi tiết Request / Response JSON"
													>
														{`{ } JSON`}
													</button>
													<button
														type="button"
														onclick={() => deleteAuditLogItem(log.id)}
														class="p-1 px-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-white rounded border border-rose-800/60 transition-all text-xs"
														title="Xóa bản ghi nhật ký này khỏi Dev Logs (không ảnh hưởng dữ liệu khách)"
													>
														🗑️
													</button>
												</div>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- TAB 4: DANH MỤC CHUẨN -->
		{#if activeTab === "catalogs"}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- 1. Quốc Tịch (API 6) -->
				<div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
					<div class="flex items-center justify-between mb-2">
						<h3 class="font-bold text-xs uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
							<span>🌐</span> Quốc Tịch (API 6)
						</h3>
						<span class="text-xs font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/50 px-2 py-0.5 rounded-full">
							{catalogs.quocTich.length}
						</span>
					</div>
					<input
						type="text"
						bind:value={filterQuocTich}
						placeholder="Tìm quốc tịch (vd: Germany, D, VNM)..."
						class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 mb-2 focus:outline-none focus:border-sky-500 transition-colors"
					/>
					<div class="overflow-y-auto max-h-80 divide-y divide-slate-700/50 text-xs pr-1">
						{#each catalogs.quocTich.filter(q => {
							const query = (filterQuocTich || "").trim().toLowerCase();
							if (!query) return true;
							const ten = String(q.tenQT || "").toLowerCase();
							const tenEn = String(q.tenQTEn || "").toLowerCase();
							const ma = String(q.maQT || "").toLowerCase();
							return ten.includes(query) || tenEn.includes(query) || ma.includes(query);
						}) as qt}
							<div class="py-2 flex items-center justify-between hover:bg-slate-700/30 px-1 rounded transition-colors">
								<div>
									<div class="font-semibold text-slate-200">{qt.tenQTEn || qt.tenQT}</div>
									{#if qt.tenQT && qt.tenQT !== qt.tenQTEn}
										<div class="text-[10px] text-slate-400">{qt.tenQT}</div>
									{/if}
								</div>
								<button
									type="button"
									onclick={() => copyCode(String(qt.maQT || ""), String(qt.tenQTEn || qt.tenQT || ""))}
									title="Sao chép mã Alpha-3"
									class="font-mono text-[11px] font-bold text-amber-400 bg-slate-900 hover:bg-amber-900/60 px-2 py-0.5 rounded border border-slate-700 hover:border-amber-600 transition-colors"
								>
									{qt.maQT}
								</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- 3. Loại Giấy Tờ (API 10) -->
				<div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
					<div class="flex items-center justify-between mb-3">
						<h3 class="font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
							<span>🪪</span> Loại Giấy Tờ (API 10)
						</h3>
						<span class="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full">
							{catalogs.loaiGiayTo.length}
						</span>
					</div>
					<div class="space-y-2 text-xs">
						{#each catalogs.loaiGiayTo as lg}
							<div class="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
								<span class="font-medium text-slate-200">{lg.name}</span>
								<span class="font-mono text-indigo-300 font-bold bg-indigo-950 px-2 py-0.5 rounded border border-indigo-700/60 text-[11px]">
									Mã: {lg.id}
								</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- 4. Lý Do Cư Trú (API 9) -->
				<div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
					<div class="flex items-center justify-between mb-3">
						<h3 class="font-bold text-xs uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
							<span>📋</span> Lý Do Cư Trú (API 9)
						</h3>
						<span class="text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full">
							{catalogs.lyDoCuTru.length}
						</span>
					</div>
					<div class="space-y-2 text-xs">
						{#each catalogs.lyDoCuTru as ld}
							<div class="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
								<span class="font-medium text-slate-200">{ld.name}</span>
								<span class="font-mono text-purple-300 font-bold bg-purple-950 px-2 py-0.5 rounded border border-purple-700/60 text-[11px]">
									Mã: {ld.id}
								</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- MODAL: EDIT GUEST & STAY -->
	{#if showEditModal && editStay}
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
				<div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
					<h3 class="text-lg font-bold text-sky-400 flex items-center gap-2">
						<span>✎</span> Chỉnh Sửa Thông Tin Khách Lưu Trú
					</h3>
					<button type="button" onclick={() => { showEditModal = false; }} class="text-slate-400 hover:text-white text-xl">✕</button>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
					<div>
						<label for="edit_ho_ten" class="block text-slate-400 mb-1 font-medium">Họ và tên <span class="text-rose-400">*</span></label>
						<input
							id="edit_ho_ten"
							type="text"
							bind:value={editStay.ho_ten}
							placeholder="NGUYỄN VĂN A"
							class="w-full bg-slate-900 border {editLiveVal.errors.ho_ten ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 uppercase focus:outline-none focus:border-sky-500 transition-colors"
						/>
						{#if editLiveVal.errors.ho_ten}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.ho_ten}</p>
						{/if}
					</div>

					<div>
						<label for="edit_so_phong" class="block text-slate-400 mb-1 font-medium">Số phòng <span class="text-rose-400">*</span></label>
						<select
							id="edit_so_phong"
							bind:value={editStay.so_phong}
							class="w-full bg-slate-900 border {editLiveVal.errors.so_phong ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition-colors"
						>
							{#each ROOM_OPTIONS as r}
								<option value={r}>Phòng {r}</option>
							{/each}
						</select>
						{#if editLiveVal.errors.so_phong}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.so_phong}</p>
						{/if}
					</div>

					<div>
						<label for="edit_loai_giay_to" class="block text-slate-400 mb-1 font-medium">Loại giấy tờ <span class="text-rose-400">*</span></label>
						<select
							id="edit_loai_giay_to"
							bind:value={editStay.loai_giay_to}
							class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
						>
							{#each LOAI_GIAY_TO_OPTIONS as opt}
								<option value={opt.id}>{opt.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="edit_so_giay_to" class="block text-slate-400 mb-1 font-medium">Số CCCD / Hộ Chiếu <span class="text-rose-400">*</span></label>
						<input
							id="edit_so_giay_to"
							type="text"
							bind:value={editStay.so_giay_to}
							oninput={(e) => {
								if (editStay) {
									editStay.so_giay_to = cleanDocNumberInput((e.target as HTMLInputElement).value, editStay.loai_giay_to);
								}
							}}
							onkeydown={(e) => {
								if (editStay) handleDocNumberKeyDown(e, editStay.loai_giay_to);
							}}
							placeholder={editStay.loai_giay_to === '4' || editStay.loai_giay_to === 'HO_CHIEU' ? 'P12345678' : '001202012345'}
							class="w-full bg-slate-900 border {editLiveVal.errors.so_giay_to ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 font-mono uppercase focus:outline-none focus:border-sky-500 transition-colors"
						/>
						{#if editLiveVal.errors.so_giay_to}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.so_giay_to}</p>
						{/if}
					</div>

					<div>
						<label for="edit_quoc_tich" class="block text-slate-400 mb-1 font-medium">Quốc tịch <span class="text-rose-400">*</span></label>
						<select
							id="edit_quoc_tich"
							bind:value={editStay.quoc_tich}
							onchange={onEditQuocTichChange}
							class="w-full bg-slate-900 border {editLiveVal.errors.quoc_tich ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
						>
							{#each COUNTRY_OPTIONS as c}
								<option value={c.maQT}>{c.label}</option>
							{/each}
						</select>
						{#if editLiveVal.errors.quoc_tich}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.quoc_tich}</p>
						{/if}
					</div>

					<div>
						<label for="edit_ngay_sinh" class="block text-slate-400 mb-1 font-medium">Ngày sinh (DD/MM/YYYY)</label>
						<input
							id="edit_ngay_sinh"
							type="text"
							bind:value={editStay.ngay_sinh}
							placeholder="22/09/2002"
							class="w-full bg-slate-900 border {editLiveVal.errors.ngay_sinh ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition-colors"
						/>
						{#if editLiveVal.errors.ngay_sinh}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.ngay_sinh}</p>
						{/if}
					</div>

					<div>
						<span class="block text-slate-400 mb-1 font-medium">Giới tính</span>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								onclick={() => { if (editStay) editStay.gioi_tinh = 'M'; }}
								class="py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 {editStay.gioi_tinh !== 'F' ? 'bg-blue-600/30 text-blue-200 border-blue-500 shadow-md ring-1 ring-blue-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}"
							>
								<span>♂</span> Nam
							</button>
							<button
								type="button"
								onclick={() => { if (editStay) editStay.gioi_tinh = 'F'; }}
								class="py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 {editStay.gioi_tinh === 'F' ? 'bg-pink-600/30 text-pink-200 border-pink-500 shadow-md ring-1 ring-pink-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}"
							>
								<span>♀</span> Nữ
							</button>
						</div>
					</div>

					<div>
						<label for="edit_thoi_han_thi_thuc" class="block text-slate-400 mb-1 font-medium">Thời hạn thị thực (DD/MM/YYYY)</label>
						<input
							id="edit_thoi_han_thi_thuc"
							type="text"
							bind:value={editStay.thoi_han_thi_thuc}
							disabled={editStay.quoc_tich === 'VNM'}
							placeholder={editStay.quoc_tich === 'VNM' ? 'Không áp dụng (Việt Nam)' : '31/12/2026'}
							class="w-full bg-slate-900 border {editLiveVal.errors.thoi_han_thi_thuc ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 font-mono {editStay.quoc_tich === 'VNM' ? 'opacity-40 cursor-not-allowed bg-slate-950/60' : ''} focus:outline-none focus:border-sky-500 transition-colors"
						/>
						{#if editLiveVal.errors.thoi_han_thi_thuc}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.thoi_han_thi_thuc}</p>
						{/if}
					</div>

					<div>
						<label for="edit_ngay_den" class="block text-slate-400 mb-1 font-medium">Ngày đến (DD/MM/YYYY HH:mm:ss) <span class="text-rose-400">*</span></label>
						<input
							id="edit_ngay_den"
							type="text"
							bind:value={editStay.ngay_den}
							placeholder="17/09/2026 14:00:00"
							class="w-full bg-slate-900 border {editLiveVal.errors.ngay_den ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition-colors"
						/>
						{#if editLiveVal.errors.ngay_den}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.ngay_den}</p>
						{/if}
					</div>

					<div>
						<label for="edit_ngay_di_du_kien" class="block text-slate-400 mb-1 font-medium">Ngày đi dự kiến (DD/MM/YYYY HH:mm:ss)</label>
						<input
							id="edit_ngay_di_du_kien"
							type="text"
							bind:value={editStay.ngay_di_du_kien}
							placeholder="19/09/2026 12:00:00"
							class="w-full bg-slate-900 border {editLiveVal.errors.ngay_di_du_kien ? 'border-rose-500 bg-rose-950/20' : 'border-slate-700'} rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition-colors"
						/>
						{#if editLiveVal.errors.ngay_di_du_kien}
							<p class="text-rose-400 text-[11px] mt-1 font-medium flex items-center gap-1">⚠ {editLiveVal.errors.ngay_di_du_kien}</p>
						{/if}
					</div>

					<div class="sm:col-span-2">
						<label for="edit_status" class="block text-slate-400 mb-1 font-medium">Trạng thái lưu trú</label>
						<select
							id="edit_status"
							bind:value={editStay.status}
							class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 transition-colors font-semibold"
						>
							<option value="SYNCED_KBTT">🏨 Đang ở (Đã gửi BCA)</option>
							<option value="READY_TO_SYNC">📤 Sẵn sàng khai báo</option>
							<option value="CHECKED_OUT">🚪 Đã trả phòng</option>
						</select>
					</div>

					<div class="sm:col-span-2">
						<label for="edit_dia_chi_chi_tiet" class="block text-slate-400 mb-1 font-medium">Địa chỉ</label>
						<input
							id="edit_dia_chi_chi_tiet"
							type="text"
							bind:value={editStay.dia_chi_chi_tiet}
							placeholder="Số nhà, đường phố, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
							class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
						/>
					</div>

					<div class="sm:col-span-2">
						<label for="edit_ghi_chu" class="block text-slate-400 mb-1 font-medium">Ghi chú</label>
						<input
							id="edit_ghi_chu"
							type="text"
							bind:value={editStay.ghi_chu}
							placeholder="Ghi chú thêm về lượt lưu trú..."
							class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
						/>
					</div>
				</div>

				<div class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 border-t border-slate-700 pt-4">
					<div class="text-[11px]">
						{#if !editLiveVal.allValid}
							<span class="text-rose-400 font-medium flex items-center gap-1">
								<span>⚠</span> Vui lòng sửa các trường báo đỏ trước khi lưu.
							</span>
						{:else}
							<span class="text-emerald-400 font-medium flex items-center gap-1">
								<span>✓</span> Thông tin hợp lệ, có thể lưu ngay.
							</span>
						{/if}
					</div>

					<div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
						<button type="button" onclick={() => { showEditModal = false; }} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors">Hủy</button>
						<button
							type="button"
							onclick={() => submitEdit()}
							disabled={!editLiveVal.allValid}
							class="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
						>
							<span>💾</span> Lưu Thay Đổi
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: GHI ĐÈ TRẠNG THÁI LƯU TRÚ (STATUS OVERRIDE) -->
	{#if showStatusModal && statusTargetStay}
		{@const curBadge = getStatusBadge(statusTargetStay.status)}
		<div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
				<div class="flex items-center justify-between border-b border-slate-800 pb-3">
					<div class="flex items-center gap-2.5">
						<span class="text-2xl">🔄</span>
						<div>
							<h3 class="font-bold text-slate-100 text-base">Ghi Đè Trạng Thái Lưu Trú</h3>
							<p class="text-xs text-slate-400">Điều chỉnh trạng thái trong Database khi bị lệch với cổng BCA</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => { showStatusModal = false; }}
						class="text-slate-400 hover:text-white text-xl p-1 rounded-lg hover:bg-slate-800 transition-colors"
					>✕</button>
				</div>

				<div class="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
					<div class="flex justify-between">
						<span class="text-slate-400 font-sans">Khách hàng:</span>
						<strong class="text-slate-100 font-bold">{statusTargetStay.ho_ten}</strong>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400 font-sans">Số giấy tờ:</span>
						<span class="text-slate-200">{statusTargetStay.so_giay_to} ({statusTargetStay.quoc_tich})</span>
					</div>
					<div class="flex justify-between">
						<span class="text-slate-400 font-sans">Số phòng:</span>
						<span class="text-sky-400 font-bold">Phòng {statusTargetStay.so_phong}</span>
					</div>
					<div class="flex justify-between items-center pt-1 border-t border-slate-800/80">
						<span class="text-slate-400 font-sans">Trạng thái hiện tại:</span>
						<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border {curBadge.class}">
							{curBadge.label} ({statusTargetStay.status})
						</span>
					</div>
				</div>

				<div class="space-y-2">
					<label for="status-selector-grid" class="block text-xs font-semibold text-slate-300">
						Chọn trạng thái mới muốn thiết lập:
					</label>
					<div id="status-selector-grid" class="grid grid-cols-1 gap-2.5 text-xs">
						<!-- SYNCED_KBTT -->
						<button
							type="button"
							onclick={() => { selectedNewStatus = 'SYNCED_KBTT'; }}
							class="p-3 rounded-xl border text-left transition-all flex items-start gap-3 {selectedNewStatus === 'SYNCED_KBTT' ? 'bg-emerald-950/90 border-emerald-500 ring-2 ring-emerald-400/30' : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}"
						>
							<span class="text-lg mt-0.5">🏨</span>
							<div>
								<div class="font-bold text-sm {selectedNewStatus === 'SYNCED_KBTT' ? 'text-emerald-300' : 'text-slate-200'}">Đang ở (Đã gửi BCA)</div>
								<div class="text-[11px] text-slate-400 leading-tight mt-0.5">Gắn flag để có thể bấm Checkout 🚪 hoặc Gia hạn ⏱️ lại lên hệ thống BCA</div>
							</div>
						</button>

						<!-- READY_TO_SYNC -->
						<button
							type="button"
							onclick={() => { selectedNewStatus = 'READY_TO_SYNC'; }}
							class="p-3 rounded-xl border text-left transition-all flex items-start gap-3 {selectedNewStatus === 'READY_TO_SYNC' ? 'bg-sky-950/90 border-sky-500 ring-2 ring-sky-400/30' : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}"
						>
							<span class="text-lg mt-0.5">📤</span>
							<div>
								<div class="font-bold text-sm {selectedNewStatus === 'READY_TO_SYNC' ? 'text-sky-300' : 'text-slate-200'}">Sẵn sàng khai báo</div>
								<div class="text-[11px] text-slate-400 leading-tight mt-0.5">Đưa về danh sách chờ khai báo để gửi lại thông báo lưu trú lên cổng BCA</div>
							</div>
						</button>

						<!-- CHECKED_OUT -->
						<button
							type="button"
							onclick={() => { selectedNewStatus = 'CHECKED_OUT'; }}
							class="p-3 rounded-xl border text-left transition-all flex items-start gap-3 {selectedNewStatus === 'CHECKED_OUT' ? 'bg-slate-800 border-slate-400 ring-2 ring-slate-400/30' : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'}"
						>
							<span class="text-lg mt-0.5">🚪</span>
							<div>
								<div class="font-bold text-sm {selectedNewStatus === 'CHECKED_OUT' ? 'text-slate-200' : 'text-slate-300'}">Đã trả phòng</div>
								<div class="text-[11px] text-slate-400 leading-tight mt-0.5">Đóng lượt lưu trú và lưu trữ lịch sử phòng trong CSDL</div>
							</div>
						</button>
					</div>
				</div>

				<div class="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-start gap-2">
					<span class="text-base">💡</span>
					<div>
						<strong>Mẹo xử lý:</strong> Nếu khách đã bị checkout nhầm trên DB nhưng trên cổng BCA vẫn còn đang ở, hãy chuyển sang <span class="font-bold underline">"Đang ở (Đã gửi BCA)"</span> rồi sau đó ra bảng điều khiển bấm lại nút <strong>"Checkout 🚪"</strong> để hệ thống gửi lệnh trả phòng lên BCA.
					</div>
				</div>

				<div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
					<button
						type="button"
						onclick={() => { showStatusModal = false; }}
						class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
					>
						Hủy Bỏ
					</button>
					<button
						type="button"
						onclick={() => submitStatusOverride()}
						class="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-600/30 transition-all flex items-center gap-1.5"
					>
						<span>💾</span> Lưu Trạng Thái
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: EXTEND STAY -->
	{#if showExtendModal && extendTargetStay}
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
				<h3 class="text-base font-bold text-indigo-400 mb-3 flex items-center gap-2">
					<span>⏱</span> Gia Hạn Thời Hạn Lưu Trú
				</h3>
				<p class="text-xs text-slate-300 mb-4">
					Khách hàng: <strong class="text-white">{extendTargetStay.ho_ten}</strong> (Phòng {extendTargetStay.so_phong})
				</p>

				<div class="mb-4">
					<label for="extend_new_date" class="block text-xs text-slate-400 mb-1">Ngày đi dự kiến mới (YYYY-MM-DD):</label>
					<input
						id="extend_new_date"
						type="date"
						bind:value={extendNewDate}
						class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
					/>
				</div>

				<div class="flex items-center justify-end gap-2">
					<button type="button" onclick={() => { showExtendModal = false; }} class="px-3.5 py-2 bg-slate-700 rounded-lg text-xs">Hủy</button>
					<button type="button" onclick={() => submitExtend()} class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs">Xác Nhận Gia Hạn</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: CHECKOUT -->
	{#if showCheckoutModal && checkoutTargetStay}
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
				<h3 class="text-base font-bold text-amber-400 mb-3 flex items-center gap-2">
					<span>🚪</span> Xác Nhận Checkout Trả Phòng
				</h3>
				<p class="text-xs text-slate-300 mb-2">
					Bạn có chắc chắn muốn trả phòng cho khách: <strong class="text-white">{checkoutTargetStay.ho_ten}</strong>?
				</p>
				<p class="text-xs text-slate-400 mb-4">
					Phòng <strong class="text-sky-400">{checkoutTargetStay.so_phong}</strong> sẽ được giải phóng trong CSDL.
				</p>

				<div class="flex items-center justify-end gap-2">
					<button type="button" onclick={() => { showCheckoutModal = false; }} class="px-3.5 py-2 bg-slate-700 rounded-lg text-xs">Hủy</button>
					<button type="button" onclick={() => submitCheckout()} class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs">Xác Nhận Trả Phòng</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: RE-REGISTER STAY -->
	{#if showReRegisterModal && reRegisterTargetStay}
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
				<div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
					<h3 class="text-base font-bold text-purple-400 flex items-center gap-2">
						<span>🔄</span> Khai Báo Lại Cho Khách (Báo Cáo BCA Ngay)
					</h3>
					<button type="button" onclick={() => { showReRegisterModal = false; }} class="text-slate-400 hover:text-white text-xl">✕</button>
				</div>

				<div class="space-y-3.5 text-xs">
					<div class="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
						<div>
							<div class="font-bold text-slate-100 text-sm">{reRegisterTargetStay.ho_ten}</div>
							<div class="text-slate-400 font-mono mt-0.5">{reRegisterTargetStay.so_giay_to} ({reRegisterTargetStay.quoc_tich})</div>
						</div>
						<span class="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
							Phòng {reRegisterTargetStay.so_phong}
						</span>
					</div>

					<p class="text-slate-300 leading-relaxed">
						Hệ thống sẽ tạo <strong>lượt lưu trú mới</strong> với giờ đến là <strong>thời điểm hiện tại (GMT+7)</strong> và <strong>tự động gửi báo cáo ngay lên Cổng Bộ Công An</strong>.
					</p>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
						<div>
							<label for="rereg_room" class="block text-slate-400 mb-1 font-medium">Số Phòng</label>
							<select id="rereg_room" bind:value={reRegisterRoom} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-purple-500">
								{#each ROOM_OPTIONS as r}
									<option value={r}>Phòng {r}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="rereg_arrival" class="block text-slate-400 mb-1 font-medium">Ngày Giờ Đến (Hiện Tại)</label>
							<input id="rereg_arrival" type="text" bind:value={reRegisterArrivalDate} class="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono focus:outline-none cursor-not-allowed" readonly />
						</div>

						<div class="sm:col-span-2">
							<label for="rereg_departure" class="block text-slate-400 mb-1 font-medium">Ngày Đi Dự Kiến <span class="text-slate-500 font-normal">(Giờ trả phòng tự động là 12:00:00)</span></label>
							<input id="rereg_departure" type="date" bind:value={reRegisterDepartureDate} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-purple-500" />
						</div>
					</div>
				</div>

				<div class="mt-6 pt-3 border-t border-slate-700 flex items-center justify-end gap-2">
					<button type="button" onclick={() => { showReRegisterModal = false; }} class="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">Hủy</button>
					<button type="button" onclick={() => submitReRegister()} class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-purple-900/30">
						<span>⚡</span> Gửi Khai Báo Lên BCA Ngay
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: DELETE STAY -->
	{#if showDeleteModal && deleteTargetStay}
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
				<h3 class="text-base font-bold text-rose-400 mb-3 flex items-center gap-2">
					<span>✕</span> Xác Nhận Xóa Lượt Lưu Trú
				</h3>
				<p class="text-xs text-slate-300 mb-4">
					Xóa bản ghi lưu trú của khách <strong class="text-white">{deleteTargetStay.ho_ten}</strong> (Phòng {deleteTargetStay.so_phong}) khỏi cơ sở dữ liệu?
				</p>

				<div class="flex items-center justify-end gap-2">
					<button type="button" onclick={() => { showDeleteModal = false; }} class="px-3.5 py-2 bg-slate-700 rounded-lg text-xs">Hủy</button>
					<button type="button" onclick={() => submitDelete()} class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs">Xóa Vĩnh Viễn</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: JSON PAYLOAD INSPECTOR -->
	{#if showPayloadModal && selectedLog}
		{@const modalAct = formatAuditAction(selectedLog.api_endpoint)}
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-3xl rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
				<div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
					<h3 class="text-sm font-bold text-sky-400 flex items-center gap-2">
						<span>🔍</span> Chi Tiết Audit Log: <span class="px-2 py-0.5 rounded font-mono font-bold text-xs border {modalAct.class}">{modalAct.name}</span>
						{#if selectedLog.guest_name}
							<span class="text-slate-300 font-normal">({selectedLog.guest_name})</span>
						{/if}
					</h3>
					<button type="button" onclick={() => { showPayloadModal = false; }} class="text-slate-400 hover:text-white text-xl">✕</button>
				</div>

				{#if !selectedLog.is_success}
					<div class="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
						<span class="text-rose-400 font-bold flex-shrink-0">⚠️ Lý do thất bại:</span>
						<span>{getAuditLogFailureReason(selectedLog)}</span>
					</div>
				{/if}

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto text-xs font-mono">
					<div>
						<div class="text-slate-400 font-bold mb-1">Request Payload (Gửi đi):</div>
						<pre class="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto text-slate-300 whitespace-pre-wrap">{selectedLog.request_payload || 'Trống'}</pre>
					</div>

					<div>
						<div class="text-slate-400 font-bold mb-1">Response Payload (Phản hồi từ BCA):</div>
						<pre class="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto {selectedLog.is_success ? 'text-emerald-300' : 'text-rose-300'} whitespace-pre-wrap">{selectedLog.response_payload || 'Trống'}</pre>
					</div>
				</div>

				<div class="mt-4 pt-3 border-t border-slate-700 flex justify-end">
					<button type="button" onclick={() => { showPayloadModal = false; }} class="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs">Đóng</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: ADD GUEST MANUALLY -->
	{#if showAddModal}
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
				<div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
					<h3 class="text-lg font-bold text-sky-400 flex items-center gap-2">
						<span>+</span> Thêm Mới Khách Lưu Trú Vào CSDL
					</h3>
					<button type="button" onclick={() => { showAddModal = false; }} class="text-slate-400 hover:text-white text-xl">✕</button>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
					<div>
						<label for="add_ho_ten" class="block text-slate-400 mb-1 font-medium">Họ và tên <span class="text-rose-400">*</span></label>
						<input id="add_ho_ten" type="text" bind:value={newGuestForm.ho_ten} placeholder="NGUYỄN VĂN A" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 uppercase focus:outline-none focus:border-sky-500" />
					</div>

					<div>
						<label for="add_so_phong" class="block text-slate-400 mb-1 font-medium">Số phòng (1-9) <span class="text-rose-400">*</span></label>
						<select id="add_so_phong" bind:value={newGuestForm.so_phong} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500">
							{#each ROOM_OPTIONS as r}
								<option value={r}>Phòng {r}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="add_loai_giay_to" class="block text-slate-400 mb-1 font-medium">Loại giấy tờ <span class="text-rose-400">*</span></label>
						<select id="add_loai_giay_to" bind:value={newGuestForm.loai_giay_to} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500">
							{#each LOAI_GIAY_TO_OPTIONS as opt}
								<option value={opt.id}>{opt.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="add_so_giay_to" class="block text-slate-400 mb-1 font-medium">Số CCCD / Hộ Chiếu <span class="text-rose-400">*</span></label>
						<input
							id="add_so_giay_to"
							type="text"
							bind:value={newGuestForm.so_giay_to}
							oninput={(e) => {
								newGuestForm.so_giay_to = cleanDocNumberInput((e.target as HTMLInputElement).value, newGuestForm.loai_giay_to);
							}}
							onkeydown={(e) => handleDocNumberKeyDown(e, newGuestForm.loai_giay_to)}
							placeholder={newGuestForm.loai_giay_to === '4' ? 'P12345678' : '001202012345'}
							class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono uppercase focus:outline-none focus:border-sky-500"
						/>
					</div>

					<div>
						<label for="add_quoc_tich" class="block text-slate-400 mb-1 font-medium">Quốc tịch <span class="text-rose-400">*</span></label>
						<select id="add_quoc_tich" bind:value={newGuestForm.quoc_tich} onchange={onAddQuocTichChange} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500">
							{#each COUNTRY_OPTIONS as c}
								<option value={c.maQT}>{c.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="add_ngay_sinh" class="block text-slate-400 mb-1 font-medium">Ngày sinh (DD/MM/YYYY)</label>
						<input id="add_ngay_sinh" type="text" bind:value={newGuestForm.ngay_sinh} placeholder="01/01/2000" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500" />
					</div>

					<div>
						<span class="block text-slate-400 mb-1 font-medium">Giới tính</span>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								onclick={() => { newGuestForm.gioi_tinh = 'M'; }}
								class="py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 {newGuestForm.gioi_tinh !== 'F' ? 'bg-blue-600/30 text-blue-200 border-blue-500 shadow-md ring-1 ring-blue-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}"
							>
								<span>♂</span> Nam
							</button>
							<button
								type="button"
								onclick={() => { newGuestForm.gioi_tinh = 'F'; }}
								class="py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 {newGuestForm.gioi_tinh === 'F' ? 'bg-pink-600/30 text-pink-200 border-pink-500 shadow-md ring-1 ring-pink-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}"
							>
								<span>♀</span> Nữ
							</button>
						</div>
					</div>

					<div>
						<label for="add_thoi_han_thi_thuc" class="block text-slate-400 mb-1 font-medium">Thời hạn thị thực (DD/MM/YYYY)</label>
						<input
							id="add_thoi_han_thi_thuc"
							type="text"
							bind:value={newGuestForm.thoi_han_thi_thuc}
							disabled={newGuestForm.quoc_tich === 'VNM'}
							placeholder={newGuestForm.quoc_tich === 'VNM' ? 'Không áp dụng (Việt Nam)' : '31/12/2026'}
							class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono {newGuestForm.quoc_tich === 'VNM' ? 'opacity-40 cursor-not-allowed bg-slate-950/60' : ''} focus:outline-none focus:border-sky-500"
						/>
					</div>

					<div>
						<label for="add_ngay_den" class="block text-slate-400 mb-1 font-medium">Ngày đến (DD/MM/YYYY HH:mm:ss)</label>
						<input id="add_ngay_den" type="text" bind:value={newGuestForm.ngay_den} placeholder="17/09/2026 14:00:00" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500" />
					</div>

					<div>
						<label for="add_ngay_di_du_kien" class="block text-slate-400 mb-1 font-medium">Ngày đi dự kiến (DD/MM/YYYY HH:mm:ss)</label>
						<input id="add_ngay_di_du_kien" type="text" bind:value={newGuestForm.ngay_di_du_kien} placeholder="19/09/2026 12:00:00" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-sky-500" />
					</div>

					<div class="sm:col-span-2">
						<label for="add_dia_chi_chi_tiet" class="block text-slate-400 mb-1 font-medium">Địa chỉ</label>
						<input id="add_dia_chi_chi_tiet" type="text" bind:value={newGuestForm.dia_chi_chi_tiet} placeholder="Số nhà, đường phố, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500" />
					</div>

					<div class="sm:col-span-2">
						<label for="add_ghi_chu" class="block text-slate-400 mb-1 font-medium">Ghi chú</label>
						<input id="add_ghi_chu" type="text" bind:value={newGuestForm.ghi_chu} placeholder="Ghi chú thêm về lượt lưu trú..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500" />
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
					<button type="button" onclick={() => { showAddModal = false; }} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium">Hủy</button>
					<button type="button" onclick={() => submitAddGuest()} class="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-lg">Thêm Khách</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- MODAL: CUSTOM REUSABLE CONFIRM DIALOG -->
	{#if showCustomConfirmModal && confirmDialogState}
		<div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
				<div class="flex items-center gap-3 mb-3">
					<div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 {confirmDialogState.isDanger ? 'bg-rose-950/80 border border-rose-700/80 text-rose-300' : 'bg-sky-950/80 border border-sky-700/80 text-sky-300'}">
						{confirmDialogState.icon}
					</div>
					<div>
						<h3 class="text-sm md:text-base font-bold {confirmDialogState.isDanger ? 'text-rose-400' : 'text-slate-100'}">
							{confirmDialogState.title}
						</h3>
					</div>
				</div>

				<p class="text-xs md:text-sm text-slate-300 mb-2 leading-relaxed">
					{confirmDialogState.message}
				</p>

				{#if confirmDialogState.subMessage}
					<p class="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 mb-4">
						{confirmDialogState.subMessage}
					</p>
				{/if}

				<div class="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-700/60">
					<button
						type="button"
						onclick={() => { showCustomConfirmModal = false; }}
						class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-all"
					>
						{confirmDialogState.cancelText}
					</button>
					<button
						type="button"
						onclick={handleCustomConfirm}
						class="px-4 py-2 {confirmDialogState.isDanger ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30'} text-white font-bold rounded-xl text-xs shadow-lg transition-all transform active:scale-95 flex items-center gap-1.5"
					>
						<span>{confirmDialogState.confirmText}</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
{/if}
