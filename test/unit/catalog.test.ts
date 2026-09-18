import assert from "node:assert/strict";
import { catalogManager } from "../../src/lib/server/catalogManager.js";

async function runCatalogUnitTests(): Promise<void> {
	console.log("🧪 [Unit] Chạy kiểm thử CatalogManager...");

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

	console.log("✅ [Unit] CatalogManager tests passed!");
}

runCatalogUnitTests().catch((err) => {
	console.error("❌ [Unit] CatalogManager test failed:", err);
	process.exit(1);
});
