import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import { CONFIG } from "$lib/server/config.js";

export const GET: RequestHandler = async ({ url }) => {
	const sheetId = (
		url.searchParams.get("sheetId") || CONFIG.GOOGLE_SHEET_ID
	).trim();
	const tabsRes = await syncPipeline.googleSheetService.fetchSheetTabs(sheetId);
	return json(tabsRes);
};
