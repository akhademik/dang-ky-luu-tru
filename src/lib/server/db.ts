import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { D1DatabaseLike, D1PreparedStatement } from "../types/index.js";

export {
	clearAuditLogs,
	deleteAuditLog,
	getAuditLogs,
	logKbttAction,
} from "./repositories/auditRepository.js";

export {
	updateGuest,
	upsertGuest,
} from "./repositories/guestRepository.js";

export { getDashboardStats } from "./repositories/statsRepository.js";

export {
	checkoutStay,
	deleteStay,
	extendStay,
	getLatestVisaByGuestId,
	getStayById,
	getStays,
	updateStay,
	upsertStay,
} from "./repositories/stayRepository.js";

export type { D1DatabaseLike };

class RemoteD1Database implements D1DatabaseLike {
	private dbName = "dang-ky-luu-tru-db";

	private escapeSql(query: string, params: unknown[] = []): string {
		let pIndex = 0;
		return query.replace(/\?/g, () => {
			if (pIndex >= params.length) return "NULL";
			const val = params[pIndex++];
			if (val === null || val === undefined) return "NULL";
			if (typeof val === "number") return String(val);
			if (typeof val === "boolean") return val ? "1" : "0";
			const str = String(val).replace(/'/g, "''");
			return `'${str}'`;
		});
	}

	public executeQuery<T = unknown>(
		query: string,
		params: unknown[] = [],
	): {
		results: T[];
		success: boolean;
		meta: { changes: number; last_row_id: number };
	} {
		const formattedSql = this.escapeSql(query, params);
		const wranglerBin = path.resolve(
			process.cwd(),
			"node_modules/wrangler/bin/wrangler.js",
		);
		const isDirectBin = fs.existsSync(wranglerBin);
		const execCmd = isDirectBin ? process.execPath : "pnpm";
		// Default to --local when developing locally to prevent Cloudflare rate limits and quota burnout
		const isRemote =
			process.env.D1_USE_REMOTE === "true" || process.env.D1_REMOTE === "true";
		const locationFlag = isRemote ? "--remote" : "--local";

		const execArgs = isDirectBin
			? [
					wranglerBin,
					"d1",
					"execute",
					this.dbName,
					locationFlag,
					"--command",
					formattedSql,
					"--json",
				]
			: [
					"wrangler",
					"d1",
					"execute",
					this.dbName,
					locationFlag,
					"--command",
					formattedSql,
					"--json",
				];

		let lastError: unknown = null;
		const maxRetries = 3;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const stdout = cp.execFileSync(execCmd, execArgs, {
					encoding: "utf8",
					stdio: ["pipe", "pipe", "ignore"],
					timeout: 25000,
				});

				const parsed = JSON.parse(stdout);
				if (
					parsed &&
					typeof parsed === "object" &&
					!Array.isArray(parsed) &&
					"error" in parsed &&
					parsed.error
				) {
					const errText =
						typeof parsed.error === "object" &&
						parsed.error !== null &&
						"text" in parsed.error
							? String(parsed.error.text)
							: JSON.stringify(parsed.error);
					throw new Error(errText);
				}
				const firstResult = Array.isArray(parsed) ? parsed[0] || {} : parsed;
				return {
					results: (firstResult.results || []) as T[],
					success: Boolean(firstResult.success !== false),
					meta: {
						changes: Number(firstResult.meta?.changes || 0),
						last_row_id: Number(firstResult.meta?.last_row_id || 0),
					},
				};
			} catch (err: unknown) {
				lastError = err;
				if (attempt < maxRetries) {
					const sleepUntil = Date.now() + attempt * 300;
					while (Date.now() < sleepUntil) {
						// brief sync backoff
					}
				}
			}
		}

		console.error(
			"Cloudflare D1 Remote query failed after retries:",
			lastError,
		);
		throw lastError;
	}

	public prepare(query: string): D1PreparedStatement {
		let boundParams: unknown[] = [];
		const self = this;
		return {
			bind(...params: unknown[]) {
				boundParams = params;
				return this;
			},
			async all<T = unknown>() {
				const res = self.executeQuery<T>(query, boundParams);
				return { results: res.results, success: res.success };
			},
			async first<T = unknown>(colName?: string) {
				const res = self.executeQuery<Record<string, unknown>>(
					query,
					boundParams,
				);
				const row = res.results[0];
				if (!row) return null;
				if (colName && typeof row === "object") {
					return (row[colName] ?? null) as T;
				}
				return row as T;
			},
			async run() {
				const res = self.executeQuery(query, boundParams);
				return { success: res.success, meta: res.meta };
			},
		};
	}

	public async exec(query: string) {
		const res = this.executeQuery(query);
		return { success: res.success };
	}
}

let remoteD1Instance: D1DatabaseLike | null = null;

export function getDb(platform?: {
	env?: { DB?: D1DatabaseLike };
}): D1DatabaseLike {
	if (platform?.env?.DB && !import.meta.env.DEV) {
		return platform.env.DB;
	}
	if (!remoteD1Instance) {
		remoteD1Instance = new RemoteD1Database();
	}
	return remoteD1Instance;
}
