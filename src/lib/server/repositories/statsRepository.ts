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

	const query = `
		SELECT 
			(SELECT COUNT(*) FROM guests) as totalGuests,
			(SELECT COUNT(*) FROM stays) as totalStays,
			(SELECT COUNT(*) FROM stays WHERE status IN ('READY_TO_SYNC', 'NOT_CHECKED_IN')) as readyToSync,
			(SELECT COUNT(*) FROM stays WHERE status IN ('SYNCED_KBTT', 'CHECKED_IN')) as syncedKbtt,
			(SELECT COUNT(*) FROM stays WHERE status IN ('SYNCED_KBTT', 'CHECKED_IN', 'EXTENDED')) as inHouse,
			(SELECT COUNT(*) FROM stays WHERE status = 'CHECKED_OUT') as checkedOut
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
