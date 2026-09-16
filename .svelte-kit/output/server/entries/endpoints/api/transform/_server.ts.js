import { t as catalogManager } from "../../../../chunks/catalogManager.js";
import { t as DataTransformer } from "../../../../chunks/dataTransformer.js";
import { json } from "@sveltejs/kit";
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
//#endregion
export { POST };
