-- 2026-09-17 案例项目新增下载链接（与项目需求链接分开）
-- 在 Supabase 控制台 SQL Editor 执行（测试/生产共用，幂等）。
ALTER TABLE vf_source_files ADD COLUMN IF NOT EXISTS download_link TEXT NOT NULL DEFAULT '';
-- 说明：下载链接与项目需求链接是两个独立字段：
--   project_note = 项目链接（需求文档 / 参考链接）
--   download_link = 下载链接（源文件下载地址，弹窗「下载源文件」按钮使用）
