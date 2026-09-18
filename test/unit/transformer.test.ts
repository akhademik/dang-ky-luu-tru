import assert from "node:assert/strict";
import { DataTransformer } from "../../src/lib/server/dataTransformer.js";

async function runTransformerUnitTests(): Promise<void> {
	console.log("🧪 [Unit] Chạy kiểm thử DataTransformer...");

	assert.equal(DataTransformer.formatDateOnly("15/08/1990"), "1990-08-15");
	assert.equal(DataTransformer.formatDateOnly("1990-08-15"), "1990-08-15");
	assert.equal(DataTransformer.mapGender("Nam"), "M");
	assert.equal(DataTransformer.mapGender("Nữ"), "F");
	assert.equal(DataTransformer.mapGender(""), "M"); // Default
	assert.equal(
		DataTransformer.cleanDocNumber(" 001-090.012 345 "),
		"001090012345",
	);
	assert.equal(DataTransformer.cleanRoomNumber("P.06"), "6");
	assert.equal(DataTransformer.cleanRoomNumber("P.07"), "7");
	assert.equal(DataTransformer.cleanRoomNumber("Phòng 3"), "3");

	console.log("✅ [Unit] DataTransformer tests passed!");
}

runTransformerUnitTests().catch((err) => {
	console.error("❌ [Unit] DataTransformer test failed:", err);
	process.exit(1);
});
