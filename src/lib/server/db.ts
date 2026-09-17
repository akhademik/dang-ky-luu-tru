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
	so_dien_thoai?: string;
	created_at?: string;
	updated_at?: string;
}

export type StayStatus =
	| "PENDING_VALIDATION"
	| "READY_TO_SYNC"
	| "SYNCED_KBTT"
	| "EXTENDED"
	| "CHECKED_OUT"
	| "CANCELLED";

export interface Stay {
	id: string;
	guest_id: string;
	so_phong: string;
	ngay_den: string;
	ngay_di_du_kien?: string;
	ngay_di_thuc_te?: string;
	ly_do_luu_tru?: number;
	ly_do_chi_tiet?: string;
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
	so_dien_thoai?: string;
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

interface D1PreparedStatement {
	bind(...params: unknown[]): D1PreparedStatement;
	all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run(): Promise<{
		success: boolean;
		meta: { changes: number; last_row_id: number };
	}>;
}

export interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatement;
	exec(query: string): Promise<unknown>;
}

// Local SQLite fallback engine for Node dev / tests
let localSqliteDb: unknown = null;

function getLocalSqliteDb(): D1DatabaseLike {
	if (!localSqliteDb) {
		try {
			const proc = typeof process !== "undefined" ? process : null;
			const sqliteMod = proc && "getBuiltinModule" in proc && typeof proc.getBuiltinModule === "function"
				? (proc.getBuiltinModule("node:sqlite") as { DatabaseSync: new (path: string) => { prepare: (sql: string) => { all: (...args: unknown[]) => unknown[]; get: (...args: unknown[]) => unknown; run: (...args: unknown[]) => { changes?: number; lastInsertRowid?: number } }; exec: (sql: string) => void } })
				: null;
			const DatabaseSync = sqliteMod?.DatabaseSync;

			if (!DatabaseSync) {
				throw new Error("Local SQLite engine (node:sqlite) is not available in this runtime");
			}

			const dbInstance = new DatabaseSync(":memory:");

			// Initialize initial schema
			dbInstance.exec(`
				CREATE TABLE IF NOT EXISTS guests (
					id TEXT PRIMARY KEY,
					loai_giay_to TEXT NOT NULL DEFAULT 'CCCD',
					so_giay_to TEXT NOT NULL,
					ho_ten TEXT NOT NULL,
					ngay_sinh TEXT,
					gioi_tinh TEXT,
					quoc_tich TEXT NOT NULL DEFAULT 'VNM',
					dia_chi_chi_tiet TEXT,
					phuong_xa TEXT,
					quan_huyen TEXT,
					tinh_thanh TEXT,
					so_dien_thoai TEXT,
					created_at TEXT DEFAULT (datetime('now', '+7 hours')),
					updated_at TEXT DEFAULT (datetime('now', '+7 hours'))
				);
				CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_so_giay_to ON guests (so_giay_to, quoc_tich);
				CREATE INDEX IF NOT EXISTS idx_guests_ho_ten ON guests (ho_ten);

				CREATE TABLE IF NOT EXISTS stays (
					id TEXT PRIMARY KEY,
					guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
					so_phong TEXT NOT NULL,
					ngay_den TEXT NOT NULL,
					ngay_di_du_kien TEXT,
					ngay_di_thuc_te TEXT,
					ly_do_luu_tru INTEGER DEFAULT 1,
					ly_do_chi_tiet TEXT,
					status TEXT NOT NULL DEFAULT 'READY_TO_SYNC',
					ma_ho_so_kbtt TEXT,
					ghi_chu TEXT,
					source_sheet_tab TEXT,
					source_sheet_row INTEGER,
					created_at TEXT DEFAULT (datetime('now', '+7 hours')),
					updated_at TEXT DEFAULT (datetime('now', '+7 hours'))
				);
				CREATE INDEX IF NOT EXISTS idx_stays_guest_id ON stays (guest_id);
				CREATE INDEX IF NOT EXISTS idx_stays_so_phong ON stays (so_phong);
				CREATE INDEX IF NOT EXISTS idx_stays_status ON stays (status);
				CREATE INDEX IF NOT EXISTS idx_stays_ngay_den ON stays (ngay_den);

				CREATE TABLE IF NOT EXISTS kbtt_logs (
					id TEXT PRIMARY KEY,
					stay_id TEXT REFERENCES stays(id) ON DELETE SET NULL,
					api_endpoint TEXT NOT NULL,
					guest_name TEXT,
					so_giay_to TEXT,
					so_phong TEXT,
					request_payload TEXT,
					response_payload TEXT,
					http_status INTEGER,
					code TEXT,
					is_success INTEGER NOT NULL DEFAULT 0,
					error_message TEXT,
					created_at TEXT DEFAULT (datetime('now', '+7 hours'))
				);
				CREATE INDEX IF NOT EXISTS idx_kbtt_logs_stay_id ON kbtt_logs (stay_id);
				CREATE INDEX IF NOT EXISTS idx_kbtt_logs_created_at ON kbtt_logs (created_at);
			`);

			localSqliteDb = {
				prepare(query: string): D1PreparedStatement {
					let boundParams: unknown[] = [];
					return {
						bind(...params: unknown[]) {
							boundParams = params;
							return this;
						},
						async all<T = unknown>() {
							const stmt = dbInstance.prepare(query);
							const results = stmt.all(...(boundParams as [])) as T[];
							return { results, success: true };
						},
						async first<T = unknown>(colName?: string) {
							const stmt = dbInstance.prepare(query);
							const row = stmt.get(...(boundParams as [])) as
								| Record<string, unknown>
								| undefined;
							if (!row) return null;
							if (colName && typeof row === "object") {
								return (row[colName] ?? null) as T;
							}
							return row as T;
						},
						async run() {
							const stmt = dbInstance.prepare(query);
							const info = stmt.run(...(boundParams as []));
							return {
								success: true,
								meta: {
									changes: Number(info?.changes || 0),
									last_row_id: Number(info?.lastInsertRowid || 0),
								},
							};
						},
					};
				},
				async exec(query: string) {
					dbInstance.exec(query);
					return { success: true };
				},
			};
		} catch (err) {
			console.error("Failed to initialize local SQLite engine:", err);
			throw err;
		}
	}
	return localSqliteDb as D1DatabaseLike;
}

export function getDb(platform?: {
	env?: { DB?: D1DatabaseLike };
}): D1DatabaseLike {
	if (platform?.env?.DB) {
		return platform.env.DB;
	}
	return getLocalSqliteDb();
}

function generateId(): string {
	return typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
		? globalThis.crypto.randomUUID()
		: Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function upsertGuest(
	db: D1DatabaseLike,
	guest: Omit<Guest, "id" | "created_at" | "updated_at">,
): Promise<Guest> {
	const soGiayTo = String(guest.so_giay_to || "").trim();
	const quocTich = String(guest.quoc_tich || "VNM")
		.trim()
		.toUpperCase();

	// Check if guest exists
	const existing = await db
		.prepare(
			"SELECT * FROM guests WHERE so_giay_to = ? AND quoc_tich = ? LIMIT 1",
		)
		.bind(soGiayTo, quocTich)
		.first<Guest>();

	if (existing) {
		await db
			.prepare(`
				UPDATE guests
				SET ho_ten = ?, loai_giay_to = ?, ngay_sinh = ?, gioi_tinh = ?,
				    dia_chi_chi_tiet = ?, phuong_xa = ?, quan_huyen = ?, tinh_thanh = ?,
				    so_dien_thoai = ?, updated_at = datetime('now', '+7 hours')
				WHERE id = ?
			`)
			.bind(
				guest.ho_ten.toUpperCase().trim(),
				guest.loai_giay_to || existing.loai_giay_to,
				guest.ngay_sinh || existing.ngay_sinh || "",
				guest.gioi_tinh || existing.gioi_tinh || "",
				guest.dia_chi_chi_tiet ?? existing.dia_chi_chi_tiet,
				guest.phuong_xa ?? existing.phuong_xa,
				guest.quan_huyen ?? existing.quan_huyen,
				guest.tinh_thanh ?? existing.tinh_thanh,
				guest.so_dien_thoai ?? existing.so_dien_thoai,
				existing.id,
			)
			.run();

		return {
			...existing,
			...guest,
			ho_ten: guest.ho_ten.toUpperCase().trim(),
		};
	}

	const id = generateId();
	await db
		.prepare(`
			INSERT INTO guests (
				id, loai_giay_to, so_giay_to, ho_ten, ngay_sinh, gioi_tinh,
				quoc_tich, dia_chi_chi_tiet, phuong_xa, quan_huyen, tinh_thanh, so_dien_thoai
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
			guest.so_dien_thoai || "",
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
		ly_do_luu_tru?: number;
		ly_do_chi_tiet?: string;
		status?: StayStatus;
		ma_ho_so_kbtt?: string;
		ghi_chu?: string;
		source_sheet_tab?: string;
		source_sheet_row?: number;
	},
): Promise<Stay> {
	const soPhong = String(stayData.so_phong || "").trim();
	const ngayDen = String(stayData.ngay_den || "").trim();

	// Check for existing active stay for this guest on this check-in date
	const existing = await db
		.prepare(
			"SELECT * FROM stays WHERE guest_id = ? AND ngay_den LIKE ? LIMIT 1",
		)
		.bind(guestId, `${ngayDen.slice(0, 10)}%`)
		.first<Stay>();

	if (existing) {
		await db
			.prepare(`
				UPDATE stays
				SET so_phong = ?, ngay_di_du_kien = ?, ly_do_luu_tru = ?,
				    ly_do_chi_tiet = ?, ghi_chu = ?, updated_at = datetime('now', '+7 hours')
				WHERE id = ?
			`)
			.bind(
				soPhong || existing.so_phong,
				stayData.ngay_di_du_kien ?? existing.ngay_di_du_kien,
				stayData.ly_do_luu_tru ?? existing.ly_do_luu_tru,
				stayData.ly_do_chi_tiet ?? existing.ly_do_chi_tiet,
				stayData.ghi_chu ?? existing.ghi_chu,
				existing.id,
			)
			.run();

		return {
			...existing,
			...stayData,
			so_phong: soPhong || existing.so_phong,
		};
	}

	const id = generateId();
	const initialStatus: StayStatus = stayData.status || "READY_TO_SYNC";

	await db
		.prepare(`
			INSERT INTO stays (
				id, guest_id, so_phong, ngay_den, ngay_di_du_kien, ngay_di_thuc_te,
				ly_do_luu_tru, ly_do_chi_tiet, status, ma_ho_so_kbtt, ghi_chu,
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
			stayData.ly_do_luu_tru || 1,
			stayData.ly_do_chi_tiet || "",
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
		status: initialStatus,
		ly_do_luu_tru: stayData.ly_do_luu_tru || 1,
	};
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
	let query = `
		SELECT s.id, s.guest_id, s.so_phong, s.ngay_den, s.ngay_di_du_kien, s.ngay_di_thuc_te,
		       s.ly_do_luu_tru, s.ly_do_chi_tiet, s.status, s.ma_ho_so_kbtt, s.ghi_chu,
		       s.source_sheet_tab, s.source_sheet_row, s.created_at, s.updated_at,
		       g.loai_giay_to, g.so_giay_to, g.ho_ten, g.ngay_sinh, g.gioi_tinh,
		       g.quoc_tich, g.dia_chi_chi_tiet, g.phuong_xa, g.quan_huyen, g.tinh_thanh, g.so_dien_thoai
		FROM stays s
		JOIN guests g ON s.guest_id = g.id
		WHERE 1=1
	`;
	const params: unknown[] = [];

	if (filter?.status && filter.status !== "ALL") {
		query += " AND s.status = ?";
		params.push(filter.status);
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
		       g.quoc_tich, g.dia_chi_chi_tiet, g.phuong_xa, g.quan_huyen, g.tinh_thanh, g.so_dien_thoai
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
	const totalGuests =
		(await db.prepare("SELECT COUNT(*) as c FROM guests").first<number>("c")) ||
		0;
	const totalStays =
		(await db.prepare("SELECT COUNT(*) as c FROM stays").first<number>("c")) ||
		0;
	const readyToSync =
		(await db
			.prepare("SELECT COUNT(*) as c FROM stays WHERE status = 'READY_TO_SYNC'")
			.first<number>("c")) || 0;
	const syncedKbtt =
		(await db
			.prepare("SELECT COUNT(*) as c FROM stays WHERE status = 'SYNCED_KBTT'")
			.first<number>("c")) || 0;
	const inHouse =
		(await db
			.prepare(
				"SELECT COUNT(*) as c FROM stays WHERE status IN ('SYNCED_KBTT', 'EXTENDED')",
			)
			.first<number>("c")) || 0;
	const checkedOut =
		(await db
			.prepare("SELECT COUNT(*) as c FROM stays WHERE status = 'CHECKED_OUT'")
			.first<number>("c")) || 0;

	return {
		totalGuests,
		totalStays,
		readyToSync,
		syncedKbtt,
		inHouse,
		checkedOut,
	};
}
