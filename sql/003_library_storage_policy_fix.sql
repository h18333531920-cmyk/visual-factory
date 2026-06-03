-- Tighten V2 library storage reads.
-- Operators can read preview images, but cannot read source files.

begin;

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

commit;
