import { t as syncPipeline } from "../../../../chunks/syncPipeline.js";
import { json } from "@sveltejs/kit";
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
//#endregion
export { GET };
