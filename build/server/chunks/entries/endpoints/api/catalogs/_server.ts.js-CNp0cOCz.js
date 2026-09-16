import { c as catalogManager } from '../../../../chunks/catalogManager.js-DZ1-_TLD.js';
import { j as json } from '../../../../chunks/utils.js-EuaxTqSG.js';
import '../../../../chunks/config.js-MrK2uMye.js';
import 'node:fs';
import 'node:path';
import '../../../../chunks/shared.js-COfHpg1F.js';
import '../../../../chunks/uneval.js-DaakSYFQ.js';

//#region src/routes/api/catalogs/+server.ts
var GET = async () => {
	await catalogManager.initialize();
	const catalogs = {
		quocTich: catalogManager.getQuocTichList(),
		tinhTp: catalogManager.getTinhTpList(),
		lyDoCuTru: catalogManager.getLyDoCuTruList(),
		loaiGiayTo: catalogManager.getLoaiGiayToList(),
		noiCuTru: catalogManager.getNoiCuTruList()
	};
	return json({
		success: true,
		quocTichCount: catalogs.quocTich.length,
		tinhTpCount: catalogs.tinhTp.length,
		catalogs
	});
};

export { GET };
//# sourceMappingURL=_server.ts.js-CNp0cOCz.js.map
