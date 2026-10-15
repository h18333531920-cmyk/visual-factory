// v859→v860：「高不固定」的百分比范围改符号下拉——用户建议「大于小于号的下拉菜单」：
// 下拉四选「不限 / ≤（不超过） / ≥（不低于） / ~（介于）」，选中后填纯数字，不再手打 ≤、~ 符号；
// 常态气泡无范围也标明「高不限」。盯住四件事：
// ①读控件时由下拉值+数字拼范围（cap/floor/range）；②没填数字要判无效；③常态展示把范围含义写明白；
// ④数据层新增 ≥N%（高至少是宽的 N%）解析、标签、序列化、匹配（bandMax=null → 上限开放）全链路。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

// ── 静态结构断言 ──────────────────────────────────────────────

test('编辑控件：符号下拉（不限/≤/≥/~）+ 纯数字框，不再有模式钮和手打符号输入框', () => {
  const start = appSource.indexOf('function materialCatalogDimensionMarkup');
  assert.ok(start >= 0, 'materialCatalogDimensionMarkup 必须存在');
  const end = appSource.indexOf('function materialCatalogReadDimension', start);
  const body = appSource.slice(start, end);
  assert.doesNotMatch(body, /material-catalog-band-mode/, '旧模式钮应已替换为下拉');
  assert.doesNotMatch(body, /placeholder="\$\{zh \? '≤30 或 30~150'/, '旧的 ≤~ 手打输入框应已移除');
  assert.match(body, /material-catalog-band-op/, '要有符号下拉');
  assert.match(body, /<option value=""\$\{!bandOn \? ' selected' : ''\}/, '下拉要有「不限」空值选项');
  assert.match(body, /value="cap"/, '下拉要有 ≤（不超过）');
  assert.match(body, /value="floor"/, '下拉要有 ≥（不低于）');
  assert.match(body, /value="range"/, '下拉要有 ~（介于）');
  assert.match(body, /material-catalog-band-pre/, '要有「宽的」连接词（连读成完整句子）');
  assert.match(body, /inputmode="decimal"/, '百分比框是纯数字输入');
  assert.match(body, /data-material-dim-band-op/, '下拉属性名');
  assert.match(body, /data-material-dim-band-min/, '范围起点属性名');
  assert.match(body, /data-material-dim-band-max/, '范围终点属性名');
});

test('读取控件：由下拉值+数字拼范围文本，选了符号没填数字判无效', () => {
  const start = appSource.indexOf('function materialCatalogReadDimension');
  const end = appSource.indexOf('var MATERIAL_NEW_DIM_ATTRS', start);
  const body = appSource.slice(start, end);
  assert.match(body, /op === 'cap'/, '读下拉 cap 值');
  assert.match(body, /op === 'floor'/, '读下拉 floor 值（≥ 新语义）');
  assert.match(body, /op === 'range'/, '读下拉 range 值');
  assert.match(body, /band = '≤' \+ n \+ '%'/, '不超过 → ≤N%');
  assert.match(body, /band = '≥' \+ n \+ '%'/, '不低于 → ≥N%');
  assert.match(body, /Math\.min\(a, b\) \+ '%~' \+ Math\.max\(a, b\) \+ '%'/, '介于 → 归一化 N%~M%（写反也认）');
  assert.match(body, /if \(!\(n > 0\)\) return null;/, '符号选了没填数字 → 无效');
  assert.match(body, /if \(!\(a > 0\) \|\| !\(b > 0\)\) return null;/, '介于缺任一数字 → 无效');
  // 保存报错文案要提到符号和数字
  assert.match(appSource, /选了符号（≤ \/ ≥ \/ ~）就要填百分比数字/, '保存报错文案要说明数字必填');
});

test('常态展示：带范围写「高≤宽的30% / 高≥宽的30% / 高为宽的30%~150%」，无范围标「高不限」', () => {
  const start = appSource.indexOf('function materialCatalogSizeLabel');
  const end = appSource.indexOf('── 物料清单（v707）结束', start);
  const body = appSource.slice(start, end);
  assert.match(body, /（高不限）/, '无范围通配要标「高不限」');
  assert.match(body, /any ratio/, '英文侧也要标明');
});

// ── 行为断言：直接跑解析与拼装函数 ──────────────────────────

function extractBlock(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  assert.ok(start >= 0, startMarker + ' 必须存在');
  const end = appSource.indexOf(endMarker, start);
  assert.ok(end > start, endMarker + ' 锚点必须在后面');
  return appSource.slice(start, end);
}

function loadSizeHelpers() {
  // 从 MATERIAL_SIZE_WILDCARD 到 materialCatalogSizeLabel 结束，取纯函数段
  const block = extractBlock('var MATERIAL_SIZE_WILDCARD', '// 物料所有者「可输入可联想」下拉');
  const factory = new Function('var state = { lang: "zh" };\n' + block + '\nreturn { parseMaterialSizeSpec: parseMaterialSizeSpec, materialCatalogSizeFromParts: materialCatalogSizeFromParts, materialSizeBandLabelText: materialSizeBandLabelText };');
  return factory();
}

test('拼装链路：结构化读出的范围文本能落成合法清单尺寸（≤/≥/~ 三种）', () => {
  const mod = loadSizeHelpers();
  // 不超过：读控件得到 '≤30%'
  assert.equal(mod.materialCatalogSizeFromParts('750', '', true, '≤30%'), '750×高不固定≤30%');
  // 不低于（v860 新增）：读控件得到 '≥30%'
  assert.equal(mod.materialCatalogSizeFromParts('750', '', true, '≥30%'), '750×高不固定≥30%');
  // 介于：读控件归一化后得到 '30%~150%'
  assert.equal(mod.materialCatalogSizeFromParts('750', '', true, '30%~150%'), '750×高不固定30%~150%');
  assert.equal(mod.materialCatalogSizeFromParts('750', '', true, '150%~30%'), '750×高不固定30%~150%', '写反也按小到大归一');
  // 不限：无 band
  assert.equal(mod.materialCatalogSizeFromParts('750', '', true, ''), '750×高不固定');
  // 配了范围可以不填宽（三种符号都行）
  assert.equal(mod.materialCatalogSizeFromParts('', '', true, '≤30%'), '高不固定≤30%');
  assert.equal(mod.materialCatalogSizeFromParts('', '', true, '≥30%'), '高不固定≥30%');
  assert.equal(mod.materialCatalogSizeFromParts('', '', true, '30%~150%'), '高不固定30%~150%');
  // 无范围且无宽 → 无效
  assert.equal(mod.materialCatalogSizeFromParts('', '', true, ''), '');
});

test('解析回读：≥N% 落库后 bandMin=30、bandMax=null（上限开放，匹配层天然支持）', () => {
  const mod = loadSizeHelpers();
  const spec = mod.parseMaterialSizeSpec('750×高不固定≤30%');
  assert.equal(spec.bandMin, null);
  assert.equal(spec.bandMax, 30);
  const floor = mod.parseMaterialSizeSpec('750×高不固定≥30%');
  assert.equal(floor.bandMin, 30);
  assert.equal(floor.bandMax, null);
  const floorBare = mod.parseMaterialSizeSpec('高不固定≥30%');
  assert.ok(floorBare, '不锚宽的 ≥ 通配也有效');
  assert.equal(floorBare.bandMin, 30);
  assert.equal(floorBare.bandMax, null);
  const spec2 = mod.parseMaterialSizeSpec('750×高不固定30%~150%');
  assert.equal(spec2.bandMin, 30);
  assert.equal(spec2.bandMax, 150);
});

test('常态标签：范围含义一目了然（含 v860 新增的 ≥）', () => {
  const mod = loadSizeHelpers();
  assert.equal(mod.materialSizeBandLabelText(mod.parseMaterialSizeSpec('750×高不固定≤30%')), '高≤宽的30%');
  assert.equal(mod.materialSizeBandLabelText(mod.parseMaterialSizeSpec('750×高不固定≥30%')), '高≥宽的30%');
  assert.equal(mod.materialSizeBandLabelText(mod.parseMaterialSizeSpec('750×高不固定30%~150%')), '高为宽的30%~150%');
  assert.equal(mod.materialCatalogSizeFromParts && '', ''); // 占位，保持结构
  const label = mod.materialSizeBandLabelText(mod.parseMaterialSizeSpec('750×高不固定≥30%'));
  assert.match(label, /^高≥宽的30%$/);
});

test('预设：楼层条带 ≤30% 范围（薄条不再和无范围头图混同）', () => {
  assert.match(appSource, /name: '楼层条', sizes: \['750×高不固定≤30%'\]/);
});

test('弹窗联动：下拉 change 触发 syncBand（select 原生单选，无双活跃互斥问题）', () => {
  const start = appSource.indexOf('v860：符号下拉三态');
  assert.ok(start >= 0, 'v860 三态联动注释必须存在');
  const end = appSource.indexOf('pop.querySelector(\'[data-material-dim-save]\')', start);
  const body = appSource.slice(start, end);
  assert.match(body, /opSelect\.addEventListener\('change'/, '下拉 change 联动显示数字框');
  assert.match(body, /op === 'floor'/, 'syncBand 认 floor 值');
  assert.doesNotMatch(body, /classList\.contains\('is-active'\) && rangeBtn/, '旧的按钮双活跃保护应已移除');
});
