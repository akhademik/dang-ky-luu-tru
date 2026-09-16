import { n as CONFIG, t as syncPipeline } from "../../../../../chunks/syncPipeline.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/sheets/update-row/+server.ts
var POST = async ({ request }) => {
	const { rowIndex, row, sheetId, gid } = await request.json().catch(() => ({}));
	const result = await syncPipeline.googleSheetService.updateSheetRow({
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
		rowIndex,
		rowData: row
	});
	return json({
		...result,
		rowIndex,
		row,
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0"
	});
};
//#endregion
export { POST };
