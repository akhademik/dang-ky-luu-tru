import { n as CONFIG, t as syncPipeline } from "../../../../../chunks/syncPipeline.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/sheets/tabs/+server.ts
var GET = async ({ url }) => {
	const sheetId = (url.searchParams.get("sheetId") || CONFIG.GOOGLE_SHEET_ID).trim();
	const tabsRes = await syncPipeline.googleSheetService.fetchSheetTabs(sheetId);
	return json(tabsRes);
};
//#endregion
export { GET };
