// v812：案例项目窗的物料缩略图左上角常显「所属类型」；改类型/重命名/设为封面重画列表时
// 不再把列表弹回顶部（之前 scrollTop 被 innerHTML='' 清成 0，用户刚看的那张图就找不到了）。
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

test('物料缩略图：左上角常显所属类型（未分类走灰色）', () => {
  const inner = body('    const sideCardInner = function(def) {', '    const renderSideGrid = function() {');
  assert.match(inner, /<span class="case-side-type/, '缩略图上要有类型标签');
  assert.match(inner, /data-case-side-type/, '带标记便于定位');
  assert.match(inner, /def\.type && def\.type !== '未分类'/, '没有类型走灰色（判断仍用原始值）');
  assert.match(inner, /escapeHtml\(caseTypeLabel\(def\.type\)\)/, 'v943：显示要过 caseTypeLabel()（英文界面翻成英文）');
  assert.match(inner, /' untyped'/, '未分类用灰色样式');
  assert.match(inner, /casePreviewMedia\(def\.material, source\)[\s\S]*case-side-overlay/, '标签放在图片上、文件浮层之前');
  assert.match(source, /\.case-side-type \{ position: absolute; top: 4px; left: 4px;/, '样式在左上角');
  assert.match(source, /\.case-side-type\.untyped \{/, '未分类样式存在');
});

test('物料缩略图：列表视图改在右侧文字里显示类型（56px 缩略图放不下标签）', () => {
  const grid = body('    const renderSideGrid = function() {', '    requestAnimationFrame(renderSideGrid);');
  assert.match(grid, /class="case-side-type-text"/, '列表视图要有类型文字');
  assert.match(source, /\.case-side-row \.case-side-type \{ display: none; \}/, '列表视图隐藏图上的类型标签');
});

test('重画物料列表：保留滚动位置，不再瞬移回顶部', () => {
  const grid = body('    const renderSideGrid = function() {', '    requestAnimationFrame(renderSideGrid);');
  assert.match(grid, /const keepScrollTop = gridEl\.scrollTop;/, '重画前记住滚动位置');
  const restores = grid.match(/gridEl\.scrollTop = keepScrollTop;/g) || [];
  assert.equal(restores.length, 2, '列表视图与网格视图两条分支都要恢复滚动位置');
  // 恢复必须发生在 innerHTML 清空之后
  assert.ok(grid.indexOf("gridEl.innerHTML = '';") < grid.indexOf('gridEl.scrollTop = keepScrollTop;'), '先清空再恢复');
});

test('改类型只重画这两处，不动弹窗其它状态', () => {
  const setType = body('    const setMaterialType = function(previewId, nextType) {', '    // 右键「设为封面」');
  assert.match(setType, /renderSideGrid\(\);/, '重画物料列表（保留滚动）');
  assert.match(setType, /if \(currentId === previewId\) show\(previewId\);/, '当前大图跟着更新');
  assert.match(setType, /update\(\{ material_type: nextType \|\| '' \}\)\.eq\('id', previewId\)\.select\('id'\)/, '仍然只改这一行（带回执确认真的写进去了）');
  assert.match(setType, /alert\(state\.lang === 'zh' \? \('分类保存失败：'/, '失败仍有回滚提示');
});
