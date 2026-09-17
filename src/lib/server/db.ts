import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface Guest {
	id: string;
	loai_giay_to: string;
	so_giay_to: string;
	ho_ten: string;
	ngay_sinh?: string;
	gioi_tinh?: string;
	quoc_tich: string;
	dia_chi_chi_tiet?: string;
	phuong_xa?: string;
	quan_huyen?: string;
	tinh_thanh?: string;
	created_at?: string;
	updated_at?: string;
}

export type StayStatus =
	| "PENDING_VALIDATION"
	| "READY_TO_SYNC"
	| "NOT_CHECKED_IN"
	| "SYNCED_KBTT"
	| "CHECKED_IN"
	| "EXTENDED"
	| "CHECKED_OUT"
	| "ERROR"
	| "CANCELLED";

export interface Stay {
	id: string;
	guest_id: string;
	so_phong: string;
	ngay_den: string;
	ngay_di_du_kien?: string;
	ngay_di_thuc_te?: string;
	thoi_han_thi_thuc?: string;
	ly_do_luu_tru?: number;
	status: StayStatus;
	ma_ho_so_kbtt?: string;
	ghi_chu?: string;
	source_sheet_tab?: string;
	source_sheet_row?: number;
	created_at?: string;
	updated_at?: string;
}

export interface StayDetail extends Stay {
	loai_giay_to: string;
	so_giay_to: string;
	ho_ten: string;
	ngay_sinh?: string;
	gioi_tinh?: string;
	quoc_tich: string;
	dia_chi_chi_tiet?: string;
	phuong_xa?: string;
	quan_huyen?: string;
	tinh_thanh?: string;
	thoi_han_thi_thuc?: string;
}

export interface KbttLog {
	id: string;
	stay_id?: string;
	api_endpoint: string;
	guest_name?: string;
	so_giay_to?: string;
	so_phong?: string;
	request_payload?: string;
	response_payload?: string;
	http_status?: number;
	code?: string;
	is_success: number;
	error_message?: string;
	created_at?: string;
}

export interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatement;
	exec(query: string): Promise<unknown>;
}

export interface D1PreparedStatement {
	bind(...params: unknown[]): D1PreparedStatement;
	all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run(): Promise<{
		success: boolean;
		meta: { changes: number; last_row_id?: number };
	}>;
}

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
		const execArgs = isDirectBin
			? [
					wranglerBin,
					"d1",
					"execute",
					this.dbName,
					"--remote",
					"--command",
					formattedSql,
					"--json",
				]
			: [
					"wrangler",
					"d1",
					"execute",
					this.dbName,
					"--remote",
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
						typeof parsed.error === "object" && parsed.error !== null && "text" in parsed.error
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

		console.error("Cloudflare D1 Remote query failed after retries:", lastError);
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

export function generateId(): string {
	return typeof globalThis.crypto !== "undefined" &&
		typeof globalThis.crypto.randomUUID === "function"
		? globalThis.crypto.randomUUID()
		: Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15);
}

export async function upsertGuest(
	db: D1DatabaseLike,
	guest: Omit<Guest, "id" | "created_at" | "updated_at">,
): Promise<Guest> {
	const soGiayTo = String(guest.so_giay_to || "").trim();
	const quocTich = String(guest.quoc_tich || "VNM")
		.trim()
		.toUpperCase();

	// Check if guest exists by matching so_giay_to (primary identifier)
	const existing = await db
		.prepare(
			"SELECT * FROM guests WHERE UPPER(TRIM(so_giay_to)) = UPPER(TRIM(?)) LIMIT 1",
		)
		.bind(soGiayTo)
		.first<Guest>();

	if (existing) {
		await db
			.prepare(`
				UPDATE guests
				SET ho_ten = ?, loai_giay_to = ?, ngay_sinh = ?, gioi_tinh = ?,
				    quoc_tich = ?, dia_chi_chi_tiet = ?, phuong_xa = ?, quan_huyen = ?, tinh_thanh = ?,
				    updated_at = datetime('now', '+7 hours')
				WHERE id = ?
			`)
			.bind(
				guest.ho_ten.toUpperCase().trim(),
				guest.loai_giay_to || existing.loai_giay_to,
				guest.ngay_sinh || existing.ngay_sinh || "",
				guest.gioi_tinh || existing.gioi_tinh || "",
				quocTich || existing.quoc_tich,
				guest.dia_chi_chi_tiet ?? existing.dia_chi_chi_tiet,
				guest.phuong_xa ?? existing.phuong_xa,
				guest.quan_huyen ?? existing.quan_huyen,
				guest.tinh_thanh ?? existing.tinh_thanh,
				existing.id,
			)
			.run();

		return {
			...existing,
			...guest,
			id: existing.id,
			so_giay_to: soGiayTo,
			quoc_tich: quocTich || existing.quoc_tich,
			ho_ten: guest.ho_ten.toUpperCase().trim(),
		};
	}

	const id = generateId();
	await db
		.prepare(`
			INSERT INTO guests (
				id, loai_giay_to, so_giay_to, ho_ten, ngay_sinh, gioi_tinh,
				quoc_tich, dia_chi_chi_tiet, phuong_xa, quan_huyen, tinh_thanh
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`)
		.bind(
			id,
			guest.loai_giay_to || "CCCD",
			soGiayTo,
			guest.ho_ten.toUpperCase().trim(),
			guest.ngay_sinh || "",
			guest.gioi_tinh || "",
			quocTich,
			guest.dia_chi_chi_tiet || "",
			guest.phuong_xa || "",
			guest.quan_huyen || "",
			guest.tinh_thanh || "",
		)
		.run();

	return {
		id,
		...guest,
		so_giay_to: soGiayTo,
		quoc_tich: quocTich,
		ho_ten: guest.ho_ten.toUpperCase().trim(),
	};
}

export async function upsertStay(
	db: D1DatabaseLike,
	guestId: string,
	stayData: {
		so_phong: string;
		ngay_den: string;
		ngay_di_du_kien?: string;
		ngay_di_thuc_te?: string;
		thoi_han_thi_thuc?: string;
		ly_do_luu_tru?: number;
		status?: StayStatus;
		ma_ho_so_kbtt?: string;
		ghi_chu?: string;
		source_sheet_tab?: string;
		source_sheet_row?: number;
	},
): Promise<Stay & { isNew?: boolean }> {
	const soPhong = String(stayData.so_phong || "").trim();
	const ngayDen = String(stayData.ngay_den || "").trim();

	// Deduplication: check for active stay (not CHECKED_OUT) or same check-in date
	const existing = await db
		.prepare(
			"SELECT * FROM stays WHERE guest_id = ? AND (status != 'CHECKED_OUT' OR ngay_den LIKE ?) ORDER BY created_at DESC LIMIT 1",
		)
		.bind(guestId, `${ngayDen.slice(0, 10)}%`)
		.first<Stay>();

	if (existing) {
		const targetStatus =
			existing.status === "CHECKED_OUT"
				? existing.status
				: existing.ma_ho_so_kbtt
					? existing.status
					: stayData.status || existing.status;

		await db
			.prepare(`
				UPDATE stays
				SET so_phong = ?, ngay_di_du_kien = ?, thoi_han_thi_thuc = ?, ly_do_luu_tru = ?,
				    ghi_chu = ?, status = ?,
				    source_sheet_tab = COALESCE(?, source_sheet_tab),
				    source_sheet_row = COALESCE(?, source_sheet_row),
				    updated_at = datetime('now', '+7 hours')
				WHERE id = ?
			`)
			.bind(
				soPhong || existing.so_phong,
				stayData.ngay_di_du_kien ?? existing.ngay_di_du_kien,
				stayData.thoi_han_thi_thuc ?? existing.thoi_han_thi_thuc,
				stayData.ly_do_luu_tru ?? existing.ly_do_luu_tru,
				stayData.ghi_chu ?? existing.ghi_chu,
				targetStatus,
				stayData.source_sheet_tab ?? null,
				stayData.source_sheet_row ?? null,
				existing.id,
			)
			.run();

		return {
			...existing,
			...stayData,
			id: existing.id,
			guest_id: guestId,
			status: targetStatus,
			so_phong: soPhong || existing.so_phong,
			isNew: false,
		};
	}

	const id = generateId();
	const initialStatus: StayStatus = stayData.status || "READY_TO_SYNC";

	try {
		await db
			.prepare(`
				INSERT INTO stays (
					id, guest_id, so_phong, ngay_den, ngay_di_du_kien, ngay_di_thuc_te,
					thoi_han_thi_thuc, ly_do_luu_tru, status, ma_ho_so_kbtt, ghi_chu,
					source_sheet_tab, source_sheet_row
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`)
			.bind(
				id,
				guestId,
				soPhong,
				ngayDen,
				stayData.ngay_di_du_kien || "",
				stayData.ngay_di_thuc_te || null,
				stayData.thoi_han_thi_thuc || null,
				stayData.ly_do_luu_tru || 1,
				initialStatus,
				stayData.ma_ho_so_kbtt || "",
				stayData.ghi_chu || "",
				stayData.source_sheet_tab || "",
				stayData.source_sheet_row || null,
			)
			.run();

		return {
			id,
			guest_id: guestId,
			so_phong: soPhong,
			ngay_den: ngayDen,
			ngay_di_du_kien: stayData.ngay_di_du_kien,
			ngay_di_thuc_te: stayData.ngay_di_thuc_te,
			thoi_han_thi_thuc: stayData.thoi_han_thi_thuc,
			ly_do_luu_tru: stayData.ly_do_luu_tru || 1,
			status: initialStatus,
			ma_ho_so_kbtt: stayData.ma_ho_so_kbtt,
			ghi_chu: stayData.ghi_chu,
			source_sheet_tab: stayData.source_sheet_tab,
			source_sheet_row: stayData.source_sheet_row,
			isNew: true,
		};
	} catch {
		// If duplicate active stay exists, fallback to fetch and return existing record
		const retryExisting = await db
			.prepare(
				"SELECT * FROM stays WHERE guest_id = ? AND status != 'CHECKED_OUT' ORDER BY created_at DESC LIMIT 1",
			)
			.bind(guestId)
			.first<Stay>();
		if (retryExisting) {
			return {
				...retryExisting,
				...stayData,
				id: retryExisting.id,
				guest_id: guestId,
				status: retryExisting.status,
				so_phong: soPhong || retryExisting.so_phong,
				isNew: false,
			};
		}
		throw new Error("Không thể tạo lượt lưu trú do trùng lặp");
	}
}

let lastAutoCheckoutTimestamp = 0;

export async function autoCheckoutExpiredStays(
	db: D1DatabaseLike,
): Promise<number> {
	const now = Date.now();
	if (now - lastAutoCheckoutTimestamp < 60_000) {
		return 0;
	}
	lastAutoCheckoutTimestamp = now;

	try {
		const nowStr = new Date(Date.now() + 7 * 3600 * 1000)
			.toISOString()
			.replace("T", " ")
			.substring(0, 19);
		const res = await db
			.prepare(`
				UPDATE stays
				SET status = 'CHECKED_OUT',
				    ngay_di_thuc_te = coalesce(nullif(ngay_di_du_kien, ''), ?),
				    updated_at = ?
				WHERE status IN ('SYNCED_KBTT', 'CHECKED_IN', 'EXTENDED')
				  AND ngay_di_du_kien IS NOT NULL
				  AND trim(ngay_di_du_kien) != ''
				  AND datetime(
				      case 
				          when length(trim(ngay_di_du_kien)) = 10 then trim(ngay_di_du_kien) || ' 12:00:00'
				          else trim(ngay_di_du_kien)
				      end
				  ) <= datetime('now', '+7 hours')
			`)
			.bind(nowStr, nowStr)
			.run();
		return res?.meta?.changes || 0;
	} catch {
		return 0;
	}
}

export async function getStays(
	db: D1DatabaseLike,
	filter?: {
		status?: string;
		room?: string;
		search?: string;
		limit?: number;
		offset?: number;
	},
): Promise<StayDetail[]> {
	await autoCheckoutExpiredStays(db);

	let query = `
		SELECT s.id, s.guest_id, s.so_phong, s.ngay_den, s.ngay_di_du_kien, s.ngay_di_thuc_te,
		       s.thoi_han_thi_thuc, s.ly_do_luu_tru, s.status, s.ma_ho_so_kbtt, s.ghi_chu,
		       s.source_sheet_tab, s.source_sheet_row, s.created_at, s.updated_at,
		       g.loai_giay_to, g.so_giay_to, g.ho_ten, g.ngay_sinh, g.gioi_tinh,
		       g.quoc_tich, g.dia_chi_chi_tiet, g.phuong_xa, g.quan_huyen, g.tinh_thanh
		FROM stays s
		JOIN guests g ON s.guest_id = g.id
		WHERE 1=1
	`;
	const params: unknown[] = [];

	if (filter?.status && filter.status !== "ALL") {
		if (filter.status === "IN_HOUSE" || filter.status === "inhouse") {
			query += " AND s.status IN ('SYNCED_KBTT', 'CHECKED_IN', 'EXTENDED')";
		} else if (
			filter.status === "READY_TO_SYNC" ||
			filter.status === "register" ||
			filter.status === "NOT_CHECKED_IN"
		) {
			query +=
				" AND s.status IN ('READY_TO_SYNC', 'NOT_CHECKED_IN', 'ERROR', 'PENDING_VALIDATION')";
		} else {
			query += " AND s.status = ?";
			params.push(filter.status);
		}
	}

	if (filter?.room?.trim()) {
		query += " AND s.so_phong LIKE ?";
		params.push(`%${filter.room.trim()}%`);
	}

	if (filter?.search?.trim()) {
		const term = `%${filter.search.trim()}%`;
		query +=
			" AND (g.ho_ten LIKE ? OR g.so_giay_to LIKE ? OR s.so_phong LIKE ?)";
		params.push(term, term, term);
	}

	query += " ORDER BY s.created_at DESC";

	if (filter?.limit) {
		query += " LIMIT ?";
		params.push(filter.limit);
		if (filter?.offset) {
			query += " OFFSET ?";
			params.push(filter.offset);
		}
	}

	const stmt = db.prepare(query).bind(...params);
	const res = await stmt.all<StayDetail>();
	return res.results || [];
}

export async function getStayById(
	db: D1DatabaseLike,
	id: string,
): Promise<StayDetail | null> {
	const query = `
		SELECT s.*, g.loai_giay_to, g.so_giay_to, g.ho_ten, g.ngay_sinh, g.gioi_tinh,
		       g.quoc_tich, g.dia_chi_chi_tiet, g.phuong_xa, g.quan_huyen, g.tinh_thanh
		FROM stays s
		JOIN guests g ON s.guest_id = g.id
		WHERE s.id = ?
		LIMIT 1
	`;
	return db.prepare(query).bind(id).first<StayDetail>();
}

export async function updateStay(
	db: D1DatabaseLike,
	stayId: string,
	fields: Partial<Stay>,
): Promise<boolean> {
	const sets: string[] = ["updated_at = datetime('now', '+7 hours')"];
	const params: unknown[] = [];

	for (const [key, val] of Object.entries(fields)) {
		if (key !== "id" && key !== "created_at" && key !== "updated_at") {
			sets.push(`${key} = ?`);
			params.push(val);
		}
	}

	params.push(stayId);
	const query = `UPDATE stays SET ${sets.join(", ")} WHERE id = ?`;
	const res = await db
		.prepare(query)
		.bind(...params)
		.run();
	return res.meta.changes > 0;
}

export async function updateGuest(
	db: D1DatabaseLike,
	guestId: string,
	fields: Partial<Guest>,
): Promise<boolean> {
	const sets: string[] = ["updated_at = datetime('now', '+7 hours')"];
	const params: unknown[] = [];

	for (const [key, val] of Object.entries(fields)) {
		if (key !== "id" && key !== "created_at" && key !== "updated_at") {
			sets.push(`${key} = ?`);
			params.push(
				key === "ho_ten" && typeof val === "string"
					? val.toUpperCase().trim()
					: val,
			);
		}
	}

	params.push(guestId);
	const query = `UPDATE guests SET ${sets.join(", ")} WHERE id = ?`;
	const res = await db
		.prepare(query)
		.bind(...params)
		.run();
	return res.meta.changes > 0;
}

export async function extendStay(
	db: D1DatabaseLike,
	stayId: string,
	newNgayDi: string,
): Promise<boolean> {
	const res = await db
		.prepare(`
			UPDATE stays
			SET ngay_di_du_kien = ?, status = 'EXTENDED', updated_at = datetime('now', '+7 hours')
			WHERE id = ?
		`)
		.bind(newNgayDi, stayId)
		.run();
	return res.meta.changes > 0;
}

export async function checkoutStay(
	db: D1DatabaseLike,
	stayId: string,
	ngayDiThucTe?: string,
): Promise<boolean> {
	const actualOut =
		ngayDiThucTe ||
		new Date(Date.now() + 7 * 3600 * 1000)
			.toISOString()
			.replace("T", " ")
			.substring(0, 19);
	const res = await db
		.prepare(`
			UPDATE stays
			SET ngay_di_thuc_te = ?, status = 'CHECKED_OUT', updated_at = datetime('now', '+7 hours')
			WHERE id = ?
		`)
		.bind(actualOut, stayId)
		.run();
	return res.meta.changes > 0;
}

export async function deleteStay(
	db: D1DatabaseLike,
	stayId: string,
): Promise<boolean> {
	const res = await db
		.prepare("DELETE FROM stays WHERE id = ?")
		.bind(stayId)
		.run();
	return res.meta.changes > 0;
}

export async function logKbttAction(
	db: D1DatabaseLike,
	log: Omit<KbttLog, "id" | "created_at">,
): Promise<void> {
	const id = generateId();
	await db
		.prepare(`
			INSERT INTO kbtt_logs (
				id, stay_id, api_endpoint, guest_name, so_giay_to, so_phong,
				request_payload, response_payload, http_status, code, is_success, error_message
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`)
		.bind(
			id,
			log.stay_id || null,
			log.api_endpoint,
			log.guest_name || "",
			log.so_giay_to || "",
			log.so_phong || "",
			log.request_payload || "",
			log.response_payload || "",
			log.http_status || 200,
			log.code || "",
			log.is_success ? 1 : 0,
			log.error_message || "",
		)
		.run();
}

export async function getAuditLogs(
	db: D1DatabaseLike,
	filter?: { search?: string; limit?: number; offset?: number },
): Promise<KbttLog[]> {
	let query = "SELECT * FROM kbtt_logs WHERE 1=1";
	const params: unknown[] = [];

	if (filter?.search?.trim()) {
		const term = `%${filter.search.trim()}%`;
		query +=
			" AND (guest_name LIKE ? OR so_giay_to LIKE ? OR so_phong LIKE ? OR api_endpoint LIKE ?)";
		params.push(term, term, term, term);
	}

	query += " ORDER BY created_at DESC";

	if (filter?.limit) {
		query += " LIMIT ?";
		params.push(filter.limit);
		if (filter?.offset) {
			query += " OFFSET ?";
			params.push(filter.offset);
		}
	}

	const res = await db
		.prepare(query)
		.bind(...params)
		.all<KbttLog>();
	return res.results || [];
}

export async function getDashboardStats(db: D1DatabaseLike): Promise<{
	totalGuests: number;
	totalStays: number;
	readyToSync: number;
	syncedKbtt: number;
	inHouse: number;
	checkedOut: number;
}> {
	await autoCheckoutExpiredStays(db);

	const query = `
		SELECT 
			(SELECT COUNT(*) FROM guests) as totalGuests,
			(SELECT COUNT(*) FROM stays) as totalStays,
			(SELECT COUNT(*) FROM stays WHERE status IN ('READY_TO_SYNC', 'NOT_CHECKED_IN')) as readyToSync,
			(SELECT COUNT(*) FROM stays WHERE status IN ('SYNCED_KBTT', 'CHECKED_IN')) as syncedKbtt,
			(SELECT COUNT(*) FROM stays WHERE status IN ('SYNCED_KBTT', 'CHECKED_IN', 'EXTENDED')) as inHouse,
			(SELECT COUNT(*) FROM stays WHERE status = 'CHECKED_OUT') as checkedOut
	`;
	const row = await db.prepare(query).first<Record<string, number>>();

	return {
		totalGuests: Number(row?.totalGuests || 0),
		totalStays: Number(row?.totalStays || 0),
		readyToSync: Number(row?.readyToSync || 0),
		syncedKbtt: Number(row?.syncedKbtt || 0),
		inHouse: Number(row?.inHouse || 0),
		checkedOut: Number(row?.checkedOut || 0),
	};
}
