-- Visual Factory V2 library storage hardening.
-- Removes older vf-library storage policies and rebuilds stricter rules.

begin;

insert into storage.buckets (id, name, public)
values ('vf-library', 'vf-library', false)
on conflict (id) do update set public = false;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname like 'vf_library_%'
        or coalesce(qual, '') ilike '%vf-library%'
        or coalesce(with_check, '') ilike '%vf-library%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
  end loop;
end $$;

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
