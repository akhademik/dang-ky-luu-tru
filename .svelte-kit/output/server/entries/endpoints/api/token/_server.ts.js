import { t as syncPipeline } from "../../../../chunks/syncPipeline.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/token/+server.ts
var GET = async () => {
	return json(syncPipeline.tokenManager.getStatus());
};
var POST = async ({ url }) => {
	const action = url.searchParams.get("action") || "login";
	const tm = syncPipeline.tokenManager;
	if (action === "revoke") {
		const success = await tm.revoke();
		return json({ success });
	}
	if (action === "refresh") try {
		const token = await tm.refresh();
		return json({
			success: true,
			token
		});
	} catch (err) {
		return json({
			success: false,
			error: err.message
		}, { status: 400 });
	}
	try {
		const token = await tm.login();
		return json({
			success: true,
			token
		});
	} catch (err) {
		return json({
			success: false,
			error: err.message
		}, { status: 400 });
	}
};
//#endregion
export { GET, POST };
