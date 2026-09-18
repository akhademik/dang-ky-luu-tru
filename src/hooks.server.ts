import { type Handle, json } from "@sveltejs/kit";
import { verifySession } from "$lib/server/auth.js";

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	const isAuth = verifySession(event.cookies);
	event.locals.authenticated = isAuth;

	// Protect all API routes except login and OCR ingestion webhook
	if (
		pathname.startsWith("/api/") &&
		!pathname.startsWith("/api/auth/login") &&
		!pathname.startsWith("/api/ingest/ocr")
	) {
		if (!isAuth) {
			return json(
				{
					success: false,
					message:
						"Yêu cầu đăng nhập để truy cập tài nguyên này (Unauthorized).",
				},
				{ status: 401 },
			);
		}
	}

	return resolve(event);
};
