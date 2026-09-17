import { json, type RequestHandler } from "@sveltejs/kit";
import { logger } from "$lib/server/logger.js";
import { syncPipeline } from "$lib/server/syncPipeline.js";

export const GET: RequestHandler = async () => {
	return json(syncPipeline.tokenManager.getStatus());
};

export const POST: RequestHandler = async ({ url }) => {
	const action = url.searchParams.get("action") || "login";
	const tm = syncPipeline.tokenManager;

	logger.info("API:token", `Xử lý yêu cầu Token (action=${action})`);

	if (action === "revoke") {
		const success = await tm.revoke();
		logger.info("API:token", `Thu hồi token kết quả: ${success}`);
		return json({ success });
	}

	if (action === "refresh") {
		try {
			const token = await tm.refresh();
			logger.info("API:token", "Làm mới token thành công");
			return json({ success: true, token });
		} catch (err) {
			logger.error("API:token", `Lỗi làm mới token: ${(err as Error).message}`);
			return json(
				{ success: false, error: (err as Error).message },
				{ status: 400 },
			);
		}
	}

	try {
		const token = await tm.login();
		logger.info("API:token", "Đăng nhập lấy OAuth token thành công");
		return json({ success: true, token });
	} catch (err) {
		logger.error("API:token", `Lỗi đăng nhập OAuth: ${(err as Error).message}`);
		return json(
			{ success: false, error: (err as Error).message },
			{ status: 400 },
		);
	}
};
