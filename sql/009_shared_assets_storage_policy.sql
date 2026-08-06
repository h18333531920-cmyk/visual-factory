-- Shared Static DIY settings are one explicitly named object, not a user-uploaded file.
-- Allow designers/admins to update only this object; all ordinary library paths keep
-- the stricter per-user source/preview policy from 002_library_v2.sql.

begin;

drop policy if exists vf_library_shared_assets_insert on storage.objects;
create policy vf_library_shared_assets_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vf-library'
  and name = 'static/shared-assets.json'
  and (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
);

drop policy if exists vf_library_shared_assets_update on storage.objects;
create policy vf_library_shared_assets_update on storage.objects
for update to authenticated
using (
  bucket_id = 'vf-library'
  and name = 'static/shared-assets.json'
  and (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
)
with check (
  bucket_id = 'vf-library'
  and name = 'static/shared-assets.json'
  and (public.vf_is_admin() or public.vf_current_role() = 'designer'::public.vf_role)
);

commit;
