# GCC Design（visual-factory）交接正本

> **这份文档是唯一正本。** 交接、接手开发、排查线上问题，先读这一份，读完就能上手。
> 其他所有说明文档：历史性的已归档到 [`docs/archive/`](docs/archive/README.md)（**不要当现状读**）；只保留极少数"活的手册"在 §13 列出。
>
> - 最后核对时间：**2026-10-10**（每条都标注了核对方式，见 §14）
> - 维护规则：正文由"改站点的人"改；**每次发布正式站都必须更新 §0 现状速览**。
> - 标注约定：**（实测）** = 本次联网/查库/跑测试验证过；**（代码可查）** = 有代码或 git 证据，附文件位置；**（未核实）** = 无法在本地证实，别当事实用。

---

## 0. 现状速览（一页读懂，每次发布后更新）

| 项目 | 当前值 | 依据 |
|---|---|---|
| 正式站 | `https://gccdesign.app`（Cloudflare Pages 项目 `visual-factory`） | 实测 |
| 正式站当前部署 | `9dc6e063-f3a9-4e50-8b35-a8521abffc2f`，版本标识 `20261010-ai-tag-ui-v2`，2026-10-10 15:18 手动直发 | 实测（部署清单 + 线上文件比对） |
| 正式站 app.js 内部版本 | `TOOL_UI_VERSION = '20260924-preview-ai-experiment-v870'`（与上面标识不一致，属历史遗留） | 实测 |
| 测试站 | `https://asset-gallery-test.visual-factory.pages.dev`，版本 `20261012-vocab-autosync-v900`（词表 3 列：中文名/英文名/相关词，靠数据库自动同步；浮窗「库内关联标签」分来源；缓存命中会后台静默重问）；部署 `29ee8d46-a84c-4579-82e8-95773e952740`，2026-10-12 本机 wrangler 直发 | 实测 2026-10-12 |
| 健康检查 | `https://gccdesign.app/api/health` → `ready/aiReady/openaiReady/lk888Ready/volcImageReady/volcOutpaintReady` 全 `true` | 实测 2026-10-10 |
| 代码仓库 | `https://github.com/h18333531920-cmyk/visual-factory`（**public**） | 实测 |
| git `main` | `3a8ad0f`（2026-08-27，`20260827-fast-static-session-v481`），**落后线上约 6 周，不是线上基线** | 实测 |
| 本地工作区 | 分支 `tmp-deploy-v871`，工作区干净（`084ba71`）；测试站走**本机 wrangler 直发**（GitHub Actions 那条通道发不出 `dist/functions/api/*` 里未跟踪的端点，见 §8.3） | 实测 2026-10-12 |
| 自动化测试 | `node --test tests/` → **397/397 通过**（含标签词表平表 / 相关词 / 库内标签口径 / 浮窗分源 / 缓存重问 / 词表自动同步 18 项） | 实测 2026-10-12 |
| 数据库 | Supabase 项目 `juuqvjmhzdgfggzrivbb`；测试站与正式站**共用同一个库和 `vf-library` 存储桶** | 实测（查库）+ 代码可查 |
| 数据库迁移状态 | `sql/021_preview_ai_tags_experiment.sql` **已由用户手动执行**（`manual_tags` 列已存在）；词表三件 `sql/022` / `023` / `024` 也已执行（实测：`select=related` 返回 200，故意查假列名返回 400 ⇒ `related` 列真实存在）；**`sql/025_tag_vocabulary_auto_sync.sql` 待用户执行**（词表自动同步，见 §11 v900） | 实测 2026-10-12 |
| 唯一部署红线 | **没有用户当次明确授权，禁止对正式站做任何发布动作** | 见 §8 |

**当前需要人决定/处理的事** → §11；**风险和安全边界** → §12。

---

## 1. 这个网站是什么

- **GCC Design**：给设计工作流用的网页工具集 —— 素材/案例库、静态 DIY 海报编辑器、动态 DIY 动画编辑器、ICON 生成工具、需求提交流程、数据分析看板、团队与账号权限管理。
- 使用者：公司内部设计/运营同事（现有真实项目数据在跑，**别拿正式站做实验**）。
- 开发模式：一个开发者 + 多个 AI 助手（Codex / Claude Code / Cursor / Gemini 等）交替接手，所以文档和纪律比一般项目更重要。
- 工作纪律（用户明确要求过，历史文档反复出现，这里收拢为唯一版本）：
  1. **新功能先发测试站**，用户验收通过、且**当次明确授权**后才发正式站。
  2. **正式站与测试站共用同一个 Supabase**：所以写数据（打标签、重跑识别、上传）是往真实库里写，**只增不改**，核验造的测试数据要还原。
  3. 数据库迁移由**用户自己在 Supabase SQL Editor 执行**，AI 不代跑历史迁移。
  4. 密钥、令牌、服务器配置**不进聊天、不进公开文档、不进静态包**。
  5. 用户习惯：中文短回复；结论 + 测试链接；截图红框就是本次范围；运维指引要"保姆级"（直达 URL + 可粘贴命令）。

---

## 2. 技术架构

### 2.1 前端
- **单文件应用**：`app.js` 是唯一主逻辑（**18,620 行 / 1.04 MB**），所有 UI、状态、组件、部分组件级 CSS 都在一个 IIFE 内；**没有框架**（无 React/Vue/Svelte），纯原生 DOM 操作。
- 入口 `index.html`（995 行 / 30.5 KB）引入：`config.js` → `account-access.js` / `account-access.css` → `template-source-cache.js` → `app.js`，全部带 `?v=` 版本号（**共 5 处**，见 §8.1）。
- 样式两份：全局 `styles.css`（13,247 行）；另一部分组件级 CSS **内嵌在 `app.js` 里**用 `<style>` 注入（改样式时两边都要找）。
- 页面切换靠 `location.hash` + `state.route`（见 §4）。

### 2.2 工具页（iframe）
- `tools/static/frontend.html`（**1,211,452 B / 约 20,074 行**）：静态 DIY 海报编辑器，是业务最重的工具。
- `tools/dynamic/animator.html`：动态 DIY 动画编辑器（同理）。
- `tools/icons/`：ICON 生成工具（源码在 `tools-src/icons/`，Vite + TypeScript，构建产物进 `tools/icons/`）。
- `tools/jimeng-bridge-extension/`：Chrome 扩展，用于即梦生图（规范源现在不在本仓库，见 §13）。
- 工具页与主框架通过 `tool-bridge.js` 的 `postMessage` 协议 (`vf:*`) 通信；权限校验在 `tool-auth-guard.js`。

### 2.3 后端
- **Supabase**：PostgreSQL + Auth + Storage + RLS，是数据真源（表见 §6）。
- **Cloudflare Pages Functions**（`functions/`）：部分后端能力，主要是 AI 相关 —— 如 `functions/api/analyze-elements.js`（GLM-4V-Flash 元素识别）、`generate-image.js`、`outpaint-image.js`、`analyze-language.js`、`case-preview-ai-tags.js`、`admin/*`（账号管理）、`api/health.js`。共享 AI 逻辑在 `functions/_ai.js`。
- **Cloudflare D1**：账号系统一部分表在这里（`wrangler.toml` 有 D1 绑定），与 Supabase 并存是**已知的存储分裂点**。
- **外部生图网关**：`https://jimeng.gccdesign.app`（受保护的生图服务，鉴权与计费在服务端，前端不保存即梦登录态）。旧的公开凭证通道已下线：`/api/jimeng-session`、`/api/jimeng` 均固定返回 **410**（代码可查：`functions/api/jimeng-session.js:5`、`functions/api/jimeng.js:5`）。
- `api/` 目录是 Vercel 时代的遗留路由（已迁移到 Cloudflare），**只作参考，不在线上链路**。

### 2.4 工具链
```json
// package.json scripts（实测）
"dev":         "python3 -m http.server 8791 --bind 127.0.0.1",
"build:pages": "构建 API 指南 → 构建 icons → 生成平台库 → 组 dist/",
"build:icons": "npm --prefix tools-src/icons ci && npm --prefix tools-src/icons run build"
```
- 测试：`node --test tests/`（原生 `node:test`，无框架依赖）。

---

## 3. 文件地图

| 路径 | 说明 | 规模 |
|---|---|---|
| `app.js` | 主应用逻辑（单文件前端，唯一主逻辑） | 18,620 行 |
| `index.html` | 入口 HTML + 路由 + 大量内联样式 + 5 处版本号 | 995 行 |
| `styles.css` | 全局样式 | 13,247 行 |
| `config.js` | Supabase URL / anon key / 应用开关（`allowLocalPreviewLogin`、`storageLimitGB`） | 7 行 |
| `account-access.js` / `.css` | 账号权限系统的前端部分 | — |
| `template-source-cache.js` | 静态模板元数据/IndexedDB 缓存（1 GiB / 80 项上限） | — |
| `tool-auth-guard.js` / `tool-bridge.js` | 工具页权限校验 / iframe 通信桥 | — |
| `animator.html` | 动态 DIY 的宿主页 | — |
| `functions/` | Cloudflare Pages Functions（后端 API） | — |
| `api/` | Vercel 遗留路由，**仅参考** | — |
| `sql/` | 数据库初始化与迁移 SQL（`001`–`021` + 账号系统 D1 脚本） | 13 个 |
| `tools/` | 工具产物集合（static / dynamic / icons / jimeng-bridge-extension） | — |
| `tools-src/icons/` | icons 工具源码（Vite + TS） | — |
| `services/` | 私有运维与服务说明（**未进 git，不进公开仓库**，见 §12） | — |
| `docs/` | 现存唯一规划稿；`docs/archive/` 为历史归档 | — |
| `dist/` | 构建输出（`wrangler` 实际发布的就是它） | — |
| `tests/` | 365 项自动化测试 | 59 个文件 |
| `.local/` | 本机部署脚本与一次性工具（`deploy-fast.sh`、`dns-hook.cjs`、标签恢复脚本等，**未进 git**） | — |
| `.github/workflows/` | `deploy.yml`（正式站）、`deploy-test.yml`（测试站） | — |

---

## 4. 路由与页面

路由靠 `location.hash`，当前路由存在 `state.route`。切换时用 `parkActiveToolFrame()` 收起旧 iframe，再渲染进 `els.content`。

| 路由 | 渲染函数 | 说明 |
|---|---|---|
| `home` | `renderCreativeHome()` / `renderLibrary({homeMode:true})` | 首页：灵感卡片 + 最近项目 |
| `library` | `renderLibrary()` | **素材库 / 案例库 —— 核心业务页** |
| `static` | `renderTool('static')` | 静态 DIY 海报编辑器（iframe → `tools/static/frontend.html`） |
| `dynamic` | `renderTool('dynamic')` | 动态 DIY 动画编辑器（iframe → `animator.html`） |
| `icons` | `renderTool('icons')` | ICON 生成工具「制作金刚」（iframe → `tools/icons/`） |
| `request` | `renderRequestFlow()` | 需求提交流程 |
| `admin` | `renderAdmin()` | 团队管理：成员、物料清单、权限 |
| `analytics` | `renderAnalyticsPage()` | 数据分析看板（**仅管理员**） |

（代码可查：`app.js:827-828` 等路由注册处；`analytics` 为 adminOnly。）

---

## 5. 状态管理

- `state` 是**单例全局对象**，存所有应用状态。关键字段：

| 字段 | 说明 |
|---|---|
| `lang` | `'zh'` / `'en'`，持久化在 localStorage |
| `supabase` | Supabase client 实例 |
| `session` / `profile` | 当前登录 session / 用户资料 |
| `route` | 当前路由 |
| `uiRestricted` | 是否为受限的用户模式 |
| `librarySources` | 来源文件/项目数组（`vf_source_files` 行） |
| `libraryPreviews` | 预览图/物料数组（`vf_asset_previews` 行） |
| `libraryPreviewUrls` | 签名 URL 缓存（`path → signedUrl`） |
| `libraryOptions` | 词表：国家 / 活动 / 类别 |
| `libraryFilters` | 当前筛选条件 |
| `libraryFavorites` | 收藏的 `preview_id` 集合 |
| `libraryBookmarkGroups` | 书签分组 |
| `previewAiTagsByPreviewId` | 逐图 AI 标签缓存（`previewId → row`） |

- `els` 是空的 DOM 引用缓存对象（运行时填 `els.content`、`els.nav` 等），避免重复 `querySelector`。
- **注意**：`state` 和 `els` 都是单例 + 大量函数直接读写它们，改代码时留意作用域（见 §10 单文件陷阱）。

---

## 6. 数据模型

> 全部 SQL 在 `sql/`（`001`–`021` + 两个 D1 脚本）。**执行状态以 §0 为准，AI 不要代跑迁移。**

### 6.1 核心业务表

| 表 | 关键字段 | 说明 |
|---|---|---|
| `vf_profiles` | `id`→`auth.users(id)`、`email`、`display_name`、`role`(enum `vf_role`，默认 `operator`)、`status` | 用户资料 |
| **`vf_source_files`** | `id`、`title`、`country_id`/`activity_id`/`category_id`→`vf_library_options`、`tags text[]`、`visibility`(enum)、`source_path`、`source_filename/mime_type/size_bytes/ext`、`owner_name`、`owner_contact`、`project_note`、`download_link`、`uploaded_by`→`auth.users`、时间戳 | **最核心的表**：一行 = 一个项目或一个单图素材。`source_path` 为空且有预览图 ⇒ 这是一个"案例库项目"。`tags` 里混着业务标签与 `vf:` 前缀的内部标记 |
| **`vf_asset_previews`** | `id`、`source_file_id`→`vf_source_files`（级联删）、`preview_path/filename/mime_type/size_bytes`、`width`、`height`、`sort_order`、`material_type`、`language` | 一行 = 一张预览图/物料。`material_type` 由物料清单按尺寸自动识别（可手改）；`language` 存 EN/AR 标记（`sql/020`） |
| `vf_library_options` | `id`、`option_type`(`country`/`activity`/`category`/`case_activity`)、`name_en`、`name_zh`、`sort_order`、`active` | 词表（国家/活动/类别） |
| `vf_asset_favorites` | `user_id`+`preview_id` 复合主键 | 收藏 |
| `vf_asset_events` | `actor_id`、`actor_role`、`event_type`、`source_file_id`、`preview_id`、`meta jsonb` | 事件日志。`event_type` 现在包含 `imagegen`（`sql/018`），看板的"生图统计"读它。**不是永久审计账本**：素材/预览级联删除会带走历史行 |
| `vf_projects` | `owner_id`、`project_type`(enum)、`title`、`data_path`、`snapshot_meta jsonb` | 云项目存档（海报编辑器工程文件） |

### 6.2 标签 / 识别

| 表 | 关键字段 | 说明 |
|---|---|---|
| `vf_preview_ai_tags` | PK(`experiment_key`,`preview_id`)、`source_file_id`、`ai_tags`、**`manual_tags`**、`excluded_tags`、`status`(`idle`/`running`/`success`/`failed`/`expired`)、`model`、`content_key`、`run_id`、`error_message`、`updated_by` | 逐图 AI 标签实验（`sql/021`）。与项目级 `tags` 分离，**逻辑副本**：不改原项目、不复制图片文件。`manual_tags` 是后补的列——**没执行最新 `sql/021` 时前端会提示"需补执行 sql/021"**（本地 v872 改动加的保护） |
| `vf_material_catalog` | 单行 `entries jsonb` | **物料清单 = 识别规则的唯一依据**（三层：**端 → 大类别 → 子类别尺寸**）。识别函数 `detectMaterialTypeByCatalog(platform,w,h)`：严格按端、同比例 ±2% 命中、不跨端兜底，都不中就留空"未分类"。老口径 `CASE_TYPE_RULES` / `CASE_FILENAME_TYPE_KEYWORDS` 已**删除**（不要再找它们） |
| **`vf_tag_vocabulary`** | `id`（形如 `el:披萨`）、`name_zh`（唯一）、`name_en`、`kind`（`element` / `group` / `ignored`）、`source`（`ai` / `manual`）、**`related text[]`**；**已废弃的列**：`aliases`、`parent_id` | 标签词表（`sql/022` + `sql/024`；`023` 的 `parent_id` 自 v891 起不再读写）。管三件事：① 双语显示 ② 搜英文（`coffee`）命中中文标签 ③ 搜大词（`甜点`）带出该行 `related`（蛋挞、蛋糕…）。界面在团队管理页，**平表**：中文名 / 英文名 / 相关词 / 删除，改完即存；每行「AI 建议」走 `/api/tag-vocabulary-related`。RLS：读 = 登录用户，写 = 管理员 |
| `vf_team_members` | 见 `sql/015_team_members.sql` | 使用者名单（上传表单的"负责人"等） |

### 6.3 账号权限系统

分两处存（**具体边界未核实**，改动前先读 `sql/account-access-d1.sql`、`sql/account-panel-v545-d1.sql` 与 `functions/api/admin/*`）：

- **Cloudflare D1**：`vf_accounts` 等（`functions/api/analytics-accounts.js` 读 D1 的 `vf_accounts`）。
- **Supabase**：`vf_access_config`、`vf_access_attempts`、`vf_account_passwords`、`vf_account_features`、`vf_account_handoffs`、`vf_account_audit`、`vf_maintenance_sessions`。

> 私有运维细节（服务器、实例 ID、交付信息）在 `services/account-access/` 与 `services/icon-cutout/`，**未进 git，不进公开仓库**。

### 6.4 遗留表（别用）

`vf_assets`、`vf_categories`、`assets_library`、`vf_storage_policy_backup` —— 早期版本的遗留，已被 `vf_source_files` 体系取代（`app.js` 里已无引用）。

---

## 7. 功能模块

### 7.1 素材库 / 案例库（`library`）—— 核心业务
- 入口 `renderLibrary()`；网格 `renderLibraryGrid()`，卡片 `renderLibraryCard()`。
- 上传流程 `renderUploadModal()`：支持单图 / 多图 / 项目上传；案例库上传**必填平台 + 国家**、单次上限 **100** 张、进度按张数、取消上传不再卡按钮。
- 批量编辑 `openBatchEditModal()`；多选 `libraryMultiSelect` / `librarySelectedIds`。
- 书签系统 `renderLibraryBookmarkModal()` / `renderLibraryBookmarkInlineHover()`。
- 搜索：`libraryItemSearchText()` / `libraryItemMatchesQuery()`，含拼音与英文扩展表。**AI 联想只从库内标签里挑（v894）**：搜索框下方浮窗显示「库内关联标签」（`/api/expand-query` 的 `terms` 经客户端反查/词表校验后的结果，点一下改成只搜该标签）；AI 返回但库里没有的词一律丢掉、也不参与匹配。词表 `related` 那一层是**零 AI 的确定性扩展**（`tagVocabularyQueryTerms`）。
- **案例项目的判定**：`source_path` 为空 **且** 有预览图 ⇒ 案例项目（`isCaseProject()`）。

### 7.2 案例项目浮窗（case project modal）—— 改动最频繁的模块
| 函数 | 说明 |
|---|---|
| `openCaseProjectModal(sourceId, focusType)` | 打开浮窗：头部信息、左右切换物料、素材网格、底部/右侧标签、逐图 AI 标签面板 |
| `renderCaseProjectHeadInfo(...)` | 保存后就地更新头部，**不关闭浮窗** |
| `enterCaseHeadInlineEdit(...)` | 浮窗内就地编辑表单（v870+） |
| `renderCasePreviewAiPanel(...)` | 当前物料的 AI 标签面板（本地 v872 起：DB 迁移未就绪时**禁用编辑并提示**） |
| `wireCasePreviewAiHover(...)` | 标签溢出 popup |
| `caseMaterialsOf(source)` / `isCaseProject(source)` / `canManageSource(source)` | 取物料 / 判类型 / 判权限 |
| `canonicalCaseProjectSource(...)` | 同名项目兜底：只有"小项目的文件名全集被大项目包含"时才跳转到完整项目（v869 加的保险） |

### 7.3 标签体系（四层，别混）
1. **项目固定标签**：`vf_source_files.tags` 里的国家/活动/类别 + `vf:` 前缀内部标记（`vf:kind:source`、`vf:case-element:v1:*`、`vf:manual-mtype:*`、策略/活动标记等）。用 `caseChipSelectionOf()` / `caseTagSelectionUpdatePayload()` 等辅助函数处理，**别手拼字符串**。
2. **案例库二级标签**：按物料类型分组（会场楼层、横 banner 等）。
3. **逐图 AI 标签**：`vf_preview_ai_tags`（见 §6.2）。
4. **物料清单**：按端分类的尺寸规则，用于自动识别 `material_type`。

⚠️ **历史事故**：v864 引入过一个"手动改类型就把项目业务标签整组抹掉"的严重 bug（写入时把 `fresh.data.tags` 误写成 `fresh.tags`）。v868 修好，本地代码里 `markCaseManualTypes()` 有明确注释和防护（`app.js` 附近有 `// v868：行读不到就绝不写`）。**改标签写入逻辑时不要删掉这层保护。**

### 7.4 团队管理 / 管理页（`admin`）
`renderAdmin()`：成员管理、**物料清单编辑器**（三层：端 → 大类别 → 子类别尺寸，含折叠/多开、多尺寸气泡、就地编辑、拖拽、去重）、"按清单重跑识别"（**会写共享库，需用户授权**）。

### 7.5 AI 能力
- 元素识别 `/api/analyze-elements`（GLM-4V-Flash，`functions/_ai.js`，测试 `tests/element-ai-suggest.test.mjs`）。
- 逐图 AI 标签实验 `/api/case-preview-ai-tags` + "一键识别"（只对实验项目，`CASE_PREVIEW_AI_EXPERIMENT_SOURCE_ID` = AugPicks campaign）。
- 生图：网关 `https://jimeng.gccdesign.app`（服务端托管凭证）；前端 `VF_MANAGED_JIMENG` 只在这三个域名下启用：`gccdesign.app` / `visual-factory.pages.dev` / `asset-gallery-test.visual-factory.pages.dev`。
- **生图预设/配色快照是按登录账号私有的**（存 `vf_source_files` 中带 `PALETTE_CONFIG_TAG` 的行 + Storage JSON，读逻辑 `app.js:18251 VF_LOAD_COLOR_PALETTES`）。**换账号或新账号就会退回内置默认预设** —— 这是设计，不是 bug（2026-09-21 已在 `MAINTENANCE.md` 记录过同一现象）。

### 7.6 数据分析看板（`analytics`，仅管理员）
操作事件统计、热门素材预览、环图、生图统计（Lite/Pro 次数与积分）。数据源 `vf_asset_events`（含 `event_type='imagegen'`）。

---

## 8. 部署

### 8.0 红线（唯一一条，必须遵守）

> **没有用户在当次对话里明确授权，禁止对正式站做任何发布动作** —— 包括 `wrangler pages deploy ... --branch main`、`git push origin main`、Cloudflare 后台的 Rollback / 重新部署。
> 用户说"发测试版"**不等于**授权发正式版。
>
> 授权后照做：① 动手前把「版本号 + 目标 = 正式站 + 具体命令」写给用户确认一句；② 发完把**部署 ID / 版本号 / 时间 / 改了什么**记进本文件 §0 和当次交接记录。
>
> 为什么会立这条：**2026-10-10 下午 15:03 / 15:11 / 15:18**，有 AI 会话绕过 GitHub、直接用 wrangler 把未授权版本发上正式站（最新部署 `9dc6e063`）。仓库里找不到对应提交，正式站一度成了无法溯源的"黑盒"。部署只换静态文件、**不会损坏数据**，但会把未验收的功能直接暴露给同事，属严重流程事故。

### 8.1 第一步永远是 bump 版本号（漏了 = 用户看不到改动）

```bash
cd /Volumes/WenshuSpace/AI编程开发程序/visual-factory
grep -n '?v=' index.html            # index.html 里 5 处资源引用，全部同步改
grep -n "TOOL_UI_VERSION =" app.js  # app.js 里 1 处常量，同步改
```

当前值示例：`20260924-ai-inline-edit-v872`（日期前缀随当天改、末尾自增）。**两处不同步 = 线上会出现新旧混用。**

### 8.2 本地验证（必做）

```bash
source ~/.nvm/nvm.sh && nvm use 20
node --check app.js
node --test tests/          # 基线 365 项，必须全绿
npm run build:pages         # 生成 dist/，wrangler 发的就是它
```

### 8.3 发测试站（自由发，发完把链接给用户）

```bash
# 2026-10-12 实测：本机不需要 DNS 绕过也能发（§8.6 已更正，别再加 NODE_OPTIONS）
npx --yes wrangler@4.60.0 pages deploy dist \
  --project-name visual-factory --branch asset-gallery-test --commit-dirty=true

# 验证（两处版本号都要变）
curl -s "https://asset-gallery-test.visual-factory.pages.dev/?cb=$(date +%s)" | grep -o 'app\.js?v=[^"]*'
curl -s "https://asset-gallery-test.visual-factory.pages.dev/app.js?cb=$(date +%s)" | grep -m1 "TOOL_UI_VERSION"
```

- ⚠️ **发完有 1–3 分钟窗口期**：实测刚发完时 `index.html` 已是新版、`app.js` 还是旧版（`?cb=` 也不一定救回来）。判不定就打开本次部署自己的 URL（`https://<部署 ID 前 8 位>.visual-factory.pages.dev`）验货，或者过一两分钟再测。
- ⚠️ **已经打开着页面的同事可能看到 `ERR_CONNECTION_RESET`（2026-10-12 实测）**：Pages 换部署时，旧部署上的在途连接会被关掉，页面就报这个错——**不是站点挂了**。判据：`curl` 站点与资源都是 200、健康检查全 true、在浏览器里新开标签页能进。让用户 `Cmd+Shift+R` 硬刷新即可。（这次是我发 v896 时用户在浏览器里遇到的，一度以为发布出事故。）
- ⚠️ **`dist/functions/api/` 里有文件没进 git**：`tag-translate.js` 从来没有（未跟踪 + `dist` 在 `.gitignore` 里），2026-10-12 新增的 `tag-vocabulary-related.js` 已用 `git add -f` 补进去。GitHub Actions 的 checkout 拿不到未跟踪文件 ⇒ **Actions 那条测试站通道发不出这些端点**，**本机 `wrangler` 直发才是完整通道**。
- ⚠️ **wrangler 偶发部署失败**：2026-10-12 发 v896 时第一次报错、第二次成功（提示 `Uploaded 0 files (55 already uploaded)`）——资源按内容哈希去重，第一次其实已经传上去了。**遇到报错先重跑一次**，并用「版本号 + 文件字节数」复核，别以为站是半截状态。
- 部署完记得把**部署 ID / 版本号 / 时间**记进 §0。

### 8.4 发正式站（**先拿到用户当次授权**）

```bash
npx --yes wrangler@4.60.0 pages deploy dist \
  --project-name visual-factory --branch main

# 验证 + 记录
curl -s "https://gccdesign.app/app.js?cb=$(date +%s)" | grep -m1 "TOOL_UI_VERSION"
curl -s "https://gccdesign.app/?cb=$(date +%s)" | grep -o 'app\.js?v=[^"]*'
```

### 8.5 GitHub Actions 路线（可选，但要知道它的坑）

| workflow | 触发 | 干什么 |
|---|---|---|
| `.github/workflows/deploy.yml` | push **`main`** | 构建 + 发**正式站**。⚠️ 只有确认 `main` 就是要发的代码才能用 —— 现在 `main` 落后 6 周，推它等于用旧代码覆盖正式站 |
| `.github/workflows/deploy-test.yml` | push **`tmp-deploy-*`** 分支 | 把**提交里那份 `dist/`** 发到**测试站**，**不重新构建**。所以走这条路必须先 `npm run build:pages` 并把 `dist/` 一起提交 |

> ⚠️ **2026-10-12 实测更正**：这条路**发不全**。checkout 只拿得到 git 跟踪的文件，而 `dist/functions/api/` 下有未跟踪文件（`tag-translate.js` 等）⇒ 走 Actions 会把已有的端点发丢。**测试站请用 §8.3 的本机直发。**

### 8.6 这台机器专属的坑（很重要）

- **DNS 绕过脚本已过时（2026-10-12 实测）**：`api.cloudflare.com` 现在本机能正确解析（`104.19.192.x`）；再套 `.local/dns-hook.cjs`（硬编码 `104.16.123.96`）反而被 Cloudflare 拒绝（`GET /user -> 403`，页面报 **error code 1034 / Edge IP Restricted**），看起来像"没登录"。**现在直接用 `npx wrangler` 即可，不要加 `NODE_OPTIONS`。**（脚本文件留在 `.local/` 备用。）
- 本机已有 wrangler OAuth 登录态（账号 `h18333531920@gmail.com`，账号 ID `555fab154fbf8785df1faf9380a9ce81`，8 月登录，2026-10-12 仍有效）；`wrangler whoami` 可自查。
- 现成脚本：`.local/deploy-fast.sh`（60 次重试）、`.local/deploy-retry.sh`（20 次重试）、`.local/poll-version.sh`（轮询线上版本号确认生效）。
- **网络很慢**：1 MB 的文件下载经常中途截断。验证时一定带 `?cb=$(date +%s)`，并注意**截断 ≠ 文件坏了**（曾因此误判线上文件不一致）。改完看**文件字节数**比 grep 更可靠。
- **禁止 `git reset` / `checkout` / `clean` 覆盖工作区** —— 主站工作区长期有未提交改动，那是唯一真相。

### 8.7 回滚（正式站原生支持，随时可退）

Cloudflare Pages **原生支持**把生产环境指回任意历史部署：几秒钟生效、不动数据。官方说明：[Rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)。

1. 打开部署列表：`https://dash.cloudflare.com/555fab154fbf8785df1faf9380a9ce81/pages/view/visual-factory/deployments`
2. 在 **All deployments** 里找目标部署（看 Environment = **Production** + 时间）→ **先点开它自己的 URL 验货**（确认是想要的那一版）
3. 点它右边的 `⋯` → **Rollback to this deployment** → 确认 → **生产环境立刻切换**
4. 回退后仍可再往前滚回更新的版本（双向）

三个前提，缺一个回退就靠不住：

- **正式站必须继续用 `--branch main` 发布**。只有"生产部署"是合法回退目标；用别的分支发出的是 **Preview，不能当回退目标**（官方原文：preview deployments are not valid rollback targets）。
- **必须先关掉"生产分支自动部署"**（见 §8.8）。否则你回退完，下一次 push `main` 又会自动把新版本推回正式站。
- 回滚属于"正式站发布动作"，同样**先拿用户授权**；历史遗留的正式站版本多为手动直发，回退目标要先验货再点。

### 8.8 环境配置：自动部署只发测试版，正式站只走手动

本项目的既定要求：**日常改动只自动部署测试站；正式站一律手动、且随时可回退。** 所以有两条"自动发正式站"的路必须关掉（官方说明：[Branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)）：

| # | 哪条路 | 怎么关 | 状态 |
|---|---|---|---|
| 1 | **Cloudflare 自身的自动部署**（Git 集成：push 到生产分支就自动构建发布） | Pages 项目 → **设置 → 构建和部署 → 配置生产部署** → 取消勾选 **「为生产分支启用自动部署」** → 保存 | ⏸ 暂缓（2026-10-10 用户决定先不做） |
| 2 | **GitHub Actions `deploy.yml`**（push `main` → 构建 → 发正式站） | 仓库 → **Actions** → 左侧选 `Deploy to Cloudflare Pages` → `⋯` → **Disable workflow** | ⏸ 暂缓（2026-10-10 用户决定先不做） |

> **状态说明（2026-10-10）**：用户决定**暂缓**上面两步（Cloudflare 后台为英文界面，操作成本高）。在缓做期间，风险由这四条兜住：
> ① `main` 无人推送（停在 2026-08-27）；② 正式站发布必须当次授权（§8.0 红线）；③ 发错可一键回退（§8.7）；④ 每次发布必须记录部署 ID（§0）。
> 想做时照上表点击即可，**不需要改任何代码**。

预览分支保持默认「所有非生产分支」即可 —— 这样推 `main` 会生成一个**预览**部署（可以先看再决定），但**不会**动正式站。

关掉之后的行为：

- **测试站照旧自动发**：`.github/workflows/deploy-test.yml` 监听 `tmp-deploy-*` 分支；本机 `.local/deploy-*.sh` 也可直发 `--branch asset-gallery-test`。
- **正式站只能手动发**：按 §8.4 的 `wrangler ... --branch main`（需用户当次授权），发错了按 §8.7 一键回退。
- 仍然存在的口子：拿到部署凭证的人/AI 可以**手动**发正式站（技术无法阻止，因为 token 权限只到"Cloudflare Pages:Edit"，管不到分支）。补偿手段就是本节 + §8.7 + 每次发布必须记录部署 ID。

> **本节属于"配置事实"，改动它要当作正式站发布来对待。**
> 教训：2026-10-10 有会话绕过全部流程手动直发正式站（部署 `9dc6e063`），当时"自动部署"仍处于开启状态，等于正式站有两条无人看管的入口。

---

## 9. 本地开发与自查

```bash
npm run dev        # 起本地静态服务：http://127.0.0.1:8791
```

- 本地预览有**角色切换按钮**（Admin / Designer / Operator），只用于看界面，**不写云端**。
- 需要 `config.js` 里有正确的 Supabase URL 与 anon key（anon key 是公开客户端密钥，随前端下发）。
- **想确认任何一条现状，都可以自己复跑**：

```bash
# 线上版本标识
curl -s "https://gccdesign.app/?cb=$(date +%s)" | grep -o 'app\.js?v=[^"]*'
# 线上 app.js 内部版本（前面几百行内）
curl -s "https://gccdesign.app/app.js?cb=$(date +%s)" | grep -m1 "TOOL_UI_VERSION"
# 线上健康检查
curl -s "https://gccdesign.app/api/health"
# 测试基线
node --check app.js && node --test tests/
# 仓库/分支状态
git status --short && git log --oneline -3 && git rev-parse --abbrev-ref HEAD
```

---

## 10. 已知坑（踩过的，别再踩）

| 类别 | 坑 |
|---|---|
| **版本号** | 不改 `?v=` / `TOOL_UI_VERSION` = 用户看到旧缓存。这是"部署了却没生效"的头号原因 |
| **单文件** | `app.js` 是单文件 IIFE 应用，改的时候注意变量作用域；同名的局部变量很多 |
| **CSS 两处** | 组件级 CSS 有的在 `styles.css`，有的内嵌在 `app.js` 里（`<style>` 注入）。改样式要两边找 |
| **表格** | 改表格列数时，**所有拼 `<tr>` 的 `innerHTML` 都要同步改列数** |
| **重绘** | 任何 `body.innerHTML = ...` 的路径都可能打断正在进行的编辑（含 `enterCaseHeadInlineEdit` 的就地编辑） |
| **标签** | `tags` 是 `text[]`，混着业务标签和 `vf:` 内部标记。用辅助函数处理，别手拼；写库是"读最新再合并"，**绝不拿空数组起底**（v864 的教训） |
| **滚动** | `#content` 名义上是 `overflow: hidden auto`，但内容撑开了高度 —— **真正滚动的是文档**，不是 `#content` |
| **共享数据库** | 测试站和正式站共用 Supabase / `vf-library`："测试"数据会进真实库；写只增不改；造的测试数据要还原 |
| **预设快照** | 生图预设/配色按**账号**私有；换账号即回退内置默认（设计如此，不是 bug） |
| **即梦凭证** | 即梦 sessionid 是 live credential：不 log、不硬编码、不进文档；已改由服务端托管 |
| **构建产物** | Actions 的测试站通道发的是**仓库里提交的那份 `dist/`**，不重新构建；忘了构建就会发出旧代码 |

---

## 11. 待办与未决事项

> **标签词表 / 搜索 的交接（2026-10-12 第六轮收尾快照 v895，新对话从这里接手）**
>
> **测试站已上线 v895（部署 `047b0d38`；生产未动）**
> - 标签**双语显示**：中文界面显中文、英文界面显英文；新标签自动进词表 + 自动补英文（中文界面后台补，不阻塞）
> - 「中英对照表」= 表 `vf_tag_vocabulary`（`name_zh` / `name_en`）：管双语显示 + 搜英文命中中文
> - 「相关词表」= 同表的 `related text[]` 字段：管"搜大词带出小词"。**设计口径已定死，不要再加层级/概念 ID/多父级/别名**
> - 搜索三层：① 子串 ② 中英归一（`coffee`→咖啡）③ 该行 `related` 一并匹配（`app.js` 的 `tagVocabularyQueryTerms`）
> - 已执行的 SQL：`022`（词表）、`023`（parent_id，**已废弃不用**）、`024`（related）
> - **词表界面是平表**：`中文名 | 英文名 | 相关词 | 删除`；相关词逗号分隔输入框（中英文逗号/顿号/分号都认），**失焦即存**；每行「AI 建议」调 `/api/tag-vocabulary-related`
> - **⭐⭐ v894 的最终口径（AI 联想标签照这条走，别的都别加）**：
>   **AI 只负责「从库内现有标签里挑」，挑不到就空着。库里没有的联想词一律不显示、不参与匹配。**
>   理由（用户定的）：搜索是按标签字面命中的，库里没有的词**搜不到任何物料**，显示出来只会误导人。
>   - 落地在搜索框下方的浮窗：**「库内关联标签」**（`#search-history-dropdown` 那个位置）——只在搜索框聚焦时弹，列出当前关键词命中的库内标签，**点一下 = 改成只搜该标签**；AI 开关关掉就不弹。
>   - 客户端硬过滤：AI 返回的词先 `libraryExpansionCanonicalTerm()` 反查词表换回中文（英文/拼音搜索必须），再用 `libraryExpansionIsLibraryTerm()` 判断「库内到底有没有」，**只留有的**；词表没加载时（返回 null）不乱丢。
>   - 服务端 `/api/expand-query` 仍返回 `terms`（库内命中）/`fresh`（词表外新造）两桶，但**前端只消费库内层**；提示词已改成「只从词表里挑，挑不到返回空数组，不要编造词表外的词」。
>   - 词表锚定规则本来就有（v831 复合词桥接 / v839 券票卡同族 / v845 中东节日桥 / 服务端词表锚定），一并在服务端生效。
> - **⭐ v895 修「搜到的标签不全面」**（用户实测：搜「足球」只出 球场/运动员，可库里明明有 世界杯/球衣/体育赛事）。三个原因：
>   1. **词表只喂了前端那 120 个**（`librarySearchVocabulary()` 有上限，真实标签排在末尾容易被裁掉）→ 模型根本看不到 球衣/体育赛事，自然挑不出来。**代码可查**
>   2. **「库内有没有」只查 `vf_tag_vocabulary`** —— 那张表是增量长出来的（标签要经一次翻译落库才进表），有的标签在用却还没进表 → v894 的硬过滤会把它们误杀。**代码可查**
>   3. 提示词只说"从词表里挑"，没说"要挑全"，模型偏保守（**推断**）
>   修法（三条一起）：端点自己读 `vf_tag_vocabulary` 全量标签（≤300）合并前端词表再喂模型；提示词加「0.5 要挑全」（同场景/赛事/配套物件/相关的人都算，给「足球 → 世界杯、球衣、体育赛事、球场、运动员、球迷」的例子）；客户端判断改成「**词表 ∪ 库内在用的标签/物料类型/筛选项**」（`libraryLabelsInUseSet()`）。
> - **浮窗内容 = 两层来源**：① **零 AI 的确定性关联**（词表里那一行 `related` 列填了什么，**不用等 AI 立刻显示**）② AI 从库内标签里挑的（去重追加），合计上限 10，搜索词本身不显示。
> - **⭐ v896 修「英文界面点标签，搜索框变中文」**：点击浮窗里的标签时，**框里显示界面语言的写法**（英文界面点 `Football` 保持 `Football`），但**实际过滤仍用库内标签原文（中文）**——按中文标签才是精确命中、不会漏物料；同时点完把焦点还给输入框（浮窗不关，可以接着点下一个标签继续延伸）。
> - **⭐ v897 修「关联词驴唇不对马嘴」**（用户实测：搜「世界杯」浮窗给出 手机/耳机/PS5）。两个可能的来源，这次两件事都做了：
>   1. **AI 凑数**：v895 为了让模型"挑全"加了激励，模型就从词表里乱凑（手机/耳机/PS5 都是库内真实标签，所以过了"库内有没有"这一关）→ 提示词改成「**要挑全，但宁缺毋滥**」，并把这次的坏例子直接写进去（"搜「世界杯」返回「手机」「耳机」「PS5」是错的；宁可只给 1–2 个"）；判断标准写成"用户搜 A 时也想看到 B 的物料"。
>   2. **数据写错**：如果是你在标签词表里给「世界杯」那行填过 手机/耳机/PS5（或早期实验残留），那确定性关联层就会照实显示。
>   ⇒ **浮窗现在分两组显示来源**：「**词表设定**」（你在词表 `related` 列填的，确定性）和「**AI 关联**」（模型挑的，可能不准）。**以后一看到不相关的词，先看它在哪一组**：AI 组 = 模型问题（点刷新重问 / 收紧提示词）；词表组 = 数据问题（去团队管理页把那行的相关词删掉）。
> - **⭐ v898 修「答错的词会一直错」（用户实测）**：根因是**前端缓存**——本地把 AI 的答案按词缓存 7 天（`vf_library_search_expansion_v7:`），所以那次答错的「手机/耳机/PS5」每次搜「世界杯」都会被原样搬出来，只有手动点"重新查找"才会重问。现在：**缓存只负责"立刻显示"，命中缓存后后台再静默问一次 AI；答案不一样就用新的替换**（同一个词一次会话只重问一次，避免连打接口；这次没答出来就保留旧的那份、不清空面板；换词了就静默丢弃）。手动刷新按钮仍是"追加"语义。
> - **⭐ v899 词表再简一刀**（用户要求"只留中文和英文"）：
>   - **去掉「新增词」入口**：手工新增的词不会成为任何物料的标签（搜不到），只会往 AI 候选池里掺虚词。要加词就在 Supabase 表编辑器插一行（`id` 形如 `el:中文名`）。
>   - **去掉每行的「AI 建议」按钮**（`suggestRelatedWordsForRow` 函数与 `/api/tag-vocabulary-related` 端点**保留备用**，加回按钮即可）。
>   - **删除确认框写明**："只删这张对照表里的一行，物料上的这个标签原样保留，不会删任何素材"。
>   - **「相关词」列保留**（没按用户原话删掉，理由要记住）：它是**唯一零 AI 的关联兜底**——AI 挑不全/答错时只能靠它（"搜足球缺世界杯"就是靠手工填 related 救回来的），而且不用等 AI、立刻显示。要连它一起删，用户说一声即可（DB 里的列和数据不会动，只是界面不再可编辑）。
> - **⭐⭐ v900 词表改成「数据库自动同步」**（用户四个诉求：不漏 / 实时 / 不留孤儿 / 去掉删除按钮）：
>   - **新增 `sql/025_tag_vocabulary_auto_sync.sql`（需要用户在 Supabase SQL Editor 执行，AI 不代跑）**：
>     一个 `security definer` 的重算函数 `vf_sync_tag_vocabulary()` + 三张源表上的**语句级触发器**
>     （`vf_source_files` / `vf_asset_previews` / `vf_preview_ai_tags`）⇒
>     ① **收全**：库内标签直接在数据库里算，不受"当前账号看得到多少"限制；
>     ② **实时**：上传/识别出新标签那一刻进表；
>     ③ **删孤儿**：物料删掉后没人再用的标签自动删（**人工改过的行也一样删**，避免留下点进去 0 条结果的死词条——用户确认过这个取舍）；
>     ④ 只在词条不存在时插入（`on conflict (name_zh) do nothing`），**不覆盖**人工写的 `name_en` / `related`；函数末尾会立刻回填一次。
>   - 界面配套：**删掉「删除」按钮 + 「新增词」入口**（都交给自动同步），顶部加「**同步库内标签**」按钮（调 `supabase.rpc('vf_sync_tag_vocabulary')`）；表格从 4 列变 **3 列：中文名 / 英文名 / 相关词**。
>   - 相关词列**英文界面显示英文**（`tagVocabularyRelatedDisplayText` 走 `libraryDisplayLabel`），**保存时用词表反查换回库内中文标签**（`tagVocabularyRelatedStorageWords` → `libraryExpansionCanonicalTerm`）——存库仍是中文，匹配链路不变。
>   - ⚠️ **没执行 sql/025 时的降级**：一切照旧（前端补翻 + 手动改英文名/相关词），只是不会自动收全/清孤儿；点「同步库内标签」会报"函数不存在"并提示去执行 SQL。
>   - 🚧 **已知未做**：`vf_library_options`（国家/活动/类别）里的词不进词表（它们是选项、有自己的双语字段）；`vf_preview_ai_tags.excluded_tags` 也不算"在用标签"。
>
> **词表的三条事实（2026-10-12 逐条查代码核实，回答用户提问）**
> 1. **不保证等于"库内全量标签"**：它是「见到过、并且机翻成功过」的标签字典。四种漏法：① `tag-translate` 只为**翻出来**的词插行，AI 没翻出的词不落库；② 只收集**当前账号看得到**的物料上的标签（`collectTagLabelsInUse` 读的是已加载的 `librarySources/previews`，受 RLS 影响）；③ 超过 20 字、带 `vf:` 前缀的标签不收；④ 触发时机是"打开素材库 / 切语言"，不是上传那一刻。
>    ⇒ 所以搜索里的"库内有没有"判断用「词表 ∪ 库内在用标签」（v895），**不能只看这张表**。
> 2. **新标签会自动进表**：上传带新标签的物料 → 下次打开素材库（或切英文）时 `ensureTagTranslations()` 把缺的词批量机翻并 upsert（补 `name_en`）；同一个词只问一次 AI；`source='manual'` 的行 AI 不覆盖。
> 3. **删物料不会清词表**：删素材只删 `vf_source_files`/`vf_asset_previews`，词表零联动 ⇒ **会留"孤儿词条"**（库内已无物料却还在表里）。害处：会被当成"库内标签"出现在浮窗里，点进去 0 条结果。目前只能手动删（或以后加个"清理孤儿词条"按钮）。
> - **v894 删掉的东西**：`state.libraryFilters.searchHistory` + 「历史搜索」浮窗内容（整条链路删干净）、搜索框左侧那一排 `#library-expansion-chips`、以及「AI 新词」层在界面上的所有痕迹（`libraryExpansionFresh` / `is-fresh` / 空结果提示 chip）。
> - 前端缓存键升到 `vf_library_search_expansion_v7`（v6 里存着「新造词」那一层，必须升）
> - **v891 删掉的**（别再找）：`AI 自动归类`按钮、折叠分组/缩进、上位词 `parent_id`、别名浮窗、`/api/tag-vocabulary-suggest`、`parseVocabularySuggestions` / `suggestVocabularyGroupsWithGlm`、`tagVocabularyDescendantsOf`
>
> **已验证**：392/392 测试全绿；`select=related` 实测该列存在；测试站两处版本号 + `styles.css` 均为 `20261012-related-click-en-v896`；线上 app.js 里确实带着新的点击逻辑（`displayLabel`）；两个端点存在且要登录；本地实机（dist + Admin 预览）打字后浮窗正常弹出「库内关联标签」；用户实测中文搜「甜点」→ 关联标签全是库内词（蛋糕/饼干/冰淇淋/甜甜圈），英文界面点标签不再变中文（v896）。
> **未验证（要人点一下）**：v895 之后搜「足球」是否真的能出 世界杯/球衣/体育赛事（本轮就是修这个，需要再搜一次确认）；词表「AI 建议」按钮。
> **还没解决 / 可能的下一步**：① AI 挑词仍由模型决定，**最稳的"要全"手段是在词表里给大词填 `related`**（零 AI、立刻生效、人工可校正）② 逐图 AI 标签面板里没有「词表里没有 = 新词」的标记（现在的 `is-new` 是"本轮新认出"）③ 端点喂给模型的库内标签上限 300，标签总量很大时仍可能截断（可改成按搜索词先粗筛再喂）。
>
> **下一步（候选，按用户优先级）**
> 1. 管理员在测试站**真机验收**：① 搜「足球」看浮窗是否出 世界杯/球衣/体育赛事 ② 给某行「相关词」填几个词，再搜该词看是否立刻出现在浮窗 ③ 团队管理页 →「标签词表」→ 点「AI 建议」
> 2. 老数据清理：库里 `parent_id`（sql/023 的上位词链）和 `aliases` 已不参与任何逻辑，是否清空由用户定
> 3. `dist/functions/api/tag-translate.js` 仍**未进 git**（Actions 通道发不出它）——是否提交进仓库由用户定（本仓库 public，文件不含密钥）
>
> **踩过的坑（别再犯）**：① 搜索要接进 `libraryItemQueryMatchRank`，别只改渲染；② 大表改列数时**别用全量替换** `colspan`（曾误改 8 处无关表格）；③ AI 调用要**小批量**；④ 词表/SQL 新增字段要**带降级**（`related` 读不到就把该列变只读并提示执行 `sql/024`）；⑤ **部署后 1–3 分钟内线上文件可能新旧混着**（§8.3）；⑥ 改联想口径**必须同时升缓存键**（v892 升 v6、v894 升 v7 都是这个原因）；⑦ **搜索联想只显示库内确实存在的标签**——库内没有的词搜不到任何物料，**不要再加回「AI 新词」那种展示层**，服务端 `fresh` 桶只作兜底；⑧ AI 回的联想词**要能对上库内标签的写法**（英文/拼音词先反查换中文）；⑨ **「库内有没有」不能只查 `vf_tag_vocabulary`**（增量表，会漏），要用「词表 ∪ 库内在用标签」；⑩ **喂给模型的词表别用前端那份（有 120 上限）**，端点要自己读库内全量；⑪ **别让"答错的词"被缓存钉死**：本地缓存只该负责"立刻显示"，命中缓存后要静默重问一次（v898）——否则一次答错会连着好几天每次都错，用户只能靠手动刷新自救。

**等用户决定 / 授权的**

| 事项 | 状态 |
|---|---|
| B / D / M 端的物料清单尺寸未补 | 这三个端上传的素材一律识别为"未分类"。等用户按实际导出尺寸补 |
| 团队管理页「按清单重跑识别」 | 未执行（**会写共享库**，需用户当次授权） |
| 正式站怎么办：回滚旧版 / 保持现状 | 用户倾向**保持现状**（线上功能正常，回滚反而让同事面对陌生旧界面） |
| **轮换 Cloudflare API Token** | 未做。这是唯一能"从根上"杜绝再次未经授权发布正式站的动作。⚠️ 2026-10-12 实测更正：本机**确实存着 wrangler OAuth 登录态**（`~/Library/Preferences/.wrangler/config/default.toml`，账号 `h18333531920@gmail.com`，`pages:write` 权限，`wrangler whoami` 可自查），所以本机任何 AI 会话都能发正式站 —— 这条比 §12 原判断更严重 |
| 首页检索栏下沿 1px 细线是否保留 / 是否也做自动叠起 / "联系所有者"是否再显示手机号 | 2026-09-18 起就挂在文档里，用户未答复 |
| 本地未提交的 v872 改动（逐图 AI 标签迁移兜底） | **已解决**：2026-10-12 工作区干净，这些改动早已随提交进仓库（§0 的 `1787a45` 起） |

**已知未修 / 未验证的 bug**

| 事项 | 状态 |
|---|---|
| 上传按钮首屏消失（2026-09-22 挂起） | 未修；**现状未核实** |
| 用户模式文字"最多两行"失效（粘贴含 `&` 文案变三行） | 文档自称未解决；**现状未核实**，且该链路无测试覆盖 |
| 图库 2 个混入条目 | 2026-09-30 记录，未处理；**未复现** |
| 2026-09-22 ~ 09-23 生图埋点漏记 | 不可补（共享库里的真实事件缺失） |

**规划中（未授权实施）**

- 案例库「项目 → 设计组 → 物料版本」重构 + 分层次搜索：规划稿 `docs/案例库-设计分组与AI标签搜索规划-20261009.md`。除"单项目逐图 AI 标签"（已实现）外，其余**基本未开工**。

---

## 12. 风险与安全边界

| 风险 | 说明与建议 |
|---|---|
| **公开仓库 + 私有信息** | 代码仓库是 **public**。`services/`（含腾讯云实例 ID、公网 IP、控制台链接）、`.local/`、`.codex-backups/`、`.gemini-designer/`、`docs/archive/` 都**未进 git**，已列入 `.gitignore`。**永远不要 `git add -A` 全量提交** |
| **部署凭证（2026-10-12 更正）** | ❌ 原文写"本机没有持久保存的 Cloudflare 凭证"—— **实测是错的**：`~/Library/Preferences/.wrangler/config/default.toml` 里有 8 月登录的 wrangler OAuth token（账号 `h18333531920@gmail.com`，含 `pages:write`），`wrangler whoami` 能直接列出账号。⇒ **任何拿到这台机器的人/AI 会话都能发正式站**，红线只能靠人和文档守。要收紧就 `wrangler logout` 或轮换；不要把这个 token 贴进聊天 |
| **`main` 分支** | 落后 6 周。一次 `git push origin main` 就会用 8 月的代码覆盖正式站。**不要推 main**，除非就是要发那份代码 |
| **明文共享密钥（历史）** | 归档的旧文档里出现过明文同步密钥 `vf-jimeng-sync-2026`（对应接口已 410 下线）。该密钥若还在用，需更换；`docs/archive/` 不进 git 就是为了不扩散这类内容 |
| **账号密码遗留** | 历史文档记录过 `icons@gccdesign.app` 的密码曾出现在聊天里、以及 `admin01` 弱密码，只有"建议重设"没有重设证据。**是否需要重设请自查**（未核实） |
| **共用数据库** | 任何"删/改"操作都会立即影响同事正在用的真实数据；涉及批量写入的动作必须用户授权 |
| **正式站历史不可溯** | 正式站的发布长期是本机 wrangler 直发、不进 git。**从本文件 §0 起，每次发布都必须记录部署 ID**，逐步把可溯源性补回来 |
| **迁移 SQL 未全部纳入版本管理** | 仓库里已跟踪的只有 `sql/001`–`010` 和 `021`；**`sql/011`–`020` 以及两个 D1 脚本（`account-access-d1.sql`、`account-panel-v545-d1.sql`）目前是未跟踪文件**，只存在于本机和已执行的数据库里。建议提交进仓库（内容不含密钥），否则换台机器就只剩数据库本身可参考 |

---

## 13. 文档体系（看完这一节就知道还能读什么）

| 类别 | 位置 | 说明 |
|---|---|---|
| **唯一正本** | `HANDOVER.md`（本文件） | 交接、开发、部署、现状，全在这里 |
| AI 纪律入口 | `AGENTS.md` | 部署红线、**绝对不要做的事**（含旧测试分支黑名单）、干活硬约定；不重复本正本内容 |
| AI 指针 | `CLAUDE.md` | 十几行，指向 `AGENTS.md` 与本正本 |
| 历史归档 | `docs/archive/README.md` + 同目录 | 42 份历史交接/设计文档 + 归档的旧 README，**原样保留、不进 git、正本不引用**；索引里有逐份状态标注 |
| 历史归档 | `docs/archive/README.md` + 同目录 | 42 份历史交接/设计文档，**原样保留、不进 git、正本不引用**。索引里有逐份状态标注 |
| 现行规划稿 | `docs/案例库-设计分组与AI标签搜索规划-20261009.md` | 未来方向（未授权实施） |
| 私有运维手册 | `services/account-access/MAINTENANCE.md`、`services/icon-cutout/AI-API-OPS.md` 等 | 服务器/账号/实例细节，**不进 git、不进公开文档** |
| 窄口径维护手册 | `AI-API-MAINTENANCE.md` | 只讲"生图服务换 key / 维护入口"这一件事 |
| 代码内文档 | `app.js` 里的注释 | **很多关键约定直接写在代码注释里**（如 v868 的写入保护），改前先读上下文 |

---

## 14. 本文件的核对方法（可复现，也是"哪些还没核实"的清单）

**已实测（2026-10-10）**

- 线上/测试站版本标识、`TOOL_UI_VERSION`、`/api/health` 六个 ready 字段 —— curl 实测。
- 正式站当前部署 ID 与来源 —— 本机 `wrangler` 日志 + Cloudflare 部署清单比对（日志目录：`~/Library/Preferences/.wrangler/logs/`）。
- 测试基线 365/365 —— `node --test tests/`。
- `main` 落后、工作区未提交改动 —— git 实测。
- `vf_preview_ai_tags.manual_tags` 列已存在 —— 直连 Supabase REST 查列（anon key 只读，RLS 挡住行数据）。
- 文件行数/大小 —— `wc -l`、`ls -l`。

**未核实（不要当事实）**

- 正式站 `tools/static/frontend.html` 与本地**未完成逐字节比对**（本机网络对大文件持续截断，试了 3 次）。
- `services/` 里的服务器现状（容器、release 目录、cron、D1 内容）—— 本仓库无法验证。
- 账号权限系统在 D1 与 Supabase 之间的**确切边界**。
- §11 里标注"现状未核实"的几个历史 bug 是否仍然存在。

> 任何一条如果被实锤推翻了：**直接在对应位置改正并注明日期**，不要另起一份文档。
