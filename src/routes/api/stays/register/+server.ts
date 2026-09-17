import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db.js";
import { stayService } from "$lib/server/stayService.js";

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDb(platform);
		const body = await request.json();

		if (body.stayId && typeof body.stayId === "string") {
			const result = await stayService.registerStayToKbtt(db, body.stayId);
			return json(
				{
					success: result.success,
					code: result.code,
					message: result.message,
					data: result,
				},
				{ status: result.success ? 200 : 400 },
			);
		}

		if (Array.isArray(body.stayIds)) {
			const batchResult = await stayService.batchRegisterStays(
				db,
				body.stayIds,
			);
			return json({
				success: batchResult.failureCount === 0,
				data: batchResult,
				message: `Đã gửi khai báo ${batchResult.total} khách: ${batchResult.successCount} thành công, ${batchResult.failureCount} thất bại`,
			});
		}

		// If no specific IDs passed, register all ready to sync
		const batchResult = await stayService.batchRegisterStays(db);
		return json({
			success: batchResult.failureCount === 0,
			data: batchResult,
			message: `Đã gửi khai báo ${batchResult.total} khách sẵn sàng: ${batchResult.successCount} thành công, ${batchResult.failureCount} thất bại`,
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
