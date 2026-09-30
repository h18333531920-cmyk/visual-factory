// 备用通道的「收费站」：DIY 前端在旧通道（本机隧道/备用地址）生成成功后调用这里，
// 把这一次生图补记成 vf_asset_events(event_type='imagegen') 的一行。
// 只接收最小信息（任务号/模型/入口/张数），不接收图片或提示词；账号由登录态确定，客户端无法冒充。
// 事件 id 用 uuid5(账号:任务号) 生成 —— 同一任务重复上报、或与服务器收据对账撞上时都不会重复计数。
import { json, getBearerToken, getUserFromToken, supabaseFetch, getSupabaseConfig } from '../_shared.js';

const NAMESPACE_HEX = 'aba1711c13954c03b0a4d69363b9bf74';
const MODEL_ALIASES = {
  'site-jimeng-lite': 'site-jimeng-lite',
  'site-jimeng-pro': 'site-jimeng-pro',
  'jimeng-image-5.0-lite': 'site-jimeng-lite',
  'jimeng-image-5.0-pro': 'site-jimeng-pro'
};
const ALLOWED_KINDS = ['diy', 'icons'];

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// 与服务器收据对账脚本使用同一套 uuid5（namespace + name）→ 两条通道对同一任务算出同一个事件 id
async function generationEventId(userId, taskId) {
  const ns = hexToBytes(NAMESPACE_HEX);
  const nameBytes = new TextEncoder().encode(userId + ':' + taskId);
  const buf = new Uint8Array(ns.length + nameBytes.length);
  buf.set(ns, 0);
  buf.set(nameBytes, ns.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', buf));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeModel(value) {
  const raw = String(value || '').trim();
  if (!raw) return { model: 'site-jimeng-unknown', label: '即梦（未知型号）' };
  const model = MODEL_ALIASES[raw] || raw;
  const label = model === 'site-jimeng-pro' ? '即梦 Pro' : (model === 'site-jimeng-lite' ? '即梦 Lite' : raw);
  return { model, label };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ error: 'methodNotAllowed' }, 405);
  const token = getBearerToken(request);
  if (!token) return json({ error: 'signInRequired' }, 401);
  const config = getSupabaseConfig(env);
  if (!config.serviceRoleKey) return json({ error: 'reportingNotConfigured' }, 503);

  let user;
  try {
    user = await getUserFromToken(env, token);
  } catch (error) {
    return json({ error: 'signInRequired', message: String(error && error.message || error) }, 401);
  }
  if (!user || !user.id) return json({ error: 'signInRequired' }, 401);

  let payload;
  try {
    payload = await request.json();
  } catch (_error) {
    return json({ error: 'invalidBody' }, 400);
  }
  const taskId = String(payload && payload.taskId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,96}$/.test(taskId)) return json({ error: 'invalidTaskId' }, 400);
  const kind = ALLOWED_KINDS.includes(String(payload.kind || '')) ? String(payload.kind) : 'diy';
  const { model, label } = normalizeModel(payload.model);
  const count = Math.max(1, Math.min(64, Number(payload.count) || 1));
  const origin = String(payload.origin || '').slice(0, 80);

  const row = {
    id: await generationEventId(user.id, taskId),
    actor_id: user.id,
    event_type: 'imagegen',
    created_at: new Date().toISOString(),
    meta: {
      job_id: taskId,
      model,
      model_label: label,
      kind,
      origin,
      count,
      channel: 'legacy-fallback',
      account_label: (user.user_metadata && user.user_metadata.display_name) || ''
    }
  };

  try {
    await supabaseFetch(env, '/rest/v1/vf_asset_events?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify([row])
    }, true);
  } catch (error) {
    return json({ error: 'reportFailed', message: String(error && error.message || error) }, 502);
  }
  return json({ ok: true, id: row.id, model, kind });
}
