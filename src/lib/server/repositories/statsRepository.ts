import type { D1DatabaseLike } from "../../types/index.js";
import { autoCheckoutExpiredStays } from "./stayRepository.js";

export interface DashboardStats {
	totalGuests: number;
	totalStays: number;
	readyToSync: number;
	syncedKbtt: number;
	inHouse: number;
	checkedOut: number;
}

export async function getDashboardStats(
	db: D1DatabaseLike,
): Promise<DashboardStats> {
	await autoCheckoutExpiredStays(db);

	// 1-pass scan on stays table + guests count subquery
	const query = `
		SELECT 
			(SELECT COUNT(*) FROM guests) as totalGuests,
			COUNT(*) as totalStays,
			SUM(CASE WHEN status IN ('READY_TO_SYNC', 'NOT_CHECKED_IN') THEN 1 ELSE 0 END) as readyToSync,
			SUM(CASE WHEN status IN ('SYNCED_KBTT', 'CHECKED_IN') THEN 1 ELSE 0 END) as syncedKbtt,
			SUM(CASE WHEN status IN ('SYNCED_KBTT', 'CHECKED_IN', 'EXTENDED') THEN 1 ELSE 0 END) as inHouse,
			SUM(CASE WHEN status = 'CHECKED_OUT' THEN 1 ELSE 0 END) as checkedOut
		FROM stays
	`;
	const row = await db.prepare(query).first<Record<string, number>>();

	return {
		totalGuests: Number(row?.totalGuests || 0),
		totalStays: Number(row?.totalStays || 0),
		readyToSync: Number(row?.readyToSync || 0),
		syncedKbtt: Number(row?.syncedKbtt || 0),
		inHouse: Number(row?.inHouse || 0),
		checkedOut: Number(row?.checkedOut || 0),
	};
}
