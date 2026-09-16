import { t as GoogleSheetService } from "../../../../../chunks/googleSheetService.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/sheets/update-row/+server.ts
var POST = async ({ request }) => {
	try {
		const { sheetId, gid, sheetName, rowIndex, row } = await request.json();
		const result = await GoogleSheetService.updateRowViaAppsScript({
			sheetId,
			gid,
			sheetName,
			rowIndex,
			row
		});
		return json(result);
	} catch (err) {
		return json({
			success: false,
			message: err.message
		}, { status: 500 });
	}
};
//#endregion
export { POST };
