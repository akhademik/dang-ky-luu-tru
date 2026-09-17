import { json, type RequestHandler } from "@sveltejs/kit";
import { CONFIG } from "$lib/server/config.js";
import { getDb } from "$lib/server/db.js";
import { logger } from "$lib/server/logger.js";
import { stayService } from "$lib/server/stayService.js";
import { syncPipeline } from "$lib/server/syncPipeline.js";

export const POST: RequestHandler = async ({ request, platform }) => {
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

	// If successfully pulled rows from Google Sheets, directly ingest them into the Database
	if (resData.success && Array.isArray(resData.rows) && resData.rows.length > 0) {
		try {
			const db = getDb(platform);
			const tabName = (resData as { tabName?: string }).tabName || "GoogleSheet";
			const ingestRes = await stayService.ingestOcrRows(
				db,
				resData.rows,
				tabName,
			);
			logger.info(
				"API:sheets:pull",
				`Đã nạp ${ingestRes.created} dòng vào Database`,
			);
			return json({
				...resData,
				ingested: ingestRes.created,
				ingestResult: ingestRes,
			});
		} catch (err) {
			logger.error(
				"API:sheets:pull",
				`Lỗi khi nạp dữ liệu vào Database: ${(err as Error).message}`,
			);
		}
	}

	return json(resData);
};
