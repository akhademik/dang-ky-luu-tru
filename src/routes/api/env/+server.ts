import { json, type RequestHandler } from "@sveltejs/kit";
import { type ApiEnvironment, CONFIG } from "../../../lib/server/config.js";
import { logger } from "../../../lib/server/logger.js";
import { syncPipeline } from "../../../lib/server/syncPipeline.js";

function getDeployEnv(platform?: App.Platform): "dev" | "prod" {
	const env = (platform?.env || {}) as Record<string, unknown>;
	const val = String(
		env.KBTT_ENV ||
			(typeof process !== "undefined" && process.env?.KBTT_ENV) ||
			"dev",
	)
		.toLowerCase()
		.trim();
	return val === "prod" ? "prod" : "dev";
}

export const GET: RequestHandler = async ({ platform }) => {
	const deployEnv = getDeployEnv(platform);
	const isProdFixed = deployEnv === "prod";

	return json({
		env: isProdFixed ? "prod" : CONFIG.currentEnv,
		deployEnv,
		isProdFixed,
		baseUrl: CONFIG.BASE_URL,
		devUrl: CONFIG.DEV_BASE_URL,
		prodUrl: CONFIG.PROD_BASE_URL,
		username: CONFIG.AUTH.USERNAME,
	});
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const deployEnv = getDeployEnv(platform);

	// If running in PROD mode, prevent switching environment
	if (deployEnv === "prod") {
		return json(
			{
				success: false,
				error:
					"Môi trường PRODUCTION đã được cố định, không thể chuyển đổi môi trường API.",
			},
			{ status: 403 },
		);
	}

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
		deployEnv: "dev",
		isProdFixed: false,
		baseUrl: CONFIG.BASE_URL,
		devUrl: CONFIG.DEV_BASE_URL,
		prodUrl: CONFIG.PROD_BASE_URL,
		username: CONFIG.AUTH.USERNAME,
	});
};
