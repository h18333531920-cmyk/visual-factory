import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const blockStart = source.indexOf('  // 检索词本身就是一个物料类型时');
const blockEnd = source.indexOf('  function recentCaseOwnerNames()');
assert.ok(blockStart > 0 && blockEnd > blockStart, '物料级命中 + collapseCaseProjectItems 代码块必须存在');

// 端到端那条：真实的搜索文本聚合 + 命中排名 + 铺开，三段一起跑
const searchStart = source.indexOf('  // v903 逐图元素标签聚合');
const searchEnd = source.indexOf('  // v829 搜索词扩展');
const rankStart = source.indexOf('  function libraryItemQueryMatchRank(item, query, expansionTerms) {');
const rankEnd = source.indexOf('  function libraryItemMatchesQuery(item, query) {');
assert.ok(searchStart > 0 && searchEnd > searchStart, '搜索文本聚合代码块必须存在');
assert.ok(rankStart > 0 && rankEnd > rankStart, 'libraryItemQueryMatchRank 必须存在');

// 把 collapseCaseProjectItems / caseMaterialMatchesQuery 切出来跑：外层依赖（案例判定 / 封面 / 逐图标签）全部用假的塞进去
function loadCollapse(options = {}) {
  const tagsById = options.tagsById || {};
  const catalogTypes = options.catalogTypes || [];
  const project = options.project || {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const previews = options.previews || [];
  const calls = [];
  const context = vm.createContext({
    state: {
      libraryFilters: Object.assign({query: '', tag2: 'all'}, options.filters || {}),
      libraryPreviews: previews,
    },
    materialCatalogTypeNames: () => catalogTypes,
    LIBRARY_SEARCH_PINYIN: {},
    LIBRARY_SEARCH_EN_EXTRA: {},
    LIBRARY_LABELS_EN: {},
    caseMaterialTypeSet: (value) => {
      const name = String(value || '').trim();
      return name && catalogTypes.indexOf(name) >= 0 ? [name] : null;
    },
    projectMatchesType: options.projectMatchesType || (() => false),
    caseCoverFor: (src, typeValue) => {
      calls.push({coverFor: [src.id, typeValue]});
      return options.cover || null;
    },
    casePreviewAiTags: (id) => tagsById[id] || [],
    isCaseProject: options.isCaseProject || ((s) => !!s && s.caseProject === true),
    // v906 起铺开前会先按「同款语言互补」配对（casePreviewAiGroupsOf）。
    // 这份用例的物料都没有语言证据，桩成空字符串 ⇒ 一律单成员组，行为与 v904 逐字一致。
    caseMaterialLanguage: options.caseMaterialLanguage || (() => ''),
    // v909 起铺开还要看「选中的物料类别筛选」（案例库里就是 tag2 那些值）
    selectedLibraryTagValues: options.selectedLibraryTagValues || (() => []),
  });
  vm.runInContext(source.slice(blockStart, blockEnd)
    + '\n;({ collapseCaseProjectItems, caseMaterialMatchesQuery, casePreviewAiMatchesQuery })', context);
  return {context, calls, project};
}

function itemsFor(project, previews) {
  return previews.map((preview) => ({
    preview,
    source: project,
    url: 'url:' + preview.preview_path,
    thumbUrl: 'thumb:' + preview.preview_path,
  }));
}

test('v904 有关键词：项目里带该标签的多张物料各自铺开一张卡', () => {
  const previews = [
    {id: 'm1', preview_filename: 'a.png', material_type: '弹窗', preview_path: 'a.png'},
    {id: 'm2', preview_filename: 'b.png', material_type: '头图', preview_path: 'b.png'},
    {id: 'm3', preview_filename: 'c.png', material_type: '楼层条', preview_path: 'c.png'},
  ];
  const {context, project, calls} = loadCollapse({
    previews,
    tagsById: {m1: ['披萨', '美食'], m2: ['餐桌'], m3: ['披萨']},
    filters: {query: '披萨'},
    cover: {cover: previews[1], group: previews},
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.equal(out.length, 2, '第 1、3 张命中 ⇒ 铺开 2 张卡，不再只留一张代表图');
  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['m1', 'm3'], '顺序按 items 原始顺序');
  assert.ok(out.every((item) => item.isCaseProjectCard === true), '铺开的每张都仍是案例项目卡');
  assert.ok(out.every((item) => item.source === project), '卡片仍挂回原项目');
  assert.deepEqual(Array.from(out, (item) => item.url), ['url:a.png', 'url:c.png'], 'URL / 缩略图跟随该物料自己那张');
  assert.deepEqual(Array.from(out, (item) => item.thumbUrl), ['thumb:a.png', 'thumb:c.png']);
  assert.equal(calls.filter((call) => call.coverFor).length, 0, '铺开时不该再去挑项目封面');
});

test('v904 物料级命中：不靠封面那张也能铺开（封面物料本身没命中）', () => {
  const previews = [
    {id: 'cover', preview_filename: 'header.png', material_type: '头图', preview_path: 'header.png'},
    {id: 'popup', preview_filename: 'popup.png', material_type: '弹窗', preview_path: 'popup.png'},
  ];
  const {context, project} = loadCollapse({
    previews,
    tagsById: {popup: ['披萨']},
    filters: {query: '披萨'},
    cover: {cover: previews[0], group: previews},
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['popup'], '只铺开真正命中的那张');
  assert.equal(out[0].isCaseProjectCard, true);
});

test('v904 项目级命中但一张物料都没命中：保持原来的「一个项目一张卡」', () => {
  const previews = [
    {id: 'm1', preview_filename: 'a.png', material_type: '弹窗', preview_path: 'a.png'},
    {id: 'm2', preview_filename: 'b.png', material_type: '头图', preview_path: 'b.png'},
  ];
  const {context, calls} = loadCollapse({
    previews,
    // 关键词只出现在项目名里，逐图标签与物料文本都不含
    project: {id: 'p1', title: '披萨节 Ramadan', tags: [], caseProject: true},
    tagsById: {m1: ['美食'], m2: ['餐桌']},
    filters: {query: '披萨'},
    cover: {cover: previews[1], group: previews},
  });
  const out = context.collapseCaseProjectItems(itemsFor({id: 'p1', title: '披萨节 Ramadan', tags: [], caseProject: true}, previews));

  assert.equal(out.length, 1, '没有物料级命中 ⇒ 仍只出一张项目卡');
  assert.equal(out[0].preview.id, 'm2', '走原来的封面逻辑');
  assert.equal(out[0].isCaseProjectCard, true);
  assert.equal(calls.filter((call) => call.coverFor).length, 1, '退回一次 caseCoverFor 挑封面');
});

test('v904 无关键词：一个项目只出一张卡（回归保护）', () => {
  const previews = [
    {id: 'm1', preview_filename: 'a.png', material_type: '弹窗', preview_path: 'a.png'},
    {id: 'm2', preview_filename: 'b.png', material_type: '头图', preview_path: 'b.png'},
    {id: 'm3', preview_filename: 'c.png', material_type: '楼层条', preview_path: 'c.png'},
  ];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context} = loadCollapse({
    previews,
    tagsById: {m1: ['披萨'], m3: ['披萨']},
    filters: {query: ''},
    cover: {cover: previews[0], group: previews},
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.equal(out.length, 1, '没有关键词时逐图标签不参与铺开');
  assert.equal(context.caseMaterialMatchesQuery(itemsFor(project, previews)[0], ''), false, '空关键词一律不算物料级命中');
  assert.equal(context.caseMaterialMatchesQuery(itemsFor(project, previews)[0], '   '), false);
});

test('v904 物料类型 / 文件名命中也能铺开', () => {
  const previews = [
    {id: 'm1', preview_filename: 'splash_open.png', material_type: '开机海报', preview_path: 'splash_open.png'},
    {id: 'm2', preview_filename: 'hero_shot.png', material_type: '头图', preview_path: 'hero_shot.png'},
    {id: 'm3', preview_filename: 'popup.png', material_type: '弹窗', preview_path: 'popup.png'},
  ];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const tagsById = {};

  const byType = loadCollapse({previews, tagsById, filters: {query: '开机海报'}, catalogTypes: ['开机海报', '头图', '弹窗']});
  assert.deepEqual(
    Array.from(byType.context.collapseCaseProjectItems(itemsFor(project, previews)), (item) => item.preview.id),
    ['m1'],
    '按物料类型命中 ⇒ 铺开那张'
  );

  const byFilename = loadCollapse({previews, tagsById, filters: {query: 'hero shot'}, catalogTypes: ['开机海报', '头图', '弹窗']});
  assert.deepEqual(
    Array.from(byFilename.context.collapseCaseProjectItems(itemsFor(project, previews)), (item) => item.preview.id),
    ['m2'],
    '文件名片段命中 ⇒ 铺开那张（下划线按空白分词后两词都在同一张物料里）'
  );

  const miss = loadCollapse({previews, tagsById, filters: {query: '开机弹窗'}, catalogTypes: ['开机海报', '头图', '弹窗']});
  assert.equal(miss.context.caseMaterialMatchesQuery(itemsFor(project, previews)[0], '开机弹窗'), false, '两个词不在同一张物料里 ⇒ 不算命中');
});

test('v904 多词关键词：两个词必须落在同一张物料的文本里，不许跨图拼凑', () => {
  const previews = [
    {id: 'm1', preview_filename: 'a.png', material_type: '弹窗', preview_path: 'a.png'},
    {id: 'm2', preview_filename: 'b.png', material_type: '头图', preview_path: 'b.png'},
    {id: 'm3', preview_filename: 'c.png', material_type: '楼层条', preview_path: 'c.png'},
  ];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context} = loadCollapse({
    previews,
    tagsById: {m1: ['披萨'], m2: ['餐桌'], m3: ['披萨', '餐桌', '美食']},
    filters: {query: '披萨 餐桌'},
    cover: {cover: previews[0], group: previews},
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['m3'], '只有同时含两个词的那张铺开');
  assert.equal(context.caseMaterialMatchesQuery(itemsFor(project, previews)[0], '披萨 餐桌'), false, '同一张图只含一个词时也不算命中');
  assert.equal(context.caseMaterialMatchesQuery(itemsFor(project, previews)[2], '披萨 餐桌'), true, '两个词都在同一张物料里才算命中');
});

test('v904 同一项目只处理一次：多张命中不会重复 push 同一张物料', () => {
  const previews = [
    {id: 'm1', preview_filename: 'a.png', material_type: '弹窗', preview_path: 'a.png'},
    {id: 'm2', preview_filename: 'b.png', material_type: '弹窗', preview_path: 'b.png'},
  ];
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const {context} = loadCollapse({
    previews,
    tagsById: {m1: ['披萨'], m2: ['披萨']},
    filters: {query: '披萨'},
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, previews));
  const ids = Array.from(out, (item) => item.preview.id);

  assert.deepEqual(ids, ['m1', 'm2'], 'seen 去重后仍按原始顺序各出一张');
  assert.equal(new Set(ids).size, ids.length, '没有重复卡片');
});

test('v904 非案例项目照旧原样透传，不被铺开逻辑吞掉', () => {
  const project = {id: 'p1', title: 'Ramadan', tags: [], caseProject: true};
  const single = {id: 's1', title: 'Solo', source_path: 'cases/solo.png', tags: [], caseProject: false};
  const previews = [
    {id: 'm1', preview_filename: 'a.png', material_type: '弹窗', preview_path: 'a.png'},
  ];
  const {context} = loadCollapse({
    previews,
    tagsById: {m1: ['披萨']},
    filters: {query: '披萨'},
  });
  const items = itemsFor(project, previews);
  items.push({preview: {id: 'solo', preview_filename: 'solo.png', material_type: '头图', preview_path: 'solo.png'}, source: single, url: 'u', thumbUrl: 't'});
  const out = context.collapseCaseProjectItems(items);

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['m1', 'solo']);
  assert.equal(out[1].isCaseProjectCard, undefined, '单图素材不带案例项目卡标记');
});

test('v904 点击卡片要把该卡的物料类型传给浮窗（两处点击都传）', () => {
  const clickCalls = source.match(/isCaseProjectCard\) \{ openCaseProjectModal\(/g) || [];
  assert.equal(clickCalls.length, 2, '网格点击 + 键盘 Enter 两处都要传');
  const typed = source.match(/openCaseProjectModal\((\w+)\.source\.id, \1\.preview && \1\.preview\.material_type\)/g) || [];
  assert.equal(typed.length, 2, '两处都必须带上该卡片的 preview.material_type');
  assert.doesNotMatch(source, /openCaseProjectModal\(clickItem\.source\.id\);/, '旧的「不传类型」写法不许留着');
  assert.doesNotMatch(source, /openCaseProjectModal\(projItem\.source\.id\);/, '旧的「不传类型」写法不许留着');
});

// 端到端：真实的「搜索文本聚合 → 命中排名 → 铺开」三段落串起来跑一遍，
// 证明铺开的前提（项目内没命中的物料仍留在 items 里）在真实代码下成立
test('v904 端到端：真实搜索文本 + 排名 + 铺开，项目内第 1、3 张命中就出两张卡', () => {
  const project = {id: 'p1', title: 'Ramadan', source_path: '', tags: [], caseProject: true};
  const previews = [
    {id: 'm1', source_file_id: 'p1', preview_filename: 'a.png', material_type: '弹窗', preview_path: 'a.png'},
    {id: 'm2', source_file_id: 'p1', preview_filename: 'b.png', material_type: '头图', preview_path: 'b.png'},
    {id: 'm3', source_file_id: 'p1', preview_filename: 'c.png', material_type: '楼层条', preview_path: 'c.png'},
  ];
  const tagsById = {m1: ['披萨'], m2: ['餐桌'], m3: ['披萨']};
  const context = vm.createContext({
    state: {libraryPreviews: previews, libraryFilters: {query: '披萨', tag2: 'all'}},
    LIBRARY_SEARCH_PINYIN: {},
    LIBRARY_SEARCH_EN_EXTRA: {},
    LIBRARY_LABELS_EN: {},
    libraryKindOfSource: () => 'source',
    libraryKindLabel: () => '案例库项目',
    optionNameById: () => '',
    visibleLibraryTags: (s) => s.tags || [],
    materialCatalogTypeNames: () => [],
    caseMaterialTypeSet: () => null,
    materialCatalogSubNameTypes: () => [],
    tagVocabularyQueryTerms: () => [],
    projectMatchesType: () => false,
    caseCoverFor: () => ({cover: previews[0], group: previews}),
    isCaseProject: (s) => !!s && s.caseProject === true,
    caseMaterialsOf: (s) => previews.filter((p) => p.source_file_id === s.id),
    casePreviewAiTags: (id) => tagsById[id] || [],
    // 同 loadCollapse：这批物料没有语言证据 ⇒ 不配组
    caseMaterialLanguage: () => '',
    selectedLibraryTagValues: () => [],
  });
  vm.runInContext(source.slice(searchStart, searchEnd)
    + source.slice(rankStart, rankEnd)
    + source.slice(blockStart, blockEnd)
    + '\n;({ collapseCaseProjectItems, caseMaterialMatchesQuery, libraryItemSearchText, libraryItemQueryMatchRank })', context);

  const items = previews.map((preview) => ({
    preview,
    source: project,
    url: 'url:' + preview.preview_path,
    thumbUrl: 'thumb:' + preview.preview_path,
  }));
  const filtered = items.filter((item) => context.libraryItemQueryMatchRank(item, '披萨', []) >= 0);
  assert.equal(filtered.length, 3, '项目级命中时三张物料都留在候选里（铺开才有料可选）');

  const out = context.collapseCaseProjectItems(filtered);
  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['m1', 'm3'], '真实的搜索链路下铺开 2 张');
  assert.ok(out.every((item) => item.isCaseProjectCard === true));
  assert.equal(context.libraryItemSearchText(items[1]).includes('披萨'), true, '没命中的那张确实靠项目级聚合文本留在候选里');
});
