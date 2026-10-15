// 删除项目不得在存储里留下孤儿文件（v741）。
// 背景：删除只删「原图」路径，而同目录的派生文件（_thumb-<previewId>.jpg、GIF 小动图 _small-*、
// 视频 _small-*.mp4 / _poster-*.jpg）不删，删项目后它们永远留在 vf-library 里。
// 修法：按目录清空——list 该目录，删掉里面的文件，子目录递归，删到没文件为止。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('按目录清空：列目录、删文件、递归子目录、删到空为止', () => {
  const body = fnBody('removeStorageFolder', '\n  async function deleteLibrarySource(');
  assert.match(body, /bucket\.list\(folderPath, \{ limit: 100 \}\)/, '必须列出目录内容');
  assert.match(body, /const files = entries\.filter\(entry => entry && entry\.id && entry\.name\)/, 'id 有值的是文件');
  assert.match(body, /bucket\.remove\(files\.map\(entry => folderPath \+ '\/' \+ entry\.name\)\)/, '按目录 + 文件名删除');
  assert.match(body, /if \(remove\.error\) throw remove\.error;/, '删除失败必须抛出（调用方要中止而不是静默留孤儿）');
  assert.match(body, /const subfolders = entries\.filter\(entry => entry && !entry\.id && entry\.name\)/, 'id 为空的是子目录');
  assert.match(body, /removed \+= await removeStorageFolder\(folderPath \+ '\/' \+ sub\.name\)/, '子目录递归清空');
  assert.match(body, /if \(!files\.length\) break;/, '一直删到这一层没有文件为止（list 上限 100，删完再列）');
});

test('删除项目：按源目录与预览目录整目录清空（v938 起清空挪到后台，失败只提示不回滚）', () => {
  const body = fnBody('deleteLibrarySource', '\n  function notifyStaticIframe');
  assert.match(body, /paths\.map\(path => String\(path\)\.replace\(\/\\\/\[\^\/\]\+\$\/, ''\)\)/, '目录要由源/预览文件路径推导');
  assert.match(body, /const folders = Array\.from\(new Set\(/, '同一目录只清一次');
  assert.match(body, /for \(const folder of folders\) await removeStorageFolder\(folder\)/, '逐个目录清空');
  // v938：顺序整个反过来 —— 先在界面上摘掉 + 弹提示，**再**去后台删库行、清目录。
  // 理由（用户口径）：「删除后在当前这个网页上的预览图即刻消失，把后端和刷新这些效果不好的东西
  // 放在用户看不到的地方」—— 原来"先递归清存储（5~6 次往返、这条线路上 8–9 秒）再删库行"，
  // 那几秒里项目还杵在屏幕上。现在清不干净只提示一次（云上留点孤儿文件），不再判整个删除失败。
  assert.match(body, /void \(async function cleanupDeletedSourceInBackground\(\)/, '清理挪到后台');
  assert.match(body, /素材已从库里删除；云上的文件没清干净/, '清不干净只提示，不阻塞、不回滚');
  assert.doesNotMatch(body, /alert\(error\.message \|\| String\(error\)\);\n      return;/, '不再因为清目录失败就中止删除');
  assert.doesNotMatch(body, /storage\.from\(LIBRARY_BUCKET\)\.remove\(paths\)/, '不得再只删已知路径');
});

test('删除全部素材：同样按目录清空（含预览目录）', () => {
  const start = appSource.indexOf("step = state.lang === 'zh' ? '存储' : 'Storage';");
  assert.ok(start > 0, 'deleteAllLibraryData 的存储步骤必须存在');
  const body = appSource.slice(start, appSource.indexOf('function notifyStaticIframe', start));
  assert.match(body, /state\.libraryPreviews\.forEach/, '预览目录也要清（原先只清源目录）');
  assert.match(body, /removedFiles \+= await removeStorageFolder\(folder\)/);
  assert.doesNotMatch(body, /\.remove\(unique\)/, '旧的仅删已知路径写法应已移除');
});

test('本次改动已随版本交付：版本号非旧值', () => {
  const version = (appSource.match(/const TOOL_UI_VERSION = '([^']+)';/) || [])[1];
  assert.ok(version, 'TOOL_UI_VERSION 必须存在');
  assert.doesNotMatch(version, /upload-progress-v740/, '这次改动必须 bump 版本，否则用户浏览器吃到旧 app.js');
  const refs = indexSource.match(new RegExp(version, 'g')) || [];
  assert.equal(refs.length, 5, 'index.html 五处版本号必须同步');
});
