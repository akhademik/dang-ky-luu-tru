import { t as syncPipeline } from "../../../../chunks/syncPipeline.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/transform/+server.ts
var POST = async ({ request }) => {
	const rows = (await request.json().catch(() => ({}))).rows || [];
	if (!Array.isArray(rows)) return json({ error: "rows must be an array" }, { status: 400 });
	const result = await syncPipeline.dataTransformer.transformBatch(rows);
	return json(result);
};
//#endregion
export { POST };
