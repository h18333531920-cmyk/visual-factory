const crypto = require('crypto');

const COOKIE_NAME = 'vf_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payloadObj, secret) {
  const payload = b64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig !== expected) return null;
  let data = null;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (_) {
    return null;
  }
  if (!data || !data.exp || Date.now() > data.exp) return null;
  return data;
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1));
  });
  return out;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    secure ? 'Secure' : ''
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : ''
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function pickUserByRole(role) {
  const map = {
    admin: { id: 'u_admin_001', name: '视觉负责人', role: 'admin' },
    designer: { id: 'u_design_002', name: 'AI设计师-张三', role: 'designer' },
    viewer: { id: 'u_viewer_003', name: '营销运营-李四', role: 'viewer' }
  };
  return map[role] || null;
}

function checkRolePasscode(role, passcode) {
  const keyMap = {
    admin: process.env.ADMIN_PASSCODE,
    designer: process.env.DESIGNER_PASSCODE,
    viewer: process.env.VIEWER_PASSCODE
  };
  const expected = keyMap[role];
  if (!expected) return false;
  return String(passcode || '') === String(expected);
}

function createSessionUser(role) {
  const base = pickUserByRole(role);
  if (!base) return null;
  return {
    ...base,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  };
}

module.exports = {
  COOKIE_NAME,
  signPayload,
  verifyToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  checkRolePasscode,
  createSessionUser
};
