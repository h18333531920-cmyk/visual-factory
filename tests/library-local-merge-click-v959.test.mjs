// v959：**就地合入的上传项在重画前也能点**（修「上传后卡片点击没反应、必须手动刷新一次」的
// **数据层根因**）。
//
// v957 修的是事件层：remountFreshLibraryCard 换上的真卡补绑 wireLibraryCard（点击/双击/右键/键盘）。
// 但点击回调查的 libraryItemByPreviewId() 只查 state.libraryItems —— 这个数组**只在网格重画
// （renderLibraryGrid）时重建**；v935 的就地合入（applyLocalLibraryChange）只更新
// librarySources / libraryPreviews，**不碰 libraryItems**。于是：卡有事件、数据也在 state 里，
// 但事件回调的快照命中不到新卡 ⇒ 静默 return ⇒「点不动、刷新一次就好」。
//
// 本文件锁住：
//   ① libraryItemByPreviewId 查不到时，必须从 state.libraryPreviews + state.librarySources 兜底组装；
//   ② 兜底 item 与渲染同一结构（含 isCaseProjectCard = isCaseProject(source)，否则案例项目卡
//      会走 selectLibraryItem 而不是 openCaseProjectModal）；
//   ③ 兜底 url 取 state.libraryPreviewUrls 里已签名的那份（就地合入时 signVisibleLibraryUrls 已签过）。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const source = readFileSync(join(ROOT, 'app.js'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');
const VERSION = '20261022-storage-buffer-v961';

function slice(start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, '找不到片段起点：' + start);
  const to = source.indexOf(end, from);
  assert.ok(to > from, '找不到片段终点：' + end);
  return source.slice(from, to);
}

test('v959：版本号三处一致（app.js 常量 + index.html ?v= + 本文件）', () => {
  assert.match(source, /TOOL_UI_VERSION = '20261022-storage-buffer-v961'/, 'app.js 内部版本号必须是 v959');
  const refs = (indexSource.match(/\?v=20261022-storage-buffer-v961/g) || []).length;
  assert.equal(refs, 5, 'index.html 必须 5 处 ?v= 引用 v959');
  assert.equal(VERSION, '20261022-storage-buffer-v961');
});

test('v959 ①：libraryItemByPreviewId 查不到时必须兜底从源数据组装（不再静默返回 null）', () => {
  const fn = slice('  function libraryItemByPreviewId(id) {', '  function hasUploadPermission() {');
  // 先查 libraryItems（命中就走老路）
  assert.match(fn, /const found = state\.libraryItems\.find\(item => item\.preview\.id === id\);\s*if \(found\) return found;/, '先查 libraryItems，命中直接返回');
  // 兜底：previews 里按 id 找，找不到才 null
  assert.match(fn, /const preview = state\.libraryPreviews\.find\(item => String\(item\.id\) === String\(id\)\);/, '兜底从 libraryPreviews 按 id 找');
  assert.match(fn, /if \(!preview\) return null;/, 'previews 里也没有才返回 null');
  assert.match(fn, /const source = state\.librarySources\.find\(item => String\(item\.id\) === String\(preview\.source_file_id\)\);/, '按 source_file_id 找回 source');
  assert.match(fn, /if \(!source\) return null;/, 'source 不存在才返回 null');
  // 组装结构与渲染同源：url 用已签名的 libraryPreviewUrls，case 卡标记 isCaseProjectCard
  assert.match(fn, /url: state\.libraryPreviewUrls\[String\(preview\.preview_path \|\| ''\)\] \|\| '',/, '兜底 url 取已签名 URL 表');
  assert.match(fn, /isCaseProjectCard: isCaseProject\(source\)/, '案例项目卡必须带 isCaseProjectCard 标记（否则点击走错分支）');
});

test('v959 ②：v957 的事件补绑仍然在（remount 真卡 wireLibraryCard 兜底），两处修复互为补充', () => {
  const remount = slice('  function remountFreshLibraryCard(sourceId) {', '  // 入库成功：先把封面换成真卡');
  assert.match(remount, /try \{ wireLibraryCard\(next\); \} catch \(_wireError\) \{\}/, 'v957：remount 换上的真卡必须补绑交互');
  assert.match(remount, /try \{ prepareDecodedLibraryImages\(next\); \} catch \(_prepareError\) \{\}/, '图片管线照旧挂上');
});

test('v959 ③：就地合入（applyLocalLibraryChange）仍然只动源数据不重画，靠兜底而不是重画救点击', () => {
  const apply = slice('  async function applyLocalLibraryChange(sourceIds, removed, options) {', '  // v938：上传时**先在本地显示**');
  // 上传路径：只更新 sources/previews + 签名 URL
  assert.match(apply, /state\.librarySources = fetched\.sources/, '上传路径就地合入 sources');
  assert.match(apply, /state\.libraryPreviews = sortLibraryPreviewsBySourceOrder\(/, '上传路径就地合入 previews');
  assert.match(apply, /signVisibleLibraryUrls\(/, '就地合入要给新预览签名 URL（兜底 item.url 依赖它）');
  // 绝不能偷偷改成整块重画（那等于把 v935 的乐观 UX 废掉）
  assert.doesNotMatch(apply, /renderLibraryGrid\(\)/, '就地合入不许整网格重画');
  // skipGrid 分支只刷分类数字
  assert.match(apply, /if \(skipGrid\) \{[\s\S]{0,200}renderLibrarySelects\(\);\s*refreshLibraryFilterCounts\(\);\s*\}/, 'skipGrid 只刷分类数字，网格不碰');
});
