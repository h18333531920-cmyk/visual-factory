# GCC Design Static DIY Editor — 功能完整参考文档

**文件:** `tools/static/frontend.html` (约 5858 行)

---

## 1. 布局结构（三栏布局）

```
.editor-layout (flex row, max-width: 1780px, height: calc(100vh - 102px))
  |-- .asset-pane (左, width: 260px, flex-shrink: 0)          ← 资产库
  |-- .left-pane (中, flex: 1)                                 ← 画板
  |-- .right-pane (右, width: 426px)                           ← 图层/属性/AI
```

### 核心 DOM 元素

| ID | 用途 |
|---|---|
| `asset-pane` | 左侧资产库面板 |
| `diy-subtag-row` | 子标签筛选行 |
| `asset-list-ui` | 资产卡片网格容器 |
| `left-pane` | 中央画板容器 |
| `canvas-save-btn` | "保存模版"按钮（绿色） |
| `canvas-wrapper` | 画板 wrapper（白色背景，overflow:hidden） |
| `dynamic-layers` | 所有图层 DOM 元素的容器 |
| `safe-guide` | 安全区虚线引导 |
| `artboard-preview-dock` | 总览模式预览卡片 |
| `undo-btn` / `redo-btn` | 撤销/重做 |
| `layer-module-card` | 图层管理卡片 |
| `layer-list-ui` | 图层列表 |
| `prop-edit-area` | 属性编辑面板 |
| `ai-prompt-input` | AI 生图提示词输入 |
| `ai-submit-btn` | AI 提交按钮 |
| `settings-modal` | 设置弹窗 |
| `component-upload-modal` | 组件上传标签选择弹窗 |

---

## 2. 画板系统

### 尺寸定义

```javascript
const SIZES = {
    head: { w: 750, h: 500 },
    splash: { w: 750, h: 1626 },
    banner: { w: 1396, h: 424 },
    '1:1': { w: 1080, h: 1080 },
    '3:4': { w: 1080, h: 1440 },
    '4:3': { w: 1440, h: 1080 },
    '16:9': { w: 1920, h: 1080 },
    '9:16': { w: 1080, h: 1920 }
};
```

### 默认画板预设

```javascript
const ARTBOARD_PRESETS = [
    { id: 'head', ratio: 'head', label: '头图', w: 750, h: 500 },
    { id: 'splash', ratio: 'splash', label: '开屏', w: 750, h: 1626 },
    { id: 'banner', ratio: 'banner', label: 'Banner', w: 1396, h: 424 }
];
```

### 画板缩放

`resizeCanvas()`: `canvas-wrapper` 设为 `SIZES[currentRatio]` 的尺寸，然后 scale 适配 left-pane：
```javascript
scale = Math.min((pane.clientWidth - 160) / w, (pane.clientHeight - 160) / h);
wrap.style.transform = `translate(-50%, -50%) scale(${scale})`;
```

### 拖拽（画布上）

- 点击图层 → 选中
- Shift+点击 → 多选
- 拖拽移动图层，位置除以 `currentScale` 转换坐标
- Shift+拖拽 → 约束单轴

### 总览模式

`overviewMode`: 显示所有画板的预览卡片（替代画布）

---

## 3. 图层系统

所有图层共有属性: `{ id, type, x, y, scale, zIndex, locked }`

### 3a. 图片 (type: 'image')

```javascript
{
    x: w/2, y: h/2, scale: 1, zIndex: maxZ+1, rotation: 0,
    baseW: w, baseH: h, flipX: false, src: '', opacity: 1,
    fitMode: 'cover'  // 'cover' | 'contain' | 'original'
}
```

### 3b. 文本 (type: 'text')

```javascript
{
    x: w*0.3, y: h*0.32, scale: 1, zIndex: maxZ+1, rotation: 0,
    text: '主标题\n文字',
    font: 'Arial Black, sans-serif', fontWeight: 900,
    fontSize: 88, lineHeight: 0.95, letterSpacing: 0,
    maxWidth: 620,
    textAlign: 'left',      // 'left'|'center'|'right'
    textCol: '#111827',
    resizeMode: 'autoWidth', // 'autoWidth'|'maxWidth'|'fixedSize'
    textDirection: 'ltr'     // 'ltr'|'rtl'
}
```

### 3c. 标签 (type: 'tag')

```javascript
{
    rotation: -3, tagHeight: 60,
    shadowThickness: 12, shadowOpacity: 1,
    letterSpacing: 0, tagPaddingX: 36, tagTextOffsetY: 0,
    text: 'NEW TAG',
    font: '-apple-system, sans-serif',
    bgCol: '#00D06C', textCol: '#FFFFFF', shadowCol: '#111827'
}
```

### 3d. 折扣标签 (type: 'discountTag')

```javascript
{
    rotation: -5, shadowThickness: 12, shadowOpacity: 0.45,
    letterSpacing: -3, tagPaddingX: 34, tagPaddingY: 15, tagTextOffsetY: 0,
    mainText: '60', topText: '%', bottomText: 'off',
    mainFontSize: 96, topFontSize: 52, bottomFontSize: 42,
    sideGap: 8, sideLineGap: -2,
    font: 'Arial Black, sans-serif',
    bgCol: '#050505', textCol: '#7CFF00', shadowCol: '#111827'
}
```

### 3e. 圆弧 (type: 'arc')

```javascript
{
    rIn: 400, wIn: 40, wOut: 120,
    cIn: '#00D06C', cOut: '#111827'
}
```

### 3f. 纯色块 (type: 'solid')

```javascript
{ color: '#00875f', baseW: w, baseH: h, locked: true }
```

### 3g. Logo (type: 'logo')

```javascript
{ baseW: 260, baseH: 160, flipX: false, src: '' }
```

### 图层操作函数

| 函数 | 用途 |
|------|------|
| `addLayer(type, extraData)` | 创建图层 |
| `createLayerElement(l, options)` | 渲染图层 DOM |
| `renderCanvas()` | 重绘所有图层 |
| `deleteLayer(id)` | 删除单个图层 |
| `deleteSelectedLayers()` | 删除所有选中图层 |
| `toggleLock(id)` | 切换锁定 |
| `reorderLayerByDrop(fromId, toId)` | 拖拽重排 |
| `updateProp(p, v)` | 更新属性（应用到所有选中图层） |

### 图层共享属性（跨画板同步）

tag/discountTag/arc/solid 类型有 `sharedKey`，修改一个画板的图层会同步到其他画板的同 `sharedKey` 图层。文本和图片不参与共享。

---

## 4. 右侧属性面板

由 `renderProperties()` 渲染到 `#prop-edit-area`。

### 文本图层属性

- 文字内容 textarea
- 字体下拉（系统字体 + 自定义字体）
- 字重：500/700/800/900
- 颜色选择器
- 字号 stepper (1-480px)
- 对齐：左/中/右
- 语法方向：EN 左到右 / AR 右到左
- 行距 stepper (0.1-5)
- 字距 stepper (-50~30px)
- 宽度 stepper (10-4000px)
- 缩放 stepper (0.01-10x)
- 旋转 stepper (-180~180°)
- 居中画板按钮

### 图片图层属性

- 适配模式：铺满/完整/原图
- 不透明度 slider (0-1)
- 缩放 slider (0.01-10)
- 旋转 slider (-180~180)
- 居中/镜像按钮

### 标签图层属性

- 文案输入
- 字体选择
- 品牌色预设色块
- 标签高度 (10-300px)
- 缩放/旋转/字间距/内边距/文字偏移/投影厚度/投影透明度

### 折扣标签属性

- 主文字/右上角/右下角 输入
- 字体选择 + 品牌色预设
- 主字大小/%大小/Off大小/左右间距等

### 圆弧属性

- 品牌色预设色块
- 整体缩放/中心半径/内环粗细/外环粗细

### Stepper 数字步进器

自定义组件：`[-] 数值 [+] 单位`
- 按住拖拽 = 滑动调整数值
- Shift+拖拽 = 10x 加速
- 双击数值 = 键盘输入精确值，回车确认

函数：`stepperAdjust()`, `stepperStartScrub()`, `stepperScrubMove()`, `stepperScrubEnd()`, `stepperStartInput()`, `stepperFmt()`

---

## 5. 文字编辑

### 双击编辑

双击画布文字 → 直接进入 contenteditable 编辑模式 → 蓝色边框高亮 → 输入同步到右侧面板

### 键盘操作

- Enter（选中文字图层时）→ 进入编辑
- Escape → 退出编辑
- 编辑模式下 Delete/Backspace → 删除字符（不删图层）

### 文字方向

- `textDirection: 'ltr'` — EN 左到右
- `textDirection: 'rtl'` — AR 右到左（设置 `direction: rtl; unicode-bidi: embed`）

### 文字缩放模式

- `autoWidth`: 宽度自适应，不换行 (`width: auto; white-space: nowrap`)
- 其他: 固定 maxWidth，文字自动换行

### 文字对齐锚点

- left: 左边固定，向右扩展 (`translate(0, -50%)`, origin `left center`)
- center: 中心固定 (`translate(-50%, -50%)`, origin `center center`)
- right: 右边固定，向左扩展 (`translate(-100%, -50%)`, origin `right center`)

---

## 6. 资产库（左侧面板）

### 三个 Tab

| Tab | 数据源 | 子标签 |
|-----|--------|--------|
| 模版 (layout) | `presetLibrary` | 全部 / 社媒物料 / C端物料 |
| 组件 (component) | `tagPresetLibrary` + `logoAssets` | 全部 / 标签 / 背景 / 品牌圆弧 / LOGO / KIKI / 其他素材 |
| 参考元素 (reference) | `referenceElements` | 食物 / 背景 |

### 功能

- **单击**: 应用模板/标签组合/Logo 到画板
- **删除按钮**: 确认后删除（本地 + 云端）
- **拖拽上传**: 组件 tab 支持拖入图片 → 弹出标签选择弹窗 → 上传
- **预览图**: 优先使用 Supabase 存储的真实预览图（与素材库一致），object-fit: cover，按实际比例显示

### 子标签系统

- `diySubtagFilter`: 当前筛选的子标签
- `diySelectedSubtag`: 保存时分配给模板的 tag2（影响素材库分类）
- 保存模板时 `subTag` 参数决定模板在素材库中的二级分类

---

## 7. 模板同步（postMessage 协议）

所有通信通过 `notifyParent(msg)` → `window.parent.postMessage(msg, location.origin)`

### 发往父窗口的消息

| 类型 | 用途 | 字段 |
|------|------|------|
| `vf:save-template` | 保存模板到 Supabase | `templateType` (layout/pack/tagcombo/logo), `name`, `data`, `previewDataUrl`, `tempId`, `subTag` |
| `vf:delete-template` | 删除模板 | `sourceId` |
| `vf:request-templates` | 请求所有模板（启动时） | 无 |

### 从父窗口接收的消息

| 类型 | 用途 |
|------|------|
| `vf:templates-loaded` | 接收模板列表元数据（含 tags, previewW, previewH），填充 `presetLibrary`/`tagPresetLibrary`/`logoAssets` |
| `vf:sync-progress` | 保存结果反馈：`done` → 分配 cloudId，去掉 `_pending`；`error` → 提示失败 |
| `vf:template-preview` | 接收预览图 data URL |
| `vf:template-data` | 接收模板完整 JSON 数据（elements, artboards 等） |
| `vf:apply-template` | 应用模板到画布（支持 vf-layout-preset/v1, vf-template-pack/v1, vf-tag-combo/v1, vf-logo-asset/v1） |
| `vf:template-deleted` | 从本地数组移除模板 |

### 保存流程

1. `saveToPreset()` → 创建 `_pending: true` 的本地项
2. 截取预览图 → `notifyParent({ type: 'vf:save-template', ... })`
3. 父窗口上传 Supabase → 返回 `vf:sync-progress` → 本地项 `cloudId` 赋值

### 加载流程

1. 启动时 `notifyParent({ type: 'vf:request-templates' })`
2. 父窗口查询 Supabase → `vf:templates-loaded`（元数据）
3. 后台逐个下载预览图 → `vf:template-preview`
4. 后台逐个下载 JSON → `vf:template-data`

---

## 8. 键盘快捷键

| 快捷键 | 条件 | 操作 |
|--------|------|------|
| Cmd/Ctrl+Z | 非输入框 | 撤销 |
| Cmd/Ctrl+Shift+Z | 非输入框 | 重做 |
| Cmd/Ctrl+Y | 非输入框 | 重做 |
| Delete/Backspace | 非输入框，非编辑文字 | 删除选中图层 |
| Enter | 选中一个文字图层（未编辑中） | 进入文字编辑模式 |
| Escape | 文字编辑中 | 退出编辑 |

---

## 9. 弹窗

| 弹窗 | ID | 功能 |
|------|-----|------|
| 设置 | `settings-modal` | 字体管理、关键词标签、标签色彩预设、圆弧色彩预设、资产备份导入导出 |
| 组件上传 | `component-upload-modal` | 选择分类标签后上传图片到组件库 |
| 导出 | `export-overlay` | PNG 导出中全屏遮罩 |
| 小对话框 | `mini-dialog` | `askText()` 文本输入、`askConfirm()` 确认 |
| 自定义画板 | `custom-artboard-dialog` | 创建/编辑自定义画板尺寸 |

---

## 10. 画布工具栏（右上角）

| 按钮 | 样式 | 功能 |
|------|------|------|
| 保存模版 | 绿色 `.save-template-btn` | `saveActiveAsset()` |
| 一键延展 | 深灰 `.primary` | `extendFromHead()` |
| 导出 | 深灰 `.primary` | `exportPNG()` |
| 更多 | 默认 | 展开菜单：尺寸/设置/安全区 |

---

## 11. AI 生图面板

### 功能模块

- **参考图 strip**: 拖入/上传参考图（最多 8 张），可拖拽排序
- **提示词标签**: 点击关键词标签追加到提示词
- **提示词输入**: textarea
- **功能选择**: 图片生成 / 智能扩图 / 图片清晰
- **供应商选择**: GPT 大模型 / 火山大模型

### API 端点

| 端点 | 用途 |
|------|------|
| `/api/generate-image` | 提交生图任务 |
| `/api/generate-image-status` | 轮询生图状态 |
| `/api/outpaint-image` | 智能扩图 |
| `/api/enhance-prompt` | GPT 优化提示词 |

---

## 12. 图层面板

### 图层列表

- 显示所有图层（zIndex 降序 = 视觉从上到下）
- 拖拽手柄 + 类型图标 + 名称
- 锁定/解锁按钮
- 删除按钮
- 拖拽重排

### + 添加菜单

- 图片图层 → 触发 `#bg-upload`
- 文本 → `addLayer('text')`
- 上传 Logo → 触发 `#logo-upload`
- 圆弧 → `addLayer('arc')`
- 标签 → `addLayer('tag')`
- 折扣标签 → `addLayer('discountTag')`

### 拖入图片到图层

`#layer-drop-zone` 接受图片拖入，调用 `handleDroppedImageFiles()`

---

## 13. 字体管理

- 上传: 接受 .ttf/.otf/.woff/.woff2 → 创建 FontFace → 存入 IndexedDB
- 删除: 从数组 + IndexedDB + document.fonts 中移除
- 存储: IndexedDB `fonts` store + 云端同步（`/api/static-assets`）

---

## 14. 预设

### 标签色彩预设 (`tagColorPresets`)

```javascript
{ id, name, bg, text, shadow, shadowOpacity }
```
默认: 品牌绿 `#00D06C`、警示红 `#EF4444`

### 圆弧色彩预设 (`arcColorPresets`)

```javascript
{ id, name, cIn, cOut }
```
默认: 黄绿 `#FFCC00/#00D06C`、极简黑白 `#111827/#E5E7EB`

### 关键词标签 (`keywordTags`)

```javascript
{ id, name, prompt }
```
默认: 商业美食摄影、干净背景、高饱和色彩

---

## 15. 保存 / 导出

| 函数 | 用途 |
|------|------|
| `saveToPreset()` | 保存当前画板为版式 |
| `saveTemplatePack()` | 保存三画板套组 |
| `exportPNG()` | 导出当前画板为 PNG (3x) |
| `exportAssetBackup()` | 导出所有预设/字体/Logo 为 JSON |
| `importAssetBackupFile()` | 导入并上传到 Supabase |
| `extendFromHead()` | 一键延展（头图 → 开屏 + Banner） |

---

## 16. 数据持久化

### IndexedDB
- 数据库: `SuperFactoryDB`, v4
- Stores: `fonts`, `logos`, `referenceElements`, `state`

### localStorage
- Key: `sf_global_data`
- 存储: `tagColorPresets`, `arcColorPresets`, `keywordTags`, `referenceElements`

### 云端同步
- API: `SHARED_ASSETS_API = '/api/static-assets'`
- 方法: PUT (保存) / GET (加载)
- 认证: Bearer token from `localStorage['vf_access_token']`

---

## 17. 全局状态变量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `currentArtboardId` | `'head'` | 当前画板 ID |
| `currentRatio` | `'head'` | 当前画板比例 |
| `currentScale` | `1` | 画布缩放 |
| `activeLayerIds` | `[]` | 选中图层 ID 数组 |
| `customFonts` | `[]` | 自定义字体 |
| `layers` | `[]` | 当前画板图层 |
| `artboards` | `{}` | 所有画板数据 |
| `tagColorPresets` | `[...]` | 标签色彩预设 |
| `arcColorPresets` | `[...]` | 圆弧色彩预设 |
| `keywordTags` | `[...]` | AI 关键词标签 |
| `presetLibrary` | `[]` | 版式/套组预设 |
| `tagPresetLibrary` | `[]` | 标签组合预设 |
| `logoAssets` | `[]` | Logo 素材 |
| `referenceElements` | `[]` | 参考元素 |
| `textEditLayerId` | `null` | 正在编辑的文字图层 ID |
| `historyStack` | `[]` | 撤销历史 |
| `aiFeatureMode` | `'generate'` | AI 功能模式 |
| `aiProvider` | `'openai'` | AI 供应商 |
| `diySubtagFilter` | `'全部'` | 资产库子标签筛选 |
| `diySelectedSubtag` | `'全部'` | 保存时的子标签分配 |

---

## 18. 工具函数

| 函数 | 用途 |
|------|------|
| `genId(prefix)` | 生成唯一 ID |
| `cloneData(value)` | 深拷贝 (JSON) |
| `showToast(msg, isError)` | Toast 通知 |
| `escapeHtml(v)` | HTML 转义 |
| `normalizeAlpha(value)` | 透明度归一化 |
| `colorWithAlpha(color, alpha)` | 颜色+透明度 |
| `readImageSize(src)` | 读取图片原始尺寸 |
| `getLayerIcon(l)` | 图层类型图标 |
| `formatPresetTime()` | 格式化时间 |
| `getLayerBounds(l)` | 图层包围盒计算 |
| `notifyParent(msg)` | 发送消息到父窗口 |
| `capturePreviewForSync()` | 截取画板预览图 |
