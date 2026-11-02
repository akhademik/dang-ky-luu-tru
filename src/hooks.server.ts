import { type Handle, json } from "@sveltejs/kit";
import {
	checkRateLimit,
	verifyCronAuth,
	verifySession,
	verifyWebhookAuth,
} from "./lib/server/auth.js";
import { CONFIG } from "./lib/server/config.js";

let envInitialized = false;

export const handle: Handle = async ({ event, resolve }) => {
	// Sync platform.env on Cloudflare Pages to process.env and CONFIG on startup
	if (event.platform?.env) {
		const penv = event.platform.env as Record<string, unknown>;
		if (typeof process !== "undefined" && process.env) {
			for (const [k, v] of Object.entries(penv)) {
				if (typeof v === "string" && v && !process.env[k]) {
					process.env[k] = v;
				}
			}
		}
		if (!envInitialized) {
			if (penv.KBTT_ENV === "prod" || penv.KBTT_ENV === "dev") {
				CONFIG.setEnv(penv.KBTT_ENV);
			}
			envInitialized = true;
		}
	}

	const pathname = event.url.pathname;
	const isAuth = await verifySession(event.cookies, event.platform);
	event.locals.authenticated = isAuth;

	// 1. CSRF check for state-modifying requests (POST, PUT, PATCH, DELETE) from browsers
	if (
		pathname.startsWith("/api/") &&
		["POST", "PUT", "PATCH", "DELETE"].includes(event.request.method)
	) {
		const origin = event.request.headers.get("origin");
		if (origin) {
			try {
				const originHost = new URL(origin).host;
				if (originHost !== event.url.host) {
					// Chỉ miễn trừ kiểm tra Origin đối với các yêu cầu server-to-server có mang theo khóa API/Cron trong headers
					const hasWebhookKey =
						pathname.startsWith("/api/ingest/ocr") &&
						Boolean(
							event.request.headers.get("x-api-key") ||
								event.request.headers.get("x-webhook-secret") ||
								event.request.headers.get("authorization"),
						);
					const hasCronKey =
						pathname.startsWith("/api/stays/auto-checkout") &&
						Boolean(
							event.request.headers.get("x-cron-key") ||
								event.request.headers.get("x-api-key") ||
								event.request.headers.get("authorization"),
						);

					if (!hasWebhookKey && !hasCronKey) {
						return json(
							{
								success: false,
								message: "Truy cập bị từ chối do vi phạm Cross-Origin (CSRF).",
							},
							{ status: 403 },
						);
					}
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

		// C. Auto-checkout endpoint is protected by APP_PASSWORD or active session (kèm Rate Limiting chống dò pass)
		if (pathname.startsWith("/api/stays/auto-checkout")) {
			const isValidCron = await verifyCronAuth(
				event.request,
				event.cookies,
				event.platform,
			);
			if (!isValidCron) {
				const clientIp =
					event.request.headers.get("cf-connecting-ip") ||
					event.request.headers.get("x-forwarded-for") ||
					"127.0.0.1";
				const rateCheck = await checkRateLimit(event.platform, clientIp);
				if (!rateCheck.allowed) {
					return json(
						{
							success: false,
							message: `Quá nhiều lần thử sai. Vui lòng thử lại sau ${rateCheck.waitSeconds || 60} giây.`,
						},
						{ status: 429 },
					);
				}

				return json(
					{
						success: false,
						message:
							"Yêu cầu khóa Cron xác thực hợp lệ (Unauthorized Auto-Checkout - Invalid or Missing Cron Key).",
					},
					{ status: 401 },
				);
			}
			return resolve(event);
		}

		// D. All other /api/* endpoints require authenticated session in PROD (bypassed in DEV)
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
