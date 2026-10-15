// 案例库「编辑项目信息」保存链路（v729 修复）的静态不变量。
// 背景：保存处理里读了未声明的 currentTags / tag1Values，点「保存编辑」时按钮已经
// 置灰成"保存中..."，紧接着抛 ReferenceError，update 根本没发出去——既保存不下来，
// 按钮也永远回不来。这里盯住三件事：标识符必须先声明、基底必须是原样 tags（保留
// vf: 标记）、只重填当前选中的标签值。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function editSaveBody() {
  const start = appSource.indexOf('function openCaseProjectEdit(source, callbacks)');
  assert.ok(start >= 0, 'openCaseProjectEdit 必须存在');
  const end = appSource.indexOf('function showCaseToast(', start);
  assert.ok(end > start, '找不到 openCaseProjectEdit 的结束位置');
  return appSource.slice(start, end);
}

test('保存处理只读公共载荷，不再内联序列化（v729 ReferenceError 不可回归）', () => {
  const body = editSaveBody();
  // v858：序列化抽成 caseTagSelectionUpdatePayload，保存处理里只有一次纯读取的函数调用，
  // 置灰到发请求之间不可能再抛未声明标识符的 ReferenceError
  // v868：保存处理先读库拿最新 tags 作基底（base），序列化传 base；读库失败退回内存 source
  const payloadIdx = body.indexOf('const payload = caseTagSelectionUpdatePayload(base, chipSel);');
  const updateIdx = body.indexOf('.update({');
  assert.ok(payloadIdx >= 0, '保存处理必须调用 caseTagSelectionUpdatePayload');
  assert.ok(updateIdx > payloadIdx, '载荷必须在 .update({ 之前备齐');
  ['const currentTags', 'const tag1Values', 'const nextTags =', 'const country =', 'const activity ='].forEach(function(decl) {
    assert.equal(body.indexOf(decl), -1, '保存处理内不应再内联声明 ' + decl + '（已抽进公共函数）');
  });
});

test('标签基底取原样 source.tags，绝不走 normalizeLibraryTags（公共函数内保证）', () => {
  const start = appSource.indexOf('function caseTagSelectionUpdatePayload(source, chipSel)');
  assert.ok(start >= 0, '公共序列化函数必须存在');
  const end = appSource.indexOf('// v826 元素和活动主题都支持', start);
  const body = appSource.slice(start, end);
  assert.match(body, /const currentTags = Array\.isArray\(source && source\.tags\) \? source\.tags : \[\];/);
  assert.match(body, /const tag1Values = \(LIBRARY_TAGS\.source && LIBRARY_TAGS\.source\.tag1\) \|\| \[\];/);
  assert.doesNotMatch(body, /normalizeLibraryTags\(/, 'vf: 标记（gif-video / has-preview-thumbs）会被 normalizeLibraryTags 剥掉');
  // 先摘掉旧的标签一/六类标签值，再按当前选择重填（v750 多选：caseTagSelValues 逐值补；v826 活动主题标记同机制）
  assert.match(body, /const previousElements = caseElementValuesOf\(source\);/);
  assert.match(body, /!String\(t\)\.startsWith\(CASE_ELEMENT_MARKER_PREFIX\) && !String\(t\)\.startsWith\(CASE_ACTIVITY_MARKER_PREFIX\) && !String\(t\)\.startsWith\(CASE_STRATEGY_MARKER_PREFIX\) && !previousElements\.includes\(t\)/, '旧自定义元素/主题/策略标记必须先摘掉，删除标签才会真正保存');
  assert.match(body, /if \(chipSel\.tag1\) nextTags\.push\(chipSel\.tag1\);/);
  assert.match(body, /CASE_TAG_CHIP_TAG_KEYS\.forEach\(function\(key\) \{\s*\/\/[^\n]*\s*if \(key === 'strategy'\) return;\s*caseTagSelValues\(chipSel, key\)\.forEach\(function\(v\) \{ nextTags\.push\(v\); \}\);\s*\}\);/);
  assert.match(body, /caseElementMarker\(v\)/, '编辑保存要重建元素类别标记');
  assert.match(body, /caseTagSelValues\(chipSel, 'activity'\)\.forEach\(function\(v\) \{ nextTags\.push\(FILTER_SECTIONS_CONFIG\.activity\.values\.includes\(v\) \? v : caseActivityMarker\(v\)\); \}\)/, 'v826 编辑保存：词表内主题直接存，自定义主题重建标记');
  assert.match(body, /caseTagSelValues\(chipSel, 'strategy'\)\.forEach\(function\(v\) \{ nextTags\.push\(FILTER_SECTIONS_CONFIG\.strategy\.values\.includes\(v\) \? v : caseStrategyMarker\(v\)\); \}\)/, 'v862 编辑保存：词表内策略直接存，自定义策略重建标记');
  assert.match(body, /tags: Array\.from\(new Set\(nextTags\)\),/);
});

test('保存失败要能看见：按钮恢复可点，错误弹出来', () => {
  const body = editSaveBody();
  const catchIdx = body.indexOf('.catch(function(error) {');
  assert.ok(catchIdx > 0, '必须保留 catch 分支');
  const tail = body.slice(catchIdx);
  assert.match(tail, /alert\(error\.message \|\| \(state\.lang === 'zh' \? '保存失败，请重试'/);
  assert.match(tail, /saveBtn\.disabled = false;/);
  assert.match(tail, /saveBtn\.textContent = state\.lang === 'zh' \? '保存编辑'/);
});

test('上传链路的标签口径与编辑链路一致（都保标记、都补选中的值）', () => {
  // 上传走 caseProjectTagsForChips；编辑链路手写同样的口径，两者的"摘掉再补"逻辑必须同构
  assert.match(appSource, /tags: isCaseProject \? caseProjectTagsForChips\(formData, chipSel\) : libraryTagsForForm\(formData, 'source'\),/);
  assert.match(appSource, /function caseProjectTagsForChips\(formData, chipSel\) \{\s*const tags = libraryTagsForForm\(formData, 'source'\)\.filter\(tag => !isCaseTagChipValue\(tag\)\);\s*if \(chipSel\.tag1\) tags\.push\(chipSel\.tag1\);\s*CASE_TAG_CHIP_TAG_KEYS\.forEach\(function\(key\) \{\s*\/\/[^\n]*\s*if \(key === 'strategy'\) return;\s*caseTagSelValues\(chipSel, key\)\.forEach\(function\(v\) \{ tags\.push\(v\); \}\);\s*\}\);/);
  assert.match(appSource, /caseTagSelValues\(chipSel, 'activity'\)\.forEach\(function\(v\) \{\s*if \(FILTER_SECTIONS_CONFIG\.activity\.values\.includes\(v\)\) tags\.push\(v\); else customActivities\.push\(v\);\s*\}\);/, 'v750 上传保存：活动主题词表内直存、词表外收集');
  assert.match(appSource, /customStrategies\.forEach\(function\(value\) \{\s*const marker = caseStrategyMarker\(value\);\s*if \(!normalized\.includes\(marker\)\) normalized\.push\(marker\);\s*\}\);\s*return normalized\.slice\(0, 64\);/, 'v862 上传保存：自定义业务策略在 normalize 之后补标记，避免被剥掉');
  assert.match(appSource, /caseTagSelValues\(chipSel, 'element'\).*caseElementMarker\(value\)/s);
});
