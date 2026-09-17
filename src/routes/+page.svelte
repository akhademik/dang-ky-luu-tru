<script lang="ts">
import { onMount } from "svelte";

interface StayDetail {
	id: string;
	guest_id: string;
	so_phong: string;
	ngay_den: string;
	ngay_di_du_kien?: string;
	ngay_di_thuc_te?: string;
	ly_do_luu_tru?: number;
	ly_do_chi_tiet?: string;
	status:
		| "PENDING_VALIDATION"
		| "READY_TO_SYNC"
		| "SYNCED_KBTT"
		| "EXTENDED"
		| "CHECKED_OUT"
		| "CANCELLED";
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
	so_dien_thoai?: string;
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
let activeTab = $state<"register" | "inhouse" | "audit" | "catalogs">(
	"register",
);
let stays = $state<StayDetail[]>([]);
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
	tinhTp: CatalogItem[];
	loaiGiayTo: CatalogItem[];
	lyDoCuTru: CatalogItem[];
}>({
	quocTich: [],
	tinhTp: [],
	loaiGiayTo: [],
	lyDoCuTru: [],
});

let loading = $state(false);
let searchTerm = $state("");
let filterRoom = $state("");
let currentEnv = $state<"dev" | "prod">("dev");
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

let showDeleteModal = $state(false);
let deleteTargetStay = $state<StayDetail | null>(null);

let showPayloadModal = $state(false);
let selectedLog = $state<KbttLog | null>(null);

let showAddModal = $state(false);
let newGuestForm = $state({
	ho_ten: "",
	so_giay_to: "",
	quoc_tich: "VNM",
	loai_giay_to: "CCCD",
	ngay_sinh: "2000-01-01",
	gioi_tinh: "M",
	so_phong: "1",
	ngay_den: "",
	ngay_di_du_kien: "",
	dia_chi_chi_tiet: "",
	phuong_xa: "",
	quan_huyen: "",
	tinh_thanh: "TP. Hà Nội",
	so_dien_thoai: "",
});

function showToast(
	message: string,
	type: "success" | "error" | "info" = "info",
) {
	notification = { message, type };
	setTimeout(() => {
		if (notification?.message === message) notification = null;
	}, 4000);
}

async function loadStats() {
	try {
		const res = await fetch("/api/stats");
		const data = await res.json();
		if (data.success && data.data) {
			stats = data.data;
		}
	} catch {}
}

async function loadStays() {
	loading = true;
	try {
		const statusParam =
			activeTab === "register"
				? "READY_TO_SYNC"
				: activeTab === "inhouse"
					? "ALL"
					: "ALL";
		const url = new URL("/api/stays", window.location.origin);
		if (activeTab === "register") {
			url.searchParams.set("status", "READY_TO_SYNC");
		}
		if (searchTerm) url.searchParams.set("search", searchTerm);
		if (filterRoom) url.searchParams.set("room", filterRoom);

		const res = await fetch(url.toString());
		const data = await res.json();
		if (data.success) {
			stays = data.data;
		}
		await loadStats();
	} catch (err) {
		showToast("Không thể tải danh sách lưu trú từ CSDL", "error");
	} finally {
		loading = false;
	}
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

async function loadCatalogs() {
	try {
		const res = await fetch("/api/catalogs");
		const data = await res.json();
		if (data.success && data.data) {
			catalogs = data.data;
		}
	} catch {}
}

async function switchEnv(env: "dev" | "prod") {
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
	try {
		showToast("Đang gửi khai báo lên Cổng KBTT Bộ Công An...", "info");
		const res = await fetch("/api/stays/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stayId }),
		});
		const data = await res.json();
		if (data.success) {
			showToast("✓ Đăng ký lưu trú thành công!", "success");
			await loadStays();
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
			showToast(data.message || "Đăng ký hàng loạt thành công!", "success");
		} else {
			showToast(data.message || "Có lỗi trong quá trình đăng ký", "error");
		}
		await loadStays();
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		showToast(`Lỗi kết nối: ${msg}`, "error");
	}
}

// Extend Stay
function openExtendModal(stay: StayDetail) {
	extendTargetStay = stay;
	extendNewDate = stay.ngay_di_du_kien || "";
	showExtendModal = true;
}

async function submitExtend() {
	if (!extendTargetStay || !extendNewDate) return;
	try {
		const res = await fetch("/api/stays/extend", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				stayId: extendTargetStay.id,
				newNgayDi: extendNewDate,
			}),
		});
		const data = await res.json();
		if (data.success) {
			showToast(data.message || "Gia hạn thành công!", "success");
			showExtendModal = false;
			await loadStays();
		} else {
			showToast(`Lỗi: ${data.message}`, "error");
		}
	} catch {
		showToast("Lỗi khi gia hạn", "error");
	}
}

// Checkout
function openCheckoutModal(stay: StayDetail) {
	checkoutTargetStay = stay;
	showCheckoutModal = true;
}

async function submitCheckout() {
	if (!checkoutTargetStay) return;
	try {
		const res = await fetch("/api/stays/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stayId: checkoutTargetStay.id }),
		});
		const data = await res.json();
		if (data.success) {
			showToast(data.message || "Checkout thành công!", "success");
			showCheckoutModal = false;
			await loadStays();
		} else {
			showToast(`Lỗi: ${data.message}`, "error");
		}
	} catch {
		showToast("Lỗi khi checkout", "error");
	}
}

// Delete Stay
function openDeleteModal(stay: StayDetail) {
	deleteTargetStay = stay;
	showDeleteModal = true;
}

async function submitDelete() {
	if (!deleteTargetStay) return;
	try {
		const res = await fetch(`/api/stays/${deleteTargetStay.id}`, {
			method: "DELETE",
		});
		const data = await res.json();
		if (data.success) {
			showToast("Đã xóa lượt lưu trú thành công", "success");
			showDeleteModal = false;
			await loadStays();
		} else {
			showToast(`Lỗi: ${data.message}`, "error");
		}
	} catch {
		showToast("Lỗi khi xóa", "error");
	}
}

// Edit Stay
function openEdit(stay: StayDetail) {
	editStay = { ...stay };
	editErrors = {};
	showEditModal = true;
}

function validateEdit() {
	if (!editStay) return false;
	const errs: Record<string, string> = {};
	if (!editStay.ho_ten.trim()) errs.ho_ten = "Họ tên không được để trống";
	if (!editStay.so_giay_to.trim())
		errs.so_giay_to = "Số giấy tờ không được để trống";
	if (editStay.quoc_tich === "VNM" && editStay.so_giay_to.length !== 12) {
		errs.so_giay_to = "CCCD Việt Nam phải đủ 12 chữ số";
	}
	if (!editStay.so_phong.trim()) errs.so_phong = "Số phòng không được để trống";
	if (!editStay.ngay_den) errs.ngay_den = "Ngày đến không được để trống";
	editErrors = errs;
	return Object.keys(errs).length === 0;
}

async function submitEdit() {
	if (!editStay || !validateEdit()) return;
	try {
		const res = await fetch(`/api/stays/${editStay.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(editStay),
		});
		const data = await res.json();
		if (data.success) {
			showToast("Cập nhật thông tin khách thành công!", "success");
			showEditModal = false;
			await loadStays();
		} else {
			showToast(`Lỗi: ${data.message}`, "error");
		}
	} catch {
		showToast("Lỗi khi lưu thông tin", "error");
	}
}

// Add New Stay
async function submitAddGuest() {
	if (!newGuestForm.ho_ten.trim() || !newGuestForm.so_giay_to.trim()) {
		showToast("Vui lòng điền đủ Họ tên và Số CCCD/Hộ chiếu", "error");
		return;
	}
	try {
		const nowStr = new Date(Date.now() + 7 * 3600 * 1000)
			.toISOString()
			.replace("T", " ")
			.substring(0, 19);
		const payload = {
			...newGuestForm,
			ngay_den: newGuestForm.ngay_den || nowStr,
		};
		const res = await fetch("/api/stays", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		const data = await res.json();
		if (data.success) {
			showToast("Thêm khách mới vào CSDL thành công!", "success");
			showAddModal = false;
			await loadStays();
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

// Helper formatting
function formatDateTimeDisplay(dt?: string) {
	if (!dt) return "-";
	return dt.replace("T", " ").substring(0, 19);
}

function getStatusBadge(status: string) {
	switch (status) {
		case "READY_TO_SYNC":
			return {
				label: "Sẵn sàng khai báo",
				class: "bg-amber-100 text-amber-800 border-amber-300",
			};
		case "SYNCED_KBTT":
			return {
				label: "✓ Đã khai báo BCA",
				class: "bg-emerald-100 text-emerald-800 border-emerald-300",
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

// Svelte 5 Effects
$effect(() => {
	if (activeTab === "audit") {
		loadAuditLogs();
	} else if (activeTab === "register" || activeTab === "inhouse") {
		loadStays();
	}
});

onMount(() => {
	const now = new Date(Date.now() + 7 * 3600 * 1000);
	newGuestForm.ngay_den = now.toISOString().replace("T", " ").substring(0, 19);
	const future = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
	newGuestForm.ngay_di_du_kien = future.toISOString().substring(0, 10);

	loadCatalogs();
	loadStays();
	loadStats();
});
</script>

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
					HỆ THỐNG QUẢN LÝ & KHAI BÁO LƯU TRÚ
				</h1>
			</div>
			<p class="text-xs md:text-sm text-slate-400 mt-1 flex items-center gap-2">
				<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
				Cloudflare D1 Native Database Core • API KBTT v1.4 Chuẩn Bộ Công An
			</p>
		</div>

		<!-- Action Controls -->
		<div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
			<!-- Environment Switcher -->
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

			<!-- Add Guest Button -->
			<button
				type="button"
				onclick={() => { showAddModal = true; }}
				class="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all transform active:scale-95"
			>
				<span>+</span>
				<span>Thêm Khách Thủ Công</span>
			</button>
		</div>
	</header>

	<!-- Metric Cards -->
	<section class="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
		<div class="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-md">
			<div class="text-xs text-amber-400 font-medium">Chờ Khai Báo (OCR)</div>
			<div class="text-2xl font-bold mt-1 text-amber-300">{stats.readyToSync}</div>
			<div class="text-[11px] text-slate-400 mt-0.5">Sẵn sàng gửi API KBTT</div>
		</div>

		<div class="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-md">
			<div class="text-xs text-sky-400 font-medium">Đang Ở Trong Nhà</div>
			<div class="text-2xl font-bold mt-1 text-sky-300">{stats.inHouse}</div>
			<div class="text-[11px] text-slate-400 mt-0.5">Khách đang lưu trú</div>
		</div>

		<div class="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-md">
			<div class="text-xs text-emerald-400 font-medium">Đã Đăng Ký BCA</div>
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
			onclick={() => { activeTab = "register"; }}
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
			onclick={() => { activeTab = "inhouse"; }}
			class="px-4 py-2.5 font-medium text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap {activeTab === 'inhouse' ? 'border-teal-400 text-teal-400 bg-slate-800/80' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
		>
			<span>🏨</span>
			<span>Khách Đang Ở & Gia Hạn / Checkout</span>
		</button>

		<button
			type="button"
			onclick={() => { activeTab = "audit"; }}
			class="px-4 py-2.5 font-medium text-xs md:text-sm rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap {activeTab === 'audit' ? 'border-indigo-400 text-indigo-400 bg-slate-800/80' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
		>
			<span>🔍</span>
			<span>Tra Soát Hồ Sơ & Audit Logs</span>
		</button>

		<button
			type="button"
			onclick={() => { activeTab = "catalogs"; }}
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
							oninput={() => {
								if (activeTab === 'audit') loadAuditLogs();
								else loadStays();
							}}
							placeholder="Tìm kiếm theo Họ tên, CCCD/Hộ chiếu, Số phòng..."
							class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
						/>
					</div>
					{#if activeTab !== 'audit'}
						<div class="w-32 md:w-40">
							<input
								type="text"
								bind:value={filterRoom}
								oninput={() => loadStays()}
								placeholder="Lọc phòng..."
								class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
							/>
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
					<button
						type="button"
						onclick={() => {
							if (activeTab === 'audit') loadAuditLogs();
							else loadStays();
						}}
						class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-all"
					>
						Làm mới ↻
					</button>
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
								<th class="p-3.5">Giấy Tờ / CCCD</th>
								<th class="p-3.5">Quốc Tịch</th>
								<th class="p-3.5">Ngày Đến</th>
								<th class="p-3.5">Ngày Đi (DK)</th>
								<th class="p-3.5">Địa Chỉ / Tỉnh</th>
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
									<tr class="hover:bg-slate-700/30 transition-colors">
										<td class="p-3.5 font-semibold text-slate-100 flex items-center gap-2">
											<span>{stay.ho_ten}</span>
											<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{stay.gioi_tinh === 'F' ? 'Nữ' : 'Nam'}</span>
										</td>
										<td class="p-3.5 font-mono font-bold text-sky-400">{stay.so_phong}</td>
										<td class="p-3.5 font-mono text-slate-300">{stay.so_giay_to}</td>
										<td class="p-3.5">
											<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-700 {stay.quoc_tich === 'VNM' ? 'text-emerald-400' : 'text-amber-400'}">
												{stay.quoc_tich}
											</span>
										</td>
										<td class="p-3.5 text-slate-300">{formatDateTimeDisplay(stay.ngay_den)}</td>
										<td class="p-3.5 text-slate-400">{stay.ngay_di_du_kien || '-'}</td>
										<td class="p-3.5 text-slate-400 truncate max-w-xs">{stay.tinh_thanh || stay.dia_chi_chi_tiet || '-'}</td>
										<td class="p-3.5 text-center">
											<div class="flex items-center justify-center gap-1.5">
												<button
													type="button"
													onclick={() => registerStay(stay.id)}
													class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[11px] shadow transition-all"
												>
													Khai Báo ⚡
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
								<th class="p-3.5">Trạng Thái</th>
								<th class="p-3.5">CCCD / Hộ Chiếu</th>
								<th class="p-3.5">Ngày Đến</th>
								<th class="p-3.5">Ngày Đi Dự Kiến</th>
								<th class="p-3.5">Mã Hồ Sơ KBTT</th>
								<th class="p-3.5 text-center">Quản Lý</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-700/60">
							{#if stays.length === 0}
								<tr>
									<td colspan="8" class="p-8 text-center text-slate-400">Không tìm thấy lượt lưu trú nào phù hợp.</td>
								</tr>
							{:else}
								{#each stays as stay (stay.id)}
									{@const badge = getStatusBadge(stay.status)}
									<tr class="hover:bg-slate-700/30 transition-colors {stay.status === 'CHECKED_OUT' ? 'opacity-50' : ''}">
										<td class="p-3.5 font-semibold text-slate-100">{stay.ho_ten}</td>
										<td class="p-3.5 font-mono font-bold text-sky-400">{stay.so_phong}</td>
										<td class="p-3.5">
											<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border {badge.class}">
												{badge.label}
											</span>
										</td>
										<td class="p-3.5 font-mono text-slate-300">{stay.so_giay_to} ({stay.quoc_tich})</td>
										<td class="p-3.5 text-slate-300">{formatDateTimeDisplay(stay.ngay_den)}</td>
										<td class="p-3.5 font-medium text-amber-300">{stay.ngay_di_du_kien || '-'}</td>
										<td class="p-3.5 font-mono text-[11px] text-slate-400">{stay.ma_ho_so_kbtt || '-'}</td>
										<td class="p-3.5 text-center">
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
											</div>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- TAB 3: AUDIT TRAIL & LOGS -->
		{#if activeTab === "audit"}
			<div class="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
				<div class="overflow-x-auto">
					<table class="w-full text-left text-xs border-collapse">
						<thead class="bg-slate-900/90 text-slate-300 uppercase font-semibold border-b border-slate-700">
							<tr>
								<th class="p-3.5">Thời Gian</th>
								<th class="p-3.5">Hành Động / Endpoint</th>
								<th class="p-3.5">Khách Hàng</th>
								<th class="p-3.5">Phòng</th>
								<th class="p-3.5">CCCD / Hộ Chiếu</th>
								<th class="p-3.5">Kết Quả</th>
								<th class="p-3.5 text-center">Payload Chi Tiết</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-700/60">
							{#if auditLogs.length === 0}
								<tr>
									<td colspan="7" class="p-8 text-center text-slate-400">Chưa có bản ghi nhật ký nào.</td>
								</tr>
							{:else}
								{#each auditLogs as log (log.id)}
									<tr class="hover:bg-slate-700/30 transition-colors">
										<td class="p-3.5 text-slate-400 font-mono">{formatDateTimeDisplay(log.created_at)}</td>
										<td class="p-3.5 font-bold font-mono text-sky-400">{log.api_endpoint}</td>
										<td class="p-3.5 font-semibold text-slate-200">{log.guest_name || '-'}</td>
										<td class="p-3.5 font-mono text-slate-300">{log.so_phong || '-'}</td>
										<td class="p-3.5 font-mono text-slate-300">{log.so_giay_to || '-'}</td>
										<td class="p-3.5">
											{#if log.is_success}
												<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-medium text-[10px]">
													✓ Thành công
												</span>
											{:else}
												<span class="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-700 font-medium text-[10px]" title={log.error_message || ''}>
													✕ Thất bại: {log.code || 'ERR'}
												</span>
											{/if}
										</td>
										<td class="p-3.5 text-center">
											<button
												type="button"
												onclick={() => openPayloadViewer(log)}
												class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[11px] rounded transition-all"
											>
												{`{ } JSON`}
											</button>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- TAB 4: DANH MỤC CHUẨN -->
		{#if activeTab === "catalogs"}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Quốc tịch -->
				<div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl">
					<h3 class="font-bold text-sm text-sky-400 mb-3 flex items-center gap-2">
						<span>🌐</span> Danh Mục Quốc Tịch Chuẩn (Alpha-3)
					</h3>
					<div class="max-h-96 overflow-y-auto divide-y divide-slate-700/50 text-xs">
						{#each catalogs.quocTich as qt}
							<div class="py-2 flex items-center justify-between">
								<span class="text-slate-200">{qt.tenQT} ({qt.tenQTEn})</span>
								<span class="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{qt.maQT}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Tỉnh Thành -->
				<div class="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl">
					<h3 class="font-bold text-sm text-teal-400 mb-3 flex items-center gap-2">
						<span>📍</span> Danh Mục Tỉnh / Thành Phố
					</h3>
					<div class="max-h-96 overflow-y-auto divide-y divide-slate-700/50 text-xs">
						{#each catalogs.tinhTp as tt}
							<div class="py-2 flex items-center justify-between">
								<span class="text-slate-200">{tt.tenTT}</span>
								<span class="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">Mã: {tt.maTT}</span>
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
						<label for="edit_ho_ten" class="block text-slate-400 mb-1">Họ và tên *</label>
						<input id="edit_ho_ten" type="text" bind:value={editStay.ho_ten} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 uppercase" />
						{#if editErrors.ho_ten}<span class="text-rose-400 text-[11px]">{editErrors.ho_ten}</span>{/if}
					</div>

					<div>
						<label for="edit_so_phong" class="block text-slate-400 mb-1">Số phòng *</label>
						<input id="edit_so_phong" type="text" bind:value={editStay.so_phong} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono" />
					</div>

					<div>
						<label for="edit_so_giay_to" class="block text-slate-400 mb-1">Số CCCD / Hộ Chiếu *</label>
						<input id="edit_so_giay_to" type="text" bind:value={editStay.so_giay_to} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono" />
						{#if editErrors.so_giay_to}<span class="text-rose-400 text-[11px]">{editErrors.so_giay_to}</span>{/if}
					</div>

					<div>
						<label for="edit_quoc_tich" class="block text-slate-400 mb-1">Quốc tịch (Mã Alpha-3) *</label>
						<input id="edit_quoc_tich" type="text" bind:value={editStay.quoc_tich} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 uppercase font-mono" />
					</div>

					<div>
						<label for="edit_ngay_sinh" class="block text-slate-400 mb-1">Ngày sinh (YYYY-MM-DD)</label>
						<input id="edit_ngay_sinh" type="text" bind:value={editStay.ngay_sinh} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div>
						<label for="edit_gioi_tinh" class="block text-slate-400 mb-1">Giới tính</label>
						<select id="edit_gioi_tinh" bind:value={editStay.gioi_tinh} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100">
							<option value="M">Nam (M)</option>
							<option value="F">Nữ (F)</option>
						</select>
					</div>

					<div>
						<label for="edit_ngay_den" class="block text-slate-400 mb-1">Ngày đến (YYYY-MM-DD HH:mm:ss)</label>
						<input id="edit_ngay_den" type="text" bind:value={editStay.ngay_den} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div>
						<label for="edit_ngay_di_du_kien" class="block text-slate-400 mb-1">Ngày đi dự kiến (YYYY-MM-DD)</label>
						<input id="edit_ngay_di_du_kien" type="text" bind:value={editStay.ngay_di_du_kien} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div class="sm:col-span-2">
						<label for="edit_dia_chi_chi_tiet" class="block text-slate-400 mb-1">Địa chỉ chi tiết</label>
						<input id="edit_dia_chi_chi_tiet" type="text" bind:value={editStay.dia_chi_chi_tiet} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div>
						<label for="edit_tinh_thanh" class="block text-slate-400 mb-1">Tỉnh / Thành phố</label>
						<input id="edit_tinh_thanh" type="text" bind:value={editStay.tinh_thanh} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div>
						<label for="edit_so_dien_thoai" class="block text-slate-400 mb-1">Số điện thoại</label>
						<input id="edit_so_dien_thoai" type="text" bind:value={editStay.so_dien_thoai} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
					<button type="button" onclick={() => { showEditModal = false; }} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium">Hủy</button>
					<button type="button" onclick={() => submitEdit()} class="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-lg">Lưu Thay Đổi</button>
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
		<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
			<div class="bg-slate-800 border border-slate-700 w-full max-w-3xl rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
				<div class="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
					<h3 class="text-sm font-bold text-sky-400 flex items-center gap-2">
						<span>🔍</span> Chi Tiết Audit Log: {selectedLog.api_endpoint}
					</h3>
					<button type="button" onclick={() => { showPayloadModal = false; }} class="text-slate-400 hover:text-white text-xl">✕</button>
				</div>

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
						<label for="add_ho_ten" class="block text-slate-400 mb-1">Họ và tên *</label>
						<input id="add_ho_ten" type="text" bind:value={newGuestForm.ho_ten} placeholder="NGUYỄN VĂN A" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 uppercase" />
					</div>

					<div>
						<label for="add_so_phong" class="block text-slate-400 mb-1">Số phòng *</label>
						<input id="add_so_phong" type="text" bind:value={newGuestForm.so_phong} placeholder="101 hoặc 5" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono" />
					</div>

					<div>
						<label for="add_so_giay_to" class="block text-slate-400 mb-1">Số CCCD / Hộ Chiếu *</label>
						<input id="add_so_giay_to" type="text" bind:value={newGuestForm.so_giay_to} placeholder="001..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono" />
					</div>

					<div>
						<label for="add_quoc_tich" class="block text-slate-400 mb-1">Quốc tịch *</label>
						<input id="add_quoc_tich" type="text" bind:value={newGuestForm.quoc_tich} placeholder="VNM, USA, KOR..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 uppercase font-mono" />
					</div>

					<div>
						<label for="add_ngay_sinh" class="block text-slate-400 mb-1">Ngày sinh (YYYY-MM-DD)</label>
						<input id="add_ngay_sinh" type="date" bind:value={newGuestForm.ngay_sinh} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div>
						<label for="add_gioi_tinh" class="block text-slate-400 mb-1">Giới tính</label>
						<select id="add_gioi_tinh" bind:value={newGuestForm.gioi_tinh} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100">
							<option value="M">Nam (M)</option>
							<option value="F">Nữ (F)</option>
						</select>
					</div>

					<div>
						<label for="add_ngay_den" class="block text-slate-400 mb-1">Ngày đến</label>
						<input id="add_ngay_den" type="text" bind:value={newGuestForm.ngay_den} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div>
						<label for="add_ngay_di_du_kien" class="block text-slate-400 mb-1">Ngày đi dự kiến</label>
						<input id="add_ngay_di_du_kien" type="date" bind:value={newGuestForm.ngay_di_du_kien} class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>

					<div class="sm:col-span-2">
						<label for="add_dia_chi_chi_tiet" class="block text-slate-400 mb-1">Địa chỉ chi tiết</label>
						<input id="add_dia_chi_chi_tiet" type="text" bind:value={newGuestForm.dia_chi_chi_tiet} placeholder="Số nhà, đường phố..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100" />
					</div>
				</div>

				<div class="flex items-center justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
					<button type="button" onclick={() => { showAddModal = false; }} class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium">Hủy</button>
					<button type="button" onclick={() => submitAddGuest()} class="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-lg">Thêm Khách</button>
				</div>
			</div>
		</div>
	{/if}
</div>
