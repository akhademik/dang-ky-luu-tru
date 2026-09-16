import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import type { RawOcrRow } from "$lib/server/dataTransformer.js";
import { logger } from "$lib/server/logger.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const rows = (body.rows || []) as RawOcrRow[];
	if (!Array.isArray(rows)) {
		logger.error("API:sync", "Tham số rows không phải mảng", { body });
		return json({ error: "rows must be an array" }, { status: 400 });
	}

	logger.info(
		"API:sync",
		`Bắt đầu đồng bộ ${rows.length} khách lên KBTT Server`,
	);
	const results = await syncPipeline.processRows(rows);
	const successCount = results.filter((r) => r.status === "Thành công").length;
	logger.info(
		"API:sync",
		`Hoàn tất đồng bộ: ${successCount}/${results.length} thành công`,
	);
	return json({ results });
};
