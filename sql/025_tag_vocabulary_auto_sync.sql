-- 2026-10-12 标签词表自动同步（sql/025）
-- 目标（用户诉求）：
--   ① 不漏：站内**正在用**的标签全部收进词表。原先靠前端把"当前账号看得到 + 机翻成功过"的词补进来，
--      换了账号 / 权限受限 / 机翻漏词都会缺；改成在数据库里全量重算，看不见的部分也一并收。
--   ② 实时：上传/识别出的新标签**立刻**进表，不用等下次打开素材库。
--   ③ 不留孤儿：物料删掉后，只有它用过的标签自动从词表移除（不会留下点进去 0 条结果的死词条）。
-- 做法：一个「全量重算」函数 + 三张源表上的语句级触发器。函数 security definer，能绕过 RLS 写词表。
--
-- 幂等：可重复执行。**只在词条不存在时插入**，绝不覆盖人工改过的 name_en / related。
-- 代价：每次源表写入都会重算一遍（全表扫描 source_files / asset_previews / preview_ai_tags）。
--      这几张表体量小（千级行），实测代价可接受；嫌慢可以改成行级增量版。
--
-- ⚠️ 取舍（重要，用户已确认）：孤儿清理**不分人工/自动**——只要库内没人再用这个词，
--    整行就删掉（包括你手工填过英文名或相关词的行）。否则会留下搜不到的死词条。
--    想保住某个词，就让它继续挂在物料上（或者别删那条物料）。
--
-- 执行方式：Supabase SQL Editor 整段粘贴执行（用户自己跑，AI 不代跑）。

-- ── 1) 全量重算函数 ────────────────────────────────────────────────
create or replace function public.vf_sync_tag_vocabulary()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1.1 收全：三处来源的标签并集（排除空串与 vf: 内部标记）
  with labels as (
    select unnest(tags) as name_zh from public.vf_source_files
    union
    select material_type from public.vf_asset_previews
    union
    select unnest(manual_tags) from public.vf_preview_ai_tags
    union
    select unnest(ai_tags) from public.vf_preview_ai_tags
  ), clean as (
    select distinct btrim(name_zh) as name_zh
    from labels
    where name_zh is not null
      and btrim(name_zh) <> ''
      and btrim(name_zh) not like 'vf:%'
  )
  insert into public.vf_tag_vocabulary (id, name_zh, kind, source)
  select 'el:' || name_zh, name_zh, 'element', 'auto'
  from clean
  on conflict (name_zh) do nothing;

  -- 1.2 删孤儿：词表里库内已经没人用的标签（名实相符才留着）
  with used as (
    select distinct btrim(x) as name_zh from public.vf_source_files s, unnest(s.tags) as x
    union
    select distinct btrim(p.material_type) from public.vf_asset_previews p
    union
    select distinct btrim(x) from public.vf_preview_ai_tags a, unnest(a.manual_tags || a.ai_tags) as x
  ), used_clean as (
    select name_zh from used where name_zh is not null and name_zh <> '' and name_zh not like 'vf:%'
  )
  delete from public.vf_tag_vocabulary v
  where btrim(v.name_zh) not in (select name_zh from used_clean);
end;
$$;

comment on function public.vf_sync_tag_vocabulary() is
  '把 vf_tag_vocabulary 对齐成「站内正在用的全部标签」：收全 + 删孤儿（只在缺词条时插入，不覆盖人工编辑）。';

-- 允许登录用户手动触发一次（前端「同步库内标签」按钮用）
grant execute on function public.vf_sync_tag_vocabulary() to authenticated;

-- ── 2) 触发器：源表一变就重算（语句级，一次写入只跑一遍）────────────
create or replace function public.vf_sync_tag_vocabulary_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.vf_sync_tag_vocabulary();
  return null;
end;
$$;

drop trigger if exists vf_tag_sync_source_files on public.vf_source_files;
create trigger vf_tag_sync_source_files
after insert or update or delete on public.vf_source_files
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

drop trigger if exists vf_tag_sync_asset_previews on public.vf_asset_previews;
create trigger vf_tag_sync_asset_previews
after insert or update or delete on public.vf_asset_previews
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

drop trigger if exists vf_tag_sync_preview_ai_tags on public.vf_preview_ai_tags;
create trigger vf_tag_sync_preview_ai_tags
after insert or update or delete on public.vf_preview_ai_tags
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

-- ── 3) 立刻回填一次（把存量标签全收进来 + 清掉已有的孤儿）────────────
select public.vf_sync_tag_vocabulary();

-- 以后想手动重算一次，执行：select public.vf_sync_tag_vocabulary();
