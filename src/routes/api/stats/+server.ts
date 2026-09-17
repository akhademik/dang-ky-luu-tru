import { json, type RequestHandler } from "@sveltejs/kit";
import { getDashboardStats, getDb } from "$lib/server/db.js";

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDb(platform);
		const stats = await getDashboardStats(db);
		return json({
			success: true,
			data: stats,
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
