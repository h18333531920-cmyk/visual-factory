-- 2026-10-14 「人工动效标签」的独立一层（sql/031）
--
-- 目标（用户口径，原话）：
--   「GIF 类型的物料的动态标签也要在后面加一个小加号的按钮支持手动添加，
--     添加后要确保会录入到后端和词表里。」
--
-- 为什么必须**新开一列**（这是本文件存在的唯一理由）：
--   vf_preview_ai_tags.effect_tags（sql/028）是 **AI 层**：每次重新识别都会被 scripts/recognize-case-tags.mjs
--   的 buildSuccessRow() / 端点 save 动作**整体覆盖**（它是"这一次模型看到的效果类型"）。
--   人工加的词如果塞进 effect_tags，**下次识别就没了** —— 和元素标签当年必须把 manual_tags 单开一列是同一个道理。
--   所以人工动效词单独存 manual_effect_tags，与 effect_tags 并列、互不覆盖：
--     · manual_effect_tags 只由人工动作写（端点 manual-effect-add / manual-effect-remove），
--       识别脚本与 save 一律**原样保留**它（绝不覆盖）；
--     · 界面上两者**分开显示**（人工的用绿色 .is-manual 小 chip + × 可删），搜索文本里**合在一起**（都能搜到）。
--
-- 三件事（与 sql/028 一一对应）：
--   ① vf_preview_ai_tags 加一列 manual_effect_tags（text[]，默认空数组）；
--   ② 更新词表同步函数 vf_sync_tag_vocabulary()：收全的 union 里加上 unnest(manual_effect_tags)（kind 归 'effect'），
--      删孤儿的 used 集合也加上它 —— 手工加的词因此**自动进词表**（用户要的"确保录入到词表里"靠这一步，
--      前端不需要额外做任何事，行级触发器会调它）；
--   ③ 重建 vf_preview_ai_tags 的 UPDATE 行级触发器，WHEN 里加上 manual_effect_tags
--      （不加这一条，写人工动效标签不会触发词表重算，新词要等到下次别的标签变更才进词表）。
--
-- 幂等：可重复执行（add column if not exists / create or replace / drop trigger if exists + create）。
-- 执行顺序：**必须在 sql/028 之后**（本文件第 2 段是照抄 028 的函数体再改的；028 没跑就跑本文件，
--          函数里会引用不存在的 effect_tags 列，调用时报「column effect_tags does not exist」）。
--          同样地：以后若重跑了 sql/025 / sql/026 / sql/028，它们会把本文件的第 2、3 段盖回去 ——
--          把本文件（第 2、3 段）再跑一遍即可恢复。本文件本身反复跑不会坏数据。
-- 执行方式：Supabase SQL Editor 整段粘贴执行（**用户自己跑，AI 不代跑** —— 这是写真实共享库的操作）。
--
-- 词汇口径（沿用 v918 那条有意例外）：kind='effect' 的行**永远不被"删孤儿"清掉**（效果词是人工维护的
--   受控词表，按"没人用就删"会在还没识别动态物料时把种子词删光）。本文件不动那条例外。

-- ── 1) 加列 ────────────────────────────────────────────────────────
-- 与 ai_tags / manual_tags / excluded_tags / effect_tags 同款：text[]、not null、默认空数组。
-- 带默认值的 add column 在 PG 11+ 是元数据操作，不重写表（这张表千级行，随便跑）。
alter table public.vf_preview_ai_tags
  add column if not exists manual_effect_tags text[] not null default '{}'::text[];

comment on column public.vf_preview_ai_tags.manual_effect_tags is
  '人工动效标签（v926）：只在浮窗「动效标签」那一行点 ＋ 手工添加，或从这一层手工删除。与 AI 层 effect_tags 并列、互不覆盖（effect_tags 每次重识别会被整体覆盖，所以人工的必须单开一列）。词表由 vf_sync_tag_vocabulary() 自动收，kind 归 effect。';

-- ── 2) 词表同步函数：收全带 manual_effect_tags，删孤儿也放它 ──────────
-- 照抄 sql/028 的实现，只改两处：
--   · 收全的 labels CTE 多一路 union：unnest(manual_effect_tags) → 'effect'
--     （同一个词同时出现在元素与效果来源时，clean 里的 min(kind) 取 'effect'，与 028 同口径）；
--   · 删孤儿的 used 集合多 || a.manual_effect_tags（词表里不能把"人工刚加、还没有物料在用它"当孤儿）。
create or replace function public.vf_sync_tag_vocabulary()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 2.1 收全：五处来源的标签并集（排除空串与 vf: 内部标记），并带上这一维的 kind
  with labels as (
    select unnest(tags) as name_zh, 'element'::text as kind from public.vf_source_files
    union
    select material_type, 'element'::text from public.vf_asset_previews
    union
    select unnest(manual_tags), 'element'::text from public.vf_preview_ai_tags
    union
    select unnest(ai_tags), 'element'::text from public.vf_preview_ai_tags
    union
    select unnest(effect_tags), 'effect'::text from public.vf_preview_ai_tags
    -- v926：人工动效标签（人工那一条）—— 与 effect_tags 一样归 effect
    union
    select unnest(manual_effect_tags), 'effect'::text from public.vf_preview_ai_tags
  ), clean as (
    -- 同一个词若同时出现在元素与效果两处，**效果优先**（'effect' < 'element'，min 取到它）：
    -- 效果词表是人工维护的受控维度，标成 element 会让它在词表页看不出"这是个动效词"。
    -- 已经存在的行不会被翻转（on conflict do nothing），理由见 028 的「已知取舍」。
    select name_zh, min(kind) as kind
    from (
      select btrim(name_zh) as name_zh, kind
      from labels
      where name_zh is not null
        and btrim(name_zh) <> ''
        and btrim(name_zh) not like 'vf:%'
    ) t
    group by name_zh
  )
  insert into public.vf_tag_vocabulary (id, name_zh, kind, source)
  select 'el:' || name_zh, name_zh, kind, 'auto'
  from clean
  on conflict (name_zh) do nothing;

  -- 2.2 删孤儿：词表里库内已经没人用的标签（名实相符才留着）
  -- ⚠️ v918 的**有意例外**（本文件不动它）：kind='effect' 的行**永不删** ——
  --    效果词表是人工维护的受控词表（15 个种子词 + 人工补的词），识别时模型被要求"只从这份词表里挑"；
  --    若按"库里没人用就删"，刚上线还没识别到动态物料时种子词会被删光，词表自我萎缩。
  -- v926：人工动效标签（manual_effect_tags）也进 used —— 用户手工加的词立刻算"在用"，
  --    不会被下一次同步当孤儿清掉（它通常本来也是 effect，两重保险）。
  with used as (
    select distinct btrim(x) as name_zh from public.vf_source_files s, unnest(s.tags) as x
    union
    select distinct btrim(p.material_type) from public.vf_asset_previews p
    union
    select distinct btrim(x) from public.vf_preview_ai_tags a,
      unnest(a.manual_tags || a.ai_tags || a.effect_tags || a.manual_effect_tags) as x
  ), used_clean as (
    select name_zh from used where name_zh is not null and name_zh <> '' and name_zh not like 'vf:%'
  )
  delete from public.vf_tag_vocabulary v
  where v.kind is distinct from 'effect'
    and btrim(v.name_zh) not in (select name_zh from used_clean);
end;
$$;

comment on function public.vf_sync_tag_vocabulary() is
  '把 vf_tag_vocabulary 对齐成「站内正在用的全部标签」：收全（按来源标 kind：元素/物料类型→element，effect_tags / manual_effect_tags→effect）+ 删孤儿（只在缺词条时插入，不覆盖人工编辑）。例外：kind=''effect'' 的行永不删（人工维护的受控效果词表）。';

-- 允许登录用户手动触发一次（前端「同步库内标签」按钮用）—— 重复声明不报错
grant execute on function public.vf_sync_tag_vocabulary() to authenticated;

-- ── 3) 重建 vf_preview_ai_tags 的 UPDATE 触发器 ─────────────────────
-- sql/026 把这条 UPDATE 触发器做成了「行级 + WHEN 条件」，只有标签列真变了才重算词表
-- （逐图识别每张图写两次 status，不加 WHEN 就是几千次全量重算）。
-- v918 加了 effect_tags、v926 又加了 manual_effect_tags ⇒ WHEN 条件必须带上它们，
-- 否则人工加一个动效词**不会触发词表重算**（词表要等到下次别的标签变更才补上，用户会觉得"没进去"）。
-- 只重建这一条：_ins / _del 两条语句级触发器（sql/026 建的）保持原样不动。
drop trigger if exists vf_tag_sync_preview_ai_tags_upd on public.vf_preview_ai_tags;
create trigger vf_tag_sync_preview_ai_tags_upd
after update on public.vf_preview_ai_tags
for each row
when (old.ai_tags is distinct from new.ai_tags
   or old.manual_tags is distinct from new.manual_tags
   or old.effect_tags is distinct from new.effect_tags
   or old.manual_effect_tags is distinct from new.manual_effect_tags)
execute function public.vf_sync_tag_vocabulary_trigger();

-- ── 4) 立刻对齐一次词表 ─────────────────────────────────────────────
select public.vf_sync_tag_vocabulary();

-- ── 5) 自检（跑完上面，逐条看结果）────────────────────────────────────
-- 5.1 列在不在（应返回一行：manual_effect_tags / ARRAY / NO / '{}'::text[]）
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vf_preview_ai_tags'
  and column_name = 'manual_effect_tags';

-- 5.2 同步函数有没有把人工动效层收进来（三个 true 才算改到位）
select
  position('manual_effect_tags' in pg_get_functiondef(p.oid)) > 0 as 收全含manual_effect_tags,
  position('a.effect_tags || a.manual_effect_tags' in pg_get_functiondef(p.oid)) > 0 as 删孤儿used含它,
  position('v.kind is distinct from ''effect''' in pg_get_functiondef(p.oid)) > 0 as 孤儿清理放过effect
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'vf_sync_tag_vocabulary';

-- 5.3 触发器 WHEN 条件对不对（认manual_effect变更 必须是 true；粒度应是 ROW）
select t.tgname as 触发器,
       case when (t.tgtype::int & 1) = 1 then 'ROW' else 'STATEMENT' end as 粒度,
       pg_get_triggerdef(t.oid) like '%manual_effect_tags%' as 认manual_effect变更,
       pg_get_triggerdef(t.oid) as 定义
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where c.relname = 'vf_preview_ai_tags'
  and not t.tgisinternal
  and t.tgname like 'vf_tag_sync%'
order by t.tgname;
-- 应当看到 3 行：_ins / _del 是 STATEMENT，_upd 是 ROW 且 认manual_effect变更 = true。

-- 5.4 「人工动效词已进词表」——把某个真在用的词换成你刚手工加的那个，应返回它的 kind='effect' 那一行
select id, name_zh, name_en, kind, source
from public.vf_tag_vocabulary
where btrim(name_zh) in (
  select distinct btrim(x)
  from public.vf_preview_ai_tags a, unnest(a.manual_effect_tags) as x
  where btrim(x) <> ''
)
order by name_zh;
-- 返回 0 行 = 还没有任何人工动效标签（新列刚建好是正常的）；加了词之后再看这里应该有 1 行。

-- 以后想手动重算一次词表：select public.vf_sync_tag_vocabulary();
