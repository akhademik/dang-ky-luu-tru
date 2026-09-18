import type { PageServerLoad } from "./$types.js";
import { verifySession } from "$lib/server/auth.js";

export const load: PageServerLoad = async ({ cookies }) => {
	const authenticated = verifySession(cookies);
	return {
		authenticated,
	};
};
