import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

// 把词表区块的源码切出来，在干净的 vm 里跑（只看行为，不需要浏览器、不联网）
function loadVocabularyUi(rows, options = {}) {
  const slice = appSource.slice(
    appSource.indexOf('  function tagVocabularyRowMatches('),
    appSource.indexOf('  function renderTagVocabularySection(')
  );
  const context = vm.createContext({
    state: { lang: options.lang || 'zh' },
    tagVocabularyRows: rows,
    tagVocabularyQuery: options.query || '',
    tagVocabularyMessage: options.message || '',
    tagVocabularySuggestingId: options.suggestingId || '',
    tagVocabularyRelatedReady: options.relatedReady !== false,
    TAG_VOCABULARY_IGNORED: 'ignored',
    TAG_VOCABULARY_RELATED_MAX: 8,
    TAG_TRANSLATE_MAX_CHARS: 20,
    escapeHtml: value => String(value == null ? '' : value),
    escapeAttr: value => String(value == null ? '' : value)
  });
  vm.runInContext(slice, context);
  return context;
}

function loadQueryTerms(rows) {
  const slice = appSource.slice(
    appSource.indexOf('  function tagVocabularyQueryTerms(token) {'),
    appSource.indexOf('  function optionNameById(id) {')
  );
  const rowsByZh = new Map(rows.map(row => [row.name_zh, row]));
  const byName = new Map(rows.filter(row => row.name_en).map(row => [row.name_zh, row.name_en]));
  const byEn = new Map(rows.filter(row => row.name_en).map(row => [row.name_en.toLowerCase(), row.name_zh]));
  const context = vm.createContext({ tagVocabularyRowsByZh: rowsByZh, tagVocabularyByName: byName, tagVocabularyByEn: byEn });
  vm.runInContext(slice, context);
  return context;
}

test('相关词输入：中英文逗号/顿号/分号都能分隔，去重、去空、上限 8 个', () => {
  const c = loadVocabularyUi([]);
  const parse = value => Array.from(c.parseRelatedWordsInput(value));
  assert.deepEqual(parse('蛋挞, 蛋糕，冰淇淋、甜甜圈; 布丁'), ['蛋挞', '蛋糕', '冰淇淋', '甜甜圈', '布丁']);
  assert.deepEqual(parse('蛋挞, 蛋挞 ,蛋糕'), ['蛋挞', '蛋糕'], '重复的只留一个');
  assert.deepEqual(parse('  ,  ，'), []);
  assert.deepEqual(parse(''), []);
  assert.deepEqual(parse('a'.repeat(21)), [], '超过 20 字的词不是标签，丢掉');
  assert.deepEqual(parse('1,2,3,4,5,6,7,8,9,10'), ['1', '2', '3', '4', '5', '6', '7', '8'], '最多 8 个');
});

test('词表区块整段能渲染：三列表头 + 顶部「补翻译 / 同步库内标签 / 刷新」', () => {
  const c = loadVocabularyUi([
    { id: 'el:甜点', name_zh: '甜点', name_en: 'Dessert', kind: 'element', source: 'manual', related: ['蛋挞'] }
  ]);
  const html = c.tagVocabularyHtml();
  assert.equal((html.match(/<th>/g) || []).length, 3, 'v900：只剩三列（中文名 / 英文名 / 相关词）');
  assert.match(html, /<th>中文名<\/th>/);
  assert.match(html, /<th>英文名（可直接改）<\/th>/);
  assert.match(html, /<th>相关词（逗号分隔）<\/th>/);
  assert.doesNotMatch(html, /<th>操作<\/th>/, '删除按钮撤掉后操作列也去掉了');
  assert.match(html, /data-tv-translate="1"/, '保留补翻译');
  assert.match(html, /data-tv-sync="1"/, 'v900：新增「同步库内标签」');
  assert.match(html, /data-tv-refresh="1"/, '保留刷新');
  assert.doesNotMatch(html, /data-tv-suggest="1"|AI 自动归类/, 'AI 自动归类按钮已删');
  assert.match(html, /这张表 = 站内正在用的标签，由数据库自动同步/, '提示里说明词表来源与同步机制');
  assert.doesNotMatch(html, /别名|上位词/, '别名/上位词字样不再出现在界面上');
});

test('词表是一张平表：中文名 | 英文名 | 相关词（没有删除按钮）', () => {
  const c = loadVocabularyUi([
    { id: 'el:甜点', name_zh: '甜点', name_en: 'Dessert', kind: 'element', source: 'manual', related: ['蛋挞', '蛋糕'] },
    { id: 'el:披萨', name_zh: '披萨', name_en: 'Pizza', kind: 'element', source: 'ai', related: [] }
  ]);
  const html = c.tagVocabularyRowsHtml();
  assert.match(html, /data-tv-en="el:甜点"/);
  assert.match(html, /data-tv-related="el:甜点"/);
  assert.match(html, /value="蛋挞，蛋糕"/, '相关词用中文逗号回填到输入框');
  assert.doesNotMatch(html, /data-tv-delete/, 'v900：删除按钮撤掉（词表由数据库自动收全/清孤儿）');
  assert.doesNotMatch(html, /data-tv-collapse|data-tv-alias|↳|\bdepth\b/, '不再有折叠/缩进/别名');
  assert.equal((html.match(/<tr>/g) || []).length, 2, '一行一个词，不分组');
});

test('词表里「不做标签」的行不进表；词表内搜索连相关词一起搜', () => {
  const rows = [
    { id: 'el:甜点', name_zh: '甜点', name_en: 'Dessert', kind: 'element', related: ['蛋挞'] },
    { id: 'el:旧词', name_zh: '旧词', name_en: '', kind: 'ignored', related: [] }
  ];
  const c = loadVocabularyUi(rows);
  assert.doesNotMatch(c.tagVocabularyRowsHtml(), /旧词/, 'ignored 的行不显示');
  assert.equal(c.tagVocabularyTableRows().length, 1);
  assert.equal(c.tagVocabularyRowMatches(rows[0], '蛋挞'), true, '相关词也参与词表内搜索');
  assert.equal(c.tagVocabularyRowMatches(rows[0], 'pizza'), false);
  const searched = loadVocabularyUi(rows, { query: '蛋挞' });
  assert.equal(searched.tagVocabularyVisibleRows().length, 1);
});

test('sql/024 未执行时降级：相关词列只读', () => {
  const c = loadVocabularyUi([
    { id: 'el:甜点', name_zh: '甜点', name_en: '', kind: 'element' }
  ], { relatedReady: false });
  const html = c.tagVocabularyRowsHtml();
  assert.match(html, /data-tv-related="el:甜点" value="" disabled/);
  assert.doesNotMatch(html, /data-tv-suggest-related/, 'v899：AI 建议按钮已从界面撤掉（端点留着备用）');
});

test('搜索三层：① 原词 ② 中英归一 ③ 相关词（搜「甜点」带出蛋挞/蛋糕）', () => {
  const c = loadQueryTerms([
    { name_zh: '甜点', name_en: 'Dessert', related: ['蛋挞', '蛋糕'] },
    { name_zh: '咖啡', name_en: 'Coffee', related: [] }
  ]);
  const terms = value => Array.from(c.tagVocabularyQueryTerms(value));
  assert.deepEqual(terms('甜点'), ['甜点', 'dessert', '蛋挞', '蛋糕'], '大词带上相关词');
  assert.deepEqual(terms('coffee'), ['coffee', '咖啡'], '英文归一（大小写不敏感）');
  assert.deepEqual(terms('Dessert'), ['dessert', '甜点', '蛋挞', '蛋糕'], '英文写法也能命中中文概念');
  assert.deepEqual(terms('不存在的词'), ['不存在的词'], '词表外的词只按原词匹配');
  assert.deepEqual(terms(''), []);
});

test('搜索接进 libraryItemQueryMatchRank（不是只改渲染）', () => {
  assert.match(appSource, /const vocabTerms = \(typeof tagVocabularyQueryTerms === 'function'\) \? tagVocabularyQueryTerms\(tokens\[i\]\) : \[\];/);
  assert.match(appSource, /vocabTerms\.some\(function\(t\) \{ return t !== tokens\[i\] && text\.includes\(t\); \}\)/);
});

test('界面残留清理：没有 AI 自动归类按钮、折叠分组、上位词、别名', () => {
  assert.doesNotMatch(appSource, /data-tv-suggest="1"/, 'AI 自动归类按钮要删掉');
  assert.doesNotMatch(appSource, /tag-vocabulary-suggest/, '归类端点不再被前端调用');
  assert.doesNotMatch(appSource, /data-tv-collapse|tagVocabularyCollapsed/, '折叠分组要删掉');
  assert.doesNotMatch(appSource, /data-tv-parent|tagVocabularyParentId|tagVocabularyDisplayRows/, '上位词残留要删掉');
  assert.doesNotMatch(appSource, /data-tv-alias|tagVocabularyAliasToZh/, '别名残留要删掉');
  assert.match(appSource, /const TAG_VOCABULARY_RELATED_MAX = 8;/);
  assert.match(appSource, /<th>' \+ \(zh \? '相关词（逗号分隔）'/);
  assert.match(appSource, /const TAG_VOCABULARY_RELATED_ENDPOINT = '\/api\/tag-vocabulary-related';/);
  assert.match(appSource, /saveTagVocabularyPatch\(row\.id, \{ related: merged, source: 'manual' \}\)/, 'AI 建议并进这一行后落库（函数留着备用）');
});

test('v899/v900 词表只剩「中文名 + 英文名 + 相关词」：新增/删除按钮都没了，靠数据库同步', () => {
  assert.doesNotMatch(appSource, /data-tv-add/, '新增词入口已去掉');
  assert.doesNotMatch(appSource, /tv-add-zh|tv-add-en/, '新增词输入框已去掉');
  assert.doesNotMatch(appSource, /data-tv-suggest-related/, 'AI 建议按钮已从界面撤掉');
  assert.doesNotMatch(appSource, /data-tv-delete/, 'v900：删除按钮也去掉');
  assert.doesNotMatch(appSource, /从词表删除/, '手工删除的确认文案一并删掉');
  assert.match(appSource, /placeholder="' \+ \(zh \? '相关词' : 'related'\) \+ '"/, '相关词列占位文案缩短');
  // 代替删除按钮：数据库自动同步 + 一个手动同步入口
  assert.match(appSource, /data-tv-sync="1"/);
  assert.match(appSource, /state\.supabase\.rpc\('vf_sync_tag_vocabulary'\)/);
  assert.match(appSource, /sql\/025_tag_vocabulary_auto_sync\.sql/, '失败提示里指路 sql/025');
});

test('v900 相关词在英文界面显示英文，存库仍写回库内中文标签', () => {
  assert.match(appSource, /function tagVocabularyRelatedDisplayText\(related\)/);
  assert.match(appSource, /return list\.map\(function\(word\) \{ return libraryChipDisplayLabel\(word\); \}\)\.join\('，'\);/);
  assert.match(appSource, /function tagVocabularyRelatedStorageWords\(words\)/);
  assert.match(appSource, /const canonical = libraryExpansionCanonicalTerm\(word\);/);
  assert.match(appSource, /value="' \+ escapeAttr\(tagVocabularyRelatedDisplayText\(related\)\) \+ '"/);
  assert.match(appSource, /const stored = tagVocabularyRelatedStorageWords\(next\);/);
  assert.match(appSource, /saveTagVocabularyPatch\(id, \{ related: stored, source: 'manual' \}\)/);
});

test('sql/025：词表自动同步（收全 + 删孤儿 + 三张源表触发器）', () => {
  const sql = readFileSync(join(here, '..', 'sql', '025_tag_vocabulary_auto_sync.sql'), 'utf8');
  assert.match(sql, /create or replace function public\.vf_sync_tag_vocabulary\(\)/);
  assert.match(sql, /security definer/, '要能绕过 RLS 写词表');
  assert.match(sql, /on conflict \(name_zh\) do nothing/, '只在缺词条时插入，不覆盖人工编辑');
  assert.match(sql, /unnest\(tags\) as name_zh from public\.vf_source_files/);
  assert.match(sql, /select material_type from public\.vf_asset_previews/);
  assert.match(sql, /unnest\(manual_tags\) from public\.vf_preview_ai_tags/);
  assert.match(sql, /unnest\(ai_tags\) from public\.vf_preview_ai_tags/);
  assert.match(sql, /delete from public\.vf_tag_vocabulary v\s*\n\s*where btrim\(v\.name_zh\) not in/, '删孤儿');
  ['vf_source_files', 'vf_asset_previews', 'vf_preview_ai_tags'].forEach(function(table) {
    assert.match(sql, new RegExp('after insert or update or delete on public\\.' + table), table + ' 上要有触发器');
  });
  assert.match(sql, /for each statement execute function/, '语句级触发器：一次写入只重算一遍');
  assert.match(sql, /select public\.vf_sync_tag_vocabulary\(\);/, '建完立刻回填一次');
});

test('AI 建议相关词：先收词表里已有的，词表里没有符合的才给新词（≤3）', async () => {
  const ai = await import('../functions/_ai.js');
  const vocab = ['甜点', '蛋挞', '蛋糕', '冰淇淋', '甜甜圈', '披萨'];
  // 词表里有 → 只收词表词
  assert.deepEqual(ai.parseRelatedTagSuggestions('{"related":["蛋挞","蛋糕","冰淇淋"]}', '甜点', vocab), { related: ['蛋挞', '蛋糕', '冰淇淋'], relatedNew: [] });
  assert.deepEqual(ai.parseRelatedTagSuggestions('```json\n{"related":["蛋挞","甜甜圈"]}\n```', '甜点', vocab).related, ['蛋挞', '甜甜圈'], '代码块包裹也能认');
  // 词表里没有的 → 落到 relatedNew；但词表里有命中时，新词一律丢掉
  assert.deepEqual(ai.parseRelatedTagSuggestions('{"related":["蛋挞","马卡龙"]}', '甜点', vocab), { related: ['蛋挞'], relatedNew: [] }, '有词表命中就不要新词');
  assert.deepEqual(
    ai.parseRelatedTagSuggestions('{"related":["马卡龙","布丁","舒芙蕾","司康"]}', '甜点', vocab),
    { related: [], relatedNew: ['马卡龙', '布丁', '舒芙蕾'] },
    '一个词表词都没命中时，才给新词，最多 3 个'
  );
  // 不返回自己、不重复
  assert.deepEqual(ai.parseRelatedTagSuggestions('{"related":["甜点","蛋挞","蛋挞"]}', '甜点', vocab), { related: ['蛋挞'], relatedNew: [] });
  assert.deepEqual(ai.parseRelatedTagSuggestions('{"related":["披萨"]}', '披萨', vocab), { related: [], relatedNew: [] }, '只返回自己等于没建议');
  assert.deepEqual(ai.parseRelatedTagSuggestions('not json', '甜点', vocab), { related: [], relatedNew: [] });
  assert.deepEqual(ai.parseRelatedTagSuggestions('', '甜点', []), { related: [], relatedNew: [] });
  const many = Array.from({ length: 12 }, (_, i) => '词' + i);
  assert.equal(ai.parseRelatedTagSuggestions(JSON.stringify({ related: many }), '甜点', many).related.length, 8, '词表命中最多 8 个');
});

test('相关词建议端点：限管理员、候选词从词表来', () => {
  const apiSource = readFileSync(join(here, '..', 'functions', 'api', 'tag-vocabulary-related.js'), 'utf8');
  assert.match(apiSource, /requireAdmin/, '要跑模型花钱，必须限管理员');
  assert.match(apiSource, /select=name_zh/, '候选词从词表取');
  assert.match(apiSource, /suggestRelatedTagsWithGlm/);
});
