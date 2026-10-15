// 备用通道「收费站」(/api/report-generation) 的行为测试：
// 只认登录态（账号由服务端确定，客户端不能冒充）、幂等（同任务只有一个事件 id）、只收最小信息。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'functions', 'api', 'report-generation.js'), 'utf8');
const worker = await import(join(here, '..', 'functions', 'api', 'report-generation.js'));

const ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  SUPABASE_ANON_KEY: 'anon-key'
};

function fakeRequest(method, { token, body } = {}) {
  const headers = new Map();
  if (token) headers.set('authorization', 'Bearer ' + token);
  return {
    method,
    headers: { get: name => headers.get(String(name).toLowerCase()) || null },
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    }
  };
}

function stubFetch({ user = { id: '21610cb9-0e74-480f-ac65-5cef2000c3ad', user_metadata: { display_name: 'DIY静态' } }, authOk = true } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/auth/v1/user')) {
      return authOk
        ? new Response(JSON.stringify(user), { status: 200, headers: { 'content-type': 'application/json' } })
        : new Response(JSON.stringify({ msg: 'invalid token' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }
    return new Response('', { status: 201 });
  };
  return calls;
}

test('只接受 POST；没带登录态一律 401 且不写任何数据', async () => {
  let calls = stubFetch();
  const getRes = await worker.onRequest({ request: fakeRequest('GET'), env: ENV });
  assert.equal(getRes.status, 405);
  const anonRes = await worker.onRequest({ request: fakeRequest('POST', { body: { taskId: 'task-123456' } }), env: ENV });
  assert.equal(anonRes.status, 401);
  assert.equal(calls.length, 0, '未登录时不应发起任何 Supabase 请求');

  calls = stubFetch({ authOk: false });
  const badToken = await worker.onRequest({ request: fakeRequest('POST', { token: 'nope', body: { taskId: 'task-123456' } }), env: ENV });
  assert.equal(badToken.status, 401);
  assert.ok(!calls.some(c => c.url.includes('vf_asset_events')), '鉴权失败不得写事件');
});

test('缺任务号/任务号不合法 → 400，不写事件', async () => {
  const calls = stubFetch();
  for (const body of [{}, { taskId: 'x' }, { taskId: '带中文的' }]) {
    const res = await worker.onRequest({ request: fakeRequest('POST', { token: 'good', body }), env: ENV });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.ok(!calls.some(c => c.url.includes('vf_asset_events')));
});

test('登录态决定账号：actor_id 用服务端认定的用户，事件 id 幂等（同任务只算一次）', async () => {
  const calls = stubFetch();
  const body = { taskId: 'task-abcdef123', model: 'jimeng-image-5.0-pro', kind: 'diy', count: 2, origin: 'https://gccdesign.app' };
  const first = await worker.onRequest({ request: fakeRequest('POST', { token: 'good', body }), env: ENV });
  assert.equal(first.status, 200);
  const writes = calls.filter(c => c.url.includes('vf_asset_events'));
  assert.equal(writes.length, 1);
  const rows = JSON.parse(writes[0].options.body);
  assert.equal(rows.length, 1, '一次上报只写一行（不是按张数写）');
  assert.equal(rows[0].actor_id, '21610cb9-0e74-480f-ac65-5cef2000c3ad', '账号来自登录态');
  assert.equal(rows[0].event_type, 'imagegen');
  assert.equal(rows[0].meta.model, 'site-jimeng-pro', '型号归一化');
  assert.equal(rows[0].meta.model_label, '即梦 Pro');
  assert.equal(rows[0].meta.channel, 'legacy-fallback', '标记来源通道，便于看板区分');
  assert.equal(rows[0].meta.job_id, 'task-abcdef123');
  assert.match(writes[0].url, /on_conflict=id/, '按 id 去重');
  assert.match(String(writes[0].options.headers.Prefer || ''), /ignore-duplicates/, '重复上报不报错也不重复计数');

  const second = await worker.onRequest({ request: fakeRequest('POST', { token: 'good', body }), env: ENV });
  const rowsAgain = JSON.parse(calls.filter(c => c.url.includes('vf_asset_events'))[1].options.body);
  assert.equal((await second.json()).id, (await first.json()).id, '同一任务重复上报得到同一个事件 id');
  assert.equal(rowsAgain[0].id, rows[0].id);
});

test('客户端传来的账号字段一律不采信，只收任务号/型号/张数/来源', async () => {
  const calls = stubFetch();
  await worker.onRequest({ request: fakeRequest('POST', {
    token: 'good',
    body: { taskId: 'task-safe12345', actor_id: '别人的账号', userId: 'x', image: 'data:image/png;base64,AAAA', prompt: '绝密提示词' }
  }), env: ENV });
  const payload = calls.find(c => c.url.includes('vf_asset_events')).options.body;
  assert.doesNotMatch(payload, /别人的账号|绝密提示词|base64/, '不接收也不转发图片/提示词/账号字段');
  const row = JSON.parse(payload)[0];
  assert.equal(row.actor_id, '21610cb9-0e74-480f-ac65-5cef2000c3ad');
});

test('代码层面：事件 id 用与服务器对账脚本一致的 uuid5 命名空间', () => {
  assert.match(source, /aba1711c13954c03b0a4d69363b9bf74/, '与脚本同命名空间（同一任务两条通道算同一个 id）');
  assert.doesNotMatch(source, /console\.log/, '不打印任何内容，避免泄露');
});
