import { C as CONFIG } from '../../../../chunks/config.js-MrK2uMye.js';
import { c as catalogManager } from '../../../../chunks/catalogManager.js-DZ1-_TLD.js';
import { G as GoogleSheetService } from '../../../../chunks/googleSheetService.js-MeIVQh1S.js';
import { t as tokenManager } from '../../../../chunks/tokenManager.js-Ch4CH6Dv.js';
import { D as DataTransformer } from '../../../../chunks/dataTransformer.js-CI3zJnq1.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/lib/server/kbttClient.ts
var KbttClient = class {
	static async sendBatchVn(payloadList) {
		return this.sendRequest(CONFIG.ENDPOINTS.KBTT_VIETNAM, payloadList, "Thông báo lưu trú (VN)");
	}
	static async sendBatchForeign(payloadList) {
		return this.sendRequest(CONFIG.ENDPOINTS.KBTT_FOREIGN, payloadList, "Thông báo lưu trú (Nước ngoài)");
	}
	static async sendRequest(endpoint, payloadList, label) {
		const token = await tokenManager.getValidToken();
		if (!token) throw new Error("[KbttClient] Không thể lấy Access Token hợp lệ.");
		const url = `${CONFIG.BASE_URL}${endpoint}`;
		const headers = {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${token}`
		};
		const res = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(payloadList)
		});
		let resData = {};
		try {
			resData = await res.json();
		} catch {
			resData = { message: await res.text() };
		}
		const isSuccess = res.ok && (resData.code === "200" || resData.code === 200 || !resData.code);
		return {
			success: isSuccess,
			code: resData.code || res.status,
			message: resData.message || (isSuccess ? "Thành công" : `Lỗi ${res.status}`),
			raw: resData
		};
	}
};
//#endregion
//#region src/lib/server/syncPipeline.ts
var SyncPipeline = class {
	static async runFromGoogleSheet(sheetId = CONFIG.GOOGLE_SHEET_ID, targetGid) {
		const report = {
			timestamp: (/* @__PURE__ */ new Date()).toISOString(),
			sheetId,
			selectedTab: null,
			totalFetched: 0,
			results: []
		};
		try {
			await catalogManager.initialize();
			const tabs = await GoogleSheetService.fetchPublicSheetTabs(sheetId);
			const chosenTab = targetGid ? tabs.find((t) => t.gid === targetGid) || tabs[0] : GoogleSheetService.findClosestTab(tabs);
			report.selectedTab = chosenTab || null;
			const gid = chosenTab ? chosenTab.gid : "0";
			const csv = await GoogleSheetService.fetchPublicSheetCsv(sheetId, gid);
			const rawRows = GoogleSheetService.parseCsv(csv);
			report.totalFetched = rawRows.length;
			if (rawRows.length === 0) {
				report.results.push({
					step: "PARSE_CSV",
					success: true,
					status: "Cảnh báo",
					message: "Không tìm thấy dòng dữ liệu nào trong tab đã chọn."
				});
				return report;
			}
			report.results = await this.processAndSyncRows(rawRows);
		} catch (error) {
			report.results.push({
				step: "PIPELINE_ERROR",
				success: false,
				status: "Thất bại",
				message: error.message
			});
		}
		return report;
	}
	static async processAndSyncRows(rawRows) {
		const results = [];
		const vnBatch = [];
		const foreignBatch = [];
		for (let i = 0; i < rawRows.length; i++) {
			const row = rawRows[i];
			const check = DataTransformer.checkCompleteness(row);
			const isVN = DataTransformer.isGuestVN(row);
			if (!check.isComplete) {
				results.push({
					step: "VALIDATION",
					row,
					branch: isVN ? "VN" : "FOREIGN",
					success: false,
					status: "Thiếu thông tin bắt buộc",
					message: `Dòng ${i + 1} thiếu hoặc sai trường: ${check.missingFields.join(", ")}`
				});
				continue;
			}
			if (isVN) {
				const payload = DataTransformer.transformToPayloadVn(row);
				vnBatch.push({
					row,
					payload,
					originalIndex: i
				});
			} else {
				const payload = DataTransformer.transformToPayloadForeign(row);
				foreignBatch.push({
					row,
					payload,
					originalIndex: i
				});
			}
		}
		if (vnBatch.length > 0) try {
			const payloads = vnBatch.map((item) => item.payload);
			const res = await KbttClient.sendBatchVn(payloads);
			vnBatch.forEach((item) => {
				results.push({
					step: "API_5_VN",
					row: item.row,
					branch: "VN",
					payload: item.payload,
					success: res.success,
					status: res.success ? "Thành công" : "Thất bại",
					message: res.message,
					response: res.raw
				});
			});
		} catch (err) {
			vnBatch.forEach((item) => {
				results.push({
					step: "API_5_VN",
					row: item.row,
					branch: "VN",
					payload: item.payload,
					success: false,
					status: "Lỗi gửi yêu cầu",
					message: err.message
				});
			});
		}
		if (foreignBatch.length > 0) try {
			const payloads = foreignBatch.map((item) => item.payload);
			const res = await KbttClient.sendBatchForeign(payloads);
			foreignBatch.forEach((item) => {
				results.push({
					step: "API_4_FOREIGN",
					row: item.row,
					branch: "FOREIGN",
					payload: item.payload,
					success: res.success,
					status: res.success ? "Thành công" : "Thất bại",
					message: res.message,
					response: res.raw
				});
			});
		} catch (err) {
			foreignBatch.forEach((item) => {
				results.push({
					step: "API_4_FOREIGN",
					row: item.row,
					branch: "FOREIGN",
					payload: item.payload,
					success: false,
					status: "Lỗi gửi yêu cầu",
					message: err.message
				});
			});
		}
		return results;
	}
};
//#endregion
//#region src/routes/api/sync/+server.ts
var POST = async ({ request }) => {
	await catalogManager.initialize();
	try {
		const rows = (await request.json()).rows || [];
		if (rows.length === 0) return json({
			success: false,
			message: "Danh sách bản ghi trống"
		}, { status: 400 });
		const results = await SyncPipeline.processAndSyncRows(rows);
		return json({
			success: true,
			count: results.length,
			results
		});
	} catch (err) {
		return json({
			success: false,
			error: err.message
		}, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts.js-Cn9Y-NGn.js.map
