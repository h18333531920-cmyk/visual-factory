// v920（2026-10-14）：词表页的「使用量」—— 中文名后面显示这个词被几个物料用到。
//
// 用户诉求（原话）：
//   「在词表里的词的前面加一个数字，显示这个词被几个物料使用，这样就能区分出是不是有用到了」
// 动机：一眼看出**孤儿词**。元素词没人用 = 死词条；效果词（kind='effect'）则可能是"刚加还没识别到"
//   或"真的没用上" —— 这两种情况以前在界面上完全一样。
//
// 四条硬口径（本文件逐条锁住）：
//   ① 实时算，**不存列**：数据来自 sql/030 建的视图 public.vf_tag_usage（materials / projects），
//      清洗口径与 sql/025 的同步函数一致（btrim / 排空串 / 排 vf: 内部标记）；
//   ② 数字 = 被几个**物料**用到；一个都没用到（materials=0 且 projects=0）= 「未使用」+ 标红；
//   ③ 降级：视图没跑 / 读不到时**不报错、不阻塞词表页**，只是不显示数字 + 挂一句轻提示；
//   ④ 服务端代理白名单里加这一个固定名字（视图对 PostgREST 就是可读表），口径仍是"只放行写死的名字"。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {dataPlan} from '../functions/_account-data-policy.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const appSource = readFileSync(join(ROOT, 'app.js'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'index.html'), 'utf8');
const sqlSource = readFileSync(join(ROOT, 'sql', '030_tag_usage.sql'), 'utf8');
const policySource = readFileSync(join(ROOT, 'functions', '_account-data-policy.js'), 'utf8');

/* ── 1) 纯逻辑：tagUsageBadge（从 app.js 切出来在 vm 里单跑）──────────────────── */

const badgeStart = appSource.indexOf('  function tagUsageBadge(');
const badgeEnd = appSource.indexOf('  function tagVocabularyRowsHtml(');
assert.ok(badgeStart > 0 && badgeEnd > badgeStart, 'tagUsageBadge 必须是可切的纯函数（放在行渲染前面）');

function loadBadge() {
  const context = vm.createContext({});
  vm.runInContext(appSource.slice(badgeStart, badgeEnd) + '\n;({ tagUsageBadge })', context);
  return context.tagUsageBadge;
}
const badge = loadBadge();
const map = (pairs) => Object.assign(Object.create(null), pairs);

test('v920 vm：有使用量 ⇒ 显示物料数，不是 0 就不标红', () => {
  const usage = map({'爆炸': {materials: 12, projects: 3}});
  const out = badge({name_zh: '爆炸'}, usage, 'zh');
  assert.equal(out.text, '12', '数字 = 被几个物料用到');
  assert.equal(out.isZero, false);
  assert.equal(out.title, '物料 12 个 · 项目 3 个');
});

test('v920 vm：一个都没用到 ⇒ 「未使用」+ isZero（这是这一支的核心信息）', () => {
  const usage = map({'缩放': {materials: 0, projects: 0}});
  const out = badge({name_zh: '缩放'}, usage, 'zh');
  assert.equal(out.text, '未使用');
  assert.equal(out.isZero, true, '0 必须能被标出来');
  assert.match(out.title, /物料 0 个 · 项目 0 个/);
});

test('v920 vm：只在项目标签里用到（materials=0）⇒ 数字还是 0，也要标出来', () => {
  const usage = map({'某项目词': {materials: 0, projects: 4}});
  const out = badge({name_zh: '某项目词'}, usage, 'zh');
  assert.equal(out.text, '0');
  assert.equal(out.isZero, true);
  assert.match(out.title, /物料 0 个 · 项目 4 个/, '悬停里能看出"项目里有、物料上没有"');
});

test('v920 vm：视图没跑（usageMap = null）⇒ 返回 null（一个数字都不渲染）', () => {
  for (const value of [null, undefined]) {
    assert.equal(badge({name_zh: '爆炸'}, value, 'zh'), null, '缺数据时不渲染：' + String(value));
  }
});

test('v920 vm：视图里没有这个词 / 没有中文名 ⇒ 不渲染（宁可不显示，也不误报成 0）', () => {
  const usage = map({'爆炸': {materials: 12, projects: 3}});
  assert.equal(badge({name_zh: '刚改完名的词'}, usage, 'zh'), null, '视图里查不到就不显示');
  assert.equal(badge({name_zh: ''}, usage, 'zh'), null);
  assert.equal(badge({name_zh: '   '}, usage, 'zh'), null);
  assert.equal(badge(null, usage, 'zh'), null);
});

test('v920 vm：名字两侧的空格不影响命中（与 sql/030 的 btrim 口径一致）', () => {
  const usage = map({'汉堡': {materials: 7, projects: 0}});
  assert.equal(badge({name_zh: '  汉堡 '}, usage, 'zh').text, '7');
});

test('v920 vm：PostgREST 回来的数字是字符串也认（Number 转换）', () => {
  const usage = map({'薯条': {materials: '237', projects: '5'}});
  const out = badge({name_zh: '薯条'}, usage, 'zh');
  assert.equal(out.text, '237');
  assert.equal(out.isZero, false);
});

test('v920 vm：英文界面文案是英文', () => {
  const usage = map({'爆炸': {materials: 12, projects: 3}, '缩放': {materials: 0, projects: 0}});
  assert.equal(badge({name_zh: '爆炸'}, usage, 'en').title, '12 assets · 3 projects');
  assert.equal(badge({name_zh: '缩放'}, usage, 'en').text, 'unused');
  assert.match(badge({name_zh: '缩放'}, usage, 'en').title, /0 assets · 0 projects/);
});

test('v920 vm：奇怪的数值不炸（负数 / null / 缺字段都算 0）', () => {
  const usage = map({'x': {materials: null, projects: -3}, 'y': {}});
  assert.equal(badge({name_zh: 'x'}, usage, 'zh').isZero, true);
  assert.equal(badge({name_zh: 'y'}, usage, 'zh').text, '未使用');
});

/* ── 1b) 真渲一遍 HTML（切源码在干净 vm 里跑，不要浏览器、不联网）────────────── */
// 与 v913 的渲染测试同一个切法：从 tagVocabularyRowMatches 切到 renderTagVocabularySection。
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
    tagVocabularyUsageMap: options.usage === undefined ? null : options.usage,
    tagVocabularyUsageReady: options.usageReady === undefined ? null : options.usageReady,
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

test('v920 渲染：数字真的进了词表那一行（中文名后面）', () => {
  const rows = [
    {id: 'el:爆炸', name_zh: '爆炸', name_en: 'explosion', kind: 'effect'},
    {id: 'el:缩放', name_zh: '缩放', kind: 'effect'}
  ];
  const usage = map({'爆炸': {materials: 12, projects: 3}, '缩放': {materials: 0, projects: 0}});
  const html = loadVocabularyUi({rows, usage}).tagVocabularyRowsHtml();
  assert.match(html, /<span class="tv-usage" title="物料 12 个 · 项目 3 个">12<\/span>/, '有使用量：数字 + 悬停明细');
  assert.doesNotMatch(html, /tv-usage-zero[^>]*>12</);
  assert.match(html, /<span class="tv-usage tv-usage-zero" title="物料 0 个 · 项目 0 个（还没被任何物料或项目用到）">未使用<\/span>/,
    '0 = 「未使用」+ 标红（tv-usage-zero）');
  // 数字挂在中文名那一格里、在输入框后面
  assert.match(html, /data-tv-zh="el:爆炸"[^>]*><span class="tv-usage"/);
});

test('v920 渲染：只读态（没维护权限）也带数字', () => {
  const context = loadVocabularyUi({
    rows: [{id: 'el:甜点', name_zh: '甜点'}],
    usage: map({'甜点': {materials: 4, projects: 0}})
  });
  context.tagVocabularyCanManage = () => false;
  const html = context.tagVocabularyRowsHtml();
  assert.match(html, /<span class="tv-zh-text">甜点<\/span><span class="tv-usage"[^>]*>4<\/span>/);
});

test('v920 渲染：视图没跑（usage 为 null）⇒ 一个数字都不渲染，也不报错', () => {
  const rows = [{id: 'el:爆炸', name_zh: '爆炸'}, {id: 'el:缩放', name_zh: '缩放'}];
  const html = loadVocabularyUi({rows}).tagVocabularyRowsHtml();
  assert.doesNotMatch(html, /tv-usage/, '没有数字就没有徽章');
  assert.match(html, /data-tv-zh="el:爆炸"/, '词表行本身照常渲染');
});

test('v920 渲染：搜索过滤后，剩下的行照样带着自己的数字', () => {
  const rows = [
    {id: 'el:爆炸', name_zh: '爆炸'},
    {id: 'el:放大', name_zh: '放大'}
  ];
  const usage = map({'爆炸': {materials: 12, projects: 0}, '放大': {materials: 0, projects: 0}});
  const html = loadVocabularyUi({rows, usage, query: '放大'}).tagVocabularyRowsHtml();
  assert.doesNotMatch(html, /el:爆炸/, '被过滤掉的行不出现');
  assert.match(html, /<span class="tv-usage tv-usage-zero"/, '留下来的那一行数字跟着它走');
});

test('v920 渲染：「动效」小标记（v918）没被挤掉', () => {
  const rows = [{id: 'el:爆炸', name_zh: '爆炸', kind: 'effect'}];
  const html = loadVocabularyUi({rows, usage: map({'爆炸': {materials: 1, projects: 0}})}).tagVocabularyRowsHtml();
  assert.match(html, /tv-mark tv-mark-effect/, 'kind=effect 的「动效」标记还在');
  assert.match(html, /<\/span><span class="tv-mark tv-mark-effect"/, '使用量徽章在它前面（中文名后：数字 → 动效）');
});

test('v920 渲染：读不到视图时挂一句轻提示（灰底 tv-message，不是红色错误块）', () => {
  const rows = [{id: 'el:爆炸', name_zh: '爆炸'}];
  const hint = loadVocabularyUi({rows, usageReady: false}).tagVocabularyMessagesHtml();
  assert.match(hint, /sql\/030_tag_usage\.sql/, '提示里写清要跑哪个文件');
  assert.match(hint, /<div class="tv-message">/, '照 sql/024 / sql/027 的降级写法（tv-message）');
  assert.doesNotMatch(hint, /tv-error|error/i, '不要做成错误块');
  assert.equal(loadVocabularyUi({rows, usageReady: true}).tagVocabularyMessagesHtml(), '', '读到了就不提示');
});

test('v920 渲染：进行中态（busy）不禁用数字', () => {
  const rows = [{id: 'el:爆炸', name_zh: '爆炸'}];
  const html = loadVocabularyUi({rows, busy: '爆炸', usage: map({'爆炸': {materials: 9, projects: 0}})}).tagVocabularyRowsHtml();
  assert.match(html, /<span class="tv-usage" title="物料 9 个 · 项目 0 个">9<\/span>/);
});

/* ── 2) 接线：词表页多读一次视图 ─────────────────────────────────────────── */

test('v920 接线：视图名写死一处、查询是「一次拿全部行」', () => {
  assert.match(appSource, /const TAG_USAGE_VIEW = 'vf_tag_usage';/);
  const fetchSrc = appSource.slice(
    appSource.indexOf('  async function fetchTagUsageMap('),
    appSource.indexOf('  async function reloadTagUsage(')
  );
  assert.ok(fetchSrc.length > 0, 'fetchTagUsageMap 要在 app.js 里');
  assert.match(fetchSrc, /state\.supabase\.from\(TAG_USAGE_VIEW\)/, '必须走 state.supabase（从而走 /api/account-data 代理）');
  assert.match(fetchSrc, /\.select\('name_zh,materials,projects'\)/, '只取这三列');
  assert.match(fetchSrc, /\.limit\(2000\)/, '一次拿全部行（341 行量级）');
  assert.match(fetchSrc, /Object\.create\(null\)/, 'map 用无原型对象（避免 constructor / toString 这种词名撞到原型）');
  assert.match(fetchSrc, /Number\(row\.materials\) \|\| 0/, '数字归一成 number');
});

test('v920 接线：打开词表页会读一次使用量，两个请求并行', () => {
  const reloadSrc = appSource.slice(
    appSource.indexOf('  async function reloadTagVocabulary('),
    appSource.indexOf('  function tagVocabularyRowMatches(')
  );
  assert.match(reloadSrc, /const usageTask = reloadTagUsage\(\);/);
  const usageAt = reloadSrc.indexOf('reloadTagUsage()');
  const rowsAt = reloadSrc.indexOf('await fetchTagVocabularyRows()');
  assert.ok(usageAt > 0 && usageAt < rowsAt, '使用量与词表并行读（不串行拖慢首屏）');
  assert.match(reloadSrc, /await usageTask;/, '画之前要等到（画的时候数字已经在手上了）');
});

test('v920 降级：视图读不到时不报错、不阻塞词表页，只把状态记成 false', () => {
  const usageSrc = appSource.slice(
    appSource.indexOf('  async function reloadTagUsage('),
    appSource.indexOf('  // v913：options.keepMessage')
  );
  assert.ok(usageSrc.length > 0);
  assert.match(usageSrc, /tagVocabularyUsageMap = await fetchTagUsageMap\(\);\s*tagVocabularyUsageReady = true;/);
  assert.match(usageSrc, /catch \(error\) \{\s*tagVocabularyUsageMap = null;\s*tagVocabularyUsageReady = false;/,
    '出错只降级（不 throw，不影响词表本身）');
  assert.match(appSource, /tagVocabularyUsageReady === false \? '<div class="tv-message">'/);
  // 词表本身的失败路径（sql/022 未执行）不许被这次改动动到
  assert.match(appSource, /isMissingTagVocabularyError\(error\)/);
});

/* ── 3) 服务端代理白名单 ─────────────────────────────────────────────────── */

test('v920 代理：vf_tag_usage 进了白名单，但口径没放宽（仍是写死的名字集合）', () => {
  assert.match(policySource, /const tables = new Set\(\['vf_profiles'[^\]]*'vf_tag_usage'\]\);/,
    '视图对 PostgREST 就是可读表 ⇒ 按"固定名字"放行');
  assert.match(policySource, /vf_tag_vocabulary','vf_tag_usage'/, '加在这一个位置（列表尾）');
  assert.match(policySource, /tables\.has\(parts\[2\]\)/, '仍然只认这个写死的名字集合');
  assert.doesNotMatch(policySource, /tables\.add\(|parts\[2\]\.startsWith|parts\[2\]\.match\(/,
    '绝不放宽成通配 / 前缀匹配');
});

test('v920 代理：读得到（GET 放行）、写不了（非维护权限仍然 403）', () => {
  const uid = '11111111-1111-4111-8111-111111111111';
  const diy = {user: {id: uid}, account: {product: 'diy', status: 'active', features: ['library']}, maintenance: null};
  const plan = (path, method = 'GET') => dataPlan(diy, path, method, 'https://owned.supabase.co', new Headers());
  const read = plan('/rest/v1/vf_tag_usage?select=name_zh,materials,projects');
  assert.equal(read.rest, true, '视图在白名单里 ⇒ 不再 403');
  assert.equal(read.read, true);
  assert.equal(read.parts[2], 'vf_tag_usage');
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    assert.throws(() => plan('/rest/v1/vf_tag_usage', method), {status: 403}, '视图只读：普通账号写不了');
  }
  // 白名单没被放宽：别的未知表照旧 403
  assert.throws(() => plan('/rest/v1/vf_tag_usage_extra'), {status: 403});
  assert.throws(() => plan('/rest/v1/vf_tag_usage_backup'), {status: 403});
});

/* ── 4) sql/030 的口径 ──────────────────────────────────────────────────── */

test('v920 sql/030：幂等建视图 + 使用量视图名与列名', () => {
  assert.match(sqlSource, /create or replace view public\.vf_tag_usage as/);
  assert.match(sqlSource, /coalesce\(mc\.materials, 0\) as materials/);
  assert.match(sqlSource, /coalesce\(pc\.projects, 0\) as projects/);
  assert.match(sqlSource, /comment on view public\.vf_tag_usage is/);
});

test('v920 sql/030：四个 materials 来源 + 项目来源齐了', () => {
  assert.match(sqlSource, /unnest\(a\.ai_tags\)/);
  assert.match(sqlSource, /unnest\(a\.manual_tags\)/);
  assert.match(sqlSource, /from public\.vf_effect_tag_rows\(\) e/, '效果标签（sql/028）走辅助函数读');
  assert.match(sqlSource, /select p\.id, p\.material_type/, '物料类型也要算');
  assert.match(sqlSource, /from public\.vf_source_files s/);
  assert.match(sqlSource, /select distinct\s+l\.preview_id,/, '按物料 id 去重（同一个物料上多次出现只算一次）');
  assert.match(sqlSource, /select distinct\s+l\.id,/, '项目侧同样按 id 去重');
});

test('v920 sql/030：清洗口径与 sql/025 同步函数一致', () => {
  assert.match(sqlSource, /btrim\(l\.raw_name\)/);
  assert.match(sqlSource, /btrim\(l\.raw_name\) <> ''/);
  assert.match(sqlSource, /btrim\(l\.raw_name\) not like 'vf:%'/);
  assert.match(sqlSource, /from public\.vf_tag_vocabulary v/, '词表里的词也要出现（没人用才是 0，孤儿词就是这么找出来的）');
});

test('v920 sql/030：effect_tags 不存在时能降级（不报错、不用重跑本文件）', () => {
  const fnSrc = sqlSource.slice(
    sqlSource.indexOf('create or replace function public.vf_effect_tag_rows()'),
    sqlSource.indexOf('comment on function public.vf_effect_tag_rows()')
  );
  assert.ok(fnSrc.length > 0, '要有 vf_effect_tag_rows 辅助函数');
  assert.match(fnSrc, /from pg_attribute/, '按 sql/027 的做法查 pg_attribute 判断列在不在');
  assert.match(fnSrc, /attname = 'effect_tags'/);
  assert.match(fnSrc, /to_regclass\('public\.vf_preview_ai_tags'\)/);
  assert.match(fnSrc, /return query execute/, '列在 → 动态执行那条 select');
  assert.match(fnSrc, /\n  return;/, '列不在 → 返回空集（降级，不报错）');
  assert.match(fnSrc, /stable/, '只读，标 stable');
  assert.match(sqlSource, /不用重跑本文件/, '注释要说清 028 跑了之后不用重跑 030');
});

test('v920 sql/030：自检能看到「使用量为 0 的行数」和效果词', () => {
  assert.match(sqlSource, /count\(\*\) filter \(where materials = 0 and projects = 0\)/);
  assert.match(sqlSource, /where name_zh in \('爆炸'/);
  assert.match(sqlSource, /to_regclass\('public\.vf_tag_usage'\) as 使用量视图/);
});

test('v920 sql/030：文件头说清「为什么视图不列 / 执行顺序 / 幂等 / 用户自己跑」', () => {
  assert.match(sqlSource, /为什么用\*\*视图\*\*而不是/);
  assert.match(sqlSource, /一定会过期/);
  assert.match(sqlSource, /执行顺序：在 sql\/025、sql\/028 之后跑/);
  assert.match(sqlSource, /幂等：可重复执行/);
  assert.match(sqlSource, /用户自己跑，AI 不代跑/);
  assert.match(sqlSource, /service_role/, '权限段写明只给服务端代理那个身份');
});

/* ── 5) 别弄坏别的 ───────────────────────────────────────────────────────── */

test('v920 别弄坏：改名/删除/英文名/相关词/同步/补翻译/搜索都还在', () => {
  assert.match(appSource, /saveTagVocabularyPatch\(id, \{ name_en: value, source: 'manual' \}\)/);
  assert.match(appSource, /saveTagVocabularyPatch\(id, \{ related: stored, source: 'manual' \}\)/);
  assert.match(appSource, /renameTagVocabulary\(section, zhInput\.getAttribute\('data-tv-zh'\) \|\| '', zhInput\.value\)/);
  assert.match(appSource, /tagManageRpc\('vf_rename_tag'/);
  assert.match(appSource, /tagManageRpc\('vf_delete_tag'/);
  assert.match(appSource, /data-tv-sync="1"/);
  assert.match(appSource, /data-tv-translate="1"/);
  assert.match(appSource, /tagVocabularyOptimisticRename\(tagVocabularyRows, id, plan\.to\)/);
  assert.match(appSource, /const busy = !!tagVocabularyManageBusy;/);
  assert.match(appSource, /TAG_VOCABULARY_IGNORED/, 'kind=ignored 的过滤还在');
  assert.match(appSource, /function tagVocabularyRowMatches\(row, query\)/, '搜索过滤还在');
  assert.match(appSource, /const kindMark = String\(row\.kind \|\| ''\) === 'effect'/, 'v918 的动效标记还在');
});

test('v920 样式：徽章轻一点，0 标红', () => {
  assert.match(appSource, /\.tag-vocabulary-section \.tv-usage \{ flex: 0 0 auto; font-size: 10\.5px;/);
  assert.match(appSource, /\.tag-vocabulary-section \.tv-usage-zero \{ color: #b91c1c;/);
  assert.match(appSource, /\.tag-vocabulary-section \.tv-zh-cell \{ position: relative; display: flex;/,
    '中文名那一格横排（输入框 + 数字 + 动效标记）');
  assert.doesNotMatch(appSource, /\.tv-usage[^}]*font-size: 14px/, '别喧宾夺主：不许用大字号');
});

test('v920 版本号六处同步', () => {
  const refs = indexSource.match(/\?v=20261015-type-i18n-v943/g) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处版本号');
  assert.match(appSource, /const TOOL_UI_VERSION = '20261015-type-i18n-v943'/);
});
