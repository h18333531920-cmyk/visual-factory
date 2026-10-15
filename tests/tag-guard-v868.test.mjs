// v868：堵「静默抹标签」——三道保险的专项测试。
// 背景：v864 的 markCaseManualTypes 把 supabase .then() 回调参数当成行数据用
//（fresh.tags），实际回调参数是 { data, error } 包装，标签在 fresh.data.tags——
// fresh.tags 永远是 undefined，导致每次手动改物料类型都把项目业务标签整组抹掉
//（38→41 个项目 tags 被抹空、金刚筛选为 0 的元凶）。
// 三道保险：
//   ① markCaseManualTypes 读 fresh.data.tags + 读不到行（data:null）绝不写；
//   ② caseTagSelectionUpdatePayload 选择态整体为空时原样保留现有 tags；
//   ③ 编辑保存先读库拿最新 tags 作基底，成功后回写内存。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

// ── 静态断言 ─────────────────────────────────────────────────

test('修复 ① 静态：markCaseManualTypes 用 fresh.data.tags，读不到行绝不写', () => {
  const start = appSource.indexOf('function markCaseManualTypes');
  assert.ok(start >= 0, 'markCaseManualTypes 必须存在');
  const body = appSource.slice(start, appSource.indexOf('function caseElementValuesOf', start));
  assert.match(body, /fresh\.data\.tags/, '必须从 fresh.data.tags 取库内最新标签（v864 的 fresh.tags typo 不可回归）');
  assert.doesNotMatch(body, /Array\.isArray\(fresh\.tags\)/, '拿 fresh.tags 起底的 typo 模式不可回归');
  assert.match(body, /fresh\.data == null\) return null;/, '行读不到（data:null）必须直接返回不写库');
});

test('修复 ② 静态：序列化函数空选择态守卫保留现有 tags', () => {
  const start = appSource.indexOf('function caseTagSelectionUpdatePayload(source, chipSel)');
  const body = appSource.slice(start, appSource.indexOf('function caseProjectTagsForChips'));
  assert.match(body, /hasAnySelection/, '守卫条件必须存在');
  assert.match(body, /tags: currentTags,\s*\n\s*country_id: source\.country_id \|\| null,/);
});

test('修复 ③ 静态：编辑保存读库基底 + 成功后回写内存', () => {
  assert.match(appSource, /let base = source;\n      try \{\n        const fresh = await state\.supabase\.from\('vf_source_files'\)\.select\('tags,country_id,activity_id'\)\.eq\('id', source\.id\)\.maybeSingle\(\);/, '保存前必须先读库');
  assert.match(appSource, /const payload = caseTagSelectionUpdatePayload\(base, chipSel\);/, '序列化用读库基底');
  assert.match(appSource, /source\.tags = payload\.tags;\n        source\.country_id = payload\.country_id \|\| null;\n        source\.activity_id = payload\.activity_id \|\| null;/, '保存成功后回写内存');
});

// ── 行为断言 ─────────────────────────────────────────────────

// 加载 markCaseManualTypes + 标记编解码（含 fake state 注入）
function loadMarkHelpers() {
  const start = appSource.indexOf("const CASE_MANUAL_TYPE_MARKER_PREFIX = 'vf:manual-mtype:v1:';");
  const end = appSource.indexOf('function caseElementValuesOf');
  assert.ok(start > 0 && end > start, '标记助手块必须存在');
  const block = appSource.slice(start, end);
  return function makeHelpers(fakeSupabase) {
    const factory = new Function(
      'fakeSupabase',
      'var state = { supabase: fakeSupabase };\n' +
      block +
      '\nreturn { markCaseManualTypes: markCaseManualTypes, caseManualTypeMarker: caseManualTypeMarker };'
    );
    return factory(fakeSupabase);
  };
}

test('行为①：手动改类型用库里最新 tags 合并——业务标签不再被抹', async () => {
  let updatePayload = null;
  const fakeSupabase = {
    from: function(table) {
      assert.equal(table, 'vf_source_files');
      const query = {
        select: function() { return query; },
        eq: function() { return query; },
        maybeSingle: function() {
          return Promise.resolve({ data: { tags: ['C端', '科威特', '大促'] }, error: null });
        },
        update: function(payload) { updatePayload = payload; return query; }
      };
      return query;
    }
  };
  const makeHelpers = loadMarkHelpers();
  const helpers = makeHelpers(fakeSupabase);
  const source = { id: 'src-1', tags: ['C端', '科威特', '大促'] };
  await helpers.markCaseManualTypes(source, ['preview-9']);
  assert.ok(updatePayload, '标记变化时必须写库');
  assert.ok(Array.isArray(updatePayload.tags));
  ['C端', '科威特', '大促'].forEach(function(t) {
    assert.ok(updatePayload.tags.includes(t), '库内业务标签 ' + t + ' 必须保留（v864 会把它抹掉）');
  });
  assert.ok(updatePayload.tags.includes('vf:manual-mtype:v1:preview-9'), '新增的保护标记要在');
  assert.deepEqual(source.tags, updatePayload.tags, '内存也要同步成合并后的 tags');
});

test('行为②：库里行读不到（data:null / error）时绝不写、不碰内存 tags', async () => {
  const cases = [
    { data: null, error: null },
    { data: { tags: [] }, error: { message: 'boom' } },
    null
  ];
  for (const fresh of cases) {
    let wrote = false;
    const fakeSupabase = {
      from: function() {
        const query = {
          select: function() { return query; },
          eq: function() { return query; },
          maybeSingle: function() { return Promise.resolve(fresh); },
          update: function() { wrote = true; return query; }
        };
        return query;
      }
    };
    const makeHelpers = loadMarkHelpers();
    const helpers = makeHelpers(fakeSupabase);
    const source = { id: 'src-1', tags: ['C端'] };
    await helpers.markCaseManualTypes(source, ['preview-1']);
    assert.equal(wrote, false, '读不到行时绝不调用 update（fresh=' + JSON.stringify(fresh) + '）');
    assert.deepEqual(source.tags, ['C端'], '内存 tags 不被碰');
  }
});

test('行为③：标记已在库里时不重复写库（幂等）', async () => {
  let wrote = 0;
  const fakeSupabase = {
    from: function() {
      const query = {
        select: function() { return query; },
        eq: function() { return query; },
        maybeSingle: function() {
          return Promise.resolve({ data: { tags: ['C端', 'vf:manual-mtype:v1:p1'] }, error: null });
        },
        update: function() { wrote += 1; return query; }
      };
      return query;
    }
  };
  const makeHelpers = loadMarkHelpers();
  await makeHelpers(fakeSupabase).markCaseManualTypes({ id: 'src-1', tags: ['C端'] }, ['p1']);
  assert.equal(wrote, 0, '标记已存在时不该重复写库');
});

// 加载序列化函数块（与 v862 测试同一块：含 caseTagSelValues / CASE_TAG_CHIP_TAG_KEYS 定义）
function loadPayloadFn() {
  const start = appSource.indexOf('function caseTagChipRows()');
  const end = appSource.indexOf('function caseFootTagsHtml', start);
  const block = appSource.slice(start, end);
  const factory = new Function(
    'var state = { lang: "zh", libraryOptions: [] };' +
    'var LIBRARY_TAGS = { source: { tag1: [] } };' +
    'var FILTER_SECTIONS_CONFIG = { strategy: { values: [] }, element: { values: [] }, activity: { values: [] }, country: { values: [] }, format: { values: [] }, quantity: { values: [] } };' +
    'var libraryOptionIdByZhName = function() { return null; };' +
    'var libraryTagsForForm = function() { return []; };' +
    'var normalizeLibraryTags = function(_dim, tags) { return tags.slice(); };' +
    'var sourceTag2Values = function() { return []; };' +
    'var escapeHtml = function(v) { return String(v); };' +
    'var escapeAttr = function(v) { return String(v); };' +
    'var libraryDisplayLabel = function(v) { return v; };' +
    block +
    '\nreturn { caseTagSelectionUpdatePayload: caseTagSelectionUpdatePayload };'
  );
  return factory();
}

test('行为④：空选择态（chipSel 全空）原样保留现有 tags——不再静默清空', () => {
  const mod = loadPayloadFn();
  const tags = ['C端', '科威特', 'vf:manual-mtype:v1:p1'];
  const payload = mod.caseTagSelectionUpdatePayload({ tags: tags.slice(), country_id: 7, activity_id: 9 }, {});
  assert.deepEqual(payload.tags, tags, '什么都没选时 tags 必须原样保留');
  assert.equal(payload.country_id, 7, '国家归属不动');
  assert.equal(payload.activity_id, 9, '活动归属不动');
  // 各维度都是空数组的选择态也视同没选
  const payload2 = mod.caseTagSelectionUpdatePayload({ tags: tags.slice(), country_id: null, activity_id: null }, { tag1: [], strategy: [], element: [] });
  assert.deepEqual(payload2.tags, tags, '全空维度选择同样保留 tags');
});

test('行为⑤：有真实选择时走正常序列化（守卫不误伤）', () => {
  const mod = loadPayloadFn();
  const payload = mod.caseTagSelectionUpdatePayload({ tags: ['旧C端', 'vf:manual-mtype:v1:p1'] }, { tag1: 'C端' });
  assert.ok(payload.tags.includes('C端'), '选中平台要写入');
  assert.equal(payload.tags.includes('旧C端'), false, '旧平台标签要被替换掉');
  assert.ok(payload.tags.includes('vf:manual-mtype:v1:p1'), '保护标记不得被序列化剥掉');
});
