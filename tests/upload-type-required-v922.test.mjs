// v922：上传必填「物料分类」+ 批量设置分类。
// ① 未分类的缩略图卡带 is-untyped（红框 + 常显红 chip），检测出真实类型后自动摘掉；
// ② 只要有任意一张没真实分类就不让上传（口径：下拉里那个空串选项 =「未分类」＝「还没选」）；
// ③ 上传弹窗里新增「批量设置分类」（多选缩略图 / 全选未分类 / 一次设成同一类型），
//    与单张选择共用同一套状态（同一个 <select> + dataset.touched）。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'app.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');

function slice(from, to) {
  const start = source.indexOf(from);
  assert.ok(start >= 0, '找不到片段起点：' + from);
  const end = source.indexOf(to, start);
  assert.ok(end > start, '找不到片段终点：' + to);
  return source.slice(start, end);
}

const PURE_FROM = '  // ── v922：上传必填「物料分类」（纯逻辑，测试直接切这段跑）';
const PURE_TO = '  // 上传网格里每张卡当前选的分类（按下标读那个隐藏的 <select>';
const DOM_HELPERS_TO = '  // 案例库上传：大图预览网格。每张图一个类型下拉（初始值=尺寸自动识别，';
const GRID_FROM = '  function renderCaseDropGrid(zone, fileList) {';
const GRID_TO = '  // 图库预览：与案例库同一套卡片';
const VALIDATE_FROM = '  function validateCaseProjectUpload(previewFiles, formData, chipSel) {';
const VALIDATE_TO = '  function translateCaseSchemaError(error) {';

/* ── 1) 真渲卡片 HTML：未分类红框 / 已分类不红 ─────────────────────────────── */

// 把生产里的 caseDropCardMarkup + 三个纯函数切进 vm 真跑（不是源码断言）
function loadCardMarkup({lang = 'zh'} = {}) {
  const context = vm.createContext({
    state: {lang: lang},
    escapeHtml: value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    escapeAttr: value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;'),
    // v943：物料类型在英文界面下要翻（真实现走词表；这里给个等价的桩，词表没有英文名就原样）
    caseTypeLabel: value => {
      const raw = String(value == null ? '' : value);
      if (!raw || raw === '未分类') return lang === 'zh' ? '未分类' : 'Unclassified';
      return raw;
    }
  });
  vm.runInContext(slice(PURE_FROM, PURE_TO), context);
  return context;
}

const CATALOG = ['开机海报', '弹窗'];
const cardOf = (type, options) => {
  const opts = Object.assign({lang: 'zh', catalogNames: CATALOG, dropInput: 'library-preview-input'}, options || {});
  // v943：显示语言由 state.lang 经 caseTypeLabel() 决定 ⇒ 建上下文时也要按语言来
  return loadCardMarkup({lang: opts.lang}).caseDropCardMarkup(
    {index: 0, name: 'a.png', type: type, mediaHtml: '<img src="blob:x" alt="">'},
    opts
  );
};

test('v922 渲染：未分类的卡带 is-untyped（红框钩子），chip 是红系那个 untyped 类，标记常显', () => {
  const html = cardOf('');
  assert.match(html, /class="case-drop-card is-untyped"/, '空分类 → 卡片带 is-untyped（红框挂它）');
  assert.match(html, /class="case-drop-type untyped" data-case-type-label="0"/, '图上标签走 untyped（红 chip）');
  assert.match(html, /title="点击修改分类">未分类<\/button>/, 'chip 文案是「未分类」');
  // 红框 + 红 chip + 常显都挂在 .case-drop-card.is-untyped 上（见下面的样式断言）
  assert.match(source, /\.case-drop-card\.is-untyped \.case-drop-type \{ opacity: 1; \}/, '未分类的 chip 常显，不用 hover');
});

test('v922 渲染：已分类的卡没有红框类、chip 不带 untyped，类型名直接显示', () => {
  const html = cardOf('弹窗');
  assert.doesNotMatch(html, /is-untyped/, '已分类不许带红框类');
  assert.match(html, /class="case-drop-type" data-case-type-label="0" title="点击修改分类">弹窗<\/button>/, 'chip 显示真实类型且不带 untyped');
});

test('v922 渲染：隐藏的 <select> 仍是唯一数据来源，空串选项 =「未分类」', () => {
  const empty = cardOf('');
  assert.match(empty, /<select class="case-type-chip case-type-hidden" data-case-type-index="0" tabindex="-1">/);
  assert.match(empty, /<option value="" selected>未分类<\/option>/, '空串选项默认选中');
  assert.match(empty, /<option value="弹窗">弹窗<\/option>/);
  const typed = cardOf('弹窗');
  assert.match(typed, /<option value="弹窗" selected>弹窗<\/option>/, '已分类时选中的是真实类型');
  assert.doesNotMatch(typed, /<option value="" selected>/, '空串选项不再被选中');
  assert.match(typed, /class="case-drop-check"/, '勾选框常驻 DOM（靠网格的 is-batch-selecting 显隐）');
});

test('v922 渲染：中英双语（state.lang）', () => {
  // v943：显示语言现在由 state.lang 经 caseTypeLabel() 决定 ⇒ vm 也要按语言建上下文
  const zh = cardOf('', {lang: 'zh'});
  const en = cardOf('', {lang: 'en'}) ;
  assert.match(zh, /未分类/);
  assert.match(en, /Unclassified/, '英文界面显示 Unclassified');
  assert.match(en, /title="Change category"/);
  assert.doesNotMatch(en, /未分类/);
});

test('v922 样式：红只认卡片上的 is-untyped —— 图库那条「未分类」chip 不会被染红', () => {
  assert.match(source, /\.case-drop-card\.is-untyped \.case-drop-thumb \{ border: 2px solid #dc2626; background: #fff1f2; \}/, '2px 红边 + 浅红底');
  assert.match(source, /\.case-drop-card\.is-untyped \.case-drop-type\.untyped \{ background: #dc2626; \}/, '未分类 chip 变红');
  assert.match(source, /\.case-drop-card\.is-untyped-focus \.case-drop-thumb \{ box-shadow: 0 0 0 3px rgba\(220, 38, 38, 0\.35\); \}/, '被拦下时那张卡要闪一下');
  // 回归：图库的常显规则一字未动（gallery-chip-v809 也锁着它）
  assert.match(source, /\.case-drop-type\[data-gallery-type-chip\] \{ opacity: 1; \}/);
  assert.doesNotMatch(source, /^\.case-drop-type\.untyped \{ background: #dc2626/m, '不要把全局 untyped 改成红的（会波及图库）');
});

test('v922 接线：红框只由 caseUploadTypeChosen 决定，检测出真实类型后自动消失', () => {
  const grid = slice(GRID_FROM, GRID_TO);
  assert.match(grid, /const chosen = caseUploadTypeChosen\(value\);/, '口径唯一');
  assert.match(grid, /card\.classList\.toggle\('is-untyped', !chosen\)/, '摘/挂红框的唯一出口');
  assert.match(grid, /const detected = videoFile \? caseDynamicMaterialType\(uploadCasePlatform\(\)\) : detectCaseMaterialType\(file\.name, dims\.width, dims\.height, uploadCasePlatform\(\)\);[\s\S]{0,120}?syncChip\(select\);/, '异步检测拿到类型后走 syncChip（红框随之消失）');
  assert.match(grid, /const syncChip = select => \{[\s\S]{0,200}?syncTypeLabel\(select\.getAttribute\('data-case-type-index'\), select\.value\);/, '单张手选也走同一个出口');
  assert.match(grid, /syncTypeLabel\(select\.getAttribute\('data-case-type-index'\), select\.value\);[\s\S]{0,200}?refreshBatchBar\(\);/, '分类变了批量条的「还有 N 张未分类」也跟着变');
});

/* ── 1b) 真渲整段：把 renderCaseDropGrid 切进 vm 跑（假 DOM 由生成的 HTML 驱动） ── */

function miniClassList() {
  const set = new Set();
  return {
    add: name => set.add(name),
    remove: name => set.delete(name),
    contains: name => set.has(name),
    toggle: (name, on) => {
      if (on === undefined) { if (set.has(name)) set.delete(name); else set.add(name); }
      else if (on) set.add(name); else set.delete(name);
    },
    _set: set
  };
}

// 只跑真实代码：renderCaseDropGrid 生成 HTML，DOM 桩按 HTML 里的下标提供卡片/label/select
function loadGridRender() {
  const noop = () => {};
  const files = [
    {name: 'a.png', size: 10, lastModified: 1, type: 'image/png'},
    {name: 'b.gif', size: 20, lastModified: 2, type: 'image/gif'}
  ];
  const selects = new Map();
  const cards = new Map();
  const labels = new Map();
  const menus = [];
  const toasts = [];
  const element = () => ({
    hidden: true, classList: miniClassList(), dataset: {}, textContent: '', disabled: false, onclick: null,
    _handlers: {},
    addEventListener(type, fn) { (this._handlers[type] = this._handlers[type] || []).push(fn); },
    getBoundingClientRect: () => ({top: 0, left: 0, bottom: 0, right: 0}), offsetHeight: 0,
    style: {setProperty: noop, removeProperty: noop}, remove: noop
  });
  const bars = {
    'case-drop-batch-bar': element(), 'case-drop-batch-toggle': element(), 'case-drop-batch-hint': element(),
    'case-drop-batch-actions': element(), 'case-drop-batch-count': element(), 'case-drop-batch-untyped': element(),
    'case-drop-batch-all': element(), 'case-drop-batch-clear': element(), 'case-drop-batch-type': element()
  };
  const selectFor = i => {
    if (!selects.has(i)) selects.set(i, {value: '', dataset: {}, isConnected: true, classList: miniClassList(), addEventListener: noop, getAttribute: name => (name === 'data-case-type-index' ? String(i) : null)});
    return selects.get(i);
  };
  const cardFor = i => {
    if (!cards.has(i)) cards.set(i, {classList: miniClassList(), addEventListener: noop, scrolled: false, scrollIntoView() { this.scrolled = true; }, getAttribute: name => (name === 'data-file-index' ? String(i) : null)});
    return cards.get(i);
  };
  const labelFor = i => {
    if (!labels.has(i)) labels.set(i, {
      textContent: '', classList: miniClassList(), dataset: {}, _handlers: {},
      addEventListener(type, fn) { (this._handlers[type] = this._handlers[type] || []).push(fn); },
      getBoundingClientRect: () => ({top: 0, left: 0, bottom: 0, right: 0}),
      getAttribute: name => (name === 'data-case-type-label' ? String(i) : null)
    });
    return labels.get(i);
  };
  const gridHandlers = {};
  // 假 DOM 也要像浏览器一样「解析」innerHTML：卡片/图签的类名与文案从生成的 HTML 落到桩上，
  // 不然关于红框的断言就是空转（真浏览器里这些类是 innerHTML 带进来的）
  const applyMarkup = html => {
    files.forEach((file, i) => {
      const cardClass = new RegExp('class="([^"]*)" data-file-index="' + i + '"').exec(html);
      if (cardClass) {
        cardFor(i).classList._set.clear();
        cardClass[1].split(/\s+/).forEach(name => { if (name) cardFor(i).classList.add(name); });
      }
      const chipClass = new RegExp('class="([^"]*)" data-case-type-label="' + i + '"').exec(html);
      if (chipClass) {
        labelFor(i).classList._set.clear();
        chipClass[1].split(/\s+/).forEach(name => { if (name) labelFor(i).classList.add(name); });
      }
      const chipText = new RegExp('data-case-type-label="' + i + '"[^>]*>([^<]*)<').exec(html);
      if (chipText) labelFor(i).textContent = chipText[1];
    });
  };
  const grid = {
    dataset: {}, hidden: true, classList: miniClassList(),
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(value) { this._html = value; applyMarkup(value); },
    addEventListener(type, fn) { (gridHandlers[type] = gridHandlers[type] || []).push(fn); },
    querySelector(selector) {
      const select = /select\[data-case-type-index="(\d+)"\]/.exec(selector);
      if (select) return selectFor(Number(select[1]));
      const label = /\[data-case-type-label="(\d+)"\]/.exec(selector);
      if (label) return labelFor(Number(label[1]));
      const card = /\.case-drop-card\[data-file-index="(\d+)"\]/.exec(selector);
      if (card) return cardFor(Number(card[1]));
      return null;
    },
    querySelectorAll(selector) {
      const indexes = files.map((file, i) => i);
      if (selector === 'select[data-case-type-index]' || selector === '.case-type-chip') return indexes.map(selectFor);
      if (selector === '[data-case-type-label]') return indexes.map(labelFor);
      if (selector === '.case-drop-card') return indexes.map(cardFor);
      if (selector === '.case-drop-card.is-picked') return indexes.map(cardFor).filter(card => card.classList.contains('is-picked'));
      return [];
    }
  };
  files.forEach((file, i) => { cardFor(i).parentElement = grid; });
  const context = vm.createContext({
    state: {lang: 'zh'},
    setTimeout: () => 0,
    URL: {createObjectURL: () => 'blob:x'},
    DataTransfer: function () { this.items = {add() {}}; this.files = []; },
    window: {innerWidth: 1200, innerHeight: 800},
    document: {
      getElementById: id => (id === 'case-drop-panel' ? grid : (bars[id] || null)),
      createElement: () => { const menu = element(); menus.push(menu); return menu; },
      body: {append: noop},
      addEventListener: noop,
      removeEventListener: noop
    },
    escapeHtml: value => String(value == null ? '' : value),
    escapeAttr: value => String(value == null ? '' : value),
    // v943：物料类型英文界面要翻（真实现走词表；这里等价桩：词表没有英文名就原样）
    caseTypeLabel: value => {
      const raw = String(value == null ? '' : value);
      if (!raw || raw === '未分类') return '未分类';
      return raw;
    },
    isCasePreviewFile: () => true,
    isCaseVideoFile: file => /\.(mp4|mov|webm|gif)$/i.test(file.name),
    collectDroppedFiles: () => [],
    materialCatalogTypeNames: () => ['开机海报', '弹窗', '头图'],
    uploadCasePlatform: () => 'C端',
    caseDynamicMaterialType: () => '弹窗',
    detectCaseMaterialType: () => '开机海报',
    clearCaseAutoQuantity: noop,
    applyCaseAutoQuantity: noop,
    refreshMaterialCatalogForCases: () => Promise.resolve(),
    readImageDimensions: () => Promise.resolve({width: 100, height: 100}),
    readVideoDimensions: () => Promise.resolve({width: 100, height: 100}),
    showCaseToast: message => toasts.push(message),
    __grid: grid, __bars: bars, __cards: cards, __selects: selects, __labels: labels, __menus: menus, __toasts: toasts, __files: files, __gridHandlers: gridHandlers
  });
  vm.runInContext(slice(PURE_FROM, GRID_TO), context);
  return context;
}

const gridZone = {dataset: {dropInput: 'library-preview-input'}, style: {setProperty() {}, removeProperty() {}}, querySelector: () => null};

test('v922 真渲：拖进两张图 ⇒ 两张都是红框卡 + 红 chip，批量条报「还有 2 张未分类」', () => {
  const context = loadGridRender();
  context.renderCaseDropGrid(gridZone, context.__files);
  const html = context.__grid.innerHTML;
  assert.equal((html.match(/class="case-drop-card is-untyped"/g) || []).length, 2, '两张都没分类 ⇒ 两张红框');
  assert.equal((html.match(/class="case-drop-type untyped"/g) || []).length, 2, '两张的红 chip');
  assert.match(html, /<option value="" selected>未分类<\/option>/);
  assert.equal(context.__bars['case-drop-batch-bar'].hidden, false, '有文件 ⇒ 批量入口出现');
  assert.equal(context.__bars['case-drop-batch-hint'].textContent, '还有 2 张未分类');
  assert.equal(context.__bars['case-drop-batch-actions'].hidden, true, '没进批量模式时不显示操作条');
});

test('v922 真渲：批量 =「全选未分类」+ 一次设成同一类型，红框消失且与单张同一份 select', () => {
  const context = loadGridRender();
  context.renderCaseDropGrid(gridZone, context.__files);
  const stop = {stopPropagation() {}};
  context.__bars['case-drop-batch-toggle'].onclick(stop);
  assert.equal(context.__grid.classList.contains('is-batch-selecting'), true, '进批量模式（勾选框显示出来）');
  assert.equal(context.__bars['case-drop-batch-actions'].hidden, false);
  assert.equal(context.__bars['case-drop-batch-toggle'].textContent, '退出批量');
  context.__bars['case-drop-batch-untyped'].onclick(stop);
  assert.equal(context.__bars['case-drop-batch-count'].textContent, '已选 2 张', '一键全选未分类');
  assert.equal([0, 1].filter(i => context.__cards.get(i).classList.contains('is-picked')).length, 2, '两张都勾上');
  assert.equal(context.__bars['case-drop-batch-type'].disabled, false);
  // 打开分类菜单 → 点「头图」
  context.__bars['case-drop-batch-type'].onclick(stop);
  const menu = context.__menus[context.__menus.length - 1];
  assert.equal(menu.id, 'case-drop-batch-type-menu');
  assert.match(menu.innerHTML, /data-case-batch-type-value="头图"/, '菜单复用素材库那套 .case-type-menu');
  menu._handlers.click[0]({target: {closest: selector => (selector === '[data-case-batch-type-value]' ? {getAttribute: () => '头图'} : null)}, stopPropagation() {}});
  assert.deepEqual([0, 1].map(i => context.__selects.get(i).value), ['头图', '头图'], '上传最终读的就是这个 select');
  assert.deepEqual([0, 1].map(i => context.__selects.get(i).dataset.touched), ['1', '1'], '与单张手选同一套状态');
  assert.deepEqual([0, 1].map(i => context.__cards.get(i).classList.contains('is-untyped')), [false, false], '红框消失');
  assert.deepEqual([0, 1].map(i => context.__labels.get(i).textContent), ['头图', '头图'], 'chip 变成新类型');
  assert.equal(context.__bars['case-drop-batch-hint'].textContent, '都已分类');
  assert.equal(context.__bars['case-drop-batch-count'].textContent, '点缩略图选中', '应用后清空选择');
  assert.match(context.__toasts.join('|'), /已把 2 张设为「头图」/);
});

test('v922 真渲：批量菜单里选「未分类」（空串）⇒ 一张都不动、红框照留', () => {
  const context = loadGridRender();
  context.renderCaseDropGrid(gridZone, context.__files);
  const stop = {stopPropagation() {}};
  context.__bars['case-drop-batch-toggle'].onclick(stop);
  context.__bars['case-drop-batch-untyped'].onclick(stop);
  context.__bars['case-drop-batch-type'].onclick(stop);
  const menu = context.__menus[context.__menus.length - 1];
  assert.match(menu.innerHTML, /data-case-batch-type-value=""/, '菜单里有「未分类」那一项');
  menu._handlers.click[0]({target: {closest: selector => (selector === '[data-case-batch-type-value]' ? {getAttribute: () => ''} : null)}, stopPropagation() {}});
  assert.deepEqual([0, 1].map(i => context.__selects.get(i).value), ['', ''], '没写进任何分类');
  assert.deepEqual([0, 1].map(i => context.__cards.get(i).classList.contains('is-untyped')), [true, true], '红框照留');
  assert.equal(context.__bars['case-drop-batch-hint'].textContent, '还有 2 张未分类');
  assert.match(context.__toasts.join('|'), /「未分类」不算已选分类/, '要说清为什么没生效');
});

test('v922 真渲：检测出真实类型 ⇒ 红框自动消失、批量条跟着改口', async () => {
  const context = loadGridRender();
  context.renderCaseDropGrid(gridZone, context.__files);
  assert.equal(context.__bars['case-drop-batch-hint'].textContent, '还有 2 张未分类');
  for (let i = 0; i < 4; i += 1) await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual([0, 1].map(i => context.__selects.get(i).value), ['开机海报', '弹窗'], '识别出尺寸就填上类型');
  assert.deepEqual([0, 1].map(i => context.__cards.get(i).classList.contains('is-untyped')), [false, false], '红框自动消失');
  assert.equal(context.__bars['case-drop-batch-hint'].textContent, '都已分类', '批量条的计数同步');
});

test('v922 真渲：批量模式下点缩略图 = 勾选/取消勾选', () => {
  const context = loadGridRender();
  context.renderCaseDropGrid(gridZone, context.__files);
  const stop = {stopPropagation() {}};
  const clickCard = index => {
    const handlers = context.__gridHandlers.click || [];
    assert.ok(handlers.length, '网格上挂了批量选卡监听');
    // 第 1 个是「点空白处继续挑文件」（原有），批量选卡是后挂的那个
    handlers[handlers.length - 1]({target: {closest: selector => (selector === '.case-drop-card' ? context.__cards.get(index) : null)}});
  };
  context.__bars['case-drop-batch-toggle'].onclick(stop);
  clickCard(1);
  assert.equal(context.__cards.get(1).classList.contains('is-picked'), true, '点一下就选中');
  assert.equal(context.__bars['case-drop-batch-count'].textContent, '已选 1 张');
  clickCard(1);
  assert.equal(context.__cards.get(1).classList.contains('is-picked'), false, '再点一下取消');
  assert.equal(context.__bars['case-drop-batch-count'].textContent, '点缩略图选中');
  // 不在批量模式时点卡片不勾选（原来点卡片＝没反应/换文件，行为不变）
  context.__bars['case-drop-batch-toggle'].onclick(stop);
  clickCard(0);
  assert.equal(context.__cards.get(0).classList.contains('is-picked'), false);
});

test('v922 真渲：单张 chip 菜单里选「未分类」⇒ 红框不消失（这是"选了它也不算选"的落点）', () => {
  const context = loadGridRender();
  context.renderCaseDropGrid(gridZone, context.__files);
  const label = context.__labels.get(0);
  label._handlers.click[0].call(label, {stopPropagation() {}, preventDefault() {}});
  const menu = context.__menus[context.__menus.length - 1];
  assert.equal(menu.id, 'case-type-menu', '弹的是单张那张卡自己的分类菜单');
  assert.match(menu.innerHTML, /data-type-value=""/, '菜单里确实有「未分类」这一项');
  menu._handlers.click[0]({target: {closest: selector => (selector === '[data-type-value]' ? {getAttribute: () => ''} : null)}});
  assert.equal(context.__selects.get(0).value, '', '空串进了 select');
  assert.equal(context.__selects.get(0).dataset.touched, '1', '也算手选过（异步识别不再覆盖）');
  assert.equal(context.__cards.get(0).classList.contains('is-untyped'), true, '但红框留着 —— 选了未分类不等于选好了');
  // 同一份口径：校验会把它算成"没分类"
  assert.deepEqual(Array.from(context.caseUploadUntypedIndexes([context.__selects.get(0).value])), [0]);
});

/* ── 2) 校验纯逻辑（真跑 validateCaseProjectUpload） ────────────────────────── */

// 真渲一个假网格：读得到每张卡的 <select>，也拿得到卡片元素（用来验"指出是哪几张"）
function loadValidate(selectValues, options) {
  const opts = options || {};
  const focused = [];
  const cards = new Map();
  const cardFor = index => {
    if (!cards.has(index)) {
      const record = {
        scrolled: false,
        classes: new Set(),
        scrollIntoView() { record.scrolled = true; }
      };
      record.classList = {
        add: name => { record.classes.add(name); focused.push(index); },
        remove: name => { record.classes.delete(name); },
        toggle: (name, on) => { if (on) record.classes.add(name); else record.classes.delete(name); }
      };
      cards.set(index, record);
    }
    return cards.get(index);
  };
  const grid = opts.noGrid ? {id: 'case-drop-panel'} : {
    id: 'case-drop-panel',
    querySelector(selector) {
      const card = /\.case-drop-card\[data-file-index="(\d+)"\]/.exec(selector);
      if (card) return Number(card[1]) < selectValues.length ? cardFor(Number(card[1])) : null;
      const select = /data-case-type-index="(\d+)"/.exec(selector);
      if (!select) return null;
      const index = Number(select[1]);
      return index < selectValues.length ? {value: selectValues[index]} : null;
    }
  };
  const context = vm.createContext({
    state: {lang: opts.lang || 'zh'},
    isCasePreviewFile: () => true,
    caseTagSelFirst: (sel, key) => {
      const value = (sel || {})[key];
      return Array.isArray(value) ? (value[0] || '') : (value || '');
    },
    flagMissingCaseTagRows: () => {},
    setTimeout: () => 0,
    document: {getElementById: id => (id === 'case-drop-panel' ? grid : {id: id})},
    // v943：物料类型英文界面要翻（等价桩）
    caseTypeLabel: value => {
      const raw = String(value == null ? '' : value);
      if (!raw || raw === '未分类') return '未分类';
      return raw;
    },
    __focused: focused,
    __cards: cards
  });
  vm.runInContext(
    slice(PURE_FROM, PURE_TO)
    + slice('  // 上传网格里每张卡当前选的分类（按下标读那个隐藏的 <select>', DOM_HELPERS_TO)
    + slice(VALIDATE_FROM, VALIDATE_TO),
    context
  );
  return context;
}

const formDataOf = values => ({get: key => values[key] || ''});
const baseForm = {title: '项目', owner_name: '小王'};
const tagsOk = {tag1: 'C端', country: '沙特阿拉伯', activity: '足球', strategy: 'picks'};
const previews = count => Array.from({length: count}, (_, i) => ({name: 'p' + i + '.png', type: 'image/png'}));

test('v922 校验：每张都选了清单里的真实类型 ⇒ 放行', () => {
  const context = loadValidate(['开机海报', '弹窗']);
  context.validateCaseProjectUpload(previews(2), formDataOf(baseForm), tagsOk);
  assert.equal(context.__focused.length, 0, '没有未分类 ⇒ 一张都不高亮');
});

test('v922 校验：有一张没分类 ⇒ 拦下上传，提示带张数并指向「批量设置分类」，同时高亮那张卡', () => {
  const context = loadValidate(['开机海报', '', '弹窗']);
  assert.throws(
    () => context.validateCaseProjectUpload(previews(3), formDataOf(baseForm), tagsOk),
    error => {
      assert.match(error.message, /还有 1 张没识别出分类/, '要说清有几张');
      assert.match(error.message, /请点缩略图上的「未分类」选择/, '要教用户怎么改');
      assert.match(error.message, /或用下面的「批量设置分类」/, '要指向批量入口');
      return true;
    }
  );
  assert.deepEqual(context.__focused, [1], '高亮的就是未分类那一张（不是随便一张）');
  assert.equal(context.__cards.get(1).scrolled, true, '第一张未分类的卡要滚进视野');
  const card0 = context.__cards.get(0);
  assert.equal(card0 ? card0.scrolled : false, false, '已分类的卡不动（根本不碰它）');
});

test('v922 校验：空串选项（=「未分类」）不算已选 —— 选了它照样拦，张数照数', () => {
  const context = loadValidate(['', '', '未分类']);
  assert.throws(() => context.validateCaseProjectUpload(previews(3), formDataOf(baseForm), tagsOk), /还有 3 张没识别出分类/);
  assert.deepEqual(context.__focused, [0, 1, 2], '三张都是未分类，都要指出来');
});

test('v922 校验：EN 界面提示也是英文', () => {
  const context = loadValidate([''], {lang: 'en'});
  assert.throws(() => context.validateCaseProjectUpload(previews(1), formDataOf(baseForm), tagsOk), /1 material\(s\) still have no category[\s\S]*Batch set type/);
});

test('v922 校验：拿不到真实网格就不拦（别把"网格没渲染"当成"全都未分类"把上传堵死）', () => {
  const context = loadValidate([''], {noGrid: true});
  context.validateCaseProjectUpload(previews(1), formDataOf(baseForm), tagsOk);
  assert.equal(context.__focused.length, 0);
});

test('v922 校验：标签必填（v809/v914/v934）照旧先报，顺序没变', () => {
  const context = loadValidate(['']);
  assert.throws(() => context.validateCaseProjectUpload(previews(1), formDataOf(baseForm), {}), /平台、国家、活动主题和业务策略/);
});

/* ── 3) 批量逻辑（纯函数） ───────────────────────────────────────────────── */

test('v922 批量：全选未分类 = 那几个没分类的下标；应用后这些位置变成新类型', () => {
  const {caseUploadUntypedIndexes, caseUploadApplyBatchType} = loadCardMarkup();
  const types = ['弹窗', '', '开机海报', ''];
  const picked = caseUploadUntypedIndexes(types);
  assert.deepEqual(Array.from(picked), [1, 3], '全选未分类选中的就是这两张');
  const applied = caseUploadApplyBatchType(types, picked, '头图');
  assert.deepEqual(Array.from(applied), ['弹窗', '头图', '开机海报', '头图'], '只改选中的，别的原样');
  assert.deepEqual(Array.from(types), ['弹窗', '', '开机海报', ''], '纯函数不就地改原数组');
  assert.deepEqual(Array.from(caseUploadUntypedIndexes(['弹窗', '开机海报'])), [], '都选好了 ⇒ 没有未分类');
  assert.deepEqual(Array.from(caseUploadUntypedIndexes(['', '',  null])), [0, 1, 2], '空串/空值都算没选');
});

test('v922 批量：把「未分类」/空串设给一批 = 一张都不动（口径与单张一致）', () => {
  const {caseUploadApplyBatchType} = loadCardMarkup();
  assert.deepEqual(Array.from(caseUploadApplyBatchType(['弹窗', ''], [1], '')), ['弹窗', ''], '空串不生效');
  assert.deepEqual(Array.from(caseUploadApplyBatchType(['弹窗', ''], [1], '未分类')), ['弹窗', ''], '「未分类」不生效');
  assert.deepEqual(Array.from(caseUploadApplyBatchType(['弹窗', ''], [1], '  ')), ['弹窗', ''], '纯空白也不生效');
});

test('v922 批量：越界 / 非数组入参不炸', () => {
  const {caseUploadApplyBatchType, caseUploadUntypedIndexes} = loadCardMarkup();
  assert.deepEqual(Array.from(caseUploadApplyBatchType(['弹窗'], [5, -1], '头图')), ['弹窗']);
  assert.deepEqual(Array.from(caseUploadApplyBatchType(null, [0], '头图')), []);
  assert.deepEqual(Array.from(caseUploadUntypedIndexes(null)), []);
});

/* ── 4) 接线 ─────────────────────────────────────────────────────────────── */

test('v922 接线：上传弹窗里就有批量入口（文件网格旁边），三个动作齐备', () => {
  assert.match(source, /id="case-drop-batch-bar"/, '批量条挂在文件网格后面');
  assert.match(source, /id="case-drop-batch-toggle">\$\{state\.lang === 'zh' \? '批量设置分类' : 'Batch set type'\}/, '入口文案「批量设置分类」/ Batch set type');
  assert.match(source, /id="case-drop-batch-untyped">\$\{state\.lang === 'zh' \? '全选未分类' : 'Select unclassified'\}/, '一键全选未分类');
  assert.match(source, /id="case-drop-batch-all"/, '全选');
  assert.match(source, /id="case-drop-batch-clear"/, '清空');
  assert.match(source, /id="case-drop-batch-type">\$\{state\.lang === 'zh' \? '设置分类' : 'Set category'\}/, '一次设成同一类型');
  // 挂在 #case-drop-panel 之后（同一段上传表单里）
  assert.match(source, /<div id="case-drop-panel"[^>]*><\/div>\s*\n\s*<!-- v922：批量设置分类[\s\S]{0,400}?id="case-drop-batch-bar"/);
  // 勾选框沿用 v813 那套视觉语言
  assert.match(source, /\.case-drop-grid\.is-batch-selecting \.case-drop-check \{ display: block; \}/);
  assert.match(source, /\.case-drop-card\.is-picked \.case-drop-check \{ border-color: #16a34a; background: #16a34a; \}/);
});

test('v922 接线：批量与单张走同一套状态（同一个 <select> + dataset.touched + syncChip）', () => {
  const grid = slice(GRID_FROM, GRID_TO);
  const apply = grid.slice(grid.indexOf('const applyBatchType = nextType => {'), grid.indexOf('const openBatchTypeMenu = () => {'));
  assert.ok(apply.length > 0, '切得到批量应用逻辑');
  assert.match(apply, /select\.value = nextType;/);
  assert.match(apply, /select\.dataset\.touched = '1';/, '手选标记：异步识别不再覆盖');
  assert.match(apply, /syncChip\(select\);/, '与单张同一个出口（红框消失、chip 换新类型）');
  assert.match(apply, /if \(!caseUploadTypeChosen\(nextType\)\)[\s\S]{0,220}?return;/, '选「未分类」时直接返回，什么都不改');
  // 单张那条路（点 chip → 菜单 → select.value + touched + syncChip）
  assert.match(grid, /select\.value = btn\.getAttribute\('data-type-value'\);[\s\S]{0,80}?select\.dataset\.touched = '1';[\s\S]{0,80}?syncChip\(select\);/);
  // 批量条状态直接读 DOM（不另存一份真相）
  assert.match(grid, /const currentTypes = \(\) => caseUploadTypeValues\(files\.length\) \|\| \[\];/);
  assert.match(grid, /const untypedIndexes = \(\) => caseUploadUntypedIndexes\(currentTypes\(\)\)/);
  assert.match(grid, /if \(batchUntypedBtn\) batchUntypedBtn\.onclick = event => \{[\s\S]{0,300}?untypedIndexes\(\)/, '「全选未分类」用的就是同一份口径');
  // 没有文件时批量条藏起来
  assert.match(grid, /const emptyBatchBar = document\.getElementById\('case-drop-batch-bar'\);\s*\n\s*if \(emptyBatchBar\) emptyBatchBar\.hidden = true;/);
  // 多选监听只挂一次（重新拖图不会叠加监听、也不会读到旧 files）
  assert.match(grid, /if \(!grid\.dataset\.caseDropBatchBound\) \{/, '监听器只挂一次');
  assert.match(grid, /grid\.__caseDropBatch = \{ state: batchState, toggle: toggleBatchPick \};/, '每次重画把最新状态挂到网格上');
  assert.match(grid, /const batch = grid\.__caseDropBatch;/);
});

test('v922 接线：校验真的调了这条检查，且只在上传新项目那条路（编辑已有项目不受影响）', () => {
  const validate = slice(VALIDATE_FROM, VALIDATE_TO);
  assert.match(validate, /const typeValues = caseUploadTypeValues\(previewFiles\.length\);/, '读每张卡当前选的分类');
  assert.match(validate, /const untyped = caseUploadUntypedIndexes\(typeValues\);/, '用同一个口径数未分类');
  assert.match(validate, /focusCaseDropUntyped\(untyped\);/, '拦之前先把"是哪几张"指出来');
  assert.match(validate, /还有 ' \+ untyped\.length \+ ' 张没识别出分类/, '提示带张数');
  assert.match(validate, /if \(typeValues\) \{/, '拿不到网格时跳过这条（降级）而不是全堵死');
  const calls = source.match(/validateCaseProjectUpload\(/g) || [];
  assert.equal(calls.length, 2, '一次定义、一次调用（只有案例项目上传那条分支）');
  const uploadPath = slice("      const chipSel = isCaseProject ? ((document.getElementById('upload-case-tag-bar') || {})._caseTagSel || {}) : {};", VALIDATE_FROM);
  assert.match(uploadPath, /if \(isCaseProject\) \{\s*\n\s*validateCaseProjectUpload\(previewFiles, formData, chipSel\);/);
  const editBar = source.indexOf('data-case-edit-bar');
  assert.ok(editBar > 0, '案例编辑弹窗还在');
  assert.doesNotMatch(source.slice(editBar, editBar + 4000), /validateCaseProjectUpload/, '编辑已有项目不经过这条校验');
});

/* ── 5) 版本号 ───────────────────────────────────────────────────────────── */

test('v922 版本号六处同步', () => {
  const refs = indexSource.match(/\?v=20261015-pin-add-plus-v944/g) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处版本号');
  assert.match(source, /const TOOL_UI_VERSION = '20261015-pin-add-plus-v944'/);
});
