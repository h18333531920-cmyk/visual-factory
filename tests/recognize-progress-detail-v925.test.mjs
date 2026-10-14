// v925：后台识别进度条「是谁」明细。
// 用户口径：「为什么还在识别，这上面识别的到底是啥？属于哪个项目，可以显示出来吗？」
// —— queued 态以前只有一个数字（还剩 N 张），看不出是哪一张、属于哪个项目。
// 这一版：① 文案里列出待识别的前 3 张（「项目名」文件名 + 还有 N 张）；
// ② 点开这条能看完整清单（缩略图 + 文件名 + 项目名，内部滚动，上限 50 行）。
// 清单只从**素材库已经加载的数据**里算（纯函数 recognizeProgressState 多返回 items），
// 不新增端点、不额外发请求；v914 的三态 / 轮询 / 收起 / 只在素材库页跑一律不动。
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
const VERSION = '20261014-edit-mode-hide-v937';

function loadPure() {
  const start = source.indexOf(PURE_START);
  const end = source.indexOf(PURE_END, start);
  assert.ok(start > 0 && end > start, '纯逻辑片段必须切得出来');
  const context = vm.createContext({});
  return vm.runInContext(source.slice(start, end)
    + '\n;({recognizeProgressState, recognizeProgressText, recognizeProgressItemLabel, RECOGNIZE_PROGRESS_TEXT_LIMIT, RECOGNIZE_PROGRESS_ITEM_LIMIT, RECOGNIZE_PROGRESS_EXPANDED_KEY})',
  context, {filename: 'app-v925-progress-pure.js'});
}

function slice(from, to) {
  const start = source.indexOf(from);
  assert.ok(start >= 0, '找不到片段起点：' + from);
  const end = source.indexOf(to, start);
  assert.ok(end > start, '找不到片段终点：' + to);
  return source.slice(start, end);
}

const SOURCE_A = {id: 'src-a', title: '夏日足球', source_path: ''};
const SOURCE_B = {id: 'src-b', title: '开斋节大促', source_path: ''};
const GALLERY = {id: 'src-g', title: '图库单图素材', source_path: 'assets/pic.png'};
const SOURCES = [SOURCE_A, SOURCE_B, GALLERY];

const preview = (id, sourceId, path) => ({id, source_file_id: sourceId, preview_path: path || (id + '.png')});
// preview_filename 是"项目详情里显示的那个物料名"，清单优先用它
const named = (id, sourceId, filename) => ({id, source_file_id: sourceId, preview_path: 'case/' + filename, preview_filename: filename});
const row = (previewId, sourceId, status) => ({preview_id: previewId, source_file_id: sourceId, status});
const plain = (value) => JSON.parse(JSON.stringify(value));

const A1 = named('p-a1', 'src-a', 'picks足球弹窗AR.gif');
const A2 = named('p-a2', 'src-a', 'store-launch.jpg');
const B1 = named('p-b1', 'src-b', 'ramadan-banner.png');
const B2 = named('p-b2', 'src-b', 'eid-offer.png');
const G1 = preview('p-g1', 'src-g');
const ALL_PREVIEWS = [A1, A2, B1, B2, G1];

// 大量待识别物料（测 50 行上限 + 「还有 N 张」）
function manyPreviews(count) {
  return Array.from({length: count}, (unused, index) => named('p-' + String(index).padStart(3, '0'), 'src-a', 'shot-' + index + '.jpg'));
}

/* ── 1) 纯函数：清单是谁、按什么顺序 ───────────────────────────────────── */

test('v925 清单：queued 时列出待识别物料 —— 文件名取 preview_filename，项目名取案例项目 title', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: [A1, A2, B1, G1],
    tagRows: [],
    sources: SOURCES,
    lang: 'zh'
  }));
  assert.equal(info.kind, 'queued');
  assert.equal(info.remaining, 3, '图库单图素材（p-g1）不算待识别');
  assert.deepEqual(info.items, [
    {previewId: 'p-a1', filename: 'picks足球弹窗AR.gif', projectTitle: '夏日足球'},
    {previewId: 'p-a2', filename: 'store-launch.jpg', projectTitle: '夏日足球'},
    {previewId: 'p-b1', filename: 'ramadan-banner.png', projectTitle: '开斋节大促'}
  ]);
});

test('v925 清单：没有 preview_filename 就退回预览路径的最后一段，不出现空名字', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: [preview('p-a9', 'src-a', 'case/deep/dir/cover-final.png')],
    tagRows: [],
    sources: SOURCES
  }));
  assert.deepEqual(info.items, [{previewId: 'p-a9', filename: 'cover-final.png', projectTitle: '夏日足球'}]);
});

test('v925 清单顺序 = 脚本取数顺序（preview id 升序）：输入顺序反着给也得出同一个清单', () => {
  const {recognizeProgressState} = loadPure();
  const forward = plain(recognizeProgressState({previews: [A1, A2, B1, B2], tagRows: [], sources: SOURCES}));
  const backward = plain(recognizeProgressState({previews: [B2, B1, A2, A1], tagRows: [], sources: SOURCES}));
  assert.deepEqual(forward.items.map((item) => item.previewId), ['p-a1', 'p-a2', 'p-b1', 'p-b2']);
  assert.deepEqual(backward, forward, '同一份库数据、不同的传参顺序 ⇒ 清单与文案必须一致');
  assert.equal(forward.remaining, 4);
});

test('v925 清单：非案例项目 / psd / 没有预览路径的虚拟卡 一律不进清单（沿用 v914 口径）', () => {
  const {recognizeProgressState} = loadPure();
  const info = plain(recognizeProgressState({
    previews: [
      named('p-ok', 'src-a', 'ok.png'),
      {id: 'p-psd', source_file_id: 'src-a', preview_path: 'design/a.psd', preview_filename: 'a.psd'},
      {id: 'p-nopath', source_file_id: 'src-a', preview_path: '', preview_filename: '字体卡'},
      G1,
      {id: 'p-unknown', source_file_id: 'src-unknown', preview_path: 'x.png', preview_filename: 'x.png'}
    ],
    tagRows: [],
    sources: SOURCES
  }));
  assert.equal(info.remaining, 1);
  assert.deepEqual(info.items.map((item) => item.filename), ['ok.png']);
});

test('v925 清单：已 success 的物料不进清单；一批里只剩几张时 items 就几条', () => {
  const {recognizeProgressState} = loadPure();
  const one = plain(recognizeProgressState({
    previews: ALL_PREVIEWS,
    tagRows: [row('p-a1', 'src-a', 'success'), row('p-a2', 'src-a', 'success'), row('p-b2', 'src-b', 'success'), row('p-g1', 'src-g', 'success')],
    sources: SOURCES
  }));
  assert.equal(one.remaining, 1);
  assert.equal(one.items.length, 1, '只有 1 张待识别 ⇒ 清单就 1 条');
  assert.deepEqual(one.items[0], {previewId: 'p-b1', filename: 'ramadan-banner.png', projectTitle: '开斋节大促'});
});

test('v925 清单上限：60 张待识别 ⇒ items 只留前 50 条（remaining 仍是 60）', () => {
  const {recognizeProgressState, RECOGNIZE_PROGRESS_ITEM_LIMIT} = loadPure();
  assert.equal(RECOGNIZE_PROGRESS_ITEM_LIMIT, 50, '上限按任务书定 50');
  const info = plain(recognizeProgressState({previews: manyPreviews(60), tagRows: [], sources: SOURCES}));
  assert.equal(info.remaining, 60);
  assert.equal(info.items.length, 50);
  assert.equal(info.items[0].filename, 'shot-0.jpg');
  assert.equal(info.items[49].filename, 'shot-49.jpg', '留下的就是排在最前面的 50 条');
});

test('v925 清单：running / idle 时 items 为空，且不影响既有三态字段', () => {
  const {recognizeProgressState} = loadPure();
  const running = plain(recognizeProgressState({
    previews: ALL_PREVIEWS,
    tagRows: [row('p-b1', 'src-b', 'running')],
    sources: SOURCES
  }));
  assert.equal(running.kind, 'running');
  assert.equal(running.remaining, 0);
  assert.deepEqual(running.items, [], '正在识别时没有"待识别清单"可列');
  assert.equal(running.filename, 'ramadan-banner.png', 'v925 顺手带上那一张的文件名');
  const idle = plain(recognizeProgressState({previews: ALL_PREVIEWS, tagRows: ALL_PREVIEWS.map((item) => row(item.id, item.source_file_id, 'success')), sources: SOURCES}));
  assert.equal(idle.visible, false);
  assert.equal(idle.kind, 'idle');
  assert.deepEqual(idle.items, []);
});

test('v925 刷新一致性：同一份库数据重算两遍（含清单）逐字一致；Map 形态的 tagRows 也一样', () => {
  const {recognizeProgressState} = loadPure();
  const rows = [row('p-a1', 'src-a', 'success')];
  const call = () => plain(recognizeProgressState({previews: plain(ALL_PREVIEWS), tagRows: plain(rows), sources: plain(SOURCES), lang: 'zh'}));
  assert.deepEqual(call(), call(), '刷新后（重读库再算）必须一样');
  const asMap = plain(recognizeProgressState({previews: plain(ALL_PREVIEWS), tagRows: new Map(rows.map((item) => [item.preview_id, item])), sources: plain(SOURCES), lang: 'zh'}));
  assert.deepEqual(asMap, call(), '线上传的是 Map，算出来必须一致');
});

/* ── 2) 纯函数：文案 ─────────────────────────────────────────────────────── */

test('v925 文案：1 张就把那一张直接写出来', () => {
  const {recognizeProgressText} = loadPure();
  const info = {visible: true, kind: 'queued', remaining: 1, items: [{previewId: 'p-a1', filename: 'a.png', projectTitle: '夏日足球'}]};
  assert.equal(recognizeProgressText(info, 'zh'), '后台识别排队中 · 还剩 1 张 ·「夏日足球」a.png');
  assert.equal(recognizeProgressText(info, 'en'), 'Background analysis queued · 1 left · "夏日足球" a.png');
});

test('v925 文案：2~3 张全列出来，不带「还有 N 张」', () => {
  const {recognizeProgressText} = loadPure();
  const items = [
    {previewId: 'p-a1', filename: 'a.png', projectTitle: '夏日足球'},
    {previewId: 'p-b1', filename: 'b.png', projectTitle: '开斋节大促'},
    {previewId: 'p-b2', filename: 'c.png', projectTitle: '开斋节大促'}
  ];
  const info = {visible: true, kind: 'queued', remaining: 3, items};
  assert.equal(recognizeProgressText(info, 'zh'),
    '后台识别排队中 · 还剩 3 张 ·「夏日足球」a.png、「开斋节大促」b.png、「开斋节大促」c.png');
  assert.equal(recognizeProgressText(info, 'en'),
    'Background analysis queued · 3 left · "夏日足球" a.png, "开斋节大促" b.png, "开斋节大促" c.png');
});

test('v925 文案：多于 3 张 ⇒ 前 3 张 +「还有 N 张」（N = 剩余总数 − 列出的张数）', () => {
  const {recognizeProgressState, recognizeProgressText, RECOGNIZE_PROGRESS_TEXT_LIMIT} = loadPure();
  assert.equal(RECOGNIZE_PROGRESS_TEXT_LIMIT, 3, '文案里最多列 3 张');
  const info = plain(recognizeProgressState({previews: manyPreviews(60), tagRows: [], sources: SOURCES}));
  assert.equal(recognizeProgressText(info, 'zh'),
    '后台识别排队中 · 还剩 60 张 ·「夏日足球」shot-0.jpg、「夏日足球」shot-1.jpg、「夏日足球」shot-2.jpg · 还有 57 张');
  assert.equal(recognizeProgressText(info, 'en'),
    'Background analysis queued · 60 left · "夏日足球" shot-0.jpg, "夏日足球" shot-1.jpg, "夏日足球" shot-2.jpg · 57 more');
});

test('v925 文案：项目名查不到就只写文件名；一条清单都没有时退回老文案（不出现空「」）', () => {
  const {recognizeProgressText, recognizeProgressItemLabel} = loadPure();
  assert.equal(recognizeProgressItemLabel({filename: 'x.png', projectTitle: ''}, 'zh'), 'x.png');
  assert.equal(recognizeProgressItemLabel({filename: 'x.png', projectTitle: ''}, 'en'), 'x.png');
  assert.equal(recognizeProgressItemLabel({filename: '', projectTitle: '夏日足球'}, 'zh'), '「夏日足球」');
  const noItems = {visible: true, kind: 'queued', remaining: 4, items: []};
  assert.equal(recognizeProgressText(noItems, 'zh'), '后台识别排队中 · 还剩 4 张');
  assert.equal(recognizeProgressText(noItems, 'en'), 'Background analysis queued · 4 left');
});

test('v925 文案：running 带文件名时追加，不带时保持 v914 原样', () => {
  const {recognizeProgressText} = loadPure();
  assert.equal(recognizeProgressText({visible: true, kind: 'running', projectTitle: '夏日足球', filename: 'a.png'}, 'zh'),
    '后台识别中 ·「夏日足球」a.png');
  assert.equal(recognizeProgressText({visible: true, kind: 'running', projectTitle: '夏日足球', filename: 'a.png'}, 'en'),
    'Background analysis in progress · "夏日足球" a.png');
  assert.equal(recognizeProgressText({visible: true, kind: 'running', projectTitle: '夏日足球', filename: ''}, 'zh'), '后台识别中 ·「夏日足球」');
  assert.equal(recognizeProgressText({visible: true, kind: 'running', projectTitle: '', filename: 'a.png'}, 'zh'), '后台识别中 · a.png');
  assert.equal(recognizeProgressText({visible: true, kind: 'running', projectTitle: '', filename: ''}, 'zh'), '后台识别中 · 正在分析物料…');
  assert.equal(recognizeProgressText({visible: false, kind: 'idle', remaining: 0, items: []}, 'zh'), '');
});

/* ── 3) 真渲一遍：展开前 / 展开后的 HTML ─────────────────────────────────── */

function loadRenderer(options = {}) {
  const stored = new Map(Object.entries(options.storage || {}));
  const bar = {id: 'recognize-progress', hidden: options.hiddenInitial !== false, dataset: {}, innerHTML: '', isConnected: true};
  const clicks = [];
  const context = {
    state: Object.assign({
      route: 'library',
      lang: options.lang || 'zh',
      localPreview: false,
      session: {access_token: 'token'},
      supabase: {},
      libraryPreviews: ALL_PREVIEWS,
      librarySources: SOURCES,
      libraryPreviewUrls: options.urls || {},
      previewAiTagsByPreviewId: new Map()
    }, options.state || {}),
    escapeHtml: (value) => String(value == null ? '' : value),
    escapeAttr: (value) => String(value == null ? '' : value),
    // 真 app 里就是素材库卡片那两个函数；这里给最小桩
    libraryThumbnailPathForPreview: (preview) => (preview && preview.preview_path && !options.noThumbPath ? ('thumbs/' + preview.id + '.jpg') : ''),
    libraryThumbUnavailable: (path) => !!(options.unavailablePaths || []).includes(path),
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: (key) => stored.delete(key)
    },
    document: {
      addEventListener: (type, handler) => { if (type === 'click') clicks.push(handler); },
      getElementById: (id) => (id === 'recognize-progress' ? bar : null)
    },
    loadAllPreviewAiTags: async () => [],
    __bar: bar,
    __stored: stored,
    __click: (selector) => clicks.forEach((handler) => handler({target: {closest: (sel) => (sel === selector ? {} : null)}, preventDefault: () => {}}))
  };
  vm.createContext(context);
  vm.runInContext(slice(PURE_START, PURE_END)
    + slice('  function recognizeProgressInfo() {', '  let recognizeProgressTimer = 0;')
    + '\n;({renderRecognizeProgress, recognizeProgressInfo, bindRecognizeProgressClose, recognizeProgressExpanded, RECOGNIZE_PROGRESS_EXPANDED_KEY})',
  context, {filename: 'app-v925-progress-render.js'});
  context.bindRecognizeProgressClose();
  return context;
}

const countRows = (html) => (html.match(/recognize-progress-detail-row/g) || []).length;

test('v925 渲染：折叠态 —— 文案带「项目名」文件名 + 有「详情」按钮，不画清单', () => {
  const context = loadRenderer();
  context.renderRecognizeProgress();
  const bar = context.__bar;
  assert.equal(bar.hidden, false);
  assert.equal(bar.dataset.kind, 'queued');
  assert.match(bar.innerHTML, /后台识别排队中 · 还剩 4 张 ·「夏日足球」picks足球弹窗AR\.gif、「夏日足球」store-launch\.jpg、「开斋节大促」ramadan-banner\.png · 还有 1 张/);
  assert.match(bar.innerHTML, /recognize-progress-toggle[^>]*>详情</, '有「详情」按钮');
  assert.match(bar.innerHTML, /aria-expanded="false"/);
  assert.doesNotMatch(bar.innerHTML, /data-recognize-progress-detail/, '没展开就不画清单');
  assert.match(bar.innerHTML, /data-recognize-progress-close/, '收起按钮还在');
});

test('v925 渲染：点一下展开 ⇒ 每行是缩略图 + 文件名 + 项目名，缩略图用已签好的那个 URL', () => {
  const context = loadRenderer({
    urls: {'thumbs/p-a1.jpg': 'https://cdn.test/a1.jpg', 'thumbs/p-b1.jpg': 'https://cdn.test/b1.jpg'}
  });
  context.renderRecognizeProgress();
  context.__click('[data-recognize-progress-toggle]');
  const bar = context.__bar;
  assert.match(bar.innerHTML, /data-recognize-progress-detail/, '展开后要有一块清单');
  assert.equal(countRows(bar.innerHTML), 4, '4 张待识别就有 4 行');
  assert.match(bar.innerHTML, /recognize-progress-detail-file">picks足球弹窗AR\.gif</, '文件名要写出来');
  assert.match(bar.innerHTML, /<img class="recognize-progress-detail-img" src="https:\/\/cdn\.test\/a1\.jpg"/, '签好名的缩略图直接用');
  assert.match(bar.innerHTML, /recognize-progress-detail-file">store-launch\.jpg</);
  assert.match(bar.innerHTML, /recognize-progress-detail-project">夏日足球</);
  assert.match(bar.innerHTML, /recognize-progress-detail-project">开斋节大促</);
  assert.match(bar.innerHTML, /recognize-progress-toggle[^>]*>收起清单</, '展开后按钮变成收起清单');
  assert.equal((bar.innerHTML.match(/<img /g) || []).length, 2, '只有签好名的两条有图，其余留空');
  assert.match(bar.innerHTML, /recognize-progress-detail-thumb" aria-hidden="true"><\/span>/, '没 URL 的那几行缩略图位留空');
  assert.doesNotMatch(bar.innerHTML, /<a\b|href=/, '清单行不可点、不跳转（第一版只做看得见）');
});

test('v925 渲染：缩略图取不到（没转出缩略图 / 被标记不可用）⇒ 留空、不抛错、行照样在', () => {
  const context = loadRenderer({urls: {'thumbs/p-a1.jpg': 'https://cdn.test/a1.jpg'}, unavailablePaths: ['thumbs/p-a1.jpg']});
  context.renderRecognizeProgress();
  context.__click('[data-recognize-progress-toggle]');
  const bar = context.__bar;
  assert.equal(countRows(bar.innerHTML), 4);
  assert.doesNotMatch(bar.innerHTML, /<img /, '不可用的缩略图不许画出来');
  const noPath = loadRenderer({noThumbPath: true});
  noPath.renderRecognizeProgress();
  noPath.__click('[data-recognize-progress-toggle]');
  assert.equal(countRows(noPath.__bar.innerHTML), 4, '压根没有缩略图路径也不影响清单');
  assert.doesNotMatch(noPath.__bar.innerHTML, /<img /);
});

test('v925 渲染：展开状态记 localStorage，重新渲染仍在；再点一下收起并清掉标记', () => {
  const context = loadRenderer();
  context.renderRecognizeProgress();
  assert.equal(context.__stored.has('vf_recognize_progress_expanded_v1'), false, '默认折叠');
  context.__click('[data-recognize-progress-toggle]');
  assert.equal(context.__stored.get('vf_recognize_progress_expanded_v1'), '1', '展开记进 localStorage');
  assert.match(context.__bar.innerHTML, /data-recognize-progress-detail/);
  context.renderRecognizeProgress();
  assert.match(context.__bar.innerHTML, /data-recognize-progress-detail/, '再渲染一遍仍然展开（内容没变不重画，清单还在）');
  context.__click('[data-recognize-progress-toggle]');
  assert.equal(context.__stored.has('vf_recognize_progress_expanded_v1'), false, '收起要清掉标记');
  assert.doesNotMatch(context.__bar.innerHTML, /data-recognize-progress-detail/);
  // 刷新页面后仍然记得（新的渲染器读同一个 localStorage）
  const again = loadRenderer({storage: {vf_recognize_progress_expanded_v1: '1'}});
  again.renderRecognizeProgress();
  assert.match(again.__bar.innerHTML, /data-recognize-progress-detail/, '刷新后仍是展开的（这是记 localStorage 的目的）');
});

test('v925 渲染：超过 50 条时清单只画 50 行并写「仅显示前 50 条」，文案里是「还有 57 张」', () => {
  const context = loadRenderer({state: {libraryPreviews: manyPreviews(60)}});
  context.renderRecognizeProgress();
  context.__click('[data-recognize-progress-toggle]');
  const bar = context.__bar;
  assert.equal(countRows(bar.innerHTML), 50, '上限 50 行');
  assert.match(bar.innerHTML, /仅显示前 50 条/);
  assert.match(bar.innerHTML, /还有 57 张/, '文案里也要说清还剩多少');
  assert.match(bar.innerHTML, /shot-49\.jpg/);
  assert.doesNotMatch(bar.innerHTML, /shot-50\.jpg/, '第 51 条不画');
});

test('v925 渲染：英文界面 —— 文案、按钮、上限提示都是英文', () => {
  const context = loadRenderer({lang: 'en', state: {libraryPreviews: manyPreviews(60)}});
  context.renderRecognizeProgress();
  const bar = context.__bar;
  assert.match(bar.innerHTML, /Background analysis queued · 60 left · "夏日足球" shot-0\.jpg/);
  assert.match(bar.innerHTML, /recognize-progress-toggle[^>]*>Details</);
  context.__click('[data-recognize-progress-toggle]');
  assert.match(bar.innerHTML, /recognize-progress-toggle[^>]*>Hide list</);
  assert.match(bar.innerHTML, /Showing first 50/);
});

test('v925 渲染：running 态没有清单可展开 ⇒ 不给「详情」按钮，三态表现与 v914 一致', () => {
  const context = loadRenderer();
  context.state.previewAiTagsByPreviewId = new Map([['p-b1', row('p-b1', 'src-b', 'running')]]);
  context.renderRecognizeProgress();
  const bar = context.__bar;
  assert.equal(bar.dataset.kind, 'running');
  assert.match(bar.innerHTML, /后台识别中 ·「开斋节大促」ramadan-banner\.png/, 'v925 顺手把文件名也带上');
  assert.doesNotMatch(bar.innerHTML, /recognize-progress-toggle/, '清单为空就不给展开入口');
  assert.match(bar.innerHTML, /data-recognize-progress-close/);
});

test('v925 渲染：「× 收起」仍可用（整条隐藏），收起不影响既有逻辑', () => {
  const context = loadRenderer();
  context.renderRecognizeProgress();
  context.__click('[data-recognize-progress-close]');
  assert.equal(context.__bar.hidden, true, '点了 × 就整条隐藏');
  assert.equal(context.__bar.innerHTML, '');
  assert.equal(context.__stored.get('vf_recognize_progress_hidden_v1'), 'queued', '沿用 v914 的"收起这一种状态"');
});

/* ── 4) 接线：不新增端点、不额外发请求、只在素材库页 ───────────────────── */

test('v925 接线：清单和展开都走已加载的数据 + 已渲染的 DOM，没有任何网络请求', () => {
  const detail = slice('  // v925 展开清单', '  let recognizeProgressTimer = 0;');
  assert.match(detail, /recognizeProgressExpanded\(\)/, '展开开关');
  assert.match(detail, /rememberRecognizeProgressExpanded\(/, '展开状态记起来');
  assert.match(detail, /libraryThumbnailPathForPreview\(preview, source\)/, '缩略图沿用素材库卡片那一套，不自己拼路径');
  assert.match(detail, /libraryThumbUnavailable\(thumbPath\)/, '被标记不可用的缩略图不再画');
  assert.match(detail, /state\.libraryPreviewUrls/, 'URL 取已经签好的那一份');
  assert.doesNotMatch(detail, /fetch\(/, '这块代码不许打任何接口');
  assert.doesNotMatch(detail, /supabase\.from\(/, '也不许现读库');
  assert.doesNotMatch(detail, /loadAllPreviewAiTags\(/, '不许自己触发重读');
  // 纯函数里也不许出现请求/读库
  const pure = slice(PURE_START, PURE_END);
  assert.doesNotMatch(pure, /fetch\(|supabase|document\./);
});

test('v925 接线：20 秒轮询、只在素材库页 + 有会话时跑 —— v914 的条件一个字没改', () => {
  assert.match(source, /const RECOGNIZE_PROGRESS_POLL_MS = 20000;/);
  const canPoll = slice('  function recognizeProgressCanPoll() {', '  async function refreshRecognizeProgress() {');
  assert.match(canPoll, /state\.route === 'library'/);
  assert.match(canPoll, /state\.session && state\.session\.access_token/);
  const refresh = slice('  async function refreshRecognizeProgress() {', '  function startRecognizeProgressPolling() {');
  assert.match(refresh, /await loadAllPreviewAiTags\(\);\s*\n\s*renderRecognizeProgress\(\);/, '刷新的还是那一个调用 + 重画');
  assert.match(source, /<section id="library-status" class="library-status/, '#library-status 那一行计数没被碰到');
});

test('v925 样式：清单内部滚动（有 max-height + overflow-y），细条本身仍不是 fixed', () => {
  const css = slice('.recognize-progress-detail {', '@keyframes recognize-progress-pulse');
  assert.match(css, /max-height:\s*\d+px/, '要有高度上限，50 行不许把整页撑开');
  assert.match(css, /overflow-y:\s*auto/, '超出就在清单内部滚');
  const head = slice('.recognize-progress { display: flex;', '.recognize-progress-dot {');
  assert.doesNotMatch(head, /position:\s*(fixed|absolute)/, '还是占位细条，不盖内容');
  assert.match(source, /\.recognize-progress-toggle \{/, '展开按钮要有样式');
  assert.match(source, /\.recognize-progress-detail-row \{/);
  assert.match(source, /\.recognize-progress-detail-img \{/);
});

test('v925 版本号六处同步（index.html 5 处 + app.js 1 处）', () => {
  assert.equal((indexSource.match(/\?v=20261014-edit-mode-hide-v937/g) || []).length, 5);
  assert.match(source, /const TOOL_UI_VERSION = '20261014-edit-mode-hide-v937'/);
  assert.doesNotMatch(indexSource, /20261014-content-key-v924/);
  assert.doesNotMatch(source, /20261014-content-key-v924/);
});
