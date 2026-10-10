-- 案例库活动词表隔离：放宽 vf_library_options.option_type 约束，新增 case_activity 类型。
--
-- 背景：正式站（v561）的旧代码每次打开素材库都会删除 option_type='activity' 里
-- 除「日常活动 / S级活动 / 系列活动」之外的选项，并把引用这些选项的行的 activity_id
-- 置空（旧版 seedActivityTypes）。正式站与测试站共用同一套数据库，测试站刚保存的
-- 活动标签会被正式站清掉。
--
-- 测试站 v738 起把案例库的活动词表（premium / picks / 一人食 / … / 足球 等 11 个值）
-- 改型到 case_activity 存放，旧版查询碰不到；本迁移只放宽约束，改型由前端在加载时
-- 自动完成（id 不变，引用不丢）。未执行本迁移时前端自动退回 activity 类型存放，
-- 行为与 v736 相同；执行后下一次加载即生效。

alter table public.vf_library_options drop constraint if exists vf_library_options_option_type_check;
alter table public.vf_library_options
  add constraint vf_library_options_option_type_check
  check (option_type in ('country', 'activity', 'category', 'case_activity'));

-- 检查用：
-- select option_type, count(*) from public.vf_library_options group by option_type order by option_type;
