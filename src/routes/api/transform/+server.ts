import { json, type RequestHandler } from "@sveltejs/kit";
import type { RawOcrRow } from "$lib/server/dataTransformer.js";
import { logger } from "$lib/server/logger.js";
import { syncPipeline } from "$lib/server/syncPipeline.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const rows = (body.rows || []) as RawOcrRow[];
	if (!Array.isArray(rows)) {
		logger.error("API:transform", "Tham số rows không phải mảng", { body });
		return json({ error: "rows must be an array" }, { status: 400 });
	}

	logger.debug(
		"API:transform",
		`Bắt đầu transform & validate ${rows.length} dòng`,
	);
	const result = await syncPipeline.dataTransformer.transformBatch(rows);
	return json(result);
};
