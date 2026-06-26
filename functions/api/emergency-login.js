import { json } from '../_shared.js';
import { createEmergencyToken, findEmergencyAccount } from '../_emergency-auth.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const hostname = new URL(request.url).hostname;
    const account = findEmergencyAccount(env, body.email, body.password, hostname);
    if (!account) {
      return json({ success: false, message: '账号或密码不正确，且 Supabase 当前不可用。' }, 401);
    }
    const token = await createEmergencyToken(env, account);
    return json({
      success: true,
      token,
      profile: {
        id: account.id,
        email: account.email,
        display_name: account.display_name,
        role: account.role,
        emergency: true
      }
    });
  } catch (error) {
    return json({ success: false, message: error.message || '应急登录失败。' }, 500);
  }
}
