/**
 * 即梦 sessionid 共享存储 — Cloudflare Pages Function
 *
 * POST → 你的扩展自动上传最新 sessionid（需密钥验证）
 * GET  → DIY 前端一键获取 sessionid（公开）
 */

const SECRET_KEY = 'vf-jimeng-sync-2026';
const KV_KEY = 'jimeng_sessionid';

export async function onRequest({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: corsHeaders });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // GET — 公开获取最新 sessionid
  if (request.method === 'GET') {
    try {
      const data = await env.VF_KV.get(KV_KEY, 'json');
      if (!data || !data.sessionid) {
        return json({ found: false, message: '暂无可用 sessionid，请等待管理员同步' });
      }
      return json({
        found: true,
        sessionid: data.sessionid,
        cookies: data.cookies || {},
        candidates: data.candidates || [],
        updatedAt: data.updatedAt,
      });
    } catch (e) {
      return json({ found: false, message: '读取失败：' + e.message }, 500);
    }
  }

  // POST — 上传 sessionid（需密钥）
  if (request.method === 'POST') {
    const auth = request.headers.get('Authorization') || '';
    if (auth !== `Bearer ${SECRET_KEY}`) {
      return json({ success: false, message: '密钥错误' }, 403);
    }

    try {
      const body = await request.json().catch(() => ({}));
      const sessionid = (body.sessionid || '').trim();
      if (!sessionid) {
        return json({ success: false, message: '缺少 sessionid' }, 400);
      }

      await env.VF_KV.put(KV_KEY, JSON.stringify({
        sessionid,
        cookies: (body.cookies && typeof body.cookies === 'object') ? body.cookies : {},
        candidates: Array.isArray(body.candidates) ? body.candidates : [],
        updatedAt: new Date().toISOString(),
      }));

      return json({ success: true, message: 'sessionid 已同步' });
    } catch (e) {
      return json({ success: false, message: '保存失败：' + e.message }, 500);
    }
  }

  return json({ message: 'Method not allowed' }, 405);
}
