// 项目弹窗右键「设为封面」（v739）的静态不变量。
// 背景：案例墙一个项目只出一张卡，封面按当前分类（二级标签）自动挑（同类里优先文件名带 EN 的）；
// 用户需要能把某张物料钉成当前分类的展示封面。选择存进 vf_source_files.tags 的标记
// vf:cover:v1:<分类>:<previewId>，不改表结构；写入必须先读最新 tags 再合并同类标记，
// 不得整组覆盖（与 v738 的 stale-tags 教训同一路数）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function fnBody(name, marker) {
  const start = appSource.indexOf('function ' + name + '(');
  assert.ok(start > 0, name + ' 必须存在');
  const end = appSource.indexOf(marker, start);
  assert.ok(end > start, name + ' 的结束位置找不到');
  return appSource.slice(start, end);
}

function blockBetween(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  assert.ok(start > 0, '找不到：' + startMarker);
  const end = appSource.indexOf(endMarker, start);
  assert.ok(end > start, '找不到结束位置：' + endMarker);
  return appSource.slice(start, end);
}

test('封面标记：前缀常量 + 分类归一（非案例分类一律归 all）', () => {
  assert.match(appSource, /var CASE_COVER_MARKER_PREFIX = 'vf:cover:v1:';/, '标记前缀必须是 vf:cover:v1:');
  const keyBody = fnBody('caseCoverMarkerKey', '\n  function caseCoverOverrideFor');
  assert.match(keyBody, /caseMaterialTypeSet\(typeValue\)/, '只认物料清单里的物料类别');
  assert.match(keyBody, /\? typeValue : 'all'/, '其余值（含未选分类）归 all');
});

test('读取封面：按分类前缀取标记、按 previewId 找回物料，物料被删返回 null', () => {
  const body = fnBody('caseCoverOverrideFor', '\n  // 写封面标记');
  assert.match(body, /CASE_COVER_MARKER_PREFIX \+ caseCoverMarkerKey\(typeValue\) \+ ':'/,
    '按「前缀+分类」拼标记');
  assert.match(body, /startsWith\(prefix\)/, '标记必须整段前缀匹配，避免 all 命中「all:」以外的分类');
  assert.match(body, /slice\(prefix\.length\)/, 'previewId 从标记尾段取出');
  assert.match(body, /caseMaterialsOf\(source\)\.find/, '必须在项目物料里按 id 找回');
  assert.match(body, /\|\| null/, '找不回（已删物料）就退回自动封面');
});

test('caseCoverFor 优先用用户钉的封面：未分类分支先于优先级列表，分类分支覆盖自动优选', () => {
  const body = fnBody('caseCoverFor', '\n  function projectMatchesType');
  const overrideIdx = body.indexOf('caseCoverOverrideFor(source, typeValue)');
  const priorityIdx = body.indexOf('const priority = caseCoverTypePriority();');
  assert.ok(overrideIdx >= 0, '必须读取封面标记');
  assert.ok(priorityIdx > overrideIdx, '未分类分支：标记要先于自动优先级判断');
  assert.match(body, /if \(override\) return \{ cover: override, group: materials \};/,
    '未分类：有标记直接用它');
  assert.match(body, /cover: override \|\| casePreferEn\(group\)/,
    '分类分支：标记优先，否则退回同类首选（EN 优先）');
});

test('写封面：先读库里最新 tags、只摘同类旧标记，绝不整组覆盖', () => {
  const body = fnBody('writeCaseCover', '\n  function caseCoverFor');
  assert.match(body, /select\('tags'\)\.eq\('id', source\.id\)/, '必须先读最新 tags');
  assert.match(body, /filter\(function\(tag\) \{ return !String\(tag\)\.startsWith\(prefix\); \}\)/,
    '只摘掉同一分类的旧标记');
  assert.match(body, /if \(previewId\) nextTags\.push\(prefix \+ previewId\)/, 'previewId 为空表示取消封面，不再写标记');
  assert.match(body, /update\(\{ tags: nextTags \}\)/, '写回合并结果');
  assert.doesNotMatch(body, /normalizeLibraryTags|\.delete\(/, '不得走整组归一或删除');
});

test('右键菜单加「设为封面」：在当前封面时显示取消，点击走 setCaseCover', () => {
  assert.match(appSource, /data-set-cover="1"/, '菜单必须有设为封面按钮');
  assert.match(appSource, /coverNow \? '取消封面' : '设为封面'/, '已是当前封面时显示取消封面');
  assert.match(appSource, /\(caseCoverOverrideFor\(source, tabValue\) \|\| \{\}\)\.id === previewId/,
    '按钮态按「当前分类的封面是否就是这张」判断');
  assert.match(appSource, /if \(menuEvent\.target\.closest\('\[data-set-cover\]'\)\) \{ menu\.remove\(\); setCaseCover\(previewId\); return; \}/,
    '点击必须调用 setCaseCover');
  assert.match(appSource, /\.case-type-menu button\[data-set-cover\] \{ margin-top: 4px; border-top: 1px solid #f1f5f9; \}/,
    '设为封面与上方分类按钮要有分隔');
});

test('setCaseCover：按当前分类（tabValue）写入、切换即取消、成功后重绘墙并 toast', () => {
  const body = blockBetween('const setCaseCover = function(', '\n    const renameMaterial');
  assert.match(body, /writeCaseCover\(source, tabValue, isCover \? '' : previewId\)/,
    '写入/取消都以当前分类为键');
  assert.match(body, /renderLibraryGrid\(\);/, '成功后必须重绘案例墙封面');
  assert.match(body, /showCaseToast/, '必须有结果提示');
  assert.match(body, /封面保存失败/, '失败必须提示且不动本地状态');
});
