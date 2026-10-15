// v777：物料清单是案例库自动识别的唯一依据，且按端（C端/B端/D端/M端）严格隔离。
// 口径（用户确认）：同比例即命中（±2%，覆盖等比缩放）；`宽×高不固定` = 宽固定高任意；
// 具体尺寸先于通配；都没命中留空（不猜）；选了哪个端就只用那个端的清单，不跨端兜底。
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

// 现场清单（端 + 大类别 + 子类别尺寸）
const LIVE = [
  { platform: 'C端', name: '开机海报', subs: [{ name: '开屏', sizes: ['1000×2168', '750×1626'] }] },
  { platform: 'C端', name: '弹窗', subs: [{ name: '默认', sizes: ['654×941'] }] },
  { platform: 'C端', name: '头图', subs: [{ name: '默认', sizes: ['750×高不固定'] }, { name: '顶通氛围图A', sizes: ['750×520'] }] },
  { platform: 'C端', name: '会场', subs: [{ name: 'Tab', sizes: ['180×88'] }, { name: '楼层条', sizes: ['750×高不固定'] }, { name: '顶通横条B', sizes: ['750×200'] }] },
  { platform: 'B端', name: '海报', subs: [{ name: '默认', sizes: ['1080×1920'] }] },
  { platform: 'B端', name: '落地页', subs: [] },
  { platform: 'M端', name: 'OOH', subs: [{ name: '默认', sizes: ['1000×2168'] }] }
];

function catalogContext(categories) {
  const context = {
    console: console,
    state: { supabase: null, libraryFilters: {} },
    LIBRARY_TAGS: LIBRARY_TAGS,
    localStorage: { getItem: () => null, setItem: () => {} },
    materialCatalogCache: [],
    materialCatalogPendingLocal: [],
    materialCatalogLastLoadAt: 0,
    materialCatalogTableReady: true
  };
  const start = appSource.indexOf(START);
  const end = appSource.indexOf(END);
  assert.ok(start >= 0 && end > start, '物料清单区块的起止标记必须存在');
  vm.createContext(context);
  vm.runInContext(appSource.slice(start, end), context);
  // materialCatalogCache 是脚本级 let（不挂在 global 上），要在同一 realm 里赋值才看得到
  // 不传 categories = 缓存留空，走预设兜底
  const seeded = categories === undefined ? '[]' : 'materialCatalogWithIds(materialCatalogPrepare(' + JSON.stringify(categories) + '))';
  vm.runInContext('materialCatalogCache = ' + seeded + ';', context);
  return context;
}

test('尺寸解析：支持 × / x、高不固定通配、脏数据返回 null', () => {
  const c = catalogContext(LIVE);
  assert.deepEqual(plain(c.parseMaterialSizeSpec('1000×2168')), { width: 1000, widthMax: null, height: 2168, heightMax: null });
  assert.deepEqual(plain(c.parseMaterialSizeSpec(' 750 x 200 ')), { width: 750, widthMax: null, height: 200, heightMax: null });
  assert.deepEqual(plain(c.parseMaterialSizeSpec('750×高不固定')), { width: 750, widthMax: null, height: null, heightMax: null });
  assert.equal(c.parseMaterialSizeSpec('高不固定'), null);
  assert.equal(c.parseMaterialSizeSpec('待定'), null);
  assert.equal(c.parseMaterialSizeSpec(''), null);
});

test('同比例即命中：等比缩放版也算，比例差超过 2% 不算', () => {
  const c = catalogContext(LIVE);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 1000, 2168), '开机海报');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 500, 1084), '开机海报', '等比缩半仍是开机海报');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 654, 941), '弹窗');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 327, 470), '弹窗');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 180, 88), '会场');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 1000, 1000), '', '清单没写的比例不猜');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 0, 0), '', '尺寸缺失不猜');
});

test('具体尺寸先于「高不固定」通配：750×200 归会场而不是头图', () => {
  const c = catalogContext(LIVE);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 200), '会场', '会场里有 750×200 具体条目');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 648), '头图', '没有具体条目才落到 750×高不固定');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 751, 1200), '头图', '宽 750 允许 2% 内偏差');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 900, 1200), '', '宽差太远不算通配命中');
});

test('百分比区间通配（v823）：带区间的更具体先匹配，楼层条不再被头图吸走', () => {
  const c = catalogContext([
    { platform: 'C端', name: '头图', subs: [{ name: '默认', sizes: ['750×高不固定30%~150%'] }] },
    { platform: 'C端', name: '会场', subs: [{ name: '楼层条', sizes: ['750×高不固定≤30%'] }] }
  ]);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 73), '会场', '9.7% 命中楼层条');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 101), '会场', '13.5% 命中楼层条');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 210), '会场', '28% 命中楼层条（29.4%~30.6% 是两条带的重叠区，按清单顺序）');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 400), '头图', '53% 落头图带');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 1100), '头图', '146.7% 落头图带');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 1200), '', '160% 超出头图带上限，不猜');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 1564, 234), '', '宽锚定 750 ±2%，1564 不命中');
  assert.equal(c.parseMaterialSizeSpec('750×高不固定≤30%').bandMax, 30);
  assert.equal(c.parseMaterialSizeSpec('750×高不固定30~150%').bandMin, 30);
});

test('不锚宽度的百分比通配：高不固定≤30% 按比例匹配，@2x 导出也命中', () => {
  const c = catalogContext([
    { platform: 'C端', name: '头图', subs: [{ name: '默认', sizes: ['750×高不固定'] }] },
    { platform: 'C端', name: '会场', subs: [{ name: '楼层条', sizes: ['高不固定≤30%'] }] }
  ]);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 1564, 234), '会场', '15% 命中楼层条（宽不限）');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 1500, 146), '会场', '@2x 导出 9.7% 也命中');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 648), '头图', '86% 落到无区间兜底头图');
  assert.equal(c.parseMaterialSizeSpec('高不固定'), null, '不锚宽又不带区间的纯通配仍无效（会吞掉一切）');
  assert.deepEqual(plain(c.parseMaterialSizeSpec('高不固定≤30%')), {
    width: null, widthMax: null, height: null, heightMax: null, bandMin: null, bandMax: 30
  });
  assert.deepEqual(plain(c.parseMaterialSizeSpec('750×高不固定')), { width: 750, widthMax: null, height: null, heightMax: null }, '无区间的旧写法不带 band 字段');
});

test('识别严格按端：同一个尺寸在别的端不会被认出来，没配尺寸的端一律留空', () => {
  const c = catalogContext(LIVE);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 1080, 1920), '', 'B端的尺寸不会在 C端 命中');
  assert.equal(c.detectMaterialTypeByCatalog('B端', 1080, 1920), '海报');
  assert.equal(c.detectMaterialTypeByCatalog('B端', 1000, 2168), '', '不能拿 C端 的尺寸兜底');
  assert.equal(c.detectMaterialTypeByCatalog('M端', 1000, 2168), 'OOH', 'M端 自己配了同尺寸，各用各的');
  assert.equal(c.detectMaterialTypeByCatalog('D端', 1080, 1920), '', 'D端 还没配尺寸 → 未分类');
  assert.equal(c.detectMaterialTypeByCatalog('', 1000, 2168), '', '没有端信息不猜');
  assert.equal(c.detectMaterialTypeByCatalog('all', 1000, 2168), '', 'all 不是端，不猜');
});

test('清单是唯一依据：改清单识别立刻变，删掉条目后原尺寸不再命中', () => {
  const renamed = catalogContext([
    { platform: 'C端', name: '顶部头图', subs: [{ name: '默认', sizes: ['750×高不固定'] }] },
    { platform: 'C端', name: '会场', subs: [{ name: 'Tab', sizes: ['180×88'] }] }
  ]);
  assert.equal(renamed.detectMaterialTypeByCatalog('C端', 750, 648), '顶部头图', '大类别改名后识别跟着改名');
  assert.equal(renamed.detectMaterialTypeByCatalog('C端', 654, 941), '', '清单里没有的尺寸留空');
  const noWildcard = catalogContext([{ platform: 'C端', name: '头图', subs: [{ name: '默认', sizes: ['750×520'] }] }]);
  assert.equal(noWildcard.detectMaterialTypeByCatalog('C端', 750, 648), '', '删掉通配条目后 750 系宽不再兜底');
});

test('清单为空/坏条目：退回预设，坏尺寸被跳过而不是报错', () => {
  const empty = catalogContext(undefined);
  assert.ok(empty.materialCatalogTypeNames('C端').includes('开机海报'), '空清单走预设');
  assert.equal(empty.detectMaterialTypeByCatalog('C端', 1000, 2168), '开机海报', '预设仍能识别');
  const broken = catalogContext([
    { platform: 'C端', name: '开机海报', subs: [{ name: 'a', sizes: ['看情况', ''] }] },
    { platform: 'C端', name: '会场', subs: [{ name: 'Tab', sizes: ['180×88'] }] }
  ]);
  assert.deepEqual(plain(broken.materialCatalogTypeNames('C端')), ['开机海报', '会场']);
  assert.equal(broken.detectMaterialTypeByCatalog('C端', 180, 88), '会场');
  assert.equal(broken.detectMaterialTypeByCatalog('C端', 1000, 2168), '', '坏条目不当规则用');
});

test('每个端的大类别各自成列：新增/改名即时可见，且不串到别的端', () => {
  const c = catalogContext(LIVE);
  assert.deepEqual(plain(c.materialCatalogTypeNames('C端')), ['开机海报', '弹窗', '头图', '会场']);
  assert.deepEqual(plain(c.materialCatalogTypeNames('B端')), ['海报', '落地页']);
  assert.deepEqual(plain(c.materialCatalogTypeNames()), ['开机海报', '弹窗', '头图', '会场', '海报', '落地页', 'OOH']);
  assert.deepEqual(plain(c.caseMaterialTypeSet('海报')), ['海报'], 'B端 的类别也是物料类别');
  assert.equal(c.caseMaterialTypeSet('标签'), null, '「标签」不是物料类别，按普通标签处理');
  const extended = catalogContext(LIVE.concat([{ platform: 'B端', name: '社媒长图', subs: [] }]));
  assert.deepEqual(plain(extended.materialCatalogTypeNames('B端')), ['海报', '落地页', '社媒长图']);
  assert.equal(extended.caseMaterialTypeSet('社媒长图') !== null, true, '新增类别立即可用于筛选');
});

test('案例库二级标签＝清单里的类别（清单是唯一来源），各端互不影响', () => {
  const c = catalogContext(LIVE.concat([{ platform: 'C端', name: '首页横版banner', subs: [] }]));
  assert.deepEqual(plain(c.caseLibraryTypeTagValues('C端')),
    ['开机海报', '弹窗', '头图', '会场', '首页横版banner'],
    '顺序＝清单顺序；清单里没有的旧词表项（标签）不再出现');
  assert.deepEqual(plain(c.caseLibraryTypeTagValues('D端')), ['骑手服装', '骑手装备'], 'D端 清单里没有类别 → 回退旧词表');
  const merged = c.sourceTag2Values('all');
  assert.ok(merged.includes('海报') && merged.includes('首页横版banner'), '未选平台时合并各端');
  assert.equal(merged.filter(v => v === '开机海报').length, 1, '合并要去重');
  assert.deepEqual(plain(c.sourceTag2Values('B端')), ['海报', '落地页']);
});

test('动态物料（视频/GIF）默认类别：本端有「弹窗」用它，否则用本端第一个类别', () => {
  const c = catalogContext(LIVE);
  assert.equal(c.materialCatalogDynamicDefaultType('弹窗', 'C端'), '弹窗');
  assert.equal(c.materialCatalogDynamicDefaultType('弹窗', 'B端'), '海报', 'B端 没有弹窗 → 本端第一个类别');
  assert.equal(c.materialCatalogDynamicDefaultType('弹窗', 'D端'), '', 'D端 还没配大类别 → 留空');
});

test('代码层面：硬编码规则已删除，识别入口按端走清单', () => {
  assert.doesNotMatch(appSource, /CASE_TYPE_RULES|CASE_FILENAME_TYPE_KEYWORDS/, '硬编码尺寸/文件名规则必须删除');
  assert.doesNotMatch(appSource, /CASE_MATERIAL_TYPES|CASE_TAB_TYPE_MAP/, '写死的 5 类清单必须删除');
  const detect = appSource.slice(appSource.indexOf('function detectCaseMaterialType('), appSource.indexOf('// ===== 案例库动态物料'));
  assert.match(detect, /detectMaterialTypeByCatalog\(platform, width, height\)/, '静态物料按该端的清单识别');
  assert.match(detect, /caseDynamicMaterialType\(platform\)/, '动态物料归该端的动态类别');
  assert.doesNotMatch(detect, /splash|launch|弹窗|头图|会场/i, '不再有文件名关键词');
  assert.match(appSource, /function materialCatalogPlatformVocab\(/, '大类别词表是唯一来源');
});


test('编辑器 UI 契约：折叠层级 + 对齐表格 + ··· 菜单 + 规则说明', () => {
  const body = appSource.slice(appSource.indexOf('function materialCatalogBodyMarkup('), appSource.indexOf('function renderMaterialCatalogPending('));
  assert.match(body, /data-material-toggle-platform/, '端可折叠');
  assert.match(body, /data-material-toggle-category/, '大类别可展开/收起');
  assert.match(body, /data-material-menu-toggle/, '重命名/删除类别收进 ··· 菜单');
  assert.match(body, /class="material-catalog-cat-menu" hidden/, '··· 菜单默认收起');
  assert.match(body, /data-material-add-sub/, '「添加子类别」留在类别标题行');
  assert.match(body, /material-catalog-size-chip/, '尺寸做成一行气泡');
  assert.match(body, /material-catalog-size-chips/, '气泡容器一行排布');
  assert.match(body, /materialCatalogSizeLabel\(size\)/, '尺寸走统一格式');
  assert.match(appSource, /\.material-catalog-size-chips \{ flex: 1 1 auto; display: flex; flex-wrap: nowrap;/, '尺寸一行不换行');
  assert.match(appSource, /data-material-platform-group="C端"\] > \.material-catalog-platform-head \{ background: #eef2ff/, '端标题有颜色带与子分类区分');
  assert.match(body, /data-material-size-quick-add/, '行内小「＋」可以再加一个尺寸');
  assert.match(appSource, /data-material-size-add/, '编辑态可「＋ 添加尺寸」');
  assert.match(appSource, /data-material-size-drop/, '编辑态可移除单个尺寸');
  assert.match(appSource, /function materialCatalogSizeEditorMarkup/, '新增子类别行支持多个尺寸');
  assert.match(body, /data-material-drag-handle/, '大类别/子类别有拖动把手');
  assert.match(body, /data-material-drag-handle/, '把手只留指针拖动');
  assert.match(appSource, /document\.addEventListener\('mousemove', onDragMove, true\)/, '指针拖动（不依赖原生 DnD）');
  assert.match(appSource, /document\.elementFromPoint\(event\.clientX, event\.clientY\)/, '按坐标找落点元素');
  assert.match(appSource, /Math\.abs\(event\.clientX - dragCtx\.x\) < 4/, '移动超过 4px 才算拖动，否则当点击');
  assert.doesNotMatch(appSource, /section\.addEventListener\('dragstart'/, '不再用 HTML5 DnD');
  assert.match(appSource, /is-drop-into/, '拖到端的空白处 = 追加到该端');
  assert.match(appSource, /document\.body\.classList\.add\('is-catalog-dragging'\)/, '拖动中切换光标');
  assert.match(appSource, /materialCatalogMoveCategory/, '拖动换位/换端的纯函数');
  assert.match(appSource, /materialCatalogMoveSub/, '子类别改归类的纯函数');
  assert.match(appSource, /data-material-move="up"/, '··· 菜单里有上移/下移兜底');
  assert.match(appSource, /\.material-catalog-cat\.is-drop-before/, '拖放位置有插入线提示');
  assert.doesNotMatch(appSource, /if \(event\.target\.closest\('\.material-catalog-cat-menu'\)\) return;/, '··· 菜单里的动作不能被早退挡掉');
  assert.match(body, /data-material-name-edit/, '名称可点击就地改名');
  assert.match(body, /data-material-size-edit="\$\{index\}"/, '每个尺寸气泡可点击就地修改');
  assert.match(body, /data-material-size-drop="\$\{index\}"/, '气泡右上角 × 删这一个尺寸');
  assert.match(body, /material-catalog-size-x/, '× 徽标挂在气泡上');
  assert.doesNotMatch(body, /data-material-edit>/, '不再有整行「编辑」按钮');
  assert.doesNotMatch(appSource, /openMaterialSubEditor/, '旧的大表单编辑器已删除');
  const inline = appSource.slice(appSource.indexOf('const inlineEdit = function('), appSource.indexOf('const findEntry = function('));
  assert.match(inline, /event\.key === 'Enter'/, '回车保存');
  assert.match(inline, /event\.key === 'Escape'/, 'Esc 取消');
  assert.match(inline, /if \(!input\.isConnected\)/, '重绘导致的失焦不重复提交');
  const pop = appSource.slice(appSource.indexOf('const openSizeEditor = function('), appSource.indexOf('const findEntry = function('));
  assert.match(pop, /material-catalog-dim-pop/, '尺寸编辑改成浮窗，不挤进行内被裁');
  assert.match(pop, /document\.body\.appendChild\(pop\)/, '浮窗挂到 body（不受行容器 overflow 裁切）');
  assert.match(pop, /data-material-dim-save/, '浮窗有明确的保存按钮');
  assert.match(pop, /data-material-dim-cancel/, '浮窗有取消按钮');
  assert.match(pop, /onOutside/, '点面板外取消，不误写数据');
  assert.match(pop, /window\.addEventListener\('resize', place\)/, '视口变化重新定位');
  assert.match(appSource, /\.material-catalog-inline-input \{ height: 24px; width: 100%/, '名称就地输入框占满单元格');
  assert.doesNotMatch(body, /删光子类别不会删掉/, '空状态不再重复解释');
  assert.match(body, /暂无子类别/, '空类别只留一行提示');

  const section = appSource.slice(appSource.indexOf('async function renderMaterialCatalogSection('), appSource.indexOf('function renderMaterialCatalogPending(') > -1 ? appSource.length : appSource.length);
  assert.match(section, /material-catalog-rules-toggle/, '详细识别规则收进「规则说明」');
  assert.match(section, /按端、大类别、子类别维护尺寸；修改后即时生效/, '标题下只留一句话');
  assert.match(section, /重算<strong>已有物料<\/strong>的类别（写共享库/, '「按清单重跑识别」要写清影响');
  assert.match(appSource, /\.material-catalog-recase \{ border-color: #fcd34d/, '重跑按钮与普通刷新视觉区分');
  assert.match(appSource, /\.material-catalog-table tr:hover \.material-catalog-row-actions/, '子类别操作悬停才显示');
  assert.match(appSource, /\.material-catalog-row-actions \{[^}]*visibility: hidden;/, '默认不显示（占位不跳版）');
  assert.match(appSource, /td:nth-child\(3\) \{ width: 53%/, '尺寸列够放 4 个气泡');
  assert.match(appSource, /td:nth-child\(2\) \{ width: 33.5%/, '名称列留足宽度（最长名字一行放得下）');
  assert.match(appSource, /td:nth-child\(2\) \{ padding-left: 4px; padding-right: 4px; \}/, '名称列压掉内边距');
  assert.doesNotMatch(appSource, /\.material-catalog-label \{[^}]*text-overflow: ellipsis/, '名称不再裁切换省略号');
  assert.match(appSource, /\.material-catalog-label \{[^}]*white-space: normal/, '名称放不下就换行');
  assert.match(appSource, /function materialCatalogDimensionMarkup/, '尺寸编辑拆成 W / H 两个数字框');
  assert.match(appSource, /data-material-dim-w/, '(W) 输入框');
  assert.match(appSource, /data-material-dim-h/, '(H) 输入框');
  assert.match(appSource, /data-material-dim-wild/, '「高不固定」开关');
  assert.match(appSource, /function materialCatalogSizeFromParts/, '宽高拼回尺寸文本');
  assert.match(appSource, /function materialCatalogReadDimension/, '读回 W/H（缺高未勾通配判为无效）');
  assert.match(appSource, /openSizeEditor/, '点气泡/点＋ 打开 W/H 编辑器');
  assert.match(appSource, /inputmode="numeric"/, '数字键盘');
});

test('新增子类别行要和表格一样 4 列（把手/名称/尺寸/操作），别把名字挤进把手列', () => {
  const body = appSource.slice(appSource.indexOf('if (event.target.closest(\'[data-material-add-sub]\'))'), appSource.indexOf('if (event.target.closest(\'[data-material-new-cancel]\'))'));
  const cells = body.match(/<td/g) || [];
  assert.equal(cells.length, 4, '新增行必须是 4 个单元格，否则列会整体错位');
  assert.match(body, /<td class="material-catalog-cell-grip"><\/td>/, '第一个单元格是把手占位');
  assert.match(body, /data-material-new-label/, '名称输入框在第二列');
});

test('自动重拉不能抹掉正在编辑的内容（切窗口回来不再「写着写着突然关闭」）', () => {
  const fn = appSource.slice(appSource.indexOf('function refreshMaterialCatalogData('), appSource.indexOf('// 单个尺寸的编辑控件'));
  assert.match(fn, /const isEditing = function\(\)/, '要有编辑中判定');
  assert.match(fn, /section\.querySelector\('\[data-material-new-row\]'\)/, '存在新增行时不重绘');
  assert.match(fn, /material-catalog-table input, \.material-catalog-cat-head input/, '有就地输入框时不重绘');
  assert.match(fn, /document\.querySelector\('\.material-catalog-dim-pop'\)/, '尺寸浮窗开着时不重绘');
  assert.match(fn, /if \(!force && isEditing\(\)\) return;/, '编辑中直接跳过这次自动重拉');
  assert.doesNotMatch(fn, /active\.tagName === 'INPUT'\) return;/, '不能只靠 activeElement 判断');
});

test('回车 = 确认：新增子类别 / 新增大类别 / 重命名 的输入框都能回车保存', () => {
  const kd = appSource.slice(appSource.indexOf('// 回车 = 确认：新增子类别'), appSource.indexOf('// 事件全在 section 上委托'));
  assert.match(kd, /event\.isComposing \|\| event\.keyCode === 229/, '输入法组合期间的回车不截胡');
  assert.match(kd, /\[data-material-new-label\], \[data-material-new-w\], \[data-material-new-h\][\s\S]*\[data-material-new-save\]/, '新增子类别行回车 = 保存');
  assert.match(kd, /\[data-material-new-cat-name\][\s\S]*\[data-material-new-cat-save\]/, '新增大类别回车 = 保存');
  assert.match(kd, /\[data-material-rename-input\][\s\S]*\[data-material-rename-save\]/, '重命名回车 = 保存');
  assert.match(kd, /event\.preventDefault\(\)[\s\S]*button\.click\(\)/, '回车阻止默认行为并触发保存');
});


test('区间尺寸：180~336×88 命中区间内任意宽，等比缩放同样命中，区间外不命中', () => {
  const c = catalogContext([
    { platform: 'C端', name: '会场', subs: [{ name: 'Tab', sizes: ['180~336×88'] }] }
  ]);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 180, 88), '会场', '下界命中');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 336, 88), '会场', '上界命中');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 250, 88), '会场', '区间中间也命中（这是加区间的意义）');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 360, 176), '会场', '2 倍导出命中（等比缩放）');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 672, 176), '会场', '2 倍上界命中');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 420, 88), '', '超出上界 25% 不命中');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 100, 88), '', '比下界还窄不命中');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 250, 400), '', '比例差太远不命中');
  // 口径：区间也是「同比例即命中」——按高反推缩放，只要换算回 1x 的宽落在区间内就中
  assert.equal(c.detectMaterialTypeByCatalog('C端', 250, 100), '会场', '1.14 倍导出：换算回 220，落在 180~336 内');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 250, 60), '', '0.68 倍导出换算回 366，超出上界');
});

test('区间与具体尺寸共存时：具体条目仍先命中，区间不会抢走高优先级条目', () => {
  const c = catalogContext([
    { platform: 'C端', name: '头图', subs: [{ name: '默认', sizes: ['750×高不固定'] }] },
    { platform: 'C端', name: '会场', subs: [{ name: 'Tab', sizes: ['180~336×88'] }, { name: '顶通横条B', sizes: ['750×200'] }] }
  ]);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 200), '会场', '具体尺寸先于「高不固定」');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 648), '头图', '没有具体条目才落到通配');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 300, 88), '会场', '区间命中');
});

function loadCatalogModuleForRange() {
  const context = {
    console: console,
    state: { supabase: null, libraryFilters: {}, lang: 'zh' },
    LIBRARY_TAGS: LIBRARY_TAGS,
    localStorage: { getItem: () => null, setItem: () => {} },
    materialCatalogCache: [],
    materialCatalogPendingLocal: [],
    materialCatalogLastLoadAt: 0,
    materialCatalogTableReady: true
  };
  const start = appSource.indexOf(START);
  const end = appSource.indexOf(END);
  vm.createContext(context);
  vm.runInContext(appSource.slice(start, end), context);
  return vm.runInContext('({ parseMaterialSizeSpec, materialCatalogSizeLabel, materialCatalogSizeFromParts })', context);
}

test('区间写法解析/展示/拼回：写反了自动归一，展示带波浪号', () => {
  const mod = loadCatalogModuleForRange();
  assert.deepEqual(plain(mod.parseMaterialSizeSpec('180~336×88')), { width: 180, widthMax: 336, height: 88, heightMax: null });
  assert.deepEqual(plain(mod.parseMaterialSizeSpec('336~180x88')), { width: 180, widthMax: 336, height: 88, heightMax: null }, '写反了按小到大归一');
  assert.deepEqual(plain(mod.parseMaterialSizeSpec('180～336×88')), { width: 180, widthMax: 336, height: 88, heightMax: null }, '全角波浪号也认');
  assert.deepEqual(plain(mod.parseMaterialSizeSpec('180〜336×88')), { width: 180, widthMax: 336, height: 88, heightMax: null }, '日文波浪号也认');
  assert.equal(mod.materialCatalogSizeFromParts('180～336', '88', false), '180~336×88', '输入全角，存成半角');
  assert.equal(mod.materialCatalogSizeLabel('180～336×88'), '180~336 × 88 px', '展示也是半角');
  assert.deepEqual(plain(mod.parseMaterialSizeSpec('750×600~900')), { width: 750, widthMax: null, height: 600, heightMax: 900 });
  assert.equal(mod.parseMaterialSizeSpec('180~×88'), null, '半个区间不认');
  assert.equal(mod.materialCatalogSizeLabel('180~336×88'), '180~336 × 88 px');
  assert.equal(mod.materialCatalogSizeLabel('750×600~900'), '750 × 600~900 px');
  assert.equal(mod.materialCatalogSizeFromParts('180~336', '88', false), '180~336×88', '拼回保留区间号');
  assert.equal(mod.materialCatalogSizeFromParts('336~180', '88', false), '180~336×88', '拼回也归一');
  assert.equal(mod.materialCatalogSizeFromParts('180~336', '', true), '180~336×高不固定');
});

test('新增类按钮常态只留 ＋，悬停才展开文字（不推动右侧 ··· 按钮）', () => {
  assert.match(appSource, /material-catalog-quiet-add[\s\S]*material-catalog-quiet-plus[\s\S]*material-catalog-quiet-label/, '按钮拆成 ＋ 与文字两部分');
  assert.match(appSource, /\.material-catalog-quiet-label \{[^}]*max-width: 0;[^}]*opacity: 0;/, '默认收起文字（占位为 0，不显形）');
  assert.match(appSource, /\.material-catalog-quiet-add:hover \.material-catalog-quiet-label,[\s\S]*max-width: 104px; opacity: 1;/, '悬停/聚焦才展开');
  assert.match(body_markup(), /data-material-add-sub title=/, '悬停提示保留可点含义');
});
function body_markup() {
  return appSource.slice(appSource.indexOf('function materialCatalogBodyMarkup('), appSource.indexOf('function renderMaterialCatalogPending('));
}

// v816：横图不该被判成「弹窗」——弹窗一定是竖图（高 > 宽）。
// 真实案例：清单里 弹窗/天降弹窗 = 1500×940（横），「同比例 ±2%」把 750×465 的横图吸成了弹窗。
test('横图不判弹窗：这类尺寸落到「高不固定」的通配类别', () => {
  const c = catalogContext([
    { platform: 'C端', name: '弹窗', subs: [{ name: '天降弹窗', sizes: ['1500×940', '1308×324'] }, { name: '常规弹窗', sizes: ['750×1334'] }] },
    { platform: 'C端', name: '头图', subs: [{ name: '默认', sizes: ['750×高不固定'] }] }
  ]);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 465), '头图', '横图 750×465 不再算弹窗（1500×940 的近似比例），落到 750×高不固定 的头图');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 1500, 940), '', '横图就算和弹窗那条横尺寸一模一样也不判弹窗，没有别的类别对得上＝未分类');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 1334), '弹窗', '竖图照旧判弹窗');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 654, 941), '', '竖图但清单里没有对得上的尺寸 → 不猜');
});

test('竖图判弹窗不受影响：等比缩放仍命中', () => {
  const c = catalogContext([
    { platform: 'C端', name: '弹窗', subs: [{ name: '常规弹窗', sizes: ['750×1334'] }] }
  ]);
  assert.equal(c.detectMaterialTypeByCatalog('C端', 750, 1334), '弹窗', '原尺寸');
  assert.equal(c.detectMaterialTypeByCatalog('C端', 375, 667), '弹窗', '半尺寸（同比例）');
  assert.equal(c.materialTypeAllowsOrientation('弹窗', 750, 465), false, '横图不放行');
  assert.equal(c.materialTypeAllowsOrientation('弹窗', 750, 1334), true, '竖图放行');
  assert.equal(c.materialTypeAllowsOrientation('banner', 1396, 424), true, '其它类别不看方向');
});
