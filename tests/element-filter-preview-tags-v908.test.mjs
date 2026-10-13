import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

function slice(startMarker, endMarker, what) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker);
  assert.ok(start > 0 && end > start, what + ' 代码块必须存在');
  return appSource.slice(start, end);
}

const aggregateSlice = slice('  function caseProjectElementTags(materials) {', '  function libraryItemSearchText(item) {', '逐图元素标签聚合');
const cacheSlice = slice('  // v908：元素筛选也要吃同一份聚合', '  async function postCasePreviewAiTagAction(payload) {', '元素筛选聚合缓存');
const filterSlice = slice('  // 一个筛选项对一个物料的匹配：', '  // 为当前选中的筛选值补齐 AI 扩展', '筛选匹配');

// 用假数据把这三段拼起来跑（真实实现，不是复制一份逻辑）
function loadFilter({previews, tagsById, expansionTerms = {}}) {
  const stats = {caseMaterialsOf: 0, casePreviewAiTags: 0};
  const context = vm.createContext({
    state: {libraryPreviews: previews},
    visibleLibraryTags: (source) => (source && source.tags) || [],
    libCountryLabel: (source) => (source && source.country) || '',
    libActivityLabel: (source) => (source && source.activity) || '',
    caseStrategyMarkerValue: (value) => String(value || '').replace(/^vf:strategy:v1:/, ''),
    LIBRARY_FILTER_EXPANSION_DIMS: ['activity', 'strategy', 'element'],
    librarySearchExactOnly: () => false,
    libraryFilterExpansionTermsFor: (dim, value) => expansionTerms[dim + ':' + value] || [],
    isCaseProject: (source) => !!source && source.caseProject === true,
    caseMaterialsOf: (source) => {
      stats.caseMaterialsOf += 1;
      return previews.filter((p) => p.source_file_id === source.id);
    },
    casePreviewAiTags: (id) => {
      stats.casePreviewAiTags += 1;
      return tagsById[id] || [];
    }
  });
  vm.runInContext(aggregateSlice + cacheSlice + filterSlice
    + ';({ caseProjectElementTags, caseProjectElementTagsFor, notePreviewAiTagsChanged, librarySourceMatchesFilterValue })', context);
  return {context, stats};
}

const previews = [
  {id: 'cover', source_file_id: 'p1', preview_filename: 'header.png', material_type: '头图'},
  {id: 'inner', source_file_id: 'p1', preview_filename: 'popup.png', material_type: '弹窗'},
  {id: 'solo', source_file_id: 's1', preview_filename: 'solo.png', material_type: '头图'}
];
const tagsById = {cover: ['kiki'], inner: ['餐桌'], solo: ['餐桌']};

test('v908 元素筛选：项目里任意一张图的逐图 AI 标签都能被筛到', () => {
  const {context} = loadFilter({previews, tagsById});
  const project = {id: 'p1', title: 'Ramadan', source_path: '', tags: ['premium'], caseProject: true};

  assert.equal(context.librarySourceMatchesFilterValue('element', project, 'kiki'), true, '封面图的标签照旧命中');
  assert.equal(context.librarySourceMatchesFilterValue('element', project, '餐桌'), true, '非封面物料（弹窗）的逐图标签必须也能命中——这就是"搜索搜得到、元素筛选筛不到"的那处');
  assert.equal(context.librarySourceMatchesFilterValue('element', project, 'premium'), true, '项目级标签不受影响');
  assert.equal(context.librarySourceMatchesFilterValue('element', project, '世界杯'), false, '库里没有的元素词仍然不命中');
  assert.equal(context.librarySourceMatchesFilterValue('element', project, ''), false, '空值行为不变');
});

test('v908 元素筛选：只放开元素这一维，其它维度行为逐字不变', () => {
  const {context} = loadFilter({previews, tagsById});
  const project = {id: 'p1', source_path: '', tags: ['premium', 'vf:strategy:v1:picks'], caseProject: true};

  // 非元素维度不许吃逐图标签（策略/格式/数量各自只认项目级标签）
  assert.equal(context.librarySourceMatchesFilterValue('format', project, 'kiki'), false);
  assert.equal(context.librarySourceMatchesFilterValue('quantity', project, 'kiki'), false);
  assert.equal(context.librarySourceMatchesFilterValue('strategy', project, '餐桌'), false);
  assert.equal(context.librarySourceMatchesFilterValue('strategy', project, 'picks'), true, '策略标记解码仍然生效');
  assert.equal(context.librarySourceMatchesFilterValue('format', project, 'premium'), true, '项目级标签在其它维度照旧');

  // 国家 / 活动两条老分支不看逐图标签
  const withCountry = {id: 'p1', source_path: '', country: '沙特阿拉伯', activity: '世界杯', tags: [], caseProject: true};
  assert.equal(context.librarySourceMatchesFilterValue('country', withCountry, '沙特阿拉伯'), true);
  assert.equal(context.librarySourceMatchesFilterValue('country', withCountry, '餐桌'), false);
  assert.equal(context.librarySourceMatchesFilterValue('activity', withCountry, '世界杯'), true);
  assert.equal(context.librarySourceMatchesFilterValue('activity', withCountry, '餐桌'), false);
});

test('v908 元素筛选：非案例项目（单图素材 / 模板）不吃逐图标签，行为不变', () => {
  const {context} = loadFilter({previews, tagsById});
  const single = {id: 's1', source_path: 'cases/solo.png', tags: ['kiki'], caseProject: false};

  assert.equal(context.librarySourceMatchesFilterValue('element', single, 'kiki'), true, '自己的项目级标签照旧命中');
  assert.equal(context.librarySourceMatchesFilterValue('element', single, '餐桌'), false, '非案例项目不聚合逐图标签');
});

test('v908 元素筛选：AI 扩展词也吃逐图标签（元素这一维的文本里带上它）', () => {
  const {context} = loadFilter({
    previews,
    tagsById,
    expansionTerms: {'element:耳机': ['餐桌'], 'element:手机': ['PS5']}
  });
  const project = {id: 'p1', source_path: '', tags: [], caseProject: true};

  assert.equal(context.librarySourceMatchesFilterValue('element', project, '耳机'), true, '扩展词落在逐图标签上也算命中');
  assert.equal(context.librarySourceMatchesFilterValue('element', project, '手机'), false, '扩展词库里没有就不命中（和原语义一致）');

  const untouched = loadFilter({previews, tagsById, expansionTerms: {'format:耳机': ['餐桌']}});
  assert.equal(untouched.context.librarySourceMatchesFilterValue('format', project, '耳机'), false, '非元素维度不把逐图标签拼进扩展文本');
});

test('v908 元素筛选：聚合按项目缓存，标签行/物料表变了才重算（保住现有性能特征）', () => {
  const {context, stats} = loadFilter({previews, tagsById});
  const project = {id: 'p1', source_path: '', tags: [], caseProject: true};

  for (let i = 0; i < 20; i += 1) context.librarySourceMatchesFilterValue('element', project, '餐桌');
  assert.equal(stats.caseMaterialsOf, 1, '同一份数据和同一个项目只扫一遍物料');
  assert.equal(stats.casePreviewAiTags, 2, '每张物料的标签只取一次');

  // 逐图标签行有变化 → 缓存失效，重算（否则识别出新标签后筛选不到）
  const before = stats.caseMaterialsOf;
  context.notePreviewAiTagsChanged();
  context.librarySourceMatchesFilterValue('element', project, '餐桌');
  assert.equal(stats.caseMaterialsOf, before + 1, '标签数据变动后要重算');

  // 物料表换了引用 → 缓存失效
  const after = stats.caseMaterialsOf;
  context.state.libraryPreviews = previews.slice();
  context.librarySourceMatchesFilterValue('element', project, '餐桌');
  assert.equal(stats.caseMaterialsOf, after + 1, '物料表变动后要重算');

  // 非案例项目也走缓存，不会每次调用都重新判一次项目
  const single = {id: 's9', source_path: 'x.png', caseProject: false};
  context.librarySourceMatchesFilterValue('element', single, '餐桌');
  const cachedEmpty = stats.caseMaterialsOf;
  context.librarySourceMatchesFilterValue('element', single, '餐桌');
  assert.equal(stats.caseMaterialsOf, cachedEmpty, '查不到项目的空结果也缓存，不重复判定');
});

test('v908 元素筛选：接的是和搜索同一份聚合函数', () => {
  assert.match(appSource, /var elementTags = dim === 'element' \? caseProjectElementTagsFor\(source\) : \[\];/);
  assert.match(appSource, /if \(elementTags\.indexOf\(target\) >= 0\) return true;/);
  assert.match(appSource, /else text = tags\.concat\(elementTags\)\.join\(' '\);/);
  assert.match(filterSlice, /caseProjectElementTagsFor\(source\)/, '筛选匹配必须复用 v903/v904 的那份聚合');
  assert.match(appSource, /function caseProjectElementTagsFor\(source\) \{/);
  assert.match(appSource, /const tags = isCaseProject\(source\) \? caseProjectElementTags\(caseMaterialsOf\(source\)\) : \[\];/);
});
