import { verifySession } from "$lib/server/auth.js";
import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async ({ cookies }) => {
	const authenticated = verifySession(cookies);
	return {
		authenticated,
	};
};
