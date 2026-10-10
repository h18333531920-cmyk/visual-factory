# GCC Design（visual-factory）

给设计工作流用的网页工具集：素材 / 案例库、静态 DIY 海报编辑器、动态 DIY 动画编辑器、ICON 生成工具（制作金刚）、提需流程、数据看板、团队与账号权限管理。

- 线上：<https://gccdesign.app>（Cloudflare Pages 项目 `visual-factory`）
- 测试站：<https://asset-gallery-test.visual-factory.pages.dev>
- 技术栈：Supabase（PostgreSQL + Auth + Storage + RLS）+ Cloudflare Pages / Functions + 原生 JS 单文件前端（无框架）

## 开发 / 交接：先读这一份

**→ [HANDOVER.md](HANDOVER.md)** —— 唯一正本：现状速览、架构、数据结构、功能模块、部署、已知坑、待办、风险。

```bash
npm run dev            # 本地预览 http://127.0.0.1:8791
node --check app.js    # 语法
node --test tests/     # 自动化测试（基线 365 项）
npm run build:pages    # 生成 dist/（wrangler 发布的就是它）
```

规矩与红线见 [AGENTS.md](AGENTS.md)。历史文档（**不要当现状读**）见 [docs/archive/](docs/archive/README.md)。
