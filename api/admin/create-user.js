const { json, requireAdmin, supabaseFetch } = require('../_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    json(res, 405, { success: false, message: 'Method not allowed' });
    return;
  }

  try {
    await requireAdmin(req);
    const { email, password, role, display_name } = req.body || {};

    if (!email || !password || !role) {
      json(res, 400, { success: false, message: 'email, password, and role are required' });
      return;
    }
    if (!['admin', 'designer', 'operator'].includes(role)) {
      json(res, 400, { success: false, message: 'Invalid role' });
      return;
    }

    const user = await supabaseFetch('/auth/v1/admin/users', {
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

    await supabaseFetch('/rest/v1/vf_profiles', {
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

    json(res, 200, { success: true, user: { id: user.id, email, role } });
  } catch (error) {
    json(res, 500, { success: false, message: error.message || 'Create user failed' });
  }
};
