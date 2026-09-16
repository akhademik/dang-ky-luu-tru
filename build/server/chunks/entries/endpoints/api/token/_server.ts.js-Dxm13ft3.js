import { s as syncPipeline } from '../../../../chunks/syncPipeline.js-Ur5OIb-G.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

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

export { GET, POST };
//# sourceMappingURL=_server.ts.js-Dxm13ft3.js.map
