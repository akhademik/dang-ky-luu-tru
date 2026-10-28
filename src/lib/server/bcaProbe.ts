import type { BcaHealthProbeResult, ProbeOptions } from "../types/index.js";
import { CONFIG } from "./config.js";
import { classifyKbttResponse } from "./kbttClassifier.js";

/**
 * Probe kiểm tra sức khỏe và độ trễ kết nối tới Cổng BCA / C06
 * Hoàn toàn read-only, không can thiệp CSDL và không tạo hồ sơ.
 */
export async function probeBcaConnection(
	options: ProbeOptions = {},
): Promise<BcaHealthProbeResult> {
	const timeoutMs = options.timeoutMs ?? 15000;
	const endpoint = CONFIG.ENDPOINTS.DM_QUOC_TICH;
	const url = `${CONFIG.BASE_URL}${endpoint}`;
	const host = new URL(url).host;
	const env = CONFIG.currentEnv;
	const start = performance.now();

	let res: Response | null = null;
	let lastError: unknown = null;

	try {
		res = await fetch(url, {
			method: "GET",
			headers: {
				Accept: "application/json",
				"User-Agent": "KBTT-Probe/1.0",
			},
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (err) {
		lastError = err;
	}

	const latencyMs = Math.round(performance.now() - start);
	const checkedAt = new Date().toISOString();

	if (!res) {
		const classification = classifyKbttResponse({ error: lastError });
		return {
			success: false,
			httpStatus: 0,
			latencyMs,
			env,
			host,
			errorClass: classification.errorClass,
			message: classification.message,
			checkedAt,
		};
	}

	const cfRay = res.headers.get("cf-ray") || undefined;
	const serverHeader = res.headers.get("server") || undefined;
	const contentType = res.headers.get("content-type") || "";
	const rawText = await res.text();

	let resData: Record<string, unknown> | undefined;
	try {
		resData = JSON.parse(rawText) as Record<string, unknown>;
	} catch {}

	if (res.ok) {
		return {
			success: true,
			httpStatus: res.status,
			latencyMs,
			env,
			host,
			cfRay,
			serverHeader,
			message: `Cổng BCA phản hồi bình thường (${latencyMs}ms)`,
			checkedAt,
		};
	}

	const classification = classifyKbttResponse({
		status: res.status,
		rawText,
		resData,
		contentType,
		serverHeader,
		cfRay,
	});

	return {
		success: false,
		httpStatus: res.status,
		latencyMs,
		env,
		host,
		cfRay,
		serverHeader,
		errorClass: classification.errorClass,
		message: classification.message,
		checkedAt,
	};
}
