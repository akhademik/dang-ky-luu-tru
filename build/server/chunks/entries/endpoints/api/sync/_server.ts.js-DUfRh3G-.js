import { s as syncPipeline } from '../../../../chunks/syncPipeline.js-Ur5OIb-G.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/sync/+server.ts
var POST = async ({ request }) => {
	const rows = (await request.json().catch(() => ({}))).rows || [];
	if (!Array.isArray(rows)) return json({ error: "rows must be an array" }, { status: 400 });
	const results = await syncPipeline.processRows(rows);
	return json({ results });
};

export { POST };
//# sourceMappingURL=_server.ts.js-DUfRh3G-.js.map
