import { json, type RequestHandler } from "@sveltejs/kit";
import { getDb } from "$lib/server/db.js";
import { stayService } from "$lib/server/stayService.js";

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDb(platform);
		const body = await request.json();

		const stayId = String(body.stayId || "").trim();
		const newNgayDi = String(body.newNgayDi || "").trim();

		if (!stayId || !newNgayDi) {
			return json(
				{ success: false, message: "stayId và newNgayDi là bắt buộc" },
				{ status: 400 },
			);
		}

		const result = await stayService.extendStay(db, stayId, newNgayDi);
		return json(result, { status: result.success ? 200 : 400 });
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
