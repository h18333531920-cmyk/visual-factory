-- 2026-10-12 标签词表：概念的显示名（中/英）与别名
-- 用途：中文界面 / 英文界面显示同一概念的不同名字；搜索时把各种写法归到同一概念。
-- 特性：只新增表，不改动任何现有表或数据；幂等，可在 Supabase SQL Editor 重复执行。
--
-- 设计说明：
--   id        概念 ID，形如 'el:pizza'；中文概念可用 'el:披萨'（可读、稳定）
--   name_zh   中文显示名（唯一）—— 现有标签按「中文名精确匹配」查这张表
--   name_en   英文显示名；空 = 尚未翻译（前端在英文界面下会触发自动翻译并回填）
--   aliases   别名（中英、俗称、拼写变体），搜索归一用；本阶段暂不参与匹配
--   kind      element / material_type / platform / activity / category / other
--   source    ai = AI 自动翻译；manual = 人工确认过（人工的不会被 AI 覆盖）

create table if not exists public.vf_tag_vocabulary (
  id text primary key,
  name_zh text not null,
  name_en text not null default '',
  aliases text[] not null default '{}',
  kind text not null default 'element',
  source text not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create unique index if not exists idx_tag_vocabulary_name_zh on public.vf_tag_vocabulary (name_zh);
create index if not exists idx_tag_vocabulary_kind on public.vf_tag_vocabulary (kind);
create index if not exists idx_tag_vocabulary_aliases on public.vf_tag_vocabulary using gin(aliases);

drop trigger if exists vf_tag_vocabulary_touch_updated_at on public.vf_tag_vocabulary;
create trigger vf_tag_vocabulary_touch_updated_at
before update on public.vf_tag_vocabulary
for each row execute function public.vf_touch_updated_at();

alter table public.vf_tag_vocabulary enable row level security;

-- 读：所有登录用户（外国同事也要读英文名）
drop policy if exists vf_tag_vocabulary_read on public.vf_tag_vocabulary;
create policy vf_tag_vocabulary_read on public.vf_tag_vocabulary
for select to authenticated using (true);

-- 插入：登录用户可以补「AI 自动翻译」的行（source 必须是 'ai'，防止随手写脏数据）
drop policy if exists vf_tag_vocabulary_insert on public.vf_tag_vocabulary;
create policy vf_tag_vocabulary_insert on public.vf_tag_vocabulary
for insert to authenticated with check (source = 'ai');

-- 修改 / 删除：仅管理员（人工确认的译名只能由管理员改）
drop policy if exists vf_tag_vocabulary_admin_update on public.vf_tag_vocabulary;
create policy vf_tag_vocabulary_admin_update on public.vf_tag_vocabulary
for update to authenticated using (public.vf_is_admin()) with check (public.vf_is_admin());

drop policy if exists vf_tag_vocabulary_admin_delete on public.vf_tag_vocabulary;
create policy vf_tag_vocabulary_admin_delete on public.vf_tag_vocabulary
for delete to authenticated using (public.vf_is_admin());

comment on table public.vf_tag_vocabulary is
  '标签词表：概念的显示名（中/英）与别名。英文名可 AI 自动生成（source=ai），管理员修正后变为 manual，不再被 AI 覆盖。';
