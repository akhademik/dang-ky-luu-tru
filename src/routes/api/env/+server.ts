import { json, type RequestHandler } from "@sveltejs/kit";
import { type ApiEnvironment, CONFIG } from "$lib/server/config.js";
import { logger } from "$lib/server/logger.js";
import { syncPipeline } from "$lib/server/syncPipeline.js";

export const GET: RequestHandler = async () => {
	return json({
		env: CONFIG.currentEnv,
		baseUrl: CONFIG.BASE_URL,
		devUrl: CONFIG.DEV_BASE_URL,
		prodUrl: CONFIG.PROD_BASE_URL,
		username: CONFIG.AUTH.USERNAME,
	});
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const nextEnv = (body.env || "").toLowerCase() as ApiEnvironment;

	if (nextEnv !== "dev" && nextEnv !== "prod") {
		return json(
			{
				success: false,
				error: "Môi trường không hợp lệ. Vui lòng chọn 'dev' hoặc 'prod'.",
			},
			{ status: 400 },
		);
	}

	const prevEnv = CONFIG.currentEnv;
	if (prevEnv !== nextEnv) {
		CONFIG.setEnv(nextEnv);
		// Revoke/clear token of previous environment
		syncPipeline.tokenManager.clear();
		syncPipeline.catalogManager.isLoaded = false;

		logger.info(
			"API:env",
			`Chuyển đổi môi trường từ [${prevEnv.toUpperCase()}] sang [${nextEnv.toUpperCase()}] -> Base URL: ${CONFIG.BASE_URL}`,
		);
	}

	return json({
		success: true,
		env: CONFIG.currentEnv,
		baseUrl: CONFIG.BASE_URL,
		devUrl: CONFIG.DEV_BASE_URL,
		prodUrl: CONFIG.PROD_BASE_URL,
		username: CONFIG.AUTH.USERNAME,
	});
};
