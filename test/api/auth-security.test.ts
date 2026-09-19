import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { RequestEvent } from "@sveltejs/kit";
import { handle } from "../../src/hooks.server.js";
import {
	createSessionToken,
	isProduction,
	SESSION_TTL_SECONDS,
	verifySession,
	verifyWebhookAuth,
} from "../../src/lib/server/auth.js";
import { DELETE, GET, POST } from "../../src/routes/api/auth/login/+server.js";

async function runAuthSecurityApiTests(): Promise<void> {
	console.log(
		"🔒 [API] Chạy kiểm thử Authentication, Session Tokens, Webhook & CSRF...",
	);

	// 0. Verify wrangler.json Cloudflare Native Rate Limiting Configuration
	const wranglerPath = path.resolve(process.cwd(), "wrangler.json");
	const wranglerContent = JSON.parse(fs.readFileSync(wranglerPath, "utf-8"));
	assert.ok(
		Array.isArray(wranglerContent.ratelimits),
		"wrangler.json must configure ratelimits array",
	);
	const rateLimiterConfig = wranglerContent.ratelimits.find(
		(r: { name: string }) => r.name === "RATE_LIMITER",
	);
	assert.ok(
		rateLimiterConfig,
		"wrangler.json must configure RATE_LIMITER binding",
	);
	assert.equal(
		rateLimiterConfig.simple.limit,
		5,
		"RATE_LIMITER limit must be 5 requests",
	);
	assert.equal(
		rateLimiterConfig.simple.period,
		60,
		"RATE_LIMITER period must be 60 seconds",
	);

	const prodPlatform = {
		env: {
			KBTT_ENV: "prod",
			APP_PASSWORD: "SuperSecretProdPassword123!",
		},
	} as unknown as App.Platform;

	const devPlatform = {
		env: {
			KBTT_ENV: "dev",
		},
	} as unknown as App.Platform;

	// 1. DEV Environment Authentication Bypass
	assert.equal(isProduction(devPlatform), false);
	const emptyCookies = {
		get: (_name: string) => undefined,
	};
	// In DEV: verifySession returns true even without session cookie
	const devVerifyResult = await verifySession(emptyCookies, devPlatform);
	assert.equal(devVerifyResult, true);

	// In DEV: hooks allow API access without authentication
	const mockResolve = async () => {
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	};

	const devApiEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", { method: "GET" }),
		cookies: emptyCookies,
		locals: {},
		platform: devPlatform,
	} as unknown as RequestEvent;

	const devApiRes = await handle({
		event: devApiEvent,
		resolve: mockResolve,
	});
	assert.equal(devApiRes.status, 200);

	// 2. PROD Environment Authentication Enforcement
	assert.equal(isProduction(prodPlatform), true);

	// A. PROD without session -> rejected
	const prodNoSessionResult = await verifySession(emptyCookies, prodPlatform);
	assert.equal(prodNoSessionResult, false);

	const prodUnauthEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", { method: "GET" }),
		cookies: emptyCookies,
		locals: {},
		platform: prodPlatform,
	} as unknown as RequestEvent;

	const prod401Res = await handle({
		event: prodUnauthEvent,
		resolve: mockResolve,
	});
	assert.equal(prod401Res.status, 401);

	// B. PROD with legacy static 'authenticated' string -> MUST BE REJECTED
	const legacyCookies = {
		get: (name: string) =>
			name === "app_session" ? "authenticated" : undefined,
	};
	const legacyResult = await verifySession(legacyCookies, prodPlatform);
	assert.equal(
		legacyResult,
		false,
		"Static 'authenticated' string must be rejected!",
	);

	// C. PROD with invalid / tampered signature -> rejected
	const tamperedCookies = {
		get: (name: string) =>
			name === "app_session"
				? "eyJleHAiOjE5OTk5OTk5OTk5OTksImlhdCI6MTYwMDAwMDAwMDAwMCwibm9uY2UiOiJmYWtlIn0.invalid_signature"
				: undefined,
	};
	const tamperedResult = await verifySession(tamperedCookies, prodPlatform);
	assert.equal(
		tamperedResult,
		false,
		"Tampered signature token must be rejected!",
	);

	// D. PROD with valid signed token -> allowed
	const validToken = await createSessionToken(prodPlatform);
	assert.ok(
		validToken.includes("."),
		"Session token must be formatted as payload.signature",
	);
	assert.notEqual(
		validToken,
		"authenticated",
		"Token must not be static string",
	);

	const validCookies = {
		get: (name: string) => (name === "app_session" ? validToken : undefined),
	};
	const validResult = await verifySession(validCookies, prodPlatform);
	assert.equal(
		validResult,
		true,
		"Valid signed session token must be accepted!",
	);

	const prodAuthEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", { method: "GET" }),
		cookies: validCookies,
		locals: {},
		platform: prodPlatform,
	} as unknown as RequestEvent;

	const prod200Res = await handle({
		event: prodAuthEvent,
		resolve: mockResolve,
	});
	assert.equal(prod200Res.status, 200);

	// E. PROD missing APP_PASSWORD -> fail safely (must reject)
	const missingPassPlatform = {
		env: {
			KBTT_ENV: "prod",
			APP_PASSWORD: "",
		},
	} as unknown as App.Platform;
	const failSafeResult = await verifySession(validCookies, missingPassPlatform);
	assert.equal(
		failSafeResult,
		false,
		"Missing APP_PASSWORD in PROD must fail safely",
	);

	// 3. Login Endpoint Tests (POST /api/auth/login)
	// A. Wrong password in PROD -> 401
	let setCookieHeader: {
		name: string;
		value: string;
		opts: Record<string, unknown>;
	} | null = null;
	const mockCookies = {
		get: (_name: string) => undefined,
		set: (name: string, value: string, opts: Record<string, unknown>) => {
			setCookieHeader = { name, value, opts };
		},
		delete: (_name: string, _opts: Record<string, unknown>) => {},
	};

	const wrongPassReq = new Request("https://example.com/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ username: "root", password: "WrongPassword" }),
	});

	const wrongPassRes = await POST({
		request: wrongPassReq,
		cookies: mockCookies as unknown as RequestEvent["cookies"],
		platform: prodPlatform,
		url: new URL("https://example.com/api/auth/login"),
		getClientAddress: () => "127.0.0.1",
	} as unknown as RequestEvent);
	assert.equal(wrongPassRes.status, 401);

	// B. Correct APP_PASSWORD in PROD -> 200 + sets 15-min session cookie
	const correctPassReq = new Request("https://example.com/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username: "root",
			password: "SuperSecretProdPassword123!",
		}),
	});

	const loginSuccessRes = await POST({
		request: correctPassReq,
		cookies: mockCookies as unknown as RequestEvent["cookies"],
		platform: prodPlatform,
		url: new URL("https://example.com/api/auth/login"),
		getClientAddress: () => "127.0.0.1",
	} as unknown as RequestEvent);
	assert.equal(loginSuccessRes.status, 200);
	assert.ok(setCookieHeader, "Cookie must be set on successful login");
	assert.equal(
		(setCookieHeader as unknown as { name: string }).name,
		"app_session",
	);
	assert.equal(
		(setCookieHeader as unknown as { opts: { httpOnly: boolean } }).opts
			.httpOnly,
		true,
	);
	assert.equal(
		(setCookieHeader as unknown as { opts: { sameSite: string } }).opts
			.sameSite,
		"lax",
	);
	assert.equal(
		(setCookieHeader as unknown as { opts: { maxAge: number } }).opts.maxAge,
		SESSION_TTL_SECONDS,
	);
	assert.equal(
		SESSION_TTL_SECONDS,
		900,
		"SESSION_TTL must be 15 minutes (900 seconds)",
	);

	// C. Check GET session endpoint
	const getSessionRes = await GET({
		cookies: validCookies as unknown as RequestEvent["cookies"],
		platform: prodPlatform,
	} as unknown as RequestEvent);
	const sessionData = await getSessionRes.json();
	assert.equal(sessionData.authenticated, true);
	assert.equal(sessionData.env, "prod");

	// D. Logout DELETE endpoint
	let deletedCookieName = "";
	const deleteCookies = {
		delete: (name: string) => {
			deletedCookieName = name;
		},
	};
	const logoutRes = await DELETE({
		cookies: deleteCookies as unknown as RequestEvent["cookies"],
	} as unknown as RequestEvent);
	assert.equal(logoutRes.status, 200);
	assert.equal(deletedCookieName, "app_session");

	// E. Cloudflare-native Rate Limiter Binding Test
	const rateLimitedPlatform = {
		env: {
			KBTT_ENV: "prod",
			APP_PASSWORD: "SuperSecretProdPassword123!",
			RATE_LIMITER: {
				limit: async () => ({ success: false }),
			},
		},
	} as unknown as App.Platform;

	const rateLimitedRes = await POST({
		request: correctPassReq,
		cookies: mockCookies as unknown as RequestEvent["cookies"],
		platform: rateLimitedPlatform,
		url: new URL("https://example.com/api/auth/login"),
		getClientAddress: () => "1.2.3.4",
	} as unknown as RequestEvent);
	assert.equal(
		rateLimitedRes.status,
		429,
		"Rate-limited IP must receive HTTP 429",
	);

	// In DEV: rate limit must not block
	const devRateLimitPlatform = {
		env: {
			KBTT_ENV: "dev",
			RATE_LIMITER: {
				limit: async () => ({ success: false }),
			},
		},
	} as unknown as App.Platform;

	const devRateLimitRes = await POST({
		request: correctPassReq,
		cookies: mockCookies as unknown as RequestEvent["cookies"],
		platform: devRateLimitPlatform,
		url: new URL("https://example.com/api/auth/login"),
		getClientAddress: () => "1.2.3.4",
	} as unknown as RequestEvent);
	assert.equal(
		devRateLimitRes.status,
		200,
		"DEV mode must never be rate-limited",
	);

	// 4. Webhook Authentication Tests
	const mockPlatformWithKey = {
		env: {
			KBTT_ENV: "prod",
			INGEST_API_KEY: "secret-key-123",
		},
	} as unknown as App.Platform;

	const reqNoKey = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
	});
	assert.equal(
		await verifyWebhookAuth(reqNoKey, emptyCookies, mockPlatformWithKey),
		false,
	);

	const reqWithHeader = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
		headers: { "x-api-key": "secret-key-123" },
	});
	assert.equal(
		await verifyWebhookAuth(reqWithHeader, emptyCookies, mockPlatformWithKey),
		true,
	);

	const reqWithBearer = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
		headers: { authorization: "Bearer secret-key-123" },
	});
	assert.equal(
		await verifyWebhookAuth(reqWithBearer, emptyCookies, mockPlatformWithKey),
		true,
	);

	// 5. CSRF Protection Tests
	const csrfEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", {
			method: "POST",
			headers: { origin: "https://evil-attacker.com" },
		}),
		cookies: validCookies,
		locals: { authenticated: true },
		platform: prodPlatform,
	} as unknown as RequestEvent;

	const resCsrf = await handle({ event: csrfEvent, resolve: mockResolve });
	assert.equal(resCsrf.status, 403);

	console.log(
		"✅ [API] Toàn bộ kiểm thử Authentication & Security mới đã pass 100%!",
	);
}

runAuthSecurityApiTests().catch((err) => {
	console.error("❌ [API] Auth & Security test failed:", err);
	process.exit(1);
});
