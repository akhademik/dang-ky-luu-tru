import { C as CONFIG, s as syncPipeline } from '../../../../../chunks/syncPipeline.js-Ur5OIb-G.js';
import { j as json } from '../../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/sheets/tabs/+server.ts
var GET = async ({ url }) => {
	const sheetId = (url.searchParams.get("sheetId") || CONFIG.GOOGLE_SHEET_ID).trim();
	const tabsRes = await syncPipeline.googleSheetService.fetchSheetTabs(sheetId);
	return json(tabsRes);
};

export { GET };
//# sourceMappingURL=_server.ts.js-DznlJj1V.js.map
