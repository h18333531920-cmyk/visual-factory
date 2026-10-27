// v914 W2：后台识别进度条（素材库页顶部细条）。
// 三种状态：running（库里 status='running' → 后台识别中 ·「项目名」）/ queued（还剩 N 张）/
// 其余隐藏。状态只能来自数据库 ⇒ 刷新后用同一份数据重算必须得到同一结果。
// 判定逻辑被抽成纯函数 recognizeProgressState()，这里用 vm 切出来真跑。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'app.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');

const PURE_START = '  const RECOGNIZE_PROGRESS_POLL_MS =';
const PURE_END = '  function recognizeProgressInfo() {';

function loadPure() {
  const start = source.indexOf(PURE_START);
  const end = source.indexOf(PURE_END, start);
  assert.ok(start > 0 && end > start, '纯逻辑片段必须切得出来');
  const context = vm.createContext({});
  // const 声明只留在脚本的词法作用域里，不会挂到 context 上，所以用最后那个表达式取出来
  return vm.runInContext(source.slice(start, end) + '\n;({recognizeProgressState, recognizeProgressText, RECOGNIZE_PROGRESS_POLL_MS})', context, {filename: 'app-v914-progress.js'});
}

function slice(from, to) {
  const start = source.indexOf(from);
  assert.ok(start >= 0, '找不到片段起点：' + from);
  const end = source.indexOf(to, start);
  assert.ok(end > start, '找不到片段终点：' + to);
  return source.slice(start, end);
}

// 案例项目 = source_path 为空（与脚本 isCaseLibrarySource 同口径）
const SOURCE_A = {id: 'src-a', title: '夏日足球', source_path: ''};
const SOURCE_B = {id: 'src-b', title: '开斋节大促', source_path: ''};
const GALLERY = {id: 'src-g', title: '图库单图素材', source_path: 'assets/pic.png'};
const SOURCES = [SOURCE_A, SOURCE_B, GALLERY];

const preview = (id, sourceId, path) => ({id, source_file_id: sourceId, preview_path: path || (id + '.png')});
const row = (previewId, sourceId, status) => ({preview_id: previewId, source_file_id: sourceId, status});

const A1 = preview('p-a1', 'src-a');
const A2 = preview('p-a2', 'src-a');
const A3 = preview('p-a3', 'src-a');
const B1 = preview('p-b1', 'src-b');
const G1 = preview('p-g1', 'src-g');
const ALL_PREVIEWS = [A1, A2, A3, B1, G1];

const plain = (value) => JSON.parse(JSON.stringify(value));

/* ── 1) 三种状态 ───────────────────────────────────────────────────────── */

test('v914 状态①：库里有一行 status=running ⇒ 「后台识别中 ·「项目名」」', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: ALL_PREVIEWS,
    tagRows: [row('p-a1', 'src-a', 'success'), row('p-b1', 'src-b', 'running')],
    sources: SOURCES,
    lang: 'zh'
  }));
  assert.equal(info.visible, true);
  assert.equal(info.kind, 'running');
  assert.equal(info.projectTitle, '开斋节大促', '项目名取 vf_source_files.title（running 那一行所属项目）');
  assert.equal(info.remaining, 0, '正在识别时不报"还剩几张"');
});

test('v914 状态②：没有 running 行、但还有物料没 success ⇒ 「排队中 · 还剩 N 张」', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: ALL_PREVIEWS,
    tagRows: [row('p-a1', 'src-a', 'success')],
    sources: SOURCES,
    lang: 'zh'
  }));
  assert.equal(info.visible, true);
  assert.equal(info.kind, 'queued');
  // p-a2 / p-a3 / p-b1 没有 success 行 ⇒ 3 张待识别；图库的 p-g1 不算（不是案例项目物料）
  assert.equal(info.remaining, 3);
  assert.equal(info.projectTitle, '');
});

test('v914 状态③：物料全部 success（且没有 running）⇒ 整条隐藏', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: ALL_PREVIEWS,
    tagRows: [row('p-a1', 'src-a', 'success'), row('p-a2', 'src-a', 'success'), row('p-a3', 'src-a', 'success'), row('p-b1', 'src-b', 'success'), row('p-g1', 'src-g', 'success')],
    sources: SOURCES,
    lang: 'zh'
  }));
  assert.equal(info.visible, false);
  assert.equal(info.kind, 'idle');
  assert.equal(info.remaining, 0);
});

test('v914 状态：数据没加载完 / 空库 ⇒ 隐藏，不报错', () => {
  const {recognizeProgressState} = loadPure();
  for (const input of [
    {previews: [], tagRows: [], sources: []},
    {previews: null, tagRows: null, sources: null},
    {},
    undefined
  ]) {
    const info = plain(recognizeProgressState(input));
    assert.equal(info.visible, false, '不显示：' + JSON.stringify(input));
    assert.equal(info.kind, 'idle');
  }
});

/* ── 2) 刷新后必须仍然正确（同一份库数据重算，结果逐字一致）────────────── */

test('v914 刷新一致性：同一份库数据重算两遍，三种状态都逐字一致', () => {
  const {recognizeProgressState} = loadPure();
  const cases = [
    {tagRows: [row('p-b1', 'src-b', 'running')]},
    {tagRows: [row('p-a1', 'src-a', 'success')]},
    {tagRows: [row('p-a1', 'src-a', 'success'), row('p-a2', 'src-a', 'success'), row('p-a3', 'src-a', 'success'), row('p-b1', 'src-b', 'success')]}
  ];
  cases.forEach((item) => {
    const call = () => plain(recognizeProgressState({
      previews: plain(ALL_PREVIEWS),
      tagRows: plain(item.tagRows),
      sources: plain(SOURCES),
      lang: 'zh'
    }));
    const first = call();
    const again = call();
    assert.deepEqual(again, first, '刷新后（重新读库再算）必须一样：' + JSON.stringify(item.tagRows));
  });
});

test('v914 刷新一致性：Map 形态的 tagRows（线上传的就是 state.previewAiTagsByPreviewId）算出同样结果', () => {
  const {recognizeProgressState} = loadPure();
  const rows = [row('p-a1', 'src-a', 'success')];
  const asArray = plain(recognizeProgressState({previews: ALL_PREVIEWS, tagRows: rows, sources: SOURCES}));
  const asMap = plain(recognizeProgressState({previews: ALL_PREVIEWS, tagRows: new Map(rows.map((r) => [r.preview_id, r])), sources: SOURCES}));
  assert.deepEqual(asMap, asArray);
  assert.equal(asArray.remaining, 3);
});

/* ── 3) 真渲一遍：细条什么时候可见、文案与收起按钮 ───────────────────────── */

function loadRenderer(options = {}) {
  const stored = new Map(Object.entries(options.storage || {}));
  const bar = {
    id: 'recognize-progress', hidden: options.hiddenInitial !== false, dataset: {}, innerHTML: '',
    isConnected: true
  };
  const context = {
    state: Object.assign({
      route: 'library',
      lang: options.lang || 'zh',
      localPreview: false,
      session: {access_token: 'token'},
      supabase: {},
      libraryPreviews: ALL_PREVIEWS,
      librarySources: SOURCES,
      previewAiTagsByPreviewId: new Map()
    }, options.state || {}),
    escapeHtml: (value) => String(value == null ? '' : value),
    escapeAttr: (value) => String(value == null ? '' : value),
    // v925：渲染层要取清单行的缩略图，走的就是素材库卡片那两个函数 —— 这里给最小桩（既有断言不变）
    libraryThumbnailPathForPreview: (preview) => (preview && preview.preview_path ? ('thumbs/' + preview.id + '.jpg') : ''),
    libraryThumbUnavailable: () => false,
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: (key) => stored.delete(key)
    },
    document: {
      addEventListener: () => {},
      getElementById: (id) => (id === 'recognize-progress' ? bar : null)
    },
    loadAllPreviewAiTags: async () => [],
    __bar: bar,
    __stored: stored
  };
  vm.createContext(context);
  vm.runInContext(slice(PURE_START, PURE_END)
    + slice('  function recognizeProgressInfo() {', '  let recognizeProgressTimer = 0;')
    + '\n;({renderRecognizeProgress, recognizeProgressInfo, bindRecognizeProgressClose})', context, {filename: 'app-v914-progress-render.js'});
  return context;
}

test('v914 渲染：running ⇒ 细条可见、文案带项目名、带收起按钮', () => {
  const context = loadRenderer();
  context.state.previewAiTagsByPreviewId = new Map([['p-b1', row('p-b1', 'src-b', 'running')]]);
  context.renderRecognizeProgress();
  const bar = context.__bar;
  assert.equal(bar.hidden, false, '有条在跑 ⇒ 亮出来');
  assert.equal(bar.dataset.kind, 'running');
  assert.match(bar.innerHTML, /后台识别中 ·「开斋节大促」/);
  assert.match(bar.innerHTML, /data-recognize-progress-close/, '要有 × 收起');
  assert.match(bar.innerHTML, /recognize-progress-dot/);
});

test('v914 渲染：queued ⇒ 显示还剩几张；无事 ⇒ 隐藏并清空', () => {
  const context = loadRenderer();
  context.renderRecognizeProgress();
  assert.equal(context.__bar.hidden, false);
  assert.equal(context.__bar.dataset.kind, 'queued');
  assert.match(context.__bar.innerHTML, /后台识别排队中 · 还剩 4 张/);
  context.state.previewAiTagsByPreviewId = new Map(ALL_PREVIEWS.map((item) => [item.id, row(item.id, item.source_file_id, 'success')]));
  context.renderRecognizeProgress();
  assert.equal(context.__bar.hidden, true, '全识别完 ⇒ 整条隐藏');
  assert.equal(context.__bar.innerHTML, '', '隐藏时不留旧文案');
});

test('v914 渲染：英文界面出英文；收起过的那一种状态不再亮，换了状态又亮', () => {
  const context = loadRenderer({lang: 'en'});
  context.state.previewAiTagsByPreviewId = new Map([['p-b1', row('p-b1', 'src-b', 'running')]]);
  context.renderRecognizeProgress();
  assert.match(context.__bar.innerHTML, /Background analysis in progress · "开斋节大促"/);
  // 模拟点了 ×：收起标记记的就是当时那一种状态
  context.__stored.set('vf_recognize_progress_hidden_v1', 'running');
  context.renderRecognizeProgress();
  assert.equal(context.__bar.hidden, true, '同一种状态收起后不再冒出来');
  // 队列状态是另一种 ⇒ 重新出现
  context.state.previewAiTagsByPreviewId = new Map();
  context.renderRecognizeProgress();
  assert.equal(context.__bar.hidden, false);
  assert.equal(context.__bar.dataset.kind, 'queued');
  // 全识别完 ⇒ 收起标记自动清掉（下一轮还看得见）
  context.state.previewAiTagsByPreviewId = new Map(ALL_PREVIEWS.map((item) => [item.id, row(item.id, item.source_file_id, 'success')]));
  context.renderRecognizeProgress();
  assert.equal(context.__stored.has('vf_recognize_progress_hidden_v1'), false);
});

test('v914 渲染：不在素材库页（条不在 DOM）⇒ 什么都不做，不报错', () => {
  const context = loadRenderer();
  context.document.getElementById = () => null;
  assert.equal(context.renderRecognizeProgress(), null);
});

/* ── 4) 剩余张数的口径 ──────────────────────────────────────────────────── */

test('v914 剩余张数：没有 success 行的物料都算（没跑过 / 失败 / 别的状态）', () => {
  const {recognizeProgressState} = loadPure();
  const previews = [preview('p1', 'src-a'), preview('p2', 'src-a'), preview('p3', 'src-a'), preview('p4', 'src-a'), preview('p5', 'src-a')];
  const info = plain(recognizeProgressState({
    previews,
    tagRows: [row('p1', 'src-a', 'success'), row('p2', 'src-a', 'failed'), row('p3', 'src-a', 'idle'), row('p4', 'src-a', 'success')],
    sources: SOURCES
  }));
  assert.equal(info.kind, 'queued');
  assert.equal(info.remaining, 3, 'p2 失败 / p3 闲置 / p5 没跑过 都算剩余');
});

test('v914 剩余张数：脚本会跳过的物料不算（源文件 / 没有预览路径的虚拟卡）', () => {
  const {recognizeProgressState} = loadPure();
  const previews = [
    preview('p-ok', 'src-a'),
    preview('p-mp4', 'src-a', 'video/demo.mp4'),
    preview('p-psd', 'src-a', 'design/a.psd'),
    {id: 'font-preview-src-a', source_file_id: 'src-a', preview_path: '', preview_filename: '字体卡'}
  ];
  const info = plain(recognizeProgressState({previews, tagRows: [], sources: SOURCES}));
  assert.equal(info.kind, 'queued');
  assert.equal(info.remaining, 2, 'p-ok 与 p-mp4 都算（v917 起 mp4 会被抽帧识别，见 recognize-dynamic-frames-v917）');
});

test('v914 剩余张数：只看案例项目 —— 图库单图素材的物料不计入', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({previews: [G1, A1], tagRows: [], sources: SOURCES}));
  assert.equal(info.remaining, 1);
  const onlyGallery = plain(recognizeProgressState({previews: [G1], tagRows: [], sources: SOURCES}));
  assert.equal(onlyGallery.visible, false, '只剩图库物料 ⇒ 无事');
});

/* ── 5) 项目名 / 边界 ───────────────────────────────────────────────────── */

test('v914 项目名：running 行只有 preview_id、source_file_id 缺失时，反查物料所属项目', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: ALL_PREVIEWS,
    tagRows: [{preview_id: 'p-a2', status: 'running'}],
    sources: SOURCES
  }));
  assert.equal(info.kind, 'running');
  assert.equal(info.projectTitle, '夏日足球');
});

test('v914 边界：running 那一行不属于当前加载到的案例项目（例如筛选后的视图）⇒ 照显示，只是不带项目名', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: ALL_PREVIEWS,
    tagRows: [row('p-g1', 'src-g', 'running')],
    sources: SOURCES
  }));
  assert.equal(info.kind, 'running', '库里有行在跑就照说（"项目名"只是附加信息，查不到不改变状态）');
  assert.equal(info.projectTitle, '', '图库单图素材不在案例项目名单里 ⇒ 名字留空');
  // 图库物料不占"还剩几张"的名额：没有 running 时它既不算剩余也不该让条子亮起来
  const galleryOnly = plain(recognizeProgressState({previews: [G1], tagRows: [], sources: SOURCES}));
  assert.equal(galleryOnly.visible, false);
});

test('v914 边界：running 的项目名反查不到 ⇒ 仍然显示"识别中"，只是不带名字', () => {
  const {recognizeProgressState, recognizeProgressText} = loadPure();
  const info = plain(recognizeProgressState({
    previews: [],
    tagRows: [row('p-x', 'src-unknown', 'running')],
    sources: SOURCES
  }));
  assert.equal(info.kind, 'running');
  assert.equal(info.projectTitle, '');
  assert.match(recognizeProgressText(info, 'zh'), /后台识别中/);
});

/* ── 6) 文案中英双语 ───────────────────────────────────────────────────── */

test('v914 文案：中英双语，跟 state.lang 走', () => {
  const {recognizeProgressText} = loadPure();
  const running = {visible: true, kind: 'running', projectTitle: '夏日足球', remaining: 0};
  assert.equal(recognizeProgressText(running, 'zh'), '后台识别中 ·「夏日足球」');
  assert.equal(recognizeProgressText(running, 'en'), 'Background analysis in progress · "夏日足球"');
  const queued = {visible: true, kind: 'queued', projectTitle: '', remaining: 42};
  assert.equal(recognizeProgressText(queued, 'zh'), '后台识别排队中 · 还剩 42 张');
  assert.equal(recognizeProgressText(queued, 'en'), 'Background analysis queued · 42 left');
  assert.equal(recognizeProgressText({visible: false, kind: 'idle', remaining: 0}, 'zh'), '');
  assert.equal(recognizeProgressText(null, 'en'), '');
});

/* ── 7) app.js 接线：只在素材库页、轮询 ≥15s、复用已加载数据、能停能收起 ── */

test('v914 接线：细条只挂在素材库页（首页不渲染）', () => {
  const shell = slice('  async function renderLibrary(', '  function refreshKindTabCounts()');
  assert.match(shell, /id="recognize-progress" class="recognize-progress" hidden/, '细条放在素材库页最顶上');
  assert.match(shell, /homeMode \? '' : '<div id="recognize-progress"/, '首页模式不渲染这条');
  const barAt = shell.indexOf('id="recognize-progress"');
  const pinAt = shell.indexOf('id="library-pin-strip"');
  assert.ok(barAt > 0 && pinAt > barAt, '细条在检索栏之前（页面最顶部）');
  assert.match(shell, /syncRecognizeProgressPolling\(\);\s*\n\s*renderRecognizeProgress\(\);/, '渲染完素材库立刻算一遍');
});

test('v914 接线：轮询 ≥15 秒、只在素材库页 + 有会话时跑，离开/登出要停', () => {
  const {RECOGNIZE_PROGRESS_POLL_MS} = loadPure();
  assert.ok(typeof RECOGNIZE_PROGRESS_POLL_MS === 'number' && RECOGNIZE_PROGRESS_POLL_MS >= 15000, '轮询间隔 ≥15 秒');
  const canPoll = slice('  function recognizeProgressCanPoll() {', '  async function refreshRecognizeProgress() {');
  assert.match(canPoll, /state\.route === 'library'/, '只在素材库页');
  assert.match(canPoll, /state\.session && state\.session\.access_token/, '没有会话就不跑');
  const start = slice('  function startRecognizeProgressPolling() {', '  function syncRecognizeProgressPolling() {');
  assert.match(start, /setInterval\(/, '要起一个定时器');
  assert.match(start, /if \(!recognizeProgressCanPoll\(\)\) \{ stopRecognizeProgressPolling\(\); return; \}/, '条件不成立的那一拍自己停掉，不留泄漏');
  const stop = slice('  function stopRecognizeProgressPolling() {', '  function syncRecognizeProgressPolling() {');
  assert.match(stop, /clearInterval\(recognizeProgressTimer\)/);
  assert.match(stop, /recognizeProgressTimer = 0;/);
  assert.match(source, /if \(state\.route !== 'library'\) stopRecognizeProgressPolling\(\);/, '换页即停');
  const signOut = slice('  async function signOut() {', '  function syncAccessToken() {');
  assert.match(signOut, /stopRecognizeProgressPolling\(\)/, '登出即停');
});

test('v914 接线：数据复用已加载的那两份，不新增端点、不新增接口轮询', () => {
  const refresh = slice('  async function refreshRecognizeProgress() {', '  function startRecognizeProgressPolling() {');
  assert.match(refresh, /await loadAllPreviewAiTags\(\);/, '重读逐图标签行（跟首屏同一个调用）');
  assert.doesNotMatch(refresh, /fetch\(/, '不打任何新接口');
  assert.match(source, /function recognizeProgressInfo\(\) \{[\s\S]{0,300}?previews: state\.libraryPreviews,[\s\S]{0,200}?tagRows: state\.previewAiTagsByPreviewId,[\s\S]{0,200}?sources: state\.librarySources/,
    '素材库已经加载的三份数据直接用');
  assert.doesNotMatch(source.slice(source.indexOf('  function recognizeProgressInfo() {'), source.indexOf('  function recognizeProgressHiddenKind() {')), /fetch\(/);
  // 逐图标签行的读取列里必须有 status（本任务允许的读取列扩展；v914 核实过本来就有）
  assert.match(source, /const PREVIEW_AI_TAGS_SELECT = '[^']*status[^']*'/, 'status 必须在读取列里');
  assert.match(source, /PREVIEW_AI_TAGS_SELECT_LEGACY = '[^']*status[^']*'/);
});

test('v914 接线：「× 收起」记 localStorage，状态换一种就重新出现', () => {
  assert.match(source, /RECOGNIZE_PROGRESS_HIDDEN_KEY = 'vf_recognize_progress_hidden_v1'/);
  const render = slice('  function renderRecognizeProgress() {', '  let recognizeProgressCloseBound');
  assert.match(render, /data-recognize-progress-close/, '要有收起按钮');
  assert.match(render, /hiddenKind === info\.kind/, '收起的是"这一种状态"');
  assert.match(render, /if \(!info\.visible\) \{\s*\n\s*if \(hiddenKind\) rememberRecognizeProgressHidden\(''\);/, '没事了就把收起标记清掉，下一轮还看得见');
  const bind = slice('  function bindRecognizeProgressClose() {', '  let recognizeProgressTimer = 0;');
  assert.match(bind, /rememberRecognizeProgressHidden\(/, '收起走统一的入口');
  const remember = slice('  function recognizeProgressHiddenKind() {', '  // 画到顶部细条上');
  assert.match(remember, /localStorage\.setItem\(RECOGNIZE_PROGRESS_HIDDEN_KEY, kind\)/, '收起状态记进 localStorage');
  assert.match(remember, /localStorage\.removeItem\(RECOGNIZE_PROGRESS_HIDDEN_KEY\)/, '清掉收起状态也走同一个入口');
  assert.match(remember, /catch \(_error\)/, 'localStorage 不可用时不许把页面搞崩');
});

test('v914 样式：细条、占位不遮挡（不是 fixed 盖住检索栏），收起态真的隐藏', () => {
  const css = slice('.recognize-progress { display: flex;', '.recognize-progress-dot {');
  assert.doesNotMatch(css, /position:\s*fixed/, '不许 fixed 盖在导航/检索栏上');
  assert.doesNotMatch(css, /position:\s*absolute/);
  assert.match(source, /\.recognize-progress\[hidden\] \{ display: none !important; \}/);
  assert.match(source, /\.recognize-progress-close \{/, '收起按钮要有样式');
  assert.match(source, /\.recognize-progress\[data-kind="running"\] \.recognize-progress-dot \{/, '识别中要有动感（脉冲点）');
});

test('v914 别搞混：#library-status（列表上方那行计数）不许被这条改动碰到', () => {
  assert.match(source, /<section id="library-status" class="library-status/, '原来的计数行照旧');
  const block = slice(PURE_START, '  async function postCasePreviewAiTagAction(payload) {');
  assert.doesNotMatch(block, /library-status/, '进度条这块代码不许碰 library-status');
  assert.match(source, /function setLibraryLoadingState\(active, label\) \{[\s\S]{0,200}?getElementById\('library-status'\)/);
});

test('v914 版本号（index.html 5 处 + app.js 1 处）', () => {
  assert.equal((indexSource.match(/\?v=20261027-gallery-upload-progress-v962/g) || []).length, 5);
  assert.match(source, /const TOOL_UI_VERSION = '20261027-gallery-upload-progress-v962'/);
});
