import { json, type RequestHandler } from "@sveltejs/kit";
import { CONFIG } from "../../../../lib/server/config.js";
import {
	clearAuditLogs,
	deleteAuditLog,
	getAuditLogs,
	getDb,
} from "../../../../lib/server/db.js";

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const db = getDb(platform);
		const search = url.searchParams.get("search") || "";
		const limit = parseInt(url.searchParams.get("limit") || "100", 10);
		const offset = parseInt(url.searchParams.get("offset") || "0", 10);

		const logs = await getAuditLogs(db, {
			search,
			limit,
			offset,
		});

		return json({
			success: true,
			data: logs,
			total: logs.length,
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, platform }) => {
	try {
		// Ngăn chặn xóa Audit Logs trên môi trường Production (Append-only)
		if (CONFIG.isProdMode) {
			return json(
				{
					success: false,
					error:
						"Nhật ký kiểm toán (Audit Logs) là bất biến (Append-only) và không được phép xóa trên môi trường Production.",
				},
				{ status: 403 },
			);
		}

		const db = getDb(platform);
		const isClearAll = url.searchParams.get("clear") === "true";
		const id = url.searchParams.get("id");

		if (isClearAll) {
			await clearAuditLogs(db);
			return json({
				success: true,
				message: "Đã xóa toàn bộ nhật ký Dev Logs",
			});
		}

		if (!id) {
			return json(
				{ success: false, error: "Thiếu ID bản ghi cần xóa" },
				{ status: 400 },
			);
		}

		const deleted = await deleteAuditLog(db, id);
		if (!deleted) {
			return json(
				{ success: false, error: "Không tìm thấy bản ghi cần xóa" },
				{ status: 404 },
			);
		}

		return json({
			success: true,
			message: "Đã xóa bản ghi nhật ký thành công",
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
