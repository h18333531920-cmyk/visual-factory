# AGENTS.md — 交接与部署守则（AI 助手 / 同事必读）

> 任何接手这个项目的人或 AI（Codex、Claude Code、Cursor 等），先读这一份。目的：**避免部署出错、避免用旧代码覆盖线上。**
>
> 本文档是交接守则的**权威版本**；`CLAUDE.md` 内容与本文一致，若两者冲突以本文为准。

## 1. 项目是什么

**GCC Design**（visual-factory）—— 一个 Supabase + Cloudflare Pages 的 DIY 海报编辑器。

- 线上域名：`https://gccdesign.app`（自定义域名，指向 Cloudflare Pages 项目 `visual-factory`，原始域名 `https://visual-factory.pages.dev`）
- 代码仓库：`https://github.com/h18333531920-cmyk/visual-factory`
- 数据层：Supabase（表 `vf_source_files`、Storage bucket `vf-library`）
- 部署：Cloudflare Pages（**自动部署已配好**，见第 3 节）

## 2. 关键事实：生产分支只有一个

**生产分支 = `main`，只有这一个。部署只认 `main`。**

- `main` 当前指向 = 最新生产版（书签增强 + EN/AR 语言标签 + unified UI，版本 `v260`）。
- 旧代码只存在于 git 历史和其他测试分支里，**不会被部署**，也不影响 `main`。
- **唯一会触发部署的动作 = `git push origin main`**（GitHub Actions 自动构建并发布）。

## 3. 部署流程（每次部署照做，漏一步就可能翻车）

### 3.1 改完代码后，必须 bump 版本号（最容易忘，忘了=浏览器用旧缓存看不到改动）

三处都要改，当前是 `v260`，下次改 `v261`：

| 文件 | 位置 | 内容 |
|---|---|---|
| `index.html` | 第 9 行 | `styles.css?v=20260814-sidebar-static-v260` |
| `index.html` | 第 843 行 | `app.js?v=20260814-sidebar-static-v260` |
| `app.js` | 第 112 行 | `const TOOL_UI_VERSION = '20260814-production-unified-ui-v260'` |

> 三处的日期前缀和末尾数字都改成新的（如 `20260815-...-v261`）。不 bump 会导致线上看不到新代码。

### 3.2 push 前先同步，避免撞同事的提交

```bash
git fetch origin --prune
git log --oneline origin/main..main        # 看本地领先什么
git log --oneline main..origin/main        # 看同事是否领先（若有，先合并）
```

### 3.3 基于最新 main 改，别从旧分支/旧版本开始

```bash
git checkout main
git pull --ff-only           # 或 fetch + merge --ff-only origin/main
# 改代码 → bump 版本号 → 本地验证 → commit → push
git push origin main
```

### 3.4 本地验证（push 前）

```bash
node --check app.js                       # 语法
npm run dev                               # 本地 8791 预览
```

### 3.5 部署后验证

```bash
curl -s "https://gccdesign.app/app.js?cb=$(date +%s)" | grep "TOOL_UI_VERSION"
# 应显示刚 bump 的新版本号
```

## 4. 旧测试分支清单（⚠️ 不要 merge / push / 从它们开始改）

这些是历史测试分支，指向旧代码，**全部废弃**。`unified-ui-redesign-test` 的成果已并入 `main`，其余未合并、无需保留：

```
unified-ui-redesign-test          → 53fbc2f  （已合并进 main，废弃）
unified-cloud-library-test        → f659926
ai-runtime-fix-test               → c055829
gpt-prompt-image-test             → 6a5a956
image-reference-bridge-test       → 6fd09f3
intelligent-rewrite-test          → fb067ea
asset-library-vertical-scroll-test → a058204
archive/pre-unify-ui-20260608     → 83ec9fa
```

**规则**：部署前，先确认 `git branch --show-current` 是 `main`；从任何旧分支 push 到 main 都会把旧代码带回线上。

## 5. 文件地图

| 文件 | 作用 |
|---|---|
| `app.js` | 主逻辑：Supabase 数据、`vf:*` postMessage 协议、素材库、模板保存/重命名/删除 |
| `index.html` | 外壳 + 路由 + 内联样式（含版本号引用） |
| `styles.css` | 全局样式 |
| `tools/static/frontend.html` | DIY 编辑器前端（书签增强、EN/AR 语言标签、模板编辑） |
| `tools/static/ui-unified.css` | 统一 UI 样式（同事优化） |
| `tools/library/index.html` | 素材库 |
| `tools/dynamic/animator.html` | 动态 DIY |
| `functions/api/*` | Cloudflare 后端函数（即梦生图等，只有部署到 Cloudflare 才生效） |
| `config.js` | Supabase 配置（勿硬编码密钥） |
| `.github/workflows/deploy.yml` | 自动部署：push main → build → wrangler deploy |

## 6. 已知陷阱 / 安全

- **版本号缓存**：不改版本号 = 用户看不到新代码。这是最常见的"部署了但没生效"原因。
- **Jimeng sessionid 是 live credential**：禁止 log、禁止硬编码，从 `/api/jimeng-session` KV 读取。
- **不要改**：`config.js` 里的 Supabase 地址/密钥、`wrangler.toml`、Cloudflare 项目的 KV 绑定和域名配置。
- **同事可能并行改**：部署前务必 `git fetch` 同步，冲突时以功能逻辑为主 + 保留 UI 的 DOM 结构/class。
