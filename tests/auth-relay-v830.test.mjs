import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = path => readFileSync(root + path, 'utf8');

test('v830 auth-relay Function：只放行匿名 auth 端点，转发 Supabase 并透传令牌', () => {
  const source = read('functions/api/auth-relay.js');
  assert.match(source, /ALLOWED_PATHS = \/\^\\\/auth\\\/v1\\\/\(token\|user\|logout\|health\)\$\//);
  // 登录路径 /auth/v1/token?grant_type=password：query 不参与白名单，但需原样透传
  assert.match(source, /rawPath\.split\('\?'\)/);
  assert.match(source, /query = '\?' \+ pathSplit\.slice\(1\)\.join\('\?'\)/);
  assert.match(source, /getSupabaseConfig/);
  assert.match(source, /headers\.set\('apikey', config\.anonKey\)/);
  assert.match(source, /request\.headers\.get\('authorization'\) \|\| `Bearer \$\{config\.anonKey\}`/);
  assert.match(source, /redirect: 'manual'/);
  assert.match(source, /output\.delete\('set-cookie'\)/);
  // 白名单不含 admin：中继不得暴露管理接口
  assert.doesNotMatch(source, /admin/);
  // 跨站写操作防护 + 方法限制
  assert.match(source, /不允许跨站操作/);
  assert.match(source, /Method not allowed/);
});

test('v830 前端：supabase auth 请求改道 /api/auth-relay', () => {
  const source = read('app.js');
  assert.match(source, /function supabaseAuthRelayFetch\(input, init\)/);
  assert.match(source, /url\.pathname\.startsWith\('\/auth\/v1\/'\)/);
  assert.match(source, /relay\.searchParams\.set\('path', url\.pathname \+ url\.search\)/);
  // apikey 头剥离：匿名键不重复透传，服务端会补
  assert.match(source, /headers\.get\('apikey'\) === config\.supabaseAnonKey/);
  assert.match(source, /headers\.delete\('apikey'\)/);
  // createClient 接线：有账号代理时仍走原 window.fetch，否则走中继
  assert.match(source, /global: \{ fetch: window\.VFAccountAccess\?\.enabled \? window\.fetch\.bind\(window\) : supabaseAuthRelayFetch \}/);
  // 非法 URL / 非 auth 路径时回退原请求
  assert.match(source, /return window\.fetch\(input, init\);/);
  // 版本号随每次前端发版递增（v830 之后还有 v832 等），只要求不回退
  const version = read('app.js').match(/TOOL_UI_VERSION = '\S+-v(\d+)'/)?.[1] || '0';
  assert.ok(Number(version) >= 830, `TOOL_UI_VERSION 不应回退到 v830 之前，当前 v${version}`);
});

test('v830 工具页守卫：/auth/v1/user 校验也走中继', () => {
  const source = read('tool-auth-guard.js');
  assert.match(source, /\/api\/auth-relay\?path=' \+ encodeURIComponent\('\/auth\/v1\/user'\)/);
  assert.doesNotMatch(source, /supabaseUrl\}\/auth\/v1\/user/);
});

test('v830 index.html：静态资源引用不再指向 v829 及更早版本', () => {
  const source = read('index.html');
  assert.doesNotMatch(source, /v829/);
  assert.match(source, /app\.js\?v=/);
});
