import { json, type RequestHandler } from "@sveltejs/kit";
import { getDashboardStats, getDb } from "$lib/server/db.js";

let cachedStats: { data: unknown; time: number } | null = null;
let statsInFlight: Promise<unknown> | null = null;
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
						"Cache-Control": "private, max-age=15, stale-while-revalidate=30",
					},
				},
			);
		}

		if (!force && statsInFlight) {
			const existingStats = await statsInFlight;
			return json(
				{
					success: true,
					data: existingStats,
					cached: true,
				},
				{
					headers: {
						"Cache-Control": "private, max-age=15, stale-while-revalidate=30",
					},
				},
			);
		}

		statsInFlight = (async () => {
			const db = getDb(platform);
			const stats = await getDashboardStats(db);
			cachedStats = { data: stats, time: Date.now() };
			return stats;
		})();

		const stats = await statsInFlight;
		statsInFlight = null;

		return json(
			{
				success: true,
				data: stats,
			},
			{
				headers: {
					"Cache-Control": "private, max-age=15, stale-while-revalidate=30",
				},
			},
		);
	} catch (err: unknown) {
		statsInFlight = null;
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};
