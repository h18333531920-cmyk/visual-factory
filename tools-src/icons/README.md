**API 维护先读：仓库根目录 [AI-API-MAINTENANCE.md](../../AI-API-MAINTENANCE.md)。** 主站 build:pages 会从此原文生成公开指南；不要仅编辑 public 中的输出副本。

# 制作金刚 · 主站发布源码

这里是 GitHub 发布使用的金刚前端源码。主站 `npm run build:pages` 会先运行 `build:icons`，按 package-lock.json 安装依赖，再编译到 tools/icons；无需提交生成目录。

生图协议由 shared/jimeng-site.mjs 与金刚本机项目的 server/jimeng-site.mjs 共用实现，调用现有 jimeng.gccdesign.app，保留主站备用接口。会话只在运行时读取，不包含部署密钥。抠图将部署到已购服务器，当前线上明确显示待接入。

只发布测试分支 asset-gallery-test。主站现有 GitHub Actions 的 main 会触发正式发布，必须用户明确要求后再推送 main。请保留主站未提交的 v525 成果，不以历史 v481 覆盖。
