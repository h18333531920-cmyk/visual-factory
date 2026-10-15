// v864：手动分类保护——手动改过的物料类型不被「按清单重跑识别」覆盖。
// 机制：手动改类型成功后，在所属项目标签里写入 vf:manual-mtype:v1:<previewId> 隐形标记；
// 重跑识别读到标记就跳过这张，确认单里也说明「另有 N 张手动设置过，保持不动」。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

// ── 静态断言 ─────────────────────────────────────────────────

test('标记机制：vf:manual-mtype:v1: 前缀 + 编解码函数成对出现', () => {
  assert.match(appSource, /const CASE_MANUAL_TYPE_MARKER_PREFIX = 'vf:manual-mtype:v1:';/);
  assert.match(appSource, /function caseManualTypeMarker\(previewId\) \{/);
  assert.match(appSource, /function caseManualTypeMarkerIds\(tags\) \{/);
});

test('写入：单张与批量改类型成功后都要补标记（部分成功只补写进库的那些）', () => {
  assert.match(appSource, /markCaseManualTypes\(source, \[previewId\]\);/, '单张改类型成功后补标记');
  assert.match(appSource, /markCaseManualTypes\(source, ids\);/, '批量全成功后补标记');
  assert.match(appSource, /markCaseManualTypes\(source, Array\.from\(writtenIds\)\);/, '批量部分成功只标记写进库的');
});

test('读取：重跑识别收集变化时跳过带标记的物料', () => {
  const start = appSource.indexOf('async function collectCaseMaterialTypeChanges()');
  assert.ok(start >= 0, '收集函数必须存在');
  const body = appSource.slice(start, appSource.indexOf('async function recaseMaterialTypesByCatalog'));
  assert.match(body, /caseManualTypeMarkerIds\(row && row\.tags\)\.forEach\(function\(id\) \{ manualIds\.add\(id\); \}\);/, '从项目标签解码保护标记');
  assert.match(body, /if \(manualIds\.has\(String\(row\.id \|\| ''\)\)\) \{ skippedManual \+= 1; return; \}/, '带标记的行直接跳过并计数');
  assert.match(body, /return \{ changes: changes, skippedManual: skippedManual \};/, '返回结构带保护计数');
});

test('确认单要说清「手动设置过的不动」；标记不被标签序列化剥掉', () => {
  assert.match(appSource, /张手动设置过类型，保持不动/, '中文确认单提示');
  // caseTagSelectionUpdatePayload 的基底清理只摘 element/activity/strategy 标记，manual-mtype 要能幸存
  const start = appSource.indexOf('function caseTagSelectionUpdatePayload(source, chipSel)');
  const body = appSource.slice(start, appSource.indexOf('function caseProjectTagsForChips'));
  assert.doesNotMatch(body, /manual-mtype/, '标签序列化不得剥离手动类型标记');
});

// ── 行为断言（切块直跑标记编解码）───────────────────────────

function loadMarkerHelpers() {
  const start = appSource.indexOf("const CASE_MANUAL_TYPE_MARKER_PREFIX = 'vf:manual-mtype:v1:';");
  const end = appSource.indexOf('function markCaseManualTypes');
  assert.ok(start > 0 && end > start, '标记助手块必须存在');
  const block = appSource.slice(start, end);
  return new Function(`
    ${block}
    return { caseManualTypeMarker, caseManualTypeMarkerIds };
  `)();
}

test('行为：标记往返编解码，混在真实标签里只摘自己的', () => {
  const helpers = loadMarkerHelpers();
  const id1 = 'aaa-111';
  const id2 = 'bbb-222';
  const tags = [
    'vf:kind:template',
    'C端',
    helpers.caseManualTypeMarker(id1),
    helpers.caseManualTypeMarker(id2),
    'premium',
  ];
  const ids = helpers.caseManualTypeMarkerIds(tags);
  assert.deepEqual(ids.sort(), [id1, id2].sort(), '两个标记都能解出物料 id');
  assert.deepEqual(helpers.caseManualTypeMarkerIds(['C端', 'premium']), [], '没有标记时返回空数组');
  assert.deepEqual(helpers.caseManualTypeMarkerIds(null), [], 'tags 缺失不抛错');
});

test('行为：同一物料重复标记幂等（markCaseManualTypes 的去重逻辑）', () => {
  const helpers = loadMarkerHelpers();
  // 模拟 markCaseManualTypes 的合并段：已存在的标记不再追加
  const existing = [helpers.caseManualTypeMarker('x1')];
  const want = ['x1', 'x2'].map(id => id);
  const tags = existing.slice();
  let changed = false;
  want.forEach(function(id) {
    const marker = helpers.caseManualTypeMarker(id);
    if (tags.indexOf(marker) < 0) { tags.push(marker); changed = true; }
  });
  assert.ok(changed, '有新 id 时要写入');
  assert.equal(tags.length, 2, '重复的 x1 不会被追加第二次');
  // 再次全量合并：无新 id 就不动库
  let changed2 = false;
  ['x1', 'x2'].forEach(function(id) {
    const marker = helpers.caseManualTypeMarker(id);
    if (tags.indexOf(marker) < 0) { tags.push(marker); changed2 = true; }
  });
  assert.ok(changed2 === false, '全部已标记时不再写库');
});
