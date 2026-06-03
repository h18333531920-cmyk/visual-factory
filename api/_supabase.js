const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, payload) {
  res.status(status).json(payload);
}

function getBearerToken(req) {
  const raw = req.headers.authorization || '';
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function requireEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
}

async function supabaseFetch(path, options = {}, serviceRole = false) {
  const key = serviceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = text;
  }
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || text || `Supabase ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function getUserFromToken(token) {
  if (!token) throw new Error('Missing bearer token');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || 'Invalid session');
  return data;
}

async function requireAdmin(req) {
  requireEnv();
  const token = getBearerToken(req);
  const user = await getUserFromToken(token);
  const profiles = await supabaseFetch(`/rest/v1/vf_profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, {
    method: 'GET',
    headers: { Prefer: 'return=representation' }
  }, true);
  const role = profiles?.[0]?.role;
  if (role !== 'admin') throw new Error('Admin permission required');
  return user;
}

module.exports = {
  json,
  requireAdmin,
  getBearerToken,
  getUserFromToken,
  supabaseFetch,
  requireEnv,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY
};
