# Static DIY — UI 交接文档（给 GPT 做 UI 重设计）

> 这是 GCC Design 平台的"静态设计师"模块，一个运行在 iframe 中的海报编辑工具。
> 请基于本文档理解完整功能和当前视觉实现，然后重新设计 HTML/CSS。
> **所有 JavaScript 功能代码必须保留原样**，只改 `<style>` 和 HTML 结构（DOM 元素的 class/id 不能变，可以改布局位置和 CSS 样式）。

---

## 一、运行环境

- 本页面运行在父窗口的 `<iframe>` 中
- 父窗口负责 Supabase 认证和数据存储
- 本页面通过 `window.parent.postMessage()` 与父窗口通信
- 引用外部资源：
  - `../../config.js` — Supabase 配置
  - `../../tool-auth-guard.js` — 认证守卫
  - `../vendor/html2canvas.min.js` — 截图库

---

## 二、CSS 变量体系

```css
:root {
    --primary: #2563EB;          /* 主蓝色 */
    --primary-hover: #1D4ED8;    /* hover */
    --bg-canvas: #F7F8FB;        /* 画布背景 */
    --panel-bg: #FFFFFF;         /* 面板背景 */
    --card-bg: #F8FAFC;          /* 卡片背景 */
    --border: #E4E7EC;           /* 边框色 */
    --text-main: #101828;        /* 主文字 */
    --text-sub: #667085;         /* 副文字 */
    --danger: #D92D20;           /* 危险/删除色 */
    --shadow: 0 16px 34px rgba(16,24,40,0.08);
}
```

### 当前使用的主要颜色

| 用途 | 颜色 |
|------|------|
| 页面背景 | `#FFFFFF` |
| 左栏背景 | `transparent` |
| 中栏(画板区)背景 | `#EAEAEA` |
| 右栏背景 | `transparent` |
| 卡片(module-card)背景 | `#EAEAEA` (浅灰) |
| 卡片标题左边装饰条 | `#D6D6D6` |
| 画板 wrapper 背景 | `#FFFFFF` |
| 资产库卡片背景 | `#FFFFFF` |
| 缩略图背景 | `#eef2f7` |
| 资产库 tab 按钮 | `#111827` (active), `#FFFFFF` (default) |
| 子标签选中 | `#0d9488` (teal) |
| 画板比例按钮 active | `#717171` |
| 导出按钮 | `#717171` (深灰) |
| 保存模版按钮 | `#10b981` / hover `#059669` (绿色) |
| 文本框编辑边框 | `#2563EB` (蓝色) |
| 文字内容 textarea | `#FFFFFF` 背景 |

---

## 三、当前布局结构（DOM 树）

```
<body>
  <!-- 隐藏的 file input -->
  <input id="font-upload">
  <input id="bg-upload">
  <input id="ai-reference-upload">
  <input id="reference-element-upload">
  <input id="logo-upload">
  <input id="component-upload">
  <input id="backup-import">

  <!-- 组件上传弹窗 -->
  <div id="component-upload-modal" class="modal-overlay">
    <div class="modal-content">...</div>
  </div>

  <!-- 导出遮罩 -->
  <div id="export-overlay" class="modal-overlay">...</div>

  <!-- 设置弹窗 -->
  <div id="settings-modal" class="modal-overlay">
    <!-- 字体管理 -->
    <div id="custom-font-list">
    <!-- 关键词标签 -->
    <div id="settings-keyword-tag-list">
    <!-- 标签色彩预设 -->
    <div id="settings-preset-list">
    <!-- 圆弧色彩预设 -->
    <div id="settings-arc-preset-list">
  </div>

  <!-- Toast -->
  <div id="toast" class="toast">

  <!-- ====== 工作区 tabs（头图/Banner/开屏切换） ====== -->
  <div class="workspace-tabs">
    <button class="artboard-tab" data-artboard="head">头图</button>
    <button class="artboard-tab" data-artboard="banner">Banner</button>
    <button class="artboard-tab" data-artboard="splash">开屏</button>
    <button class="workspace-overview-tab">总览</button>
    <!-- 自定义画板 tabs 动态插入 -->
    <!-- 新建画板菜单 -->
    <div class="new-artboard-menu-wrap">...</div>
  </div>

  <!-- ====== 三栏主布局 ====== -->
  <div class="editor-layout">

    <!-- 左栏: 资产库 -->
    <div class="asset-pane" id="asset-pane">
      <div class="module-card asset-library-card">
        <div class="card-title">
          <div class="card-title-wrap">资产库</div>
        </div>
        <!-- 三个 tab -->
        <div class="asset-tabs">
          <button class="asset-tab active" data-asset-tab="layout">模版</button>
          <button class="asset-tab" data-asset-tab="component">组件</button>
          <button class="asset-tab" data-asset-tab="reference">参考元素</button>
        </div>
        <!-- 子标签筛选行 -->
        <div id="diy-subtag-row">
        <!-- 资产卡片网格 -->
        <div class="asset-list" id="asset-list-ui">
      </div>
    </div>

    <!-- 中栏: 画板 -->
    <div class="left-pane" id="left-pane">
      <!-- 右上角工具栏 -->
      <div class="canvas-toolbar">
        <div class="canvas-actions">
          <button class="save-template-btn" id="canvas-save-btn">保存模版</button>
          <button class="primary">一键延展</button>
          <button class="primary">导出</button>
          <div class="toolbar-more-wrap">
            <button>更多</button>
            <div class="toolbar-more-menu" id="toolbar-more-menu">
              <button>尺寸</button>
              <button>设置</button>
              <button id="safe-guide-toggle">安全区</button>
            </div>
          </div>
        </div>
      </div>
      <!-- 画布 -->
      <div class="canvas-wrapper" id="canvas-wrapper">
        <div class="empty-hint" id="empty-hint">暂无背景，请生成或导入图片</div>
        <div id="dynamic-layers"></div>     <!-- 所有图层 DOM 动态插入这里 -->
        <div class="safe-guide" id="safe-guide"></div>
      </div>
      <!-- 总览模式预览 -->
      <div class="artboard-preview-dock" id="artboard-preview-dock">
      <!-- AI 进度 -->
      <div class="ai-loading" id="ai-loading">...</div>
    </div>

    <!-- 右栏: 图层 + 属性 + AI -->
    <div class="right-pane">
      <div class="pane-header">
        <h2>GCC Poster</h2>
        <button id="undo-btn">↶</button>
        <button id="redo-btn">↷</button>
        <button>设置</button>
      </div>
      <div class="pane-content">
        <!-- 图层模块 -->
        <div class="module-card layer-module-card" id="layer-module-card">
          <div class="card-title">
            <div class="card-title-wrap">图层</div>
            <button id="layer-canvas-fit-btn" hidden>⤢</button>
            <div class="add-menu-wrap">
              <button>+ 添加</button>
              <div class="add-menu" id="add-menu">...</div>
            </div>
          </div>
          <div class="layer-drop-zone" id="layer-drop-zone">拖入图片到图层</div>
          <div class="layer-list" id="layer-list-ui"></div>
        </div>
        <!-- 属性编辑模块 -->
        <div class="module-card">
          <div class="card-title"><div class="card-title-wrap">编辑</div></div>
          <div id="prop-edit-area"></div>   <!-- 属性面板动态渲染 -->
        </div>
        <!-- AI 生图模块 -->
        <div class="module-card">
          <div class="card-title"><div class="card-title-wrap">生图</div></div>
          <div class="ai-console">
            <div class="ai-reference-strip" id="ai-reference-strip">...</div>
            <div class="prompt-tag-list" id="prompt-tag-list"></div>
            <textarea id="ai-prompt-input"></textarea>
            <div class="ai-control-bar">
              <button id="ai-submit-btn">↑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- /editor-layout -->

  <!-- 小对话框容器 -->
  <div id="mini-dialog">

  <!-- 自定义画板弹窗容器 -->
  <div id="custom-artboard-dialog">
</body>
```

---

## 四、尺寸规范

| 元素 | 当前尺寸 |
|------|---------|
| 页面 padding | `34px 44px` |
| editor-layout gap | `30px` |
| asset-pane 宽度 | `260px` |
| right-pane 宽度 | `426px` (原 `390px`) |
| 画板按钮高度 | `28px` |
| 画板按钮 padding | `5px 16px` |
| module-card padding | `18px` (原设计) |
| module-card border-radius | `9px` |
| 卡片标题左边装饰条 | `width: 5px; height: 18px` |
| 资产卡片 border-radius | `8px` |
| 资产卡片缩略图 | 无固定比例，img `width: 100%; height: auto` |
| stepper 高度 | `28px` |
| stepper 按钮 | `28px × 28px`, border-radius `6px` |
| 文字内容 textarea | `min-height: 56px` |
| 字体大小 | 正文 `13px`, 小字 `11-12px`, 标题 `14px` |

---

## 五、CSS 关键样式（按区域）

### 5.1 全局

```css
body {
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", 'PingFang SC', sans-serif;
    background: #FFFFFF;
    display: flex; flex-direction: column;
    align-items: center; gap: 18px;
    padding: 34px 44px; margin: 0;
    color: var(--text-main);
    user-select: none;
    overflow: hidden;
}
```

### 5.2 工作区 tabs

```css
.workspace-tabs {
    width: min(1560px, 100%); height: 24px;
    display: flex; align-items: center; gap: 26px;
    font-size: 14px; font-weight: 520;
}
.workspace-tabs button { border: 0; background: transparent; cursor: pointer; }
.workspace-tabs button.active { font-weight: 880; }
```

### 5.3 三栏布局

```css
.editor-layout {
    display: flex; gap: 30px;
    max-width: 1560px; width: 100%;
    height: calc(100vh - 110px);
}
.asset-pane {
    width: 260px; flex-shrink: 0;
    background: transparent; display: flex; flex-direction: column;
    border: 0; box-shadow: none;
    overflow-y: auto; overflow-x: hidden;
}
.left-pane {
    flex: 1;
    background: #EAEAEA; border-radius: 9px;
    position: relative; display: flex;
    align-items: center; justify-content: center;
    overflow: hidden;
}
.right-pane {
    width: 426px; flex: 0 0 426px;
    background: transparent; display: flex; flex-direction: column;
    border: 0; box-shadow: none; overflow: hidden;
}
```

### 5.4 画板 wrapper

```css
.canvas-wrapper {
    position: absolute; left: 50%; top: 50%;
    background: #FFFFFF; box-shadow: none;
    overflow: hidden;
    transform-origin: center center;
}
```

### 5.5 画布工具栏

```css
.canvas-actions {
    position: absolute; right: 28px; top: 26px; z-index: 12;
    display: flex; gap: 8px;
}
.canvas-actions button {
    min-width: 70px; height: 28px;
    border: 1px solid #111827; border-radius: 999px;
    background: #FFFFFF; color: #111827;
    font-size: 12px; font-weight: 800;
}
.canvas-actions button.primary {
    background: #717171; border-color: #717171; color: #FFFFFF;
}
.canvas-actions button.save-template-btn {
    background: #10b981; border-color: #059669; color: #FFFFFF;
}
```

### 5.6 画板比例导航

```css
.ratio-nav {
    position: absolute; top: 26px; left: 50%;
    transform: translateX(-50%); z-index: 10;
    display: flex; gap: 8px;
}
.ratio-nav button {
    background: #FFFFFF; border: 1px solid #111827;
    padding: 5px 16px; border-radius: 999px;
    font-size: 12px; font-weight: 760;
}
.ratio-nav button.active {
    background: #717171; border-color: #717171; color: #FFFFFF;
}
```

### 5.7 右侧面板

```css
.pane-content {
    flex: 1; overflow-y: auto; padding: 0;
    display: flex; flex-direction: column; gap: 18px;
}
.module-card {
    background: #EAEAEA; border-radius: 9px; padding: 18px; border: 0;
}
.card-title {
    font-size: 13px; font-weight: 800; color: var(--text-main);
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
}
.card-title::before {
    content: ''; display: block;
    width: 5px; height: 18px;
    background: #D6D6D6; border-radius: 4px;
    margin-right: 8px;
}
```

### 5.8 资产库

```css
.asset-tabs {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
    margin-bottom: 12px;
}
.asset-tab {
    border: 1px solid var(--border); background: #FFFFFF;
    border-radius: 9px; padding: 8px 6px;
    font-size: 12px; font-weight: 800; cursor: pointer; color: var(--text-sub);
}
.asset-tab.active {
    background: var(--text-main); border-color: var(--text-main);
    color: #FFFFFF;
}
.asset-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    flex: 1; overflow-y: auto;
}
.asset-item {
    border-radius: 8px; overflow: hidden; cursor: pointer;
}
.asset-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(15,23,42,0.12);
}
.asset-thumb {
    width: 100%; background: transparent;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
}
.asset-thumb img { width: 100%; height: auto; display: block; }
.asset-name {
    font-size: 11px; font-weight: 600; color: var(--text-main);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.asset-meta { display: none; }
```

### 5.9 子标签筛选

```css
.filter-capsule {
    border: 1px solid #d1d5db; border-radius: 999px;
    background: #ffffff; color: #374151;
    font-size: 13px; font-weight: 600;
    padding: 4px 14px; cursor: pointer;
    white-space: nowrap;
}
.filter-capsule.active { background: #0d9488; color: #fff; border-color: #0d9488; }
```

### 5.10 图层样式

```css
.layer-base {
    position: absolute; pointer-events: none;
}
.is-active-layer {
    outline: 3px dashed var(--primary); outline-offset: 4px;
}
.layer-image-wrapper, .layer-text-wrapper, .layer-tag-wrapper {
    position: absolute; cursor: grab; transform-origin: center center;
    pointer-events: auto;
}
.layer-image-wrapper:active, .layer-text-wrapper:active {
    cursor: grabbing;
}
```

### 5.11 Stepper 数字步进器

```css
.stepper-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.stepper-label { font-size: 12px; color: var(--text-sub); font-weight: 600; width: 42px; flex-shrink: 0; }
.stepper-btn { width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 6px; background: #fff; cursor: pointer; }
.stepper-value { flex: 1; height: 28px; border: 1px solid var(--border); border-radius: 6px; text-align: center; font-size: 13px; font-weight: 600; cursor: ew-resize; background: #fff; }
.stepper-unit { font-size: 11px; color: var(--text-sub); width: 20px; flex-shrink: 0; }
```

### 5.12 文字编辑

```css
.layer-text-editing .layer-text-content {
    outline: 2px solid #2563EB; outline-offset: 3px; border-radius: 2px;
}
```

### 5.13 弹窗

```css
.modal-overlay {
    position: fixed; inset: 0; z-index: 10001;
    display: flex; align-items: center; justify-content: center;
    background: rgba(17,24,39,0.28); backdrop-filter: blur(4px);
}
.modal-content {
    background: #FFFFFF; border-radius: 16px; padding: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    max-height: 80vh; overflow-y: auto;
}
```

### 5.14 输入控件

```css
.input-text, .input-select, .textarea {
    width: 100%; padding: 11px 12px;
    border: 1px solid var(--border); border-radius: 8px;
    font-size: 13px; font-weight: 600;
    color: var(--text-main); background: #FFFFFF;
    margin-bottom: 12px;
}
.btn {
    width: 100%; padding: 11px 12px; border: none;
    border-radius: 8px; cursor: pointer;
    font-weight: 750; font-size: 13px;
}
```

---

## 六、交互模型总结

### 6.1 图层选择与操作
- **单击画布图层** → 选中（蓝色虚线边框）
- **Shift+单击** → 追加选中
- **拖拽图层** → 移动位置（Shift 约束轴）
- **Delete/Backspace** → 删除选中图层
- **双击文字** → 进入编辑模式（contenteditable）
- **Enter**（选中文字时）→ 进入编辑
- **Escape** → 退出编辑

### 6.2 资产库
- **单击模板卡片** → 应用到画板
- **✖ 按钮** → 确认后删除模板
- **切换 tab** → 改变显示内容
- **点击子标签** → 筛选 + 设置保存时的分类
- **拖拽图片到组件区** → 弹出上传弹窗选分类

### 6.3 属性面板
- **Stepper**: 拖拽滑动调整 / ±按钮微调 / 双击输入精确值 / Shift 10x
- **颜色选择器**: 标准 `<input type="color">`
- **对齐按钮**: 点击即生效
- **文字方向**: EN/AR 切换按钮

### 6.4 画板
- **比例按钮** → 切换画板尺寸
- **新建画板** → 自定义宽高
- **✖ 删除自定义画板**
- **总览模式** → 同时预览所有画板

---

## 七、约束条件（绝对不能改的）

### 7.1 不能改的 ID

以下元素 ID 被 JavaScript 引用，**必须保留**：

`left-pane`, `canvas-wrapper`, `dynamic-layers`, `empty-hint`, `safe-guide`, `artboard-preview-dock`, `ai-loading`, `ai-loading-text`, `ai-progress-bar`, `asset-pane`, `asset-list-ui`, `diy-subtag-row`, `canvas-save-btn`, `toolbar-more-menu`, `safe-guide-toggle`, `undo-btn`, `redo-btn`, `layer-module-card`, `layer-canvas-fit-btn`, `add-menu`, `layer-drop-zone`, `layer-list-ui`, `prop-edit-area`, `ai-reference-strip`, `prompt-tag-list`, `ai-prompt-input`, `ai-feature-label`, `ai-feature-menu`, `ai-provider-label`, `ai-provider-menu`, `ai-submit-btn`, `settings-modal`, `settings-keyword-tag-list`, `settings-preset-list`, `settings-arc-preset-list`, `custom-font-list`, `font-upload`, `bg-upload`, `ai-reference-upload`, `reference-element-upload`, `logo-upload`, `component-upload`, `backup-import`, `component-upload-modal`, `comp-upload-files-info`, `comp-upload-tags`, `comp-upload-confirm`, `comp-upload-msg`, `export-overlay`, `custom-artboard-dialog`, `mini-dialog`, `toast`

### 7.2 不能改的 class（被 JS 选择器引用）

`.layer-base`, `.layer-image-wrapper`, `.layer-text-wrapper`, `.layer-tag-wrapper`, `.layer-arc-wrapper`, `.layer-solid-wrapper`, `.is-active-layer`, `.asset-item`, `.asset-thumb`, `.asset-name`, `.asset-meta`, `.asset-tab`, `.filter-capsule`, `.stepper-row`, `.stepper-label`, `.stepper-btn`, `.stepper-value`, `.stepper-unit`, `.layer-text-content`, `.module-card`, `.card-title`, `.canvas-actions`, `.save-template-btn`, `.primary`, `.left-pane.drag-file-over`, `.left-pane.overview-mode`, `.ratio-nav button`

### 7.3 不能改的 JS 函数（被 HTML onclick 调用）

所有 `window.xxx` 函数和全局函数都通过 onclick/oninput/onchange 内联调用，不能改名或删除。包括但不限于：

`saveActiveAsset`, `extendFromHead`, `exportPNG`, `toggleToolbarMore`, `closeToolbarMore`, `openCustomArtboardDialog`, `openSettingsModal`, `toggleSafeGuide`, `undoAction`, `redoAction`, `switchAssetTab`, `toggleAIMenu`, `selectAIFeature`, `selectAIProvider`, `runSelectedAIAction`, `addLayer`, `deleteLayer`, `toggleLock`, `centerLayer`, `updateProp`, `applyImageFitMode`, `toggleFlipX`, `saveTemplatePack`, `exportAssetBackup`, `addTagPreset`, `deleteTagPreset`, `updateTagPreset`, `addArcPreset`, `deleteArcPreset`, `updateArcPreset`, `addKeywordTag`, `deleteKeywordTag`, `updateKeywordTag`, `deleteFont`, `applyTagColor`, `applyArcColor`, `switchReferenceCategory`, `addReferenceElementToAI`, `deleteReferenceElement`, `selectCompUploadTag`, `closeComponentUploadModal`, `confirmComponentUpload`, `centerLayer`, `stepperAdjust`, `stepperStartScrub`, `stepperStartInput`, `setTextMode`, `toggleOverviewMode`, `toggleNewArtboardMenu`, `closeNewArtboardMenu`, `syncTextEdit`, `fitCanvasToSelectedImage`, `exportAllArtboards`

### 7.4 不能改的事件监听

- `#canvas-wrapper` mousedown / window mousemove / window mouseup（图层选择+拖拽）
- `#logo-upload` change, `#bg-upload` change, `#font-upload` change
- `#component-upload` change
- `#reference-element-upload` change, `#ai-reference-upload` change
- `#backup-import` change
- `document` keydown × 2 (undo/redo + delete/enter/escape)
- `window` resize → `resizeCanvas()`
- `window` message → 处理父窗口通信

### 7.5 布局约束

- 三栏 flex 布局必须保持（`.editor-layout` 内三个子元素）
- 左栏、中栏、右栏的顺序不能变
- `#canvas-wrapper` 必须在中栏内，使用 `position: absolute; left: 50%; top: 50%; transform` 居中
- `#dynamic-layers` 必须在 `#canvas-wrapper` 内
- 图层 DOM 元素通过 `createLayerElement()` 动态插入 `#dynamic-layers`，不要改变这个机制
- 属性面板 `#prop-edit-area` 的内容完全由 `renderProperties()` 动态生成，不要预设内容
- 资产库 `#asset-list-ui` 的内容完全由 `renderAssetLibrary()` 动态生成

---

## 八、当前 UI 问题（可以改善的地方）

1. **颜色过于单调** — 大量使用灰色（#EAEAEA, #717171），缺乏品牌识别度
2. **卡片风格不统一** — module-card 是灰色圆角，asset-item 是白色无边框
3. **右栏面板布局拥挤** — 所有属性挤在一个 module-card 里，信息层级不清
4. **字体大小偏小** — stepper 标签 12px，资产卡片名称 11px
5. **间距不规则** — 有些地方 gap 8px，有些 10px，有些 14px
6. **缺少 hover 反馈** — asset-item 有 hover 但很多按钮没有
7. **画板区空白过大** — left-pane 的 `padding` 效果导致画板外有大量灰色空间
8. **工具栏按钮风格** — 深灰色圆按钮不够醒目
9. **图层列表** — 拖拽手柄不明显，锁定/删除按钮太小
10. **AI 面板** — 参考图 strip 布局复杂，提示词输入区太小
11. **设置弹窗** — 内容过多，分组不清晰
12. **缺少暗色模式**

---

## 九、建议的 UI 改进方向

1. 统一使用白色卡片 + 浅阴影，类似 Figma 的右侧面板风格
2. 属性面板按功能分组：文本内容 → 字体 → 布局 → 间距 → 效果
3. 增大字体和间距，提高可读性
4. 画板区缩小灰色背景面积（减小 padding）
5. 为所有交互元素添加 hover/active 状态
6. stepper 可与 Figma 风格统一（圆角更大、hover 显示边框）
7. 资产库卡片与素材库风格完全一致（纯图片 + 圆角 + hover 上浮）
8. 工具栏按钮可以更醒目（绿色保存按钮已经不错）
9. 添加图标（如用 emoji 或 SVG 小图标代替纯文字）

---

## 十、交付要求

请提供一个新的 `frontend.html` 文件，其中：
- `<style>` 块完全重写
- HTML 结构可调整布局位置、添加包装 div、改 class，但 **所有 ID 必须保留**
- 不要修改任何 `<script>` 标签内的 JavaScript 代码
- 内联的 `onclick`/`oninput`/`onchange` 属性必须保留
- 新增 CSS class 可以，但不要删除上述"不能改的 class"
