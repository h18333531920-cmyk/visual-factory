# 给 Codex 的部署说明：visual-factory → Cloudflare Pages

## 1. 背景与目标

- **项目**：visual-factory（GCC Design，一个 Supabase + Cloudflare Pages 的 DIY 海报编辑器）。
- **代码仓库**：https://github.com/h18333531920-cmyk/visual-factory
- **部署目标**：Cloudflare Pages 项目，项目名 `visual-factory`，线上域名 `https://visual-factory.pages.dev`。
- **本次目的**：把「即梦生图」后端函数 `functions/api/jimeng.js` 的修复部署上线（修复生图时"连接失败"、图片传不回画布的问题）。
- **当前状况**：本地 wrangler 的 OAuth 登录已过期；Cloudflare 账号属于同事，不便反复 OAuth 授权。因此改用 **Cloudflare API Token** 认证，由 Codex 全程执行。

> 重要：`functions/` 里的后端代码只有部署到 Cloudflare 才能生效（GitHub Pages 是纯静态，跑不了函数）。所以这一步必须做，不能只 push 代码。

---

## 2. 前置条件（需要「账号所有者同事」先做，约 2 分钟，这是唯一需要人手动做的步骤）

Codex 无法自行登录 Cloudflare，因此需要账号所有者生成一个 API Token 交给 Codex：

1. 浏览器打开 https://dash.cloudflare.com 并登录（账号：`H18333531920@gmail.com`）。
2. 右上角头像 → **我的资料 / My Profile** → **API Tokens**。
3. 点 **创建 Token / Create Token**。
4. 选模板 **"Edit Cloudflare Workers"**（这个模板自带 Workers + Pages 的编辑权限）。
   - 如果希望更精细：自定义权限为 `Account` → `Cloudflare Pages` → `Edit`。
5. 生成后复制得到的 Token 字符串（形如 `AbCdEf123...`）。

**把 Token 交给 Codex**：设为环境变量 `CLOUDFLARE_API_TOKEN`，或直接粘贴给 Codex 使用。

> 如果 Codex 拿不到这个 Token，请先停下，向人索要，不要尝试用 OAuth 登录替代。

---

## 3. 任务 A：立即部署本次修复（必须）

在项目根目录依次执行：

```bash
# 1) 拉取/确认最新代码
git clone https://github.com/h18333531920-cmyk/visual-factory.git
cd visual-factory
git pull

# 2) 构建产物（生成 dist/，包含静态文件 + functions/）
npm run build:pages

# 3) 用 API Token 部署到 Cloudflare Pages（生产分支 main）
export CLOUDFLARE_API_TOKEN="<把 Token 粘贴到这里>"
npx wrangler pages deploy dist --project-name visual-factory --branch main
```

预期成功标志：输出里出现类似 `✨ Deployment complete!` / `Uploaded` 且给出一个 `https://xxxxx.visual-factory.pages.dev` 的部署 URL。

如果报错，先看错误信息：
- 若提示认证失败（`Authentication error` / `401` / `not authenticated`）：说明 Token 无效或权限不足，回到第 2 节重新生成 Token（确认勾选了 Pages 编辑权限）。
- 若提示 KV / secret 相关错误：记录原文，转告人，不要自行改动项目设置。

---

## 4. 任务 B：配置 GitHub Actions 自动部署（可选，强烈建议，一劳永逸）

目标：以后任何人 `git push` 到 `main`，自动构建并部署，不再手动跑 wrangler。

### 4.1 在 GitHub 仓库配置 Secret

1. 打开 https://github.com/h18333531920-cmyk/visual-factory
2. **Settings → Secrets and variables → Actions → New repository secret**
3. 名称填 `CLOUDFLARE_API_TOKEN`，值填第 2 节拿到的 Token，保存。

### 4.2 新建 workflow 文件

在仓库根目录创建 `.github/workflows/deploy.yml`，内容如下：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Build
        run: npm run build:pages
      - name: Deploy
        run: npx wrangler pages deploy dist --project-name visual-factory --branch main
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

然后 commit 并 push 这个 workflow 文件，即可触发一次自动部署。

---

## 5. 验证部署是否成功

1. 访问 https://visual-factory.pages.dev/api/health —— 应返回包含 `ready` 的信息。
2. 打开 DIY 生图面板 → 选择「即梦」→ 输入描述词 → 生成：
   - 不再提示"连接失败 / 无法连接即梦中转服务"。
   - 生成过程中进度条持续走动，生成完成后图片自动出现在画布上。

---

## 6. 常见问题

- **看不到 GitHub 仓库**：说明当前 GitHub 账号没有该仓库权限，需要仓库管理员把该账号加为 Collaborator（仓库 Settings → Collaborators）。
- **Token 过期**：Cloudflare API Token 有有效期，过期后需要账号所有者重新生成（回到第 2 节）。
- **不要做的事**：不要修改 `functions/`、`wrangler.toml`、`config.js` 里的 Supabase 地址/密钥；不要改动现有 Cloudflare 项目的 KV 绑定和域名配置。
