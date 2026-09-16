import { n as CONFIG, t as syncPipeline } from "../../../../../chunks/syncPipeline.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/sheets/pull/+server.ts
var POST = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const sheetId = body.sheetId || CONFIG.GOOGLE_SHEET_ID;
	const gid = body.gid;
	const apiKey = body.apiKey;
	const resData = await syncPipeline.googleSheetService.fetchSheetData(sheetId, gid, apiKey);
	return json(resData, { status: resData.success ? 200 : 400 });
};
//#endregion
export { POST };
