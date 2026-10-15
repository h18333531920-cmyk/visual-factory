// v817：案例库物料语言（英语 / 阿拉伯语）
// 口径（用户拍板）：文件名里有 en/ar 线索就以文件名为准；没有线索的上传时识图判；
// 判断不出记「无」；项目展示页切到 EN / AR 时，没判出语言的图两边都要显示（不藏图）；
// 右键可手动改成 英语 / 阿语 / 无。库里存 vf_asset_previews.language（sql/020），
// 列不存在时前端自动降级（回到只按文件名判断），不影响其它字段。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const aiSource = readFileSync(join(here, '..', 'functions', '_ai.js'), 'utf8');

function body(start, end) {
  const from = appSource.indexOf(start);
  assert.ok(from >= 0, `找不到片段起点：${start}`);
  const to = appSource.indexOf(end, from);
  assert.ok(to > from, `找不到片段终点：${end}`);
  return appSource.slice(from, to);
}

test('语言判断优先级：库里的值 > 文件名线索 > 未分类', () => {
  const fnLang = body('  function caseFilenameLanguage(filename) {', '  function caseMaterialLanguage(preview) {');
  assert.match(fnLang, /\(ar\|arb\|arabic\)/, '文件名里的 ar 线索');
  assert.match(fnLang, /阿拉伯\|عربي/, '阿拉伯文文件名也算');
  assert.ok(fnLang.includes("(^|[^a-z])en([^a-z]|$)"), '文件名里的 en 线索');

  const resolve = body('  function caseMaterialLanguage(preview) {', '  function caseLanguageLabel(value) {');
  assert.match(resolve, /const stored = normalizePreviewLanguage\(preview && preview\.language\);/, '先看库里存的值');
  assert.match(resolve, /if \(stored === 'none'\) return '';/, '人工判「无」＝未分类，不再按文件名猜');
  assert.match(resolve, /if \(stored === 'en' \|\| stored === 'ar'\) return stored;/, '存的值优先于文件名');
  assert.match(resolve, /return caseFilenameLanguage\(preview && preview\.preview_filename\);/, '没存过才回落到文件名');

  const norm = body('  function normalizePreviewLanguage(value) {', '  function caseFilenameLanguage(filename) {');
  assert.match(norm, /'english', '英语', '英文'/, '别名归一（英语）');
  assert.match(norm, /'arabic', '阿拉伯语', '阿语', '阿拉伯'/, '别名归一（阿语）');
});

test('语言筛选：未判出语言的图在 EN / AR 两边都显示', () => {
  const match = body('  function caseMaterialMatchesLanguage(preview, want) {', '  function isCaseProject(source) {');
  assert.match(match, /if \(want !== 'en' && want !== 'ar'\) return true;/, '「全部」不过滤');
  assert.match(match, /return !lang \|\| lang === want;/, '没语言的也放行（不藏图）');
  const grid = body('    const visibleSideDefs = function() {', '    const renderSideGrid = function() {');
  assert.match(grid, /if \(caseSideLang === 'en' \|\| caseSideLang === 'ar'\) return !def\.lang \|\| def\.lang === caseSideLang;/, '列表按同一口径过滤');
  assert.match(appSource, /def\.lang = caseMaterialLanguage\(p\)|lang: caseMaterialLanguage\(p\)/, '卡片数据带 lang');
  assert.doesNotMatch(appSource, /def\.isEn|def\.isAr/, '旧的 isEn/isAr 口径已移除');
});

test('上传/追加：文件名没 en/ar 线索的才识图，识别不出记 none', () => {
  const req = body('  async function requestLanguageDetection(imageDataUrl) {', '  async function detectLanguageFromImageFile(file) {');
  assert.match(req, /fetch\('\/api\/analyze-language'/, '走语言识别接口');
  assert.match(req, /return \(lang === 'en' \|\| lang === 'ar'\) \? lang : 'none';/, '看过了但判断不出＝none');
  assert.match(req, /if \(!response\.ok \|\| !data \|\| !data\.success\) return '';/, '调用失败＝空（算没判过，之后可再试）');
  const fromFile = body('  async function detectLanguageFromImageFile(file) {', '  // 项目窗里对已有物料重新识别');
  assert.match(fromFile, /caseElementThumbnailDataUrl\(file\)/, '用缩略图去识别，省流量');

  const upload = body('      await mapWithConcurrency(previewFiles, 6, async function(file, index) {', '\n      setUploadProgress(95);');
  assert.match(upload, /const language = caseFilenameLanguage\(file\.name\) \|\| await detectLanguageFromImageFile\(file\);/, '文件名优先，没线索才识图');
  assert.match(upload, /if \(language && previewLanguageReady\) previewRow\.language = language;/, '写进新行');
  const append = body('  async function uploadCaseAppendPreviews(source, files, onProgress) {', '  function renderLibraryCard(');
  assert.match(append, /const appendLanguage = caseFilenameLanguage\(file\.name\) \|\| await detectLanguageFromImageFile\(file\);/, '追加物料同样处理');
});

test('language 列单独降级：老库没跑 sql/020 也能传图', () => {
  const fields = body('  function previewSelectFields(withMaterialType) {', '  async function previewAwareQuery(');
  assert.match(fields, /previewLanguageReady \? ',language' : ''/, '没这一列时不查它');
  const aware = body('  async function previewAwareQuery(runQuery) {', '  async function caseAwareQuery(');
  assert.match(aware, /isMissingLanguageColumnError\(result\.error\)/, '认出「缺 language 列」这一类错误');
  assert.match(aware, /previewLanguageReady = false;/, '只关掉 language 这一个开关');
  assert.match(appSource, /if \(previewInsert\.error && previewRow\.language && isMissingLanguageColumnError\(previewInsert\.error\)\)/, '插入失败时去掉 language 重试');
  assert.match(appSource, /rows\.forEach\(function\(row\) \{ delete row\.language; \}\);/, '追加物料同样重试');
  assert.match(appSource, /select\(previewSelectFields\(full\)\)/, '主查询走统一字段函数');
});

test('右键改语言：英语/阿语/无 + AI 识别，走与改类型同一套「先记账再确认」', () => {
  const menu = body('        menu.innerHTML = [\'\'].concat(materialCatalogTypeNames(sourcePlatformOf(source))).map(value =>', "        menu.addEventListener('click', function(menuEvent) {");
  assert.match(menu, /data-lang-value="\$\{pair\[0\]\}"/, '菜单里有语言选项');
  assert.match(menu, /\[\['en', '英语'\], \['ar', '阿语'\], \['none', '无'\]\]/, '英语/阿语/无三个选项');
  assert.match(menu, /data-material-detect-lang="1"/, '还有「AI 识别」');
  const click = body("        menu.addEventListener('click', function(menuEvent) {", '        setTimeout(function() { document.addEventListener');
  assert.match(click, /setMaterialLanguage\(previewId, nextLang\)/, '点语言即改');
  assert.match(click, /detectMaterialLanguage\(previewId\)/, '点 AI 识别即识别');

  const setter = body('    const setMaterialLanguage = function(previewId, nextLang, options) {', '    // 按图片识别语言');
  assert.match(setter, /queuePreviewWrite\(previewId, \{ language: value \}\);/, '先记本机待写入');
  assert.match(setter, /\.update\(\{ language: value \}\)\.eq\('id', previewId\)\.select\('id'\)/, '带回执确认写进库');
  assert.match(setter, /没能写进数据库（可能还没执行 sql\/020 迁移，或没有修改权限）/, '0 行时明确提示');
  assert.match(setter, /clearPreviewWrite\(previewId\);/, '写成才销账');
});

test('服务端：语言识别只认 en/ar，判断不出返回空，密钥只在环境变量', () => {
  assert.match(aiSource, /export function parseLanguageDetection\(text\)/, '有解析器');
  assert.match(aiSource, /export function normalizeLanguageValue\(value\)/, '有归一化');
  assert.match(aiSource, /export async function analyzeLanguageWithGlm\(env, imageBase64\)/, '有 GLM 调用');
  assert.match(aiSource, /拉丁字母（A-Z）＝英语；阿拉伯字母/, '提示词说明书写系统判定');
  assert.match(aiSource, /两种文字都有（双语 banner）[^']*返回空字符串/, '双语/看不清时返回空（不猜）');
  const endpoint = readFileSync(join(here, '..', 'functions', 'api', 'analyze-language.js'), 'utf8');
  assert.match(endpoint, /getUserFromToken/, '接口校验登录态');
  assert.match(endpoint, /analyzeLanguageWithGlm/, '复用 GLM 通道');
  assert.doesNotMatch(endpoint, /console\.log/, '不打印内容');
  const sql = readFileSync(join(here, '..', 'sql', '020_preview_language.sql'), 'utf8');
  assert.match(sql, /add column if not exists language text not null default ''/, '迁移脚本加列');
});
