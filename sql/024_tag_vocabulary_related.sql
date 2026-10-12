-- 2026-10-12 标签词表：加「相关词」字段
-- 用途：搜索命中这个词时，把 related 里的词也一起匹配。
--   例：term=甜点，related={蛋挞,蛋糕,冰淇淋,甜甜圈} → 搜「甜点」也能找到标了蛋挞/蛋糕的物料。
-- 说明：这是「相关词表」——一行一个大词，右边一串词；同一个词可以出现在多行（不用做层级/多父级）。
-- 幂等，可在 Supabase SQL Editor 重复执行；只新增一列，不动现有数据。

alter table public.vf_tag_vocabulary
  add column if not exists related text[] not null default '{}';

comment on column public.vf_tag_vocabulary.related is
  '相关词：搜索命中本行 term 时，一起参与匹配的词（同义词/下位词/常一起搜的词）。';
