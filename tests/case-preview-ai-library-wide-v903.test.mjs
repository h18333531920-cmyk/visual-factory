import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const searchStart = source.indexOf('  // v903 逐图元素标签聚合');
const searchEnd = source.indexOf('  // v829 搜索词扩展');
assert.ok(searchStart > 0 && searchEnd > searchStart, '搜索聚合代码块（caseProjectElementTags + libraryItemSearchText）必须存在');

const loadStart = source.indexOf('  function isPreviewAiTagsUnavailableError(');
const loadEnd = source.indexOf('  async function postCasePreviewAiTagAction(');
assert.ok(loadStart > 0 && loadEnd > loadStart, '逐图标签读取代码块必须存在');

// 把搜索文本函数切出来跑：外层依赖（案例判定 / 物料 / 逐图标签 / 词表）全部用假的塞进去
// effectTagsById 是 v918 的动效标签桩（不传就是"这张没有动效标签"）；它是**独立一维**，与元素标签不共用桩。
function loadSearch(previews, tagsById, effectTagsById = {}) {
  const context = vm.createContext({
    state: {libraryPreviews: previews},
    LIBRARY_SEARCH_PINYIN: {汉堡: 'hanbao'},
    LIBRARY_SEARCH_EN_EXTRA: {},
    LIBRARY_LABELS_EN: {},
    libraryKindOfSource: () => 'source',
    libraryKindLabel: () => '案例库项目',
    optionNameById: () => '',
    visibleLibraryTags: (s) => s.tags || [],
    isCaseProject: (s) => !!s && s.caseProject === true,
    caseMaterialsOf: (s) => previews.filter((p) => p.source_file_id === s.id),
    casePreviewAiTags: (id) => tagsById[id] || [],
    casePreviewAiEffectTags: (id) => effectTagsById[id] || [],
  });
  vm.runInContext(source.slice(searchStart, searchEnd) + ';({ libraryItemSearchText, caseProjectElementTags, caseProjectEffectTags })', context);
  return context;
}

// 假的 supabase 链式客户端：记录 select/eq/order/range 调用，await 时按请求的范围吐数据
function loadLoaders(responder) {
  const warns = [];
  const calls = {table: '', selects: [], eq: [], order: [], range: []};
  const client = {
    from(table) {
      calls.table = table;
      const requested = {select: '', range: null};
      const chain = {
        select(value) { requested.select = value; calls.selects.push(value); return chain; },
        eq(column, value) { calls.eq.push([column, value]); return chain; },
        order(column, options) { calls.order.push([column, options]); return chain; },
        range(from, to) { requested.range = [from, to]; calls.range.push([from, to]); return chain; },
        then(resolve, reject) {
          return Promise.resolve(responder({select: requested.select, range: requested.range}))
            .then(resolve, reject);
        }
      };
      return chain;
    }
  };
  const context = vm.createContext({
    state: {supabase: client, previewAiTagsByPreviewId: new Map()},
    CASE_PREVIEW_AI_TABLE: 'vf_preview_ai_tags',
    console: {warn: (...args) => warns.push(args.join(' '))}
  });
  vm.runInContext('var previewAiTagsTableReady = null;\n' + source.slice(loadStart, loadEnd)
    + '\n;({ loadAllPreviewAiTags, loadPreviewAiTagsForSource, readPreviewAiTagsRows })', context);
  return {context, calls, warns};
}

test('v903 搜索聚合：项目卡命中非封面物料的逐图元素标签', () => {
  const previews = [
    {id: 'cover', source_file_id: 'p1', preview_filename: 'header.png', material_type: '头图'},
    {id: 'inner', source_file_id: 'p1', preview_filename: 'popup.png', material_type: '弹窗'},
    {id: 'solo', source_file_id: 's1', preview_filename: 'solo.png', material_type: '头图'},
  ];
  const context = loadSearch(previews, {cover: ['kiki'], inner: ['世界杯', 'kiki'], solo: ['kiki']});

  const project = {id: 'p1', title: 'Ramadan', source_path: '', tags: [], caseProject: true};
  const text = context.libraryItemSearchText({source: project, preview: previews[0]});
  assert.ok(text.includes('世界杯'), '非封面物料（弹窗）上的逐图标签必须进项目卡搜索文本');
  assert.ok(text.includes('头图') && text.includes('弹窗'), '整个项目的物料类型照旧都算进来（回归保护）');
  assert.equal(context.caseProjectElementTags([previews[0], previews[1]]).join(','), 'kiki,世界杯', '全项目逐图标签合并去重');

  // 单图素材：只看自己那张，别的图上的标签不许串进来
  const single = {id: 's1', title: 'Solo', source_path: 'cases/solo.png', tags: [], caseProject: false};
  const singleText = context.libraryItemSearchText({source: single, preview: previews[2]});
  assert.ok(singleText.includes('kiki'), '单图素材仍看自己那张的逐图标签');
  assert.ok(!singleText.includes('世界杯'), '单图素材不得吃到别的图的逐图标签');
});

test('v903 全局读取：分页读全表（range 分页、不带 experiment_key 过滤）', async () => {
  const total = 2500;
  const rows = Array.from({length: total}, (_, i) => ({experiment_key: 'augpicks-v1', preview_id: 'p' + i, ai_tags: ['x']}));
  const {context, calls} = loadLoaders(({range}) => (range ? {data: rows.slice(range[0], range[1] + 1), error: null} : {data: rows, error: null}));

  const loaded = await context.loadAllPreviewAiTags();
  assert.equal(loaded.length, total);
  assert.equal(context.state.previewAiTagsByPreviewId.size, total, '全部落进 state.previewAiTagsByPreviewId');
  assert.deepEqual(calls.range, [[0, 999], [1000, 1999], [2000, 2999]], '每页 1000 行，取不满一页即结束');
  assert.equal(calls.table, 'vf_preview_ai_tags');
  assert.equal(calls.eq.length, 0, '不许按 experiment_key（或任何列）等值过滤');
  assert.ok(calls.order.length >= 1, '分页要有稳定排序，否则翻页会漏行/重行');
  assert.match(calls.selects[0], /manual_tags/, '字段清单与原先一致（含 manual_tags）');
  assert.doesNotMatch(source, /\.eq\('experiment_key'/, 'app.js 里不该再按 experiment_key 过滤');
});

test('v903 全局读取：到分页上限就停下并 console.warn，不死循环', async () => {
  const full = Array.from({length: 1000}, (_, i) => ({preview_id: 'p' + i}));
  const {context, calls, warns} = loadLoaders(() => ({data: full, error: null}));
  const loaded = await context.loadAllPreviewAiTags();
  assert.equal(calls.range.length, 20, '硬上限 20 页');
  assert.equal(loaded.length, 20000);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /分页上限/);
});

test('v903 全局读取：两条降级照旧保留（manual_tags 列缺失 / 表不可用）', async () => {
  // 缺 manual_tags 列：退回不带该列的读法，人工标签按空数组兜底，并标记需补执行 sql/021
  const missing = loadLoaders(({select}) => (select.includes('manual_tags')
    ? {data: null, error: {message: 'column vf_preview_ai_tags.manual_tags does not exist'}}
    : {data: [{preview_id: 'a', ai_tags: ['kiki']}], error: null}));
  const rows = await missing.context.loadPreviewAiTagsForSource('src-1');
  assert.deepEqual(Array.from(new Set(missing.calls.eq.map((pair) => pair.join('=')))), ['source_file_id=src-1'], '单项目读只按 source_file_id，不认实验项目');
  assert.equal(vm.runInContext('previewAiTagsTableReady', missing.context), 'needs-manual-tags-column');
  assert.deepEqual(Array.from(missing.context.state.previewAiTagsByPreviewId.get('a').manual_tags), []);
  assert.deepEqual(Array.from(rows, (row) => row.preview_id), ['a']);

  // 表不可用：返回空、标记 false、不抛错
  const broken = loadLoaders(() => ({data: null, error: {message: 'relation "public.vf_preview_ai_tags" does not exist'}}));
  assert.deepEqual(Array.from(await broken.context.loadPreviewAiTagsForSource('src-1')), []);
  assert.equal(vm.runInContext('previewAiTagsTableReady', broken.context), false);
});
