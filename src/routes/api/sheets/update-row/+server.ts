import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import { CONFIG } from "$lib/server/config.js";
import { logger } from "$lib/server/logger.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { rowIndex, row, sheetId, gid } = body;

	logger.info(
		"API:sheets:update-row",
		`Cập nhật dòng ${rowIndex !== undefined ? rowIndex + 1 : "?"} lên Google Sheet (GID: ${gid})`,
		{ guest: row?.hoTen || row?.["Họ tên"] },
	);

	const result = await syncPipeline.googleSheetService.updateSheetRow({
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
		rowIndex,
		rowData: row,
	});

	logger.info(
		"API:sheets:update-row",
		`Kết quả cập nhật Sheet: success=${result.success}, message="${result.message}"`,
	);

	return json({
		...result,
		rowIndex,
		row,
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
	});
};
