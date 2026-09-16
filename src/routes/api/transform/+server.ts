import { json, type RequestHandler } from '@sveltejs/kit';
import { DataTransformer, type RawOcrRow } from '$lib/server/dataTransformer.js';
import { catalogManager } from '$lib/server/catalogManager.js';

export const POST: RequestHandler = async ({ request }) => {
  await catalogManager.initialize();
  try {
    const body = await request.json();
    const rows: RawOcrRow[] = body.rows || [];

    const vnPayloads: Array<{ originalIndex: number; payload: unknown }> = [];
    const foreignPayloads: Array<{ originalIndex: number; payload: unknown }> = [];
    const completenessList: Array<{ index: number; completeness: unknown }> = [];

    rows.forEach((row, idx) => {
      const completeness = DataTransformer.checkCompleteness(row);
      completenessList.push({ index: idx, completeness });

      if (DataTransformer.isGuestVN(row)) {
        vnPayloads.push({
          originalIndex: idx,
          payload: DataTransformer.transformToPayloadVn(row),
        });
      } else {
        foreignPayloads.push({
          originalIndex: idx,
          payload: DataTransformer.transformToPayloadForeign(row),
        });
      }
    });

    return json({
      success: true,
      totalRows: rows.length,
      vnPayloads,
      foreignPayloads,
      completenessList,
    });
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, { status: 500 });
  }
};
