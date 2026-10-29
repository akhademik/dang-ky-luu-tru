import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";

async function main() {
	console.log("🔄 Đang khởi tạo và đồng bộ schema cho Local SQLite D1...");
	const wranglerBin = path.resolve(process.cwd(), "node_modules/wrangler/bin/wrangler.js");
	const isDirectBin = fs.existsSync(wranglerBin);
	const execCmd = isDirectBin ? process.execPath : "pnpm";

	try {
		// 1. Đảm bảo migration cho các cột mới nếu SQLite local file đã tồn tại từ trước
		try {
			// 1.1 Kiểm tra bảng stays
			const checkColArgs = isDirectBin
				? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "PRAGMA table_info(stays);", "--json"]
				: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "PRAGMA table_info(stays);", "--json"];
			const colStdout = cp.execFileSync(execCmd, checkColArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
			const colParsed = JSON.parse(colStdout);
			const cols: Array<{ name: string }> = colParsed?.[0]?.results || [];
			if (cols.length > 0) {
				const hasThoiHanThiThuc = cols.some((c) => c.name === "thoi_han_thi_thuc");
				if (!hasThoiHanThiThuc) {
					const alterArgs = isDirectBin
						? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "ALTER TABLE stays ADD COLUMN thoi_han_thi_thuc TEXT;"]
						: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "ALTER TABLE stays ADD COLUMN thoi_han_thi_thuc TEXT;"];
					cp.execFileSync(execCmd, alterArgs, { encoding: "utf8", stdio: "inherit" });
				}
			}

			// 1.2 Kiểm tra bảng kbtt_logs
			const checkLogColsArgs = isDirectBin
				? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "PRAGMA table_info(kbtt_logs);", "--json"]
				: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", "PRAGMA table_info(kbtt_logs);", "--json"];
			const logColsStdout = cp.execFileSync(execCmd, checkLogColsArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
			const logColsParsed = JSON.parse(logColsStdout);
			const logCols: Array<{ name: string }> = logColsParsed?.[0]?.results || [];
			if (logCols.length > 0) {
				const existingColNames = new Set(logCols.map((c) => c.name));
				const newCols = [
					{ name: "error_class", type: "TEXT" },
					{ name: "outcome_unknown", type: "INTEGER DEFAULT 0" },
					{ name: "duration_ms", type: "INTEGER" },
					{ name: "ttfb_ms", type: "INTEGER" },
					{ name: "cf_ray", type: "TEXT" },
					{ name: "server_header", type: "TEXT" },
					{ name: "request_id", type: "TEXT" },
					{ name: "env", type: "TEXT" },
					{ name: "host", type: "TEXT" },
				];

				for (const col of newCols) {
					if (!existingColNames.has(col.name)) {
						const alterLogArgs = isDirectBin
							? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", `ALTER TABLE kbtt_logs ADD COLUMN ${col.name} ${col.type};`]
							: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", `ALTER TABLE kbtt_logs ADD COLUMN ${col.name} ${col.type};`];
						cp.execFileSync(execCmd, alterLogArgs, { encoding: "utf8", stdio: "inherit" });
					}
				}
			}
		} catch {}

		// 2. Áp dụng schema.sql vào Local D1 (tạo bảng biểu mới nếu chưa có, và cập nhật toàn bộ index)
		const applySchemaArgs = isDirectBin
			? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--file=schema.sql"]
			: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--file=schema.sql"];

		cp.execFileSync(execCmd, applySchemaArgs, {
			encoding: "utf8",
			stdio: "inherit",
		});

		console.log("✅ Local SQLite database đã sẵn sàng với đầy đủ bảng biểu và indexes!");

		// 2. Tự động lấy toàn bộ database từ Cloudflare D1 Remote và thay thế hoàn toàn database Local
		console.log("📥 Đang kéo toàn bộ snapshot từ Cloudflare D1 Remote để thay thế Local SQLite...");
		try {
			const remoteArgs = isDirectBin
				? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--remote", "--command", "SELECT * FROM guests; SELECT * FROM stays; SELECT * FROM kbtt_logs;", "--json"]
				: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--remote", "--command", "SELECT * FROM guests; SELECT * FROM stays; SELECT * FROM kbtt_logs;", "--json"];
			const remoteStdout = cp.execFileSync(execCmd, remoteArgs, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
				timeout: 30000,
			});
			const remoteParsed = JSON.parse(remoteStdout);
			const remoteGuests = (remoteParsed?.[0]?.results || []) as Array<Record<string, unknown>>;
			const remoteStays = (remoteParsed?.[1]?.results || []) as Array<Record<string, unknown>>;
			const remoteLogs = (remoteParsed?.[2]?.results || []) as Array<Record<string, unknown>>;

			console.log(`📦 Tìm thấy từ Remote: ${remoteGuests.length} guests, ${remoteStays.length} stays, ${remoteLogs.length} logs.`);

			const getLocalColumns = (tableName: string): Set<string> => {
				const checkColArgs = isDirectBin
					? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", `PRAGMA table_info(${tableName});`, "--json"]
					: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", "--command", `PRAGMA table_info(${tableName});`, "--json"];
				const colStdout = cp.execFileSync(execCmd, checkColArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
				const colParsed = JSON.parse(colStdout);
				const cols: Array<{ name: string }> = colParsed?.[0]?.results || [];
				return new Set(cols.map((c) => c.name));
			};

			const formatInserts = (tableName: string, rows: Array<Record<string, unknown>>): string[] => {
				const localCols = getLocalColumns(tableName);
				const statements: string[] = [];
				for (const row of rows) {
					const validKeys = Object.keys(row).filter((k) => localCols.has(k));
					if (validKeys.length === 0) continue;
					const cols = validKeys.join(", ");
					const vals = validKeys.map((k) => {
						const val = row[k];
						if (val === null || val === undefined) return "NULL";
						if (typeof val === "number") return val;
						return `'${String(val).replace(/'/g, "''")}'`;
					}).join(", ");
					statements.push(`INSERT OR REPLACE INTO ${tableName} (${cols}) VALUES (${vals});`);
				}
				return statements;
			};

			const sqlStatements: string[] = [
				"PRAGMA foreign_keys = OFF;",
				"DELETE FROM kbtt_logs;",
				"DELETE FROM stays;",
				"DELETE FROM guests;",
				...formatInserts("guests", remoteGuests),
				...formatInserts("stays", remoteStays),
				...formatInserts("kbtt_logs", remoteLogs),
				"PRAGMA foreign_keys = ON;",
			];

			const tempSqlFile = path.resolve(process.cwd(), ".wrangler/state/v3/d1/seed_temp.sql");
			fs.mkdirSync(path.dirname(tempSqlFile), { recursive: true });
			fs.writeFileSync(tempSqlFile, sqlStatements.join("\n"), "utf8");

			const insertArgs = isDirectBin
				? [wranglerBin, "d1", "execute", "dang-ky-luu-tru-db", "--local", `--file=${tempSqlFile}`]
				: ["wrangler", "d1", "execute", "dang-ky-luu-tru-db", "--local", `--file=${tempSqlFile}`];
			cp.execFileSync(execCmd, insertArgs, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });

			try { fs.unlinkSync(tempSqlFile); } catch {}
			console.log(`✅ Đã thay thế toàn bộ Local SQLite bằng dữ liệu Cloudflare D1 Remote (${remoteGuests.length} guests, ${remoteStays.length} stays, ${remoteLogs.length} logs)!`);
		} catch (syncErr: unknown) {
			const errMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
			console.warn("⚠️ Không thể tải snapshot từ Remote D1 (có thể do offline hoặc lỗi xác thực):", errMsg);
			console.log("ℹ️ Giữ nguyên dữ liệu hiện tại trong Local SQLite.");
		}
	} catch (err: unknown) {
		console.warn("⚠️ Cảnh báo khởi tạo local sqlite:", err instanceof Error ? err.message : String(err));
	}
}

main();
