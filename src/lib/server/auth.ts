import { env as dynamicPrivateEnv } from "$env/dynamic/private";
import { CONFIG } from "./config.js";

/**
 * Lấy mật khẩu hệ thống từ biến môi trường Cloudflare Pages (platform.env / dynamicPrivateEnv),
 * Node.js (process.env), file .env hoặc cấu hình mặc định.
 */
export function getServerPassword(platform?: App.Platform): string {
	const platformEnv = (platform?.env || {}) as Record<string, unknown>;
	const pass = String(
		dynamicPrivateEnv.APP_PASSWORD ||
			dynamicPrivateEnv.PASSWORD ||
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
 * Kiểm tra tính hợp lệ của phiên đăng nhập qua session cookie
 */
export function verifySession(cookies: {
	get: (name: string) => string | undefined;
}): boolean {
	const session = cookies.get("app_session");
	return session === "authenticated";
}
