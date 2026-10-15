// 案例封面 hover 浮窗（v722 优化）的静态不变量。
// 背景：浮窗原为 384px 宽、88vh 高、pointer-events: auto，会完全盖住右侧卡片，
// 且卡片内每次 mouseover 都整块重建 DOM，看起来像加载很慢。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

test('浮窗尺寸压小且不拦截鼠标事件', () => {
  const css = appSource.match(/\.case-hover-pop \{[^}]*\}/);
  assert.ok(css, '找不到 .case-hover-pop 样式');
  assert.match(css[0], /max-width: 300px;/, '浮窗最大宽度应为 300px');
  assert.match(css[0], /max-height: 64vh;/, '浮窗最大高度应为 64vh');
  assert.match(css[0], /pointer-events: none;/, '浮窗不能拦截鼠标，否则会挡住下一张卡片');
});

test('同尺寸分组支持换行，缩略图宽度收窄', () => {
  const group = appSource.match(/\.case-pop-group \{[^}]*\}/);
  assert.ok(group, '找不到 .case-pop-group 样式');
  assert.match(group[0], /flex-wrap: wrap;/, '分组内容超宽要能换行');
  assert.match(appSource, /\.case-pop-group\.is-landscape \{ flex-direction: column; max-height: 56vh; \}/, '横版列高要封顶');
  assert.match(appSource, /\.case-pop-group\.is-portrait \.case-pop-thumb \{ width: 52px; \}/, '竖版缩略图宽度应为 52px');
  assert.match(appSource, /\.case-pop-group\.is-landscape \.case-pop-thumb \{ width: 100px; \}/, '横版缩略图宽度应为 100px');
});

test('浮窗只展示前 8 张并提示剩余数量', () => {
  assert.match(appSource, /const CASE_POP_MAX_ITEMS = 8;/, '需要 8 张的上限常量');
  assert.match(appSource, /const shownMaterials = materials\.slice\(0, CASE_POP_MAX_ITEMS\);/, '渲染必须用截断后的列表');
  assert.match(appSource, /more\.className = 'case-pop-more';/, '超出时要显示 .case-pop-more 提示');
  assert.match(appSource, /还有 ' \+ hiddenCount \+ ' 张/, '中文提示要带上剩余张数');
});

test('同一项目重复 mouseover 不重建浮窗 DOM', () => {
  assert.match(
    appSource,
    /if \(pop\.dataset\.caseProject === sourceId && pop\.style\.display === 'flex' && pop\.childElementCount\) return;/,
    '同一项目的重复进入必须在重建前返回'
  );
  assert.match(appSource, /pop\.dataset\.caseProject = sourceId;/, '渲染前要记录当前项目 id');
  assert.match(appSource, /if \(pop\.dataset\.caseProject !== sourceId\) return;/, '签名回填时浮窗已切换项目就跳过');
});

test('鼠标委托不再假设能命中浮窗自身', () => {
  assert.ok(
    !appSource.includes("closest('#case-hover-pop')"),
    '浮窗 pointer-events: none，事件永远到不了它身上，相关分支应删除'
  );
});

test('缩略图按记录宽高先占位，浮窗不会加载时“长高”', () => {
  assert.match(appSource, /function casePopMediaWithRatio\(preview, source\)/, '缺少 aspect-ratio 占位辅助函数');
  assert.match(appSource, /casePopMediaWithRatio\(p, source\)/, '首轮渲染要用占位版本');
  assert.match(appSource, /casePopMediaWithRatio\(material, source\)/, '签名回填也要用占位版本');
});
