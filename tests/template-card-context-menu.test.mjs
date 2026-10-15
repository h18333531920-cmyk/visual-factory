// 模板库右键菜单精简（v732）的静态不变量。
// 用户定：模板卡只留两项——编组卡=释放编组+多选模式，普通模板卡=模板编组+多选模式。
// 查看详情/编辑信息/下载预览图/下载模板/打开静态模板/移动分组都不再出现在模板卡上，
// 删除改走多选模式的批量删除。图库与案例库的菜单不受影响。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function sliceBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  assert.ok(start >= 0, '找不到：' + startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.ok(end > start, '找不到结束位置：' + endMarker);
  return appSource.slice(start, end);
}

const libraryMenuBody = () => sliceBetween('function showContextMenu(event, item) {', 'function showCaseProjectContextMenu(event, item) {');

function templateBranchBody() {
  const body = libraryMenuBody();
  const start = body.indexOf("if (kind === 'template' && !userTemplateMenu) {");
  assert.ok(start >= 0, '模板卡分流分支必须存在');
  // 模板分支自己用 ctxIcon 拼图标；紧随其后的通用菜单项是内联 '<svg
  const end = body.indexOf("items.push({ icon: '<svg", start);
  assert.ok(end > start, '找不到模板分支的结束位置');
  return body.slice(start, end);
}

test('模板卡在构建通用菜单项之前分流并 early return', () => {
  const body = libraryMenuBody();
  const branchIdx = body.indexOf("if (kind === 'template' && !userTemplateMenu) {");
  assert.ok(branchIdx >= 0, '模板卡必须有自己的分支');
  const genericIdx = body.indexOf("action: 'detail'");
  assert.ok(branchIdx < genericIdx, '模板分支必须排在通用菜单项（查看详情等）之前');
  const branch = templateBranchBody();
  assert.match(branch, /renderContextMenu\(event, items, function\(action\) \{/, '模板分支要自己渲染菜单');
  assert.match(branch, /return;/, '模板分支必须 early return，否则通用项会继续 push');
});

test('编组卡只剩释放编组+多选模式，普通模板卡只剩模板编组+多选模式', () => {
  const branch = templateBranchBody();
  // 编组卡：释放编组（danger，走 delete 动作 = 解散编组）+ 多选模式
  assert.match(branch, /if \(isBookmarkSource\(source\)\) \{[\s\S]{0,220}label: lang === 'zh' \? '释放编组' : 'Release group', action: 'delete', danger: true/);
  assert.match(branch, /label: lang === 'zh' \? '释放编组' : 'Release group', action: 'delete', danger: true[\s\S]{0,80}\}\s*\}\s*else if/, '释放编组之后才是非编组分支');
  // 普通模板卡：模板编组（组件/套组除外，沿用原判定）+ 多选模式
  assert.match(branch, /else if \(!templateTags\.includes\('组件'\) && !templateTags\.includes\('套组'\)\) \{/);
  assert.match(branch, /label: lang === 'zh' \? '模板编组' : 'Group templates', action: 'template-bookmark'/);
  // 多选模式对两种卡都在
  assert.match(branch, /label: lang === 'zh' \? '多选模式' : 'Multi-select', action: 'multi-select'/);
  assert.match(branch, /if \(action === 'multi-select'\) \{ enterMultiSelect\(\); return; \}/);
});

test('模板卡上不许再出现被去掉的那些入口', () => {
  const branch = templateBranchBody();
  ['detail', 'edit', 'download-preview', 'download-source', 'use-static', 'move-group'].forEach(function(action) {
    assert.ok(branch.indexOf("action: '" + action + "'") === -1, "模板菜单不该再出现 action: '" + action + "'");
  });
  // 三个被删掉的文案也不该留在模板分支里
  assert.doesNotMatch(branch, /打开静态模板/);
  assert.doesNotMatch(branch, /移动分组/);
  assert.doesNotMatch(branch, /下载预览图|下载模板/);
  // 删掉的分支不留残骸
  assert.doesNotMatch(appSource, /canBookmarkTemplate/, 'canBookmarkTemplate 已经并入模板分支，不应再有别的引用');
  assert.doesNotMatch(libraryMenuBody(), /kind === 'template' && movableTags\.length/, '移动分组的分支必须删掉');
});

test('图库与案例库菜单不受影响', () => {
  const body = libraryMenuBody();
  assert.match(body, /if \(kind === 'gallery'\) \{[\s\S]{0,400}action: 'use-static'[\s\S]{0,400}action: 'use-dynamic'/);
  assert.match(body, /if \(action === 'detail'\) \{ openLibraryDetailModal\(preview\.id\); return; \}/, '图库卡查看详情照旧');
  assert.match(body, /if \(item\.isCaseProjectCard\) \{ showCaseProjectContextMenu\(event, item\); return; \}/, '案例卡分流照旧');
});
