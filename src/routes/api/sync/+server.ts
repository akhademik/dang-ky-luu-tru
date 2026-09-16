import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import type { RawOcrRow } from "$lib/server/dataTransformer.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const rows = (body.rows || []) as RawOcrRow[];
	if (!Array.isArray(rows)) {
		return json({ error: "rows must be an array" }, { status: 400 });
	}

	const results = await syncPipeline.processRows(rows);
	return json({ results });
};
