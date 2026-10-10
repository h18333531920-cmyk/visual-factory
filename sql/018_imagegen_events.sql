-- 018_imagegen_events.sql
-- 扩展 vf_asset_events 的事件类型 CHECK 约束：新增 imagegen（网关生图埋点）。
-- 背景：生图发生在 secure-image 网关（jimeng 代理），网关在任务成功落账时用
-- service key 向本表追加 event_type='imagegen' 的行，meta 记录
-- model / model_label / kind / origin / job_id / account_label。
-- 执行方式：在 Supabase SQL Editor 中运行本文件（先跑本迁移，再发网关补丁）。

alter table public.vf_asset_events
  drop constraint if exists vf_asset_events_event_type_check;

alter table public.vf_asset_events
  add constraint vf_asset_events_event_type_check
  check (event_type in (
    -- 原有类型
    'download_preview', 'download_source', 'use_static', 'use_dynamic', 'use_template',
    -- 操作埋点（008 引入）
    'upload', 'view', 'favorite', 'edit', 'delete',
    'batch_edit', 'batch_delete', 'batch_download', 'login',
    -- 生图埋点（018 引入）
    'imagegen'
  ));
