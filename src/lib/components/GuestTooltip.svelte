<script lang="ts">
	import type { StayDetail } from "$lib/types/index.js";
	import { getCountryFullName } from "$lib/utils/format.js";

	interface Props {
		stay: StayDetail;
		children?: import("svelte").Snippet;
	}

	let { stay, children }: Props = $props();

	let triggerEl = $state<HTMLElement | null>(null);
	let isHovered = $state(false);
	let tooltipPos = $state<{ top: number; left: number }>({ top: 0, left: 0 });

	function formatDate(val?: string | null): string {
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

	function formatDocType(raw?: string | number): string {
		const str = String(raw || "").toLowerCase().trim();
		if (str === "4" || str.includes("hộ chiếu") || str.includes("passport") || str.includes("ho_chieu")) {
			return "Hộ chiếu (Passport)";
		}
		if (str === "8" || str.includes("thẻ căn cước") || str === "căn cước" || str.includes("can_cuoc")) {
			return "Thẻ Căn Cước (12 số)";
		}
		if (str === "2" || str.includes("cmnd")) {
			return "CMND (9/12 số)";
		}
		if (str === "3" || str.includes("lái xe") || str.includes("gplx")) {
			return "Giấy phép lái xe (GPLX)";
		}
		return "Thẻ CCCD (12 số)";
	}

	function getFullAddr(s: StayDetail): string {
		if (s.dia_chi_chi_tiet && s.dia_chi_chi_tiet.trim()) {
			return s.dia_chi_chi_tiet.trim();
		}
		const parts = [s.phuong_xa, s.quan_huyen, s.tinh_thanh].filter(Boolean);
		return parts.length > 0 ? parts.join(", ") : "-";
	}

	function getStatusLabel(status: string): { label: string; class: string } {
		switch (status) {
			case "SYNCED_KBTT":
				return { label: "Đang ở (Đã gửi BCA)", class: "bg-emerald-950/80 text-emerald-300 border-emerald-600" };
			case "EXTENDED":
				return { label: "Đã gia hạn", class: "bg-indigo-950/80 text-indigo-300 border-indigo-600" };
			case "READY_TO_SYNC":
				return { label: "Sẵn sàng khai báo", class: "bg-sky-950/80 text-sky-300 border-sky-600" };
			case "CHECKED_OUT":
				return { label: "Đã trả phòng", class: "bg-slate-900 text-slate-400 border-slate-700" };
			case "PENDING_VALIDATION":
				return { label: "Thiếu thông tin", class: "bg-rose-950/80 text-rose-300 border-rose-600" };
			default:
				return { label: status, class: "bg-slate-800 text-slate-300 border-slate-700" };
		}
	}

	let country = $derived.by(() => {
		const qt = (stay.quoc_tich || "VNM").toUpperCase().trim();
		const fullName = getCountryFullName(qt);
		return {
			code: qt,
			name: fullName || (qt === "VNM" ? "Việt Nam" : qt),
			isVN: ["VNM", "VN", "VIỆT NAM", "VIET NAM"].includes(qt),
		};
	});

	let statusInfo = $derived(getStatusLabel(stay.status));

	function handleMouseEnter() {
		if (triggerEl) {
			const rect = triggerEl.getBoundingClientRect();
			const tooltipWidth = 320;
			const tooltipHeight = 240;

			// Horizontal positioning: align with left of trigger, or clamp to viewport
			let left = rect.left;
			if (left + tooltipWidth > window.innerWidth - 16) {
				left = window.innerWidth - tooltipWidth - 16;
			}
			if (left < 16) left = 16;

			// Vertical positioning: Prefer bottom of trigger, fallback above if not enough space
			let top = rect.bottom + 8;
			if (top + tooltipHeight > window.innerHeight - 16 && rect.top - tooltipHeight - 8 > 16) {
				top = rect.top - tooltipHeight - 8;
			}

			tooltipPos = { top, left };
			isHovered = true;
		}
	}

	function handleMouseLeave() {
		isHovered = false;
	}
</script>

<div
	bind:this={triggerEl}
	role="group"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	class="relative inline-flex items-center"
>
	<!-- Trigger Slot / Children -->
	{#if children}
		{@render children()}
	{:else}
		<span class="cursor-help hover:text-sky-300 hover:underline transition-colors font-semibold">
			{stay.ho_ten}
		</span>
	{/if}
</div>

<!-- Floating Fixed Viewport Tooltip Card (Zero parent overflow clipping, Maximum z-index) -->
{#if isHovered}
	<div
		class="pointer-events-none fixed z-[999999] w-80 max-w-sm p-3.5 bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-slate-700/90 shadow-2xl text-xs text-slate-200 animate-in fade-in duration-150 ring-1 ring-white/10"
		style="top: {tooltipPos.top}px; left: {tooltipPos.left}px;"
	>
		<!-- Header -->
		<div class="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-700/80">
			<div class="flex items-center gap-1.5 min-w-0">
				<span class="text-sm">👤</span>
				<span class="font-bold text-white text-sm truncate uppercase tracking-tight">{stay.ho_ten}</span>
			</div>
			<div class="flex items-center gap-1 flex-shrink-0 font-mono">
				{#if stay.gioi_tinh === 'F'}
					<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40">Nữ ♀</span>
				{:else}
					<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">Nam ♂</span>
				{/if}
				<span class="px-2 py-0.5 rounded-full font-bold text-sky-300 bg-sky-950 border border-sky-700/60 text-[11px]">
					Phòng {stay.so_phong}
				</span>
			</div>
		</div>

		<!-- Details Table -->
		<div class="space-y-1.5 text-[11px]">
			<!-- Giấy tờ & Loại -->
			<div class="flex justify-between items-start gap-2">
				<span class="text-slate-400 font-medium whitespace-nowrap">Giấy tờ:</span>
				<div class="text-right">
					<span class="font-mono font-bold text-white tracking-wide">{stay.so_giay_to || '-'}</span>
					<span class="block text-[10px] text-slate-400">({formatDocType(stay.loai_giay_to)})</span>
				</div>
			</div>

			<!-- Quốc tịch -->
			<div class="flex justify-between items-center gap-2">
				<span class="text-slate-400 font-medium">Quốc tịch:</span>
				<span class="font-semibold {country.isVN ? 'text-emerald-400' : 'text-amber-400'}">
					{country.name} <span class="font-mono text-[10px] text-slate-400">({country.code})</span>
				</span>
			</div>

			<!-- Ngày sinh -->
			<div class="flex justify-between items-center gap-2">
				<span class="text-slate-400 font-medium">Ngày sinh:</span>
				<span class="font-mono text-slate-200">{formatDate(stay.ngay_sinh)}</span>
			</div>

			<!-- Hạn thị thực (Visa) nếu là khách nước ngoài -->
			{#if !country.isVN}
				<div class="flex justify-between items-center gap-2 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/40">
					<span class="text-amber-300 font-medium">Hạn Visa/Thị thực:</span>
					<span class="font-mono font-bold text-amber-200">{formatDate(stay.thoi_han_thi_thuc)}</span>
				</div>
			{/if}

			<!-- Địa chỉ -->
			<div class="pt-1 border-t border-slate-800/80">
				<span class="text-slate-400 font-medium block mb-0.5">Địa chỉ / Nơi cư trú:</span>
				<span class="text-slate-300 block bg-slate-950/70 p-1.5 rounded border border-slate-800 text-[10px] leading-relaxed break-words">
					{getFullAddr(stay)}
				</span>
			</div>

			<!-- Trạng thái lưu trú -->
			<div class="flex justify-between items-center gap-2 pt-1 border-t border-slate-800/80">
				<span class="text-slate-400 font-medium">Trạng thái:</span>
				<span class="px-2 py-0.5 rounded text-[10px] font-semibold border {statusInfo.class}">
					{statusInfo.label}
				</span>
			</div>

			<!-- Ghi chú nếu có -->
			{#if stay.ghi_chu && stay.ghi_chu.trim()}
				<div class="flex justify-between items-start gap-2 pt-1 border-t border-slate-800/80 text-[10px]">
					<span class="text-slate-400 font-medium whitespace-nowrap">Ghi chú:</span>
					<span class="text-slate-300 italic text-right break-words">{stay.ghi_chu}</span>
				</div>
			{/if}
		</div>
	</div>
{/if}
