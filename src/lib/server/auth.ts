import { CONFIG } from "./config.js";

/**
 * Lấy mật khẩu hệ thống từ biến môi trường Cloudflare Pages (platform.env),
 * Node.js (process.env), file .env hoặc cấu hình mặc định.
 */
export function getServerPassword(platform?: App.Platform): string {
	const platformEnv = platform?.env || {};
	const pass = String(
		platformEnv.APP_PASSWORD ||
			platformEnv.PASSWORD ||
			(typeof process !== "undefined" && process.env?.APP_PASSWORD) ||
			(typeof process !== "undefined" && process.env?.PASSWORD) ||
			CONFIG.APP_PASSWORD ||
			"@@Abc123",
	).trim();

	return pass || "@@Abc123";
}

/**
 * Kiểm tra tính hợp lệ của phiên đăng nhập qua session cookie
 */
export function verifySession(cookies: {
	get: (name: string) => string | undefined;
}): boolean {
	const session = cookies.get("app_session");
	return session === "authenticated";
}
