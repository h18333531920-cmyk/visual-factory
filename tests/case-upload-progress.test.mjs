// 多图上传提速 + 真实进度条（v740）。
// 背景：案例库项目与图库的多图上传原先逐张串行（上传原图 → 生成缩略图 → 读尺寸 → 入库），
// 且进度条只有百分比文字、没有可看见的进度条（.upload-progress-* 从未写过样式）。
// 本测试锁死：并发上限 3、进度按字节加权并带 done/total、进度条与追加浮标都要有可见宽度。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');

function fnBody(name, marker) {
  const start = appSource.indexOf('function ' + name + '(');
  assert.ok(start > 0, name + ' 必须存在');
  const end = appSource.indexOf(marker, start);
  assert.ok(end > start, name + ' 的结束位置找不到');
  return appSource.slice(start, end);
}

test('并发队列：失败后不再领新任务，等在途任务结束再抛错', () => {
  const body = fnBody('mapWithConcurrency', '\n  // 图片一次解码');
  assert.match(body, /while \(queue\.length && !failure\)/, '失败后必须停止领取新任务');
  assert.match(body, /results\[job\.index\] = await worker\(job\.item, job\.index\)/, '结果按输入顺序回填');
  assert.match(body, /if \(failure\) throw failure;/, '第一个错误要在所有在途任务结束后抛出（清理时才能拿到完整路径）');
  assert.match(body, /Math\.min\(limit, queue\.length\)/, '并发数不得超过任务数');
});

test('图片一次解码同时产出尺寸与缩略图', () => {
  const body = fnBody('previewImageThumbnailAndDimensions', '\n  function generateThumbnail(');
  assert.match(body, /img\.naturalWidth/, '尺寸取自解码结果');
  assert.match(body, /blob && blob\.size < file\.size \? blob : null/, '压缩后反而更大就放弃缩略图');
  assert.match(body, /finish\(\{ width: null, height: null, thumbnail: null \}\)/, '解码失败不抛错（与 readImageDimensions 一致）');
  // v961：三条路径都必须能收敛（onload 正常 / toBlob 不回调 / 整体超时），
  // 否则 Promise 永远 pending ⇒ 上传卡在「图已传、进度 0%、素材不显示」。
  assert.match(body, /const guard = setTimeout\(\(\) => finish\(\{ width: null, height: null, thumbnail: null \}\), 10000\)/, '整体 10 秒兜底');
  assert.match(body, /setTimeout\(\(\) => \{ if \(!toBlobDone\) \{ clearTimeout\(guard\); finish\(\{ width, height, thumbnail: null \}\); \} \}, 8000\)/, 'toBlob 不回调时 8 秒放弃缩略图但保留尺寸');
});

test('案例项目创建：预览循环并发 6 + 按张数进度 + 每张传完就写一行', () => {
  const start = appSource.indexOf('// 进度按「文件数」算');
  assert.ok(start > 0, '创建流程必须有按张数计算的进度');
  const body = appSource.slice(start, appSource.indexOf('\n      setUploadProgress(95);', start));
  assert.match(body, /await mapWithConcurrency\(previewFiles, 6, async function\(file, index\)/, '创建流程用并发队列（几十张跨境上传时 6 个流更快）');
  assert.match(body, /setUploadProgress\(45 \+ Math\.round\(50 \* previewDoneCount \/ \(previewFiles\.length \|\| 1\)\), previewDoneCount, previewFiles\.length\)/, '进度按张数推进并带 done/total');
  assert.doesNotMatch(body, /previewTotalBytes/, '不再按字节加权（会出现「3/56 张却 62%」这种看着像卡死的读数）');
  assert.match(body, /let previewInsert = await state\.supabase\.from\('vf_asset_previews'\)\.insert\(\[previewRow\]\)/, '每张传完就写一行（中途关窗也留得住已传好的部分）');
  assert.match(body, /on delete cascade|级联删掉这些预览行/, '注释说明失败/取消时靠级联删预览行');
  assert.match(body, /'第 ' \+ \(index \+ 1\) \+ ' 个文件「'/, '逐文件报错文案保持原样');
  assert.match(body, /if \(!isCaseGifFile\(file\)\)/, 'GIF 仍跳过静态缩略图');
  assert.match(body, /videoFile \? await generateVideoThumbnail\(file, 480\) : decoded\.thumbnail/, '视频走视频缩略图，图片复用同一次解码');
  assert.match(body, /hasAllPreviewThumbnails = false/, '缩略图失败仍要清掉整组标记');
  assert.doesNotMatch(body, /previewPctEach/, '旧的按文件数平均分档已移除');
});

test('图库上传：大图顺序传，小图仍可并发；进度是已完成张数', () => {
  const body = fnBody('uploadGalleryAssets', '\n  async function cleanupGalleryUpload');
  const helpers = appSource.slice(appSource.indexOf('  function galleryUploadConcurrency('), appSource.indexOf('  async function uploadGalleryAssets('));
  assert.equal(runInNewContext(helpers + '\ngalleryUploadConcurrency([{size:215185},{size:6367923}])'), 1);
  assert.equal(runInNewContext(helpers + '\ngalleryUploadConcurrency([{size:215185},{size:437283}])'), 3);
  assert.equal(runInNewContext(helpers + '\ngalleryUploadPercent(1,4)'), 23, '1/4 张显示约 23% 的上传阶段进度，不再误报 1%');
  assert.equal(runInNewContext(helpers + '\ngalleryUploadPercent(4,4)'), 90);
  assert.match(body, /await mapWithConcurrency\(files, concurrency, async function\(file\)/);
  assert.match(body, /onProgress\(galleryUploadPercent\(doneCount, files\.length\), doneCount, files\.length, note\)/);
  assert.match(body, /onProgress\(95, doneCount, files\.length\)/, '收尾进度');
  assert.match(body, /var thumbBlob = decoded\.thumbnail;/, '缩略图复用同一次解码');
  assert.match(body, /setInterval\(report, 1000\)/, '上传中显示已等待时间');
});

test('素材库刷新不会销毁正在展示的上传弹窗；账号权限变化会停止当前上传', () => {
  const render = fnBody('renderLibrary', '\n  function refreshKindTabCounts');
  assert.match(render, /state\.route === 'library' && uploadModal && !uploadModal\.hidden/);
  assert.match(render, /refreshLibraryLoadedUi\(\);\s*return;/);
  const changed = appSource.slice(appSource.indexOf('      changed(access) {'), appSource.indexOf('\n    });\n    patchAccountPanelForTeamRoster', appSource.indexOf('      changed(access) {')));
  assert.match(changed, /libraryUploadRun\.cancelled = true/);
  assert.match(changed, /账号或上传权限在传输中发生变化/);
});

test('上传进度条：有可见样式且保留百分比数字', () => {
  const body = fnBody('setUploadProgress', '\n    const uploadedPaths = [];');   // v945：切片终点换成这个稳定锚点
  assert.match(body, /function setUploadProgress\(pct, done, total, note\)/);
  assert.match(body, /upload-progress-bar-fill/);
  assert.match(body, /upload-progress-text">' \+ pct \+ '%/, '百分比数字保留');
  assert.match(body, /upload-progress-count/, '同时显示 done/total 张');
  for (const rule of ['.upload-progress-row {', '.upload-progress-bar-wrap {', '.upload-progress-bar-fill {', '.upload-progress-text {', '.upload-progress-count {', '.upload-progress-note {']) {
    assert.ok(appSource.includes(rule), '缺少样式：' + rule);
  }
  assert.match(appSource, /\.upload-progress-bar-fill \{[^}]*width: 0;/, '进度条默认宽度为 0');
});

test('追加物料浮标：进度条随完成度推进', () => {
  assert.match(appSource, /<span class="case-append-bar" aria-hidden="true"><span class="case-append-bar-fill" id="case-append-progress-fill"><\/span><\/span>/, '浮标里要有进度条');
  assert.ok(appSource.includes('.case-append-bar-fill {'), '缺少浮标进度条样式');
  const start = appSource.indexOf('const runAppend = async function(files) {');
  assert.ok(start > 0, 'runAppend 必须存在');
  const body = appSource.slice(start, appSource.indexOf("backdrop.addEventListener('drop'", start));
  assert.match(body, /progressFill\.style\.width = percent \+ '%'/, '进度条宽度跟随完成度');
  assert.match(body, /' 张 · ' \+ percent \+ '%…'/, '文字保留百分比');
  assert.match(body, /showAppendProgress\(0, files\.length, 0\)/, '开始先归零');
  const append = fnBody('uploadCaseAppendPreviews', '\n  function renderLibraryCard');
  assert.match(append, /onProgress\(finished, list\.length, Math\.round\(100 \* doneBytes \/ \(totalBytes \|\| 1\)\)\)/, '追加进度同样按字节加权');
});

test('版本号：index.html 五处与 TOOL_UI_VERSION 一致', () => {
  const version = (appSource.match(/const TOOL_UI_VERSION = '([^']+)';/) || [])[1];
  assert.ok(version, 'TOOL_UI_VERSION 必须存在');
  const refs = indexSource.match(new RegExp(version, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 五处版本号必须同步');
});
