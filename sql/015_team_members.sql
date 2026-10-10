-- 2026-09-18 素材使用者名单（上传弹窗「物料所有者」联想候选 + 团队管理页维护）
-- 在 Supabase 控制台 SQL Editor 中对 main 生产库执行（测试/生产共用，幂等）。
-- 刻意不使用任何字符串字面量（没有 '' 空串），避免粘贴时被转成中文引号导致 42601 语法错误。
--
-- 说明（字段语义，别再搞混）：
--   name_zh / name_en = 中文名 / 英文名，**至少填一个**，只用于展示和联想索引
--                       （大象里按姓名搜不可靠，可能重名）
--   daxiang_id        = 大象编号（例如 wb_wangxinze02），**唯一标识**；「联系所有者」复制的就是它
-- 关联到素材上：
--   vf_source_files.owner_name    = 姓名的展示值
--   vf_source_files.owner_contact = 大象编号（这个字段此前一直空着，本功能开始启用）
CREATE TABLE IF NOT EXISTS vf_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_zh text,
  name_en text,
  daxiang_id text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 同一个「中文名 + 英文名」只留一条（空值不参与唯一性判断，不影响多人未填英文名的情况）
CREATE UNIQUE INDEX IF NOT EXISTS vf_team_members_names_idx ON vf_team_members (name_zh, name_en);

ALTER TABLE vf_team_members ENABLE ROW LEVEL SECURITY;

-- 团队共享名单：已登录成员都能读（上传时联想用），改名单需要开发者维护权限（服务端策略强制）
DROP POLICY IF EXISTS vf_team_members_read ON vf_team_members;
CREATE POLICY vf_team_members_read ON vf_team_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vf_team_members_write ON vf_team_members;
CREATE POLICY vf_team_members_write ON vf_team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
