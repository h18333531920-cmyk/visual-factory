-- 2026-10-12 标签词表：加「上位词」字段（broader term / 父级概念）
-- 用途：搜索命中父词时，把它的所有子孙词也算命中（例：搜「食物」带出汉堡/披萨/甜点…）。
-- 说明：上位词是可选的兜底骨架 —— 只给少数几个大词挂子级即可，不需要穷尽分类。
-- 幂等，可在 Supabase SQL Editor 重复执行；只新增一列，不动现有数据。

alter table public.vf_tag_vocabulary
  add column if not exists parent_id text;

create index if not exists idx_tag_vocabulary_parent on public.vf_tag_vocabulary (parent_id);

comment on column public.vf_tag_vocabulary.parent_id is
  '上位词（父级概念）的 id；搜索命中父词时，其所有子孙词也算命中。空 = 无父级。';
