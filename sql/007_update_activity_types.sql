-- 007_update_activity_types.sql
-- 更新活动类型：替换为 日常活动、S级活动、系列活动
-- 执行方式：在 Supabase SQL Editor 中运行本文件

begin;

-- 注意：如果已有素材关联了旧的活动类型，需要先处理
-- 查看有哪些素材关联了旧的活动类型：
-- select id, title, activity_id from public.vf_source_files where activity_id is not null;

-- 1. 删除旧的活动类型（只删除 activity 类型的选项）
delete from public.vf_library_options
where option_type = 'activity';

-- 2. 插入新的活动类型
insert into public.vf_library_options (option_type, name_en, name_zh, sort_order) values
  ('activity', 'Daily Activity', '日常活动', 10),
  ('activity', 'S-Level', 'S级活动', 20),
  ('activity', 'Series', '系列活动', 30);

commit;

-- 验证：
-- select * from public.vf_library_options where option_type = 'activity' order by sort_order;
