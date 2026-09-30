import {accountFeatures} from './_account-features.js';
// Server-owned account permissions. UI mode is never an authorization signal.
const encoder = new TextEncoder();
export const TEST_HOST = 'asset-gallery-test.visual-factory.pages.dev';
export const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export function accessEnvironment(request, env) {
  const host = new URL(request.url).hostname;
  if (host === TEST_HOST || (env.VF_ACCESS_LOCAL === '1' && ['localhost', '127.0.0.1'].includes(host))) return 'test';
  if (['gccdesign.app', 'visual-factory.pages.dev'].includes(host) && env.VF_ACCESS_PRODUCTION === '1') return 'production';
  throw fail('账号权限尚未在这个环境启用', 503);
}
export function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export async function bodyJson(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw fail('需要 JSON 请求', 415);
  if (Number(request.headers.get('content-length') || 0) > 16384) throw fail('请求过大', 413);
  const text = await limitedText(request,16384);
  try { const value = JSON.parse(text); if (!value || Array.isArray(value) || typeof value !== 'object') throw 0; return value; } catch { throw fail('请求格式错误'); }
}
export async function limitedText(request,limit) {
  if(!request.body)return '';
  const reader=request.body.getReader(),decoder=new TextDecoder();let bytes=0,text='';
  try { for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw fail('请求过大',413);}text+=decoder.decode(value,{stream:true});}return text+decoder.decode(); }
  finally { reader.releaseLock(); }
}
export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 6 || value.length > 128) throw fail('密码须为 6–128 个字符');
  return value;
}
export const hex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256));
}
function equal(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
export function dbFor(env) { if (!env.VF_ACCESS_DB) throw fail('账号管理服务尚未配置', 503); return env.VF_ACCESS_DB; }
export function configFor(env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw fail('账号管理服务尚未配置', 503);
  return { url: env.SUPABASE_URL || 'https://juuqvjmhzdgfggzrivbb.supabase.co', key: env.SUPABASE_SERVICE_ROLE_KEY, anon: env.SUPABASE_ANON_KEY || 'sb_publishable_PIa3V0LGlOn1K6G1nBUeqw_kiFB6fjt' };
}
export async function authFetch(env, path, options = {}, fetcher = fetch) {
  const config = configFor(env);
  const response = await fetcher(config.url + '/auth/v1/' + path, { ...options, signal: options.signal || AbortSignal.timeout(15000), headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', ...options.headers }, redirect: 'manual' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 422 || response.status === 409) throw fail('账号已存在，或账号信息不符合要求', 409);
    throw fail('账号服务暂时不可用，请稍后重试', 502);
  }
  return data;
}
export async function verifiedUser(request, env, fetcher = fetch) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]{1,8192})$/)?.[1];
  if (!token || token.startsWith('vfem.')) throw fail('请先登录主站账号', 401);
  const config = configFor(env);
  const response = await fetcher(config.url + '/auth/v1/user', { headers: { apikey: config.anon, Authorization: `Bearer ${token}` }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (response.status === 401 || response.status === 403) throw fail('登录已失效，请重新登录', 401);
  if (!response.ok) throw fail('登录服务暂时不可用', 503);
  const user = await response.json(); if (!/^[a-f\d-]{36}$/i.test(user?.id || '')) throw fail('登录已失效', 401);
  return user;
}
export async function accountFor(db, user) {
  const row = await db.prepare('SELECT a.*,f.features_json FROM vf_accounts a LEFT JOIN vf_account_features f ON f.user_id=a.user_id WHERE a.user_id = ?').bind(user.id).first();
  // Existing accounts start with DIY access; do not change their Supabase role,
  // password, identity or existing production session during the test rollout.
  return row || { user_id: user.id, email: user.email || '', display_name: user.user_metadata?.display_name || user.email || '', product: 'diy', status: 'active', revision: 'legacy', legacy: true };
}
export async function maintenanceFor(db, request, user, now = Date.now()) {
  const token = request.headers.get('x-vf-maintenance') || '';
  if (!/^[a-f\d]{64}$/.test(token)) return null;
  return db.prepare('SELECT s.expires_at FROM vf_maintenance_sessions s JOIN vf_access_config c ON c.id = 1 AND c.revision = s.revision WHERE s.token_hash = ? AND s.user_id = ? AND s.expires_at > ?').bind(await digest(token), user.id, now).first();
}
export async function accessContext(request, env, fetcher = fetch) {
  const environment = accessEnvironment(request, env), db = dbFor(env), user = await verifiedUser(request, env, fetcher);
  const account = await accountFor(db, user);
  // role='admin' 的账号拥有常驻维护权限，不依赖一次性维护会话；
  // 其余账号仍走 1 小时开发者密码会话。
  const maintenance = account.status === 'active' ? (account.role === 'admin' ? { role: 'admin', expires_at: 0 } : await maintenanceFor(db, request, user)) : null;
  const config = await db.prepare('SELECT password_hash IS NOT NULL AS configured FROM vf_access_config WHERE id = 1').first();
  return { environment, db, user, account, maintenance, configured: !!config?.configured };
}
export function publicAccess(ctx) {
  const active = ctx.account.status === 'active';
  const product = ctx.account.product;
  const features = accountFeatures(ctx.account);
  return { userId: ctx.user.id, email: ctx.account.email, displayName: ctx.account.display_name, product, features, status: ctx.account.status, environment: ctx.environment, maintenance: !!ctx.maintenance, maintenanceExpiresAt: ctx.maintenance?.expires_at || 0, setupRequired: !ctx.configured, role: ctx.account.role === 'admin' ? 'admin' : 'user', permissions: { diy: active && (!!ctx.maintenance || features.includes('static')), icons: active && (!!ctx.maintenance || features.includes('icons')), manage: active && !!ctx.maintenance }, revision: ctx.account.revision };
}
export function requireMaintenance(ctx) { if (!ctx.maintenance || ctx.account.status !== 'active') throw fail('请先验证开发者密码', 403); }
export async function rateLimit(ctx, request) {
  const minute = Math.floor(Date.now() / 60000);
  const ip = request.headers.get('cf-connecting-ip') || ctx.user.id;
  for (const subject of [ctx.user.id, ip]) {
    const key = await digest(subject + ':' + minute);
    const row = await ctx.db.prepare('INSERT INTO vf_access_attempts (bucket, tries, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET tries = tries + 1 RETURNING tries').bind(key, Date.now() + 120000).first();
    if (row.tries > 6) throw fail('尝试次数过多，请一分钟后再试', 429);
  }
  await ctx.db.prepare('DELETE FROM vf_access_attempts WHERE expires_at < ?').bind(Date.now()).run();
}
export async function issueMaintenance(ctx) {
  const token = randomToken(), expires = Date.now() + 60 * 60 * 1000;
  const config = await ctx.db.prepare('SELECT revision FROM vf_access_config WHERE id = 1').first();
  await ctx.db.batch([
    ctx.db.prepare('DELETE FROM vf_maintenance_sessions WHERE expires_at < ?').bind(Date.now()),
    ctx.db.prepare('INSERT INTO vf_maintenance_sessions(token_hash,user_id,expires_at,revision) VALUES(?,?,?,?)').bind(await digest(token), ctx.user.id, expires, config.revision)
  ]);
  return { token, expiresAt: expires };
}
export async function handleAccess(request, env, fetcher = fetch) {
  try {
    const ctx = await accessContext(request, env, fetcher);
    if (request.method === 'GET') return reply(publicAccess(ctx));
    if (request.headers.get('origin') !== new URL(request.url).origin) throw fail('不允许跨站操作', 403);
    if (request.method !== 'POST') throw fail('请求方法不支持', 405);
    const input = await bodyJson(request);
    if (input.action === 'lock') {
      const token = request.headers.get('x-vf-maintenance') || '';
      await ctx.db.prepare('DELETE FROM vf_maintenance_sessions WHERE token_hash = ? AND user_id = ?').bind(await digest(token), ctx.user.id).run();
      return reply({ success: true });
    }
    if (ctx.account.status !== 'active') throw fail('此账号已停用', 403);
    if (input.action === 'setup' || input.action === 'unlock') {
      await rateLimit(ctx, request);
      const config = await ctx.db.prepare('SELECT * FROM vf_access_config WHERE id = 1').first();
      if (!config) throw fail('请由维护者配置私有设置入口', 503);
      if (input.action === 'setup') {
        validatePassword(input.password);
        if (config.password_hash || !config.bootstrap_hash || config.bootstrap_expires < Date.now() || !equal(config.bootstrap_hash, await digest(String(input.bootstrap || '')))) throw fail('设置入口已失效', 403);
        const salt = randomToken(), hash = await passwordHash(input.password, salt);
        const result = await ctx.db.prepare('UPDATE vf_access_config SET password_hash=?,salt=?,revision=?,bootstrap_hash=NULL,bootstrap_expires=NULL WHERE id=1 AND password_hash IS NULL AND bootstrap_hash=?').bind(hash, salt, randomToken(), config.bootstrap_hash).run();
        if (!result.meta.changes) throw fail('设置入口已使用', 409);
      } else {
        if (!config.password_hash) throw fail('请先设置开发者密码', 409);
        if (typeof input.password !== 'string' || input.password.length > 128 || !equal(config.password_hash, await passwordHash(input.password, config.salt))) throw fail('开发者密码不正确', 403);
      }
      return reply({ success: true, ...await issueMaintenance(ctx) });
    }
    if (input.action === 'change-password') {
      requireMaintenance(ctx); validatePassword(input.password);
      const salt = randomToken(), hash = await passwordHash(input.password, salt);
      await ctx.db.batch([
        ctx.db.prepare('UPDATE vf_access_config SET password_hash=?,salt=?,revision=? WHERE id=1').bind(hash, salt, randomToken()),
        ctx.db.prepare('DELETE FROM vf_maintenance_sessions')
      ]);
      return reply({ success: true, ...await issueMaintenance(ctx) });
    }
    throw fail('操作不支持');
  } catch (error) { if (!error.status) console.warn('account-access-internal', String(error.name), String(error.stack || '').split('\n').slice(1,4).join('\n')); return reply({ error: error.status ? error.message : '服务暂时不可用，请稍后重试' }, error.status || 503); }
}
