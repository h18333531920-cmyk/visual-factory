// 标签写入不得用陈旧引用整组覆盖（v737）。
// 背景：追加物料上传与缩略图回填在后台完成，若期间用户编辑过标签（改了国家/活动/四个分类），
// 完成时拿打开弹窗时捕获的 source.tags 写回，会把刚保存的编辑抹掉——用户看到的现象
// 就是「改了标签，刷新又复原」。所有“补标记”的写入都必须先读库里最新 tags 再合并。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

function fnBody(name, marker) {
  const start = appSource.indexOf('function ' + name + '(');
  assert.ok(start > 0, name + ' 必须存在');
  const end = appSource.indexOf(marker, start);
  assert.ok(end > start, name + ' 的结束位置找不到');
  return appSource.slice(start, end);
}

test('写标记前先读最新 tags：mergeSourceTagsMarker 必须重新查询再合并', () => {
  const body = fnBody('mergeSourceTagsMarker', '\n  async function markLibraryThumbnailBackfill');
  assert.match(body, /select\('tags'\)\.eq\('id', source\.id\)/, '必须先读库里最新值');
  assert.match(body, /current\.includes\(marker\)/, '已有标记直接跳过，不重复写');
  assert.match(body, /Array\.from\(new Set\(\[\.\.\.current, marker\]\)\)/, '合并必须以最新值为基底');
  assert.match(body, /update\(\{ tags: nextTags \}\)/, '写回合并结果');
});

test('追加物料完成后不得用捕获时的 tags 整组写回', () => {
  const body = fnBody('uploadCaseAppendPreviews', '\n  function renderLibraryCard');
  assert.match(body, /mergeSourceTagsMarker\(source, LIBRARY_PREVIEW_THUMBNAILS_TAG\)/,
    '标记必须走合并入口');
  assert.doesNotMatch(body, /\.\.\.\(source\.tags \|\| \[\]\)/, '不得展开捕获时的 tags 整组写回');
});

test('缩略图回填标记同样走合并入口', () => {
  const body = fnBody('markLibraryThumbnailBackfill', '\n  async function uploadLibraryBackfillBlob');
  assert.match(body, /mergeSourceTagsMarker\(source, target\.marker\)/);
  assert.doesNotMatch(body, /update\(\{ tags: nextTags \}\)/, '不得再用旧引用直接写 tags');
});

test('全文件不得回潮：基于捕获 source.tags 的整组写回', () => {
  assert.doesNotMatch(appSource, /update\(\{ tags: Array\.from\(new Set\(\[\.\.\.\(source\.tags/,
    '不允许旧写法回潮');
});
