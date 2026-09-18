import { json, type RequestHandler } from "@sveltejs/kit";
import { CONFIG } from "$lib/server/config.js";

// Helper to resolve APP_PASSWORD across Cloudflare Pages, Workers, Node.js and .env
function getAppPassword(platform?: App.Platform): string {
	const platformEnv = platform?.env || {};
	return String(
		platformEnv.APP_PASSWORD ||
			platformEnv.PASSWORD ||
			(typeof process !== "undefined" && process.env?.APP_PASSWORD) ||
			(typeof process !== "undefined" && process.env?.PASSWORD) ||
			CONFIG.APP_PASSWORD ||
			"",
	).trim();
}

// Helper to resolve KBTT_ENV
function getKbttEnv(platform?: App.Platform): string {
	const platformEnv = platform?.env || {};
	return String(
		platformEnv.KBTT_ENV ||
			(typeof process !== "undefined" && process.env?.KBTT_ENV) ||
			CONFIG.currentEnv ||
			"dev",
	).toLowerCase();
}

// Verify password and set session cookie
export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const serverPass = getAppPassword(platform);
		const body = await request.json().catch(() => ({}));
		const password = String(body.password || "").trim();

		if (!serverPass) {
			return json({
				success: true,
				message: "Hệ thống không cấu hình mật khẩu bảo vệ",
			});
		}

		if (!password || password !== serverPass) {
			return json(
				{ success: false, message: "Mật khẩu truy cập không chính xác!" },
				{ status: 401 },
			);
		}

		// Set session cookie
		cookies.set("app_session", "authenticated", {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: false,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		return json({
			success: true,
			message: "Đăng nhập thành công",
		});
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return json({ success: false, error: errMsg }, { status: 500 });
	}
};

// Check session status
export const GET: RequestHandler = async ({ cookies, platform }) => {
	const serverPass = getAppPassword(platform);
	const kbttEnv = getKbttEnv(platform);
	const isProd = kbttEnv === "prod";

	// If NO APP_PASSWORD is configured on the server, allow access
	if (!serverPass) {
		return json({
			hasPassword: false,
			authenticated: true,
			isProd,
			env: kbttEnv,
		});
	}

	// When APP_PASSWORD is set, verify the session cookie
	const session = cookies.get("app_session");
	const authenticated = session === "authenticated";

	return json({
		hasPassword: true,
		authenticated,
		isProd,
		env: kbttEnv,
	});
};

// Logout / Clear session
export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete("app_session", { path: "/" });
	return json({ success: true });
};
