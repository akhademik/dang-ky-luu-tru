import { t as tokenManager } from '../../../../chunks/tokenManager.js-Ch4CH6Dv.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import '../../../../chunks/config.js-MrK2uMye.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

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

export { GET, POST };
//# sourceMappingURL=_server.ts.js-MwgOZYnO.js.map
