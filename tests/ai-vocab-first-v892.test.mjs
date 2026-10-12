// 「AI 联想标签只用库内现有标签」的口径锁（v892 引入两层 → v894 收敛成一层）。
// 现在：AI 只负责**从库内现有标签里挑**；后端仍会分 known/fresh 两桶，但前端只收「库内确实存在」的那些，
// 因为库内没有的词搜不到任何物料，显示了只会误导人。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const aiSource = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');
const expandRoute = readFileSync(join(here, '..', 'functions', 'api', 'expand-query.js'), 'utf8');
const relatedRoute = readFileSync(join(here, '..', 'functions', 'api', 'tag-vocabulary-related.js'), 'utf8');

test('搜索联想解析仍分两桶：known = 词表里有的，fresh = 词表外新造（≤3）', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['甜点', '蛋挞', '蛋糕', '冰淇淋', '甜甜圈', '饮料'];
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["蛋挞","马卡龙","蛋糕"]}', vocab, '甜点'), {
    known: ['蛋挞', '蛋糕'],
    fresh: []
  });
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["马卡龙","布丁","舒芙蕾","司康"]}', vocab, '甜点'), {
    known: [],
    fresh: ['马卡龙', '布丁', '舒芙蕾']
  });
  // 搜索词本身不回显、≤8 字、去重这些老规矩不变
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["甜点","蛋挞","蛋挞"]}', vocab, '甜点'), { known: ['蛋挞'], fresh: [] });
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["这是一个很长的描述词"]}', vocab, '甜点'), { known: [], fresh: [] });
  assert.deepEqual(ai.parseQueryExpansionTiers('', vocab, '甜点'), { known: [], fresh: [] });
  assert.equal(ai.QUERY_EXPANSION_FRESH_MAX, 3, '新词上限 3（前端已不收这一层）');
});

test('相关词两层：related = 词表已有，relatedNew = 只在新造时出现', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['甜点', '蛋挞', '蛋糕', '披萨'];
  assert.deepEqual(ai.parseRelatedTagSuggestions('{"related":["蛋挞","蛋糕"],"related_new":[]}', '甜点', vocab), {
    related: ['蛋挞', '蛋糕'],
    relatedNew: []
  });
  const fresh = ai.parseRelatedTagSuggestions('{"related":["马卡龙","布丁"],"related_new":[]}', '甜点', vocab);
  assert.deepEqual(fresh, { related: [], relatedNew: ['马卡龙', '布丁'] });
  assert.equal(ai.TAG_RELATED_NEW_MAX, 3, '新词上限 3');
});

test('提示词：搜索扩展只从词表里挑（挑不到就返回空数组，不许编造）', () => {
  assert.match(aiSource, /0\. \*\*只从词表里挑\*\*/, '搜索扩展提示词');
  assert.match(aiSource, /词表里找不到语义相关的词，就返回空数组/, '挑不到就空着');
  assert.match(aiSource, /不要编造词表外的词/, '不许编造');
  assert.match(aiSource, /库里没有的词搜不到任何物料/, '说明理由');
  assert.match(aiSource, /terms 里一律写中文\*\*，英文原文和英文说法放进 terms_en/, '英文查询必须回中文词');
  assert.match(aiSource, /搜「Football」→ 足球、世界杯/, '英文查询的例子');
  // 词表页的「AI 建议」仍是两层（related / related_new）
  assert.match(aiSource, /先找现有的\*\*：只要词表里有符合的词，就只返回词表里的词、原样照抄/, '相关词提示词');
  assert.match(aiSource, /才允许给词表外的新词，最多 3 个，放进 related_new/, '相关词提示词');
});

test('v893/v895 联想词归一架：反查词表换回中文 → 用「词表 ∪ 库内在用标签」判断库内有没有', () => {
  assert.match(appSource, /function libraryExpansionCanonicalTerm\(value\)/);
  assert.match(appSource, /return tagVocabularyByEn\.get\(term\.toLowerCase\(\)\) \|\| term;/);
  assert.match(appSource, /function libraryLabelsInUseSet\(\)/);
  assert.match(appSource, /collectTagLabelsInUse\(\)\.forEach\(add\)/, 'v895：词表是增量长的，得把"库内在用的标签"也算进来');
  assert.match(appSource, /function libraryExpansionIsLibraryTerm\(term, inUse\)/);
  // v894/v895：只留「库内确实存在」的，其余丢掉
  assert.match(appSource, /const term = libraryExpansionCanonicalTerm\(value\);/);
  assert.match(appSource, /if \(libraryExpansionIsLibraryTerm\(term, inUse\) === false\) return;/);
  assert.match(appSource, /libraryExpansionTerms = kept;/);
  assert.match(appSource, /writeLibraryExpansionCache\(q, kept, termsEn\)/);
});

test('v895 确定性关联：词表里那一行的「相关词」不用等 AI 就出现在浮窗里', () => {
  const slice = appSource.slice(
    appSource.indexOf('  function libraryDeterministicRelatedTerms(query) {'),
    appSource.indexOf('  function renderLibraryExpansionChips() {')
  );
  const context = vm.createContext({
    tagVocabularyRowsByZh: new Map([
      ['足球', { name_zh: '足球', name_en: 'Football', related: ['世界杯', '球衣', '体育赛事'] }],
      ['甜点', { name_zh: '甜点', name_en: 'Dessert', related: [] }]
    ]),
    tagVocabularyByEn: new Map([['football', '足球'], ['dessert', '甜点']])
  });
  vm.runInContext(slice, context);
  const related = value => Array.from(context.libraryDeterministicRelatedTerms(value));
  assert.deepEqual(related('足球'), ['世界杯', '球衣', '体育赛事']);
  assert.deepEqual(related('Football'), ['世界杯', '球衣', '体育赛事'], '英文写法也能查到同一行');
  assert.deepEqual(related('甜点'), [], '相关词列是空的就没有确定性关联');
  assert.deepEqual(related('库里没有的词'), []);
  assert.deepEqual(related(''), []);
});

test('v893 反查行为：AI 回英文词时换回词表里的中文名，换不到就原样', () => {
  const slice = appSource.slice(
    appSource.indexOf('  function libraryExpansionCanonicalTerm(value) {'),
    appSource.indexOf('  function libraryLabelsInUseSet() {')
  );
  const rowsByZh = new Map([['足球', { id: 'el:足球', name_zh: '足球', name_en: 'Football' }], ['世界杯', { id: 'el:世界杯', name_zh: '世界杯', name_en: 'World Cup' }]]);
  const context = vm.createContext({
    tagVocabularyReady: true,
    tagVocabularyRowsByZh: rowsByZh,
    tagVocabularyByEn: new Map([['football', '足球'], ['world cup', '世界杯']])
  });
  vm.runInContext(slice, context);
  assert.equal(context.libraryExpansionCanonicalTerm('Football'), '足球', '英文名反查成中文');
  assert.equal(context.libraryExpansionCanonicalTerm('World Cup'), '世界杯', '带空格的英文名也能反查');
  assert.equal(context.libraryExpansionCanonicalTerm('足球'), '足球', '本来就是中文标签名，原样');
  assert.equal(context.libraryExpansionCanonicalTerm('Soccer'), 'Soccer', '词表里没有的英文词原样返回（随后会被丢掉）');
  assert.equal(context.libraryExpansionCanonicalTerm(''), '');
  // 词表没加载时不乱猜
  const cold = vm.createContext({ tagVocabularyReady: false, tagVocabularyRowsByZh: rowsByZh, tagVocabularyByEn: context.tagVocabularyByEn });
  vm.runInContext(slice, cold);
  assert.equal(cold.libraryExpansionCanonicalTerm('Football'), 'Football');
});

test('v894 浮窗：显示「库内关联标签」，不再有「历史搜索」', () => {
  assert.match(appSource, /id="search-history-dropdown" class="search-history-dropdown" hidden/);
  assert.match(appSource, /id="search-history-list"/);
  assert.match(appSource, /'库内关联标签' : 'Related library tags'/);
  assert.match(appSource, /库里没有相关联的标签/);
  assert.match(appSource, /class="library-expansion-chip is-empty"/);
  // 历史搜索彻底删掉：状态字段、条目渲染、按钮类名都不该再有
  assert.doesNotMatch(appSource, /searchHistory/, 'state.libraryFilters.searchHistory 已删');
  assert.doesNotMatch(appSource, /class="search-history-item"/, '历史搜索条目已删');
  assert.doesNotMatch(appSource, /state\.lang === 'zh' \? '历史搜索' : 'History'/);
  // 只在搜索框聚焦时弹，且 AI 开关关掉就不弹
  assert.match(appSource, /const focused = !!document\.activeElement && document\.activeElement\.id === 'library-search';/);
  assert.match(appSource, /if \(!q \|\| !focused \|\| librarySearchExactOnly\(\)\) \{/);
});

test('v894 浮窗里只出「库内确实存在」的标签，标签可点（点一下改成只搜它）', () => {
  assert.match(appSource, /class="library-expansion-chip is-clickable" data-library-expansion-term="/);
  assert.match(appSource, /库内已有的标签；点一下改成只搜这个词/);
  assert.match(appSource, /target\.closest\('\[data-library-expansion-term\]'\)/);
  assert.match(appSource, /state\.libraryFilters\.query = term;/);
  // 搜索框左边那一排 chips 已经不要了；「AI 新词」这一层也停了
  assert.doesNotMatch(appSource, /id="library-expansion-chips"/);
  assert.doesNotMatch(appSource, /AI 新词/);
  assert.doesNotMatch(appSource, /is-fresh/);
  assert.doesNotMatch(appSource, /libraryExpansionFresh/);
  const css = readFileSync(join(here, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.library-expansion-chip\.is-clickable \{/);
  assert.match(css, /\.search-history-items \{\s*\n\s*align-items: center;/);
});

test('v894 匹配与缓存：只用库内那一层，缓存键升 v7', () => {
  assert.match(appSource, /libraryItemQueryMatchRank\(item, state\.libraryFilters\.query, libraryExpansionTerms\)/);
  assert.match(appSource, /LIBRARY_EXPANSION_CACHE_PREFIX = 'vf_library_search_expansion_v7:'/);
  assert.match(appSource, /const terms = list\.filter\(Boolean\);/);
  assert.match(appSource, /function writeLibraryExpansionCache\(query, terms, termsEn\)/);
});

test('两个端点仍然把两层透传给前端（前端只消费库内层）', () => {
  assert.match(expandRoute, /Array\.isArray\(result\.fresh\) \? result\.fresh : \[\]/);
  assert.match(expandRoute, /terms: terms, fresh: fresh, termsEn: termsEn/);
  assert.match(relatedRoute, /related: suggestion\.related, relatedNew: suggestion\.relatedNew/);
  assert.match(relatedRoute, /relatedNew: \[\]/, 'AI 失败时也要给空的两层，前端不炸');
});

test('前端词表页：AI 建议优先用 related，relatedNew 只在词表没有符合词时出现并如实说明', () => {
  assert.match(appSource, /const suggestedNew = Array\.isArray\(data\.relatedNew\) \? data\.relatedNew : \[\];/);
  assert.match(appSource, /const picked = suggested\.length \? suggested : suggestedNew;/);
  assert.match(appSource, /词表里没有符合条件的现成标签，这几个是 AI 新造的/, '落库时明确告知这是新造词');
});
