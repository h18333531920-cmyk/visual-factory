// v862：上传/编辑弹窗的「业务策略」维度也支持「＋」自定义标签（用户要求）。
// 机制完全复刻活动主题 v826 的 marker 方案：词表内值直接存 tags 原词；
// 词表外自定义值存 `vf:case-strategy:v1:<encodeURIComponent>` 标记，读回时还原到 strategy 维度。
// 盯住四件事：①白名单放开；②写入时词表外走标记、不落裸词；③读回还原；④二次保存幂等（不重复、不丢）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

// ── 静态断言 ─────────────────────────────────────────────────

test('白名单放开：strategy 加入 CASE_TAG_CUSTOM_KEYS（＋钮与输入行随行渲染）', () => {
  assert.match(appSource, /var CASE_TAG_CUSTOM_KEYS = \['element', 'activity', 'strategy'\];/);
});

test('v863 样式：业务策略行的「＋」跟行主题一致（绿色，不能落到元素的橙色默认）', () => {
  assert.match(appSource, /\.case-tag-row\[data-case-tag-row="strategy"\] \.case-tag-custom-toggle \{ border-color: #86efac; background: #f0fdf4; color: #15803d; \}/);
});

test('marker 机制：vf:case-strategy:v1: 前缀 + 编解码函数成对出现', () => {
  assert.match(appSource, /const CASE_STRATEGY_MARKER_PREFIX = 'vf:case-strategy:v1:';/);
  assert.match(appSource, /function caseStrategyMarker\(value\) \{/);
  assert.match(appSource, /function caseStrategyMarkerValue\(tag\) \{/);
});

test('写入链路：上传与编辑两条序列化路径都把词表外 strategy 存成标记', () => {
  // caseTagSelectionUpdatePayload（编辑/快捷标签共用）与 caseProjectTagsForChips（上传保存）
  assert.match(appSource, /caseTagSelValues\(chipSel, 'strategy'\)\.forEach\(function\(v\) \{ nextTags\.push\(FILTER_SECTIONS_CONFIG\.strategy\.values\.includes\(v\) \? v : caseStrategyMarker\(v\)\); \}\);/, '编辑路径的 strategy 标记写入');
  assert.match(appSource, /customStrategies\.forEach\(function\(value\) \{\s*const marker = caseStrategyMarker\(value\);/, '上传路径的 strategy 标记写入');
  assert.match(appSource, /if \(key === 'strategy'\) return;/, '原词直存循环里跳过 strategy');
  assert.match(appSource, /!String\(t\)\.startsWith\(CASE_STRATEGY_MARKER_PREFIX\)/, '基底清理要摘掉旧 strategy 标记');
});

test('读回链路：caseChipSelectionOf 解码 strategy 标记还原到维度；搜索匹配也认标记', () => {
  assert.match(appSource, /const strategyValues = tags\.map\(caseStrategyMarkerValue\)\.filter\(Boolean\);/);
  assert.match(appSource, /dim === 'strategy' && tags\.map\(caseStrategyMarkerValue\)\.indexOf\(target\) >= 0/, '筛选匹配支持自定义策略');
});

test('key 归一化：addCaseTagCustomValue 按白名单取 key（不再硬编码 element）', () => {
  assert.match(appSource, /const key = CASE_TAG_CUSTOM_KEYS\.includes\(tagKey\) \? tagKey : 'element';/);
});

// ── 行为断言：切块直跑序列化与读回 ──────────────────────────

function loadCaseTagHelpers() {
  const start = appSource.indexOf('function caseTagChipRows()');
  assert.ok(start >= 0, 'caseTagChipRows 锚点必须存在');
  const end = appSource.indexOf('function caseFootTagsHtml', start);
  assert.ok(end > start, '切块终点锚点必须在后面');
  const block = appSource.slice(start, end);
  const factory = new Function(
    'var state = { lang: "zh", libraryOptions: [] };' +
    'var LIBRARY_TAGS = { source: { tag1: [] } };' +
    'var FILTER_SECTIONS_CONFIG = { strategy: { values: ["premium", "大促"] }, element: { values: ["券"] }, activity: { values: ["聚餐"] }, country: { values: [] }, format: { values: [] }, quantity: { values: [] } };' +
    'var libraryOptionIdByZhName = function() { return null; };' +
    'var libraryTagsForForm = function() { return []; };' +
    'var normalizeLibraryTags = function(_dim, tags) { return tags.slice(); };' +
    'var sourceTag2Values = function() { return []; };' +
    'var escapeHtml = function(v) { return String(v); };' +
    'var escapeAttr = function(v) { return String(v); };' +
    'var libraryDisplayLabel = function(v) { return v; };' +
    block +
    '\nreturn { caseStrategyMarker: caseStrategyMarker, caseStrategyMarkerValue: caseStrategyMarkerValue, caseTagSelectionUpdatePayload: caseTagSelectionUpdatePayload, caseChipSelectionOf: caseChipSelectionOf };'
  );
  return factory();
}

test('行为：词表内原词直存，词表外自定义值存标记（不落裸词）', () => {
  const mod = loadCaseTagHelpers();
  const payload = mod.caseTagSelectionUpdatePayload({ tags: [] }, { strategy: ['大促', '限时秒杀'] });
  assert.ok(payload.tags.includes('大促'), '词表内值存原词');
  const marker = mod.caseStrategyMarker('限时秒杀');
  assert.ok(payload.tags.includes(marker), '词表外值存标记');
  assert.equal(marker, 'vf:case-strategy:v1:' + encodeURIComponent('限时秒杀'));
  assert.ok(!payload.tags.includes('限时秒杀'), '词表外值不能落裸词（否则读不回维度）');
});

test('行为：保存→读回→再保存 幂等（自定义策略不丢、不重复）', () => {
  const mod = loadCaseTagHelpers();
  const first = mod.caseTagSelectionUpdatePayload({ tags: [] }, { strategy: ['大促', '限时秒杀'] });
  const source = { tags: first.tags.slice() };
  const sel = mod.caseChipSelectionOf(source);
  assert.deepEqual(sel.strategy.slice().sort(), ['大促', '限时秒杀'].slice().sort(), '读回要还原两个值（含自定义）');
  const second = mod.caseTagSelectionUpdatePayload(source, sel);
  assert.deepEqual(second.tags.slice().sort(), first.tags.slice().sort(), '二次保存 tags 集合不变（幂等）');
});

test('行为：取消自定义策略后保存，标记从 tags 摘除', () => {
  const mod = loadCaseTagHelpers();
  const first = mod.caseTagSelectionUpdatePayload({ tags: [] }, { strategy: ['限时秒杀'], tag1: 'C端' });
    const source = { tags: first.tags.slice() };
    // v868：选择态整体为空时序列化会保留现有 tags（防静默抹标签），
    // 所以这里带上 tag1 模拟真实编辑弹窗（平台必带），只有 strategy 被显式取消
    const payload = mod.caseTagSelectionUpdatePayload(source, { strategy: [], tag1: 'C端' });
  assert.equal(payload.tags.filter(t => String(t).startsWith('vf:case-strategy:v1:')).length, 0, '取消后不残留标记');
});
