// v815/v817：预览行的小改动（物料类型、语言）不再「改了 → 刷新 → 变回去」。
// 原因：改动是乐观更新（界面先变、请求在路上），用户立刻刷新就把请求打断了，库里还是旧值。
// 做法：先把这次改动按 previewId 合并记进本机待写入清单，请求确认写进了（1 行）再删；
//      进库时先补写清单再拉数据。语言、物料类型共用这一套。
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

test('待写入清单：改动先记账（同一条合并成 patch），写进库确认后才销账', () => {
  const queue = body('  function queuePreviewWrite(previewId, patch) {', '  function clearPreviewWrite(previewId) {');
  assert.match(queue, /entry\.patch = Object\.assign\(\{\}, entry\.patch, patch\);/, '同一行多次改动合并成一个 patch');
  assert.match(queue, /entry\.at = Date\.now\(\);/, '记下时间');
  assert.match(queue, /writePendingPreviewWrites\(map\);/, '落到 localStorage');
  const clear = body('  function clearPreviewWrite(previewId) {', '  let previewWriteFlushPromise = null;');
  assert.match(clear, /delete map\[previewId\];/, '销账');
  assert.match(source, /const PREVIEW_PENDING_KEY = 'vf:case-preview-pending:v1';/, '本机 key');
  assert.match(source, /const PREVIEW_PENDING_LEGACY_KEY = 'vf:case-type-pending:v1';/, '兼容 v815 只存物料类型时的老 key');

  const single = body('    const setMaterialType = function(previewId, nextType) {', '    // 改语言（英语/阿语/无）');
  assert.match(single, /queuePreviewWrite\(previewId, \{ material_type: nextType \|\| '' \}\);/, '改之前先记账');
  assert.match(single, /\.update\(\{ material_type: nextType \|\| '' \}\)\.eq\('id', previewId\)\.select\('id'\)/, '写入要带回执（0 行＝没写成）');
  assert.match(single, /if \(!written\) \{[\s\S]*rollback\(\);[\s\S]*没能写进数据库/, '0 行时回滚并明确提示');
  assert.match(single, /clearPreviewWrite\(previewId\);(?:\n[^\n]*)?\n        showCaseToast/, '只有确认写成才销账（v864 起中间允许插手动类型标记）');
});

test('批量改类型：同样记账，部分没写成只回滚那几行', () => {
  const batch = body('    const applyCaseBatchType = function(nextType) {', '    const openCaseBatchTypeMenu = function() {');
  assert.match(batch, /ids\.forEach\(function\(id\) \{ queuePreviewWrite\(id, \{ material_type: nextType \|\| '' \}\); \}\);/, '批量先记账');
  assert.match(batch, /\.in\('id', ids\)\.select\('id'\)/, '批量写入带回执');
  assert.match(batch, /if \(written >= ids\.length\) \{[\s\S]*showCaseToast\(state\.lang === 'zh' \? \('已把 ' \+ ids\.length/, '全部写成才报成功');
  assert.match(batch, /writtenIds\.has\(item\.id\)\) \{ clearPreviewWrite\(item\.id\); return; \}/, '写成的销账');
  assert.match(batch, /没写进数据库，刷新后会自动重试/, '没写成的回滚并说明会自动重试');
});

test('进库先补写：刷新后不会再看到旧值', () => {
  const flush = body('  function flushPendingPreviewWrites() {', '  async function loadLibraryData() {');
  assert.match(flush, /\.update\(patch\)\.eq\('id', id\)\.select\('id'\)/, '逐条补写并核对回执（patch 里可能有 language + material_type）');
  assert.match(flush, /if \(typeof patch\.language === 'string'\) patch\.language = normalizePreviewLanguage\(patch\.language\);/, '补写前归一语言值');
  assert.match(flush, /if \(rows\.length\) \{ settled\[id\] = true; continue; \}/, '写成一条销一条');
  assert.match(flush, /24 \* 60 \* 60 \* 1000/, '写不进去的留一天，过久放弃（避免永远重试）');
  assert.match(flush, /Object\.assign\(row, map\[id\] && map\[id\]\.patch \|\| \{\}\);/, '内存里的预览记录同步成新值');
  assert.match(source, /await flushPendingPreviewWrites\(\);\n      state\.libraryDataPromise = \(async \(\) => \{/, '拉素材之前先补写');
  assert.match(flush, /previewWriteFlushPromise\.then\(function\(\) \{ previewWriteFlushPromise = null; \}/, '跑完放开锁，后续进库还能补');
});
