import type {
	ClassificationInput,
	ClassificationResult,
} from "../types/index.js";

/**
 * Kiểm tra xem chuỗi thông báo từ BCA có biểu thị khách đã được ghi nhận trên hệ thống không
 */
export function isAlreadyRegisteredMessage(msg?: string | null): boolean {
	if (!msg) return false;
	const lower = String(msg).toLowerCase();
	return (
		lower.includes("đã khai báo tạm trú") ||
		lower.includes("đang tạm trú tại cslt") ||
		lower.includes("tồn tại khai báo trùng thời gian") ||
		lower.includes("trùng thời gian tại cslt") ||
		lower.includes("chưa checkout")
	);
}

/**
 * Phân loại nguyên nhân và nguồn gốc lỗi khi giao tiếp với hệ thống BCA/C06
 */
export function classifyKbttResponse(
	input: ClassificationInput,
): ClassificationResult {
	const {
		status = 0,
		error,
		rawText = "",
		resData,
		contentType = "",
		serverHeader = "",
		cfRay,
	} = input;

	const errObj = error instanceof Error ? error : null;
	const errMsg = errObj?.message || (error ? String(error) : "");
	const lowerServer = (serverHeader || "").toLowerCase();
	const isCloudflare = lowerServer.includes("cloudflare") || Boolean(cfRay);
	const isHtml =
		(contentType || "").toLowerCase().includes("text/html") ||
		/<\s*(!doctype|html|head|body|title)/i.test(rawText);

	// 1. Phân loại Timeout (Client huỷ request vì quá hạn thời gian)
	if (
		errObj?.name === "TimeoutError" ||
		errObj?.name === "AbortError" ||
		errMsg.toLowerCase().includes("timeout") ||
		errMsg.toLowerCase().includes("timed out")
	) {
		return {
			errorClass: "TIMEOUT",
			outcomeUnknown: true,
			message:
				"Máy chủ C06 không phản hồi sau thời gian chờ (Timeout). Kết quả chưa rõ ràng - C06 có thể đang xử lý.",
		};
	}

	// 2. Phân loại Network (DNS, TCP, TLS rớt mạng)
	if (
		errObj &&
		(errMsg.includes("fetch failed") ||
			errMsg.includes("ECONNRESET") ||
			errMsg.includes("ENOTFOUND") ||
			errMsg.includes("ECONNREFUSED") ||
			errMsg.includes("network error"))
	) {
		return {
			errorClass: "NETWORK",
			outcomeUnknown: false,
			message: `Lỗi kết nối mạng hoặc đường truyền máy chủ: ${errMsg}`,
		};
	}

	// 3. Phân loại Upstream Gateway (502, 503, 504, 520 - 524, hoặc proxy Cloudflare trả HTML)
	const gatewayStatuses = [502, 503, 504, 520, 521, 522, 523, 524];
	if (
		gatewayStatuses.includes(status) ||
		(status >= 500 && (isCloudflare || isHtml))
	) {
		const snippet = rawText
			.replace(/<[^>]+>/g, " ")
			.slice(0, 150)
			.trim();
		return {
			errorClass: "UPSTREAM_GATEWAY",
			outcomeUnknown: true,
			message: `Cổng trung gian C06 (Cloudflare Gateway) phản hồi HTTP ${status}. Kết quả chưa rõ ràng - C06 có thể đã lưu hồ sơ.${snippet ? ` Chi tiết: ${snippet}` : ""}`,
		};
	}

	// 4. Phân loại Auth (401, 403, lỗi Token OAuth)
	if (status === 401 || status === 402 || status === 403) {
		return {
			errorClass: "AUTH",
			outcomeUnknown: false,
			message: `Xác thực thất bại với máy chủ C06 (HTTP ${status}). Vui lòng kiểm tra tài khoản hoặc làm mới Token.`,
		};
	}

	// 5. Kiểm tra trường hợp đã đăng ký trước đó (Already Registered)
	const extractedMsg =
		(resData?.message as string) ||
		(resData?.error as string) ||
		(resData?.error_description as string) ||
		rawText;

	if (isAlreadyRegisteredMessage(extractedMsg)) {
		return {
			errorClass: "ALREADY_REGISTERED",
			outcomeUnknown: false,
			message: String(extractedMsg).trim(),
		};
	}

	// 6. Phân loại Schema Changed (200 nhưng không phải JSON hoặc cấu trúc lạ)
	if (status >= 200 && status < 300) {
		const code = resData?.code;
		const isStandardSuccess = code === 200 || code === "200";
		if (isStandardSuccess) {
			return {
				errorClass: "BUSINESS_REJECT", // Fallback (không dùng khi success = true)
				outcomeUnknown: false,
				message: String(extractedMsg || "Thành công").trim(),
			};
		}

		if (isHtml || !resData || Object.keys(resData).length === 0) {
			return {
				errorClass: "SCHEMA_CHANGED",
				outcomeUnknown: false,
				message: `Phản hồi HTTP ${status} nhưng cấu trúc dữ liệu không phải JSON hợp lệ.`,
			};
		}
	}

	// 7. Phân loại Business Reject (BCA trả JSON có code lỗi nghiệp vụ)
	if (
		resData &&
		typeof resData === "object" &&
		Object.keys(resData).length > 0
	) {
		return {
			errorClass: "BUSINESS_REJECT",
			outcomeUnknown: false,
			message: String(
				extractedMsg || `C06 từ chối hồ sơ (Mã ${status})`,
			).trim(),
		};
	}

	// 8. Mặc định nếu không phân loại được
	return {
		errorClass: status >= 500 ? "UPSTREAM_GATEWAY" : "APP_INTERNAL",
		outcomeUnknown: status >= 500,
		message: String(
			extractedMsg || `Lỗi không xác định (HTTP ${status})`,
		).trim(),
	};
}
