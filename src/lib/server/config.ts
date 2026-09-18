// Tự động nạp file .env và cấu hình DNS IPv4 trong môi trường Node.js (không bundle node:fs trên Cloudflare Edge)
if (
	typeof process !== "undefined" &&
	typeof process.getBuiltinModule === "function"
) {
	try {
		const dns = process.getBuiltinModule("node:dns") as {
			setDefaultResultOrder?: (order: "ipv4first" | "verbatim") => void;
		};
		if (dns && typeof dns.setDefaultResultOrder === "function") {
			dns.setDefaultResultOrder("ipv4first");
		}

		const net = process.getBuiltinModule("node:net") as {
			setDefaultAutoSelectFamily?: (val: boolean) => void;
		};
		if (net && typeof net.setDefaultAutoSelectFamily === "function") {
			net.setDefaultAutoSelectFamily(false);
		}

		const fs = process.getBuiltinModule("node:fs") as {
			existsSync: (p: string) => boolean;
			readFileSync: (p: string, enc: string) => string;
		};
		const path = process.getBuiltinModule("node:path") as {
			resolve: (...args: string[]) => string;
		};
		if (fs && path) {
			const envPath = path.resolve(process.cwd(), ".env");
			if (fs.existsSync(envPath)) {
				const content = fs.readFileSync(envPath, "utf8");
				for (const line of content.split("\n")) {
					const trimmed = line.trim();
					if (trimmed && !trimmed.startsWith("#")) {
						const eqIdx = trimmed.indexOf("=");
						if (eqIdx > 0) {
							const key = trimmed.substring(0, eqIdx).trim();
							const val = trimmed.substring(eqIdx + 1).trim();
							if (key && !process.env[key]) {
								process.env[key] = val;
							}
						}
					}
				}
			}
		}
	} catch {}
}

export type ApiEnvironment = "dev" | "prod";

const DEV_BASE_URL =
	(typeof process !== "undefined" && process.env?.KBTT_DEV_BASE_URL) ||
	(typeof process !== "undefined" &&
	process.env?.KBTT_BASE_URL &&
	!process.env.KBTT_BASE_URL.includes("bocongan.gov.vn")
		? process.env.KBTT_BASE_URL
		: "https://api-kbtt.ai-vlab.com");

const PROD_BASE_URL =
	(typeof process !== "undefined" && process.env?.KBTT_PROD_BASE_URL) ||
	(typeof process !== "undefined" &&
	process.env?.KBTT_BASE_URL?.includes("bocongan.gov.vn")
		? process.env.KBTT_BASE_URL
		: "https://api-tbltkbtt.bocongan.gov.vn");

let currentEnv: ApiEnvironment =
	(typeof process !== "undefined" &&
		(process.env?.KBTT_ENV as ApiEnvironment)) ||
	(typeof process !== "undefined" &&
	process.env?.KBTT_BASE_URL?.includes("bocongan.gov.vn")
		? "prod"
		: "dev");

const APP_PASSWORD =
	(typeof process !== "undefined" && process.env?.APP_PASSWORD) || "";

export const CONFIG = {
	DEV_BASE_URL,
	PROD_BASE_URL,
	APP_PASSWORD,
	get isProdMode(): boolean {
		return currentEnv === "prod";
	},
	get currentEnv(): ApiEnvironment {
		return currentEnv;
	},
	get BASE_URL(): string {
		return currentEnv === "prod" ? PROD_BASE_URL : DEV_BASE_URL;
	},
	setEnv(env: ApiEnvironment) {
		if (env === "dev" || env === "prod") {
			currentEnv = env;
		}
	},
	GOOGLE_SHEET_ID:
		(typeof process !== "undefined" && process.env?.GOOGLE_SHEET_ID) || "",
	GOOGLE_APPS_SCRIPT_URL:
		(typeof process !== "undefined" && process.env?.GOOGLE_APPS_SCRIPT_URL) ||
		"",
	INGEST_API_KEY:
		(typeof process !== "undefined" &&
			(process.env?.INGEST_API_KEY || process.env?.WEBHOOK_SECRET)) ||
		"",
	get AUTH() {
		if (currentEnv === "prod") {
			return {
				USERNAME:
					(typeof process !== "undefined" &&
						(process.env?.PROD_AUTH_USERNAME || process.env?.AUTH_USERNAME)) ||
					"",
				PASSWORD:
					(typeof process !== "undefined" &&
						(process.env?.PROD_AUTH_PASSWORD || process.env?.AUTH_PASSWORD)) ||
					"",
				BASIC_AUTH:
					(typeof process !== "undefined" &&
						(process.env?.PROD_AUTH_BASIC_AUTH ||
							process.env?.AUTH_BASIC_AUTH)) ||
					"",
				GRANT_TYPE:
					(typeof process !== "undefined" &&
						(process.env?.PROD_AUTH_GRANT_TYPE ||
							process.env?.AUTH_GRANT_TYPE)) ||
					"api_cslt",
			};
		}
		return {
			USERNAME:
				(typeof process !== "undefined" &&
					(process.env?.DEV_AUTH_USERNAME || process.env?.AUTH_USERNAME)) ||
				"demo_tich_hop",
			PASSWORD:
				(typeof process !== "undefined" &&
					(process.env?.DEV_AUTH_PASSWORD || process.env?.AUTH_PASSWORD)) ||
				"Demo@#$12345",
			BASIC_AUTH:
				(typeof process !== "undefined" &&
					(process.env?.DEV_AUTH_BASIC_AUTH || process.env?.AUTH_BASIC_AUTH)) ||
				"Basic QVBJX0NTTFQ6aTJuVnhCZEdGcjdqMTNkT3FJ",
			GRANT_TYPE:
				(typeof process !== "undefined" &&
					(process.env?.DEV_AUTH_GRANT_TYPE || process.env?.AUTH_GRANT_TYPE)) ||
				"api_cslt",
		};
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
		KBTT_VIETNAM: "/client-service/kbtt-vn/kbtt-3th",
		DOI_NGAY_TRA_PHONG: "/client-service/kbtt-vn/kbtt-3th/doi-ngay-tra-phong",
	},
	TOKEN_REFRESH_BUFFER_SECONDS: 60,
};
