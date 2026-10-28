import assert from "node:assert/strict";
import {
	classifyKbttResponse,
	isAlreadyRegisteredMessage,
} from "../../src/lib/server/kbttClassifier.js";

async function runClassifierUnitTests(): Promise<void> {
	console.log("🧪 [Unit] Chạy kiểm thử KBTT Error Classifier & Resilience...");

	// 1. Upstream Gateway (502, 503, 504, 520 Cloudflare Proxy)
	const cf502 = classifyKbttResponse({
		status: 502,
		rawText:
			"<html><head><title>502 Bad Gateway</title></head><body><center>cloudflare</center></body></html>",
		contentType: "text/html",
		serverHeader: "cloudflare",
		cfRay: "8d9482b9e830-SGN",
	});
	assert.equal(cf502.errorClass, "UPSTREAM_GATEWAY");
	assert.equal(cf502.outcomeUnknown, true);
	assert.ok(cf502.message.includes("502"));

	const cf520 = classifyKbttResponse({
		status: 520,
		rawText: "Web server is returning an unknown error",
		serverHeader: "cloudflare",
		cfRay: "8d9482ba1234-HAN",
	});
	assert.equal(cf520.errorClass, "UPSTREAM_GATEWAY");
	assert.equal(cf520.outcomeUnknown, true);

	const gateway504 = classifyKbttResponse({
		status: 504,
		rawText: "Gateway Timeout",
	});
	assert.equal(gateway504.errorClass, "UPSTREAM_GATEWAY");
	assert.equal(gateway504.outcomeUnknown, true);

	// 2. Timeout (AbortError / TimeoutError)
	const abortErr = new Error("The operation was aborted due to timeout");
	abortErr.name = "TimeoutError";
	const timeoutClass = classifyKbttResponse({ error: abortErr });
	assert.equal(timeoutClass.errorClass, "TIMEOUT");
	assert.equal(timeoutClass.outcomeUnknown, true);
	assert.ok(timeoutClass.message.includes("Timeout"));

	// 3. Network Errors (fetch failed, ECONNRESET)
	const networkErr = new TypeError("fetch failed");
	const networkClass = classifyKbttResponse({ error: networkErr });
	assert.equal(networkClass.errorClass, "NETWORK");
	assert.equal(networkClass.outcomeUnknown, false);

	const econnreset = new Error("read ECONNRESET");
	const resetClass = classifyKbttResponse({ error: econnreset });
	assert.equal(resetClass.errorClass, "NETWORK");
	assert.equal(resetClass.outcomeUnknown, false);

	// 4. Auth Errors (401, 403)
	const auth401 = classifyKbttResponse({ status: 401 });
	assert.equal(auth401.errorClass, "AUTH");
	assert.equal(auth401.outcomeUnknown, false);

	const auth403 = classifyKbttResponse({ status: 403 });
	assert.equal(auth403.errorClass, "AUTH");
	assert.equal(auth403.outcomeUnknown, false);

	// 5. Already Registered
	const alreadyRegisteredMsg =
		"Bản khai báo 1: Khách đã khai báo tạm trú từ 2026-10-26 đến 2026-10-27 tại cơ sở lưu trú này.";
	const alreadyClass = classifyKbttResponse({
		status: 400,
		resData: { code: 400, message: alreadyRegisteredMsg },
		rawText: alreadyRegisteredMsg,
	});
	assert.equal(alreadyClass.errorClass, "ALREADY_REGISTERED");
	assert.equal(alreadyClass.outcomeUnknown, false);
	assert.equal(isAlreadyRegisteredMessage(alreadyRegisteredMsg), true);
	assert.equal(
		isAlreadyRegisteredMessage(
			"Số hộ chiếu đang tạm trú tại CSLT và chưa checkout",
		),
		true,
	);
	assert.equal(isAlreadyRegisteredMessage("Sai định dạng CCCD"), false);

	// 6. Schema Changed (200 OK but HTML / non-JSON)
	const schemaChanged = classifyKbttResponse({
		status: 200,
		rawText: "<html>Login Required</html>",
		contentType: "text/html",
	});
	assert.equal(schemaChanged.errorClass, "SCHEMA_CHANGED");
	assert.equal(schemaChanged.outcomeUnknown, false);

	// 7. Business Reject (400 with JSON code/message)
	const bizReject = classifyKbttResponse({
		status: 400,
		resData: { code: 400, message: "Số CCCD không đủ 12 số" },
	});
	assert.equal(bizReject.errorClass, "BUSINESS_REJECT");
	assert.equal(bizReject.outcomeUnknown, false);

	console.log("✅ [Unit] KBTT Error Classifier tests passed!");
}

runClassifierUnitTests().catch((err) => {
	console.error("❌ [Unit] Classifier test failed:", err);
	process.exit(1);
});
