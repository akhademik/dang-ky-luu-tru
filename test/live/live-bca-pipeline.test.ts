import assert from "node:assert/strict";
import { CONFIG } from "../../src/lib/server/config.js";
import { GoogleSheetService } from "../../src/lib/server/googleSheetService.js";
import { KbttClient } from "../../src/lib/server/kbttClient.js";
import { tokenManager } from "../../src/lib/server/tokenManager.js";

async function runLiveBcaPipelineTests(): Promise<void> {
	console.log(
		"🌐 [Live] Chạy Live BCA Sandbox & Google Sheets Integration Test...",
	);

	// 1. Test Live Google Sheet Reading
	if (CONFIG.GOOGLE_SHEET_ID) {
		const sheetService = new GoogleSheetService();
		const tabsRes = await sheetService.fetchSheetTabs(CONFIG.GOOGLE_SHEET_ID);
		assert.ok(tabsRes.tabs.length > 0, "Phải tìm thấy ít nhất 1 tab");
		const sheetData = await sheetService.fetchSheetData(
			CONFIG.GOOGLE_SHEET_ID,
			tabsRes.defaultGid,
		);
		assert.ok(
			sheetData.rows.length >= 1,
			"Phải kéo được ít nhất 1 dòng từ CSV",
		);
		console.log("✅ [Live] GoogleSheetService live fetch test passed!");
	} else {
		console.log(
			"⚠️ [Live] Bỏ qua GoogleSheetService fetch do chưa cấu hình GOOGLE_SHEET_ID",
		);
	}

	// 2. Test OAuth Token & KBTT API Client
	const token = await tokenManager.getValidToken();
	assert.ok(token, "Phải lấy được Bearer Token hợp lệ từ BCA Sandbox");
	console.log("✅ [Live] TokenManager Login test passed!");

	const kbttClient = new KbttClient(tokenManager);
	const testVnPayload = {
		hoTen: "NGUYỄN VĂN A",
		gioiTinh: "M",
		soDienThoai: "",
		ngayThangNamSinhStr: "1992-10-01",
		noiCuTru: 1,
		maTT: "",
		maPX: "",
		diaChi: "Ba Đình, Hà Nội",
		ngayDenCsltStr: "2026-09-17 14:00:00",
		ngayDiDuKienStr: "2026-09-19 12:00:00",
		soPhong: "Phong so 1",
		lyDoCuTru: 1,
		lyDoChiTiet: "",
		loaiGiayTo: 1,
		soGiayTo: "001092000001",
		anhTruocB64: "",
		anhSauB64: "",
		ghiChu: "",
	};

	const apiRes = await kbttClient.sendVietnam([testVnPayload]);
	assert.ok(typeof apiRes.code === "string" || typeof apiRes.code === "number");
	console.log(
		`✅ [Live] API Client test passed! (Response code: ${apiRes.code}, RequestId: ${apiRes.requestId})`,
	);

	console.log("\n🎉 LIVE BCA PIPELINE TESTS ĐÃ HOÀN THÀNH THÀNH CÔNG!");
}

runLiveBcaPipelineTests().catch((err) => {
	console.error("❌ [Live] Live test failed:", err);
	process.exit(1);
});
