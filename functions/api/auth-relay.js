// Supabase auth 中继：公司网络等环境会封锁 *.supabase.co 直连，导致 /auth/v1/ 登录、
// 刷新、登出全部失败（rest/storage 早已通过 /api/account-data 走服务端，不受影响）。
// 这里把少量匿名可用的 auth 端点原样转发给 Supabase，服务端在海外可正常访问。
// 白名单只放行登录会话必需的端点，不暴露任何管理类接口。
import { getSupabaseConfig, json } from '../_shared.js';

const ALLOWED_PATHS = /^\/auth\/v1\/(token|user|logout|health)$/;

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  try {
    const url = new URL(request.url);
    const rawPath = url.searchParams.get('path') || '';
    // 登录/刷新请求是 /auth/v1/token?grant_type=password：只对 pathname 做白名单，
    // query（grant_type 等）原样保留透传。
    let path = rawPath;
    let query = '';
    const pathSplit = rawPath.split('?');
    if (pathSplit.length > 1) {
      path = pathSplit[0];
      query = '?' + pathSplit.slice(1).join('?');
    }
    if (!ALLOWED_PATHS.test(path)) {
      return json({ success: false, message: 'auth relay 不支持该路径' }, 403);
    }
    path = path + query;
    if (request.method !== 'GET' && request.headers.get('origin') && request.headers.get('origin') !== url.origin) {
      return json({ success: false, message: '不允许跨站操作' }, 403);
    }
    if (!['GET', 'POST'].includes(request.method)) {
      return json({ success: false, message: 'Method not allowed' }, 405);
    }
    const config = getSupabaseConfig(env);
    if (!config.url || !config.anonKey) {
      return json({ success: false, message: 'Supabase 配置缺失' }, 503);
    }
    const target = new URL(path, config.url);
    const headers = new Headers();
    for (const key of ['content-type', 'accept']) {
      if (request.headers.has(key)) headers.set(key, request.headers.get(key));
    }
    // 登录/刷新请求里的 Authorization 是客户端自己的令牌（或匿名键），原样透传；
    // 缺失时回退为匿名键，保证 /health 等匿名探测可用。
    headers.set('apikey', config.anonKey);
    headers.set('Authorization', request.headers.get('authorization') || `Bearer ${config.anonKey}`);
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : request.body;
    const response = await fetch(target.href, { method: request.method, headers, body, redirect: 'manual' });
    const output = new Headers(response.headers);
    output.delete('set-cookie');
    output.delete('access-control-allow-origin');
    output.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers: output });
  } catch (error) {
    return json({ success: false, message: error.message || 'auth relay 转发失败。' }, 502);
  }
}
