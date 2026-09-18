import { json, type RequestHandler } from "@sveltejs/kit";
import { getDashboardStats, getDb } from "$lib/server/db.js";

let cachedStats: { data: unknown; time: number } | null = null;
const STATS_CACHE_TTL_MS = 15_000; // 15 seconds

export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const force = url.searchParams.get("force") === "true";
		const now = Date.now();

		if (!force && cachedStats && now - cachedStats.time < STATS_CACHE_TTL_MS) {
			return json(
				{
					success: true,
					data: cachedStats.data,
					cached: true,
				},
				{
					headers: {
						"Cache-Control": "public, max-age=15, stale-while-revalidate=30",
					},
				},
			);
		}

		const db = getDb(platform);
		const stats = await getDashboardStats(db);
		cachedStats = { data: stats, time: now };

		return json(
			{
				success: true,
				data: stats,
			},
			{
				headers: {
					"Cache-Control": "public, max-age=15, stale-while-revalidate=30",
				},
			},
		);
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
