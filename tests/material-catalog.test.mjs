// 物料清单：三层结构（端 → 大类别 → 子类别）与读写口径（v777）。
// app.js 是 IIFE、没有导出，沿用原做法：按标记切出「物料清单」区块放进 vm 里跑；
// 服务端用最小 supabase 假客户端模拟。
// 口径：大类别沿用案例库二级标签词表（已发物料不能动），每个大类别下挂子类别（名称 + 尺寸）；
// 老清单（v1 单层 / v2 无端信息）读取时自动升级并补齐各端大类别。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');

const START = '// ── 物料清单（v707 开始；v775 两级结构；v777 按端分组）──';
const END = '// ── 物料清单（v707）结束 ──';

const LIBRARY_TAGS = {
  source: {
    tag1: ['C端', 'B端', 'D端', 'M端'],
    tag2ByTag1: {
      'C端': ['开机海报', '弹窗', '头图', 'banner', '会场', '标签'],
      'B端': ['海报', '落地页'],
      'D端': ['骑手服装', '骑手装备'],
      'M端': ['社媒物料', 'OOH', 'OB']
    }
  }
};

const plain = (value) => JSON.parse(JSON.stringify(value));

function fakeSupabase(store) {
  store.calls = store.calls || [];
  const execute = function(chain) {
    store.calls.push(chain._op ? chain._op.type : 'select');
    if (store.failWith) return { data: null, error: store.failWith };
    if (chain._op && chain._op.type === 'insert') {
      const id = 'row-' + (store.rows.length + 1);
      store.rows.push({ id: id, entries: chain._op.values[0].entries, updated_at: new Date().toISOString() });
      return chain._single ? { data: { id: id }, error: null } : { data: [{ id: id }], error: null };
    }
    if (chain._op && chain._op.type === 'update') {
      const row = store.rows.find(r => r.id === chain._eq[1]);
      if (row) row.entries = chain._op.values.entries;
      return { data: null, error: null };
    }
    return { data: store.rows.slice(), error: null };
  };
  const from = function() {
    const chain = {
      _op: null, _eq: null, _single: false,
      select() { return chain; },
      order() { return chain; },
      limit() { return chain; },
      eq(column, value) { chain._eq = [column, value]; return chain; },
      single() { chain._single = true; return chain; },
      insert(values) { chain._op = { type: 'insert', values: values }; return chain; },
      update(values) { chain._op = { type: 'update', values: values }; return chain; },
      then(resolve, reject) { Promise.resolve().then(() => execute(chain)).then(resolve, reject); }
    };
    return chain;
  };
  return { from: from };
}

function loadCatalogModule(sandbox) {
  const start = appSource.indexOf(START);
  const end = appSource.indexOf(END);
  assert.ok(start >= 0 && end > start, '物料清单区块的起止标记必须存在（代码挪动时请同步更新标记）');
  const slice = appSource.slice(start, end);
  const expose = `
;({
  normalizeMaterialSub, normalizeMaterialCategory, materialCatalogCategories, materialCatalogKey,
  materialCatalogPreset, materialCatalogWithIds, materialCatalogPrepare, materialCatalogSeedPlatforms,
  materialCatalogPlatforms, materialCatalogPlatformVocab, materialCatalogPlatformForName,
  loadMaterialCatalog, saveMaterialCatalog, importMaterialCatalogPending, restoreMaterialCatalogPreset,
  materialCatalogHintText, materialCatalogErrorText, isMaterialCatalogUnavailableError,
  readLocalMaterialCatalog, writeLocalMaterialCatalog,
  materialCatalogSizeLabel, materialCatalogReadOpenState, materialCatalogToggleCategory, materialCatalogTogglePlatform,
  materialCatalogSizeFromParts, materialCatalogRememberDim, materialCatalogSeedSize,
  materialCatalogMoveCategory, materialCatalogMoveSub, materialCatalogMergeCategories,
  materialCatalogTypeNames, caseLibraryTypeTagValues, sourceTag2Values, caseMaterialTypeSet,
  materialCatalogSubNameTypes,
  cache: function() { return materialCatalogCache; },
  pending: function() { return materialCatalogPendingLocal; },
  tableReady: function() { return materialCatalogTableReady; },
  source: function() { return materialCatalogSource; }
})`;
  const context = vm.createContext({
    localStorage: sandbox.localStorage,
    LIBRARY_TAGS: sandbox.LIBRARY_TAGS || LIBRARY_TAGS,
    state: sandbox.state || { lang: 'zh', supabase: null }
  });
  return vm.runInContext(slice + expose, context);
}

function memoryStorage() {
  const map = new Map();
  return {
    map: map,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key)
  };
}

function names(mod, platform) {
  return plain(mod.cache().filter(c => String(c.platform) === platform).map(c => c.name));
}

test('子类别名→大类别名映射（v849 搜索扩展）：搜子类别名能命中所属大类，通用词与未知词不映射', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  assert.deepEqual(plain(mod.materialCatalogSubNameTypes('顶通氛围图A')), ['头图']);
  assert.deepEqual(plain(mod.materialCatalogSubNameTypes('顶通横条B')), ['会场']);
  assert.deepEqual(plain(mod.materialCatalogSubNameTypes('首页banner')), ['banner']);
  assert.deepEqual(plain(mod.materialCatalogSubNameTypes('开屏')), ['开机海报']);
  // 通用占位子类别名不参与映射：搜「默认」不该命中所有带默认子类别的大类
  assert.deepEqual(plain(mod.materialCatalogSubNameTypes('默认')), []);
  // 未知词 / 空串
  assert.deepEqual(plain(mod.materialCatalogSubNameTypes('不存在的子类别')), []);
  assert.deepEqual(plain(mod.materialCatalogSubNameTypes('')), []);
});

test('预设清单：每个端的大类别都来自现有二级标签词表，C端 带默认尺寸', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const preset = plain(mod.materialCatalogPreset());
  assert.deepEqual(plain(mod.materialCatalogPlatforms()), ['C端', 'B端', 'D端', 'M端']);
  assert.deepEqual(plain(mod.materialCatalogSeedPlatforms([]).map(c => c.platform + '·' + c.name)), [
    'C端·开机海报', 'C端·弹窗', 'C端·头图', 'C端·banner', 'C端·会场', 'C端·标签',
    'B端·海报', 'B端·落地页',
    'D端·骑手服装', 'D端·骑手装备',
    'M端·社媒物料', 'M端·OOH', 'M端·OB'
  ]);
  const cEnd = preset.filter(c => c.platform === 'C端');
  assert.equal(cEnd.length, 6, 'C端 大类别 = 词表 6 项（含「标签」）');
  const splashPreset = cEnd.find(c => c.name === '开机海报').subs;
  assert.equal(splashPreset.length, 1, '同一子类别的多个比例尺寸合成一条');
  assert.deepEqual(plain(splashPreset[0].sizes), ['1000×2168', '750×1626']);
  const hallSubs = cEnd.find(c => c.name === '会场').subs;
  assert.equal(hallSubs.length, 3, 'Tab 两个尺寸也应合成一条');
  assert.deepEqual(plain(hallSubs.find(s => s.name === 'Tab').sizes), ['180×88', '336×88']);
  assert.deepEqual(plain(preset.filter(c => c.platform === 'B端').map(c => c.subs)), [[], []], '其它端先空着，等填尺寸');
});

test('v1 旧单层条目自动升级：同类别归并成一个文件夹、每行一个子类别，并补出各端词表', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const cats = mod.materialCatalogCategories([
    { category: 'banner', label: '首页banner', size: '1372×416' },
    { category: '开机海报', label: '开屏', size: '750×1626' },
    { category: 'banner', label: '领券banner', size: '1242×460' }
  ]);
  assert.deepEqual(plain(cats.map(c => c.name)), ['banner', '开机海报']);
  assert.deepEqual(plain(cats.map(c => c.platform)), ['C端', 'C端'], '老条目按词表落到对应端');
  assert.equal(cats[0].subs.length, 2);
  const seeded = plain(mod.materialCatalogPrepare([
    { category: 'banner', label: '首页banner', size: '1372×416' },
    { category: '开机海报', label: '开屏', size: '750×1626' }
  ]));
  const seededNames = seeded.map(c => c.platform + '·' + c.name);
  assert.ok(seededNames.includes('B端·海报'), '没有端信息的老数据要补齐其它端的大类别');
  assert.ok(seededNames.includes('M端·OB'));
  assert.equal(seeded.filter(c => c.name === 'banner')[0].subs.length, 1, '老条目自带的子类别要保住');
  // 空行（只有类别名）→ 空文件夹也保留
  const empty = mod.materialCatalogCategories([{ category: '只剩文件夹' }]);
  assert.equal(empty.length, 1);
  assert.deepEqual(plain(empty[0].subs), []);
  // 无类别的行丢弃
  assert.deepEqual(plain(mod.materialCatalogCategories([{ label: '没有类别', size: '1×1' }])), []);
});

test('normalizeMaterialCategory：v3 带端直通、无端按词表推断、缺列兜底', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const v3 = mod.normalizeMaterialCategory({ id: 7, platform: 'B端', name: ' 海报 ', subs: [{ name: ' 默认 ', sizes: [' 1000×2000 ', '1000×2000', ''] }] });
  assert.equal(v3.id, '7');
  assert.equal(v3.platform, 'B端');
  assert.equal(v3.name, '海报');
  assert.deepEqual(plain(v3.subs[0].sizes), ['1000×2000'], '尺寸去重去空');
  const legacy = mod.normalizeMaterialCategory({ name: '开机海报', subs: [{ name: '开屏', size: '1000×2168' }, { name: '开屏', size: '750×1626' }] });
  assert.equal(legacy.subs.length, 1, '老的单尺寸行按同名归并成一条');
  assert.deepEqual(plain(legacy.subs[0].sizes), ['1000×2168', '750×1626']);
  assert.equal(mod.normalizeMaterialCategory({ name: '落地页', subs: [] }).platform, 'B端', '按词表推断端');
  assert.equal(mod.normalizeMaterialCategory({ name: '自造类别', subs: [] }).platform, 'C端', '词表外默认 C端');
  assert.deepEqual(plain(mod.normalizeMaterialCategory(null).subs), []);
  assert.deepEqual(plain(mod.materialCatalogCategories(null)), []);
});

test('materialCatalogKey：端 + 类别名 + 全部子类（名称|尺寸）参与去重', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const key = mod.materialCatalogKey({ platform: 'C端', name: '弹窗', subs: [{ name: 'popup', sizes: ['654×941', '327×470'] }] });
  assert.equal(key, 'c端|弹窗|popup|327×470,654×941', '尺寸排序后参与去重，顺序变化不算不同');
  assert.equal(mod.materialCatalogKey({ platform: 'C端', name: '弹窗', subs: [{ name: 'popup', sizes: ['327×470', '654×941'] }] }), key, '换个顺序 key 不变');
});

test('本机模式：存储为空时显示预设；保存后落 localStorage 且下次读取优先本机', async () => {
  const storage = memoryStorage();
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: null } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  assert.equal(mod.tableReady(), false);
  assert.equal(mod.source(), 'local');
  assert.deepEqual(names(mod, 'C端'), ['开机海报', '弹窗', '头图', 'banner', '会场', '标签']);
  assert.ok(mod.cache().every(cat => cat.id && cat.platform && cat.subs.every(s => s.id)), '类别与子类别都要有 id（DOM 用）');

  const next = mod.cache().map(function(cat) {
    if (cat.name === '弹窗') return { id: cat.id, platform: cat.platform, name: cat.name, subs: [] };
    if (cat.name === '开机海报') return { id: cat.id, platform: cat.platform, name: cat.name, subs: cat.subs.map(s => ({ id: s.id, name: s.name, sizes: ['2168×1000'] })) };
    return cat;
  });
  await mod.saveMaterialCatalog(next);
  const stored = JSON.parse(storage.getItem('vf_material_catalog'));
  assert.equal(stored.find(c => c.name === '弹窗').subs.length, 0);
  assert.equal(stored.find(c => c.name === '弹窗').platform, 'C端', '落盘的条目要带端');

  await mod.loadMaterialCatalog();
  assert.deepEqual(plain(mod.cache().find(c => c.name === '弹窗').subs), [], '删光子类别后类别文件夹仍保留');
  assert.equal(mod.pending().length, 0, '本机模式没有「未同步」概念');
});

test('v2 服务端旧数据（无端信息）自动升级并补齐各端，无需 SQL 迁移', async () => {
  const storage = memoryStorage();
  const store = { rows: [{ id: 'row-1', entries: [
    { id: 'srv-a', name: '弹窗', subs: [{ name: '默认', size: '654×941' }] },
    { id: 'srv-b', name: '会场', subs: [{ name: 'Tab', size: '180×88' }, { name: 'Tab', size: '336×88' }] }
  ] }] };
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  assert.deepEqual(names(mod, 'C端'), ['开机海报', '弹窗', '头图', 'banner', '会场', '标签'], '词表补齐 C端');
  assert.deepEqual(names(mod, 'B端'), ['海报', '落地页']);
  const hallServer = mod.cache().find(c => c.name === '会场').subs;
  assert.equal(hallServer.length, 1, '原来的两条同名 Tab 行合成一条');
  assert.deepEqual(plain(hallServer[0].sizes), ['180×88', '336×88'], '两个尺寸都保住');
  await mod.saveMaterialCatalog(mod.cache());
  assert.equal(store.rows[0].entries.find(c => c.name === '会场').platform, 'C端');
  assert.ok(store.rows[0].entries.some(c => c.name === '落地页' && c.platform === 'B端'));
});

test('服务端为空 + 本机有类别：先显示并提示导入；导入后写进团队表、pending 清空', async () => {
  const storage = memoryStorage();
  storage.setItem('vf_material_catalog', JSON.stringify([
    { id: 'local-1', platform: 'C端', name: '会场', subs: [{ id: 's1', name: 'Tab', size: '180×88' }] }
  ]));
  const store = { rows: [] };
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  assert.equal(mod.tableReady(), true);
  assert.ok(names(mod, 'C端').includes('会场'), '本机内容优先显示');
  assert.equal(mod.pending().length, 1, '本机那 1 条算未同步');

  await mod.importMaterialCatalogPending();
  assert.equal(store.rows.length, 1, '导入后团队表里应有那行');
  const written = store.rows[0].entries;
  assert.ok(written.some(c => c.name === '会场' && c.subs.length === 1), '本机条目连子类别一起落库');
  assert.ok(written.some(c => c.platform === 'B端' && c.name === '海报'), '各端词表一起落库');
  assert.equal(mod.pending().length, 0, '导入后不再提示未同步');

  await mod.loadMaterialCatalog();
  assert.equal(mod.pending().length, 0);
});

test('服务端有内容 + 本机多出类别：多出的留在导入提示里，不会静默覆盖', async () => {
  const storage = memoryStorage();
  storage.setItem('vf_material_catalog', JSON.stringify([
    { platform: 'B端', name: '海报', subs: [] }
  ]));
  const store = { rows: [{ id: 'row-1', entries: [
    { platform: 'C端', name: '弹窗', subs: [{ name: '默认', size: '654×941' }] }
  ] }] };
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  assert.ok(names(mod, 'C端').includes('弹窗'), '服务端有内容时以服务端为准');
  assert.ok(mod.pending().some(c => c.name === '海报'), '本机独有的 B端 大类别仍在导入提示里');
});

test('空文件夹语义：删光子类别/删光大类别后都不诈尸，也不被词表重新补回来', async () => {
  const storage = memoryStorage();
  const store = { rows: [] };
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  // 先把整份清单落库（带上端信息），再删「弹窗」的子类别、并删光 B端 的大类别
  await mod.saveMaterialCatalog(mod.cache());
  const trimmed = mod.cache()
    .filter(cat => cat.platform !== 'B端')
    .map(cat => (cat.name === '弹窗' ? { id: cat.id, platform: cat.platform, name: cat.name, subs: [] } : cat));
  await mod.saveMaterialCatalog(trimmed);

  await mod.loadMaterialCatalog();
  assert.deepEqual(plain(mod.cache().find(c => c.name === '弹窗').subs), [], '空文件夹保留');
  assert.deepEqual(names(mod, 'B端'), [], '用户删掉的大类别不会被词表补回来');
  await mod.saveMaterialCatalog(mod.cache().map(function(cat) {
    return cat.name === '弹窗' ? { id: cat.id, platform: cat.platform, name: cat.name, subs: [{ name: '新子类', sizes: ['100×100'] }] } : cat;
  }));
  assert.deepEqual(plain(mod.cache().find(c => c.name === '弹窗').subs[0].sizes), ['100×100']);
});

test('表读不到时降级本机并给出 016 迁移提示；表恢复后仍能写入', async () => {
  const storage = memoryStorage();
  const store = { rows: [{ id: 'row-1', entries: [] }], failWith: { message: 'Could not find the table public.vf_material_catalog in the schema cache' } };
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  assert.equal(mod.tableReady(), false);
  assert.equal(mod.source(), 'local');
  assert.match(mod.materialCatalogHintText(), /016_material_catalog\.sql/);
  assert.deepEqual(names(mod, 'C端'), ['开机海报', '弹窗', '头图', 'banner', '会场', '标签'], '读不到服务端时显示预设，功能不停摆');

  store.failWith = null;
  await mod.loadMaterialCatalog();
  assert.equal(mod.tableReady(), true);
  assert.equal(mod.source(), 'server');
  await mod.saveMaterialCatalog(mod.cache().slice(0, 2));
  assert.equal(store.rows.length, 1, '失败降级过也不会把已有行重复插');
  assert.equal(store.rows[0].entries.length, 2);
});

test('恢复预设：整份写回各端的大类别', async () => {
  const storage = memoryStorage();
  const store = { rows: [{ id: 'row-1', entries: [{ platform: 'C端', name: '自定义', subs: [] }] }] };
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  assert.ok(names(mod, 'C端').includes('自定义'));
  await mod.restoreMaterialCatalogPreset();
  assert.deepEqual(names(mod, 'C端'), ['开机海报', '弹窗', '头图', 'banner', '会场', '标签']);
  assert.deepEqual(names(mod, 'D端'), ['骑手服装', '骑手装备']);
  assert.equal(store.rows[0].entries.length, mod.materialCatalogPreset().length);
});


test('尺寸展示统一格式：宽 × 高 px；通配写「宽 px × 高不固定（高不限）」（v859 无区间也标明含义）', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  assert.equal(mod.materialCatalogSizeLabel('1000×2168'), '1000 × 2168 px');
  assert.equal(mod.materialCatalogSizeLabel(' 750 x 200 '), '750 × 200 px');
  assert.equal(mod.materialCatalogSizeLabel('750×高不固定'), '750 × 高不固定（高不限）');
  assert.equal(mod.materialCatalogSizeLabel('750×高任意'), '750 × 高不固定（高不限）');
  assert.equal(mod.materialCatalogSizeLabel('750×高不固定≤30%'), '750 × 高不固定（高≤宽的30%）');
  assert.equal(mod.materialCatalogSizeLabel('750×高不固定30%~150%'), '750 × 高不固定（高为宽的30%~150%）');
  assert.equal(mod.materialCatalogSizeLabel(''), '');
  assert.equal(mod.materialCatalogSizeLabel('看情况'), '看情况', '解析不了的原文照显，不吞');
});

test('折叠状态：手风琴只开一个类别，展开端/类别可切换并落本机', async () => {
  const storage = memoryStorage();
  const mod = loadCatalogModule({ localStorage: storage, state: { lang: 'zh', supabase: null } });
  await mod.loadMaterialCatalog();
  const first = mod.materialCatalogReadOpenState();
  assert.deepEqual(plain(first.platforms), ['C端'], '默认展开第一个端');
  assert.deepEqual(plain(first.categories), [], '默认不展开任何大类别');

  const pop = mod.cache().find(c => c.name === '弹窗');
  mod.materialCatalogToggleCategory(pop.id);
  assert.deepEqual(plain(mod.materialCatalogReadOpenState().categories), [String(pop.id)]);
  const other = mod.cache().find(c => c.name === '会场');
  mod.materialCatalogToggleCategory(other.id);
  assert.deepEqual(plain(mod.materialCatalogReadOpenState().categories), [String(pop.id), String(other.id)],
    '可以同时展开多个大类别（拖动归类要在两个类别之间来回看）');
  mod.materialCatalogToggleCategory(pop.id);
  assert.deepEqual(plain(mod.materialCatalogReadOpenState().categories), [String(other.id)], '再点一次收起这个类别');

  // v822：端改成横排页签，一次只选中一个端（点谁谁激活）
  mod.materialCatalogTogglePlatform('B端');
  assert.deepEqual(plain(mod.materialCatalogReadOpenState().platforms), ['B端'], '点 B端 就切到 B端 页签');
  mod.materialCatalogTogglePlatform('C端');
  assert.deepEqual(plain(mod.materialCatalogReadOpenState().platforms), ['C端'], '再点 C端 就切回 C端');
  assert.ok(storage.getItem('vf_admin_fold_catalog_open_v1'), '折叠状态落本机，刷新后保持');

  // 展开勾到别的端的类别时，自动把那个端也记住，避免「展开了却看不见」
  const bPoster = mod.cache().find(c => c.name === '海报');
  mod.materialCatalogToggleCategory(bPoster.id);
  assert.ok(mod.materialCatalogReadOpenState().platforms.includes('B端'));
});

test('子类别：同名合并成一个、多个比例尺寸各自都是识别规则', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const merged = plain(mod.materialCatalogCategories([
    { platform: 'C端', name: '开机海报', subs: [{ name: '开屏', sizes: ['1000×2168', '750×1626'] }] }
  ]));
  assert.equal(merged[0].subs.length, 1);
  assert.deepEqual(merged[0].subs[0].sizes, ['1000×2168', '750×1626']);
  const noDup = plain(mod.materialCatalogCategories([
    { platform: 'C端', name: '弹窗', subs: [{ name: '默认', sizes: ['654×941', '654×941'] }] }
  ]));
  assert.deepEqual(noDup[0].subs[0].sizes, ['654×941'], '同一尺寸不重复记录');
});


test('尺寸由宽高两栏拼回：高不固定单独开关，缺高判无效', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  assert.equal(mod.materialCatalogSizeFromParts('1396', '424', false), '1396×424');
  assert.equal(mod.materialCatalogSizeFromParts(' 750 ', ' ', true), '750×高不固定');
  assert.equal(mod.materialCatalogSizeFromParts('654', '', false), '', '只填宽不算有效尺寸');
  assert.equal(mod.materialCatalogSizeFromParts('', '424', false), '');
  assert.equal(mod.materialCatalogSizeFromParts('1a0b0c0', '2168', false), '1000×2168', '粘贴进来的脏字符会被剔掉');
});


test('新尺寸默认值：优先上次保存过的尺寸，其次同类最后一条，都没有才留空', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  assert.equal(mod.materialCatalogSeedSize(['1000×2168', '750×1626']), '750×1626', '还没有保存记录时用同类最后一条');
  assert.equal(mod.materialCatalogSeedSize([]), '');
  assert.equal(mod.materialCatalogSeedSize(['看情况']), '', '坏尺寸不当默认值');
  mod.materialCatalogRememberDim('1396×424');
  assert.equal(mod.materialCatalogSeedSize(['1000×2168']), '1396×424', '保存过之后优先用它，改一栏就行');
  mod.materialCatalogRememberDim('750×高不固定');
  assert.equal(mod.materialCatalogSeedSize([]), '750×高不固定', '通配尺寸也能当默认值');
  mod.materialCatalogRememberDim('乱填');
  assert.equal(mod.materialCatalogSeedSize([]), '750×高不固定', '无效输入不覆盖上一次的默认值');
  const markup = mod.materialCatalogSeedSize ? true : false;
  assert.ok(markup);
});


test('拖动排序：大类别同端换位 / 拖到别的端 / 追加到端末尾', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const base = [
    { id: 'a', platform: 'C端', name: '开机海报', subs: [] },
    { id: 'b', platform: 'C端', name: '弹窗', subs: [{ id: 'b1', name: '默认', sizes: ['654×941'] }] },
    { id: 'c', platform: 'C端', name: '头图', subs: [] },
    { id: 'd', platform: 'B端', name: '海报', subs: [] }
  ];
  const reordered = plain(mod.materialCatalogMoveCategory(base, 'c', 'a', 'before'));
  assert.deepEqual(reordered.map(c => c.id), ['c', 'a', 'b', 'd'], '同端换到目标之前');
  const after = plain(mod.materialCatalogMoveCategory(base, 'a', 'c', 'after'));
  assert.deepEqual(after.map(c => c.id), ['b', 'c', 'a', 'd'], '同端换到目标之后');
  const crossEnd = plain(mod.materialCatalogMoveCategory(base, 'b', 'd', 'after'));
  assert.deepEqual(crossEnd.map(c => c.id), ['a', 'c', 'd', 'b'], '拖到别的端的类别后面');
  assert.equal(crossEnd.find(c => c.id === 'b').platform, 'B端', '换端要把 platform 一起改');
  assert.deepEqual(plain(crossEnd.find(c => c.id === 'b').subs), [{ id: 'b1', name: '默认', sizes: ['654×941'] }], '子类别跟着大类别一起走');
  const append = plain(mod.materialCatalogMoveCategory(base, 'a', '', 'after', 'B端'));
  assert.deepEqual(append.map(c => c.id), ['b', 'c', 'd', 'a'], '落到端空白处 = 追加到该端');
  assert.equal(append.find(c => c.id === 'a').platform, 'B端');
  assert.deepEqual(base.map(c => c.id), ['a', 'b', 'c', 'd'], '原数组不变（返回新列表）');
  assert.equal(mod.materialCatalogMoveCategory(base, '不存在', 'a', 'before'), null);
});

test('拖动归类：子类别换位 / 拖到别的大类别 / 追加到折叠的大类别', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const base = [
    { id: 'a', platform: 'C端', name: 'banner', subs: [
      { id: 's1', name: 'A', sizes: ['1×1'] },
      { id: 's2', name: 'B', sizes: ['2×2'] },
      { id: 's3', name: 'C', sizes: ['3×3'] }
    ] },
    { id: 'b', platform: 'C端', name: '会场', subs: [{ id: 's9', name: 'Tab', sizes: ['180×88'] }] }
  ];
  const swapped = plain(mod.materialCatalogMoveSub(base, 's3', 'a', 's1', 'before'));
  assert.deepEqual(swapped[0].subs.map(x => x.id), ['s3', 's1', 's2'], '同类内换位');
  const moved = plain(mod.materialCatalogMoveSub(base, 's2', 'b', 's9', 'after'));
  assert.deepEqual(moved[0].subs.map(x => x.id), ['s1', 's3'], '从原大类别里移除');
  assert.deepEqual(moved[1].subs.map(x => x.id), ['s9', 's2'], '落到目标大类别对应位置');
  assert.deepEqual(moved[1].subs[1].sizes, ['2×2'], '尺寸跟着子类别一起过去');
  const appended = plain(mod.materialCatalogMoveSub(base, 's1', 'b', '', 'after'));
  assert.deepEqual(appended[1].subs.map(x => x.id), ['s9', 's1'], '拖到折叠的大类别上 = 追加到它末尾');
  assert.deepEqual(base[0].subs.map(x => x.id), ['s1', 's2', 's3'], '原数组不变');
  assert.equal(mod.materialCatalogMoveSub(base, 's1', '不存在', '', 'after'), null);
});


test('id 去重：同名同 id 的重复类别读入后各自拿到唯一 id（否则删除会连坐）', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const dup = mod.materialCatalogWithIds([
    { id: 'same', platform: 'C端', name: 'banner', subs: [{ id: 's1', name: 'A', sizes: ['1×1'] }] },
    { id: 'same', platform: 'C端', name: '会场', subs: [{ id: 's1', name: 'A', sizes: ['1×1'] }, { id: 's2', name: 'B', sizes: ['2×2'] }] }
  ]);
  assert.notEqual(dup[0].id, dup[1].id, 'id 撞车的两个类别必须各自拿到唯一 id');
  assert.equal(plain(dup).filter(c => c.id === 'same').length, 1, '第一个保留原 id');
  const subIds = dup.flatMap(c => c.subs.map(x => x.id));
  assert.equal(new Set(subIds).size, subIds.length, '子类别 id 也要唯一');
  const again = mod.materialCatalogWithIds(plain(dup));
  assert.deepEqual(plain(again.map(c => c.id)), plain(dup.map(c => c.id)), '已经唯一时再读一遍不再变动');
});

test('导入本机条目：同端同名的大类别合并尺寸，不再追加出第二个同名类别', async () => {
  const storage = memoryStorage();
  storage.setItem('vf_material_catalog', JSON.stringify([
    { id: 'x', platform: 'C端', name: 'banner', subs: [{ id: 's1', name: 'A', sizes: ['1×1', '9×9'] }] }
  ]));
  const store = { rows: [{ id: 'row-1', entries: [
    { id: 'x', platform: 'C端', name: 'banner', subs: [{ id: 's1', name: 'A', sizes: ['1×1'] }, { id: 's2', name: 'B', sizes: ['2×2'] }] }
  ] }] };
  const sandbox = { localStorage: storage, state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod = loadCatalogModule(sandbox);
  await mod.loadMaterialCatalog();
  assert.equal(mod.pending().length, 1, '本机那份 banner 起初被当成未同步');
  await mod.importMaterialCatalogPending();
  const banners = store.rows[0].entries.filter(c => c.name === 'banner');
  assert.equal(banners.length, 1, '导入后仍然只有一个 banner');
  assert.equal(new Set(store.rows[0].entries.map(c => c.id)).size, store.rows[0].entries.length, 'id 不再重复');
  const subA = banners[0].subs.find(x => x.name === 'A');
  assert.deepEqual(plain(subA.sizes), ['1×1', '9×9'], '本机多出来的尺寸并进同名字类别');
  assert.ok(banners[0].subs.some(x => x.name === 'B'), '团队表原本的子类别保留');
  assert.equal(mod.pending().length, 0);
});


test('同端同名的大类别读取即合并：子类别并集、尺寸并集，只留一条', () => {
  const mod = loadCatalogModule({ localStorage: memoryStorage() });
  const merged = plain(mod.materialCatalogMergeCategories([
    { id: 'b1', platform: 'C端', name: 'banner', subs: [{ id: 's1', name: 'H', sizes: ['1396×424'] }] },
    { id: 'b2', platform: 'C端', name: 'banner', subs: [{ id: 's2', name: 'H', sizes: ['1047×318'] }, { id: 's3', name: 'S', sizes: ['750×320'] }] },
    { id: 'k1', platform: 'C端', name: '会场', subs: [] }
  ]));
  assert.equal(merged.length, 2, '同名 banner 合成一条');
  const banner = merged[0];
  assert.equal(banner.id, 'b1', '保留第一条的 id（顺序与身份不变）');
  assert.deepEqual(banner.subs.map(x => x.name), ['H', 'S'], '子类别取并集');
  assert.deepEqual(banner.subs[0].sizes, ['1396×424', '1047×318'], '同名子类别的尺寸并集去重');
  // 不同端同名不合并
  const crossEnd = plain(mod.materialCatalogMergeCategories([
    { id: 'a', platform: 'C端', name: 'banner', subs: [] },
    { id: 'b', platform: 'B端', name: 'banner', subs: [] }
  ]));
  assert.equal(crossEnd.length, 2, '不同端同名不合并');
  // 保存路径也合并：写回去就是一条
  const store = { rows: [] };
  const sandbox = { localStorage: memoryStorage(), state: { lang: 'zh', supabase: fakeSupabase(store) } };
  const mod2 = loadCatalogModule(sandbox);
  return Promise.all([mod2.loadMaterialCatalog()]).then(function() {
    return mod2.saveMaterialCatalog([
      { id: 'x1', platform: 'C端', name: 'banner', subs: [{ name: 'H', sizes: ['1×1'] }] },
      { id: 'x2', platform: 'C端', name: 'banner', subs: [{ name: 'S', sizes: ['2×2'] }] }
    ]);
  }).then(function() {
    const written = store.rows[0].entries.filter(c => c.name === 'banner');
    assert.equal(written.length, 1, '保存时也合并，不会把重名写进团队表');
    assert.equal(written[0].subs.length, 2);
  });
});

// v814：案例库二级标签行（以及上传时的「标签二」选项）＝物料清单里的类别，清单是唯一来源。
// 用户把「会场 / 标签」从清单里删掉后，索引页不该再冒出这两个分类。
test('案例库大类别只认清单：清单里删掉的类别，标签行里立即消失', async () => {
  const store = { rows: [] };
  const mod = loadCatalogModule({ localStorage: memoryStorage(), state: { lang: 'zh', supabase: fakeSupabase(store) } });
  await mod.loadMaterialCatalog();
  const before = mod.caseLibraryTypeTagValues('C端');
  assert.ok(before.includes('会场') && before.includes('标签'), '预设清单里有会场/标签（旧词表）');

  const next = mod.cache().filter(c => c.platform !== 'C端' || (c.name !== '会场' && c.name !== '标签'));
  await mod.saveMaterialCatalog(next);

  const after = mod.caseLibraryTypeTagValues('C端');
  assert.ok(!after.includes('会场'), '删掉会场后标签行不再有它');
  assert.ok(!after.includes('标签'), '删掉标签后标签行不再有它');
  assert.ok(after.includes('开机海报'), '其它类别照旧');
  assert.deepEqual(after, mod.materialCatalogTypeNames('C端'), '标签行＝清单里该端的类别（顺序一致）');
  assert.equal(mod.caseMaterialTypeSet('会场'), null, '删掉的类别不再算物料类别');
  assert.ok(!mod.sourceTag2Values('C端').includes('会场'), '上传时「标签二」选项也同步收窄');
  assert.ok(mod.sourceTag2Values('B端').includes('海报'), '其它端不受影响');
});

test('清单读不到任何类别时才回退旧词表（避免整行空白）', async () => {
  const store = { rows: [] };
  const mod = loadCatalogModule({ localStorage: memoryStorage(), state: { lang: 'zh', supabase: fakeSupabase(store) } });
  await mod.loadMaterialCatalog();
  const cleared = mod.cache().filter(c => c.platform !== 'M端');
  await mod.saveMaterialCatalog(cleared);
  assert.deepEqual(mod.caseLibraryTypeTagValues('M端'), mod.materialCatalogPlatformVocab('M端'), '清单里没这个端＝回退旧词表');
});
