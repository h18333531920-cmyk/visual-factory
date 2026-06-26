# GCC Design 项目交接说明

这份文档是给同事、另一个 GPT、或未来接手这个项目的人看的。  
目标是：不用读完整历史对话，也能安全地继续开发，不要把正式版搞坏。

## 一句话说明

GCC Design 是一个给设计工作流用的网页工具，包含素材库、静态设计师、动态设计师、提需流程等功能。

当前重点原则：

- 正式网站已经封版，稳定版不要随便动。
- 新功能先做测试版。
- 测试成功后，用户明确说“封进正式版”，才发布正式站。
- 每次更新后，都要把链接发给用户。

## 当前网址

正式网站：

https://gccdesign.app

测试网站：

https://asset-gallery-test.visual-factory.pages.dev

当前正式版版本号：

`20260626-home-kiki3`

当前正式部署直链：

https://cdd1a94e.visual-factory.pages.dev

当前测试版最后确认状态：

- 首页 UI 已更新到 KIKI 版本。
- 健康检查正常：`ready:true`、`aiReady:true`

健康检查地址：

https://gccdesign.app/api/health

## 用户最在意的规则

1. 不要直接改正式版。
2. 不要让旧功能因为新功能更新而丢失。
3. 不要让素材库数据丢失。
4. 每次更新后必须发链接。
5. 做 UI 时，先保持原有布局逻辑，再优化视觉。
6. 测试成功后，用户明确同意，才封版到 `gccdesign.app`。

## 当前重要功能

这些功能已经做过多轮修复或测试，改动时要特别小心：

- 登录和应急登录。
- 素材库读取、上传、标签筛选。
- 静态设计师。
- 静态设计师的一键延展。
- 火山引擎扩图 / 本地补底兜底。
- 三画板：头图、开屏、Banner。
- 版式、标签组、Logo 资产库预览。
- 正式版和测试版资产库按域名隔离。

## 当前首页 UI 状态

当前首页版本：`20260626-home-kiki3`

首页方向：

- 参考 `https://d.design/` 的整体比例和气质，但不要像素级复制。
- 顶部有 KIKI 小角色。
- 主标题是：`你的高效设计伙伴`
- 搜索框是大任务输入框。
- 四个入口卡片：
  - 超级库
  - 静态设计师
  - 动态设计师
  - 提需流程
- 四个卡片要求：
  - 真黑色背景，接近 `#050608`
  - 荧光绿文字和箭头，接近 `#D8FF4F`
  - 不要灰色卡片
  - 不要浅色渐变卡片

## 重要文件

主入口：

- `index.html`
- `app.js`
- `styles.css`

静态设计师：

- `tools/static/frontend.html`

Cloudflare Pages Functions：

- `functions/`

公开静态资源：

- `public/`

当前 KIKI 首页图片：

- `public/assets/kiki-home.png`

视觉规范文档：

- `docs/gcc-design-system.md`

构建脚本：

- `tools/build-recovered-platform-library.js`

## 常用命令

进入项目目录：

```bash
cd /Users/harvey/Documents/visual-factory
```

构建：

```bash
npm run build:pages
```

部署测试版：

```bash
npx --yes wrangler@latest pages deploy dist --project-name visual-factory --branch asset-gallery-test
```

部署正式版：

```bash
npx --yes wrangler@latest pages deploy dist --project-name visual-factory --branch main
```

检查测试版健康状态：

```bash
curl -sS https://asset-gallery-test.visual-factory.pages.dev/api/health
```

检查正式版健康状态：

```bash
curl -sS https://gccdesign.app/api/health
```

查看当前正式首页加载的版本号：

```bash
curl -sS https://gccdesign.app/
```

## 推荐工作流程

每次做新功能时：

1. 先读这份 `HANDOFF.md`。
2. 明确本次只改什么。
3. 只在测试版部署。
4. 把测试版链接发给用户。
5. 用户确认测试成功后，再问是否封版正式。
6. 用户明确同意后，才部署正式版。
7. 正式部署后，再发正式链接和部署直链。

## 不建议做的事情

- 不要用 `git reset --hard`。
- 不要随便删除 `functions/`、`tools/`、`public/`。
- 不要为了 UI 改动去动登录、素材库、扩图接口。
- 不要在用户没确认前部署正式版。
- 不要假设素材丢失，先检查当前域名、登录状态、数据库和存储。

## 给另一个 GPT 的提示词

可以把下面这段直接发给另一个 GPT：

```text
你现在接手的是 GCC Design 项目。请先阅读项目根目录的 HANDOFF.md。

重要规则：
1. 不要直接部署正式站 gccdesign.app。
2. 新功能先部署测试版 asset-gallery-test.visual-factory.pages.dev。
3. 每次更新后必须把链接发给用户。
4. 不要破坏已有功能，尤其是登录、素材库、静态设计师、一键延展、扩图。
5. 如果需要正式封版，必须等用户明确同意。

请先说明你理解的项目状态和本次要做的改动，再开始。
```

## 如果额度快用完

把这份文件发给另一个 GPT，让它先读，再继续开发。  
不要让新 GPT 猜项目状态，也不要让它直接从零重构。

