# Visual Factory v1 正式发布步骤

这个版本是“低成本可上线版”：
- 前端：`index.html`（保留你现有风格和核心交互）
- 后端：Vercel Serverless API（固定账号口令登录）
- 云端：Supabase（数据库 + 文件存储 + 实时同步）

---

## 1) 代码文件结构

```
visual-factory-release-v1/
  index.html
  api/
    _auth.js
    login.js
    session.js
    logout.js
  sql/
    001_init_assets_library.sql
```

---

## 2) Supabase 初始化

1. 打开 Supabase 项目 -> SQL Editor  
2. 新建 Query，把 `sql/001_init_assets_library.sql` 全贴进去运行  
3. 如果最后一行报错 `must be owner of table objects`，忽略这行（前面的表和策略通常已生效）  
4. 去 `Database -> Publications -> supabase_realtime`，手动勾选 `public.assets_library`

---

## 3) 修改前端中的 Supabase 项目

打开 `index.html`，检查这两个常量（在 `<script>` 开头附近）：

```js
const supabaseUrl = 'https://你的项目.supabase.co';
const supabaseKey = '你的 publishable key';
```

把它们替换为你自己项目的值（Supabase -> Settings -> API）。

---

## 4) Vercel 环境变量（必须）

Vercel -> Project -> Settings -> Environment Variables，新增：

- `AUTH_SECRET`：随机长字符串（至少 32 位）
- `ADMIN_PASSCODE`：管理员口令
- `DESIGNER_PASSCODE`：设计师口令
- `VIEWER_PASSCODE`：只读用户口令

设置完点 Redeploy（重新部署）。

---

## 5) 功能验收（上线前 5 分钟走查）

1. 打开线上地址，点击任一角色，输入对应口令，应能进入系统  
2. 上传 JPG/PNG，卡片应出现  
3. 上传 PSD/AI/PDF + 预览图，源文件卡片应出现  
4. 点开详情，应能看到大图/占位和操作按钮  
5. 下载主文件、下载 Logo：至少一种方式成功（直接下载或新标签打开）  
6. 删除素材：卡片消失，另一台电脑刷新后也消失  
7. 顶部显示“云端状态：实时同步已连接 / 已连接最近同步 xx:xx:xx”

---

## 6) 你关心的两个现实问题

### A. PSD 上传慢
这是浏览器直传大文件的常见现象（尤其 >100MB）。  
本版已经加了大文件预警。后续要快，需要做二期 TUS 分片上传。

### B. 下载偶发失败
本版已做三段兜底：
1) Supabase `storage.download`  
2) `fetch -> blob`  
3) 新窗口打开文件链接  

---

## 7) 二期建议（你确认后我再给代码）

- TUS 分片上传（大文件速度和稳定性）
- 操作日志（谁上传/删除）
- 回收站（误删恢复）
- 批量操作

