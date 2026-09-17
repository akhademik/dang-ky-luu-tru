import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb, getStays, upsertGuest, upsertStay } from "$lib/server/db.js";

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const db = getDb(platform);
		const status = url.searchParams.get("status") || "ALL";
		const room = url.searchParams.get("room") || "";
		const search = url.searchParams.get("search") || "";
		const limit = parseInt(url.searchParams.get("limit") || "100", 10);
		const offset = parseInt(url.searchParams.get("offset") || "0", 10);

		const stays = await getStays(db, {
			status,
			room,
			search,
			limit,
			offset,
		});

		return json({
			success: true,
			data: stays,
			total: stays.length,
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDb(platform);
		const body = await request.json();

		const hoTen = String(body.ho_ten || "")
			.trim()
			.toUpperCase();
		const soGiayTo = String(body.so_giay_to || "").trim();

		if (!hoTen || !soGiayTo) {
			return json(
				{ success: false, message: "Họ tên và Số giấy tờ là bắt buộc" },
				{ status: 400 },
			);
		}

		const isVN = ["VNM", "VN", "VIỆT NAM", "VIET NAM"].includes(
			String(body.quoc_tich || "VNM")
				.trim()
				.toUpperCase(),
		);

		const guest = await upsertGuest(db, {
			ho_ten: hoTen,
			so_giay_to: soGiayTo,
			quoc_tich: body.quoc_tich || "VNM",
			loai_giay_to: body.loai_giay_to || (isVN ? "CCCD" : "HO_CHIEU"),
			ngay_sinh: body.ngay_sinh || "",
			gioi_tinh: body.gioi_tinh || "M",
			dia_chi_chi_tiet: body.dia_chi_chi_tiet || "",
			phuong_xa: body.phuong_xa || "",
			quan_huyen: body.quan_huyen || "",
			tinh_thanh: body.tinh_thanh || "",
		});

		const stay = await upsertStay(db, guest.id, {
			so_phong: String(body.so_phong || "1").trim(),
			ngay_den:
				body.ngay_den ||
				new Date(Date.now() + 7 * 3600 * 1000)
					.toISOString()
					.replace("T", " ")
					.substring(0, 19),
			ngay_di_du_kien: body.ngay_di_du_kien || "",
			thoi_han_thi_thuc: isVN ? "" : body.thoi_han_thi_thuc || "",
			ly_do_luu_tru: Number(body.ly_do_luu_tru || 1),
			status: body.status || "READY_TO_SYNC",
			ghi_chu: body.ghi_chu || "",
		});

		return json({
			success: true,
			data: { guest, stay },
			message: "Thêm mới lượt lưu trú thành công",
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
