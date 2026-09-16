import fs from "node:fs";
import path from "node:path";
//#region src/lib/server/config.ts
function loadEnv() {
	try {
		const envPath = path.resolve(process.cwd(), ".env");
		if (fs.existsSync(envPath)) fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith("#")) {
				const eqIdx = trimmed.indexOf("=");
				if (eqIdx > 0) {
					const key = trimmed.substring(0, eqIdx).trim();
					const val = trimmed.substring(eqIdx + 1).trim();
					if (key && !process.env[key]) process.env[key] = val;
				}
			}
		});
	} catch {}
}
loadEnv();
var CONFIG = {
	BASE_URL: process.env.KBTT_BASE_URL || "https://api-kbtt.ai-vlab.com",
	GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || "16jL7SkIkxrL4SAg6Xncuk55WVQaaQunVMOj0eLz3B9Q",
	GOOGLE_APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL || "",
	AUTH: {
		USERNAME: process.env.AUTH_USERNAME || "demo_tich_hop",
		PASSWORD: process.env.AUTH_PASSWORD || "Demo@#$12345",
		BASIC_AUTH: process.env.AUTH_BASIC_AUTH || "Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ",
		GRANT_TYPE: process.env.AUTH_GRANT_TYPE || "api_cslt"
	},
	ENDPOINTS: {
		TOKEN: "/authorization-service/oauth/token",
		REFRESH_TOKEN: "/authorization-service/oauth/refresh-token",
		REVOKE: "/authorization-service/oauth/revoke",
		DM_QUOC_TICH: "/cms-backend/public/dm-qt/3th/get-all",
		DM_TINH_TP: "/cms-backend/public/dm-tinh-tp/get-all",
		DM_PHUONG_XA: "/cms-backend/public/dm-phuong-xa",
		DM_LY_DO_CU_TRU: "/cms-backend/public/ly-do-cu-tru/get-all",
		DM_LOAI_GIAY_TO: "/cms-backend/public/loai-giay-to/get-all",
		DM_NOI_CU_TRU: "/cms-backend/public/noi-cu-tru/get-all",
		KBTT_FOREIGN: "/client-service/kbtt/kbtt-3th",
		KBTT_VIETNAM: "/client-service/kbtt-vn/kbtt-3th"
	},
	TOKEN_REFRESH_BUFFER_SECONDS: 60
};
//#endregion
export { CONFIG as t };
