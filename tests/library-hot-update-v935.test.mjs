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
const VERSION = '20261015-modal-scroll-lock-v941';

function slice(start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, '找不到片段起点：' + start);
  const to = source.indexOf(end, from);
  assert.ok(to > from, '找不到片段终点：' + end);
  return source.slice(from, to);
}

test('v935/v938 ①：删除 = 先本地摘掉（立刻可见），后端动作挪到看不见的地方', () => {
  const del = slice('  async function deleteLibrarySource(sourceId) {', '  function notifyStaticIframe(msg) {');
  assert.match(del, /const removedLocally = await applyLocalLibraryChange\(sourceId, true\);/, '删除要走局部摘除（毫秒级，界面上立刻没了）');
  assert.match(del, /showCaseToast\(/, '删完要给一句看得见的反馈');
  assert.match(del, /void \(async function cleanupDeletedSourceInBackground\(\)/, 'v938：删库行 + 清存储挪到后台（用户看不到）');
  // 后台块里：先删库行，失败才 reloadLibraryData 把界面找回来；清存储失败只提示
  const background = del.slice(del.indexOf('void (async function cleanupDeletedSourceInBackground()'));
  assert.match(background, /from\('vf_source_files'\)\.delete\(\)\.eq\('id', sourceId\)/, '后台第一步删库行');
  assert.match(background, /catch \(error\) \{[\s\S]{0,400}await reloadLibraryData\(\)/, '库行没删掉要把界面找回来');
  assert.match(background, /for \(const folder of folders\) await removeStorageFolder\(folder\)/, '最后清云存储');
  // "不许无条件整库重拉"：reloadLibraryData 只能出现在兜底/失败恢复里，不能出现在主流程
  const reloadCalls = del.match(/await reloadLibraryData\(\);/g) || [];
  assert.equal(reloadCalls.length, 2, '只允许两处：局部摘除失败兜底 + 后台删库失败恢复');
  assert.doesNotMatch(del, /^\s+await reloadLibraryData\(\);\n\s+showCaseToast/m, '主流程里不许直接整库重拉');
});

test('v935/v938 ②：上传成功走"局部合入 + 不重画网格"，兜底仍在', () => {
  const upload = slice('      setMessage(message, state.lang === \'zh\' ? \'上传成功，已入库。\'', '      if (isCaseProject) {\n        rememberLastCaseUploadCountry');
  assert.match(upload, /const appliedLocally = await applyLocalLibraryChange\(sourceId, false, \{skipGrid: true\}\);/,
    'v938：上传成功后只合入状态 + 不重画网格（界面上那张本地占位卡已经在位）');
  assert.match(upload, /finishLibraryPendingUpload\(sourceId\);/, '把本地占位卡的角标撤掉');
  assert.match(upload, /if \(!appliedLocally\) \{ dropLibraryPendingUploads\(\[sourceId\]\); await reloadLibraryData\(\); \}/, '合不进去才退回整库重拉');
  assert.doesNotMatch(upload, /^\s+await reloadLibraryData\(\);/m, '不许再无条件整库重拉');
});

test('v935/v936 ③④：局部更新只动本地、只重画 —— 不许偷偷再整库重拉', () => {
  const apply = slice('  async function applyLocalLibraryChange(sourceIds, removed, options) {', '  // v938：上传时**先在本地显示**');
  assert.match(apply, /state\.librarySources = state\.librarySources\.filter\(item => !idSet\.has\(String\(item\.id\)\)\)/, '删除要摘掉源文件行');
  assert.match(apply, /state\.libraryPreviews = state\.libraryPreviews\.filter\(item => !idSet\.has\(String\(item\.source_file_id\)\)\)/, '删除要摘掉它的物料行');
  assert.match(apply, /state\.previewAiTagsByPreviewId\.delete\(String\(item\.id\)\)/, '删除要顺手清掉标签缓存');
  assert.match(apply, /const fetched = await fetchLibrarySourceWithPreviews\(ids\);/, '上传走"只读这几个项目"');
  assert.match(apply, /if \(!fetched\.sources\.length\) return false;/, '查不到就返回 false，让调用方兜底');
  assert.match(apply, /notePreviewAiTagsChanged\(\);\s*\n\s*\/\/ v938：上传那条路 skipGrid/, 'v938：上传那一路明确不重画网格');
  assert.match(apply, /if \(skipGrid\) \{\s*\n\s*renderLibrarySelects\(\);\s*\n\s*refreshLibraryFilterCounts\(\);/, '不重画网格时也要刷分类数字');
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
  assert.match(source, /\.library-card\.is-just-uploaded \{ outline: 3px solid #3b82f6;/, 'v939：高亮样式（封面边缘**蓝**圈，用户要求不要红的）要在 app.js 里注入');
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

test('v938：上传"先在本地显示" —— 占位卡用本机文件的 blob URL，且在上传动手之前就挂出去', () => {
  const pending = slice('  const libraryPendingUploads = [];', '  // case_activity 是 v738 新增的类型值');
  assert.match(source, /images: \[\{url: URL\.createObjectURL\(coverFile\)/, '占位卡的图来自本机 File（零网络）');
  assert.match(pending, /revokeLibraryPendingUploadUrls/, '退场时要释放 blob URL（不然一直占内存）');
  assert.match(pending, /grid\.insertAdjacentHTML\('afterbegin'/, '插在素材库最前面');
  assert.match(pending, /if \(grid\.querySelector\('\.library-column'\)\)/, '案例墙按列排时要包一层 .library-column');
  assert.match(pending, /data-pending-source=/, '占位卡带上将来那个 sourceId（入库完成靠它对上号）');
  assert.match(pending, /entry\.done \? '' : '<span class="library-pending-badge">/, 'done 之后不再画「上传中」角标');
  assert.match(source, /renderLibraryPendingUploadCards\(\);/, '重画网格时要把占位卡补回来');
  // 顺序：校验通过 → 本地占位卡 → 才进上传循环
  const createAt = source.indexOf('pendingUpload = await startLibraryPendingUpload({');
  const loopAt = source.indexOf('await mapWithConcurrency(previewFiles,');
  assert.ok(createAt > 0, '上传流程里要创建占位卡');
  assert.ok(loopAt > createAt, '占位卡必须在真正上传之前就挂出去（否则又变成"先等后看"）');
  assert.match(source, /if \(pendingUpload\) dropLibraryPendingUploads\(\[sourceId\]\);/, '失败/取消要摘掉占位卡');
});

test('v938：占位卡 HTML 真跑 —— 有本地图 + 角标，done 后角标消失', () => {
  const pendingSlice = slice('  function libraryPendingCardHtml(entry) {', '  function insertLibraryPendingCard(entry) {');
  const context = vm.createContext({
    state: {lang: 'zh'},
    escapeHtml: (value) => String(value == null ? '' : value),
    escapeAttr: (value) => String(value == null ? '' : value),
    previewAspectStyle: (preview) => '--preview-ratio:' + (preview.height && preview.width ? (preview.height / preview.width).toFixed(4) : '1.4000') + ';'
  });
  const render = vm.runInContext('(function(){ ' + pendingSlice + ' return libraryPendingCardHtml; })()', context, {filename: 'app-v938-pending.js'});
  const html = render({id: 'pending-abc', sourceId: 'src-1', title: '测试项目', count: 3, done: false, images: [{url: 'blob:http://local/xyz', filename: 'a.png', width: 1000, height: 2000}]});
  assert.match(html, /src="blob:http:\/\/local\/xyz"/, '封面用本机 blob 地址');
  assert.match(html, /上传中…/, '有「上传中」角标');
  assert.match(html, /3 个物料/, '张数要写对');
  assert.match(html, /data-pending-source="src-1"/);
  assert.match(html, /--preview-ratio:2\.0000/, '比例来自本机读到的宽高');
  const doneHtml = render({id: 'pending-abc', sourceId: 'src-1', title: '测试项目', count: 3, done: true, images: []});
  assert.doesNotMatch(doneHtml, /上传中/, 'done 之后没有角标');
  assert.match(doneHtml, /is-just-uploaded/, 'done 之后给高亮（原地转正）');
});

test('v939/v940：占位卡类名要和真实案例卡一致 + 入库后**就地换成真卡**（不再手搓）', () => {
  const html = slice('  function libraryPendingCardHtml(entry) {', '  function insertLibraryPendingCard(entry) {');
  assert.match(html, /class="library-card library-case-card library-pending-card/, '要带 library-case-card（案例卡那套样式）');
  assert.match(html, /library-preview-shell img-loaded is-preview-ready/, '要带"封面已就绪"的两个类，否则被 .library-preview-shell::before 那层灰盖住');
  assert.match(html, /class="library-progressive-image"/, 'img 要有 library-progressive-image（它是 z-index 1 那层）');
  // v940：收尾不再手搓图，而是用真实卡片的渲染换掉整张卡
  const remount = slice('  function remountFreshLibraryCard(sourceId) {', '  // 入库成功：先把封面换成真卡');
  assert.match(remount, /holder\.innerHTML = renderLibraryCard\(item\);/, '用真实卡片渲染器（类名/签名地址/图片管线全都一致）');
  assert.match(remount, /const collapsed = collapseCaseProjectItems\(items\);/, '选封面走网格同一条口径');
  assert.match(remount, /node\.parentNode\.replaceChild\(next, node\);/, '只换这一张卡，网格其余不动');
  assert.match(remount, /prepareDecodedLibraryImages\(next\);/, '挂上图片管线（它负责把灰色占位层淡出）');
  assert.match(remount, /revokeLibraryPendingUploadUrls\(entry\);/, '换完才释放本地 blob');
  const finish = slice('  function finishLibraryPendingUpload(sourceId) {', '  // 每次重画网格都调一次');
  assert.match(finish, /const remounted = remountFreshLibraryCard\(sourceId\);/, '先试就地换真卡');
  assert.match(finish, /if \(!remounted\) \{[\s\S]{0,300}renderLibraryGrid\(\);/, '换不动就退回整块重画（宁可闪一下也不能一直空白）');
  assert.match(finish, /libraryPendingUploads\.splice\(index, 1\);/, '条目退场（之后由真实数据管，避免被当成占位卡再删一次）');
});

test('v941：弹窗开着时锁住页面滚动 —— 而且锁的是 .content（不是 body）', () => {
  const lock = slice('  function syncPageScrollLock() {', '  // case_activity 是 v738 新增的类型值');
  assert.match(lock, /document\.querySelectorAll\('\.modal-backdrop, \.case-project-backdrop'\)/, '按"有没有开着的弹窗"来判定锁定');
  assert.match(lock, /document\.querySelectorAll\('\.content'\)\.forEach/, '**必须锁 .content** —— 这个项目的页面滚动容器是它，body 不是');
  assert.match(lock, /node\.style\.overflowY = value/, '锁的是 .content 的 overflow-y');
  assert.match(lock, /const value = locked \? 'hidden' : '';/, '有弹窗锁、没弹窗解锁（幂等，不用计数）');
  // 各处开关必须换掉"只锁 body"的老写法
  assert.doesNotMatch(source, /document\.body\.style\.overflow = 'hidden';/, '不许再到处写"只锁 body"（等于没锁）');
  assert.doesNotMatch(source, /document\.body\.style\.overflow = '';/, '解锁同理，统一走 syncPageScrollLock()');
  const callers = source.match(/syncPageScrollLock\(\);/g) || [];
  assert.ok(callers.length >= 10, '所有弹窗的开关都要调它（现在 ' + callers.length + ' 处）');
  // 上传弹窗以前根本没锁
  assert.match(source, /document\.getElementById\('library-upload-modal'\)\.hidden = false;\s*\n\s*syncPageScrollLock\(\);/, '上传弹窗打开要锁');
  assert.match(source, /function closeLibraryUploadModal\(\) \{[\s\S]{0,160}syncPageScrollLock\(\);/, '上传弹窗关闭要解锁');
  // 第二层保险：滚到尽头不传染给背景
  assert.match(source, /\.library-upload-scroll, \.case-project-body, \.case-side, \.case-side-grid,\s*\n\.library-bookmark-editor-list, \.case-tag-pop \{ overscroll-behavior: contain; \}/, '弹窗内的滚动容器要 overscroll-behavior: contain');
});

test('v935 ⑤：版本号六处同步', () => {
  assert.match(source, new RegExp("const TOOL_UI_VERSION = '" + VERSION + "'"));
  const refs = indexSource.match(new RegExp('\\?v=' + VERSION, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处 ?v= 指向新版本');
});
