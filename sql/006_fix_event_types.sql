-- 006_fix_event_types.sql
-- 修复 vf_asset_events 的 CHECK 约束，加上 use_template 事件类型
-- 执行方式：在 Supabase SQL Editor 中运行本文件

begin;

-- 1. 删掉旧的约束
alter table public.vf_asset_events
  drop constraint if exists vf_asset_events_event_type_check;

-- 2. 重建约束，加入 use_template
alter table public.vf_asset_events
  add constraint vf_asset_events_event_type_check
  check (event_type in ('download_preview', 'download_source', 'use_static', 'use_dynamic', 'use_template'));

commit;
