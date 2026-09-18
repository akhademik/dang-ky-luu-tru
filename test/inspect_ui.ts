import { chromium } from "@playwright/test";

async function main() {
	console.log("🚀 Launching Playwright browser...");
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const page = await context.newPage();

	console.log("🌐 Navigating to http://localhost:5173 ...");
	await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
	await page.waitForTimeout(4000);

	console.log("📸 Tab 1 Screenshot...");
	await page.screenshot({ path: "tab1_register.png", fullPage: true });

	console.log("🖱️ Clicking 'Danh sách guests' tab...");
	await page.locator("button:has-text('Danh sách guests')").first().click();
	await page.waitForTimeout(4000);

	console.log("📸 Tab 'Danh sách guests' Screenshot...");
	await page.screenshot({ path: "tab_all_guests.png", fullPage: true });

	const allGuestsText = await page.locator("main").innerText();
	console.log(`📄 All Guests Tab content text:\n${allGuestsText}`);

	await browser.close();
	console.log("✅ Inspection finished.");
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
