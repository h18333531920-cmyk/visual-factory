# CLAUDE.md

> 最后更新：2026-10-10。本文**只是指针**，内容与 [AGENTS.md](AGENTS.md) 一致，冲突时以 AGENTS.md 为准。

- **唯一正本**：[HANDOVER.md](HANDOVER.md) —— 现状速览 / 架构 / 数据结构 / 功能模块 / 部署 / 已知坑 / 待办 / 风险。
- **纪律与禁令**：[AGENTS.md](AGENTS.md) —— 部署红线、绝对不能做的事、干活硬约定。
- **历史文档（不要当现状读）**：[docs/archive/README.md](docs/archive/README.md)。

## 必须先知道的一条

> **没有用户在当次对话里明确授权，禁止对正式站 `gccdesign.app` 做任何发布动作** —— 包括 `wrangler pages deploy ... --branch main`、`git push origin main`、Cloudflare 后台的 Rollback / 重新部署。
> "发测试版" **不等于** 授权发正式版。测试站随便发，发完把链接给用户验收。
