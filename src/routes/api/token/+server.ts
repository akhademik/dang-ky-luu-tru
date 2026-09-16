import { json, type RequestHandler } from '@sveltejs/kit';
import { syncPipeline } from '$lib/server/syncPipeline.js';

export const GET: RequestHandler = async () => {
  return json(syncPipeline.tokenManager.getStatus());
};

export const POST: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action') || 'login';
  const tm = syncPipeline.tokenManager;

  if (action === 'revoke') {
    const success = await tm.revoke();
    return json({ success });
  }

  if (action === 'refresh') {
    try {
      const token = await tm.refresh();
      return json({ success: true, token });
    } catch (err) {
      return json({ success: false, error: (err as Error).message }, { status: 400 });
    }
  }

  try {
    const token = await tm.login();
    return json({ success: true, token });
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, { status: 400 });
  }
};
