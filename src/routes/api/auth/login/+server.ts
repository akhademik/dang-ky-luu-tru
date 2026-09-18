import { json, type RequestHandler } from "@sveltejs/kit";
import { getServerPassword, verifySession } from "$lib/server/auth.js";
import { CONFIG } from "$lib/server/config.js";

// Verify username + password and set session cookie
export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
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
			return json(
				{
					success: false,
					message: "Tên đăng nhập không đúng! (Mặc định: root)",
				},
				{ status: 401 },
			);
		}

		if (!password || password !== serverPass) {
			return json(
				{ success: false, message: "Mật khẩu truy cập không chính xác!" },
				{ status: 401 },
			);
		}

		// Set session cookie valid for 30 days
		cookies.set("app_session", "authenticated", {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: false,
			maxAge: 60 * 60 * 24 * 30, // 30 days
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
export const GET: RequestHandler = async ({ cookies }) => {
	const authenticated = verifySession(cookies);

	return json({
		authenticated,
		username: "root",
		env: CONFIG.currentEnv,
	});
};

// Logout / Clear session
export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete("app_session", { path: "/" });
	return json({ success: true });
};
