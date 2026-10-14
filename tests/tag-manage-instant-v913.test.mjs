import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');

// ── 1) 纯逻辑：乐观改名 / 乐观删除（vm 切出来单跑）────────────────────────────
// 背景（v913 修的 bug）：改名/删除原来要等数据库往返（还有一次词表同步）回来才重画，
// 期间界面还停在旧名字旧行上，用户以为没生效又去点刷新。现在改成"先本地改、立刻重画"。
const optStart = appSource.indexOf('  function tagVocabularyOptimisticRename(');
const optEnd = appSource.indexOf('  // v912 改名：词表上改中文名 = 全库改名');
assert.ok(optStart > 0 && optEnd > optStart, '两个乐观更新函数必须是可切的纯函数');

function loadOptimistic() {
  const context = vm.createContext({});
  vm.runInContext(
    appSource.slice(optStart, optEnd) + '\n;({ tagVocabularyOptimisticRename, tagVocabularyOptimisticRemove })',
    context
  );
  return context;
}

// vm 里造出来的数组/对象是另一个 realm 的，比之前先摊成本 realm 的普通对象
const plain = (list) => Array.from(list, (row) => ({...row}));

const baseRows = () => [
  {id: 'el:汉堡', name_zh: '汉堡', name_en: 'burger', kind: 'element'},
  {id: 'el:薯条', name_zh: '薯条', kind: 'element'},
  {id: 'el:餐桌', name_zh: '餐桌', related: ['桌子']},
];

test('v913 vm：乐观改名 —— name_zh 与 id 一起换成新名字（id 约定 el:<新名>）', () => {
  const {tagVocabularyOptimisticRename} = loadOptimistic();
  const rows = baseRows();
  const raw = tagVocabularyOptimisticRename(rows, 'el:汉堡', '汉堡包');
  const out = plain(raw);
  assert.equal(out.length, 3, '普通改名不增不减行数');
  assert.deepEqual(out[0], {id: 'el:汉堡包', name_zh: '汉堡包', name_en: 'burger', kind: 'element'}, 'id 和 name_zh 都要变');
  assert.equal(raw[1], rows[1], '没碰的行还是原来那个对象引用（只换被改的那一行）');
  assert.notEqual(raw, rows, '返回新数组，不是原数组');
});

test('v913 vm：乐观改名不改原数组、不改原行（失败回滚要靠它）', () => {
  const {tagVocabularyOptimisticRename} = loadOptimistic();
  const rows = baseRows();
  tagVocabularyOptimisticRename(rows, 'el:汉堡', '汉堡包');
  assert.deepEqual(rows.map((r) => r.id), ['el:汉堡', 'el:薯条', 'el:餐桌'], '原数组顺序与 id 不许被就地改');
  assert.equal(rows[0].name_zh, '汉堡', '原行对象不许被就地改');
});

test('v913 vm：乐观改名把前后空格 / 连续空格归一（与改名计划同一口径）', () => {
  const {tagVocabularyOptimisticRename} = loadOptimistic();
  const out = plain(tagVocabularyOptimisticRename(baseRows(), 'el:汉堡', '  汉堡  包  '));
  assert.equal(out[0].name_zh, '汉堡 包');
  assert.equal(out[0].id, 'el:汉堡 包');
});

test('v913 vm：乐观改名撞名 ⇒ 两行合一，保留"新名字"那一行（related 取并集、source=manual）', () => {
  const {tagVocabularyOptimisticRename} = loadOptimistic();
  const rows = [
    {id: 'el:汉堡', name_zh: '汉堡', name_en: 'burger', related: ['堡', '薯条词']},
    {id: 'el:薯条', name_zh: '薯条', name_en: 'fries', related: ['薯条词']},
    {id: 'el:餐桌', name_zh: '餐桌'},
  ];
  const out = plain(tagVocabularyOptimisticRename(rows, 'el:汉堡', '薯条'));
  assert.equal(out.length, 2, '撞名 = 库里两行并成一行 ⇒ 本地也要少一行');
  assert.ok(!out.some((r) => r.name_zh === '汉堡'), '旧名字那一行必须消失');
  const kept = out.find((r) => r.name_zh === '薯条');
  assert.equal(kept.id, 'el:薯条');
  assert.equal(kept.name_en, 'fries', '保留新名字那一行自己的英文名（与 sql/027 一致）');
  assert.equal(kept.source, 'manual', '合并出来的那行标 manual（与 sql/027 一致）');
  assert.deepEqual(Array.from(kept.related), ['薯条词', '堡'], 'related 取并集并去重（保留行在前）');
  assert.equal(rows.length, 3, '原数组长度不变');
  assert.deepEqual(Array.from(rows[0].related), ['堡', '薯条词'], '原行的 related 不许被就地改');
  assert.equal(rows[1].source, undefined, '保留的那一行也不许被就地改');
});

test('v913 vm：乐观改名没改 / 找不到行 / 词表还没加载 ⇒ 原样返回（不误改）', () => {
  const {tagVocabularyOptimisticRename} = loadOptimistic();
  const rows = baseRows();
  for (const next of ['', '   ', null, undefined]) {
    assert.equal(tagVocabularyOptimisticRename(rows, 'el:汉堡', next).length, 3, '空名字什么都不做：' + String(next));
  }
  assert.equal(tagVocabularyOptimisticRename(rows, 'el:汉堡', '汉堡').length, 3, '改成自己：什么都不做');
  assert.equal(tagVocabularyOptimisticRename(rows, 'el:不存在', '新名').length, 3);
  assert.deepEqual(Array.from(tagVocabularyOptimisticRename(null, 'el:汉堡', '汉堡包')), [], '词表没加载时给空数组，不崩');
});

test('v913 vm：乐观删除 —— 那一行没了，原数组不被就地改', () => {
  const {tagVocabularyOptimisticRemove} = loadOptimistic();
  const rows = baseRows();
  const out = plain(tagVocabularyOptimisticRemove(rows, 'el:薯条'));
  assert.equal(out.length, 2);
  assert.ok(!out.some((r) => r.id === 'el:薯条'), '被删的那一行必须消失');
  assert.equal(rows.length, 3, '原数组不许被就地改（失败要能回滚）');
  assert.equal(rows[1].name_zh, '薯条', '原行对象不许被就地改');
  assert.equal(tagVocabularyOptimisticRemove(rows, 'el:不存在').length, 3, '找不到就原样');
  assert.deepEqual(Array.from(tagVocabularyOptimisticRemove(null, 'el:薯条')), []);
});

test('v913 vm：改名之后能直接用新 id 删（两个函数的 id 口径要连得上）', () => {
  const {tagVocabularyOptimisticRename, tagVocabularyOptimisticRemove} = loadOptimistic();
  const renamed = tagVocabularyOptimisticRename(baseRows(), 'el:汉堡', '汉堡包');
  const removed = plain(tagVocabularyOptimisticRemove(renamed, 'el:汉堡包'));
  assert.equal(removed.length, 2);
  assert.ok(!removed.some((r) => r.name_zh === '汉堡包'), '改名后的新 id 要能直接用来删');
});

// ── 1b) 真渲一遍 HTML（切源码在干净 vm 里跑，不要浏览器不联网）──────────────
function loadVocabularyUi(options = {}) {
  const slice = appSource.slice(
    appSource.indexOf('  function tagVocabularyRowMatches('),
    appSource.indexOf('  function renderTagVocabularySection(')
  );
  const context = vm.createContext({
    state: { lang: options.lang || 'zh' },
    tagVocabularyRows: options.rows || [],
    tagVocabularyQuery: options.query || '',
    tagVocabularyMessage: options.message || '',
    tagVocabularyManageBusy: options.busy || '',
    tagVocabularySuggestingId: '',
    tagVocabularyRelatedReady: true,
    tagVocabularyManageReady: null,
    // v920：使用量视图（sql/030）—— 这里不传 = 降级态（视图没跑时不显示数字）
    tagVocabularyUsageMap: null,
    tagVocabularyUsageReady: null,
    tagVocabularyCanManage: () => true,
    TAG_VOCABULARY_IGNORED: 'ignored',
    TAG_VOCABULARY_RELATED_MAX: 8,
    TAG_TRANSLATE_MAX_CHARS: 20,
    escapeHtml: (value) => String(value == null ? '' : value),
    escapeAttr: (value) => String(value == null ? '' : value)
  });
  vm.runInContext(slice, context);
  return context;
}

test('v913 渲染：进行中那一行「输入框 + 删除按钮都 disabled + 处理中…」', () => {
  const rows = [{id: 'el:ip', name_zh: 'ip', kind: 'element'}];
  const idle = loadVocabularyUi({rows}).tagVocabularyHtml();
  assert.doesNotMatch(idle, /data-tv-zh="el:ip"[^>]* disabled/, '没操作时中文名可编辑');
  assert.doesNotMatch(idle, /data-tv-delete="el:ip"[^>]* disabled/, '没操作时删除按钮可点');
  assert.doesNotMatch(idle, /tv-busy/);
  const busy = loadVocabularyUi({rows, busy: 'ip'}).tagVocabularyHtml();
  assert.match(busy, /<input class="tv-zh" data-tv-zh="el:ip" value="ip"[^>]* disabled>/, '改名进行中：中文名输入框禁用');
  assert.match(busy, /data-tv-delete="el:ip"[^>]* disabled>/, '改名进行中：删除按钮禁用（连点两次会撞"后写覆盖"）');
  assert.match(busy, /<span class="tv-busy">处理中…<\/span>/);
});

test('v913 渲染：结果消息在 tagVocabularyMessagesHtml 里（refreshTagVocabularyBody 就是换这一块）', () => {
  const rows = [{id: 'el:ip', name_zh: 'ip', kind: 'element'}];
  const c = loadVocabularyUi({rows, message: '已改名：素材 31 条 · 物料 0 条 · 逐图标签 31 条。'});
  assert.match(c.tagVocabularyMessagesHtml(), /已改名：素材 31 条 · 物料 0 条 · 逐图标签 31 条。/);
  assert.match(c.tagVocabularyHtml(), /<div id="tv-messages"><div class="tv-message">已改名：/);
  assert.equal(loadVocabularyUi({rows}).tagVocabularyMessagesHtml(), '', '没有消息时是空串');
});

// ── 2) app.js 接线断言：乐观更新 + 立刻重画 + 失败回滚 ────────────────────────
const renameSrc = appSource.slice(
  appSource.indexOf('  function renameTagVocabulary('),
  appSource.indexOf('  // v912 删除：从全库所有物料上摘掉这个标签')
);
const deleteSrc = appSource.slice(
  appSource.indexOf('  function deleteTagVocabulary('),
  appSource.indexOf('  // 「AI 建议相关词」')
);
assert.ok(renameSrc.length > 0 && deleteSrc.length > 0, '两个管理函数都要在 app.js 里');

test('v913 改名：先本地改、立刻重画，然后才发请求', () => {
  assert.match(renameSrc, /tagVocabularyRows = tagVocabularyOptimisticRename\(tagVocabularyRows, id, plan\.to\);/);
  const optimisticAt = renameSrc.indexOf('tagVocabularyOptimisticRename(');
  const renderAt = renameSrc.indexOf('renderTagVocabularySection(section);');
  const rpcAt = renameSrc.indexOf("tagManageRpc('vf_rename_tag'");
  assert.ok(optimisticAt < rpcAt, '乐观更新必须在发请求之前');
  assert.ok(renderAt > optimisticAt && renderAt < rpcAt, '重画要在发请求之前（点完确定就看到新名字）');
  assert.doesNotMatch(renameSrc.slice(0, optimisticAt), /refreshTagVocabularyBody\(section\);\s*tagManageRpc/,
    '不许再"先重画旧数据、再发请求"（旧数据会把输入框顶回旧名字）');
});

test('v913 改名失败：本地改动整个回滚 + 保留并显示失败原因', () => {
  assert.match(renameSrc, /const before = tagVocabularyRows;/);
  assert.match(renameSrc, /\.catch\(function\(error\) \{[\s\S]*?tagVocabularyRows = before;[\s\S]*?tagVocabularyManageBusy = '';/,
    'catch 里先把本地乐观改动回滚掉');
  assert.match(renameSrc, /return reloadTagVocabulary\(section, \{ keepMessage: true \}\);/,
    '回滚后的重读要保留失败消息');
  assert.match(renameSrc, /tagManageErrorText\(error, '改名失败', 'Rename failed'\)/, 'sql/027 未执行的降级照旧');
});

test('v913 删除：先本地摘掉、立刻重画，失败放回来', () => {
  assert.match(deleteSrc, /tagVocabularyRows = tagVocabularyOptimisticRemove\(tagVocabularyRows, row\.id\);/);
  const optimisticAt = deleteSrc.indexOf('tagVocabularyOptimisticRemove(');
  const rpcAt = deleteSrc.indexOf("tagManageRpc('vf_delete_tag'");
  assert.ok(optimisticAt > 0 && optimisticAt < rpcAt, '乐观删除必须在发请求之前');
  assert.ok(deleteSrc.indexOf('renderTagVocabularySection(section);') < rpcAt, '重画要在发请求之前');
  assert.match(deleteSrc, /const before = tagVocabularyRows;/);
  assert.match(deleteSrc, /\.catch\(function\(error\) \{[\s\S]*?tagVocabularyRows = before;[\s\S]*?tagVocabularyManageBusy = '';/,
    'catch 里把这一行放回来');
  assert.match(deleteSrc, /return reloadTagVocabulary\(section, \{ keepMessage: true \}\);/);
});

test('v913 两个成功分支都要清掉"进行中"态再刷新', () => {
  const done = appSource.match(/tagVocabularyManageReady = true;\s*tagVocabularyManageBusy = '';/g) || [];
  assert.equal(done.length, 2, '改名/删除成功都要解锁');
  const rolled = appSource.match(/tagVocabularyRows = before;\s*tagVocabularyManageBusy = '';/g) || [];
  assert.equal(rolled.length, 2, '改名/删除失败也都要解锁');
});

// ── 3) app.js 接线断言：进行中态（禁用输入 + 删除按钮，挡住连点两次）──────────
test('v913 进行中：整张表的输入框与删除按钮禁用 + 那一行给"处理中…"', () => {
  assert.match(appSource, /let tagVocabularyManageBusy = '';/, '要有一个"进行中"标志');
  const disables = appSource.match(/\(busy \? ' disabled' : ''\)/g) || [];
  assert.equal(disables.length, 2, '中文名输入框和删除按钮都要禁用');
  assert.match(appSource, /const busy = !!tagVocabularyManageBusy;/);
  assert.match(appSource, /const rowBusy = busy && String\(row\.name_zh \|\| ''\) === tagVocabularyManageBusy;/);
  assert.match(appSource, /rowBusy \? '<span class="tv-busy">'/, '正在改的那一行要显示"处理中…"');
  assert.match(appSource, /\.tag-vocabulary-section \.tv-busy \{/, 'tv-busy 要有样式');
});

test('v913 进行中：不接受第二次操作（连点两次会撞"后写覆盖"）', () => {
  assert.match(renameSrc, /if \(tagVocabularyManageBusy\) \{ refreshTagVocabularyBody\(section\); return; \}/,
    '改名：上一次没回来就不接新的，并把输入框还原');
  assert.match(deleteSrc, /if \(tagVocabularyManageBusy\) return;/, '删除：同上（提前到 confirm 之前）');
  assert.match(appSource, /function tagVocabularyBusyWatchdog\(section, token\)/, '要有兜底解锁（锁竞争下会慢到分钟级）');
  assert.match(appSource, /const TAG_VOCABULARY_BUSY_TIMEOUT = \d+;/);
  assert.match(appSource, /tagVocabularyBusyWatchdog\(section, tagVocabularyManageBusy\);/, '两个流程都要挂兜底');
  assert.match(appSource, /if \(!token \|\| tagVocabularyManageBusy !== token\) return;/, '兜底只解自己那一次');
});

// ── 4) app.js 接线断言：结果消息要留得住 ─────────────────────────────────────
test('v913 结果消息：管理操作触发的重读保留消息，普通「刷新」仍然清空', () => {
  assert.match(appSource, /async function reloadTagVocabulary\(section, options\) \{/);
  assert.match(appSource, /const keepMessage = !!\(options && options\.keepMessage\);/);
  assert.match(appSource, /if \(!keepMessage\) tagVocabularyMessage = '';/, '不传 keepMessage ⇒ 照旧清空（刷新按钮、首次挂载）');
  assert.match(appSource, /await reloadTagVocabulary\(section, \{ keepMessage: true \}\);/, '管理操作后的重读要保留结果消息');
  const refreshBranch = appSource.slice(
    appSource.indexOf("if (event.target.closest('[data-tv-refresh]'))"),
    appSource.indexOf("if (event.target.closest('[data-tv-sync]'))")
  );
  assert.match(refreshBranch, /reloadTagVocabulary\(section\);/, '「刷新」按钮照旧重读');
  assert.doesNotMatch(refreshBranch, /keepMessage/, '「刷新」不带 keepMessage ⇒ 仍会清空消息');
});

test('v913 结果消息：消息块要能被单独重画（否则改名/删除的反馈还是看不到）', () => {
  assert.match(appSource, /function tagVocabularyMessagesHtml\(\)/);
  assert.match(appSource, /'<div id="tv-messages">' \+ tagVocabularyMessagesHtml\(\) \+ '<\/div>'/, '消息块要有自己的容器');
  assert.match(appSource, /const messages = section && section\.querySelector\('#tv-messages'\);/);
  assert.match(appSource, /if \(messages\) messages\.innerHTML = tagVocabularyMessagesHtml\(\);/,
    'refreshTagVocabularyBody 也要刷新消息块');
});

// ── 5) 别弄坏别的 ───────────────────────────────────────────────────────────
test('v913 别弄坏：英文名 / 相关词保存、补翻译、同步、搜索过滤都还在', () => {
  assert.match(appSource, /saveTagVocabularyPatch\(id, \{ name_en: value, source: 'manual' \}\)/);
  assert.match(appSource, /saveTagVocabularyPatch\(id, \{ related: stored, source: 'manual' \}\)/);
  assert.match(appSource, /data-tv-translate="1"/);
  assert.match(appSource, /data-tv-sync="1"/);
  assert.match(appSource, /data-tv-refresh="1"/);
  assert.match(appSource, /function tagVocabularyRowMatches\(row, query\)/);
  assert.doesNotMatch(appSource, /if \(rowBusy\)[\s\S]{0,80}tagVocabularyQuery/, '乐观更新后那一行照样服从搜索过滤（不强行保留）');
});

test('v913 版本号六处同步', () => {
  const refs = indexSource.match(/\?v=20261014-strategy-required-v934/g) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处版本号');
  assert.match(appSource, /const TOOL_UI_VERSION = '20261014-strategy-required-v934'/);
});
