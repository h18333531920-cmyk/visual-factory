// v926（2026-10-14，第二部分）：动效标签也能手工加 —— 需要新的**独立人工层** manual_effect_tags。
//
// 用户口径（原话）：「GIF 类型的物料的动态标签也要在后面加一个小加号的按钮支持手动添加，
//   添加后要确保会录入到后端和词表里。」
//
// 为什么必须新开一列（本文件锁的就是这条铁律）：
//   effect_tags 是 **AI 层**（每次重识别都被识别脚本 / save 整体覆盖）。
//   人工加的词塞进 effect_tags，下次识别就没了 —— 所以人工层单独存 manual_effect_tags：
//     · 只由端点 manual-effect-add / manual-effect-remove 改动；
//     · 识别流程（save / 脚本 buildSuccessRow）**原样保留、绝不覆盖**；
//     · 写 AI 层 effect_tags 时要**刨掉**人工层已有的词（人工的不进 AI 层）；
//     · 词表靠数据库触发器 + vf_sync_tag_vocabulary() 自动收（sql/031），前端不额外做任何事。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {handleCasePreviewAiTags, OPTIONAL_TAG_COLUMNS, withoutMissingOptionalColumns} from '../functions/api/case-preview-ai-tags.js';
import {buildSuccessRow} from '../scripts/recognize-case-tags.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const appSource = readFileSync(join(ROOT, 'app.js'), 'utf8');
const endpointSource = readFileSync(join(ROOT, 'functions', 'api', 'case-preview-ai-tags.js'), 'utf8');
const scriptSource = readFileSync(join(ROOT, 'scripts', 'recognize-case-tags.mjs'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');
const sqlSource = readFileSync(join(ROOT, 'sql', '031_manual_effect_tags.sql'), 'utf8');
const VERSION = '20261015-canonical-query-v956';

const previewId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const sourceId = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5';
const env = {SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service'};

/* ── 1) sql/031：列 + 词表同步 + 触发器 ─────────────────────────────────── */

test('v926 sql/031：加列（幂等、带注释）、必须在 sql/028 之后跑、用户自己跑', () => {
  assert.match(sqlSource, /alter table public\.vf_preview_ai_tags\s*\n\s*add column if not exists manual_effect_tags text\[\] not null default '\{\}'::text\[\];/);
  assert.match(sqlSource, /comment on column public\.vf_preview_ai_tags\.manual_effect_tags is/);
  assert.match(sqlSource, /\*\*必须在 sql\/028 之后\*\*/);
  assert.match(sqlSource, /幂等/);
  assert.match(sqlSource, /用户自己跑，AI 不代跑/);
  // 为什么需要人工层（写进文件头，别删）：effect_tags 是 AI 层、每次重识别整体覆盖
  assert.match(sqlSource, /effect_tags（sql\/028）是 \*\*AI 层\*\*/);
  assert.match(sqlSource, /下次识别就没了/);
  // 不执行任何写库以外的动作：文件里不许出现 drop table / delete from（危险动作）
  assert.doesNotMatch(sqlSource, /drop table/i);
  assert.doesNotMatch(sqlSource, /delete from (?!public\.vf_tag_vocabulary)/i);
});

test('v926 sql/031：词表同步函数收全 + 删孤儿都带上 manual_effect_tags（kind 归 effect）', () => {
  assert.match(sqlSource, /create or replace function public\.vf_sync_tag_vocabulary\(\)/);
  assert.match(sqlSource, /select unnest\(manual_effect_tags\), 'effect'::text from public\.vf_preview_ai_tags/);
  assert.match(sqlSource, /unnest\(a\.manual_tags \|\| a\.ai_tags \|\| a\.effect_tags \|\| a\.manual_effect_tags\)/);
  // effect_tags 那一路不能丢（照抄 028 再改，少一路就是回退）
  assert.match(sqlSource, /select unnest\(effect_tags\), 'effect'::text from public\.vf_preview_ai_tags/);
  // 有意例外不许被这次改动弄丢
  assert.match(sqlSource, /where v\.kind is distinct from 'effect'/);
  assert.match(sqlSource, /grant execute on function public\.vf_sync_tag_vocabulary\(\) to authenticated;/);
  assert.match(sqlSource, /select public\.vf_sync_tag_vocabulary\(\);/);
});

test('v926 sql/031：重建 UPDATE 触发器，WHEN 里加上 manual_effect_tags（_ins/_del 不动）', () => {
  assert.match(sqlSource, /drop trigger if exists vf_tag_sync_preview_ai_tags_upd on public\.vf_preview_ai_tags;/);
  assert.match(sqlSource, /create trigger vf_tag_sync_preview_ai_tags_upd\s*\n\s*after update on public\.vf_preview_ai_tags\s*\n\s*for each row\s*\n\s*when \(old\.ai_tags is distinct from new\.ai_tags/);
  assert.match(sqlSource, /or old\.manual_tags is distinct from new\.manual_tags/);
  assert.match(sqlSource, /or old\.effect_tags is distinct from new\.effect_tags/);
  assert.match(sqlSource, /or old\.manual_effect_tags is distinct from new\.manual_effect_tags\)/);
  assert.match(sqlSource, /execute function public\.vf_sync_tag_vocabulary_trigger\(\);/);
  assert.doesNotMatch(sqlSource, /create trigger vf_tag_sync_preview_ai_tags_ins/);
  assert.doesNotMatch(sqlSource, /create trigger vf_tag_sync_preview_ai_tags_del/);
  // 自检：列在不在 / 函数收没收 / 触发器 when 对不对
  assert.match(sqlSource, /and column_name = 'manual_effect_tags';/);
  assert.match(sqlSource, /收全含manual_effect_tags/);
  assert.match(sqlSource, /认manual_effect变更/);
});

/* ── 2) 端点：manual-effect-add / remove ──────────────────────────────── */

function callEndpoint(t, body, {current = null, rejectPost = null} = {}) {
  const writes = [];
  const fetcher = async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/auth/v1/user')) return Response.json({id: userId, app_metadata: {}, user_metadata: {}});
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{role: 'admin'}]);
    if (value.includes('/rest/v1/vf_asset_previews')) {
      return Response.json([{id: previewId, source_file_id: sourceId, preview_path: 'p.gif', preview_size_bytes: 12, updated_at: '2026-10-14T00:00:00Z'}]);
    }
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method || 'GET') === 'GET') return Response.json(current ? [current] : []);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method === 'POST') {
      const row = JSON.parse(init.body);
      writes.push(row);
      if (rejectPost && rejectPost(row)) return Response.json({code: 'PGRST204', message: rejectPost(row)}, {status: 400});
      return Response.json([row]);
    }
    throw new Error('Unexpected request: ' + value);
  };
  const request = new Request('https://local.invalid/api/case-preview-ai-tags', {
    method: 'POST',
    headers: {Authorization: 'Bearer user-token', 'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  const old = globalThis.fetch;
  globalThis.fetch = fetcher;
  t.after(() => { globalThis.fetch = old; });
  return handleCasePreviewAiTags(request, env).then(async (response) => ({status: response.status, body: await response.json(), writes}));
}

const CURRENT = {
  preview_id: previewId, source_file_id: sourceId,
  ai_tags: ['kiki'], manual_tags: ['汉堡'], excluded_tags: [], effect_tags: ['爆炸'], manual_effect_tags: ['缩放'],
  status: 'success', model: 'glm-4v-flash', content_key: 'p.gif|12', error_message: '', run_id: null
};

test('v926 端点 manual-effect-add：只动人工动效层（同一个词从 AI 层摘掉），别的字段一律不动', async (t) => {
  const added = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: '粒子'}, {current: CURRENT});
  assert.equal(added.status, 200);
  const row = added.writes.at(-1);
  assert.deepEqual(row.manual_effect_tags, ['缩放', '粒子'], '追加在人工动效层最后');
  assert.deepEqual(row.effect_tags, ['爆炸'], 'AI 动效层原样保留（新加的词本来就不在里面）');
  assert.deepEqual(row.ai_tags, ['kiki'], '元素 AI 层不动');
  assert.deepEqual(row.manual_tags, ['汉堡'], '人工元素标签不动');
  assert.equal(row.status, 'success', '状态不动');
  assert.equal(row.content_key, 'p.gif|12', '识别流程的指纹不动（人工编辑不碰它）');

  // 同一个词若 AI 层也有：加进人工层就把它从 AI 层摘掉（同一个词只留一份）
  const dup = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: '爆炸'}, {current: {...CURRENT, manual_effect_tags: []}});
  assert.deepEqual(dup.writes.at(-1).manual_effect_tags, ['爆炸']);
  assert.deepEqual(dup.writes.at(-1).effect_tags, [], 'AI 层里那份要摘掉');
  // 重复加同一个词不存两份
  const twice = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: '缩放'}, {current: CURRENT});
  assert.deepEqual(twice.writes.at(-1).manual_effect_tags, ['缩放']);
  // 人工排除里正好有它 ⇒ 加回来就撤销排除（与元素那条 manual-add 同口径）
  const fromExcluded = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: '抖动'}, {current: {...CURRENT, excluded_tags: ['抖动']}});
  assert.deepEqual(fromExcluded.writes.at(-1).manual_effect_tags, ['缩放', '抖动']);
  assert.deepEqual(fromExcluded.writes.at(-1).excluded_tags, []);
});

test('v926 端点 manual-effect-add：去空格 / 12 字上限 / 空标签 400（与元素同口径）', async (t) => {
  const spaced = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: '  光效  '}, {current: CURRENT});
  assert.deepEqual(spaced.writes.at(-1).manual_effect_tags, ['缩放', '光效']);
  const tooLong = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: '一二三四五六七八九十十一十二十三'}, {current: CURRENT});
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.writes.length, 0);
  const empty = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: ' '}, {current: CURRENT});
  assert.equal(empty.status, 400);
  assert.match(endpointSource, /if \(!tag \|\| tag\.length > 12\) return json\(\{success: false, message: '标签无效'\}, 400\);[\s\S]*?manual-effect-add/,
    '上限沿用 12（cleanTags 同一口径）');
});

test('v926 端点 manual-effect-add：列还没建立（sql/031 没跑）就明说不写库，不许假装成功', async (t) => {
  const legacyRow = {preview_id: previewId, source_file_id: sourceId, ai_tags: [], manual_tags: [], excluded_tags: [], effect_tags: [], status: 'success'};
  const blocked = await callEndpoint(t, {action: 'manual-effect-add', previewId, tag: '爆炸'}, {current: legacyRow});
  assert.equal(blocked.status, 503, '要报 503 而不是静默成功（用户最烦"加了没反应"）');
  assert.match(blocked.body.message, /sql\/031_manual_effect_tags\.sql/);
  assert.equal(blocked.writes.length, 0, '一列都不许写');
});

test('v926 端点 manual-effect-remove：只从人工动效层摘掉那个词', async (t) => {
  const removed = await callEndpoint(t, {action: 'manual-effect-remove', previewId, tag: '缩放'}, {current: CURRENT});
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.writes.at(-1).manual_effect_tags, []);
  assert.equal('effect_tags' in removed.writes.at(-1), false, 'AI 层不受影响（载荷不带它 = 库里原样保留）');
  assert.deepEqual(removed.writes.at(-1).ai_tags, ['kiki'], '元素那一层也不受影响');
  assert.equal(removed.writes.at(-1).status, 'success');
  const bad = await callEndpoint(t, {action: 'manual-effect-remove', previewId, tag: ''}, {current: CURRENT});
  assert.equal(bad.status, 400);
});

test('v926 端点 save：effect_tags 刨掉人工动效层；manual_effect_tags 干脆不写（v932 起）', async (t) => {
  const saved = await callEndpoint(t, {
    action: 'save', previewId, tags: ['汉堡', '餐桌'], effectTags: ['爆炸', '缩放', '烟雾'], model: 'glm-4v-flash-frames', contentKey: 'p.gif|12'
  }, {current: CURRENT});
  assert.equal(saved.status, 200);
  const row = saved.writes.at(-1);
  assert.deepEqual(row.effect_tags, ['爆炸', '烟雾'], '「缩放」在人工动效层里 ⇒ 不进 AI 层（这一层还是照旧读库里的值来去重）');
  // v932：**payload 里不带这一列** —— upsert 不带 = 库里原样保留，比"写回原值"更硬，
  // 还省掉"sql/031 没跑时每次写都被拒再摘列重试"的那一个白跑往返（那正是"点一下要等好几秒"的一大块）。
  assert.equal('manual_effect_tags' in row, false, '识别流程根本不碰人工动效层这一列');
  assert.deepEqual(row.ai_tags, ['餐桌'], '元素 AI 层照旧刨掉人工元素标签「汉堡」');
  assert.deepEqual(row.manual_tags, ['汉堡']);
  assert.deepEqual(row.excluded_tags, []);
});

test('v926 端点：两个可选列都缺时，写库降级成"摘一列重试一列"，最后一次仍成功', async (t) => {
  const missing = (row) => {
    if ('manual_effect_tags' in row) return "Could not find the 'manual_effect_tags' column of 'vf_preview_ai_tags' in the schema cache";
    if ('effect_tags' in row) return "Could not find the 'effect_tags' column of 'vf_preview_ai_tags' in the schema cache";
    return null;
  };
  const result = await callEndpoint(t, {
    action: 'save', previewId, tags: ['餐桌'], effectTags: ['爆炸'], contentKey: 'p.gif|12'
  }, {current: null, rejectPost: missing});
  assert.equal(result.status, 200, '降级要成功，不许把整条写入判失败');
  assert.equal(result.writes.length, 2, 'v932：载荷不再带人工动效层 ⇒ 只剩 effect_tags 一列要摘（一次重试就够）');
  assert.equal('manual_effect_tags' in result.writes[0], false, 'v932：识别流程的载荷里根本没有这一列');
  assert.ok('effect_tags' in result.writes[0]);
  assert.ok(!('effect_tags' in result.writes.at(-1)));
  assert.deepEqual(result.writes.at(-1).ai_tags, ['餐桌'], '其余列一字不动');
  assert.deepEqual(OPTIONAL_TAG_COLUMNS, ['effect_tags', 'manual_effect_tags']);
  assert.equal(withoutMissingOptionalColumns({ai_tags: []}, {message: 'HTTP 500'}), null);
});

/* ── 3) 脚本：与端点逐字同口径 + 读列降级 ─────────────────────────────── */

test('v926 脚本 buildSuccessRow：effect_tags 刨掉人工动效层，manual_effect_tags 原样带回', () => {
  const preview = {id: previewId, source_file_id: sourceId, preview_path: 'p.gif', preview_size_bytes: 12};
  const row = buildSuccessRow({preview, tags: ['kiki'], effects: ['爆炸', '缩放', '烟雾'], current: CURRENT});
  assert.deepEqual(row.effect_tags, ['爆炸', '烟雾']);
  assert.deepEqual(row.manual_effect_tags, ['缩放']);
  // 读不到这一列（sql/031 没跑）⇒ **整个字段都不带**：merge-duplicates 只动带上的列，
  // 不带 = 库里原样保留；拿空数组起底会把这层人工数据清掉（v864 的教训）
  const withoutColumn = buildSuccessRow({preview, tags: ['kiki'], effects: ['爆炸'], current: {ai_tags: [], manual_tags: [], excluded_tags: []}});
  assert.equal('manual_effect_tags' in withoutColumn, false, '读不到这一列就不许带它进载荷');
  const noCurrent = buildSuccessRow({preview, tags: ['kiki'], effects: ['爆炸'], current: null});
  assert.equal('manual_effect_tags' in noCurrent, false);
  assert.match(scriptSource, /if \(current && Object\.prototype\.hasOwnProperty\.call\(current, 'manual_effect_tags'\)\) \{/);
});

test('v926 脚本：写之前重读那一行要多带 manual_effect_tags，且缺列时自动退回不带它的读法', () => {
  assert.match(scriptSource, /const CURRENT_TAG_ROW_SELECT = 'ai_tags,manual_tags,excluded_tags,status,model';/);
  assert.match(scriptSource, /const CURRENT_TAG_ROW_SELECT_WITH_MANUAL_EFFECT = CURRENT_TAG_ROW_SELECT \+ ',manual_effect_tags';/);
  assert.match(scriptSource, /if \(!isMissingOptionalColumnError\(error, 'manual_effect_tags'\)\) throw error;/);
  assert.match(scriptSource, /manualEffectTagsColumnMissing = true;/);
  assert.equal((scriptSource.match(/from '\..\/functions\/_ai\.js'/g) || []).length, 1, '识别口径仍只有一处来源');
});

test('v926 端点与脚本同口径（真跑）：同一份 current + 同一批模型标签 ⇒ 四个数组同值', () => {
  const preview = {id: previewId, source_file_id: sourceId, preview_path: 'p.gif', preview_size_bytes: 12};
  const cases = [
    {tags: ['kiki', '餐桌'], effects: ['爆炸', '缩放', '烟雾']},
    {tags: ['缩放'], effects: ['缩放']},
    {tags: [], effects: []},
    {tags: ['汉堡'], effects: ['粒子', '粒子']}
  ];
  for (const item of cases) {
    const row = buildSuccessRow({preview, tags: item.tags, effects: item.effects, current: CURRENT});
    // 端点 save 的同一套过滤（把实现抄一遍会漂移，所以这里直接按口径算一遍当期望值）：
    const excluded = new Set(CURRENT.excluded_tags);
    const manual = new Set(CURRENT.manual_tags);
    const manualEffect = new Set(CURRENT.manual_effect_tags);
    const expectEffects = item.effects.filter((tag, index) => item.effects.indexOf(tag) === index
      && tag.length <= 12 && !excluded.has(tag) && !manual.has(tag) && !manualEffect.has(tag)).slice(0, 12);
    assert.deepEqual(row.effect_tags, expectEffects, '模型效果标签：' + JSON.stringify(item.effects));
    assert.deepEqual(row.manual_effect_tags, CURRENT.manual_effect_tags);
    assert.deepEqual(row.ai_tags.length, item.tags.filter((tag) => !excluded.has(tag) && !manual.has(tag) && row.ai_tags.includes(tag)).length);
  }
});

/* ── 4) 前端：读取（多一档降级）/ 展示（人工层 + ＋）/ 搜索 ─────────────── */

test('v926 前端读取：多读一列 manual_effect_tags，sql/031 没跑时退回不带它的读法', () => {
  assert.match(appSource, /const PREVIEW_AI_TAGS_SELECT = '[^']*effect_tags,manual_effect_tags[^']*'/);
  assert.match(appSource, /const PREVIEW_AI_TAGS_SELECT_NO_MANUAL_EFFECT = '[^']*effect_tags[^']*'/);
  assert.match(appSource, /function isMissingPreviewManualEffectTagsColumn\(error\)/);
  assert.match(appSource, /isMissingPreviewManualEffectTagsColumn\(result\.error\)[\s\S]{0,200}?PREVIEW_AI_TAGS_SELECT_NO_MANUAL_EFFECT[\s\S]{0,200}?manual_effect_tags: \[\]/);
  // 优先级：先认 manual_effect_tags，再认 effect_tags（\b 词边界保证不会认错列）
  assert.ok(appSource.indexOf('isMissingPreviewManualEffectTagsColumn(result.error)') < appSource.indexOf('isMissingPreviewEffectTagsColumn(result.error)'),
    '两档降级的顺序：先少 manual_effect_tags 那一列，再少 effect_tags');
  assert.match(appSource, /new RegExp\('\\\\b' \+ column \+ '\\\\b'\)\.test\(message\)/);
});

// 真跑读库那一段：假 supabase 按 select 里带的列报缺列
function loadPreviewAiTagsReader() {
  const start = appSource.indexOf('  function isPreviewAiTagsUnavailableError(');
  const end = appSource.indexOf('  async function postCasePreviewAiTagAction(');
  assert.ok(start > 0 && end > start);
  const build = (responder) => {
    const calls = {selects: []};
    const client = {
      from() {
        const requested = {select: ''};
        const chain = {
          select(value) { requested.select = value; calls.selects.push(value); return chain; },
          eq() { return chain; },
          order() { return chain; },
          range() { return chain; },
          then(resolve, reject) { return Promise.resolve(responder(requested)).then(resolve, reject); }
        };
        return chain;
      }
    };
    const context = vm.createContext({
      state: {supabase: client, previewAiTagsByPreviewId: new Map()},
      CASE_PREVIEW_AI_TABLE: 'vf_preview_ai_tags',
      console: {warn: () => {}}
    });
    vm.runInContext('var previewAiTagsTableReady = null;\n' + appSource.slice(start, end)
      + '\n;({loadPreviewAiTagsForSource})', context);
    return {context, calls};
  };
  return {build};
}

test('v926 前端读取（真跑）：缺 manual_effect_tags 时退回不带它的读法，行里补空数组，编辑照旧可用', async () => {
  const {build} = loadPreviewAiTagsReader();
  const missing = build(({select}) => (select.includes('manual_effect_tags')
    ? {data: null, error: {message: "Could not find the 'manual_effect_tags' column of 'vf_preview_ai_tags' in the schema cache"}}
    : {data: [{preview_id: 'a', ai_tags: ['kiki'], manual_tags: [], effect_tags: ['爆炸'], status: 'success'}], error: null}));
  const rows = await missing.context.loadPreviewAiTagsForSource('src-1');
  assert.equal(missing.calls.selects.length, 2, '第一次带列被拒 → 第二次去掉那一列');
  assert.doesNotMatch(missing.calls.selects[1], /manual_effect_tags/);
  assert.match(missing.calls.selects[1], /effect_tags/, 'effect_tags 那一列还在（只少人工层）');
  assert.deepEqual(Array.from(rows[0].effect_tags), ['爆炸'], '其余列照常读到');
  assert.deepEqual(Array.from(rows[0].manual_effect_tags), [], '缺列时补空数组');
  assert.equal(vm.runInContext('previewAiTagsTableReady', missing.context), true, '编辑不该被这一列锁住');

  // 两列都缺（028 + 031 都没跑）：走到第三档
  const missingBoth = build(({select}) => {
    if (select.includes('manual_effect_tags')) return {data: null, error: {message: "Could not find the 'manual_effect_tags' column of 'vf_preview_ai_tags' in the schema cache"}};
    if (select.includes('effect_tags')) return {data: null, error: {message: "Could not find the 'effect_tags' column of 'vf_preview_ai_tags' in the schema cache"}};
    return {data: [{preview_id: 'b', ai_tags: [], manual_tags: ['汉堡'], status: 'success'}], error: null};
  });
  const rows2 = await missingBoth.context.loadPreviewAiTagsForSource('src-1');
  assert.equal(missingBoth.calls.selects.length, 3);
  assert.deepEqual(Array.from(rows2[0].manual_effect_tags), []);
  assert.deepEqual(Array.from(rows2[0].effect_tags), []);
  assert.deepEqual(Array.from(rows2[0].manual_tags), ['汉堡']);
});

/* 切片：动效标签两层取值（v926 新加的 casePreviewAiEffectTagLayers / 动态物料判定都在里面） */
const LAYER_START = '  function casePreviewAiEffectTagLayers(previewId) {';
const LAYER_END = '  function caseProjectFixedTagsHtml(source) {';

function loadEffectLayers({rows = {}, previews = [], stale = false} = {}) {
  const start = appSource.indexOf(LAYER_START);
  const end = appSource.indexOf(LAYER_END);
  assert.ok(start > 0 && end > start, '动效标签两层取值的片段必须切得出来');
  const context = vm.createContext({
    state: {libraryPreviews: previews},
    casePreviewAiRow: (id) => rows[id] || null,
    casePreviewAiContentKeyUnchanged: () => !stale
  });
  return vm.runInContext(appSource.slice(start, end)
    + '\n;({casePreviewAiEffectTagLayers, casePreviewAiEffectTags, casePreviewAiDynamicPreview, CASE_PREVIEW_AI_DYNAMIC_EXT})',
  context, {filename: 'app-v926-effect-layers.js'});
}

test('v926 前端取值：动效标签分两层（人工 + AI），合并口径给搜索用、同一词不重复', () => {
  const rows = {
    p1: {preview_id: 'p1', effect_tags: ['爆炸', '缩放'], manual_effect_tags: ['缩放', '粒子'], content_key: 'p.gif|12'}
  };
  const previews = [{id: 'p1', preview_path: 'p.gif', preview_size_bytes: 12}];
  const api = loadEffectLayers({rows, previews});
  const layers = api.casePreviewAiEffectTagLayers('p1');
  assert.deepEqual(Array.from(layers.manual), ['缩放', '粒子']);
  assert.deepEqual(Array.from(layers.ai), ['爆炸'], '两层都有的词只留在人工那层，别显示两遍');
  assert.deepEqual(Array.from(api.casePreviewAiEffectTags('p1')), ['缩放', '粒子', '爆炸'], '合并口径 = 人工在前 + AI 在后（搜索/补翻用）');
  // 画面换过（content_key 过期）⇒ 两层都作废（与元素标签口径一致）
  const staleApi = loadEffectLayers({rows, previews, stale: true});
  assert.deepEqual(Array.from(staleApi.casePreviewAiEffectTags('p1')), []);
  // 没有这一列（老行）⇒ 当空数组，不炸
  const legacy = loadEffectLayers({rows: {p2: {preview_id: 'p2', effect_tags: ['爆炸']}}, previews: [{id: 'p2'}]});
  assert.deepEqual(Array.from(legacy.casePreviewAiEffectTags('p2')), ['爆炸']);
});

test('v926 前端：动态物料判定（gif/mp4/mov/webm）——只有它才画动效那一行', () => {
  const api = loadEffectLayers({});
  assert.deepEqual(Array.from(api.CASE_PREVIEW_AI_DYNAMIC_EXT), ['gif', 'mp4', 'mov', 'webm']);
  assert.equal(api.casePreviewAiDynamicPreview({preview_path: 'case/a.gif'}), true);
  assert.equal(api.casePreviewAiDynamicPreview({preview_path: 'case/a.MP4'}), true);
  assert.equal(api.casePreviewAiDynamicPreview({preview_filename: 'x.webm'}), true);
  assert.equal(api.casePreviewAiDynamicPreview({preview_path: 'case/_small-1.gif'}), true, '只看后缀（缩略图路径也是 .gif 就算动态）');
  assert.equal(api.casePreviewAiDynamicPreview({preview_path: 'case/a.png'}), false);
  assert.equal(api.casePreviewAiDynamicPreview({}), false);
});

/* 切片：内联新增那一整套（与 tests/tag-inline-add-v926 同一段，这里只看动效那条路） */
const INLINE_START = '  const CASE_PREVIEW_AI_INLINE_ADD = {';
const INLINE_END = '  function wireCasePreviewAiHover(panel, manualTags, aiTags, excluded) {';
const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function loadInlineAdd({lang = 'zh', row = null, tags = [], effectManual = [], effectAi = [], dynamic = false} = {}) {
  const start = appSource.indexOf(INLINE_START);
  const end = appSource.indexOf(INLINE_END);
  assert.ok(start > 0 && end > start);
  const calls = {posts: [], alerts: []};
  const context = vm.createContext({
    state: {lang},
    console: {warn() {}},
    previewAiTagsTableReady: true,
    escapeHtml,
    escapeAttr: escapeHtml,
    libraryDisplayLabel: (value) => String(value == null ? '' : value),
    casePreviewAiRow: () => row,
    casePreviewAiTags: () => tags,
    casePreviewAiEffectTagLayers: () => ({manual: effectManual, ai: effectAi}),
    casePreviewAiDynamicPreview: () => dynamic,
    casePreviewAiStatusText: () => (lang === 'zh' ? '未识别' : 'Not analyzed'),
    casePreviewAiContentKeyUnchanged: () => true,
    wireCasePreviewAiHover: () => {},
    document: {getElementById: () => null},
    alert: (message) => { calls.alerts.push(String(message)); },
    renderLibraryGrid: () => {},
    postCasePreviewAiTagAction: (payload) => {
      calls.posts.push(payload);
      return Promise.resolve({preview_id: payload.previewId});
    }
  });
  const api = vm.runInContext(appSource.slice(start, end)
    + '\n;({CASE_PREVIEW_AI_INLINE_ADD, casePreviewAiInlineAddConfig, casePreviewAiEffectTagLayers, renderCasePreviewAiPanel, casePreviewAiInlineAddKeydown, casePreviewAiInlineAddDraft})',
  context, {filename: 'app-v926-inline-add-effect.js'});
  return {api, calls};
}

function renderEffectPanel(options) {
  const {api} = options.api ? options : loadInlineAdd(options);
  const panel = {dataset: {previewId: 'p1'}, innerHTML: '', __casePreviewAiRefresh: null, querySelector: () => null};
  api.renderCasePreviewAiPanel({querySelector: (selector) => (selector === '#case-preview-ai-panel' ? panel : null)},
    {id: 'p1', preview_path: options.previewPath || 'a.gif', preview_size_bytes: 1}, true);
  return {html: panel.innerHTML, panel, api};
}

test('v926 真渲：动效那一行末尾也有「＋」，人工动效 chip 带 ×、AI chip 不带', () => {
  const rendered = renderEffectPanel({effectManual: ['缩放'], effectAi: ['爆炸']});
  const html = rendered.html;
  assert.match(html, /<div class="case-preview-ai-effect">/);
  assert.match(html, /id="case-preview-ai-effect-add-plus"[^>]*>＋<\/button>/, '动效行末尾的 ＋');
  assert.match(html, /class="case-preview-ai-effect-tag is-manual" title="人工动效标签">缩放<button type="button" data-preview-effect-manual-remove="缩放"/,
    '人工动效标签带 ×（可删）');
  assert.match(html, /class="case-preview-ai-effect-tag" title="动效\/弹窗效果类型（AI 识别）">爆炸<\/span>/, 'AI 动效标签不带删除按钮');
  assert.ok(html.indexOf('id="case-preview-ai-effect-add-plus"') > html.indexOf('爆炸'), '＋ 在最后一个动效标签后面');
  assert.match(appSource, /const CASE_PREVIEW_AI_EFFECT_REMOVE_ATTR = 'data-preview-effect-manual-remove';/);
  assert.match(appSource, /action: 'manual-effect-remove'/);
});

test('v926 真渲：只有人工动效标签（AI 层空）时那一行照样显示；静态图无值时整行不出现', () => {
  const onlyManual = renderEffectPanel({effectManual: ['粒子'], effectAi: []});
  assert.match(onlyManual.html, /case-preview-ai-effect-title/, '只有人工标签也要出行（否则看不见自己加的词）');
  assert.match(onlyManual.html, /data-preview-effect-manual-remove="粒子"/);

  const dynamicEmpty = renderEffectPanel({effectManual: [], effectAi: [], dynamic: true});
  assert.match(dynamicEmpty.html, /id="case-preview-ai-effect-add-plus"/, '动态物料即使还没有任何动效标签，也要给个 ＋ 入口');

  const staticEmpty = renderEffectPanel({effectManual: [], effectAi: [], dynamic: false, previewPath: 'a.png'});
  assert.doesNotMatch(staticEmpty.html, /case-preview-ai-effect-title/, '静态图不该凭空多一行');
  assert.doesNotMatch(staticEmpty.html, /case-preview-ai-effect-add-plus/);
  assert.match(staticEmpty.html, /id="case-preview-ai-add-plus"/, '元素那一行的 ＋ 照旧在');

  // 展开成小输入框时：只有一个小输入框 + ✓，＋ 收起
  const opened = {dataset: {previewId: 'p1', adding: 'effect'}, innerHTML: '', __casePreviewAiRefresh: null, querySelector: () => null};
  const api = loadInlineAdd({effectManual: [], effectAi: [], dynamic: true}).api;
  api.renderCasePreviewAiPanel({querySelector: (selector) => (selector === '#case-preview-ai-panel' ? opened : null)}, {id: 'p1', preview_path: 'a.gif'}, true);
  assert.match(opened.innerHTML, /id="case-preview-ai-effect-add-input"/);
  assert.match(opened.innerHTML, /id="case-preview-ai-effect-add-confirm"[^>]*>✓<\/button>/);
  assert.doesNotMatch(opened.innerHTML, /id="case-preview-ai-effect-add-plus"/);
  assert.match(opened.innerHTML, /id="case-preview-ai-add-plus"/, '元素那一行不受影响（两个 row 各自独立）');
});

test('v926 回车（动效那行）= manual-effect-add：写的是人工动效层、不会走成元素那条', async () => {
  const {api, calls} = loadInlineAdd({effectManual: [], effectAi: []});
  const panel = {dataset: {previewId: 'p1', adding: 'effect'}, innerHTML: '', __casePreviewAiRefresh: () => {}, querySelector: () => null};
  const input = {id: 'case-preview-ai-effect-add-input', value: ' 粒子 ', disabled: false, closest: (selector) => (selector === '#case-preview-ai-panel' ? panel : null)};
  const handled = api.casePreviewAiInlineAddKeydown({key: 'Enter', target: input, preventDefault() {}, stopPropagation() {}});
  assert.equal(handled, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.posts.length, 1);
  const payload = Object.assign({}, calls.posts[0]);
  assert.equal(payload.action, 'manual-effect-add', '必须调动效那条 action');
  assert.equal(payload.tag, '粒子');
  assert.equal(payload.previewId, 'p1');
  assert.equal(panel.dataset.adding, 'effect', '输入框保持打开（连着加）');
  assert.equal(api.casePreviewAiInlineAddDraft.effect, '', '草稿清空');
  assert.equal(api.casePreviewAiInlineAddDraft.element, undefined, '不许串到元素那层');
});

test('v926 搜索：手工加的动效词也能被搜到（caseProjectEffectTags 走合并口径）', () => {
  // 搜索路径用的就是 casePreviewAiEffectTags（v918 锁了那条表达式），v926 把它改成"人工 + AI 合并"
  assert.match(appSource, /function caseProjectEffectTags\(materials\) \{[\s\S]{0,200}?casePreviewAiEffectTags\(material && material\.id\)/);
  assert.match(appSource, /const effectTags = projectMaterials\s*\n\s*\? caseProjectEffectTags\(projectMaterials\)\s*\n\s*: casePreviewAiEffectTags\(preview\.id\);/);
  const rows = {p1: {preview_id: 'p1', effect_tags: [], manual_effect_tags: ['粒子'], content_key: 'g.gif|1'}};
  const api = loadEffectLayers({rows, previews: [{id: 'p1', preview_path: 'g.gif', preview_size_bytes: 1}]});
  assert.ok(api.casePreviewAiEffectTags('p1').includes('粒子'), '人工动效词进搜索文本');
  assert.match(appSource, /\(casePreviewAiEffectTags\(preview && preview\.id\) \|\| \[\]\)\.forEach\(push\)/, '补英文名也要收它');
});

test('v926 接线：动效行的 × → manual-effect-remove（点完重画面板 + 刷列表）', () => {
  assert.match(appSource, /const removeManualEffectTag = event\.target\.closest\('\[data-preview-effect-manual-remove\]'\);/);
  assert.match(appSource, /getAttribute\('data-preview-effect-manual-remove'\)/);
  assert.match(appSource, /postCasePreviewAiTagAction\(\{action: 'manual-effect-remove', previewId: previewId, tag: tag\}\)\.then\(function\(\) \{\s*\n\s*refreshCasePreviewAiPanel\(backdrop, panel\);\s*\n\s*renderLibraryGrid\(\);/);
  // 元素那条（data-preview-manual-remove）保持原样，两条各有各的分支
  assert.match(appSource, /data-preview-manual-remove[\s\S]{0,200}?action: 'manual-remove'/);
  assert.match(appSource, /action: 'manual-add'/, '元素那条人工新增不动');
});

test('v926 版本号六处同步（第二部分没改版本号，仍是同一个 v926）', () => {
  assert.equal((indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || []).length, 5);
  assert.match(appSource, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  assert.match(sqlSource, /sql\/031/);
});
