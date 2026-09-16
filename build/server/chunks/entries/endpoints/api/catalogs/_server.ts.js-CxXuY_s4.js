import { s as syncPipeline } from '../../../../chunks/syncPipeline.js-Ur5OIb-G.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/catalogs/+server.ts
var GET = async () => {
	await syncPipeline.initialize();
	const cm = syncPipeline.catalogManager;
	return json({
		quocTichCount: cm.quocTichList.length,
		tinhTpCount: cm.tinhTpList.length,
		lyDoCuTruCount: cm.lyDoCuTruList.length,
		loaiGiayToCount: cm.loaiGiayToList.length,
		noiCuTruCount: cm.noiCuTruList.length,
		catalogs: {
			quocTich: cm.quocTichList,
			tinhTp: cm.tinhTpList,
			lyDoCuTru: cm.lyDoCuTruList,
			loaiGiayTo: cm.loaiGiayToList,
			noiCuTru: cm.noiCuTruList
		}
	});
};

export { GET };
//# sourceMappingURL=_server.ts.js-CxXuY_s4.js.map
