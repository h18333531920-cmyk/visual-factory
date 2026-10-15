// v923（2026-10-14）：价格 / 百分比类版式文字进噪音黑名单。
// 起因：v907 的黑名单只挡「数字+券」这种形态（`3KD券`），漏了**裸售价与折扣**。
//   实测证据（腾讯云 worker 第一轮 cron + 真实库）：`ar 最终弹窗（压缩）.gif` 吐出 `50%` / `1 KD`；
//   `vf_preview_ai_tags.ai_tags` 里累计 8 处漏网：`2 KD · 1 KD · 50% · 2KD · 50% · 2KD · 50% · 50%`。
// 本轮只改**正则**，存量那 8 处**不清**（要清得把那几张图重跑一遍，属"写库"动作，不在本轮）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  isNoiseElementTag,
  parseElementSuggestions,
  parseCaseTagSuggestions,
  parseEffectSuggestions,
  ELEMENT_TAG_MAX_CHARS
} from '../functions/_ai.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const aiSource = readFileSync(join(ROOT, 'functions', '_ai.js'), 'utf8');
const appSource = readFileSync(join(ROOT, 'app.js'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');

const VOCAB = ['银行卡', '券', 'kiki', '手机', 'PS5', '餐桌', '汉堡'];

// 必须被丢：真实库里那 8 处漏网 + 用户点名的形态
const DROP = ['50%', '12.5%', '2 KD', '1 KD', '2KD', '3 KD off', '2折', '50% off'];
// 必须保留：一条都不能少。3D / 4K / 5G / 2K 是技术规格词，PS5 是型号 —— 这是本轮最容易翻车的地方
const KEEP = ['PS5', '3D', '5G', '4K', '2K', '一人食', '两人份', '汉堡', '餐桌', 'kiki'];

const suggest = (word) => parseElementSuggestions(JSON.stringify({ elements: [word] }), VOCAB);

/* ── 1) 正例：价格 / 百分比一律丢 ─────────────────────────────────────── */

test('v923 价格噪音全形态丢弃（贴库实测那 8 处 + 用户点名形态）', () => {
  for (const word of DROP) {
    assert.equal(isNoiseElementTag(word), true, `${word} 是价格/百分比，必须算噪音`);
    assert.deepEqual(suggest(word), [], `${word} 不许进标签`);
  }
  // 真实库里出现过的原样 8 处（含重复），一条都不许漏
  const fromDb = ['2 KD', '1 KD', '50%', '2KD', '50%', '2KD', '50%', '50%'];
  assert.deepEqual(parseElementSuggestions(JSON.stringify({ elements: fromDb }), VOCAB), []);
});

test('v923 价格与真实元素混在一起时，只丢价格', () => {
  const raw = '{"elements":["50%","2 KD","汉堡","kiki","2折"]}';
  assert.deepEqual(parseElementSuggestions(raw, VOCAB), ['汉堡', 'kiki']);
  // 组识别 / 逐图识别 / 上传建议三条链路都从 parseElementSuggestions 走，同一条黑名单
  assert.deepEqual(
    parseCaseTagSuggestions('{"elements":["50%","餐桌","2 KD"],"activity":"聚餐"}', VOCAB, ['聚餐']),
    { elements: ['餐桌'], activity: '聚餐', effects: [] }
  );
});

/* ── 2) 反例：规格词 / 型号 / 中文数字量词一条都不能误伤 ───────────────── */

test('v923 不误伤：技术规格与型号词照常保留（3D / 4K / 5G / 2K / PS5）', () => {
  for (const word of KEEP) {
    assert.equal(isNoiseElementTag(word), false, `${word} 不是价格，不许丢`);
    assert.deepEqual(suggest(word), [word], `${word} 必须原样返回`);
  }
});

test('v923 不误伤：中文数字量词（一人食 / 两人份）不是阿拉伯数字，天然不受影响', () => {
  assert.deepEqual(parseElementSuggestions('{"elements":["一人食","两人份","双人餐"]}', VOCAB), ['一人食', '两人份', '双人餐']);
});

/* ── 3) 两条路径行为一致 + 白名单口径被源码锁住 ────────────────────────── */

test('v923 isNoiseElementTag 与 parseElementSuggestions 逐条一致', () => {
  for (const word of DROP) {
    assert.equal(isNoiseElementTag(word), true);
    assert.deepEqual(suggest(word), [], `${word}：黑名单说丢，解析就必须丢`);
  }
  for (const word of KEEP) {
    assert.equal(isNoiseElementTag(word), false);
    assert.deepEqual(suggest(word), [word], `${word}：黑名单说留，解析就必须留`);
  }
  // 「数字+空格+货币」的形态要能过 trim/长度这道关，否则正则白写：
  // `2 KD` = 4 字 ≤ ELEMENT_TAG_MAX_CHARS，走得到 isNoiseElementTag。
  assert.equal('2 KD'.length <= ELEMENT_TAG_MAX_CHARS, true);
  assert.equal('3 KD off'.length > ELEMENT_TAG_MAX_CHARS, true, '`3 KD off`（8 字）在元素路径上本就超长被丢；正则层面仍要判定为噪音');
  assert.equal(isNoiseElementTag('3 KD off'), true);
});

test('v923 货币/单位走白名单，绝不写成「数字+任意字母」', () => {
  const block = aiSource.slice(
    aiSource.indexOf('// ── v923：价格 / 百分比'),
    aiSource.indexOf('];', aiSource.indexOf('// ── v923：价格 / 百分比'))
  );
  assert.ok(block, 'v923 的正则段要能被定位到');
  assert.match(block, /KWD\|KD\|SAR\|AED\|QAR\|BHD\|OMR\|EGP\|USD/, '货币要走白名单');
  assert.doesNotMatch(block, /\[A-Za-z\]/, 'v923 这段不许出现"任意字母"类 —— 3D / 4K / 5G / 2K 会被误杀');
  assert.match(block, /\\d\+\(\?:\[\.\,\]\\d\+\)\?\\s\*\[%％\]\$/); // 百分比形态
});

/* ── 4) 效果标签那条路同样受益（只有一套黑名单，没有第二套口径） ───────── */

test('v923 效果标签走同一个 isNoiseElementTag，价格词也进不来', () => {
  const EFFECT_SEEDS = ['爆炸', '粒子', '光效', '缩放'];
  const polluted = ['爆炸', '50%', '2 KD', '2折', '文字'];
  assert.deepEqual(parseEffectSuggestions('{"effects":["爆炸","50%","2 KD","2折","文字"]}', polluted), ['爆炸']);
  // 只有一条口径：两个解析函数都调同一个 isNoiseElementTag
  assert.equal((aiSource.match(/if \(isNoiseElementTag\(finalWord\)\) continue;/g) || []).length, 2,
    '元素与效果两条路共用同一个黑名单函数，不许各写一套');
  assert.ok(EFFECT_SEEDS.every((w) => isNoiseElementTag(w) === false));
});

/* ── 5) 版本号六处同步（index.html 5 处 + app.js 1 处） ───────────────── */

test('v923 版本号六处同步（index.html 5 处 + app.js 1 处）', () => {
  assert.equal((indexSource.match(/\?v=20261015-canonical-query-v955/g) || []).length, 5);
  assert.match(appSource, /const TOOL_UI_VERSION = '20261015-canonical-query-v955'/);
});
