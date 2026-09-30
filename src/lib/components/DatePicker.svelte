<script lang="ts">
import { onDestroy, onMount } from "svelte";

interface Props {
	id?: string;
	value?: string;
	placeholder?: string;
	disabled?: boolean;
	hasError?: boolean;
	required?: boolean;
	min?: string;
	max?: string;
	class?: string;
	onchange?: (val: string) => void;
}

let {
	id = undefined,
	value = $bindable(""),
	placeholder = "DD/MM/YYYY",
	disabled = false,
	hasError = false,
	required = false,
	min = undefined,
	max = undefined,
	class: extraClass = "",
	onchange,
}: Props = $props();

let containerRef: HTMLDivElement | null = $state(null);
let isOpen = $state(false);

interface ParsedDate {
	year: number;
	month: number; // 0-11
	day: number; // 1-31
}

function parseDateStr(str?: string | null): ParsedDate | null {
	if (!str) return null;
	const trimmed = String(str).trim();
	// DD/MM/YYYY or DD-MM-YYYY
	const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (dmyMatch) {
		const day = parseInt(dmyMatch[1], 10);
		const month = parseInt(dmyMatch[2], 10) - 1;
		const year = parseInt(dmyMatch[3], 10);
		if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
			return { year, month, day };
		}
	}
	// YYYY-MM-DD
	const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
	if (ymdMatch) {
		const year = parseInt(ymdMatch[1], 10);
		const month = parseInt(ymdMatch[2], 10) - 1;
		const day = parseInt(ymdMatch[3], 10);
		if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
			return { year, month, day };
		}
	}
	return null;
}

function formatDmy(d: ParsedDate): string {
	const day = String(d.day).padStart(2, "0");
	const month = String(d.month + 1).padStart(2, "0");
	return `${day}/${month}/${d.year}`;
}

let selectedParsed = $derived(parseDateStr(value));
let minParsed = $derived(parseDateStr(min));
let maxParsed = $derived(parseDateStr(max));

const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
let todayParsed = $derived({
	year: vnNow.getUTCFullYear(),
	month: vnNow.getUTCMonth(),
	day: vnNow.getUTCDate(),
});

// Current viewing month/year in calendar popup
let viewYear = $state(vnNow.getUTCFullYear());
let viewMonth = $state(vnNow.getUTCMonth());

// Synchronize viewYear & viewMonth when opening
function syncViewOnOpen() {
	const cur = parseDateStr(value);
	if (cur) {
		viewYear = cur.year;
		viewMonth = cur.month;
	} else if (minParsed) {
		viewYear = minParsed.year;
		viewMonth = minParsed.month;
	} else {
		const now = new Date(Date.now() + 7 * 3600 * 1000);
		viewYear = now.getUTCFullYear();
		viewMonth = now.getUTCMonth();
	}
}

// Check if we can navigate to previous month
let canGoPrevMonth = $derived.by(() => {
	if (!minParsed) return true;
	if (viewYear < minParsed.year) return false;
	if (viewYear === minParsed.year && viewMonth <= minParsed.month) return false;
	return true;
});

// Check if we can navigate to next month
let canGoNextMonth = $derived.by(() => {
	if (!maxParsed) return true;
	if (viewYear > maxParsed.year) return false;
	if (viewYear === maxParsed.year && viewMonth >= maxParsed.month) return false;
	return true;
});

function prevMonth() {
	if (!canGoPrevMonth) return;
	if (viewMonth === 0) {
		viewMonth = 11;
		viewYear -= 1;
	} else {
		viewMonth -= 1;
	}
}

function nextMonth() {
	if (!canGoNextMonth) return;
	if (viewMonth === 11) {
		viewMonth = 0;
		viewYear += 1;
	} else {
		viewMonth += 1;
	}
}

function isDateDisabled(year: number, month: number, day: number): boolean {
	if (minParsed) {
		if (year < minParsed.year) return true;
		if (year === minParsed.year && month < minParsed.month) return true;
		if (
			year === minParsed.year &&
			month === minParsed.month &&
			day < minParsed.day
		) {
			return true;
		}
	}
	if (maxParsed) {
		if (year > maxParsed.year) return true;
		if (year === maxParsed.year && month > maxParsed.month) return true;
		if (
			year === maxParsed.year &&
			month === maxParsed.month &&
			day > maxParsed.day
		) {
			return true;
		}
	}
	return false;
}

function isDateSelected(year: number, month: number, day: number): boolean {
	if (!selectedParsed) return false;
	return (
		selectedParsed.year === year &&
		selectedParsed.month === month &&
		selectedParsed.day === day
	);
}

function isDateToday(year: number, month: number, day: number): boolean {
	return (
		todayParsed.year === year &&
		todayParsed.month === month &&
		todayParsed.day === day
	);
}

interface CalendarCell {
	day: number;
	month: number;
	year: number;
	isCurrentMonth: boolean;
	isDisabled: boolean;
	isSelected: boolean;
	isToday: boolean;
}

let calendarCells = $derived.by((): CalendarCell[] => {
	const cells: CalendarCell[] = [];
	const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
	const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon = 0, Sun = 6

	const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
	const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

	const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
	const prevMonthNum = viewMonth === 0 ? 11 : viewMonth - 1;

	// Fill previous month trailing days
	for (let i = startOffset - 1; i >= 0; i--) {
		const d = daysInPrevMonth - i;
		cells.push({
			day: d,
			month: prevMonthNum,
			year: prevYear,
			isCurrentMonth: false,
			isDisabled: true, // Previous month padding is not selectable
			isSelected: false,
			isToday: isDateToday(prevYear, prevMonthNum, d),
		});
	}

	// Fill current month days
	for (let d = 1; d <= daysInCurrentMonth; d++) {
		const disabled = isDateDisabled(viewYear, viewMonth, d);
		const selected = isDateSelected(viewYear, viewMonth, d);
		const today = isDateToday(viewYear, viewMonth, d);
		cells.push({
			day: d,
			month: viewMonth,
			year: viewYear,
			isCurrentMonth: true,
			isDisabled: disabled,
			isSelected: selected,
			isToday: today,
		});
	}

	// Fill next month leading days to complete grid (multiples of 7)
	const remaining = (7 - (cells.length % 7)) % 7;
	const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
	const nextMonthNum = viewMonth === 11 ? 0 : viewMonth + 1;
	for (let d = 1; d <= remaining; d++) {
		cells.push({
			day: d,
			month: nextMonthNum,
			year: nextYear,
			isCurrentMonth: false,
			isDisabled: true,
			isSelected: false,
			isToday: isDateToday(nextYear, nextMonthNum, d),
		});
	}

	return cells;
});

function selectCell(cell: CalendarCell) {
	if (cell.isDisabled || !cell.isCurrentMonth) return;
	const formatted = formatDmy({
		year: cell.year,
		month: cell.month,
		day: cell.day,
	});
	value = formatted;
	onchange?.(formatted);
	isOpen = false;
}

function selectToday() {
	if (isDateDisabled(todayParsed.year, todayParsed.month, todayParsed.day))
		return;
	const formatted = formatDmy(todayParsed);
	value = formatted;
	onchange?.(formatted);
	viewYear = todayParsed.year;
	viewMonth = todayParsed.month;
	isOpen = false;
}

function toggleCalendar() {
	if (disabled) return;
	if (!isOpen) {
		syncViewOnOpen();
		isOpen = true;
	} else {
		isOpen = false;
	}
}

function handleTextInput(e: Event) {
	const raw = (e.target as HTMLInputElement).value;
	value = raw;
	onchange?.(raw);
}

function handleTextBlur(e: Event) {
	const raw = (e.target as HTMLInputElement).value.trim();
	if (!raw) {
		value = "";
		onchange?.("");
		return;
	}
	const parsed = parseDateStr(raw);
	if (parsed) {
		const formatted = formatDmy(parsed);
		value = formatted;
		onchange?.(formatted);
	}
}

function handleClickOutside(e: MouseEvent) {
	if (containerRef && !containerRef.contains(e.target as Node)) {
		isOpen = false;
	}
}

function handleKeyDown(e: KeyboardEvent) {
	if (e.key === "Escape" && isOpen) {
		isOpen = false;
	}
}

onMount(() => {
	document.addEventListener("click", handleClickOutside);
	document.addEventListener("keydown", handleKeyDown);
});

onDestroy(() => {
	if (typeof document !== "undefined") {
		document.removeEventListener("click", handleClickOutside);
		document.removeEventListener("keydown", handleKeyDown);
	}
});

const monthNames = [
	"Tháng 01",
	"Tháng 02",
	"Tháng 03",
	"Tháng 04",
	"Tháng 05",
	"Tháng 06",
	"Tháng 07",
	"Tháng 08",
	"Tháng 09",
	"Tháng 10",
	"Tháng 11",
	"Tháng 12",
];
</script>

<div bind:this={containerRef} class="relative flex items-center w-full">
	<input
		{id}
		type="text"
		value={value || ""}
		{placeholder}
		{disabled}
		{required}
		oninput={handleTextInput}
		onblur={handleTextBlur}
		onclick={() => {
			if (!disabled && !isOpen) {
				syncViewOnOpen();
				isOpen = true;
			}
		}}
		class="w-full bg-slate-900 border {hasError
			? 'border-rose-500 bg-rose-950/20'
			: 'border-slate-700'} rounded-lg p-2.5 pr-10 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500 transition-colors {disabled
			? 'opacity-40 cursor-not-allowed bg-slate-950/60'
			: ''} {extraClass}"
	/>

	<!-- Calendar trigger button -->
	<button
		type="button"
		{disabled}
		onclick={toggleCalendar}
		class="absolute right-2 p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors focus:outline-none {disabled
			? 'opacity-40 cursor-not-allowed'
			: ''} {isOpen ? 'text-sky-400 bg-slate-800' : ''}"
		title="Mở lịch chọn ngày (DD/MM/YYYY)"
		tabindex="-1"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="w-4 h-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
			<line x1="16" y1="2" x2="16" y2="6"></line>
			<line x1="8" y1="2" x2="8" y2="6"></line>
			<line x1="3" y1="10" x2="21" y2="10"></line>
		</svg>
	</button>

	<!-- CUSTOM POPUP CALENDAR -->
	{#if isOpen}
		<div
			class="absolute top-full left-0 mt-1.5 z-50 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
		>
			<!-- Month / Year Header Navigation -->
			<div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
				<button
					type="button"
					onclick={prevMonth}
					disabled={!canGoPrevMonth}
					class="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-300"
					title={canGoPrevMonth ? "Tháng trước" : "Không thể chọn tháng trước tháng hiện tại"}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>

				<div class="font-bold text-xs text-sky-400 font-mono tracking-wide">
					{monthNames[viewMonth]} / {viewYear}
				</div>

				<button
					type="button"
					onclick={nextMonth}
					disabled={!canGoNextMonth}
					class="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-300"
					title={canGoNextMonth ? "Tháng kế tiếp" : "Đã đạt giới hạn tối đa"}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			<!-- Day of Week Headers (T2 -> CN) -->
			<div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1.5">
				<div>T2</div>
				<div>T3</div>
				<div>T4</div>
				<div>T5</div>
				<div>T6</div>
				<div class="text-sky-400">T7</div>
				<div class="text-rose-400">CN</div>
			</div>

			<!-- Calendar Grid Days -->
			<div class="grid grid-cols-7 gap-1 text-center">
				{#each calendarCells as cell}
					{#if !cell.isCurrentMonth}
						<!-- Day outside of current viewing month: muted / invisible -->
						<div class="h-7 flex items-center justify-center text-[11px] text-slate-700 opacity-25 select-none font-mono">
							{cell.day}
						</div>
					{:else if cell.isDisabled}
						<!-- Disabled date: Grayscale / Strikethrough / Blur / Unclickable -->
						<div
							class="h-7 flex items-center justify-center text-[11px] font-mono text-slate-600 bg-slate-950/40 rounded-md line-through opacity-30 cursor-not-allowed select-none"
							title="Ngày này không thể chọn (trước ngày tối thiểu)"
						>
							{cell.day}
						</div>
					{:else}
						<!-- Valid, Selectable date -->
						<button
							type="button"
							onclick={() => selectCell(cell)}
							class="h-7 flex items-center justify-center text-[11px] font-mono rounded-md transition-all {cell.isSelected
								? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-900/50 scale-105'
								: cell.isToday
									? 'border border-sky-500/80 text-sky-300 font-bold bg-sky-950/30 hover:bg-sky-600 hover:text-white'
									: 'text-slate-200 hover:bg-slate-800 hover:text-white'}"
						>
							{cell.day}
						</button>
					{/if}
				{/each}
			</div>

			<!-- Footer quick actions -->
			<div class="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800 text-[11px]">
				<button
					type="button"
					onclick={selectToday}
					disabled={isDateDisabled(todayParsed.year, todayParsed.month, todayParsed.day)}
					class="text-sky-400 hover:text-sky-300 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Hôm nay ({String(todayParsed.day).padStart(2, '0')}/{String(todayParsed.month + 1).padStart(2, '0')})
				</button>
				<button
					type="button"
					onclick={() => { isOpen = false; }}
					class="text-slate-400 hover:text-slate-200 transition-colors"
				>
					Đóng
				</button>
			</div>
		</div>
	{/if}
</div>
