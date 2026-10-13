// v907（2026-10-13）：识别结果里的**版式/文字/颜色类噪音**由代码兜底丢弃。
// 起因：抽检实验项目 28 行实测到「文字 / 阿拉伯文 / 数字3 / 绿色横幅 / 绿色背景 / 3KD券」——
// 提示词早就写了「不要文字、不要颜色」，但模型在几乎没有实体的图上（会场楼层长条、腰封、纯色横幅）
// 照样吐。这里锁住黑名单行为，同时锁住「不误伤正常词」这一面。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseElementSuggestions, parseCaseTagSuggestions, isNoiseElementTag, ELEMENT_TAG_NOISE_WORDS } from '../functions/_ai.js';

const here = dirname(fileURLToPath(import.meta.url));
const aiSource = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');
const VOCAB = ['银行卡', '券', 'kiki', '手机', 'PS5'];

test('v907 实测噪音词全部丢弃，真实元素保留', () => {
  const raw = '{"elements":["文字","阿拉伯文","数字3","绿色横幅","绿色背景","3KD券","券","汉堡"]}';
  assert.deepEqual(parseElementSuggestions(raw, VOCAB), ['券', '汉堡'], '券是真实元素，必须保留');
  assert.deepEqual(parseElementSuggestions('{"elements":["文字","阿拉伯文"]}', VOCAB), [], '整张只有版式信息 → 返回空数组');
});

test('v907 颜色词 / 背景类 / 标志类 / 数字类一律丢', () => {
  assert.deepEqual(parseElementSuggestions('{"elements":["绿色","红色","黑色","纯色","底色"]}', VOCAB), []);
  assert.deepEqual(parseElementSuggestions('{"elements":["背景","色块","图形","横幅","标志","品牌","logo"]}', VOCAB), []);
  assert.deepEqual(parseElementSuggestions('{"elements":["数字","数字12","标题","标语","价格","水印"]}', VOCAB), []);
});

test('v907 不误伤：颜色字开头的正常食材、含数字的型号词照常保留', () => {
  assert.deepEqual(
    parseElementSuggestions('{"elements":["黄瓜","红茶","白菜","黑胡椒","金牛"]}', VOCAB),
    ['黄瓜', '红茶', '白菜', '黑胡椒', '金牛']
  );
  assert.deepEqual(parseElementSuggestions('{"elements":["PS5"]}', VOCAB), ['PS5']);
  assert.deepEqual(parseElementSuggestions('{"elements":["餐桌","汉堡"]}', VOCAB), ['餐桌', '汉堡']);
});

test('v907 组识别（多图）与活动主题走同一条黑名单', () => {
  const out = parseCaseTagSuggestions('{"elements":["文字","餐桌","绿色背景"],"activity":"聚餐"}', VOCAB, ['聚餐']);
  assert.deepEqual(out, { elements: ['餐桌'], activity: '聚餐' });
});

test('v907 isNoiseElementTag 可直接调用，黑名单可导出复用', () => {
  assert.equal(isNoiseElementTag('绿色背景'), true);
  assert.equal(isNoiseElementTag('数字3'), true);
  assert.equal(isNoiseElementTag('3KD券'), true);
  assert.equal(isNoiseElementTag('餐桌'), false);
  assert.equal(isNoiseElementTag(''), true, '空词一律算噪音');
  assert.ok(ELEMENT_TAG_NOISE_WORDS.has('文字'));
});

test('v907 提示词加了「没有实体就返回空数组」的口径', () => {
  assert.match(aiSource, /elements 必须返回空数组/, '必须有空数组兜底口径');
  assert.match(aiSource, /这类版式\/文字类词/, '禁止例要点名版式/文字类词');
});
