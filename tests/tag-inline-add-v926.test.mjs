// v926（2026-10-14）：标签行的「＋」内联新增（回车即添加）+ 修掉 manual-add 的清空逻辑。
//
// 用户口径（原话）：
//   「项目展示里的编辑标签 UI 设计的不太行，而且我试了一下保存后刷新好像还是没有。
//     UI 变成在最后一个标签后面加一个加号图标小按钮，点击后出现一个小文本框，输入后回车自动添加。」
//
// 背景（2026-10-14 实测）：全库 vf_preview_ai_tags 里 manual_tags 非空的行 = 0 —— 人工加标签从来没成功过。
// 旧 UI 必须先点「编辑」进编辑态 → 打字 → **再点「添加」按钮**，回车没人管。
// 本文件锁住四件事：
//   ① 标签行末尾就是那个 ＋（编辑 / 完成两个按钮与旧的 add-row 全部删掉）；
//   ② ＋ → 就地小输入框（自动聚焦）→ **回车即添加**（✓ 同样可用）、Esc 收起、空框失焦收起；
//   ③ 添加成功后输入框保持打开并清空（连加好几个）、行内立刻出现人工 chip（带 × 可删）；
//   ④ 端点 manual-add **只加词 + 更新 content_key**，不再因为"画面变过"清空任何字段 / 打回 idle。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {handleCasePreviewAiTags} from '../functions/api/case-preview-ai-tags.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const source = readFileSync(join(ROOT, 'app.js'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');
const endpointSource = readFileSync(join(ROOT, 'functions', 'api', 'case-preview-ai-tags.js'), 'utf8');
const VERSION = '20261015-modal-scroll-lock-v941';

/* ── 切片：从「＋」那一整套（v926 块）一直切到面板渲染函数结束 ───────────────── */

const SLICE_START = '  const CASE_PREVIEW_AI_INLINE_ADD = {';
const SLICE_END = '  function wireCasePreviewAiHover(panel, manualTags, aiTags, excluded) {';
// 这一段里同时包含：配置表 / 草稿 / ＋ 与小输入框的 HTML / 打开与收起 / 提交 / 键盘 / 面板渲染
const INLINE_ADD_EXPORTS = ';({CASE_PREVIEW_AI_INLINE_ADD, casePreviewAiInlineAddConfig, casePreviewAiInlineAddHtml,'
  + ' casePreviewAiInlineAddKeydown, submitCasePreviewAiInlineAdd, wireCasePreviewAiInlineAddInput,'
  + ' closeCasePreviewAiInlineAdd, renderCasePreviewAiPanel, casePreviewAiInlineAddDraft, casePreviewAiInlineAddFocus})';

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function loadInlineAdd({lang = 'zh', row = null, tags = [], reject = '', effectManual = [], effectAi = [], dynamic = false} = {}) {
  const start = source.indexOf(SLICE_START);
  const end = source.indexOf(SLICE_END);
  assert.ok(start > 0 && end > start, 'v926 的「＋」片段必须切得出来');
  const calls = {posts: [], alerts: [], toasts: [], refreshes: 0, grid: 0};
  const context = vm.createContext({
    state: {lang},
    console: {warn() {}},
    previewAiTagsTableReady: true,
    escapeHtml,
    escapeAttr: escapeHtml,
    libraryDisplayLabel: (value) => String(value == null ? '' : value),
    casePreviewAiRow: () => row,
    casePreviewAiTags: () => tags,
    // 动效那两层由外部注入（这两个取值函数在切片之外，属 v926 第二部分）
    casePreviewAiEffectTagLayers: () => ({manual: effectManual, ai: effectAi}),
    casePreviewAiDynamicPreview: () => dynamic,
    casePreviewAiStatusText: () => (lang === 'zh' ? '未识别' : 'Not analyzed'),
    casePreviewAiContentKeyUnchanged: () => true,
    wireCasePreviewAiHover: () => {},
    document: {getElementById: () => null},
    alert: (message) => { calls.alerts.push(String(message)); },
    // v930：提交成功后会弹一条 toast（"看得见的反应"）；空框也会提示一句
    showCaseToast: (text) => { calls.toasts.push(String(text)); },
    renderLibraryGrid: () => { calls.grid += 1; },
    postCasePreviewAiTagAction: (payload) => {
      calls.posts.push(payload);
      return reject ? Promise.reject(new Error(reject)) : Promise.resolve({preview_id: payload.previewId});
    }
  });
  const api = vm.runInContext(source.slice(start, end) + '\n' + INLINE_ADD_EXPORTS, context, {filename: 'app-v926-inline-add.js'});
  return {api, calls};
}

// 假面板 / 假输入框（真渲染那两条用例用真 HTML 字符串，交互那几条只需要这几个字段）
function fakePanel({adding = '', previewId = 'p1'} = {}) {
  const panel = {
    dataset: {previewId},
    innerHTML: '',
    __casePreviewAiRefresh: null,
    querySelector: () => null
  };
  if (adding) panel.dataset.adding = adding;
  return panel;
}

function fakeInput({id = 'case-preview-ai-add-input', value = '', panel}) {
  return {
    id,
    value,
    disabled: false,
    closest: (selector) => (selector === '#case-preview-ai-panel' ? panel : (selector === '#case-project-backdrop' ? null : null))
  };
}

/* ── 1) 真渲 HTML：标签行末尾就是「＋」 ────────────────────────────────── */

test('v926 渲染：标签行末尾的 ＋ 小按钮，编辑/完成与旧输入行全部删掉', () => {
  const {api} = loadInlineAdd({row: {ai_tags: ['kiki'], manual_tags: ['汉堡'], excluded_tags: []}, tags: ['汉堡', 'kiki']});
  const panel = fakePanel();
  const backdrop = {querySelector: (selector) => (selector === '#case-preview-ai-panel' ? panel : null)};
  api.renderCasePreviewAiPanel(backdrop, {id: 'p1', preview_path: 'a.png', preview_size_bytes: 1}, true);

  const html = panel.innerHTML;
  assert.match(html, /class="case-preview-ai-chips"/);
  assert.match(html, /id="case-preview-ai-add-plus"[^>]*>＋<\/button>/, '标签行末尾要有那个小「＋」');
  assert.match(html, /class="case-preview-ai-add-plus"/);
  assert.ok(html.indexOf('id="case-preview-ai-add-plus"') > html.indexOf('data-preview-manual-remove'),
    '＋ 排在人工/AI chip 之后（= 最后一个标签后面）');
  assert.doesNotMatch(html, /case-preview-ai-edit-toggle/);
  assert.doesNotMatch(html, /case-preview-ai-edit-done/);
  assert.doesNotMatch(html, /case-preview-ai-add-row/);
  assert.doesNotMatch(html, /case-preview-ai-add-btn/);
  // 全仓不许再有那两个按钮 / 旧输入行的残留（CSS 也算，别留死样式）
  assert.doesNotMatch(source, /case-preview-ai-edit-toggle/);
  assert.doesNotMatch(source, /case-preview-ai-edit-done/);
  assert.doesNotMatch(source, /case-preview-ai-add-row/);
  assert.doesNotMatch(source, /case-preview-ai-add-btn/);
  assert.doesNotMatch(source, /case-preview-ai-edit-btn/);
  // × 不再藏在编辑态后面（没有编辑态了 ⇒ 必须一直可见）
  assert.match(source, /\.case-preview-ai-tag button \{ display: inline-flex;/);
  assert.doesNotMatch(source, /\.case-preview-ai-tag\.is-editing/);
  assert.doesNotMatch(source, /\.case-preview-ai-excluded\.is-editing/);
  assert.match(source, /\.case-preview-ai-excluded \{ display: inline-flex;/);
});

test('v926 渲染：点开「＋」后是就地小输入框（120px）+ ✓，没点开时只有 ＋', () => {
  const {api} = loadInlineAdd({row: {ai_tags: [], manual_tags: [], excluded_tags: []}, tags: []});
  const closed = fakePanel();
  api.renderCasePreviewAiPanel({querySelector: (s) => (s === '#case-preview-ai-panel' ? closed : null)}, {id: 'p1'}, true);
  assert.match(closed.innerHTML, /id="case-preview-ai-add-plus"/);
  assert.doesNotMatch(closed.innerHTML, /id="case-preview-ai-add-input"/);

  const opened = fakePanel({adding: 'element'});
  api.renderCasePreviewAiPanel({querySelector: (s) => (s === '#case-preview-ai-panel' ? opened : null)}, {id: 'p1'}, true);
  assert.match(opened.innerHTML, /<input type="text" class="case-preview-ai-add-input" id="case-preview-ai-add-input"/);
  assert.match(opened.innerHTML, /id="case-preview-ai-add-confirm"[^>]*>✓<\/button>/, '✓ 可点（与回车同一条路）');
  assert.match(opened.innerHTML, /placeholder="回车添加"/);
  assert.doesNotMatch(opened.innerHTML, /id="case-preview-ai-add-plus"/, '展开时不再画 ＋（避免两个添加入口）');
  assert.match(source, /\.case-preview-ai-add-input \{ flex: 0 0 auto; width: 120px;/);
  assert.match(source, /\.case-preview-ai-add-plus \{ flex: 0 0 auto; display: inline-flex;/);

  const en = loadInlineAdd({lang: 'en', row: {ai_tags: [], manual_tags: [], excluded_tags: []}, tags: []});
  const enClosed = fakePanel();
  en.api.renderCasePreviewAiPanel({querySelector: (s) => (s === '#case-preview-ai-panel' ? enClosed : null)}, {id: 'p1'}, true);
  assert.match(enClosed.innerHTML, /title="Add tag" aria-label="Add tag">＋<\/button>/, '＋ 的英文文案');
  const enPanel = fakePanel({adding: 'element'});
  en.api.renderCasePreviewAiPanel({querySelector: (s) => (s === '#case-preview-ai-panel' ? enPanel : null)}, {id: 'p1'}, true);
  assert.match(enPanel.innerHTML, /placeholder="Enter to add"/);
  assert.match(enPanel.innerHTML, /title="Add \(Enter\)" aria-label="Add">✓<\/button>/, '✓ 的英文文案');
});

/* ── 2) 回车 / ✓ / Esc / 失焦 —— 交互（对 postCasePreviewAiTagAction 打桩计数）──── */

test('v926 回车 = 添加：走 manual-add（唯一写库入口），加完保持输入框打开 + 光标回输入框', async () => {
  const {api, calls} = loadInlineAdd();
  const panel = fakePanel({adding: 'element'});
  const input = fakeInput({value: '  汉堡  ', panel});
  let refreshed = 0;
  panel.__casePreviewAiRefresh = () => { refreshed += 1; };
  api.casePreviewAiInlineAddDraft.element = '  汉堡  ';

  const handled = api.casePreviewAiInlineAddKeydown({key: 'Enter', target: input, preventDefault() {}, stopPropagation() {}});
  assert.equal(handled, true, '回车必须被消费掉（并 stopPropagation，别让文档级 handler 再处理一遍）');
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(calls.posts.length, 1, '回车只许提交一次');
  // 跨 realm 的对象（vm 里造的）不能直接 deepStrictEqual，逐字段比
  const payload = Object.assign({}, calls.posts[0]);
  assert.equal(payload.action, 'manual-add', '去空格后按 manual-add 提交');
  assert.equal(payload.previewId, 'p1');
  assert.equal(payload.tag, '汉堡');
  assert.equal(refreshed, 1, '提交成功后要重画面板（新标签立刻出现在行里）');
  assert.equal(calls.grid, 1, '素材库列表也要跟着刷');
  assert.equal(api.casePreviewAiInlineAddDraft.element, '', '草稿清空');
  assert.equal(api.casePreviewAiInlineAddFocus.element, true, '下一个渲染要把光标放回输入框（连着加）');
  assert.equal(panel.dataset.adding, 'element', '输入框保持打开，不用重新点 ＋');
});

test('v926 提交成功后重画：光标自动回到输入框（focus 只在新节点上做一次）', () => {
  const {api} = loadInlineAdd();
  const panel = fakePanel({adding: 'element'});
  const focused = [];
  const input = {id: 'case-preview-ai-add-input', value: '', addEventListener: () => {}, focus: () => focused.push('focus'), select: () => focused.push('select')};
  panel.querySelector = (selector) => (selector === '#case-preview-ai-add-input' ? input : null);
  api.casePreviewAiInlineAddFocus.element = true;
  api.wireCasePreviewAiInlineAddInput(panel, api.CASE_PREVIEW_AI_INLINE_ADD.element);
  assert.deepEqual(focused, ['focus', 'select']);
  assert.equal(api.casePreviewAiInlineAddFocus.element, false, '标记用一次就消掉（后台重画不该再抢焦点）');
  api.wireCasePreviewAiInlineAddInput(panel, api.CASE_PREVIEW_AI_INLINE_ADD.element);
  assert.deepEqual(focused, ['focus', 'select'], '第二次不再抢焦点');
});

test('v926 ✓ 按钮与回车走同一个提交入口（源码锁死只有一处 submit）', () => {
  assert.match(source, /const addConfirm = event\.target\.closest\('\.case-preview-ai-add-confirm'\);[\s\S]{0,520}?submitCasePreviewAiInlineAdd\(input\);/);
  assert.match(source, /const addPlus = event\.target\.closest\('\.case-preview-ai-add-plus'\);[\s\S]{0,300}?panelNode\.dataset\.adding = config\.kind;/);
  assert.equal((source.match(/action: 'manual-add'/g) || []).length, 1, '全仓只留一处 manual-add 调用（就在提交函数里）');
});

test('v926 Esc = 取消收起（不写库）；空输入回车 = 提示 + 留住输入框（v930 改）', () => {
  const {api, calls} = loadInlineAdd();
  const panel = fakePanel({adding: 'element'});
  panel.__casePreviewAiRefresh = () => {};
  const typed = fakeInput({value: '汉堡', panel});
  assert.equal(api.casePreviewAiInlineAddKeydown({key: 'Escape', target: typed, preventDefault() {}, stopPropagation() {}}), true);
  assert.equal(calls.posts.length, 0, 'Esc 不写库');
  assert.equal(panel.dataset.adding, undefined, 'Esc 收起小输入框');
  assert.equal(api.casePreviewAiInlineAddDraft.element, '', 'Esc 把草稿也清掉');

  const empty = fakePanel({adding: 'element'});
  empty.__casePreviewAiRefresh = () => {};
  api.submitCasePreviewAiInlineAdd(fakeInput({value: '   ', panel: empty}));
  assert.equal(calls.posts.length, 0, '空输入不提交');
  // v930：空框点 ✓ / 回车以前是"悄悄收起"，用户以为点了没反应 ⇒ 现在留着框 + 提示一句
  assert.equal(empty.dataset.adding, 'element', '空输入不再收起，输入框要留着');
  assert.match(calls.toasts.join('|'), /先输入标签/, '空输入要有提示');

  // Esc / 回车都要 stopPropagation：不然文档级 caseProjectKeyHandler 会把整个项目浮窗关掉
  assert.match(source, /if \(event\.key === 'Escape'\) \{\s*\n\s*event\.preventDefault\(\);\s*\n\s*event\.stopPropagation\(\);/);
  // v930：回车分支前面多了一道"输入法拼词中不处理"的守卫（isComposing / keyCode 229）
  assert.match(source, /if \(event\.key === 'Enter'\) \{[\s\S]{0,200}?if \(event\.isComposing \|\| event\.keyCode === 229\) return false;[\s\S]{0,120}?event\.preventDefault\(\);\s*\n\s*event\.stopPropagation\(\);/);
  // 文档级那个 handler 里不再管回车（免得同一件事两处实现、按一次写两次库）
  assert.doesNotMatch(source, /caseProjectKeyHandler = function\(event\) \{[\s\S]{0,600}?event\.key === 'Enter'/);
});

test('v926 超长标签不提交并提示；失败时输入框恢复可用 + 草稿留着让用户重试', async () => {
  const {api, calls} = loadInlineAdd();
  const panel = fakePanel({adding: 'element'});
  panel.__casePreviewAiRefresh = () => {};
  api.submitCasePreviewAiInlineAdd(fakeInput({value: '这是一个超过十二个字的标签', panel}));
  assert.equal(calls.posts.length, 0, '超过 12 字不许发请求');
  assert.equal(calls.alerts.length, 1);
  assert.match(calls.alerts[0], /12/);

  const failing = loadInlineAdd({reject: '标签无效'});
  const failPanel = fakePanel({adding: 'element'});
  let refreshed = 0;
  failPanel.__casePreviewAiRefresh = () => { refreshed += 1; };
  failing.api.casePreviewAiInlineAddDraft.element = '汉堡';
  const input = fakeInput({value: '汉堡', panel: failPanel});
  const pending = failing.api.submitCasePreviewAiInlineAdd(input);
  await pending.catch(() => {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(input.disabled, false, '失败后输入框要能继续用');
  assert.equal(failing.calls.alerts.length, 1);
  assert.match(failing.calls.alerts[0], /添加失败/);
  assert.equal(failing.api.casePreviewAiInlineAddDraft.element, '汉堡', '失败时草稿留着，用户不用重打');
  assert.equal(failPanel.dataset.adding, 'element', '失败时输入框也留着');
  assert.equal(refreshed, 0, '失败不重画（输入框留着）');
});

/* ── 3) 加完立刻出现在行里（人工 chip + × 可删）────────────────────────── */

test('v926 真渲：人工标签就在行里、带 × 可删（复用 data-preview-manual-remove）', () => {
  const {api} = loadInlineAdd({row: {ai_tags: ['kiki'], manual_tags: ['汉堡'], excluded_tags: []}, tags: ['汉堡', 'kiki']});
  const panel = fakePanel();
  api.renderCasePreviewAiPanel({querySelector: (s) => (s === '#case-preview-ai-panel' ? panel : null)}, {id: 'p1'}, true);
  assert.match(panel.innerHTML, /class="case-preview-ai-tag is-manual" title="人工标签">汉堡<button type="button" data-preview-manual-remove="汉堡"/);
  // v930：成功分支里多了"滚到最左 + 弹 toast"这段收尾（含中文注释），所以窗口放宽
  // （要点仍是同一分支里重画面板 + 刷列表，不是精确字符距离）
  assert.match(source, /postCasePreviewAiTagAction\(\{action: dom\.config\.action, previewId: previewId, tag: tag\}\)[\s\S]{0,1800}?renderLibraryGrid\(\)/,
    '「加完立刻出现在行里」靠提交成功后重画面板 + 刷列表');
});

/* ── 4) 端点：manual-add 只加词 + 更新 key，绝不清字段 ──────────────────── */

const previewId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const sourceId = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5';
const env = {SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service'};

function callEndpoint(t, body, {current = null} = {}) {
  const writes = [];
  const fetcher = async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/auth/v1/user')) return Response.json({id: userId, app_metadata: {}, user_metadata: {}});
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{role: 'admin'}]);
    if (value.includes('/rest/v1/vf_asset_previews')) {
      return Response.json([{id: previewId, source_file_id: sourceId, preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-14T00:00:00Z'}]);
    }
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method || 'GET') === 'GET') return Response.json(current ? [current] : []);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method === 'POST') {
      const row = JSON.parse(init.body);
      writes.push(row);
      return Response.json([row]);
    }
    throw new Error('Unexpected request: ' + value);
  };
  const request = new Request('https://local.invalid/api/case-preview-ai-tags', {
    method: 'POST',
    headers: {Authorization: 'Bearer user-token', 'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  const old = globalThis.fetch;
  globalThis.fetch = fetcher;
  t.after(() => { globalThis.fetch = old; });
  return handleCasePreviewAiTags(request, env).then(async (response) => ({status: response.status, body: await response.json(), writes}));
}

test('v926 端点 manual-add：只加词 + 更新 content_key —— 不清任何字段、不动 status（回归：清空逻辑已删）', async (t) => {
  const current = {
    preview_id: previewId, source_file_id: sourceId,
    ai_tags: ['kiki'], manual_tags: ['旧人工'], excluded_tags: ['旧排除'],
    effect_tags: ['爆炸'], status: 'success', model: 'glm-4v-flash',
    content_key: 'q.png|99', error_message: '', run_id: null
  };
  const result = await callEndpoint(t, {action: 'manual-add', previewId, tag: '新词'}, {current});
  assert.equal(result.status, 200);
  const row = result.writes.at(-1);
  assert.deepEqual(row.manual_tags, ['旧人工', '新词'], '追加在最后，老的一个人工标签都不能掉');
  assert.deepEqual(row.ai_tags, ['kiki'], 'AI 标签不清');
  assert.equal('effect_tags' in row, false, '载荷里**不带**动效标签这一列 = 数据库里原样保留（merge-duplicates 只动带上的列）');
  assert.deepEqual(row.excluded_tags, ['旧排除'], '排除清单不清');
  assert.equal(row.status, 'success', '状态不许被打回 idle');
  assert.equal(row.model, 'glm-4v-flash', 'model 也不清');
  assert.equal(row.content_key, 'p.png|12', 'key 更新成当前图片的指纹（这正是"画面变了"的新锚点）');

  // 没存过 content_key 的老行同样只加词
  const bare = await callEndpoint(t, {action: 'manual-add', previewId, tag: '新词'}, {current: {...current, content_key: ''}});
  assert.deepEqual(bare.writes.at(-1).manual_tags, ['旧人工', '新词']);
  assert.equal(bare.writes.at(-1).status, 'success');
});

test('v926 端点 manual-add：去重 / 上限 12 字 / 空标签 400（口径不变）', async (t) => {
  const current = {preview_id: previewId, source_file_id: sourceId, ai_tags: ['kiki'], manual_tags: ['汉堡'], excluded_tags: ['kiki'], status: 'success'};
  const dup = await callEndpoint(t, {action: 'manual-add', previewId, tag: '汉堡'}, {current});
  assert.deepEqual(dup.writes.at(-1).manual_tags, ['汉堡'], '同一个词不存两份');
  const back = await callEndpoint(t, {action: 'manual-add', previewId, tag: 'kiki'}, {current});
  assert.deepEqual(back.writes.at(-1).manual_tags, ['汉堡', 'kiki']);
  assert.deepEqual(back.writes.at(-1).ai_tags, [], '加进来的人工词从 AI 层摘掉（同一个词只留一份）');
  assert.deepEqual(back.writes.at(-1).excluded_tags, [], '人工排除里若正好有它，加回来就撤销排除');

  const tooLong = await callEndpoint(t, {action: 'manual-add', previewId, tag: '一二三四五六七八九十十一十二'}, {current});
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.writes.length, 0);
  const empty = await callEndpoint(t, {action: 'manual-add', previewId, tag: '   '}, {current});
  assert.equal(empty.status, 400);
  assert.equal(empty.writes.length, 0);
});

/* ── 5) 版本号六处同步 ─────────────────────────────────────────────────── */

test('v926 版本号六处同步（index.html 5 处 + app.js 1 处）', () => {
  assert.equal((indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || []).length, 5);
  assert.equal((indexSource.match(/\?v=20261014-progress-detail-v925/g) || []).length, 0, '旧版本号不许残留');
  assert.match(source, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  assert.match(endpointSource, /v926：manual-add 只做「加\/去重这个词 \+ 更新 content_key」两件事/);
});
