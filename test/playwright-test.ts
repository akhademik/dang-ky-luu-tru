import { chromium } from "@playwright/test";

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
		await page.waitForTimeout(2000);

		// Wait for initial auth check to finish
		await page.waitForFunction(() => !document.querySelector(".animate-spin"));
		await page.waitForTimeout(500);

		// Check if password barrier is active
		const passInput = await page.$("#app_password");
		if (passInput) {
			console.log("🔒 Password barrier detected. Entering password...");
			await page.fill("#app_password", "@@Abc123");
			await page.click('button[type="submit"]');
			await page.waitForSelector("#app_password", {
				state: "detached",
				timeout: 10000,
			});
			console.log("🔓 Unlocked session successfully.");
			await page.waitForTimeout(1000);
		} else {
			console.log("ℹ️ No password barrier or already authenticated.");
		}

		// Check if table has guests
		const guestRows = await page.$$("table tbody tr");
		console.log(`📊 Found ${guestRows.length} rows in the initial table.`);

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
	} finally {
		await browser.close();
	}
}

runE2ETest();
