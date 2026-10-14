-- 2026-10-14 标签「使用量」实时视图（sql/030）
--
-- 目标（用户诉求，原话）：
--   「在词表里的词的前面加一个数字，显示这个词被几个物料使用，这样就能区分出是不是有用到了」
--   ⇒ 词表页每个词的后面显示「被几个物料用到」，一眼看出**孤儿词**：
--     · 元素词没人用 = 死词条（点进去 0 条结果，v899 就是为这个去掉了"新增词"入口）；
--     · 效果词（kind='effect'，sql/028 的 15 个种子词）则可能是"刚加、还没识别到"或"真的没用上"——
--       现在这两种情况在界面上完全一样，看不出区别。
--
-- 为什么用**视图**而不是在 vf_tag_vocabulary 上加一列 usage_count：
--   ① 那一列**一定会过期**：它得靠触发器/定时任务维护，漏一次就永远错（上传、删物料、识别、改名、
--      删除标签、批量改写……每一处都得记得更新它）；
--   ② 使用量的真身散落在 4 张表里（见下），任何一条写路径改了标签，那一列都得跟着改 —— 迟早漂移；
--   ③ 视图是**每次查询现算**：永远和真身一致，没有"刷新"这个概念，也不需要任何维护。
--   代价：每次读词表页多做一次聚合查询（库是千级行，量级可忽略；真大了再考虑物化视图 + 触发器）。
--
-- 一行的含义（视图列）：
--   name_zh   | materials             | projects
--   标签中文名 | 带了这个词的**物料数** | 带了这个词的**素材/项目数**
--   materials 的来源（同一个物料上出现多次**只算一次**，按 vf_asset_previews.id 去重）：
--     a. vf_preview_ai_tags.ai_tags         （逐图 AI 标签）
--     b. vf_preview_ai_tags.manual_tags     （人工补充）
--     c. vf_preview_ai_tags.effect_tags     （动效/效果标签，**sql/028 加的列**，见下面的降级办法）
--     d. vf_asset_previews.material_type    （物料类型/元素）
--   projects 的来源：vf_source_files.tags（素材/项目标签），同样按 id 去重。
--   行的集合 = 词表里的词 ∪ 库内正在用的词（所以**没被任何物料用到的词也会出现，materials=0**，
--   这正是要找的孤儿词；反过来库内在用但词表还没同步的词也不会漏）。
--
-- 清洗口径**与 sql/025 的同步函数完全一致**（必须一致，否则"词表说在用、视图说 0"会自相矛盾）：
--   btrim 去首尾空格、排除空串、排除 'vf:%' 开头的内部标记（'vf:case-element:v1:%E5%90%89...' 那种编码标签）。
--
-- ⚠️ sql/028 的 effect_tags 列**可能还没跑**（用户自己决定什么时候执行迁移）。这个文件不会因此报错：
--   effect_tags 是通过一个 `stable` 的辅助函数 public.vf_effect_tag_rows() 读的 —— 它**每次调用**都查
--   pg_attribute 看那一列在不在：在就返回全部效果标签，不在就**返回空集**（等于这一维暂时不参与统计）。
--   好处：028 什么时候跑都行，跑完**不用重跑本文件**（视图下次查询自动就开始算 effect_tags 了）。
--   做法与 sql/027 处理 excluded_tags（那里的 v_excluded_ready）是同一套路。
--
-- 幂等：可重复执行（create or replace view / create or replace function，不改数据、不建表）。
-- 前提：sql/021（逐图标签表）+ sql/022（词表）已执行；sql/025、sql/028 建议已执行。
--   **执行顺序：在 sql/025、sql/028 之后跑**（025 建词表同步、028 加 effect_tags 列）。
--   反过来：025 / 028 / 029 里都没有视图对象，重跑它们**不会**盖掉本文件建的东西；
--   只有以后改了口径才需要重跑本文件（本文件本身怎么跑都不会坏数据）。
-- 权限：视图本身只读；服务端代理用 service_role 读（前端不直连 Supabase，
--   所有 rest 请求都经 /api/account-data 代理，代理先校验账号状态与维护/素材库权限）。
--   文件尾给 service_role 补一条 select（幂等；角色不存在时自动跳过）。
-- 执行方式：Supabase SQL Editor 整段粘贴执行（**用户自己跑，AI 不代跑** —— 这是读真实共享库的迁移）。

-- ══ 1) 辅助：效果标签（effect_tags）—— 列不存在时返回空集 ══════════════════
-- 为什么要有这个函数：视图是**一条 create view 语句**，里面没法写 if / 条件分支，而 effect_tags
-- 这一列可能还不存在（sql/028 没跑）。用 pg_attribute 查一下，动态执行那条 select：
--   · 列在 → 返回 (preview_id, name_zh) 全部效果标签；
--   · 列不在（或整张表都还没建）→ 不返回任何行 ⇒ 视图照常建起来，只是这一维暂时不参与统计。
-- 标 stable：只读、同一次查询里结果稳定（视图里当普通表用）。
-- security definer：与视图其余部分的读取口径一致（视图归 owner 所有，绕开 RLS 的差异），
--   且 search_path 固定，不受调用方影响。
create or replace function public.vf_effect_tag_rows()
returns table (preview_id uuid, name_zh text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from pg_attribute
    where attrelid = to_regclass('public.vf_preview_ai_tags')
      and attname = 'effect_tags'
      and attnum > 0
      and not attisdropped
  ) then
    return query execute
      $q$
        select a.preview_id, t.name_zh
        from public.vf_preview_ai_tags a
        cross join lateral unnest(coalesce(a.effect_tags, '{}'::text[])) as t(name_zh)
      $q$;
  end if;
  -- 走到这里 = sql/028 还没执行（没有这一列）⇒ 返回空集，不报错
  return;
end;
$$;

comment on function public.vf_effect_tag_rows() is
  '逐图效果标签（vf_preview_ai_tags.effect_tags）的只读展开：列为 (preview_id, name_zh)。sql/028 还没执行（没有这一列）时返回空集 —— 供 vf_tag_usage 视图降级用。';

-- ══ 2) 使用量视图 ════════════════════════════════════════════════════════
-- 四步：
--   2.1 preview_labels：四种来源的 (物料 id, 原始标签) 摊平；
--   2.2 preview_words：清洗（btrim / 排空串 / 排 vf: 内部标记）后**按物料去重**（distinct 一对 (id, 词)）
--       ⇒ 同一个物料上同一个词出现多次只算一次；
--   2.3 material_counts：按词数物料数；projects 同理走 vf_source_files.tags；
--   2.4 words：词表 ∪ 物料在用 ∪ 项目在用（union 自动去重）⇒ 没被用到的词也在结果里、数字是 0。
create or replace view public.vf_tag_usage as
with preview_labels as (
  -- a. 逐图 AI 标签
  select a.preview_id, unnest(a.ai_tags) as raw_name
  from public.vf_preview_ai_tags a
  union all
  -- b. 人工补充标签
  select a.preview_id, unnest(a.manual_tags)
  from public.vf_preview_ai_tags a
  union all
  -- c. 效果/动效标签（sql/028 加的列；没跑 028 时这个函数返回空集，自动降级）
  select e.preview_id, e.name_zh
  from public.vf_effect_tag_rows() e
  union all
  -- d. 物料类型/元素
  select p.id, p.material_type
  from public.vf_asset_previews p
), preview_words as (
  -- 清洗口径与 sql/025 一致：btrim、排空串、排 'vf:%' 内部标记。
  -- distinct 一对 (物料 id, 词) ⇒ 同一物料上重复出现只算一次。
  select distinct
         l.preview_id,
         btrim(l.raw_name) as name_zh
  from preview_labels l
  where l.raw_name is not null
    and btrim(l.raw_name) <> ''
    and btrim(l.raw_name) not like 'vf:%'
), material_counts as (
  select w.name_zh, count(*)::int as materials
  from preview_words w
  group by w.name_zh
), project_labels as (
  -- 素材/项目标签（vf_source_files.tags；里面可能混着 'vf:case-*:v1:<百分号编码>' 的内部标记，要排掉）
  select s.id, unnest(s.tags) as raw_name
  from public.vf_source_files s
), project_words as (
  select distinct
         l.id,
         btrim(l.raw_name) as name_zh
  from project_labels l
  where l.raw_name is not null
    and btrim(l.raw_name) <> ''
    and btrim(l.raw_name) not like 'vf:%'
), project_counts as (
  select w.name_zh, count(*)::int as projects
  from project_words w
  group by w.name_zh
), vocab_words as (
  -- 词表自己的词（含 kind='effect' 的受控效果词、以及 kind='ignored' 的占位行）——
  -- 带上它们才能看到"词表里有、但一个物料都没用到"的 0 行（孤儿词就是这么找的）。
  select distinct btrim(v.name_zh) as name_zh
  from public.vf_tag_vocabulary v
  where v.name_zh is not null
    and btrim(v.name_zh) <> ''
), words as (
  select name_zh from vocab_words
  union
  select name_zh from material_counts
  union
  select name_zh from project_counts
)
select w.name_zh,
       coalesce(mc.materials, 0) as materials,
       coalesce(pc.projects, 0) as projects
from words w
left join material_counts mc on mc.name_zh = w.name_zh
left join project_counts pc on pc.name_zh = w.name_zh;

comment on view public.vf_tag_usage is
  '标签使用量的实时视图（v920）：每行 = 一个词，materials = 带了这个词的物料数（vf_preview_ai_tags.ai_tags/manual_tags/effect_tags + vf_asset_previews.material_type，按物料 id 去重），projects = 带了这个词的素材/项目数（vf_source_files.tags，按 id 去重）。清洗口径与 public.vf_sync_tag_vocabulary() 一致（btrim / 排空串 / 排 vf: 内部标记）。词表里的词一定在结果里（没被用到就是 0）。不存任何计数 —— 每次查询现算，不会过期。';

-- ══ 3) 权限：只补 service_role（服务端代理用的身份）═══════════════════════
-- 前端不直连 Supabase：所有 rest 请求都走 /api/account-data 代理，代理校验完账号/权限后用 service_role 转发。
-- Supabase 的默认权限通常已经给了 select，这里显式补一次（幂等；没有这个角色时自动跳过，比如自建 PG）。
--
-- ⚠️ 同时**收回辅助函数的执行权**（第 1 段的 vf_effect_tag_rows）：PostgreSQL 建函数时默认给
--    PUBLIC 授 EXECUTE，那等于让"只拿着公开 anon key、没登录"的人也能直接 rpc 调到
--    vf_preview_ai_tags 的 effect_tags（绕过那张表的 RLS）。视图不需要这个授权 ——
--    视图是以**它的属主（= 建视图的人，SQL Editor 里的 postgres）**的身份执行的，
--    而属主对自己建的函数天然有执行权。所以收掉之后：视图照常可用，anon / 登录用户直接调**被拒**。
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select on public.vf_tag_usage to service_role';
  end if;
  execute 'revoke all on function public.vf_effect_tag_rows() from public';
end $$;

-- ══ 4) 自检（跑完逐条看结果）═════════════════════════════════════════════
-- 4.1 视图在不在（应返回一行：public.vf_tag_usage）
select to_regclass('public.vf_tag_usage') as 使用量视图;

-- 4.2 总行数 + **使用量为 0 的行数**（后者就是"死词条 / 还没被用到"的数量，应该能看得到）
select count(*) as 总行数,
       count(*) filter (where materials = 0 and projects = 0) as 完全没被用到,
       count(*) filter (where materials = 0 and projects > 0) as 只在项目标签里用到
from public.vf_tag_usage;

-- 4.3 效果词（sql/028 的种子词）当前的使用量 —— 这就是"刚加还没识别到 / 真的没用上"要看的那一眼
select name_zh, materials, projects
from public.vf_tag_usage
where name_zh in ('爆炸', '粒子', '光效', '水花', '烟雾', '闪光',
                  '缩放', '抖动', '弹跳', '旋转', '滑入', '展开',
                  '利益点凸显', '氛围营造', '悬念引导')
order by materials desc, name_zh;

-- 4.4 使用量最多的 20 个词（粗看口径对不对：餐桌 / 汉堡 / 优惠券 / 薯条 / kiki 这些应该排在前面）
select name_zh, materials, projects
from public.vf_tag_usage
order by materials desc, projects desc, name_zh
limit 20;

-- 4.5 effect_tags 这一维有没有参与统计（= sql/028 跑没跑）
--   · 返回 true  = 028 已执行，效果标签已算进 materials；
--   · 返回 false = 028 还没执行（视图照常可用，只是少了这一维）⇒ 先跑 sql/028_effect_tags.sql。
--     跑完**不用重跑本文件**：vf_effect_tag_rows() 每次调用都会重新查这一列在不在。
select exists (
  select 1 from pg_attribute
  where attrelid = to_regclass('public.vf_preview_ai_tags')
    and attname = 'effect_tags' and attnum > 0 and not attisdropped
) as 效果标签列在不在;
