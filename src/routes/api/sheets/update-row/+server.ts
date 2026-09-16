import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import { CONFIG } from "$lib/server/config.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { rowIndex, row, sheetId, gid } = body;

	const result = await syncPipeline.googleSheetService.updateSheetRow({
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
		rowIndex,
		rowData: row,
	});

	return json({
		...result,
		rowIndex,
		row,
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
	});
};
