// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { D1DatabaseLike } from "$lib/server/db.js";

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				DB?: D1DatabaseLike;
				KBTT_ENV?: string;
				APP_PASSWORD?: string;
				GOOGLE_SHEET_ID?: string;
				INGEST_API_KEY?: string;
				DEV_AUTH_USERNAME?: string;
				DEV_AUTH_PASSWORD?: string;
				PROD_AUTH_USERNAME?: string;
				PROD_AUTH_PASSWORD?: string;
				[key: string]: unknown;
			};
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches?: CacheStorage & { default: Cache };
		}
	}
}

export {};
