import { t as syncPipeline } from "../../../../chunks/syncPipeline.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/sync/+server.ts
var POST = async ({ request }) => {
	const rows = (await request.json().catch(() => ({}))).rows || [];
	if (!Array.isArray(rows)) return json({ error: "rows must be an array" }, { status: 400 });
	const results = await syncPipeline.processRows(rows);
	return json({ results });
};
//#endregion
export { POST };
