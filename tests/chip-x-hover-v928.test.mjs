// v928（2026-10-14）：标签上的「×」不再常驻 —— 鼠标移上去才出来。
//
// 用户口径（原话，附截图）：「我点了加号之后，标签上永远都有叉号了」。
//
// 背景：v926 把「编辑 / 完成」两个按钮删掉时，说明里写的是「× 就是删除入口，必须一直看得见」
// （见那一版 CSS 注释），于是每个标签右边都常挂一个 ×。用户不要这个。v928 改成：
//   **× 默认 opacity:0（位置照旧占着，所以露出来时整行不跳），鼠标移到这个标签上、
//     或键盘把焦点移进去才 opacity:1；触屏设备（没有 hover）则一直亮着，否则 iPad 上删不掉。**
//
// 本文件锁住三件事：
//   ① 元素标签与动效标签的 × 默认都是藏着的，且各有 hover / focus-within 露出规则；
//   ② 触屏媒体查询里把 × 露出来；
//   ③ 只是**视觉上藏** —— 真渲面板里删除按钮的 markup（人工标签的 `data-preview-manual-remove`、
//      AI 标签的 `data-preview-ai-exclude`）与末尾的「＋」都还在，删除/新增能力没被删掉。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const source = readFileSync(join(ROOT, 'app.js'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');
const VERSION = '20261014-chip-x-hover-v928';

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// CSS 就写在 app.js 顶部的那段样式里，按两段取出来看
const cssStart = source.indexOf('.case-preview-ai-tag { display: inline-flex');
const cssEnd = source.indexOf('.case-foot-tool-btn {');
assert.ok(cssStart > 0 && cssEnd > cssStart, '标签 chip 的样式片段必须切得出来');
const chipCss = source.slice(cssStart, cssEnd);

function renderPanel({lang = 'zh', manual = [], ai = [], effectManual = []} = {}) {
  const start = source.indexOf('  const CASE_PREVIEW_AI_INLINE_ADD = {');
  const end = source.indexOf('  function wireCasePreviewAiHover(panel, manualTags, aiTags, excluded) {');
  assert.ok(start > 0 && end > start, 'v926 的面板片段必须切得出来');
  const panel = {dataset: {}, innerHTML: ''};
  const backdrop = {querySelector: (selector) => (String(selector).indexOf('case-preview-ai-panel') >= 0 ? panel : null)};
  const context = vm.createContext({
    state: {lang},
    console: {warn() {}},
    previewAiTagsTableReady: true,
    escapeHtml,
    escapeAttr: escapeHtml,
    libraryDisplayLabel: (value) => String(value == null ? '' : value),
    casePreviewAiRow: () => ({status: 'success', ai_tags: ai, manual_tags: manual, excluded_tags: []}),
    casePreviewAiTags: () => manual.concat(ai),
    casePreviewAiEffectTagLayers: () => ({manual: effectManual, ai: []}),
    casePreviewAiDynamicPreview: () => false,
    casePreviewAiStatusText: () => 'AI直接应用',
    casePreviewAiContentKeyUnchanged: () => true,
    wireCasePreviewAiHover: () => {},
    wireCasePreviewAiInlineAddInput: () => {},
    document: {getElementById: () => null},
    alert: () => {}
  });
  vm.runInContext(source.slice(start, end) + '\n;({renderCasePreviewAiPanel})', context, {filename: 'app-v928-panel.js'});
  context.renderCasePreviewAiPanel(backdrop, {id: 'p1', preview_filename: 'a.png'}, true);
  return panel.innerHTML;
}

test('v928 ①：元素标签的 × 默认藏着，hover / focus-within 才露出来', () => {
  assert.match(chipCss, /\.case-preview-ai-tag button \{[^}]*opacity: 0;/, '× 默认必须是 opacity:0');
  assert.match(chipCss, /\.case-preview-ai-tag button \{[^}]*display: inline-flex;[^}]*opacity: 0;/, '别改成 display:none —— 那样露出来时整行会跳（占位要留着）');
  assert.match(chipCss, /\.case-preview-ai-tag:hover button,\s*\n\s*\.case-preview-ai-tag:focus-within button \{ opacity: 1; \}/, '鼠标移上去要露出来（键盘焦点同理）');
  assert.match(chipCss, /\.case-preview-ai-pop \.case-preview-ai-tag button \{ display: none; \}/, '溢出时那个浮窗里的标签照旧不显示 ×');
});

test('v928 ①：人工动效标签的 × 同一口径', () => {
  assert.match(chipCss, /\.case-preview-ai-effect-tag button \{[^}]*opacity: 0;/, '动效标签的 × 默认也要藏着');
  assert.match(chipCss, /\.case-preview-ai-effect-tag:hover button,\s*\n\s*\.case-preview-ai-effect-tag:focus-within button \{ opacity: 1; \}/, '动效标签 hover 也要露出来');
});

test('v928 ②：触屏（没有 hover）上 × 一直亮着，否则 iPad 删不掉标签', () => {
  assert.match(chipCss, /@media \(hover: none\) \{[\s\S]*?\.case-preview-ai-tag button,\s*\n\s*\.case-preview-ai-effect-tag button \{ opacity: 1; \}/, '触屏要一直显示 ×');
});

test('v928 ③：只是视觉上藏了 —— 删除按钮与「＋」的 markup 都还在', () => {
  const html = renderPanel({manual: ['汉堡'], ai: ['披萨'], effectManual: ['缩放']});
  assert.match(html, /data-preview-manual-remove="汉堡"/, '人工标签的删除按钮还在');
  assert.match(html, /data-preview-ai-exclude="披萨"/, 'AI 标签的排除按钮还在');
  assert.match(html, /data-preview-effect-manual-remove="缩放"/, '人工动效标签的删除按钮还在');
  assert.match(html, /case-preview-ai-add-plus/, '末尾的「＋」还在');
  assert.doesNotMatch(html, /is-editing/, '编辑态这套东西不该回来');
});

test('v928 ③：版本号六处同步', () => {
  assert.match(source, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  const refs = indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处 ?v= 指向新版本');
});
