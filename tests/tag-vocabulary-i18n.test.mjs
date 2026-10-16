import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const policySource = readFileSync(join(here, '..', 'functions', '_account-data-policy.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');

test('标签词表：解析 AI 返回的译名（容忍代码块、只取请求过的词、原样返回视为未翻译）', async () => {
  const ai = await import('../functions/_ai.js');
  assert.deepEqual(ai.parseTagTranslations('{"translations":{"披萨":"Pizza"}}', ['披萨']), {披萨: 'Pizza'});
  assert.deepEqual(
    ai.parseTagTranslations('```json\n{"translations":{"炸鸡":"Fried Chicken"}}\n```', ['炸鸡']),
    {炸鸡: 'Fried Chicken'},
    '代码块包裹也能认'
  );
  assert.deepEqual(
    ai.parseTagTranslations('{"translations":{"汉堡":"Burger","薯条":"Fries"}}', ['汉堡']),
    {汉堡: 'Burger'},
    '没请求过的词不进结果'
  );
  assert.deepEqual(ai.parseTagTranslations('{"translations":{"披萨":"披萨"}}', ['披萨']), {}, '原样返回等于没翻出来');
  assert.deepEqual(ai.parseTagTranslations(JSON.stringify({translations: {披萨: 'x'.repeat(80)}}), ['披萨']), {}, '超长译名丢弃');
  assert.deepEqual(ai.parseTagTranslations('not json', ['披萨']), {});
  assert.deepEqual(ai.parseTagTranslations('', []), {});
});

test('前端：英文界面查词表译名，缺表时永久退回原文', () => {
  assert.match(appSource, /const TAG_VOCABULARY_TABLE = 'vf_tag_vocabulary'/);
  assert.match(appSource, /return tagVocabularyByName\.get\(label\) \|\| LIBRARY_LABELS_EN\[label\] \|\| label;/);
  assert.match(appSource, /function isMissingTagVocabularyError/);
  assert.match(appSource, /tagVocabularyReady = false;/);
  assert.match(appSource, /await ensureTagTranslations\(\);/);
  assert.match(appSource, /TAG_TRANSLATE_MAX_ATTEMPTS/, '漏翻的词允许重试但有上限，不会每次加载都打接口');
  assert.match(appSource, /tagTranslateAttempts\.set\(label/, '按词记录尝试次数');
  assert.match(appSource, /data-preview-manual-remove="' \+ escapeAttr\(tag\)/, '按钮动作仍用原始标签，不能被译名污染');
  assert.match(appSource, /escapeHtml\(libraryDisplayLabel\(tag\)\)/, '面板标签按界面语言显示');
  assert.match(appSource, /data-case-tag-ai-value="' \+ escapeAttr\(value\) \+ '">' \+ escapeHtml\(libraryDisplayLabel\(value\)\)/, 'AI 建议标签按界面语言显示，动作仍用原始值');
  assert.match(appSource, /tagVocabularyByEn\.get\(label\.toLowerCase\(\)\)/, '中文界面能把英文标签反向显示成中文');
  assert.match(appSource, /void ensureTagTranslations\(\)\.then/, '切语言时自动补翻并重绘');
});

test('新表与新端点：代理白名单已登记、版本号六处同步', () => {
  assert.match(policySource, /'vf_tag_vocabulary'/, '非维护账号要能读词表');
  assert.match(indexSource, /app\.js\?v=20261016-uploader-delete-v958/);
  const refs = indexSource.match(/\?v=20261016-uploader-delete-v958/g) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处版本号');
  assert.match(appSource, /const TOOL_UI_VERSION = '20261016-uploader-delete-v958'/);
});

test('标签词表：自动更新（中文界面也补翻，不阻塞渲染）', () => {
  assert.match(appSource, /void translateMissingTagNames\(collectTagLabelsInUse\(\)\)\.catch/, '中文界面后台补翻');
  assert.doesNotMatch(appSource, /tagVocabularyReady !== true \|\| state\.lang !== 'en'/, '补翻不应只在英文界面发生');
});

test('标签词表：搜索三层（子串 + 中英归一 + 相关词）', () => {
  assert.match(appSource, /select\('id,name_zh,name_en,kind,related'\)/, '词表要读相关词');
  assert.match(appSource, /\/related\/i\.test\(String\(result\.error\.message/, 'sql/024 未执行时要能退化');
  assert.match(appSource, /function tagVocabularyQueryTerms/, '要有查询归一');
  assert.match(appSource, /\(Array\.isArray\(row && row\.related\) \? row\.related : \[\]\)\.forEach\(push\)/, '相关词要一起参与匹配');
  assert.match(appSource, /tagVocabularyRelatedToZh\.get\(lower\)/, 'v905：反向相关词（搜「桌子」命中填了它的「餐桌」行）');
  assert.match(appSource, /const vocabTerms = \(typeof tagVocabularyQueryTerms === 'function'\)/, '搜索匹配要接入词表归一');
  const sqlSource = readFileSync(join(here, '..', 'sql', '024_tag_vocabulary_related.sql'), 'utf8');
  assert.match(sqlSource, /add column if not exists related text\[\] not null default '\{\}'/, 'sql/024 要有幂等的加列语句');
});
