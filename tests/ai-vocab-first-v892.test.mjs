// v892：AI 联想标签统一口径 ——「先找库内现有标签，没有符合的才生成新词」。
// 第一层 known/related：词表里已有的词（原样返回，保证能命中真实物料）。
// 第二层 fresh/relatedNew：只有第一层一个都没命中时，才用 AI 新造的词（≤3，界面上单独标注）。
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

test('搜索联想两层：词表里挑得到就只给词表词，挑不到才给新词（≤3）', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['甜点', '蛋挞', '蛋糕', '冰淇淋', '甜甜圈', '饮料'];
  // 第一层命中：只返回词表里的词，AI 自由发挥的「马卡龙」被丢掉
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["蛋挞","马卡龙","蛋糕"]}', vocab, '甜点'), {
    known: ['蛋挞', '蛋糕'],
    fresh: []
  });
  // 第一层空：新词兜底
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["马卡龙","布丁","舒芙蕾","司康"]}', vocab, '甜点'), {
    known: [],
    fresh: ['马卡龙', '布丁', '舒芙蕾']
  });
  // 搜索词本身不回显、≤8 字、去重这些老规矩不变
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["甜点","蛋挞","蛋挞"]}', vocab, '甜点'), { known: ['蛋挞'], fresh: [] });
  assert.deepEqual(ai.parseQueryExpansionTiers('{"terms":["这是一个很长的描述词"]}', vocab, '甜点'), { known: [], fresh: [] });
  assert.deepEqual(ai.parseQueryExpansionTiers('', vocab, '甜点'), { known: [], fresh: [] });
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
  assert.equal(ai.QUERY_EXPANSION_FRESH_MAX, 3, '搜索联想新词上限 3');
});

test('提示词写死了两层口径（两个端点都要）', () => {
  assert.match(aiSource, /先找现有的\*\*：只要词表里有和搜索词语义相关的词，就只返回词表里的词/, '搜索扩展提示词');
  assert.match(aiSource, /也一定要给\*\* 1–3 个词表外的新词/, '词表里没有符合的也要给新词');
  assert.match(aiSource, /不要因为词表里没有符合的就返回空数组/, 'v893：别让模型遇到英文词就闭嘴');
  assert.match(aiSource, /terms 里一律写中文\*\*，英文原文和英文说法放进 terms_en/, 'v893：英文查询必须回中文词');
  assert.match(aiSource, /搜「Football」→ 足球、世界杯/, '英文查询的例子');
  assert.match(aiSource, /先找现有的\*\*：只要词表里有符合的词，就只返回词表里的词、原样照抄/, '相关词提示词');
  assert.match(aiSource, /才允许给词表外的新词，最多 3 个，放进 related_new/, '相关词提示词');
  assert.match(aiSource, /related_new/, '提示词要教模型用 related_new 分组');
});

test('v893 英文/拼音联想词反查词表换回中文，换得到的算「库内相关词」', () => {
  // 反查用词表的英文名 → 中文名映射（tagVocabularyByEn）
  assert.match(appSource, /function libraryExpansionCanonicalTerm\(value\)/);
  assert.match(appSource, /return tagVocabularyByEn\.get\(term\.toLowerCase\(\)\) \|\| term;/);
  assert.match(appSource, /function libraryExpansionIsLibraryTerm\(term\)/);
  // 反查命中的提到 known 层，反查不到的才留在「AI 新词」
  assert.match(appSource, /const canonicalTerm = libraryExpansionCanonicalTerm\(term\);/);
  assert.match(appSource, /if \(canonicalTerm !== String\(term \|\| ''\)\.trim\(\) \|\| libraryExpansionIsLibraryTerm\(canonicalTerm\) === true\) pushTerm\(knownTerms, canonicalTerm, 8\);/);
  assert.match(appSource, /libraryExpansionTerms = knownTerms;/);
  assert.match(appSource, /writeLibraryExpansionCache\(q, knownTerms, newTerms, termsEn\)/);
});

test('v893 反查行为：AI 回英文词时换回词表里的中文名，换不到就原样留在新词层', () => {
  const slice = appSource.slice(
    appSource.indexOf('  function libraryExpansionCanonicalTerm(value) {'),
    appSource.indexOf('  function libraryExpansionIsLibraryTerm(term) {')
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
  assert.equal(context.libraryExpansionCanonicalTerm('Soccer'), 'Soccer', '词表里没有的英文词原样返回（会留在新词层）');
  assert.equal(context.libraryExpansionCanonicalTerm(''), '');
  // 词表没加载时不乱猜
  const cold = vm.createContext({ tagVocabularyReady: false, tagVocabularyRowsByZh: rowsByZh, tagVocabularyByEn: context.tagVocabularyByEn });
  vm.runInContext(slice, cold);
  assert.equal(cold.libraryExpansionCanonicalTerm('Football'), 'Football');
});

test('v893 AI 一个词都没给出时给明确提示，不再什么都不显示', () => {
  assert.match(appSource, /var libraryExpansionEmptyQuery = '';/);
  assert.match(appSource, /libraryExpansionEmptyQuery = \(knownTerms\.length \|\| newTerms\.length\) \? '' : q;/);
  assert.match(appSource, /if \(libraryExpansionEmptyQuery === q\) \{/);
  assert.match(appSource, /AI 这次没给出相关词/);
  assert.match(appSource, /class="library-expansion-chip is-empty"/);
  const css = readFileSync(join(here, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.library-expansion-chip\.is-empty \{/);
});

test('两个端点把两层透传给前端', () => {
  assert.match(expandRoute, /Array\.isArray\(result\.fresh\) \? result\.fresh : \[\]/);
  assert.match(expandRoute, /terms: terms, fresh: fresh, termsEn: termsEn/);
  assert.match(relatedRoute, /related: suggestion\.related, relatedNew: suggestion\.relatedNew/);
  assert.match(relatedRoute, /relatedNew: \[\]/, 'AI 失败时也要给空的两层，前端不炸');
});

test('前端界面：词表命中一排「库内相关词」，新词单独一排并标「AI 新词」', () => {
  assert.match(appSource, /const libraryExpansionFresh = \[\]|var libraryExpansionFresh = \[\];/);
  assert.match(appSource, /library-expansion-chips-label is-fresh">\$\{zhUi \? 'AI 新词'/);
  assert.match(appSource, /library-expansion-chip is-fresh"/, '新词 chip 用虚线灰底');
  assert.match(appSource, /标签词表里没有符合的，这是 AI 新造的词/, '新词有说明：只有标题/文件名含它才命中');
  const css = readFileSync(join(here, '..', 'styles.css'), 'utf8');
  assert.match(css, /\.library-expansion-chip\.is-fresh \{\s*\n\s*border-style: dashed;/);
});

test('前端：新词也参与匹配（但仍排在精确命中之后），换词清两层', () => {
  assert.match(appSource, /function libraryExpansionMatchTerms\(\) \{\s*\n\s*return libraryExpansionTerms\.concat\(libraryExpansionFresh\);/);
  assert.match(appSource, /libraryItemQueryMatchRank\(item, state\.libraryFilters\.query, libraryExpansionMatchTerms\(\)\)/);
  assert.match(appSource, /libraryExpansionFresh = \[\];\n\s*libraryExpansionEmptyQuery = '';\n\s*libraryExpansionPendingQuery = q;/);
  // 缓存键 v6：v5 旧缓存不分两层
  assert.match(appSource, /LIBRARY_EXPANSION_CACHE_PREFIX = 'vf_library_search_expansion_v6:'/);
  assert.match(appSource, /writeLibraryExpansionCache\(q, knownTerms, newTerms, termsEn\)/);
});

test('前端词表页：AI 建议优先用 related，relatedNew 只在词表没有符合词时出现并如实说明', () => {
  assert.match(appSource, /const suggestedNew = Array\.isArray\(data\.relatedNew\) \? data\.relatedNew : \[\];/);
  assert.match(appSource, /const picked = suggested\.length \? suggested : suggestedNew;/);
  assert.match(appSource, /词表里没有符合条件的现成标签，这几个是 AI 新造的/, '落库时明确告知这是新造词');
});
