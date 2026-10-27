// v924：内容指纹（content_key）**去掉 updated_at**。
//
// 事故（2026-10-14 实测）：updated_at 被数据库触发器在任何 UPDATE 时刷新，所以给 525 张补 language、
// 给 78 张补 material_type 这种跟图片无关的编辑，把这 ~600 张的指纹全改了 ⇒ 腾讯云上的 cron 认为
// "内容变了"，把这一批图重新跑了一遍（约 20 张/5 分钟）—— 图根本没换，白烧 600 次模型调用。
//
// 这一组测试锁三件事：
//   ① 指纹只看图片本身（路径 + 字节数），updated_at 变不算变；
//   ② **历史兼容**：库里存量的 content_key 是旧的 3 段格式（path|size|updated_at），
//      比对一律只比前两段（contentKeyUnchanged），否则整库 1941 张会被判成"内容变了"；
//   ③ 脚本 / 端点 / 前端（app.js）三份实现算出来必须**逐字一样**，比较点都走同一个函数。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {handleCasePreviewAiTags} from '../functions/api/case-preview-ai-tags.js';
import {
  previewContentKey,
  contentKeyUnchanged,
  planWorkItems,
  KIND_DYNAMIC
} from '../scripts/recognize-case-tags.mjs';

const scriptSource = readFileSync(new URL('../scripts/recognize-case-tags.mjs', import.meta.url), 'utf8');
const endpointSource = readFileSync(new URL('../functions/api/case-preview-ai-tags.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function previewOf(id, {path = 'u1/s1/' + id + '.png', size = 100, updatedAt = '2026-10-13T00:00:00Z', source = 'src-1'} = {}) {
  return {id, source_file_id: source, preview_path: path, preview_size_bytes: size, updated_at: updatedAt};
}

/* ── 1) 指纹本身：updated_at 不算内容 ─────────────────────────────────── */

test('v924 回归：同一张图只改 updated_at（触发器刷新）⇒ 指纹不变', () => {
  const preview = previewOf('p1');
  const key = previewContentKey(preview);
  assert.equal(previewContentKey({...preview, updated_at: '2026-10-14T18:30:00.000Z'}), key,
    '改 language / material_type 会刷 updated_at —— 它绝不能进指纹');
  assert.equal(previewContentKey({...preview, updated_at: ''}), key);
  assert.equal(previewContentKey({...preview, updated_at: null}), key);
  assert.equal(key, 'u1/s1/p1.png|100');
  // 指纹里不许再出现第三段
  assert.equal(key.split('|').length, 2);
});

test('v924 图片真的换了（路径 / 字节数）⇒ 指纹变', () => {
  const preview = previewOf('p1');
  assert.notEqual(previewContentKey({...preview, preview_path: 'u1/s1/other.png'}), previewContentKey(preview));
  assert.notEqual(previewContentKey({...preview, preview_size_bytes: 101}), previewContentKey(preview));
  // 缺字段兜底不变（与端点/前端同口径）
  assert.equal(previewContentKey({id: 'x'}), '|0');
  assert.equal(previewContentKey(null), '|0');
});

/* ── 2) 历史兼容：库里存的是旧的 3 段 key ─────────────────────────────── */

test('v924 历史兼容：旧格式 path|size|updated_at 只比前两段', () => {
  const preview = previewOf('p1');                       // u1/s1/p1.png | 100
  const legacy = 'u1/s1/p1.png|100|2026-10-01T00:00:00Z'; // v923 及以前写进库里的样子
  assert.equal(contentKeyUnchanged(legacy, preview), true, '老 key 必须当成"内容没变"，否则整库重跑');
  // 换了 updated_at 的老 key（就是这次事故里被触发器刷过的那批）同样算"没变"
  assert.equal(contentKeyUnchanged('u1/s1/p1.png|100|2026-10-14T12:00:00Z', preview), true);
  // 新格式（2 段）自然也算没变：下次写入时老 key 就被升级成这个
  assert.equal(contentKeyUnchanged(previewContentKey(preview), preview), true);
  // 图片真的换了 ⇒ 变了
  assert.equal(contentKeyUnchanged('u1/s1/other.png|100|2026-10-01T00:00:00Z', preview), false);
  assert.equal(contentKeyUnchanged('u1/s1/p1.png|101|2026-10-01T00:00:00Z', preview), false);
  // 没存过 key ⇒ 当"变了"（与 v923 之前的老行为一致）
  assert.equal(contentKeyUnchanged('', preview), false);
  assert.equal(contentKeyUnchanged(null, preview), false);
  assert.equal(contentKeyUnchanged(undefined, preview), false);
});

/* ── 3) planWorkItems：断点续跑的口径 ─────────────────────────────────── */

test('v924 回归：success + 旧格式 key + 只差 updated_at ⇒ 不进计划（不再白跑）', () => {
  const preview = previewOf('p1');                       // 这张的 updated_at 是 2026-10-13
  const rows = [
    {preview_id: 'p1', source_file_id: 'src-1', status: 'success', content_key: 'u1/s1/p1.png|100|2026-10-14T09:00:00Z'}
  ];
  const plan = planWorkItems({previews: [preview], existingRows: rows});
  assert.deepEqual(plan.pending, [], '补过 language/material_type 的行不许重跑 —— 这就是本次事故的回归');
  assert.deepEqual(plan.skipped.map(i => i.preview.id), ['p1']);
  assert.equal(plan.stats.reasons.contentChanged, 0);
});

test('v924：路径/字节数真的变了 ⇒ 进计划，reason=content-changed', () => {
  const preview = previewOf('p1');
  const legacySuffix = '|2026-10-14T09:00:00Z';          // 老 key 的第三段
  const changedPath = planWorkItems({
    previews: [preview],
    existingRows: [{preview_id: 'p1', status: 'success', content_key: 'u1/s1/old.png|100' + legacySuffix}]
  });
  assert.deepEqual(changedPath.pending.map(i => i.reason), ['content-changed']);
  assert.equal(changedPath.pending[0].contentKey, previewContentKey(preview), '计划里带的是新格式 key（写库时用）');

  const changedSize = planWorkItems({
    previews: [preview],
    existingRows: [{preview_id: 'p1', status: 'success', content_key: 'u1/s1/p1.png|999' + legacySuffix}]
  });
  assert.deepEqual(changedSize.pending.map(i => i.reason), ['content-changed']);
});

test('v924：--force-dynamic 对"只差 updated_at"的行也不许误判成内容变了', () => {
  const gif = previewOf('p-gif', {path: 'u1/s1/a.gif'});
  const rows = [{preview_id: 'p-gif', status: 'success', content_key: 'u1/s1/a.gif|100|2026-10-14T09:00:00Z'}];
  const plan = planWorkItems({previews: [gif], existingRows: rows, forceDynamic: true});
  assert.deepEqual(plan.pending.map(i => i.reason), ['force-dynamic'],
    '--force 系列开关的语义没变：内容判定更准了，但动态物料该补的照旧补');
  assert.equal(KIND_DYNAMIC, 'dynamic');
});

/* ── 4) 三份实现必须逐字同口径（脚本 / 端点 / app.js） ─────────────────── */

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start > 0, '源码里找不到 function ' + name);
  // 先跨过参数表（planWorkItems 的参数是解构对象，直接找 '{' 会停在参数上），再找函数体那对花括号
  let i = source.indexOf('(', start);
  let depth = 0;
  for (; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const open = source.indexOf('{', i);
  depth = 0;
  for (let j = open; j < source.length; j += 1) {
    if (source[j] === '{') depth += 1;
    else if (source[j] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, j + 1);
    }
  }
  throw new Error('函数没有收尾的大括号：' + name);
}

// 把实现体归一化：前端那个 `casePreviewAiContentKey` 前缀统一成 `previewContentKey`、可选链去掉、
// 去掉函数签名与所有空白（只留花括号里的实现）。这样"脚本 / 端点 / 前端"三份被压成同一个字符串，
// 逐字比出差异。
function normalizeBody(source, name) {
  const body = extractFunction(source, name).replace(/casePreviewAiContentKey/g, 'previewContentKey');
  return body.slice(body.indexOf('{')).replace(/preview\?\./g, 'preview.').replace(/\s+/g, '');
}

function compileFunctions(source, names) {
  const context = vm.createContext({});
  vm.runInContext(names.map(name => extractFunction(source, name)).join('\n')
    + '\nthis.exports = {' + names.map(name => name + ': ' + name).join(', ') + '};', context);
  return context.exports;
}

const keySources = [
  ['脚本', scriptSource],
  ['端点', endpointSource],
  ['前端', appSource]
];

test('v924 三处 previewContentKey 逐字一样，且都不含 updated_at', () => {
  const bodies = [
    ['脚本', normalizeBody(scriptSource, 'previewContentKey')],
    ['端点', normalizeBody(endpointSource, 'previewContentKey')],
    ['前端', normalizeBody(appSource, 'casePreviewAiContentKey')]
  ];
  const reference = bodies[0][1];
  assert.equal(reference, "{return[preview.preview_path||'',preview.preview_size_bytes||0].join('|');}",
    '指纹必须就是 [路径, 字节数].join("|")');
  for (const [label, body] of bodies) {
    assert.equal(body, reference, label + ' 的 previewContentKey 与脚本不一致');
    assert.equal(/updated_at/.test(body), false, label + ' 的指纹里不许再出现 updated_at');
  }
});

test('v924 三处"历史兼容比对函数"逐字一样', () => {
  const reference = normalizeBody(scriptSource, 'contentKeyUnchanged');
  assert.match(reference, /split\('\|'\)\.slice\(0,2\)/, '必须只取前两段');
  assert.equal(normalizeBody(endpointSource, 'contentKeyUnchanged'), reference, '端点与脚本口径不一致');
  assert.equal(normalizeBody(appSource, 'casePreviewAiContentKeyUnchanged'), reference, '前端与脚本口径不一致');
});

test('v924 三处实现跑出来的结果逐个一致（含老格式）', () => {
  const script = compileFunctions(scriptSource, ['previewContentKey', 'contentKeyUnchanged']);
  const endpoint = compileFunctions(endpointSource, ['previewContentKey', 'contentKeyUnchanged']);
  const app = compileFunctions(appSource, ['casePreviewAiContentKey', 'casePreviewAiContentKeyUnchanged']);
  const previews = [
    previewOf('p1'),
    previewOf('p2', {size: 0}),
    {id: 'p3'},
    {preview_path: 'x.png', preview_size_bytes: 7, updated_at: '2026-10-14T00:00:00Z'}
  ];
  const storedKeys = [
    'u1/s1/p1.png|100|2026-10-13T00:00:00Z',
    'u1/s1/p1.png|100|2026-10-14T09:00:00Z',
    'u1/s1/p1.png|100',
    'u1/s1/p1.png|101|2026-10-13T00:00:00Z',
    'u1/s1/old.png|100|2026-10-13T00:00:00Z',
    '|0|',
    '|0',
    '',
    'x.png|7|2026-01-01T00:00:00Z'
  ];
  for (const preview of previews) {
    const keys = [script.previewContentKey(preview), endpoint.previewContentKey(preview), app.casePreviewAiContentKey(preview)];
    assert.equal(new Set(keys).size, 1, '三处算出的 key 必须一样：' + JSON.stringify(keys));
    assert.equal(keys[0], previewContentKey(preview), '三处都必须等于脚本 import 进来的那个实现');
    for (const stored of storedKeys) {
      const verdicts = [
        script.contentKeyUnchanged(stored, preview),
        endpoint.contentKeyUnchanged(stored, preview),
        app.casePreviewAiContentKeyUnchanged(stored, preview)
      ];
      assert.equal(new Set(verdicts).size, 1,
        '三处对 ' + JSON.stringify(stored) + ' 的判定必须一样：' + JSON.stringify(verdicts));
      assert.equal(verdicts[0], contentKeyUnchanged(stored, preview));
    }
  }
});

test('v924 比较点收敛：脚本与前端不许再有裸 content_key !== 比较', () => {
  // 前端：那 4 处（标签 / 效果标签 / 状态文案 / 面板 stale 判定）全部走 casePreviewAiContentKeyUnchanged
  assert.equal((appSource.match(/content_key !== casePreviewAiContentKey\(/g) || []).length, 0,
    'app.js 里不许再直接比 content_key');
  assert.equal((appSource.match(/!casePreviewAiContentKeyUnchanged\(row\.content_key/g) || []).length, 4);
  // 脚本：planWorkItems 里走 contentKeyUnchanged，不许再直接 !== 比
  const planBody = extractFunction(scriptSource, 'planWorkItems');
  assert.match(planBody, /contentKeyUnchanged\(current\.content_key, preview\)/);
  assert.equal((planBody.match(/content_key \|\| ''\) !== /g) || []).length, 0);
  // 端点：两个判断（status / save）走 contentKeyUnchanged；定义只有一处。
  // v926：manual-add 不再做内容比对（它只加词 + 更新 key），所以这里从 3 处变成 2 处。
  // 计数只看**调用形态** `!contentKeyUnchanged(`，免得把注释里提到的函数名也算进来。
  assert.equal((endpointSource.match(/!contentKeyUnchanged\(/g) || []).length, 2,
    'status / save 两处判断');
  assert.equal((endpointSource.match(/function contentKeyUnchanged\(/g) || []).length, 1, '比对函数只许有一份实现');
  assert.equal((endpointSource.match(/contentKey !== expectedContentKey/g) || []).length, 0);
});

/* ── 5) 端点行为：老格式 key 端到端不再被判成"内容已变化" ─────────────── */

const previewId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const sourceId = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5';
const endpointPreview = {id: previewId, source_file_id: sourceId, preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-14T09:00:00Z'};
const env = {SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service'};

function request(body) {
  return new Request('https://local.invalid/api/case-preview-ai-tags', {
    method: 'POST',
    headers: {Authorization: 'Bearer user-token', 'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
}

function mockFetch({current = null} = {}) {
  const writes = [];
  const fetcher = async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/auth/v1/user')) return Response.json({id: userId, app_metadata: {}, user_metadata: {}});
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{role: 'admin'}]);
    if (value.includes('/rest/v1/vf_asset_previews')) return Response.json([endpointPreview]);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method || 'GET') === 'GET') return Response.json(current ? [current] : []);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method === 'POST') {
      const row = JSON.parse(init.body);
      writes.push(row);
      return Response.json([row]);
    }
    throw new Error('Unexpected request: ' + value);
  };
  return {fetcher, writes};
}

async function callEndpoint(t, body, {current = null} = {}) {
  const mock = mockFetch({current});
  const old = globalThis.fetch;
  globalThis.fetch = mock.fetcher;
  t.after(() => { globalThis.fetch = old; });
  const response = await handleCasePreviewAiTags(request(body), env);
  return {status: response.status, body: await response.json(), writes: mock.writes};
}

test('v924 端点：老格式（3 段）key 与只换了 updated_at 的图不再报 409', async (t) => {
  const staleUpdatedAt = '2026-10-13T00:00:00Z';        // 库里那张图升级 language 前的 updated_at
  const saved = await callEndpoint(t, {action: 'save', previewId, tags: ['汉堡'], model: 'glm-4v-flash', contentKey: 'p.png|12|' + staleUpdatedAt});
  assert.equal(saved.status, 200, '老格式 key 必须被认作"内容没变"（v923 会 409）');
  assert.equal(saved.writes.at(-1).content_key, 'p.png|12|' + staleUpdatedAt);

  const fresh = await callEndpoint(t, {action: 'save', previewId, tags: ['汉堡'], model: 'glm-4v-flash', contentKey: 'p.png|12'});
  assert.equal(fresh.status, 200, '新格式（2 段）key 照旧通过');

  const status = await callEndpoint(t, {action: 'status', status: 'running', previewId, contentKey: 'p.png|12|' + staleUpdatedAt});
  assert.equal(status.status, 200);
});

test('v924 端点：路径/大小真的不同 ⇒ 照样 409', async (t) => {
  const pathChanged = await callEndpoint(t, {action: 'save', previewId, tags: ['汉堡'], contentKey: 'q.png|12|' + '2026-10-14T09:00:00Z'});
  assert.equal(pathChanged.status, 409);
  assert.equal(pathChanged.writes.length, 0);
  const sizeChanged = await callEndpoint(t, {action: 'save', previewId, tags: ['汉堡'], contentKey: 'p.png|13|' + '2026-10-14T09:00:00Z'});
  assert.equal(sizeChanged.status, 409);
  const empty = await callEndpoint(t, {action: 'save', previewId, tags: ['汉堡'], contentKey: ''});
  assert.equal(empty.status, 409, '空 key 仍按"内容已变化"处理（与老行为一致）');
});

test('v924/v926 端点 manual-add：老格式 key 不做内容比对、图片真换了也不作废', async (t) => {
  const current = {
    preview_id: previewId, source_file_id: sourceId,
    ai_tags: ['汉堡'], manual_tags: [], excluded_tags: ['kiki'], status: 'success',
    content_key: 'p.png|12|2026-10-13T00:00:00Z'        // 图片路径/大小都没变，只是 updated_at 被刷过
  };
  const result = await callEndpoint(t, {action: 'manual-add', previewId, tag: 'kiki'}, {current});
  assert.equal(result.status, 200);
  const row = result.writes.at(-1);
  assert.deepEqual(row.ai_tags, ['汉堡'], '内容没变 ⇒ 老标签必须留着（v923 会把整行清成 idle）');
  assert.equal(row.status, 'success');
  assert.deepEqual(row.manual_tags, ['kiki']);

  // v926：图片真换了（路径不同）也**不再整行作废** —— 加一个词不该顺带清掉这张图上其它人工标签。
  // 作废只发生在识别流程（status / save），那两条路径的 409 语义由上一条用例守着。
  const changed = await callEndpoint(t, {
    action: 'manual-add', previewId, tag: 'kiki'
  }, {current: {...current, content_key: 'q.png|12|2026-10-14T09:00:00Z'}});
  const changedRow = changed.writes.at(-1);
  assert.deepEqual(changedRow.ai_tags, ['汉堡'], '路径变了也不许清 AI 标签');
  assert.equal(changedRow.status, 'success', '状态不许被打回 idle');
  assert.deepEqual(changedRow.excluded_tags, [], '人工排除里若正好有这个词，加回来就从排除里摘掉（老口径不变）');
  assert.deepEqual(changedRow.manual_tags, ['kiki'], '刚加的那个人工标签留着');
  assert.equal(changedRow.content_key, 'p.png|12', 'key 更新成当前图片的指纹（服务端自己算的）');
});

/* ── 6) 版本号六处同步（index.html 5 处 + app.js 1 处） ───────────────── */

test('v924 版本号六处同步（index.html 5 处 + app.js 1 处）', () => {
  assert.equal((indexSource.match(/\?v=20261027-gallery-upload-error-v963/g) || []).length, 5);
  assert.match(appSource, /const TOOL_UI_VERSION = '20261027-gallery-upload-error-v963'/);
});
