import { s as syncPipeline, C as CONFIG } from '../../../../../chunks/syncPipeline.js-Ur5OIb-G.js';
import { j as json } from '../../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/sheets/update-row/+server.ts
var POST = async ({ request }) => {
	const { rowIndex, row, sheetId, gid } = await request.json().catch(() => ({}));
	const result = await syncPipeline.googleSheetService.updateSheetRow({
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0",
		rowIndex,
		rowData: row
	});
	return json({
		...result,
		rowIndex,
		row,
		sheetId: sheetId || CONFIG.GOOGLE_SHEET_ID,
		gid: gid || "0"
	});
};

export { POST };
//# sourceMappingURL=_server.ts.js-Di_lH4LH.js.map
