import { json, type RequestHandler } from '@sveltejs/kit';
import { GoogleSheetService, type SheetTabInfo } from '$lib/server/googleSheetService.js';
import { CONFIG } from '$lib/server/config.js';

export const GET: RequestHandler = async ({ url }) => {
  const sheetId = (url.searchParams.get('sheetId') || CONFIG.GOOGLE_SHEET_ID).trim();
  const gidParam = url.searchParams.get('gid');
  const action = url.searchParams.get('action');

  try {
    if (action === 'tabs') {
      const tabs = await GoogleSheetService.fetchPublicSheetTabs(sheetId);
      const closestTab = GoogleSheetService.findClosestTab(tabs);
      return json({ success: true, sheetId, tabs, defaultGid: closestTab?.gid || tabs[0]?.gid || '0' });
    }

    const tabs = await GoogleSheetService.fetchPublicSheetTabs(sheetId);
    let chosenTab = gidParam ? tabs.find((t: SheetTabInfo) => t.gid === gidParam) : null;
    if (!chosenTab) {
      chosenTab = GoogleSheetService.findClosestTab(tabs) || tabs[0];
    }

    const gid = chosenTab ? chosenTab.gid : '0';
    const csv = await GoogleSheetService.fetchPublicSheetCsv(sheetId, gid);
    const rows = GoogleSheetService.parseCsv(csv);

    return json({
      success: true,
      sheetId,
      tabs,
      selectedTab: chosenTab,
      totalRows: rows.length,
      rows,
    });
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, { status: 500 });
  }
};
