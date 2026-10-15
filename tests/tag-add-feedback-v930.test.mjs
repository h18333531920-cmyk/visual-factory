// v930（2026-10-14）：加标签这件事**每次都要有看得见的反应**。
//
// 用户口径（原话）：「我在文本框里输入完以后点对号一点反应没有」。
//
// 实测（2026-10-14，真浏览器点 + 查库，记在正本 §11 v930）：
//   **写库与刷新本来就是好的** —— ✓ 点下去 POST 成功、`manual_tags` 真的落库、面板也真的重画。
//   坏在**没有任何反馈**，三个原因叠在一起：
//     ① 空框点 ✓ 以前是"悄悄把输入框收起来"（`closeCasePreviewAiInlineAdd`），看着就像点击无效；
//     ② 加进去的词如果本来就在标签行里（已存在的 AI 标签被转成人工标签），整行**一个字都不变**；
//     ③ 人工标签排在**行首**，而标签行横向滚动（`overflow-x:auto`）—— 行被滚到右边时，
//        新词出现在左边看不见的地方，于是"什么都没有发生"。
//   修法：空框 → 提示 + 留住输入框（不再收起）；成功 → 弹「已添加标签「X」」+ 把那一行滚回最左；
//         输入法拼词中的回车不再当成提交（`isComposing`）。
//
// 本文件锁住这几件事（用真跑 `submitCasePreviewAiInlineAdd` 的方式，不是只查源码）：
//   ① 空框：不发请求、**不收起输入框**、有提示；
//   ② 有值：发请求 → 重画 → 行滚回最左 → 弹「已添加标签「X」」；动效行说的是「动效标签」；
//   ③ 失败：弹「添加失败：…」，输入框可用；
//   ④ 回车：输入法合成中是"上屏"不算提交；正常回车才算；
//   ⑤ 版本号六处同步。
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
const VERSION = '20261015-canonical-query-v950';

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SLICE_START = '  const CASE_PREVIEW_AI_INLINE_ADD = {';
const SLICE_END = '  function wireCasePreviewAiHover(panel, manualTags, aiTags, excluded) {';
const EXPORTS = ';({submitCasePreviewAiInlineAdd, casePreviewAiInlineAddKeydown, closeCasePreviewAiInlineAdd, wireCasePreviewAiPanelPointerGuard})';

// 造一个"真"输入框：能 focus / 有 value / closest 能找回面板与背景
function makeDom({kind = 'element', value = ''} = {}) {
  const ids = {
    element: {inputId: 'case-preview-ai-add-input', plusId: 'case-preview-ai-add-plus', confirmId: 'case-preview-ai-add-confirm'},
    effect: {inputId: 'case-preview-ai-effect-add-input', plusId: 'case-preview-ai-effect-add-plus', confirmId: 'case-preview-ai-effect-add-confirm'}
  }[kind];
  const rows = {element: {scrollLeft: 120}, effect: {scrollLeft: 120}};
  const confirmClasses = new Set();
  const confirm = {
    id: ids.confirmId, disabled: false, textContent: '✓', isConnected: true,
    classList: {add: (name) => { confirmClasses.add(name); }, remove: (name) => { confirmClasses.delete(name); }}
  };
  const panel = {
    dataset: {previewId: 'p1', adding: kind},
    innerHTML: '',
    querySelector: (selector) => {
      if (String(selector) === '#' + ids.confirmId) return confirm;
      if (String(selector).indexOf('.case-preview-ai-effect') === 0) return rows.effect;
      if (String(selector).indexOf('.case-preview-ai-chips') === 0) return rows.element;
      return null;
    }
  };
  const backdrop = {id: 'case-project-backdrop'};
  const input = {
    id: ids.inputId,
    value: value,
    disabled: false,
    focusCount: 0,
    closest: (selector) => (String(selector).indexOf('case-preview-ai-panel') >= 0 ? panel : (String(selector).indexOf('case-project-backdrop') >= 0 ? backdrop : null)),
    focus() { this.focusCount += 1; }
  };
  return {input, panel, backdrop, rows, confirm, confirmClasses};
}

function load({lang = 'zh', reject = '', manual = false} = {}) {
  const start = source.indexOf(SLICE_START);
  const end = source.indexOf(SLICE_END);
  assert.ok(start > 0 && end > start, 'v926 的「＋」片段必须切得出来');
  const calls = {posts: [], toasts: [], alerts: [], refreshes: 0, grid: 0};
  let releasePost = null;
  const pendingPost = manual ? new Promise((resolve) => { releasePost = resolve; }) : null;
  const context = vm.createContext({
    state: {lang},
    console: {warn() {}},
    previewAiTagsTableReady: true,
    escapeHtml,
    escapeAttr: escapeHtml,
    libraryDisplayLabel: (value) => String(value == null ? '' : value),
    casePreviewAiRow: () => null,
    casePreviewAiTags: () => [],
    casePreviewAiEffectTagLayers: () => ({manual: [], ai: []}),
    casePreviewAiDynamicPreview: () => false,
    casePreviewAiStatusText: () => '未识别',
    casePreviewAiContentKeyUnchanged: () => true,
    wireCasePreviewAiHover: () => {},
    document: {getElementById: () => null},
    alert: (message) => { calls.alerts.push(String(message)); },
    showCaseToast: (text) => { calls.toasts.push(String(text)); },
    renderLibraryGrid: () => { calls.grid += 1; },
    postCasePreviewAiTagAction: (payload) => {
      calls.posts.push(payload);
      if (reject) return Promise.reject(new Error(reject));
      if (pendingPost) return pendingPost;
      return Promise.resolve({preview_id: payload.previewId});
    }
  });
  const api = vm.runInContext(source.slice(start, end) + '\n' + EXPORTS, context, {filename: 'app-v930-add.js'});
  // 重画计数：面板上的 __casePreviewAiRefresh 是渲染函数挂的，这里直接给一个计数桩
  return {api, calls, context, releasePost: () => { if (releasePost) releasePost({preview_id: 'p1'}); }};
}

test('v930 ①：空框点 ✓ 不再"悄悄收起"，改成提示 + 留住输入框', () => {
  const {api, calls} = load();
  const {input, panel} = makeDom({value: '   '});
  panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  api.submitCasePreviewAiInlineAdd(input);
  assert.equal(calls.posts.length, 0, '空值不发请求');
  assert.equal(calls.refreshes, 0, '空值不重画面板（以前会重画 = 把框收起来）');
  assert.equal(panel.dataset.adding, 'element', '加号态要留着 —— 输入框不能消失');
  assert.equal(input.focusCount, 1, '光标要回到输入框');
  assert.match(calls.toasts.join('|'), /先输入标签/, '要给一句提示');
});

test('v930 ②：加成功 → 发请求 + 重画 + 行滚回最左 + 弹「已添加标签「X」」', async () => {
  const {api, calls} = load();
  const {input, panel, rows} = makeDom({value: '  餐具  '});
  panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  await api.submitCasePreviewAiInlineAdd(input);
  // 跨 vm realm 的对象 deepEqual 会因原型不同而失败，比 JSON 字符串
  assert.equal(JSON.stringify(calls.posts), JSON.stringify([{action: 'manual-add', previewId: 'p1', tag: '餐具'}]), '词要 trim 过再发');
  assert.equal(calls.refreshes, 1, '成功后要重画面板');
  assert.equal(rows.element.scrollLeft, 0, '元素行要滚回最左（新的人工标签在行首）');
  assert.equal(rows.effect.scrollLeft, 120, '别动另一行');
  assert.deepEqual(calls.toasts, ['已添加标签「餐具」'], '要弹一条看得见的反馈');
  assert.equal(calls.grid, 1, '结果列表也要跟着刷（搜索/封面会用新标签）');
});

test('v930 ②：动效那一行说的是「动效标签」，且滚的是动效行', async () => {
  const {api, calls} = load();
  const {input, panel, rows} = makeDom({kind: 'effect', value: '缩放'});
  panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  await api.submitCasePreviewAiInlineAdd(input);
  assert.equal(JSON.stringify(calls.posts), JSON.stringify([{action: 'manual-effect-add', previewId: 'p1', tag: '缩放'}]));
  assert.equal(rows.effect.scrollLeft, 0, '动效行要滚回最左');
  assert.equal(rows.element.scrollLeft, 120, '别动元素行');
  assert.deepEqual(calls.toasts, ['已添加动效标签「缩放」']);
});

test('v930 ②：英文界面文案是英文', async () => {
  const {api, calls} = load({lang: 'en'});
  const {input, panel} = makeDom({value: 'burger'});
  panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  await api.submitCasePreviewAiInlineAdd(input);
  assert.deepEqual(calls.toasts, ['Added tag "burger"']);
  const empty = load({lang: 'en'});
  const made = makeDom({value: ''});
  made.panel.__casePreviewAiRefresh = () => { empty.calls.refreshes += 1; };
  empty.api.submitCasePreviewAiInlineAdd(made.input);
  assert.match(empty.calls.toasts.join('|'), /Type a tag first/);
});

test('v930 ③：失败 → 弹「添加失败：…」，输入框恢复可用', async () => {
  const {api, calls} = load({reject: '标签无效'});
  const {input, panel} = makeDom({value: '餐具'});
  panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  await api.submitCasePreviewAiInlineAdd(input);
  assert.equal(input.disabled, false, '失败后要能重试');
  assert.equal(calls.refreshes, 0, '失败不重画');
  assert.equal(calls.toasts.length, 0, '失败用 alert，不用 toast');
  assert.match(calls.alerts.join('|'), /添加失败：标签无效/);
});

test('v930 ④：输入法拼词中的回车 = 上屏，不算提交', () => {
  const {api, calls} = load();
  const {input} = makeDom({value: '餐具'});
  let prevented = 0;
  const makeEvent = (extra) => Object.assign({
    key: 'Enter', target: input, preventDefault() { prevented += 1; }, stopPropagation() {}
  }, extra);
  assert.equal(api.casePreviewAiInlineAddKeydown(makeEvent({isComposing: true})), false, '拼词中不处理');
  assert.equal(calls.posts.length, 0);
  assert.equal(prevented, 0, '拼词中连 preventDefault 都不要做（别打断上屏）');
  assert.equal(api.casePreviewAiInlineAddKeydown(makeEvent({keyCode: 229})), false, 'keyCode 229（老浏览器）同样不处理');
  assert.equal(api.casePreviewAiInlineAddKeydown(makeEvent({})), true, '正常回车仍然提交');
  assert.equal(prevented, 1);
});

test('v931：面板里的按钮挡住 mousedown 默认行为 —— 别让输入框的 blur 把要点的那颗按钮销毁', () => {
  const {api} = load();
  const listeners = {};
  let attachCount = 0;
  const panel = {dataset: {}, innerHTML: '', addEventListener: (type, handler) => { attachCount += 1; listeners[type] = handler; }};
  api.wireCasePreviewAiPanelPointerGuard(panel);
  assert.equal(typeof listeners.mousedown, 'function', '要在面板上挂一个 mousedown 守卫');
  assert.equal(attachCount, 1);
  api.wireCasePreviewAiPanelPointerGuard(panel);
  assert.equal(attachCount, 1, '重复调用不要重复挂（面板重画时会再调一次）');
  const fire = (hit) => {
    let prevented = 0;
    listeners.mousedown({target: {closest: (selector) => (String(selector) === hit ? {} : null)}, preventDefault() { prevented += 1; }});
    return prevented;
  };
  assert.equal(fire('.case-preview-ai-add-confirm'), 1, '✓ 要挡住（否则先 blur、面板重画、click 到不了它）');
  assert.equal(fire('.case-preview-ai-tag button'), 1, '标签上的 × 也要挡住');
  assert.equal(fire('.case-preview-ai-effect-tag button'), 1, '动效标签的 × 也要挡住');
  assert.equal(fire('.case-preview-ai-add-plus'), 1, '＋ 也要挡住');
  assert.equal(fire('.something-else'), 0, '别的元素别乱挡');
  // 渲染函数里真的调了它（而不是定义了没人用）
  assert.match(source, /panel\.__casePreviewAiRefresh = function\(\) \{ renderCasePreviewAiPanel\(backdrop, preview, canManage\); \};\s*\n\s*wireCasePreviewAiPanelPointerGuard\(panel\);/);
});

test('v932：正在添加时不重复发请求，✓ 显示"进行中"，失败后恢复', async () => {
  const {api, calls, releasePost} = load({manual: true});
  const {input, panel, confirm, confirmClasses} = makeDom({value: '足球场'});
  panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  const first = api.submitCasePreviewAiInlineAdd(input);
  // 用户实测「点了没反应，我连续点好几次」——连点不能再发请求
  api.submitCasePreviewAiInlineAdd(input);
  api.submitCasePreviewAiInlineAdd(input);
  assert.equal(calls.posts.length, 1, '在途期间连点只发一次');
  assert.equal(input.disabled, true, '等待期间输入框锁住');
  assert.equal(confirm.textContent, '…', '✓ 要显示"进行中"');
  assert.equal(confirmClasses.has('is-busy'), true, '✓ 要有 is-busy 样式');
  releasePost();
  await first;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.refreshes, 1, '成功后照旧重画面板');
  assert.deepEqual(calls.toasts, ['已添加标签「足球场」']);
  // 收尾：busy 清掉（成功后面板重画，旧按钮已经 detached，这里只是别让标志位卡住）
  const again = makeDom({value: '披萨'});
  again.panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  await api.submitCasePreviewAiInlineAdd(again.input);
  assert.equal(calls.posts.length, 2, '加完之后还能继续加（busy 没卡死）');
});

test('v932：失败时 ✓ 要恢复可用（不然下一次点不动）', async () => {
  const {api, calls} = load({reject: '标签无效'});
  const {input, panel, confirm, confirmClasses} = makeDom({value: '足球场'});
  panel.__casePreviewAiRefresh = () => { calls.refreshes += 1; };
  await api.submitCasePreviewAiInlineAdd(input);
  assert.match(calls.alerts.join('|'), /添加失败/);
  assert.equal(input.disabled, false);
  assert.equal(confirm.textContent, '✓', '✓ 要恢复原样');
  assert.equal(confirmClasses.has('is-busy'), false);
  assert.equal(confirm.disabled, false);
});

test('v932：端点少跑一个往返 —— 两个读并行 + 非动效动作的载荷不带 manual_effect_tags', () => {
  const endpoint = readFileSync(join(ROOT, 'functions', 'api', 'case-preview-ai-tags.js'), 'utf8');
  assert.match(endpoint, /await Promise\.all\(\[previewFor\(env, previewId\), currentFor\(env, previewId\)\]\)/, '两个读要并行（串行是两个往返）');
  assert.match(endpoint, /const currentManualEffectTags = cleanTags\(current\?\.manual_effect_tags\);/, '人工动效层只读到变量');
  assert.doesNotMatch(endpoint, /^\s+manual_effect_tags: cleanTags\(current\?\.manual_effect_tags\),/m, 'base 里不许默认带上这一列（sql/031 没跑时它每次都被拒再重试）');
  assert.match(endpoint, /base\.manual_effect_tags = cleanTags\(currentManualEffectTags\.concat\(tag\)\)/, '只有 manual-effect-add 才显式写它');
});

test('v930 ⑤：版本号六处同步', () => {
  assert.match(source, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  const refs = indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处 ?v= 指向新版本');
});
