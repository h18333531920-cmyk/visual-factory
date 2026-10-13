import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseCaseTagGroups, parseCaseTagSuggestions, CASE_TAG_GROUP_MAX_IMAGES} from '../functions/_ai.js';
import {onRequest} from '../functions/api/analyze-elements.js';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const routeSource = readFileSync(new URL('../functions/api/analyze-elements.js', import.meta.url), 'utf8');
const aiSource = readFileSync(new URL('../functions/_ai.js', import.meta.url), 'utf8');

const VOCAB = ['牛排', '餐桌', '烤肉', 'kiki'];
const ACTIVITIES = ['聚餐', '开斋节', '夏日'];

// ── 1. 解析：多图组识别只多返回一个 sameDesign，elements / activity 与逐图同一口径 ──
test('v906 解析：正常 JSON 给出 elements / activity / sameDesign', () => {
  const out = parseCaseTagGroups('{"sameDesign":true,"elements":["餐桌","牛排"],"activity":"聚餐"}', VOCAB, ACTIVITIES);
  assert.deepEqual(out, {elements: ['餐桌', '牛排'], activity: '聚餐', sameDesign: true});
});

test('v906 解析：代码块 / 前后夹解释都认；sameDesign 明确 false 照实返回', () => {
  assert.equal(parseCaseTagGroups('```json\n{"sameDesign":true,"elements":["牛排"]}\n```', VOCAB).sameDesign, true);
  const wrapped = parseCaseTagGroups('好的，我看了这两张：{"sameDesign":false,"elements":["牛排"],"activity":"聚餐"} 完毕。', VOCAB, ACTIVITIES);
  assert.equal(wrapped.sameDesign, false);
  assert.deepEqual(wrapped.elements, ['牛排']);
});

test('v906 解析：sameDesign 缺失 / 解析不出 / 怪值一律当「不同组」（拿不准就不合并）', () => {
  assert.equal(parseCaseTagGroups('{"elements":["牛排"],"activity":"聚餐"}', VOCAB).sameDesign, false, '缺字段 → false');
  assert.equal(parseCaseTagGroups('牛排、餐桌', VOCAB).sameDesign, false, '没有 JSON → false');
  assert.equal(parseCaseTagGroups('', VOCAB).sameDesign, false, '空文本 → false');
  assert.equal(parseCaseTagGroups('{"sameDesign":"maybe","elements":["牛排"]}', VOCAB).sameDesign, false, '怪值 → false');
  assert.equal(parseCaseTagGroups('{"sameDesign":"true","elements":["牛排"]}', VOCAB).sameDesign, true, '字符串 true 也认');
  assert.equal(parseCaseTagGroups('{"sameDesign":false,"elements":["牛排"]}', VOCAB).sameDesign, false);
});

test('v906 解析：elements 超 5 字丢弃、词表内的用词表写法、词表外的照常保留', () => {
  const out = parseCaseTagGroups('{"sameDesign":true,"elements":["这是一个很长的描述词","牛排","汉堡","KIKI"]}', VOCAB);
  assert.deepEqual(out.elements, ['牛排', '汉堡', 'kiki'], '超 5 字丢掉；词表外保留；KIKI 归到库内写法 kiki');
  assert.equal(out.sameDesign, true);
});

test('v906 解析：activity 清洗与 elements/activity 一致性与 parseCaseTagSuggestions 逐字相同', () => {
  const text = '{"sameDesign":true,"elements":["足球","球员"],"activity":"「 足球 」"}';
  const grouped = parseCaseTagGroups(text, VOCAB, ACTIVITIES);
  const single = parseCaseTagSuggestions(text, VOCAB, ACTIVITIES);
  assert.deepEqual(grouped.elements, single.elements, 'elements 与逐图解析完全一致');
  assert.deepEqual(grouped.activity, single.activity, 'activity 与逐图解析完全一致');
  assert.deepEqual(grouped.elements, ['球员'], 'activity 与元素重复时从 elements 里剔除（沿用现有行为）');
  assert.equal(grouped.activity, '足球');
  assert.equal(parseCaseTagGroups('{"sameDesign":true,"elements":["牛排"]}', VOCAB).activity, '', '推不出主题就空字符串');
});

// ── 2. 端点：支持 images 多图组识别，单图老路径一字不变 ──
test('v906 端点源码：images 多图分支 + 体积上限 + 单图老路径都在', () => {
  assert.match(routeSource, /import \{ analyzeCaseTagGroupsWithGlm, analyzeCaseTagsWithGlm \} from '\.\.\/_ai\.js'/);
  assert.match(routeSource, /const images = \(Array\.isArray\(body\.images\) \? body\.images : \[\]\)/);
  assert.match(routeSource, /analyzeCaseTagGroupsWithGlm\(env, images, body\.vocabulary, body\.activities\)/);
  assert.match(routeSource, /sameDesign: grouped\.sameDesign/);
  assert.match(routeSource, /GROUP_IMAGES_MIN = 2/);
  assert.match(routeSource, /GROUP_IMAGES_MAX = 4/);
  assert.match(routeSource, /GROUP_IMAGE_MAX_BYTES = 1\.5 \* 1024 \* 1024/);
  assert.match(routeSource, /GROUP_TOTAL_MAX_BYTES = 4 \* 1024 \* 1024/);
  assert.match(routeSource, /413/, '超体积要返回 413');
  assert.match(routeSource, /function imageByteLength\(value\)/);
  // 单图老路径必须原样保留（v767 的断言也盯这一行）
  assert.match(routeSource, /analyzeCaseTagsWithGlm\(env, body\.image, body\.vocabulary, body\.activities\)/);
  assert.match(routeSource, /elements: result\.elements, activity: result\.activity \}/);
});

test('v906 _ai.js 源码：多图提示词要求先判同设计再给一套共同标签，最多 4 张', () => {
  assert.match(aiSource, /export async function analyzeCaseTagGroupsWithGlm\(env, images, vocabulary, activityVocabulary = \[\]\)/);
  assert.match(aiSource, /export function parseCaseTagGroups\(text, vocabulary = \[\], activities = \[\]\)/);
  assert.match(aiSource, /同一条物料的不同语言版本/);
  assert.match(aiSource, /一套覆盖这些图的共同元素标签/);
  assert.match(aiSource, /"sameDesign":true,"elements":\["餐桌","牛排"\],"activity":"聚餐"/);
  assert.match(aiSource, /CASE_TAG_GROUP_MAX_IMAGES = 4/);
  assert.equal(CASE_TAG_GROUP_MAX_IMAGES, 4);
  // 逐图那套提示词与解析调用不许被改
  assert.match(aiSource, /parseCaseTagSuggestions\(text, words, activities\)/);
});

function mockGlm(content, capture) {
  return async (url, init = {}) => {
    const value = String(url);
    if (value.includes('/auth/v1/user')) return Response.json({id: 'user-a'});
    if (value.includes('open.bigmodel.cn')) {
      if (capture) capture.push(JSON.parse(init.body));
      return Response.json({choices: [{message: {content: content}}]});
    }
    throw new Error('Unexpected request: ' + value);
  };
}

const env = {SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', GLM_API_KEY: 'glm-key'};
const tinyImage = 'data:image/jpeg;base64,' + 'A'.repeat(120);

function glmRequest(body) {
  return new Request('https://local.invalid/api/analyze-elements', {
    method: 'POST',
    headers: {Authorization: 'Bearer token', 'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
}

async function callWithFetch(mock, body) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    const response = await onRequest({request: glmRequest(body), env});
    return {status: response.status, data: await response.json()};
  } finally {
    globalThis.fetch = original;
  }
}

test('v906 端点：images 走组识别，两张图 + 一段提示词一起发给视觉模型，返回 sameDesign', async () => {
  const requests = [];
  const mock = mockGlm('{"sameDesign":true,"elements":["牛排","餐桌"],"activity":"聚餐"}', requests);
  const response = await callWithFetch(mock, {images: [tinyImage, tinyImage], vocabulary: VOCAB, activities: ACTIVITIES});

  assert.equal(response.status, 200);
  assert.equal(response.data.success, true);
  assert.deepEqual(response.data.elements, ['牛排', '餐桌']);
  assert.equal(response.data.activity, '聚餐');
  assert.equal(response.data.sameDesign, true);
  const content = requests.at(-1).messages[0].content;
  assert.equal(content.filter((part) => part.type === 'image_url').length, 2, '两张图要放在同一条消息里');
  const prompt = content.filter((part) => part.type === 'text').map((part) => part.text).join('');
  assert.match(prompt, /同一条物料的不同语言版本/);
  assert.match(prompt, /优先使用这份现有词表的写法/);
  assert.match(prompt, /牛排/);
});

test('v906 端点：单图 image 老路径不变（只发一张图、不带 sameDesign）', async () => {
  const requests = [];
  const mock = mockGlm('{"elements":["牛排"],"activity":"聚餐"}', requests);
  const response = await callWithFetch(mock, {image: tinyImage, vocabulary: VOCAB, activities: ACTIVITIES});

  assert.equal(response.status, 200);
  assert.equal(response.data.element, undefined);
  assert.deepEqual(response.data.elements, ['牛排']);
  assert.equal(response.data.activity, '聚餐');
  assert.equal(response.data.sameDesign, undefined, '单图不返回 sameDesign');
  const content = requests.at(-1).messages[0].content;
  assert.equal(content.filter((part) => part.type === 'image_url').length, 1);
});

test('v906 端点：组识别张数必须是 2–4 张', async () => {
  const requests = [];
  const mock = mockGlm('{"sameDesign":true,"elements":[]}', requests);
  const tooFew = await callWithFetch(mock, {images: [tinyImage], vocabulary: VOCAB});
  assert.equal(tooFew.status, 400);
  assert.match(tooFew.data.message, /2–4 张图片/);
  const tooMany = await callWithFetch(mock, {images: Array.from({length: 5}, () => tinyImage)});
  assert.equal(tooMany.status, 400);
  assert.equal(requests.length, 0, '张数不对时不该调模型');
});

test('v906 端点：单张超 1.5MB / 合计超 4MB 返回 413（提示改用缩略图）', async () => {
  const requests = [];
  const mock = mockGlm('{"sameDesign":true,"elements":[]}', requests);
  // base64 长度 ≈ 字节数 × 4/3；这里各造 ~1.6MB 与 ~1.45MB 的图
  const big = 'data:image/jpeg;base64,' + 'A'.repeat(Math.ceil(1.6 * 1024 * 1024 / 3) * 4);
  const perImage = await callWithFetch(mock, {images: [big, tinyImage]});
  assert.equal(perImage.status, 413);
  assert.match(perImage.data.message, /1\.5MB/);

  const medium = 'data:image/jpeg;base64,' + 'A'.repeat(Math.ceil(1.45 * 1024 * 1024 / 3) * 4);
  const total = await callWithFetch(mock, {images: [medium, medium, medium]});
  assert.equal(total.status, 413, '每张没超但合计超 4MB 也要拦');
  assert.match(total.data.message, /4MB/);
  assert.equal(requests.length, 0, '体积超限时不该调模型');
});

// ── 3. 配对：只做保守配对（同项目 + 语言互补 + 同类型 + 同尺寸 + 同编号）──
const blockStart = source.indexOf('  // 检索词本身就是一个物料类型时');
const blockEnd = source.indexOf('  function recentCaseOwnerNames()');
assert.ok(blockStart > 0 && blockEnd > blockStart, '配对 + 铺开代码块必须存在');

function loadGrouping(languageOf) {
  const context = vm.createContext({
    state: {libraryPreviews: []},
    // 语言判定在真实代码里走 caseMaterialLanguage（库里存的 > 文件名兜底），这里按 preview.language 桩掉
    caseMaterialLanguage: languageOf || ((preview) => String((preview && preview.language) || '')),
  });
  vm.runInContext(source.slice(blockStart, blockEnd)
    + '\n;({ casePreviewAiGroupsOf, caseFilenameGroupKey, caseSameDesignSignals, casePreviewGroupRepresentative })', context);
  return context;
}

const en = (over = {}) => Object.assign({id: 'en1', preview_filename: 'steak_en.jpg', material_type: '弹窗', width: 1080, height: 1920, language: 'en'}, over);
const ar = (over = {}) => Object.assign({id: 'ar1', preview_filename: 'steak_ar.jpg', material_type: '弹窗', width: 1080, height: 1920, language: 'ar'}, over);

test('v906 配对：同项目 EN + AR（同类型同尺寸同编号）→ 一组 2 张', () => {
  const context = loadGrouping();
  const enPreview = en();
  const arPreview = ar();
  const groups = context.casePreviewAiGroupsOf([enPreview, arPreview]);

  assert.equal(groups.length, 1);
  assert.deepEqual(Array.from(groups[0].members, (p) => p.id), ['en1', 'ar1'], '成员保持传入顺序');
  assert.equal(typeof groups[0].key, 'string');
  assert.equal(context.casePreviewGroupRepresentative(groups[0].members), enPreview, '代表图优先英文版');
});

test('v906 配对：语言相同 / 语言为空 / none 都不成组（各自单成员组，一个不丢）', () => {
  const context = loadGrouping();
  const sameBothEn = context.casePreviewAiGroupsOf([en({id: 'a'}), en({id: 'b', preview_filename: 'steak_en2.jpg'})]);
  assert.deepEqual(Array.from(sameBothEn, (group) => group.members.length), [1, 1], '两张都是 en → 不配对');

  const unknown = context.casePreviewAiGroupsOf([en({id: 'a', language: ''}), ar({id: 'b', language: ''})]);
  assert.deepEqual(Array.from(unknown, (group) => group.members.length), [1, 1], '语言判不出来一律不猜');

  const none = context.casePreviewAiGroupsOf([en({id: 'a', language: 'none'}), ar({id: 'b', language: 'none'})]);
  assert.deepEqual(Array.from(none, (group) => group.members.length), [1, 1], '语言 none 同样不配对');
});

test('v906 配对：类型不同 / 编号不同 / 尺寸不同都不成组', () => {
  const context = loadGrouping();
  const typeDiff = context.casePreviewAiGroupsOf([en(), ar({material_type: '头图'})]);
  assert.deepEqual(Array.from(typeDiff, (group) => group.members.length), [1, 1], '物料类型不同不配对');

  const numberDiff = context.casePreviewAiGroupsOf([en(), ar({preview_filename: 'steak2_ar.jpg'})]);
  assert.deepEqual(Array.from(numberDiff, (group) => group.members.length), [1, 1], '编号不同不配对（禁止删掉数字强行合并）');

  const sizeDiff = context.casePreviewAiGroupsOf([en(), ar({width: 720, height: 1280})]);
  assert.deepEqual(Array.from(sizeDiff, (group) => group.members.length), [1, 1], '尺寸不同不配对');
});

test('v906 配对：文件名主体去掉语言标记后一致才算同编号；数字编号保留', () => {
  const context = loadGrouping();
  assert.equal(context.caseFilenameGroupKey('Steak-EN.jpg'), context.caseFilenameGroupKey('steak_ar.png'));
  assert.equal(context.caseFilenameGroupKey('poster_01_en.jpg'), context.caseFilenameGroupKey('poster_01_AR.jpg'));
  assert.notEqual(context.caseFilenameGroupKey('poster_01_en.jpg'), context.caseFilenameGroupKey('poster_02_ar.jpg'));
  assert.equal(context.caseFilenameGroupKey('EN.png'), '', '只有语言标记时主体为空');
  assert.equal(context.caseFilenameGroupKey(''), '');
});

test('v906 配对：一边缺尺寸时不比尺寸（但不放宽类型/编号）', () => {
  const context = loadGrouping();
  const noSize = context.casePreviewAiGroupsOf([en({width: 0, height: 0}), ar()]);
  assert.equal(noSize.length, 1, '缺尺寸不比尺寸，其它条件满足就成组');
  const stillTypeDiff = context.casePreviewAiGroupsOf([en({width: 0, height: 0}), ar({material_type: '头图'})]);
  assert.deepEqual(Array.from(stillTypeDiff, (group) => group.members.length), [1, 1], '缺尺寸不能用来放宽类型');
});

test('v906 配对：5 张同款至少分成两组、每组 ≤4、一个成员都不丢', () => {
  const context = loadGrouping();
  const list = [
    en({id: 'en1', preview_filename: 'steak_en.jpg'}),
    ar({id: 'ar1', preview_filename: 'steak_ar.jpg'}),
    ar({id: 'ar2', preview_filename: 'steak_ar2.jpg'}),
    ar({id: 'ar3', preview_filename: 'steak_ar3.jpg'}),
    ar({id: 'ar4', preview_filename: 'steak_ar4.jpg'}),
  ];
  // ar2/ar3/ar4 的文件名主体带数字，会被判成不同编号 ⇒ 用同编号的一批来测上限
  const sameKey = [
    en({id: 'en1'}), ar({id: 'ar1'}), ar({id: 'ar2'}), ar({id: 'ar3'}), en({id: 'en2'}),
  ];
  const groups = context.casePreviewAiGroupsOf(sameKey);
  assert.ok(groups.length >= 2, '5 张要至少分成两组');
  assert.ok(groups.every((group) => group.members.length <= 4), '一组最多 4 张');
  const ids = groups.flatMap((group) => Array.from(group.members, (p) => p.id));
  assert.deepEqual(Array.from(ids).sort(), Array.from(sameKey, (p) => p.id).sort(), '所有成员都在某个组里');

  const numbered = context.casePreviewAiGroupsOf(list);
  assert.deepEqual(Array.from(numbered, (group) => group.members.length), [2, 1, 1, 1], '编号不同各自单飞（只有编号一致的 steak_en/steak_ar 成组）');
  assert.deepEqual(Array.from(numbered[0].members, (p) => p.id), ['en1', 'ar1']);
});

// ── 4. 展示：同组命中只出一张卡（默认英文版），带 languageGroupSize ──
function loadCollapse(options = {}) {
  const tagsById = options.tagsById || {};
  const project = options.project || {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const previews = options.previews || [];
  const calls = [];
  const context = vm.createContext({
    state: {
      libraryFilters: Object.assign({query: '', tag2: 'all'}, options.filters || {}),
      libraryPreviews: previews,
    },
    materialCatalogTypeNames: () => [],
    LIBRARY_SEARCH_PINYIN: {},
    LIBRARY_SEARCH_EN_EXTRA: {},
    LIBRARY_LABELS_EN: {},
    caseMaterialTypeSet: () => null,
    projectMatchesType: () => false,
    caseCoverFor: (src, typeValue) => {
      calls.push({coverFor: [src.id, typeValue]});
      return options.cover || null;
    },
    casePreviewAiTags: (id) => tagsById[id] || [],
    isCaseProject: (s) => !!s && s.caseProject === true,
    caseMaterialLanguage: options.caseMaterialLanguage || (() => ''),
  });
  vm.runInContext(source.slice(blockStart, blockEnd)
    + '\n;({ collapseCaseProjectItems, caseMaterialMatchesQuery })', context);
  return {context, calls, project};
}

function itemsFor(project, previews) {
  return previews.map((preview) => ({
    preview,
    source: project,
    url: 'url:' + preview.id,
    thumbUrl: 'thumb:' + preview.id,
  }));
}

const languageOf = (preview) => String((preview && preview.language) || '');

test('v906 展示：搜「牛排」时同款 EN + AR 都命中 → 只出 1 张卡且是英文版，languageGroupSize = 2', () => {
  const previews = [en({id: 'en1'}), ar({id: 'ar1'})];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context} = loadCollapse({
    previews,
    tagsById: {en1: ['牛排'], ar1: ['牛排']},
    filters: {query: '牛排'},
    caseMaterialLanguage: languageOf,
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.equal(out.length, 1, '同一组只占一个位置');
  assert.equal(out[0].preview.id, 'en1', '默认展示英文版那张');
  assert.equal(out[0].languageGroupSize, 2, '卡片要带上这组有几张');
  assert.equal(out[0].isCaseProjectCard, true);
});

test('v906 展示：命中分属不同组 → 各出一张（2 张）', () => {
  const previews = [
    en({id: 'en1'}),
    ar({id: 'ar1', material_type: '头图'}),
  ];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context} = loadCollapse({
    previews,
    tagsById: {en1: ['牛排'], ar1: ['牛排']},
    filters: {query: '牛排'},
    caseMaterialLanguage: languageOf,
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['en1', 'ar1']);
  assert.ok(out.every((item) => item.languageGroupSize === 1));
});

test('v906 展示：同组里只有 AR 命中时出 AR 那张（EN 没命中就不占位）', () => {
  const previews = [en({id: 'en1'}), ar({id: 'ar1'})];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context} = loadCollapse({
    previews,
    tagsById: {ar1: ['烤肉']},
    filters: {query: '烤肉'},
    caseMaterialLanguage: languageOf,
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['ar1']);
  assert.equal(out[0].languageGroupSize, 1);
});

test('v906 展示：EN + AR 都命中但标签不同（只有一张含两个词）也照组占位', () => {
  const previews = [en({id: 'en1'}), ar({id: 'ar1'})];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context} = loadCollapse({
    previews,
    // 组识别写的是同一套标签，所以两版都该命中「牛排 餐桌」
    tagsById: {en1: ['牛排', '餐桌'], ar1: ['牛排', '餐桌']},
    filters: {query: '牛排 餐桌'},
    caseMaterialLanguage: languageOf,
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.equal(out.length, 1);
  assert.equal(out[0].preview.id, 'en1');
  assert.equal(out[0].languageGroupSize, 2);
});

test('v906 展示：无关键词 → 仍只出一张项目卡（回归保护）', () => {
  const previews = [en({id: 'en1'}), ar({id: 'ar1'})];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context, calls} = loadCollapse({
    previews,
    tagsById: {en1: ['牛排'], ar1: ['牛排']},
    filters: {query: ''},
    cover: {cover: previews[0], group: previews},
    caseMaterialLanguage: languageOf,
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.equal(out.length, 1);
  assert.equal(out[0].languageGroupSize, undefined, '没走铺开就不能带 languageGroupSize');
  assert.equal(calls.filter((call) => call.coverFor).length, 1);
});

test('v906 卡片角标：多语言版有低风险的「· 多语言版 N」追加', () => {
  assert.match(source, /item\.languageGroupSize > 1 \? \(state\.lang === 'zh' \? ' · 多语言版 ' \+ item\.languageGroupSize/);
});

// ── 5. 组识别流程（源码断言）──
test('v906 组识别：先分组、POST 带 images、组内每张都写同一套标签', () => {
  assert.match(source, /const groups = wanted\s*\n\s*\? eligible\.map\(function\(preview\) \{ return \{key: casePreviewGroupKey\(preview\), members: \[preview\]\}; \}\)\s*\n\s*: casePreviewAiGroupsOf\(eligible\);/,
    'onlyIds（只补新的）不配对，其余按 casePreviewAiGroupsOf 分组');
  assert.match(source, /async function recognizeCasePreviewAiGroup\(source, group, run\) \{/);
  assert.match(source, /data = await postAnalyze\(\{images: images, vocabulary: vocabulary, activities: activities\}\);\s*\n\s*\} catch \(_groupError\) \{/,
    '多成员组才带 images 走组识别（失败时进逐张兜底）');
  assert.match(source, /usedFallback = true;/);
  assert.match(source, /data = await postAnalyze\(\{image: images\[0\], vocabulary: vocabulary, activities: activities\}\);/,
    '单成员组仍走单图字段（老路径）');
  assert.match(source, /\(usedFallback \? '-group-fallback' : '-group'\) : ''\)/, '兜底那组的 model 要能区分出来');
  assert.match(source, /for \(const preview of members\) \{\s*\n\s*row = await postCasePreviewAiTagAction\(\{\s*\n\s*action: 'save', previewId: preview\.id, tags: elements,/,
    '组内每张都写同一套 elements');
  assert.match(source, /run\.success \+= group\.members\.length/, '成功数按图片张数记');
  assert.match(source, /run\.failed \+= group\.members\.length;\s*\n\s*group\.members\.forEach\(function\(preview\) \{ run\.failedIds\.push\(preview\.id\); \}\);/,
    '组失败 → 组内各成员都记失败');
  assert.match(source, /const markFailed = async function\(message\) \{/, '失败只改状态，不清空原有标签');
  assert.match(source, /if \(images\.length > 1 && !usedFallback && data\.sameDesign === false\) run\.sameDesignMismatch \+= 1;/);
  assert.match(source, /有 ' \+ run\.sameDesignMismatch \+ ' 组被判为不同设计，建议复核/, 'sameDesign=false 要在结果里提示，不静默丢弃');
  assert.doesNotMatch(source, /recognizeCasePreviewAiTags\(/, '旧的逐图识别函数已被组识别取代');
});

test('v906 组识别：进度按「第 x/y 组 · 共 n 张」、跑完仍刷新该项目的逐图标签', () => {
  assert.match(source, /'第 ' \+ groupDone \+ '\/' \+ run\.groupsTotal \+ ' 组 · 共 ' \+ run\.total \+ ' 张 · '/);
  assert.match(source, /groupsTotal: groups\.length, groupsDone: 0, sameDesignMismatch: 0, groupFallbacks: 0/);
  assert.match(source, /await loadPreviewAiTagsForSource\(source\.id\)/, '完成后仍按项目刷新逐图标签');
  assert.match(source, /Promise\.all\(\[worker\(\), worker\(\)\]\)/);
});
