import { json, type RequestHandler } from "@sveltejs/kit";
import { CONFIG } from "$lib/server/config.js";
import { logger } from "$lib/server/logger.js";
import { syncPipeline } from "$lib/server/syncPipeline.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { rowIndex, sheetRowIndex, sheetId, gid, sheetName } = body;

	const actualSheetRow =
		sheetRowIndex !== undefined && Number(sheetRowIndex) >= 2
			? Number(sheetRowIndex)
			: rowIndex !== undefined && Number(rowIndex) >= 0
				? Number(rowIndex) + 2
				: undefined;

	logger.info(
		"API:sheets:delete-row",
		`Yêu cầu xóa dòng Sheet ${actualSheetRow !== undefined ? actualSheetRow : "?"} trên Google Sheet (GID: ${gid})`,
		{ sheetName, actualSheetRow },
	);

	const result = await syncPipeline.googleSheetService.deleteSheetRow({
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
		sheetName,
		rowIndex: rowIndex !== undefined ? Number(rowIndex) : undefined,
		sheetRowIndex: actualSheetRow,
	});

	logger.info(
		"API:sheets:delete-row",
		`Kết quả xóa dòng Sheet: success=${result.success}, message="${result.message}"`,
	);

	return json({
		...result,
		rowIndex,
		sheetRowIndex: actualSheetRow,
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
	});
};
