// v915：项目详情弹窗左下角的「AI 识别」按钮整块摘除（渲染 + 接线）。
// 口径与 v914 一致：只断开调用路径，底层函数（requestCaseElementSuggestions /
// selectCaseElementSuggestionFile / clearCaseElementSuggestions）与端点
// functions/api/analyze-elements.js 一字不删。替代路径是后台无人值守识别（腾讯云 worker）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');

/* ── 1) 详情弹窗渲染路径 ─────────────────────────────────────────────────── */

// 详情弹窗 footer 的模板片段：从 <footer> 起到拖拽蒙层为止（下载/联系那排按钮都在里面）
const footStart = appSource.indexOf('<footer class="case-project-foot">\n          ${previewAiEnabled');
const footEnd = appSource.indexOf('<div class="case-drop-veil"', footStart);
const footHtml = appSource.slice(footStart, footEnd);

test('v915 详情弹窗渲染：左下角不再有「AI 识别」按钮，其它底栏按钮一个不少', () => {
  assert.ok(footStart > 0 && footEnd > footStart, '找得到详情弹窗 footer 的渲染片段');
  assert.match(footHtml, /id="case-foot-tags"/, '标签条照旧');
  assert.match(footHtml, /id="case-foot-add-tag"/, '「＋标签」入口照旧');
  assert.doesNotMatch(footHtml, /case-foot-ai-tag/, '不再渲染 AI 识别按钮');
  assert.doesNotMatch(footHtml, /AI 识别|AI Tags|case-foot-ai-suggest/);
  // 底栏其它按钮不许被误伤
  ['case-download-all', 'case-download-source', 'case-contact-btn'].forEach(function(id) {
    assert.match(footHtml, new RegExp('id="' + id + '"'), '底栏按钮 ' + id + ' 照旧');
  });
});

test('v915 接线摘净：全仓不再查这个按钮，也没有建议浮窗与 AI 调用', () => {
  assert.doesNotMatch(appSource, /case-foot-ai-tag/, '按钮 id 一处都不留（渲染与接线都没了）');
  assert.doesNotMatch(appSource, /data-foot-ai-/, '详情弹窗那份建议 chip 的 data 属性不再出现');
  assert.doesNotMatch(appSource, /runAiSuggest|renderSuggestPop|case-foot-ai-suggest|case-foot-ai-rerun/, '建议浮窗整套没了引用');
  // 「＋标签」的接线要保持原样（点开编辑器 → 点一下即保存）
  assert.match(appSource, /const addBtn = backdrop\.querySelector\('#case-foot-add-tag'\);/);
  assert.match(appSource, /addBtn\.addEventListener\('click', openEditor\);/);
  assert.match(appSource, /persistSelection\(\)\.catch\(persistError\);/);
  assert.match(appSource, /renderCaseTagChipGroups\(footSel\)/);
});

/* ── 2) 底层函数与端点保留 ───────────────────────────────────────────────── */

test('v915 底层函数与端点原样保留（只断调用路径，不删实现）', () => {
  assert.match(appSource, /async function requestCaseElementSuggestions\(root, file\) \{/);
  assert.match(appSource, /async function selectCaseElementSuggestionFile\(files\) \{/);
  assert.match(appSource, /function clearCaseElementSuggestions\(root\) \{/);

  const endpoint = join(here, '..', 'functions', 'api', 'analyze-elements.js');
  assert.ok(existsSync(endpoint), '/api/analyze-elements 端点文件仍在（线上在跑，别处可能引用）');
  const endpointSource = readFileSync(endpoint, 'utf8');
  assert.ok(endpointSource.length > 0, '端点非空');
  const digest = createHash('sha256').update(endpointSource).digest('hex');
  assert.equal(digest, '5ed6029c198a915662e42ce0df57cf0e30fa3d7504b982de3893126399366cbd',
    'v915 没有改动这个端点；若确实要改端点，请同步更新这条基线指纹');
  assert.match(endpointSource, /export async function onRequest/, '端点入口照旧');
});

/* ── 3) 上传表单那条路（v914 已去，这里再锁一遍） ────────────────────────── */

test('v915 上传表单渲染路径：没有 AI 建议 chip，也不调识别接口', () => {
  const bar = appSource.slice(appSource.indexOf('  function renderCaseTagBar(selected) {'), appSource.indexOf('  // 封面缩到长边 ≤1024px'));
  assert.ok(bar.length > 0, '切得到标签条渲染函数');
  assert.match(bar, /data-case-tag-bubbles|data-case-tag-add/, '气泡条与「添加标签」入口照旧');
  assert.doesNotMatch(bar, /data-case-tag-ai/, '标签条不渲染 AI 建议区块');
  assert.doesNotMatch(bar, /analyze-elements/);

  const trigger = appSource.slice(appSource.indexOf('  function renderCaseDropGrid(zone, fileList) {'), appSource.indexOf('  // 图库预览：与案例库同一套卡片'));
  assert.doesNotMatch(trigger, /analyze-elements|requestCaseElementSuggestions|selectCaseElementSuggestionFile/,
    '上传拖图那条路不做 AI 元素识别');
});

/* ── 4) 版本号 ───────────────────────────────────────────────────────────── */

test('v915 版本号：index.html 5 处 + app.js 1 处', () => {
  const refs = indexSource.match(/\?v=20261014-faster-tag-write-v932/g) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处版本号');
  assert.match(appSource, /const TOOL_UI_VERSION = '20261014-faster-tag-write-v932'/);
});
