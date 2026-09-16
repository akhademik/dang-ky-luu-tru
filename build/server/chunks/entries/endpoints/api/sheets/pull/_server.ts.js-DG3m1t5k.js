import { C as CONFIG, s as syncPipeline } from '../../../../../chunks/syncPipeline.js-Ur5OIb-G.js';
import { j as json } from '../../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/sheets/pull/+server.ts
var POST = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const sheetId = body.sheetId || CONFIG.GOOGLE_SHEET_ID;
	const gid = body.gid;
	const apiKey = body.apiKey;
	const resData = await syncPipeline.googleSheetService.fetchSheetData(sheetId, gid, apiKey);
	return json(resData, { status: resData.success ? 200 : 400 });
};

export { POST };
//# sourceMappingURL=_server.ts.js-DG3m1t5k.js.map
