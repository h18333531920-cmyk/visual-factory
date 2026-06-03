-- Visual Factory V2 asset library schema
-- Run after 001_visual_factory_core.sql.

begin;

create extension if not exists pgcrypto;

create table if not exists public.vf_library_options (
  id uuid primary key default gen_random_uuid(),
  option_type text not null check (option_type in ('country', 'activity', 'category')),
  name_en text not null,
  name_zh text not null default '',
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_type, name_en)
);

create table if not exists public.vf_source_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  country_id uuid references public.vf_library_options(id) on delete restrict,
  activity_id uuid references public.vf_library_options(id) on delete restrict,
  category_id uuid references public.vf_library_options(id) on delete restrict,
  tags text[] not null default '{}'::text[],
  visibility public.vf_visibility not null default 'all',
  source_path text not null,
  source_filename text not null,
  source_mime_type text not null default '',
  source_size_bytes bigint not null default 0,
  source_ext text not null default '',
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vf_asset_previews (
  id uuid primary key default gen_random_uuid(),
  source_file_id uuid not null references public.vf_source_files(id) on delete cascade,
  preview_path text not null,
  preview_filename text not null,
  preview_mime_type text not null default '',
  preview_size_bytes bigint not null default 0,
  width integer,
  height integer,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vf_asset_favorites (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  preview_id uuid not null references public.vf_asset_previews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, preview_id)
);

create table if not exists public.vf_asset_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  actor_role public.vf_role,
  event_type text not null check (event_type in ('download_preview', 'download_source', 'use_static', 'use_dynamic')),
  source_file_id uuid references public.vf_source_files(id) on delete cascade,
  preview_id uuid references public.vf_asset_previews(id) on delete cascade,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists vf_library_options_touch_updated_at on public.vf_library_options;
create trigger vf_library_options_touch_updated_at
before update on public.vf_library_options
for each row execute function public.vf_touch_updated_at();

drop trigger if exists vf_source_files_touch_updated_at on public.vf_source_files;
create trigger vf_source_files_touch_updated_at
before update on public.vf_source_files
for each row execute function public.vf_touch_updated_at();

drop trigger if exists vf_asset_previews_touch_updated_at on public.vf_asset_previews;
create trigger vf_asset_previews_touch_updated_at
before update on public.vf_asset_previews
for each row execute function public.vf_touch_updated_at();

alter table public.vf_library_options enable row level security;
alter table public.vf_source_files enable row level security;
alter table public.vf_asset_previews enable row level security;
alter table public.vf_asset_favorites enable row level security;
alter table public.vf_asset_events enable row level security;

drop policy if exists vf_library_options_select on public.vf_library_options;
create policy vf_library_options_select on public.vf_library_options
for select to authenticated
using (active or public.vf_is_admin());

drop policy if exists vf_library_options_admin_write on public.vf_library_options;
create policy vf_library_options_admin_write on public.vf_library_options
for all to authenticated
using (public.vf_is_admin())
with check (public.vf_is_admin());

drop policy if exists vf_source_files_select on public.vf_source_files;
create policy vf_source_files_select on public.vf_source_files
for select to authenticated
using (public.vf_can_see_visibility(visibility));

drop policy if exists vf_source_files_designer_admin_insert on public.vf_source_files;
create policy vf_source_files_designer_admin_insert on public.vf_source_files
for insert to authenticated
with check (
  (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
  and uploaded_by = auth.uid()
);

drop policy if exists vf_source_files_owner_admin_update on public.vf_source_files;
create policy vf_source_files_owner_admin_update on public.vf_source_files
for update to authenticated
using (public.vf_is_admin() or uploaded_by = auth.uid())
with check (public.vf_is_admin() or uploaded_by = auth.uid());

drop policy if exists vf_source_files_owner_admin_delete on public.vf_source_files;
create policy vf_source_files_owner_admin_delete on public.vf_source_files
for delete to authenticated
using (public.vf_is_admin() or uploaded_by = auth.uid());

drop policy if exists vf_asset_previews_select on public.vf_asset_previews;
create policy vf_asset_previews_select on public.vf_asset_previews
for select to authenticated
using (
  exists (
    select 1 from public.vf_source_files s
    where s.id = source_file_id
      and public.vf_can_see_visibility(s.visibility)
  )
);

drop policy if exists vf_asset_previews_designer_admin_insert on public.vf_asset_previews;
create policy vf_asset_previews_designer_admin_insert on public.vf_asset_previews
for insert to authenticated
with check (
  exists (
    select 1 from public.vf_source_files s
    where s.id = source_file_id
      and (public.vf_is_admin() or s.uploaded_by = auth.uid())
  )
);

drop policy if exists vf_asset_previews_owner_admin_update on public.vf_asset_previews;
create policy vf_asset_previews_owner_admin_update on public.vf_asset_previews
for update to authenticated
using (
  exists (
    select 1 from public.vf_source_files s
    where s.id = source_file_id
      and (public.vf_is_admin() or s.uploaded_by = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.vf_source_files s
    where s.id = source_file_id
      and (public.vf_is_admin() or s.uploaded_by = auth.uid())
  )
);

drop policy if exists vf_asset_previews_owner_admin_delete on public.vf_asset_previews;
create policy vf_asset_previews_owner_admin_delete on public.vf_asset_previews
for delete to authenticated
using (
  exists (
    select 1 from public.vf_source_files s
    where s.id = source_file_id
      and (public.vf_is_admin() or s.uploaded_by = auth.uid())
  )
);

drop policy if exists vf_asset_favorites_own_select on public.vf_asset_favorites;
create policy vf_asset_favorites_own_select on public.vf_asset_favorites
for select to authenticated
using (user_id = auth.uid());

drop policy if exists vf_asset_favorites_own_insert on public.vf_asset_favorites;
create policy vf_asset_favorites_own_insert on public.vf_asset_favorites
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists vf_asset_favorites_own_delete on public.vf_asset_favorites;
create policy vf_asset_favorites_own_delete on public.vf_asset_favorites
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists vf_asset_events_select on public.vf_asset_events;
create policy vf_asset_events_select on public.vf_asset_events
for select to authenticated
using (actor_id = auth.uid() or public.vf_is_admin());

drop policy if exists vf_asset_events_insert on public.vf_asset_events;
create policy vf_asset_events_insert on public.vf_asset_events
for insert to authenticated
with check (actor_id = auth.uid());

insert into public.vf_library_options (option_type, name_en, name_zh, sort_order)
values
  ('country', 'Saudi Arabia', '沙特阿拉伯', 10),
  ('country', 'UAE', '阿联酋', 20),
  ('country', 'Kuwait', '科威特', 30),
  ('country', 'Qatar', '卡塔尔', 40),
  ('country', 'Bahrain', '巴林', 50),
  ('country', 'Oman', '阿曼', 60),
  ('country', 'Egypt', '埃及', 70),
  ('country', 'Jordan', '约旦', 80),
  ('country', 'Other', '其他', 900),
  ('activity', 'Ramadan', '斋月', 10),
  ('activity', 'Eid', '开斋节/古尔邦节', 20),
  ('activity', 'National Day', '国庆日', 30),
  ('activity', '11.11', '双十一', 40),
  ('activity', 'Black Friday', '黑五', 50),
  ('activity', 'Back to School', '返校季', 60),
  ('activity', 'Launch', '新品/项目上线', 70),
  ('activity', 'Daily', '日常运营', 80),
  ('activity', 'Other', '其他', 900),
  ('category', 'Food', '餐饮', 10),
  ('category', 'Grocery', '商超', 20),
  ('category', 'Fashion', '时尚', 30),
  ('category', 'Beauty', '美妆', 40),
  ('category', 'Electronics', '数码家电', 50),
  ('category', 'Travel', '旅行', 60),
  ('category', 'Finance', '金融', 70),
  ('category', 'Other', '其他', 900)
on conflict (option_type, name_en) do update set
  name_zh = excluded.name_zh,
  sort_order = excluded.sort_order,
  active = true;

insert into storage.buckets (id, name, public)
values ('vf-library', 'vf-library', false)
on conflict (id) do update set public = false;

drop policy if exists vf_library_objects_select on storage.objects;
create policy vf_library_objects_select on storage.objects
for select to authenticated
using (
  bucket_id = 'vf-library'
  and (
    public.vf_is_admin()
    or public.vf_current_role() = 'designer'::public.vf_role
    or exists (
      select 1
      from public.vf_asset_previews p
      join public.vf_source_files s on s.id = p.source_file_id
      where p.preview_path = storage.objects.name
        and public.vf_can_see_visibility(s.visibility)
    )
  )
);

drop policy if exists vf_library_objects_insert on storage.objects;
create policy vf_library_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vf-library'
  and (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists vf_library_objects_update on storage.objects;
create policy vf_library_objects_update on storage.objects
for update to authenticated
using (
  bucket_id = 'vf-library'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
)
with check (
  bucket_id = 'vf-library'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

drop policy if exists vf_library_objects_delete on storage.objects;
create policy vf_library_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'vf-library'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

commit;
