import { json, type RequestHandler } from "@sveltejs/kit";
import { syncPipeline } from "$lib/server/syncPipeline.js";

export const GET: RequestHandler = async () => {
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
			noiCuTru: cm.noiCuTruList,
		},
	});
};
