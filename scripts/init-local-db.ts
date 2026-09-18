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

		// 2. Tự động đồng bộ snapshot từ Remote Cloudflare về Local SQLite nếu local chưa có dữ liệu
		const countArgs = isDirectBin
			? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "SELECT COUNT(*) as count FROM stays;", "--json"]
			: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "SELECT COUNT(*) as count FROM stays;", "--json"];

		const stdout = cp.execFileSync(execCmd, countArgs, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "ignore"],
		});
		const parsed = JSON.parse(stdout);
		const count = parsed?.[0]?.results?.[0]?.count || 0;

		if (count === 0) {
			console.log("📥 Local SQLite chưa có dữ liệu. Đang kéo dữ liệu snapshot từ Remote Cloudflare D1 về Local...");
			try {
				const remoteArgs = isDirectBin
					? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--remote", "--command", "SELECT * FROM guests; SELECT * FROM stays;", "--json"]
					: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--remote", "--command", "SELECT * FROM guests; SELECT * FROM stays;", "--json"];
				const remoteStdout = cp.execFileSync(execCmd, remoteArgs, {
					encoding: "utf8",
					stdio: ["pipe", "pipe", "ignore"],
					timeout: 15000,
				});
				const remoteParsed = JSON.parse(remoteStdout);
				const remoteGuests = (remoteParsed?.[0]?.results || []) as Array<Record<string, unknown>>;
				const remoteStays = (remoteParsed?.[1]?.results || []) as Array<Record<string, unknown>>;

				if (remoteGuests.length > 0 || remoteStays.length > 0) {
					console.log(`📦 Tìm thấy ${remoteGuests.length} khách và ${remoteStays.length} lượt lưu trú từ remote. Đang nạp vào Local SQLite...`);
					const sqlStatements: string[] = [];

					for (const g of remoteGuests) {
						const keys = Object.keys(g);
						const cols = keys.join(", ");
						const vals = keys.map((k) => {
							const val = g[k];
							if (val === null || val === undefined) return "NULL";
							if (typeof val === "number") return val;
							return `'${String(val).replace(/'/g, "''")}'`;
						}).join(", ");
						sqlStatements.push(`INSERT OR REPLACE INTO guests (${cols}) VALUES (${vals});`);
					}

					for (const s of remoteStays) {
						const keys = Object.keys(s);
						const cols = keys.join(", ");
						const vals = keys.map((k) => {
							const val = s[k];
							if (val === null || val === undefined) return "NULL";
							if (typeof val === "number") return val;
							return `'${String(val).replace(/'/g, "''")}'`;
						}).join(", ");
						sqlStatements.push(`INSERT OR REPLACE INTO stays (${cols}) VALUES (${vals});`);
					}

					if (sqlStatements.length > 0) {
						const tempSqlFile = path.resolve(process.cwd(), ".wrangler/state/v3/d1/seed_temp.sql");
						fs.mkdirSync(path.dirname(tempSqlFile), { recursive: true });
						fs.writeFileSync(tempSqlFile, sqlStatements.join("\n"), "utf8");

						const insertArgs = isDirectBin
							? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", `--file=${tempSqlFile}`]
							: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", `--file=${tempSqlFile}`];
						cp.execFileSync(execCmd, insertArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });

						try { fs.unlinkSync(tempSqlFile); } catch {}
						console.log(`✅ Đồng bộ thành công ${remoteGuests.length} guests và ${remoteStays.length} stays vào Local SQLite!`);
					}
				}
			} catch (syncErr: unknown) {
				console.log("ℹ️ Không thể clone data từ Remote D1 (hoặc bị rate limit). Sử dụng local SQLite database trống.");
			}
		}
	} catch (err: unknown) {
		console.warn("⚠️ Cảnh báo khởi tạo local sqlite:", err instanceof Error ? err.message : String(err));
	}
}

main();
