import assert from "node:assert/strict";
import type { RawOcrRow } from "../../src/lib/server/dataTransformer.js";
import {
	checkoutStay,
	extendStay,
	getAuditLogs,
	getDashboardStats,
	getStayById,
	getStays,
	logKbttAction,
	updateGuest,
	updateStay,
	upsertGuest,
	upsertStay,
} from "../../src/lib/server/db.js";
import { stayService } from "../../src/lib/server/stayService.js";
import { MockD1Database } from "../helpers/mock-d1.js";

async function runStayServiceIntegrationTests(): Promise<void> {
	console.log(
		"🧪 [Integration] Chạy kiểm thử D1 Database & StayService (Offline/Isolated)...",
	);

	const db = new MockD1Database();

	// Clean test fixtures
	await db.exec(
		"DELETE FROM kbtt_logs WHERE guest_name IN ('TEST NGUYEN A', 'TEST TRAN B', 'TEST JOHN DOE'); DELETE FROM stays WHERE guest_id IN (SELECT id FROM guests WHERE ho_ten IN ('TEST NGUYEN A', 'TEST TRAN B', 'TEST JOHN DOE')); DELETE FROM guests WHERE ho_ten IN ('TEST NGUYEN A', 'TEST TRAN B', 'TEST JOHN DOE');",
	);

	// 1. Test upsertGuest
	const guest1 = await upsertGuest(db, {
		ho_ten: "TEST NGUYEN A",
		so_giay_to: "001092000001",
		quoc_tich: "VNM",
		loai_giay_to: "CCCD",
		ngay_sinh: "1992-10-01",
		gioi_tinh: "M",
		tinh_thanh: "TP. Hà Nội",
	});
	assert.ok(guest1.id);
	assert.equal(guest1.so_giay_to, "001092000001");
	assert.equal(guest1.ho_ten, "TEST NGUYEN A");

	// 2. Test upsertStay
	const stay1 = await upsertStay(db, guest1.id, {
		so_phong: "101",
		ngay_den: "2026-09-17 14:00:00",
		ngay_di_du_kien: "2026-09-19",
		status: "READY_TO_SYNC",
	});
	assert.ok(stay1.id);
	assert.equal(stay1.so_phong, "101");
	assert.equal(stay1.status, "READY_TO_SYNC");

	// 3. Test getStays
	const staysList = await getStays(db, { status: "READY_TO_SYNC" });
	assert.ok(staysList.length >= 1);
	assert.ok(staysList.some((s) => s.ho_ten === "TEST NGUYEN A"));

	// 4. Test updateGuest & updateStay
	await updateGuest(db, guest1.id, { dia_chi_chi_tiet: "123 Phố Huế" });
	await updateStay(db, stay1.id, { ghi_chu: "VIP Guest" });
	const fetchedStay = await getStayById(db, stay1.id);
	assert.equal(fetchedStay?.dia_chi_chi_tiet, "123 Phố Huế");
	assert.equal(fetchedStay?.ghi_chu, "VIP Guest");

	// 5. Test extendStay
	const extendOk = await extendStay(db, stay1.id, "2026-09-25");
	assert.equal(extendOk, true);
	const extendedStay = await getStayById(db, stay1.id);
	assert.equal(extendedStay?.status, "EXTENDED");
	assert.equal(extendedStay?.ngay_di_du_kien, "2026-09-25");

	// 6. Test checkoutStay
	const checkoutOk = await checkoutStay(db, stay1.id);
	assert.equal(checkoutOk, true);
	const checkedOutStay = await getStayById(db, stay1.id);
	assert.equal(checkedOutStay?.status, "CHECKED_OUT");
	assert.ok(checkedOutStay?.ngay_di_thuc_te);

	// 7. Test logKbttAction and getAuditLogs
	await logKbttAction(db, {
		stay_id: stay1.id,
		api_endpoint: "API_5_VN",
		guest_name: "TEST NGUYEN A",
		so_giay_to: "001092000001",
		so_phong: "101",
		request_payload: '{"test":"req"}',
		response_payload: '{"test":"res"}',
		http_status: 200,
		code: "200",
		is_success: 1,
	});
	const auditLogs = await getAuditLogs(db, { search: "TEST NGUYEN A" });
	assert.ok(auditLogs.length >= 1);

	// 8. Test getDashboardStats
	const stats = await getDashboardStats(db);
	assert.ok(stats.totalGuests >= 1);
	assert.ok(stats.totalStays >= 1);

	// 9. Test StayService OCR Ingestion
	const sampleOcrRows: RawOcrRow[] = [
		{
			STT: "1",
			"Họ tên": "TEST TRAN B",
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
			"Họ tên": "TEST JOHN DOE",
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

	// Cleanup test fixtures
	await db.exec(
		"DELETE FROM kbtt_logs WHERE guest_name IN ('TEST NGUYEN A', 'TEST TRAN B', 'TEST JOHN DOE'); DELETE FROM stays WHERE guest_id IN (SELECT id FROM guests WHERE ho_ten IN ('TEST NGUYEN A', 'TEST TRAN B', 'TEST JOHN DOE')); DELETE FROM guests WHERE ho_ten IN ('TEST NGUYEN A', 'TEST TRAN B', 'TEST JOHN DOE');",
	);

	console.log("✅ [Integration] D1 Database & StayService tests passed!");
}

runStayServiceIntegrationTests().catch((err) => {
	console.error("❌ [Integration] Test failed:", err);
	process.exit(1);
});
