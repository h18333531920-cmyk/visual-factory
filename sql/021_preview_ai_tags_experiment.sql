-- 2026-10-10 单项目逐图 AI 标签实验
-- 实验对象：AugPicks campaign (8.27-8.31)
-- 只保存逐图识别结果与人工排除，不改 vf_source_files.tags。
-- 幂等，可在 Supabase SQL Editor 重复执行。

create table if not exists public.vf_preview_ai_tags (
  experiment_key text not null,
  preview_id uuid not null references public.vf_asset_previews(id) on delete cascade,
  source_file_id uuid not null references public.vf_source_files(id) on delete cascade,
  ai_tags text[] not null default '{}',
  manual_tags text[] not null default '{}',
  excluded_tags text[] not null default '{}',
  status text not null default 'idle'
    check (status in ('idle', 'running', 'success', 'failed', 'expired')),
  model text not null default '',
  content_key text not null default '',
  run_id uuid,
  error_message text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (experiment_key, preview_id)
);

alter table public.vf_preview_ai_tags
  add column if not exists manual_tags text[] not null default '{}';

create index if not exists idx_preview_ai_tags_source
  on public.vf_preview_ai_tags(experiment_key, source_file_id);

create index if not exists idx_preview_ai_tags_values
  on public.vf_preview_ai_tags using gin(ai_tags);

drop trigger if exists vf_preview_ai_tags_touch_updated_at on public.vf_preview_ai_tags;
create trigger vf_preview_ai_tags_touch_updated_at
before update on public.vf_preview_ai_tags
for each row execute function public.vf_touch_updated_at();

alter table public.vf_preview_ai_tags enable row level security;

drop policy if exists vf_preview_ai_tags_read on public.vf_preview_ai_tags;
create policy vf_preview_ai_tags_read on public.vf_preview_ai_tags
for select to authenticated using (true);

drop policy if exists vf_preview_ai_tags_admin_write on public.vf_preview_ai_tags;
create policy vf_preview_ai_tags_admin_write on public.vf_preview_ai_tags
for all to authenticated
using (public.vf_is_admin())
with check (public.vf_is_admin());

comment on table public.vf_preview_ai_tags is
  '逐图 AI 标签逻辑副本；与项目共用标签分离，人工排除优先于重新识别';
