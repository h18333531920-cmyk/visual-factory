import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, '..', 'app.js'), 'utf8');
const policySource = readFileSync(join(here, '..', 'functions', '_account-data-policy.js'), 'utf8');
const sqlSource = readFileSync(join(here, '..', 'sql', '027_tag_manage.sql'), 'utf8');
const {dataPlan, restrictDataBody} = await import('../functions/_account-data-policy.js');

// ── 1) 服务端代理白名单（v912：vf_rename_tag / vf_delete_tag）────────────────
const uid = '11111111-1111-4111-8111-111111111111';
const diy = {user: {id: uid}, account: {product: 'diy', status: 'active'}, maintenance: null};
const admin = {...diy, maintenance: {}};
const plan = (ctx, path, method = 'GET', headers = {}) =>
  dataPlan(ctx, path, method, 'https://owned.supabase.co', new Headers(headers));

test('v912 白名单：vf_rename_tag / vf_delete_tag 只放行 POST、必须维护权限', () => {
  for (const name of ['vf_rename_tag', 'vf_delete_tag']) {
    const p = plan(admin, '/rest/v1/rpc/' + name, 'POST');
    assert.equal(p.rpc, true, name + ' 要放行');
    assert.equal(p.rpcName, name);
    assert.equal(p.rest, false, 'RPC 不是表查询');
    assert.equal(p.read, false);
    assert.equal(p.jsonBody, false, 'jsonBody 必须是 false：body 原样透传，参数不能被吃掉');
    assert.throws(() => plan(diy, '/rest/v1/rpc/' + name, 'POST'), {status: 403}, '普通账号不给调：' + name);
    for (const method of ['GET', 'PATCH', 'PUT', 'DELETE']) {
      assert.throws(() => plan(admin, '/rest/v1/rpc/' + name, method), {status: 405}, name + ' 只允许 POST');
    }
  }
  const sync = plan(admin, '/rest/v1/rpc/vf_sync_tag_vocabulary', 'POST');
  assert.equal(sync.rpc, true);
  assert.equal(sync.syncRpc, true, '老行为保留：同步 RPC 仍认 syncRpc 标记');
});

test('v912 白名单没有放宽成"任意 rpc"', () => {
  for (const path of [
    '/rest/v1/rpc/vf_is_admin',
    '/rest/v1/rpc/vf_some_other_fn',
    '/rest/v1/rpc/vf_rename_tag_extra',
    '/rest/v1/rpc/vf_rename_tag/extra',
    '/rest/v1/rpc/vf_delete_tag/extra',
    '/rest/v1/rpc/VF_RENAME_TAG',
    '/rest/v1/rpc/',
  ]) {
    assert.throws(() => plan(admin, path, 'POST'), {status: 403}, path + ' 必须仍然 403');
  }
  assert.match(
    policySource,
    /const RPC_WHITELIST=new Set\(\['vf_sync_tag_vocabulary','vf_rename_tag','vf_delete_tag'\]\)/,
    '白名单必须是写死的三个名字，不是"任意 rpc"'
  );
  assert.doesNotMatch(policySource, /\(parts\[2\]==='rpc'\)\s*\)\s*throw/, '别把 rpc 整段放行');
});

test('v912 RPC 的 body 透传：改名/删除的参数原样送给 PostgREST', () => {
  const rename = plan(admin, '/rest/v1/rpc/vf_rename_tag', 'POST');
  const body = {p_old: '吉祥物', p_new: '吉祥物A'};
  assert.deepEqual(restrictDataBody(admin, rename, body), body, '参数不能被改写或丢掉');
  const remove = plan(admin, '/rest/v1/rpc/vf_delete_tag', 'POST');
  assert.deepEqual(restrictDataBody(admin, remove, {p_name: '吉祥物'}), {p_name: '吉祥物'});
  // 形状兜底：RPC 参数只能是「键 → 短字符串」
  assert.throws(() => restrictDataBody(admin, remove, ['吉祥物']), {status: 400});
  assert.throws(() => restrictDataBody(admin, remove, {p_name: {x: 1}}), {status: 400});
  assert.throws(() => restrictDataBody(admin, remove, {p_name: 'x'.repeat(201)}), {status: 400});
});

// ── 2) sql/027 文本断言 ────────────────────────────────────────────────────
const renameStart = sqlSource.indexOf('create or replace function public.vf_rename_tag(');
const deleteStart = sqlSource.indexOf('create or replace function public.vf_delete_tag(');
const renameSql = sqlSource.slice(renameStart, sqlSource.indexOf('comment on function public.vf_rename_tag'));
const deleteSql = sqlSource.slice(deleteStart, sqlSource.indexOf('comment on function public.vf_delete_tag'));

test('sql/027：两个入口函数都是 security definer + search_path 固定 + 返回 jsonb', () => {
  assert.ok(renameStart > 0 && deleteStart > renameStart, '两个函数都要在文件里');
  for (const [name, sql, args] of [
    ['vf_rename_tag', sqlSource, 'p_old text, p_new text'],
    ['vf_delete_tag', sqlSource, 'p_name text'],
  ]) {
    const re = new RegExp(
      'create or replace function public\\.' + name + '\\(' + args.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)'
        + '\\s+returns jsonb\\s+language plpgsql\\s+security definer\\s+set search_path = public'
    );
    assert.match(sql, re, name + ' 要是 security definer + jsonb + 固定 search_path');
  }
  assert.match(sqlSource, /perform public\.vf_sync_tag_vocabulary\(\);/, '要调同步函数');
});

test('sql/027：改名覆盖 5 个位置，末尾对齐一次词表', () => {
  assert.match(renameSql, /set ai_tags = public\.vf_tag_rename_in_array\(a\.ai_tags, v_old, v_new\)/, 'a 逐图 AI 标签');
  assert.match(renameSql, /set manual_tags = public\.vf_tag_rename_in_array\(a\.manual_tags, v_old, v_new\)/, 'b 人工补充');
  assert.match(renameSql, /set excluded_tags = public\.vf_tag_rename_in_array\(a\.excluded_tags, \$1, \$2\)/, 'c 人工排除（列不存在就跳过）');
  assert.match(renameSql, /set material_type = v_new/, 'd 物料类型/元素');
  assert.match(renameSql, /set tags = public\.vf_tag_rename_in_array\(s\.tags, v_old, v_new, v_prefixes\)/, 'e 素材标签');
  const lastSync = renameSql.lastIndexOf('perform public.vf_sync_tag_vocabulary();');
  assert.ok(lastSync > renameSql.lastIndexOf('set tags ='), '末尾（改完之后）必须再对齐一次');
  assert.match(renameSql, /exception when others then[\s\S]*vf_set_tag_sync_triggers\(true\)[\s\S]*raise;/, '出错也要恢复触发器');
});

test('sql/027：删除摘掉同一个 5 处，且用 array_remove、不删物料行', () => {
  assert.match(deleteSql, /array_remove\(a\.ai_tags, v_name\)/, 'a 用 array_remove 摘');
  assert.match(deleteSql, /array_remove\(a\.manual_tags, v_name\)/, 'b 用 array_remove 摘');
  assert.match(deleteSql, /array_remove\(a\.excluded_tags, \$1\)/, 'c 用 array_remove 摘');
  assert.match(deleteSql, /set material_type = ''/, 'd 置空串（列是 not null，不能写 null）');
  assert.match(deleteSql, /public\.vf_tag_remove_from_array\(s\.tags, v_name, v_prefixes\)/, 'e 素材标签（含编码写法）');
  assert.match(deleteSql, /delete from public\.vf_tag_vocabulary v where v\.name_zh = v_name;/, '只删词表那一行');
  assert.doesNotMatch(deleteSql, /delete from public\.vf_(source_files|asset_previews|preview_ai_tags)/, '绝对不删物料行');
  assert.doesNotMatch(deleteSql, /delete from storage|storage\./, '绝对不删图片');
  assert.ok(deleteSql.lastIndexOf('perform public.vf_sync_tag_vocabulary();') > deleteSql.lastIndexOf('set tags ='), '末尾对齐一次');
});

test('sql/027：编码写法 vf:case-element:v1: 两种形态都认（自带 percent-encode/decode）', () => {
  assert.match(sqlSource, /array\['vf:case-element:v1:', 'vf:case-activity:v1:', 'vf:case-strategy:v1:'\]/, '三种标记前缀与 app.js 对齐');
  assert.match(renameSql, /public\.vf_case_tag_prefixes\(\)/, '改名要处理编码写法');
  assert.match(renameSql, /public\.vf_tag_rename_in_array\(s\.tags, v_old, v_new, v_prefixes\)/, '素材标签传前缀');
  assert.match(sqlSource, /create or replace function public\.vf_percent_encode\(p_text text\)[\s\S]*?encode\(convert_to\(c, 'UTF8'\), 'hex'\)/);
  assert.match(sqlSource, /create or replace function public\.vf_percent_decode\(p_text text\)/);
  // 匹配两种写法：字面量 + 前缀后解码比较
  assert.match(sqlSource, /u\.elem = prefix \|\| public\.vf_percent_encode\(p_old\)/);
  assert.match(sqlSource, /public\.vf_percent_decode\(substr\(u\.elem, length\(prefix\) \+ 1\)\) = p_old/);
});

test('sql/027：改名去重（数组里不出现重复项）+ 撞名合并口径', () => {
  assert.match(sqlSource, /distinct on \(marked\.new_elem\)/, '同一个新值只留最早那一处 ⇒ 无重复项');
  assert.match(sqlSource, /select array_agg\(picked\.new_elem order by picked\.idx\)/, '保持原有相对顺序');
  assert.match(renameSql, /if exists \(select 1 from public\.vf_tag_vocabulary v where v\.name_zh = v_new\) then/, '词表已有新名 ⇒ 走合并');
  assert.match(renameSql, /delete from public\.vf_tag_vocabulary v where v\.name_zh = v_old;/, '合并时删掉旧名那一行');
  assert.match(renameSql, /set source = 'manual', related = v_related/, '保留新名那一行：source=manual + related 取并集');
  assert.match(renameSql, /v_related := true|v_merged := true/, '返回体要标出 merged');
  assert.match(renameSql, /'merged', v_merged/, '返回 merged');
  assert.match(renameSql, /if v_old = v_new then[\s\S]*?'changed', false/, '同名直接返回 changed:false');
  assert.match(renameSql, /raise exception '旧标签名不能为空'/, '空串报错');
  assert.match(deleteSql, /raise exception '标签名不能为空'/, '空串报错');
});

test('sql/027：权限只给服务端代理（service_role），普通登录账号调不到', () => {
  assert.match(sqlSource, /revoke all on function public\.vf_rename_tag\(text, text\) from %s/);
  assert.match(sqlSource, /revoke all on function public\.vf_delete_tag\(text\) from %s/);
  assert.match(sqlSource, /grant execute on function public\.vf_rename_tag\(text, text\) to service_role/);
  assert.match(sqlSource, /grant execute on function public\.vf_delete_tag\(text\) to service_role/);
  assert.doesNotMatch(sqlSource, /grant execute on function public\.vf_(rename|delete)_tag[\s\S]{0,40}to authenticated/, '不许放给登录账号');
});

test('sql/027：文件末尾带自检 SQL（两个函数在不在）', () => {
  assert.match(sqlSource, /select p\.proname,/);
  assert.match(sqlSource, /p\.prosecdef as security_definer[\s\S]*?from pg_proc p/, '自检要能看出是不是 security definer');
  assert.match(sqlSource, /p\.proname in \('vf_rename_tag', 'vf_delete_tag'\)/);
  assert.match(sqlSource, /t\.tgenabled/, '顺手查触发器有没有被留在关闭状态');
  // 执行方式写明"用户自己跑"
  assert.match(sqlSource, /Supabase SQL Editor 整段粘贴执行（\*\*用户自己跑，AI 不代跑\*\*/);
});

// ── 3) app.js 接线断言 ─────────────────────────────────────────────────────
test('v912 词表页：中文名是可编辑输入框（数据标记 data-tv-zh）', () => {
  assert.match(appSource, /class="tv-zh" data-tv-zh="' \+ escapeAttr\(row\.id\) \+ '"/);
  assert.match(appSource, /event\.target\.closest\('\[data-tv-zh\]'\)/, 'change 监听要接上');
  assert.match(appSource, /renameTagVocabulary\(section, zhInput\.getAttribute\('data-tv-zh'\) \|\| '', zhInput\.value\)/);
  assert.match(appSource, /function renameTagVocabulary\(section, id, nextName\)/);
  assert.doesNotMatch(appSource, /'<td class="tv-zh">' \+ escapeHtml\(row\.name_zh\)/, '旧的只读单元格写法不许留着');
});

test('v912 词表页：每行一个危险色删除按钮', () => {
  assert.match(appSource, /class="tv-btn tv-danger" data-tv-delete="' \+ escapeAttr\(row\.id\) \+ '"/);
  assert.match(appSource, /event\.target\.closest\('\[data-tv-delete\]'\)/);
  assert.match(appSource, /function deleteTagVocabulary\(section, id\)/);
  assert.match(appSource, /tagManageRpc\('vf_delete_tag', \{ p_name: name \}\)/);
});

test('v912 确认框文案写清后果（不可撤销 / 合并 / 不删物料图片）', () => {
  assert.match(
    appSource,
    /把"' \+ name \+ '"从所有物料上摘掉（物料和图片不会被删），并从词表移除。不可撤销。/,
    '删除确认框必须写清：只摘标签、不删物料图片、不可撤销'
  );
  assert.match(
    appSource,
    /全库所有挂了这个标签的物料都会一起改名，不可撤销。新名字若已存在，两个标签会合并。/,
    '改名确认框必须写清：全库改名、不可撤销、撞名合并'
  );
  const confirms = appSource.match(/window\.confirm\(/g) || [];
  assert.ok(confirms.length >= 2, '要真的用 confirm 问一次');
});

test('v912 只有维护权限账号能改中文名 / 能删（复用同一页已有判定）', () => {
  assert.match(
    appSource,
    /function tagVocabularyCanManage\(\) \{\s*return tagVocabularyManageReady !== false && materialCatalogCanEdit\(\);\s*\}/,
    '复用 materialCatalogCanEdit（与「同步库内标签」同一页同一口径）'
  );
  assert.match(appSource, /const editable = tagVocabularyCanManage\(\);/);
  assert.match(appSource, /if \(!tagVocabularyCanManage\(\)\) return;/, '点击删除时再挡一次');
  assert.match(appSource, /if \(!tagVocabularyCanManage\(\)\) \{ refreshTagVocabularyBody\(section\); return; \}/, '改中文名时再挡一次');
});

test('v912 降级：sql/027 没执行时给中文提示、不崩、输入框回到只读', () => {
  assert.match(appSource, /function isMissingTagManageFunctionError\(error\)/);
  assert.match(appSource, /需要先在 Supabase 执行 sql\/027_tag_manage\.sql/, '要提示去跑 sql/027');
  assert.match(appSource, /tagVocabularyManageReady = false;/, '认出来之后记住"不可用"');
  assert.match(appSource, /tagVocabularyManageReady === false \? '<div class="tv-message">'/, '挂一条中文提示横幅（照 sql/024 的降级写法）');
  assert.match(appSource, /tagVocabularyManageReady !== false && materialCatalogCanEdit\(\)/, '不可用时中文名只读、隐藏删除按钮');
  assert.match(appSource, /tagVocabularyManageReady = null;\s*reloadTagVocabulary\(section\);/, '点「刷新」可重试（跑完 sql/027 能恢复）');
  assert.match(appSource, /tagManageErrorText\(error, '改名失败', 'Rename failed'\)/);
  assert.match(appSource, /tagManageErrorText\(error, '删除失败', 'Remove failed'\)/);
});

test('v912 改名/删除成功后刷新词表 + 重绘素材库（标签显示跟着变）', () => {
  assert.match(appSource, /async function refreshAfterTagManage\(section\) \{[\s\S]*?resetTagVocabularyIndex\(\);[\s\S]*?await reloadTagVocabulary\(section, \{ keepMessage: true \}\);[\s\S]*?await loadTagVocabulary\(\);[\s\S]*?await reloadLibraryData\(\);/);
  assert.match(appSource, /function resetTagVocabularyIndex\(\)/, '旧索引要能清掉（否则还按旧名字显示）');
  assert.match(appSource, /return refreshAfterTagManage\(section\);/, '两处成功分支都要刷新');
  assert.match(appSource, /tagManageRpc\('vf_rename_tag', \{ p_old: plan\.from, p_new: plan\.to \}\)/);
});

test('v912 没弄坏英文名 / 相关词的保存链路', () => {
  assert.match(appSource, /saveTagVocabularyPatch\(id, \{ name_en: value, source: 'manual' \}\)/);
  assert.match(appSource, /saveTagVocabularyPatch\(id, \{ related: stored, source: 'manual' \}\)/);
  assert.match(appSource, /event\.target\.closest\('\[data-tv-en\]'\)/);
  assert.match(appSource, /event\.target\.closest\('\[data-tv-related\]'\)/);
  assert.match(appSource, /data-tv-refresh="1"/);
  assert.match(appSource, /data-tv-sync="1"/);
  assert.match(appSource, /data-tv-translate="1"/);
});

test('版本号六处同步', () => {
  const indexSource = readFileSync(join(here, '..', 'index.html'), 'utf8');
  const refs = indexSource.match(/\?v=20261027-gallery-upload-error-v963/g) || [];
  assert.equal(refs.length, 5, 'index.html 应有 5 处版本号');
  assert.match(appSource, /const TOOL_UI_VERSION = '20261027-gallery-upload-error-v963'/);
});

// ── 4) 纯逻辑（vm 切出来跑）：改名计划 / 撞名合并判定 ────────────────────────
const planStart = appSource.indexOf('  function tagVocabularyRenamePlan(');
const planEnd = appSource.indexOf('  // v912 改名：词表上改中文名 = 全库改名');
assert.ok(planStart > 0 && planEnd > planStart, 'tagVocabularyRenamePlan 必须是可切的纯函数');

function loadRenamePlan() {
  const context = vm.createContext({});
  vm.runInContext(appSource.slice(planStart, planEnd) + '\n;({ tagVocabularyRenamePlan })', context);
  return context.tagVocabularyRenamePlan;
}

const rows = [
  {id: 'el:汉堡', name_zh: '汉堡'},
  {id: 'el:薯条', name_zh: '薯条'},
  {id: 'el:餐桌', name_zh: '餐桌', related: ['桌子']},
];

test('v912 vm：普通改名（新名字库里没有）⇒ 不合并', () => {
  const fn = loadRenamePlan();
  // vm 里造出来的对象是另一个 realm 的，展开成本 realm 的普通对象再比
  assert.deepEqual({...fn(rows, 'el:汉堡', '汉堡包')}, {ok: true, from: '汉堡', to: '汉堡包', merge: false});
  assert.deepEqual({...fn(rows, 'el:汉堡', '  汉堡包  ')}, {ok: true, from: '汉堡', to: '汉堡包', merge: false}, '两边空格要去掉');
});

test('v912 vm：改名撞到已有那行 ⇒ 标成合并（数据库里两行会并成一行）', () => {
  const fn = loadRenamePlan();
  assert.deepEqual({...fn(rows, 'el:汉堡', '薯条')}, {ok: true, from: '汉堡', to: '薯条', merge: true}, '已经存在「薯条」⇒ 合并');
  assert.equal(fn(rows, 'el:汉堡', '汉堡').ok, false, '改成自己：什么都不做');
});

test('v912 vm：空名字 / 只有空格 / 找不到行 ⇒ 不发请求', () => {
  const fn = loadRenamePlan();
  assert.equal(fn(rows, 'el:汉堡', '').ok, false);
  assert.equal(fn(rows, 'el:汉堡', '   ').ok, false);
  assert.equal(fn(rows, 'el:汉堡', null).ok, false);
  assert.equal(fn(rows, 'el:不存在', '新名').ok, false, '行不在了（别人刚删过）⇒ 不动手');
  assert.equal(fn(null, 'el:汉堡', '汉堡包').ok, false, '词表没加载时不许乱发请求');
  assert.equal(fn(rows, 'el:汉堡', '汉堡\n包').to, '汉堡 包', '换行/多空格归一成一个空格');
});
