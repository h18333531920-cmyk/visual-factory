// v921（2026-10-14）：修「选了物料类别 + 搜关键词，项目里没有该类别命中的物料，却冒出一张无关封面」。
// 起因（用户实测）：案例库 + 类别「弹窗」+ 搜「kiki」，结果里出现一张跟 kiki 毫无关系的弹窗封面。
// 根因：kiki 命中的是同一项目里两张「未分类」物料的逐图标签（`ai_tags`），它们被 v909 的类别闸
// （`passTypeFilter`）正确筛掉了 ⇒ 项目里没有一张「弹窗且命中 kiki」的物料 ⇒ 落到
// `collapseCaseProjectItems` 末尾「项目级命中就出一张该类型封面卡」的分支，拿弹窗封面顶上了。
// 新口径（`caseProjectMetaMatchesQuery`）：
//   (a) 有「该类别 + 命中关键词」的物料 → 照旧铺开（v904/v909/v906 行为不变）；
//   (b) 关键词命中的是**项目自身信息**（项目标题 / 项目级标签 / 国家 / 活动 / 类别 / 所有者 / 原始文件名）
//       → 允许回落成一张该类型的项目封面卡（搜项目名照旧能用）；
//   (c) 两者都没有 → 这个项目**整个不出现**（不铺开、也不出封面卡）。
// 非目标（本轮的回归保护）：没选类别筛选 / 没有关键词时行为一字不变。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const blockStart = source.indexOf('  // 检索词本身就是一个物料类型时');
const blockEnd = source.indexOf('  function recentCaseOwnerNames()');
assert.ok(blockStart > 0 && blockEnd > blockStart, '物料级命中 + collapseCaseProjectItems 代码块必须存在');

const CATALOG_TYPES = ['开机海报', '弹窗', '头图', '横banner'];

// 把 collapseCaseProjectItems + 两个命中判定切出来跑：外层依赖（案例判定 / 封面 / 逐图标签）全部塞假的
function loadCollapse(options = {}) {
  const tagsById = options.tagsById || {};
  const previews = options.previews || [];
  const calls = [];
  const context = vm.createContext({
    state: {
      libraryFilters: Object.assign({query: '', tag2: 'all'}, options.filters || {}),
      libraryPreviews: previews,
    },
    materialCatalogTypeNames: () => CATALOG_TYPES,
    LIBRARY_SEARCH_PINYIN: options.pinyin || {},
    LIBRARY_SEARCH_EN_EXTRA: options.enExtra || {},
    LIBRARY_LABELS_EN: options.labelsEn || {},
    caseMaterialTypeSet: (value) => {
      const name = String(value || '').trim();
      return name && CATALOG_TYPES.indexOf(name) >= 0 ? [name] : null;
    },
    selectedLibraryTagValues: options.selectedLibraryTagValues || (() => []),
    // v921 新增依赖：项目自身信息的候选文本来自这三个桩
    optionNameById: options.optionNameById || (() => ''),
    visibleLibraryTags: (s) => (s && s.tags) || [],
    projectMatchesType: options.projectMatchesType || (() => false),
    // 桩成「按当前类型挑一张」：真实实现（caseCoverFor）只影响封面是哪张，不影响本项目出不出卡
    caseCoverFor: (src, typeValue) => {
      calls.push({coverFor: [src.id, typeValue]});
      if (options.cover === null) return null;
      const group = previews.filter((p) => (p.material_type || '') === typeValue);
      return options.cover || {cover: group[0] || previews[0], group: previews};
    },
    casePreviewAiTags: (id) => tagsById[id] || [],
    isCaseProject: (s) => !!s && s.caseProject === true,
    caseMaterialLanguage: () => '',
  });
  vm.runInContext(source.slice(blockStart, blockEnd)
    + '\n;({ collapseCaseProjectItems, caseMaterialMatchesQuery, casePreviewAiMatchesQuery, caseProjectMetaMatchesQuery })', context);
  return {context, calls};
}

function itemsFor(project, previews) {
  return previews.map((preview) => ({
    preview,
    source: project,
    url: 'url:' + preview.preview_filename,
    thumbUrl: 'thumb:' + preview.preview_filename,
  }));
}

// 真实案例：项目「BBD: KFG [9.10-9.12]」，弹窗那张（甲）的 ai_tags 里**没有** kiki，
// 带 kiki 的是未分类的老虎图（乙）。
const POPUP = {id: 'popup', preview_filename: 'popup_01.png', material_type: '弹窗', preview_path: 'popup_01.png'};
const NOCAT = {id: 'nocat', preview_filename: 'tiger_01.png', material_type: '', preview_path: 'tiger_01.png'};
const KFG_PREVIEWS = [POPUP, NOCAT];
const POPUP_TAGS = ['汉堡包', '饮料杯', '比萨切片', '星星', '优惠', '礼物盒', '按钮'];
const NOCAT_TAGS = ['kiki', '金币', '礼物盒'];
const KFG_PROJECT = {id: 'kfg', title: 'BBD: KFG [9.10-9.12]', tags: [], caseProject: true};

test('场景 A：选中「弹窗」+ 搜 kiki，项目里没有该类别命中物料 ⇒ 一张卡都不出（现在会出一张无关弹窗封面）', () => {
  const {context, calls} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    filters: {query: 'kiki', tag2: '弹窗'},
    selectedLibraryTagValues: () => ['弹窗'],
  });
  const out = context.collapseCaseProjectItems(itemsFor(KFG_PROJECT, KFG_PREVIEWS));

  assert.deepEqual(Array.from(out), [], '项目整个不出现：既不铺开未分类那张，也不拿弹窗封面顶上');
  assert.equal(calls.filter((call) => call.coverFor).length, 0, '连 caseCoverFor 都不该调（根本不该回落封面卡）');
  // 前置事实：kiki 确实只被未分类那张命中，弹窗那张的文本里没有它 —— A 的失败不是夹具写错了
  const items = itemsFor(KFG_PROJECT, KFG_PREVIEWS);
  assert.equal(context.caseMaterialMatchesQuery(items[1], 'kiki'), true, '未分类那张（乙）命中 kiki');
  assert.equal(context.caseMaterialMatchesQuery(items[0], 'kiki'), false, '弹窗那张（甲）不命中 kiki');
  assert.equal(context.caseProjectMetaMatchesQuery(KFG_PROJECT, 'kiki'), false, '项目自身信息里也没有 kiki');
});

test('场景 B：把 kiki 加到弹窗那张上 ⇒ 铺开弹窗那张（规则 a，照旧）', () => {
  const {context, calls} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS.concat('kiki'), nocat: NOCAT_TAGS},
    filters: {query: 'kiki', tag2: '弹窗'},
    selectedLibraryTagValues: () => ['弹窗'],
  });
  const out = context.collapseCaseProjectItems(itemsFor(KFG_PROJECT, KFG_PREVIEWS));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['popup'], '只铺开该类别里真正命中关键词的那张');
  assert.equal(out[0].isCaseProjectCard, true);
  assert.equal(out[0].languageGroupSize, 1, '单成员组（没有语言证据时不成组）');
  assert.equal(calls.filter((call) => call.coverFor).length, 0, '铺开时不该再去挑项目封面');
});

test('场景 C-1：项目标题里含 kiki ⇒ 回落一张「弹窗」类型的封面卡（规则 b）', () => {
  const project = {id: 'kfg', title: 'kiki 老虎主题案例 BBD: KFG', tags: [], caseProject: true};
  const {context, calls} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    filters: {query: 'kiki', tag2: '弹窗'},
    selectedLibraryTagValues: () => ['弹窗'],
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, KFG_PREVIEWS));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['popup'], '出的是项目的弹窗封面（类别没错）');
  assert.equal(out[0].isCaseProjectCard, true);
  assert.deepEqual(calls[0].coverFor, ['kfg', '弹窗'], '回落封面时仍带当前类别');
  assert.equal(calls.length, 1);
});

test('场景 C-2：项目级标签里含 kiki ⇒ 同样回落一张弹窗封面卡（规则 b）', () => {
  const project = {id: 'kfg', title: 'BBD: KFG [9.10-9.12]', tags: ['kiki', '老虎'], caseProject: true};
  const {context, calls} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    filters: {query: 'kiki', tag2: '弹窗'},
    selectedLibraryTagValues: () => ['弹窗'],
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, KFG_PREVIEWS));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['popup']);
  assert.deepEqual(calls[0].coverFor, ['kfg', '弹窗']);
});

test('场景 C-3：国家 / 活动 / 类别选项名与拼音别名都算「项目自身信息」', () => {
  const project = {id: 'kfg', title: 'BBD: KFG', tags: [], country_id: 'c1', caseProject: true};
  const {context, calls} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    filters: {query: 'shate', tag2: '弹窗'},
    selectedLibraryTagValues: () => ['弹窗'],
    optionNameById: (id) => (id === 'c1' ? '沙特' : ''),
    pinyin: {'沙特': 'shate'},
  });
  const out = context.collapseCaseProjectItems(itemsFor(project, KFG_PREVIEWS));

  assert.equal(context.caseProjectMetaMatchesQuery(project, '沙特'), true);
  assert.equal(context.caseProjectMetaMatchesQuery(project, 'shate'), true, '拼音别名与 libraryItemSearchText 同一套口径');
  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['popup'], '国家命中 ⇒ 回落弹窗封面卡');
  assert.equal(calls.length, 1);
});

test('场景 D-1（回归）：没选类别筛选时，搜 kiki 行为一字不变（未分类那张照旧铺开）', () => {
  const {context, calls} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    filters: {query: 'kiki', tag2: 'all'},
    selectedLibraryTagValues: () => [],
  });
  const out = context.collapseCaseProjectItems(itemsFor(KFG_PROJECT, KFG_PREVIEWS));

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['nocat'], 'v904 语义：命中哪张铺哪张');
  assert.equal(calls.filter((call) => call.coverFor).length, 0);
});

test('场景 D-2（回归）：没有关键词时选「弹窗」⇒ 有弹窗的项目照旧各出一张卡', () => {
  const {context, calls} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    // 库里的 query 一定是 trim 过的（app.js 各处都写 .value.trim()），浏览态就是空串
    filters: {query: '', tag2: '弹窗'},
    selectedLibraryTagValues: () => ['弹窗'],
  });
  const out = context.collapseCaseProjectItems(itemsFor(KFG_PROJECT, KFG_PREVIEWS));

  assert.equal(out.length, 1, '浏览态仍出卡');
  assert.equal(out[0].preview.id, 'popup');
  assert.deepEqual(calls[0].coverFor, ['kfg', '弹窗']);
});

test('场景 D-3（回归）：没关键词 + 没类别筛选 ⇒ 仍是一张项目卡', () => {
  const {context} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    filters: {query: '', tag2: 'all'},
    selectedLibraryTagValues: () => [],
  });
  const out = context.collapseCaseProjectItems(itemsFor(KFG_PROJECT, KFG_PREVIEWS));
  assert.equal(out.length, 1);
});

test('v921 口径：多词是 AND，且只在「项目自身」的字段之间跨（跨字段可以，跨到物料不行）', () => {
  const {context} = loadCollapse({
    previews: KFG_PREVIEWS,
    tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS},
    filters: {query: '', tag2: 'all'},
  });
  const project = {id: 'kfg', title: 'BBD: KFG [9.10-9.12]', owner_name: '张三', tags: ['老虎'], caseProject: true};

  assert.equal(context.caseProjectMetaMatchesQuery(project, 'kfg'), true);
  assert.equal(context.caseProjectMetaMatchesQuery(project, '9.12'), true);
  assert.equal(context.caseProjectMetaMatchesQuery(project, 'kfg 9.12'), true, '两个词都命中 ⇒ 通过');
  assert.equal(context.caseProjectMetaMatchesQuery(project, 'zhangsan'), false, '所有者不挂拼音别名（与 libraryItemSearchText 一致）');
  assert.equal(context.caseProjectMetaMatchesQuery(project, '张三 老虎'), true, '跨字段（所有者 + 项目标签）算命中');
  assert.equal(context.caseProjectMetaMatchesQuery(project, 'kfg kiki'), false, '一个词没命中就不算');
  assert.equal(context.caseProjectMetaMatchesQuery(project, '礼物盒'), false, '物料逐图标签（哪怕两张图都有）绝不算项目自身信息');
  assert.equal(context.caseProjectMetaMatchesQuery(project, ''), false, '空关键词一律不算命中');
  assert.equal(context.caseProjectMetaMatchesQuery(null, 'kiki'), false, '没有 source 也不炸');
});

test('v921 源码：元数据匹配函数只碰项目自身字段，绝不聚合整项目的物料标签', () => {
  const metaStart = source.indexOf('  function caseProjectMetaMatchesQuery(source, query) {');
  assert.ok(metaStart > 0, 'caseProjectMetaMatchesQuery 必须存在');
  const metaEnd = source.indexOf('\n  }\n', metaStart);
  const body = source.slice(metaStart, metaEnd);

  ['caseProjectElementTags', 'caseProjectEffectTags', 'caseProjectElementTagsFor', 'caseMaterialsOf', 'casePreviewAiTags', 'libraryItemSearchText']
    .forEach(function(forbidden) {
      assert.equal(body.includes(forbidden), false, '元数据匹配里不许出现 ' + forbidden + '（这正是这次 bug 的来源）');
    });
  assert.match(body, /visibleLibraryTags\(source\)/, '项目级标签要算（规则 b 的一半）');
  assert.match(body, /optionNameById\(source\.country_id\)/);
  assert.match(body, /optionNameById\(source\.activity_id\)/);
  assert.match(body, /optionNameById\(source\.category_id\)/);
});

// 端到端：把真实的「搜索文本聚合 → 命中排名 → 铺开」三段串起来跑，证明这道闸挡在**真实**链路的
// 最后一步 —— 外层过滤根本拦不住（项目级聚合文本里确实含 kiki，整个项目的物料都留在候选里），
// 旧的封面卡就是从这条路漏出来的。
const searchStart = source.indexOf('  // v903 逐图元素标签聚合');
const searchEnd = source.indexOf('  // v829 搜索词扩展');
const rankStart = source.indexOf('  function libraryItemQueryMatchRank(item, query, expansionTerms) {');
const rankEnd = source.indexOf('  function libraryItemMatchesQuery(item, query) {');

function loadSearchChain(options = {}) {
  const tagsById = options.tagsById || {};
  const previews = KFG_PREVIEWS;
  const project = options.project || KFG_PROJECT;
  const context = vm.createContext({
    state: {libraryPreviews: previews, libraryFilters: options.filters || {query: 'kiki', tag2: '弹窗'}},
    LIBRARY_SEARCH_PINYIN: {},
    LIBRARY_SEARCH_EN_EXTRA: {},
    LIBRARY_LABELS_EN: {},
    libraryKindOfSource: () => 'source',
    libraryKindLabel: () => '案例库',
    optionNameById: () => '',
    visibleLibraryTags: (s) => (s && s.tags) || [],
    materialCatalogTypeNames: () => CATALOG_TYPES,
    caseMaterialTypeSet: (value) => {
      const name = String(value || '').trim();
      return name && CATALOG_TYPES.indexOf(name) >= 0 ? [name] : null;
    },
    materialCatalogSubNameTypes: () => [],
    tagVocabularyQueryTerms: () => [],
    projectMatchesType: (source, value) => previews.some((p) => p.material_type === value),
    caseCoverFor: () => ({cover: previews[0], group: previews}),
    isCaseProject: (s) => !!s && s.caseProject === true,
    caseMaterialsOf: () => previews,
    casePreviewAiTags: (id) => tagsById[id] || [],
    casePreviewAiEffectTags: () => [],
    caseMaterialLanguage: () => '',
    selectedLibraryTagValues: options.selectedLibraryTagValues || (() => ['弹窗']),
  });
  vm.runInContext(source.slice(searchStart, searchEnd)
    + source.slice(rankStart, rankEnd)
    + source.slice(blockStart, blockEnd)
    + '\n;({ collapseCaseProjectItems, libraryItemSearchText, libraryItemQueryMatchRank, caseProjectMetaMatchesQuery })', context);
  return {context, project};
}

test('v921 端到端：真实搜索链路下 kiki + 弹窗 = 一张卡都不出（旧逻辑就在最后一步漏出封面卡）', () => {
  const {context, project} = loadSearchChain({tagsById: {popup: POPUP_TAGS, nocat: NOCAT_TAGS}});
  const items = itemsFor(project, KFG_PREVIEWS);

  assert.equal(context.libraryItemSearchText(items[0]).includes('kiki'), true,
    '弹窗那张的**聚合**搜索文本里也有 kiki（靠的是项目里别张图的逐图标签）—— 所以外层过滤拦不住');
  const filtered = items.filter((item) => context.libraryItemQueryMatchRank(item, 'kiki', []) >= 0);
  assert.equal(filtered.length, 2, '两张物料都留在候选里（铺开逻辑才有料可选，也正是封面卡漏出的前置条件）');

  assert.deepEqual(Array.from(context.collapseCaseProjectItems(filtered)), [], '最后一步把它整条拦掉');
});

test('v921 端到端：同样的链路里，kiki 真的在弹窗那张上时就正常铺开', () => {
  const {context, project} = loadSearchChain({tagsById: {popup: POPUP_TAGS.concat('kiki'), nocat: NOCAT_TAGS}});
  const items = itemsFor(project, KFG_PREVIEWS);
  const filtered = items.filter((item) => context.libraryItemQueryMatchRank(item, 'kiki', []) >= 0);
  const out = context.collapseCaseProjectItems(filtered);

  assert.deepEqual(Array.from(out, (item) => item.preview.id), ['popup']);
  assert.equal(context.caseProjectMetaMatchesQuery(project, 'kiki'), false, '项目自身信息里仍然没有 kiki —— 出卡靠的是规则 a');
});

test('v921 版本号六处同步（index.html 5 处 + app.js 1 处）', () => {
  const indexSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((indexSource.match(/\?v=20261014-upload-highlight-v936/g) || []).length, 5);
  assert.match(source, /const TOOL_UI_VERSION = '20261014-upload-highlight-v936'/);
});

test('v921 源码：这道闸在 collapseCaseProjectItems 里、且在「回落封面卡」之前；没选类别时不生效', () => {
  assert.match(source, /if \(typeFilters\.length && !caseProjectMetaMatchesQuery\(item\.source, query\)\) return;/,
    '有关键词 + 选了类别 + 项目自身没命中 ⇒ 直接 return，什么都不 push');
  const guard = source.indexOf('if (typeFilters.length && !caseProjectMetaMatchesQuery(item.source, query)) return;');
  const coverFallback = source.indexOf('const typeValue = (queryType && projectMatchesType(item.source, queryType))');
  assert.ok(guard > 0 && coverFallback > guard, '闸必须在 caseCoverFor 回落之前');
  const queryGate = source.indexOf('if (query) {', source.indexOf('function collapseCaseProjectItems'));
  assert.ok(queryGate > 0 && queryGate < guard, '闸在 if (query) 里面 —— 没关键词时行为不变');
});
