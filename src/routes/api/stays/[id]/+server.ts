import { json, type RequestHandler } from "@sveltejs/kit";
import { deleteStay, getDb, getStayById } from "$lib/server/db.js";
import { stayService } from "$lib/server/stayService.js";

export const GET: RequestHandler = async ({ params, platform }) => {
	try {
		const db = getDb(platform);
		const id = params.id;
		if (!id)
			return json(
				{ success: false, message: "ID không hợp lệ" },
				{ status: 400 },
			);

		const stay = await getStayById(db, id);
		if (!stay) {
			return json(
				{ success: false, message: "Không tìm thấy khách" },
				{ status: 404 },
			);
		}

		return json({ success: true, data: stay });
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request, platform }) => {
	try {
		const db = getDb(platform);
		const id = params.id;
		if (!id)
			return json(
				{ success: false, message: "ID không hợp lệ" },
				{ status: 400 },
			);

		const body = await request.json();
		const ok = await stayService.updateGuestAndStay(db, id, body);

		if (!ok) {
			return json(
				{ success: false, message: "Không tìm thấy hoặc không thể cập nhật" },
				{ status: 404 },
			);
		}

		const updated = await getStayById(db, id);
		return json({
			success: true,
			data: updated,
			message: "Cập nhật thông tin thành công",
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	try {
		const db = getDb(platform);
		const id = params.id;
		if (!id)
			return json(
				{ success: false, message: "ID không hợp lệ" },
				{ status: 400 },
			);

		const ok = await deleteStay(db, id);
		if (!ok) {
			return json(
				{ success: false, message: "Không tìm thấy bản ghi để xóa" },
				{ status: 404 },
			);
		}

		return json({ success: true, message: "Xóa lượt lưu trú thành công" });
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
