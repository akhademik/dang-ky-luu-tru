<script lang="ts">
import { getStayStatusBadgeClass } from "$lib/utils/format";

interface Props {
	status?: string | null;
}

let { status = undefined }: Props = $props();

let badge = $derived(getStayStatusBadgeClass(status));
</script>

<span
	class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border {badge.bg} {badge.text}"
>
	{badge.label}
</span>
