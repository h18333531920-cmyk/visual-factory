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
  assert.match(aiSource, /词表里一个符合的都没有时，才允许返回词表外的新词，最多 3 个/, '搜索扩展提示词');
  assert.match(aiSource, /先找现有的\*\*：只要词表里有符合的词，就只返回词表里的词、原样照抄/, '相关词提示词');
  assert.match(aiSource, /才允许给词表外的新词，最多 3 个，放进 related_new/, '相关词提示词');
  assert.match(aiSource, /related_new/, '提示词要教模型用 related_new 分组');
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
  assert.match(appSource, /libraryExpansionFresh = \[\];\n\s*libraryExpansionPendingQuery = q;/);
  // 缓存键 v6：v5 旧缓存不分两层
  assert.match(appSource, /LIBRARY_EXPANSION_CACHE_PREFIX = 'vf_library_search_expansion_v6:'/);
  assert.match(appSource, /writeLibraryExpansionCache\(q, terms, fresh, termsEn\)/);
});

test('前端词表页：AI 建议优先用 related，relatedNew 只在词表没有符合词时出现并如实说明', () => {
  assert.match(appSource, /const suggestedNew = Array\.isArray\(data\.relatedNew\) \? data\.relatedNew : \[\];/);
  assert.match(appSource, /const picked = suggested\.length \? suggested : suggestedNew;/);
  assert.match(appSource, /词表里没有符合条件的现成标签，这几个是 AI 新造的/, '落库时明确告知这是新造词');
});
