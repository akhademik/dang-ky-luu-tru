<script lang="ts">
interface Props {
	id?: string;
	value?: string;
	placeholder?: string;
	disabled?: boolean;
	hasError?: boolean;
	required?: boolean;
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
	class: extraClass = "",
	onchange,
}: Props = $props();

let dateInputRef: HTMLInputElement | null = $state(null);

function toDmy(str: string): string {
	if (!str) return "";
	const trimmed = str.trim();
	// Already DD/MM/YYYY or DD-MM-YYYY
	const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (dmyMatch) {
		const d = dmyMatch[1].padStart(2, "0");
		const m = dmyMatch[2].padStart(2, "0");
		const y = dmyMatch[3];
		return `${d}/${m}/${y}`;
	}
	// YYYY-MM-DD
	const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
	if (ymdMatch) {
		const y = ymdMatch[1];
		const m = ymdMatch[2].padStart(2, "0");
		const d = ymdMatch[3].padStart(2, "0");
		return `${d}/${m}/${y}`;
	}
	return trimmed;
}

function toYmd(str: string): string {
	if (!str) return "";
	const trimmed = str.trim();
	const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
	if (dmyMatch) {
		const d = dmyMatch[1].padStart(2, "0");
		const m = dmyMatch[2].padStart(2, "0");
		const y = dmyMatch[3];
		return `${y}-${m}-${d}`;
	}
	const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
	if (ymdMatch) {
		const y = ymdMatch[1];
		const m = ymdMatch[2].padStart(2, "0");
		const d = ymdMatch[3].padStart(2, "0");
		return `${y}-${m}-${d}`;
	}
	return "";
}

let displayValue = $derived(toDmy(value || ""));
let pickerYmd = $derived(toYmd(value || ""));

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
	// Format if complete
	const formatted = toDmy(raw);
	if (formatted && formatted !== raw) {
		value = formatted;
		onchange?.(formatted);
	}
}

function handlePickerChange(e: Event) {
	const ymd = (e.target as HTMLInputElement).value;
	if (ymd) {
		const dmy = toDmy(ymd);
		value = dmy;
		onchange?.(dmy);
	}
}

function openCalendar() {
	if (disabled) return;
	if (dateInputRef) {
		try {
			if (typeof dateInputRef.showPicker === "function") {
				dateInputRef.showPicker();
			} else {
				dateInputRef.focus();
				dateInputRef.click();
			}
		} catch {
			dateInputRef.focus();
			dateInputRef.click();
		}
	}
}
</script>

<div class="relative flex items-center w-full">
	<input
		{id}
		type="text"
		value={displayValue}
		{placeholder}
		{disabled}
		{required}
		oninput={handleTextInput}
		onblur={handleTextBlur}
		class="w-full bg-slate-900 border {hasError
			? 'border-rose-500 bg-rose-950/20'
			: 'border-slate-700'} rounded-lg p-2.5 pr-10 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500 transition-colors {disabled
			? 'opacity-40 cursor-not-allowed bg-slate-950/60'
			: ''} {extraClass}"
	/>

	<!-- Calendar picker trigger button -->
	<button
		type="button"
		{disabled}
		onclick={openCalendar}
		class="absolute right-2 p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors focus:outline-none {disabled
			? 'opacity-40 cursor-not-allowed'
			: ''}"
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

	<!-- Hidden native HTML5 date input synced with pickerYmd -->
	<input
		bind:this={dateInputRef}
		type="date"
		value={pickerYmd}
		{disabled}
		onchange={handlePickerChange}
		class="sr-only pointer-events-none absolute right-0 bottom-0 opacity-0 w-0 h-0"
		tabindex="-1"
		aria-hidden="true"
	/>
</div>
