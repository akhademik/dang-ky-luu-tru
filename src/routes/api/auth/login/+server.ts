import { json, type RequestHandler } from "@sveltejs/kit";
import { CONFIG } from "$lib/server/config.js";

// Verify password and set session cookie
export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const env = (platform?.env || {}) as Record<string, unknown>;
		const serverPass = String(env.APP_PASSWORD || CONFIG.APP_PASSWORD || "@@Abc123");
		const body = await request.json().catch(() => ({}));
		const password = String(body.password || "").trim();

		if (!password || password !== serverPass) {
			return json(
				{ success: false, message: "Mật khẩu truy cập không chính xác!" },
				{ status: 401 },
			);
		}

		// Set session cookie (no maxAge/expires = session cookie deleted when browser/session closes)
		cookies.set("app_session", "authenticated", {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
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
	const env = (platform?.env || {}) as Record<string, unknown>;
	const kbttEnv = String(env.KBTT_ENV || CONFIG.currentEnv || "dev").toLowerCase();
	const isProd = kbttEnv === "prod";

	// In dev mode: no password required
	if (!isProd) {
		return json({
			authenticated: true,
			isProd: false,
			env: "dev",
		});
	}

	// In prod mode: check session cookie
	const session = cookies.get("app_session");
	const authenticated = session === "authenticated";

	return json({
		authenticated,
		isProd: true,
		env: "prod",
	});
};

// Logout / Clear session
export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete("app_session", { path: "/" });
	return json({ success: true });
};
