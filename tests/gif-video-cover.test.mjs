// GIF → 无声循环视频（v724 起，v725 修异步编码探测与地址未就绪）的静态不变量。
// 这条链路依赖 WebCodecs / mediabunny / Supabase，运行期无法在 node 里跑，
// 这里只断言结构、路径约定和回退顺序没有被后续改动破坏。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

test('mediabunny 已内置并按版本号动态加载，且未被改动', () => {
  const info = statSync(join(here, '..', 'public', 'vendor', 'mediabunny.min.mjs'));
  assert.ok(info.size > 100000, 'mediabunny.min.mjs 体积异常，可能没有正确内置');
  const bundle = readFileSync(join(here, '..', 'public', 'vendor', 'mediabunny.min.mjs'), 'utf8');
  assert.match(bundle, /Mozilla Public[\s\S]{0,8}License, v\. 2\.0/, 'vendor 文件必须保留 MPL-2.0 许可头（不改动原文件）');
  // 经典脚本里的动态 import 不认 'vendor/...' 这种裸模块名（v724 的线上故障），
  // 必须先拼成绝对 URL 再 import
  assert.match(appSource, /new URL\('vendor\/mediabunny\.min\.mjs\?v=' \+ encodeURIComponent\(TOOL_UI_VERSION\), document\.baseURI\)/);
  assert.match(appSource, /import\(moduleUrl\.href\)/);
  assert.doesNotMatch(appSource, /import\('vendor\//, '动态 import 不能再用裸模块名');
});

test('GIF 视频产物路径与标记：_small-<id>.mp4 + _poster-<id>.jpg，逐预览打标', () => {
  assert.match(appSource, /LIBRARY_GIF_VIDEO_TAG_PREFIX = 'vf:gif-video:v1:'/);
  assert.match(appSource, /video: base \+ '_small-' \+ preview\.id \+ '\.mp4'/);
  assert.match(appSource, /poster: base \+ '_poster-' \+ preview\.id \+ '\.jpg'/);
  assert.match(appSource, /libraryGeneratedGifVideoPathsByPreviewId\.set\(preview\.id, \{ video: target\.path, poster: target\.posterPath \|\| '' \}\)/);
});

test('编码走 H.264/MP4，且 H.264 的偶数边长与抽帧参数与 GIF 版一致', () => {
  assert.match(appSource, /LIBRARY_GIF_VIDEO_CODEC = 'avc'/);
  // mediabunny 的 getFirstEncodableVideoCodec 是异步的：漏了 await 会拿 Promise
  // 和字符串比较，永远判定"转不了视频"（v724 的线上故障）
  assert.match(appSource, /if \(await mediabunny\.getFirstEncodableVideoCodec\(\[LIBRARY_GIF_VIDEO_CODEC\]\) !== LIBRARY_GIF_VIDEO_CODEC\) return null;/);
  // 先探测编码能力再下载原图，别为编不了的浏览器白拉十几 MB
  const codecCheck = appSource.indexOf('await mediabunny.getFirstEncodableVideoCodec');
  const sourceFetch = appSource.indexOf("await fetch(url, { mode: 'cors' })", codecCheck);
  assert.ok(codecCheck >= 0 && sourceFetch > codecCheck, '编码能力探测必须排在下载原图之前');
  assert.match(appSource, /new mediabunny\.Output\(\{ format: new mediabunny\.Mp4OutputFormat\(\), target: target \}\)/);
  assert.match(appSource, /new mediabunny\.CanvasSource\(canvas, \{/);
  assert.match(appSource, /Math\.round\(sourceWidth \/ 3 \/ 2\) \* 2/);
  assert.match(appSource, /Math\.round\(sourceHeight \/ 3 \/ 2\) \* 2/);
  assert.match(appSource, /LIBRARY_GIF_SMALL_MAX_FPS/);
  assert.match(appSource, /LIBRARY_GIF_SMALL_MAX_FRAMES/);
  assert.match(appSource, /await output\.finalize\(\);/);
});

test('回填顺序：GIF 先试视频，失败才退回 1/3 小动图；只有"确实编不了"才记不可用', () => {
  const videoFn = appSource.indexOf('async function runGifVideoBackfill(task, sourceUrl)');
  assert.ok(videoFn >= 0, 'runGifVideoBackfill 必须存在');
  const body = appSource.slice(videoFn, appSource.indexOf('async function runNextLibraryThumbnailBackfill()', videoFn));
  assert.match(body, /transcodeGifVideoFromUrl\(sourceUrl\)/);
  const catchBranch = body.indexOf('} catch (error) {');
  const catchReturn = body.indexOf('return false;', catchBranch);
  const fallbackBranch = body.indexOf('if (!produced) {');
  const fallback = body.indexOf('libraryGifVideoUnavailablePreviewIds.add(preview.id)', fallbackBranch);
  const videoUpload = body.indexOf("await uploadLibraryBackfillBlob(task.target.path, produced.video, 'video/mp4')", fallbackBranch);
  const posterUpload = body.indexOf("task.target.posterPath, produced.poster, 'image/jpeg'");
  // 下载/解码中断只是这一次没成：交给调度器重排，不能判定这台浏览器转不了视频
  assert.ok(catchBranch >= 0 && catchReturn > catchBranch, '转码抛错必须返回 false（可重试）');
  assert.ok(catchReturn < fallback, '抛错分支不能走到"标记不可用"');
  assert.ok(fallbackBranch >= 0 && fallback > fallbackBranch, '转不出视频的分支必须存在');
  assert.match(body, /if \(!libraryGifSmallReady\(preview, source\)\) await runGifSmallBackfill\(/);
  assert.ok(videoUpload > fallback, '成功路径才上传视频');
  assert.ok(posterUpload > videoUpload, '先传视频再传 poster');
});

test('回填任务先确保预览地址已签名，拿不到地址只重排不判死刑', () => {
  assert.match(appSource, /async function ensureLibraryBackfillSourceUrl\(task\)/);
  assert.match(appSource, /await signLibraryPreviewUrls\(\[previewPath\]\);/);
  assert.match(appSource, /function requeueLibraryBackfillTask\(task\)/);
  assert.match(appSource, /LIBRARY_GIF_BACKFILL_MAX_ATTEMPTS = 3/);
  // 重排上限用尽才把 key 从去重集合里放掉，允许后续重渲染再排一次
  const requeue = appSource.indexOf('function requeueLibraryBackfillTask(task)');
  const body = appSource.slice(requeue, appSource.indexOf('async function runGifSmallBackfill', requeue));
  assert.match(body, /if \(attempts > LIBRARY_GIF_BACKFILL_MAX_ATTEMPTS\) \{\s*libraryThumbnailBackfillQueued\.delete\(task\.target\.key\);\s*return;/);
  // 队列分派：GIF 产物（视频 / 小动图）都走"先补签名再转码"
  assert.match(appSource, /const sourceUrl = await ensureLibraryBackfillSourceUrl\(task\);/);
  assert.match(appSource, /if \(!sourceUrl\) \{\s*requeueLibraryBackfillTask\(task\);\s*return;\s*\}/);
  assert.match(appSource, /if \(!\(await runGifVideoBackfill\(task, sourceUrl\)\)\) requeueLibraryBackfillTask\(task\);/);
});

test('产物就绪后立刻重渲染素材网格，卡片换成 poster + 视频', () => {
  assert.match(appSource, /if \(state\.route === 'library'\) renderLibraryGrid\(\);/);
});

test('展示层优先无声循环视频：路径解析、进视口播放、离开暂停', () => {
  assert.match(appSource, /function resolveAutoplayVideoSources\(video\)/);
  assert.match(appSource, /video\.src = url;/);
  assert.match(appSource, /video\.poster = posterUrl;/);
  assert.match(appSource, /root\.querySelectorAll\('video\[data-autoplay-path\]'\)\.forEach\(observeAutoplayVideo\)/);
  assert.match(appSource, /if \(entry\.isIntersecting\) playAutoplayVideo\(video\);\s*else pauseAutoplayVideo\(video\);/);
  assert.match(appSource, /video\.addEventListener\('playing', function\(\) \{ revealAutoplayVideo\(video\); \}\)/);
  // 封面 / 浮窗 / 物料栏
  assert.match(appSource, /class="case-cover-video is-auto" data-autoplay-path=/);
  assert.match(appSource, /'<video data-autoplay-path="' \+ escapeAttr\(gifVideo\.video\)/);
  // GIF 转出的循环视频不受 hover 开关控制；
  // v821 起 MP4 直传封面也走同一条视口自动播放通道，悬停播放逻辑已整体移除
  assert.doesNotMatch(appSource, /__caseCoverPlay|__caseCoverStop|data-cover-path/);
  // 视频自己挂着 hidden 时 display:none 没有盒子，交叉观察只会得到"不可见"，
  // 于是永远不播放、也永远不揭晓（v726 的播放死锁）：必须观察外层容器
  assert.match(appSource, /const watched = video\.parentElement \|\| video;/);
  assert.match(appSource, /autoplayVideoTargets\.set\(video, watched\)/);
  assert.match(appSource, /autoplayVideoObserver\.observe\(watched\)/);
  assert.match(appSource, /const video = autoplayVideoOf\(entry\.target\);/);
  assert.match(appSource, /autoplayVideoTargets\.forEach\(function\(watched, video\)/);
});

test('静态位优先用视频首帧 poster，视频路径一并签名', () => {
  const fnStart = appSource.indexOf('function libraryThumbnailPathForPreview(preview, source)');
  const body = appSource.slice(fnStart, appSource.indexOf('function init()', fnStart));
  const posterBranch = body.indexOf('const gifVideo = libraryGifVideoForPreview(preview, source);');
  const gifSmallFallback = body.indexOf('const generatedGifSmall');
  assert.ok(posterBranch >= 0 && gifSmallFallback > posterBranch, 'poster 必须优先于 1/3 小动图');
  assert.match(body, /if \(gifVideo\?\.poster\) return gifVideo\.poster;/);
  assert.match(appSource, /var gifVideo = src \? libraryGifVideoForPreview\(item\.preview, src\) : null;\s*if \(gifVideo\?\.video\) paths\.push\(gifVideo\.video\);/);
});
