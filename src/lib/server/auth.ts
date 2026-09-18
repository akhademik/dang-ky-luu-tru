import { CONFIG } from "./config.js";

/**
 * Lấy mật khẩu hệ thống từ biến môi trường Cloudflare Pages (platform.env),
 * Node.js (process.env), file .env hoặc cấu hình mặc định.
 */
export function getServerPassword(platform?: App.Platform): string {
	const platformEnv = (platform?.env || {}) as Record<string, unknown>;
	const pass = String(
		platformEnv.APP_PASSWORD ||
			platformEnv.PASSWORD ||
			(typeof process !== "undefined" && process.env?.APP_PASSWORD) ||
			(typeof process !== "undefined" && process.env?.PASSWORD) ||
			CONFIG.APP_PASSWORD ||
			"",
	).trim();

	return pass;
}

/**
 * Lấy Ingest API key / Webhook secret từ biến môi trường Cloudflare Pages (platform.env),
 * Node.js (process.env), file .env hoặc cấu hình mặc định.
 */
function getIngestApiKey(platform?: App.Platform): string {
	const platformEnv = (platform?.env || {}) as Record<string, unknown>;
	const key = String(
		platformEnv.INGEST_API_KEY ||
			platformEnv.WEBHOOK_SECRET ||
			(typeof process !== "undefined" && process.env?.INGEST_API_KEY) ||
			(typeof process !== "undefined" && process.env?.WEBHOOK_SECRET) ||
			CONFIG.INGEST_API_KEY ||
			"",
	).trim();

	return key;
}

/**
 * Kiểm tra tính hợp lệ của phiên đăng nhập qua session cookie
 */
export function verifySession(cookies?: {
	get: (name: string) => string | undefined;
}): boolean {
	if (!cookies) return false;
	const session = cookies.get("app_session");
	return session === "authenticated";
}

/**
 * Xác thực Webhook Ingest OCR:
 * 1. Chấp nhận nếu có session cookie đã đăng nhập hợp lệ (verifySession).
 * 2. Chấp nhận nếu có API key hợp lệ trong header (x-api-key, x-webhook-secret, Authorization: Bearer <key>)
 *    hoặc query parameter (?key=... hoặc ?apiKey=... hoặc ?token=...).
 * 3. Nếu hệ thống chưa cấu hình INGEST_API_KEY và đang ở DEV mode, cho phép; ở PROD mode, yêu cầu phải có auth.
 */
export function verifyWebhookAuth(
	request: Request,
	cookies?: { get: (name: string) => string | undefined },
	platform?: App.Platform,
): boolean {
	// 1. Kiểm tra session cookie trước
	if (verifySession(cookies)) {
		return true;
	}

	// 2. Lấy API key cấu hình
	const expectedKey = getIngestApiKey(platform);

	// Lấy key từ headers
	const headerKey =
		request.headers.get("x-api-key") ||
		request.headers.get("x-webhook-secret") ||
		"";

	let bearerToken = "";
	const authHeader = request.headers.get("authorization") || "";
	if (authHeader.toLowerCase().startsWith("bearer ")) {
		bearerToken = authHeader.substring(7).trim();
	}

	let queryKey = "";
	try {
		const url = new URL(request.url);
		queryKey =
			url.searchParams.get("key") ||
			url.searchParams.get("token") ||
			url.searchParams.get("apiKey") ||
			"";
	} catch {}

	const providedKey = headerKey || bearerToken || queryKey;

	if (expectedKey) {
		return Boolean(providedKey && providedKey === expectedKey);
	}

	// Nếu chưa thiết lập INGEST_API_KEY:
	// Ở chế độ PROD, từ chối request unauthenticated.
	// Ở chế độ DEV, cho phép nếu local.
	if (CONFIG.isProdMode) {
		return false;
	}

	return true;
}
