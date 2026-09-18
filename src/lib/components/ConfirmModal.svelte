<script lang="ts">
interface Props {
	open?: boolean;
	title?: string;
	message?: string;
	confirmText?: string;
	cancelText?: string;
	isDanger?: boolean;
	onconfirm?: () => void;
	oncancel?: () => void;
}

let {
	open = false,
	title = "Xác nhận",
	message = "Bạn có chắc chắn muốn thực hiện hành động này?",
	confirmText = "Xác nhận",
	cancelText = "Hủy",
	isDanger = false,
	onconfirm,
	oncancel,
}: Props = $props();

function handleConfirm() {
	onconfirm?.();
}

function handleCancel() {
	oncancel?.();
}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
			<h3 class="text-lg font-bold text-white">{title}</h3>
			<p class="text-sm text-slate-300">{message}</p>
			
			<div class="flex justify-end gap-3 pt-2">
				<button
					type="button"
					onclick={handleCancel}
					class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition"
				>
					{cancelText}
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					class="px-4 py-2 text-sm font-medium text-white rounded-lg transition {isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-primary-600 hover:bg-primary-500'}"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
