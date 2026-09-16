import { s as syncPipeline } from '../../../../chunks/syncPipeline.js-Ur5OIb-G.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/transform/+server.ts
var POST = async ({ request }) => {
	const rows = (await request.json().catch(() => ({}))).rows || [];
	if (!Array.isArray(rows)) return json({ error: "rows must be an array" }, { status: 400 });
	const result = await syncPipeline.dataTransformer.transformBatch(rows);
	return json(result);
};

export { POST };
//# sourceMappingURL=_server.ts.js-BYxAwXZ5.js.map
