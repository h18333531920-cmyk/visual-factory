-- 2026-10-14 补齐 effect_tags 的改名/删除覆盖 + 预填 15 个效果词的相关词（sql/029）
--
-- 为什么需要这个文件：
--   ① 缺口：sql/027 的两个入口函数 vf_rename_tag / vf_delete_tag 只覆盖了 5 个位置
--      （逐图 ai_tags / manual_tags / excluded_tags、物料 material_type、素材 vf_source_files.tags），
--      **没有覆盖 sql/028 新加的 vf_preview_ai_tags.effect_tags**。后果：在词表页把「爆炸」改名或删除时，
--      物料上的 effect_tags 原封不动；而函数末尾那次 vf_sync_tag_vocabulary() 会把「库内在用但词表没有」的词
--      重新「收全」进去 ⇒ 旧词被补回词表，改一次弹回一次，来回拉锯。
--   ② 搜索容错：希望「搜『冲击力』也能命中标了『爆炸』的物料」。项目里现成的机制是「相关词」
--      （sql/024 的 vf_tag_vocabulary.related + app.js 的 tagVocabularyRelatedToZh 反向索引：
--       某行 related 里填了某个词，反过来搜这个词也会命中那一行）⇒ 给 15 个效果词各预填一版同义词即可。
--
-- 本文件做四件事：
--   1) 重新定义 public.vf_rename_tag（照抄 sql/027 的函数体，只多改 effect_tags 一处 + 返回值多一个 effectTags 计数）
--   2) 重新定义 public.vf_delete_tag（同上，从 effect_tags 里摘掉该词）
--   3) 把词表里「烟雾」的分类从 element 翻成 effect（sql/028 的 on conflict do nothing 没能把它翻过来，
--      而识别脚本只把 kind='effect' 的词喂给模型 ⇒ 模型看不到这个效果选项）
--   4) 给 15 个效果词预填 related（只在 related 为空时填，绝不覆盖人工已经填过的相关词）
--
-- ⚠️ effect_tags 的存法（与 vf_source_files.tags 不同，别套错）：
--   effect_tags 里存的是**明文中文词**（识别脚本 / 端点直接写 vf_tag_vocabulary 的 name_zh，
--   见 scripts/recognize-case-tags.mjs 与 functions/api/case-preview-ai-tags.js），
--   **没有** 'vf:case-*:v1:<百分号编码>' 那种编码形式。
--   所以这一维用「简单数组替换 + 去重」（vf_tag_rename_in_array 不传 prefixes）/ array_remove 即可，
--   sql/027 里那套百分号编码的解码匹配（vf_percent_encode / vf_percent_decode）是给素材 tags 用的，不要套到这里。
--
-- 幂等：可重复执行（create or replace；两处数据修正都带条件，重跑不再改动；权限段可重跑）。
-- 前提（必须在 sql/027、sql/028 之后执行）：
--   · sql/027：本文件要复用的辅助函数 vf_case_tag_prefixes / vf_set_tag_sync_triggers / vf_tag_rename_in_array /
--     vf_tag_remove_from_array 都在那里定义；
--   · sql/028：vf_preview_ai_tags.effect_tags 这一列在那里加。**028 没跑就跑本文件，两个函数在改写
--     effect_tags 时会报「column effect_tags does not exist」**（函数能建成，调用时才出错）。
--   · sql/025：vf_sync_tag_vocabulary() 是收尾对齐用的（sql/028 已把它升级成认 effect 的版本）。
--   ⚠️ 反过来要注意：以后若重跑了 sql/027，那两份**不含 effect_tags** 的旧函数体会把本文件的第 1、2 段盖回去
--     （027 里也是 create or replace）。那时把本文件重跑一遍即可恢复 —— 本文件本身怎么跑都不会坏数据。
-- 权限：两个入口函数都是 security definer + set search_path = public，能绕过 RLS 改写物料。
--      **只有服务端代理（service_role）可以调**（前端走 /api/account-data 代理，代理校验维护权限后用
--      service_role 身份转发）。anon / 登录 token 直接调会被拒 —— 故意的：这是全库级破坏性操作。
-- 执行方式：Supabase SQL Editor 整段粘贴执行（**用户自己跑，AI 不代跑** —— 这是写真实共享库的操作）。

-- ══ 1) 入口一：全库改名 public.vf_rename_tag(p_old, p_new) ════════════════
-- 相比 sql/027 的版本只改两处：
--   · 新增 3.6 段：把 effect_tags 里的 p_old 改成 p_new（明文替换 + 去重，不走百分号编码匹配）；
--   · 返回值多一个 effectTags = 被改写的逐图行数（原来那些 counts 字段全部保持原样）。
-- 返回 {"changed":true,"sources":N,"previews":N,"aiTags":N,"manualTags":N,"excludedTags":N,"effectTags":N,"merged":bool}
--   sources / previews / aiTags / manualTags / excludedTags / effectTags = 6 个位置各自被改写的行数
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
  v_effect int := 0;
begin
  if v_old = '' then raise exception '旧标签名不能为空' using errcode = '22023'; end if;
  if v_new = '' then raise exception '新标签名不能为空' using errcode = '22023'; end if;
  if v_old = v_new then
    return jsonb_build_object('changed', false, 'sources', 0, 'previews', 0,
                              'aiTags', 0, 'manualTags', 0, 'excludedTags', 0,
                              'effectTags', 0, 'merged', false);
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

    -- 3.6 动效效果标签 f（sql/028 加的列；**明文**，不传 prefixes ⇒ 不做百分号编码匹配）
    --     不补这一段的话，词表里改了名、物料上还是旧词，末尾的 vf_sync_tag_vocabulary() 会把旧词又收全回词表。
    update public.vf_preview_ai_tags a
    set effect_tags = public.vf_tag_rename_in_array(a.effect_tags, v_old, v_new)
    where public.vf_tag_rename_in_array(a.effect_tags, v_old, v_new) is distinct from a.effect_tags;
    get diagnostics v_effect = row_count;
  exception when others then
    -- 出错也一定把触发器恢复，并且按现状对齐一次，不留半开状态
    perform public.vf_set_tag_sync_triggers(true);
    perform public.vf_sync_tag_vocabulary();
    raise;
  end;

  perform public.vf_set_tag_sync_triggers(true);

  -- 3.7 最后对齐一次词表（收全 + 清孤儿）—— 别省，sql/025 的重算口径就是权威
  perform public.vf_sync_tag_vocabulary();

  return jsonb_build_object(
    'changed', true,
    'sources', v_sources,
    'previews', v_previews,
    'aiTags', v_ai,
    'manualTags', v_manual,
    'excludedTags', v_excluded,
    'effectTags', v_effect,
    'merged', v_merged
  );
end;
$$;

comment on function public.vf_rename_tag(text, text) is
  '把标签 p_old 全库改名成 p_new：改写 6 个位置（逐图 ai_tags / manual_tags / excluded_tags / effect_tags、物料 material_type、素材 tags 含 vf:case-*:v1:<编码> 写法）并给词表对齐；词表已有 p_new 时两个标签合并。不删任何物料行。';

-- ══ 2) 入口二：全库删除 public.vf_delete_tag(p_name) ═════════════════════
-- 同样只比 sql/027 多两处：新增 4.5 段（从 effect_tags 里 array_remove 掉该词）+ 返回值多一个 effectTags 计数。
-- 返回同样的计数结构（changed = 是否有任何改动；merged 恒为 false）；
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
  v_effect int := 0;
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

    -- 4.5 动效效果标签 f（sql/028 加的列；明文，直接 array_remove）
    --     不补这一段的话，物料上的旧效果词会在 4.6 被 vf_sync_tag_vocabulary() 收全回词表 —— 删了又回来。
    update public.vf_preview_ai_tags a
    set effect_tags = array_remove(a.effect_tags, v_name)
    where array_position(a.effect_tags, v_name) is not null;
    get diagnostics v_effect = row_count;

    -- 4.6 词表里这一行（只删词表行，不动物料）
    delete from public.vf_tag_vocabulary v where v.name_zh = v_name;
    get diagnostics v_vocab = row_count;
  exception when others then
    perform public.vf_set_tag_sync_triggers(true);
    perform public.vf_sync_tag_vocabulary();
    raise;
  end;

  perform public.vf_set_tag_sync_triggers(true);

  -- 4.7 对齐一次：上面都摘干净了，这个词不会又被"收全"补回来
  perform public.vf_sync_tag_vocabulary();

  return jsonb_build_object(
    'changed', (v_sources + v_previews + v_ai + v_manual + v_excluded + v_effect + v_vocab) > 0,
    'sources', v_sources,
    'previews', v_previews,
    'aiTags', v_ai,
    'manualTags', v_manual,
    'excludedTags', v_excluded,
    'effectTags', v_effect,
    'merged', false
  );
end;
$$;

comment on function public.vf_delete_tag(text) is
  '把标签 p_name 从全库所有物料上摘掉（6 个位置，含 sql/028 的 effect_tags）并从词表移除；不删任何物料行、不删图片。';

-- ══ 3) 数据修正：「烟雾」的分类翻成 effect ═══════════════════════════════
-- sql/028 插 15 个种子词用的是 on conflict (name_zh) do nothing ⇒ 库里早就以元素词身份存在的行
-- **不会被翻转 kind**。「烟雾」就卡在这里：它早就是元素词 ⇒ 在词表里是 kind='element'，
-- 而识别脚本只把 kind='effect' 的词喂给模型（scripts/recognize-case-tags.mjs 的 effectVocabularyFromRows，
-- 元素词表那边又反过来把 effect 剔掉）⇒ 模型根本看不到「烟雾」这个效果选项。
-- 带条件（kind is distinct from 'effect'）⇒ 重复执行不再改动（已经翻了就是 0 行）。
update public.vf_tag_vocabulary
set kind = 'effect', source = 'manual'
where name_zh = '烟雾' and kind is distinct from 'effect';

-- ══ 4) 给 15 个效果词预填「相关词」（同义词）══════════════════════════════
-- 目的（用户口径）：**搜「冲击力」也能命中标了「爆炸」的物料**。
-- 机制不是本文件新造的，是既有的「相关词」（sql/024）：某行 related 里填了某个词，
-- app.js 的 tagVocabularyRelatedToZh 会建反向索引 ⇒ 搜这个词时把它反解成这一行的 name_zh 参与匹配
-- （见 app.js 的 tagVocabularyQueryTerms，v905 那段）；而 effect_tags 本来就已经进了搜索文本。
-- 所以这里只要把「口语说法 / 近义说法」填进效果词的 related 即可 —— 不用重跑识别，改完刷新页面就生效
-- （词表是页面加载时读进浏览器的，见文件尾的验证提示）。
--
-- ⚠️ 两道硬上限（来自 app.js，与词表页输入框同一口径，别超）：
--   · 一行最多 8 个相关词（app.js 的 TAG_VOCABULARY_RELATED_MAX，见 parseRelatedWordsInput）；
--   · 单个词不超过 20 字（app.js 的 TAG_TRANSLATE_MAX_CHARS，同一个值也在 functions/_ai.js:1234）。
--
-- ⚠️ 只填**目前为空**的行（coalesce(array_length(related,1),0) = 0）⇒ 绝不会覆盖人工已经维护过的相关词，
--    也让这段可以反复跑（第二次跑时 related 已非空，命中 0 行）。
with draft(name_zh, words) as (
  values
    ('爆炸',       array['爆开', '爆发', '爆破', '冲击力', '四溅']::text[]),
    ('粒子',       array['碎屑', '颗粒', '星点']::text[]),
    ('光效',       array['光晕', '发光', '镭射', '光线']::text[]),
    ('水花',       array['溅水', '水滴', '水波']::text[]),
    ('烟雾',       array['雾气', '烟尘']::text[]),
    ('闪光',       array['闪烁', '闪一下', '亮闪']::text[]),
    ('缩放',       array['放大', '缩小', '推近', '拉远']::text[]),
    ('抖动',       array['震动', '晃动', '颤抖']::text[]),
    ('弹跳',       array['弹动', '弹出', '跳动', '蹦出']::text[]),
    ('旋转',       array['转动', '转圈', '打转']::text[]),
    ('滑入',       array['滑出', '推入', '平移', '横移']::text[]),
    ('展开',       array['铺开', '拉出', '翻开']::text[]),
    ('利益点凸显', array['突出优惠', '强调折扣', '卖点突出']::text[]),
    ('氛围营造',   array['气氛', '烘托', '场景氛围']::text[]),
    ('悬念引导',   array['悬念', '吊胃口', '勾起好奇']::text[])
)
update public.vf_tag_vocabulary v
set related = d.words
from draft d
where v.name_zh = d.name_zh
  and coalesce(array_length(v.related, 1), 0) = 0;

-- ══ 5) 权限：只给服务端代理（service_role）═══════════════════════════════
-- 与 sql/027 同一段（重新定义函数会让权限回到默认值，所以这里必须再声明一次 —— 可重复跑）。
-- 前端不直连 Supabase：所有 rest/rpc 请求都经 /api/account-data 代理，
-- 代理先校验维护权限，再用 service_role 身份转发 ⇒ 这两个函数只认代理。
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

-- ══ 6) 自检（跑完上面，逐条看结果）═══════════════════════════════════════
-- 6.1 effect_tags 列在不在（sql/028 跑过才有；应返回一行）
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vf_preview_ai_tags'
  and column_name = 'effect_tags';

-- 6.2 两个入口函数是否都重新定义成功、都是 security definer、函数体里真的有一句改写 effect_tags
--     （应返回 2 行，security_definer = true，改写effect_tags = true）
--     探针用的是 'set effect_tags'（语句片段，注释里不含这个串）—— 只查列名会被函数体注释骗过去。
select p.proname,
       pg_get_function_arguments(p.oid) as args,
       pg_get_function_result(p.oid) as returns,
       p.prosecdef as security_definer,
       position('set effect_tags' in pg_get_functiondef(p.oid)) > 0 as 改写effect_tags
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('vf_rename_tag', 'vf_delete_tag')
order by p.proname;

-- 6.3 「烟雾」的分类（应返回一行，kind = effect、source = manual）
--     若返回 0 行：说明词表里根本没这个词（库内没人用过、sql/028 的种子插入也没落上），
--     先跑一次 select public.vf_sync_tag_vocabulary(); 再看，或按 sql/028 的种子写法手工插入。
select id, name_zh, name_en, kind, source
from public.vf_tag_vocabulary
where name_zh = '烟雾';

-- 6.4 15 个效果词里有几行 related 非空（**应返回 15**）
select count(*) as related非空行数
from public.vf_tag_vocabulary
where name_zh in ('爆炸','粒子','光效','水花','烟雾','闪光','缩放','抖动','弹跳','旋转','滑入','展开',
                  '利益点凸显','氛围营造','悬念引导')
  and coalesce(array_length(related, 1), 0) > 0;

-- 6.5 逐行看相关词（条数应 ≤ 8、最长字数应 ≤ 20、kind 应 = effect），顺便确认没把人工填过的行冲掉
select v.name_zh,
       v.kind,
       array_length(v.related, 1) as 相关词条数,
       (select max(length(w)) from unnest(v.related) as w) as 最长字数,
       array_to_string(v.related, '，') as 相关词
from public.vf_tag_vocabulary v
where v.name_zh in ('爆炸','粒子','光效','水花','烟雾','闪光','缩放','抖动','弹跳','旋转','滑入','展开',
                    '利益点凸显','氛围营造','悬念引导')
order by v.name_zh;

-- ✅ 验证提示（**跑完再去前端看**）：
--    在素材库搜「冲击力」—— 应该能命中标了「爆炸」的动态物料
--    （「冲击力」经相关词反向索引展开成「爆炸」，而 effect_tags 已经在搜索文本里）；
--    同理搜「放大」「缩小」应命中标了「缩放」的物料。
--    若搜不到，按这个顺序排查：
--      a) 那批动态物料的 effect_tags 本身是不是空的 —— v918 之前识别过的动态物料不会自动补效果标签，
--         要跑一次识别脚本的 --force-dynamic（见 sql/028 文件尾与 scripts/recognize-case-tags.mjs 注释）；
--      b) 浏览器里的词表是页面加载时读进来的 —— 改完 related 记得**刷新页面**（或点词表页的刷新）再搜。
