import assert from "node:assert/strict";
import type { RequestEvent } from "@sveltejs/kit";
import { handle } from "../src/hooks.server.js";
import { verifySession, verifyWebhookAuth } from "../src/lib/server/auth.js";
import { CONFIG } from "../src/lib/server/config.js";

async function runAuthSecurityTests(): Promise<void> {
	console.log("🔒 Đang chạy Security & Authentication Tests (Phase 1)...");

	// 1. Kiểm tra không rò rỉ credential demo khi chuyển sang PROD mode
	CONFIG.setEnv("prod");
	assert.equal(
		CONFIG.AUTH.USERNAME,
		process.env.PROD_AUTH_USERNAME || process.env.AUTH_USERNAME || "",
		"Prod mode không được fallback về demo_tich_hop",
	);
	assert.equal(
		CONFIG.AUTH.PASSWORD,
		process.env.PROD_AUTH_PASSWORD || process.env.AUTH_PASSWORD || "",
		"Prod mode không được fallback về Demo@#$12345",
	);
	CONFIG.setEnv("dev");
	console.log("✅ 1. Kiểm tra cách ly thông tin môi trường Prod passed!");

	// 2. Kiểm tra verifySession
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
	console.log("✅ 2. Kiểm tra Session Cookie verification passed!");

	// 3. Kiểm tra Webhook Authentication (x-api-key, Bearer token, query parameter)
	const mockPlatformWithKey = {
		env: { INGEST_API_KEY: "secret-key-123" },
	} as unknown as App.Platform;

	// A. Yêu cầu có session hợp lệ -> Cho phép
	const reqNoKey = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
	});
	assert.equal(
		verifyWebhookAuth(reqNoKey, validCookies, mockPlatformWithKey),
		true,
	);

	// B. Yêu cầu không có session, không có key -> Từ chối
	assert.equal(
		verifyWebhookAuth(reqNoKey, emptyCookies, mockPlatformWithKey),
		false,
	);

	// C. Yêu cầu kèm x-api-key đúng -> Cho phép
	const reqWithHeader = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
		headers: { "x-api-key": "secret-key-123" },
	});
	assert.equal(
		verifyWebhookAuth(reqWithHeader, emptyCookies, mockPlatformWithKey),
		true,
	);

	// D. Yêu cầu kèm x-api-key sai -> Từ chối
	const reqWithWrongHeader = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
		headers: { "x-api-key": "wrong-key" },
	});
	assert.equal(
		verifyWebhookAuth(reqWithWrongHeader, emptyCookies, mockPlatformWithKey),
		false,
	);

	// E. Yêu cầu kèm Authorization Bearer token đúng -> Cho phép
	const reqWithBearer = new Request("https://example.com/api/ingest/ocr", {
		method: "POST",
		headers: { authorization: "Bearer secret-key-123" },
	});
	assert.equal(
		verifyWebhookAuth(reqWithBearer, emptyCookies, mockPlatformWithKey),
		true,
	);

	// F. Yêu cầu kèm query param ?key=... đúng -> Cho phép
	const reqWithQuery = new Request(
		"https://example.com/api/ingest/ocr?key=secret-key-123",
		{
			method: "POST",
		},
	);
	assert.equal(
		verifyWebhookAuth(reqWithQuery, emptyCookies, mockPlatformWithKey),
		true,
	);
	console.log("✅ 3. Kiểm tra Webhook Authentication passed!");

	// 4. Kiểm tra middleware hooks.server.ts
	const mockResolve = async () => {
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	};

	// A. Gọi API nhạy cảm /api/stays khi CHƯA đăng nhập -> Trả về 401
	const unauthEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", { method: "GET" }),
		cookies: emptyCookies,
		locals: { authenticated: false },
		platform: undefined,
	} as unknown as RequestEvent;

	const res401 = await handle({
		event: unauthEvent,
		resolve: mockResolve,
	});
	assert.equal(res401.status, 401, "/api/stays chưa đăng nhập phải trả về 401");
	const body401 = (await res401.json()) as { success: boolean };
	assert.equal(body401.success, false);

	// B. Gọi API nhạy cảm /api/stays khi ĐÃ đăng nhập -> Trả về 200
	const authEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", { method: "GET" }),
		cookies: validCookies,
		locals: { authenticated: true },
		platform: undefined,
	} as unknown as RequestEvent;

	const res200 = await handle({
		event: authEvent,
		resolve: mockResolve,
	});
	assert.equal(res200.status, 200, "/api/stays đã đăng nhập phải cho phép");

	// C. Gọi API public /api/auth/login -> Cho phép (200)
	const loginEvent = {
		url: new URL("https://example.com/api/auth/login"),
		request: new Request("https://example.com/api/auth/login", {
			method: "GET",
		}),
		cookies: emptyCookies,
		locals: { authenticated: false },
		platform: undefined,
	} as unknown as RequestEvent;

	const resLogin = await handle({
		event: loginEvent,
		resolve: mockResolve,
	});
	assert.equal(resLogin.status, 200, "/api/auth/login là public endpoint");

	// D. CSRF check: POST tới /api/stays với Origin từ trang khác -> Trả về 403
	const csrfEvent = {
		url: new URL("https://example.com/api/stays"),
		request: new Request("https://example.com/api/stays", {
			method: "POST",
			headers: { origin: "https://evil-attacker.com" },
		}),
		cookies: validCookies,
		locals: { authenticated: true },
		platform: undefined,
	} as unknown as RequestEvent;

	const resCsrf = await handle({
		event: csrfEvent,
		resolve: mockResolve,
	});
	assert.equal(
		resCsrf.status,
		403,
		"CSRF từ origin khác phải bị từ chối với status 403",
	);

	console.log("✅ 4. Kiểm tra Middleware Gateway & CSRF Protection passed!");
	console.log("🎉 TẤT CẢ TEST BẢO MẬT GIAI ĐOẠN 1 ĐÃ VƯỢT QUA!");
}

runAuthSecurityTests().catch((err) => {
	console.error("❌ Test bảo mật thất bại:", err);
	process.exit(1);
});
