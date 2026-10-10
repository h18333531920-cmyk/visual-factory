-- 019_tag_system_v750.sql
-- 标签体系 v750：活动类型改名「活动主题」（premium/picks/一人食/品牌合作 移入业务策略）、
-- 元素「商家赠品（手机、耳机、PS5）」拆为独立词条、内容标签放开多选（活动/策略/元素/格式）。
-- 原则：只增不改 —— activity_id 列与 vf_library_options 活动选项全部保留（正式站 v561 照常工作），
-- 存量数据补写 tags，让测试站新筛选项（按 tags 匹配）能命中旧素材。
-- 执行方式：在 Supabase SQL Editor 中运行本文件（测试/生产共用一张表，迁移对正式站只增无害）。

-- 1) 存量 activity_id 对应的活动名补写进 tags（仅新体系在用的 7 个主题词；activity_id 保留）
update vf_source_files s
set tags = s.tags || array[o.name_zh]
from vf_library_options o
where s.activity_id = o.id
  and o.option_type = 'activity'
  and o.name_zh in ('聚餐','足球','夏日','新年','开斋节','宰牲节','国庆节')
  and not s.tags @> array[o.name_zh];

-- 2) 元素复合词条拆分：商家赠品（手机、耳机、PS5） → 追加 手机 / 耳机 / PS5（旧标签保留）
update vf_source_files
set tags = tags || array['手机']
where tags @> array['商家赠品（手机、耳机、PS5）'] and not tags @> array['手机'];

update vf_source_files
set tags = tags || array['耳机']
where tags @> array['商家赠品（手机、耳机、PS5）'] and not tags @> array['耳机'];

update vf_source_files
set tags = tags || array['PS5']
where tags @> array['商家赠品（手机、耳机、PS5）'] and not tags @> array['PS5'];

-- 核验（可选）：
-- select id, tags from vf_source_files
--  where tags && array['聚餐','足球','夏日','新年','开斋节','宰牲节','国庆节','手机','耳机','PS5']
--  order by updated_at desc limit 20;
