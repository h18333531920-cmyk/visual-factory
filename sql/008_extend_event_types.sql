-- 008_extend_event_types.sql
-- 扩展 vf_asset_events 的事件类型 CHECK 约束，支持操作埋点
-- 在 Supabase SQL Editor 中执行

-- 1. 移除旧约束，添加新的事件类型
alter table public.vf_asset_events
  drop constraint if exists vf_asset_events_event_type_check;

alter table public.vf_asset_events
  add constraint vf_asset_events_event_type_check
  check (event_type in (
    -- 原有类型
    'download_preview', 'download_source', 'use_static', 'use_dynamic', 'use_template',
    -- 新增类型
    'upload', 'view', 'favorite', 'edit', 'delete',
    'batch_edit', 'batch_delete', 'batch_download', 'login'
  ));

-- 2. 常用查询索引（加速看板查询）
create index if not exists idx_asset_events_created_at
  on public.vf_asset_events (created_at desc);

create index if not exists idx_asset_events_event_type
  on public.vf_asset_events (event_type);

create index if not exists idx_asset_events_actor_id
  on public.vf_asset_events (actor_id);

create index if not exists idx_asset_events_source_file
  on public.vf_asset_events (source_file_id);
