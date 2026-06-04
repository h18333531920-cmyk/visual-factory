const DEFAULT_SUPABASE_URL = 'https://juuqvjmhzdgfggzrivbb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_PIa3V0LGlOn1K6G1nBUeqw_kiFB6fjt';

export function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export function envValue(env, key, fallback = '') {
  return env?.[key] || fallback;
}

export function requireCloudflareEnv(env) {
  const missing = [];
  if (!envValue(env, 'SUPABASE_SERVICE_ROLE_KEY')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
}

export function getSupabaseConfig(env) {
  return {
    url: envValue(env, 'SUPABASE_URL', DEFAULT_SUPABASE_URL),
    anonKey: envValue(env, 'SUPABASE_ANON_KEY', DEFAULT_SUPABASE_ANON_KEY),
    serviceRoleKey: envValue(env, 'SUPABASE_SERVICE_ROLE_KEY')
  };
}

export function getBearerToken(request) {
  const raw = request.headers.get('Authorization') || '';
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

export async function supabaseFetch(env, path, options = {}, serviceRole = false) {
  const config = getSupabaseConfig(env);
  const key = serviceRole ? config.serviceRoleKey : config.anonKey;
  const response = await fetch(`${config.url}${path}`, {
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

export async function getUserFromToken(env, token) {
  if (!token) throw new Error('Missing bearer token');
  const config = getSupabaseConfig(env);
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.message || 'Invalid session');
  return data;
}

export async function requireAdmin(request, env) {
  requireCloudflareEnv(env);
  const token = getBearerToken(request);
  const user = await getUserFromToken(env, token);
  const profiles = await supabaseFetch(env, `/rest/v1/vf_profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, {
    method: 'GET',
    headers: { Prefer: 'return=representation' }
  }, true);
  const role = profiles?.[0]?.role;
  if (role !== 'admin') throw new Error('Admin permission required');
  return user;
}
