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
| 测试站 | `https://asset-gallery-test.visual-factory.pages.dev`，版本 `20261015-pending-card-same-column-v946`（**上传的占位卡插进第一列顶部（不再另起一列、4 列被撑成 5 列）**；往上叠 v945 的**未分类拦截跑在进度条之前**、v944 的**「＋」钉在行尾 + 浮窗里也有 ＋**、v943 的**英文界面物料类型翻译**、v942 的**标签浮窗横向换行**、v941 的**弹窗锁滚（锁 .content）**、v940 的**上传收尾就地换真实卡片**、v939 的**高亮改蓝**、v938 的**乐观 UX：删除先摘 + 上传先本地显示**、v937 的**编辑态只留编辑表单**、v936 的**上传后新卡片高亮 6 秒 + 图库/模板上传就地合入**、v935 的**上传/删除后就地生效（热更新）**、v934 的**上传时「业务策略」也必选**、v933 的**标签后面的空位去掉**、v932 的**点✓没反应真根因 + 等待看得见 + 写库少跑两个往返**、v929 的**× 只在加号态出现**、v928 的**× 不再常驻**、v927 的**去掉「一键识别」按钮 + 底部不再显示「AI直接应用」**、v926 的**标签「＋」内联新增 + 动效标签手工加**、v925 的**进度条显示具体哪几张**、v924 的**内容指纹去掉 updated_at**、v923 的**黑名单补价格/百分比**、v922 的**上传未分类红框+拦截+批量**、v918 的**效果类型标签**、v917 的**动态物料抽帧识别**）。`sql/031` 已由用户执行（实测列已建好）；部署 `c2f2393b`，2026-10-14 本机 wrangler 直发 | 实测 2026-10-14 |
| 健康检查 | `https://gccdesign.app/api/health` → `ready/aiReady/openaiReady/lk888Ready/volcImageReady/volcOutpaintReady` 全 `true`。**实测延迟 1.7–2.9 秒**（Pages Function 冷启动 + 上游调用是这个项目的基线，"点一下要等几秒"多半来在这） | 实测 2026-10-14 |
| 代码仓库 | `https://github.com/h18333531920-cmyk/visual-factory`（**public**） | 实测 |
| git `main` | `3a8ad0f`（2026-08-27，`20260827-fast-static-session-v481`），**落后线上约 6 周，不是线上基线** | 实测 |
| 本地工作区 | 分支 `tmp-deploy-v871`，HEAD `8bf70de`（v946，含 `dist/`；v945/v944/v943/v942/v941/v940/v939/v938/v937/v936/v935/v934/v933/v932/v931/v930/v929/v928/v927/v926 在其前二十个提交）；**已跟踪文件无未提交改动**（`tests/` 下有 51 个从未入库的旧测试文件，一直如此，本轮未动）；测试站走**本机 wrangler 直发**（GitHub Actions 那条通道发不出 `dist/functions/api/*` 里未跟踪的端点，见 §8.3） | 实测 2026-10-14 |
| 自动化测试 | `node --test tests/` → **825/825 通过**（v945 加 1 条：校验必须在进度条之前、未分类要有 toast、回滚变量留在 try 外；v944 加 1 条；v943 加 1 条；v942 加 1 条；v941 加 1 条；v940 改 1 条；v939 加 1 条；v938 加 2 条；v937 加 1 条；v936 加 1 条；v935 新增 5 条；v934 上传必填三项扩四项；v932 新增 3 条；v930/v931 共 8 条；v929 7 条；v928 起 5 条；v927 7 条；v926 33 条；v925 25 条 + 更早的都在） | 实测 2026-10-15 |
| 后台识别 worker | **腾讯云已装好并跑通**：`/opt/case-tags/`（脚本 + `_ai.js` + `.local/recognize.env` 0600），主机已装 Node 20.20.2 与 ffmpeg 6.1.1，cron 每 5 分钟一批。⚠️ **worker 上仍是 v924 版脚本**（v926 又改过它、加了 `manual_effect_tags` 保护，需用户重传，见 §11 v926 条） | 实测 2026-10-14 |
| 逐图 AI 标签覆盖 | **已铺满全库**：`vf_preview_ai_tags` **1942 行 / 98 个案例项目**，**全部 `status='success'`（失败 0）** —— v924 换脚本后原先那 87 张 `.gif` 已全部识别完；`effect_tags` 非空 83 行；**`manual_tags` / `excluded_tags` 非空行仍是 0 行**（人工加标签从未成功落库，见 §11 v926 条） | 实测 2026-10-14（查库） |
| 数据库 | Supabase 项目 `juuqvjmhzdgfggzrivbb`；测试站与正式站**共用同一个库和 `vf-library` 存储桶** | 实测（查库）+ 代码可查 |
| 数据库迁移状态 | `sql/021_preview_ai_tags_experiment.sql` **已由用户手动执行**（`manual_tags` 列已存在）；词表四件 `sql/022` / `023` / `024` / **`025`** 均**已执行**；**`sql/026_tag_vocabulary_trigger_tuning.sql` 也已执行**（2026-10-13，自检返回 9 条 `vf_tag_sync_*` 触发器：`_ins`/`_del` = STATEMENT、`_upd` = ROW ⇒ 状态写不再触发词表全量重算）；**`sql/027_tag_manage.sql` 也已执行**（2026-10-13，改名/删除 RPC `vf_rename_tag(p_old, p_new)` / `vf_delete_tag` 就位，实测可调）；**`sql/028`（效果标签列 + `kind='effect'` 种子词）、`sql/029`（效果标签的改名/删除 RPC）、`sql/030`（`vf_tag_usage` 使用量视图）经 2026-10-14 查库确认均已执行**；**⚠️ `sql/031_manual_effect_tags.sql` 尚未执行**（实测报 `column vf_preview_ai_tags.manual_effect_tags does not exist`）⇒ **人工动效标签功能还不可用，要用户在 Supabase SQL Editor 跑一下** | 实测 2026-10-14（查库） |
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
- 搜索：`libraryItemSearchText()` / `libraryItemMatchesQuery()`，含拼音与英文扩展表。**AI 联想只从库内标签里挑（v894）**：搜索框下方浮窗显示「库内关联标签」（`/api/expand-query` 的 `terms` 经客户端反查/词表校验后的结果，点一下改成只搜该标签）；AI 返回但库里没有的词一律丢掉、也不参与匹配。词表 `related` 那一层是**零 AI 的确定性扩展**（`tagVocabularyQueryTerms`，v905 起**正反两向**：该行填的相关词、以及"哪些行把这句话当相关词"，都参与匹配）。**展示单位（v903/v904）**：逐图 AI 标签现在全库可读（`loadAllPreviewAiTags()`），项目卡的搜索文本吃**整个项目**的逐图标签（`caseProjectElementTags()`）；**无关键词按项目卡；有关键词时项目里每张命中物料各出一张卡**（`collapseCaseProjectItems` + `caseMaterialMatchesQuery`，判定文本 = 物料类型 + 文件名 + 该图逐图标签）。
- **案例项目的判定**：`source_path` 为空 **且** 有预览图 ⇒ 案例项目（`isCaseProject()`）。
  ⚠️ **写 SQL 时注意**：库里的空值实测是**空字符串**、不是 `NULL`（用 `is null` 查出来是 0 行），要写 `coalesce(source_path,'') = ''`；另外案例库还带 `tags` 里有 `vf:kind:source` 标记。

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

### 7.7 标签链路的「五处联动清单」——改标签相关功能时的自检表
> 用户 2026-10-13 的原话：「这个功能需要关联上传、词表、搜索等等功能串，这里改了那里又漏了，我们没法面面俱到」。
> 所以把它固化成清单：**动到标签，就照这张表逐条过一遍**，不用靠记性（改完在交付说明里逐条写"动了/没动、为什么"）。

| # | 一处 | 唯一的真相 / 入口 | 改它时连带要确认 |
|---|---|---|---|
| 1 | **上传**（写入标签） | 物料标签：`vf_source_files.tags`（含 `vf:` 内部标记）；物料类型：`vf_asset_previews.material_type`；逐图标签：`vf_preview_ai_tags`（写入端点 `/api/case-preview-ai-tags`，客户端 `startCasePreviewAiRun()`） | 写库是不是"先读最新再合并"（别拿空数组起底）；新标签会不会被触发器收进词表 |
| 2 | **词表**（标签字典） | 表 `vf_tag_vocabulary`；**同步的唯一入口是 `sql/025` 的触发器**（收全 + 清孤儿）；前端只维护「英文名 / 相关词」两列（`reloadTagVocabulary()` / `saveTagVocabularyPatch()`） | SQL 没执行时的降级（前端仍能读，只是不自动收全）；`source='manual'` 的行不许被覆盖 |
| 3 | **搜索**（匹配） | **唯一入口** `libraryItemQueryMatchRank()`；文本 = `libraryItemSearchText()`（含逐图标签、物料类型、国家/活动/类别、拼音与英文扩展表）；归一 = `tagVocabularyQueryTerms()`（中英归一 + 相关词**正反两向**）；AI 扩展 = `libraryExpansionTerms` | 新增的标签来源有没有进搜索文本；筛选维度（`librarySourceMatchesFilterValue()`）要不要同步支持 |
| 4 | **展示**（结果长什么样） | `renderLibraryGrid()` → `collapseCaseProjectItems()`（无关键词=项目卡；有关键词=按命中物料铺开；同语言组只占一位）+ `renderCaseProjectCard()` | 计数/角标含义会跟着变；点卡片的落点（`openCaseProjectModal(sourceId, focusType)`） |
| 5 | **中英适配** | 显示名 `libraryDisplayLabel()`；归一索引 `tagVocabularyByName` / `tagVocabularyByEn`（读入在 `loadTagVocabulary()`）；补英文的路：页面加载/切语言的 `ensureTagTranslations()` → `/api/tag-translate` 落库，或词表页「补翻译」按钮 | 新标签有没有英文名（没有就显示中文）；英文界面显示时动作值仍必须用**原始中文标签** |

**铁律**：**任何新增的"标签来源"，必须回答三个问题才算改完** ——
① 它会不会进词表（`sql/025` 的收全覆盖到没有）？② 搜索（框 + 筛选）看不看得到它？③ 双语显示认不认它（有没有英文名）？

**测试是这套清单的执行者**：接线类断言已经有一批（例：`case-preview-ai-library-wide-v903.test.mjs` 把"搜索文本 + 排序 + 铺开"串起来跑；`library-case-expand-v904.test.mjs` 管铺开；`element-ai-suggest.test.mjs` 管识别解析）。**改了其中一处而忘了另一处，这些测试会红** —— 比人肉检查可靠。

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
>   - ✅ **2026-10-13 用户已执行 sql/025**（SQL Editor 返回 `1 row`、无报错）⇒ 词表自动同步**已生效**：函数 `vf_sync_tag_vocabulary()`、三张源表的触发器、以及一次存量回填都已在真实库里落地。
>   - ⚠️ 执行前的降级（现已是历史）：不执行 sql/025 时一切照旧（前端补翻 + 手动改英文名/相关词），只是不会自动收全/清孤儿。
>   - **v901 修「同步库内标签按钮点不动」**：报「请求路径无效」**不是** sql/025 的问题，而是**客户端所有 Supabase 请求都走服务端代理** `/api/account-data`（公司网络封 supabase.co 直连），那份白名单只放行 `rest/v1/<表>` 与 storage，`rest/v1/rpc/*` 一律 403。修法：在 `functions/_account-data-policy.js` 里**只放行 `vf_sync_tag_vocabulary` 这一个 RPC**（仅 POST、必须维护权限，别的一律照旧 403），并加了单元测试锁死。⚠️ **数据库触发器不受这个影响**——自动同步是在库里跑的，上传/删除物料照旧实时更新词表，这个按钮只是"手动重算一次"的入口。
>   - 🚧 **还没验的**：界面上点「同步库内标签」按钮是否正常提示（v901 之后需要用户再点一次；没验 = 未核实）；触发器在真实上传/删除时就地生效也还没实测过。
> - **⭐ v902 修「元素识别不认现有标签 / kiki 与 KIKI 分裂成两行」**（用户实测反馈）：
>   - 原因一：识别请求只带了**静态 8 个元素词**（`FILTER_SECTIONS_CONFIG.element.values` = 银行卡/券/kiki/骑手/国旗/手机/耳机/PS5），**库内真实标签模型根本看不到**，所以它只能按自己的说法造新词。改成带「库内正在用的标签（`source='manual'` 的排前面）+ 静态元素词」（新函数 `caseElementVocabulary()`，上限 160；服务端 `analyzeCaseTagsWithGlm` 的截断也从 100 放到 160）。
>   - 原因二：词表匹配**区分大小写** —— AI 回「KIKI」而库里是「kiki」时判成新词，同一个东西就裂成两行（词表里 kiki / KIKI 并存就是这么来的）。现在 `parseElementSuggestions` 统一按「**去空格 + 小写**」比较，并且**返回词表自己的写法**；一个词命中多个词表项时取最长的（「炸薯条」→「薯条」，不是「条」）。
>   - 送词表时也按同一规则去重（大小写/空格不同但同一个词的只留一个，优先人工维护的），免得 AI 在 kiki / KIKI 里随便挑。
>   - 🚧 **存量数据没动**：库里**已经存在**的 kiki / KIKI 两行、以及物料上两种写法**不会自动合并**（代码只保证以后不再产生新的分裂）。要合并得跑一次数据迁移（会重写 `vf_source_files.tags` / `vf_asset_previews.material_type` / `vf_preview_ai_tags.ai_tags|manual_tags`），属"改真实数据"，**需用户明确授权、由用户执行**。
>   - 未核实：识别效果（要真实上传一张带老虎的图点「AI 识别」，看建议里是否只出现 kiki）。
>   - 🚧 **已知未做**：`vf_library_options`（国家/活动/类别）里的词不进词表（它们是选项、有自己的双语字段）；`vf_preview_ai_tags.excluded_tags` 也不算"在用标签"。
>
> **词表的三条事实（2026-10-12 逐条查代码核实，回答用户提问）**
> 1. **不保证等于"库内全量标签"**：它是「见到过、并且机翻成功过」的标签字典。四种漏法：① `tag-translate` 只为**翻出来**的词插行，AI 没翻出的词不落库；② 只收集**当前账号看得到**的物料上的标签（`collectTagLabelsInUse` 读的是已加载的 `librarySources/previews`，受 RLS 影响）；③ 超过 20 字、带 `vf:` 前缀的标签不收；④ 触发时机是"打开素材库 / 切语言"，不是上传那一刻。
>    ⇒ 所以搜索里的"库内有没有"判断用「词表 ∪ 库内在用标签」（v895），**不能只看这张表**。
> 2. **新标签会自动进表**：上传带新标签的物料 → 下次打开素材库（或切英文）时 `ensureTagTranslations()` 把缺的词批量机翻并 upsert（补 `name_en`）；同一个词只问一次 AI；`source='manual'` 的行 AI 不覆盖。
> 3. **删物料不会清词表**：删素材只删 `vf_source_files`/`vf_asset_previews`，词表零联动 ⇒ **会留"孤儿词条"**（库内已无物料却还在表里）。害处：会被当成"库内标签"出现在浮窗里，点进去 0 条结果。目前只能手动删（或以后加个"清理孤儿词条"按钮）。
> - **⭐ v905 修「近义词搜不到」**（用户实测：搜「餐桌」能命中，搜「桌子」只出 1 张）。搜索本质是"按字面 + 词表归一"，容错有两条路，这轮两条都做了：
>   1. **相关词反着也认（零 AI、可控、即时生效）**：词表某行 `related` 里填的词，**反过来搜这个词也命中那一行**。例：在「餐桌」行的相关词里填 `桌子、桌面` → 搜「桌子」就命中餐桌的物料；英文写法（`table`）走同一条索引。实现：`loadTagVocabulary` 建反向索引 `tagVocabularyRelatedToZh`（相关词小写 → 中文名），`tagVocabularyQueryTerms` 把**正向**（该行的 related）和**反向**（这个词被哪些行当 related）都算成匹配词。
>   2. **AI 扩展提示词**：第 2 条从"词表没有就自由联想"改成「**口语/俗称/近义说法要映射到词表里的正式写法**」，例子写死 `桌子→餐桌、喝的→饮料、小票→票据、椅子→餐椅`（原来那条"自由联想"跟 v894 的"只收库内词"自相矛盾，一并删了）。
>   - ⇒ **以后要给某个口语说法兜底，最稳的办法是在词表里把它填进对应行的「相关词」**（不用等 AI、立刻生效、还能人工校正）。
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
- **🎯 用户 2026-10-13 明确的下一大块：把 99 个案例项目的物料全部重新识别一遍，让每张图的元素标签都能搜到。**
  用户自己归纳为四个方面：**上传 / 搜索 / 展示 / 中英适配**。现状三条硬事实（本次逐条查代码确认）：
  1. **✅ 逐图 AI 标签已铺满全库（2026-10-13 完成，见下面 v911 记录）**：原来只对实验项目 `bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5`（AugPicks campaign）生效，客户端只 `loadPreviewAiTagsForSource()` 那一个项目。现在：v903 把读取改成读全表（`loadAllPreviewAiTags()`）、v908 把写入范围放开到所有案例项目、**2026-10-13 17:15 用本机脚本把 98 个项目的 1810 张全部识别完**（`vf_preview_ai_tags` 1935 行）。⇒ 「数据模型怎么泛化」已经用「`experiment_key` 只当分区名（仍是 `augpicks-v1`）、不再拿它过滤读写」解决，**不需要再加列**。
  2. **搜索只算了封面那张图的元素标签**：`libraryItemSearchText()` 里项目卡已经把**全项目物料类型**算进搜索文本，但元素标签用的是 `casePreviewAiTags(preview.id)`（当前这张 = 封面）。⇒ 即使把 99 个项目都识别了，"每张图都能搜到"也不会自动成立，**必须改成聚合整个项目的逐图标签**。
  3. **词表/中英这一层已经打通**：`sql/025` 之后标签由数据库自动收全（含逐图 AI 标签），英文名靠「补翻译」或页面加载时后台补；新标签进词表后双语显示和"搜英文命中中文"自动生效。⇒ 中英适配基本是"跑一次批量补翻"，不是从零做。
  另外两条约束：**识别是写共享库**（`vf_preview_ai_tags`，真实数据）⇒ 需用户当次授权；**必须分批 + 可断点续跑 + 失败重试 + 限流**（规划稿 §6/§13 已列，项目也踩过"AI 一次喂太多会挂"的坑）。
  **建议的切法（不是现在做，是记住顺序）**：
  - **规模已实测（2026-10-13 用户跑只读 SQL）**：案例项目 **99** 个、案例库图片 **1953** 张、`vf_preview_ai_tags` 已有 **28** 行（全在实验项目、`experiment_key` 只有 `augpicks-v1` 一种）、预览图总数 2165。⇒ 要铺满需再识别 **1925** 张，量级是**小时级**（不是天级）。
  - **✅ 步 1 已落地（v903）**：① **读**全部项目的逐图标签 —— 新增 `loadAllPreviewAiTags()`（`vf_preview_ai_tags` 全表、1000 行/页 `.range()` 分页、硬上限 20 页=2 万行、**不带 experiment_key 过滤**，`manual_tags` 列缺失与表不可用两条降级原样保留），启动时替换掉原来"只读实验项目"的调用；`loadPreviewAiTagsForSource()` 也去掉实验项目早退。② **搜索聚合** —— 新增 `caseProjectElementTags(materials)`，`libraryItemSearchText()` 里案例项目改成吃**整理项目所有物料**的逐图标签（单图素材仍只看自己那张）。③ **写入仍只放开实验项目**：`casePreviewAiEnabledFor(source)` 目前 = `isCasePreviewAiExperimentSource(source)`，服务端 `previewFor()` 也锁着实验来源 ⇒ 非实验项目**不显示**「一键识别」与逐图面板（否则点了逐张 404）。
  - **✅ 步 1b 已落地（v904）—— 展示单位**：用户实测反馈"搜披萨时项目里多张带披萨的图只挑一张当封面显示"。按规划稿 §8.2「有关键词 → 按命中物料展示」实现：
    - 新增 `caseMaterialMatchesQuery(item, query)`：判定**这一张物料自己**是否命中（候选文本 = `material_type` + `preview_filename` + 该图逐图 AI 标签；空白分词、逐词 AND、不许跨图拼凑）。
    - `collapseCaseProjectItems()`：**有关键词时**，项目里所有物料级命中的物料**各出一张卡**（按 `items` 原顺序）；一张都没命中（只是项目名/项目标签命中）→ 仍只出**一张项目卡**（走原封面逻辑）；**无关键词时行为与原来逐字一致**。
    - 点击（网格点击 + 键盘 Enter）改为 `openCaseProjectModal(source.id, preview.material_type)`，浮窗落在那一组物料上。
    - 测试 414/414（新增 10 条，其中一条端到端串起 `libraryItemSearchText` + `libraryItemQueryMatchRank` + 铺开逻辑）。
  - **✅ 步 A/B 部分已落地（v906，2026-10-13 已发测试站，部署 `b64db21b`）—— 同款英阿版共用一套标签、结果按组占位**。用户口径（2026-10-13）：**不逐图重跑、也不把 EN 的标签硬复制给 AR，而是「按组一次看多张」**。本轮四件事：
    1. **服务端多图组识别**：`functions/_ai.js` 新增 `analyzeCaseTagGroupsWithGlm(env, images)`（images 2–4 张，元素形如 `{url, label}`，同一条消息里放多张图）+ `parseCaseTagGroups(text, vocabulary, activities)`；提示词先判「是不是同一条物料的不同语言版本」，再给**一套覆盖所有图的共同元素标签**（沿用 ≤5 字 / ≤12 条 / 优先词表写法 / 活动主题自由归纳）。`sameDesign` **缺字段 / 解析不出 / 怪值一律 false**（拿不准就当不同组）。
    2. **端点**：`functions/api/analyze-elements.js` 支持 `images: [dataURL...]`（2–4 张）作为 `image` 的替代，返回 `{success, provider, elements, activity, sameDesign}`；体积上限**每张 ≤1.5MB、合计 ≤4MB**（按解码后字节算，超了 413 + 中文说明）。**单图老路径一字未改**（上传时的元素建议、底部 AI 按钮仍走 `image`）。
    3. **客户端配对 + 按组识别**：新增 `caseFilenameGroupKey()` / `caseSameDesignSignals()` / `casePreviewAiGroupsOf(materials)`（**故意保守**：只在「一张 en + 一张 ar」语言互补时成组，语言判不出来各自单飞；同组还要求同 `material_type` + 同尺寸（两边都有尺寸时才算）+ **文件名同一编号**（数字一律保留）；一组最多 4 张，多出来的继续往后配对，含单成员组）。`startCasePreviewAiRun()` 改成**逐组**跑：多成员组一次 POST `{images:[...], vocabulary: caseElementVocabulary(), activities: FILTER_ACTIVITY…}`，拿到 elements 后**组内每张都写同一套标签**（model 记 `glm-4v-flash-group`）；`onlyIds`（只补没认出的）**不配对**、仍走单图字段。进度文案「第 x/y 组 · 共 n 张」，失败组内各成员都记失败（沿用"失败只改状态、不清空原标签"）；`sameDesign === false` 照写标签，只在结果 toast 里提示「有 N 组被判为不同设计，建议复核」。
    4. **展示按组占位**：`collapseCaseProjectItems()` 有关键词时先算物料级命中，再按 `casePreviewAiGroupsOf` 合并 —— **同一组只出 1 张卡**（优先 `caseMaterialLanguage() === 'en'` 那张，没有英文版取命中里的第一张），item 上带 `languageGroupSize`；`renderCaseProjectCard()` 在已有「N 个物料」角标后追加「· 多语言版 N」（>1 才加）。**无关键词时行为与以前逐字一致**。
    - **取舍（有意为之，别当 bug）**：① 配对**纯确定性**，模型判的 `sameDesign` 只作提示、不进展示逻辑，也**不落库**（`vf_preview_ai_tags` 没有这列）；模型判"不同设计"时**不拆组**（展示层无该信号可用）。② 显示用 `glm-4v-flash`（原模型不变），组请求把 `provider` 原样返回、由客户端按组加 `-group` 后缀，避免 `-group-group`。③ 组内只有个别成员命中时，`languageGroupSize` 记的是**命中成员数**（不是项目里那组的全部张数）。
    - ⚠️ **未核实（已加兜底，等第一次真实跑就能验）**：**`glm-4v-flash` 是否真能一条消息吃多张图** —— 本仓库此前所有视觉调用都是一张图（`analyzeCaseTagsWithGlm` / `analyzeGalleryTagWithGlm` / `analyzeLanguageWithGlm`），这是第一次多图（规划稿 §11 说 GLM-4V 支持，但**没有实测**）。
      **已加的兜底（v906 收尾）**：多成员组先试 `images` 多图请求；**失败就退回逐张识别再取并集**，仍然"同组共用一套标签"，并把该组的 `model` 记成 `glm-4v-flash-group-fallback`、结果 toast 提示「有 N 组走了逐张兜底（标签取并集）」⇒ **第一次点击不会白跑**。事后可按 `model like '%-group-fallback'` 找出这些行重跑。
      若多图被拒，可选项：换模型名（`glm-4v-plus` / `glm-4v`）或就用兜底（代价是并集可能带上一版独有的词）。
    - 未做：组识别**还没接进「一键识别」之外的地方**；展示端的组**不可展开**（规划稿 §3 的"组内可展开看其他版本"、步 C 的人工纠错/抽检都没做）；`languageGroupSize` 只用在角标文案，没有做"直接命中 M 张 / 可用语言 / 剩余数量分页"那一套。
    - 测试 **445/445**：新增 `tests/case-preview-ai-groups-v906.test.mjs`（25 条：解析 / 端点源码 / 配对 vm / 铺开 vm / 流程源码）与 `tests/case-preview-ai-group-run-v906.test.mjs`（5 条：把真实 `startCasePreviewAiRun` 切进 vm 用假 fetch 跑，验"一组一次多图请求 + 组内每张都写同一套标签 + 一组失败则组内各成员都记失败 + `sameDesign=false` 只提示 + `onlyIds` 不配对"，外加服务端 `save` 不覆盖 `manual_tags`/`excluded_tags` 的实测）；`tests/library-case-expand-v904.test.mjs` 只补了 `caseMaterialLanguage` 桩（新依赖，行为不变）。
  - **步 1b 明确没做的四个小口子（下轮候选，别当 bug）**：① 卡片角标仍写「整个项目 N 个物料」，没有规划稿 §8.2 要求的「直接命中 M 张 / 可用语言 / 剩余数量分页」；② 结果计数（`state.libraryItems.length`）在搜索时数的是**卡片张数**（含铺开的多张），无关键词时是项目数；③ 点击落点是「该物料类型那一组」而非「那一张图」（规划稿 §8.3.4 想要 `preview_id` 级定位）；④ 开着「只看收藏」筛选时，同项目里没被收藏的命中物料不会铺开（合理，但需用户确认）。另：`collapseCaseProjectItems` 里旧的 `previewAiMatch` 兜底分支现在是死代码（保留未删）。
  - **✅ v907（2026-10-13，已发测试站，部署 `c326f698`）—— 识别噪音黑名单 + 提示词收紧**。起因：**人工抽检实验项目 28 行的真实识别结果**（读原图 + 读库），发现三类系统性问题；本轮只解决「噪音」这一类，另外两类**还挂着**（见下）。
    - **实测到的噪音**（提示词本来写了「不要文字、不要颜色」，模型不听话）：`tzt_画板 15`=「文字·扬声器」、`tzt_画板 16`=「3KD券」、`腰封-04`=「数字3·阿拉伯文」、`腰封-05`=「绿色横幅」、`楼层_画板 4 副本 3`=「券·绿色背景」。共同点：**几乎没有食物/商品的窄条横幅或纯图形**，模型没东西可认就硬凑版式信息。
    - **两道一起上**：① `functions/_ai.js` 新增 `ELEMENT_TAG_NOISE_WORDS` / `isNoiseElementTag()`，在 `parseElementSuggestions` 的收口处丢掉（⇒ **逐图识别、按组识别、上传时的元素建议三条链路共用**；不依赖模型听话，能被测试锁住）；② 两个提示词各加一条「画面里没有可辨认的实体时 elements 必须返回空数组」并点名禁止例（文字/阿拉伯文/数字3/绿色背景/横幅）。
    - **不误伤的边界**（已锁测试）：颜色字开头的正常词照留（黄瓜/红茶/白菜/黑胡椒）、含数字的型号词照留（PS5）；只丢「整词就是颜色/背景/文字/数字N」以及 `3KD券` 这种「数字+券」。
    - **真实图片复验**（本机真调模型、不改库）：`tzt_画板 15` 的「文字·扬声器」→「餐桌」；`tzt_画板 16` 的「3KD券」→「券」⇒ 噪音没了，模型还被拉回真实元素。
    - **顺手清掉一条技术债**：`sql/026` 的自检语句原来用 `tgtype & 4` 判粒度（`4` 是 INSERT 事件位、不是 ROW 位），会把 `_del` 误显示成 ROW；已改成 `& 1`（`TRIGGER_TYPE_ROW`）。**触发器本身一直是对的**，只是那列标签错。
    - 测试 **467/467**（新增 `tests/case-tag-noise-v907.test.mjs` 6 条；`tests/tag-vocabulary-i18n.test.mjs` 的版本号断言随 v907）。
    - 🚧 **没做/没验**：① 存量 28 行的噪音标签**不会自动清**（要重跑那 28 张才生效，属"写库"动作）；② 「窄条横幅（宽高比 > 6:1，如 6250×437）直接跳过识别」这轮没做；③ 「同款多语言版标签漂移」仍只靠 v906 的按组识别缓解，**配对口径本身还 park 着**。
    - **抽检的另外两条结论（未修，供下一步参考）**：**同款多语言版各识别一次 ⇒ 标签漂移**（`05-EN` 有「咖啡杯」没「卷饼」、`05-AR` 有「三明治」没「咖啡杯」；「画板 1」四版四套标签，`牛排`/`烤肉` 各说各话 —— 这正是用户「搜牛排出英文版、搜烤肉出阿语版」的根因）；**缩略图在实验项目 28 张里 6/6 全缺**，脚本会退回原图（更慢更贵）。
  - **✅ v908（2026-10-13，已发测试站，部署 `22ae9214`）—— 步 2：写入范围全开 + 元素筛选吃逐图标签**。这是正本里挂了很久的「步 2」。
    - **写入范围**：`app.js` 的 `casePreviewAiEnabledFor(source)` 从 `isCasePreviewAiExperimentSource(source)` 改成 **`isCaseProject(source)`** —— 一处门禁同时放开了「一键识别」按钮、逐图 AI 标签面板、以及面板里的采纳/排除/撤销。服务端 `functions/api/case-preview-ai-tags.js` 的 `previewFor()` **删掉 `source_file_id=eq.<实验项目>` 那道锁**，改成只按请求里带的 `preview_id` 查、且**必须唯一命中一行**（查不到/查出多条 → 404，不写库）；请求体里塞 `source_file_id` / `experiment_key` 一律不认（服务端自己定）。
    - **`EXPERIMENT_KEY = 'augpicks-v1'` 一字未改**：已有 28 行挂在这个 key 下，改名就读不到；新项目的行也写这里，它现在只是个分区名。
    - **元素筛选吃逐图标签**：`librarySourceMatchesFilterValue()` 在 `dim === 'element'` 时，除项目级 `visibleLibraryTags` 外，再匹配 `caseProjectElementTagsFor(source)`（与搜索用的 `caseProjectElementTags` 同一份「全项目物料逐图标签」）。**其它维度、非案例项目、空值、未选中筛选时行为逐字不变。** 结果按 `source.id` 缓存，物料/逐图标签行有变动时整表失效，只有「选中了元素 chip」的路径才会算。
    - 测试 **480/480**：新增 `tests/case-ai-write-scope-v908.test.mjs`（7 条）+ `tests/element-filter-preview-tags-v908.test.mjs`（6 条）；`tests/case-preview-ai-experiment-v870.test.mjs` 的门禁断言随步 2 更新。
    - ⚠️ **边界（前三条有意为之，第四条要注意）**：① **服务端去锁后边界变宽** —— 任何管理员只要知道一个 `preview_id` 就能给它写标签，即使那张属于图库单图素材（前端不显示入口）；要收紧得在服务端再查一次 `vf_source_files` 判定"是不是案例项目物料"，**本轮没加**。② 筛选 chip 的**候选列表没动**，仍只有 `FILTER_SECTIONS_CONFIG.element.values` 那 8 个静态词（银行卡/券/kiki/骑手/国旗/手机/耳机/PS5）—— 逐图识别出的**新词**（如「餐桌」）目前没有 chip 可点、只能靠搜索框；本轮修的是"选中已有 chip 却匹配不到"这一半，**要不要把库内出现过的元素变成动态 chip 等用户定**。③ 性能只做了结构性验证（缓存命中/失效有测试锁），**"全量识别后元素筛选首屏重算耗时"没在浏览器里量过**。④ `isCasePreviewAiExperimentSource()` 与 `CASE_PREVIEW_AI_EXPERIMENT_*` 常量前端已无调用点（只被测试当历史锚点），保留未删。
    - 🚧 **还没验**：非实验项目上真机点一次「一键识别」的端到端（本轮只做到"假 Supabase 跑真实 handler"级别）。
  - **✅ v909（2026-10-13，已发测试站，部署 `3f5c7d74`）—— 搜索铺开服从「物料类别」筛选**。用户实测反馈：搜「足球」+ 选中「开机海报」，结果里混进弹窗 / 横banner，「点开每个分类都会出现不同的物料」。
    - **根因（v904 的遗留）**：案例库的类别筛选（开机海报 / 弹窗 / 头图…）落在 `state.libraryFilters.tag2`，而 `librarySourceMatchesSelectedTags()` 对案例项目是**项目级**判定 —— 项目里有开机海报 ⇒ 整个项目通过；v904 的「按命中物料铺开」又只看**关键词命不命中**、没看类别，于是把项目里**所有**命中关键词的物料（含弹窗、横banner）都摊开了。
    - **改法**：`collapseCaseProjectItems()` 新增 `typeFilters`（从 `selectedLibraryTagValues()` 里挑出真正的物料类别，用 `caseMaterialTypeSet()` 判）与 `passTypeFilter()`，铺开（`hits`）和「封面替换」（`previewAiMatch`）**两处都过这道闸**；**没选类别时一律放行**，行为与 v904 逐字一致。
    - 测试 **485/485**：新增 `tests/case-type-filter-expand-v909.test.mjs`（5 条，含「换个类别就换一批物料」「没选类别时行为不变」「项目里没有该类别的命中物料时回落项目卡，而不是拿别的类别的图当封面」）；`tests/library-case-expand-v904.test.mjs` 与 `tests/case-preview-ai-groups-v906.test.mjs` 的 vm 切片补了 `selectedLibraryTagValues` 桩（新依赖，行为不变）。
    - ⚠️ **有意保留的语义**：类别筛选仍是**项目级**的 —— 项目只要**有**开机海报就整体通过；若关键词只在它的弹窗里命中，这张卡会回落成该项目的**开机海报封面**（类别没错，但那张图本身未必含关键词）。要做到「图和关键词都必须属于同一类别」得改判定语义，**本轮没做**。
  - **✅ v910（2026-10-13，已发测试站，部署 `9f29a24d`）—— 点哪张铺开卡，浮窗大图就落在哪一张**。用户实测反馈：搜「餐桌」后点开某张铺开的物料，浮窗左边大图却是**该物料类型组的默认封面**（看着像项目封面），不是他点的那张。
    - **根因**：v904 把点击落点从「项目」改成了「物料类型那一组」（`openCaseProjectModal(source.id, preview.material_type)`），而 `openCaseProjectModal` 里初始大图取的是 `caseCoverFor(source, tabValue).cover` —— **类型组里优先英文版的那张**，不是被点的那张。这正是「步 1b 明确没做的四个小口子」里的第 ③ 条。
    - **改法**：`openCaseProjectModal(sourceId, focusType, focusPreviewId)` 加第三个参数；把「初始大图选谁」抽成纯函数 `caseModalInitialPreviewId(materials, fallbackId, focusPreviewId)`（focus 属于本项目就用它，否则退回 fallback）；网格点击（`app.js:9460`）与键盘 Enter（`app.js:9488`）两处都补 `X.preview.id`。**`tabValue` / 侧栏 / 左右切换 / AI 面板逻辑一行未动**；「切 tab 后重开浮窗」那两处仍不传 id。
    - 测试 **492/492**：新增 `tests/case-modal-focus-preview-v910.test.mjs`（7 条：helper 的 vm 切片 4 条 + 源码接线 3 条）；`tests/library-case-expand-v904.test.mjs` 的点击签名断言随之更新。
    - **浏览器实测（本次会话真的点了一遍）**：搜「餐桌」→ 点第 2 张（寿司/咖啡那张）→ 浮窗左边大图就是那张，底部「当前物料 AI 标签」显示该图的 `汉堡·餐桌·咖啡杯·寿司·蛋糕` ⇒ 确认不是默认封面。
    - ⚠️ **还没改的入口**：右键菜单「查看详情」（`app.js` 约 9602，`openCaseProjectModal(source.id)`）**只传 sourceId**，仍走类型组封面；它的调用方手里其实有 item（含 preview），要一并修很容易 —— **故意没动**，等用户定。
    - ⚠️ **未核实**：侧栏若把语言筛选停在 en/ar、且被点那张恰好被过滤掉，高亮看不到（默认 `'all'`，正常场景无影响）；`material_type` 不在物料目录里时 `tabValue` 会回落、而 `currentId` 仍是被点那张（有意为之）。
  - **✅ v911（2026-10-13）—— 全量逐图识别跑完**（本机脚本干的，**不是代码改动、没发版**）
    - **结果**：`node scripts/recognize-case-tags.mjs --concurrency 6 --rate 3 --yes`，98 个案例项目 / **1897 张**参与 ⇒ **成功 1810 · 失败 87 · 跳过 38（内容没变）**，用时 **25 分 35 秒**（平均 1.2 张/秒）。`vf_preview_ai_tags` 现在 **1935 行**（1848 success + 87 failed）—— 逐图标签**首次覆盖全库**，「每张图都能被搜到」的地基落地。
    - **失败 87 张全是 `.gif`**（全库 gif 共 93 张 ⇒ **成功 6 / 失败 87**；成功那 6 张是"压缩"过的小 gif + 实验项目里早先跑过的两张）。原因两类：`图片输入格式/解析错误` 52 张、`图片过大，请改用缩略图识别` 35 张 ⇒ **GLM 视觉通道吃不下动图/大 gif，属结构性限制**。失败清单：`outputs/recognize-failures-2026-10-13-09-15-46.json`。
    - **缩略图几乎全缺（实测）**：小样 10/10 与全量日志都在反复报「缩略图缺失、退回原图」⇒ 老数据基本没生成过缩略图，慢且贵，但**不影响识别结果**。
    - **✅ v907 的噪音黑名单在全量规模上验证通过**：全库 1935 行 / **4699 个标签**里，命中黑名单的只有 **6 个**，且**全部来自实验项目那 28 行**（内容没变被跳过，仍是旧提示词的产物）：`文字` / `阿拉伯文` / `数字3` / `绿色背景` / `绿色横幅` / `3KD券`。**新识别的 1810 张里一个噪音词都没有。**
    - **标签分布健康**：出现最多的是 餐桌 357 / 汉堡 352 / 优惠券 248 / 薯条 237 / kiki 237 / 三明治 216 / 披萨 210 / 足球 190 / 饮品 94 / 手机 94…，共 **302 种**标签，没有乱码或版式词。
    - **词表被自动收全**：`vf_tag_vocabulary` **131 → 341 行**（+210），其中 **213 行还没有英文名** ⇒ **要去团队管理页点「补翻译」**（收全由 sql/025 触发器负责，英文名本来就得靠翻译补）。
    - 🚧 **遗留三条**：① **GIF 认不了**（87 张永久失败，除非改用缩略图/抽静态帧）；② 词表里那 6 个旧噪音词要清，得 `--force` 重跑实验项目那 28 张（标签被覆盖后它们变孤儿词，触发器自动删）；③ 首屏补翻候选涨到 1953 量级，上线后留意首屏耗时。
  - **✅ v912（2026-10-13，已发测试站，部署 `4a6a12a0`；`sql/027` 已执行、**改名已实测通过**）—— 词表成为标签的统一管理入口**。用户诉求原话：「如果我想批量修改某个标签，或者删除标签，通过词表统一管理是最方便的途径」。
    - **为什么必须走数据库函数**：词表只是字典，物料上的标签才是真身；而且 `vf_sync_tag_vocabulary()` 会把「只改词表行」的改动撤销（收全 + 删孤儿）。所以改名/删除必须在库里**一次性改写所有位置**，最后再调一次同步对齐。
    - **新增 `sql/027_tag_manage.sql`（用户自己跑，AI 不代跑）**：两个 `security definer` 函数 `vf_rename_tag(p_old,p_new)` / `vf_delete_tag(p_name)`，覆盖 5 处 —— `vf_preview_ai_tags.ai_tags` / `manual_tags` / `excluded_tags`、`vf_asset_previews.material_type`、`vf_source_files.tags`；末尾 `perform public.vf_sync_tag_vocabulary()`。
      - **项目级 tags 是编码形式**（`vf:case-element:v1:%E5%90%89%E7%A5%A5%E7%89%A9`）：函数自带 `vf_percent_encode`（Postgres 没有内置百分号编码），匹配用「字面量相等 **OR** 解码后相等」双保险，改完去重。
      - **改名撞车 = 合并**：词表里若已有新名字那行 ⇒ 保留它（`source='manual'`、`related` 取并集）、删掉旧行。
      - **删除 = 从物料上摘掉标签**（`array_remove`），**不删任何物料行、不删图片**。
      - 批量改写期间临时 `disable trigger` 掉 `vf_tag_sync%`（否则改 300 行 = 几百次全表重算，可能撞语句超时），改完恢复 + 手动对齐一次，带 exception 兜底。
      - **权限只给 `service_role`**（`revoke` 掉 public/anon/authenticated）—— 全库级破坏性操作不该对普通登录账号开放。
    - **服务端代理**：`functions/_account-data-policy.js` 的 RPC 白名单从「写死一个名字」扩成「写死的三个名字 `Set`」，口径不变（**只 POST + 必须维护权限**，其它 RPC 照旧 403，**绝不放宽成"任意 rpc"**）；`jsonBody:false` ⇒ 参数原样透传（这两个 RPC 是**有参的**）。
    - **词表页 UI**：「中文名」变成可编辑输入框（change 保存，走 `vf_rename_tag`）+ 每行危险色「删除」按钮（`tv-btn tv-danger`），表格回到 4 列。确认文案：改名 =「全库所有挂了这个标签的物料都会一起改名，不可撤销。新名字若已存在，两个标签会合并。」；删除 =「把"X"从所有物料上摘掉（物料和图片不会被删），并从词表移除。不可撤销。」成功后重读词表 + `reloadLibraryData()` 重绘素材库。
    - **降级**：没执行 sql/027 时 RPC 报错不崩 —— 挂中文提示「需要先在 Supabase 执行 sql/027_tag_manage.sql」、中文名转只读、隐藏删除按钮，点「刷新」重试。
    - 测试 **515/515**：新增 `tests/tag-manage-v912.test.mjs`（21 条）；`tests/tag-vocabulary-flat-v891.test.mjs` 按新口径更新（原来锁的是「三列、无删除按钮」，现在改成「四列、删除按钮回归但必须走数据库函数」）。
    - ⚠️ **实机验证进度（2026-10-13 更新）**：
      - ✅ **`sql/027` 已由用户在 Supabase SQL Editor 执行成功**；9 个 `vf_tag_sync_*` 触发器跑完后仍是 `tgenabled='O'`（**临时关触发器的兜底恢复没问题**）。函数存在性也实测过：`POST /rpc/vf_rename_tag {"p_old":"__probe__","p_new":"__probe__"}` → 200 `{"changed":false}`；`POST /rpc/vf_delete_tag {"p_name":""}` → 400「标签名不能为空」。
      - ✅ **全库改名实测通过**：用户把「**健身器材**」改成「**健身道具**」⇒ 词表行跟着改名（`id` 同步成 `el:健身道具`，无残留错行）、那 2 张图（项目「健康活动（5月1日至5月22日）」）的逐图 AI 标签一起变成新名、**旧词在 4 个位置全部清空**、词表仍是 341 行（纯改名未合并，符合预期）。⇒ **「服务端代理白名单 + PostgREST 命名参数传 RPC」这条链路也实测通了**（此前只放行过无参 RPC，是推断）。
      - 🚧 **还没实测**：「删除」按钮（`vf_delete_tag` 的界面链路没点过）；撞名合并分支没在真库体验过。
      - 📌 **第一次用大词注意**：改名前确认新名字不会和已有词撞（撞了就是合并、不可拆）；删除同样不可撤销。批量改写期间会短暂拿 `AccessExclusiveLock`（并发上传会阻塞几秒）；两个管理员同时操作同一标签是「后写覆盖」，没加 advisory lock。
  - **✅ v913（2026-10-13，已发测试站，部署 `4c72aabc`）—— 词表改名/删除改成「点完立刻变」**。用户实测反馈：「改完之后点确定弹窗，吉祥物不会马上变成 ip，需要我手动刷新才会」。
    - **先查清后端不是瓶颈（实测）**：用户的改名**当场就生效了**（`吉祥物`→`ip`，31 张图的 `ai_tags` 立刻成 `ip`、旧词清空、词表行变 `el:ip`）；`vf_sync_tag_vocabulary()` 实测 **488ms**。（量耗时的命令一度卡了 180s / 406s，是**偶发锁竞争**，不是常态 —— 别被它误导。）
    - **根因（代码可查，三条）**：**A** 点确定后 `refreshTagVocabularyBody()` 拿**旧的** `tagVocabularyRows` 重画表体，而用户刚输入的新名字只存在于那个 input 的 DOM 值里 ⇒ **输入框被顶回旧名字**（就是用户看到的现象）；而且那句「正在改名…」虽然写进了 `tagVocabularyMessage`，但 `.tv-message` 只在整段重画时才输出 ⇒ 提示从未显示过。**B** `reloadTagVocabulary()` 开头无条件 `tagVocabularyMessage = ''` ⇒ 成功/失败的结果消息**都被抹掉**，用户零反馈。**C** 注释写着「未保存成功前不许再点」，实际没有任何 in-flight 判断（`tagVocabularyCanManage()` 判的是权限，不是忙）。
    - **改法**：① 新增纯函数 `tagVocabularyOptimisticRename(rows,id,nextName)` / `tagVocabularyOptimisticRemove(rows,id)`（返回新数组、不就地改；改名同时改 `name_zh` 与 `id='el:<新名>'`，撞名则两行合一、`related` 取并集 + `source='manual'`，与 sql/027 口径一致）；② 确认后**先乐观更新本地 + 立即整段重画**，再发 RPC，失败回滚并沿用原有降级；③ 进行中态 `tagVocabularyManageBusy`：忙碌时整表输入框与删除按钮禁用、当前行显示「处理中…」，另有 60s 看门狗兜底解锁（防请求不回来把整张表永久禁用）；④ 消息块抽成 `#tv-messages` 并让 `refreshTagVocabularyBody` 也更新它（**顺带修好了英文名/相关词保存后「已保存。」看不到的老毛病**）；`reloadTagVocabulary(section,{keepMessage:true})` 用在管理操作的成功与失败两处，普通「刷新」/首次挂载/「同步库内标签」/「补翻译」行为不变。
    - 测试 **534/534**：新增 `tests/tag-manage-instant-v913.test.mjs`（19 条：7 条 vm 纯逻辑 + 2 条真渲 HTML + 8 条接线 + 版本号）。
    - ⚠️ **未核实**：真机没复现（本机无真库/浏览器）。除根因 A/B 外，还有一个次要可能 —— 用户在 RPC 在飞时点了「刷新」，那个请求若快照早于提交、却晚于改名自己的重读返回，就会**最后画上旧数据**（所有 `reloadTagVocabulary` 调用点都没有序号/取消机制）；乐观更新 + 立刻重画对这条竞态同样有效，但**没实测**。另：撞名合并时 `related` 的本地顺序（保留行在前 + 去重）与 sql/027 的 `array_agg(distinct … order by …)` 可能不同，约 1 秒后重读会被服务端值覆盖。
  - **✅ v914（2026-10-13，已发测试站，部署 `1dd9fecb`）—— 上传表单去掉 AI 元素识别 + 三标签必填 + 后台识别进度条**。用户口径：上传去掉 AI 识别（走后台无人值守识别），但**保留标签选择浮窗**；平台/国家/活动主题**必填**；AI 与人工标签**去重**；顶部加**后台识别进度条**，且**刷新后仍在**。
    - **W1.1 去掉上传时的 AI 元素识别**：删掉 `renderCaseTagBar()` 里的 AI 建议区块（`data-case-tag-ai`）、拖图上传那条路的「挑开屏 → `/api/analyze-elements` → 建议 chip」整段，以及两处空的 `clearCaseElementSuggestions()` 调用。**函数本体（`requestCaseElementSuggestions` / `selectCaseElementSuggestionFile` / `clearCaseElementSuggestions`）与端点 `functions/api/analyze-elements.js` 一字未删**（线上在跑、别处可能引用）。物料类型自动识别 / 缩略图网格 / 成套自动判数量原样保留（有测试锁）。
      - ⚠️ **保留未动的一处**：**项目详情弹窗**左下角的「AI 识别」按钮（`#case-foot-ai-tag`）**还在** —— 任务书说的是"上传表单里"，而且它被在库的 `tests/case-foot-tools-v858.test.mjs` 锁着。**要不要也去掉，等用户定**（约 10 行小改）。
    - **W1.2 平台/国家/活动主题必填**：在既有 `validateCaseProjectUpload()` 上扩展（没新造一套），缺哪报哪、复用 `.case-tag-row.is-missing` / `.case-tag-add.is-required` 标红并自动弹面板。**只在上传分支校验，编辑已有项目不拦**（测试锁"全仓只有 1 次调用"）。
      - ⚠️ **副作用**：以前"平台+国家选齐就能传"，现在**每次上传都必须显式选活动主题**（预填只在素材库筛选停在该项时才带出来）。同事若觉得烦，可考虑把"上次选过的活动主题"也记住（现在只记平台）。
    - **W1.3「元素」行本来就支持自定义新增**（核实结论）：`CASE_TAG_CUSTOM_KEYS = ['element','activity','strategy']`（v826 起）已给了 `＋ / 输入框 / 添加`，回车即 `addCaseTagCustomValue → caseTagSelToggle(sel,'element',value)`。**唯一与需求不符的是上限**：实际是"中文 6 字 / 英文 12 字符"（三条行共用），不是 ≤5 字 —— 没改（改会连带影响另两行），只把真实口径锁进测试。
    - **W1.4 去重口径统一**：端点 `save` 与脚本 `buildSuccessRow` 现在都 **`ai_tags` 同时刨掉 `excluded_tags` 和 `manual_tags`**；`manual_tags` / `excluded_tags` 本身仍原样保留、绝不覆盖（铁律未破）。测试**两边都真跑并逐例比对三个数组同值**。
    - **W2 后台识别进度条**：新增纯函数 `recognizeProgressState({previews,tagRows,sources,lang})` → `{visible,kind,projectTitle,remaining}`，三态：`running`（有 `status='running'` 行 → 项目名取 `vf_source_files.title`）/ `queued`（还剩 N 张 = 案例项目里没有 `success` 行、且脚本真会送的图片；视频/psd/无 `preview_path` 不算）/ `idle`（整条隐藏）。细条是素材库页最顶上的**占位细带**（不是 fixed，不挡检索栏），**轮询 20s**，`recognizeProgressCanPoll()` 要求 `state.route==='library'` + 有 `access_token`，换页/登出即停。收起记 `localStorage['vf_recognize_progress_hidden_v1']`（记的是"收起时那一种状态"，状态换了会重新出现）。**没新增任何端点** —— `loadAllPreviewAiTags()` 的 `PREVIEW_AI_TAGS_SELECT` 本来就带 `status`。
    - 测试 **573/573**：新增 `tests/upload-autotag-v914.test.mjs`（15 条）+ `tests/recognize-progress-bar-v914.test.mjs`（24 条）；`case-upload-required-tags-v809` / `element-ai-suggest` 按新口径更新。
    - ⚠️ **未核实 / 已知偏差（重要）**：
      ① **进度条只在素材库页**显示与轮询，首页/工具页没有；素材库页往下滚时会被 sticky 检索栏盖住（这是"不挡内容"的代价，没做 sticky）。
      ② **"还剩 N 张"是近似**：素材库的 sources/previews 是按筛选加载的（选了筛选就只统计已加载那部分）；只看 `status` 不看 `content_key`（图片换过但行仍 success 的算完成）；行被删时客户端 Map 不清理，残留 success 行会让数字偏小。
      ③ **轮询副作用未实测**：每 20s 重读整表 `vf_preview_ai_tags`（1935 行 ≈ 2 个分页请求），且会作废元素筛选的聚合缓存 —— 选中元素筛选时重算更频繁，**没在浏览器里量过**。
      ④ **真机端到端未做**：没登录真站，进度条实际观感（细条位置、收起行为）没在浏览器看过；上传必填拦截只到"真跑校验函数"这一级。
  - **✅ v915 / v916 / v917 / v918 / v919 + 腾讯云 worker 上线（2026-10-13 ~ 10-14，一串相关的收尾与新增，合并记一条）**
    - **v915（`ab2a62f`）**：去掉**项目详情弹窗**左下角的「AI 识别」按钮（`#case-foot-ai-tag`）—— v914 只摘了上传表单那个，用户决定这个也摘。函数与端点仍保留。
    - **v916（`013344f`）**：识别脚本把 `.gif` 当**不可识别**默认跳过。理由是 v911 实测 93 张 gif 只成功 6 张，而失败的 87 张会被**无限重试**，`--limit 8` 每轮只取到队首那几张 gif ⇒ **把新图堵在队尾、worker 空转**。带 `--include-gif` 逃生开关。⚠️ 这条已被 v917 取代，但「**别让永久失败的东西堵队列**」这个教训要留着。
    - **v917（`e6e5d5e`）**：**动态物料改用 ffmpeg 抽帧识别**。用户的关键纠正：**GIF 不能只取第一帧** —— 动态弹窗的第一帧常常还是"没弹出来"的空状态（用库里 `picks足球弹窗AR.gif` 解帧核实：首帧只有 App 背景+遮罩，中间帧/末帧弹窗才完整）。改成 **ffmpeg 抽「中间帧 + 最后一帧」→ 当一组送 `analyzeCaseTagGroupsWithGlm`（一条消息看 2 张）→ 拿一套统一标签**。
      - **同时把正本里一直标着"未核实"的那条验了**：`glm-4v-flash` **确实能一条消息吃两张图**（实测两张 1000×2168 竖版图 → 4.9s → 返回一套标签）。
      - 扩展名分三类：**直接送**（png/jpg/webp 等）/ **抽帧送**（gif/mp4/mov/webm）/ **跳过**（psd/ai/json + 无预览路径）。ffmpeg 不可用或抽帧失败 → 退回跳过/记失败，**不中断整轮**。路径走 `FFMPEG_PATH`/`FFPROBE_PATH`。`--skip-dynamic` 取代 `--include-gif`。
      - **抽帧实测有效**：靶子是一张 **30 MB** 的 gif（难怪一直报"图片过大"）→ ffprobe 读出时长 3.0s → 抽出两张 ~480 KB 的 PNG。
    - **v918（`14a858f`）**：新增**「效果类型」标签 —— 独立一维 `vf_preview_ai_tags.effect_tags`**（用户口径：「动态弹窗跟静态物料的标签识别要有区别，除了元素标签还要识别弹窗的效果类型标签」，例如爆炸/冲击力/场景氛围/利益点凸显）。
      - **`sql/028_effect_tags.sql`（已写好，⚠️ 待用户执行）**：加列 + `create or replace` 词表同步函数（收全时按来源给 kind，`effect_tags` → `'effect'`）+ **重建那条 UPDATE 触发器**（`when` 加上 `effect_tags`）+ **15 个 `kind='effect'` 种子词**（爆炸/粒子/光效/水花/烟雾/闪光 · 缩放/抖动/弹跳/旋转/滑入/展开 · 利益点凸显/氛围营造/悬念引导）+ 自检。**必须在 sql/025、026 之后跑**。
      - **有意例外**：`kind='effect'` 的行**永远不被"删孤儿"清掉** —— 元素词是从物料自动长出来的（没人用就该消失），而效果词是**人工维护的受控词表**；按"没人用就删"会在还没识别动态物料时把种子词删光、词表自我萎缩。这是对 v900「孤儿清理不分人工/自动」的一处例外，理由写在 sql 注释里。
      - 提示词**只在给了效果词表时**才追加「判断效果类型、只从这份词表里挑、挑不到返回空数组、最多 3 条」（沿用 v907 口径）；`parseEffectSuggestions` 只收词表内的词并过噪音黑名单。**只有动态物料请求效果标签**，静态图写 `{}`。
      - 前端：浮窗里多一行「**动效标签 / Motion tags**」（无值不显示）；`libraryItemSearchText()` 把 effect_tags 算进搜索（**搜「爆炸」能命中**）；词表页给 effect 行挂「动效」小标记；**不进**元素筛选 chips。
    - **v919（`5ca27f3`，测试站 `382b020c`）**：识别脚本新增 **`--force-dynamic`** —— **只强制重跑动态物料**（补 v918 之前生成的、`effect_tags` 为空的那些行），静态图不受影响；`--force` 优先于它。用意：不用把 1800 张静态图再跑一遍。
    - **🖥 腾讯云 worker 已装好并跑通（第一次脱离本机真跑）**
      - 位置 `/opt/case-tags/`：`scripts/recognize-case-tags.mjs` + `functions/_ai.js` + `.local/recognize.env`（0600）。走控制台「**文件管理**」上传 + 「**执行命令**」运维，**不需要 SSH**。
      - 主机原本**没有 Node、没有 ffmpeg**，都按 NodeSource / apt 装好（Node 20.20.2、ffmpeg 6.1.1）。
      - ⚠️ **踩到的坑（记住）**：控制台「执行命令」有**60 秒硬超时**，`apt-get install` 这种长命令**必须 `nohup ... &` 后台跑**，再回来看 `/tmp/*.log`；给验证命令里塞 `sleep 80` 也会被掐断。
      - **第一轮 cron 实测**：`20/20 成功 · 0 失败 · 45 秒`，其中 **13 张动态物料抽帧成功**（含 1 个 mp4 `ApolgyEnglish09.mp4`）。抽出来的标签质量正常：**0 张空标签、0 个噪音词**（例：`Pop-Up-AR 01.gif` → 足球·kiki·卡片；`AR73.gif` → 足球·盾牌·百分比·足球图案；`第三组en.gif` → 餐桌·人物·骆驼·沙漠·海景·餐厅）。
      - ⚠️ **发现一个黑名单小口子**：`ar 最终弹窗（压缩）.gif` 给出了 **`50%`** 和 **`1 KD`** —— 价格/百分比类文字漏过了 v907 黑名单（它没覆盖"百分比""数字+货币单位"这两种形态）。**待修**。
    - ⚠️ **已知缺口**：`vf_rename_tag` / `vf_delete_tag`（sql/027）**没有覆盖 `effect_tags`** —— 在词表页把「爆炸」这类**效果词**改名/删除时，物料上的 `effect_tags` **不会被一起改**（元素那几处会）。要补齐得像 sql/027 那样改这两个函数，**建议下一支迁移做**。
    - ⚠️ **尚未核实**：sql/028 还没执行（用户待跑）；`--force-dynamic` 在真库上的实际效果没验；"93 张动态物料整轮跑通"没跑完（第一轮只跑了 13 张）；真机浏览器里的「动效标签」行没看过。
  - **✅ v920（2026-10-14，已发测试站，部署 `fffa5bb1`）—— 词表页每个词显示「使用量」，一眼看出孤儿词**。用户诉求原话：「在词表里的词的前面加一个数字，显示这个词被几个物料使用，这样就能区分出是不是有用到了」。动机：元素词没人用就是死词条（点进去 0 条结果，v899 去「新增词」入口正是为此），而效果词可能是"刚加、还没识别到"或"真没用上"—— 之前在界面上这两种完全看不出区别。
    - **做法**：**不用存列**（会过期），改成数据库**实时视图** `public.vf_tag_usage`（`sql/030_tag_usage.sql`，214 行，⚠️ **待用户执行**）。行的集合 = **词表 ∪ 物料在用 ∪ 项目在用**（所以孤儿词也在结果里、`materials=0`），清洗口径与 `sql/025` 逐字对齐；`materials` = 带着这个词的 `vf_asset_previews` 行数（来源 `ai_tags`/`manual_tags`/**`effect_tags`**/`material_type`，按物料去重），`projects` = 带着它的 `vf_source_files` 行数。
    - **`effect_tags` 不存在时（028 没跑）也能建视图**：把这一维抽成 `stable security definer` 的辅助函数 `vf_effect_tag_rows()`，**每次调用查一次 `pg_attribute`**，列在就返回、不在就返回空集 ⇒ `create view` 不报错，只是这一维暂不参与统计；**028 之后再跑也不用重跑 030**。同时 `revoke` 掉这个辅助函数的 public 执行权（防"只有 anon key 的人"直接 rpc 绕过 RLS 读到 effect_tags）。
    - **服务端代理**：`functions/_account-data-policy.js` 的表名白名单加 `vf_tag_usage`（仍是写死名字，无通配）。
    - **界面**：中文名后面挂一枚小徽章（灰底胶囊、10.5px）；**0 标红**，`materials=0 且 projects=0` 时显示「**未使用** / unused」；悬停 `title` = `物料 12 个 · 项目 3 个`（英文界面 `12 assets · 3 projects`）。`kind='effect'` 的「动效」紫标记从"绝对定位在右上角"改成**跟在数字后面**（原来会压住数字）。**视图查不到的词不显示徽章、而不是显示 0**（防误报，有测试锁）。
    - **降级**：没跑 `sql/030` 时，词表页挂一句灰底轻提示「使用量这个数字还读不到：需要先执行 sql/030_tag_usage.sql」，**不报错、不阻塞词表页**。
    - 测试 **665/665**：新增 `tests/tag-usage-v920.test.mjs`（30 条：纯逻辑 `tagUsageBadge` 10 条 + 真渲 HTML 7 条 + 接线 5 条 + 代理白名单 2 条（含 `dataPlan` 真跑验 GET 放行 / POST 等 403）+ sql 口径 6 条）。
    - ⚠️ **未实测（重要）**：SQL 一行没跑过；**PostgREST 能不能直接查这个视图没验**（理由链可查：视图在 public、白名单已放行、`service_role` 显式授了 select；残留风险是 PostgREST schema cache 没自动重载 ⇒ 先看到灰提示、等一会儿或点「刷新」）。**跑完迁移后真正的验收入口 = 打开词表页看数字有没有出来**。
    - ⚠️ **没量过**：词表页多一次查询（341 行量级、与词表查询并行发出，不阻塞行读取）对首屏的影响。
  - **✅ v921（2026-10-14，已发测试站，部署 `f28f9913`）—— 修「选了物料类别 + 关键词，却冒出与该关键词无关的类型封面」**。用户实测反馈：「我在弹窗这个分类下搜索，就算项目里有 kiki 的物料，如果这个项目的弹窗里没有 kiki，理论上来说就不应该被显示出来」（最后一轮实机确认：45 张 → **32 张**）。
    - **根因（代码可查 + 浏览器复现，不是缓存）**：真实案例「BBD: KFG [9.10-9.12]」里带 `kiki` 标签的物料是两张**「未分类」**的老虎图（`ai_tags=["kiki","金币","礼物盒"]`）；它们被「弹窗」这个物料类别筛掉（v909 的 `passTypeFilter`，本来是对的）⇒ 该项目在「弹窗」下**一张命中都没有** ⇒ 代码落到 `collapseCaseProjectItems` 最后那条**「项目级命中就出一张该类型封面」**分支 ⇒ 给项目出了一张「弹窗」封面，而那张封面（`ai_tags=["汉堡包","饮料杯","比萨切片","星星","优惠","礼物盒","按钮"]`）**根本没有 kiki**。⇒ **这正是 v909 时"有意保留"的语义，本轮确认它是错的。**
    - **改法**：新增 `caseProjectMetaMatchesQuery(source, query)` —— **只看项目自身信息**（标题 / `owner_name` / `source_filename` / 国家·活动·类别选项名 / 项目级标签 `visibleLibraryTags`，并挂拼音与英文别名），**绝不碰任何物料的类型/文件名/逐图标签**（现有 `libraryItemSearchText()` 把两者混在一起，照它抄会修不好）。然后在 `collapseCaseProjectItems` 的 `hits` 之后、`caseCoverFor` 回落之前加一道闸：
      `if (typeFilters.length && !caseProjectMetaMatchesQuery(item.source, query)) return;`
      ⇒ 规则：**有关键词 + 选了类别**时，项目出卡必须满足 (a) 有该类别且命中的物料（照旧铺开），或 (b) 关键词命中的是项目自身信息（保留"搜项目名"这种正常用法）；否则该项目**整张不出现**。
    - **非目标（有意不动）**：没选类别筛选时、或没有关键词时，行为**一字不变**。
    - 测试 **679/679**：新增 `tests/type-filter-drop-v921.test.mjs`（14 条），其中**用真实案例当夹具** —— 场景 A（`kiki` 只在「未分类」那张上 + 选弹窗 ⇒ `out=[]`、连 `caseCoverFor` 都不调）、场景 B（kiki 在弹窗那张 ⇒ 正常铺开）、场景 C（标题/项目标签/国家拼音命中 ⇒ 出封面卡）、场景 D（没选类别 / 没关键词 ⇒ 行为不变）。另加**源码断言**锁住"元数据匹配函数里不出现整项目物料标签的聚合调用"。
    - ⚠️ **顺手改了 `tests/case-type-filter-expand-v909.test.mjs` 的一条断言**：它原来的夹具正是 v921 要否定的语义（项目名「World Cup」不含"足球"，足球只在弹窗里 ⇒ 旧断言"回落开机海报封面卡"必然变红）。把夹具项目名改成含"足球"以符合新规则，保留"回落时用该类别封面"那半条断言；"元数据也不命中 ⇒ 整张不出现"由新文件的场景 A 覆盖。
    - ⚠️ **一处已知收窄（可能算误伤，待用户定）**：`caseMaterialMatchesQuery` 不吃拼音/英文别名，而外层 `libraryItemSearchText` 吃（别名挂在受控词表条目上，如 `汉堡→burger`）。所以「**别名形式** + 选了类别」且项目自身元数据不含该词时，以前会出一张该类别封面卡，**现在归零**（例：某弹窗物料的元素标签是「汉堡」，搜 `burger` + 选弹窗 ⇒ 现在不出）。本体中文搜索不受影响。要不要把别名扩到铺开口径 **本轮没做**。
    - ⚠️ **真实浏览器只验了"总数 45→32 + 第一屏全是有老虎的物料"**，没有逐屏翻完确认那张 BINGOOO 封面彻底消失（单元测试的场景 A 覆盖了这一条）。
  - **✅ v922（2026-10-14，已发测试站，部署 `9a9d4f2c`）—— 上传时「未分类」必须手选：红框 + 拦截 + 批量设置分类**。用户诉求原话：「给上传时加一个功能，就是识别不出来的物料类型的图片就加一个红框来提示，让上传者手动选择；如果上传的物料存在红框就不可以上传。不过如果识别不出来的物料太多，改起来很麻烦，所以还需要加一个批量修改的功能。」
    - **背景（实测数据；2026-10-14 用户当场纠错后**按库重算**）**：物料类型是靠**尺寸精确匹配**猜的。
      - ⚠️ **必须按 `vf:kind:*` 分库统计**（我第一版没分库、得出"全库 310 张未分类 / 14.4%"，**是错的，别再用那个数**）：
        · **案例库 `source`：1941 张物料，未分类 98 张（5.0%）** ← **只有这批是真问题**
        · 图库 `gallery` 112 张、模板库 `template` 100 张 —— 它们的 `material_type` **本来就是空的**（图库用**品类标签**存在项目标签上、模板库用模板分类），**不是"未分类"问题**，不该混进统计
      - 案例库那 98 张的尺寸（共 42 种）：`1300×1375`(18) · `1200×630`(8) · `1388×1083`(4) · `1501×1339`(4) · `6250×834`(4) · `1071×201`(3) · **小图标 `140×128` / `108×89` / `109×89` / `40×42`** · `2000×3262` · `1500×3168` · `1500×3816` · `2000×1279` · `672×565` … ⇒ **刨掉小图标与空预览后，真正"成品没分对"的估计 50–60 张**（样例：`1300×1375` 是阿语日历海报、`1200×630` 是社媒分享图，都属 `vf:kind:source`、确实该分类）。
      - **顺带查清（实测）**：`vf_preview_ai_tags` 的 **1941 行全部属于案例库**，图库/模板库 **0 行** —— 后台 worker 的范围就是案例项目；所以一直看到的「待识别 212 张」= **图库 112 + 模板库 100**。**用户 2026-10-14 明确：这两个库暂不需要识别**（模板库是版式/字体/组件，识图收益低）。
    - **① 红框**：卡片 HTML 抽成纯函数 `caseDropCardMarkup()`；未分类时输出 `is-untyped` ⇒ 缩略图 2px 红边 + 浅红底，左上「未分类」chip 变红且常显。**红只挂在卡片的 `is-untyped` 上**，所以图库那条 `[data-gallery-type-chip]` 的「未分类」不会被染红（有断言锁）。消红出口统一在 `syncTypeLabel()`：**异步检测出尺寸 / 单张手选 / 批量设置**三条路都落到这里。
    - **② 拦截**：`validateCaseProjectUpload()` 在标签必填之后加一条 —— 有任意一张没真实分类就**拦下上传**，提示 `还有 N 张没识别出分类：请点缩略图上的「未分类」选择，或用下面的「批量设置分类」。`；并把第一张未分类的卡 `scrollIntoView` + 全部未分类卡闪红 2.4s（指出是哪几张）。**只在上传分支校验，编辑已有项目不拦**（沿用 v914 的做法，有断言锁「一次定义、一次调用」）。
    - **⭐ 关键口径**：`caseUploadTypeChosen(value)`（`app.js` 约 11388）= `text !== '' && text !== '未分类'` —— **下拉里的空串/「未分类」一律视为"还没选"**，红了就不消、照样拦住。以后**不能"故意不分类"上传了**（除非选一个真实类型）—— 这是用户要的效果。
    - **③ 批量**：文件网格下方新增批量条（`#case-drop-batch-bar`，带「还有 N 张未分类」提示），进批量模式后卡片出勾选框（**沿用 v812/v813 库里那套勾选框 + 操作条 + `.case-type-menu` 浮窗的视觉语言**），支持点选 / 全选 / 清空 / **一键「全选未分类」** / 一次设成同一类型。批量只是替用户设每张卡那个隐藏 `<select>`（`value` + `dataset.touched='1'` + `syncChip`），**与单张手选共用同一套状态，没新增第二份真相**。
    - **库里已有的批量没动**：素材库项目浮窗侧栏的多选 + 批量改类型是 v812/v813 就有的，**那 310 张存量可以在项目浮窗里批量改**。
    - 测试 **704/704**：新增 `tests/upload-type-required-v922.test.mjs`（25 条，含**真渲整段 `renderCaseDropGrid`** 跑「进批量→全选未分类→设成头图→select+touched+红框消失+chip 变新类型」全链路、校验真跑、EN 文案、降级）。做过 3 次**变异检验**（故意改坏再跑）都被测试抓住。
    - ⚠️ **行为收紧（要用户真机确认）**：**B/D/M 端**（清单尺寸没补）与**超大设计画布**这类"注定未分类"的图，现在**必须选一个真实类型或走批量**，否则**传不了**。逃生口 = 批量「全选未分类」+ 选一个类型。若同事受不了，可考虑加一个显式的「其他（确认上传）」选项。
    - ⚠️ **未核实**：真机没点过（红框粗细、批量条位置、勾选框位置都只在测试里渲过 HTML，没在浏览器看过）；**拖完几十张立刻点上传会被拦**（异步检测还没回来时卡片必然红）—— 提示明确且能一键批量，但观感未验；同一尺寸成组的联动（`syncSameDimsChips`）**只作用于单张手选，批量不扩散**（有意为之，未与用户确认）；`syncChip` 每次都刷批量条，**100 张时没量过性能**。
  - **✅ v923（2026-10-14，已发测试站，部署 `badf8bb7`）—— 噪音黑名单补「价格 / 百分比」**。起因（实测）：v907 的黑名单挡住了「文字 / 阿拉伯文 / 数字3 / 绿色背景」，但**没覆盖价格与百分比** —— 真实库里查到 8 处漏网标签写进了 `ai_tags`：`2 KD` / `1 KD` / `50%` / `2KD` / `50%`…（违反 v907 定的「不要数字、不要价格」口径，**而且新上传的图还会继续中招**）。
    - **加的正则**（`functions/_ai.js` 的 `ELEMENT_TAG_NOISE_PATTERNS`）：
      ```js
      /^\d+(?:[.,]\d+)?\s*[%％]$/,                                             // 50% / 12.5 % / 50％
      /^\d+(?:[.,]\d+)?\s*(?:KWD|KD|SAR|AED|QAR|BHD|OMR|EGP|USD)\s*(?:off)?$/i, // 2 KD / 1 KD / 2KD / 3 KD off
      /^\d+(?:[.,]\d+)?\s*(?:元|折|折扣)$/,                                     // 1元 / 2折 / 3折扣
      /^\d+(?:[.,]\d+)?\s*[%％]?\s*off$/i                                      // 3 off / 50% off / 50%off
      ```
    - **为什么不误伤**：每条都以 `^\d+` 开头 ⇒ `PS5` / `一人食` / `两人份` 天然进不了门；单位走**穷举白名单**、且**故意不把裸 `D` 当单位** ⇒ `3D` / `4K` / `5G` / `2K` 一条都匹配不上。还有**源码级测试**锁住「这段正则里不许出现 `[A-Za-z]` 那种任意字母类」，以后谁想偷懒改成"数字+任意字母"会直接红。
    - `parseEffectSuggestions`（v918 的效果标签解析）走的是同一个 `isNoiseElementTag` ⇒ **同样受益**（测试断言全仓只有 2 处调用点，排除"第二套口径"）。
    - ⚠️ **实测口径提醒**：`parseElementSuggestions` 只做 `trim()`、**不折叠内部空格**，长度按含空格算且上限 5 字 ⇒ 所以 `2 KD`(4) 会走到黑名单；而 `3 KD off`(8)、`50% off`(7) 在元素路径上**本来就因超长被提前丢掉**（正则仍判它们为噪音，对效果路径与"以后调大上限"有用，但别据此以为正则在起作用）。
    - 测试 **712/712**：新增 `tests/price-noise-v923.test.mjs`（8 条：8 个正例 + 10 个反例 + 两条路径一致 + 混排 + 效果同口径 + 源码锁 + 版本号）。
    - ⚠️ **没做的**：① **库里那 8 处存量没清**（改的是正则不是数据，要清得重跑那几张，属写库动作）；② **提示词没动**（v907 已写了"没有实体就返回空数组"，本轮只补代码兜底）；③ 裸的货币/单位词（`KD` / `元` / `off`）**仍不算噪音**，要不要加进 `ELEMENT_TAG_NOISE_WORDS` 待用户定。
    - 🔴 **关键：worker 还没换新代码** —— 腾讯云上的 `/opt/case-tags/functions/_ai.js` 仍是旧版（v918 那份），所以**新上传的图暂时还会中招**。要让 cron 生效，得把新的 `functions/_ai.js` 传上去（控制台「文件管理」→ /root → `mv -f` 到 `/opt/case-tags/functions/`）。本机桌面 `.local/worker-bundle/` 已同步刷新为 v923。
  - **✅ v923 同日的数据清理（2026-10-14）—— 语言标记补全 + 未分类物料人工归类**（**只写数据、没改代码、没发版**）
    - **① 语言标记（`vf_asset_previews.language`）补全**：案例库 1941 张里，**528 张（27.2%）没有语言标记** —— 用户的判断是「这些是**上传时还没有语言自动识别这个功能**的时期留下的历史遗留」。三步补完：
      1. **文件名规则补 396 张**（脚本 `.local/backfill-language.mjs`，先 dry-run 打印样例确认无误判；规则 = 文件名里**独立**的 `en`/`ar` 片段或「英语/英文/阿语/阿拉伯语」字样，两种都命中的存疑不动）；
      2. **AI 看图判 127 张**（脚本 `.local/backfill-language-ai.mjs`，复用 `functions/_ai.js` 的 `analyzeLanguageWithGlm`，它的提示词会把"双语 banner/无文字"判成空 ⇒ 不硬猜）。结果很硬：`开机导出1→en / 2→ar / 3→en / 4→ar` **完美英阿交替**，`arabic static.png`、`2-kd-arabic.png` 也都独立判对。只有 1 张判不出（`组件单独-02.png`，纯图形无文字）；
      3. 再用文件名兜 2 张（`ApolgyEnglish09/010.mp4` —— 我第一版规则漏了 `English` 这个整词）。
      ⇒ **最终：en 1011 / ar 914 / 空 3 / none 13，覆盖率 72.8% → 99.8%**。剩 3 张（2 个 gif + 1 个纯图形组件）需人工在浮窗里改。
      - **意义**：EN/AR 配对（解决"同款英阿版重复占位"）的第一条证据就是**语言互补**；之前 27% 没标记 ⇒ 配对会大面积漏掉。**现在地基平了。**（顺带：`en 1011 / ar 914` 差 97 —— 应是"只有英文版没有阿语版"的正常情况，不是漏标。）
    - **② 未分类物料（案例库 98 张）人工审阅 + 写回**
      - 我做了一个**本地临时审阅页**（`outputs/untyped-review/`，不进 git；98 张预览已缓存到本地 `img/`）：按**尺寸分组**（42 组）、右侧大图、可**整组批量打标**或单张覆盖、`localStorage` 存进度、可导出 JSON。
      - 用户扫完 42 组并给出标注 ⇒ **写回 78 张**（`会场游戏模块 26 · 会场tab 14 · 会场楼层 11 · 横banner 11 · 头图 9 · 弹窗 5 · 开机海报 2`），**18 张按用户判断保持 `跳过`/`未分类`**（超大整页设计稿、手机截图、纯背景图 —— 它们本来就不是成品物料）。
      - **⭐ 根因结论（对照物料清单）**：**问题不在"匹配算法"，而在「清单只登记了标准尺寸，真实物料却有大量**导出变体**」**：
        | 用户定的类型 | 清单里登记的 | 实际还有的尺寸 |
        |---|---|---|
        | 开机海报 | `1000×2168` / `750×1626` | **`500×1048`（正好是 1000×2168 的一半）** |
        | 头图 | `750×520` / `1125×569` | `1000×672` / `1500×1163` / `2000×1279` / `2000×1454`（多倍） |
        | 会场tab | `336×88` / `180×88` | `140×128` / `109×89` / `108×89` / `40×42`（**图标版**，不是长条） |
        | 会场楼层 | `1029×210` 等 | `6250×834` / `6250×437`（**超宽版**）/ `1501×201` / `1501×152` |
        | 横banner | `1372×512` / `1396×424` … | `1200×630` / `1071×201`（其它平台尺寸） |
        | 会场游戏模块 | — | `1300×1375` / `1388×1083` / `1501×1339` |
        | 弹窗 | `1308×1882` / `750×1080` … | `672×565` |
      - **怎么办**：① **补清单**（把这 21 个尺寸加进对应类型）⇒ 同类尺寸以后自动分对；② **不再指望"精确尺寸"** —— v922 的「未分类红框 + 强制手选 + 一键全选未分类批量」正是接住**新出现的变体**的闸门；③ "跳过"那 14 张（超大设计稿/截图/背景）**不该有类型**，这个判断要固化。
      - **③ 物料清单补 19 个「导出变体尺寸」**（用户逐组确认后录入；写入前把原 `entries` 备份到 `.local/catalog-backup-*.json`）：
        | 类型 | 补进去的尺寸 | 落在哪个子类别 |
        |---|---|---|
        | 会场游戏模块 | `1300×1375` · `1388×1083` · `1501×1339` | **该类型原本 0 子类别，新建了一个「会场游戏模块」子类别** |
        | 会场tab | `140×128` · `109×89` · `108×89` · `40×42` | `Tab` |
        | 会场楼层 | `6250×834` · `6250×437` · `1501×201` · `1501×152` | `Floor Bar/楼层条` |
        | 横banner | `1200×630` · `1071×201` | `Home Page Horizontal Banner/首页横版`（用户口中的"**个人主页 banner**"） |
        | 头图 | `1000×672` · `1500×1163` · `2000×1279` · `2000×1454` | `Header image/头图` |
        | 弹窗 | `672×565` | `Popup Screen - Static/图文弹窗` |
        | 开机海报 | `500×1048` | `Splash Screen Banner/开屏` |
        - 录入口径：**加到该类型的第一个子类别**（类型 0 子类别时新建一个同名子类别）。识别只看"这个尺寸在不在该类型下"，所以挂哪个子类别不影响自动分类。
        - 顺带核对了 `1071×201` 那 3 张（`page banner.png` / `page banner 拷贝.png` / `page banner_2.png`）：`material_type` 已是 **横banner** ✓、`language` 已补成 en ✓。注意「个人主页banner」**不是清单里的一层**（清单是 类型 → 子类别 → 尺寸），它是「横banner」下的子类别「首页横版」，所以**物料上只写类型 `横banner`**。
  - **✅ v924（2026-10-14，已发测试站，部署 `0998c22d`）—— 内容指纹去掉 `updated_at`（修"改语言/改类型就触发整批重跑"）**
    - **起因（实测事故）**：识别脚本用「内容指纹」判断要不要重跑这一张，指纹 = `preview_path | preview_size_bytes | updated_at`。而 `updated_at` 被 `vf_touch_updated_at` 之类的触发器在**任何**行更新时刷新 ⇒ 当天给 525 张补 `language`、给 78 张补 `material_type` 之后，**这 ~600 张全被判定"内容变了"，腾讯云 cron 开始把它们整批重跑**（图根本没换，白烧 600 次模型调用）。
    - **改法**：指纹改成 **`preview_path | preview_size_bytes`**（不再含 `updated_at`）。
      - 🔴 **历史兼容是这一步的关键**（做错会把整库 1941 张全判成"变了"）：库里**已存**的是旧三段 key，所以唯一比对入口改成 `contentKeyUnchanged(storedKey, preview)` —— **只比前两段**（`storedKey.split('|').slice(0,2)` vs 新指纹），于是新旧等价、老行下次被写入时自动升级成两段。
      - **三份实现同步**（都是逐字复制出来的）：`scripts/recognize-case-tags.mjs`、`functions/api/case-preview-ai-tags.js`、`app.js` 的 `casePreviewAiContentKey()`。**所有比较点都收敛到该函数，没有遗留裸 `!==` 比较**（脚本 1 处 + 端点 3 处 + 前端 4 处）；端点的 `manual-add` 刻意保留 `base.content_key &&` 真值判断（"库里从没存过 key 就不作废"的老语义不变）。
    - **副作用（有意接受）**：**「同路径 + 同字节数但内容真换过」检测不到了**。判断依据：字节数完全相同基本只可能是原地覆盖的极小概率事件；漏判代价 = 某张图标签停在旧版（人工改标签或换路径就会刷新），而误判代价 = 整库/数百张白跑（本次事故就是）。真要彻底解决得上**内容哈希**（库里没有 md5/etag 列，需要加列 + 回填，超出本轮）。
    - 测试 **726/726**：新增 `tests/content-key-v924.test.mjs`（14 条，含回归「**只改 `updated_at` ⇒ 指纹不变**」、旧格式 key 判为没变、`planWorkItems` 层面不进计划、`--force-dynamic` 不被误判、**三份实现逐字一致 + 运行结果一致**、比较点收敛计数、端点 409/200 语义）；重写了 2 条写死旧语义的断言。
    - 🔴 **待办：worker 上的脚本还是旧的**（`/opt/case-tags/scripts/recognize-case-tags.mjs`）—— **换上去之前，那 ~600 张仍会继续被重跑**。重传后下一轮 cron 就会把它们判为"没变"从而停下。桌面包 `.local/worker-bundle/` 已同步刷新（本轮 `_ai.js`(v923) + 脚本(v924) **两个文件都变了**，要一起传）。
  - **✅ v925（2026-10-14，已发测试站，部署 `aa188b24`）—— 后台识别进度条显示「具体是哪几张」**。用户诉求原话：「为什么还在识别，这上面识别的到底是啥？属于哪个项目，可以显示出来吗？」（现状：`running` 态早就会显示项目名，但 `queued` 态只有一个数字。）
    - **改法**：`recognizeProgressState()`（纯函数）在算 `remaining` 的**同一趟循环里**多返回一个 `items` 清单 —— 口径与 remaining 完全一致（案例项目 + 有 `preview_path` + 后缀不在跳过名单 + 没有 `status='success'` 行），每项 `{previewId, filename, projectTitle}`，**按 `previewId` 升序 = 识别脚本 `order=id.asc` 的取数顺序**（即"下一轮最先跑的那几张"），纯函数里排序 + 截断到 50 条。
    - **文案**：`后台识别排队中 · 还剩 N 张 ·「项目名」文件名`；多张时列前 3 张 + `还有 N 张`；`running` 态顺手也带上了文件名（找不到就退回 v914 原文案）。点文案或「详情」展开清单：每行 `缩略图 + 文件名 + 项目名`，`max-height 216px` 内部滚动，>50 条写「仅显示前 50 条」；展开状态记 `localStorage['vf_recognize_progress_expanded_v1']`。
    - **没有新增端点、没有额外请求**（有断言锁该区不含 `fetch(`/`supabase.from(`）；缩略图只认缩略图路径（**故意不退回原图**，展开 50 行时下原图太重）。
    - 顺手加了**渲染签名**：20s 轮询若内容没变就不重画（否则展开清单的滚动位置每轮被顶回顶部、`<img>` 反复重建）。
    - 测试 **751/751**：新增 `tests/recognize-progress-detail-v925.test.mjs`（25 条），v914 既有 24 条断言**一条未坏**（只在它的 vm 上下文补了两个缩略图桩）。
    - ⚠️ **未核实**：真机端到端完全没做（文案换行、细条变高后的观感、展开手感、50 行滚动都只有"真渲 HTML"这一级证据）；清单与 `remaining` 一样受 v914 已知偏差影响（**按筛选加载、只看 status 不看 content_key**），所以"前 3 张"是**当前已加载数据里**的前 3 张；`order=id.asc` 对 uuid 近似随机序，人眼看会觉得没规律（但它就是脚本的真实取数顺序）。
  - **✅ v924 的效果已实测验证（2026-10-14）**：换上 v924 脚本后 6 分钟复查 —— **`没识别过 0 · 没成功 0 · 会跳过 1942 · 会重跑 0`**（那 428 张被误判的**全部停下**），并且那张新上传的 `终极（已压缩）.gif` **已被识别**（`success` / `model=glm-4v-flash-frames`，抽帧路径）。⇒ 队列彻底清空、白跑停止，**worker 与正本口径一致**。
  - **✅ v926（2026-10-14，已发测试站，部署 `ad7b04ee`）—— 详情浮窗标签改成「＋」内联新增（回车即添加）+ 动效标签也能手工加**。用户诉求原话：「这个项目展示里的编辑标签 UI 设计的不太行，而且我试了一下保存后刷新好像还是没有；UI 变成在最后一个标签后面加一个加号图标小按钮，点击后出现一个小文本框，输入后回车自动添加；GIF 类型的物料的动态标签也要在后面加一个小加号的按钮支持手动添加，添加后要确保会录入到后端和词表里」。
    - **① 去掉「编辑 / 完成」按钮**（`#case-preview-ai-edit-toggle` / `#case-preview-ai-edit-done` 与整个编辑态全删）：标签 chips 末尾改成 `#case-preview-ai-add-plus`，点开出现 120px 小输入框（自动聚焦）+ `✓`；`wireCasePreviewAiInlineAddInput()` / `casePreviewAiInlineAddKeydown()` / `submitCasePreviewAiInlineAdd()`（全仓**唯一**一处 `action: 'manual-add'`）。加成功保持输入框开着、光标回位、草稿存在 `casePreviewAiInlineAddDraft`；Esc / 空框失焦才收起，且 `stopPropagation()`（Esc 只收输入框、不冒泡去关整个浮窗）。
    - **⚠️ 根因（重要、与最初判断不同）**：**全库 `vf_preview_ai_tags` 里 `manual_tags` 非空的行 = 0 行**（2026-10-14 查库实测，`excluded_tags` 也是 0 行）—— 说明**人工加标签从来没成功过，不是"刷新后丢"**。子代理复核发现旧代码**本来就有回车处理**，但它要求"先点进编辑态、且输入框必须是 `document.activeElement`" ⇒ 点完「编辑」不点进输入框直接按回车就什么都不发生。**根因到此仍未 100% 钉死**（还怀疑过 RLS / 约束挡住写入）。新实现让回车不再依赖编辑态与焦点。**⇒ 用户实测加一个词之后要再去查一次库：`manual_tags` 若终于有行，说明是前端交互问题（已修）；若仍 0 行，就是写库链路（RLS/约束/代理）的问题，得换方向查。**
    - **② 修掉一个危险逻辑（顺手）**：端点 `manual-add`（`functions/api/case-preview-ai-tags.js`）原来会在"内容变了"时**把 `ai_tags`/`effect_tags`/`manual_tags`/`excluded_tags` 全清空 + `status='idle'`** —— 这是"人工加的标签会消失"的另一个可能来源。现在只加词/去重 + 更新 `content_key`，**绝不清空别人的标签**。
    - **③ 动效标签也能手工加（新列 `manual_effect_tags`，独立一层）**：AI 层（`effect_tags`）与人工层分开存，**AI 重跑不再覆盖人工加的**。新增 `sql/031_manual_effect_tags.sql`（**⚠️ 只写好、尚未执行**，必须在 `sql/025`、`026`、`028` 之后跑）：加列 + `create or replace vf_sync_tag_vocabulary()`（收全 union 里加 `unnest(manual_effect_tags)` 归 `kind='effect'`）+ 重建 `vf_tag_sync_preview_ai_tags_upd` 触发器（`when` 加 `old/new.manual_effect_tags`）+ 自检。
      - 端点新增 `manual-effect-add` / `manual-effect-remove`；`save` 的 `effect_tags` 去重扩成刨掉 `excluded_tags + manual_tags + manual_effect_tags`；**列缺失时 `manual-effect-add` 直接回 503 并明说"请执行 sql/031"**（不静默成功）。
      - `scripts/recognize-case-tags.mjs` 同样刨 `manual_effect_tags`，**只有真读到该列才带上**（缺列自动退回）；`upsertTagRow` 摘列重试。
      - `app.js`：`PREVIEW_AI_TAGS_SELECT` 加 `manual_effect_tags` + 四档降级（`NO_MANUAL_EFFECT` → `NO_EFFECT` → `LEGACY`）；动效行分两层渲染 —— **人工层**（绿色 chip 带 `×`，`data-preview-effect-manual-remove`）与 **AI 层**（紫色，无 ×）；动态物料即使两层都空也**照出这一行**（否则没有 `＋` 可点）；搜索聚合 `casePreviewAiEffectTags` 走人工 + AI 两层并集。
    - 版本号 → `20261014-tag-inline-add-v926`（`TOOL_UI_VERSION` + `index.html` 5 处 `?v=` + 13 个测试文件里的旧版本断言）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **784/784**：新增 `tests/tag-inline-add-v926.test.mjs`（11 条）+ `tests/manual-effect-tags-v926.test.mjs`（22 条）。
    - **🔴 用户要做两件事才算完整生效**：① **在 Supabase SQL Editor 跑 `sql/031_manual_effect_tags.sql`**（否则人工动效标签点了也是 503）；② **把新的 `scripts/recognize-case-tags.mjs` 传到腾讯云**（`/opt/case-tags/scripts/`，桌面包 `~/Desktop/AI素材库-服务器上传/` 已同步刷新；worker 现在是 v924 版，缺这个保护 —— 不传的后果只是"AI 重跑会覆盖人工加的效果标签"，不急）。
    - ⚠️ **未核实**：真机端到端**完全没做**（真站、真库、真识别都没跑）；`sql/031` 一行未执行；"回车不再依赖焦点"只有真渲 HTML / 打桩 fetch 这一级证据；**`sql/029` 的 `vf_rename_tag` / `vf_delete_tag` 仍没覆盖 `manual_effect_tags`**（在词表页改名/删除一个动效词，不会同步到物料上的人工动效标签）—— 已知缺口，建议下一支迁移补上。
  - **✅ v927（2026-10-14，已发测试站，部署 `42f9b651`）—— 标签面板两处"废话 UI"去掉**。用户诉求原话（附两张截图）：「这个 ai 直接应用的小字，还有一键识别的按钮都去掉吧」。
    - **① 项目弹窗头部的「一键识别」按钮去掉**（`<header class="case-project-head">` 里那一整块）：连带删掉它的进度条 `<span id="case-ai-run-progress">`、`.case-ai-scan-btn` 三条 CSS、以及按钮的 `onclick` 接线（`startCasePreviewAiRun(source, materials)` + 报错文案「一键识别未开始」）和弹窗里两处 `updateCasePreviewAiRunUi(source.id)` 调用。**理由**：浏览器里那个按钮是 2 并发 + 关页面就停的老通道，批量识别现在跑在腾讯云 cron worker 上，留着只会误导。
    - **⚠️ 底层 run 机制故意保留未删**：`startCasePreviewAiRun` / `updateCasePreviewAiRunUi` / `#case-ai-cancel-run` / `#case-ai-retry-failed` 都还在（`app.js` 里那段 v927 注释写明了）。现在它们从 UI 上**够不到**（`updateCasePreviewAiRunUi` 找不到按钮会直接 return），但将来要挂回按钮就能用；不删的代价就是几个"没人调用"的函数，**下一个人别以为是漏删**。
    - **② 标签面板底部那行小字改成"只在真要注意时才出"**：原来只要 `status='success'` 且有 AI 标签就固定显示「AI直接应用」——等于每张有标签的图都这么写、纯噪音。现在新增 `statusAlert`，**只有以下四种情况才渲染这一行**：图片变了（`stale`，文案「图片已变化，标签待重新识别」）、`failed`（「识别失败」，红字 `is-error`）、`running`（「识别中…」）、`expired`（「结果已过期」）；其余情况（含「已识别，未发现标签」「含人工标签，AI未发现标签」）底部**不再出字**。`casePreviewAiStatusText()` 本身与"标签区为空时的那句占位"（`case-preview-ai-empty`）**没动**。
    - 版本号 → `20261014-tag-ui-cleanup-v927`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、16 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **791/791**：新增 `tests/case-tag-ui-cleanup-v927.test.mjs`（7 条：头部切片里断言没有按钮/进度条/「一键识别」文案但保留了「⋯」和关闭；`.case-ai-scan-btn` / `recognizeButton` / 旧报错文案全库不存在；run 机制按约定仍在；**真渲面板 HTML** 验「AI直接应用」不再出现、`stale`/`failed`/`running` 三种提醒仍在、`row` 为空时不出状态行；版本号六处同步）。**两条旧断言按新语义反转**：`case-preview-ai-experiment-v870.test.mjs` 的 `assert.match(...,/id="case-ai-recognize-all"/)` 与 `case-ai-write-scope-v908.test.mjs` 的按钮标记断言都改成 `doesNotMatch`，v908 那条的门禁说明也从"一键识别的入口"改成"批量识别的门禁仍在（入口只剩 `startCasePreviewAiRun`）"。
    - ⚠️ **未核实**：真机端到端**没做**（按钮是不是真的不见了、底部小字是不是真的没了，只有"真渲 HTML + 源码切片"这一级证据）；`updateCasePreviewAiRunUi` 等保留函数**没有任何测试覆盖它们"被调用"**（只有"存在"的断言）。
  - **✅ v928（2026-10-14，已发测试站，部署 `61a584a8`）—— 标签上的「×」不再常驻，鼠标移上去才出来**。用户诉求原话：「我点了加号之后，标签上永远都有叉号了」（附截图：四个标签右边都挂着 ×）。
    - **根因是我 v926 自己引入的**：v926 删掉「编辑 / 完成」两个按钮时，顺手把 × 的显隐规则也拆了 —— v925 的 CSS 是 `.case-preview-ai-tag.is-editing button { display: inline-flex; }`（**只有编辑态才显示 ×**），v926 直接把 `display: inline-flex` 挪进基础规则里，并在注释里写「× 就是删除入口，必须一直看得见」。用户不要这个常驻感。
    - **改法（纯 CSS，markup 一行没动）**：`.case-preview-ai-tag button` / `.case-preview-ai-effect-tag button` 加 `opacity: 0` + `transition: opacity .12s`，再用 `:hover button` / `:focus-within button` 露出来；**用 opacity 而不是 `display:none`**，位置照旧占着 ⇒ 露出来时整行不跳。另外补一条 `@media (hover: none) { ... opacity: 1 }`：触屏没有 hover，不这样写 iPad 上就删不掉标签。
    - **删除能力没变**：人工标签的 `data-preview-manual-remove`、AI 标签的 `data-preview-ai-exclude`、人工动效标签的 `data-preview-effect-manual-remove`、末尾的「＋」都原样在（测试里用**真渲面板 HTML** 断言过）；溢出时那个浮窗（`.case-preview-ai-pop`）里的标签照旧不显示 ×。
    - 版本号 → `20261014-chip-x-hover-v928`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、17 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **796/796**：新增 `tests/chip-x-hover-v928.test.mjs`（5 条：元素标签与动效标签的 × 默认 `opacity:0` 且各有 hover/focus-within 露出规则、不许改成 `display:none`、触屏媒体查询里一直亮、真渲 HTML 里四个删除/新增入口都还在且 `is-editing` 没回来、版本号六处同步）。
    - ⚠️ **未核实**：真机上"鼠标移上去 × 才出现"的手感没看过（只有 CSS 源码断言 + 真渲 HTML 这一级证据）；`opacity: 0` 的按钮**仍然可点**（点它 = 排除/删除那个标签），只是看不见 —— 理论上"鼠标扫过去刚好点到"存在误触可能，如果用户反馈误删，改成 `pointer-events` 一并开关即可。
    - **顺带实测（2026-10-14 18:0x 查库）**：`vf_preview_ai_tags` 里 `manual_tags` 非空的行**仍然是 0 行**（共 1942 行，最近一次 `updated_at` 是 09:10Z，都是 cron worker 的识别写）。⇒ **v926 那个「人工加标签从来没落库」的根因仍未被证伪**，用户也还没确认"打了字按回车"。这一条继续挂在待办里。

  - **✅ v929（2026-10-14，已发测试站，部署 `261da36c`）—— 标签的「×」收紧到只在「加号态」出现**。用户诉求原话：「现在鼠标 hover 状态会出现叉，这个叉是常驻的吗？这样太容易误删了，**要点加号的情况下才出现叉**」（v928 刚改成 hover 才出，用户当天就否掉了）。
    - **改法**：CSS 去掉 `:hover` / `:focus-within` 两条露出规则，也**去掉 v928 那条 `@media (hover: none) { opacity: 1 }`**（它会让 iPad 上 × 又常驻）；改成 `opacity: 1` 只挂在**加号态**上：`.case-preview-ai-chips.is-adding .case-preview-ai-tag button` 与 `.case-preview-ai-effect.is-adding .case-preview-ai-effect-tag button`。基础规则仍是 `opacity: 0`（位置占着，亮起来不跳）。
    - **加号态怎么来的**：复用 v926 已有的 `panel.dataset.adding`（`＋` 点击时设 `= config.kind`、`closeCasePreviewAiInlineAdd` 收起时 `delete`）—— 渲染时读它生成 class：`const addingKind = String((panel.dataset && panel.dataset.adding) || '')`，元素行加 `is-adding` 当 `addingKind === 'element'`、动效行当 `addingKind === 'effect'`，**两行各管各的**（点元素行的 ＋ 不会把动效行的 × 也点亮）。
    - **删除入口的用法变了（要记住）**：想删人工标签 / 排除 AI 标签，**先点一下那个 ＋**（不用打字），× 就都出来了；按 Esc 或点空白处收起小输入框，× 跟着灭。触屏同理（点 ＋ 进加号态），所以不需要 hover 兜底。
    - 版本号 → `20261014-chip-x-add-mode-v929`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、17 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **798/798**：`tests/chip-x-hover-v928.test.mjs`（**文件名保留，内容按 v929 口径重写**：5 条 → 7 条）改成断言「× 默认 opacity:0」「加号态才 opacity:1」「**不许**再有 hover / focus-within / `@media (hover: none)` 触发」「`dataset.adding` 由 ＋ 设、收起时删、渲染真的读它」「两行 `is-adding` 互不串台」「真渲 HTML 里三个删除入口与 ＋ 的 markup 都还在、`is-editing` 没回来」「版本号六处同步」。另外把 `tests/effect-tags-v918.test.mjs` 里那条写死 `<div class="case-preview-ai-effect">` 的断言改成带 `is-adding` 的新形状（**"没有值又不是动态物料就整行不出现"这个判断本身没变**）。
    - ⚠️ **未核实**：真机上"点 ＋ 才出 ×"的手感没看过（只有 CSS/源码断言 + 真渲 HTML 这一级证据）；`opacity: 0` 的按钮**仍然可点**（hover 已经不亮它了，但鼠标恰好落在那个 14px 上仍是"排除/删除"）—— 如果还有误删反馈，下一步是给隐藏态也加 `pointer-events: none`。

  - **✅ v930 / v931 / v932（2026-10-14，已发测试站，部署 `3d14c98c` → `419ce052` → `c2c98b2b`）—— 「点 ✓ 一点反应没有」的完整收尾：先补反馈，再找到真根因，最后把那几秒砍短**。用户口径三连：「我在文本框里输入完以后点对号一点反应没有」→「延时有点严重，点了没反应，我连续点了好几次，过了一会儿才添加上」。
    - **🔴 v931 才是真根因（真机复现，必读）**：点 ✓ / 点 × 的**第一件事是输入框 blur**；而空框 blur ⇒ `closeCasePreviewAiInlineAdd` ⇒ **整个面板重画** ⇒ 你正要点的那颗按钮**当场被销毁**，click 事件根本到不了它。⇒ 表现就是"点了完全没反应"（输入框空了还会顺手消失）。**我在测试站真机上复现时连标签上的 × 也点不动**（同一原因）。
      **修法**：`wireCasePreviewAiPanelPointerGuard(panel)` —— 面板上挂一个 `mousedown` 守卫，按下 `.case-preview-ai-add-confirm` / `.case-preview-ai-add-plus` / 各种 chip 上的 `button` 时 `preventDefault()`（＝不让焦点从输入框移走，就不会有那次 blur）。面板元素在重画时是复用的（只换 `innerHTML`），所以用 `__casePreviewAiPointerGuard` 只挂一次。
    - **v930（先补的"看得见的反应"，仍然全部保留）**：① 空框点 ✓ 不再"悄悄收起"，改成**留住输入框 + 弹「先输入标签，再点 ✓ 或按回车」**；② 加成功弹「已添加标签「X」」（动效行是「已添加动效标签」）+ 把**那一行滚回最左**（人工标签排在行首，标签行是横向滚动的 `overflow-x:auto`，行被滚到右边时新词出现在看不见的左边）；③ Enter 分支加 `event.isComposing || event.keyCode === 229` 守卫（**输入法拼词中的回车 = 上屏，不算提交**）；④ 成功分支里的"滚 + toast"整段包在 try/catch 里 —— 写库已经成功了，收尾出问题也不能反过来报成"添加失败"。
    - **v932（把等待砍短 + 让等待看得见）**：
      - 端点 `functions/api/case-preview-ai-tags.js`：**两个读并行**（`Promise.all([previewFor, currentFor])`，以前串行两个往返）；**`base` 里不再默认带 `manual_effect_tags`** —— sql/031 没执行时带这一列会被 PostgREST 拒（42703）⇒ `saveRow` 摘列重试 ⇒ **每一次写都白跑一个失败的往返**（这正是"点一下要等好几秒"的一大块）。改成只读到 `currentManualEffectTags` 变量、只有 `manual-effect-add/remove` 才显式写它；**upsert 不带这一列 = 库里原样保留**，正好就是「识别流程绝不覆盖人工层」而且更硬。
      - 前端：在途期间 **`✓` 变 `…` + `.is-busy`**（灰一点、cursor:progress）、输入框锁住，**同一行的重复点击直接忽略**（用户连点好几次 = 好几次重复写库）；失败时 ✓ 恢复原样。
    - **⚖️ 绿色 = 人工标签（这不是 bug，是 v926 定的配色）**：AI 标签是**米色/橙边**（`#fff7ed` + `#fdba74`），人工加的标签是**绿色**（`#f0fdf4` + `#86efac`，`is-manual`），鼠标移上去有 `title="人工标签"`。用户问过「为什么我添加足球场标签，颜色会是绿色的」⇒ 已说明；**要统一成一种颜色的话说一声**（改一行 CSS）。
    - ⏱ **延迟的真实基线（实测 2026-10-14）**：`/api/health` 这个**不需要登录**的端点就要 **1.7–2.9 秒**（Pages Function 冷启动 + 上游调用）。所以"点一下要等几秒"有相当一部分是平台基线，v932 只能砍掉其中两个往返。**再想更快就得做乐观更新**（点完立刻把 chip 画上去、失败再回滚）——**本轮没做**，等用户要。
    - 版本号 → `20261014-tag-add-feedback-v930` / `20261014-inline-add-focus-guard-v931` / `20261014-faster-tag-write-v932`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、当时全部测试文件里的旧版本断言一起换）。`npm run build:pages` 每轮都跑、`diff -q` 三处一致。
    - 测试 **809/809**：`tests/tag-add-feedback-v930.test.mjs`（11 条：空框不收起 + 成功 toast/滚行/动效文案/英文 + 失败恢复 + 拼词回车 + mousedown 守卫 + 在途不重复发 + 端点少跑往返 + 版本号）；`tests/tag-inline-add-v926.test.mjs` 与 `tests/manual-effect-tags-v926.test.mjs` 里按新语义**反转了 5 条断言**（空框不再收起；save 的载荷**不带** `manual_effect_tags`；两次可选列都缺时降级只重试一次）。
    - **真机证据（2026-10-14，测试站 + 查库）**：✓ 点下去**写库一直是成功的** —— 我自己加的 `测试勿留 / 测试勿留2 / 测试勿留3`（11:29–11:34Z）三条都落库、且面板**实时刷新**出现；用户自己加的 `餐具`（11:18Z）也落库。**这些都发生在 v931 之前**，说明"写不进去"从来不是问题，问题一直是"点了没反应"（v931 修的那条）+ 等太久（v932 砍的）+ 没有任何提示（v930 补的）。**我加的 3 个测试标签已用 REST 清掉**（`manual_tags=[]`），库里现在只剩用户自己那条 `餐具`。
    - ⚠️ **未核实**：v932 的提速幅度**没有在真机上量过**（只量到 `/api/health` 那条基线）；真机上"点 ＋ → 输入 → 点 ✓"在 **v932** 下**没重跑**（用户当时正占着测试站那个标签页，我在 v931 上做过 full flow、之后就停了）；`5b52aa28` 那行 `updated_at=11:58:14Z / updated_by` 是用户 id，**推测**是用户自己点了 × 把 `足球场` 删掉了（⇒ × 可用的旁证，但没亲眼看到那一下）。

  - **✅ v933（2026-10-14，已发测试站，部署 `a43cfb5d`）—— 标签后面的那块空位去掉**。用户诉求原话：「为什么常态标签后面会空出一小块空间？」（附截图，每个标签右边都空着一块）。
    - **根因还是我自己**：v929 让 × 只在加号态出现时，用的是 `opacity: 0` —— 位置照旧占着（当时理由是"亮起来时整行不跳"），于是**每个标签右边常挂 ~18px 空白**（14px 按钮 + 4px gap）。用户一眼就看出来了。
    - **改法（纯 CSS）**：`.case-preview-ai-tag button` / `.case-preview-ai-effect-tag button` 基础规则改成 **`display: none`**，加号态才回到 `display: inline-flex`（`.case-preview-ai-chips.is-adding ...` / `.case-preview-ai-effect.is-adding ...`）。`display:none` 的元素**不是 flex item ⇒ 连 gap 都不占**，空位彻底没了。位移只发生在"用户自己按下 ＋"的瞬间（那一刻行本来就要变：小输入框会出现），不碍事。
    - ⚠️ **踩过的坑**：`app.js` 顶部那段 CSS 是**模板字符串**，我在注释里写了反引号（`` `display:none` ``）**直接把 JS 语法打断**（`node --check` 当场报 SyntaxError）——在这份文件里写 CSS 注释**千万别用反引号**，用「」或直接写英文。
    - 版本号 → `20261014-chip-x-no-gap-v933`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、20 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **809/809**：`tests/chip-x-hover-v928.test.mjs` 里 3 条 CSS 断言按新口径反转/加强（**必须**是 `display: none`；加号态**必须**是 `display: inline-flex`；并且**不许**再退回 `opacity: 0` 或常显）。
    - ⚠️ **未核实**：真机上看不到那块空位了没（只有 CSS 断言这一级证据；用户看到的那张截图是 v932 及更早的行为）。

  - **⏱ 2026-10-14 顺带实测：站点忽快忽慢不是站点的问题**。用户报「刷新了一下好像加载不出网页了」，当场三条地址全查：正式站/测试站/本次部署**都返回 200**、`/api/health` 六项 true（测试站 `lk888Ready` 是 false，与加载无关，未查）、四个表读都正常；但 `app.js`（1.2MB，带压缩 ~265–315KB）**实测只有 37–150 KB/s**（正常应 1–10 MB/s），`styles.css` 20 秒没下完，同一个文件重试一次就从 37 KB/s 变 150 KB/s ⇒ **波动的是本机到 Cloudflare 的线路/代理**。下次再遇到"打不开"，先量速度：`curl -sS --compressed -o /dev/null -w "%{speed_download} B/s %{time_total}s\n" https://gccdesign.app/app.js`。

  - **✅ v934（2026-10-14，已发测试站，部署 `7de1965b`）—— 上传时「业务策略」也必选**。用户诉求原话：「这个业务策略也应该是上传时必选的」（附上传弹窗截图，当时只有 活动主题 那行标着红框 + 底部「请先选择活动主题，再上传。」）。
    - **改法**：`validateCaseProjectUpload()` 里缺项数组多加一项 `strategy`（`caseTagSelFirst(chipSel, 'strategy')`），提示文案的 key→label 映射加 `'strategy' → 业务策略 / Strategy`。其余全部复用 v809/v914 已有的机制：**标红标签面板里那一行**（`data-case-tag-row="strategy"` 加 `is-missing`）、面板没开着就自动弹出来、**拦下上传并点名**。
    - **现在的必填四项 = 平台 / 国家 / 活动主题 / 业务策略**。四项全缺时文案是「请先选择平台、国家、活动主题和业务策略，再上传。」；只缺一项就只点名那一项（如只缺业务策略 ⇒ 「请先选择业务策略，再上传。」）。
    - **范围与其它三项完全一致**：只拦**上传新案例项目**这一条路（`validateCaseProjectUpload` 只有一处调用）；**编辑已有项目**不受这条约束；图库 / 模板库的上传也不走这个函数（它们没有这套案例标签）。
    - 版本号 → `20261014-strategy-required-v934`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、20 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **810/810**：`tests/upload-autotag-v914.test.mjs` 里三条必填用例改成四项口径（含新增**只缺业务策略**那条：文案要点名「业务策略」、标红只标这一行），`tests/case-upload-required-tags-v809.test.mjs` 加两条源码断言（`strategy` 必填 + 文案映射），`tests/upload-type-required-v922.test.mjs` 的 `tagsOk` 夹具补上 `strategy`、顺序断言文案改成四项。
    - ⚠️ **未核实**：真机上传一遍看标红与文案（只有源码/真跑校验函数这一级证据）。

  - **✅ v935（2026-10-14，已发测试站，部署 `0234caef`）—— 上传 / 删除项目后"就地生效"，不再整库重拉**。用户诉求原话：「我发现不管是删除项目还是上传项目，结束后都会延迟大概 8、9 秒后才会对整个页面进行刷新，没法及时生效吗，并且不要刷新的冷更新吗」。
    - **那 8–9 秒是 `reloadLibraryData()`**：它清空全部本地状态后重新 `loadLibraryData()` —— 重拉**全部 source + 全部 preview + 整张 `vf_preview_ai_tags`（1900+ 行）**、所有签名 URL 重签、整页重画。而一次上传/删除其实**只影响一个项目**。两条路（`deleteLibrarySource` 尾部、上传成功那一刻）原来都是这一句。
    - **改法**：新增 `applyLocalLibraryChange(sourceId, removed)`：
      - **删除** → 纯本地摘掉（`librarySources` 去掉那一行、`libraryPreviews` 去掉它的物料、顺手清 `previewAiTagsByPreviewId` 里那些物料），**连查都不用查**；删完弹一条 `已删除项目「X」`。
      - **上传** → 只重拉**这一个项目**：`fetchLibrarySourceWithPreviews(sourceId)`（一条 `eq('id')` 的 source 查询 + 按页拉该 source 的物料，**沿用整库加载那套 select 字段与 `caseAwareQuery`/`previewAwareQuery` 降级路径**，免得两边形状不一致），合进本地后签名它自己的 URL、重排、重画。
      - 两条路都以 `refreshLibraryLoadedUi()`（= 重画下拉/计数/网格）收尾 —— **只重画，不重拉**。
      - **兜底**：返回值 `false`（比如查不到那一行）时调用方退回 `reloadLibraryData()`，不许静默什么都不做。
    - **顺手抽了一份排序**：`sortLibraryPreviewsBySourceOrder(rows)`（项目顺序 → `sort_order` → `created_at` 倒序），整库加载与局部更新**共用同一份**，不再各写一遍。
    - **没改的地方（要知道）**：图库 / 模板库的上传（`uploadGalleryAssets` / `uploadTemplateAsset` 之后）**仍然是整库重拉** —— 它们的入库路径与案例项目不同，这轮没动（用户反馈的是案例项目的上传和删除；删除是共用的，所以图库/模板的**删除**也已经是热更新了）。
    - 版本号 → `20261014-library-hot-update-v935`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、20 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **815/815**：新增 `tests/library-hot-update-v935.test.mjs`（5 条：删除走上局部摘除且不再无条件整库重拉；上传成功走局部合入 + 兜底；局部更新里**不许**出现 `loadLibrarySources`/`loadLibraryPreviews`/`loadAllPreviewAiTags`/`reloadLibraryData`；`fetchLibrarySourceWithPreviews` 只按 id / source_file_id 单查；**真跑排序纯函数**验序 + 不许就地改传入数组；版本号六处）。
    - ⚠️ **未核实**：真机上"传完立刻出现 / 删完立刻消失"的体感没量过（只有源码与纯函数这一级证据）；**没有量过新路径的实际耗时**（预期 < 1 秒，但没测）；局部更新后与"整库重拉"的**结果一致性**只在形状层面保证（同一套 select），边界情况（例如筛选项变化、书签分组）未逐一验证 —— 一旦发现哪里不对，兜底路径保证还能退回整库重拉。

  - **✅ v936（2026-10-14，已发测试站，部署 `4c069676`）—— 上传成功后新卡片高亮 6 秒；图库 / 模板库上传也改成就地合入**。用户要求原话：「上传成功后，我希望上传的物料封面边缘可以高亮显示几秒来提醒上传者」；同一轮的「好，你改吧」＝同意把 v935 留的那个口子（图库/模板上传仍是整库重拉）一起改掉。
    - **① 高亮**：新增 `highlightFreshLibraryCards(sourceIds, previewIds, durationMs)` —— 在 `refreshLibraryLoadedUi()` **之后**跑（class 要加在刚画出来的卡上），按 `data-case-project`（案例卡）或 `data-preview-id`（图库/模板/字体/书签卡）认卡，加 `is-just-uploaded` 这个 class，**6 秒后自己摘掉**。样式注入在 `app.js` 顶部的样式块里：`outline: 3px solid #f97316; outline-offset: 2px;` + `@keyframes library-fresh-pulse`（呼吸感）。用 **outline + box-shadow**（不依赖卡片自身有没有 `position`、也不用改各套卡片模板）。另外只在"新卡片不在视口里"时才 `scrollIntoView`，别平白把用户的页面顶走。
      - ⚠️ **类名踩过一次坑**：一开始叫 `is-fresh-upload`，把 `tests/ai-vocab-first-v892.test.mjs` 里那条守卫「app.js 里不许再出现 `is-fresh`（v894 之前的搜索新词层已删）」踩红了 —— **类名改成 `is-just-uploaded`**（keyframes 名 `library-fresh-pulse` 不含 `is-fresh`，安全）。这条守卫留在 v935 那个测试文件里也断言了一遍。
    - **② 图库 / 模板上传改热更新**：`uploadGalleryAssets()` 现在 `return insertedSourceIds`、`uploadTemplateAsset()` `return [sourceId]`（原来都不返回，调用方拿不到新 id）；两个分支改成 `applyLocalLibraryChange(ids)` + 失败才 `reloadLibraryData()` 兜底。`fetchLibrarySourceWithPreviews()` 与 `applyLocalLibraryChange()` 都**改成收数组**（内部用 `chunkArray(..., SUPABASE_IN_BATCH_SIZE)` 分批 `in('id', …)` / `in('source_file_id', …)`），所以图库一次传 N 张也只走一条批量查询。
    - 版本号 → `20261014-upload-highlight-v936`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、21 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **816/816**：`tests/library-hot-update-v935.test.mjs` 里局部更新的断言改成多项目版本 + 新增 1 条「高亮只加/去一个 class、认两个属性、6 秒后自摘、样式在 app.js 里、且不许再出现 `is-fresh`」。
    - ⚠️ **未核实**：真机上**没看过那个高亮长什么样**（只有源码 + class 名这一级证据）；高亮时长 6 秒是拍的默认值（没问用户要多长）；图库一次传多张时的批量查询**没有真机跑过**。

  - **✅ v937（2026-10-14，已发测试站，部署 `0f950a1d`）—— 项目浮窗进「编辑信息」时只留编辑表单**。用户诉求原话：「项目展示界面的编辑信息，下面红框里的东西都不要显示出来」（截图上下各框了一块：上面是项目标题/日期/项目链接/源文件联系人，下面是预览舞台 + 素材列表 + 底栏）。
    - **改法**：`enterCaseHeadInlineEdit()` 进编辑态时给 `.case-project-modal` 挂 `is-head-editing`，CSS 一条规则收掉三块 —— `.case-project-titlewrap`（标题/日期/链接/所有者/固定标签）、`.case-project-body`（舞台 + 素材网格）、`.case-project-foot`（AI 标签行 + 下载/联系按钮）；「取消」与「保存成功」两条退出路径都 `editingChrome(false)` 恢复。
    - **为什么只切 class 不删 DOM**：舞台里有视频、素材网格挂着自动播放的 IntersectionObserver —— 只改 `display` ⇒ 退出编辑立刻原样回来，也不会打断观察者/播放状态。另外**左侧「返回」和右上「⋯ / ×」保留**（它们是浮窗自身的导航，不属于被框掉的信息块）。
    - **顺带记一句**：拿掉 `.case-project-titlewrap` 之后，原来那句"隐藏固定标签行"（`fixedTags.style.display='none'`）在编辑态下**已经自然生效**（它就在 titlewrap 里）；那条代码**保留没删**（退出时的恢复逻辑也还在），别以为是漏删。
    - 版本号 → `20261014-edit-mode-hide-v937`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、21 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **817/817**：`tests/case-inline-edit-v871.test.mjs` 新增 1 条（切 class、进来就收、取消/保存都恢复、三块只切 `display`、编辑表单仍 `insertBefore(head.nextSibling)` 且带 `is-active`）。
    - ⚠️ **发布过程记一笔**：`wrangler pages deploy` **连续两次 `fetch failed`**（网络），第三次成功 —— §8.3 那条"偶发失败先重跑"再次应验。
    - ⚠️ **未核实**：真机上编辑态的观感没看过（只有源码断言这一级证据）。

  - **✅ v938（2026-10-15，已发测试站，部署 `898f43d6`）—— 乐观 UX：界面上先反应，后端动作全挪到看不见的地方**。用户口径（原话）：「可以删除后在当前这个网页上的预览图即刻消失，然后把在后端和刷新的这些效果不好的东西放在用户看不到的地方，上传也是先在当前的电脑里显示，入库和刷新也放在看不到的地方。这是用户体验方面的问题」。
    - **诊断（先在大版本里核实的）**：用户报"还是延迟、还是会刷新"，我用他浏览器那个标签页验过 —— **他跑的确实是最新版**（进编辑态看到 v937 的效果 ✓，看完点取消+关闭退出，没动数据）。所以剩下的是两件真事：
      ① **删除的 8–9 秒来自"先递归清云存储、清完才删库行"**：清目录是 `list → 删 100 → 再 list → 再删…` 的循环，111 张物料的项目要 5~6 次存储往返；而这条线路上**存储接口特别慢**（我这边量它 4 次全 30 秒超时）。那几秒里项目还杵在屏幕上。
      ② **"还是会刷新"= 网格整块重画**（`grid.innerHTML = …`，300 张卡一起重建），v935 只去掉了"整库重拉数据"，没去掉重画。
    - **删除改法**：整段顺序反过来 —— **先本地摘掉 + 重画（毫秒级）+ 弹「已删除项目「X」」**，然后 `void (async function cleanupDeletedSourceInBackground(){...})()` 后台里**先删库行、再清云存储**。库行删失败 → 弹窗说清"刷新后会回来"并 `reloadLibraryData()` 把界面找回来；**清存储失败只 toast 一句**（云上留点孤儿文件，不影响使用）。
      ⚠️ **这是一次有意反转**：原来 `case-delete-folder-cleanup.test.mjs` 明确要求"清空失败必须中止、不继续删库"（怕留孤儿文件）。现在按用户口径换成"界面优先"⇒ 那条断言已按新口径改写，取舍是**允许云上留孤儿文件**（只花存储钱）。
    - **上传改法（本地先显示）**：新增 `libraryPendingUploads` 机制 —— 校验一过、还没开始传文件，就先在素材库**最前面插一张占位卡**（封面直接 `URL.createObjectURL(本机 File)`，**零网络**；案例墙按列排时包一层 `.library-column`；角标「上传中…」带转圈）。后台照常上传/生成缩略图/入库；成功后 `applyLocalLibraryChange(sourceId, false, {skipGrid:true})` **只合入状态 + 刷分类数字、不重画网格**，再 `finishLibraryPendingUpload()` 撤掉角标 + 给 6 秒高亮（那张卡**原地转正**）。失败/取消 → `dropLibraryPendingUploads()` 摘卡 + 释放 blob URL。任何一次自然重画时，真卡片从 state 画出来、占位条目自动退场（`renderLibraryPendingUploadCards()` 挂在 `renderLibraryGrid` 末尾）。
      占位机制整段包在 try/catch 里：**它出问题绝不能挡住上传**。
    - 版本号 → `20261015-optimistic-ux-v938`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、21 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **819/819**：`tests/library-hot-update-v935.test.mjs` 新增 2 条（占位卡机制 + `libraryPendingCardHtml` 真跑：blob 图/角标/张数/比例/done 后角标消失并带高亮），并把删除与上传的断言改成乐观口径；`tests/case-delete-folder-cleanup.test.mjs` 按新口径反转 1 条。
    - **没做的（要知道）**：① **图库 / 模板库上传还没有"本地先显示"**（它们一次传多张、源文件 id 在 helper 内部生成，这轮只做了案例项目那条；删除是共用的所以已经快了）；② 网格仍然是"整块重画"的渲染方式 —— 这次靠 `skipGrid` **在关键路径上避开重画**，但换分类/改筛选时照旧整块重画（要彻底改得动渲染骨架，另开一轮）。
    - ⚠️ **未核实**：真机上"删除立刻消失 / 上传立刻出现 + 角标消失"的观感没看过（只有源码断言 + 占位卡 HTML 真跑这一级证据）；**占位卡与真实卡片在视觉上的一致性**（比例、圆角、封面裁切）没在真机比对过。

  - **✅ v939（2026-10-15，已发测试站，部署 `eccfdd90`）—— 修上传占位卡的空白封面 + 高亮改蓝**。用户实测反馈：「删除确实是即时生效了，但是上传物料会显示一个空白的封面，并且会一直是空白封面，只有我手动刷新才会出现，这个高亮不要用红框换成蓝框吧」。
    - **空白封面的根因（v938 的疏忽）**：占位卡的 `<article>` / `.library-thumb` / `<img>` **类名跟真实案例卡不一致** —— 少了 `library-case-card`、`library-preview-shell`、`library-progressive-image`（还有"已就绪"的 `img-loaded is-preview-ready`）。`styles.css:4728` 有 `.library-preview-shell::before { background:#eef1f4 }` 那层**灰色加载占位**，只有宿主拿到 `.is-preview-ready` 才会淡出 ⇒ 少了这些类，图就被那层灰盖住了。**所以看着就是一块空白**。
    - **"一直空白、刷新才出现"的第二个原因**：入库完成后我只撤了角标，**没把封面换成真图**，而且上传那条路是 `skipGrid:true`（不重画网格）⇒ 那张卡永远停在占位状态。现在 `finishLibraryPendingUpload()` 会：找到入库后的真封面 → 把 `img.src` 换成**签名地址** → 再释放本地 blob URL → 撤角标 + 加蓝色高亮。
    - **高亮改蓝**：`.library-card.is-just-uploaded` 从 `#f97316`（橙）改成 `#3b82f6`（蓝），`@keyframes library-fresh-pulse` 里三处 rgba 同步改。
    - 版本号 → `20261015-pending-cover-v939`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、21 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。
    - 测试 **820/820**：`tests/library-hot-update-v935.test.mjs` 新增 1 条（占位卡类名必须与真实卡一致 + 入库后换真图 + 换完才释放 blob），并把高亮那条断言改成蓝色。
    - ⚠️ **未核实**：真机上"本地图立刻可见 + 入库后换成高清签名图"的观感没看过（这次连占位卡本身也是在真机上才暴露的问题，所以**下一轮务必让用户先在真机过一遍**）；图库 / 模板库上传仍没有"本地先显示"。

  - **✅ v940（2026-10-15，已发测试站，部署 `5786c2c1`）—— 上传收尾改成「就地换成真实卡片」，不再手搓占位卡**。用户实测反馈（v939 之后）：「还是空白的，至少就算不显示，过一会要单独刷新出来吧？预览图是小图的话应该不会直接加载不出来呀？**或者让这个封面单独拉取**」。
    - **教训**：v938/v939 **连着两次**栽在同一个坑 —— 我手搓的占位卡 HTML 跟真实卡片**对不齐**（第一次漏 `library-case-card`，补上之后还是空白）。用户那句话点醒了：**别自己搓，让封面走真实卡片那条路**。
    - **v940 的做法**：入库完成后调 `remountFreshLibraryCard(sourceId)` —— 用**真实卡片自己的渲染器**（`renderLibraryCard(item)`，item 由 `state.libraryPreviews` + 刚签好的 `state.libraryPreviewUrls` 拼出来，选封面走 `collapseCaseProjectItems()` 同一条口径）生成一张真卡，**`replaceChild` 就地替换**占位卡（网格其余部分一个字不动），然后 `prepareDecodedLibraryImages(next)` 挂上常规图片管线（灰色占位层由它淡出）。这就是用户说的"封面单独拉取"。
    - **收尾**：换成功 → 条目从 `libraryPendingUploads` 退场（之后由真实数据管）；**换不动**（比如查不到源、被筛选挡住）→ 摘掉占位卡 + `renderLibraryGrid()` 整块重画 —— **宁可闪一下也不留空白**。
    - 另外占位卡的 `<img>` 加了 `onerror="this.remove()"`：本地图万一加载不了，就只剩"上传中…"角标（不至于显示成一个破图）。
    - 版本号 → `20261015-fresh-card-remount-v940`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、20 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。测试 **820/820**。
    - ⚠️ **未核实**：真机上这次到底还空不空白 —— **前两次我以为想明白了，结果都不是**。所以这一条的验收标准只有一条：**用户在真机上重传一次，看封面出不出来**。如果还不行，下一步不再猜：直接在真机上把那张卡的 `outerHTML` 抓出来对比真实卡片。

  - **✅ v941（2026-10-15，已发测试站，部署 `afea125d`）—— 弹窗开着时不再滚动背后的页面**。用户口径：「在这种上传或者项目展示出现弹窗的情况下，滑动鼠标滑轮，不要滑动弹窗背后的页面上的预览图」。
    - **根因（这次是真根因，代码可查）**：**本项目的页面滚动容器不是 `body`，而是 `.content`**（`styles.css` 里 `.content { min-height: 0; overflow-y: auto; overflow-x: hidden }`）。而全项目各处锁滚动写的都是 `document.body.style.overflow = 'hidden'` ⇒ **等于没锁**，所以弹窗后面照样能滚；**上传弹窗连这句都没有**（压根没锁）。
    - **改法**：新增 `syncPageScrollLock()` —— 按"DOM 里有没有开着的弹窗"（`.modal-backdrop` / `.case-project-backdrop`，排除 `hidden`、`aria-hidden`、`display:none`）来决定锁不锁，**同时锁 `body` 与所有 `.content`**。幂等、不计数 ⇒ 多弹窗叠着开、或者某条关闭路径漏调用，都不会出现"永久锁死"。
    - **接线**：8 处老的 `document.body.style.overflow = ...` 全部换成 `syncPageScrollLock()`（案例项目弹窗开/关、图库详情弹窗开/关、书签弹窗关、模板编组弹窗开/关、书签成员弹窗开），并给**上传弹窗**补上开/关两处（它以前根本没有）。
    - **第二层保险**：给弹窗内的滚动容器加 `overscroll-behavior: contain`（`.modal-backdrop` / `.case-project-backdrop` / `.library-upload-scroll` / `.case-project-body` / `.case-side` / `.case-side-grid` / `.library-bookmark-editor-list` / `.case-tag-pop`）—— 滚到自己的尽头也不会把滚动"传染"给背景。
    - 版本号 → `20261015-modal-scroll-lock-v941`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、20 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。测试 **821/821**（新增 1 条：锁必须落在 `.content` 上、全仓不许再出现"只锁 body"的写法、上传弹窗要锁、overscroll 规则要在）。
    - ⚠️ **未核实**：真机上滚轮的手感（只有源码断言这一级证据）；另外**同一个坑可能还有别处** —— 以后凡是要锁页面滚动，一律走 `syncPageScrollLock()`，别再写 `document.body.style.overflow`。

  - **✅ v942（2026-10-15，已发测试站，部署 `3fdb9a58`）—— 溢出时的标签浮窗改成横向换行**。用户反馈：「这个标签的浮窗变成一行一个了，不太对，修一下」（附截图：`.case-preview-ai-pop` 里 Trophy / Ticket / Competition / Hamburger… 竖着一列）。
    - **查证：不是我最近改坏的** —— `git show 8c1c5af:app.js` / `b5de3e4:app.js` 都是同一句 `flex-direction: column; gap: 4px`，这布局从很早就是这样（用户大概是第一次注意到）。**结论按"实测 + 代码可查"写在这里，别以后被误当成回归。**
    - **改法**：`.case-preview-ai-pop` 去掉 `flex-direction: column`，改成 `flex-wrap: wrap; align-items: flex-start; gap: 6px`（默认 row）⇒ 一行放不下才换行，紧凑得多。`max-width: min(520px,90vw)` / `max-height: 260px; overflow:auto` 都保留。
    - 版本号 → `20261015-tag-pop-wrap-v942`（`TOOL_UI_VERSION`、`index.html` 5 处 `?v=`、20 个测试文件里的旧版本断言一起换）。`npm run build:pages` 已跑、`diff -q` 三处一致。测试 **822/822**（新增 1 条：浮窗必须 row+wrap、**不许退回 column**；顺带锁住"浮窗里的标签不显示 ×"这条老行为）。

  - **✅ v943（2026-10-15，已发测试站，部署 `80b0b54f`）—— 英文界面下物料类型也翻译**。用户实测反馈：「英文模式下，这些标签还是中文，没翻译，英文界面上传时好像也是中文」（截图：英文界面里 会场楼层 / 会场游戏模块 / 会场tab 全是中文，而旁边的 Project tags「Consumer End / Kuwait / World Cup」是英文的）。
    - **根因（代码可查）**：**项目标签**走 `libraryDisplayLabel()`（查词表 `name_en`）✓ 所以是英文的；但**物料类型**是渲染时直接打印 `preview.material_type` 原文 —— 弹窗右侧 chip、列表视图、上传卡片与下拉、批量改类型菜单、悬停浮窗全是这一类，全部漏了翻译。
    - **词表那边其实早就有了英文名**（实测查库）：会场楼层 = Venue Floor、会场tab = Venue Tab、会场游戏模块 = Venue Game Module、头图 = Header Image、开机海报 = Boot-up Poster、弹窗 = Popup、横banner = Horizontal Banner ⇒ **不需要补数据，只要渲染时过一层**。
    - **改法**：新增 `caseTypeLabel(value)`（v943）—— 空值/「未分类」按界面语言给「未分类/Unclassified」，其余走 `libraryDisplayLabel()`。**只翻显示**：`option value` / `data-*` / 逻辑判断仍用中文原文（写库、筛选、识别都不受影响）。落点：弹窗右侧 chip + title、列表视图类型、`caseDropCardMarkup` 的类型 chip 与下拉 option 文本、批量改类型菜单、悬停浮窗里的 `<small>` 类型。
    - 顺手修：侧栏 `def.type` 以前在英文界面会给 `'Unclassified'` 当占位值，导致「未分类」的灰色样式判断（`def.type !== '未分类'`）在英文界面失效 —— 现在统一留**空串**当"未分类"，判断和显示都按语言各走各的。
    - 版本号 → `20261015-type-i18n-v943`。`npm run build:pages` 已跑、`diff -q` 三处一致。测试 **823/823**（新增 1 条 + 修 `tests/upload-type-required-v922.test.mjs` 与 `tests/case-side-type-v812.test.mjs` 里两处 vm 上下文：补 `caseTypeLabel` 桩、并按语言建上下文）。
    - ⚠️ **未核实**：真机英文界面下的观感；**筛选面板不需要改**（它本来就过 `libraryDisplayLabel` ✓ 已核实）；物料清单管理页（团队管理）仍是中文 —— 那是"编辑中文名"的地方，没动。

  - **✅ v944（2026-10-15，已发测试站，部署 `ed705e5a`）—— 「＋」钉在行尾 + 溢出浮窗里也放一个 ＋**。用户实测反馈（附截图）：「这种浮窗后面没有加号啊，那要怎么手动加词？」
    - **问题实质**：手动加词的入口**一直都在**（标签行末尾那个小 ＋，v926 加的），但**标签一多、行被横向滚动，末尾的 ＋ 就被推到看不见的地方了** —— 所以用户以为"没有入口"。
    - **改法两件**：
      ① **把 ＋ 钉在行尾**：`.case-preview-ai-chips .case-preview-ai-add-plus { position: sticky; right: 0 }`（加号态的输入框 `right: 26px`、✓ `right: 0` 同理）—— 标签在它下面横向滚动，＋ 永远看得见（它自带白底 + 左侧白色渐隐阴影，压住滚过去的标签）。动效那一行**故意不钉**（`.case-preview-ai-effect .case-preview-ai-add-plus { box-shadow: none }`，它在 111 张物料这种长列表里另算）。
      ② **溢出浮窗里也放一个 ＋**：点它 = 点行尾那个（收起浮窗 → 面板进加号态 → 输入框出现并聚焦）。复用 `casePreviewAiInlineAddPlusHtml()` 与 `CASE_PREVIEW_AI_INLINE_ADD.element`，没有另造一套。
    - 版本号 → `20261015-pin-add-plus-v944`。`npm run build:pages` 已跑、`diff -q` 三处一致。测试 **824/824**（新增 1 条：＋ 必须 sticky、浮窗里必须有 ＋、点了要能进加号态并交回焦点）。
    - ⚠️ **未核实**：真机上 sticky ＋ 的观感（横向滚动时是否真的钉住、阴影是否自然）没看过；**动效那一行的 ＋ 没有钉**（如果那边也嫌藏得深，说一声，加上同样的样式即可）。

  - **✅ v945（2026-10-15，已发测试站，部署 `e68b51c6`）—— 未分类拦截跑在"出现进度条"之前 + 弹看得见的提醒**。用户实测反馈（附截图：未分类的卡 + 红框 + 一根 0% 进度条）：「有未分类的情况下，点入库不应该是先提醒吗？怎么没有提醒，直接出进度条了，**这到底是传了还是只是假象？**」
    - **先回答"传了还是假象"（查库实测）**：`vf_source_files` 一共 312 行（没变），按 `updated_at desc` 看最近一次写入是 **08:33 那条 MayPicks 的编辑**，这次点击**没有产生任何新行** ⇒ **没传，是假象**。
    - **根因（代码可查）**：上传提交函数里 **`setUploadProgress(0)` 写在 `try` 之前、比校验还早**。`setUploadProgress` 是把进度条 HTML 写进 `#library-upload-message`（footer 那块），所以顺序是"先画出 0% 进度条 → 再校验" ⇒ 被拦下时 footer 已经挂着一根 0% 的条，看着就像"已经开始传了"（拦下的提示是同一块元素里的文字，反而被这根条抢了注意力）。
    - **改法**：① 把 `setUploadProgress(0)` 从 try 之前移走 —— 图库/模板那两条各自保留（它们本来要进度条），案例项目这条改成**校验通过之后**才 `setUploadProgress(10)`；② 未分类拦截时**再弹一条 toast**：「还有 N 张未分类：先在缩略图上点「未分类」选分类，或用「批量设置分类」」（原来只有 footer 那行字 + 卡片高亮 + 滚进视野，容易被忽略）。回滚要用的 `uploadedPaths / sourceInserted / sourceId` 仍留在 try 外面（catch 里要用）。
    - 版本号 → `20261015-validate-before-progress-v945`。`npm run build:pages` 已跑、`diff -q` 三处一致。测试 **825/825**（新增 1 条；并修 `tests/case-upload-progress.test.mjs` 的切片锚点与 `tests/upload-type-required-v922.test.mjs` 的 vm 桩）。
    - ⚠️ **未核实**：真机上"点入库 → 只弹提醒、不出现进度条"的观感（只有源码断言这一级证据）。

  - **✅ v946（2026-10-15，已发测试站，部署 `c2f2393b`）—— 上传的占位卡不再另起一列**。用户实测反馈（附截图：第 1 列只有新项目那一张、下面一大片空白，其余 4 列照旧）：「新增的项目封面在瀑布流里单独加了一个竖行显示，原来 4 列的图变成了 5 列」。
    - **根因（v938 引入）**：素材库在"全是案例项目卡"时走**按列排**布局（`renderCaseBoardColumns` → `.library-column`），而我在插占位卡时**又包了一层新的 `.library-column`** —— 于是列数从 4 变 5，而且新列里只有这一张卡 ⇒ 下面一整片空白。**这是个 DOM 层的假列：刷新页面（重新渲染）就没了**，所以只有"刚上传完还没刷新"时能看到。
    - **改法**：`insertLibraryPendingCard()` 改成**插进第一列的最前面**（`grid.querySelector('.library-column').insertAdjacentHTML('afterbegin', html)`）—— 新项目本来就该落在第一列顶部（列表按 updated_at 倒序，它是最新的）✓ 列数不变 ✓ 之后 `remountFreshLibraryCard()` 原地换真卡也在同一列里，不用再收拾。
    - 版本号 → `20261015-pending-card-same-column-v946`。`npm run build:pages` 已跑、`diff -q` 三处一致。测试 **825/825**（改了 1 条：断言"必须插进第一列、不许再包一层新列"）。
    - ⚠️ **未核实**：真机上"上传后 4 列照旧、新卡片在第一列顶部"的观感；**非案例项目（图库/全部）那条路**仍是直接 `afterbegin` 插到网格最前 ✓（那条没有列结构）。

  - **🚧 用户 2026-10-13 追加的核心痛点：同款的英/阿版本在结果里重复占位**（搜「牛排」出英文版那张、搜「烤肉」出**同一设计的**阿语版那张；根因是逐图各识别一次，同款两版的标签不一致）。规划稿早有对应章节：**§3 设计分组**（分组证据与防连锁误合并）+ **§5 逐图识别如何支持语言版本去重**。
    - **口径（按规划稿，不要改成"硬统一标签"）**：① **结果按"设计组"占位** —— 同款多语言版在结果里只占一个位置（默认展示有证据的 EN 版），组内可展开看其他版本；② **证据分层** —— 其他版本标"同组待核验"，人工确认后才进直接命中。规划稿 §5 明确「**不能让已完成的 EN 标签自动替代失败的 AR 结果**」；硬复制标签会造成假命中（搜烤肉结果里那张其实是牛排版）。
    - **配对证据（按可靠性）**：`vf_asset_previews.language`（en/ar/none/空，AI 识别或手改，空则按文件名兜底）互补 + 同项目 + 同 `material_type`/同尺寸 + 文件名结构（**编号必须保留**，规划稿禁止"删掉数字强行合并"）+ **画面相似度**（要用算法如感知哈希，规划稿明说"模型说很相似不能当可靠概率"）；AI 只作疑难项兜底。防连锁误合并：新成员要跟**组内整体**比（A像B、B像C ≠ A像C）。
    - **建议三步**：**步 A**（不写库、不重新识别）展示层去重 —— 同项目内按「尺寸/物料类型 + 语言互补 + 文件名/序号」保守聚类，结果里同组只占一个位置、组内可展开；**步 B** 识别也按组（**每组只识别一次**，选 EN 当代表，其他版本记"同组推定待核验"）⇒ 标签天然一致，识别量还从 1953 降到约一半；**步 C** 人工纠错（移出本组/合并/选代表图/撤销）+ 抽检（规划稿 §12 的"错误折叠比例"是核心指标）。
    - **⏸ 2026-10-13 用户决定：分组/配对先待定（park）**。理由（用户原话）："多个候选时用文件名相似度不可靠 —— 这个功能要很多人用，命名习惯是任何形式甚至乱七八糟"。结论：**文件名只能当弱信号**；正确主证据是**画面相似度（感知哈希）**（规划稿 §3.2 列过这个信号），而阿语版常镜像、阈值需实测标定。v906/v907 已能跑通"按组识别"，但**配对口径先冻结**（当前规则 = 同项目 + en/ar 互补 + 同类型 + 同尺寸 + 文件名同编号，实测在实验项目 28 张里只配上 2 对，因为真实命名是"编号相邻"而非相同）。要继续就得做画面相似度（客户端 Canvas 算 dHash，注意镜像取 min 距离 + 阈值标定 + 失败单列提示）。
    - **🎯 关键架构口径：先跑逐图识别不白做（2026-10-13 定，回答"以后改分组是不是要再识别一次"）**：
      **逐图标签是「事实层」（每张图里看到什么），分组是「视图层」（哪几张是同一设计）——两者解耦，分组变化不需要重新看图。**
      - 分组信息**单独存**（未来加 group_id / 组表），**绝不去改写 `ai_tags`**；
      - 组级标签 = 组内成员标签的**并集/多数**（确定性、零成本），**不需要再调模型**；
      - 展示层按组聚合（v904「按命中物料铺开」+ v906「同组占位」就是这个思路）⇒ 分组规则改了只重跑展示逻辑；
      - 只有当我们想要"**每组再精修一次标签**"（选代表图 / 一次看多张）时，才需要额外调用 —— 那是对**组**跑（约 1000 次），不是对**图**跑（1953 次），而且**可选**；
      - 已经能区分来源：组跑过的行 `model` 带 `-group` / `-group-fallback`，逐图跑的就是纯模型名 ⇒ 将来要"只精修未精修的行"能精确挑出来。
      ⇒ 所以顺序上**先逐图识别全量、后补分组**是安全的；反过来（先分组后识别）虽然更省（1000 次），但会卡住"每张图可被搜到"这个地基。
    - **（park 之前定过的方案，留档）** 用户 2026-10-13 追加确认：**不是"逐图再识别一遍"，而是"按组一次看多张"** —— 逐图独立重跑解决不了统一（同一画面两种语言下模型仍可能给不同词，本来就是这个 bug 的来源）。改成：
      ① 先用**确定性信号**（同项目 + 同尺寸/物料类型 + 语言互补 + 文件名同编号）生成**候选组**；
      ② 把候选组的 2–4 张**一次喂给视觉模型**（GLM-4V 的一条消息可放多张图），让它同时输出 **① 一组统一标签**（覆盖组内共同内容）+ **② 这几张是否同一设计** 的判断；
      ③ 模型判"同组"只作**参考**，与确定性信号不一致时**不合并**（单成员组正常参与搜索）；拿不准就拆开，宁可漏合并不要错合并；
      ④ 组级标签记为"组证据"，成员自己识别出的差异标签仍保留（规划稿 §4.3：替换只动 AI 管理部分，**人工补充与排除保持不变**）。
      - **成本**：同款两版合一后，1953 张 ≈ 1000 次多图调用（比逐图 1953 次更省）。
      - 实现落点（**已完成，见上面的 v906 记录**）：`functions/_ai.js` 新增 `analyzeCaseTagGroupsWithGlm()`（多图 + `parseCaseTagGroups()` 返回 `sameDesign`）；**组识别入口挂在 `functions/api/analyze-elements.js` 的 `images` 分支上**（不是 `case-preview-ai-tags.js` —— 那个端点只负责写库，组识别后仍逐张调它的 `save`）。③ 这一轮**没有**把模型的 `sameDesign` 反馈进合并判断（它只用于结果提示），因为展示层拿不到这个信号（没落库）；要完整按 ③ 做，得把"组"落库（新表或新列）。④「组证据 vs 成员自己的差异标签」也没分层，本轮是"组标签整组覆盖 AI 标签部分"。
  - **步 2（下一轮，需用户授权）**：放开写入范围 —— 去掉 `functions/api/case-preview-ai-tags.js` 里 `previewFor()` 的 `source_file_id=eq.EXPERIMENT_SOURCE_ID`，并把 `casePreviewAiEnabledFor` 换成 `isCaseProject(source)`。**`EXPERIMENT_KEY = 'augpicks-v1'` 不许改**（现有 28 行挂在这个 key 下，改名就读不到）。
  - **还没通的两处（步 2 之后/并行）**：① **元素筛选维度**没吃逐图标签 —— `librarySourceMatchesFilterValue()` 只查项目级 `visibleLibraryTags`，所以"搜索框能搜到、元素筛选 chips 搜不到"；② `collectTagLabelsInUse()` 现在会收全部项目的逐图标签 ⇒ 英文界面首屏补翻的候选词变多（1953 张量级，上线后留意首屏耗时）。
  - **✅ 另开一条「本机命令行批量识别」通道（2026-10-13 新增 `scripts/recognize-case-tags.mjs`）**：
    浏览器里的「一键识别」是 2 并发 + 手点 + 关页面就停（1953 张要 1.5–3 小时），所以把"把逐图标签铺满"这件事改由本机脚本干——
    直连 Supabase（service role）+ 直连 `analyzeCaseTagsWithGlm`（**复用 `functions/_ai.js`，没有重写提示词**），
    一次把案例库全部逐图元素标签补齐。要点：
    - **只写 `vf_preview_ai_tags`**，写库语义照抄端点 `save`（`ai_tags` 刨掉 `excluded_tags`、`manual_tags`/`excluded_tags` 原样保留、写前重读该行再合并），**不碰** `vf_source_files` / `vf_asset_previews`。
    - 断点续跑：`content_key` 与端点 `previewContentKey()` 一致且 `status='success'` 就跳过（`--force` 才重跑）；取图优先缩略图（`_thumb.jpg` → app.js 给预览图实际用的 `_thumb-<id>.jpg` → 退原图并记日志）；失败退避重试 3 次，彻底失败写字 `status='failed'` + 失败清单落 `outputs/recognize-failures-*.json`。
    - 凭证只从环境变量 / `.local/recognize.env` 读（不进 git），日志与提示只打 key 前 4 位 + 长度、绝不整串输出。
    - **本轮只做逐图**（分组口径仍 park）；活动主题不入库（表里没这列）。**`--dry-run` 只列条数、不调模型不写库。**
    - ⚠️ **尚未对真实库跑过**（本机没有凭证，第一批得在用户机器上跑）：链路已在本机用「假 Supabase + 拦掉智谱域名」端到端验过（缩略图 404 退原图、合并写库保住 manual/excluded、失败标记、断点续跑、Ctrl-C 优雅退出、写操作只落在标签表），
      纯逻辑另由 `tests/recognize-case-tags-script.test.mjs`（16 条，含"源码里不许出现硬编码密钥"）锁住。
    - 🚧 **跑之前要人定的**：① 免费档 `glm-4v-flash` 的真实限流要跑一批才知道（默认 `--rate 2` 保守起步，`--concurrency` 上限 8）；② 缩略图缺失的真实比例要跑一次才知道（老数据可能没生成过）。
  - **步 2 之后**：分批铺开识别（每批几十张，跑完抽查）→ 覆盖够了再谈规划稿里的"设计分组/分层次搜索"（阶段 2–4）。

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
