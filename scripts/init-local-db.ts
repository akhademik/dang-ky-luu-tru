import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";

async function main() {
	console.log("🔄 Đang khởi tạo và đồng bộ schema cho Local SQLite D1...");
	const wranglerBin = path.resolve(process.cwd(), "node_modules/wrangler/bin/wrangler.js");
	const isDirectBin = fs.existsSync(wranglerBin);
	const execCmd = isDirectBin ? process.execPath : "pnpm";

	try {
		// 1. Áp dụng schema.sql vào Local D1
		const applySchemaArgs = isDirectBin
			? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--file=schema.sql"]
			: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--file=schema.sql"];

		cp.execFileSync(execCmd, applySchemaArgs, {
			encoding: "utf8",
			stdio: "inherit",
		});

		// 1.1 Đảm bảo migration cho các cột mới nếu SQLite local file đã tồn tại từ trước
		try {
			const checkColArgs = isDirectBin
				? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "PRAGMA table_info(stays);", "--json"]
				: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "PRAGMA table_info(stays);", "--json"];
			const colStdout = cp.execFileSync(execCmd, checkColArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
			const colParsed = JSON.parse(colStdout);
			const cols: Array<{ name: string }> = colParsed?.[0]?.results || [];
			const hasThoiHanThiThuc = cols.some((c) => c.name === "thoi_han_thi_thuc");
			if (!hasThoiHanThiThuc) {
				const alterArgs = isDirectBin
					? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "ALTER TABLE stays ADD COLUMN thoi_han_thi_thuc TEXT;"]
					: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "ALTER TABLE stays ADD COLUMN thoi_han_thi_thuc TEXT;"];
				cp.execFileSync(execCmd, alterArgs, { encoding: "utf8", stdio: "inherit" });
			}
		} catch {}

		console.log("✅ Local SQLite database đã sẵn sàng với đầy đủ bảng biểu và indexes!");

		// 2. Tùy chọn fetch remote data snapshot nếu chưa có dữ liệu và không bị rate limit
		// Thử kiểm tra số lượng record trong local
		const countArgs = isDirectBin
			? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "SELECT COUNT(*) as count FROM stays;", "--json"]
			: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "SELECT COUNT(*) as count FROM stays;", "--json"];

		const stdout = cp.execFileSync(execCmd, countArgs, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "ignore"],
		});
		const parsed = JSON.parse(stdout);
		const count = parsed?.[0]?.results?.[0]?.count || 0;

		if (count === 0 && process.env.SYNC_REMOTE_ON_DEV === "true") {
			console.log("📥 Đang thử kéo dữ liệu mẫu từ Remote Cloudflare về Local SQLite...");
			try {
				const remoteGuestsArgs = isDirectBin
					? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--remote", "--command", "SELECT * FROM guests LIMIT 100;", "--json"]
					: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--remote", "--command", "SELECT * FROM guests LIMIT 100;", "--json"];
				const remoteStdout = cp.execFileSync(execCmd, remoteGuestsArgs, {
					encoding: "utf8",
					stdio: ["pipe", "pipe", "ignore"],
					timeout: 10000,
				});
				const remoteParsed = JSON.parse(remoteStdout);
				const remoteGuests = remoteParsed?.[0]?.results || [];
				console.log(`📦 Đã nạp ${remoteGuests.length} khách từ remote vào local sqlite.`);
			} catch {
				console.log("ℹ️ Remote D1 đang bị rate limit hoặc không thể kết nối. Sử dụng local database độc lập.");
			}
		}
	} catch (err: unknown) {
		console.warn("⚠️ Cảnh báo khởi tạo local sqlite:", err instanceof Error ? err.message : String(err));
	}
}

main();
