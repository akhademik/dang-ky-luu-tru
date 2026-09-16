import { t as catalogManager } from "../../../../chunks/catalogManager.js";
import { json } from "@sveltejs/kit";
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
//#endregion
export { GET };
