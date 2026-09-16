import { G as GoogleSheetService } from '../../../../../chunks/googleSheetService.js-MeIVQh1S.js';
import { j as json } from '../../../../../chunks/utils.js-EuaxTqSG.js';
import '../../../../../chunks/config.js-MrK2uMye.js';
import 'node:fs';
import 'node:path';
import '../../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../../chunks/uneval.js-DaakSYFQ.js';

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

export { POST };
//# sourceMappingURL=_server.ts.js-CpHyZOU6.js.map
