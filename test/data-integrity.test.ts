import assert from "node:assert/strict";
import type { RequestEvent } from "@sveltejs/kit";
import { CONFIG } from "../src/lib/server/config.js";
import {
	formatDateTimeToGmt7,
	formatDateToGmt7,
	getNowGmt7DateString,
	getNowGmt7DateTimeString,
	isSameOrPastCheckoutTimeGmt7,
	isValidIsoDate,
	isValidIsoDateTime,
	parseToGmt7DateString,
	parseToGmt7DateTimeString,
} from "../src/lib/server/time.js";
import {
	assertValidTransition,
	isValidCccd,
	isValidPassport,
	isValidStayStatusTransition,
	validateStayCheckoutInput,
	validateStayExtensionInput,
	validateStayRegistrationInput,
	validateStayReRegisterInput,
} from "../src/lib/server/validator.js";
import { DELETE as auditDeleteHandler } from "../src/routes/api/stays/audit/+server.js";

async function runDataIntegrityTests(): Promise<void> {
	console.log("🟠 Đang chạy Data Integrity Tests (Phase 2)...");

	// 1. Kiểm tra Centralized GMT+7 Time Service
	const nowDateStr = getNowGmt7DateString();
	const nowDateTimeStr = getNowGmt7DateTimeString();
	assert.equal(
		isValidIsoDate(nowDateStr),
		true,
		"nowDateStr phải chuẩn YYYY-MM-DD",
	);
	assert.equal(
		isValidIsoDateTime(nowDateTimeStr),
		true,
		"nowDateTimeStr phải chuẩn YYYY-MM-DD HH:mm:ss",
	);

	// Parse date formats
	assert.equal(parseToGmt7DateString("15/08/1990"), "1990-08-15");
	assert.equal(parseToGmt7DateString("15-08-1990"), "1990-08-15");
	assert.equal(parseToGmt7DateString("1990-08-15"), "1990-08-15");
	assert.equal(parseToGmt7DateString("17-09-26"), "2026-09-17");

	// Parse datetime formats
	assert.equal(
		parseToGmt7DateTimeString("2026-09-17 14:30:00"),
		"2026-09-17 14:30:00",
	);
	assert.equal(
		parseToGmt7DateTimeString("17/09/2026 14:30"),
		"2026-09-17 14:30:00",
	);

	// Formatting
	assert.equal(formatDateToGmt7("1990-08-15"), "1990-08-15");
	assert.equal(
		formatDateTimeToGmt7("2026-09-17 14:00:00"),
		"2026-09-17 14:00:00",
	);

	// Checkout boundary rule
	assert.equal(
		isSameOrPastCheckoutTimeGmt7("2020-01-01"),
		true,
		"Ngày quá khứ phải tính là đã quá giờ checkout 12:00",
	);
	assert.equal(
		isSameOrPastCheckoutTimeGmt7("2099-01-01"),
		false,
		"Ngày tương lai xa chưa thể qua giờ checkout 12:00",
	);
	console.log("✅ 1. Centralized GMT+7 Time Service tests passed!");

	// 2. Kiểm tra State Machine & Valid Status Transitions
	assert.equal(
		isValidStayStatusTransition("READY_TO_SYNC", "SYNCED_KBTT"),
		true,
	);
	assert.equal(
		isValidStayStatusTransition("READY_TO_SYNC", "CHECKED_OUT"),
		true,
	);
	assert.equal(isValidStayStatusTransition("SYNCED_KBTT", "EXTENDED"), true);
	assert.equal(isValidStayStatusTransition("SYNCED_KBTT", "CHECKED_OUT"), true);
	assert.equal(isValidStayStatusTransition("EXTENDED", "EXTENDED"), true);
	assert.equal(isValidStayStatusTransition("EXTENDED", "CHECKED_OUT"), true);
	assert.equal(
		isValidStayStatusTransition("CHECKED_OUT", "READY_TO_SYNC"),
		true,
	);

	assert.equal(
		isValidStayStatusTransition("READY_TO_SYNC", "EXTENDED"),
		true,
	);

	// Invalid transitions
	assert.equal(
		isValidStayStatusTransition("CHECKED_OUT", "EXTENDED"),
		false,
		"Không được gia hạn khách đã checkout",
	);
	assert.equal(
		isValidStayStatusTransition("CANCELLED", "EXTENDED"),
		false,
		"Không được gia hạn hồ sơ đã hủy",
	);
	assert.equal(
		isValidStayStatusTransition("CHECKED_OUT", "SYNCED_KBTT"),
		false,
		"Không được trực tiếp sync hồ sơ đã checkout",
	);

	assert.throws(
		() => assertValidTransition("CHECKED_OUT", "EXTENDED"),
		/Chuyển đổi trạng thái không hợp lệ/,
	);
	console.log("✅ 2. State Machine & Status Transitions tests passed!");

	// 3. Kiểm tra Validation & Input Schemas
	assert.equal(isValidCccd("001092000001"), true);
	assert.equal(isValidCccd("123"), false);
	assert.equal(isValidPassport("C1234567"), true);
	assert.equal(isValidPassport(""), false);

	// Validate Stay Registration Input
	const validReg = validateStayRegistrationInput({
		ho_ten: "NGUYỄN VĂN A",
		so_giay_to: "001092000001",
		so_phong: "101",
		ngay_den: "2026-09-17",
		ngay_di_du_kien: "2026-09-19",
	});
	assert.equal(validReg.isValid, true);

	const invalidReg = validateStayRegistrationInput({});
	assert.equal(invalidReg.isValid, false);
	assert.ok(invalidReg.errors.length > 0);

	// Validate Extend Input
	assert.equal(
		validateStayExtensionInput({
			stayId: "stay_1",
			newNgayDi: "2026-09-25",
		}).isValid,
		true,
	);
	assert.equal(validateStayExtensionInput({}).isValid, false);

	// Validate Checkout Input
	assert.equal(validateStayCheckoutInput({ stayId: "stay_1" }).isValid, true);
	assert.equal(validateStayCheckoutInput({}).isValid, false);

	// Validate Re-Register Input
	assert.equal(validateStayReRegisterInput({ stayId: "stay_1" }).isValid, true);
	assert.equal(validateStayReRegisterInput({}).isValid, false);
	console.log("✅ 3. Centralized API Input Validation tests passed!");

	// 4. Kiểm tra Append-only Audit Logs Policy
	CONFIG.setEnv("prod");
	const mockEvent = {
		url: new URL("https://example.com/api/stays/audit?clear=true"),
		platform: undefined,
	} as unknown as RequestEvent;

	const prodDeleteRes = await auditDeleteHandler(mockEvent);
	assert.equal(
		prodDeleteRes.status,
		403,
		"Trên PROD không được phép xóa Audit Logs (Append-only policy)",
	);
	CONFIG.setEnv("dev");
	console.log("✅ 4. Append-only Audit Logs Policy passed!");

	console.log("\n🎉 TẤT CẢ TEST DATA INTEGRITY GIAI ĐOẠN 2 ĐÃ VƯỢT QUA!");
}

runDataIntegrityTests().catch((err) => {
	console.error("❌ Test Data Integrity thất bại:", err);
	process.exit(1);
});
