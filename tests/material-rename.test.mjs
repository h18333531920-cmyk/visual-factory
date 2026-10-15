// 项目弹窗物料右键菜单「重命名」（v720）的静态不变量。
// app.js 是 IIFE，这条链路依赖弹窗内的闭包状态，不适合切块执行；这里只断言
// 关键结构和接线没有被后续改动破坏。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

test('物料右键菜单新增「重命名」，且排在删除之前', () => {
  const renameBtn = appSource.indexOf("data-material-rename=\"1\">${state.lang === 'zh' ? '重命名'");
  const deleteBtn = appSource.indexOf("data-material-delete=\"1\">${state.lang === 'zh' ? '删除这张物料'");
  assert.ok(renameBtn >= 0, '菜单必须包含重命名按钮');
  assert.ok(deleteBtn > renameBtn, '重命名按钮必须排在删除按钮之前');
  assert.ok(appSource.includes("closest('[data-material-rename]')"), '菜单点击必须识别重命名按钮');
  assert.ok(appSource.includes('renameMaterial(previewId)'), '点击重命名必须调用 renameMaterial');
});

test('重命名是行内输入框：保留扩展名选中主名、输入期间屏蔽全局快捷键、空值/未改动还原', () => {
  assert.ok(appSource.includes("input.className = 'case-side-rename-input';"), '必须有行内输入框');
  assert.ok(appSource.includes('input.setSelectionRange(0, dot);'), '必须只选中主文件名，扩展名保留可见');
  assert.ok(appSource.includes('if (!nextName || nextName === oldName) {'), '空值/未改动必须走还原分支');
  assert.ok(appSource.includes("input.replaceWith(labelEl);"), '还原必须换回原标签');
  assert.match(appSource, /input\.onkeydown = function\(event\) \{\s*\/\/[^\n]*\n\s*event\.stopPropagation\(\);/, '输入期间必须 stopPropagation，避免 Esc 关弹窗/左右键切图');
  assert.ok(appSource.includes("else if (event.key === 'Escape') { input.value = oldName; input.blur(); }"), 'Escape 必须还原原值');
});

test('重命名提交同步 preview_filename / 语言判定，并带失败回滚', () => {
  assert.ok(appSource.includes("from('vf_asset_previews').update({ preview_filename: nextName }).eq('id', previewId)"), '必须落库 preview_filename');
  assert.ok(appSource.includes('def.filename = nextName;'));
  assert.ok(appSource.includes("def.lang = caseMaterialLanguage({ language: material.language, preview_filename: nextName });"), '必须按新名重算语言（库里存过值就以值为准）');
  assert.ok(appSource.includes('row.preview_filename = nextName;'), '必须同步 state.libraryPreviews（封面优选依据）');
  assert.ok(appSource.includes('material.preview_filename = oldName;'), '失败必须回滚内存值');
  assert.ok(appSource.includes("alert(state.lang === 'zh' ? ('重命名保存失败：' + result.error.message)"), '失败必须提示');
  assert.ok(appSource.includes("showCaseToast(state.lang === 'zh' ? ('已重命名为「' + nextName + '」')"), '成功必须有 toast');
});

test('行内输入框的样式（悬停浮层需在重命名时常驻可点）', () => {
  assert.ok(appSource.includes('.case-side-overlay.case-side-renaming { opacity: 1; pointer-events: auto; }'));
  assert.ok(appSource.includes('.case-side-overlay .case-side-rename-input {'));
  assert.ok(appSource.includes('.case-type-menu button[data-material-rename] { margin-top: 4px; border-top: 1px solid #f1f5f9; }'));
});
