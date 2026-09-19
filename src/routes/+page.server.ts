import { verifySession } from "../lib/server/auth.js";
import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async ({ cookies, platform }) => {
	const authenticated = await verifySession(cookies, platform);
	return {
		authenticated,
	};
};
