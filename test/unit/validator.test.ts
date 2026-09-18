import assert from "node:assert/strict";
import {
	assertValidTransition,
	isValidCccd,
	isValidPassport,
	isValidStayStatusTransition,
	validateStayCheckoutInput,
	validateStayExtensionInput,
	validateStayRegistrationInput,
	validateStayReRegisterInput,
} from "../../src/lib/server/validator.js";

async function runValidatorUnitTests(): Promise<void> {
	console.log("🧪 [Unit] Chạy kiểm thử Validator & State Machine...");

	// CCCD & Passport
	assert.equal(isValidCccd("001092000001"), true);
	assert.equal(isValidCccd("123"), false);
	assert.equal(isValidPassport("C1234567"), true);
	assert.equal(isValidPassport(""), false);

	// State machine transitions
	assert.equal(
		isValidStayStatusTransition("READY_TO_SYNC", "SYNCED_KBTT"),
		true,
	);
	assert.equal(isValidStayStatusTransition("READY_TO_SYNC", "EXTENDED"), true);
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

	// Invalid transitions
	assert.equal(isValidStayStatusTransition("CHECKED_OUT", "EXTENDED"), false);
	assert.equal(isValidStayStatusTransition("CANCELLED", "EXTENDED"), false);
	assert.equal(
		isValidStayStatusTransition("CHECKED_OUT", "SYNCED_KBTT"),
		false,
	);

	assert.throws(
		() => assertValidTransition("CHECKED_OUT", "EXTENDED"),
		/Chuyển đổi trạng thái không hợp lệ/,
	);

	// Input validators
	const validReg = validateStayRegistrationInput({
		ho_ten: "NGUYỄN VĂN A",
		so_giay_to: "001092000001",
		so_phong: "101",
		ngay_den: "2026-09-17",
		ngay_di_du_kien: "2026-09-19",
	});
	assert.equal(validReg.isValid, true);

	assert.equal(validateStayRegistrationInput({}).isValid, false);
	assert.equal(
		validateStayExtensionInput({ stayId: "stay_1", newNgayDi: "2026-09-25" })
			.isValid,
		true,
	);
	assert.equal(validateStayExtensionInput({}).isValid, false);
	assert.equal(validateStayCheckoutInput({ stayId: "stay_1" }).isValid, true);
	assert.equal(validateStayCheckoutInput({}).isValid, false);
	assert.equal(validateStayReRegisterInput({ stayId: "stay_1" }).isValid, true);
	assert.equal(validateStayReRegisterInput({}).isValid, false);

	console.log("✅ [Unit] Validator & State Machine tests passed!");
}

runValidatorUnitTests().catch((err) => {
	console.error("❌ [Unit] Validator test failed:", err);
	process.exit(1);
});
