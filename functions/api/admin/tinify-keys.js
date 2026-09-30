import { json, requireAdmin } from '../../_shared.js';
import { addTinifyKey, listTinifyKeys, removeTinifyKey } from '../../_tinify.js';

export async function onRequest({ request, env }) {
  try {
    await requireAdmin(request, env);

    if (request.method === 'GET') {
      return json({ success: true, keys: await listTinifyKeys(env) });
    }
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      return json({ success: true, keys: await addTinifyKey(env, body.key) });
    }
    if (request.method === 'DELETE') {
      const body = await request.json().catch(() => ({}));
      return json({ success: true, keys: await removeTinifyKey(env, body.id) });
    }
    return json({ success: false, message: 'Method not allowed' }, 405);
  } catch (error) {
    const message = error?.message || 'TinyPNG key management failed.';
    const status = /Unauthorized|Invalid session|Missing bearer/i.test(message) ? 401
      : /Admin permission required/i.test(message) ? 403
        : /not found/i.test(message) ? 404 : 400;
    return json({ success: false, message }, status);
  }
}
