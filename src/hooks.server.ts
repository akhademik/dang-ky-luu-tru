import { type Handle, json } from "@sveltejs/kit";
import { verifySession, verifyWebhookAuth } from "./lib/server/auth.js";

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;
	const isAuth = await verifySession(event.cookies, event.platform);
	event.locals.authenticated = isAuth;

	// 1. CSRF check for state-modifying requests (POST, PUT, PATCH, DELETE) from browsers
	if (
		pathname.startsWith("/api/") &&
		["POST", "PUT", "PATCH", "DELETE"].includes(event.request.method)
	) {
		const origin = event.request.headers.get("origin");
		// Exempt server-to-server webhook endpoints with valid API key from strict browser origin check
		if (origin && !pathname.startsWith("/api/ingest/ocr")) {
			try {
				const originHost = new URL(origin).host;
				if (originHost !== event.url.host) {
					return json(
						{
							success: false,
							message: "Truy cập bị từ chối do vi phạm Cross-Origin (CSRF).",
						},
						{ status: 403 },
					);
				}
			} catch {
				return json(
					{
						success: false,
						message: "Origin header không hợp lệ.",
					},
					{ status: 403 },
				);
			}
		}
	}

	// 2. Protect all API endpoints
	if (pathname.startsWith("/api/")) {
		// A. Login endpoint is public
		if (pathname.startsWith("/api/auth/login")) {
			return resolve(event);
		}

		// B. Webhook endpoint is protected by API key / secret or active session
		if (pathname.startsWith("/api/ingest/ocr")) {
			const isValidWebhook = await verifyWebhookAuth(
				event.request,
				event.cookies,
				event.platform,
			);
			if (!isValidWebhook) {
				return json(
					{
						success: false,
						message:
							"Yêu cầu khóa API xác thực hợp lệ (Unauthorized Webhook - Invalid or Missing API Key).",
					},
					{ status: 401 },
				);
			}
			return resolve(event);
		}

		// C. All other /api/* endpoints require authenticated session in PROD (bypassed in DEV)
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
