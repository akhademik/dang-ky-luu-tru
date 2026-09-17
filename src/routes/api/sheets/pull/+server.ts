import { json, type RequestHandler } from "@sveltejs/kit";
import { CONFIG } from "$lib/server/config.js";
import { logger } from "$lib/server/logger.js";
import { syncPipeline } from "$lib/server/syncPipeline.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const sheetId = body.sheetId || CONFIG.GOOGLE_SHEET_ID;
	const gid = body.gid;
	const apiKey = body.apiKey;

	logger.info(
		"API:sheets:pull",
		`Yêu cầu kéo dữ liệu tab GID: ${gid}, Sheet: ${sheetId}`,
	);

	const resData = await syncPipeline.googleSheetService.fetchSheetData(
		sheetId,
		gid,
		apiKey,
	);

	logger.info(
		"API:sheets:pull",
		`Kết quả kéo dữ liệu: success=${resData.success}, rows=${resData.rows?.length || 0}`,
	);

	return json(resData);
};
