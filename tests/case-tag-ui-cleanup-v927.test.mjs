// v927（2026-10-14）：标签面板两处"废话 UI"去掉。
//
// 用户口径（原话，附截图两张）：
//   「这个 ai 直接应用的小字，还有一键识别的按钮都去掉吧」
//
// 背景：批量识别现在跑在腾讯云的 cron worker 上（`/opt/case-tags/scripts/recognize-case-tags.mjs`），
// 浏览器里那个「一键识别」按钮已经没用了；而面板底部那行小字在最常见的情况下只有一句
// 「AI直接应用」—— 只要这张图有 AI 标签它就这么写，等于没说。
//
// 本文件锁住三件事：
//   ① 项目弹窗头部不再渲染「一键识别」按钮 / 进度条（`.case-ai-scan-btn`、`id="case-ai-recognize-all"` 都不出现在头部）；
//   ② 面板底部状态行**只在真的要注意时才出**（图片变了 / 识别失败 / 识别中 / 结果过期），
//      正常的「AI直接应用」不再渲染；
//   ③ 版本号六处同步（app.js 一处 + index.html 五处）。
//
// 底层 run 机制（startCasePreviewAiRun / updateCasePreviewAiRunUi / 取消 / 重试失败项）**故意保留未删** ——
// 将来要挂回按钮就能用（见 app.js 里那段 v927 注释），所以本文件不禁止这些函数名继续存在。
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
const VERSION = '20261016-uploader-delete-v958';

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ── 真渲面板：切出 v926 的整段「＋」块 + 面板渲染，用真 HTML 检验底部状态行 ──── */
const SLICE_START = '  const CASE_PREVIEW_AI_INLINE_ADD = {';
const SLICE_END = '  function wireCasePreviewAiHover(panel, manualTags, aiTags, excluded) {';
const EXPORTS = ';({renderCasePreviewAiPanel})';

function renderPanel({lang = 'zh', row = null, tags = [], statusText = 'AI直接应用', contentKeyUnchanged = true} = {}) {
  const start = source.indexOf(SLICE_START);
  const end = source.indexOf(SLICE_END);
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
    casePreviewAiRow: () => row,
    casePreviewAiTags: () => tags,
    casePreviewAiEffectTagLayers: () => ({manual: [], ai: []}),
    casePreviewAiDynamicPreview: () => false,
    casePreviewAiStatusText: () => statusText,
    casePreviewAiContentKeyUnchanged: () => contentKeyUnchanged,
    wireCasePreviewAiHover: () => {},
    wireCasePreviewAiInlineAddInput: () => {},
    document: {getElementById: () => null},
    alert: () => {}
  });
  vm.runInContext(source.slice(start, end) + '\n' + EXPORTS, context, {filename: 'app-v927-panel.js'});
  context.renderCasePreviewAiPanel(backdrop, {id: 'p1', preview_filename: 'a.png'}, true);
  return panel.innerHTML;
}

test('v927 ①：项目弹窗头部不再有「一键识别」按钮与它的进度条', () => {
  // 页面里有两个 .case-project-head（详情弹窗 + 编辑信息弹窗），只取带「返回」那个 = 详情弹窗
  const marker = '<header class="case-project-head">';
  const heads = [];
  for (let at = source.indexOf(marker); at >= 0; at = source.indexOf(marker, at + 1)) {
    heads.push(source.slice(at, source.indexOf('</header>', at)));
  }
  const head = heads.find((block) => block.indexOf('case-back-btn') >= 0);
  assert.ok(head, '项目详情弹窗的头部必须切得出来');
  assert.doesNotMatch(head, /case-ai-scan-btn/, '头部不该再出现识别按钮的 class');
  assert.doesNotMatch(head, /case-ai-recognize-all/, '头部不该再出现识别按钮的 id');
  assert.doesNotMatch(head, /case-ai-run-progress/, '头部不该再出现识别进度条');
  assert.doesNotMatch(head, /一键识别|Analyze all/, '头部不该再出现「一键识别」文案');
  assert.match(head, /id="case-more-btn"/, '「⋯ 更多操作」必须留下');
  assert.match(head, /case-project-close/, '关闭按钮必须留下');
});

test('v927 ①：识别按钮的 class 与点击接线一起删干净（不会留下点了没反应的壳）', () => {
  assert.doesNotMatch(source, /case-ai-scan-btn/, '按钮样式与标记应全部删除');
  assert.doesNotMatch(source, /recognizeButton/, '按钮的 onclick 接线应删除');
  assert.doesNotMatch(source, /一键识别未开始|Analysis did not start/, '按钮专属的报错文案应删除');
});

test('v927 ①：底层 run 机制按约定保留（将来要挂回按钮）', () => {
  assert.match(source, /async function startCasePreviewAiRun\(source, materials, onlyIds\)/, 'startCasePreviewAiRun 保留');
  assert.match(source, /function updateCasePreviewAiRunUi\(sourceId\)/, 'updateCasePreviewAiRunUi 保留');
});

test('v927 ②：正常有 AI 标签时，底部不再出现「AI直接应用」这类废话', () => {
  const html = renderPanel({
    row: {status: 'success', ai_tags: ['餐桌'], manual_tags: [], excluded_tags: []},
    tags: ['餐桌'],
    statusText: 'AI直接应用'
  });
  assert.doesNotMatch(html, /AI直接应用/, '「AI直接应用」不该再渲染出来');
  assert.doesNotMatch(html, /case-preview-ai-status/, '这一态下整条底部状态行都不该有');
  assert.match(html, /餐桌/, '正常标签还是要显示');
});

test('v927 ②：真的要注意的状态仍然出字（图片变了 / 识别失败 / 识别中）', () => {
  const changed = renderPanel({
    row: {status: 'success', content_key: 'k1', ai_tags: ['餐桌'], manual_tags: [], excluded_tags: []},
    tags: ['餐桌'],
    contentKeyUnchanged: false,
    statusText: '图片已变化，标签待重新识别'
  });
  assert.match(changed, /case-preview-ai-status/, '图片变了必须提醒');
  assert.match(changed, /图片已变化，标签待重新识别/);

  const failed = renderPanel({row: {status: 'failed', ai_tags: [], manual_tags: [], excluded_tags: []}, statusText: '识别失败'});
  assert.match(failed, /case-preview-ai-status is-error/, '识别失败要红字提醒');
  assert.match(failed, /识别失败/);

  const running = renderPanel({row: {status: 'running', ai_tags: [], manual_tags: [], excluded_tags: []}, statusText: '识别中…'});
  assert.match(running, /识别中…/, '识别中仍要显示');
});

test('v927 ②：没有这一行数据（row 为空）时也不会冒出一条莫名状态行', () => {
  const html = renderPanel({row: null, tags: [], statusText: '未识别'});
  assert.doesNotMatch(html, /case-preview-ai-status/, 'row 为空时底部不该有状态行');
});

test('v927 ③：版本号六处同步', () => {
  assert.match(source, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  const refs = indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处 ?v= 指向新版本');
});
