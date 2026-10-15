// v809：图库品类（标签二）从「弹窗下拉框 + 建议文案」改成「图片预览上的标签，点一下可手动改」。
// app.js 是 IIFE，沿用按源码片段断言的既有做法（只校验接线与契约，不重复跑真实上传）。
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

test('图库卡片：品类标签直接画在图片预览上，识别中/未分类都有状态', () => {
  const grid = body('  function renderGalleryDropGrid(zone, fileList) {', '  function updateDropZoneSummary(zone, fileList) {');
  assert.match(grid, /data-gallery-type-chip="' \+ i \+ '"/, '每张图各自一个品类标签');
  assert.match(grid, /class="case-drop-type"/, '复用案例库的图上标签样式');
  assert.match(grid, /window\.__vfGalleryDropFiles = files;/, '标签点击要能反查到文件');
  assert.match(grid, /wireGalleryTypeChips\(grid\)/, '要接线点击');

  const helpers = body('  const galleryTypeChoices = Object.create(null);', '  function renderGalleryDropGrid(zone, fileList) {');
  assert.match(helpers, /识别中…/, '识别过程中要有状态');
  assert.match(helpers, /未分类/, '没识别出＝未分类');
  assert.match(source, /\.case-drop-type\[data-gallery-type-chip\] \{ opacity: 1; \}/, '图库的图上标签常显（不像案例库要 hover）');
});

test('图库品类：识别到直接显示，不给「建议」文案，也不碰弹窗里的标签二', () => {
  assert.doesNotMatch(source, /galleryTypeHint/, '「已按图片识别自动选」这类提示文字已删除');
  assert.doesNotMatch(source, /suggestGalleryTypeTag/, '旧的建议式识别已删除');
  assert.doesNotMatch(source, /galleryAiApplying|tag2Touched/, '不再用「自动点按钮」的方式写品类');
  const mode = body('  function updateLibraryUploadMode(kind) {', '  function wireLibraryUploadKindCards() {');
  assert.match(mode, /\[data-upload-tag-picker="tag2"\]/, '图库模式下要隐藏标签二下拉');
  assert.match(mode, /picker\.hidden = kind === 'gallery'/, '只对图库隐藏');
});

test('图库品类：只认词表内的值，判断不出保持未分类', () => {
  const cls = body('  async function classifyGalleryFile(file) {', '  function wireGalleryTypeChips(grid) {');
  assert.match(cls, /\/api\/analyze-gallery-tag/, '走已有的识图接口');
  assert.match(cls, /vocabulary: galleryTypeVocabularyForSelection\(\)/, '词表由前端给（受标签一收窄）');
  assert.match(cls, /const tag = data && data\.success \? String\(data\.tag \|\| ''\) : '';/, '识别不出＝空');
  assert.match(cls, /galleryTypeTouched\[key\]/, '用户手改过就不再被识别覆盖');
  const vocab = body('  function galleryTypeVocabularyForSelection() {', '  async function classifyGalleryFile(file) {');
  assert.match(vocab, /value !== '未分类'/, '词表里不含「未分类」');
});

test('图库品类：每个文件按自己的品类入库（一个文件一个 source）', () => {
  const save = body('  function galleryTagsForFile(formData, file) {', '  function renderGalleryDropGrid(zone, fileList) {');
  assert.match(save, /galleryTypeValueOf\(file\)/, '取该文件自己的品类');
  assert.match(save, /vocabulary\.indexOf\(tag\) < 0/, '弹窗里那个被隐藏的标签二不参与');
  assert.match(save, /normalizeLibraryTags\('gallery', tags\)/, '仍然按图库的规范化写入');
  const upload = body('  async function uploadGalleryAssets(formData, onProgress, run) {', '  async function cleanupGalleryUpload(');
  assert.match(upload, /tags: galleryTagsForFile\(formData, file\)/, '上传时按文件写 tags');
  assert.doesNotMatch(upload, /tags: libraryTagsForForm\(formData, 'gallery'\)/, '不再所有文件共用一份 tags');
});

test('图库品类：每张图都单独识图（不是只看第一张，也不截断）', () => {
  const files = body('  function classifyGalleryFiles(files) {', '  function wireGalleryTypeChips(grid) {');
  assert.match(files, /mapWithConcurrency\(images, 3, function\(file\) \{/, '整批都跑，并发 3 个');
  assert.doesNotMatch(files, /slice\(0, \d+\)/, '不能再只识别前几张');
  assert.match(files, /classifyGalleryFile\(file\)/, '逐个文件调用识别');
  const cls = body('  async function classifyGalleryFile(file) {', '  // 每张图各自识图');
  assert.match(cls, /setGalleryTypeValue\(file, tag, false\);/, '识别结果写在「这个文件」自己的品类上');
  assert.doesNotMatch(cls, /galleryTypeHint/, '不弹提示文案');
});

test('案例库物料上传上限：校验与文案都是 100', () => {
  assert.match(source, /previewFiles\.length > 100/, '校验放宽到 100');
  assert.doesNotMatch(source, /previewFiles\.length > (30|50|60)/, '旧的 30/50/60 张校验已删除');
  assert.match(source, /最多 100 张/, '拖拽区文案同步');
  assert.doesNotMatch(source, /最多 (30|50|60) 张/, '旧文案已删除');
});

test('本机待同步残留：可以「不用了」清掉，团队表不动', () => {
  const dismiss = body('  function materialCatalogDismissPending() {', '  // 「按清单重跑识别」');
  assert.match(dismiss, /materialCatalogPendingLocal = \[\];/, '清空待同步列表');
  assert.match(dismiss, /writeLocalMaterialCatalog\(materialCatalogCache\);/, '本机缓存改写成团队表内容，下次加载不再算出来');
  const banner = body('  function renderMaterialCatalogPending(section, canEdit) {', '  async function renderMaterialCatalogSection(section) {');
  assert.match(banner, /id="material-catalog-pending-dismiss"/, '横幅上要有「不用了」按钮');
  assert.match(source, /closest\('#material-catalog-pending-dismiss'\)/, '按钮要接线');
});
