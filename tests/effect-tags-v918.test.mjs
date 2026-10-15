// v918（2026-10-14）：动态物料的「效果类型」标签（vf_preview_ai_tags.effect_tags）。
//
// 用户口径（原话）：
//   「动态弹窗跟静态物料的标签识别要有区别，除了识别元素标签外，**还要识别弹窗的效果类型标签**，
//     比如爆炸、冲击力、场景氛围、体现利益点等类型的标签。」「动态的标签、**可搜索**。」
//
// 这一维的四条硬口径（本文件逐条锁住）：
//   ① 与元素标签**并列但独立**：单独一列 effect_tags，不进 ai_tags，也不进元素筛选 chips；
//   ② **只有动态物料**（gif/mp4/mov/webm 抽帧那条路）才请求，静态图一律写空数组；
//   ③ **受控词表**：候选词只来自 vf_tag_vocabulary 里 kind='effect' 的行（sql/028 的 15 个种子词），
//      模型挑了词表外的词一律丢掉（不许在词表里裂出近义词）——上限 3 条、每条 ≤5 字；
//   ④ **可搜索**：搜索文本聚合要把 effect_tags 算进去（搜「爆炸」能命中这些物料）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseEffectSuggestions,
  parseCaseTagSuggestions,
  parseCaseTagGroups,
  analyzeCaseTagsWithGlm,
  analyzeCaseTagGroupsWithGlm,
  isNoiseElementTag,
  EFFECT_TAG_MAX_CHARS,
  EFFECT_TAG_MAX_COUNT
} from '../functions/_ai.js';
import { handleCasePreviewAiTags } from '../functions/api/case-preview-ai-tags.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const appSource = readFileSync(join(ROOT, 'app.js'), 'utf8');
const aiSource = readFileSync(join(ROOT, 'functions', '_ai.js'), 'utf8');
const endpointSource = readFileSync(join(ROOT, 'functions', 'api', 'case-preview-ai-tags.js'), 'utf8');
const scriptSource = readFileSync(join(ROOT, 'scripts', 'recognize-case-tags.mjs'), 'utf8');
const sqlSource = readFileSync(join(ROOT, 'sql', '028_effect_tags.sql'), 'utf8');

// sql/028 里的 15 个效果种子词（三个维度各 5 个）—— 这是**唯一**的候选来源
const EFFECT_SEEDS = [
  '爆炸', '粒子', '光效', '水花', '烟雾', '闪光',
  '缩放', '抖动', '弹跳', '旋转', '滑入', '展开',
  '利益点凸显', '氛围营造', '悬念引导'
];

/* ── 1) parseEffectSuggestions：只说词表里的词 ─────────────────────────── */

test('v918 解析：只收效果词表里的词，词表外的一律丢掉（不编造）', () => {
  // 「冲击力」是用户举的例子，但**不在**受控词表里 ⇒ 收不到（词表外的一律丢，这是这一维的地基）
  assert.deepEqual(parseEffectSuggestions('{"effects":["爆炸","冲击力","粒子"]}', EFFECT_SEEDS), ['爆炸', '粒子']);
  assert.deepEqual(parseEffectSuggestions('{"effects":["Boom","explosion!"]}', EFFECT_SEEDS), [], '英文词不在词表里也不收');
  assert.deepEqual(parseEffectSuggestions('{"effects":["爆炸"]}', []), [], '没给词表 = 一个都不收');
  assert.deepEqual(parseEffectSuggestions('{"effects":[]}', EFFECT_SEEDS), []);
  assert.deepEqual(parseEffectSuggestions('这段动效是爆炸加粒子', EFFECT_SEEDS), [], '没有 JSON 就不猜（元素那条路才有按行兜底）');
  assert.deepEqual(parseEffectSuggestions('', EFFECT_SEEDS), []);
  assert.deepEqual(parseEffectSuggestions(null, EFFECT_SEEDS), []);
});

test('v918 解析：归一化（去空格 + 小写）后返回词表自己的写法', () => {
  assert.deepEqual(parseEffectSuggestions('{"effects":[" 缩放 ","利益点凸显"]}', EFFECT_SEEDS), ['缩放', '利益点凸显']);
  assert.deepEqual(parseEffectSuggestions('{"effects":["光 效"]}', EFFECT_SEEDS), ['光效'], '去空格后命中词表写法');
  assert.deepEqual(parseEffectSuggestions('{"effects":["缩放（放大效果）"]}', EFFECT_SEEDS), ['缩放'], '括号里的补充说明剥掉');
  // 词表里同一个词有两种写法（空格/大小写不同）时，命中的是**先出现的那个写法**（与元素标签同口径）。
  // 真实调用链上不会出现这种词表：脚本读词表时已按「去空格+小写」去过重（见 effectVocabularyFromRows）。
  assert.deepEqual(parseEffectSuggestions('{"effects":["缩放"]}', [' 缩放 ', '缩放']), [' 缩放 ']);
  // 「缩放放大」这种更长说法按包含关系归到词表里最长的那个词（与 parseElementSuggestions 同口径）
  assert.deepEqual(parseEffectSuggestions('{"effects":["缩放放大"]}', EFFECT_SEEDS), ['缩放']);
});

test('v918 解析：最多 3 条、每条 ≤5 字，超出丢弃', () => {
  assert.deepEqual(parseEffectSuggestions('{"effects":["爆炸","粒子","光效","水花","烟雾"]}', EFFECT_SEEDS), ['爆炸', '粒子', '光效']);
  assert.deepEqual(parseEffectSuggestions('{"effects":["这是一个很长的效果描述词"]}', EFFECT_SEEDS), [], '超 5 字直接丢');
  assert.equal(EFFECT_TAG_MAX_COUNT, 3);
  assert.equal(EFFECT_TAG_MAX_CHARS, 5);
  assert.match(aiSource, new RegExp('最多 \\$\\{EFFECT_TAG_MAX_COUNT\\} 条，每条不超过 \\$\\{EFFECT_TAG_MAX_CHARS\\} 个字'),
    '提示词里的条数 / 字数上限要跟着常量走，别写成死数字');
});

test('v918 解析：v907 的噪音黑名单同样兜底（词表被写脏也不放行）', () => {
  const polluted = ['爆炸', '文字', '绿色背景', '数字3'];
  assert.deepEqual(parseEffectSuggestions('{"effects":["爆炸","文字","绿色背景","数字3"]}', polluted), ['爆炸']);
  assert.equal(isNoiseElementTag('文字'), true);
  assert.match(aiSource, /if \(isNoiseElementTag\(finalWord\)\) continue;[\s\S]{0,40}v907 噪音黑名单/);
});

/* ── 2) 返回值：effects 与 elements / activity 并列，原语义不变 ───────────── */

test('v918 解析：effects 与 elements / activity 并列返回，原语义一字不动', () => {
  const out = parseCaseTagSuggestions(
    '{"elements":["餐桌","爆炸"],"activity":"聚餐","effects":["爆炸","缩放","编造词"]}', ['餐桌'], ['聚餐'], EFFECT_SEEDS);
  assert.deepEqual(out.elements, ['餐桌', '爆炸'], 'elements 照旧（词表外的元素仍保留）');
  assert.equal(out.activity, '聚餐');
  assert.deepEqual(out.effects, ['爆炸', '缩放'], '效果只留词表内的两个词');

  const grouped = parseCaseTagGroups(
    '{"sameDesign":true,"elements":["牛排"],"activity":"聚餐","effects":["缩放","缩放","动画"]}', ['牛排'], ['聚餐'], EFFECT_SEEDS);
  assert.deepEqual(grouped, { elements: ['牛排'], activity: '聚餐', effects: ['缩放'], sameDesign: true });

  // 不给效果词表（浏览器上传/按组那条路就是这么调的）= 退回改动前的行为
  const legacy = parseCaseTagSuggestions('{"elements":["餐桌"],"effects":["爆炸"]}', ['餐桌'], []);
  assert.deepEqual(legacy.effects, [], '没给词表 ⇒ 一个效果词都不产出');
  assert.deepEqual(legacy, { elements: ['餐桌'], activity: '', effects: [] });
});

/* ── 3) 提示词：只有给了效果词表才出现那一段 ─────────────────────────────── */

// 拦住智谱那一次请求，把提示词原文捞回来（不联网）
async function capturePrompt(run) {
  const captured = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    captured.push({ url: String(url), body: JSON.parse(init.body || '{}') });
    return Response.json({
      choices: [{ message: { content: '{"sameDesign":true,"elements":["餐桌"],"activity":"","effects":["缩放","爆炸"]}' } }]
    });
  };
  try {
    const result = await run({ GLM_API_KEY: 'glm-key' });
    return { prompt: captured.at(-1).body.messages[0].content.map((part) => part.text || '').join(''), result };
  } finally {
    globalThis.fetch = original;
  }
}

const TINY_IMAGE = 'data:image/png;base64,' + 'A'.repeat(40);

test('v918 提示词：给了效果词表才加那一段，问的是"效果类型"，并写死 v907 口径', async () => {
  const withEffects = await capturePrompt((env) => analyzeCaseTagsWithGlm(env, TINY_IMAGE, ['餐桌'], ['聚餐'], EFFECT_SEEDS));

  assert.match(withEffects.prompt, /效果类型/);
  assert.match(withEffects.prompt, /只从这份效果词表里挑，挑不到就返回空数组，不要编造词表外的词/);
  assert.match(withEffects.prompt, /利益点凸显 \/ 缩放/, '要给例子（价格从下方弹出放大 → 利益点凸显 / 缩放）');
  assert.match(withEffects.prompt, /最多 3 条，每条不超过 5 个字/);
  assert.match(withEffects.prompt, /"effects":\["缩放","利益点凸显"\]/, '输出 JSON 里要带 effects 字段（与 elements/activity 并列）');
  EFFECT_SEEDS.forEach((word) => assert.ok(withEffects.prompt.includes(word), '候选词要全列给模型：' + word));
  assert.deepEqual(withEffects.result.effects, ['缩放', '爆炸']);

  // 不给效果词表（浏览器那条路）⇒ 一个字都不多
  const without = await capturePrompt((env) => analyzeCaseTagsWithGlm(env, TINY_IMAGE, ['餐桌'], ['聚餐']));
  assert.doesNotMatch(without.prompt, /效果类型/, '没给词表就不许问效果');
  assert.doesNotMatch(without.prompt, /"effects"/, '没给词表时输出格式里也不许出现 effects');
  assert.deepEqual(without.result.effects, [], '解析层照样返回 effects（空数组），调用方不用判 key 在不在');
});

test('v918 提示词：按组识别（多图）走同一段效果提示词', async () => {
  const grouped = await capturePrompt((env) => analyzeCaseTagGroupsWithGlm(env, [TINY_IMAGE, TINY_IMAGE], ['牛排'], ['聚餐'], EFFECT_SEEDS));
  assert.match(grouped.prompt, /同一条物料的多张图片|同一条物料的不同语言版本/);
  assert.match(grouped.prompt, /效果类型/);
  assert.match(grouped.prompt, /"effects":\["缩放","利益点凸显"\]/);
  assert.deepEqual(grouped.result.effects, ['缩放', '爆炸']);

  const legacy = await capturePrompt((env) => analyzeCaseTagGroupsWithGlm(env, [TINY_IMAGE, TINY_IMAGE], ['牛排'], ['聚餐']));
  assert.doesNotMatch(legacy.prompt, /效果类型/);
});

/* ── 4) sql/028：列 / kind 收全 / effect 不被删孤儿 / 触发器 / 15 个种子词 ── */

test('v918 sql/028：加了 effect_tags 列（not null 默认空数组）', () => {
  assert.match(sqlSource, /alter table public\.vf_preview_ai_tags\s*\n\s*add column if not exists effect_tags text\[\] not null default '\{\}'::text\[\];/);
  assert.match(sqlSource, /comment on column public\.vf_preview_ai_tags\.effect_tags is/);
});

test('v918 sql/028：同步函数按来源给 kind（元素→element / effect_tags→effect），不再写死', () => {
  assert.match(sqlSource, /create or replace function public\.vf_sync_tag_vocabulary\(\)/);
  // 四路元素来源
  assert.match(sqlSource, /select unnest\(tags\) as name_zh, 'element'::text as kind from public\.vf_source_files/);
  assert.match(sqlSource, /select material_type, 'element'::text from public\.vf_asset_previews/);
  assert.match(sqlSource, /select unnest\(manual_tags\), 'element'::text from public\.vf_preview_ai_tags/);
  assert.match(sqlSource, /select unnest\(ai_tags\), 'element'::text from public\.vf_preview_ai_tags/);
  // 第五路：效果标签
  assert.match(sqlSource, /select unnest\(effect_tags\), 'effect'::text from public\.vf_preview_ai_tags/);
  // 插入时用 CTE 给的 kind（不许再写死 'element'）
  assert.match(sqlSource, /insert into public\.vf_tag_vocabulary \(id, name_zh, kind, source\)\s*\n\s*select 'el:' \|\| name_zh, name_zh, kind, 'auto'/);
  assert.doesNotMatch(sqlSource, /select 'el:' \|\| name_zh, name_zh, 'element', 'auto'/);
});

test('v918 sql/028：删孤儿覆盖 effect_tags，但 kind=effect 的行永不删（有意例外）', () => {
  assert.match(sqlSource, /unnest\(a\.manual_tags \|\| a\.ai_tags \|\| a\.effect_tags\)/);
  assert.match(sqlSource, /where v\.kind is distinct from 'effect'\s*\n\s*and btrim\(v\.name_zh\) not in \(select name_zh from used_clean\)/);
  assert.match(sqlSource, /受控词表/, '注释里要写清为什么 effect 是例外');
  assert.match(sqlSource, /kind=''effect'' 的行永不删|kind=''effect''/);
});

test('v918 sql/028：重建 UPDATE 触发器，WHEN 条件带上 effect_tags', () => {
  assert.match(sqlSource, /drop trigger if exists vf_tag_sync_preview_ai_tags_upd on public\.vf_preview_ai_tags;/);
  assert.match(sqlSource, /when \(old\.ai_tags is distinct from new\.ai_tags\s*\n\s*or old\.manual_tags is distinct from new\.manual_tags\s*\n\s*or old\.effect_tags is distinct from new\.effect_tags\)/);
  assert.match(sqlSource, /execute function public\.vf_sync_tag_vocabulary_trigger\(\);/);
});

test('v918 sql/028：15 个效果种子词（kind=effect，source=manual），并立刻同步一次 + 自检', () => {
  assert.equal((sqlSource.match(/'(el:[^']+)',\s*'([^']+)',\s*'effect',\s*'manual'\)/g) || []).length, 15, '正好 15 个种子词');
  EFFECT_SEEDS.forEach((word) => {
    assert.match(sqlSource, new RegExp("\\('el:" + word + "',\\s*'" + word + "',\\s*'effect',\\s*'manual'\\)"), '种子词：' + word);
  });
  assert.match(sqlSource, /on conflict \(name_zh\) do nothing;/);
  assert.match(sqlSource, /select public\.vf_sync_tag_vocabulary\(\);/);
  // 自检：四件事都要能验
  assert.match(sqlSource, /from information_schema\.columns[\s\S]{0,200}?column_name = 'effect_tags'/);
  assert.match(sqlSource, /position\('effect_tags' in pg_get_functiondef\(p\.oid\)\) > 0 as 收全含effect_tags/);
  assert.match(sqlSource, /pg_get_triggerdef\(t\.oid\) like '%effect_tags%' as 认effect变更/);
  assert.match(sqlSource, /select count\(\*\) as effect词数 from public\.vf_tag_vocabulary where kind = 'effect';/);
});

/* ── 5) 端点 save：接收 effect_tags，列不存在时降级 ─────────────────────── */

const previewId = '11111111-1111-4111-8111-111111111111';
const contentKey = 'p.png|12|2026-10-10T00:00:00Z';
const currentRow = { preview_id: previewId, ai_tags: ['旧标签'], manual_tags: ['kiki'], excluded_tags: ['烤肉'], status: 'success' };

// 假 Supabase：记录每一次写库载荷；renderPost 决定 POST 怎么回（用来模拟 sql/028 没执行）
async function saveViaEndpoint({ tags = [], effectTags, existing = currentRow, renderPost = (row) => Response.json([row]) }) {
  const writes = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/auth/v1/user')) return Response.json({ id: '22222222-2222-4222-8222-222222222222', app_metadata: {}, user_metadata: {} });
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{ role: 'admin' }]);
    if (value.includes('/rest/v1/vf_asset_previews')) {
      return Response.json([{ id: previewId, source_file_id: 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5', preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-10T00:00:00Z' }]);
    }
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method || 'GET') === 'GET') return Response.json([existing]);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method === 'POST') {
      const row = JSON.parse(init.body);
      writes.push(row);
      return renderPost(row);
    }
    throw new Error('Unexpected request: ' + value);
  };
  try {
    const body = { action: 'save', previewId, tags, model: 'glm-4v-flash-frames', contentKey };
    if (effectTags !== undefined) body.effectTags = effectTags;
    const request = new Request('https://local.invalid/api/case-preview-ai-tags', {
      method: 'POST',
      headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const response = await handleCasePreviewAiTags(request, { SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' });
    return { status: response.status, data: await response.json(), writes };
  } finally {
    globalThis.fetch = original;
  }
}

test('v918 端点 save：带 effectTags 就写 effect_tags，去重口径与 ai_tags 同一条', async () => {
  const { status, data, writes } = await saveViaEndpoint({
    tags: ['爆炸', '餐桌', 'kiki'],
    effectTags: ['爆炸', '缩放', 'kiki', '烤肉', '缩放']
  });
  assert.equal(status, 200);
  assert.equal(writes.length, 1, '列存在时只写一次');
  const row = writes[0];
  assert.deepEqual(row.ai_tags, ['爆炸', '餐桌'], 'ai_tags：人工词 kiki 与排除词烤肉都不进（v914 口径）');
  assert.deepEqual(row.effect_tags, ['爆炸', '缩放'], 'effect_tags 同一条口径（kiki 是人工词、烤肉已排除）');
  assert.deepEqual(row.manual_tags, ['kiki'], '人工标签原样保留');
  assert.deepEqual(row.excluded_tags, ['烤肉'], '排除列原样保留');
  assert.deepEqual(data.row.effect_tags, ['爆炸', '缩放']);
});

test('v918 端点 save：调用方不带 effectTags 时**不碰**这一列（浏览器识别路不产出效果标签）', async () => {
  const { writes } = await saveViaEndpoint({ tags: ['餐桌'] });
  assert.ok(!('effect_tags' in writes[0]), '载荷里不许出现 effect_tags —— 否则会把脚本写好的效果标签清空');
});

test('v918 端点 save：sql/028 没执行（PGRST204 缺列）时摘掉该列重写一次，不报错', async () => {
  const { status, data, writes } = await saveViaEndpoint({
    tags: ['餐桌'],
    effectTags: ['爆炸'],
    renderPost: (row) => ('effect_tags' in row
      ? new Response(JSON.stringify({
        code: 'PGRST204',
        message: "Could not find the 'effect_tags' column of 'vf_preview_ai_tags' in the schema cache"
      }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      : Response.json([row]))
  });
  assert.equal(status, 200, '降级要成功返回，不许把整条写入判失败');
  assert.equal(writes.length, 2, '第一次带列被拒 → 摘掉该列重写一次');
  assert.ok('effect_tags' in writes[0]);
  assert.ok(!('effect_tags' in writes[1]));
  assert.deepEqual(writes[1].ai_tags, ['餐桌'], '摘掉 effect_tags 后，其余列一字不动');
  assert.equal(data.success, true);
});

test('v918 端点源码：缺列只认那一种错（别的错误照旧抛出去）', () => {
  // v926：这一列不再是"唯一"的可选列（多了 manual_effect_tags）⇒ 降级改成通用的"摘掉报文点名的那一列"
  assert.match(endpointSource, /export const OPTIONAL_TAG_COLUMNS = \['effect_tags', 'manual_effect_tags'\];/);
  assert.match(endpointSource, /export function isMissingOptionalColumn\(error, column\)/);
  assert.match(endpointSource, /new RegExp\('\\\\b' \+ column \+ '\\\\b'\)\.test\(message\)/);
  assert.match(endpointSource, /export function withoutMissingOptionalColumns\(row, error\)/);
  assert.match(endpointSource, /delete next\[column\];/);
  // exclude 这个动作的载荷里**不许**带 effect_tags（merge-duplicates 只动带上的列 ⇒ 不带就等于原样保留）
  const excludeBlock = endpointSource.slice(endpointSource.indexOf("if (action === 'exclude')"), endpointSource.indexOf("if (action === 'manual-add')"));
  assert.doesNotMatch(excludeBlock, /effect_tags/);
  // v926：manual-effect-add 是**故意**带 effect_tags 的（同一个词只留一份：加进人工层就从 AI 层摘掉），
  // 所以这里只锁「别把 report 里没点名的列也顺手带上」这一层语义 —— manual-remove / restore 仍不许带。
  const manualRemoveBlock = endpointSource.slice(endpointSource.indexOf("if (action === 'manual-remove')"), endpointSource.indexOf("if (action === 'manual-effect-add')"));
  const restoreBlock = endpointSource.slice(endpointSource.indexOf("if (action === 'restore')"));
  assert.doesNotMatch(manualRemoveBlock, /base\.effect_tags = /, '删人工元素标签不该动 AI 动效层');
  assert.doesNotMatch(restoreBlock, /base\.effect_tags = /, '撤销排除不该动 AI 动效层');
  assert.doesNotMatch(restoreBlock, /manual_effect_tags/, '撤销排除也不该动人工动效层');
  // v926 改口径：manual-add **不再清任何字段**（只加词 + 更新 content_key）。
  // 「画面变过就作废」现在只留在 status / save 两条识别流程路径上（v870 / v924 两个文件的用例守着）。
  const manualAddBlock = endpointSource.slice(endpointSource.indexOf("if (action === 'manual-add')"), endpointSource.indexOf("if (action === 'manual-remove')"));
  assert.doesNotMatch(manualAddBlock, /base\.ai_tags = \[\];/, '人工加一个词不该把 AI 标签清空');
  assert.doesNotMatch(manualAddBlock, /base\.effect_tags = \[\];/, '人工加一个词不该把动效标签清空');
  assert.doesNotMatch(manualAddBlock, /base\.status = 'idle';/, '人工加一个词不该把状态打回待识别');
  assert.doesNotMatch(manualAddBlock, /contentKeyUnchanged\(/, '人工编辑这条路不再做内容比对');
});

/* ── 6) 前端：展示一行 + 可搜索 + 词表页标记 ───────────────────────────── */

test('v918 前端展示：项目浮窗多一行「动效标签」，无值且非动态物料就不出现，中英双语', () => {
  // v926：这一行改成分两层取（人工层 + AI 层），可见性也带上"动态物料即使还没值也出行"（否则没有 ＋ 入口）
  assert.match(appSource, /const effectLayers = casePreviewAiEffectTagLayers\(preview\.id\);/);
  assert.match(appSource, /const effectTags = effectLayers\.manual\.concat\(effectLayers\.ai\);/);
  assert.match(appSource, /const showEffectRow = effectTags\.length > 0 \|\| \(canEdit && casePreviewAiDynamicPreview\(preview\)\);/);
  assert.match(appSource, /'<span class="case-preview-ai-effect-title">' \+ \(state\.lang === 'zh' \? '动效标签' : 'Motion tags'\)/);
  // v929：动效行的 div 上多挂一个「加号态」class（× 的显隐靠它），"整行不出现"这条判断没变
  assert.match(appSource, /\(!showEffectRow \? '' : '<div class="case-preview-ai-effect' \+ \(addingKind === 'effect' \? ' is-adding' : ''\) \+ '">'/, '没有值又不是动态物料就整行不出现');
  assert.match(appSource, /case-preview-ai-effect-tag/);
  assert.match(appSource, /\.case-preview-ai-effect \{ grid-column: 1 \/ -1;/, '新行占满整行，不挤坏原来那行标签');
});

test('v918 前端读取：effect_tags 列缺失（sql/028 没执行）只降级读，不封住标签编辑', () => {
  assert.match(appSource, /function isMissingPreviewEffectTagsColumn\(error\)/);
  assert.match(appSource, /const PREVIEW_AI_TAGS_SELECT = '[^']*effect_tags[^']*'/);
  assert.match(appSource, /const PREVIEW_AI_TAGS_SELECT_NO_EFFECT = '[^']*'/);
  assert.match(appSource, /isMissingPreviewEffectTagsColumn\(result\.error\)[\s\S]{0,240}?PREVIEW_AI_TAGS_SELECT_NO_EFFECT[\s\S]{0,120}?previewAiTagsTableReady = true;/);
  assert.match(appSource, /manual_tags: \[\], effect_tags: \[\]/, '两道降级都兜住 effect_tags');
});

// 真的把那一段读库代码切出来跑（假 supabase：select 里带 effect_tags 就报缺列）
function loadPreviewAiTagsReader() {
  const loadStart = appSource.indexOf('  function isPreviewAiTagsUnavailableError(');
  const loadEnd = appSource.indexOf('  async function postCasePreviewAiTagAction(');
  assert.ok(loadStart > 0 && loadEnd > loadStart);
  const build = (responder) => {
    const calls = { selects: [] };
    const client = {
      from() {
        const requested = { select: '' };
        const chain = {
          select(value) { requested.select = value; calls.selects.push(value); return chain; },
          eq() { return chain; },
          order() { return chain; },
          range() { return chain; },
          then(resolve, reject) {
            return Promise.resolve(responder(requested)).then(resolve, reject);
          }
        };
        return chain;
      }
    };
    const context = vm.createContext({
      state: { supabase: client, previewAiTagsByPreviewId: new Map() },
      CASE_PREVIEW_AI_TABLE: 'vf_preview_ai_tags',
      console: { warn: () => {} }
    });
    vm.runInContext('var previewAiTagsTableReady = null;\n' + appSource.slice(loadStart, loadEnd)
      + '\n;({ loadPreviewAiTagsForSource, readPreviewAiTagsRows })', context);
    return { context, calls };
  };
  return { build };
}

test('v918 前端读取（真跑）：缺 effect_tags 列时退回不带该列的读法，行里补空数组，编辑照旧可用', async () => {
  const { build } = loadPreviewAiTagsReader();
  const missing = build(({ select }) => (select.includes('effect_tags')
    ? { data: null, error: { message: "Could not find the 'effect_tags' column of 'vf_preview_ai_tags' in the schema cache" } }
    : { data: [{ preview_id: 'a', ai_tags: ['kiki'], manual_tags: [], status: 'success' }], error: null }));
  const rows = await missing.context.loadPreviewAiTagsForSource('src-1');
  assert.equal(missing.calls.selects.length, 2, '第一次带列被拒 → 第二次去掉那一列');
  assert.doesNotMatch(missing.calls.selects[1], /effect_tags/);
  assert.deepEqual(Array.from(rows, (row) => row.preview_id), ['a'], '其余列照常读到');
  assert.deepEqual(Array.from(rows[0].effect_tags), [], '缺列时补空数组');
  assert.equal(vm.runInContext('previewAiTagsTableReady', missing.context), true, '编辑不该被这一列锁住');

  // 列在时：一次读成，effect_tags 原样带回来
  const present = build(() => ({ data: [{ preview_id: 'b', ai_tags: [], manual_tags: [], effect_tags: ['爆炸'], status: 'success' }], error: null }));
  const rows2 = await present.context.loadPreviewAiTagsForSource('src-1');
  assert.equal(present.calls.selects.length, 1);
  assert.deepEqual(Array.from(rows2[0].effect_tags), ['爆炸']);
});

test('v918 前端搜索：libraryItemSearchText 把 effect_tags 也算进候选文本（搜「爆炸」命中）', () => {
  assert.match(appSource, /function caseProjectEffectTags\(materials\)/);
  assert.match(appSource, /const effectTags = projectMaterials\s*\n\s*\? caseProjectEffectTags\(projectMaterials\)\s*\n\s*: casePreviewAiEffectTags\(preview\.id\);/);
  assert.match(appSource, /\.concat\(materialTypes, visibleLibraryTags\(source\), elementTags, effectTags\)/);
  assert.match(appSource, /function casePreviewAiEffectTags\(previewId\)/);
  assert.match(appSource, /\(casePreviewAiEffectTags\(preview && preview\.id\) \|\| \[\]\)\.forEach\(push\)/, '英文界面补翻候选也要收它');
  // 动效标签**不进**元素筛选那一行（caseProjectElementTags 仍然只吃 ai_tags + manual_tags）
  assert.match(appSource, /function caseProjectElementTags\(materials\) \{[\s\S]{0,220}?casePreviewAiTags\(material && material\.id\)/);
  assert.doesNotMatch(appSource, /function caseProjectElementTags\(materials\) \{[\s\S]{0,220}?casePreviewAiEffectTags/);
});

// 真的把「搜索聚合」那段切出来跑：效果标签必须能被搜到
test('v918 前端搜索（真跑）：项目卡的搜索文本里有动效标签，元素聚合仍不含它', () => {
  const searchStart = appSource.indexOf('  // v903 逐图元素标签聚合');
  const searchEnd = appSource.indexOf('  // v829 搜索词扩展');
  assert.ok(searchStart > 0 && searchEnd > searchStart);
  const previews = [
    { id: 'm1', source_file_id: 'p1', preview_filename: 'a.gif', material_type: '弹窗' },
    { id: 'm2', source_file_id: 'p1', preview_filename: 'b.png', material_type: '头图' }
  ];
  const context = vm.createContext({
    state: { libraryPreviews: previews },
    LIBRARY_SEARCH_PINYIN: {},
    LIBRARY_SEARCH_EN_EXTRA: {},
    LIBRARY_LABELS_EN: {},
    libraryKindOfSource: () => 'source',
    libraryKindLabel: () => '案例库项目',
    optionNameById: () => '',
    visibleLibraryTags: (source) => source.tags || [],
    isCaseProject: (source) => !!source && source.caseProject === true,
    caseMaterialsOf: (source) => previews.filter((p) => p.source_file_id === source.id),
    casePreviewAiTags: (id) => (id === 'm2' ? ['餐桌'] : []),
    casePreviewAiEffectTags: (id) => (id === 'm1' ? ['爆炸', '缩放'] : [])
  });
  vm.runInContext(appSource.slice(searchStart, searchEnd)
    + ';({ libraryItemSearchText, caseProjectElementTags, caseProjectEffectTags })', context);

  const project = { id: 'p1', title: 'Ramadan', tags: [], caseProject: true };
  const text = context.libraryItemSearchText({ source: project, preview: previews[1] });
  assert.ok(text.includes('爆炸') && text.includes('缩放'), '项目卡搜索文本要含动效标签（搜「爆炸」能命中）');
  assert.ok(text.includes('餐桌'), '元素标签照旧在里面');
  assert.deepEqual(Array.from(context.caseProjectEffectTags(previews)), ['爆炸', '缩放']);
  assert.deepEqual(Array.from(context.caseProjectElementTags(previews)), ['餐桌'],
    '元素聚合**只**给元素标签（效果标签不许混进元素筛选那一维）');
});

test('v918 词表页：kind=effect 的行看得见（动效小标记），且不被 ignored 那条过滤漏掉', () => {
  assert.match(appSource, /const TAG_VOCABULARY_IGNORED = 'ignored';/);
  assert.match(appSource, /return rows\.filter\(function\(row\) \{ return row\.kind !== TAG_VOCABULARY_IGNORED; \}\);/,
    '只排除 ignored —— effect 必须留在表里');
  assert.match(appSource, /const kindMark = String\(row\.kind \|\| ''\) === 'effect'/);
  assert.match(appSource, /'<span class="tv-mark tv-mark-effect"[\s\S]{0,160}?'动效' : 'motion'\)/);
  assert.match(appSource, /'<td class="tv-zh-cell">' \+ zhCell \+ kindMark \+ '<\/td>'/, '标记挂在中文名后面');
  assert.match(appSource, /\.tag-vocabulary-section \.tv-mark-effect \{ color: #6d28d9;/);
});

/* ── 7) 版本号（index.html 5 处 + app.js 1 处）─────────────────────────── */

test('v918 版本号（index.html 5 处 + app.js 1 处）', () => {
  const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.equal((indexSource.match(/\?v=20261015-query-two-pass-v948/g) || []).length, 5);
  assert.match(appSource, /const TOOL_UI_VERSION = '20261015-query-two-pass-v948'/);
});

/* ── 8) 脚本文案：dry-run 能看出"会请求效果标签的有几张" ─────────────────── */

test('v918 脚本：dry-run 与跑完的汇总都要报出效果标签的条数', () => {
  assert.match(scriptSource, /效果标签：这次会请求效果标签的 /);
  assert.match(scriptSource, /静态图 /, '要说清静态图不请求');
  assert.match(scriptSource, /效果标签：向模型请求了 /, '跑完也要报一次');
  assert.match(scriptSource, /sql\/028_effect_tags\.sql/, '词表为空时要知道该跑哪个迁移');
});
