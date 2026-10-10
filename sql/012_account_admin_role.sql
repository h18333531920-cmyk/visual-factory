-- 2026-09-16 账号管理员角色：role='admin' 的账号拥有常驻开发者维护权限
-- （悬浮球常驻可切换、团队管理免开发者密码、刷新不锁定）。
-- 测试库已执行；正式库切换时先执行本文件再部署对应前端/函数版本。
ALTER TABLE vf_accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin'));
