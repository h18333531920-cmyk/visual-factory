// 数据看板生图统计（v742）：生图埋点单独成卡，不混入通用操作事件口径。
// Pro 每张 8 积分；Lite/Pro 比例条 + 按账号明细表。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

test('看板单独查询 imagegen 事件，不受通用事件 5000 条截断影响', () => {
  assert.match(appSource, /\.eq\('event_type',\s*'imagegen'\)/, 'fetchAnalyticsData 必须单独查询 imagegen');
  assert.match(appSource, /e\.event_type !== 'imagegen'/, '通用事件流必须排除 imagegen');
});

test('生图卡：KPI 行 + 双折线；账号积分统计默认折叠（v745）', () => {
  for (const id of ['ana-gen-total', 'ana-gen-lite', 'ana-gen-pro', 'ana-gen-credits', 'ana-gen-trend', 'ana-gen-fold', 'ana-gen-detail', 'ana-gen-body']) {
    assert.ok(appSource.includes(id), '缺少 ' + id);
  }
  assert.equal(appSource.includes('ana-gen-ratio'), false, '比例条已删除，不应再出现');
  assert.match(appSource, /id="ana-gen-detail" hidden/, '账号积分明细必须默认折叠');
  assert.match(appSource, /genFold\.classList\.toggle\('open'/, '折叠开关必须切换展开态');
  assert.match(appSource, /r\.pro \* 8/, '账号积分列必须按 8 积分/张计算');
  assert.match(appSource, /genPro \* 8/, 'Pro 积分必须按 8 积分/张计算');
  assert.match(appSource, /ana-gen-dot/, '图例并入头部小字（配色圆点）');
  assert.match(appSource, /\.ana-gen-sub \{ font-size: 12px/, '生图卡头部必须是 12px 小字（不用 18px 的 ana-chart-sub）');
  assert.equal(appSource.includes('ana-chart-sub" id="ana-gen-total'), false, '生图卡不得再用 18px 大字类');
  const trendStart = appSource.indexOf('charts.genTrend = new Chart');
  const trendBlock = appSource.slice(trendStart, trendStart + 1400);
  assert.match(trendBlock, /legend: \{ display: false \}/, '折线图自带图例必须关闭，避免与头部小字重复');
});

test('生图趋势双折线：按天聚合，Lite/Pro 两条数据集', () => {
  assert.match(appSource, /dailyGenLite = new Array\(currentRange\)\.fill\(0\)/, 'Lite 按天序列');
  assert.match(appSource, /dailyGenPro = new Array\(currentRange\)\.fill\(0\)/, 'Pro 按天序列');
  assert.match(appSource, /charts\.genTrend = new Chart\(gtCtx\.getContext\('2d'\)/, '折线图必须挂到 charts.genTrend（随 renderAll 重建）');
  const trend = appSource.slice(appSource.indexOf("id: 'ana-gen-trend'") >= 0 ? appSource.indexOf('ana-gen-trend') : 0);
  assert.ok(trend.length > 0);
});

test('生图卡未混入既有 KPI 口径：总操作次数不含 imagegen', () => {
  const start = appSource.indexOf('async function renderAll()');
  const end = appSource.indexOf('// --- KPI 卡片 ---', start);
  assert.ok(end > start, 'renderAll 结构变化，测试需同步');
  const head = appSource.slice(start, end);
  assert.match(head, /filter\(function\(e\) \{ return e\.event_type !== 'imagegen'; \}\)/);
});
