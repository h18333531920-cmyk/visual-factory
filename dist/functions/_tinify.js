const KV_KEY = 'tinify_api_key_pool_v1';
const MAX_KEYS = 20;

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function encryptionKey(env) {
  const secret = String(env?.TINIFY_KEY_ENCRYPTION_SECRET || env?.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!secret) throw new Error('Server-side key encryption is not configured.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`vf:tinify-key-pool:${secret}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptValue(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(env),
    new TextEncoder().encode(value)
  );
  return { iv: bytesToBase64(iv), cipher: bytesToBase64(new Uint8Array(cipher)) };
}

async function decryptValue(env, record) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(record.iv) },
    await encryptionKey(env),
    base64ToBytes(record.cipher)
  );
  return new TextDecoder().decode(plain);
}

function requireKV(env) {
  if (!env?.VF_KV) throw new Error('VF_KV is not configured.');
}

async function loadPoolRecord(env) {
  requireKV(env);
  const stored = await env.VF_KV.get(KV_KEY, 'json');
  return {
    version: 1,
    cursor: Math.max(0, Number(stored?.cursor) || 0),
    keys: Array.isArray(stored?.keys) ? stored.keys : []
  };
}

async function savePoolRecord(env, pool) {
  requireKV(env);
  await env.VF_KV.put(KV_KEY, JSON.stringify({
    version: 1,
    cursor: Math.max(0, Number(pool.cursor) || 0),
    keys: Array.isArray(pool.keys) ? pool.keys : []
  }));
}

function keyHint(value) {
  const key = String(value || '').trim();
  if (key.length < 9) return '•'.repeat(Math.max(4, key.length));
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export async function listTinifyKeys(env) {
  const pool = await loadPoolRecord(env);
  const count = pool.keys.length;
  return pool.keys.map((record, index) => ({
    id: record.id,
    hint: record.hint,
    createdAt: record.createdAt,
    active: count > 0 && index === (pool.cursor % count)
  }));
}

export async function addTinifyKey(env, rawKey) {
  const value = String(rawKey || '').trim();
  if (!/^[A-Za-z0-9_-]{20,120}$/.test(value)) throw new Error('TinyPNG API key format is invalid.');
  const pool = await loadPoolRecord(env);
  if (pool.keys.length >= MAX_KEYS) throw new Error(`A maximum of ${MAX_KEYS} keys can be stored.`);
  for (const record of pool.keys) {
    if (await decryptValue(env, record) === value) throw new Error('This TinyPNG API key already exists.');
  }
  const encrypted = await encryptValue(env, value);
  pool.keys.push({
    id: crypto.randomUUID(),
    hint: keyHint(value),
    createdAt: new Date().toISOString(),
    ...encrypted
  });
  await savePoolRecord(env, pool);
  return listTinifyKeys(env);
}

export async function removeTinifyKey(env, id) {
  const pool = await loadPoolRecord(env);
  const nextKeys = pool.keys.filter(record => record.id !== id);
  if (nextKeys.length === pool.keys.length) throw new Error('TinyPNG API key was not found.');
  pool.keys = nextKeys;
  pool.cursor = nextKeys.length ? pool.cursor % nextKeys.length : 0;
  await savePoolRecord(env, pool);
  return listTinifyKeys(env);
}

export async function getTinifyKeyCandidates(env) {
  const pool = await loadPoolRecord(env);
  const count = pool.keys.length;
  if (!count) return [];
  const start = pool.cursor % count;
  const ordered = [];
  for (let offset = 0; offset < count; offset += 1) {
    const index = (start + offset) % count;
    const record = pool.keys[index];
    ordered.push({ id: record.id, index, key: await decryptValue(env, record) });
  }
  return ordered;
}

export async function setTinifyCursor(env, index) {
  const pool = await loadPoolRecord(env);
  pool.cursor = pool.keys.length ? Math.max(0, Number(index) || 0) % pool.keys.length : 0;
  await savePoolRecord(env, pool);
}
