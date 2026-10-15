// 封面小图（poster / 1/3 小动图）加载失败与等待签名的回退规则（v728 回归修复）。
// 这些行为依赖浏览器网络与 Supabase 签名接口，node 里跑不起来，
// 这里只断言结构不变量，防止后续改动把「一失败就退回原图」「等不到签名就空着」
// 这类回归重新引回来。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function sliceFrom(marker, endMarker) {
  const start = appSource.indexOf(marker);
  assert.ok(start >= 0, '找不到 ' + marker);
  const end = appSource.indexOf(endMarker, start);
  assert.ok(end > start, '找不到 ' + endMarker);
  return appSource.slice(start, end);
}

test('小图失败只进冷却期，不整场会话拉黑', () => {
  assert.match(appSource, /const LIBRARY_THUMB_FAIL_COOLDOWN_MS = 60000;/);
  const body = sliceFrom('function libraryThumbUnavailable(path)', 'function markLibraryThumbUnavailable');
  // 冷却到期必须把路径放回可用，否则一次网络抖动就永久降级到原图
  assert.match(body, /if \(Date\.now\(\) - failedAt >= LIBRARY_THUMB_FAIL_COOLDOWN_MS\) \{\s*libraryUnavailableThumbnailPaths\.delete\(path\);\s*return false;\s*\}/);
  assert.match(appSource, /function markLibraryThumbUnavailable\(path\) \{\s*if \(path\) libraryUnavailableThumbnailPaths\.set\(path, Date\.now\(\)\);\s*\}/);
  // 判定只能走冷却函数：任何一处再直接 .has() 就退回「拉黑一整个会话」
  assert.doesNotMatch(appSource, /libraryUnavailableThumbnailPaths\.has\(/);
});

test('封面回退：只有小图真失败过才留在原图，签名未就绪时先空着等', () => {
  const body = sliceFrom('function updateLibraryCardImages(items)', 'function renderLibrarySelects');
  assert.match(body, /const keepFullFallback = !imageIdentityChanged && img\.dataset\.libraryThumbFailed === '1';/);
  assert.match(body, /const thumbUsable = !!thumbPath && !libraryThumbUnavailable\(thumbPath\);/);
  // 没签好名不是失败：不能靠 stage==='full' 判断，否则卡一次就再也回不到小图
  assert.doesNotMatch(body, /keepFullFallback[^\n]*libraryImageStage/);
  assert.match(body, /var newUrl = \(!keepFullFallback && thumbUrl\) \|\| \(waitForThumb \? '' : fullUrl\);/);
  assert.match(body, /if \(imageIdentityChanged\) delete img\.dataset\.libraryThumbFailed;/);
  assert.match(body, /const waitForThumb = !keepFullFallback && thumbUsable && !thumbUrl\s*&& !img\.dataset\.libraryThumbWaitDone && isCaseGifPreview\(item\.preview\);/);
  assert.match(body, /if \(waitForThumb\) scheduleLibraryThumbWaitEscape\(img, item\);/);
});

test('等签名最多 8 秒，超时要放行去加载原图，不能一直空着', () => {
  assert.match(appSource, /const LIBRARY_THUMB_WAIT_MS = 8000;/);
  const body = sliceFrom('function scheduleLibraryThumbWaitEscape(img, item)', 'function updateLibraryCardImages');
  assert.match(body, /if \(!img \|\| libraryThumbWaitTimers\.has\(img\)\) return;/);
  assert.match(body, /img\.dataset\.libraryThumbWaitDone = '1';\s*updateLibraryCardImages\(\[item\]\);/);
});

test('空 src 不当成加载失败，真失败才标记并进入冷却', () => {
  const body = sliceFrom('async function recoverLibraryCardImage(img)', 'function renderLibrarySelects');
  const guard = body.indexOf("if (!img.getAttribute('src')) return;");
  const firstStateRead = body.indexOf("const previewPath = img.dataset.previewPath || '';");
  // src 还是空串时浏览器会把它当页面地址请求并立刻报 error：必须早于读状态就返回
  assert.ok(guard >= 0 && guard < firstStateRead, '空 src 守卫必须在读取状态之前返回');
  assert.doesNotMatch(body, /libraryUnavailableThumbnailPaths\.add\(/);
  assert.match(body, /markLibraryThumbUnavailable\(thumbPath\);/);
  // 真正降级的这一支要留痕，好让 updateLibraryCardImages 不要来回切换
  assert.match(body, /img\.dataset\.libraryThumbFailed = '1';\s*img\.dataset\.libraryImageStage = 'full';/);
});

test('卡片 HTML 在签名未就绪时不写出空的 src（避免误报 error）', () => {
  assert.match(appSource, /function libraryCardImgSrcAttr\(item\) \{\s*const url = item\?\.thumbUrl \|\| item\?\.url \|\| '';\s*return url \? ` src="\$\{escapeAttr\(url\)\}"` : '';\s*\}/);
  assert.doesNotMatch(appSource, /<img src="\$\{escapeAttr\(item\.thumbUrl \|\| item\.url\)\}"/);
  const guarded = appSource.match(/<img\$\{libraryCardImgSrcAttr\(item\)\}/g) || [];
  assert.equal(guarded.length, 3, '案例卡片 / 书签卡片 / 普通卡片三处都要用守卫版 src');
});
