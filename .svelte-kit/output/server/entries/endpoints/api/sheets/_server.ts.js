import { t as CONFIG } from "../../../../chunks/config.js";
import { t as GoogleSheetService } from "../../../../chunks/googleSheetService.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/sheets/+server.ts
var GET = async ({ url }) => {
	const sheetId = (url.searchParams.get("sheetId") || CONFIG.GOOGLE_SHEET_ID).trim();
	const gidParam = url.searchParams.get("gid");
	const action = url.searchParams.get("action");
	try {
		if (action === "tabs") {
			const tabs = await GoogleSheetService.fetchPublicSheetTabs(sheetId);
			const closestTab = GoogleSheetService.findClosestTab(tabs);
			return json({
				success: true,
				sheetId,
				tabs,
				defaultGid: closestTab?.gid || tabs[0]?.gid || "0"
			});
		}
		const tabs = await GoogleSheetService.fetchPublicSheetTabs(sheetId);
		let chosenTab = gidParam ? tabs.find((t) => t.gid === gidParam) : null;
		if (!chosenTab) chosenTab = GoogleSheetService.findClosestTab(tabs) || tabs[0];
		const gid = chosenTab ? chosenTab.gid : "0";
		const csv = await GoogleSheetService.fetchPublicSheetCsv(sheetId, gid);
		const rows = GoogleSheetService.parseCsv(csv);
		return json({
			success: true,
			sheetId,
			tabs,
			selectedTab: chosenTab,
			totalRows: rows.length,
			rows
		});
	} catch (err) {
		return json({
			success: false,
			error: err.message
		}, { status: 500 });
	}
};
//#endregion
export { GET };
