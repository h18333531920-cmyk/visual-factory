-- 测试阶段放宽模板与素材文件的删除限制。
--
-- 原策略（002_library_v2.sql / 005_storage_policy_reset.sql）要求：
--   模板记录   —— is_admin() 或 uploaded_by = auth.uid()
--   素材文件   —— is_admin() 或 (designer 且 文件在本人文件夹)
-- 这导致测试期删不掉「他人 / 早期上传」的模板：PostgreSQL 的 RLS 拒绝删除时
-- delete 只返回 0 行、不报错，前端误判为删除成功，刷新后模板又出现。
--
-- 现将删除权限放宽为「所有已登录用户」，方便测试期清理资产库。
-- 上线前如需恢复原限制，重新执行 002_library_v2.sql 与 005_storage_policy_reset.sql 即可。

begin;

-- 模板记录：允许任何已登录用户删除
drop policy if exists vf_source_files_owner_admin_delete on public.vf_source_files;
create policy vf_source_files_owner_admin_delete on public.vf_source_files
for delete to authenticated
using (true);

-- 素材文件（vf-library bucket）：允许任何已登录用户删除
drop policy if exists vf_library_objects_delete on storage.objects;
create policy vf_library_objects_delete on storage.objects
for delete to authenticated
using (bucket_id = 'vf-library');

commit;
