import { json, type RequestHandler } from '@sveltejs/kit';
import { GoogleSheetService } from '$lib/server/googleSheetService.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { sheetId, gid, sheetName, rowIndex, row } = body;

    const result = await GoogleSheetService.updateRowViaAppsScript({
      sheetId,
      gid,
      sheetName,
      rowIndex,
      row,
    });

    return json(result);
  } catch (err) {
    return json({ success: false, message: (err as Error).message }, { status: 500 });
  }
};
