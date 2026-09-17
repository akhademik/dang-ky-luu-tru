import assert from "node:assert/strict";
import { catalogManager } from "../src/lib/server/catalogManager.js";
import { CONFIG } from "../src/lib/server/config.js";
import {
	DataTransformer,
	type RawOcrRow,
} from "../src/lib/server/dataTransformer.js";
import {
	checkoutStay,
	extendStay,
	getAuditLogs,
	getDashboardStats,
	getDb,
	getStayById,
	getStays,
	logKbttAction,
	updateGuest,
	updateStay,
	upsertGuest,
	upsertStay,
} from "../src/lib/server/db.js";
import { GoogleSheetService } from "../src/lib/server/googleSheetService.js";
import { KbttClient } from "../src/lib/server/kbttClient.js";
import { stayService } from "../src/lib/server/stayService.js";
import { tokenManager } from "../src/lib/server/tokenManager.js";

async function runTests(): Promise<void> {
	console.log(
		"🧪 Đang chạy unit tests cho các module SvelteKit + TypeScript KBTT + Cloudflare D1...",
	);

	// 1. Test CatalogManager
	await catalogManager.initialize();
	assert.equal(catalogManager.findQuocTich("Việt Nam"), "VNM");
	assert.equal(catalogManager.findQuocTich("VN"), "VNM");
	assert.equal(catalogManager.findQuocTich("Hoa Kỳ"), "USA");
	assert.equal(catalogManager.findQuocTich("China"), "CHN");
	assert.equal(catalogManager.findQuocTich("Russia"), "RUS");
	assert.equal(catalogManager.findQuocTich("Hàn Quốc"), "KOR");
	assert.equal(catalogManager.isValidQuocTichCode("VNM"), true);
	assert.equal(catalogManager.isValidQuocTichCode("RUS"), true);
	assert.equal(catalogManager.isValidQuocTichCode("USA"), true);
	assert.equal(catalogManager.isValidQuocTichCode("D"), true);
	assert.equal(catalogManager.isValidQuocTichCode("DEU"), true);
	assert.equal(catalogManager.findQuocTich("Đức"), "D");
	assert.equal(catalogManager.findQuocTich("Germany"), "D");
	assert.equal(catalogManager.isValidQuocTichCode("XYZ_NOT_EXIST"), false);
	assert.equal(catalogManager.lyDoCuTruList.length, 2);
	assert.equal(catalogManager.findLoaiGiayTo("CCCD"), 1);
	assert.equal(catalogManager.findLoaiGiayTo("Thẻ CCCD"), 1);
	assert.equal(catalogManager.findLoaiGiayTo("Hộ chiếu"), 4);
	assert.equal(catalogManager.findLoaiGiayTo("Thẻ Căn Cước"), 8);
	console.log("✅ CatalogManager test passed!");

	// 2. Test DataTransformer formatting
	assert.equal(DataTransformer.formatDateOnly("15/08/1990"), "1990-08-15");
	assert.equal(DataTransformer.formatDateOnly("1990-08-15"), "1990-08-15");
	assert.equal(DataTransformer.mapGender("Nam"), "M");
	assert.equal(DataTransformer.mapGender("Nữ"), "F");
	assert.equal(
		DataTransformer.cleanDocNumber(" 001-090.012 345 "),
		"001090012345",
	);
	assert.equal(DataTransformer.cleanRoomNumber("P.06"), "6");
	assert.equal(DataTransformer.cleanRoomNumber("P.07"), "7");
	assert.equal(DataTransformer.cleanRoomNumber("Phòng 3"), "3");
	console.log("✅ DataTransformer test passed!");

	// 3. Test Cloudflare D1 Database Layer (Local SQLite Compatibility)
	const db = getDb();

	// Test upsertGuest (preserving leading zeros on CCCD)
	const guest1 = await upsertGuest(db, {
		ho_ten: "NGUYỄN VĂN A",
		so_giay_to: "001092000001",
		quoc_tich: "VNM",
		loai_giay_to: "CCCD",
		ngay_sinh: "1992-10-01",
		gioi_tinh: "M",
		tinh_thanh: "TP. Hà Nội",
	});
	assert.ok(guest1.id);
	assert.equal(guest1.so_giay_to, "001092000001");
	assert.equal(guest1.ho_ten, "NGUYỄN VĂN A");

	// Test upsertStay
	const stay1 = await upsertStay(db, guest1.id, {
		so_phong: "5",
		ngay_den: "2026-09-17 14:00:00",
		ngay_di_du_kien: "2026-09-19",
		status: "READY_TO_SYNC",
	});
	assert.ok(stay1.id);
	assert.equal(stay1.so_phong, "5");
	assert.equal(stay1.status, "READY_TO_SYNC");

	// Test getStays
	const staysList = await getStays(db, { status: "READY_TO_SYNC" });
	assert.ok(staysList.length >= 1);
	assert.equal(staysList[0].ho_ten, "NGUYỄN VĂN A");
	assert.equal(staysList[0].so_giay_to, "001092000001");

	// Test updateGuest & updateStay
	await updateGuest(db, guest1.id, { so_dien_thoai: "0912345678" });
	await updateStay(db, stay1.id, { ghi_chu: "VIP Guest" });
	const fetchedStay = await getStayById(db, stay1.id);
	assert.equal(fetchedStay?.so_dien_thoai, "0912345678");
	assert.equal(fetchedStay?.ghi_chu, "VIP Guest");

	// Test extendStay
	const extendOk = await extendStay(db, stay1.id, "2026-09-25");
	assert.equal(extendOk, true);
	const extendedStay = await getStayById(db, stay1.id);
	assert.equal(extendedStay?.status, "EXTENDED");
	assert.equal(extendedStay?.ngay_di_du_kien, "2026-09-25");

	// Test checkoutStay
	const checkoutOk = await checkoutStay(db, stay1.id);
	assert.equal(checkoutOk, true);
	const checkedOutStay = await getStayById(db, stay1.id);
	assert.equal(checkedOutStay?.status, "CHECKED_OUT");
	assert.ok(checkedOutStay?.ngay_di_thuc_te);

	// Test logKbttAction and getAuditLogs
	await logKbttAction(db, {
		stay_id: stay1.id,
		api_endpoint: "API_5_VN",
		guest_name: "NGUYỄN VĂN A",
		so_giay_to: "001092000001",
		so_phong: "5",
		request_payload: '{"test":"req"}',
		response_payload: '{"test":"res"}',
		http_status: 200,
		code: "200",
		is_success: 1,
	});
	const auditLogs = await getAuditLogs(db, { search: "NGUYỄN VĂN A" });
	assert.ok(auditLogs.length >= 1);
	assert.equal(auditLogs[0].api_endpoint, "API_5_VN");

	// Test getDashboardStats
	const stats = await getDashboardStats(db);
	assert.ok(stats.totalGuests >= 1);
	assert.ok(stats.totalStays >= 1);
	console.log("✅ Cloudflare D1 Database Layer tests passed!");

	// 4. Test StayService OCR Ingestion
	const sampleOcrRows: RawOcrRow[] = [
		{
			STT: "1",
			"Họ tên": "TRẦN VĂN B",
			"Số giấy tờ": "001201009988",
			"Quốc tịch": "VNM",
			"Số phòng": "Phong so 8",
			"D.O.B": "1995-05-20",
			"Giới tính": "Nam",
			"(từ ngày)": "2026-09-17 12:00:00",
			"(đến ngày)": "2026-09-20",
			"Địa chỉ": "123 Cầu Giấy, Hà Nội",
			Tỉnh: "TP. Hà Nội",
		},
		{
			STT: "2",
			"Họ tên": "JOHN DOE",
			"Số giấy tờ": "P12345678",
			"Quốc tịch": "USA",
			"Số phòng": "9",
			"D.O.B": "1988-03-12",
			"Giới tính": "Nam",
			"(từ ngày)": "2026-09-17 14:00:00",
			"(đến ngày)": "2026-09-22",
			"Địa chỉ": "New York, USA",
		},
	];

	const ingestResult = await stayService.ingestOcrRows(
		db,
		sampleOcrRows,
		"17-09-26",
	);
	assert.equal(ingestResult.total, 2);
	assert.equal(ingestResult.created, 2);
	assert.equal(ingestResult.errors.length, 0);

	const readyStays = await getStays(db, { status: "READY_TO_SYNC" });
	assert.ok(
		readyStays.some((s) => s.ho_ten === "TRẦN VĂN B" && s.so_phong === "8"),
	);
	assert.ok(
		readyStays.some((s) => s.ho_ten === "JOHN DOE" && s.so_phong === "9"),
	);
	console.log("✅ StayService OCR Ingestion tests passed!");

	// 5. Test Live Google Sheet Reading (Legacy / Ingestion verification)
	const sheetService = new GoogleSheetService();
	const tabsRes = await sheetService.fetchSheetTabs(CONFIG.GOOGLE_SHEET_ID);
	assert.ok(tabsRes.tabs.length > 0, "Phải tìm thấy ít nhất 1 tab");
	const sheetData = await sheetService.fetchSheetData(
		CONFIG.GOOGLE_SHEET_ID,
		tabsRes.defaultGid,
	);
	assert.ok(sheetData.rows.length >= 1, "Phải kéo được ít nhất 1 dòng từ CSV");
	console.log("✅ GoogleSheetService live fetch test passed!");

	// 6. Test OAuth Token & KBTT API Client
	const token = await tokenManager.getValidToken();
	assert.ok(token, "Phải lấy được Bearer Token hợp lệ");
	console.log("✅ TokenManager Login test passed!");

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
	assert.ok(typeof apiRes.code === "string");
	console.log("✅ API Client test passed!");

	// Cleanup token
	await tokenManager.revokeToken();
	console.log("✅ TokenManager Revoke test passed!");

	console.log(
		"\n🎉 TẤT CẢ UNIT & INTEGRATION TESTS ĐÃ HOÀN THÀNH THÀNH CÔNG 100%!",
	);
}

runTests().catch((err) => {
	console.error("❌ Test failed:", err);
	process.exit(1);
});
