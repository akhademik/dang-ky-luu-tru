import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";
import { CONFIG } from "$lib/server/config.js";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const sheetId = body.sheetId || CONFIG.GOOGLE_SHEET_ID;
	const gid = body.gid;
	const apiKey = body.apiKey;

	const resData = await syncPipeline.googleSheetService.fetchSheetData(
		sheetId,
		gid,
		apiKey,
	);
	return json(resData, { status: resData.success ? 200 : 400 });
};
