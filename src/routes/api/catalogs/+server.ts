import { json, type RequestHandler } from '@sveltejs/kit';
import { catalogManager } from '$lib/server/catalogManager.js';

export const GET: RequestHandler = async () => {
  await catalogManager.initialize();
  const catalogs = {
    quocTich: catalogManager.getQuocTichList(),
    tinhTp: catalogManager.getTinhTpList(),
    lyDoCuTru: catalogManager.getLyDoCuTruList(),
    loaiGiayTo: catalogManager.getLoaiGiayToList(),
    noiCuTru: catalogManager.getNoiCuTruList(),
  };

  return json({
    success: true,
    quocTichCount: catalogs.quocTich.length,
    tinhTpCount: catalogs.tinhTp.length,
    catalogs,
  });
};
