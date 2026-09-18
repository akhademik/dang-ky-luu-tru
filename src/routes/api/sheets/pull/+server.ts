import { json, type RequestHandler } from "@sveltejs/kit";
import { CONFIG } from "$lib/server/config.js";
import { getDb } from "$lib/server/db.js";
import { logger } from "$lib/server/logger.js";
import { stayService } from "$lib/server/stayService.js";
import { syncPipeline } from "$lib/server/syncPipeline.js";

const inFlightPull = new Map<string, Promise<unknown>>();

export const POST: RequestHandler = async ({ request, platform }) => {
	const body = await request.json().catch(() => ({}));
	const sheetId = body.sheetId || CONFIG.GOOGLE_SHEET_ID;
	let gid = body.gid;
	let tabName = body.tabName;
	const apiKey = body.apiKey;

	if (!sheetId) {
		return json({
			success: false,
			message: "Chưa cấu hình GOOGLE_SHEET_ID trong hệ thống",
		});
	}

	const pullKey = `${sheetId}:${gid || "default"}`;
	if (inFlightPull.has(pullKey)) {
		logger.info(
			"API:sheets:pull",
			`Đang có yêu cầu kéo dữ liệu cho ${pullKey}, tái sử dụng in-flight request`,
		);
		const existingResult = await inFlightPull.get(pullKey);
		return json(existingResult);
	}

	const pullPromise = (async () => {
		if (!gid) {
			const tabsRes =
				await syncPipeline.googleSheetService.fetchSheetTabs(sheetId);
			if (tabsRes.success && tabsRes.defaultGid) {
				gid = tabsRes.defaultGid;
				const targetTab = tabsRes.tabs.find((t) => t.gid === gid);
				if (targetTab) {
					tabName = tabName || targetTab.name;
				}
			}
		}

		logger.info(
			"API:sheets:pull",
			`Yêu cầu kéo dữ liệu tab GID: ${gid}, Tab: ${tabName || "default"}, Sheet: ${sheetId}`,
		);

		const resData = await syncPipeline.googleSheetService.fetchSheetData(
			sheetId,
			gid,
			apiKey,
		);

		logger.info(
			"API:sheets:pull",
			`Kết quả kéo dữ liệu: success=${resData.success}, rows=${resData.rows?.length || 0}`,
		);

		// If successfully pulled rows from Google Sheets, directly ingest them into the Database
		if (
			resData.success &&
			Array.isArray(resData.rows) &&
			resData.rows.length > 0
		) {
			try {
				const db = getDb(platform);
				const resolvedTabName =
					tabName || (resData as { tabName?: string }).tabName || "GoogleSheet";
				const ingestRes = await stayService.ingestOcrRows(
					db,
					resData.rows,
					resolvedTabName,
				);
				logger.info(
					"API:sheets:pull",
					`Đã nạp ${ingestRes.created} dòng mới, cập nhật ${ingestRes.updated} dòng (${ingestRes.total} tổng cộng) vào Database`,
				);
				return {
					...resData,
					tabName: resolvedTabName,
					ingested: ingestRes.created,
					updated: ingestRes.updated,
					totalRows: ingestRes.total,
					ingestResult: ingestRes,
					message: `Đã đồng bộ ${ingestRes.created + ingestRes.updated} khách (${ingestRes.created} mới, ${ingestRes.updated} cập nhật) từ Sheet vào Database`,
				};
			} catch (err) {
				logger.error(
					"API:sheets:pull",
					`Lỗi khi nạp dữ liệu vào Database: ${(err as Error).message}`,
				);
				return {
					...resData,
					tabName,
					ingested: 0,
					error: (err as Error).message,
				};
			}
		}

		return resData;
	})();

	inFlightPull.set(pullKey, pullPromise);

	try {
		const result = await pullPromise;
		return json(result);
	} finally {
		inFlightPull.delete(pullKey);
	}
};
