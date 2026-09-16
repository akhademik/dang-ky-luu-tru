import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import { CONFIG } from "$lib/server/config.js";
import { logger } from "$lib/server/logger.js";

export const GET: RequestHandler = async ({ url }) => {
	const sheetId = (
		url.searchParams.get("sheetId") || CONFIG.GOOGLE_SHEET_ID
	).trim();
	const forceRefresh = url.searchParams.get("refresh") === "true";
	logger.info(
		"API:sheets:tabs",
		`Quét tabs cho Sheet: ${sheetId} (forceRefresh=${forceRefresh})`,
	);
	const tabsRes = await syncPipeline.googleSheetService.fetchSheetTabs(
		sheetId,
		forceRefresh,
	);
	logger.info(
		"API:sheets:tabs",
		`Tìm thấy ${tabsRes.tabs.length} tabs, mặc định: GID ${tabsRes.defaultGid}`,
	);
	return json(tabsRes);
};
