import { c as catalogManager } from '../../../../chunks/catalogManager.js-DZ1-_TLD.js';
import { D as DataTransformer } from '../../../../chunks/dataTransformer.js-CI3zJnq1.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import '../../../../chunks/config.js-MrK2uMye.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/transform/+server.ts
var POST = async ({ request }) => {
	await catalogManager.initialize();
	try {
		const rows = (await request.json()).rows || [];
		const vnPayloads = [];
		const foreignPayloads = [];
		const completenessList = [];
		rows.forEach((row, idx) => {
			const completeness = DataTransformer.checkCompleteness(row);
			completenessList.push({
				index: idx,
				completeness
			});
			if (DataTransformer.isGuestVN(row)) vnPayloads.push({
				originalIndex: idx,
				payload: DataTransformer.transformToPayloadVn(row)
			});
			else foreignPayloads.push({
				originalIndex: idx,
				payload: DataTransformer.transformToPayloadForeign(row)
			});
		});
		return json({
			success: true,
			totalRows: rows.length,
			vnPayloads,
			foreignPayloads,
			completenessList
		});
	} catch (err) {
		return json({
			success: false,
			error: err.message
		}, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts.js-Br--iGQo.js.map
