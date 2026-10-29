import type { D1DatabaseLike, KbttLog } from "../../types/index.js";
import { CONFIG } from "../config.js";
import { logger } from "../logger.js";

function generateId(): string {
	return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function logKbttAction(
	db: D1DatabaseLike,
	log: Omit<KbttLog, "id" | "created_at">,
): Promise<void> {
	const id = generateId();
	const env = (log.env || CONFIG.currentEnv || "dev").toLowerCase();
	let defaultHost: string | null = null;
	if (CONFIG.BASE_URL) {
		try {
			defaultHost = new URL(CONFIG.BASE_URL).host;
		} catch {}
	}
	const host = log.host || defaultHost;
	try {
		await db
			.prepare(`
				INSERT INTO kbtt_logs (
					id, stay_id, api_endpoint, guest_name, so_giay_to, so_phong,
					request_payload, response_payload, http_status, code, is_success, error_message,
					error_class, outcome_unknown, duration_ms, ttfb_ms, cf_ray, server_header, request_id, env, host
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`)
			.bind(
				id,
				log.stay_id || null,
				log.api_endpoint,
				log.guest_name || "",
				log.so_giay_to || "",
				log.so_phong || "",
				log.request_payload || "",
				log.response_payload || "",
				log.http_status ?? 200,
				log.code || "",
				log.is_success ? 1 : 0,
				log.error_message || "",
				log.error_class || null,
				log.outcome_unknown ? 1 : 0,
				log.duration_ms ?? null,
				log.ttfb_ms ?? null,
				log.cf_ray || null,
				log.server_header || null,
				log.request_id || null,
				env,
				host,
			)
			.run();
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		logger.warn(
			"AuditRepository",
			`Ghi log mở rộng thất bại (${errMsg}), đang thử ghi log cơ bản...`,
		);
		try {
			await db
				.prepare(`
					INSERT INTO kbtt_logs (
						id, stay_id, api_endpoint, guest_name, so_giay_to, so_phong,
						request_payload, response_payload, http_status, code, is_success, error_message
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`)
				.bind(
					id,
					log.stay_id || null,
					log.api_endpoint,
					log.guest_name || "",
					log.so_giay_to || "",
					log.so_phong || "",
					log.request_payload || "",
					log.response_payload || "",
					log.http_status ?? 200,
					log.code || "",
					log.is_success ? 1 : 0,
					log.error_message || "",
				)
				.run();
		} catch (fallbackErr: unknown) {
			const fallbackMsg =
				fallbackErr instanceof Error
					? fallbackErr.message
					: String(fallbackErr);
			logger.error(
				"AuditRepository",
				`Lỗi nghiêm trọng khi ghi audit log: ${fallbackMsg}`,
			);
		}
	}
}

export async function getAuditLogs(
	db: D1DatabaseLike,
	filter?: { search?: string; limit?: number; offset?: number },
): Promise<KbttLog[]> {
	let query = "SELECT * FROM kbtt_logs WHERE 1=1";
	const params: unknown[] = [];

	if (filter?.search?.trim()) {
		const term = `%${filter.search.trim()}%`;
		query +=
			" AND (guest_name LIKE ? OR so_giay_to LIKE ? OR so_phong LIKE ? OR api_endpoint LIKE ? OR env LIKE ? OR host LIKE ?)";
		params.push(term, term, term, term, term, term);
	}

	query += " ORDER BY created_at DESC";

	if (filter?.limit) {
		query += " LIMIT ?";
		params.push(filter.limit);
		if (filter?.offset) {
			query += " OFFSET ?";
			params.push(filter.offset);
		}
	}

	const res = await db
		.prepare(query)
		.bind(...params)
		.all<KbttLog>();
	return res.results || [];
}

export async function deleteAuditLog(
	db: D1DatabaseLike,
	logId: string,
): Promise<boolean> {
	const res = await db
		.prepare("DELETE FROM kbtt_logs WHERE id = ?")
		.bind(logId)
		.run();
	return res.meta.changes > 0;
}

export async function clearAuditLogs(db: D1DatabaseLike): Promise<boolean> {
	await db.prepare("DELETE FROM kbtt_logs").run();
	return true;
}
