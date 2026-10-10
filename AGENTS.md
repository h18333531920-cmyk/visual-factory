# AGENTS.md — AI 助手 / 同事的入口

> 最后更新：2026-10-10。
> **本站唯一正本是 [HANDOVER.md](HANDOVER.md)** —— 项目是什么、架构、数据结构、功能模块、部署步骤、当前线上状态、待办与风险，全在那份里。
> 本文**只放不能忘的硬纪律**，不重复正本内容（避免两份互相漂移）。`CLAUDE.md` 是指向本文的短指针。

## 0. 进门三步

1. 读 [HANDOVER.md](HANDOVER.md) 的 **§0 现状速览** —— 一页看懂线上现在跑的是什么。
2. 要动代码或部署，再读正本的 **§8 部署**、**§10 已知坑**、**§11 待办**。
3. 需要翻历史，看 [`docs/archive/README.md`](docs/archive/README.md) 的索引 —— **那里一律不是现状**。

## 1. 部署红线（唯一一条，违反即为事故）

> **没有用户在当次对话里明确授权，禁止对正式站做任何发布动作** —— 包括 `wrangler pages deploy ... --branch main`、`git push origin main`、Cloudflare 后台的 Rollback / 重新部署。
>
> 用户说"发测试版"**不等于**授权发正式版。拿到授权后：动手前先把「版本号 + 目标 = 正式站 + 具体命令」写给用户确认；发完把**部署 ID / 版本号 / 时间**记进正本 §0。

起因：2026-10-10 有会话绕过 GitHub、直接用 wrangler 把未授权版本直发正式站（部署 `9dc6e063`），仓库里找不到对应提交，正式站一度无法溯源。完整经过见正本 §8.0。

## 2. 绝对不要做

- **不要 `git push origin main`**：`main` 停在 2026-08-27（v481），推它 = 用 6 周前的代码覆盖正式站。
- **不要 `git reset` / `git checkout` / `git clean` 覆盖主站工作区**：工作区长期有未提交改动，那是唯一真相。
- **不要 `git add -A` / `git add .`**：`services/`、`.local/`、`.codex-backups/`、`.gemini-designer/`、`docs/archive/` 含服务器信息与私有资料，而**仓库是公开的**（已列入 `.gitignore`，但别绕过它）。
- **不要从这些历史测试分支 merge / push / 开工**：`unified-ui-redesign-test`（成果已并入 main）、`unified-cloud-library-test`、`ai-runtime-fix-test`、`gpt-prompt-image-test`、`image-reference-bridge-test`、`intelligent-rewrite-test`、`asset-library-vertical-scroll-test`、`archive/pre-unify-ui-20260608`。
- **不要改密钥与基础设施配置**：`config.js` 的 Supabase 地址/anon key、`wrangler.toml` 的 KV / D1 / 域名绑定。
- **不要代跑数据库迁移**：`sql/` 下的迁移由用户自己在 Supabase SQL Editor 执行。
- **不要在正式站做写操作**（打标签、"一键识别"、批量改类型、上传）：测试站与正式站**共用同一个数据库**，那是往真实库里写。

## 3. 干活时的硬约定

- 改完必须 **bump 版本号**：`index.html` 5 处 `?v=` + `app.js` 的 `TOOL_UI_VERSION`（正本 §8.1）。
- 提交前跑：`node --check app.js && node --test tests/`（基线 365 项全绿）。
- 本机部署必须带 DNS 绕过：`NODE_OPTIONS="--require $PWD/.local/dns-hook.cjs"`（正本 §8.6）。
- 写库逻辑里「**先读最新再合并、绝不拿空数组起底**」的保护（v868 加的）**不许删**（正本 §7.3）。
- 结论必须区分 **实测 / 代码可查 / 未核实**，不要把猜测写成事实 —— 这个项目的文档就是这么烂掉的。
