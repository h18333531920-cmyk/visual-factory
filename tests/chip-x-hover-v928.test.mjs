// 标签上的「×」什么时候出现（v928 起改这个，v929 定稿）。
//
// 用户口径（两次，隔了一天）：
//   v928：「我点了加号之后，标签上永远都有叉号了」            ⇒ 先改成"鼠标移上去才出现"
//   v929：「现在鼠标 hover 状态会出现叉，这个叉是常驻的吗？这样太容易误删了，
//          要点加号的情况下才出现叉」                        ⇒ 再改成"只在加号态出现"（本文件断言的口径）
//
// 背景：v926 删「编辑 / 完成」两个按钮时，把 × 的显隐规则一起拆了（`display: inline-flex` 直接挪进基础规则），
// 于是每个标签右边常挂一个 ×；v925 时它本来是 `.case-preview-ai-tag.is-editing button { ... }`
// （只有编辑态才显示）。现在的口径（v929 定触发条件、**v933 定"不占位"**）：
//   **× 默认 `display: none`（不参与布局 ⇒ 标签后面不会空出一小块）；
//     只有点了这一行末尾的「＋」（面板进入 dataset.adding = 'element' / 'effect'）才 `display: inline-flex`；
//     收起小输入框（Esc / 空框失焦）就跟着消失。**
//   v929–v932 用的是 `opacity: 0`（位置照旧占着）——用户实测反馈「常态标签后面会空出一小块空间」，v933 改成 display。
//   不用 hover 触发（用户嫌"扫过去就亮、旁边就是标签本体，太容易误删"）；
//   触屏也没关系：点 ＋ 一样能进加号态。
//
// 本文件锁住三件事：
//   ① 元素标签与动效标签的 × 默认藏着；`is-adding` 时才亮；**没有 hover / focus-within 触发**、
//      也没有 `@media (hover: none)` 那种"触屏一直亮"的兜底（那会让 × 又常驻）；
//   ② 「加号态」这个 class 是**跟着 ＋ 走的**：渲染时读 `panel.dataset.adding`，元素行 / 动效行各管各的；
//   ③ 只是**视觉上藏** —— 真渲面板里三个删除入口的 markup 与末尾的「＋」都在，删除/新增能力没被删掉。
//      （文件名里的 v928 是"× 不再常驻"那一版的起点，v929 把触发条件收紧到加号态。）
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
const VERSION = '20261014-chip-x-no-gap-v933';

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// CSS 就写在 app.js 顶部的那段样式里，按两段取出来看
const cssStart = source.indexOf('.case-preview-ai-tag { display: inline-flex');
const cssEnd = source.indexOf('.case-foot-tool-btn {');
assert.ok(cssStart > 0 && cssEnd > cssStart, '标签 chip 的样式片段必须切得出来');
const chipCss = source.slice(cssStart, cssEnd);

function renderPanel({lang = 'zh', manual = [], ai = [], effectManual = [], adding = ''} = {}) {
  const start = source.indexOf('  const CASE_PREVIEW_AI_INLINE_ADD = {');
  const end = source.indexOf('  function wireCasePreviewAiHover(panel, manualTags, aiTags, excluded) {');
  assert.ok(start > 0 && end > start, 'v926 的面板片段必须切得出来');
  const panel = {dataset: adding ? {adding} : {}, innerHTML: ''};
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
  vm.runInContext(source.slice(start, end) + '\n;({renderCasePreviewAiPanel})', context, {filename: 'app-chip-x-panel.js'});
  context.renderCasePreviewAiPanel(backdrop, {id: 'p1', preview_filename: 'a.png'}, true);
  return panel.innerHTML;
}

test('v929/v933 ①：元素标签的 × 默认**不占位**，只有加号态才出现', () => {
  assert.match(chipCss, /\.case-preview-ai-tag button \{ display: none;/, '× 默认必须是 display:none —— 留着占位会在每个标签后面空出一小块（用户实测反馈过）');
  assert.match(chipCss, /\.case-preview-ai-chips\.is-adding \.case-preview-ai-tag button \{ display: inline-flex; \}/, '加号态才让 × 参与布局（那时行本来就会变）');
  assert.doesNotMatch(chipCss, /\.case-preview-ai-tag button \{[^}]*opacity: 0;/, '别再退回"opacity:0 占位"——那正是空出一小块的原因');
  assert.doesNotMatch(chipCss, /\.case-preview-ai-tag button \{[^}]*opacity: 1;/, '也不许常显');
});

test('v929 ①：不再用 hover / focus-within 触发（用户嫌扫过去就亮、太容易误删）', () => {
  assert.doesNotMatch(chipCss, /\.case-preview-ai-tag:hover button/, 'hover 不该再让 × 出现');
  assert.doesNotMatch(chipCss, /\.case-preview-ai-tag:focus-within button/, 'focus-within 也不该触发');
  assert.doesNotMatch(chipCss, /@media \(hover: none\)/, '触屏那条"一直亮"的兜底要去掉，否则 × 在 iPad 上又常驻');
});

test('v929/v933 ①：人工动效标签的 × 同一口径', () => {
  assert.match(chipCss, /\.case-preview-ai-effect-tag button \{ display: none;/, '动效标签的 × 默认也不占位');
  assert.match(chipCss, /\.case-preview-ai-effect\.is-adding \.case-preview-ai-effect-tag button \{ display: inline-flex; \}/, '动效行的加号态才让它出现');
  assert.doesNotMatch(chipCss, /\.case-preview-ai-effect-tag button \{[^}]*opacity: 0;/, '同样不许用 opacity 占位');
  assert.doesNotMatch(chipCss, /\.case-preview-ai-effect-tag:hover button/, '动效标签也不该 hover 触发');
});

test('v929 ②：is-adding 跟着 ＋ 走，两行各管各的', () => {
  const idle = renderPanel({manual: ['汉堡'], ai: ['披萨'], effectManual: ['缩放']});
  assert.doesNotMatch(idle, /is-adding/, '没点 ＋ 时两行都不该有 is-adding');
  const elementAdding = renderPanel({manual: ['汉堡'], ai: ['披萨'], effectManual: ['缩放'], adding: 'element'});
  assert.match(elementAdding, /class="case-preview-ai-chips is-adding"/, '点元素行 ＋ 时只有元素行进加号态');
  assert.doesNotMatch(elementAdding, /case-preview-ai-effect is-adding/, '动效行不该跟着进加号态');
  const effectAdding = renderPanel({manual: ['汉堡'], ai: ['披萨'], effectManual: ['缩放'], adding: 'effect'});
  assert.match(effectAdding, /class="case-preview-ai-effect is-adding"/, '点动效行 ＋ 时动效行进加号态');
  assert.doesNotMatch(effectAdding, /case-preview-ai-chips is-adding/, '元素行不该跟着进加号态');
});

test('v929 ②：源码层面确认 —— dataset.adding 是 ＋ 设的、收起时删掉，且渲染真的读它', () => {
  assert.match(source, /panelNode\.dataset\.adding = config\.kind;/, '＋ 负责进入加号态');
  assert.match(source, /delete dom\.panel\.dataset\.adding;/, '收起小输入框负责退出加号态');
  assert.match(source, /const addingKind = String\(\(panel\.dataset && panel\.dataset\.adding\) \|\| ''\);/, '渲染时真的读这个状态');
  assert.match(source, /addingKind === 'element' \? ' is-adding' : ''/, '元素行按 kind 加 class');
  assert.match(source, /addingKind === 'effect' \? ' is-adding' : ''/, '动效行按 kind 加 class');
});

test('v929 ③：只是视觉上藏了 —— 删除按钮与「＋」的 markup 都还在', () => {
  const html = renderPanel({manual: ['汉堡'], ai: ['披萨'], effectManual: ['缩放']});
  assert.match(html, /data-preview-manual-remove="汉堡"/, '人工标签的删除按钮还在');
  assert.match(html, /data-preview-ai-exclude="披萨"/, 'AI 标签的排除按钮还在');
  assert.match(html, /data-preview-effect-manual-remove="缩放"/, '人工动效标签的删除按钮还在');
  assert.match(html, /case-preview-ai-add-plus/, '末尾的「＋」还在');
  assert.doesNotMatch(html, /is-editing/, '编辑态这套东西不该回来');
});

test('v929 ③：版本号六处同步', () => {
  assert.match(source, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  const refs = indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处 ?v= 指向新版本');
});
