import type {
	D1DatabaseLike,
	Stay,
	StayDetail,
	StayStatus,
} from "../../types/index.js";
import { getNowGmt7DateTimeString } from "../time.js";
import { assertValidTransition } from "../validator.js";

function generateId(): string {
	return typeof globalThis.crypto !== "undefined" &&
		typeof globalThis.crypto.randomUUID === "function"
		? globalThis.crypto.randomUUID()
		: Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15);
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
				          when trim(ngay_di_du_kien) like '% 05:00:00' then substr(trim(ngay_di_du_kien), 1, 10) || ' 12:00:00'
				          when trim(ngay_di_du_kien) like '% 00:00:00' then substr(trim(ngay_di_du_kien), 1, 10) || ' 12:00:00'
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

export async function getLatestVisaByGuestId(
	db: D1DatabaseLike,
	guestId: string,
): Promise<string | null> {
	try {
		const res = await db
			.prepare(
				"SELECT thoi_han_thi_thuc FROM stays WHERE guest_id = ? AND thoi_han_thi_thuc IS NOT NULL AND trim(thoi_han_thi_thuc) != '' ORDER BY created_at DESC LIMIT 1",
			)
			.bind(guestId)
			.first<{ thoi_han_thi_thuc?: string }>();
		return res?.thoi_han_thi_thuc?.trim() || null;
	} catch {
		return null;
	}
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

		const preservedVisa =
			stayData.thoi_han_thi_thuc?.trim() ||
			existing.thoi_han_thi_thuc ||
			(await getLatestVisaByGuestId(db, guestId)) ||
			null;

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
				preservedVisa,
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
			thoi_han_thi_thuc: preservedVisa || undefined,
			id: existing.id,
			guest_id: guestId,
			status: targetStatus,
			so_phong: soPhong || existing.so_phong,
			isNew: false,
		};
	}

	const id = generateId();
	const initialStatus: StayStatus = stayData.status || "READY_TO_SYNC";
	const initialVisa =
		stayData.thoi_han_thi_thuc?.trim() ||
		(await getLatestVisaByGuestId(db, guestId)) ||
		null;

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
				initialVisa,
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
			thoi_han_thi_thuc: initialVisa || undefined,
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

export async function extendStay(
	db: D1DatabaseLike,
	stayId: string,
	newNgayDi: string,
): Promise<boolean> {
	const stay = await getStayById(db, stayId);
	if (!stay) return false;

	assertValidTransition(stay.status as StayStatus, "EXTENDED");

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
	const stay = await getStayById(db, stayId);
	if (!stay) return false;

	assertValidTransition(stay.status as StayStatus, "CHECKED_OUT");

	const actualOut = ngayDiThucTe || getNowGmt7DateTimeString();
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
