// 封面「签好的地址跨刷新复用」与「扫光限趟」（v730）的静态不变量。
// 背景：冷加载时封面要等 createSignedUrls 往返（~1s）才能开始下载，而且每次重签都换
// token，浏览器把每张封面当新资源整张重下；用户反复看到案例墙第一张卡在扫光。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const stylesSource = readFileSync(join(here, '..', 'styles.css'), 'utf8');

test('签名地址缓存：hydrate 只收 50 分钟内的条目，且先于首次渲染装载', () => {
  assert.match(appSource, /const LIBRARY_SIGNED_URL_CACHE_KEY = 'vf:library-signed-urls:v1';/);
  const fnStart = appSource.indexOf('function hydrateLibraryPreviewUrlCache()');
  const fnEnd = appSource.indexOf('function persistLibraryPreviewUrlCache()', fnStart);
  assert.ok(fnStart > 0 && fnEnd > fnStart, 'hydrate/persist 必须都存在');
  const body = appSource.slice(fnStart, fnEnd);
  assert.match(body, /sessionStorage\.getItem\(LIBRARY_SIGNED_URL_CACHE_KEY\)/);
  assert.match(body, /const refreshAfter = Date\.now\(\) - 50 \* 60 \* 1000;/);
  assert.match(body, /if \(!entry \|\| !entry\.url \|\| signedAt < refreshAfter\) return;/);
  // 与 signLibraryPreviewUrls 的新鲜度口径必须是同一个数字，否则会出现
  // 「刚 hydrate 进来的地址被判定过期、又被重签」的来回
  assert.match(appSource, /const refreshBefore = Date\.now\(\) - 50 \* 60 \* 1000;/);
  // 首次渲染（restoreSession → renderLibrary）之前就要把缓存装进 state
  const initStart = appSource.indexOf('function init() {');
  const initBlock = appSource.slice(initStart, appSource.indexOf('function cacheEls()', initStart));
  const hydrateCall = initBlock.indexOf('hydrateLibraryPreviewUrlCache();');
  const restoreCall = initBlock.indexOf('restoreSession()');
  assert.ok(hydrateCall > 0 && restoreCall > hydrateCall, 'hydrate 必须在 restoreSession 之前调用');
});

test('落盘时机：pagehide + 页面转后台，且条目数有上限', () => {
  const fnStart = appSource.indexOf('function persistLibraryPreviewUrlCache()');
  const body = appSource.slice(fnStart, fnStart + 900);
  assert.match(appSource, /const LIBRARY_SIGNED_URL_CACHE_MAX = 600;/);
  assert.match(body, /entries\.sort\(function\(a, b\) \{ return b\[1\] - a\[1\]; \}\);/);
  assert.match(body, /entries\.slice\(0, LIBRARY_SIGNED_URL_CACHE_MAX\)/);
  assert.match(body, /sessionStorage\.setItem\(LIBRARY_SIGNED_URL_CACHE_KEY, JSON\.stringify\(cache\)\)/);
  assert.match(appSource, /window\.addEventListener\('pagehide', persistLibraryPreviewUrlCache\);/);
  assert.match(appSource, /if \(document\.visibilityState === 'hidden'\) persistLibraryPreviewUrlCache\(\);/);
});

// v734 起占位层整段去掉扫光动画：v730 的"限两趟"用户仍当故障报，加载期只要静态底色。
// v749 起连斜纹渐变也去掉：对角渐变看起来仍像扫光，改为纯色 #eef1f4。
test('占位层不带扫光：动画与 keyframes 都不存在，就绪后只淡出', () => {
  const shellRule = stylesSource.slice(
    stylesSource.indexOf('.library-preview-shell::before {'),
    stylesSource.indexOf('.library-preview-shell.is-preview-ready::before {')
  );
  assert.doesNotMatch(shellRule, /animation/, '占位层不能再挂任何扫光动画');
  assert.match(shellRule, /background: #eef1f4;/, '占位底必须是纯色');
  assert.doesNotMatch(shellRule, /linear-gradient/, '斜纹渐变会被当成扫光，不得使用');
  assert.doesNotMatch(stylesSource, /library-bookmark-preview-shimmer/, '扫光 keyframes 必须整段删除');
  assert.match(stylesSource, /\.library-preview-shell\.is-preview-ready::before \{\s*opacity: 0;\s*\}/);
});
