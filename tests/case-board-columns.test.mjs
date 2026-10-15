// 案例墙布局（v734）：四列分列 + 最矮列优先 + 加载占位不再扫光。
// 背景：案例封面高矮参差。v733 的真网格行高被最高卡撑满，短封面下方留一大块空白；
// v733 之前的 CSS 多列瀑布流按列高平衡分配，数量不足一整列时末几张会漂到中间的列上。
// 现在由 renderCaseBoardColumns 分列：前四张按顺序各占一列（首行从左边开始），
// 之后的卡落进最矮的列——通常是短封面下方。占位层的扫光动画在这一版彻底去掉，
// 只留静态浅灰底（用户第三次把它当故障报）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const cssSource = readFileSync(join(here, '..', 'styles.css'), 'utf8');

function renderGridBody() {
  const start = appSource.indexOf('function renderLibraryGrid()');
  assert.ok(start >= 0, 'renderLibraryGrid 必须存在');
  const end = appSource.indexOf('const LIBRARY_PIN_TOP_SAFE_MIN', start);
  assert.ok(end > start, '找不到 renderLibraryGrid 的结束位置');
  return appSource.slice(start, end);
}

function caseColumnsBody() {
  const start = appSource.indexOf('const CASE_BOARD_COLUMNS = 4;');
  assert.ok(start >= 0, 'CASE_BOARD_COLUMNS 必须存在');
  const end = appSource.indexOf('function renderLibraryGrid()', start);
  assert.ok(end > start, '找不到案例墙分列代码的结束位置');
  return appSource.slice(start, end);
}

function cssBlock(selector) {
  const idx = cssSource.indexOf(selector + ' {');
  assert.ok(idx >= 0, 'styles.css 必须包含 ' + selector);
  const end = cssSource.indexOf('}', idx);
  return cssSource.slice(idx, end + 1);
}

test('案例墙走分列渲染：caseBoard 判定在宽高比重排之前，且不再用真网格', () => {
  const body = renderGridBody();
  const caseBoardIdx = body.indexOf('const caseBoard = state.route');
  assert.ok(caseBoardIdx >= 0, '必须判定整板是否都是案例项目卡');
  const caseBoardExpr = body.slice(caseBoardIdx, caseBoardIdx + 320);
  assert.match(caseBoardExpr, /state\.route === 'library'/, '分列只用在超级库：首页板面被 [data-route="home"] 的 !important 瀑布流接管');
  assert.match(caseBoardExpr, /every\(function\(item\) \{ return !!item\.isCaseProjectCard; \}\)/, '整板都必须案例项目卡');
  const balanceIdx = body.indexOf('var GROUP = 4;');
  assert.ok(balanceIdx > caseBoardIdx, 'caseBoard 必须在宽高比重排之前定下来（重排只留给瀑布流）');
  assert.match(body, /if \(!caseBoard\) \{/, '案例墙不再走瀑布流的宽高比重排');
  assert.match(
    body,
    /grid\.innerHTML = caseBoard\s*\?\s*renderCaseBoardColumns\(visibleItems\)\s*:\s*visibleItems\.map\(renderLibraryCard\)\.join\(''\);/,
    '案例墙必须用 renderCaseBoardColumns 渲染'
  );
  assert.match(body, /grid\.classList\.toggle\('library-grid-cases', caseBoard\);/, '案例墙的容器类名必须随 caseBoard 切换');
});

test('前四张各占一列，之后的卡落进最矮的列', () => {
  const body = caseColumnsBody();
  assert.match(body, /let target = index;/, '前四张按顺序各占一列（首行从左起）');
  assert.match(body, /if \(index >= CASE_BOARD_COLUMNS\) \{\s*target = 0;\s*for \(let c = 1; c < CASE_BOARD_COLUMNS; c \+= 1\) if \(heights\[c\] < heights\[target\]\) target = c;/,
    '第五张起落进当前最矮的列');
  assert.match(body, /heights\[target\] \+= caseCardHeightEstimate\(item\);/, '列高要按卡片高度估算累加');
  assert.match(body, /<div class="library-column">\$\{column\.map\(renderLibraryCard\)\.join\(''\)\}<\/div>/, '每列包一层 .library-column');
  // 四列始终渲染（哪怕为空），不然只有两三张卡时列宽会变形
  assert.doesNotMatch(body, /\.filter\(function\(column\) \{ return column\.length/, '空列也要保留，保证列宽固定为四分之一');
});

test('styles.css：案例墙是四列分列，基础瀑布流四列不动', () => {
  const board = cssBlock('.library-grid.library-grid-cases');
  assert.match(board, /columns: auto;/, '案例墙要关掉多列瀑布流');
  assert.match(board, /display: flex;/, '案例墙用分列布局');
  assert.match(board, /gap: 10px;/, '列间距 10px');
  assert.match(board, /align-items: flex-start;/, '各列独立高度，不被拉齐');
  assert.doesNotMatch(board, /display: grid;/, '不再用真网格（行高会被最高卡撑满）');

  const column = cssBlock('.library-grid.library-grid-cases .library-column');
  assert.match(column, /flex: 1 1 0;/, '四列等宽');
  assert.match(column, /min-width: 0;/, '允许收缩，防止撑破');
  assert.match(column, /flex-direction: column;/, '列内纵向排卡');

  // 素材墙基础规则是案例墙规则紧邻的上一条（文件里还有别的历史 .library-grid 块，不能取第一个）
  const casesIdx = cssSource.indexOf('.library-grid.library-grid-cases {');
  const baseIdx = cssSource.lastIndexOf('.library-grid {', casesIdx);
  assert.ok(baseIdx >= 0 && baseIdx < casesIdx, '素材墙基础规则必须排在案例墙规则前面');
  const base = cssSource.slice(baseIdx, cssSource.indexOf('}', baseIdx) + 1);
  assert.match(base, /columns: 4;/, '素材墙基础仍是固定 4 列瀑布流');
  assert.match(base, /column-gap: 10px;/);
  assert.match(appSource, /var GROUP = 4;/, '瀑布流的宽高比重排仍在（其它分类照旧）');
});

test('加载占位不再扫光：动画和 keyframes 都已删除，静态纯色底保留（v749 起斜纹渐变也算扫光观感）', () => {
  assert.doesNotMatch(cssSource, /library-bookmark-preview-shimmer/, '扫光动画（含 keyframes）必须整段删除');
  const shell = cssBlock('.library-preview-shell::before');
  assert.doesNotMatch(shell, /animation:/, '占位层不得再挂动画');
  assert.match(shell, /background: #eef1f4;/, '占位底必须是纯色（斜纹渐变会被当成扫光）');
  assert.doesNotMatch(shell, /linear-gradient/, '占位底不得使用渐变');
});
