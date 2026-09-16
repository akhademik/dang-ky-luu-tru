import { json, type RequestHandler } from '@sveltejs/kit';
import { tokenManager } from '$lib/server/tokenManager.js';

export const GET: RequestHandler = async () => {
  return json(tokenManager.getTokenStatus());
};

export const POST: RequestHandler = async ({ url }) => {
  const isRevoke = url.searchParams.get('action') === 'revoke';
  if (isRevoke) {
    const ok = await tokenManager.revokeToken();
    return json({ success: ok, message: 'Revoked' });
  }

  try {
    await tokenManager.login();
    return json({ success: true, ...tokenManager.getTokenStatus() });
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, { status: 500 });
  }
};
