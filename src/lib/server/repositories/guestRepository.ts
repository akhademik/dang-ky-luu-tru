import type { D1DatabaseLike, Guest } from "../../types/index.js";

function generateId(): string {
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
	const isForeign = quocTich !== "VNM";
	const effectiveLoaiGiayTo = isForeign
		? "HO_CHIEU"
		: guest.loai_giay_to || "CCCD";

	// Check if guest exists by matching so_giay_to (primary identifier)
	const existing = await db
		.prepare(
			"SELECT * FROM guests WHERE UPPER(TRIM(so_giay_to)) = UPPER(TRIM(?)) LIMIT 1",
		)
		.bind(soGiayTo)
		.first<Guest>();

	if (existing) {
		const existingIsForeign = (quocTich || existing.quoc_tich) !== "VNM";
		const finalLoaiGiayTo = existingIsForeign
			? "HO_CHIEU"
			: guest.loai_giay_to || existing.loai_giay_to || "CCCD";

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
				finalLoaiGiayTo,
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
			loai_giay_to: finalLoaiGiayTo,
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
			effectiveLoaiGiayTo,
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
