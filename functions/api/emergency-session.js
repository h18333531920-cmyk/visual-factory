import { json } from '../_shared.js';
import { verifyEmergencyToken } from '../_emergency-auth.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await verifyEmergencyToken(env, token);
  if (!user) {
    return json({ success: false, message: 'Invalid emergency session' }, 401);
  }

  return json({
    success: true,
    profile: {
      id: user.id,
      email: user.email || '',
      display_name: user.user_metadata?.display_name || user.email || 'Emergency User',
      role: user.user_metadata?.role || 'operator',
      emergency: true
    }
  });
}
