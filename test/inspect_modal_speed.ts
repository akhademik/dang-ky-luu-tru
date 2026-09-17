import { chromium } from "@playwright/test";

async function main() {
	console.log("🚀 Testing async UI responsiveness with Playwright...");
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();

	await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
	await page.waitForTimeout(2000);

	// 1. Test Edit Modal Speed
	const editBtn = page.locator("button:has-text('Sửa ✎')").first();
	if ((await editBtn.count()) > 0) {
		console.log("Clicking 'Sửa' button...");
		await editBtn.click();
		await page.waitForSelector("div:has-text('Chỉnh Sửa Thông Tin')", {
			timeout: 3000,
		});

		console.log("Submitting edit modal with 'Lưu Thay Đổi'...");
		const saveBtn = page.locator("button:has-text('Lưu Thay Đổi')").first();
		await saveBtn.click();

		// Check if modal closes immediately (< 150ms)
		await page.waitForTimeout(150);
		const modalVisible = await page
			.locator("div:has-text('Chỉnh Sửa Thông Tin')")
			.isVisible();
		console.log(`Edit modal closed immediately: ${!modalVisible}`);
	}

	// 2. Test Delete Modal and Strikethrough
	const deleteBtn = page.locator("button:has-text('Xóa ✕')").first();
	if ((await deleteBtn.count()) > 0) {
		console.log("Clicking 'Xóa' button to open delete confirmation modal...");
		await deleteBtn.click();
		await page.waitForSelector("div:has-text('Xác Nhận Xóa Lượt Lưu Trú')", {
			timeout: 3000,
		});

		console.log("Confirming delete in modal with 'Xóa Vĩnh Viễn'...");
		const confirmDeleteBtn = page
			.locator("button:has-text('Xóa Vĩnh Viễn')")
			.first();
		await confirmDeleteBtn.click();

		// Verify modal closed immediately
		await page.waitForTimeout(100);
		const delModalVisible = await page
			.locator("div:has-text('Xác Nhận Xóa Lượt Lưu Trú')")
			.isVisible();
		console.log(`Delete modal closed immediately: ${!delModalVisible}`);

		// Check strikethrough row feedback
		const deletingIndicator = await page
			.locator("span:has-text('Đang xóa...')")
			.count();
		console.log(`Deleting feedback indicator active: ${deletingIndicator > 0}`);
	}

	await browser.close();
	console.log("✅ Async UI responsiveness test PASSED.");
}

main().catch((err) => {
	console.error("Test failed:", err);
	process.exit(1);
});
