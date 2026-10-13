-- 2026-10-13 标签统一管理（sql/027）：全库改名 / 删除一个标签
--
-- 目标（用户诉求）：
--   「如果我想批量修改某个标签，或者删除标签，通过词表统一管理是最方便的途径」
--   ⇒ 把团队管理页的「标签词表」从**只读字典**升级成标签的统一管理入口：
--     在词表上改一个中文名 = 全库所有挂着它的物料一起改名；删一个词 = 从全库所有物料上摘掉。
--
-- 为什么必须写数据库函数（为什么不能只改词表那一行）：
--   ① 词表（vf_tag_vocabulary）只是**字典**，物料上的标签才是真身，散落在 5 个位置：
--        a. public.vf_preview_ai_tags.ai_tags        （text[]，逐图 AI 标签）
--        b. public.vf_preview_ai_tags.manual_tags    （text[]，人工补充）
--        c. public.vf_preview_ai_tags.excluded_tags  （text[]，人工排除；列若不存在自动跳过）
--        d. public.vf_asset_previews.material_type   （text，物料类型/元素）
--        e. public.vf_source_files.tags              （text[]，素材/项目标签）
--   ② sql/025 的自动同步函数 public.vf_sync_tag_vocabulary() 会**把"只改了词表行"的改动撤销**：
--      它先「收全」（库内在用但词表没有的词补回来）、再「删孤儿」（词表有但库内没人用的词删掉）。
--      所以改名 / 删除必须**在数据库里一次性改写上述所有位置**，最后再调一次同步函数对齐。
--
-- ⚠️ 编码写法（任务 e 的坑）：vf_source_files.tags 里的值有两种形态 ——
--     · 明文：'吉祥物'
--     · 标记+百分号编码：'vf:case-element:v1:%E5%90%89%E7%A5%A5%E7%89%A9'
--       （app.js 的 CASE_ELEMENT_MARKER_PREFIX / CASE_ACTIVITY_MARKER_PREFIX / CASE_STRATEGY_MARKER_PREFIX，
--        值是 encodeURIComponent 的 UTF-8 百分号编码）
--   Postgres 没有内置 percent-encode，所以自带两个 immutable 辅助函数（编码 / 解码）。
--   匹配时**两种写法都认**：既按编码后的字面量相等匹配，也把编码段解码回来和标签名比较
--   （防止两边编码细节不同 —— 比如 JS 不转义的 !*'() 与我们保留集不一致 —— 而漏改）。
--
-- 幂等：可重复执行（create or replace，不创建表、不改数据）。
-- 前提：sql/022（词表）+ sql/024（related 列）已执行、sql/025（自动同步）已执行
--      —— 前两者已在真实库跑过（HANDOVER §11 记录）；sql/027 会调用 vf_sync_tag_vocabulary()。
-- 权限：两个入口函数都是 security definer + set search_path = public，能绕过 RLS 改写物料。
--      **只有服务端代理（service_role）可以调**：前端一律走 /api/account-data 代理，
--      代理先校验「开发者维护权限」，再用 service_role 身份转发（见 functions/_account-data-policy.js
--      的 RPC 白名单 + functions/api/account-data.js）。直接拿 anon / 登录 token 从浏览器调会被拒 ——
--      这是故意的：这两个函数是"全库级"的破坏性操作。
-- 执行方式：Supabase SQL Editor 整段粘贴执行（**用户自己跑，AI 不代跑** —— 这是写真实共享库的操作）。

-- ══ 1) 辅助：百分号编码 / 解码（与 JS encodeURIComponent 的 UTF-8 形式对齐）══════
-- 保留不编码的字符集 = A-Za-z0-9 . _ ~ -（其余字符按 UTF-8 逐字节转 %XX，十六进制大写）
create or replace function public.vf_percent_encode(p_text text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case when p_text is null then null else coalesce((
    select string_agg(
             case when c ~ '^[A-Za-z0-9._~-]$' then c
                  else '%' || upper(encode(convert_to(c, 'UTF8'), 'hex'))
             end, '')
    from (
      select substr(p_text, i, 1) as c
      from generate_series(1, length(p_text)) as g(i)
    ) chars
  ), '') end;
$$;

-- 解码：解不出来（坏编码 / 非法 UTF-8）返回 null —— 只用于"认得出这是不是同一个词"，不认识就当没这写法
create or replace function public.vf_percent_decode(p_text text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_out bytea := ''::bytea;
  v_i int := 1;
  v_len int;
  v_char text;
begin
  if p_text is null then return null; end if;
  v_len := length(p_text);
  while v_i <= v_len loop
    v_char := substr(p_text, v_i, 1);
    if v_char = '%' and v_i + 2 <= v_len and substr(p_text, v_i + 1, 2) ~ '^[0-9A-Fa-f]{2}$' then
      v_out := v_out || decode(substr(p_text, v_i + 1, 2), 'hex');
      v_i := v_i + 3;
    else
      v_out := v_out || convert_to(v_char, 'UTF8');
      v_i := v_i + 1;
    end if;
  end loop;
  return convert_from(v_out, 'UTF8');
exception when others then
  return null;
end;
$$;

comment on function public.vf_percent_encode(text) is
  'URL 百分号编码（UTF-8），与 JS encodeURIComponent 对齐；用于拼 vf:case-*:v1:<编码> 形式的标签。';
comment on function public.vf_percent_decode(text) is
  'URL 百分号解码；解不出来返回 null（只用来判断"这个编码标签是不是同一个词"）。';

-- 三种「自定义标签」标记前缀（与 app.js 的三个 CASE_*_MARKER_PREFIX 一一对应）
create or replace function public.vf_case_tag_prefixes()
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select array['vf:case-element:v1:', 'vf:case-activity:v1:', 'vf:case-strategy:v1:']::text[];
$$;

-- 数组内改名：明文与「前缀+编码」两种写法一起改，并保证结果数组无重复项。
-- p_prefixes 传 null 时只管明文（ai_tags / manual_tags / excluded_tags 都是明文）。
create or replace function public.vf_tag_rename_in_array(p_tags text[], p_old text, p_new text, p_prefixes text[] default null)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select case when p_tags is null then null else coalesce((
    select array_agg(picked.new_elem order by picked.idx)
    from (
      -- 同一个新值可能出现多次（原来就有重复 / 明文与编码都指向新名）⇒ 只留最早的那个位置
      select distinct on (marked.new_elem) marked.idx, marked.new_elem
      from (
        select u.ord as idx,
               case
                 when u.elem = p_old then p_new
                 else coalesce((
                   select prefix || public.vf_percent_encode(p_new)
                   from unnest(coalesce(p_prefixes, '{}'::text[])) as pf(prefix)
                   where u.elem = prefix || public.vf_percent_encode(p_old)
                      or (left(u.elem, length(prefix)) = prefix
                          and public.vf_percent_decode(substr(u.elem, length(prefix) + 1)) = p_old)
                   limit 1
                 ), u.elem)
               end as new_elem
        from unnest(p_tags) with ordinality as u(elem, ord)
      ) marked
      order by marked.new_elem, marked.idx
    ) picked
  ), '{}'::text[]) end;
$$;

comment on function public.vf_tag_rename_in_array(text[], text, text, text[]) is
  '把数组里的标签名从 p_old 改成 p_new（含 vf:case-*:v1:<编码> 写法），并去重；保持原有相对顺序。';

-- 数组内摘掉一个标签：明文用 array_remove，编码写法（前缀+解码等于该词）一并摘掉
create or replace function public.vf_tag_remove_from_array(p_tags text[], p_name text, p_prefixes text[] default null)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select case when p_tags is null then null else coalesce((
    select array_agg(u.elem order by u.ord)
    from unnest(array_remove(p_tags, p_name)) with ordinality as u(elem, ord)
    where not exists (
      select 1
      from unnest(coalesce(p_prefixes, '{}'::text[])) as pf(prefix)
      where left(u.elem, length(prefix)) = prefix
        and public.vf_percent_decode(substr(u.elem, length(prefix) + 1)) = p_name
    )
  ), '{}'::text[]) end;
$$;

comment on function public.vf_tag_remove_from_array(text[], text, text[]) is
  '从数组里摘掉一个标签（含 vf:case-*:v1:<编码> 写法）；不删任何物料行。';

-- ══ 2) 辅助：批量改写期间临时关掉「词表同步触发器」════════════════════════
-- 为什么：sql/026 把 UPDATE 触发器做成了**行级**（每改一行就全量重算一次词表）。
--   改一个用了 300 多行的标签 = 几百次全表重算，既慢又可能撞上 PostgREST 的语句超时。
--   所以批量改写前先关掉这几条触发器，改完再打开 + 手动对齐一次（对齐只跑一遍）。
-- 只动名字形如 vf_tag_sync% 的触发器（sql/025 / sql/026 建的那几条），
-- updated_at 之类的其它触发器**不受影响**。带异常兜底：出错也一定恢复。
create or replace function public.vf_set_tag_sync_triggers(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select c.relname as table_name, t.tgname as trigger_name
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
      and c.relname in ('vf_source_files', 'vf_asset_previews', 'vf_preview_ai_tags')
      and t.tgname like 'vf_tag_sync%'
  loop
    execute format('alter table public.%I %s trigger %I',
                   v_row.table_name,
                   case when p_enabled then 'enable' else 'disable' end,
                   v_row.trigger_name);
  end loop;
end;
$$;

comment on function public.vf_set_tag_sync_triggers(boolean) is
  '批量改写标签时临时开关 vf_tag_sync% 触发器（sql/025 + sql/026 建的词表同步触发器），改完必须打开并手动同步一次。';

-- ══ 3) 入口一：全库改名 public.vf_rename_tag(p_old, p_new) ════════════════
-- 返回 {"changed":true,"sources":N,"previews":N,"aiTags":N,"manualTags":N,"excludedTags":N,"merged":bool}
--   sources / previews / aiTags / manualTags / excludedTags = 5 个位置各自被改写的行数
--   merged = 词表里本来就有 p_new 那一行 ⇒ 两个标签合并（保留 p_new 行，删掉 p_old 行）
create or replace function public.vf_rename_tag(p_old text, p_new text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text := btrim(coalesce(p_old, ''));
  v_new text := btrim(coalesce(p_new, ''));
  v_prefixes text[] := public.vf_case_tag_prefixes();
  v_excluded_ready boolean := false;
  v_merged boolean := false;
  v_related text[];
  v_sources int := 0;
  v_previews int := 0;
  v_ai int := 0;
  v_manual int := 0;
  v_excluded int := 0;
begin
  if v_old = '' then raise exception '旧标签名不能为空' using errcode = '22023'; end if;
  if v_new = '' then raise exception '新标签名不能为空' using errcode = '22023'; end if;
  if v_old = v_new then
    return jsonb_build_object('changed', false, 'sources', 0, 'previews', 0,
                              'aiTags', 0, 'manualTags', 0, 'excludedTags', 0, 'merged', false);
  end if;

  begin
    perform public.vf_set_tag_sync_triggers(false);

    -- 3.1 词表：撞名就合并（保留 p_new 那行、related 取并集），否则把 p_old 那行的 name_zh / id 改成新名
    --     · 合并分支把保留行标 source='manual'：两个词是人手工合并的，英文名按"人工确认过"处理，
    --       不再被机翻覆盖（functions/api/tag-translate.js 会跳过 source='manual' 的行）。
    --     · 纯改名分支**不动 source**：改的只是名字，原来没英文名的行还要能被「补翻译」补上。
    if exists (select 1 from public.vf_tag_vocabulary v where v.name_zh = v_new) then
      v_merged := true;
      select coalesce(array_agg(distinct w order by w), '{}'::text[]) into v_related
      from (
        select unnest(coalesce(a.related, '{}'::text[])) as w
        from public.vf_tag_vocabulary a where a.name_zh = v_old
        union all
        select unnest(coalesce(b.related, '{}'::text[])) as w
        from public.vf_tag_vocabulary b where b.name_zh = v_new
      ) t;
      update public.vf_tag_vocabulary v
      set source = 'manual', related = v_related
      where v.name_zh = v_new;
      delete from public.vf_tag_vocabulary v where v.name_zh = v_old;
    else
      update public.vf_tag_vocabulary v
      set name_zh = v_new,
          -- id 约定是 'el:<中文名>'；万一新 id 已经被别的行占着，就只改名字、不动 id（不撞主键）
          id = case
                 when exists (select 1 from public.vf_tag_vocabulary o
                              where o.id = 'el:' || v_new and o.name_zh <> v_old)
                   then v.id
                 else 'el:' || v_new
               end
      where v.name_zh = v_old;
    end if;

    -- 3.2 逐图 AI 标签 a / b
    update public.vf_preview_ai_tags a
    set ai_tags = public.vf_tag_rename_in_array(a.ai_tags, v_old, v_new)
    where public.vf_tag_rename_in_array(a.ai_tags, v_old, v_new) is distinct from a.ai_tags;
    get diagnostics v_ai = row_count;

    update public.vf_preview_ai_tags a
    set manual_tags = public.vf_tag_rename_in_array(a.manual_tags, v_old, v_new)
    where public.vf_tag_rename_in_array(a.manual_tags, v_old, v_new) is distinct from a.manual_tags;
    get diagnostics v_manual = row_count;

    -- 3.3 人工排除 c（列不存在就跳过 —— 老库里可能没有这列）
    select exists (
      select 1 from pg_attribute
      where attrelid = to_regclass('public.vf_preview_ai_tags')
        and attname = 'excluded_tags' and attnum > 0 and not attisdropped
    ) into v_excluded_ready;
    if v_excluded_ready then
      execute $q$
        update public.vf_preview_ai_tags a
        set excluded_tags = public.vf_tag_rename_in_array(a.excluded_tags, $1, $2)
        where public.vf_tag_rename_in_array(a.excluded_tags, $1, $2) is distinct from a.excluded_tags
      $q$ using v_old, v_new;
      get diagnostics v_excluded = row_count;
    end if;

    -- 3.4 物料类型/元素 d
    update public.vf_asset_previews p
    set material_type = v_new
    where p.material_type = v_old;
    get diagnostics v_previews = row_count;

    -- 3.5 素材标签 e（明文 + 编码两种写法）
    update public.vf_source_files s
    set tags = public.vf_tag_rename_in_array(s.tags, v_old, v_new, v_prefixes)
    where public.vf_tag_rename_in_array(s.tags, v_old, v_new, v_prefixes) is distinct from s.tags;
    get diagnostics v_sources = row_count;
  exception when others then
    -- 出错也一定把触发器恢复，并且按现状对齐一次，不留半开状态
    perform public.vf_set_tag_sync_triggers(true);
    perform public.vf_sync_tag_vocabulary();
    raise;
  end;

  perform public.vf_set_tag_sync_triggers(true);

  -- 3.6 最后对齐一次词表（收全 + 清孤儿）—— 别省，sql/025 的重算口径就是权威
  perform public.vf_sync_tag_vocabulary();

  return jsonb_build_object(
    'changed', true,
    'sources', v_sources,
    'previews', v_previews,
    'aiTags', v_ai,
    'manualTags', v_manual,
    'excludedTags', v_excluded,
    'merged', v_merged
  );
end;
$$;

comment on function public.vf_rename_tag(text, text) is
  '把标签 p_old 全库改名成 p_new：改写 5 个位置（逐图 ai_tags / manual_tags / excluded_tags、物料 material_type、素材 tags 含 vf:case-*:v1:<编码> 写法）并给词表对齐；词表已有 p_new 时两个标签合并。不删任何物料行。';

-- ══ 4) 入口二：全库删除 public.vf_delete_tag(p_name) ═════════════════════
-- 返回同样的计数结构（changed = 是否有任何改动；merged 恒为 false）
-- 只"摘标签"：不删物料行、不删预览图、不删文件。
create or replace function public.vf_delete_tag(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_prefixes text[] := public.vf_case_tag_prefixes();
  v_excluded_ready boolean := false;
  v_vocab int := 0;
  v_sources int := 0;
  v_previews int := 0;
  v_ai int := 0;
  v_manual int := 0;
  v_excluded int := 0;
begin
  if v_name = '' then raise exception '标签名不能为空' using errcode = '22023'; end if;

  begin
    perform public.vf_set_tag_sync_triggers(false);

    -- 4.1 逐图 AI 标签 a / b（明文，array_remove）
    update public.vf_preview_ai_tags a
    set ai_tags = array_remove(a.ai_tags, v_name)
    where array_position(a.ai_tags, v_name) is not null;
    get diagnostics v_ai = row_count;

    update public.vf_preview_ai_tags a
    set manual_tags = array_remove(a.manual_tags, v_name)
    where array_position(a.manual_tags, v_name) is not null;
    get diagnostics v_manual = row_count;

    -- 4.2 人工排除 c（列不存在就跳过）
    select exists (
      select 1 from pg_attribute
      where attrelid = to_regclass('public.vf_preview_ai_tags')
        and attname = 'excluded_tags' and attnum > 0 and not attisdropped
    ) into v_excluded_ready;
    if v_excluded_ready then
      execute $q$
        update public.vf_preview_ai_tags a
        set excluded_tags = array_remove(a.excluded_tags, $1)
        where array_position(a.excluded_tags, $1) is not null
      $q$ using v_name;
      get diagnostics v_excluded = row_count;
    end if;

    -- 4.3 物料类型/元素 d：置空串（列是 not null default ''，不能写 null）
    update public.vf_asset_previews p
    set material_type = ''
    where p.material_type = v_name;
    get diagnostics v_previews = row_count;

    -- 4.4 素材标签 e（明文 + 编码两种写法）
    update public.vf_source_files s
    set tags = public.vf_tag_remove_from_array(s.tags, v_name, v_prefixes)
    where public.vf_tag_remove_from_array(s.tags, v_name, v_prefixes) is distinct from s.tags;
    get diagnostics v_sources = row_count;

    -- 4.5 词表里这一行（只删词表行，不动物料）
    delete from public.vf_tag_vocabulary v where v.name_zh = v_name;
    get diagnostics v_vocab = row_count;
  exception when others then
    perform public.vf_set_tag_sync_triggers(true);
    perform public.vf_sync_tag_vocabulary();
    raise;
  end;

  perform public.vf_set_tag_sync_triggers(true);

  -- 4.6 对齐一次：上面都摘干净了，这个词不会又被"收全"补回来
  perform public.vf_sync_tag_vocabulary();

  return jsonb_build_object(
    'changed', (v_sources + v_previews + v_ai + v_manual + v_excluded + v_vocab) > 0,
    'sources', v_sources,
    'previews', v_previews,
    'aiTags', v_ai,
    'manualTags', v_manual,
    'excludedTags', v_excluded,
    'merged', false
  );
end;
$$;

comment on function public.vf_delete_tag(text) is
  '把标签 p_name 从全库所有物料上摘掉（5 个位置）并从词表移除；不删任何物料行、不删图片。';

-- ══ 5) 权限：只给服务端代理（service_role）═══════════════════════════════
-- 前端不直连 Supabase：所有 rest/rpc 请求都经 /api/account-data 代理，
-- 代理先校验维护权限，再用 service_role 身份转发 ⇒ 这两个函数只认代理。
-- （直接拿 anon / 登录 token 从浏览器调会被拒，故意的：全库级破坏性操作不该对普通账号开放。）
do $$
declare
  r text;
begin
  foreach r in array array['public', 'anon', 'authenticated'] loop
    if r = 'public' or exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function public.vf_rename_tag(text, text) from %s', r);
      execute format('revoke all on function public.vf_delete_tag(text) from %s', r);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.vf_rename_tag(text, text) to service_role';
    execute 'grant execute on function public.vf_delete_tag(text) to service_role';
  end if;
end $$;

-- ══ 6) 自检：跑完这两条 select，确认函数都在、都是 security definer ══════
-- 6.1 两个入口函数（应各返回一行，security_definer = true）
select p.proname,
       pg_get_function_arguments(p.oid) as args,
       pg_get_function_result(p.oid) as returns,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('vf_rename_tag', 'vf_delete_tag')
order by p.proname;

-- 6.2 辅助函数 + 词表同步触发器是否齐全（sql/025、sql/026 一起查）
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('vf_percent_encode', 'vf_percent_decode', 'vf_case_tag_prefixes',
                    'vf_tag_rename_in_array', 'vf_tag_remove_from_array',
                    'vf_set_tag_sync_triggers', 'vf_sync_tag_vocabulary')
order by p.proname;

select c.relname as table_name, t.tgname as trigger_name, t.tgenabled
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal and t.tgname like 'vf_tag_sync%'
order by c.relname, t.tgname;
-- tgenabled 全部应该是 'O'（启用）。若有 'D' 说明上一次改名/删除中途出过错，执行：
--   select public.vf_set_tag_sync_triggers(true);
