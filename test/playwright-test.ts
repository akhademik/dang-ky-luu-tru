import { chromium } from "@playwright/test";
import { CONFIG } from "../src/lib/server/config.js";

async function runE2ETest() {
	console.log(
		"🚀 Starting Playwright browser test on http://localhost:5173 ...",
	);
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const page = await context.newPage();

	const consoleLogs: string[] = [];
	page.on("console", (msg) => {
		console.log(`[Browser Console ${msg.type().toUpperCase()}] ${msg.text()}`);
		consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
	});

	page.on("pageerror", (err) => {
		console.error(`[Browser Page Error] ${err.message}`);
	});

	try {
		await page.goto("http://localhost:5173", {
			waitUntil: "domcontentloaded",
		});
		console.log("✅ Page loaded successfully. Title:", await page.title());
		await page.waitForTimeout(3000);

		// Check if login screen is active
		const passInput = await page.$("#app_password");
		if (passInput) {
			console.log("🔒 Login screen detected. Entering credentials...");
			const envPass = CONFIG.APP_PASSWORD || process.env.APP_PASSWORD || "";
			await page.fill("#app_username", "root");
			await page.fill("#app_password", envPass);
			await page.waitForTimeout(500);
			await page.click('button[type="submit"]');
			await page.waitForFunction(
				() => !document.querySelector("#app_password"),
				{ timeout: 15000 },
			);
			console.log("🔓 Logged in successfully.");
			await page.waitForTimeout(1000);
		} else {
			console.log("ℹ️ Already authenticated.");
		}

		// Check if table has guests in initial tab (Khai Báo Lưu Trú Mới)
		const initialRows = await page.$$("table tbody tr");
		console.log(`📊 Tab [Khai Báo Lưu Trú Mới]: Found ${initialRows.length} rows.`);

		// Click "Khách Đang Ở" tab
		const inhouseTab = await page.getByText("Khách Đang Ở");
		if (await inhouseTab.isVisible()) {
			await inhouseTab.click();
			await page.waitForTimeout(500);
			const inhouseRows = await page.$$("table tbody tr");
			console.log(`📊 Tab [Khách Đang Ở]: Found ${inhouseRows.length} rows.`);
		}

		// Click "Danh sách guests" tab
		const allGuestsTab = await page.getByText("Danh sách guests");
		if (await allGuestsTab.isVisible()) {
			await allGuestsTab.click();
			console.log("✅ Clicked on Danh sách guests tab.");
			await page.waitForTimeout(1000);
			const guestCards = await page.$$("div.space-y-3 > div.border");
			console.log(`📊 Tab [Danh sách guests]: Found ${guestCards.length} guest cards.`);

			// Check if interactive status badge exists and click it
			const statusBadge = await page.$("button[title*='ghi đè']");
			if (statusBadge) {
				await statusBadge.click();
				console.log(
					"✅ Clicked on interactive status badge, opening Status Override Modal.",
				);
				await page.waitForSelector("#status-selector-grid", { timeout: 5000 });
				// Click close or cancel
				await page.getByRole("button", { name: "Hủy Bỏ" }).click();
				console.log("✅ Closed Status Override Modal.");
				await page.waitForTimeout(500);
			}
		}

		// Click "Dev Logs" tab
		const devLogsTab = await page.getByText("Dev Logs");
		if (await devLogsTab.isVisible()) {
			await devLogsTab.click();
			console.log("✅ Clicked on Dev Logs tab.");
			await page.waitForTimeout(1000);
		}

		console.log("🎉 Playwright test completed without unhandled errors.");
	} catch (err: unknown) {
		console.error("❌ Playwright test failed:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

runE2ETest();
