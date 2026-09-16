import { json, type RequestHandler } from "@sveltejs/kit";
import { logger } from "$lib/server/logger.js";

export const GET: RequestHandler = async ({ url }) => {
	const limit = parseInt(url.searchParams.get("limit") || "100", 10);
	const logs = logger.getRecentLogs(limit);
	return json({
		success: true,
		total: logs.length,
		logs,
	});
};

export const DELETE: RequestHandler = async () => {
	logger.clear();
	return json({ success: true, message: "Đã dọn sạch logs." });
};
