import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { probeBcaConnection } from "../../src/lib/server/bcaProbe.js";
import { CONFIG } from "../../src/lib/server/config.js";
import { KbttClient } from "../../src/lib/server/kbttClient.js";

async function runMockServerTests(): Promise<void> {
	console.log(
		"🧪 [Integration] Chạy kiểm thử Mock Server (BCA 502, Gateway Timeout, Probe)...",
	);

	let mockMode: "cf_502" | "schema_changed" | "success_catalog" = "cf_502";

	const server = http.createServer((_req, res) => {
		if (mockMode === "cf_502") {
			res.writeHead(502, {
				"Content-Type": "text/html",
				Server: "cloudflare",
				"CF-Ray": "8d9482b9e830-SGN",
			});
			res.end(
				"<html><head><title>502 Bad Gateway</title></head><body><center>cloudflare</center></body></html>",
			);
		} else if (mockMode === "schema_changed") {
			res.writeHead(200, {
				"Content-Type": "text/html",
			});
			res.end("<html><body>Unexpected HTML</body></html>");
		} else if (mockMode === "success_catalog") {
			res.writeHead(200, {
				"Content-Type": "application/json",
				Server: "nginx",
			});
			res.end(JSON.stringify({ code: "200", message: "Thành công", data: [] }));
		}
	});

	await new Promise<void>((resolve) =>
		server.listen(0, "127.0.0.1", () => resolve()),
	);
	const addr = server.address() as AddressInfo;
	const origin = `http://127.0.0.1:${addr.port}`;

	// Override CONFIG.DEV_BASE_URL temporarily for test
	const origDevUrl = CONFIG.DEV_BASE_URL;
	CONFIG.DEV_BASE_URL = origin;

	try {
		const mockTokenManager = {
			getValidToken: async () => "mock_test_token_12345",
		};
		const client = new KbttClient(mockTokenManager);

		// Test 1: 502 Cloudflare Bad Gateway
		mockMode = "cf_502";
		const res502 = await client.sendVietnam([{ hoTen: "TEST" }]);
		assert.equal(res502.success, false);
		assert.equal(res502.httpStatus, 502);
		assert.equal(res502.errorClass, "UPSTREAM_GATEWAY");
		assert.equal(res502.outcomeUnknown, true);
		assert.equal(res502.cfRay, "8d9482b9e830-SGN");
		assert.ok(res502.durationMs >= 0);

		// Test 2: Schema Changed (200 with HTML)
		mockMode = "schema_changed";
		const resSchema = await client.sendVietnam([{ hoTen: "TEST" }]);
		assert.equal(resSchema.success, false);
		assert.equal(resSchema.httpStatus, 200);
		assert.equal(resSchema.errorClass, "SCHEMA_CHANGED");
		assert.equal(resSchema.outcomeUnknown, false);

		// Test 3: Probe health check
		mockMode = "success_catalog";
		const probeRes = await probeBcaConnection({ timeoutMs: 5000 });
		assert.equal(probeRes.success, true);
		assert.equal(probeRes.httpStatus, 200);
		assert.ok(probeRes.latencyMs >= 0);

		console.log("✅ [Integration] Mock Server & Probe tests passed!");
	} finally {
		CONFIG.DEV_BASE_URL = origDevUrl;
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
}

runMockServerTests().catch((err) => {
	console.error("❌ [Integration] Mock server test failed:", err);
	process.exit(1);
});
