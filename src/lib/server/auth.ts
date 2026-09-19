import { CONFIG } from "./config.js";

export const SESSION_TTL_SECONDS = 15 * 60; // 15 minutes TTL

/**
 * Xác định môi trường thực thi là Production hay Development:
 * - DEV (pnpm run dev / local): Không bắt buộc đăng nhập, bypass hoàn toàn.
 * - PROD (Cloudflare Pages / PROD build / KBTT_ENV=prod): Bắt buộc xác thực qua APP_PASSWORD.
 */
export function isProduction(platform?: App.Platform): boolean {
	const platformEnv = (platform?.env || {}) as Record<string, unknown>;
	const kbttEnv = String(
		platformEnv.KBTT_ENV ||
			(typeof process !== "undefined" && process.env?.KBTT_ENV) ||
			CONFIG.currentEnv ||
			"",
	)
		.toLowerCase()
		.trim();

	const nodeEnv = String(
		(typeof process !== "undefined" && process.env?.NODE_ENV) || "",
	)
		.toLowerCase()
		.trim();

	return kbttEnv === "prod" || nodeEnv === "production";
}

/**
 * Lấy mật khẩu hệ thống từ biến môi trường Cloudflare Pages (platform.env) hoặc process.env.
 * Tuyệt đối không dùng mật khẩu mặc định/hardcode trong production.
 */
export function getServerPassword(platform?: App.Platform): string {
	const platformEnv = (platform?.env || {}) as Record<string, unknown>;
	const pass = String(
		platformEnv.APP_PASSWORD ||
			(typeof process !== "undefined" && process.env?.APP_PASSWORD) ||
			"",
	).trim();

	return pass;
}

/**
 * Lấy Ingest API key / Webhook secret từ platform.env hoặc process.env
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
 * So sánh chuỗi thời gian cố định (Constant-time string comparison) chống tấn công Timing Attack
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
	if (typeof a !== "string" || typeof b !== "string") return false;
	const encoder = new TextEncoder();
	const bufA = encoder.encode(a);
	const bufB = encoder.encode(b);

	if (bufA.byteLength !== bufB.byteLength) {
		let dummy = 0;
		for (let i = 0; i < bufA.byteLength; i++) {
			dummy |= bufA[i] ^ (bufB[i % bufB.byteLength] || 0);
		}
		return false;
	}

	let mismatch = 0;
	for (let i = 0; i < bufA.byteLength; i++) {
		mismatch |= bufA[i] ^ bufB[i];
	}
	return mismatch === 0;
}

/**
 * Base64 URL Helpers
 */
function base64UrlEncode(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	const base64 = btoa(binary);
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array | null {
	try {
		let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
		while (base64.length % 4 !== 0) {
			base64 += "=";
		}
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	} catch {
		return null;
	}
}

/**
 * Sinh khóa ký HMAC-SHA256 từ mật khẩu APP_PASSWORD
 */
async function getSigningKey(secret: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const secretBytes = encoder.encode(`${secret}:dang-ky-luu-tru-session-v1`);
	const keyData = await crypto.subtle.digest("SHA-256", secretBytes);
	return await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

/**
 * Tạo Session Token có chữ ký số HMAC-SHA256, gắn nonce ngẫu nhiên và thời gian hết hạn (15 phút).
 */
export async function createSessionToken(
	platform?: App.Platform,
): Promise<string> {
	const secret = getServerPassword(platform);
	if (!secret) {
		throw new Error("Chưa cấu hình biến môi trường APP_PASSWORD trên máy chủ!");
	}
	const key = await getSigningKey(secret);

	const now = Date.now();
	const exp = now + SESSION_TTL_SECONDS * 1000;
	const nonceBytes = new Uint8Array(16);
	crypto.getRandomValues(nonceBytes);
	const nonce = base64UrlEncode(nonceBytes);

	const payloadStr = JSON.stringify({ exp, iat: now, nonce });
	const payloadBase64 = base64UrlEncode(new TextEncoder().encode(payloadStr));

	const sigBuffer = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payloadBase64),
	);
	const sigBase64 = base64UrlEncode(new Uint8Array(sigBuffer));

	return `${payloadBase64}.${sigBase64}`;
}

/**
 * Kiểm tra tính hợp lệ của phiên đăng nhập qua session cookie:
 * - DEV: Luôn cho phép (Bypass).
 * - PROD: Kiểm tra chữ ký HMAC-SHA256, cấu trúc nonce ngẫu nhiên và TTL 15 phút.
 * - Tuyệt đối từ chối chuỗi tĩnh 'authenticated' hoặc session hết hạn.
 */
export async function verifySession(
	cookies?: { get: (name: string) => string | undefined },
	platform?: App.Platform,
): Promise<boolean> {
	// 1. Chế độ DEV: Bypass hoàn toàn, không yêu cầu đăng nhập
	if (!isProduction(platform)) {
		return true;
	}

	// 2. Chế độ PROD: Bắt buộc session hợp lệ
	if (!cookies) return false;

	const token = cookies.get("app_session");
	if (!token) return false;

	// Từ chối chuỗi tĩnh 'authenticated' hoặc chuỗi sai định dạng
	if (token === "authenticated" || !token.includes(".")) {
		return false;
	}

	const parts = token.split(".");
	if (parts.length !== 2) return false;
	const [payloadBase64, sigBase64] = parts;

	const secret = getServerPassword(platform);
	if (!secret) {
		// Production thiếu APP_PASSWORD phải fail-safe từ chối
		return false;
	}

	const sigBytes = base64UrlDecode(sigBase64);
	if (!sigBytes) return false;

	try {
		const key = await getSigningKey(secret);
		const isValidSig = await crypto.subtle.verify(
			"HMAC",
			key,
			sigBytes as BufferSource,
			new TextEncoder().encode(payloadBase64),
		);

		if (!isValidSig) return false;

		const payloadBytes = base64UrlDecode(payloadBase64);
		if (!payloadBytes) return false;

		const payloadStr = new TextDecoder().decode(payloadBytes);
		const payload = JSON.parse(payloadStr) as { exp?: number; iat?: number };

		if (typeof payload.exp !== "number") return false;

		// Kiểm tra hạn sử dụng 15 phút
		if (Date.now() > payload.exp) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

/**
 * Quản lý Rate Limiting đăng nhập thất bại (chống Brute-force)
 */
interface RateLimitRecord {
	attempts: number;
	lockUntil: number;
	lastAttempt: number;
}
const loginAttemptsMap = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(ip: string): {
	allowed: boolean;
	waitSeconds?: number;
} {
	const now = Date.now();
	const record = loginAttemptsMap.get(ip);
	if (!record) return { allowed: true };

	if (record.lockUntil > now) {
		const waitSeconds = Math.ceil((record.lockUntil - now) / 1000);
		return { allowed: false, waitSeconds };
	}

	// Nếu qua 10 phút không thử lại thì xóa bản ghi
	if (now - record.lastAttempt > 10 * 60 * 1000) {
		loginAttemptsMap.delete(ip);
		return { allowed: true };
	}

	return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
	const now = Date.now();
	const record = loginAttemptsMap.get(ip) || {
		attempts: 0,
		lockUntil: 0,
		lastAttempt: now,
	};
	record.attempts += 1;
	record.lastAttempt = now;

	// Sau 5 lần nhập sai, tạm khóa IP trong 2 phút (120s)
	if (record.attempts >= 5) {
		record.lockUntil = now + 2 * 60 * 1000;
	}

	loginAttemptsMap.set(ip, record);
}

export function resetLoginRateLimit(ip: string): void {
	loginAttemptsMap.delete(ip);
}

/**
 * Xác thực Webhook Ingest OCR:
 * 1. Chấp nhận nếu có session cookie đã đăng nhập hợp lệ (verifySession).
 * 2. Chấp nhận nếu có API key hợp lệ trong header (x-api-key, x-webhook-secret, Authorization: Bearer <key>)
 *    hoặc query parameter (?key=... hoặc ?apiKey=... hoặc ?token=...).
 * 3. Nếu hệ thống chưa cấu hình INGEST_API_KEY và đang ở DEV mode, cho phép; ở PROD mode, yêu cầu phải có auth.
 */
export async function verifyWebhookAuth(
	request: Request,
	cookies?: { get: (name: string) => string | undefined },
	platform?: App.Platform,
): Promise<boolean> {
	// 1. Kiểm tra session cookie trước
	if (await verifySession(cookies, platform)) {
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
		return Boolean(providedKey && timingSafeEqualStr(providedKey, expectedKey));
	}

	// Nếu chưa thiết lập INGEST_API_KEY:
	// Ở chế độ PROD, từ chối request unauthenticated.
	// Ở chế độ DEV, cho phép nếu local.
	if (isProduction(platform)) {
		return false;
	}

	return true;
}
