import assert from "node:assert/strict";
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
} from "../../src/lib/server/time.js";

async function runTimeUnitTests(): Promise<void> {
	console.log("🧪 [Unit] Chạy kiểm thử GMT+7 Time Service...");

	const nowDateStr = getNowGmt7DateString();
	const nowDateTimeStr = getNowGmt7DateTimeString();
	assert.equal(isValidIsoDate(nowDateStr), true);
	assert.equal(isValidIsoDateTime(nowDateTimeStr), true);

	// Date string parsing
	assert.equal(parseToGmt7DateString("15/08/1990"), "1990-08-15");
	assert.equal(parseToGmt7DateString("15-08-1990"), "1990-08-15");
	assert.equal(parseToGmt7DateString("1990-08-15"), "1990-08-15");
	assert.equal(parseToGmt7DateString("17-09-26"), "2026-09-17");

	// DateTime string parsing
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

	// Boundary checks
	assert.equal(isSameOrPastCheckoutTimeGmt7("2020-01-01"), true);
	assert.equal(isSameOrPastCheckoutTimeGmt7("2099-01-01"), false);

	console.log("✅ [Unit] GMT+7 Time Service tests passed!");
}

runTimeUnitTests().catch((err) => {
	console.error("❌ [Unit] Time test failed:", err);
	process.exit(1);
});
