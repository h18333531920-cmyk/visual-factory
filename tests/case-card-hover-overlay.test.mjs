// 案例项目卡「封面即卡片」（v735）的静态不变量。
// 背景：卡片原先在封面下方挂一块标题/国家/物料数的 meta 区，卡片比封面高一截，
// 四列分列时也把它当高度算。用户要求对齐模版库的悬停形式：默认只显示封面，
// hover/focus 时底部浮出黑色渐变，渐变上放标题、国家/活动标签与物料数。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const stylesSource = readFileSync(join(here, '..', 'styles.css'), 'utf8');

test('旧的封面下 meta 区彻底移除', () => {
  for (const [name, source] of [['app.js', appSource], ['styles.css', stylesSource]]) {
    assert.doesNotMatch(source, /case-card-meta/, name + ' 不应再有 case-card-meta');
    assert.doesNotMatch(source, /case-card-owner/, name + ' 不应再有 case-card-owner');
  }
});

test('信息覆盖层在封面容器内：位于图标层之后、thumb-wrap 收口之前', () => {
  const fnStart = appSource.indexOf('function renderCaseProjectCard(item) {');
  assert.ok(fnStart > 0, 'renderCaseProjectCard 必须存在');
  const body = appSource.slice(fnStart, appSource.indexOf('// 编辑项目信息', fnStart));
  const iconsIdx = body.indexOf('<div class="library-card-icons">');
  const overlayIdx = body.indexOf('<div class="case-card-overlay">');
  assert.ok(iconsIdx > 0 && overlayIdx > iconsIdx, '覆盖层必须在图标层之后、同一个 thumb-wrap 里');
  const tail = body.slice(overlayIdx);
  assert.match(tail, /<strong>\$\{escapeHtml\(source\.title\)\}<\/strong>/, '覆盖层里要有标题');
  assert.match(tail, /source\.country_id \? `<span class="case-chip">/, '国家标签在覆盖层里');
  assert.match(tail, /source\.activity_id \? `<span class="case-chip">/, '活动标签在覆盖层里');
  assert.match(tail, /<span class="case-card-count">\$\{state\.lang === 'zh' \? materials\.length \+ ' 个物料'/, '物料数在覆盖层里');
  // 覆盖层闭合后紧接着 thumb-wrap 与 article 的收口——信息块不再落到封面外面
  assert.match(tail, /<\/div>\s*<\/div>\s*<\/article>/);
});

test('覆盖层样式：默认隐藏，底部黑色渐变，hover/focus 浮出', () => {
  const blockStart = appSource.indexOf('.library-case-card .case-card-overlay {');
  assert.ok(blockStart > 0, '覆盖层基础样式必须存在');
  const rule = appSource.slice(blockStart, appSource.indexOf('}', blockStart));
  assert.match(rule, /position: absolute;/);
  assert.match(rule, /inset: auto 0 0;/);
  assert.match(rule, /linear-gradient\(180deg, rgba\(5, 8, 12, 0\) 0%, rgba\(5, 8, 12, 0\.5\) 55%, rgba\(5, 8, 12, 0\.9\) 100%\)/);
  assert.match(rule, /opacity: 0;/);
  assert.match(rule, /pointer-events: none;/);
  const revealStart = appSource.indexOf('.library-case-card:hover .case-card-overlay,');
  assert.ok(revealStart > blockStart, 'hover 显示规则必须存在');
  const reveal = appSource.slice(revealStart, appSource.indexOf('}', revealStart));
  assert.match(reveal, /\.library-case-card:focus-within \.case-card-overlay/);
  assert.match(reveal, /opacity: 1;/);
  assert.match(reveal, /transform: translateY\(0\);/);
  // 渐变上的文字与标签用白色系
  assert.match(appSource, /\.case-card-overlay strong \{[^}]*color: #fff;/);
  assert.match(appSource, /\.case-card-overlay \.case-chip \{ background: rgba\(255, 255, 255, 0\.2\); color: #fff; \}/);
  assert.match(appSource, /\.case-card-overlay \.case-card-count \{[^}]*rgba\(255, 255, 255, 0\.82\)/);
});

test('覆盖层挂在 thumb-wrap 上：锚点相对定位、圆角裁切', () => {
  const wrapRules = stylesSource.match(/\.library-thumb-wrap \{[^}]*\}/g) || [];
  assert.ok(wrapRules.some(rule => /position: relative;/.test(rule)), 'thumb-wrap 必须撑起绝对定位锚点');
  assert.ok(wrapRules.some(rule => /overflow: hidden;/.test(rule)), 'thumb-wrap 必须裁掉溢出圆角的渐变');
});

test('分列高度只算封面：不再给 meta 预留', () => {
  const fnStart = appSource.indexOf('function caseCardHeightEstimate(item) {');
  assert.ok(fnStart > 0, 'caseCardHeightEstimate 必须存在');
  const body = appSource.slice(fnStart, appSource.indexOf('\n  }', fnStart));
  assert.match(body, /return \(pw && ph\) \? ph \/ pw : 1\.33;/);
  assert.doesNotMatch(body, /\+ 0\.4/);
});
