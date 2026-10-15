// 案例库项目卡右键菜单的静态不变量（v731）。
// 背景：右键菜单是图库和案例库共用的，案例项目卡上点「查看详情 / 编辑信息」打开的是
// 素材图库的详情弹窗和素材编辑表单，而不是项目自己的弹窗 / 编辑面板。这里盯住：案例
// 卡必须分流到 showCaseProjectContextMenu，且该菜单里不允许再出现素材库的那两条入口。
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
const caseMenuBody = () => sliceBetween('function showCaseProjectContextMenu(event, item) {', 'function renderContextMenu(event, items, onClick) {');

test('案例项目卡在菜单入口就分流，不再落进素材图库的菜单', () => {
  const body = libraryMenuBody();
  const branchIdx = body.indexOf('if (item.isCaseProjectCard) { showCaseProjectContextMenu(event, item); return; }');
  assert.ok(branchIdx >= 0, 'showContextMenu 必须按 isCaseProjectCard 分流');
  // 分流必须早于图库菜单构建/绑定，否则案例卡仍会拿到素材菜单
  assert.ok(branchIdx < body.indexOf('var kind = libraryKindOfSource(source);'), '分流要在构建图库菜单项之前');
  assert.ok(branchIdx < body.indexOf("if (action === 'detail')"), '分流要在绑定图库菜单点击之前');
});

test('案例菜单的查看详情/编辑信息走项目自己的弹窗与编辑面板', () => {
  const body = caseMenuBody();
  assert.match(body, /if \(action === 'case-detail'\) \{ openCaseProjectModal\(source\.id\); void logAssetEvent\('view', \{ source: source \}\); return; \}/);
  assert.match(body, /openCaseProjectEdit\(source, \{/);
  // 保存后同步源记录再重绘列表，卡片标题/标签才会跟着变
  assert.match(body, /await refreshCaseProjectSource\(source\);/);
  assert.match(body, /renderLibraryGrid\(\);/);
  // 素材库那两条入口一律不许出现在案例菜单里（本次修复要消除的正是这个错位）
  assert.doesNotMatch(body, /openLibraryDetailModal\(/, '案例卡不能打开素材详情弹窗');
  assert.doesNotMatch(body, /openLibraryEditModal\(/, '案例卡不能打开素材编辑表单');
  assert.doesNotMatch(body, /handleLibraryCardAction\(/, '案例卡不能复用素材卡片的动作分发');
  assert.doesNotMatch(body, /enterMultiSelect\(\)/, '多选模式是素材批量操作，不属于项目卡');
});

test('案例菜单的下载与删除对齐项目弹窗的语义', () => {
  const body = caseMenuBody();
  // 下载图片物料 = 弹窗 footer 的 #case-download-all
  assert.match(body, /label: lang === 'zh' \? '下载图片物料' : 'Download images', action: 'case-download-all'/);
  assert.match(body, /Promise\.resolve\(downloadAllCaseMaterials\(source\)\)/);
  // 下载源文件 = #case-download-source：没有 download_link 就不出现，且只走链接
  assert.match(body, /if \(downloadLink\) items\.push\(\{ icon: downloadIcon, label: lang === 'zh' \? '下载源文件' : 'Download source', action: 'case-download-source' \}\);/);
  assert.match(body, /window\.open\(downloadLink, '_blank', 'noopener'\)/);
  // 删除项目与编辑信息一样按 canManageSource 收口，删除复用项目删除逻辑
  assert.match(body, /var canManage = canManageSource\(source\);/);
  assert.match(body, /label: lang === 'zh' \? '删除项目' : 'Delete project', action: 'case-delete', danger: true/);
  assert.match(body, /if \(action === 'case-delete'\) \{ deleteLibrarySource\(source\.id\); return; \}/);
  assert.match(appSource, /if \(deleteBtn\) deleteBtn\.onclick = function\(\) \{[\s\S]{0,140}deleteLibrarySource\(source\.id\)\.then/, '删除项目的动作要和弹窗里的一致');
});

test('两个菜单共用同一套渲染与定位，图库菜单行为不变', () => {
  const renderBody = sliceBetween('function renderContextMenu(event, items, onClick) {', 'function hideContextMenu() {');
  // 渲染 / 点击绑定 / 边缘定位只此一份，避免两个菜单各写一遍
  assert.match(renderBody, /menu\.innerHTML = html;/);
  assert.match(renderBody, /menu\.querySelectorAll\('\[data-ctx-action\]'\)/);
  assert.match(renderBody, /menu\.classList\.add\('show'\);/);
  assert.match(libraryMenuBody(), /renderContextMenu\(event, items, function\(action\) \{/);
  assert.match(caseMenuBody(), /renderContextMenu\(event, items, function\(action\) \{/);
  // 图库卡右键仍然打开素材详情弹窗
  assert.match(libraryMenuBody(), /if \(action === 'detail'\) \{ openLibraryDetailModal\(preview\.id\); return; \}/);
});
