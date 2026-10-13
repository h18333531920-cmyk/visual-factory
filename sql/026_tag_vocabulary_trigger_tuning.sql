-- 2026-10-13 词表同步触发器的性能补丁（sql/026）
--
-- 为什么要有这一版（接 sql/025）：
--   sql/025 用的是**语句级触发器**：只要往源表写一次，就全量重算一遍词表。
--   而逐图识别对**每一张图**会写两次（一次 status='running'、一次 save），
--   ⇒ 案例库 1925 张待识别 ≈ 3850 次全量重算，既拖慢批量识别，也让共享库反复全表扫。
--
-- 改法（只动触发器，不动函数、不动数据）：
--   · INSERT / DELETE 仍是**语句级**（批量插入/删除只重算一次，上传不受影响）；
--   · UPDATE 改成**行级 + WHEN 条件**：只有标签列真的变了才重算 ⇒ 状态写不再触发词表重算。
--
-- 幂等：可重复执行。函数 `vf_sync_tag_vocabulary()` / `vf_sync_tag_vocabulary_trigger()` 沿用 sql/025 的，不重定义。
-- 执行方式：Supabase SQL Editor 整段粘贴执行（用户自己跑，AI 不代跑）。

-- ── 1) 拆掉 sql/025 的三条语句级触发器 ────────────────────────────────
drop trigger if exists vf_tag_sync_source_files on public.vf_source_files;
drop trigger if exists vf_tag_sync_asset_previews on public.vf_asset_previews;
drop trigger if exists vf_tag_sync_preview_ai_tags on public.vf_preview_ai_tags;

-- ── 2) 重挂：INSERT/DELETE 语句级 + UPDATE 行级带 WHEN 条件 ────────────
-- 2.1 素材表：标签在 tags 数组里
create trigger vf_tag_sync_source_files_ins
after insert on public.vf_source_files
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

create trigger vf_tag_sync_source_files_upd
after update on public.vf_source_files
for each row
when (old.tags is distinct from new.tags)
execute function public.vf_sync_tag_vocabulary_trigger();

create trigger vf_tag_sync_source_files_del
after delete on public.vf_source_files
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

-- 2.2 预览图/物料表：标签在 material_type 上
create trigger vf_tag_sync_asset_previews_ins
after insert on public.vf_asset_previews
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

create trigger vf_tag_sync_asset_previews_upd
after update on public.vf_asset_previews
for each row
when (old.material_type is distinct from new.material_type)
execute function public.vf_sync_tag_vocabulary_trigger();

create trigger vf_tag_sync_asset_previews_del
after delete on public.vf_asset_previews
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

-- 2.3 逐图 AI 标签表：**这条是本次优化的主角** ——
--     只有 ai_tags / manual_tags 变了才重算；status=running / content_key / error_message 之类的写入不再触发。
create trigger vf_tag_sync_preview_ai_tags_ins
after insert on public.vf_preview_ai_tags
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

create trigger vf_tag_sync_preview_ai_tags_upd
after update on public.vf_preview_ai_tags
for each row
when (old.ai_tags is distinct from new.ai_tags or old.manual_tags is distinct from new.manual_tags)
execute function public.vf_sync_tag_vocabulary_trigger();

create trigger vf_tag_sync_preview_ai_tags_del
after delete on public.vf_preview_ai_tags
for each statement execute function public.vf_sync_tag_vocabulary_trigger();

-- ── 3) 立刻对齐一次 + 自检 ───────────────────────────────────────────
select public.vf_sync_tag_vocabulary();

-- 自检：应当看到 9 条 vf_tag_sync_* 触发器（每张表 3 条：_ins/_upd/_del，
--       _ins/_del 应为 STATEMENT、_upd 应为 ROW）
-- ⚠️ 粒度判定要用 tgtype 的 bit0（TRIGGER_TYPE_ROW = 1）；**不能用 bit2**（那个是 INSERT 事件位）。
--    2026-10-13 首版这里误写成 `& 4`，于是 _del 被显示成 ROW（触发器本身没错，只是这列标签错）。
select c.relname as 表, t.tgname as 触发器,
       case when (t.tgtype::int & 1) = 1 then 'ROW' else 'STATEMENT' end as 粒度
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where t.tgname like 'vf_tag_sync_%'
  and not t.tgisinternal
order by c.relname, t.tgname;

-- 以后想手动重算一次词表：select public.vf_sync_tag_vocabulary();
