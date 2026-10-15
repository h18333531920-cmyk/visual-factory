// v809：上传途中点「取消」/✕ 不再让提交按钮卡在「上传中...」——
// 立刻恢复按钮，并中断这一轮上传（余下的文件不再开始，已写进去的行回滚）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'app.js'), 'utf8');

function body(start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `找不到片段起点：${start}`);
  const to = source.indexOf(end, from);
  assert.ok(to > from, `找不到片段终点：${end}`);
  return source.slice(from, to);
}

test('取消上传：按钮立刻恢复，不依赖上传收尾', () => {
  const cancel = body('  function cancelLibraryUpload() {', '  function updateLibraryUploadMode(kind) {');
  assert.match(cancel, /libraryUploadRun\.cancelled = true/, '标记这一轮取消');
  assert.match(cancel, /resetLibraryUploadButton\(\);/, '先恢复按钮');
  assert.match(cancel, /closeLibraryUploadModal\(\);/, '再关窗');
  const reset = body('  function resetLibraryUploadButton() {', '  function cancelLibraryUpload() {');
  assert.match(reset, /button\.disabled = false;/, '按钮必须重新可点');
  assert.match(reset, /button\.dataset\.defaultLabel/, '文案回到原始标签');
  assert.ok(source.includes("getElementById('close-library-upload')?.addEventListener('click', cancelLibraryUpload)"), '✕ 走取消');
  assert.ok(source.includes("getElementById('cancel-library-upload')?.addEventListener('click', cancelLibraryUpload)"), '「取消」走取消');
});

test('取消上传：本次运行被中断，且不会当成失败提示', () => {
  const head = body('  async function uploadLibraryAsset(event) {', '    setUploadProgress(0);');
  assert.match(head, /const run = \{ cancelled: false \};/, '每次上传一份运行标记');
  assert.match(head, /libraryUploadRun = run;/, '记住当前这次运行');
  assert.match(head, /throw new Error\(LIBRARY_UPLOAD_CANCELLED\)/, '取消后抛出哨兵错误中断流程');
  assert.match(head, /submitButton\.dataset\.defaultLabel = originalSubmitText\.trim\(\)/, '记下按钮原始文案');
  const tail = body('    } catch (error) {\n      // 用户点了取消', '  }\n\n  // 限制并发的工作队列');
  assert.match(tail, /error\.message === LIBRARY_UPLOAD_CANCELLED\) return;/, '取消不显示错误');
  assert.match(tail, /cleanupFailedLibraryUpload\(sourceId, sourceInserted, uploadedPaths\)/, '取消要回滚已写入的行');
  assert.match(tail, /if \(libraryUploadRun === run\) libraryUploadRun = null;/, '收尾时清掉运行标记');
  assert.match(tail, /if \(submitButton && !run\.cancelled\)/, '取消过就别再动按钮（可能已是新一轮）');
});

test('取消上传：流程各阶段都检查取消，重新打开弹窗还有兜底恢复', () => {
  assert.match(source, /assertNotCancelled\(\);\n      if \(!isCaseProject\)/, '上传源文件前检查');
  assert.match(source, /await mapWithConcurrency\(previewFiles, \d+, async function\(file, index\) \{\n        assertNotCancelled\(\);/, '每个物料开始前检查');
  assert.match(source, /setUploadProgress\(95\);\n      assertNotCancelled\(\)/, '写预览行前检查');
  const gallery = body('  async function uploadGalleryAssets(formData, onProgress, run) {', '  async function cleanupGalleryUpload(');
  assert.match(gallery, /if \(cancelled\(\)\) throw new Error\(LIBRARY_UPLOAD_CANCELLED\);/, '图库每个文件开始前检查');
  assert.match(gallery, /await cleanupGalleryUpload\(insertedSourceIds, uploadedPaths\);\n      throw error;/, '取消＝整批回滚');
  const open = body('  function openLibraryUploadModal(', '  function prefillUploadMetaSelections()');
  assert.match(open, /if \(!libraryUploadRun\) resetLibraryUploadButton\(\);/, '打开弹窗兜底复位按钮');
});
