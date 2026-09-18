<script lang="ts">
import { getStayStatusBadgeClass } from "$lib/utils/format";

export let status: string | undefined | null = undefined;

$: badge = getStayStatusBadgeClass(status);
</script>

<span
	class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border {badge.bg} {badge.text}"
>
	{badge.label}
</span>
