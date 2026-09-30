const TOKEN_PREFIX = 'vfem';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const PREVIEW_AUTH_SECRET = 'gccdesign-preview-only-auth-secret-20260624';

const encoder = new TextEncoder();

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(String(value));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return base64UrlEncode(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

function accountConfig(env) {
  return [
    {
      id: 'emergency_admin',
      email: env.EMERGENCY_ADMIN_EMAIL || 'admin@visualfactory.app',
      password: env.EMERGENCY_ADMIN_PASSWORD,
      role: 'admin',
      display_name: 'Emergency Admin'
    },
    {
      id: 'emergency_designer',
      email: env.EMERGENCY_DESIGNER_EMAIL || 'designer@visualfactory.app',
      password: env.EMERGENCY_DESIGNER_PASSWORD,
      role: 'designer',
      display_name: 'Emergency Designer'
    },
    {
      id: 'emergency_operator',
      email: env.EMERGENCY_OPERATOR_EMAIL || 'operator@visualfactory.app',
      password: env.EMERGENCY_OPERATOR_PASSWORD,
      role: 'operator',
      display_name: 'Emergency Operator'
    }
  ];
}

function isPreviewHost(hostname = '') {
  const host = String(hostname || '').toLowerCase();
  return host.endsWith('.visual-factory.pages.dev') && host !== 'visual-factory.pages.dev';
}

export function findEmergencyAccount(env, email, password, hostname = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');
  if (isPreviewHost(hostname) && rawPassword === '123123') {
    return accountConfig(env).find(account => account.email.toLowerCase() === normalizedEmail) || null;
  }
  if (!env?.EMERGENCY_AUTH_SECRET) return null;
  return accountConfig(env).find(account => (
    account.password &&
    account.email.toLowerCase() === normalizedEmail &&
    account.password === rawPassword
  )) || null;
}

function getEmergencySecret(env) {
  return env?.EMERGENCY_AUTH_SECRET || PREVIEW_AUTH_SECRET;
}

export async function createEmergencyToken(env, account) {
  const secret = getEmergencySecret(env);
  if (!secret) throw new Error('Emergency auth is not configured.');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'gccdesign-emergency',
    sub: account.id,
    email: account.email,
    role: account.role,
    display_name: account.display_name,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmac(secret, encoded);
  return `${TOKEN_PREFIX}.${encoded}.${signature}`;
}

export async function verifyEmergencyToken(env, token) {
  const secret = getEmergencySecret(env);
  if (!secret || !String(token || '').startsWith(`${TOKEN_PREFIX}.`)) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [, encoded, signature] = parts;
  const expected = await hmac(secret, encoded);
  if (signature !== expected) return null;
  const payload = JSON.parse(base64UrlDecode(encoded));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    id: payload.sub,
    email: payload.email,
    user_metadata: {
      role: payload.role,
      display_name: payload.display_name
    },
    app_metadata: {
      emergency: true
    }
  };
}
