-- 2026-09-16 案例库项目化改造（第一步：上传弹窗）
-- 在 Supabase 控制台 SQL Editor 中对 main 生产库执行（测试/生产共用）。
-- vf_source_files：案例项目元数据（新上传的案例项目不再存源文件）
ALTER TABLE vf_source_files ADD COLUMN IF NOT EXISTS owner_name TEXT NOT NULL DEFAULT '';
ALTER TABLE vf_source_files ADD COLUMN IF NOT EXISTS owner_contact TEXT NOT NULL DEFAULT '';
ALTER TABLE vf_source_files ADD COLUMN IF NOT EXISTS project_note TEXT NOT NULL DEFAULT '';
-- vf_asset_previews：物料类型（按尺寸规则自动识别，可手动修改）
ALTER TABLE vf_asset_previews ADD COLUMN IF NOT EXISTS material_type TEXT NOT NULL DEFAULT '';
