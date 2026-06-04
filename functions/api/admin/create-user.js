import { json, requireAdmin, supabaseFetch } from '../../_shared.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    await requireAdmin(request, env);
    const { email, password, role, display_name } = await request.json();

    if (!email || !password || !role) {
      return json({ success: false, message: 'email, password, and role are required' }, 400);
    }
    if (!['admin', 'designer', 'operator'].includes(role)) {
      return json({ success: false, message: 'Invalid role' }, 400);
    }

    const user = await supabaseFetch(env, '/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          display_name: display_name || email.split('@')[0]
        }
      })
    }, true);

    await supabaseFetch(env, '/rest/v1/vf_profiles', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: user.id,
        email,
        display_name: display_name || email.split('@')[0],
        role,
        status: 'active'
      })
    }, true);

    return json({ success: true, user: { id: user.id, email, role } });
  } catch (error) {
    return json({ success: false, message: error.message || 'Create user failed' }, 500);
  }
}
