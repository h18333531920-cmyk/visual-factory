-- 2026-09-20 物料清单（团队管理页维护：案例库上传自动识别所依据的物料类别与标准尺寸清单）
-- 在 Supabase 控制台 SQL Editor 中对 main 生产库执行（测试/生产共用，幂等）。
-- 结构刻意做成「单行 jsonb」：entries = 行数组 [{id,category,label,size}]，整体覆盖式保存，
-- 清单只有几十行、且天然是嵌套结构（一个类别多个尺寸），比拆成多行表简单也不易错。
-- 权限说明：登录成员可读；写入需要开发者维护权限 —— 由 functions/_account-data-policy.js 的
-- 表白名单（vf_material_catalog）+「非读且非个人数据的写操作需要维护」规则强制。
-- 表没建时前端自动降级到本机 localStorage，功能不停摆（提示里会给出本文件名）。
CREATE TABLE IF NOT EXISTS vf_material_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entries jsonb,
  created_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vf_material_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vf_material_catalog_read ON vf_material_catalog;
CREATE POLICY vf_material_catalog_read ON vf_material_catalog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vf_material_catalog_write ON vf_material_catalog;
CREATE POLICY vf_material_catalog_write ON vf_material_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);
