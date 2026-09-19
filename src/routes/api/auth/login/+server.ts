import { json, type RequestHandler } from "@sveltejs/kit";
import {
	checkLoginRateLimit,
	createSessionToken,
	getServerPassword,
	isProduction,
	recordFailedLogin,
	resetLoginRateLimit,
	SESSION_TTL_SECONDS,
	timingSafeEqualStr,
	verifySession,
} from "../../../../lib/server/auth.js";

// Verify username + password and set short-lived session cookie (15 mins)
export const POST: RequestHandler = async ({
	request,
	cookies,
	platform,
	url,
	getClientAddress,
}) => {
	try {
		const isProd = isProduction(platform);

		// 1. In DEV mode: Bypass authentication entirely
		if (!isProd) {
			return json({
				success: true,
				username: "dev",
				message: "Đăng nhập thành công (DEV Mode bypass)",
			});
		}

		// 2. Client IP extraction for Rate Limiting / Brute-force protection
		let clientIp = "unknown";
		try {
			clientIp =
				request.headers.get("cf-connecting-ip") ||
				request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
				getClientAddress() ||
				"unknown";
		} catch {
			clientIp = request.headers.get("cf-connecting-ip") || "unknown";
		}

		const rateLimit = checkLoginRateLimit(clientIp);
		if (!rateLimit.allowed) {
			return json(
				{
					success: false,
					message: `Quá nhiều lần thử sai. Vui lòng thử lại sau ${rateLimit.waitSeconds || 120} giây!`,
				},
				{ status: 429 },
			);
		}

		const serverPass = getServerPassword(platform);
		const body = await request.json().catch(() => ({}));
		const username = String(body.username || "").trim();
		const password = String(body.password || "").trim();

		// Validate username (accept 'root' or 'admin' or empty default to root)
		if (
			username &&
			username.toLowerCase() !== "root" &&
			username.toLowerCase() !== "admin"
		) {
			recordFailedLogin(clientIp);
			return json(
				{
					success: false,
					message: "Tên đăng nhập không đúng! (Mặc định: root)",
				},
				{ status: 401 },
			);
		}

		// Fail safely if APP_PASSWORD is not configured on Cloudflare / Server
		if (!serverPass) {
			return json(
				{
					success: false,
					message:
						"Chưa cấu hình biến môi trường APP_PASSWORD trên máy chủ / Cloudflare Pages!",
				},
				{ status: 500 },
			);
		}

		// Constant-time password validation
		if (!password || !timingSafeEqualStr(password, serverPass)) {
			recordFailedLogin(clientIp);
			return json(
				{ success: false, message: "Mật khẩu truy cập không chính xác!" },
				{ status: 401 },
			);
		}

		// Success -> reset rate limiting counter
		resetLoginRateLimit(clientIp);

		const isHttps =
			url.protocol === "https:" ||
			request.headers.get("x-forwarded-proto") === "https" ||
			isProd;

		// Generate cryptographically signed random session token
		const sessionToken = await createSessionToken(platform);

		// Set session cookie valid for 15 minutes (900 seconds)
		cookies.set("app_session", sessionToken, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: isHttps,
			maxAge: SESSION_TTL_SECONDS,
		});

		return json({
			success: true,
			username: "root",
			message: "Đăng nhập thành công",
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};

// Check session status
export const GET: RequestHandler = async ({ cookies, platform }) => {
	const authenticated = await verifySession(cookies, platform);
	const isProd = isProduction(platform);

	return json({
		authenticated,
		username: isProd ? "root" : "dev",
		env: isProd ? "prod" : "dev",
		isDevBypass: !isProd,
	});
};

// Logout / Clear session
export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete("app_session", { path: "/" });
	return json({ success: true, message: "Đã đăng xuất" });
};
