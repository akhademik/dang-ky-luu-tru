import assert from "node:assert/strict";
import type { RequestEvent } from "@sveltejs/kit";
import { handle } from "../../src/hooks.server.js";
import { verifySession, verifyWebhookAuth } from "../../src/lib/server/auth.js";
import { CONFIG } from "../../src/lib/server/config.js";

async function runAuthSecurityApiTests(): Promise<void> {
	console.log(
		"🔒 [API] Chạy kiểm thử Authentication, Cookies, Webhook & CSRF...",
	);

	// 1. Prod Mode Environment Isolation
	CONFIG.setEnv("prod");
	assert.equal(
		CONFIG.AUTH.USERNAME,
		process.env.PROD_AUTH_USERNAME || process.env.AUTH_USERNAME || "",
	);
	assert.equal(
		CONFIG.AUTH.PASSWORD,
		process.env.PROD_AUTH_PASSWORD || process.env.AUTH_PASSWORD || "",
	);
	CONFIG.setEnv("dev");

	// 2. Cookie Verification
	const validCookies = {
		get: (name: string) =>
			name === "app_session" ? "authenticated" : undefined,
	};
	const invalidCookies = {
		get: (name: string) => (name === "app_session" ? "invalid" : undefined),
	};
	const emptyCookies = {
		get: (_name: string) => undefined,
	};

	assert.equal(verifySession(validCookies), true);
	assert.equal(verifySession(invalidCookies), false);
	assert.equal(verifySession(emptyCookies), false);
	assert.equal(verifySession(undefined), false);

	// 3. Webhook Authentication
	const mockPlatformWithKey = {
		env: { INGEST_API_KEY: "secret-key-123" },
	} as unknown as App.Platform;

	const reqNoKey = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
	});
	assert.equal(
		verifyWebhookAuth(reqNoKey, validCookies, mockPlatformWithKey),
		true,
	);
	assert.equal(
		verifyWebhookAuth(reqNoKey, emptyCookies, mockPlatformWithKey),
		false,
	);

	const reqWithHeader = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
		headers: { "x-api-key": "secret-key-123" },
	});
	assert.equal(
		verifyWebhookAuth(reqWithHeader, emptyCookies, mockPlatformWithKey),
		true,
	);

	const reqWithBearer = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
		headers: { authorization: "Bearer secret-key-123" },
	});
	assert.equal(
		verifyWebhookAuth(reqWithBearer, emptyCookies, mockPlatformWithKey),
		true,
	);

	// 4. Gateway Hooks Middleware & CSRF
	const mockResolve = async () => {
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	};

	const unauthEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", { method: "GET" }),
		cookies: emptyCookies,
		locals: { authenticated: false },
		platform: undefined,
	} as unknown as RequestEvent;

	const res401 = await handle({ event: unauthEvent, resolve: mockResolve });
	assert.equal(res401.status, 401);

	const authEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", { method: "GET" }),
		cookies: validCookies,
		locals: { authenticated: true },
		platform: undefined,
	} as unknown as RequestEvent;

	const res200 = await handle({ event: authEvent, resolve: mockResolve });
	assert.equal(res200.status, 200);

	const csrfEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", {
			method: "POST",
			headers: { origin: "https://evil-site.com" },
		}),
		cookies: validCookies,
		locals: { authenticated: true },
		platform: undefined,
	} as unknown as RequestEvent;

	const resCsrf = await handle({ event: csrfEvent, resolve: mockResolve });
	assert.equal(resCsrf.status, 403);

	console.log("✅ [API] Authentication & Security API tests passed!");
}

runAuthSecurityApiTests().catch((err) => {
	console.error("❌ [API] Auth & Security test failed:", err);
	process.exit(1);
});
