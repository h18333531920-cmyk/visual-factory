// v914 W1：上传表单改造。
// ① 上传表单里不再有 AI 元素识别（不渲染建议 chip / 「AI 识别」按钮，也不调 /api/analyze-elements）；
// ② 平台 / 国家 / 活动主题三项必填（真跑校验函数，不是源码断言）；
// ③ 元素行支持手选 + 自定义新增（≤5 字那条要求见下：实际口径是"中文 6 字/英文 12 字符"加权上限）；
// ④ 端点 save 与批量脚本 buildSuccessRow 的写库口径一致：人工标签（manual_tags）不再作为 AI 标签存第二份。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {buildSuccessRow} from '../scripts/recognize-case-tags.mjs';
import {handleCasePreviewAiTags} from '../functions/api/case-preview-ai-tags.js';

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

/* ── 1) 上传表单不再渲染 AI 建议 ─────────────────────────────────────────── */

function loadTagBar() {
  const context = vm.createContext({
    state: {lang: 'zh'},
    CASE_TAG_MULTI_KEYS: ['activity', 'strategy', 'element', 'format'],
    libraryDisplayLabel: (value) => value,
    escapeHtml: (value) => String(value == null ? '' : value),
    escapeAttr: (value) => String(value == null ? '' : value),
    caseTagChipRows: () => [
      {key: 'tag1', values: ['C端']},
      {key: 'country', values: ['沙特阿拉伯']},
      {key: 'activity', values: ['足球']},
      {key: 'element', values: ['kiki', '手机']}
    ]
  });
  vm.runInContext(slice('  var CASE_TAG_CUSTOM_KEYS', '  function caseTagCharUnits(code) {')
    + slice('  function caseTagSelHas(sel, key, value) {', '  function lastCaseUploadPlatform() {')
    + slice('  function caseTagCustomRowMarkup(key) {', '  function renderCaseTagBar(selected) {')
    + slice('  function renderCaseTagBar(selected) {', '  // 封面缩到长边'), context);
  return context;
}

test('v914 渲染：标签条只剩气泡条 + 「添加标签」，AI 建议 chip / 「AI 识别」按钮一个都不渲染', () => {
  const {renderCaseTagBar, renderCaseTagChipGroups} = loadTagBar();
  const html = renderCaseTagBar({element: ['kiki']});
  assert.match(html, /data-case-tag-bubbles/, '气泡条照旧');
  assert.match(html, /data-case-tag-add/, '「添加标签」入口照旧');
  assert.match(html, /kiki/, '已选标签照旧显示在气泡条上');
  assert.doesNotMatch(html, /data-case-tag-ai\b/, '不许再有 AI 区块');
  assert.doesNotMatch(html, /data-case-tag-ai-value/);
  assert.doesNotMatch(html, /data-case-tag-ai-activity/);
  assert.doesNotMatch(html, /data-case-tag-ai-rerun/, '不许再有「重新识别」');
  assert.doesNotMatch(html, /AI 建议|全部采纳|取消采纳/);
  // 标签面板（浮窗）本身照常：七行词表 + 自定义入口
  const pop = renderCaseTagChipGroups({});
  assert.match(pop, /data-case-tag-row="tag1"/);
  assert.match(pop, /data-case-tag-row="element"/);
});

test('v914 接线：上传拖图那条路不再挑开屏去识别，也不再清 AI 建议', () => {
  const dropGrid = slice('  function renderCaseDropGrid(zone, fileList) {', '  // 图库预览：与案例库同一套卡片');
  assert.doesNotMatch(dropGrid, /requestCaseElementSuggestions/, '上传不再发识别请求');
  assert.doesNotMatch(dropGrid, /selectCaseElementSuggestionFile/, '也不再多图挑开屏去识别');
  assert.doesNotMatch(dropGrid, /analyze-elements/);
  assert.doesNotMatch(dropGrid, /dataset\.aiElementKey|dataset\.aiElementBatchKey/);
  // 物料类型自动识别 / 缩略图网格 / 成套自动判数量必须原样保留
  assert.match(dropGrid, /detectCaseMaterialType\(file\.name, dims\.width, dims\.height, uploadCasePlatform\(\)\)/, '物料类型自动识别照旧');
  assert.match(dropGrid, /applyCaseAutoQuantity\(autoTagBar, dimensions\)/, '数量自动判定照旧');
  // v922 起卡片 HTML 由 caseDropCardMarkup 生成（红框就是挂在它出的卡片上），标记本身一字未动
  assert.match(dropGrid, /caseDropCardMarkup\(\{/, '缩略图网格照旧（卡片 HTML 交给 caseDropCardMarkup）');
  assert.match(source, /'<div class="case-drop-thumb">'/, '缩略图网格标记照旧');
  // 整个标签条路径不再有 clearCaseElementSuggestions 的空调用
  assert.doesNotMatch(source, /clearCaseElementSuggestions\(document\.getElementById\('upload-case-tag-bar'\)\)/);
  // 函数本体保留备用（没删代码），端点也照旧在
  assert.match(source, /async function requestCaseElementSuggestions\(root, file\) \{/);
  assert.match(source, /async function selectCaseElementSuggestionFile\(files\) \{/);
  assert.match(source, /function clearCaseElementSuggestions\(root\) \{/);
  assert.ok(existsSync(join(here, '..', 'functions', 'api', 'analyze-elements.js')), '端点本身不删（线上还在跑）');
  assert.ok(readFileSync(join(here, '..', 'functions', 'api', 'analyze-elements.js'), 'utf8').length > 0);
});

/* ── 2) 平台 / 国家 / 活动主题 三项必填（真跑校验函数）───────────────────── */

function loadValidate() {
  const context = vm.createContext({
    state: {lang: 'zh'},
    isCasePreviewFile: () => true,
    caseTagSelFirst: (sel, key) => {
      const value = (sel || {})[key];
      return Array.isArray(value) ? (value[0] || '') : (value || '');
    },
    flagMissingCaseTagRows: (bar, keys) => { context.__flagged = {bar: bar, keys: keys.slice()}; },
    // v922 起校验还要读上传网格里那个隐藏的 <select>；这里没有真实网格 ⇒ 返回 null 表示
    // 「没画出网格」，那条新校验自动跳过（本条测试只关心标签必填，行为不变）。
    caseUploadTypeValues: () => null,
    caseUploadUntypedIndexes: () => [],
    focusCaseDropUntyped: () => {},
    document: {getElementById: () => ({id: 'upload-case-tag-bar'})}
  });
  vm.runInContext(slice('  function validateCaseProjectUpload(previewFiles, formData, chipSel) {', '  function translateCaseSchemaError(error) {'), context);
  return context;
}

const baseForm = {title: '项目', owner_name: '小王'};
const formDataOf = (values) => ({get: (key) => values[key] || ''});
const previews = [{name: 'a.png', type: 'image/png'}];

test('v914/v934 必填：只缺活动主题 ⇒ 拦下上传，提示点名「活动主题」并把那一行标红', () => {
  const context = loadValidate();
  const chipSel = {tag1: 'C端', country: '沙特阿拉伯', strategy: 'picks'};
  assert.throws(
    () => context.validateCaseProjectUpload(previews, formDataOf(baseForm), chipSel),
    (error) => {
      assert.match(error.message, /活动主题/, '提示要说清缺的是活动主题');
      assert.doesNotMatch(error.message, /平台|国家|业务策略/, '已选的不要一起报出来');
      return true;
    }
  );
  assert.deepEqual(Array.from(context.__flagged.keys), ['activity'], '标红的行只有活动主题');
  assert.equal(context.__flagged.bar.id, 'upload-case-tag-bar', '标红画在上传标签面板上');
});

test('v914/v934 必填：四项都没选 ⇒ 四项一起点名；国家 + 活动主题缺 ⇒ 报这两项', () => {
  const context = loadValidate();
  assert.throws(() => context.validateCaseProjectUpload(previews, formDataOf(baseForm), {}), /平台、国家、活动主题和业务策略/);
  assert.deepEqual(Array.from(context.__flagged.keys), ['tag1', 'country', 'activity', 'strategy']);
  assert.throws(() => context.validateCaseProjectUpload(previews, formDataOf(baseForm), {tag1: 'C端'}), /请先选择国家、活动主题和业务策略，再上传。/);
  assert.deepEqual(Array.from(context.__flagged.keys), ['country', 'activity', 'strategy']);
});

test('v914/v934 必填：四项选齐就放行，且清掉红标（不再有缺项）', () => {
  const context = loadValidate();
  context.validateCaseProjectUpload(previews, formDataOf(baseForm), {tag1: 'C端', country: '沙特阿拉伯', activity: '足球', strategy: 'picks'});
  assert.deepEqual(Array.from(context.__flagged.keys), [], '没有缺项 ⇒ 标红列表为空');
  // 多选形态（活动主题是数组）也要认
  context.validateCaseProjectUpload(previews, formDataOf(baseForm), {tag1: 'C端', country: '沙特阿拉伯', activity: ['足球'], strategy: ['picks']});
  assert.deepEqual(Array.from(context.__flagged.keys), []);
});

test('v934 必填：**只缺业务策略**也要拦，并把「业务策略」这一行标红、文案点名它', () => {
  const context = loadValidate();
  assert.throws(
    () => context.validateCaseProjectUpload(previews, formDataOf(baseForm), {tag1: 'C端', country: '沙特阿拉伯', activity: '足球'}),
    (error) => {
      assert.match(error.message, /业务策略/, '提示要说清缺的是业务策略');
      assert.doesNotMatch(error.message, /平台|国家|活动主题/, '已选的不要一起报出来');
      return true;
    }
  );
  assert.deepEqual(Array.from(context.__flagged.keys), ['strategy'], '只标业务策略那一行');
});

test('v914 必填：只在上传新项目时拦 —— 编辑已有项目走的是别的保存路径', () => {
  const calls = source.match(/validateCaseProjectUpload\(/g) || [];
  assert.equal(calls.length, 2, '一次定义、一次调用（只有上传提交那一处）');
  const uploadPath = slice("      const chipSel = isCaseProject ? ((document.getElementById('upload-case-tag-bar') || {})._caseTagSel || {}) : {};", '  function validateCaseProjectUpload');
  assert.match(uploadPath, /if \(isCaseProject\) \{\s*\n\s*validateCaseProjectUpload\(previewFiles, formData, chipSel\);/,
    '只有「案例项目上传」这条分支才校验（图库/模板走 validateLibraryUpload）');
  assert.doesNotMatch(uploadPath, /validateCaseProjectUpload\([^)]*edit/i);
  // 编辑已有项目那块（案例编辑弹窗 / 行内编辑）不许出现这条校验
  const editBar = source.indexOf('data-case-edit-bar');
  assert.ok(editBar > 0, '案例编辑弹窗还在');
  assert.doesNotMatch(source.slice(editBar, editBar + 4000), /validateCaseProjectUpload/);
});

/* ── 3) 元素行：手选 + 自定义新增 ────────────────────────────────────────── */

function fakeElement() {
  return {
    dataset: {}, classList: {add() {}, remove() {}, toggle() {}}, style: {}, value: '', textContent: '', type: '', className: '',
    focus() {}, remove() {}, append() {}, insertBefore() {}, querySelector: () => null, querySelectorAll: () => []
  };
}

function loadElementRow() {
  const inserted = [];
  const input = fakeElement();
  const row = fakeElement();
  row.parentElement = {querySelectorAll: () => [], insertBefore: (chip) => inserted.push(chip)};
  row.querySelector = () => input;
  const pop = {querySelector: () => row};
  const context = vm.createContext({
    state: {lang: 'zh'},
    CASE_TAG_MULTI_KEYS: ['activity', 'strategy', 'element', 'format'],
    document: {createElement: () => fakeElement()},
    setTimeout: () => 0,
    libraryDisplayLabel: (value) => value,
    showCaseTagLimitTip: () => { context.__tip = true; },
    syncCaseTagBubbles: (root) => { context.__bubbles = root; },
    positionCaseTagPop: () => {},
    __inserted: inserted,
    __input: input,
    __pop: pop
  });
  vm.runInContext(slice('  var CASE_TAG_CUSTOM_KEYS', '  function caseTagCharUnits(code) {')
    + slice('  function caseTagSelHas(sel, key, value) {', '  function lastCaseUploadPlatform() {')
    + slice('  function caseTagCharUnits(code) {', '  // v853：超出字数限制时的小气泡提醒')
    + slice('  function addCaseTagCustomValue(root, pop, addBtn, rawValue, tagKey) {', '  // 向上翻时锚定整条标签栏顶部'), context);
  return context;
}

test('v914 元素行：本来就带了 ＋ 自定义输入（v826/v850 起），元素那一行确实有输入框和「添加」', () => {
  const {renderCaseTagChipGroups} = loadTagBar();
  const html = renderCaseTagChipGroups({});
  const elementRow = html.slice(html.indexOf('data-case-tag-row="element"'));
  assert.match(elementRow, /data-case-tag-custom-toggle data-case-tag-custom-key="element"/, '元素行有 ＋ 入口');
  assert.match(elementRow, /data-case-tag-custom-input data-case-tag-custom-key="element"/, '元素行有自定义输入框');
  assert.match(elementRow, /data-case-tag-custom-add data-case-tag-custom-key="element"/, '元素行有「添加」按钮');
  assert.match(source, /var CASE_TAG_CUSTOM_KEYS = \['element', 'activity', 'strategy'\];/, '自定义入口的键里含 element');
  assert.match(source, /pop\.addEventListener\('keydown', function\(event\) \{[\s\S]{0,400}?addCaseTagCustomValue\(root, pop, addBtn, input\.value, input\.dataset\.caseTagCustomKey \|\| 'element'\)/,
    '回车即添加（keydown Enter → addCaseTagCustomValue）');
});

test('v914 元素行：输入新词回车 = 添加进选择（等同 caseTagSelToggle），并重画气泡条', () => {
  const context = loadElementRow();
  const root = {_caseTagSel: {}};
  context.addCaseTagCustomValue(root, context.__pop, {}, '老虎', 'element');
  assert.deepEqual(Array.from(context.caseTagSelValues(root._caseTagSel, 'element')), ['老虎'], '新词进选择');
  assert.equal(context.__inserted.length, 1, '新词补成 chip 显示在那一行里');
  assert.equal(context.__inserted[0].dataset.caseTagValue, '老虎');
  assert.equal(context.__inserted[0].dataset.caseTagKey, 'element');
  assert.match(context.__inserted[0].className, /active/);
  assert.equal(context.__bubbles, root, '同步进气泡条');
  assert.equal(context.__input.value, '', '输入框清空，可以接着加下一个');
});

test('v914 元素行：再点一次同一个词 = 取消（toggle 语义与词表 chip 一致）', () => {
  const context = loadElementRow();
  const root = {_caseTagSel: {element: ['老虎']}};
  context.addCaseTagCustomValue(root, context.__pop, {}, '老虎', 'element');
  assert.deepEqual(Array.from(context.caseTagSelValues(root._caseTagSel, 'element')), [], '同一个词再来一次就取消掉');
});

test('v914 元素行：超长词被拦下（加权上限：中文 6 字 / 英文 12 字符），空词不动', () => {
  const context = loadElementRow();
  const root = {_caseTagSel: {}};
  context.addCaseTagCustomValue(root, context.__pop, {}, '六个汉字刚好', 'element');
  assert.deepEqual(Array.from(context.caseTagSelValues(root._caseTagSel, 'element')), ['六个汉字刚好'], '6 个汉字在限制内（现有的加权口径）');
  context.addCaseTagCustomValue(root, context.__pop, {}, '七个汉字就超了', 'element');
  assert.deepEqual(Array.from(context.caseTagSelValues(root._caseTagSel, 'element')), ['六个汉字刚好'], '7 个汉字超限，不加');
  assert.ok(context.__tip, '超限要有提示气泡');
  context.addCaseTagCustomValue(root, context.__pop, {}, '   ', 'element');
  assert.deepEqual(Array.from(context.caseTagSelValues(root._caseTagSel, 'element')), ['六个汉字刚好'], '空词什么都不做');
});

/* ── 4) 端点与脚本的 save 口径必须一致：manual_tags 都不进 ai_tags ───────── */

const previewId = '11111111-1111-4111-8111-111111111111';
const contentKey = 'p.png|12|2026-10-10T00:00:00Z';

async function saveViaEndpoint({tags, existing}) {
  const writes = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/auth/v1/user')) return Response.json({id: '22222222-2222-4222-8222-222222222222', app_metadata: {}, user_metadata: {}});
    if (value.includes('/rest/v1/vf_profiles')) return Response.json([{role: 'admin'}]);
    if (value.includes('/rest/v1/vf_asset_previews')) {
      return Response.json([{id: previewId, source_file_id: 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5', preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-10T00:00:00Z'}]);
    }
    if (value.includes('/rest/v1/vf_preview_ai_tags') && (init.method || 'GET') === 'GET') return Response.json([existing]);
    if (value.includes('/rest/v1/vf_preview_ai_tags') && init.method === 'POST') {
      const row = JSON.parse(init.body);
      writes.push(row);
      return Response.json([row]);
    }
    throw new Error('Unexpected request: ' + value);
  };
  try {
    const request = new Request('https://local.invalid/api/case-preview-ai-tags', {
      method: 'POST',
      headers: {Authorization: 'Bearer user-token', 'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'save', previewId, tags, model: 'glm-4v-flash', contentKey})
    });
    const response = await handleCasePreviewAiTags(request, {SUPABASE_URL: 'https://db.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service'});
    assert.equal(response.status, 200);
    return writes.at(-1);
  } finally {
    globalThis.fetch = original;
  }
}

const currentRow = {
  preview_id: previewId,
  ai_tags: ['旧标签'],
  manual_tags: ['kiki', '老虎'],
  excluded_tags: ['烤肉'],
  status: 'success'
};

test('v914 端点 save：模型认出的词里，人工标签与已排除标签都不写进 ai_tags', async () => {
  const row = await saveViaEndpoint({tags: ['kiki', '老虎', '烤肉', '餐桌'], existing: currentRow});
  assert.deepEqual(row.ai_tags, ['餐桌'], 'kiki/老虎 是人工标签、烤肉 已排除，只剩餐桌');
  assert.deepEqual(row.manual_tags, ['kiki', '老虎'], '人工标签原样保留、一个字都不动');
  assert.deepEqual(row.excluded_tags, ['烤肉'], '排除列原样保留');
  assert.equal(row.status, 'success');
});

test('v914 脚本 buildSuccessRow：与端点同一口径（同一个词不存两份）', () => {
  const preview = {id: previewId, source_file_id: currentRow.source_file_id || 'src', preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-10T00:00:00Z'};
  const row = buildSuccessRow({preview, tags: ['kiki', '老虎', '烤肉', '餐桌'], current: currentRow});
  assert.deepEqual(row.ai_tags, ['餐桌'], '和端点 save 逐字一致：人工词与排除词都刨掉');
  assert.deepEqual(row.manual_tags, ['kiki', '老虎'], '人工标签原样保留');
  assert.deepEqual(row.excluded_tags, ['烤肉']);
});

test('v914 两边口径一致：同一份 current + 同一批模型标签，端点与脚本产出同值的 ai_tags/manual_tags/excluded_tags', async () => {
  const cases = [
    {tags: ['kiki', '老虎', '烤肉', '餐桌'], existing: currentRow},
    {tags: ['kiki'], existing: currentRow},
    {tags: ['汉堡', '薯条'], existing: {preview_id: previewId, ai_tags: [], manual_tags: [], excluded_tags: [], status: 'idle'}},
    {tags: ['老虎', '老虎', '汉堡'], existing: currentRow},
    {tags: [], existing: currentRow}
  ];
  for (const item of cases) {
    const endpointRow = await saveViaEndpoint(item);
    const scriptRow = buildSuccessRow({
      preview: {id: previewId, source_file_id: 'src', preview_path: 'p.png', preview_size_bytes: 12, updated_at: '2026-10-10T00:00:00Z'},
      tags: item.tags,
      current: item.existing
    });
    assert.deepEqual(scriptRow.ai_tags, endpointRow.ai_tags, '模型标签：' + JSON.stringify(item.tags));
    assert.deepEqual(scriptRow.manual_tags, endpointRow.manual_tags);
    assert.deepEqual(scriptRow.excluded_tags, endpointRow.excluded_tags);
  }
});

test('v914 口径的源码锚点：两边都按 manual_tags 过滤（改动一处就会被这条抓住）', () => {
  const endpoint = readFileSync(join(here, '..', 'functions', 'api', 'case-preview-ai-tags.js'), 'utf8');
  const script = readFileSync(join(here, '..', 'scripts', 'recognize-case-tags.mjs'), 'utf8');
  // v926：两条过滤之间多了一行「人工动效层 manual_effect_tags」（人工的不进 AI 层），所以窗口放宽到 600
  assert.match(endpoint, /const manual = new Set\(base\.manual_tags\);[\s\S]{0,600}?cleanTags\(body\.tags\)\.filter\(tag => !excluded\.has\(tag\) && !manual\.has\(tag\)\)/);
  assert.match(script, /const manualSet = new Set\(manualTags\);[\s\S]{0,600}?cleanTags\(tags\)\.filter\(tag => !excludedSet\.has\(tag\) && !manualSet\.has\(tag\)\)/);
  // manual_tags / excluded_tags 照旧原样保留、绝不覆盖
  assert.match(endpoint, /manual_tags: cleanTags\(current\?\.manual_tags\)/);
  assert.match(script, /manual_tags: manualTags,/);
});

/* ── 5) 版本号 ──────────────────────────────────────────────────────────── */

test('v914 版本号六处同步', () => {
  const refs = indexSource.match(/\?v=20261015-canonical-query-v954/g) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处版本号');
  assert.match(source, /const TOOL_UI_VERSION = '20261015-canonical-query-v954'/);
});
