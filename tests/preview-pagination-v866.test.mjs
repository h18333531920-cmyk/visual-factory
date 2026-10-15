// v866：物料查询分页拉全——接口单次最多回 1000 行，项目一多素材被悄悄截断
// （弹窗显示「素材 13」其实有 40 张，追加一张触发单项目重拉才露出真实数量）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

test('loadLibraryPreviews 必须按页拉全（.range 翻页循环 + 页满续拉）', () => {
  const start = appSource.indexOf('async function loadLibraryPreviews()');
  assert.ok(start >= 0, '函数必须存在');
  const end = appSource.indexOf('async function loadLibraryBookmarkGroups()', start);
  const body = appSource.slice(start, end);
  assert.match(body, /\.range\(from, from \+ LIBRARY_PREVIEW_PAGE_SIZE - 1\)/, '用 .range 翻页');
  assert.match(body, /if \(rows\.length < LIBRARY_PREVIEW_PAGE_SIZE\) break;/, '页不满即结束');
  assert.match(body, /from \+= LIBRARY_PREVIEW_PAGE_SIZE;/, '页码前进');
  assert.match(body, /\.order\('id', \{ ascending: true \}\)/, '页内加 id 稳定排序防漏行/重行');
  assert.match(appSource, /const LIBRARY_PREVIEW_PAGE_SIZE = 1000;/);
});

test('loadLibraryFavorites 同样分页（收藏数过千不丢）', () => {
  const start = appSource.indexOf('async function loadLibraryFavorites()');
  const end = appSource.indexOf('async function loadLibrarySources()', start);
  const body = appSource.slice(start, end);
  assert.match(body, /\.range\(favFrom, favFrom \+ LIBRARY_PREVIEW_PAGE_SIZE - 1\)/);
  assert.match(body, /if \(rows\.length < LIBRARY_PREVIEW_PAGE_SIZE\) break;/);
});

// ── 行为测试：假 supabase 分页吐数据，验证 2500 张一张不丢 ──

function loadLoadLibraryPreviews() {
  const start = appSource.indexOf('async function loadLibraryPreviews()');
  const end = appSource.indexOf('async function loadLibraryBookmarkGroups()', start);
  const block = appSource.slice(start, end);
  return new Function(
    'state', 'chunkArray', 'SUPABASE_IN_BATCH_SIZE', 'LIBRARY_PREVIEW_PAGE_SIZE',
    'previewAwareQuery', 'previewSelectFields', 'translateCaseSchemaError',
    'visibleLibraryTags', 'IMAGE_EXTENSIONS', 'fileExt',
    block + '\nreturn loadLibraryPreviews;'
  );
}

test('行为：2500 张物料跨 3 页全部拉到，一张不丢', async () => {
  const TOTAL = 2500;
  const allRows = Array.from({ length: TOTAL }, (_, i) => ({
    id: 'p' + String(i).padStart(5, '0'),
    source_file_id: 'src-1',
    preview_path: 'path-' + i,
    preview_filename: 'f-' + i + '.png',
    preview_mime_type: 'image/png',
    width: 100, height: 100,
    sort_order: (i % 10) * 10,
    created_at: '2026-09-30T00:00:00Z',
  }));
  let lastRange = null;
  const builder = {
    select() { return this; },
    in() { return this; },
    order() { return this; },
    range(from, to) { lastRange = [from, to]; return this; },
    then(resolve) {
      const [from, to] = lastRange;
      const rows = allRows.slice(from, to + 1);
      lastRange = null;
      return resolve({ data: rows, error: null });
    },
  };
  const state = {
    supabase: { from: () => builder },
    librarySources: [{ id: 'src-1', tags: [], created_at: '2026-09-30T00:00:00Z' }],
    libraryPreviews: [],
    libraryItems: [],
  };
  const load = loadLoadLibraryPreviews()(
    state,
    (items, size) => [items],
    200,
    1000,
    async (runQuery) => runQuery(false, false),
    () => 'id,source_file_id',
    (e) => e,
    () => [],
    [],
    () => ''
  );
  await load();
  assert.equal(state.libraryPreviews.length, TOTAL, '2500 张要全部拉到（截断版只会拿到 1000）');
  const ids = new Set(state.libraryPreviews.map(p => p.id));
  assert.equal(ids.size, TOTAL, '且不能有重复行');
});

test('行为：不足一页时只拉一次就停（不空转）', async () => {
  const allRows = Array.from({ length: 13 }, (_, i) => ({
    id: 'q' + i, source_file_id: 'src-1', preview_path: '', preview_filename: 'x.png',
    width: 10, height: 10, sort_order: 10, created_at: '',
  }));
  let calls = 0;
  let lastRange = null;
  const builder = {
    select() { return this; },
    in() { return this; },
    order() { return this; },
    range(from, to) { lastRange = [from, to]; return this; },
    then(resolve) {
      calls += 1;
      const [from, to] = lastRange;
      const rows = allRows.slice(from, to + 1);
      lastRange = null;
      return resolve({ data: rows, error: null });
    },
  };
  const state = {
    supabase: { from: () => builder },
    librarySources: [{ id: 'src-1', tags: [], created_at: '' }],
    libraryPreviews: [],
    libraryItems: [],
  };
  const load = loadLoadLibraryPreviews()(
    state, (items) => [items], 200, 1000,
    async (runQuery) => runQuery(false, false),
    () => 'id', (e) => e, () => [], [], () => ''
  );
  await load();
  assert.equal(state.libraryPreviews.length, 13);
  assert.equal(calls, 1, '13 张不满一页，只发一次请求');
});
