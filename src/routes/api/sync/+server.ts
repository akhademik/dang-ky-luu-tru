import { json, type RequestHandler } from '@sveltejs/kit';
import { SyncPipeline } from '$lib/server/syncPipeline.js';
import { catalogManager } from '$lib/server/catalogManager.js';
import type { RawOcrRow } from '$lib/server/dataTransformer.js';

export const POST: RequestHandler = async ({ request }) => {
  await catalogManager.initialize();
  try {
    const body = await request.json();
    const rows: RawOcrRow[] = body.rows || [];

    if (rows.length === 0) {
      return json({ success: false, message: 'Danh sách bản ghi trống' }, { status: 400 });
    }

    const results = await SyncPipeline.processAndSyncRows(rows);
    return json({ success: true, count: results.length, results });
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, { status: 500 });
  }
};
