-- 2026-10-14 「动态物料效果标签」的存储与词表（sql/028）
--
-- 目标（用户口径，原话）：
--   「动态弹窗跟静态物料的标签识别要有区别，除了识别元素标签外，**还要识别弹窗的效果类型标签**，
--     比如爆炸、冲击力、场景氛围、体现利益点等类型的标签。」「动态的标签、**可搜索**。」
-- 现状（v917 起）：动态物料（gif/mp4/mov/webm）已经会抽「中间帧 + 最后一帧」送模型，但提示词只问
--   元素和活动主题 ⇒ 出来的全是元素，没有任何"这段动效是什么效果"的描述。
-- 本文件提供这一维的**落库位置 + 词表**（写识别结果的是 v918 的脚本与端点，不在本文件里）。
--
-- 三件事：
--   ① vf_preview_ai_tags 加一列 effect_tags（text[]，默认空数组）—— 与 ai_tags / manual_tags 并列的**独立一维**，
--      不混进 ai_tags：元素是"画面里有什么"，效果是"这段动效/弹窗在做什么"，两者要能各自筛、各自搜。
--   ② 更新词表同步函数 vf_sync_tag_vocabulary()：把 effect_tags 也收进词表并标 kind='effect'
--      （原来 kind 写死 'element'）；删孤儿覆盖 effect_tags，但 **kind='effect' 的行永不删**。
--   ③ 重建 vf_preview_ai_tags 的 UPDATE 行级触发器（sql/026 建的那条），WHEN 条件加上 effect_tags。
--   ④ 插 15 个效果种子词（人工维护的受控词表）+ 自检 SQL。
--
-- 幂等：可重复执行（add column if not exists / create or replace / drop trigger if exists / on conflict do nothing）。
-- 前提：sql/021（逐图标签表）+ sql/022（词表）+ sql/025（自动同步）+ sql/026（触发器调优）已执行。
-- 执行方式：Supabase SQL Editor 整段粘贴执行（**用户自己跑，AI 不代跑** —— 这是写真实共享库的操作）。
--
-- ⚠️ 执行顺序（别把本文件的改动盖回去）：
--   sql/025 和 sql/026 里都是 `create or replace` / 重建触发器 —— 它们**不含** effect_tags 这一维。
--   所以本文件要在 sql/025、sql/026 **之后**执行；万一后来又重跑了 025 或 026，
--   把本文件（第 2、3 段）再跑一遍即可恢复。本文件本身可以反复跑，不会坏数据。
--
-- ⚠️ 已知取舍（本文件没法自动决定的那一处）：
--   15 个种子词用 `on conflict (name_zh) do nothing` 插入 ⇒ **不覆盖已存在的行、也不翻转它的 kind**。
--   若某个词（例如「水花」）早就以元素词的身份在词表里，它不会被改成 effect，脚本读效果词表
--   （kind='effect'）时也就读不到它。第 6.4 段的自检会把这种情况列出来，处理办法写在那边。

-- ── 1) 加列 ────────────────────────────────────────────────────────
-- 与 ai_tags / manual_tags / excluded_tags 同款：text[]、not null、默认空数组。
-- 带默认值的 add column 在 PG 11+ 是元数据操作，不重写表（这张表千级行，随便跑）。
alter table public.vf_preview_ai_tags
  add column if not exists effect_tags text[] not null default '{}'::text[];

comment on column public.vf_preview_ai_tags.effect_tags is
  '动效/弹窗效果标签（v918）：只由动态物料（gif/mp4/mov/webm 抽帧识别）写入；词表受控，候选词来自 vf_tag_vocabulary 里 kind=''effect'' 的行。静态物料一律为空数组。';

-- ── 2) 词表同步函数：收全要带 kind，删孤儿放过 effect ────────────────
-- 照抄 sql/025 的实现，只改两处：
--   · 收全的 CTE 现在**带 kind 一起输出**（ai_tags / manual_tags / material_type / tags → 'element'，
--     effect_tags → 'effect'），插入时用这个 kind，**不再写死 'element'**；
--   · 删孤儿覆盖 effect_tags，但 **kind='effect' 的行永远不删**（见下面的注释）。
create or replace function public.vf_sync_tag_vocabulary()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 2.1 收全：四处来源的标签并集（排除空串与 vf: 内部标记），并带上这一维的 kind
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
  ), clean as (
    -- 同一个词若同时出现在元素与效果两处，**效果优先**（'effect' < 'element'，min 取到它）：
    -- 效果词表是人工维护的受控维度，标成 element 会让它在词表页看不出"这是个动效词"。
    -- 已经存在的行不会被翻转（on conflict do nothing），理由见文件尾的「已知取舍」。
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
  -- ⚠️ v918 的**有意例外**：kind='effect' 的行**永不删**。
  --    元素词表是从物料上自动长出来的（没人用了就该消失，sql/025 定的口径）；
  --    效果词表**相反**——它是人工维护的**受控词表**（15 个种子词，见下），识别时模型被要求
  --    "只从这份词表里挑"。如果它也按"库里没人用"清理，那么某个效果词在库里一时没有命中
  --    （比如刚上线还没识别动态物料）就会被删掉，模型从此再也挑不到它 —— 词表会自我萎缩。
  --    所以这里只放过 effect：其它 kind（element / material_type / …）仍然是"没人用就删"。
  with used as (
    select distinct btrim(x) as name_zh from public.vf_source_files s, unnest(s.tags) as x
    union
    select distinct btrim(p.material_type) from public.vf_asset_previews p
    union
    select distinct btrim(x) from public.vf_preview_ai_tags a, unnest(a.manual_tags || a.ai_tags || a.effect_tags) as x
  ), used_clean as (
    select name_zh from used where name_zh is not null and name_zh <> '' and name_zh not like 'vf:%'
  )
  delete from public.vf_tag_vocabulary v
  where v.kind is distinct from 'effect'
    and btrim(v.name_zh) not in (select name_zh from used_clean);
end;
$$;

comment on function public.vf_sync_tag_vocabulary() is
  '把 vf_tag_vocabulary 对齐成「站内正在用的全部标签」：收全（按来源标 kind：元素/物料类型→element，effect_tags→effect）+ 删孤儿（只在缺词条时插入，不覆盖人工编辑）。例外：kind=''effect'' 的行永不删（人工维护的受控效果词表）。';

-- 允许登录用户手动触发一次（前端「同步库内标签」按钮用）—— sql/025 已授过，这里再声明一次，重复跑不报错
grant execute on function public.vf_sync_tag_vocabulary() to authenticated;

-- ── 3) 重建 vf_preview_ai_tags 的 UPDATE 触发器 ─────────────────────
-- sql/026 把这条 UPDATE 触发器做成了「行级 + WHEN 条件」，只有标签列真变了才重算词表
-- （逐图识别每张图写两次 status，不加 WHEN 就是几千次全量重算）。
-- v918 多了 effect_tags 这一列 ⇒ WHEN 条件必须加上它，否则**写效果标签不会触发词表重算**，
-- 新出现的效果词要等到下次别的标签变更才进词表。
-- 只重建这一条：_ins / _del 两条语句级触发器（sql/026 建的）保持原样不动。
drop trigger if exists vf_tag_sync_preview_ai_tags_upd on public.vf_preview_ai_tags;
create trigger vf_tag_sync_preview_ai_tags_upd
after update on public.vf_preview_ai_tags
for each row
when (old.ai_tags is distinct from new.ai_tags
   or old.manual_tags is distinct from new.manual_tags
   or old.effect_tags is distinct from new.effect_tags)
execute function public.vf_sync_tag_vocabulary_trigger();

-- ── 4) 15 个效果种子词（kind='effect'，source='manual'）─────────────
-- 三个维度各 5 个：视觉特效 / 运动方式 / 表达目的。
-- id 沿用既有约定 'el:<中文名>'（见 sql/022 的表注释与 sql/027 的改名函数）。
-- on conflict (name_zh) do nothing：**不覆盖**已经存在的行（可能是人工改过英文名的），
-- 也不翻转它的 kind —— 已知取舍见文件尾。
insert into public.vf_tag_vocabulary (id, name_zh, kind, source) values
  ('el:爆炸',       '爆炸',       'effect', 'manual'),
  ('el:粒子',       '粒子',       'effect', 'manual'),
  ('el:光效',       '光效',       'effect', 'manual'),
  ('el:水花',       '水花',       'effect', 'manual'),
  ('el:烟雾',       '烟雾',       'effect', 'manual'),
  ('el:闪光',       '闪光',       'effect', 'manual'),
  ('el:缩放',       '缩放',       'effect', 'manual'),
  ('el:抖动',       '抖动',       'effect', 'manual'),
  ('el:弹跳',       '弹跳',       'effect', 'manual'),
  ('el:旋转',       '旋转',       'effect', 'manual'),
  ('el:滑入',       '滑入',       'effect', 'manual'),
  ('el:展开',       '展开',       'effect', 'manual'),
  ('el:利益点凸显', '利益点凸显', 'effect', 'manual'),
  ('el:氛围营造',   '氛围营造',   'effect', 'manual'),
  ('el:悬念引导',   '悬念引导',   'effect', 'manual')
on conflict (name_zh) do nothing;

-- ── 5) 立刻对齐一次词表 ─────────────────────────────────────────────
-- 顺序上放在种子词之后：这样跑完这一句，词表里既有 15 个效果词，也有库里正在用的全部元素词。
select public.vf_sync_tag_vocabulary();

-- ── 6) 自检（跑完上面，逐条看结果）────────────────────────────────────
-- 6.1 列在不在（应返回一行：effect_tags / ARRAY / NO / '{}'::text[]）
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vf_preview_ai_tags'
  and column_name = 'effect_tags';

-- 6.2 同步函数有没有把 effect 收进来（三个 true 才算改到位）
select
  position('effect_tags' in pg_get_functiondef(p.oid)) > 0 as 收全含effect_tags,
  position('''effect''' in pg_get_functiondef(p.oid)) > 0 as 写入按来源给kind,
  position('v.kind is distinct from ''effect''' in pg_get_functiondef(p.oid)) > 0 as 孤儿清理放过effect
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'vf_sync_tag_vocabulary';

-- 6.3 触发器 WHEN 条件对不对（认effect变更 必须是 true；粒度应是 ROW）
select t.tgname as 触发器,
       case when (t.tgtype::int & 1) = 1 then 'ROW' else 'STATEMENT' end as 粒度,
       pg_get_triggerdef(t.oid) like '%effect_tags%' as 认effect变更,
       pg_get_triggerdef(t.oid) as 定义
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where c.relname = 'vf_preview_ai_tags'
  and not t.tgisinternal
  and t.tgname like 'vf_tag_sync%'
order by t.tgname;
-- 应当看到 3 行：_ins / _del 是 STATEMENT，_upd 是 ROW 且 认effect变更 = true。

-- 6.4 15 个种子词在不在（应返回 15 行、15 个 kind='effect'）
select count(*) as effect词数 from public.vf_tag_vocabulary where kind = 'effect';

select id, name_zh, name_en, kind, source
from public.vf_tag_vocabulary
where name_zh in ('爆炸','粒子','光效','水花','烟雾','闪光','缩放','抖动','弹跳','旋转','滑入','展开',
                  '利益点凸显','氛围营造','悬念引导')
order by kind, id;
-- ⚠️ 若某一行 kind 不是 'effect'（而是 'element'）：说明这个词**早就**以元素词的身份在词表里
--    （on conflict do nothing 不覆盖已有行，不会翻转 kind）。处理办法二选一：
--      a) 手工改：update public.vf_tag_vocabulary set kind='effect', source='manual' where name_zh='水花';
--      b) 或者不动它 —— 代价是脚本读效果词表（kind='effect'）时读不到这个词，模型挑不到它。
--    两个词表语义上确实重叠时（水花 既是元素也可以是效果），按 a) 改更符合"效果是受控维度"的定位。

-- 以后想手动重算一次词表：select public.vf_sync_tag_vocabulary();
