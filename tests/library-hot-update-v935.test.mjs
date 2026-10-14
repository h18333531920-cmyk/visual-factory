// v935：上传 / 删除项目之后**就地生效**，不再整库重拉。
//
// 用户口径（原话）：「我发现不管是删除项目还是上传项目，结束后都会延迟大概 8、9 秒后才会对整个页面进行
// 刷新，没法及时生效吗，并且不要刷新的冷更新吗」。
//
// 那 8–9 秒来自 reloadLibraryData()：它把全部 source、全部 preview、**整张 vf_preview_ai_tags
// （1900+ 行）** 重拉一遍、所有签名 URL 重签一遍、整页重画一遍 —— 而这一次操作其实只影响**一个项目**。
//
// 本文件锁住这件事：
//   ① 删除项目 → 走 applyLocalLibraryChange(sourceId, true)（本地摘掉，连查都不查），不再直接整库重拉；
//   ② 上传项目 → 走 applyLocalLibraryChange(sourceId)（只重拉这一个项目的源文件行 + 物料行）；
//   ③ 两条路都保留 reloadLibraryData() 作为**兜底**（局部处理不成就退回整库重拉，不许静默什么都不做）；
//   ④ 局部更新只动本地那一个项目、只调 refreshLibraryLoadedUi()，**不许**再去调 loadLibrarySources /
//      loadLibraryPreviews / loadAllPreviewAiTags（否则等于换了个地方重新整库重拉）；
//   ⑤ 排序口径只有一份：sortLibraryPreviewsBySourceOrder()，整库加载与局部更新都用它（纯函数，真跑验序）。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const source = readFileSync(join(ROOT, 'app.js'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');
const VERSION = '20261014-edit-mode-hide-v937';

function slice(start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, '找不到片段起点：' + start);
  const to = source.indexOf(end, from);
  assert.ok(to > from, '找不到片段终点：' + end);
  return source.slice(from, to);
}

test('v935 ①：删除项目走"本地摘掉"，不再等整库重拉', () => {
  const del = slice('  async function deleteLibrarySource(sourceId) {', '  function notifyStaticIframe(msg) {');
  assert.match(del, /const removedLocally = await applyLocalLibraryChange\(sourceId, true\);/, '删除要走局部摘除');
  assert.match(del, /if \(!removedLocally\) await reloadLibraryData\(\);/, '摘不动才退回整库重拉（兜底）');
  assert.doesNotMatch(del, /^\s+await reloadLibraryData\(\);/m, '不许再无条件整库重拉');
  assert.match(del, /showCaseToast\(/, '删完要给一句看得见的反馈');
});

test('v935 ②：上传成功走"只重拉这一个项目"，兜底仍在', () => {
  const upload = slice('      setMessage(message, state.lang === \'zh\' ? \'上传成功，已入库。\'', '      if (isCaseProject) {\n        rememberLastCaseUploadCountry');
  assert.match(upload, /const appliedLocally = await applyLocalLibraryChange\(sourceId\);/, '上传成功要局部合入');
  assert.match(upload, /if \(!appliedLocally\) await reloadLibraryData\(\);/, '合不进去才退回整库重拉');
  assert.doesNotMatch(upload, /^\s+await reloadLibraryData\(\);/m, '不许再无条件整库重拉');
});

test('v935/v936 ③④：局部更新只动本地、只重画 —— 不许偷偷再整库重拉', () => {
  const apply = slice('  async function applyLocalLibraryChange(sourceIds, removed) {', '  // case_activity 是 v738 新增的类型值');
  assert.match(apply, /state\.librarySources = state\.librarySources\.filter\(item => !idSet\.has\(String\(item\.id\)\)\)/, '删除要摘掉源文件行');
  assert.match(apply, /state\.libraryPreviews = state\.libraryPreviews\.filter\(item => !idSet\.has\(String\(item\.source_file_id\)\)\)/, '删除要摘掉它的物料行');
  assert.match(apply, /state\.previewAiTagsByPreviewId\.delete\(String\(item\.id\)\)/, '删除要顺手清掉标签缓存');
  assert.match(apply, /const fetched = await fetchLibrarySourceWithPreviews\(ids\);/, '上传走"只读这几个项目"');
  assert.match(apply, /if \(!fetched\.sources\.length\) return false;/, '查不到就返回 false，让调用方兜底');
  assert.match(apply, /notePreviewAiTagsChanged\(\);\s*\n\s*refreshLibraryLoadedUi\(\);/, '最后只重画当前界面');
  assert.match(apply, /highlightFreshLibraryCards\(ids,/, 'v936：重画之后把新卡片高亮几秒');
  assert.doesNotMatch(apply, /loadLibrarySources\(\)|loadLibraryPreviews\(\)|loadAllPreviewAiTags\(\)|reloadLibraryData\(\)/, '局部更新里不许再出现整库重拉的调用');
  // 只读指定的几个项目：按 id 批量查 source + 按 source_file_id 批量查 preview，不等于整库
  const fetchSome = slice('  async function fetchLibrarySourceWithPreviews(sourceIds) {', '  // v936：上传成功后把新入库的卡片');
  assert.match(fetchSome, /\.in\('id', idBatch\)/, '源文件按 id 批量查');
  assert.match(fetchSome, /\.in\('source_file_id', idBatch\)/, '物料按 source_file_id 批量查');
  assert.match(fetchSome, /caseAwareQuery\(/, '沿用整库加载那套字段/降级（免得两边形状不一致）');
  assert.match(fetchSome, /previewAwareQuery\(/, '物料查询同样沿用降级路径');
});

test('v936：高亮只加/去一个 class，认卡片的两个属性，6 秒后自己摘掉', () => {
  const hl = slice('  function highlightFreshLibraryCards(sourceIds, previewIds, durationMs) {', '  async function applyLocalLibraryChange');
  assert.match(hl, /card\.classList\.add\('is-just-uploaded'\)/, '加高亮 class');
  assert.match(hl, /window\.setTimeout\([\s\S]{0,200}card\.classList\.remove\('is-just-uploaded'\)/, '几秒后自己摘掉');
  assert.match(hl, /data-case-project/, '案例卡按项目 id 认');
  assert.match(hl, /data-preview-id/, '其余卡片按物料 id 认');
  assert.match(source, /\.library-card\.is-just-uploaded \{ outline: 3px solid #f97316;/, '高亮样式（封面边缘橙圈）要在 app.js 里注入');
  assert.match(source, /@keyframes library-fresh-pulse/, '要有个呼吸感的动画');
  // v892 那条守卫（app.js 里不许再有搜索用的 is-fresh）不能被这次改动踩到 —— 类名故意避开
  assert.doesNotMatch(source, /is-fresh/);
});

test('v935 ⑤：排序口径只有一份，纯函数真跑验序', () => {
  assert.match(source, /state\.libraryPreviews = sortLibraryPreviewsBySourceOrder\(previews\);/, '整库加载用这个排序');
  assert.match(source, /state\.libraryPreviews = sortLibraryPreviewsBySourceOrder\(/, '局部更新也用同一个');
  const sortBlock = slice('  function sortLibraryPreviewsBySourceOrder(rows) {', '\n  async function loadLibraryBookmarkGroups() {');
  const context = vm.createContext({});
  const state = {librarySources: [{id: 'a'}, {id: 'b'}]};
  const rows = [
    {id: 'p3', source_file_id: 'b', sort_order: 10, created_at: '2026-01-01'},
    {id: 'p2', source_file_id: 'a', sort_order: 20, created_at: '2026-01-03'},
    {id: 'p1', source_file_id: 'a', sort_order: 10, created_at: '2026-01-02'},
    {id: 'p9', source_file_id: 'zzz', sort_order: 10, created_at: '2026-01-01'}
  ];
  // 该函数读外层的 state ⇒ 在同一个 vm 里补一个 state 再取出来跑
  const sortPreviews = vm.runInContext('(function(state){ ' + sortBlock + ' return sortLibraryPreviewsBySourceOrder; })', context, {filename: 'app-v935-sort.js'})(state);
  const ordered = sortPreviews(rows).map(item => item.id);
  assert.deepEqual(ordered, ['p1', 'p2', 'p3', 'p9'], '项目顺序优先 → sort_order → 未知项目排最后');
  assert.deepEqual(rows.map(item => item.id), ['p3', 'p2', 'p1', 'p9'], '不许就地改调用方传进来的数组');
});

test('v935 ⑤：版本号六处同步', () => {
  assert.match(source, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  const refs = indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处 ?v= 指向新版本');
});
