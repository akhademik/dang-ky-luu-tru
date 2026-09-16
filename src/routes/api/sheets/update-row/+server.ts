import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import { CONFIG } from "$lib/server/config.js";
import { logger } from "$lib/server/logger.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const { rowIndex, sheetRowIndex, row, sheetId, gid, sheetName } = body;

	const actualSheetRow =
		sheetRowIndex !== undefined && Number(sheetRowIndex) >= 2
			? Number(sheetRowIndex)
			: rowIndex !== undefined && Number(rowIndex) >= 0
				? Number(rowIndex) + 2
				: undefined;

	logger.info(
		"API:sheets:update-row",
		`Cập nhật dòng Sheet ${actualSheetRow !== undefined ? actualSheetRow : "?"} (index ${rowIndex}) lên Google Sheet (GID: ${gid})`,
		{ guest: row?.hoTen || row?.["Họ tên"], sheetName },
	);

	const result = await syncPipeline.googleSheetService.updateSheetRow({
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
		sheetName,
		rowIndex: rowIndex !== undefined ? Number(rowIndex) : undefined,
		sheetRowIndex: actualSheetRow,
		rowData: row,
	});

	logger.info(
		"API:sheets:update-row",
		`Kết quả cập nhật Sheet: success=${result.success}, message="${result.message}"`,
	);

	return json({
		...result,
		rowIndex,
		sheetRowIndex: actualSheetRow,
		row,
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
	});
};
