import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db.js";
import { stayService } from "$lib/server/stayService.js";

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDb(platform);
		let force = false;
		try {
			const body = await request.json();
			force = Boolean(body?.force);
		} catch {
			// Body is optional
		}

		const result = await stayService.autoCheckoutExpiredStays(db, force);
		return json({
			success: true,
			data: result,
			message: `Đã tự động kiểm tra và checkout ${result.checkedOutCount} lượt lưu trú hết hạn`,
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
