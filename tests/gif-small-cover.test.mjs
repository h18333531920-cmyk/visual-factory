// GIF 1/3 小动图封面（v716 起，v718 抽帧）的静态不变量。
// app.js 是 IIFE，这条链路依赖的状态太多，不适合切块执行；这里只断言
// 关键结构和接线没有被后续改动破坏。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

test('GIF 展示分支先于静态缩略图分支，并优先派生 1/3 小动图路径', () => {
  const fnStart = appSource.indexOf('function libraryThumbnailPathForPreview(preview, source)');
  assert.ok(fnStart >= 0, 'libraryThumbnailPathForPreview 必须存在');
  const fnEnd = appSource.indexOf('function init()', fnStart);
  assert.ok(fnEnd > fnStart, '找不到 libraryThumbnailPathForPreview 的结束位置');
  const body = appSource.slice(fnStart, fnEnd);
  const gifBranch = body.indexOf('isCaseGifPreview(preview)');
  const jpgBranch = body.indexOf('const generatedPath = preview?.id');
  assert.ok(gifBranch >= 0 && jpgBranch > gifBranch, 'GIF 分支必须排在静态缩略图分支之前');
  assert.match(body, /'\/_small-' \+ preview\.id \+ '\.gif'/, 'GIF 小动图路径必须是 _small-<previewId>.gif');
  assert.match(body, /libraryGifSmallMarker\(preview\.id\)/, '展示层必须按逐预览标记判断小动图是否已生成');
});

test('GIF 回填目标是 kind=gif-small，上传为 image/gif', () => {
  assert.match(appSource, /kind: 'gif-small'/);
  assert.match(appSource, /await uploadLibraryBackfillBlob\(target\.path, blob, 'image\/gif'\)/);
  assert.match(appSource, /await uploadLibraryBackfillBlob\(task\.target\.path, blob, 'image\/jpeg'\)/);
  assert.match(appSource, /LIBRARY_GIF_SMALL_TAG_PREFIX = 'vf:gif-small:v2:'/);
  assert.match(appSource, /function queueGifSmallPreviewBackfill\(preview, source\)/);
  assert.match(appSource, /queueGifSmallPreviewBackfill\(item\.preview, item\.source\);/);
});

test('vendor/gif.js 与 vendor/gif.worker.js 已内置并按版本号加载', () => {
  for (const file of ['gif.js', 'gif.worker.js']) {
    const info = statSync(join(here, '..', 'public', 'vendor', file));
    assert.ok(info.size > 5000, file + ' 体积异常，可能没有正确内置');
  }
  assert.match(appSource, /script\.src = 'vendor\/gif\.js\?v=' \+ encodeURIComponent\(TOOL_UI_VERSION\)/);
  assert.match(appSource, /workerScript: 'vendor\/gif\.worker\.js\?v=' \+ encodeURIComponent\(TOOL_UI_VERSION\)/);
});

test('GIF 动图（原图与 1/3 小动图）的加载看门狗带一次性长宽限，避免中途重启下载', () => {
  assert.match(appSource, /LIBRARY_GIF_IMAGE_LOAD_TIMEOUT_MS = 90000/);
  assert.match(appSource, /const stagePath = img\.dataset\.libraryImageStage === 'thumb'\s*\?\s*\(img\.dataset\.thumbPath \|\| ''\)\s*:\s*\(img\.dataset\.previewPath \|\| ''\);/);
  assert.match(appSource, /img\.dataset\.libraryImageGrace !== '1'/);
  assert.match(appSource, /watchLibraryImageLoad\(img, LIBRARY_GIF_IMAGE_LOAD_TIMEOUT_MS\)/);
});

test('转码管线使用 ImageDecoder + 1/3 边长降采样 + 抽帧压体积', () => {
  assert.match(appSource, /new ImageDecoder\(\{ data: await sourceBlob\.arrayBuffer\(\), type: 'image\/gif' \}\)/);
  assert.match(appSource, /Math\.round\(sourceWidth \/ 3\)/);
  assert.match(appSource, /Math\.round\(sourceHeight \/ 3\)/);
  assert.match(appSource, /const sourceDelayMs = Math\.max\(20, Math\.round\(\(firstFrame\.image\.duration \|\| 0\) \/ 1000\) \|\| 40\);/);
  assert.match(appSource, /LIBRARY_GIF_SMALL_MAX_FPS = 12\.5/);
  assert.match(appSource, /const fpsStep = Math\.max\(1, Math\.ceil\(\(1000 \/ sourceDelayMs\) \/ LIBRARY_GIF_SMALL_MAX_FPS\)\);/);
  assert.match(appSource, /const frameStep = Math\.max\(fpsStep, Math\.ceil\(track\.frameCount \/ LIBRARY_GIF_SMALL_MAX_FRAMES\)\);/);
});
