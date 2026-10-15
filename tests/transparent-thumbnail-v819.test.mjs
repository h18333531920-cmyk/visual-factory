// v819：透明底 PNG 做成封面不再变黑底。
// 原因：缩略图/压缩都用 JPEG 编码（toBlob('image/jpeg')），JPEG 没有透明通道 →
// 画布上的透明像素被压成黑色，于是透明底海报的封面是黑底。GIF 海报那条路早就铺过白底，
// 其余几处漏了。现在所有「画在画布上再转 JPEG」的地方都先铺白底。
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

const fill = 'fillCanvasWhite(';

test('白底工具：统一铺 #ffffff', () => {
  const fn = body('  function fillCanvasWhite(context, width, height) {', '  function previewImageThumbnailAndDimensions');
  assert.match(fn, /context\.fillStyle = '#ffffff';/, '用白色');
  assert.match(fn, /context\.fillRect\(0, 0, width, height\);/, '铺满整块画布');
});

test('案例库/图库上传缩略图：画图之前先铺白底', () => {
  const fn = body('  function previewImageThumbnailAndDimensions(file, maxWidth) {', '  function generateThumbnail(file, maxWidth) {');
  const fillAt = fn.indexOf(fill);
  const drawAt = fn.indexOf('context.drawImage(img, 0, 0, canvas.width, canvas.height);');
  assert.ok(fillAt >= 0 && drawAt > fillAt, '铺白底必须在 drawImage 之前');
  assert.match(fn, /toBlob\(blob => \{[\s\S]*'image\/jpeg'/, '仍然输出 JPEG（体积小）');
});

test('其余 JPEG 路径都补齐：模板缩略图 / 后台补缩略图 / 大图重编码 / 另一处压缩', () => {
  const checks = [
    body('  function generateThumbnail(file, maxWidth) {', '  function compressImageIfNeeded(file, maxSize) {'),
    body('  function thumbnailBlobFromLoadedImage(image) {', '  function gifPosterBlobFromFrame('),
    body('  function compressImageIfNeeded(file, maxSize) {', '  function generateVideoThumbnail('),
    body('  function previewImageThumbnailAndDimensions(file, maxWidth) {', '  function generateThumbnail(file, maxWidth) {')
  ];
  checks.forEach((chunk, index) => {
    assert.ok(chunk.includes(fill), `第 ${index + 1} 段 JPEG 路径缺少白底`);
  });
  const gif = body('  function gifPosterBlobFromFrame(image, sourceWidth, sourceHeight) {', '  function previewImageThumbnailAndDimensions(');
  assert.match(gif, /context\.fillStyle = '#ffffff';/, 'GIF 海报本来就是白底（保持不动）');
  const allFills = source.split(fill).length - 1;
  assert.ok(allFills >= 7, `至少 7 处调用（工具定义 + 6 处调用），实际 ${allFills}`);
});

test('大图重编码：逐级降质时每轮都重新铺底（改画布尺寸会清空）', () => {
  const fn = body('  function compressImageIfNeeded(file, maxSize) {', '  function generateVideoThumbnail(');
  const fillAt = fn.indexOf(fill);
  const resizeAt = fn.indexOf('canvas.height = img.height;');
  assert.ok(fillAt > resizeAt, '铺底要写在设置画布尺寸之后（否则会被清掉）');
});

test('识图用的缩略图也铺白底（别让模型看黑底）', () => {
  const fn = body('  function caseElementThumbnailDataUrl(file) {', '  async function requestCaseElementSuggestions');
  const fillAt = fn.indexOf(fill);
  const drawAt = fn.indexOf('ctx.drawImage(img, 0, 0, canvas.width, canvas.height);');
  assert.ok(fillAt >= 0 && drawAt > fillAt, '识图缩略图也铺白底');
  assert.match(fn, /toDataURL\('image\/jpeg', 0\.72\)/, '仍转成 JPEG dataURL');
});

test('老封面能一键重建（透明底那批不用重新上传）', () => {
  const fn = body('    const rebuildMaterialThumbnail = async function(previewId) {', '    const renameMaterial = function(previewId) {');
  assert.match(fn, /previewImageThumbnailAndDimensions\(file, 480\)/, '用同一套白底缩略图逻辑重做');
  assert.match(fn, /_thumb-' \+ material\.id \+ '\.jpg'/, '写到封面读取用的那个 _thumb 路径');
  assert.match(fn, /upload\(thumbPath, decoded\.thumbnail, \{ upsert: true/, '覆盖上传（同名同路径）');
  assert.match(fn, /state\.libraryPreviewUrls\[thumbPath\] = base \+ .*'v=' \+ Date\.now\(\)/, '换签名地址当缓存破坏，否则浏览器还显示旧封面');
  assert.match(fn, /renderSideGrid\(\);\n        renderLibraryGrid\(\);/, '重建后两处列表都刷新');

  const guard = body('  function isThumbRebuildable(preview) {', '\n  function isCaseGifPreview(');
  assert.match(guard, /if \(!mime\.startsWith\('image\/'\)\) return false;/, '只管静态图片');
  assert.match(guard, /return !isCaseGifPreview\(preview\);/, 'GIF 不动（走小动图）');
  assert.match(source, /data-material-rebuild-thumb="1">\$\{state\.lang === 'zh' \? '重建封面缩略图'/, '右键菜单里有这一项');
  assert.match(source, /closest\('\[data-material-rebuild-thumb\]'\)\) \{ menu\.remove\(\); void rebuildMaterialThumbnail\(previewId\); return; \}/, '菜单点击接线');
});
