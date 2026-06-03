-- Visual Factory V1 core schema
-- Run this in Supabase SQL Editor before using cloud login/project save.

begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.vf_role as enum ('admin', 'designer', 'operator');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.vf_visibility as enum ('all', 'designers', 'operators');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.vf_project_type as enum ('static', 'dynamic');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.vf_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  role public.vf_role not null default 'operator',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vf_categories (
  id uuid primary key default gen_random_uuid(),
  name_zh text not null,
  name_en text not null default '',
  visibility public.vf_visibility not null default 'all',
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vf_assets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.vf_categories(id) on delete set null,
  title text not null default '',
  source_path text not null default '',
  preview_path text not null default '',
  file_kind text not null default '',
  mime_type text not null default '',
  visibility public.vf_visibility not null default 'all',
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vf_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_type public.vf_project_type not null,
  title text not null,
  data_path text not null,
  snapshot_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.vf_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vf_profiles_touch_updated_at on public.vf_profiles;
create trigger vf_profiles_touch_updated_at
before update on public.vf_profiles
for each row execute function public.vf_touch_updated_at();

drop trigger if exists vf_categories_touch_updated_at on public.vf_categories;
create trigger vf_categories_touch_updated_at
before update on public.vf_categories
for each row execute function public.vf_touch_updated_at();

drop trigger if exists vf_assets_touch_updated_at on public.vf_assets;
create trigger vf_assets_touch_updated_at
before update on public.vf_assets
for each row execute function public.vf_touch_updated_at();

drop trigger if exists vf_projects_touch_updated_at on public.vf_projects;
create trigger vf_projects_touch_updated_at
before update on public.vf_projects
for each row execute function public.vf_touch_updated_at();

create or replace function public.vf_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vf_profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'operator')::public.vf_role
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists vf_on_auth_user_created on auth.users;
create trigger vf_on_auth_user_created
after insert on auth.users
for each row execute function public.vf_handle_new_user();

create or replace function public.vf_current_role()
returns public.vf_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.vf_profiles where id = auth.uid()), 'operator'::public.vf_role);
$$;

create or replace function public.vf_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vf_current_role() = 'admin'::public.vf_role;
$$;

create or replace function public.vf_can_see_visibility(value public.vf_visibility)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    value = 'all'::public.vf_visibility
    or public.vf_is_admin()
    or (value = 'designers'::public.vf_visibility and public.vf_current_role() = 'designer'::public.vf_role)
    or (value = 'operators'::public.vf_visibility and public.vf_current_role() = 'operator'::public.vf_role);
$$;

alter table public.vf_profiles enable row level security;
alter table public.vf_categories enable row level security;
alter table public.vf_assets enable row level security;
alter table public.vf_projects enable row level security;

drop policy if exists vf_profiles_select on public.vf_profiles;
create policy vf_profiles_select on public.vf_profiles
for select to authenticated
using (id = auth.uid() or public.vf_is_admin());

drop policy if exists vf_profiles_update_admin on public.vf_profiles;
create policy vf_profiles_update_admin on public.vf_profiles
for update to authenticated
using (public.vf_is_admin())
with check (public.vf_is_admin());

drop policy if exists vf_categories_select on public.vf_categories;
create policy vf_categories_select on public.vf_categories
for select to authenticated
using (public.vf_can_see_visibility(visibility));

drop policy if exists vf_categories_admin_write on public.vf_categories;
create policy vf_categories_admin_write on public.vf_categories
for all to authenticated
using (public.vf_is_admin())
with check (public.vf_is_admin());

drop policy if exists vf_assets_select on public.vf_assets;
create policy vf_assets_select on public.vf_assets
for select to authenticated
using (
  public.vf_can_see_visibility(visibility)
  and (
    category_id is null
    or exists (
      select 1 from public.vf_categories c
      where c.id = category_id and public.vf_can_see_visibility(c.visibility)
    )
  )
);

drop policy if exists vf_assets_designer_admin_insert on public.vf_assets;
create policy vf_assets_designer_admin_insert on public.vf_assets
for insert to authenticated
with check (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role);

drop policy if exists vf_assets_owner_admin_update on public.vf_assets;
create policy vf_assets_owner_admin_update on public.vf_assets
for update to authenticated
using (public.vf_is_admin() or uploaded_by = auth.uid())
with check (public.vf_is_admin() or uploaded_by = auth.uid());

drop policy if exists vf_assets_owner_admin_delete on public.vf_assets;
create policy vf_assets_owner_admin_delete on public.vf_assets
for delete to authenticated
using (public.vf_is_admin() or uploaded_by = auth.uid());

drop policy if exists vf_projects_owner_select on public.vf_projects;
create policy vf_projects_owner_select on public.vf_projects
for select to authenticated
using (owner_id = auth.uid() or public.vf_is_admin());

drop policy if exists vf_projects_owner_insert on public.vf_projects;
create policy vf_projects_owner_insert on public.vf_projects
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists vf_projects_owner_update on public.vf_projects;
create policy vf_projects_owner_update on public.vf_projects
for update to authenticated
using (owner_id = auth.uid() or public.vf_is_admin())
with check (owner_id = auth.uid() or public.vf_is_admin());

drop policy if exists vf_projects_owner_delete on public.vf_projects;
create policy vf_projects_owner_delete on public.vf_projects
for delete to authenticated
using (owner_id = auth.uid() or public.vf_is_admin());

insert into storage.buckets (id, name, public)
values
  ('vf-assets', 'vf-assets', true),
  ('vf-projects', 'vf-projects', false)
on conflict (id) do nothing;

drop policy if exists vf_project_objects_select on storage.objects;
create policy vf_project_objects_select on storage.objects
for select to authenticated
using (
  bucket_id = 'vf-projects'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

drop policy if exists vf_project_objects_insert on storage.objects;
create policy vf_project_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vf-projects'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists vf_project_objects_update on storage.objects;
create policy vf_project_objects_update on storage.objects
for update to authenticated
using (
  bucket_id = 'vf-projects'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
)
with check (
  bucket_id = 'vf-projects'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

drop policy if exists vf_asset_objects_select on storage.objects;
create policy vf_asset_objects_select on storage.objects
for select to authenticated
using (bucket_id = 'vf-assets');

drop policy if exists vf_asset_objects_designer_insert on storage.objects;
create policy vf_asset_objects_designer_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vf-assets'
  and (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
);

commit;
