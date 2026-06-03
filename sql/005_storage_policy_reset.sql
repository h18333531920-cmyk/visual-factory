-- Visual Factory storage policy reset.
-- Use when a broad legacy storage policy lets anon/authenticated users read vf-library source files.
-- The script backs up existing storage.objects policies, drops them, then rebuilds the known Visual Factory rules.

begin;

create table if not exists public.vf_storage_policy_backup (
  id bigserial primary key,
  backed_up_at timestamptz not null default now(),
  policyname name not null,
  cmd text not null,
  roles name[] not null,
  qual text,
  with_check text
);

insert into public.vf_storage_policy_backup (policyname, cmd, roles, qual, with_check)
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects';

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
  loop
    execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values
  ('visual-assets', 'visual-assets', true),
  ('vf-assets', 'vf-assets', true),
  ('vf-projects', 'vf-projects', false),
  ('vf-library', 'vf-library', false)
on conflict (id) do update set
  public = excluded.public;

create or replace function public.vf_is_library_preview_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    object_name like '%/previews/%'
    and exists (
      select 1
      from public.vf_asset_previews p
      join public.vf_source_files s on s.id = p.source_file_id
      where p.preview_path = object_name
        and public.vf_can_see_visibility(s.visibility)
    );
$$;

-- Legacy gallery bucket. Kept public because the old embedded library still uses anon client calls.
create policy obj_anon_select_visual_assets
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'visual-assets');

create policy obj_anon_insert_visual_assets
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'visual-assets');

create policy obj_anon_update_visual_assets
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'visual-assets')
with check (bucket_id = 'visual-assets');

create policy obj_anon_delete_visual_assets
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'visual-assets');

-- Shared generated-asset bucket used by V1 scaffolding.
create policy vf_asset_objects_select on storage.objects
for select to authenticated
using (bucket_id = 'vf-assets');

create policy vf_asset_objects_designer_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vf-assets'
  and (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
);

-- Project save bucket. Users can only read/write their own folder; admins can read/manage all.
create policy vf_project_objects_select on storage.objects
for select to authenticated
using (
  bucket_id = 'vf-projects'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

create policy vf_project_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vf-projects'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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

create policy vf_project_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'vf-projects'
  and (public.vf_is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
);

-- V2 source/previews bucket.
create policy vf_library_objects_select on storage.objects
for select to authenticated
using (
  bucket_id = 'vf-library'
  and (
    public.vf_is_admin()
    or public.vf_current_role() = 'designer'::public.vf_role
    or public.vf_is_library_preview_object(storage.objects.name)
  )
);

create policy vf_library_objects_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vf-library'
  and (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
  and (storage.foldername(name))[1] = auth.uid()::text
  and (
    name like auth.uid()::text || '/sources/%'
    or name like auth.uid()::text || '/previews/%'
  )
);

create policy vf_library_objects_update on storage.objects
for update to authenticated
using (
  bucket_id = 'vf-library'
  and (
    public.vf_is_admin()
    or (
      public.vf_current_role() = 'designer'::public.vf_role
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  )
)
with check (
  bucket_id = 'vf-library'
  and (
    public.vf_is_admin()
    or (
      public.vf_current_role() = 'designer'::public.vf_role
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  and (
    name like (storage.foldername(name))[1] || '/sources/%'
    or name like (storage.foldername(name))[1] || '/previews/%'
  )
);

create policy vf_library_objects_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'vf-library'
  and (
    public.vf_is_admin()
    or (
      public.vf_current_role() = 'designer'::public.vf_role
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  )
);

commit;
