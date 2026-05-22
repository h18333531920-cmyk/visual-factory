-- Visual Factory v1: Assets Library + Storage Policies
-- Run in Supabase SQL Editor

begin;

create extension if not exists pgcrypto;

create table if not exists public.assets_library (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  cover_url text,
  logo_url text,
  file_name text not null default '',
  file_type text not null default '',
  brand_name text not null default '',
  g_l1 text not null default '未分类',
  g_l2 text not null default '全部',
  s_l1 text not null default '全部',
  s_l2 text not null default '全部',
  s_l3 text not null default '通用',
  uploader_name text not null default 'System',
  created_at timestamptz not null default now()
);

alter table public.assets_library enable row level security;

drop policy if exists assets_anon_select on public.assets_library;
drop policy if exists assets_anon_insert on public.assets_library;
drop policy if exists assets_anon_update on public.assets_library;
drop policy if exists assets_anon_delete on public.assets_library;

create policy assets_anon_select on public.assets_library
for select to anon using (true);

create policy assets_anon_insert on public.assets_library
for insert to anon with check (true);

create policy assets_anon_update on public.assets_library
for update to anon using (true) with check (true);

create policy assets_anon_delete on public.assets_library
for delete to anon using (true);

insert into storage.buckets (id, name, public)
values ('visual-assets', 'visual-assets', true)
on conflict (id) do nothing;

drop policy if exists obj_anon_select_visual_assets on storage.objects;
drop policy if exists obj_anon_insert_visual_assets on storage.objects;
drop policy if exists obj_anon_update_visual_assets on storage.objects;
drop policy if exists obj_anon_delete_visual_assets on storage.objects;

create policy obj_anon_select_visual_assets
on storage.objects
for select
to anon
using (bucket_id = 'visual-assets');

create policy obj_anon_insert_visual_assets
on storage.objects
for insert
to anon
with check (bucket_id = 'visual-assets');

create policy obj_anon_update_visual_assets
on storage.objects
for update
to anon
using (bucket_id = 'visual-assets')
with check (bucket_id = 'visual-assets');

create policy obj_anon_delete_visual_assets
on storage.objects
for delete
to anon
using (bucket_id = 'visual-assets');

-- Optional but recommended: realtime subscription for gallery auto refresh
alter publication supabase_realtime add table public.assets_library;

commit;
