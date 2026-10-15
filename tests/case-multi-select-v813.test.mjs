// v813：项目窗物料多选 —— 批量改类型 / 批量删除。
// 设计要点（用户要求「不要把按钮摆满」）：平时只在 side 头部多一个「多选」小图标按钮，
// 进入多选后卡片右上角才出现勾选框（此时隐藏单张删除 ×），底部才出现操作条；退出即全部收起。
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

test('多选入口：平时只多一个图标按钮，操作条默认收起', () => {
  assert.match(source, /id="case-select-btn" title="多选（批量改类型 \/ 删除）"/, '头部只加一个「多选」图标按钮');
  assert.match(source, /<div class="case-select-bar" id="case-select-bar" hidden>/, '操作条默认 hidden');
  assert.match(source, /\.case-select-bar \{ display: none;/, '默认不显示');
  assert.match(source, /\.case-side\.is-selecting \.case-select-bar \{ display: flex; \}/, '只在多选模式下出现');
  const bar = body('<div class="case-select-bar" id="case-select-bar" hidden>', '</aside>');
  for (const id of ['case-select-count', 'case-select-all', 'case-select-type', 'case-select-delete', 'case-select-exit']) {
    assert.ok(bar.includes('id="' + id + '"'), '操作条缺少 ' + id);
  }
  assert.doesNotMatch(source, /id="case-select-type"[^>]*>改类型<\/button>[\s\S]{0,200}case-side-title/, '改类型不常驻头部');
});

test('多选模式：点图＝勾选，不切大图；退出后恢复原行为', () => {
  const click = body("      const side = event.target.closest('[data-case-side]');", "      const nav = event.target.closest('[data-case-nav]');");
  assert.match(click, /if \(caseSelectMode\) \{ toggleCaseSelected\(sideId\); return; \}/, '多选时点图勾选');
  assert.match(click, /show\(sideId\);/, '非多选时照旧切大图');
  const toggle = body('    const toggleCaseSelected = function(previewId) {', '    if (selectBtn) selectBtn.onclick');
  assert.match(toggle, /caseSelected\.add\(previewId\)/, '切换选中');
  assert.match(toggle, /caseSelected\.delete\(previewId\)/, '取消选中');
  assert.match(toggle, /card\.classList\.toggle\('is-selected'/, '只改这一张卡的选中样式（不整块重画）');
  assert.match(toggle, /updateCaseSelectBar\(\)/, '同步操作条');
});

test('勾选框只在多选模式渲染，且与单张删除按钮互斥', () => {
  const inner = body('    const sideCardInner = function(def) {', '    // 当前列表里实际显示的条目');
  assert.match(inner, /const selectBox = caseSelectMode \? `<span class="case-side-check/, '只有多选模式才渲染勾选框');
  assert.match(inner, /canManage && !caseSelectMode \? `<button type="button" class="case-side-del"/, '多选时隐藏单张删除 ×');
  assert.match(source, /\.case-side-check\.is-on \{ border-color: #16a34a; background: #16a34a; \}/, '选中样式');
  assert.match(source, /\.case-side-grid\.is-selecting \.case-side-card\.is-selected[^{]*\{ border-color: #16a34a/, '选中卡片高亮（且压过 hover）');
});

test('批量改类型：乐观更新 + 一条 in 语句写库 + 失败整批回滚', () => {
  const apply = body('    const applyCaseBatchType = function(nextType) {', '    const openCaseBatchTypeMenu = function() {');
  assert.match(apply, /const ids = caseSelected\.size \? Array\.from\(caseSelected\) : \[\];/, '按当前选中集合操作');
  assert.match(apply, /before\.forEach\(function\(item\) \{ setMaterialTypeOf\(item\.id, item\.type\); \}\);/, '失败按原值回滚');
  assert.match(apply, /\.update\(\{ material_type: nextType \|\| '' \}\)\.in\('id', ids\)/, '一次 in 语句批量写');
  assert.match(apply, /showCaseToast\(state\.lang === 'zh' \? \('已把 ' \+ ids\.length \+ ' 张改为/, '结果提示张数');
  const menu = body('    const openCaseBatchTypeMenu = function() {', '    if (selectTypeBtn) selectTypeBtn.onclick');
  assert.match(menu, /materialCatalogTypeNames\(sourcePlatformOf\(source\)\)/, '类型选项仍来自该端物料清单');
  assert.match(menu, /rect\.top - menu\.offsetHeight - 8/, '浮窗向上弹（贴着操作条）');
});

test('批量删除：单张与多张共用一条删除路径', () => {
  const del = body('    const deleteCaseMaterials = function(ids, confirmText) {', '    const appendInput = backdrop.querySelector');
  assert.match(del, /const idList = \(Array\.isArray\(ids\) \? ids : \[ids\]\)\.filter\(Boolean\);/, '单张/多张同一入口');
  assert.match(del, /\.delete\(\)\.in\('id', removedIds\)/, '一次 in 语句删行');
  assert.match(del, /state\.supabase\.storage\.from\(LIBRARY_BUCKET\)\.remove\(rmPaths\)/, '先清存储（含缩略图）');
  assert.match(del, /caseSelected\.clear\(\);/, '删完退出选中');
  assert.match(del, /showCaseDeleteToast\(removedIds\.length\)/, '提示张数');
  assert.ok(source.includes("deleteCaseMaterials([del.getAttribute('data-case-del')], state.lang === 'zh' ? '删除这张物料？此操作不能撤销。'"), '单张删除复用同一函数');
  assert.ok(source.includes("deleteCaseMaterials(Array.from(caseSelected), state.lang === 'zh' ? ('删除选中的 '"), '批量删除走同一函数');
  assert.match(source, /function showCaseDeleteToast\(count\)/, '删除提示支持张数');
});

test('多选交互细节：全选只选看得见的、Esc 先退多选、加号卡片隐藏', () => {
  assert.match(source, /const defs = visibleSideDefs\(\);/, '全选按当前语言筛选后的可见集合');
  const vis = body('    const visibleSideDefs = function() {', '    const renderSideGrid = function() {');
  assert.match(vis, /if \(caseSideLang === 'en' \|\| caseSideLang === 'ar'\) return !def\.lang \|\| def\.lang === caseSideLang;/, '沿用语言筛选（没判出语言的图也显示）');
  assert.match(source, /if \(event\.key === 'Escape' && caseSelectMode\) \{ setCaseSelectMode\(false\); return; \}/, 'Esc 先退多选');
  assert.ok(!source.includes('addCaseCard'), 'v865 起「添加物料」卡已移除，多选网格只出勾选框');
  assert.match(source, /if \(selectTypeBtn\) selectTypeBtn\.disabled = !count;/, '没选就禁用');
  assert.match(source, /gridEl\.className = 'case-side-grid view-' \+ caseSideMode \+ \(caseSelectMode \? ' is-selecting' : ''\);/, '网格带选中模式类');
});
