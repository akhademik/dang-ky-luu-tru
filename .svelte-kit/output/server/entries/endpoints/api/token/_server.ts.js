import { t as tokenManager } from "../../../../chunks/tokenManager.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/token/+server.ts
var GET = async () => {
	return json(tokenManager.getTokenStatus());
};
var POST = async ({ url }) => {
	if (url.searchParams.get("action") === "revoke") {
		const ok = await tokenManager.revokeToken();
		return json({
			success: ok,
			message: "Revoked"
		});
	}
	try {
		await tokenManager.login();
		return json({
			success: true,
			...tokenManager.getTokenStatus()
		});
	} catch (err) {
		return json({
			success: false,
			error: err.message
		}, { status: 500 });
	}
};
//#endregion
export { GET, POST };
