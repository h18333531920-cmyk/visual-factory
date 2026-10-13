// v809：案例库上传必填「平台 + 国家」——没选就拦下上传、弹提醒，并把标签面板里缺的那一行标红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'app.js'), 'utf8');

function body(start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `找不到片段起点：${start}`);
  const to = source.indexOf(end, from);
  assert.ok(to > from, `找不到片段终点：${end}`);
  return source.slice(from, to);
}

test('案例库上传：平台和国家没选就不放行，并说明缺哪一项', () => {
  const validate = body('  function validateCaseProjectUpload(previewFiles, formData, chipSel) {', '  function translateCaseSchemaError(error) {');
  assert.match(validate, /caseTagSelFirst\(chipSel, 'tag1'\)/, '平台＝标签一，必填');
  assert.match(validate, /caseTagSelFirst\(chipSel, 'country'\)/, '国家必填');
  assert.match(validate, /caseTagSelFirst\(chipSel, 'activity'\)/, 'v914 起活动主题也必填');
  assert.match(validate, /flagMissingCaseTagRows\(document\.getElementById\('upload-case-tag-bar'\), missing\)/, '缺项要在标签面板上标出来');
  assert.match(validate, /请先选择' \+ joined \+ '，再上传。/, '中文提醒要说清缺哪一项');
  assert.match(validate, /return zh \? '活动主题' : 'Theme';/, '缺活动主题时提示文案要认得出这一项');
  assert.match(source, /validateCaseProjectUpload\(previewFiles, formData, chipSel\)/, '校验必须拿到标签选择');
});

test('案例库上传：被拦下时自动弹出标签面板并标红缺失行，补选后自动消红', () => {
  const flag = body('  function flagMissingCaseTagRows(bar, keys) {', '  // 浮窗挂到 body 上');
  assert.match(flag, /if \(missing\.length && !bar\._caseTagPop && addBtn\) openCaseTagPop\(bar, addBtn\);/, '面板没开着就弹出来');
  assert.match(flag, /classList\.toggle\('is-missing'/, '把缺失的一行标红');
  assert.match(flag, /bar\._caseTagMissing = missing\.slice\(\);/, '记住缺哪几项');
  const sync = body('  function syncCaseTagSelectionUi(root) {', '  function applyCaseAutoQuantity');
  assert.match(sync, /refreshCaseTagRequiredMarks\(root\);/, '重绘时同步红色提示');
  const refresh = body('  function refreshCaseTagRequiredMarks(root) {', '  // 浮窗挂到 body 上');
  assert.match(refresh, /root\._caseTagMissing\.filter\(function\(key\) \{ return !caseTagSelFirst\(root\._caseTagSel, key\); \}\)/, '补选一项就少标一项');
  const popClick = body('  function openCaseTagPop(root, addBtn) {', '  function addCaseTagCustomValue');
  assert.match(popClick, /refreshCaseTagRequiredMarks\(root\);/, '在标签面板里补选完要立刻消红');
  assert.match(source, /\.case-tag-row\.is-missing \.case-tag-cat \{ color: #dc2626/, '缺失行要有可见的标红样式');
  assert.match(source, /\.case-tag-add\.is-required \{ border-color: #fca5a5/, '标签入口也要有提示色');
});

test('案例库上传：平台/国家的预填优先级不变（上次选过的自动带出来）', () => {
  assert.match(source, /function lastCaseUploadPlatform\(\)/);
  assert.match(source, /rememberLastCaseUploadPlatform\(caseTagSelFirst\(chipSel, 'tag1'\)\)/);
});
