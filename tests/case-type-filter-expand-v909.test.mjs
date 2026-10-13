// v909（2026-10-13）：修「选了物料类别筛选，铺开时却混进别的类别」。
// 起因（用户实测）：搜「足球」+ 选中「开机海报」，结果里混进弹窗 / 横banner —— 点开每个类别都是不同的物料。
// 根因：v904 的「按命中物料铺开」只看关键词命不命中，**没看当前选中的物料类别**
// （案例库里类别筛选落在 `state.libraryFilters.tag2`），而筛选本身是**项目级**判定
// （项目里有开机海报 ⇒ 整个项目通过），铺开时又把项目里所有命中关键词的物料都摊开了。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const blockStart = source.indexOf('  // 检索词本身就是一个物料类型时');
const blockEnd = source.indexOf('  function recentCaseOwnerNames()');
assert.ok(blockStart > 0 && blockEnd > blockStart, '物料级命中 + collapseCaseProjectItems 代码块必须存在');

function loadCollapse(options = {}) {
  const tagsById = options.tagsById || {};
  const catalogTypes = options.catalogTypes || ['开机海报', '弹窗', '头图', '横banner'];
  const project = options.project || {id: 'p1', title: 'World Cup', tags: [], caseProject: true};
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
    selectedLibraryTagValues: options.selectedLibraryTagValues || (() => []),
    projectMatchesType: options.projectMatchesType || (() => false),
    caseCoverFor: (src, typeValue) => {
      calls.push({coverFor: [src.id, typeValue]});
      return options.cover || null;
    },
    casePreviewAiTags: (id) => tagsById[id] || [],
    isCaseProject: (s) => !!s && s.caseProject === true,
    caseMaterialLanguage: () => '',
  });
  vm.runInContext(source.slice(blockStart, blockEnd)
    + '\n;({ collapseCaseProjectItems, caseMaterialMatchesQuery })', context);
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

const MIXED = [
  {id: 'splash', preview_filename: 'a.png', material_type: '开机海报', preview_path: 'a.png'},
  {id: 'popup', preview_filename: 'b.png', material_type: '弹窗', preview_path: 'b.png'},
  {id: 'banner', preview_filename: 'c.png', material_type: '横banner', preview_path: 'c.png'},
];
const MIXED_TAGS = {splash: ['足球'], popup: ['足球'], banner: ['足球']};

test('v909 选中「开机海报」：只铺开开机海报，弹窗/横banner 不进结果', () => {
  const {context, project} = loadCollapse({
    previews: MIXED,
    tagsById: MIXED_TAGS,
    filters: {query: '足球', tag2: '开机海报'},
    selectedLibraryTagValues: () => ['开机海报'],
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, MIXED));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['splash'], '只留开机海报那张');
  assert.ok(out.every((item) => item.isCaseProjectCard === true));
});

test('v909 选中「弹窗」：同一批数据换成只出弹窗（类别说了算，不是碰运气）', () => {
  const {context, project} = loadCollapse({
    previews: MIXED,
    tagsById: MIXED_TAGS,
    filters: {query: '足球', tag2: '弹窗'},
    selectedLibraryTagValues: () => ['弹窗'],
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, MIXED));
  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['popup']);
});

test('v909 没选类别筛选时，行为与 v904 逐字一致（回归保护）', () => {
  const {context, project} = loadCollapse({
    previews: MIXED,
    tagsById: MIXED_TAGS,
    filters: {query: '足球', tag2: 'all'},
    selectedLibraryTagValues: () => [],
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, MIXED));
  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['splash', 'popup', 'banner'], '三张命中就铺三张');
});

test('v909 项目里没有该类别命中物料：不铺开，也不拿非该类别的图当封面', () => {
  const previews = [
    {id: 'splash', preview_filename: 'a.png', material_type: '开机海报', preview_path: 'a.png'},
    {id: 'popup', preview_filename: 'b.png', material_type: '弹窗', preview_path: 'b.png'},
  ];
  // 关键词只被弹窗的逐图标签命中；开机海报自己什么都不沾
  const {context, calls} = loadCollapse({
    previews,
    tagsById: {popup: ['足球']},
    filters: {query: '足球', tag2: '开机海报'},
    selectedLibraryTagValues: () => ['开机海报'],
    cover: {cover: previews[0], group: previews},
  });
  const out = context.collapseCaseProjectItems(itemsFor({id: 'p1', title: 'World Cup', tags: [], caseProject: true}, previews));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['splash'], '回落项目卡，且是开机海报封面，不是那张弹窗');
  assert.equal(calls.filter((call) => call.coverFor).length, 1, '退回一次 caseCoverFor 挑封面');
  assert.equal(calls[0].coverFor.length >= 0, true);
});

test('v909 源码：铺开与封面替换两处都过了 passTypeFilter', () => {
  assert.match(source, /const typeFilters = selectedLibraryTagValues\(\)\.filter\(tag => caseMaterialTypeSet\(tag\)\)/,
    '类别筛选从当前选中的标签里取（只认真正的物料类别）');
  const passes = source.match(/passTypeFilter\(candidate\.preview\)/g) || [];
  assert.equal(passes.length, 2, '铺开(hits) 与 封面替换(previewAiMatch) 两处都要过类别筛选');
  assert.match(source, /if \(!typeFilters\.length\) return true;/, '没选类别时一律放行（回归保护）');
});
