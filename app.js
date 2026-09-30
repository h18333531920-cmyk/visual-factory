(function () {
  // 案例库上传样式随 app.js 注入：部分浏览器把 styles.css 连版本参数一起死缓存，
  // HTML/JS 每次都更新而 CSS 永远不更新，这些规则必须与 JS 同源。
  (function injectCaseStyles() {
    const cssLink = document.querySelector('link[href*="styles.css"]');
    if (cssLink && !cssLink.dataset.busted) {
      cssLink.dataset.busted = '1';
      cssLink.href = cssLink.href.split('?')[0] + '?cb=' + Date.now();
    }
    if (document.getElementById('case-upload-styles')) return;
    const style = document.createElement('style');
    style.id = 'case-upload-styles';
    style.textContent = `
.library-form-grid.library-form-grid-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
/* 物料所有者那行：给名字让位，两个链接自适应变窄（owner 1.8 份 : 链接各 1 份） */
.library-form-grid.library-form-grid-owner { grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr) minmax(0, 1fr); }
@media (max-width: 900px) { .library-form-grid.library-form-grid-owner { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr); } }
.case-upload-box { border: 0; background: transparent; }
.zone-title { font-size: 13px; font-weight: 600; color: #334155; margin: 2px 0 6px; }
.drop-zone-icon { color: #94a3b8; display: flex; justify-content: center; margin-bottom: 6px; }
.drop-zone-icon svg { width: 34px; height: 34px; }
.library-drop-zone strong { font-size: 13px; color: #475569; font-weight: 500; }
.case-drop-zone { display: flex; align-items: center; gap: 14px; text-align: left; padding: 14px 16px; }
.case-drop-zone .case-zone-head { display: flex; align-items: center; gap: 14px; }
.case-drop-zone .case-zone-icon { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 12px; background: #eef2ff; color: #6366f1; display: flex; align-items: center; justify-content: center; }
.case-drop-zone .case-zone-icon svg { width: 26px; height: 26px; }
.case-zone-texts { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.case-zone-texts strong { font-size: 14px; color: #0f172a; font-weight: 650; }
.case-zone-texts span { font-size: 12.5px; color: #667085; }
.case-zone-texts small { font-size: 12px; color: #98a2b3; }
[data-upload-mode="source"] { display: grid; gap: 12px; align-content: start; }
datalist { display: none; }
.library-drop-zone { text-align: center; justify-items: center; }
.case-drop-zone, .case-drop-zone .case-zone-head { text-align: left; justify-items: start; }
.drop-zone-icon { margin-bottom: 8px; }
.drop-zone-icon svg { width: 40px; height: 40px; }
/* 视频物料在各处容器的尺寸约束（img 的规则不作用于 video） */
.case-side-imgwrap video, .case-pop-thumb video, .case-drop-thumb video { width: 100%; height: auto; display: block; background: #f1f5f9; }
.case-pop-thumb video { border-radius: 8px; }
.case-side-row .case-side-imgwrap video { width: 56px; height: 56px; object-fit: cover; }
.case-side-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.case-side-tools { display: flex; gap: 6px; }
.case-tool-btn { display: inline-flex; align-items: center; padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 11.5px; color: #475569; cursor: pointer; transition: background 160ms ease; white-space: nowrap; }
.case-tool-btn:hover { background: #f1f5f9; }
.case-tool-btn.active { background: #eef2ff; border-color: #c7d2fe; color: #4338ca; }
.case-side-type { position: absolute; top: 4px; left: 4px; z-index: 2; padding: 2px 7px; border-radius: 999px; background: rgba(15, 23, 42, 0.62); color: #fff; font-size: 10.5px; line-height: 1.45; }
.case-side-type.untyped { background: rgba(100, 116, 139, 0.66); }
.case-side-type-text { padding: 1px 7px; border-radius: 999px; background: #eef2f7; color: #475569; font-size: 10.5px; }
/* ── 多选（批量改类型/删除）：只在选中模式出现勾选框，底部才出现操作条 ── */
.case-side-check { position: absolute; top: 4px; right: 4px; z-index: 3; width: 17px; height: 17px; border-radius: 5px; border: 1.5px solid #fff; background: rgba(15, 23, 42, 0.34); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25); }
.case-side-check.is-on { border-color: #16a34a; background: #16a34a; }
.case-side-check.is-on::after { content: ''; position: absolute; left: 4.6px; top: 1.4px; width: 4.6px; height: 8.4px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(42deg); }
.case-side-grid.is-selecting .case-side-card, .case-side-grid.is-selecting .case-side-row { cursor: pointer; }
/* 选中态要压过 :hover 的描边（同权重时后者在后，所以这里加一层 .case-side-grid 提权重） */
.case-side-grid.is-selecting .case-side-card.is-selected, .case-side-grid.is-selecting .case-side-row.is-selected { border-color: #16a34a; background: #f0fdf4; }
.case-side-grid.is-selecting .case-side-card.is-selected:hover, .case-side-grid.is-selecting .case-side-row.is-selected:hover { border-color: #16a34a; }
.case-side-card.is-selected .case-side-imgwrap { box-shadow: 0 0 0 2px #16a34a inset; }
.case-select-bar { display: none; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; padding-top: 10px; border-top: 1px solid #eceff3; }
.case-side.is-selecting .case-select-bar { display: flex; }
.case-select-count { flex: 1 1 auto; min-width: 0; font-size: 11.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.case-select-bar .case-tool-btn:disabled { color: #cbd5e1; border-color: #eef1f5; background: #fafbfc; cursor: not-allowed; }
.case-select-bar .case-tool-btn.is-danger { color: #dc2626; border-color: #fecaca; }
.case-select-bar .case-tool-btn.is-danger:disabled { color: #cbd5e1; border-color: #eef1f5; }
/* 右键菜单里的「语言」一行：英语 / 阿语 / 无 / AI 识别 */
.case-type-menu-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; padding: 6px 8px 2px; border-top: 1px solid #f1f5f9; }
.case-type-menu-rowlabel { flex: 0 0 auto; font-size: 11px; color: #94a3b8; margin-right: 2px; }
.case-type-menu .case-type-menu-rowchip { display: inline-flex; align-items: center; width: auto; padding: 3px 8px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; font-size: 11.5px; color: #475569; cursor: pointer; }
.case-type-menu .case-type-menu-rowchip:hover { background: #f1f5f9; }
.case-type-menu .case-type-menu-rowchip.active { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; font-weight: 600; }
.case-type-menu-rowhint { font-size: 11px; color: #b45309; }
/* 列表视图缩略图只有 56px 宽，图上的类型标签放不下：只在右侧文字里显示 */
.case-side-row .case-side-type { display: none; }
.case-side-imgwrap .case-side-del { top: 4px; right: 4px; left: auto; }
.case-side-name { margin-top: 4px; font-size: 11px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-side-rowfile { color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
.case-side-grid.view-list { display: flex; flex-direction: column; gap: 8px; }
.case-side-row { display: flex; align-items: center; gap: 10px; border: 2px solid transparent; border-radius: 10px; padding: 4px; background: #fff; cursor: pointer; transition: border-color 160ms ease; }
.case-side-row:hover { border-color: #cbd5e1; }
.case-side-row.active { border-color: #16a34a; }
.case-side-row .case-side-imgwrap { flex: 0 0 auto; width: 56px; }
.case-side-row .case-side-imgwrap img { width: 56px; height: 56px; object-fit: cover; }
.case-side-rowmeta { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #64748b; }
.case-add-row { justify-content: center; border: 1.5px dashed #cbd5e1; color: #667085; }
.case-add-row span { font-size: 16px; }
.case-add-row small { font-size: 12px; }
.case-side-empty { padding: 18px; text-align: center; color: #98a2b3; font-size: 12px; }
/* ── 项目弹窗：极简创意素材浏览器风格（v615） ── */
.case-project-modal { width: min(1100px, 96vw); border-radius: 20px; box-shadow: 0 32px 80px rgba(15, 23, 42, 0.16); }
.case-project-head { padding: 26px 32px 16px; align-items: flex-start; }
.case-project-titlewrap { min-width: 0; }
.case-title-row h2 { font-size: 21px; font-weight: 650; letter-spacing: -0.01em; }
.case-project-sub { margin-top: 8px; font-size: 12.5px; color: #8a94a6; }
.case-owner-line { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12.5px; color: #8a94a6; }
.case-owner-line b { color: #4b5563; font-weight: 600; }
.case-tag-chip { background: #f1f5f9; color: #64748b; }
.case-project-link { padding: 0; border: 0; background: transparent; color: #64748b; text-decoration: underline; text-underline-offset: 2px; }
.case-project-link:hover { background: transparent; color: #0f172a; }
.case-text-btn { padding: 0; border: 0; background: transparent; font-size: 12.5px; color: #2563eb; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.case-text-btn:hover { color: #1d4ed8; }
.case-text-btn:disabled { color: #cbd5e1; text-decoration: none; cursor: not-allowed; }
.case-project-body { grid-template-columns: minmax(0, 1.55fr) minmax(280px, 1fr); gap: 26px; padding: 0 32px 8px; max-height: 66vh; }
.case-stage-card { background: #fafbfc; border: 0; border-radius: 16px; padding: 18px; }
.case-stage img { border-radius: 8px; }
.case-nav-btn { width: 34px; height: 34px; border: 0; background: rgba(255, 255, 255, 0.92); color: #475569; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08); opacity: 0; transition: opacity 200ms ease; }
.case-stage-card:hover .case-nav-btn, .case-stage-card:focus-within .case-nav-btn { opacity: 1; }
.case-expand-btn { bottom: 54px; right: 26px; opacity: 0; transition: opacity 200ms ease; }
.case-stage-card:hover .case-expand-btn { opacity: 1; }
.case-stage-info { margin-top: 10px; text-align: center; font-size: 11.5px; color: #a3adbd; opacity: 0; transition: opacity 200ms ease; }
.case-stage-card:hover .case-stage-info { opacity: 1; }
.case-side { background: transparent; border: 0; padding: 0; }
.case-side-head { margin-bottom: 12px; }
.case-side-title { font-size: 12.5px; font-weight: 500; color: #8a94a6; }
.case-side-title b { color: #334155; font-weight: 650; }
.case-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #94a3b8; cursor: pointer; transition: background 200ms ease, color 200ms ease; }
.case-icon-btn:hover { background: #f1f5f9; color: #475569; }
.case-icon-btn svg { width: 15px; height: 15px; }
.case-icon-btn-wide { width: auto; padding: 0 8px; font-size: 11.5px; color: #8a94a6; }
.case-side-card { border: 1px solid transparent; border-radius: 12px; padding: 6px; }
.case-side-card:hover { border-color: #e8ecf1; }
.case-side-card.active { border-color: rgba(15, 23, 42, 0.26); }
.case-cover-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #f4f5f7; }
.library-thumb img { transition: opacity 180ms ease; }
.case-card-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.case-chip { padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: 11px; line-height: 1.6; }
.case-side-imgwrap { border-radius: 8px; }
.case-side-file { margin-top: 6px; font-size: 11.5px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-side-row { border: 1px solid transparent; border-radius: 10px; padding: 5px 6px; }
.case-side-row:hover { border-color: #e8ecf1; }
.case-side-row.active { border-color: rgba(15, 23, 42, 0.26); }
.case-side-row .case-side-imgwrap { width: 48px; }
.case-side-row .case-side-imgwrap img { width: 48px; height: 48px; }
.case-side-rowmeta { gap: 10px; }
.case-side-dims { font-size: 11px; color: #b6bfcc; }
.case-project-foot { border-top: 0; padding: 14px 32px 24px; justify-content: flex-end; }
.case-foot-actions { display: flex; align-items: center; gap: 16px; flex: 0 0 auto; }
.case-foot-actions button { flex: 0 0 auto; white-space: nowrap; }
.case-primary-btn { padding: 10px 20px; border: 0; border-radius: 10px; background: #2563eb; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 200ms ease; }
.case-primary-btn:hover { background: #1d4ed8; }
.case-primary-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
.case-orange-btn { padding: 10px 20px; border: 0; border-radius: 10px; background: #f97316; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 200ms ease; }
.case-orange-btn:hover { background: #ea580c; }
.case-secondary-btn { padding: 9px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; color: #475569; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 200ms ease, border-color 200ms ease; }
.case-secondary-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
.case-secondary-btn:disabled { color: #cbd5e1; border-color: #eef1f5; background: #fafbfc; cursor: not-allowed; }
.case-project-foot { justify-content: flex-end; }
.case-project-foot .case-secondary-btn { padding: 10px 18px; }
.case-append-progress { position: absolute; left: 50%; bottom: 88px; transform: translateX(-50%); z-index: 5; display: inline-flex; align-items: center; gap: 10px; padding: 10px 18px; background: rgba(15, 23, 42, 0.88); color: #fff; border-radius: 999px; font-size: 12.5px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25); }
.case-append-progress[hidden] { display: none !important; }
.case-append-bar { flex: 0 0 auto; width: 132px; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.28); overflow: hidden; }
.case-append-bar-fill { display: block; width: 0; height: 100%; border-radius: 999px; background: #fff; transition: width 160ms ease; }
.case-spinner { width: 13px; height: 13px; border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; border-radius: 50%; animation: case-spin 0.8s linear infinite; }
@keyframes case-spin { to { transform: rotate(360deg); } }
.case-project-modal { position: relative; }
.case-edit-modal { width: min(760px, 94vw); }
.case-edit-body { display: grid; gap: 16px; padding: 4px 32px 24px; overflow-y: auto; max-height: 60vh; }
.case-edit-body label > span { display: block; margin-bottom: 6px; font-size: 12.5px; color: #64748b; }
.case-edit-body input, .case-edit-body select { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; color: #0f172a; background: #fff; }
.case-edit-body .case-field-secondary > span { color: #b7c0cc; font-size: 12px; }
.case-edit-body .case-field-secondary input { border-color: #f1f4f8; background: #fbfcfd; color: #64748b; }
.case-side-overlay { position: absolute; left: 0; right: 0; bottom: 0; padding: 24px 8px 7px; background: linear-gradient(to top, rgba(0, 0, 0, 0.74), rgba(0, 0, 0, 0)); opacity: 0; transition: opacity 180ms ease; pointer-events: none; }
.case-side-overlay span { display: block; color: #fff; font-size: 10.5px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-side-imgwrap:hover .case-side-overlay, .case-side-row:hover .case-side-overlay { opacity: 1; }
.case-side-overlay.case-side-renaming { opacity: 1; pointer-events: auto; }
.case-side-overlay .case-side-rename-input { display: block; width: 100%; box-sizing: border-box; padding: 3px 6px; border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 5px; color: #0f172a; background: #fff; font-family: inherit; font-size: 10.5px; font-weight: 600; }
.case-side-row { padding: 4px 6px; }
.library-drop-zone[data-case-preview] { border: 0 !important; background: transparent !important; min-height: 0 !important; border-radius: 0 !important; }
.case-drop-panel { height: 280px; overflow-y: auto; overflow-x: hidden; background: transparent; align-content: start; padding: 0 10px 10px; }
.case-drop-panel[hidden] { display: none !important; }
.library-modal { display: flex; flex-direction: column; max-height: 92vh; }
.library-upload-scroll { flex: 1 1 auto; overflow-y: auto; min-height: 0; }
.library-upload-footer { flex: 0 0 auto; }
.case-drop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 10px; width: 100%; padding: 10px; }
.case-drop-card { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 150px; }
.case-drop-thumb { position: relative; border-radius: 10px; overflow: hidden; background: #f3f4f6; border: 1px solid #e8eaee; line-height: 0; text-align: center; }
.case-drop-thumb img { display: block; width: auto; height: auto; max-width: 100%; max-height: 165px; margin: 0 auto; }
.case-drop-thumb .drop-thumb-del { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border: 0; border-radius: 999px; background: rgba(15,23,42,0.55); color: #fff; font-size: 13px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.case-type-chip { width: 100%; border: 1px solid #d8dee6; border-radius: 999px; background: #fff; color: #334155; font-size: 12px; line-height: 1.4; padding: 4px 10px; cursor: pointer; text-align: center; }
.case-type-chip:focus { outline: 2px solid #c7d7fe; outline-offset: 1px; }
.case-type-chip.untyped { color: #98a2b3; background: #f8fafc; border: 1px dashed #cbd5e1; }
.case-drop-card small { font-size: 11px; color: #667085; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* ── 上传弹窗：素材浏览器化（v620） ── */
.library-kind-card-grid { display: flex; width: 100%; gap: 3px; padding: 4px; background: #f1f5f9; border-radius: 12px; }
.library-kind-card { flex: 1 1 0; border: 0; background: transparent; border-radius: 9px; padding: 10px 0; color: #64748b; font-size: 13.5px; font-weight: 500; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
.library-kind-card.active { background: #fff; color: #0f172a; font-weight: 600; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08); }
.case-field-secondary > span { color: #b7c0cc !important; font-weight: 400 !important; font-size: 12px; }
.case-field-secondary input { border-color: #f1f4f8 !important; background: #fbfcfd; color: #64748b; }
.case-field-secondary input::placeholder { color: #c3cbd6; }
.case-drop-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; padding: 12px 14px 16px; }
.case-drop-card { position: relative; display: flex; flex-direction: column; gap: 6px; max-width: 200px; }
.case-drop-thumb { position: relative; height: 152px; border-radius: 10px; overflow: hidden; background: #f4f5f7; display: flex; align-items: center; justify-content: center; }
.case-drop-thumb img, .case-drop-thumb video { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; }
.case-drop-mp4 { position: absolute; right: 6px; bottom: 6px; padding: 2px 7px; border-radius: 999px; background: rgba(15, 23, 42, 0.62); color: #fff; font-size: 10px; letter-spacing: 0.04em; }
.case-stage video { max-width: 100%; max-height: 100%; border-radius: 8px; background: #000; }
.case-drop-name { font-size: 11px; line-height: 1.4; color: #9aa4b2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-drop-type { position: absolute; left: 6px; bottom: 6px; z-index: 3; padding: 3px 9px; border: 0; border-radius: 999px; background: rgba(15, 23, 42, 0.66); color: #fff; font-size: 10.5px; line-height: 1.4; cursor: pointer; opacity: 0; transition: opacity 180ms ease; }
.case-drop-type.untyped { background: rgba(100, 116, 139, 0.7); }
.case-drop-type[data-gallery-type-chip] { opacity: 1; }
.case-drop-type.is-detecting { background: rgba(37, 99, 235, 0.72); }
.case-drop-card:hover .case-drop-type, .case-drop-card:focus-within .case-drop-type { opacity: 1; }
.case-drop-thumb .drop-thumb-del { position: absolute; top: 6px; right: 6px; display: none; width: 22px; height: 22px; border: 0; border-radius: 999px; background: rgba(15, 23, 42, 0.6); color: #fff; font-size: 13px; line-height: 1; cursor: pointer; align-items: center; justify-content: center; }
.case-drop-card:hover .case-drop-thumb .drop-thumb-del { display: flex; }
.case-type-hidden { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; border: 0; padding: 0; }
.case-type-menu { position: fixed; z-index: 320; min-width: 132px; padding: 6px; background: #fff; border: 1px solid #e8eaee; border-radius: 10px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18); }
.case-type-menu button { display: block; width: 100%; text-align: left; padding: 7px 10px; border: 0; border-radius: 8px; background: transparent; font-size: 12.5px; color: #334155; cursor: pointer; }
.case-type-menu button:hover { background: #f1f5f9; }
.case-type-menu button.active { background: #eef2ff; color: #4338ca; font-weight: 600; }
.case-type-menu button[data-material-rename] { margin-top: 4px; border-top: 1px solid #f1f5f9; }
.case-type-menu button[data-set-cover] { margin-top: 4px; border-top: 1px solid #f1f5f9; }
.case-type-menu button.danger { color: #dc2626; margin-top: 4px; border-top: 1px solid #f1f5f9; }
.case-type-menu button.danger:hover { background: #fef2f2; }
.case-upload-box { margin-bottom: 4px; }
[data-gallery-preview] { display: block; text-align: center; }
.drop-zone-head { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.library-upload-footer { border-top: 1px solid #eef1f5; background: #fff; padding: 14px 24px 18px; }
.library-upload-footer .modal-actions { gap: 12px; }
.library-upload-footer .ghost-btn { border: 0; color: #8a94a6; }
.library-upload-footer .primary-btn { padding: 10px 22px; }
#library-upload-message { flex: 1 1 auto; min-width: 0; }
.upload-progress-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.upload-progress-bar-wrap { flex: 1 1 auto; min-width: 140px; height: 8px; border-radius: 999px; background: #e8edf5; overflow: hidden; }
.upload-progress-bar-fill { height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, #6366f1, #2563eb); transition: width 180ms ease; }
.upload-progress-text { flex: 0 0 auto; font-size: 12.5px; font-weight: 650; color: #2563eb; font-variant-numeric: tabular-nums; }
.upload-progress-count { flex: 0 0 auto; font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) { .library-form-grid.library-form-grid-three { grid-template-columns: 1fr; } }
/* 项目卡的信息收进封面（v735）：默认只显示封面，hover/focus 时底部浮出黑色渐变，
   上面是标题、国家/活动标签与物料数——和模板卡的悬停信息同一种形式。 */
.library-case-card .case-card-overlay { position: absolute; inset: auto 0 0; z-index: 4; display: flex; flex-direction: column; gap: 7px; padding: 30px 12px 11px; background: linear-gradient(180deg, rgba(5, 8, 12, 0) 0%, rgba(5, 8, 12, 0.5) 55%, rgba(5, 8, 12, 0.9) 100%); opacity: 0; pointer-events: none; transform: translateY(6px); transition: opacity 200ms ease 30ms, transform 200ms cubic-bezier(0.16, 1, 0.3, 1) 30ms; }
.library-case-card:hover .case-card-overlay,
.library-case-card:focus-within .case-card-overlay { opacity: 1; transform: translateY(0); }
.library-case-card .case-card-overlay strong { overflow: hidden; color: #fff; font-size: 13.5px; font-weight: 820; line-height: 1.3; letter-spacing: -0.015em; text-overflow: ellipsis; text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5); white-space: nowrap; }
.library-case-card .case-card-overlay .case-card-chips { gap: 5px; }
.library-case-card .case-card-overlay .case-chip { background: rgba(255, 255, 255, 0.2); color: #fff; }
.library-case-card .case-card-overlay .case-card-count { font-size: 11.5px; color: rgba(255, 255, 255, 0.82); }
/* 悬停浮窗：尺寸压到不遮挡相邻卡片，且 pointer-events: none —— 鼠标可以直接
   移到被浮窗盖住的下一张卡片上，浮窗自己切换内容，不用先移开等它消失 */
.case-hover-pop { position: fixed; z-index: 150; display: none; flex-wrap: wrap; align-items: flex-start; gap: 10px; width: max-content; max-width: 300px; max-height: 64vh; overflow: hidden; padding: 10px; background: rgba(255, 255, 255, 0.72); -webkit-backdrop-filter: blur(18px) saturate(1.5); backdrop-filter: blur(18px) saturate(1.5); border: 1px solid rgba(255, 255, 255, 0.65); border-radius: 12px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16); pointer-events: none; }
/* 同尺寸成组：竖版行内换行、横版列内换行（列高封顶 56vh），保证内容始终装得下 */
.case-pop-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
.case-pop-group.is-portrait { flex-direction: row; }
.case-pop-group.is-landscape { flex-direction: column; max-height: 56vh; }
.case-pop-thumb { display: flex; flex-direction: column; gap: 4px; }
.case-pop-group.is-portrait .case-pop-thumb { width: 52px; }
.case-pop-group.is-landscape .case-pop-thumb { width: 100px; }
.case-pop-thumb img, .case-pop-thumb video { width: 100%; height: auto; display: block; border-radius: 8px; background: #f1f5f9; }
.case-pop-thumb small { display: block; margin-top: 3px; font-size: 10px; color: #667085; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-pop-more { flex-basis: 100%; font-size: 11px; color: #667085; text-align: center; padding: 2px 0; }
.case-project-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 24px; }
.case-project-modal { width: min(1120px, 96vw); max-height: 92vh; display: flex; flex-direction: column; background: #fff; border-radius: 16px; box-shadow: 0 24px 64px rgba(15, 23, 42, 0.28); overflow: hidden; }
.case-project-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 22px 10px; }
.case-project-head-left { display: flex; gap: 12px; min-width: 0; }
.case-back-btn { margin-top: 2px; }
.case-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.case-title-row h2 { margin: 0; font-size: 20px; color: #0f172a; }
.case-tag-chip, .case-project-link { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 12px; }
.case-tag-chip { background: #dcfce7; color: #166534; }
.case-project-link { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; text-decoration: none; transition: background 160ms ease; }
.case-project-link:hover { background: #dbeafe; }
.case-project-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 6px; font-size: 12.5px; color: #667085; }
.case-dot { color: #cbd5e1; }
.case-head-actions { display: flex; align-items: center; gap: 8px; }
.case-owner-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 22px 12px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; color: #92400e; font-size: 13px; }
.case-owner-banner b { color: #b45309; }
.case-banner-btn { flex: 0 0 auto; padding: 6px 12px; border: 0; border-radius: 8px; background: #f59e0b; color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background 160ms ease; }
.case-banner-btn:hover { background: #d97706; }
.case-project-body { flex: 1 1 auto; min-height: 0; max-height: 64vh; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr); grid-template-rows: minmax(0, 1fr); gap: 14px; padding: 0 22px 14px; }
.case-stage-card { position: relative; display: flex; flex-direction: column; background: #f8f9fb; border: 1px solid #eef0f3; border-radius: 14px; padding: 14px; min-height: 0; }
.case-stage-label { position: absolute; top: 12px; left: 12px; z-index: 2; padding: 3px 10px; background: #fff; border-radius: 999px; font-size: 11px; color: #667085; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12); }
.case-stage-row { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; gap: 8px; }
.case-stage { flex: 1 1 auto; height: 100%; max-height: 52vh; min-height: 240px; display: flex; align-items: center; justify-content: center; }
.case-stage img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; }
.case-nav-btn { flex: 0 0 auto; width: 36px; height: 36px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; color: #475569; font-size: 18px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 160ms ease; }
.case-nav-btn:hover { background: #f1f5f9; }
.case-expand-btn { position: absolute; right: 22px; bottom: 74px; width: 34px; height: 34px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1); }
.case-stage-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; padding: 10px 12px; background: #fff; border: 1px solid #eef0f3; border-radius: 10px; }
.case-stage-meta div { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #0f172a; }
.case-stage-meta small { color: #98a2b3; font-size: 11px; }
.case-side { display: flex; flex-direction: column; min-height: 0; background: #f8f9fb; border: 1px solid #eef0f3; border-radius: 14px; padding: 14px; }
.case-side-head { font-size: 13px; font-weight: 650; color: #334155; margin-bottom: 10px; }
.case-side-grid { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; gap: 10px; align-items: flex-start; padding: 2px; }
.case-side-grid::-webkit-scrollbar { width: 8px; }
.case-side-grid::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.case-side-grid::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.case-side-grid::-webkit-scrollbar-track { background: transparent; }
.case-side-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.case-side-card { cursor: pointer; border: 2px solid transparent; border-radius: 10px; padding: 5px; background: #fff; transition: border-color 160ms ease; }
.case-side-card:hover { border-color: #cbd5e1; }
.case-side-card.active { border-color: #16a34a; }
.case-side-imgwrap { position: relative; border-radius: 8px; overflow: hidden; background: #f1f5f9; }
.case-side-imgwrap img { width: 100%; height: auto; display: block; }
.case-side-check { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; border-radius: 999px; background: #16a34a; color: #fff; display: none; align-items: center; justify-content: center; }
.case-side-card.active .case-side-check { display: flex; }
.case-side-del { position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border: 0; border-radius: 999px; background: rgba(15, 23, 42, 0.55); color: #fff; font-size: 12px; line-height: 1; cursor: pointer; display: none; align-items: center; justify-content: center; }
.case-side-card:hover .case-side-del { display: flex; }
.case-side-name { margin-top: 6px; font-size: 12px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-side-dims { font-size: 11px; color: #98a2b3; }
.case-project-foot { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 14px 32px 24px; border-top: 0; }
.case-drop-veil { position: absolute; inset: 0; z-index: 30; display: none; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.55); border-radius: 20px; pointer-events: none; opacity: 0; transition: opacity 180ms ease; }
.case-project-backdrop.case-drag-hover .case-drop-veil { display: flex; opacity: 1; }
.case-drop-veil-box { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 34px 46px; border: 2px dashed rgba(255, 255, 255, 0.55); border-radius: 18px; color: #fff; text-align: center; }
.case-drop-veil-icon { display: flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 14px; background: rgba(255, 255, 255, 0.14); color: #fff; }
.case-drop-veil-icon svg { width: 28px; height: 28px; }
.case-drop-veil-box strong { font-size: 15px; font-weight: 600; }
.case-drop-veil-box small { font-size: 12px; color: rgba(255, 255, 255, 0.72); }
.case-foot-note { font-size: 12px; color: #98a2b3; }
.case-foot-actions { display: flex; gap: 10px; flex: 0 0 auto; }
.case-blue-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border: 0; border-radius: 10px; background: #2563eb; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 160ms ease; }
.case-blue-btn:hover { background: #1d4ed8; }
.case-blue-btn.is-disabled, .case-blue-btn:disabled { background: #cbd5e1; color: #f8fafc; cursor: not-allowed; }
.case-more-menu { position: fixed; z-index: 210; min-width: 150px; background: #fff; border: 1px solid #e8eaee; border-radius: 10px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18); padding: 6px; }
.case-more-menu button { display: block; width: 100%; text-align: left; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; font-size: 13px; color: #334155; cursor: pointer; }
.case-more-menu button:hover { background: #f1f5f9; }
.case-more-menu button.danger { color: #dc2626; }
.case-fullscreen { position: fixed; inset: 0; z-index: 300; background: rgba(15, 23, 42, 0.92); display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
.case-fullscreen img { max-width: 96vw; max-height: 96vh; object-fit: contain; }
/* ── 素材库检索栏固定（v655 / v656）──
   两个坑，缺一个都不吸顶（v653 只用 sticky 所以失败）：
   1) #content 是 overflow:hidden auto，但内容撑开了它自身高度 → 它永不溢出，真正滚动的是文档。
      它照样算「滚动容器」，sticky 会以这个从不滚动的容器为参照，于是检索栏照样被带走。
      放开纵向裁剪（横向仍保留裁剪，供下面的底板外扩使用），sticky 才会以文档滚动为参照。
   2) 检索栏是 .library-page（display:grid）的网格项，网格项的包含块只有自己那一格高，
      粘滞行程为 0。改成 flex 列后包含块是整页内容框，整段滚动范围内都能粘住。
   v656 再修两处观感：
   · .library-page 原来有 26px 上内边距，检索栏要先跟着滚 26px 才吸住 → 把这段内边距移进包裹层，
     检索栏的盒子从一开头就贴着滚动视口顶部，全程纹丝不动。
   · 底板原来只铺页面内容列（左右各留 28px 内边距），改成伪元素向左右各外扩 32px 铺满整幅可视宽度；
     外扩部分由 #content 的 overflow-x:clip 裁掉，不会产生横向滚动条。 */
html body #app-shell.app-shell[data-route="library"] .content { overflow: visible !important; overflow-x: clip !important; }
html body .library-page:not(.library-page-home) {
  display: flex !important;
  flex-direction: column !important;
  padding-top: 0 !important;
}
html body .library-page:not(.library-page-home) .library-pin-strip {
  position: sticky !important;
  top: 0 !important;
  z-index: 40 !important;
  padding-top: 26px;
  /* 往下滚时整条向上叠起（.is-stowed），鼠标移到顶部或往上滚时再放出来 */
  transition: transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}
html body .library-page:not(.library-page-home) .library-pin-strip.is-stowed {
  transform: translateY(-100%);
}
@media (prefers-reduced-motion: reduce) {
  html body .library-page:not(.library-page-home) .library-pin-strip { transition: none; }
}
html body .library-page:not(.library-page-home) .library-pin-strip::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -32px;
  right: -32px;
  z-index: -1;
  pointer-events: none;
  /* 毛玻璃底板：不透明度保持较高（0.88），只是让底下滚过的图片经模糊透出来一点，不做成通透玻璃。
     先用 rgba 兜底，再尽量用 color-mix 跟着主题色走（不支持时该声明会被丢弃，保留上面的兜底）。 */
  background: rgba(245, 246, 248, 0.88);
  background: color-mix(in srgb, var(--vf-ui-bg, #f5f6f8) 88%, transparent);
  backdrop-filter: blur(14px) saturate(1.06);
  -webkit-backdrop-filter: blur(14px) saturate(1.06);
  /* 常驻分隔线：首页那根检索栏本来就有下边框，这里保持一致；不依赖滚动监听，永远显示 */
  border-bottom: 1px solid var(--vf-line, #e6e8eb);
}
/* ── 物料所有者：可输入可联想下拉（v666）── */
.owner-combobox { position: relative; display: block; }
.owner-combobox-field { display: flex; align-items: center; gap: 6px; }
.owner-combobox-field input[name="owner_name"] { flex: 1 1 auto; min-width: 0; }
/* 选中/命中名单后，大象编号直接显示在输入框右侧（不显示在框下方） */
.owner-combobox-badge { flex: 0 0 auto; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 3px 9px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 11.5px; pointer-events: none; }
.owner-combobox-badge[hidden] { display: none !important; }
/* 菜单按内容自适应加宽（不跟输入框等宽），文字不折行 */
.owner-combobox-menu { position: absolute; z-index: 60; left: 0; top: calc(100% + 6px); width: max-content; min-width: 100%; max-width: min(560px, 92vw); max-height: 240px; overflow-y: auto; overflow-x: hidden; padding: 6px; background: #fff; border: 1px solid #e8eaee; border-radius: 12px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16); }
.owner-combobox-menu[hidden] { display: none !important; }
.owner-option { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; font-size: 13px; color: #334155; cursor: pointer; text-align: left; white-space: nowrap; }
.owner-option.is-active, .owner-option:hover { background: #f1f5f9; }
.owner-option-name { font-weight: 600; white-space: nowrap; }
.owner-option-name-zh { color: #94a3b8; font-size: 12.5px; white-space: nowrap; }
.owner-option-id { margin-left: auto; color: #8a94a6; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
.owner-option-id-empty { color: #cbd5e1; font-family: inherit; }
/* ── 团队管理页：使用者名单（v666）── */
.team-roster-section { margin-top: 18px; }
.team-roster-form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin: 0 0 10px; }
.team-roster-form label { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
.team-roster-form label > span { font-size: 12px; color: #94a3b8; }
.team-roster-form input { height: 36px; }
.team-roster-form .primary-btn { height: 36px; }
.team-roster-tip { font-size: 12px; color: #94a3b8; padding-bottom: 9px; }
.team-roster-section .table td, .team-roster-section .table th { vertical-align: middle; white-space: nowrap; }
.team-roster-name { font-weight: 600; color: #0f172a; }
.team-roster-name-en { color: #475569; }
.team-roster-id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; color: #475569; }
.team-roster-missing { color: #cbd5e1; font-family: inherit; }
.team-roster-empty { color: #94a3b8; }
.team-roster-actions { display: flex; gap: 6px; align-items: center; }
.team-roster-inline-input { height: 32px; width: 100%; }
.team-roster-pending { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 10px; padding: 8px 12px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 12.5px; }
.team-roster-pending[hidden] { display: none !important; }
.team-roster-hint { margin: 0 0 10px; padding: 8px 12px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 12.5px; }
.team-roster-hint[hidden] { display: none !important; }
/* ── 团队管理页：物料清单（v707 起；v778 折叠层级：端 → 大类别 → 子类别尺寸）── */
.material-catalog-section { margin-top: 18px; }
.material-catalog-rules-toggle { border: 0; background: transparent; padding: 0 2px; margin-left: 2px; color: #4f46e5; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline dotted; }
.material-catalog-rules { margin: 4px 0 8px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
.material-catalog-rules p { margin: 0 0 5px; font-size: 12px; line-height: 1.6; color: #475569; }
.material-catalog-rules p:last-child { margin-bottom: 0; }
.material-catalog-recase { border-color: #fcd34d; color: #92400e; background: #fffbeb; }
.material-catalog-recase:hover { border-color: #f59e0b; color: #78350f; }
/* 端（v822 横排页签，图2 样式） */
.material-catalog-tabs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 10px; }
.material-catalog-tab { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font: inherit; cursor: pointer; }
.material-catalog-tab:hover { border-color: #c7d2fe; }
.material-catalog-tab-name { font-size: 13px; font-weight: 700; color: #475569; }
.material-catalog-tab-count { font-size: 11.5px; color: #94a3b8; }
.material-catalog-tab.is-active { border-color: #a5b4fc; background: #eef2ff; box-shadow: inset 0 0 0 1px #a5b4fc; }
.material-catalog-tab.is-active .material-catalog-tab-name { color: #3730a3; }
.material-catalog-tab.is-active .material-catalog-tab-count { color: #6366f1; }
.material-catalog-tab[data-material-toggle-platform="B端"].is-active { border-color: #fdba74; background: #fff7ed; box-shadow: inset 0 0 0 1px #fdba74; }
.material-catalog-tab[data-material-toggle-platform="B端"].is-active .material-catalog-tab-name { color: #9a3412; }
.material-catalog-tab[data-material-toggle-platform="B端"].is-active .material-catalog-tab-count { color: #ea580c; }
.material-catalog-tab[data-material-toggle-platform="D端"].is-active { border-color: #6ee7b7; background: #ecfdf5; box-shadow: inset 0 0 0 1px #6ee7b7; }
.material-catalog-tab[data-material-toggle-platform="D端"].is-active .material-catalog-tab-name { color: #065f46; }
.material-catalog-tab[data-material-toggle-platform="D端"].is-active .material-catalog-tab-count { color: #059669; }
.material-catalog-tab[data-material-toggle-platform="M端"].is-active { border-color: #c4b5fd; background: #f5f3ff; box-shadow: inset 0 0 0 1px #c4b5fd; }
.material-catalog-tab[data-material-toggle-platform="M端"].is-active .material-catalog-tab-name { color: #5b21b6; }
.material-catalog-tab[data-material-toggle-platform="M端"].is-active .material-catalog-tab-count { color: #7c3aed; }
.material-catalog-tab-add { margin-left: auto; }
/* 端 */
.material-catalog-platform { margin: 0 0 8px; border: 1px solid #dfe4ea; border-radius: 12px; background: #fff; overflow: hidden; }
.material-catalog-platform-head { display: flex; align-items: center; gap: 6px; padding: 3px 10px; border-bottom: 1px solid #e6eaf0; background: #f1f5f9; }
.material-catalog-platform[data-material-platform-group="C端"] > .material-catalog-platform-head { background: #eef2ff; border-bottom-color: #dfe5fb; }
.material-catalog-platform[data-material-platform-group="C端"] > .material-catalog-platform-head .material-catalog-platform-name { color: #3730a3; }
.material-catalog-platform[data-material-platform-group="B端"] > .material-catalog-platform-head { background: #fff7ed; border-bottom-color: #fbe8d5; }
.material-catalog-platform[data-material-platform-group="B端"] > .material-catalog-platform-head .material-catalog-platform-name { color: #9a3412; }
.material-catalog-platform[data-material-platform-group="D端"] > .material-catalog-platform-head { background: #ecfdf5; border-bottom-color: #d7f2e3; }
.material-catalog-platform[data-material-platform-group="D端"] > .material-catalog-platform-head .material-catalog-platform-name { color: #065f46; }
.material-catalog-platform[data-material-platform-group="M端"] > .material-catalog-platform-head { background: #f5f3ff; border-bottom-color: #e6e1fb; }
.material-catalog-platform[data-material-platform-group="M端"] > .material-catalog-platform-head .material-catalog-platform-name { color: #5b21b6; }
.material-catalog-platform-body { background: #fff; }
.material-catalog-platform-toggle { flex: 1 1 auto; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; padding: 4px 0; text-align: left; cursor: pointer; }
.material-catalog-platform-name { font-size: 13px; font-weight: 700; color: #0f172a; }
.material-catalog-platform-head .material-catalog-act { flex: 0 0 auto; }
.material-catalog-platform-body { padding: 2px 8px 6px; }
/* 大类别（默认收起，一次只开一个） */
.material-catalog-cat { border-bottom: 1px solid #f1f3f6; }
.material-catalog-cat:last-child { border-bottom: 0; }
.material-catalog-cat-head { display: flex; align-items: center; gap: 6px; min-height: 28px; }
.material-catalog-cat-toggle { flex: 1 1 auto; display: flex; align-items: center; gap: 7px; border: 0; background: transparent; padding: 5px 0; text-align: left; cursor: pointer; }
.material-catalog-cat-name { font-size: 12.5px; color: #0f172a; }
.material-catalog-cat.is-open > .material-catalog-cat-head .material-catalog-cat-name { font-weight: 700; }
.material-catalog-grip { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 20px; border-radius: 5px; color: #cbd5e1; font-size: 12px; line-height: 1; cursor: grab; user-select: none; letter-spacing: -1px; }
.material-catalog-grip:hover { background: #eef2ff; color: #4f46e5; }
.material-catalog-grip:active { cursor: grabbing; }
.material-catalog-grip:hover { color: #64748b; }
.material-catalog-cat.is-dragging, tr[data-material-sub].is-dragging { opacity: .45; }
.material-catalog-cat.is-drop-before, tr[data-material-sub].is-drop-before { box-shadow: inset 0 2px 0 #4f46e5; }
.material-catalog-cat.is-drop-after, tr[data-material-sub].is-drop-after { box-shadow: inset 0 -2px 0 #4f46e5; }
.material-catalog-platform-body.is-drop-into { box-shadow: inset 0 0 0 2px #c7d2fe; border-radius: 8px; }
body.is-catalog-dragging { cursor: grabbing; }
body.is-catalog-dragging * { cursor: grabbing !important; }
.material-catalog-section .material-catalog-table td.material-catalog-cell-grip { width: 3%; padding: 0 2px 0 0; }
.material-catalog-caret { flex: 0 0 auto; width: 0; height: 0; margin-left: 2px; margin: 0 1px; border-left: 4.5px solid #94a3b8; border-top: 3.8px solid transparent; border-bottom: 3.8px solid transparent; transition: transform .12s ease; }
.material-catalog-caret.is-open { transform: rotate(90deg); }
.material-catalog-count { font-size: 11.5px; color: #94a3b8; }
.material-catalog-cat-actions { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
.material-catalog-cat-more { position: relative; display: inline-flex; }
.material-catalog-more-btn { letter-spacing: 1px; }
.material-catalog-cat-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 30; min-width: 116px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.12); display: flex; flex-direction: column; }
.material-catalog-cat-menu[hidden] { display: none; }
.material-catalog-cat-menu button { border: 0; background: transparent; padding: 6px 10px; border-radius: 6px; text-align: left; font-size: 12px; color: #334155; cursor: pointer; }
.material-catalog-cat-menu button:hover { background: #f1f5f9; }
.material-catalog-cat-menu button.danger { color: #dc2626; }
.material-catalog-cat-menu button.danger:hover { background: #fef2f2; }
.material-catalog-cat-body { padding: 0 0 6px 17px; }
.material-catalog-quiet-add { display: inline-flex; align-items: center; gap: 2px; }
.material-catalog-quiet-plus { font-size: 13px; line-height: 1; color: #94a3b8; }
.material-catalog-quiet-add:hover .material-catalog-quiet-plus { color: #4f46e5; }
.material-catalog-quiet-label { display: inline-block; max-width: 0; overflow: hidden; opacity: 0; white-space: nowrap; transition: max-width .14s ease, opacity .14s ease; }
.material-catalog-quiet-add:hover .material-catalog-quiet-label,
.material-catalog-quiet-add:focus-visible .material-catalog-quiet-label { max-width: 104px; opacity: 1; }
.material-catalog-act { border: 0; background: transparent; padding: 3px 7px; border-radius: 6px; font-size: 12px; font-weight: 600; line-height: 1.3; color: #7c8798; white-space: nowrap; cursor: pointer; }
.material-catalog-act:hover { color: #4f46e5; background: #eef2ff; }
.material-catalog-act.danger:hover { color: #dc2626; background: #fef2f2; }
/* 子类别表：名称 | 尺寸 | 操作 三列对齐 */
.material-catalog-section .material-catalog-table { font-size: 13px; margin: 0; table-layout: fixed; width: 100%; }
.material-catalog-section .material-catalog-table td { padding: 1px 8px; vertical-align: middle; white-space: nowrap; line-height: 1.8; border-bottom: 1px solid #f4f6f9; }
.material-catalog-section .material-catalog-table tr:last-child td { border-bottom: 0; }
.material-catalog-section .material-catalog-table td:nth-child(1) { width: 2.5%; }
.material-catalog-section .material-catalog-table td:nth-child(2) { width: 33.5%; }
.material-catalog-section .material-catalog-table td:nth-child(3) { width: 53%; }
.material-catalog-section .material-catalog-table td:nth-child(4) { width: 11%; text-align: right; }
.material-catalog-label { color: #0f172a; white-space: normal; word-break: break-word; }
.material-catalog-section .material-catalog-table td:nth-child(2) { padding-left: 4px; padding-right: 4px; }
.material-catalog-size { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #475569; }
.material-catalog-cell-grip { text-align: center; }
[data-material-new-row] .material-catalog-label .team-roster-inline-input { width: 100%; }
.material-catalog-size-cell { display: flex; align-items: center; gap: 4px; }
.material-catalog-size-chips { flex: 1 1 auto; display: flex; flex-wrap: nowrap; align-items: center; gap: 3px; overflow-x: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 7px 0 2px; }
.material-catalog-size-chips::-webkit-scrollbar { height: 4px; }
.material-catalog-size-chips::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
.material-catalog-chip-wrap { position: relative; display: inline-flex; flex: 0 0 auto; }
.material-catalog-size-chip { flex: 0 0 auto; padding: 0 5px; border: 1px solid #e2e8f0; border-radius: 999px; background: #f6f8fb; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 18px; color: #334155; white-space: nowrap; cursor: text; }
.material-catalog-size-chip:hover { border-color: #a5b4fc; background: #eef2ff; color: #3730a3; }
.material-catalog-size-x { position: absolute; top: -6px; right: -5px; width: 15px; height: 15px; padding: 0; border: 0; border-radius: 50%; background: #94a3b8; color: #fff; font-size: 11px; line-height: 1; cursor: pointer; display: none; align-items: center; justify-content: center; }
.material-catalog-chip-wrap:hover .material-catalog-size-x { display: inline-flex; }
.material-catalog-size-x:hover { background: #dc2626; }
.material-catalog-inline-text { border: 0; background: transparent; padding: 0 4px; margin-left: -4px; border-radius: 6px; font-size: 12px; color: #0f172a; cursor: text; text-align: left; white-space: normal; word-break: break-word; line-height: 1.5; }
.material-catalog-inline-text:hover { background: #eef2ff; color: #3730a3; }
.material-catalog-inline-input { height: 24px; width: 100%; max-width: 100%; padding: 0 6px; font-size: 12.5px; }
.material-catalog-dim-pop { position: fixed; z-index: 60; display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border: 1px solid #dfe4ea; border-radius: 12px; background: #fff; box-shadow: 0 10px 30px rgba(15,23,42,.16); }
.material-catalog-dim-pop-actions { display: flex; align-items: center; gap: 6px; }
.material-catalog-dim-pop-hint { margin-right: auto; font-size: 10.5px; color: #94a3b8; }
.material-catalog-dim-pop .ghost-btn.is-primary { border-color: #4f46e5; background: #4f46e5; color: #fff; }
.material-catalog-dim-pop .ghost-btn.is-primary:hover { background: #4338ca; color: #fff; }
.material-catalog-dim { display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto; padding: 1px 7px 1px 6px; border: 1px solid #a5b4fc; border-radius: 999px; background: #fff; }
.material-catalog-dim-field { display: inline-flex; align-items: center; gap: 3px; }
.material-catalog-dim-field i { font-style: normal; font-size: 9.5px; letter-spacing: .2px; color: #94a3b8; }
.material-catalog-dim-input { width: 62px !important; max-width: 62px !important; height: 19px !important; padding: 0 4px !important; border: 0 !important; border-radius: 6px !important; background: #f1f5f9 !important; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
.material-catalog-dim-input:focus { background: #eef2ff !important; outline: 1px solid #a5b4fc; }
.material-catalog-dim-x { color: #cbd5e1; font-size: 11px; }
.material-catalog-dim-wild { border: 0; background: transparent; padding: 1px 6px; border-radius: 999px; font-size: 10.5px; color: #94a3b8; cursor: pointer; white-space: nowrap; }
.material-catalog-dim-wild:hover { background: #eef2ff; color: #4f46e5; }
.material-catalog-dim-wild.is-active { background: #4f46e5; color: #fff; }
.material-catalog-dim.is-wild .material-catalog-dim-field:nth-of-type(2) { opacity: .3; }
.material-catalog-dim-band { display: none; }
.material-catalog-dim.is-wild .material-catalog-dim-band { display: inline-flex; }
/* v860 结构化百分比区间：符号下拉（不限/≤/≥/~）+ 纯数字框，连接词连读成完整句子 */
.material-catalog-band-op { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 999px; font-size: 10px; line-height: 1.3; color: #475569; padding: 1px 2px; cursor: pointer; max-width: 92px; }
.material-catalog-band-op:hover { border-color: #a5b4fc; background: #eef2ff; color: #4f46e5; }
.material-catalog-band-sep { color: #94a3b8; font-size: 10.5px; }
.material-catalog-band-pre { color: #94a3b8; font-size: 10.5px; }
.material-catalog-band-pct { font-size: 10px; color: #64748b; }
.material-catalog-dim .is-hidden { display: none !important; }

.material-catalog-size-quick { flex: 0 0 auto; border: 0; background: transparent; padding: 0 3px; color: #cbd5e1; font-size: 12px; font-weight: 700; cursor: pointer; visibility: hidden; }
.material-catalog-size:hover .material-catalog-size-quick,
.material-catalog-table tr.is-active .material-catalog-size-quick { visibility: visible; }
.material-catalog-size-quick:hover { color: #4f46e5; }
.material-catalog-size-editor { display: flex; flex-direction: column; gap: 3px; padding: 2px 0; }
[data-material-new-row] .material-catalog-size-editor { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 5px; }
[data-material-new-row] .material-catalog-size-editor > .team-roster-inline-input { height: 22px; max-width: 130px; border-radius: 999px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
.material-catalog-size-row { display: flex; align-items: center; gap: 4px; }
.material-catalog-size-row .team-roster-inline-input { flex: 1 1 auto; max-width: 190px; }
.material-catalog-size-drop { border: 0; background: transparent; padding: 0 4px; color: #cbd5e1; font-size: 14px; line-height: 1; cursor: pointer; }
.material-catalog-size-drop:hover { color: #dc2626; }
.material-catalog-size-addbtn { align-self: flex-start; border: 1px dashed #cbd5e1; background: transparent; padding: 1px 7px; border-radius: 6px; font-size: 11.5px; color: #64748b; cursor: pointer; }
.material-catalog-size-addbtn:hover { border-color: #4f46e5; color: #4f46e5; }
.material-catalog-cell-actions { text-align: right; }
.material-catalog-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0; visibility: hidden; white-space: nowrap; }
.material-catalog-table tr:hover .material-catalog-row-actions,
.material-catalog-table tr.is-active .material-catalog-row-actions,
.material-catalog-row-actions.material-catalog-row-editing { visibility: visible; }
.material-catalog-section .material-catalog-table .team-roster-inline-input { height: 24px; padding: 0 6px; font-size: 12px; width: 100%; }
.material-catalog-section .material-catalog-table .ghost-btn { min-height: 22px; padding: 0 8px; border-radius: 6px; font-size: 11.5px; }
.material-catalog-empty-sub { margin: 2px 0 4px; font-size: 12px; }
.material-catalog-cat-head .team-roster-inline-input { max-width: 260px; height: 26px; }
.material-catalog-new-group { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 2px 8px 6px; margin: 2px 0 6px; background: #fff; }
.material-catalog-empty { margin: 0 0 10px; }
.material-catalog-new-fields { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.material-catalog-new-fields .team-roster-inline-input { width: auto; min-width: 150px; flex: 0 1 210px; }
@media (max-width: 860px) { .case-project-body { grid-template-columns: 1fr; max-height: none; overflow-y: auto; } .case-stage { min-height: 220px; } }
/* 案例库标签面板：每行一个大类、胶囊标签单选，再点已选标签=不选 */
.library-form-grid[hidden] { display: none !important; }
.case-tag-bar { position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 8px; }
.case-tag-bar[hidden] { display: none !important; }
.case-tag-bubbles { display: flex; flex-wrap: wrap; gap: 6px; }
.case-tag-bubbles:empty { display: none; }
.case-tag-ai { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.case-tag-ai[hidden] { display: none !important; }
.case-tag-ai-title { font-size: 11px; color: #8b5cf6; }
.case-tag-ai-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.case-tag-ai-chip { border: 1px dashed #c4b5fd; background: #f5f3ff; color: #6d28d9; font-size: 12px; line-height: 1; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
.case-tag-ai-chip:hover { border-color: #8b5cf6; background: #ede9fe; }
.case-tag-ai-chip.is-added { opacity: .45; border-style: solid; }
.case-tag-ai-chip.is-new { border-color: #8b5cf6; border-style: solid; background: #ede9fe; }
.case-tag-ai-activity { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
.case-tag-ai-activity:hover { border-color: #3b82f6; background: #dbeafe; }
.case-tag-ai-activity.is-added { opacity: .45; border-style: solid; }
.case-tag-ai-hint { font-size: 11.5px; color: #a5a3c9; }
.case-tag-ai-actions { display: inline-flex; align-items: center; gap: 4px; }
.case-tag-ai-actions[hidden] { display: none !important; }
.case-tag-ai-bulk { border: 0; background: transparent; color: #7c3aed; font-size: 11.5px; line-height: 1; padding: 5px 6px; border-radius: 6px; cursor: pointer; }
.case-tag-ai-bulk:hover { background: #f3e8ff; }
.case-tag-ai-bulk:disabled { color: #c4b5d9; background: transparent; cursor: default; }
.case-tag-bubble { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #86efac; background: #dcfce7; color: #166534; font-size: 12px; line-height: 1; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
.case-tag-bubble span { color: #16a34a; }
.case-tag-bubble:hover { border-color: #22c55e; }
.case-tag-bubble[data-case-tag-kind="element"] { border-color: #fdba74; background: #ffedd5; color: #9a3412; }
.case-tag-bubble[data-case-tag-kind="element"] span { color: #f97316; }
.case-tag-bubble[data-case-tag-kind="element"]:hover { border-color: #f97316; }
/* v826 活动主题改蓝色，与绿色（默认）和橙色（元素）区分开 */
.case-tag-bubble[data-case-tag-kind="activity"] { border-color: #93c5fd; background: #dbeafe; color: #1e40af; }
.case-tag-bubble[data-case-tag-kind="activity"] span { color: #3b82f6; }
.case-tag-bubble[data-case-tag-kind="activity"]:hover { border-color: #3b82f6; }
.case-foot-tags { display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; margin-right: auto; min-width: 0; overflow: hidden; }
.case-foot-tags:empty { display: none; }
.case-foot-tag { flex: 0 0 auto; display: inline-flex; align-items: center; padding: 6px 10px; border: 1px solid #86efac; background: #dcfce7; border-radius: 999px; font-size: 12px; line-height: 1; color: #166534; }
.case-foot-tag.is-element { border-color: #fdba74; background: #ffedd5; color: #9a3412; }
.case-foot-tag[data-case-tag-kind="activity"] { border-color: #93c5fd; background: #dbeafe; color: #1e40af; }
.case-foot-tags .case-foot-tag { transition: color 140ms ease, background-color 140ms ease, border-color 140ms ease; }
.case-foot-tags.is-muted .case-foot-tag, .case-foot-tags.is-muted .case-foot-tag.is-element { border-color: #e2e8f0; background: #f8fafc; color: #94a3b8; }
.case-foot-tags-pop { position: fixed; z-index: 99999; display: flex; flex-wrap: wrap; gap: 6px; max-width: min(760px, calc(100vw - 32px)); max-height: 42vh; overflow: auto; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 12px 32px rgba(15, 23, 42, .18); }
.case-foot-tags-pop-title { flex: 1 0 100%; font-size: 11px; color: #94a3b8; }
/* v858：浮窗底部的「＋标签 / AI 识别」工具行（与左下角同款按钮） */
.case-foot-tags-pop-tools { flex: 1 0 100%; display: flex; gap: 6px; margin-top: 4px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
.case-foot-line { flex: 1 1 auto; display: flex; align-items: center; gap: 10px; min-width: 0; }
.case-foot-tools { flex: 0 0 auto; display: flex; gap: 6px; }
.case-foot-tool-btn { flex: 0 0 auto; display: inline-flex; align-items: center; padding: 5px 11px; border: 1px dashed #b7c2d4; background: #fff; color: #475569; font-size: 12px; line-height: 1; border-radius: 999px; cursor: pointer; white-space: nowrap; }
.case-foot-tool-btn:hover { border-color: #64748b; color: #0f172a; background: #f1f5f9; }
.case-foot-tool-btn:disabled { color: #cbd5e1; border-color: #e2e8f0; background: #fafbfc; cursor: not-allowed; }
.case-foot-tag-editor .case-tag-pop-group, .case-foot-ai-suggest { display: flex; flex-wrap: wrap; flex-direction: row; gap: 6px; align-items: flex-start; max-width: min(720px, calc(100vw - 32px)); max-height: 46vh; overflow: auto; }
.case-foot-tag-editor-hint { flex: 1 0 100%; font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
.case-foot-ai-rerun-row { flex: 1 0 100%; margin-top: 4px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
#library-upload-modal .library-drop-zone { min-height: 168px !important; }
#library-upload-modal .library-drop-zone .upload-zone-main { color: #334155 !important; font-size: 13.5px !important; font-weight: 600 !important; }
#library-upload-modal .library-drop-zone .upload-zone-sub { color: #94a3b8 !important; font-size: 12px !important; font-weight: 400 !important; }
/* 三个入库位置的拖拽框统一为「居中图标 + 主行 + 灰色小字」 */
#library-upload-modal .case-drop-zone { flex-direction: column; align-items: center; justify-content: center; gap: 4px; text-align: center; }
#library-upload-modal .case-drop-zone .case-zone-head { flex-direction: column; align-items: center; gap: 4px; }
#library-upload-modal .case-drop-zone .case-zone-icon { width: auto; height: auto; background: transparent; color: #94a3b8; display: flex; justify-content: center; margin-bottom: 6px; }
#library-upload-modal .case-drop-zone .case-zone-icon svg { width: 34px; height: 34px; }
#library-upload-modal .case-drop-zone .case-zone-texts { align-items: center; text-align: center; }
.case-tag-add { width: 100%; border: 1px dashed #b7c2d4; background: #f8fafc; color: #475569; font-size: 13px; line-height: 1; padding: 12px 14px; border-radius: 10px; cursor: pointer; text-align: center; }
.case-tag-add:hover { border-color: #64748b; color: #0f172a; background: #f1f5f9; }
.case-tag-pop { position: fixed; z-index: 99999; width: min(600px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 12px 32px rgba(15, 23, 42, .18); }
.case-tag-pop-group { display: flex; flex-direction: column; gap: 8px; }
.case-tag-pop-gtitle { font-size: 11px; color: #94a3b8; }
.case-tag-custom { display: inline-flex; align-items: center; gap: 6px; }
.case-tag-custom[hidden] { display: none !important; }
.case-tag-custom-toggle { width: 30px; height: 30px; border: 1px dashed #b7c2d4; border-radius: 8px; background: #f8fafc; color: #475569; font-size: 14px; line-height: 1; cursor: pointer; }
.case-tag-custom-toggle:hover { border-color: #64748b; color: #0f172a; background: #f1f5f9; }
.case-tag-custom-input { flex: 1 1 auto; min-width: 0; height: 30px; padding: 0 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12.5px; color: #1e293b; outline: none; }
.case-tag-custom-input:focus { border-color: #94a3b8; }
.case-tag-custom-input.case-tag-custom-too-long { border-color: #ef4444 !important; box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15); }
.case-tag-limit-tip { position: fixed; transform: translate(-50%, -100%); background: #0f172a; color: #fff; font-size: 11.5px; line-height: 1.3; padding: 7px 10px; border-radius: 6px; z-index: 2147483000; pointer-events: none; white-space: nowrap; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.28); display: none; animation: caseTagTipIn 0.15s ease; }
.case-tag-limit-tip::after { content: ''; position: absolute; top: 100%; left: 50%; margin-left: -5px; border: 5px solid transparent; border-top-color: #0f172a; }
@keyframes caseTagTipIn { from { opacity: 0; transform: translate(-50%, -100%) translateY(4px); } to { opacity: 1; transform: translate(-50%, -100%); } }
.case-tag-custom-add { flex: 0 0 auto; height: 30px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 12.5px; color: #334155; cursor: pointer; }
.case-tag-custom-add:hover { background: #f1f5f9; }
.case-tag-row { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 4px 10px; align-items: start; }
/* 上传必填项（平台/国家）没选：点上传被拦下时把这一行标红，提醒先选 */
.case-tag-row.is-missing .case-tag-cat { color: #dc2626; font-weight: 600; }
.case-tag-row.is-missing .case-tag-opts { border-radius: 8px; box-shadow: 0 0 0 2px rgba(220, 38, 38, .35); }
.case-tag-add.is-required { border-color: #fca5a5; color: #dc2626; }
.case-tag-cat { font-size: 12px; color: #6b7280; padding-top: 6px; }
.case-tag-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.case-tag-pop .case-tag-chip { border: 1px solid #86efac; background: #f0fdf4; color: #166534; font-size: 12px; line-height: 1; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
.case-tag-pop .case-tag-chip:hover { border-color: #22c55e; background: #dcfce7; }
.case-tag-pop .case-tag-chip.active { background: #15803d; border-color: #15803d; color: #fff; }
.case-tag-pop .case-tag-chip[data-case-tag-key="element"] { border-color: #fdba74; background: #fff7ed; color: #9a3412; }
.case-tag-pop .case-tag-chip[data-case-tag-key="element"]:hover { border-color: #f97316; background: #ffedd5; }
.case-tag-pop .case-tag-chip[data-case-tag-key="element"].active { background: #c2410c; border-color: #c2410c; color: #fff; }
.case-tag-pop .case-tag-chip[data-case-tag-key="activity"] { border-color: #93c5fd; background: #eff6ff; color: #1e40af; }
.case-tag-pop .case-tag-chip[data-case-tag-key="activity"]:hover { border-color: #3b82f6; background: #dbeafe; }
.case-tag-pop .case-tag-chip[data-case-tag-key="activity"].active { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.case-tag-pop .case-tag-custom-toggle { border-color: #fdba74; background: #fff7ed; color: #c2410c; }
.case-tag-row[data-case-tag-row="activity"] .case-tag-custom-toggle { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
/* v863：业务策略行主题是绿色，「＋」也要跟行主题一致（此前落到元素的橙色默认上） */
.case-tag-row[data-case-tag-row="strategy"] .case-tag-custom-toggle { border-color: #86efac; background: #f0fdf4; color: #15803d; }
`;
    document.head.append(style);
  })();

  const ROLE_LABELS = {
    zh: { admin: '管理员', designer: '设计师', operator: '运营' },
    en: { admin: 'Admin', designer: 'Designer', operator: 'Operator' }
  };

  const I18N = {
    zh: {
      loginTitle: 'GCC Design',
      loginSubtitle: '把素材、海报和动效集中在一个安静的创意工作台。',
      email: '邮箱',
      password: '密码',
      signIn: '登录',
      checkingSession: '正在验证登录状态',
      checkingSessionHint: '验证完成后将自动进入工作台…',
      signOut: '退出',
      workspace: 'Creative workspace',
      localPreviewHint: '本地预览模式仅用于检查界面，不会写入云端。',
      home: '创作首页',
      library: '素材库',
      staticDiy: 'DIY 静态',
      iconStudio: '制作金刚',
      dynamicDiy: 'DIY 动态',
      requestFlow: '提需流程',
      admin: '团队管理',
      analytics: '数据看板',
      checkItem: '检查项',
      checkResult: '结果',
      checkDetail: '说明',
      ready: '已就绪',
      notReady: '未就绪',
      localOnly: '本地预览',
      saveProject: '保存项目',
      recentProjects: '近期项目',
      openProject: '打开项目',
      projectName: '项目名称',
      cancel: '取消',
      save: '保存',
      categoryNameZh: '中文分类名',
      categoryNameEn: '英文分类名',
      visibility: '可见范围',
      allVisible: '全部可见',
      designersOnly: '仅设计师可见',
      operatorsOnly: '仅运营可见',
      createCategory: '创建分类',
      createAccount: '创建账号',
      assetCount: '素材',
      sourceCount: '源文件',
      uploadAsset: '上传素材',
      allAssets: '全部素材',
      favoritesOnly: '仅收藏',
      displayName: '姓名',
      role: '角色',
      initialPassword: '初始密码',
      cancelGeneration: '取消生图',
      close: '关闭'
    },
    en: {
      loginTitle: 'GCC Design',
      loginSubtitle: 'A calm creative workspace for assets, posters, and motion.',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      checkingSession: 'Verifying your session',
      checkingSessionHint: 'You will enter the workspace automatically once verification is complete…',
      signOut: 'Sign out',
      workspace: 'Workspace',
      localPreviewHint: 'Local preview only checks the UI and does not write to cloud.',
      home: 'Create',
      library: 'Library',
      staticDiy: 'Static DIY',
      iconStudio: 'Create Icons',
      dynamicDiy: 'Dynamic DIY',
      requestFlow: 'Request Flow',
      admin: 'Team',
      analytics: 'Analytics',
      checkItem: 'Check',
      checkResult: 'Result',
      checkDetail: 'Detail',
      ready: 'Ready',
      notReady: 'Not ready',
      localOnly: 'Local only',
      saveProject: 'Save Project',
      recentProjects: 'Recent Projects',
      openProject: 'Open Project',
      projectName: 'Project Name',
      cancel: 'Cancel',
      save: 'Save',
      categoryNameZh: 'Chinese name',
      categoryNameEn: 'English name',
      visibility: 'Visibility',
      allVisible: 'Visible to all',
      designersOnly: 'Designers only',
      operatorsOnly: 'Operators only',
      createCategory: 'Create category',
      createAccount: 'Create account',
      assetCount: 'Assets',
      sourceCount: 'Sources',
      uploadAsset: 'Upload asset',
      allAssets: 'All assets',
      favoritesOnly: 'Favorites',
      displayName: 'Name',
      role: 'Role',
      initialPassword: 'Initial password',
      cancelGeneration: 'Cancel generation',
      close: 'Close'
    }
  };

  const ROUTES = [
    { id: 'home', icon: 'home', title: 'home' },
    { id: 'library', icon: 'library', title: 'library' },
    { id: 'static', icon: 'static', title: 'staticDiy' },
    { id: 'icons', icon: 'library', title: 'iconStudio' },
    { id: 'dynamic', icon: 'dynamic', title: 'dynamicDiy' },
    { id: 'request', icon: 'request', title: 'requestFlow', hidden: true },
    { id: 'admin', icon: 'admin', title: 'admin' },
    { id: 'analytics', icon: 'analytics', title: 'analytics', adminOnly: true }
  ];

  const RESTRICTED_UI_ROUTES = new Set(['library', 'static', 'icons', 'admin']);

  const config = window.VF_CONFIG || {};
  const LIBRARY_BUCKET = 'vf-library';
const TOOL_UI_VERSION = '20260924-case-complete-v869';
// i18n：把 Functions 返回的中文错误消息按 UI 语言兜底翻译（英文界面显示英文）
const SERVER_ERROR_TRANSLATIONS = {
  'AI 扩图未配置：请设置 OPENAI_API_KEY，或设置 VOLC_ACCESS_KEY_ID + VOLC_SECRET_ACCESS_KEY。': 'AI outpaint is not configured. Set OPENAI_API_KEY, or VOLC_ACCESS_KEY_ID + VOLC_SECRET_ACCESS_KEY.',
  'AI 生图未配置：请在 Cloudflare Pages 环境变量中设置 OPENAI_API_KEY，或设置 VOLC_API_KEY + ENDPOINT_ID。': 'AI image generation is not configured. Set OPENAI_API_KEY, or VOLC_API_KEY + ENDPOINT_ID in Cloudflare Pages environment variables.',
  '请输入画面描述词。': 'Please enter a prompt for the image.',
  'AI 接口没有返回图片数据。': 'The AI provider returned no image data.',
  'AI 生图失败。': 'AI image generation failed.',
  'AI 扩图失败。': 'AI outpaint failed.',
  '搜索扩展未配置：请在 Cloudflare Pages 项目里添加环境变量 GLM_API_KEY。': 'Search expansion is not configured. Add the GLM_API_KEY environment variable to the Cloudflare Pages project.',
  '搜索扩展失败。': 'Search expansion failed.',
  '火山生图未配置：请设置 VOLC_API_KEY + ENDPOINT_ID。': 'Volcano image generation is not configured. Set VOLC_API_KEY + ENDPOINT_ID.',
  'GPT 生图未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY 或 OPENAI_API_KEY。': 'GPT image generation is not configured. Set LK888_API_KEY or OPENAI_API_KEY in Cloudflare Pages environment variables.',
  '元素识别未配置：请在 Cloudflare Pages 项目里添加环境变量 GLM_API_KEY（智谱开放平台）。': 'Element recognition is not configured. Add the GLM_API_KEY environment variable (Zhipu) to the Cloudflare Pages project.',
  '图片识别未配置：请在 Cloudflare Pages 项目里添加环境变量 GLM_API_KEY（智谱开放平台）。': 'Image recognition is not configured. Add the GLM_API_KEY environment variable (Zhipu) to the Cloudflare Pages project.',
  '缺少待识别的图片。': 'No image provided for recognition.',
  '图片过大，请改用缩略图识别。': 'The image is too large. Please use a thumbnail for recognition.',
  '元素识别失败。': 'Element recognition failed.',
  '品类识别失败。': 'Category recognition failed.',
  '语言识别失败。': 'Language recognition failed.',
  '提示词优化失败。': 'Prompt enhancement failed.',
  'auth relay 不支持该路径': 'This path is not supported by the auth relay.',
  '不允许跨站操作': 'Cross-origin request is not allowed.',
  'Supabase 配置缺失': 'Supabase configuration is missing.',
  'auth relay 转发失败。': 'The auth relay request failed.',
  '账号或密码不正确，且 Supabase 当前不可用。': 'Incorrect email or password, and Supabase is currently unreachable.',
  '应急登录失败。': 'Emergency login failed.',
  '账号权限尚未在这个环境启用': 'Account access is not enabled in this environment yet.',
  '请先登录主站账号': 'Please sign in to the main site first.',
  '登录已失效，请重新登录': 'Your session has expired. Please sign in again.',
  '登录服务暂时不可用': 'The sign-in service is temporarily unavailable.',
  '登录已失效': 'Your session has expired.',
  '请先验证开发者密码': 'Please verify the developer password first.',
  '此账号已停用': 'This account has been disabled.',
  '数据服务暂时不可用': 'The data service is temporarily unavailable.',
  '此账号未开通素材库或 DIY 静态': 'This account has no access to the asset library or DIY static editor.',
  '此账号未开通项目编辑功能': 'This account has no project editing access.',
  '账号已存在，或账号信息不符合要求': 'The account already exists, or the account details are invalid.',
  '服务暂时不可用，请稍后重试': 'The service is temporarily unavailable. Please try again later.',
  '账号服务暂时不可用，请稍后重试': 'The account service is temporarily unavailable. Please try again later.',
  '尝试次数过多，请一分钟后再试': 'Too many attempts. Please try again in a minute.',
  '请先设置开发者密码': 'Please set the developer password first.',
  '开发者密码不正确': 'Incorrect developer password.'
};
function translateServerError(msg) {
  if (!msg) return msg;
  if (state.lang === 'zh') return msg;
  if (SERVER_ERROR_TRANSLATIONS[msg]) return SERVER_ERROR_TRANSLATIONS[msg];
  // 带动态参数的错误（如 HTTP 状态码、文件名）做前缀匹配
  for (const zh in SERVER_ERROR_TRANSLATIONS) {
    if (msg.indexOf(zh) === 0) {
      const suffix = msg.slice(zh.length);
      return SERVER_ERROR_TRANSLATIONS[zh] + suffix;
    }
  }
  return msg;
}
let chartLibraryPromise = null;
  const LIBRARY_SOURCE_PAGE_SIZE = 500;
  const LIBRARY_SOURCE_MAX_ROWS = 5000;
  const LIBRARY_RENDER_STEP = 48;
  const LIBRARY_IMAGE_LOAD_TIMEOUT_MS = 12000;
  const LIBRARY_THUMBNAIL_TAG = 'vf:has-thumb:v1';
  const LIBRARY_PREVIEW_THUMBNAILS_TAG = 'vf:has-preview-thumbs:v1';
  // 正式站旧版（v561）每次打开素材库都会删掉 option_type='activity' 里非通用三项的选项，
  // 并把引用它们的 activity_id 清空——两站共用同一张表，测试站刚存的活动标签就这么没了。
  // 案例库的活动词表改用 case_activity 类型存放（旧版查询碰不到），读取时两类合并。
  const CASE_ACTIVITY_OPTION_TYPE = 'case_activity';
  const CASE_ACTIVITY_LEGACY_NAMES = ['日常活动', 'S级活动', '系列活动'];
  const LIBRARY_THUMBNAIL_BACKFILL_WIDTH = 480;
  const LIBRARY_THUMBNAIL_BACKFILL_DELAY_MS = 1200;
  // GIF 小动图逐个预览生成，用逐预览的标记 tag 记录（一个案例项目可能有多张 GIF 物料）。
  // :v2: 起带抽帧，旧标记的小动图在浏览时会按新规则自动重转。
  const LIBRARY_GIF_SMALL_TAG_PREFIX = 'vf:gif-small:v2:';
  const LIBRARY_GIF_SMALL_MIN_BYTES = 1.5 * 1024 * 1024;
  const LIBRARY_GIF_SMALL_MAX_FRAMES = 300;
  const LIBRARY_GIF_SMALL_MIN_EDGE = 200;
  // gif.js 是逐帧全量编码（不做帧间差量），只缩边长省不了多少字节；
  // 封面动图只是墙面预览，抽帧到约 12.5fps 能让体积再减半。
  const LIBRARY_GIF_SMALL_MAX_FPS = 12.5;
  // GIF 的逐帧全量压缩决定了它天生就大：同样尺寸和帧率下 MP4（H.264）只有它的
  // 零头。逐预览再产出一份无声循环视频 + 第一帧 poster，展示层优先用视频。
  const LIBRARY_GIF_VIDEO_TAG_PREFIX = 'vf:gif-video:v1:';
  const LIBRARY_GIF_VIDEO_CODEC = 'avc';
  // 目标码率 ≈ 像素数 × 帧率 × 该系数：只在 1/3 尺寸上编码，够还原平涂海报，
  // 又不至于让十几秒的动图回到 MB 级。
  const LIBRARY_GIF_VIDEO_BITS_PER_PIXEL = 0.25;
  const LIBRARY_GIF_VIDEO_MIN_BITRATE = 200000;
  const LIBRARY_GIF_VIDEO_MAX_BITRATE = 2500000;
  // 地址未就绪 / 下载中断这类失败要重排，但必须有上限，避免坏文件反复重试
  const LIBRARY_GIF_BACKFILL_MAX_ATTEMPTS = 3;
  // 动图（原图或 1/3 小动图）动辄几 MB 到十几 MB，12 秒的常规看门狗会在
  // 下载中途“恢复”并重启下载，导致封面永远加载不完；动图需要更长的观察窗口。
  const LIBRARY_GIF_IMAGE_LOAD_TIMEOUT_MS = 90000;
  const SUPABASE_IN_BATCH_SIZE = 200;
  const LIBRARY_PREVIEW_PAGE_SIZE = 1000; // 接口单次最多回 1000 行（v866 起物料查询按页拉全）
  const SIGNED_URL_BATCH_SIZE = 100;
  const SOURCE_EXTENSIONS = ['psd', 'psb', 'ai', 'pdf', 'zip', 'rar', '7z', 'gz', 'tar'];
  const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
  const PREVIEW_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
  const TEMPLATE_EXTENSIONS = ['json'];
  const LIBRARY_KIND_MARKERS = {
    gallery: 'vf:kind:gallery',
    source: 'vf:kind:source',
    template: 'vf:kind:template'
  };
  const LIBRARY_KIND_TABS = [
    { id: 'all', zh: '全部', en: 'All' },
    { id: 'source', zh: '案例库', en: 'Case Library' },
    { id: 'gallery', zh: '图库', en: 'Gallery' },
    { id: 'template', zh: '模板库', en: 'Templates' }
  ];
  const LIBRARY_TAGS = {
    gallery: {
      tag1: ['商家食物', '虚拟食物', 'LOGO素材', 'KIKI素材', '其他素材'],
      tag2ByTag1: {
        '商家食物': ['汉堡', '披萨', '阿拉伯菜', '三明治', '小吃', '健康餐', '烧烤', '甜品', '饮品', '炸物', '未分类'],
        '虚拟食物': ['汉堡', '披萨', '阿拉伯菜', '三明治', '小吃', '健康餐', '烧烤', '甜品', '饮品', '炸物', '未分类'],
        'LOGO素材': ['keeta logo', '商家logo', '未分类']
      }
    },
    source: {
      tag1: ['C端', 'B端', 'D端', 'M端'],
      tag2ByTag1: {
        'C端': ['开机海报', '弹窗', '头图', 'banner', '会场', '标签'],
        'B端': ['海报', '落地页'],
        'D端': ['骑手服装', '骑手装备'],
        'M端': ['社媒物料', 'OOH', 'OB']
      }
    },
    template: {
      tag1: ['模版', '组件'],
      tag2ByTag1: {
        '模版': ['社媒物料', 'C端物料'],
        '组件': ['标签', '背景', '品牌圆弧', 'LOGO', 'KIKI', '其他素材', '字体', '组合']
      }
    }
  };
  const LIBRARY_LABELS_EN = Object.freeze({
    '商家食物': 'Merchant Food',
    '虚拟食物': 'Virtual Food',
    'LOGO素材': 'Logo Assets',
    'KIKI素材': 'KIKI Assets',
    '其他素材': 'Other Assets',
    '汉堡': 'Burgers',
    '披萨': 'Pizza',
    '阿拉伯菜': 'Arabic Cuisine',
    '三明治': 'Sandwiches',
    '小吃': 'Snacks',
    '健康餐': 'Healthy Meals',
    '烧烤': 'Grilled Food',
    '甜品': 'Desserts',
    '饮品': 'Drinks',
    '炸物': 'Fried Food',
    '未分类': 'Unclassified',
    '商家logo': 'Merchant Logos',
    'C端': 'Consumer',
    'B端': 'Merchant',
    'D端': 'Courier',
    'M端': 'Marketing',
    '开机海报': 'Launch Posters',
    '弹窗': 'Pop-ups',
    '头图': 'Headers',
    '会场': 'Campaign Hubs',
    '标签': 'Tags',
    '海报': 'Posters',
    '落地页': 'Landing Pages',
    '骑手服装': 'Courier Apparel',
    '骑手装备': 'Courier Gear',
    '社媒物料': 'Social Media',
    '模版': 'Templates',
    '组件': 'Components',
    'C端物料': 'Consumer Materials',
    '背景': 'Backgrounds',
    '品牌圆弧': 'Brand Arcs',
    '字体': 'Fonts',
    '组合': 'Groups',
    '套组': 'Sets',
    '沙特阿拉伯': 'Saudi Arabia',
    '阿联酋': 'United Arab Emirates',
    '卡塔尔': 'Qatar',
    '科威特': 'Kuwait',
    '巴林': 'Bahrain',
    '阿曼': 'Oman',
    '一人食': 'Solo Dining',
    '聚餐': 'Group Dining',
    '品牌合作': 'Brand Partnership',
    '足球': 'Football',
    '世界杯': 'World Cup',
    '游戏': 'Gaming',
    '开学': 'Back to School',
    '夏日': 'Summer',
    '新年': 'New Year',
    '开斋节': 'Eid al-Fitr',
    '宰牲节': 'Eid al-Adha',
    '国庆节': 'National Day',
    '新人专属': 'New User Exclusive',
    '裂变': 'Referral',
    '大促': 'Mega Sale',
    '闪购': 'Flash Sale',
    '买一送一': 'Buy One Get One',
    '抽奖': 'Giveaway',
    '免运': 'Free Delivery',
    '银行卡': 'Bank Card',
    '手机': 'Phone',
    '耳机': 'Earbuds',
    '券': 'Coupon',
    '骑手': 'Courier',
    '国旗': 'National Flag',
    '商家赠品（手机、耳机、PS5）': 'Merchant Gifts (phone, earbuds, PS5)',
    '仅jpg/png/pdf': 'JPG / PNG / PDF Only',
    '含Psd文件': 'Includes PSD',
    '含Ai文件': 'Includes AI',
    '单素材': 'Single Asset',
    '成套素材': 'Asset Set'
  });
  // 检索别名（v664）：只覆盖「受控词表」（标签 / 物料类型 / 国家 / 活动 / 策略 / 元素 / 格式 / 数量）。
  // 这些词是有限集合，手写拼音比引入转换库更省、也不会误伤；英文另有 LIBRARY_LABELS_EN 可复用。
  const LIBRARY_SEARCH_PINYIN = Object.freeze({
    '商家食物': 'shangjia shiwu', '虚拟食物': 'xuni shiwu', 'LOGO素材': 'logo sucai',
    'KIKI素材': 'kiki sucai', '其他素材': 'qita sucai',
    '汉堡': 'hanbao', '披萨': 'pisa', '阿拉伯菜': 'alabo cai', '三明治': 'sanmingzhi',
    '小吃': 'xiaochi', '健康餐': 'jiankang can', '烧烤': 'shaokao', '甜品': 'tiandin',
    '饮品': 'yinpin', '炸物': 'zhawu', '未分类': 'weifenlei',
    'C端': 'cduan c duan', 'B端': 'bduan b duan', 'D端': 'dduan d duan', 'M端': 'mduan m duan',
    '开机海报': 'kaiji haibao', '弹窗': 'tanchuang', '头图': 'toutu', '会场': 'huichang',
    '标签': 'biaoqian', '海报': 'haibao', '落地页': 'luodiye',
    '骑手服装': 'qishou fuzhuang', '骑手装备': 'qishou zhuangbei', '骑手': 'qishou',
    '社媒物料': 'shemei wuliao',
    '模版': 'moban', '组件': 'zujian', 'C端物料': 'cduan wuliao', '套组': 'taozu',
    '背景': 'beijing', '品牌圆弧': 'pinpai yuanhu', '字体': 'ziti', '组合': 'zuhe',
    '沙特阿拉伯': 'shate shatealabo', '阿联酋': 'alianyu', '卡塔尔': 'kadaer',
    '科威特': 'keweite', '巴林': 'balin', '阿曼': 'aman',
    '一人食': 'yirenshi', '聚餐': 'jucan', '品牌合作': 'pinpai hezuo', '足球': 'zuqiu',
    '夏日': 'xiari', '新年': 'xinnian', '开斋节': 'kaizhaijie', '宰牲节': 'zaishengjie',
    '国庆节': 'guoqingjie',
    '新人专属': 'xinren zhuanshu', '裂变': 'liebian', '大促': 'dacu', '闪购': 'shangou',
    '买一送一': 'maiyi songyi', '抽奖': 'choujiang', '免运': 'mianyun',
    '银行卡': 'yinhangka', '券': 'quan', '国旗': 'guoqi',
    '商家赠品（手机、耳机、PS5）': 'shangjia zengpin',
    '单素材': 'dan sucai', '成套素材': 'chengtao sucai'
  });
  // 受控词表的英文同义词（LIBRARY_LABELS_EN 里缺的、或者口语化的说法）
  const LIBRARY_SEARCH_EN_EXTRA = Object.freeze({
    'C端': 'consumer c-side', 'B端': 'business b-side', 'D端': 'd-side', 'M端': 'm-side',
    '开机海报': 'splash launch', '弹窗': 'popup modal', '头图': 'header cover', '会场': 'venue hall',
    '标签': 'tag label', '落地页': 'landing', '骑手服装': 'courier apparel', '骑手装备': 'courier gear',
    '社媒物料': 'social media', '模版': 'template', '组件': 'component', 'C端物料': 'consumer materials',
    '背景': 'background', '品牌圆弧': 'brand arc', '字体': 'font', '组合': 'group',
    '未分类': 'uncategorized', '汉堡': 'burger', '披萨': 'pizza', '三明治': 'sandwich',
    '烧烤': 'grilled bbq', '炸物': 'fried', '健康餐': 'healthy meal', '阿拉伯菜': 'arabic',
    '沙特阿拉伯': 'saudi ksa', '阿联酋': 'uae emirates', '免运': 'free delivery', '国旗': 'flag',
    '买一送一': 'bogo'
  });
  // 「移动分组」功能范围：仅这 5 个组件子分组可移动（背景/LOGO/字体 不参与）。
  const MOVEABLE_COMPONENT_SUBTAGS = ['标签', '品牌圆弧', 'KIKI', '其他素材', '组合'];
  // 每次重新打开网页都从交付用的用户模式开始；开发者模式仅在当前会话内主动开启。
  const INITIAL_INTERFACE_MODE = 'user';
  const INTERFACE_MODE_TOGGLE_POSITION_KEY = 'vf_interface_mode_toggle_position';
  const DEVELOPER_BALL_VISIBILITY_KEY = 'vf_developer_ball_visible';
  const CASE_OWNER_NAMES_KEY = 'vf_case_owner_names';
  // Developer authorization is verified by the account-access service.
  let developerBallVisible = false;
  let interfaceModeDragState = null;
  let suppressInterfaceModeClick = false;
  const state = {
    lang: localStorage.getItem('vf_lang') || 'zh',
    supabase: null,
    session: null,
    profile: null,
    localPreview: false,
    emergencyMode: false,
    interfaceMode: INITIAL_INTERFACE_MODE,
    uiRestricted: INITIAL_INTERFACE_MODE === 'user',
    route: 'home',
    activeFrame: null,
    toolFrames: {},
    libraryOptions: [],
    librarySources: [],
    libraryPreviews: [],
    libraryItems: [],
    libraryPreviewUrls: {},
    libraryPreviewUrlSignedAt: {},
    libraryBookmarkMemberIds: new Set(),
    libraryBookmarkGroups: [],
    // DIY 回收站在真正清理云端前，先让父页素材库同步隐藏同一记录。
    librarySessionHiddenSourceIds: new Set(),
    libraryFavorites: new Set(),
    librarySelectedPreviewId: '',
    libraryDataLoaded: false,
    libraryDataPromise: null,
    libraryRecoveryLabel: '',
    libraryVisibleLimit: LIBRARY_RENDER_STEP,
    libraryMultiSelect: false,
    librarySelectedIds: new Set(),
    recentProjects: [],
    libraryFilters: {
      query: '',
      kind: 'all',
      tag1: 'all',
      tag2: 'all',
      tag3: 'all',
      tag4: 'all',
      country: 'all',
      activity: 'all',
      category: 'all',
      uploadTag1: 'all',
      uploadTag2: 'all',
      uploadTag3: 'all',
      uploadTag4: 'all',
      uploadCountry: 'all',
      uploadActivity: 'all',
      favorites: false,
      selectedCountries: [],
      selectedActivities: [],
      selectedStrategies: [],
      selectedElements: [],
      selectedFormats: [],
      selectedQuantities: [],
      searchHistory: []
    }
  };

  const els = {};
  const LIBRARY_PREVIEW_NODE_CACHE_LIMIT = 320;
  const libraryPreviewImageNodeCache = new Map();
  const libraryPreviewSigningPromises = new Map();
  // path → 失败时间。只冷却一小段时间，不整场会话拉黑：一次网络抖动就让封面
  // 去下几 MB 到十几 MB 的原图、并且再也回不到小图，代价远大于重试一次。
  const LIBRARY_THUMB_FAIL_COOLDOWN_MS = 60000;
  const libraryUnavailableThumbnailPaths = new Map();
  function libraryThumbUnavailable(path) {
    if (!path) return false;
    const failedAt = libraryUnavailableThumbnailPaths.get(path);
    if (!failedAt) return false;
    if (Date.now() - failedAt >= LIBRARY_THUMB_FAIL_COOLDOWN_MS) {
      libraryUnavailableThumbnailPaths.delete(path);
      return false;
    }
    return true;
  }
  function markLibraryThumbUnavailable(path) {
    if (path) libraryUnavailableThumbnailPaths.set(path, Date.now());
  }
  const libraryImageLoadTimers = new WeakMap();
  const libraryGeneratedThumbnailPathsBySourceId = new Map();
  const libraryGeneratedThumbnailPathsByPreviewId = new Map();
  // previewId → { video, poster }：本次会话已转好的无声循环视频及其首帧
  const libraryGeneratedGifVideoPathsByPreviewId = new Map();
  // 本次会话已确认转不出视频的 GIF（浏览器不支持或编码失败）：不再重复尝试，
  // 展示层继续用 1/3 小动图
  const libraryGifVideoUnavailablePreviewIds = new Set();
  const libraryThumbnailBackfillQueued = new Set();
  const libraryThumbnailBackfillQueue = [];
  let libraryThumbnailBackfillActive = false;
  let libraryThumbnailBackfillTimer = 0;
  let libraryInfiniteScrollTarget = null;
  let libraryInfiniteScrollFrame = 0;
  let librarySearchDebounceTimer = 0;
  let languageToggleInProgress = false;

  document.addEventListener('DOMContentLoaded', init);

  function t(key) {
    return (I18N[state.lang] && I18N[state.lang][key]) || I18N.zh[key] || key;
  }

  function libraryThumbnailPathForSource(source) {
    if (!source || !source.source_path || isBookmarkSource(source)) return '';
    const generatedPath = libraryGeneratedThumbnailPathsBySourceId.get(source.id);
    if (generatedPath) return generatedPath;
    const ext = String(source.source_ext || source.source_path.split('.').pop() || '').toLowerCase();
    const tags = Array.isArray(source.tags) ? source.tags : [];
    // 图片入库流程一直会生成 _thumb.jpg；JSON/PSD 等旧数据则从未生成，
    // 只有带显式标记的新素材才去请求，避免每张卡先等一次 404。
    if (!IMAGE_EXTENSIONS.includes(ext) && !tags.includes(LIBRARY_THUMBNAIL_TAG)) return '';
    return source.source_path.replace(/\/[^/]+$/, '/_thumb.jpg');
  }

  function libraryThumbnailPathForPreview(preview, source) {
    // GIF 不生成静态缩略图（会丢掉动效）：优先用后台转好的 1/3 小动图，
    // 还没有小动图时返回空，展示层继续用原图保持动效。
    if (isCaseGifPreview(preview)) {
      // 已转成无声循环视频的，静态位改用视频首帧 poster：图先出画面，
      // 视频元素随后盖上来播放，静止时也还有画面。
      const gifVideo = libraryGifVideoForPreview(preview, source);
      if (gifVideo?.poster) return gifVideo.poster;
      const generatedGifSmall = preview?.id ? libraryGeneratedThumbnailPathsByPreviewId.get(preview.id) : '';
      if (generatedGifSmall) return generatedGifSmall;
      const gifTags = Array.isArray(source?.tags) ? source.tags : [];
      if (preview?.id && preview.preview_path && gifTags.includes(libraryGifSmallMarker(preview.id))) {
        return preview.preview_path.replace(/\/[^/]+$/, '/_small-' + preview.id + '.gif');
      }
      return '';
    }
    const generatedPath = preview?.id ? libraryGeneratedThumbnailPathsByPreviewId.get(preview.id) : '';
    if (generatedPath) return generatedPath;
    const sourceThumb = libraryThumbnailPathForSource(source);
    if (sourceThumb) return sourceThumb;
    const tags = Array.isArray(source?.tags) ? source.tags : [];
    if (!preview?.id || !preview.preview_path || !tags.includes(LIBRARY_PREVIEW_THUMBNAILS_TAG)) return '';
    return preview.preview_path.replace(/\/[^/]+$/, '/_thumb-' + preview.id + '.jpg');
  }

  function init() {
    cacheEls();
    bindEvents();
    syncInterfaceModeControl();
    syncDeveloperBallVisibility();
    restoreInterfaceModeTogglePosition();
    exposeInterfaceModeApi();
    refreshTranslations();
    initSupabase();
    hydrateLibraryPreviewUrlCache();
    window.addEventListener('pagehide', persistLibraryPreviewUrlCache);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') persistLibraryPreviewUrlCache();
    });
    window.VFAccountAccess?.configure({
      panelRefresh() { if (state.route === 'admin') return renderAdmin(); },
      unlocked() { setDeveloperBallVisibility(true); setInterfaceMode('developer'); renderUserChip(); },
      locked() { setDeveloperBallVisibility(false); setInterfaceMode('user'); renderUserChip(); },
      modeSwitch(mode) { setDeveloperBallVisibility(true); setInterfaceMode(mode); renderUserChip(); },
      changed() {
        if (!window.VFAccountAccess.maintenance()) { state.interfaceMode = 'user'; state.uiRestricted = true; syncInterfaceModeControl(); broadcastInterfaceMode(); }
        else if (window.VFAccountAccess.snapshot()?.role === 'admin') setDeveloperBallVisibility(true);
        renderNav();
        if (!window.VFAccountAccess.can(state.route)) navigate(window.VFAccountAccess.firstRoute());
        else if (state.route === 'admin') void renderAdmin();
        // 功能位变化（如同步账号权限）后，素材库/首页的上传按钮要按新权限重画
        else if (state.route === 'library') void renderLibrary({ preserveView: true, useLoadedData: true });
        else if (state.route === 'home') void renderLibrary({ homeMode: true, preserveView: true, useLoadedData: true });
      }
    });
    patchAccountPanelForTeamRoster();
    restoreSession().catch(error => { showLogin(); showLoginMessage(error.message || (state.lang === 'zh' ? "登录暂时不可用，请刷新重试" : "Login is temporarily unavailable. Please refresh and retry."), true); });
  }

  function cacheEls() {
    [
      'login-view', 'app-shell', 'login-form', 'login-email', 'login-password',
      'login-message', 'local-preview-actions', 'nav-list', 'lang-toggle',
      'sign-out-btn', 'route-kicker', 'route-title', 'content', 'user-chip',
      'global-interface-mode-toggle', 'global-interface-mode-label',
      'project-modal', 'project-form', 'project-title-input',
      'project-save-note', 'project-modal-message', 'close-project-modal',
      'cancel-project-modal'
    ].forEach(id => {
      els[toCamel(id)] = document.getElementById(id);
    });
  }

  function toCamel(value) {
    return value.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  function bindEvents() {
    els.loginForm.addEventListener('submit', handleLogin);
    els.signOutBtn.addEventListener('click', signOut);
    els.langToggle.addEventListener('click', toggleLanguage);
    els.globalInterfaceModeToggle.addEventListener('click', handleInterfaceModeToggleClick);
    els.globalInterfaceModeToggle.addEventListener('pointerdown', startInterfaceModeToggleDrag);
    els.globalInterfaceModeToggle.addEventListener('pointermove', moveInterfaceModeToggleDrag);
    els.globalInterfaceModeToggle.addEventListener('pointerup', finishInterfaceModeToggleDrag);
    els.globalInterfaceModeToggle.addEventListener('pointercancel', cancelInterfaceModeToggleDrag);
    window.addEventListener('resize', clampInterfaceModeTogglePosition);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') scheduleLibraryThumbnailBackfill();
    });
    els.projectForm.addEventListener('submit', saveProject);
    els.closeProjectModal.addEventListener('click', closeProjectModal);
    els.cancelProjectModal.addEventListener('click', closeProjectModal);
    els.localPreviewActions.addEventListener('click', event => {
      const btn = event.target.closest('button[data-role]');
      if (btn) startLocalPreview(btn.dataset.role);
    });
    window.addEventListener('hashchange', () => {
      navigate((location.hash || '#home').slice(1));
    });
    // 静态DIY模板同步消息监听
    window.addEventListener('message', handleToolMessage);
    document.getElementById('global-ai-task-close')?.addEventListener('click', hideGlobalAITaskStatus);
    document.getElementById('global-ai-task-cancel')?.addEventListener('click', cancelGlobalAITask);
    // 全局拖拽上传：从桌面拖图片到页面任意位置，自动弹出上传弹窗
    var dropOverlay = document.createElement('div');
    dropOverlay.id = 'global-drop-overlay';
    dropOverlay.innerHTML = '<div class="global-drop-inner"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round"><path d="M12 3v14"/><path d="M5 10l7-7 7 7"/><path d="M4 17h16v4H4z"/></svg><strong>' + (state.lang === 'zh' ? '释放以添加入库' : 'Drop to upload') + '</strong><span>' + (state.lang === 'zh' ? '支持 JPG / PNG / WEBP，大图自动压缩' : 'JPG / PNG / WEBP, auto-compress large images') + '</span></div>';
    dropOverlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);align-items:center;justify-content:center;flex-direction:column;pointer-events:none;';
    document.body.appendChild(dropOverlay);
    var dragCounter = 0;
    window.addEventListener('dragover', function(event) {
      event.preventDefault();
    }, { capture: true });
    window.addEventListener('dragenter', function(event) {
      event.preventDefault();
      if (!canUploadAssets()) return;
      dragCounter++;
      var files = Array.from(event.dataTransfer.files || []);
      var hasImage = files.some(function(f) { return (f.type || '').startsWith('image/'); });
      if (hasImage || !event.dataTransfer.types || event.dataTransfer.types.indexOf('Files') !== -1) {
        dropOverlay.style.display = 'flex';
      }
    }, { capture: true });
    document.addEventListener('dragleave', function(event) {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropOverlay.style.display = 'none';
      }
    });
    window.addEventListener('drop', function(event) {
      event.preventDefault();
      dragCounter = 0;
      dropOverlay.style.display = 'none';
      if (!canUploadAssets()) return;
      var uploadModal = document.getElementById('library-upload-modal');
      if (uploadModal && !uploadModal.hidden) return;
      if (document.getElementById('case-project-backdrop')) return;
      var el = event.target;
      if (el && el.closest && el.closest('.library-drop-zone')) return;
      var files = Array.from(event.dataTransfer.files || []);
      if (!files.length) return;
      var imageFiles = files.filter(function(f) { return (f.type || '').startsWith('image/'); });
      if (!imageFiles.length) return;
      if (state.route !== 'library') {
        navigate('library');
        setTimeout(function() {
          openLibraryUploadModal({ files: imageFiles });
        }, 500);
      } else {
        openLibraryUploadModal({ files: imageFiles });
      }
    }, { capture: true });
  }

  function toolFrameCache() {
    let cache = document.getElementById('tool-frame-cache');
    if (!cache) {
      cache = document.createElement('div');
      cache.id = 'tool-frame-cache';
      cache.className = 'tool-frame-cache';
      cache.hidden = true;
      els.appShell.querySelector('.main-area').appendChild(cache);
    }
    return cache;
  }

  function parkActiveToolFrame() {
    const cache = document.getElementById('tool-frame-cache');
    if (cache) cache.hidden = true;
    if (els.content) els.content.hidden = false;
    state.activeFrame = null;
  }

  function ensureToolFrameMount(type) {
    const cache = toolFrameCache();
    let mount = cache.querySelector(`[data-tool-mount="${type}"]`);
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'tool-frame-mount';
      mount.dataset.toolMount = type;
      mount.hidden = true;
      if (type === 'static') {
        mount.innerHTML = `<div class="tool-entry-loading" role="status" aria-live="polite">
          <span class="tool-entry-spinner" aria-hidden="true"></span>
          <strong>${state.lang === 'zh' ? '正在准备 DIY 画板' : 'Preparing the DIY canvas'}</strong>
          <span>${state.lang === 'zh' ? '首次加载较长，请耐心等待' : 'The first load may take longer. Please wait.'}</span>
        </div>`;
      }
      cache.appendChild(mount);
    }
    return mount;
  }

  // v830：公司网络会封锁 *.supabase.co 直连（rest/storage 早已改道 /api/account-data，
  // 唯独 /auth/v1/ 登录仍直连，导致登录 502）。这里把 auth 请求改道自建中继，
  // 服务端在海外可正常访问 Supabase。同源请求不需要处理 CORS。
  function supabaseAuthRelayFetch(input, init) {
    try {
      const url = new URL(typeof input === 'string' ? input : (input && input.url) || '', location.href);
      if (url.origin === new URL(config.supabaseUrl, location.href).origin && url.pathname.startsWith('/auth/v1/')) {
        const relay = new URL('/api/auth-relay', location.href);
        relay.searchParams.set('path', url.pathname + url.search);
        const headers = new Headers(init && init.headers);
        const nextInit = { ...(init || {}) };
        if (headers.get('apikey') === config.supabaseAnonKey) {
          headers.delete('apikey');
          nextInit.headers = headers;
        }
        return window.fetch(relay.href, nextInit);
      }
    } catch (_error) { /* 非法 URL 时按原请求走 */ }
    return window.fetch(input, init);
  }

  function initSupabase() {
    if (window.supabase && config.supabaseUrl && config.supabaseAnonKey) {
      state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { global: { fetch: window.VFAccountAccess?.enabled ? window.fetch.bind(window) : supabaseAuthRelayFetch }, auth: window.VFAccountAccess?.authOptions() || {} });
      state.supabase.auth.onAuthStateChange((_event, session) => {
        if (!session && (state.emergencyMode || isEmergencyToken((window.VFAccountAccess?.getToken() || '')))) return;
        const previousUser = state.session?.user?.id;
        if (previousUser && previousUser !== session?.user?.id) {
          _templateSourceCache?.cancel();
          templateOpenGeneration++;
          _templateSnapshotCache = {}; _templateSnapshotPromises = {}; _templateSnapshotRecency = []; _templateSnapshotBytes = {}; _templateMetadataCache = {};
          window.VFAccountAccess?.clear();
          Object.values(state.toolFrames || {}).forEach(frame => frame.remove());
          state.toolFrames = {}; state.activeFrame = null;
          const mounts = document.getElementById('tool-frame-cache');
          if (mounts) mounts.replaceChildren();
          setDeveloperBallVisibility(false);
          state.interfaceMode = 'user'; state.uiRestricted = true;
          showLogin();
        }
        state.session = session;
        syncAccessToken();
      });
    }
    const canLocalPreview = config.allowLocalPreviewLogin && ['localhost', '127.0.0.1', ''].includes(location.hostname);
    els.localPreviewActions.hidden = !canLocalPreview;
  }

  async function restoreSession() {
    const savedToken = (window.VFAccountAccess?.getToken() || '');
    if (isEmergencyToken(savedToken)) {
      const restored = await restoreEmergencySession(savedToken);
      if (restored) return;
    }
    if (!state.supabase) {
      showLogin();
      showLoginMessage('Supabase config is missing or SDK failed to load.', true);
      return;
    }
    const initialRoute = (location.hash || '#home').slice(1);
    const cachedStaticSession = initialRoute === 'static' && !window.VFAccountAccess?.enabled ? readCachedSupabaseSession() : null;
    if (cachedStaticSession) {
      // 静态 DIY 不需要管理员权限才能绘制本地编辑器。先用 Supabase 已持久化
      // 的 session 立即显示框架，再后台刷新 token 与权威 profile，避免多标签页
      // 锁或 token refresh 让“验证登录状态”长时间占屏。
      state.session = cachedStaticSession;
      syncAccessToken();
      state.profile = sessionProfileFallback(cachedStaticSession.user);
      showApp();
      void verifyCachedStaticSession();
      return;
    }
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session;
    syncAccessToken();
    if (!state.session) {
      showLogin();
      return;
    }
    if (initialRoute === 'static' && !window.VFAccountAccess?.enabled) {
      // The profile query is a separate network round-trip and is not required to
      // start the static editor. Use the signed-in user's metadata immediately so
      // the DIY frame and its loading state mount on the first authenticated paint,
      // then reconcile the authoritative profile without rebuilding the frame.
      state.profile = sessionProfileFallback(state.session.user);
      showApp();
      void loadProfile().then(function() {
        renderUserChip();
        renderNav();
      }).catch(function(error) {
        console.warn('Profile refresh after app start failed:', error);
      });
    } else {
      // Admin and library routes still wait for the authoritative role so a stale
      // metadata role cannot briefly expose or redirect a protected route.
      await loadProfile();
      showApp();
    }
    void logAssetEvent('login');
  }

  function readCachedSupabaseSession() {
    try {
      const projectRef = new URL(config.supabaseUrl).hostname.split('.')[0];
      if (!projectRef) return null;
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
      if (!raw) return null;
      const stored = JSON.parse(raw);
      const session = stored?.currentSession || stored?.session || stored;
      return session?.access_token && session?.user?.id ? session : null;
    } catch (_error) {
      return null;
    }
  }

  async function verifyCachedStaticSession() {
    try {
      const { data, error } = await state.supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        state.session = null;
        syncAccessToken();
        showLogin();
        return;
      }
      state.session = data.session;
      syncAccessToken();
      await loadProfile();
      renderUserChip();
      renderNav();
      void logAssetEvent('login');
    } catch (error) {
      // 短暂网络错误不能把已持久化的 DIY 会话立即踢回登录页；
      // Supabase 的后续 auth 事件仍会同步最终状态。
      console.warn('Background session verification failed:', error);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    showLoginMessage('');
    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    if (!state.supabase) {
      await emergencyLogin(email, password, 'Supabase SDK is not ready.');
      return;
    }
    try {
      const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (isSupabaseNetworkError(error)) {
          await emergencyLogin(email, password, error.message);
          return;
        }
        showLoginMessage(error.message, true);
        return;
      }
      state.localPreview = false;
      state.emergencyMode = false;
      state.session = data.session;
      syncAccessToken();
      await loadProfile();
      showApp();
      void logAssetEvent('login');
    } catch (error) {
      if (isSupabaseNetworkError(error)) {
        await emergencyLogin(email, password, error.message);
        return;
      }
      showLoginMessage(error.message || (state.lang === 'zh' ? '登录失败。' : 'Login failed.'), true);
    }
  }

  function isSupabaseNetworkError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('failed to fetch') ||
      message.includes('fetch failed') ||
      message.includes('network') ||
      message.includes('unreachable') ||
      message.includes('service for this project is restricted') ||
      message.includes('exceed_egress_quota') ||
      message.includes('exceed_cached_egress_quota') ||
      message.includes('spend caps');
  }

  function isEmergencyToken(value) {
    return String(value || '').startsWith('vfem.');
  }

  function emergencyApiBase() {
    const host = String(location.hostname || '').toLowerCase();
    const isProduction = host === 'gccdesign.app' || host.endsWith('.pages.dev');
    return isProduction ? '' : 'https://gccdesign.app';
  }

  async function emergencyLogin(email, password, reason = '') {
    showLoginMessage(state.lang === 'zh' ? '主登录服务暂不可用，正在启用应急登录...' : 'Primary login is unavailable. Trying emergency login...');
    try {
      const response = await fetch(emergencyApiBase() + '/api/emergency-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(translateServerError(data.message) || `HTTP ${response.status}`);
      startEmergencySession(data.profile, data.token);
    } catch (error) {
      const detail = error.message || reason || 'Emergency login failed.';
      showLoginMessage(state.lang === 'zh' ? `登录服务不可用：${detail}` : `Login unavailable: ${detail}`, true);
    }
  }

  async function restoreEmergencySession(token) {
    try {
      const response = await fetch(emergencyApiBase() + '/api/emergency-session', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(translateServerError(data.message) || `HTTP ${response.status}`);
      startEmergencySession(data.profile, token);
      return true;
    } catch (error) {
      window.VFAccountAccess?.saveToken('');
      console.warn('Emergency session restore failed:', error);
      return false;
    }
  }

  async function loadProfile() {
    if (window.VFAccountAccess?.enabled) {
      const accountAccess = await window.VFAccountAccess.refresh();
      if (!window.VFAccountAccess.maintenance()) { state.interfaceMode = 'user'; state.uiRestricted = true; syncInterfaceModeControl(); }
      else if (accountAccess.role === 'admin') {
        // 管理员账号：悬浮球常驻，且默认直接进入开发者模式
        setDeveloperBallVisibility(true);
        setInterfaceMode('developer');
      }
      state.profile = { id: accountAccess.userId, email: accountAccess.email, display_name: accountAccess.displayName, role: accountAccess.role === 'admin' ? 'admin' : 'operator', status: accountAccess.status };
      return;
    }
    const user = state.session && state.session.user;
    if (!user || !state.supabase) return;
    const fallback = sessionProfileFallback(user);
    const { data, error } = await state.supabase
      .from('vf_profiles')
      .select('id,email,display_name,role,status')
      .eq('id', user.id)
      .maybeSingle();
    state.profile = data || { ...fallback, setup_error: error ? error.message : '' };
  }

  function sessionProfileFallback(user) {
    return {
      id: user.id,
      email: user.email || '',
      display_name: user.user_metadata?.display_name || user.email || 'User',
      role: user.user_metadata?.role || 'operator'
    };
  }

  function startLocalPreview(role) {
    state.localPreview = true;
    state.emergencyMode = false;
    state.profile = {
      id: `local_${role}`,
      email: `${role}@local.preview`,
      display_name: role === 'operator' ? 'Local Operator' : role === 'designer' ? 'Local Designer' : 'Local Admin',
      role
    };
    state.session = { access_token: 'local-preview-token', user: { id: state.profile.id } };
    syncAccessToken();
    showApp();
  }

  function startEmergencySession(profile, token) {
    state.localPreview = true;
    state.emergencyMode = true;
    state.profile = {
      id: profile.id,
      email: profile.email || '',
      display_name: profile.display_name || profile.email || 'Emergency User',
      role: profile.role || 'operator'
    };
    state.session = {
      access_token: token,
      user: {
        id: state.profile.id,
        email: state.profile.email
      }
    };
    syncAccessToken();
    showApp();
  }

  async function signOut() {
    if (window.VFAccountAccess?.enabled) { await window.VFAccountAccess.lock().catch(() => {}); window.VFAccountAccess.clear(); }
    window.VFAccountAccess?.saveToken('');
    state.session = null;
    state.profile = null;
    state.localPreview = false;
    state.emergencyMode = false;
    const wasIsolated = window.VFAccountAccess?.isolated();
    if (state.supabase) await state.supabase.auth.signOut(wasIsolated ? { scope: 'local' } : undefined);
    // 同页打开的账号会话只属于本次浏览：退出时清干净隔离标记，
    // 避免下一次登录被误存进 sessionStorage 的隔离槽位。
    if (wasIsolated) {
      try { const isolatedKey = sessionStorage.getItem('vf_isolated_storage_key'); if (isolatedKey) sessionStorage.removeItem(isolatedKey); } catch (e) {}
      sessionStorage.removeItem('vf_account_isolated');
      sessionStorage.removeItem('vf_isolated_storage_key');
      sessionStorage.removeItem('vf_isolated_access_token');
      sessionStorage.removeItem('vf_isolated_user');
    }
    showLogin();
  }

  function syncAccessToken() {
    if (state.session?.access_token) {
      window.VFAccountAccess?.saveToken(state.session.access_token);
    } else {
      window.VFAccountAccess?.saveToken('');
    }
  }

  function showLogin() {
    els.loginView.classList.remove('is-session-checking');
    els.loginView.hidden = false;
    els.appShell.hidden = true;
  }

  function showApp() {
    if (window.VFAccountAccess?.enabled && !window.VFAccountAccess.snapshot() && !state.localPreview) {
      window.VFAccountAccess.refresh().then(showApp).catch(error => { showLogin(); showLoginMessage(error.message, true); });
      return;
    }
    els.loginView.classList.remove('is-session-checking');
    els.loginView.hidden = true;
    els.appShell.hidden = false;
    renderNav();
    renderUserChip();
    navigate((location.hash || '#home').slice(1));
    scheduleStaticToolPrewarm();
  }

  function loadChartLibrary() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (chartLibraryPromise) return chartLibraryPromise;
    chartLibraryPromise = new Promise(function(resolve, reject) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.async = true;
      script.onload = function() {
        if (window.Chart) resolve(window.Chart);
        else reject(new Error('Chart.js loaded without a global Chart constructor.'));
      };
      script.onerror = function() {
        chartLibraryPromise = null;
        reject(new Error('Chart.js failed to load.'));
      };
      document.head.appendChild(script);
    });
    return chartLibraryPromise;
  }

  function interfaceModePayload() {
    return {
      type: 'vf:interface-mode',
      mode: state.interfaceMode,
      isDeveloper: state.interfaceMode === 'developer',
      isUser: state.interfaceMode === 'user'
    };
  }

  function syncInterfaceModeControl() {
    const mode = state.interfaceMode === 'user' ? 'user' : 'developer';
    state.interfaceMode = mode;
    state.uiRestricted = mode === 'user';
    document.documentElement.dataset.vfMode = mode;
    document.body.dataset.vfMode = mode;
    if (els.appShell) els.appShell.dataset.vfMode = mode;
    const toggle = els.globalInterfaceModeToggle;
    const label = els.globalInterfaceModeLabel;
    const isDeveloper = mode === 'developer';
    if (toggle) {
      toggle.dataset.mode = mode;
      toggle.setAttribute('aria-pressed', String(isDeveloper));
      toggle.setAttribute('aria-label', state.lang === 'zh'
        ? (isDeveloper ? '切换到用户模式' : '切换到开发者模式')
        : (isDeveloper ? 'Switch to user mode' : 'Switch to developer mode'));
      toggle.removeAttribute('title');
      const mark = toggle.querySelector('.global-interface-mode-mark');
      if (mark) mark.textContent = isDeveloper ? 'DEV' : 'USER';
    }
    if (label) label.textContent = state.lang === 'zh'
      ? (isDeveloper ? '开发者模式' : '用户模式')
      : (isDeveloper ? 'Developer' : 'User mode');
    window.VF_INTERFACE_MODE = mode;
  }

  function isDeveloperBallVisible() {
    return developerBallVisible;
  }

  function syncDeveloperBallVisibility() {
    if (els.globalInterfaceModeToggle) {
      els.globalInterfaceModeToggle.hidden = !isDeveloperBallVisible();
    }
  }

  function setDeveloperBallVisibility(visible) {
    developerBallVisible = visible === true;
    // 旧版本曾把显示状态持久化；清除它，确保下次打开仍默认隐藏。
    localStorage.removeItem(DEVELOPER_BALL_VISIBILITY_KEY);
    syncDeveloperBallVisibility();
  }

  function broadcastInterfaceMode(targetFrame) {
    const frames = targetFrame ? [targetFrame] : Object.values(state.toolFrames || {});
    frames.forEach(frame => {
      try {
        if (frame?.contentDocument?.documentElement) frame.contentDocument.documentElement.dataset.vfMode = state.interfaceMode;
        if (frame?.contentDocument?.body) frame.contentDocument.body.dataset.vfMode = state.interfaceMode;
      } catch (_error) {}
      try { frame?.contentWindow?.postMessage(interfaceModePayload(), location.origin); } catch (_error) {}
    });
  }

  function broadcastUiLanguage(targetFrame) {
    const frames = targetFrame ? [targetFrame] : Object.values(state.toolFrames || {});
    frames.forEach(frame => {
      try { frame?.contentWindow?.postMessage({ type: 'vf:ui-language', lang: state.lang }, location.origin); } catch (_error) {}
    });
  }

  function exposeInterfaceModeApi() {
    window.VF_GET_INTERFACE_MODE = () => state.interfaceMode;
    window.VF_SET_INTERFACE_MODE = mode => setInterfaceMode(mode);
  }

  function setInterfaceMode(mode, options = {}) {
    if (window.VFAccountAccess?.enabled && !state.localPreview) {
      if (mode === 'developer' && !window.VFAccountAccess.maintenance()) { window.VFAccountAccess.promptUnlock(); return state.interfaceMode; }
    }
    const nextMode = mode === 'user' ? 'user' : 'developer';
    const changed = state.interfaceMode !== nextMode;
    state.interfaceMode = nextMode;
    state.uiRestricted = nextMode === 'user';
    if (nextMode === 'user') {
      const globalDropOverlay = document.getElementById('global-drop-overlay');
      if (globalDropOverlay) globalDropOverlay.style.display = 'none';
      document.querySelectorAll('.library-drop-zone.dragging').forEach(function(zone) { zone.classList.remove('dragging'); });
      closeLibraryUploadModal();
    }
    localStorage.setItem('vf_interface_mode', nextMode);
    syncInterfaceModeControl();
    renderUserChip();
    broadcastInterfaceMode();
    window.dispatchEvent(new CustomEvent('vf:interface-mode-change', { detail: interfaceModePayload() }));
    if (options.rerender === false || !els.appShell || els.appShell.hidden) return nextMode;

    const routeAllowed = ROUTES.some(route => route.id === state.route
      && (window.VFAccountAccess?.enabled || !route.adminOnly || currentRole() === 'admin')
      && (window.VFAccountAccess?.enabled || !state.uiRestricted || RESTRICTED_UI_ROUTES.has(route.id))
      && (!window.VFAccountAccess?.enabled || state.localPreview || window.VFAccountAccess.can(route.id)));
    if (!routeAllowed) {
      navigate('library');
    } else if (state.route === 'admin') {
      renderNav();
      void renderAdmin();
    } else if (state.route === 'library' && state.uiRestricted) {
      setRestrictedLibraryDefault();
      renderNav();
      void renderLibrary();
    } else if (changed) {
      renderNav();
      // 切回开发者模式时上传按钮要跟着回来，否则要等下一次重绘才出现
      if (state.route === 'library') void renderLibrary({ preserveView: true, useLoadedData: true });
      else if (state.route === 'home') void renderLibrary({ homeMode: true, preserveView: true, useLoadedData: true });
    }
    return nextMode;
  }

  function toggleInterfaceMode() {
    setInterfaceMode(state.interfaceMode === 'developer' ? 'user' : 'developer');
  }

  function handleInterfaceModeToggleClick(event) {
    if (suppressInterfaceModeClick) {
      suppressInterfaceModeClick = false;
      event.preventDefault();
      return;
    }
    toggleInterfaceMode();
  }

  function clampInterfaceModeTogglePoint(x, y) {
    const toggle = els.globalInterfaceModeToggle;
    const width = toggle?.offsetWidth || 48;
    const height = toggle?.offsetHeight || 48;
    const safe = window.innerWidth <= 720 ? 12 : 16;
    return {
      x: Math.max(safe, Math.min(window.innerWidth - width - safe, x)),
      y: Math.max(safe, Math.min(window.innerHeight - height - safe, y))
    };
  }

  function positionInterfaceModeToggle(x, y, animate = false) {
    const toggle = els.globalInterfaceModeToggle;
    if (!toggle) return;
    const point = clampInterfaceModeTogglePoint(x, y);
    toggle.style.left = point.x + 'px';
    toggle.style.top = point.y + 'px';
    toggle.style.right = 'auto';
    toggle.style.bottom = 'auto';
    toggle.dataset.tooltipSide = point.x + toggle.offsetWidth / 2 < window.innerWidth / 2 ? 'right' : 'left';
    if (!animate) toggle.style.transition = 'none';
    requestAnimationFrame(function() {
      if (!animate) toggle.style.removeProperty('transition');
    });
  }

  function persistInterfaceModeTogglePosition(side, y) {
    const toggle = els.globalInterfaceModeToggle;
    const available = Math.max(1, window.innerHeight - (toggle?.offsetHeight || 48));
    localStorage.setItem(INTERFACE_MODE_TOGGLE_POSITION_KEY, JSON.stringify({
      side: side === 'left' ? 'left' : 'right',
      yRatio: Math.max(0, Math.min(1, y / available))
    }));
  }

  function restoreInterfaceModeTogglePosition() {
    const toggle = els.globalInterfaceModeToggle;
    if (!toggle) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(INTERFACE_MODE_TOGGLE_POSITION_KEY) || 'null'); } catch (_error) {}
    if (!saved || (saved.side !== 'left' && saved.side !== 'right')) {
      toggle.dataset.tooltipSide = 'left';
      return;
    }
    const safe = window.innerWidth <= 720 ? 12 : 16;
    const x = saved.side === 'left' ? safe : window.innerWidth - toggle.offsetWidth - safe;
    const y = Number(saved.yRatio || 0) * Math.max(1, window.innerHeight - toggle.offsetHeight);
    positionInterfaceModeToggle(x, y, false);
  }

  function startInterfaceModeToggleDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const toggle = els.globalInterfaceModeToggle;
    const rect = toggle.getBoundingClientRect();
    interfaceModeDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      dragging: false
    };
    toggle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveInterfaceModeToggleDrag(event) {
    const drag = interfaceModeDragState;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) < 4) return;
    drag.dragging = true;
    suppressInterfaceModeClick = true;
    els.globalInterfaceModeToggle.dataset.dragging = 'true';
    positionInterfaceModeToggle(drag.originX + dx, drag.originY + dy, false);
    event.preventDefault();
  }

  function finishInterfaceModeToggleDrag(event) {
    const drag = interfaceModeDragState;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const toggle = els.globalInterfaceModeToggle;
    toggle.releasePointerCapture?.(event.pointerId);
    if (drag.dragging) {
      const rect = toggle.getBoundingClientRect();
      const side = rect.left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
      const safe = window.innerWidth <= 720 ? 12 : 16;
      const snapX = side === 'left' ? safe : window.innerWidth - rect.width - safe;
      const point = clampInterfaceModeTogglePoint(snapX, rect.top);
      toggle.dataset.dragging = 'false';
      positionInterfaceModeToggle(point.x, point.y, true);
      persistInterfaceModeTogglePosition(side, point.y);
      // 部分触摸浏览器拖动结束后不会派发 click，避免下一次正常点击被误吞。
      setTimeout(function() { suppressInterfaceModeClick = false; }, 350);
    }
    interfaceModeDragState = null;
  }

  function cancelInterfaceModeToggleDrag(event) {
    if (!interfaceModeDragState || interfaceModeDragState.pointerId !== event.pointerId) return;
    els.globalInterfaceModeToggle.dataset.dragging = 'false';
    interfaceModeDragState = null;
    setTimeout(function() { suppressInterfaceModeClick = false; }, 0);
  }

  function clampInterfaceModeTogglePosition() {
    const toggle = els.globalInterfaceModeToggle;
    if (!toggle || !toggle.style.left) return;
    restoreInterfaceModeTogglePosition();
  }

  function renderNav() {
    els.navList.innerHTML = '';
    ROUTES
      .filter(route => !route.hidden
        && (window.VFAccountAccess?.enabled || !route.adminOnly || currentRole() === 'admin')
        && (window.VFAccountAccess?.enabled || !state.uiRestricted || RESTRICTED_UI_ROUTES.has(route.id))
      && (!window.VFAccountAccess?.enabled || state.localPreview || window.VFAccountAccess.can(route.id)))
      .forEach(route => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `nav-item ${state.route === route.id ? 'active' : ''}`;
        button.dataset.route = route.id;
        button.title = t(route.title);
        button.setAttribute('aria-label', t(route.title));
        button.innerHTML = `<span class="nav-icon" aria-hidden="true">${navIcon(route.icon)}</span><span class="nav-label">${t(route.title)}</span>`;
        button.addEventListener('click', () => {
          location.hash = route.id;
          navigate(route.id);
        });
        els.navList.appendChild(button);
      });
  }

  // 账号体系下，角色标签跟随账号本身（管理员账号恒为「管理员」），
  // 不随当前是否处于开发者模式变化；功能权限判断仍走 currentRole()。
  function displayRole() {
    if (window.VFAccountAccess?.enabled && !state.localPreview) {
      const snapshot = window.VFAccountAccess.snapshot?.();
      if (snapshot) return snapshot.role === 'admin' ? 'admin' : 'operator';
    }
    return currentRole();
  }

  function renderUserChip() {
    const profile = state.profile || {};
    const name = profile.display_name || profile.email || 'User';
    els.userChip.innerHTML = `
      <span class="user-avatar">${escapeHtml((name || 'U').slice(0, 1).toUpperCase())}</span>
      <span>${escapeHtml(name)}</span>
      <span class="user-role">${escapeHtml(roleLabel(displayRole()))}</span>
    `;
  }

  function navigate(routeId) {
    closeAnalyticsPreview();
    if (routeId !== 'library') state.libraryScrollToSource = null;
    parkActiveToolFrame();
    const allowed = ROUTES.some(route => route.id === routeId
      && (window.VFAccountAccess?.enabled || !route.adminOnly || currentRole() === 'admin')
      && (window.VFAccountAccess?.enabled || !state.uiRestricted || RESTRICTED_UI_ROUTES.has(route.id))
      && (!window.VFAccountAccess?.enabled || state.localPreview || window.VFAccountAccess.can(route.id)));
    state.route = allowed ? routeId : (window.VFAccountAccess?.enabled && !state.localPreview ? window.VFAccountAccess.firstRoute() : (state.uiRestricted ? 'library' : 'home'));
    if ((location.hash || '').slice(1) !== state.route) {
      history.replaceState(null, '', location.pathname + location.search + '#' + state.route);
    }
    els.appShell.dataset.route = state.route;
    if (els.projectModal) els.projectModal.hidden = true;
    renderNav();
    const route = ROUTES.find(item => item.id === state.route);
    els.routeKicker.textContent = state.emergencyMode ? 'Emergency Mode' : state.localPreview ? 'Local Preview' : 'gccdesign.app';
    els.routeTitle.textContent = t(route.title);
    if (state.route === 'home') renderCreativeHome();
    if (state.route === 'library') {
      if (state.uiRestricted && !state.libraryScrollToSource) setRestrictedLibraryDefault();
      renderLibrary({ useLoadedData: !!state.libraryScrollToSource });
      setTimeout(scheduleLibraryThumbnailBackfill, 0);
    }
    if (state.route === 'static') renderTool('static');
    if (state.route === 'icons') renderTool('icons');
    if (state.route === 'dynamic') renderTool('dynamic');
    if (state.route === 'request') renderRequestFlow();
    if (state.route === 'admin') renderAdmin();
    if (state.route === 'analytics') renderAnalyticsPage();
  }

  function setRestrictedLibraryDefault() {
    state.libraryFilters.kind = 'template';
    state.libraryFilters.tag1 = '模版';
    state.libraryFilters.tag2 = '社媒物料';
    state.libraryFilters.tag3 = 'all';
    state.libraryFilters.tag4 = 'all';
    state.libraryFilters.selectedCountries = [];
    state.libraryFilters.selectedActivities = [];
    state.libraryFilters.selectedStrategies = [];
    state.libraryFilters.selectedElements = [];
    state.libraryFilters.selectedFormats = [];
    state.libraryFilters.selectedQuantities = [];
    state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
  }

  function navIcon(icon) {
    const icons = {
      home: '<svg viewBox="0 0 24 24"><path d="M3 12l2-2m0 0 7-7 7 7M5 10v10a1 1 0 001 1h3m10-11 2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
      library: '<svg viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
      static: '<svg viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      dynamic: '<svg viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>',
      request: '<svg viewBox="0 0 24 24"><path d="M5 5.5h14v10H8.5L5 19V5.5Z"/><path d="M8.5 9h7M8.5 12h4.5"/></svg>',
      admin: '<svg viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
      analytics: '<svg viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>'
    };
    return icons[icon] || '';
  }

  function renderCreativeHome() {
    return renderLibrary({ homeMode: true });
  }

  function renderHomeInspirationCard(title, colorA, colorB, size, action) {
    return `
      <article class="inspiration-card ${size || ''}">
        <img src="${escapeAttr(localPreviewArtwork(title, colorA, colorB, '#111827'))}" alt="${escapeAttr(title)}">
        <div class="inspiration-overlay">
          <span>${escapeHtml(title)}</span>
          ${action ? `<button type="button">${escapeHtml(action)}</button>` : ''}
        </div>
      </article>
    `;
  }

  function wireCreativeHome() {
    document.querySelectorAll('.home-page-demo [data-route], .home-tool-card[data-route], .section-row button[data-route]').forEach(node => {
      node.addEventListener('click', () => {
        location.hash = node.dataset.route;
        navigate(node.dataset.route);
      });
    });
    document.querySelectorAll('.home-chips button[data-query]').forEach(button => {
      button.addEventListener('click', () => {
        state.libraryFilters.query = button.dataset.query || '';
        location.hash = 'library';
        navigate('library');
      });
    });
    document.querySelectorAll('.home-channel-row button[data-query], .home-tool-switches button[data-query]').forEach(button => {
      button.addEventListener('click', () => {
        state.libraryFilters.query = button.dataset.query || '';
        location.hash = 'library';
        navigate('library');
      });
    });
    document.querySelectorAll('.home-tool-switches button[data-route]').forEach(button => {
      button.addEventListener('click', () => {
        location.hash = button.dataset.route;
        navigate(button.dataset.route);
      });
    });
    document.querySelectorAll('[data-placeholder="request"]').forEach(node => {
      node.addEventListener('click', () => {
        location.hash = 'request';
        navigate('request');
      });
    });
    document.getElementById('home-search-form')?.addEventListener('submit', event => {
      event.preventDefault();
      state.libraryFilters.query = document.getElementById('home-search-input').value.trim();
      location.hash = 'library';
      navigate('library');
    });
  }

  function wireHomeCommandComposer() {
    const form = document.getElementById('home-command-form');
    const prompt = document.getElementById('library-hero-search');
    const upload = document.getElementById('home-command-upload');
    const references = document.getElementById('home-command-references');
    const sizeTrigger = document.getElementById('home-size-trigger');
    const sizeMenu = document.getElementById('home-size-menu');
    const skillsTrigger = document.getElementById('home-skills-trigger');
    const skillsMenu = document.getElementById('home-skills-menu');
    const modelTrigger = document.getElementById('home-model-trigger');
    const modelMenu = document.getElementById('home-model-menu');

    const setMenuState = (menu, trigger, open) => {
      if (!menu || !trigger) return;
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      trigger.querySelector('.home-menu-chevron')?.classList.toggle('is-open', open);
    };
    const closeHomeMenus = except => {
      [[skillsMenu, skillsTrigger], [sizeMenu, sizeTrigger], [modelMenu, modelTrigger]].forEach(([menu, trigger]) => {
        if (menu !== except) setMenuState(menu, trigger, false);
      });
    };
    window.__vfCloseHomeMenus = closeHomeMenus;

    document.querySelectorAll('.home-command-stage [data-route]').forEach(button => {
      button.addEventListener('click', () => {
        const route = button.dataset.route;
        if (!route) return;
        location.hash = route;
        navigate(route);
      });
    });

    let referenceFiles = [];
    const renderReferences = files => {
      if (!references) return;
      const nextFiles = [...referenceFiles.map(entry => entry.file), ...Array.from(files || [])].slice(0, 8);
      referenceFiles.forEach(file => {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      });
      referenceFiles = nextFiles.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
      references.innerHTML = referenceFiles.map((entry, index) => {
        const file = entry.file;
        return `<span class="home-command-reference" title="${escapeAttr(file.name)}"><img src="${escapeAttr(entry.previewUrl)}" alt="${state.lang === 'zh' ? '参考图' : 'Reference'} ${index + 1}"></span>`;
      }).join('');
      references.classList.toggle('has-references', referenceFiles.length > 0);
      const addButton = referenceFiles.length < 8 ? `<button type="button" class="home-command-add-reference" aria-label="${state.lang === 'zh' ? '添加参考图，最多 8 张' : 'Add references, up to 8'}">+</button>` : '';
      references.insertAdjacentHTML('beforeend', addButton);
      references.querySelector('.home-command-add-reference')?.addEventListener('click', () => upload?.click());
    };

    upload?.addEventListener('change', event => {
      renderReferences(event.target.files);
      event.target.value = '';
    });
    sizeTrigger?.addEventListener('click', event => {
      event.stopPropagation();
      const open = !!sizeMenu?.hidden;
      closeHomeMenus(sizeMenu);
      setMenuState(sizeMenu, sizeTrigger, open);
    });
    skillsTrigger?.addEventListener('click', event => {
      event.stopPropagation();
      const open = !!skillsMenu?.hidden;
      closeHomeMenus(skillsMenu);
      setMenuState(skillsMenu, skillsTrigger, open);
    });
    prompt?.addEventListener('input', () => {
      if (/@(?:[^@\s]*)$/.test(prompt.value)) {
        closeHomeMenus(skillsMenu);
        setMenuState(skillsMenu, skillsTrigger, true);
      }
    });
    modelTrigger?.addEventListener('click', event => {
      event.stopPropagation();
      const open = !!modelMenu?.hidden;
      closeHomeMenus(modelMenu);
      setMenuState(modelMenu, modelTrigger, open);
    });
    modelMenu?.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        const label = button.textContent.replace('✓', '').trim();
        modelTrigger.querySelector('strong').textContent = label;
        modelMenu.querySelectorAll('button').forEach(item => item.classList.toggle('is-selected', item === button));
        modelMenu.querySelectorAll('.home-option-check').forEach(check => { check.textContent = check.closest('button') === button ? '✓' : ''; });
        setMenuState(modelMenu, modelTrigger, false);
      });
    });
    sizeMenu?.querySelectorAll('[data-home-size]').forEach(button => {
      button.addEventListener('click', () => {
        const size = button.dataset.homeSize || '1:1';
        sizeTrigger.querySelector('strong').textContent = size;
        sizeMenu.querySelectorAll('[data-home-size]').forEach(item => item.classList.toggle('is-selected', item === button));
        sizeMenu.querySelectorAll('.home-option-check').forEach(check => { check.textContent = check.closest('button') === button ? '✓' : ''; });
        setMenuState(sizeMenu, sizeTrigger, false);
      });
    });
    if (window.__vfHomeSizeMenuHandler) document.removeEventListener('click', window.__vfHomeSizeMenuHandler);
    window.__vfHomeSizeMenuHandler = event => {
      if (!event.target.closest('.home-command-controls')) closeHomeMenus();
    };
    document.addEventListener('click', window.__vfHomeSizeMenuHandler);
    form?.addEventListener('submit', event => {
      event.preventDefault();
      state.libraryFilters.query = prompt?.value.trim() || '';
      location.hash = 'library';
      navigate('library');
    });
  }

  async function loadHomeRecentProjects() {
    const mount = document.getElementById('home-recent-projects');
    if (!mount) return;
    try {
      state.recentProjects = await fetchRecentProjects(6);
      renderHomeRecentProjects();
    } catch (error) {
      console.warn('Recent projects failed:', error);
      mount.hidden = true;
    }
  }

  async function fetchRecentProjects(limit = 6) {
    if (state.localPreview || !state.supabase) {
      return JSON.parse(localStorage.getItem('vf_local_projects') || '[]').slice(0, limit);
    }
    const { data, error } = await state.supabase
      .from('vf_projects')
      .select('id,title,project_type,updated_at,snapshot_meta,data_path')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  function renderHomeRecentProjects() {
    const mount = document.getElementById('home-recent-projects');
    if (!mount) return;
    if (!state.recentProjects.length) {
      mount.hidden = true;
      mount.innerHTML = '';
      return;
    }
    mount.hidden = false;
    mount.innerHTML = `
      <div class="home-recent-head">
        <span>${t('recentProjects')}</span>
        <small>${state.recentProjects.length}</small>
      </div>
      <div class="home-recent-list">
        ${state.recentProjects.map(project => `
          <button class="home-project-chip" type="button" data-open-project="${project.id}">
            <span>${escapeHtml(project.title)}</span>
            <small>${projectTypeLabel(project.project_type)} · ${formatDate(project.updated_at)}</small>
          </button>
        `).join('')}
      </div>
    `;
    mount.querySelectorAll('[data-open-project]').forEach(button => {
      button.addEventListener('click', async () => {
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span>${state.lang === 'zh' ? '正在打开...' : 'Opening...'}</span>`;
        try {
          await openSavedProject(button.dataset.openProject);
        } catch (error) {
          alert(error.message || (state.lang === 'zh' ? '打开项目失败' : 'Open project failed'));
          button.disabled = false;
          button.innerHTML = original;
        }
      });
    });
  }

  function projectTypeLabel(type) {
    if (type === 'dynamic') return state.lang === 'zh' ? '动态' : 'Motion';
    return state.lang === 'zh' ? '静态' : 'Static';
  }

  async function openSavedProject(projectId) {
    const project = state.recentProjects.find(item => item.id === projectId);
    if (!project) throw new Error(state.lang === 'zh' ? '没有找到项目记录。' : 'Project record was not found.');
    const snapshot = await loadProjectSnapshot(project);
    if (!snapshot || snapshot.schema !== 'vf-project-snapshot/v1') {
      throw new Error(state.lang === 'zh' ? '这个项目缺少可恢复的编辑器快照。' : 'This project does not include a restorable editor snapshot.');
    }
    snapshot.title = project.title;
    const target = project.project_type === 'dynamic' ? 'dynamic' : 'static';
    location.hash = target;
    navigate(target);
    await waitForToolImporter();
    const result = await state.activeFrame.contentWindow.VF_IMPORT_PROJECT(snapshot);
    if (result && result.success === false) throw new Error(result.message || 'Import failed');
  }

  async function loadProjectSnapshot(project) {
    if (state.localPreview || !state.supabase) {
      return project.snapshot || project.snapshot_meta;
    }
    if (!project.data_path) throw new Error(state.lang === 'zh' ? '项目缺少快照路径。' : 'Project is missing its snapshot path.');
    const { data, error } = await state.supabase.storage.from('vf-projects').download(project.data_path);
    if (error) throw error;
    return JSON.parse(await data.text());
  }

  function waitForToolImporter(timeoutMs = 10000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (state.activeFrame?.contentWindow && typeof state.activeFrame.contentWindow.VF_IMPORT_PROJECT === 'function') {
            resolve();
            return;
          }
        } catch (_error) {}
        if (Date.now() - start > timeoutMs) {
          reject(new Error(state.lang === 'zh' ? '编辑器还没有准备好，请稍后再试。' : 'The editor is not ready yet. Please try again.'));
          return;
        }
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  function renderRequestFlow() {
    parkActiveToolFrame();
    els.content.innerHTML = `
      <div class="request-page">
        <section class="request-hero">
          <div class="request-visual" aria-hidden="true"></div>
          <div>
            <div class="kicker">REQUEST FLOW</div>
            <h3>${state.lang === 'zh' ? '提需流程' : 'Request Flow'}</h3>
            <p>${state.lang === 'zh' ? '需求提交、排期、交付归档会放在这里。' : 'Requests, scheduling, and delivery archive will live here.'}</p>
          </div>
        </section>
        <section class="request-steps">
          <article><span>01</span><strong>${state.lang === 'zh' ? '提交需求' : 'Submit'}</strong></article>
          <article><span>02</span><strong>${state.lang === 'zh' ? '确认排期' : 'Schedule'}</strong></article>
          <article><span>03</span><strong>${state.lang === 'zh' ? '交付归档' : 'Archive'}</strong></article>
        </section>
      </div>
    `;
  }

  async function renderLibrary({ homeMode = false, preserveView = false, useLoadedData = false } = {}) {
    parkActiveToolFrame();
    const previousScrollTop = preserveView && els.content ? els.content.scrollTop : 0;
    if (preserveView) rememberRenderedLibraryPreviewImages(document.getElementById('library-grid'));
    const canUpload = canUploadAssets();
    const activeKind = state.libraryFilters.kind || 'all';
    const libraryCountsPending = isLibraryCountPending();
    // DIY 预热可能已填入轻量 source 数据，但 previews、签名 URL 和书签
    // 关系仍未就绪。数字可以提前显示，首次进入素材库仍必须保留加载动画。
    const libraryInitialLoadPending = !state.libraryDataLoaded;
    var kindCounts = { all: 0, source: 0, gallery: 0, template: 0 };
    var countableLibrarySources = visibleLibrarySourcesForSession();
    if (countableLibrarySources.length) {
      kindCounts.all = countableLibrarySources.length;
      for (var i = 0; i < countableLibrarySources.length; i++) {
        var k = libraryKindOfSource(countableLibrarySources[i]);
        if (k === 'source' || k === 'gallery' || k === 'template') kindCounts[k]++;
      }
    }
    els.content.innerHTML = `
      <div class="library-page ${homeMode ? 'library-page-home' : ''}">
        ${homeMode ? `
        <section class="library-hero home-command-stage">
          <div class="home-command-kicker">GCC CREATIVE WORKSPACE</div>
          <div class="library-hero-title home-command-title"><span>hey，</span><strong>${state.lang === 'zh' ? '你的高效设计伙伴' : 'Your efficient design partner'}</strong></div>
          <form id="home-command-form" class="home-command-composer" aria-label="${state.lang === 'zh' ? '创作需求输入' : 'Creative brief'}">
            <div class="home-command-main">
              <div id="home-command-references" class="home-command-references"></div>
              <label class="home-command-upload" title="${state.lang === 'zh' ? '添加参考图片' : 'Add references'}">
                <input id="home-command-upload" type="file" accept="image/png,image/jpeg,image/webp" multiple>
                <span>+</span>
              </label>
              <textarea id="library-hero-search" rows="4" placeholder="${state.lang === 'zh' ? '上传参考图、输入文字描述或 @ 使用功能' : 'Upload a reference, enter a brief, or use @ tools'}">${escapeHtml(state.libraryFilters.query)}</textarea>
            </div>
            <div class="home-command-controls">
              <div class="home-prompt-menu-wrap">
                <button class="home-control-button" id="home-skills-trigger" type="button" aria-expanded="false"><span aria-hidden="true">✦</span>Skills<svg class="home-menu-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.25 3.5 3.5 3.5-3.5"/></svg></button>
                <div class="home-prompt-menu" id="home-skills-menu" hidden>
                  <label class="home-skill-option"><span>${state.lang === 'zh' ? '一键替换食物' : 'Replace food'}</span><input type="checkbox" data-home-skill="replace-food"></label>
                  <label class="home-skill-option"><span>${state.lang === 'zh' ? '一键高清' : 'Upscale'}</span><input type="checkbox" data-home-skill="upscale"></label>
                  <label class="home-skill-option"><span>${state.lang === 'zh' ? '智能扩图' : 'Outpaint'}</span><input type="checkbox" data-home-skill="outpaint"></label>
                </div>
              </div>
              <div class="home-size-wrap">
                <button class="home-control-button home-size-trigger" id="home-size-trigger" type="button" aria-expanded="false"><span class="home-ratio-icon" aria-hidden="true"></span><strong>1:1</strong><svg class="home-menu-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.25 3.5 3.5 3.5-3.5"/></svg></button>
                <div class="home-size-menu" id="home-size-menu" hidden>
                  <div>${['16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16', '3:3.75'].map(size => `<button type="button" class="${size === '1:1' ? 'is-selected' : ''}" data-home-size="${size}"><i class="home-ratio-icon" style="--ratio:${size.replace(':', '/')}"></i><span>${size}</span><span class="home-option-check">${size === '1:1' ? '✓' : ''}</span></button>`).join('')}</div>
                </div>
              </div>
              <div class="home-prompt-menu-wrap home-model-wrap">
                <button class="home-control-button home-model-trigger" id="home-model-trigger" type="button" aria-expanded="false"><svg class="home-model-spark" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.15c.38 0 .69.31.69.69a5.47 5.47 0 0 0 5.47 5.47.69.69 0 1 1 0 1.38A5.47 5.47 0 0 0 8.69 14.16a.69.69 0 1 1-1.38 0A5.47 5.47 0 0 0 1.84 8.69a.69.69 0 1 1 0-1.38 5.47 5.47 0 0 0 5.47-5.47c0-.38.31-.69.69-.69Z"/></svg><strong>GPT ${state.lang === 'zh' ? '大模型' : 'Model'}</strong><svg class="home-menu-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.25 3.5 3.5 3.5-3.5"/></svg></button>
                <div class="home-prompt-menu home-model-menu" id="home-model-menu" hidden>
                  <button type="button" class="is-selected"><span>GPT ${state.lang === 'zh' ? '大模型' : 'Model'}</span><span class="home-option-check">✓</span></button>
                  <button type="button"><span>${state.lang === 'zh' ? '火山大模型' : 'Volc Model'}</span><span class="home-option-check"></span></button>
                  <button type="button"><span>${state.lang === 'zh' ? '即梦本机' : 'Jimeng Local'}</span><span class="home-option-check"></span></button>
                </div>
              </div>
              <button class="home-command-submit" type="submit" aria-label="${state.lang === 'zh' ? '发送' : 'Send'}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg></button>
            </div>
          </form>
        </section>` : `
        <section class="library-hero">
          <div class="library-hero-panel">
            <div class="library-hero-badge">${state.lang === 'zh' ? 'GCC Creative 1.1 已上线 ↗' : 'GCC Creative 1.1 is live ↗'}</div>
            <div class="library-hero-title">
              <span>Hey</span>
              <img class="library-hero-kiki" src="./assets/kiki-home.png" alt="" aria-hidden="true">
              <strong>${state.lang === 'zh' ? '你的高效设计伙伴' : 'Your efficient design partner'}</strong>
            </div>
            <label class="library-hero-command" aria-label="${state.lang === 'zh' ? '搜索素材或发起创作' : 'Search or create'}">
              <input id="library-hero-search" placeholder="${state.lang === 'zh' ? '输入任务或搜索素材' : 'Enter a task or search assets'}" value="${escapeAttr(state.libraryFilters.query)}">
              <button type="button" data-route="library" aria-label="${state.lang === 'zh' ? '进入超级库' : 'Open library'}">↑</button>
            </label>
          </div>
        </section>`}

        <div class="library-pin-strip" id="library-pin-strip">
        <section class="library-control-strip" style="margin-left:0!important;margin-inline:0!important;padding-left:0!important;padding-right:0!important;background:transparent!important;border:none!important;border-radius:0!important;width:100%!important">
          <div class="library-kind-tabs" role="tablist" style="position:relative;">
            <div class="kind-tab-indicator" style="position:absolute;bottom:0;height:3px;background:#111827;border-radius:999px;transition:left 0.3s ease,width 0.3s ease;pointer-events:none;z-index:1;"></div>
            ${LIBRARY_KIND_TABS.map(tab => `<button type="button" class="${activeKind === tab.id ? 'active' : ''}" data-library-kind="${tab.id}">${escapeHtml(state.lang === 'zh' ? tab.zh : tab.en)}<small> · ${libraryCountsPending ? '…' : (kindCounts[tab.id] || 0)}</small></button>`).join('')}
          </div>
          <div class="library-control-actions">
            <div id="library-expansion-chips" class="library-expansion-chips" hidden></div>
            <div class="search-wrap">
              <label class="library-search-pill" aria-label="${state.lang === 'zh' ? '搜索内容' : 'Search'}">
                <input id="library-search" placeholder="" value="${escapeAttr(state.libraryFilters.query)}">
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></span>
              </label>
              <div id="search-history-dropdown" class="search-history-dropdown" hidden>
                <div class="search-history-list" id="search-history-list"></div>
              </div>
            </div>
            <label class="library-ai-switch" title="${state.lang === 'zh' ? '开启后 AI 会联想相关词一起搜索' : 'AI expands your search with related terms'}">
              <input type="checkbox" id="library-ai-switch"${librarySearchExactOnly() ? '' : ' checked'}>
              <span class="library-ai-switch-track"><span class="library-ai-switch-thumb"></span></span>
              <span class="library-ai-switch-text">${state.lang === 'zh' ? 'AI 搜索' : 'AI'}</span>
            </label>
            <div class="library-upload-area">
              ${canUpload ? `<button class="library-upload-pill" type="button" id="open-upload-modal">＋ ${state.lang === 'zh' ? '上传素材' : 'Upload'}</button>` : ''}
            </div>
            <div class="filter-dropdown-wrap">
              <button class="ghost-btn" type="button" id="library-filter-btn">${state.lang === 'zh' ? '筛选 ▾' : 'Filter ▾'}</button>
              <div id="library-filter-panel" class="filter-dropdown" hidden>
              <div class="filter-section" data-filter-section="country">
                <h4>${state.lang === 'zh' ? '国家' : 'Country'}</h4>
                <div class="filter-capsules" data-filter-options="country"></div>
              </div>
              <div class="filter-section" data-filter-section="activity">
                <h4>${state.lang === 'zh' ? '活动主题' : 'Theme'}</h4>
                <div class="filter-capsules" data-filter-options="activity"></div>
              </div>
              <div class="filter-section" data-filter-section="strategy">
                <h4>${state.lang === 'zh' ? '业务策略' : 'Strategy'}</h4>
                <div class="filter-capsules" data-filter-options="strategy"></div>
              </div>
              <div class="filter-section" data-filter-section="element">
                <h4>${state.lang === 'zh' ? '元素' : 'Element'}</h4>
                <div class="filter-capsules" data-filter-options="element"></div>
              </div>
              <div class="filter-section" data-filter-section="format">
                <h4>${state.lang === 'zh' ? '格式' : 'Format'}</h4>
                <div class="filter-capsules" data-filter-options="format"></div>
              </div>
              <div class="filter-section" data-filter-section="quantity">
                <h4>${state.lang === 'zh' ? '数量' : 'Quantity'}</h4>
                <div class="filter-capsules" data-filter-options="quantity"></div>
              </div>
              <div class="filter-section">
                <h4>${state.lang === 'zh' ? '收藏' : 'Favorites'}</h4>
                <div class="filter-capsules">
                  <button type="button" id="filter-favorites-btn" class="filter-capsule${state.libraryFilters.favorites ? ' active' : ''}" data-value="toggle">${state.libraryFilters.favorites ? '★' : '☆'} ${state.lang === 'zh' ? '仅收藏' : 'Favorites only'}</button>
                </div>
              </div>
              </div>
            </div>
          </div>
                  <div id="library-tag-rows" class="library-tag-rows">${renderLibraryTagRows(activeKind)}</div>
        </section>
        </div>

        <section id="library-status" class="library-status${libraryInitialLoadPending ? ' is-loading' : ''}">${libraryInitialLoadPending ? libraryLoadingMarkup(state.lang === 'zh' ? '正在加载素材库…' : 'Loading library…') : ''}</section>
        <section class="library-board" style="margin-left:0!important;margin-inline:0!important;padding-left:0!important;width:100%!important">
          <section id="library-grid" class="library-grid"></section>
          <aside id="library-inspector" class="library-inspector"></aside>
        </section>

        ${canUpload ? renderUploadModal() : ''}
        ${renderEditModal()}
        ${renderBatchEditModal()}
        ${renderLibraryDetailModal()}
        ${renderMoveGroupModal()}
        <div id="context-menu" role="menu" aria-label="${state.lang === 'zh' ? '操作菜单' : 'Context menu'}"></div>
        <div id="multi-select-bar">
          <span class="bar-count">${state.lang === 'zh' ? '已选 0 项' : '0 selected'}</span>
          <button class="bar-edit" data-bar-action="edit">${state.lang === 'zh' ? '批量编辑' : 'Batch edit'}</button>
          <button class="bar-download" data-bar-action="download">${state.lang === 'zh' ? '批量下载' : 'Download'}</button>
          <button class="bar-delete" data-bar-action="delete">${state.lang === 'zh' ? '批量删除' : 'Delete'}</button>
          <button class="bar-move" data-bar-action="move">${state.lang === 'zh' ? '移动分组' : 'Move group'}</button>
          <button class="bar-cancel" data-bar-action="cancel">${state.lang === 'zh' ? '取消' : 'Cancel'}</button>
        </div>
      </div>
    `;
    wireLibraryShell();
    // 检索栏自动收起纯属观感增强，任何异常都不该拖垮素材库渲染
    try { bindLibraryPinAutoHide(); } catch (error) { console.warn('[library] pin auto-hide failed:', error); }
    if (homeMode) wireHomeCommandComposer();
    // 语言切换只使用已在内存中的素材数据，不再额外触发一次后台拉取。
    // 这样内容区的重绘会在同一帧内完成，不会出现类似整页刷新的白屏。
    if (useLoadedData && state.libraryDataLoaded) refreshLibraryLoadedUi();
    else await loadLibraryData();
    if (preserveView && els.content) {
      els.content.scrollTop = previousScrollTop;
      requestAnimationFrame(function() {
        if (els.content) els.content.scrollTop = previousScrollTop;
      });
    }
    await finishLibrarySourceLocation();
  }

  function refreshKindTabCounts() {
    var counts = { all: 0, source: 0, gallery: 0, template: 0 };
    var countableLibrarySources = visibleLibrarySourcesForSession();
    if (countableLibrarySources.length) {
      counts.all = countableLibrarySources.length;
      for (var i = 0; i < countableLibrarySources.length; i++) {
        var k = libraryKindOfSource(countableLibrarySources[i]);
        if (counts[k] !== undefined) counts[k]++;
      }
    }
    document.querySelectorAll('[data-library-kind]').forEach(function(btn) {
      var kind = btn.dataset.libraryKind;
      if (counts[kind] !== undefined) {
        var label = btn.textContent.replace(/ · .*$/, '');
        btn.innerHTML = label + '<small> · ' + counts[kind] + '</small>';
      }
    });
  }

  function isLibraryCountPending() {
    return !state.libraryDataLoaded && (!Array.isArray(state.librarySources) || state.librarySources.length === 0);
  }

  function visibleLibrarySourcesForSession() {
    var hidden = state.librarySessionHiddenSourceIds;
    return (state.librarySources || []).filter(function(source) {
      return !hidden || !hidden.has(source.id);
    });
  }

  function libraryLoadingMarkup(label) {
    return `<span class="library-loading-indicator" role="status" aria-live="polite"><span class="library-loading-spinner" aria-hidden="true"></span><span>${escapeHtml(label || (state.lang === 'zh' ? '正在加载素材库…' : 'Loading library…'))}</span></span>`;
  }

  function setLibraryLoadingState(active, label) {
    const status = document.getElementById('library-status');
    if (!status) return;
    status.classList.toggle('is-loading', !!active);
    if (active) status.innerHTML = libraryLoadingMarkup(label);
  }

  function refreshLibraryFilterCounts() {
    refreshKindTabCounts();
    var tagRows = document.getElementById('library-tag-rows');
    if (tagRows) {
      tagRows.innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
      wireLibraryTagButtons();
      requestAnimationFrame(function() {
        updateKindTabIndicator();
        alignTagRows();
      });
    }
  }

  function refreshLibraryLoadedUi() {
    renderLibrarySelects();
    refreshLibraryFilterCounts();
    renderLibraryGrid();
  }

  function renderUploadModal() {
    const defaultKind = 'source';
    return `
      <div id="library-upload-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '上传素材入库' : 'Upload asset'}</h3>
            <button class="icon-btn" id="close-library-upload" type="button" aria-label="${state.lang === 'zh' ? '关闭' : 'Close'}">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>
            </button>
          </div>
          <form id="library-upload-form" class="library-form">
            <input type="hidden" name="library_kind" id="library-upload-kind" value="${defaultKind}">
            <div class="library-upload-scroll">
              <div class="library-upload-section">
                <div class="library-kind-card-grid" role="radiogroup" aria-label="${state.lang === 'zh' ? '入库位置' : 'Library section'}">
                  <button type="button" class="library-kind-card ${defaultKind === 'source' ? 'active' : ''}" data-upload-kind-card="source">
                    <strong>${state.lang === 'zh' ? '案例库' : 'Case Library'}</strong>
                  </button>
                  <button type="button" class="library-kind-card ${defaultKind === 'gallery' ? 'active' : ''}" data-upload-kind-card="gallery">
                    <strong>${state.lang === 'zh' ? '图库' : 'Gallery'}</strong>
                  </button>
                  <button type="button" class="library-kind-card ${defaultKind === 'template' ? 'active' : ''}" data-upload-kind-card="template">
                    <strong>${state.lang === 'zh' ? '模板库' : 'Templates'}</strong>
                  </button>
                </div>
              </div>
              <div data-upload-mode="gallery">
                <div class="library-drop-zone" data-drop-input="library-gallery-input" data-gallery-preview="true">
                  <input name="gallery_files" id="library-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" multiple>
                  <div class="drop-zone-head">
                    <div class="drop-zone-icon">${CLOUD_UPLOAD_ICON}</div>
                    <span class="upload-zone-main">${state.lang === 'zh' ? '把图片拖到这里上传' : 'Drop images here to upload'}</span>
                    <span class="upload-zone-sub">${state.lang === 'zh' ? '支持 JPG / PNG / WEBP，可多选' : 'JPG / PNG / WEBP, multiple allowed'}</span>
                    <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No files selected'}</small>
                  </div>
                </div>
                <div id="gallery-drop-panel" class="case-drop-grid case-drop-panel" data-gallery-strip hidden></div>
              </div>
              <div data-upload-mode="source-legacy" hidden>
                <div class="library-drop-zone" data-drop-input="library-source-input">
                  <input name="source_file" id="library-source-input" type="file" accept=".psd,.psb,.ai,.pdf,.zip,.rar,.7z,.gz,.tar,application/pdf,application/zip,application/x-rar-compressed,application/x-7z-compressed,application/gzip,application/x-tar">
                  <span>${state.lang === 'zh' ? '源文件' : 'Source file'}</span>
                  <strong>${state.lang === 'zh' ? '拖拽 1 个 PSD / PSB / AI / PDF / ZIP 到这里' : 'Drop one PSD / PSB / AI / PDF / ZIP here'}</strong>
                  <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No file selected'}</small>
                </div>
              </div>
              <div class="case-upload-box" data-upload-mode="source">
                <div class="library-drop-zone case-drop-zone" data-drop-input="library-preview-input" data-case-preview="true">
                  <input name="preview_files" id="library-preview-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.gif,.mp4,.mov,.webm" multiple>
                  <div class="case-zone-head">
                    <div class="case-zone-icon">${CLOUD_UPLOAD_ICON}</div>
                    <div class="case-zone-texts">
                      <span class="upload-zone-main">${state.lang === 'zh' ? '把素材拖到这里上传' : 'Drop materials here to upload'}</span>
                      <span class="upload-zone-sub">${state.lang === 'zh' ? '支持 JPG / PNG / WEBP / GIF / MP4（或 MOV），最多 100 张' : 'JPG / PNG / WEBP / GIF / MP4 (or MOV), up to 100'}</span>
                      <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No files selected'}</small>
                    </div>
                  </div>
                </div>
                <div id="case-drop-panel" class="case-drop-grid case-drop-panel" data-case-strip hidden></div>
              </div>
              <div data-upload-mode="template">
                <div class="library-drop-zone" data-drop-input="library-template-input">
                  <input name="template_file" id="library-template-input" type="file" accept=".json,image/jpeg,image/png,image/webp">
                  <div class="drop-zone-icon">${CLOUD_UPLOAD_ICON}</div>
                  <span class="upload-zone-main">${state.lang === 'zh' ? '把模板文件拖到这里上传' : 'Drop template file here to upload'}</span>
                  <span class="upload-zone-sub">${state.lang === 'zh' ? '支持 JSON 或 JPG / PNG / WEBP' : 'JSON or JPG / PNG / WEBP'}</span>
                  <small data-file-summary>${state.lang === 'zh' ? '未选择文件' : 'No file selected'}</small>
                  <div class="drop-thumb-strip" data-thumb-strip style="display:none;"></div>
                </div>
              </div>

              <label><span id="library-upload-title-label">${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" id="library-upload-title" maxlength="120" placeholder="${state.lang === 'zh' ? '选填，不填则不显示名称' : 'Optional'}"></label>
              <div class="upload-tags-line">
                <div id="library-upload-tag-controls" class="library-upload-tags">${renderUploadTagControls(defaultKind)}</div>
                <div class="library-form-grid two" id="upload-meta-row">
                  <div class="upload-tag-picker" data-upload-tag-picker="country" id="upload-country-field">
                    <span>${state.lang === 'zh' ? '国家' : 'Country'}</span>
                    <input type="hidden" name="country" value="all" data-upload-tag-input="country">
                    <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="country">
                      <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                    </button>
                    <div class="upload-tag-menu" role="menu" data-upload-meta-menu="country"></div>
                  </div>
                  <div class="upload-tag-picker" data-upload-tag-picker="activity" id="upload-activity-field">
                    <span>${state.lang === 'zh' ? '活动主题' : 'Theme'}</span>
                    <input type="hidden" name="activity" value="all" data-upload-tag-input="activity">
                    <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="activity">
                      <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                    </button>
                    <div class="upload-tag-menu" role="menu" data-upload-meta-menu="activity"></div>
                  </div>
                </div>
              </div>
              <div class="library-form-grid library-form-grid-owner" data-upload-mode="source">
                <label class="case-field-secondary"><span>${state.lang === 'zh' ? '物料所有者' : 'Material owner'}</span>${renderOwnerCombobox({ inputId: 'library-upload-owner' })}</label>
                <label class="case-field-secondary"><span>${state.lang === 'zh' ? '项目链接' : 'Project link'}</span><input name="project_link" inputmode="url" maxlength="500" autocomplete="off" placeholder="${state.lang === 'zh' ? '填写文档链接' : 'Doc link'}"></label>
                <label class="case-field-secondary"><span>${state.lang === 'zh' ? '下载链接' : 'Download link'}</span><input name="download_link" inputmode="url" maxlength="500" autocomplete="off" placeholder="${state.lang === 'zh' ? '填写大象网盘链接' : 'Drive link'}"></label>
              </div>
              <div id="upload-case-tag-bar" class="case-tag-bar" hidden>${renderCaseTagBar(null)}</div>
            </div>
            <div class="library-upload-footer">
              <div id="library-upload-message" class="message"></div>
              <div class="modal-actions">
                <button class="ghost-btn" id="cancel-library-upload" type="button">${t('cancel')}</button>
                <button class="primary-btn" type="submit">${state.lang === 'zh' ? '上传入库' : 'Upload'}</button>
              </div>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  function renderUploadTagControls(kind) {
    const emptyLabel = state.lang === 'zh' ? '未分类' : 'Unclassified';
    const rows = uploadLibraryTagRows(kind);
    return rows.map(row => {
      const isTag1 = row.key === 'tag1';
      const items = isTag1 ? row.values : ['all', ...row.values];
      var defVal = 'all';
      var candidate = state.libraryFilters['upload' + row.key.charAt(0).toUpperCase() + row.key.slice(1)];
      if (candidate && row.values.includes(candidate)) defVal = candidate;
      const defLabel = defVal === 'all' ? emptyLabel : defVal;
      return `
      <div class="upload-tag-picker" data-upload-tag-picker="${row.key}">
        <span>${escapeHtml(row.label)}</span>
        <input type="hidden" name="${row.key}" value="${defVal}" data-upload-tag-input="${row.key}">
        <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="${row.key}">
          <strong>${escapeHtml(defLabel)}</strong>
        </button>
        <div class="upload-tag-menu" role="menu">
          ${items.map(value => {
            const label = value === 'all' ? emptyLabel : value;
            const active = value === defVal;
            return `<button type="button" class="${active ? 'active' : ''}" data-upload-tag-option="${row.key}" data-upload-tag-value="${escapeAttr(value)}">${escapeHtml(label)}</button>`;
          }).join('')}
        </div>
      </div>
    `}).join('');
  }

  // 切换端（平台）后：上传弹窗里每张图的类别选项与自动识别都要改用新端的清单
  function refreshCaseUploadTypeOptions() {
    const modal = document.getElementById('library-upload-modal');
    if (!modal || modal.hidden) return;
    const platform = uploadCasePlatform();
    const names = materialCatalogTypeNames(platform);
    modal.querySelectorAll('select[data-case-type-index]').forEach(function(select) {
      const index = select.getAttribute('data-case-type-index');
      const current = select.value;
      const options = [''].concat(names);
      // 手动改过的类别即使不在新端清单里也保留，避免用户选好的值被抹掉
      if (current && options.indexOf(current) < 0) options.push(current);
      select.innerHTML = options.map(function(value) {
        return `<option value="${escapeAttr(value)}"${value === current ? ' selected' : ''}>${escapeHtml(value || '未分类')}</option>`;
      }).join('');
      const card = select.closest('.case-drop-card');
      const label = card ? card.querySelector('[data-case-type-label]') : null;
      if (select.dataset.touched === '1') { select.value = current; }
      else {
        const dims = String((window.caseDropDims || {})[index] || '').split('x');
        const width = Number(dims[0]) || 0;
        const height = Number(dims[1]) || 0;
        const nameText = card && card.querySelector('.case-drop-name') ? card.querySelector('.case-drop-name').textContent : '';
        const dynamic = card ? !!card.querySelector('video') || /\.gif\b/i.test(nameText) : false;
        const detected = dynamic ? caseDynamicMaterialType(platform) : detectCaseMaterialType('', width, height, platform);
        select.value = options.indexOf(detected) >= 0 ? detected : '';
      }
      select.classList.toggle('untyped', !select.value);
      if (label) {
        label.textContent = select.value || '未分类';
        label.classList.toggle('untyped', !select.value);
      }
    });
  }

  function uploadLibraryTagRows(kind) {
    const config = LIBRARY_TAGS[kind];
    if (!config) return [];
    const labels = state.lang === 'zh'
      ? { tag1: '标签一', tag2: '标签二', tag3: '标签三', tag4: '标签四' }
      : { tag1: 'Tag 1', tag2: 'Tag 2', tag3: 'Tag 3', tag4: 'Tag 4' };
    const rows = [];
    if (config.tag1) rows.push({ key: 'tag1', label: labels.tag1, values: config.tag1 });
    // 案例库上传不再手动选标签二：物料类型按尺寸自动识别，点击缩略图上的标签可改。
    if (config.tag2 && kind !== 'source') rows.push({ key: 'tag2', label: labels.tag2, values: config.tag2 });
    const tag1 = state.libraryFilters.uploadTag1;
    if (config.tag2ByTag1) {
      const vals = kind === 'source'
        ? sourceTag2Values(tag1)
        : ((tag1 !== 'all' && config.tag2ByTag1[tag1]) ? config.tag2ByTag1[tag1] : [...new Set(Object.values(config.tag2ByTag1).flat())]);
      rows.push({ key: 'tag2', label: labels.tag2, values: vals });
    }
    const tag3Values = config.tag3 || Object.values(config.tag3ByTag2 || {}).flat();
    if (tag3Values?.length) rows.push({ key: 'tag3', label: labels.tag3, values: uniqueValues(tag3Values) });
    const tag4Values = Object.values(config.tag4ByTag3 || {}).flat();
    if (tag4Values.length) rows.push({ key: 'tag4', label: labels.tag4, values: uniqueValues(tag4Values) });
    return rows;
  }

  function uniqueValues(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function renderEditModal() {
    return `
      <div id="library-edit-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal" style="max-width:520px;">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '编辑素材信息' : 'Edit Asset'}</h3>
            <button class="icon-btn modal-close-circle" id="close-library-edit" type="button" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          </div>
          <form id="library-edit-form" class="library-form">
            <input type="hidden" name="id">
            <input type="hidden" name="library_kind" id="library-edit-kind">
            <div class="library-upload-scroll">
              <label><span>${state.lang === 'zh' ? '素材名称' : 'Asset title'}</span><input name="title" maxlength="120"></label>
              <div class="upload-tag-picker" data-upload-tag-picker="kind" id="edit-kind-field">
                <span>${state.lang === 'zh' ? '所在库' : 'Library section'}</span>
                <input type="hidden" name="kind_value" id="library-edit-kind-value" value="">
                <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="kind">
                  <strong>${state.lang === 'zh' ? '案例库' : 'Case Library'}</strong>
                </button>
                <div class="upload-tag-menu" role="menu" id="edit-kind-menu"></div>
              </div>
              <div id="library-edit-tag-controls" class="library-upload-tags"></div>
              <div class="library-form-grid two" id="edit-meta-row">
                <div class="upload-tag-picker" data-upload-tag-picker="country" id="edit-country-field">
                  <span>${state.lang === 'zh' ? '国家' : 'Country'}</span>
                  <input type="hidden" name="country" value="all" data-upload-tag-input="country">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="country">
                    <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="country"></div>
                </div>
                <div class="upload-tag-picker" data-upload-tag-picker="activity" id="edit-activity-field">
                  <span>${state.lang === 'zh' ? '活动主题' : 'Theme'}</span>
                  <input type="hidden" name="activity" value="all" data-upload-tag-input="activity">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="activity">
                    <strong>${state.lang === 'zh' ? '全部' : 'All'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="activity"></div>
                </div>
              </div>
            </div>
            <div id="library-edit-message" class="message"></div>
            <div class="modal-actions">
              <button class="ghost-btn" id="cancel-library-edit" type="button">${t('cancel')}</button>
              <button class="primary-btn" type="submit">${t('save')}</button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  function renderBatchEditModal() {
    return `
      <div id="batch-edit-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal" style="max-width:520px;">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '批量编辑' : 'Batch edit'}</h3>
            <button class="icon-btn modal-close-circle" id="close-batch-edit" type="button" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          </div>
          <form id="batch-edit-form" class="library-form">
            <div class="library-upload-scroll">
              <p style="margin:0 0 12px;font-size:13px;color:#667085;" id="batch-edit-count"></p>
              <label><span>${state.lang === 'zh' ? '素材名称前缀' : 'Title prefix'}</span><input name="title_prefix" maxlength="120" placeholder="${state.lang === 'zh' ? '选填，统一替换名称' : 'Optional, replace all titles'}"></label>
              <div class="library-form-grid two">
                <div class="upload-tag-picker" data-upload-tag-picker="country" id="batch-country-field">
                  <span>${state.lang === 'zh' ? '国家' : 'Country'}</span>
                  <input type="hidden" name="country" value="keep" data-upload-tag-input="country">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="country">
                    <strong>${state.lang === 'zh' ? '保持不变' : 'Keep'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="country"></div>
                </div>
                <div class="upload-tag-picker" data-upload-tag-picker="activity" id="batch-activity-field">
                  <span>${state.lang === 'zh' ? '活动主题' : 'Theme'}</span>
                  <input type="hidden" name="activity" value="keep" data-upload-tag-input="activity">
                  <button type="button" class="upload-tag-trigger" data-upload-tag-trigger="activity">
                    <strong>${state.lang === 'zh' ? '保持不变' : 'Keep'}</strong>
                  </button>
                  <div class="upload-tag-menu" role="menu" data-upload-meta-menu="activity"></div>
                </div>
              </div>
              <div id="batch-edit-tag-controls" class="library-upload-tags"></div>
            </div>
            <div id="batch-edit-message" class="message"></div>
            <div class="modal-actions">
              <button class="ghost-btn" id="cancel-batch-edit" type="button">${t('cancel')}</button>
              <button class="primary-btn" type="submit">${t('save')}</button>
            </div>
          </form>
        </section>
      </div>
    `;
  }

  var moveGroupPendingIds = [];
  var moveGroupChosenTag = null;

  function renderMoveGroupModal() {
    var options = MOVEABLE_COMPONENT_SUBTAGS.map(function(tag) {
      return '<button type="button" class="move-group-option" data-move-group-tag="' + escapeAttr(tag) + '">' + escapeHtml(libraryDisplayLabel(tag)) + '</button>';
    }).join('');
    return `
      <div id="move-group-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal" style="max-width:440px;">
          <div class="modal-head">
            <h3>${state.lang === 'zh' ? '移动分组' : 'Move group'}</h3>
            <button class="icon-btn modal-close-circle" id="close-move-group" type="button" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
            </button>
          </div>
          <div class="library-upload-scroll">
            <p id="move-group-count" style="margin:0 0 12px;font-size:13px;color:#667085;"></p>
            <div class="move-group-options">${options}</div>
            <div id="move-group-message" class="message"></div>
          </div>
          <div class="modal-actions">
            <button class="ghost-btn" id="cancel-move-group" type="button">${t('cancel')}</button>
            <button class="primary-btn" id="confirm-move-group" type="button">${t('save')}</button>
          </div>
        </section>
      </div>
    `;
  }

  function openMoveGroupModal(sourceIds) {
    moveGroupPendingIds = (sourceIds || []).filter(Boolean);
    if (!moveGroupPendingIds.length) return;
    moveGroupChosenTag = null;
    var modal = document.getElementById('move-group-modal');
    if (!modal) return;
    modal.hidden = false;
    var countEl = document.getElementById('move-group-count');
    if (countEl) countEl.textContent = (state.lang === 'zh' ? '将移动已选的 ' : 'Move ') + moveGroupPendingIds.length + (state.lang === 'zh' ? ' 项组件。' : ' components.');
    var msgEl = document.getElementById('move-group-message');
    if (msgEl) msgEl.textContent = '';
    document.querySelectorAll('#move-group-modal .move-group-option').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.moveGroupTag === moveGroupChosenTag);
    });
  }

  function closeMoveGroupModal() {
    var modal = document.getElementById('move-group-modal');
    if (modal) modal.hidden = true;
    moveGroupPendingIds = [];
    moveGroupChosenTag = null;
  }

  async function confirmMoveGroup() {
    if (!moveGroupChosenTag || !moveGroupPendingIds.length) {
      var warn = document.getElementById('move-group-message');
      if (warn) warn.textContent = state.lang === 'zh' ? '请选择目标分组。' : 'Please choose a target group.';
      return;
    }
    var message = document.getElementById('move-group-message');
    if (message) message.textContent = state.lang === 'zh' ? '正在移动...' : 'Moving...';
    try {
      for (var i = 0; i < moveGroupPendingIds.length; i++) {
        await moveComponentGroup(moveGroupPendingIds[i], moveGroupChosenTag);
      }
      closeMoveGroupModal();
      exitMultiSelect();
      await reloadLibraryData();
    } catch (e) {
      var m = document.getElementById('move-group-message');
      if (m) m.textContent = e.message;
    }
  }

  function wireLibraryShell() {
    ensureLibraryBookmarkModal();
    document.querySelectorAll('.library-module-row button[data-route]').forEach(button => {
      button.addEventListener('click', () => {
        const route = button.dataset.route;
        location.hash = route;
        navigate(route);
      });
    });
    document.querySelectorAll('[data-library-kind]').forEach(button => {
      button.addEventListener('click', () => {
        state.libraryFilters.kind = button.dataset.libraryKind || 'all';
        state.libraryFilters.tag1 = 'all';
        state.libraryFilters.tag2 = 'all';
        state.libraryFilters.tag3 = 'all';
        state.libraryFilters.tag4 = 'all';
        state.libraryFilters.selectedCountries = [];
        state.libraryFilters.selectedActivities = [];
        state.libraryFilters.selectedStrategies = [];
        state.libraryFilters.selectedElements = [];
        state.libraryFilters.selectedFormats = [];
        state.libraryFilters.selectedQuantities = [];
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        document.querySelectorAll('[data-library-kind]').forEach(item => item.classList.toggle('active', item.dataset.libraryKind === state.libraryFilters.kind));
        document.getElementById('library-tag-rows').innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
        wireLibraryTagButtons();
        renderLibraryGrid();
        updateKindTabIndicator();
        alignTagRows();
      });
    });
    wireLibraryTagButtons();
    setTimeout(() => { updateKindTabIndicator(); alignTagRows(); }, 50);
    document.getElementById('open-upload-modal')?.addEventListener('click', openLibraryUploadModal);
    document.getElementById('delete-all-btn')?.addEventListener('click', deleteAllLibraryData);
    document.getElementById('close-library-upload')?.addEventListener('click', cancelLibraryUpload);
    document.getElementById('cancel-library-upload')?.addEventListener('click', cancelLibraryUpload);
    document.getElementById('library-upload-form')?.addEventListener('submit', uploadLibraryAsset);
    wireLibraryUploadDrops();
    wireLibraryUploadKindCards();
    wireUploadTagPickers();
    wireUploadTagHover();
    // 打开上传弹窗时强制拉一次清单：刚在团队管理页改过的类别/尺寸，这次上传就用新的
    void refreshMaterialCatalogForCases({ force: true }).then(function() {
      const modal = document.getElementById('library-upload-modal');
      const controls = document.getElementById('library-upload-tag-controls');
      const kindNow = document.getElementById('library-upload-kind');
      if (!modal || modal.hidden || !controls || !kindNow) return;
      controls.innerHTML = renderUploadTagControls(kindNow.value || defaultKind);
    });
    document.querySelectorAll('[data-upload-kind-card]').forEach(button => {
      button.addEventListener('click', () => {
        const kind = button.dataset.uploadKindCard;
        const input = document.getElementById('library-upload-kind');
        if (input) input.value = kind;
        state.libraryFilters.uploadTag1 = kind === 'source' ? defaultCaseUploadPlatform('', state.libraryFilters.tag1) : 'all';
        state.libraryFilters.uploadTag2 = 'all';
        state.libraryFilters.uploadTag3 = 'all';
        state.libraryFilters.uploadTag4 = 'all';
        state.libraryFilters.uploadCountry = 'all';
        state.libraryFilters.uploadActivity = 'all';
        document.getElementById('library-upload-tag-controls').innerHTML = renderUploadTagControls(kind);
        updateLibraryUploadMode(kind);
        // 切换入库位置时只清理不属于该位置的标签一，已选的内容标签（活动主题/策略/元素/格式）保留，
        // 否则「模版」这类别的位置的标签一会跟着气泡条漏进案例库项目。
        var kindTag1Values = (LIBRARY_TAGS[kind] && LIBRARY_TAGS[kind].tag1) || [];
        var tagBar = document.getElementById('upload-case-tag-bar');
        var currentSel = (tagBar && tagBar._caseTagSel) || {};
        applyCaseTagBarSelections(tagBar, Object.assign({}, currentSel, {
          tag1: kindTag1Values.includes(currentSel.tag1) ? currentSel.tag1 : (kind === 'source' ? state.libraryFilters.uploadTag1 : '')
        }));
        wireLibraryUploadKindCards();
        wireUploadTagPickers();
        wireUploadTagHover();
      });
    });
    document.getElementById('close-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('cancel-library-edit')?.addEventListener('click', closeLibraryEditModal);
    document.getElementById('library-edit-form')?.addEventListener('submit', saveLibraryEdit);
    document.getElementById('close-library-detail')?.addEventListener('click', closeLibraryDetailModal);
    document.getElementById('library-detail-modal')?.addEventListener('click', event => {
      if (event.target === document.getElementById('library-detail-modal')) closeLibraryDetailModal();
    });
    const searchInput = document.getElementById('library-search');
    // v663：输入即搜（200ms 防抖），不用再按回车；回车仍然保留（并记入历史）。
    const applyLibrarySearch = () => {
      const live = document.getElementById('library-search');
      if (!live) return;
      state.libraryFilters.query = live.value.trim();
      state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
      filterLibraryCardsInPlace();
      applyLibraryQueryExpansion(state.libraryFilters.query);
    };
    searchInput?.addEventListener('input', () => {
      clearTimeout(librarySearchDebounceTimer);
      librarySearchDebounceTimer = setTimeout(applyLibrarySearch, 200);
    });
    searchInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        clearTimeout(librarySearchDebounceTimer);
        state.libraryFilters.query = event.target.value.trim();
        if (state.libraryFilters.query && !state.libraryFilters.searchHistory.includes(state.libraryFilters.query)) {
          state.libraryFilters.searchHistory.unshift(state.libraryFilters.query);
          if (state.libraryFilters.searchHistory.length > 6) state.libraryFilters.searchHistory.pop();
        }
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        filterLibraryCardsInPlace();
        applyLibraryQueryExpansion(state.libraryFilters.query);
      }
    });
// v841：AI 搜索滑块开关（搜索框右侧，默认开）；关闭后恢复普通搜索，选择持久记住
document.getElementById('library-ai-switch')?.addEventListener('change', event => {
setLibrarySearchExactOnly(!event.target.checked);
libraryExpansionLastQuery = null;
applyLibraryQueryExpansion(state.libraryFilters.query);
applyLibraryFilterExpansion();   // v843：重开时为已选筛选值补联想；关闭时匹配助手自动回退精确语义
});
    searchInput?.addEventListener('focus', () => {
      const pill = searchInput.closest('.library-search-pill');
      if (pill) {
        const icon = pill.querySelector('span');
        if (icon) {
          icon.style.background = '#111827';
          const svg = icon.querySelector('svg');
          if (svg) svg.style.stroke = '#ffffff';
        }
      }
      const history = document.getElementById('search-history-dropdown');
      const list = document.getElementById('search-history-list');
      if (history && list && state.libraryFilters.searchHistory.length) {
        const label = state.lang === 'zh' ? '历史搜索' : 'History';
        list.innerHTML = '<div class="search-history-label">' + label + '</div><div class="search-history-items">' +
          state.libraryFilters.searchHistory.map(q => '<button type="button" class="search-history-item">' + escapeHtml(q) + '</button>').join('') +
          '</div>';
        list.querySelectorAll('.search-history-item').forEach(btn => {
          btn.addEventListener('click', () => {
            state.libraryFilters.query = btn.textContent;
            if (searchInput) searchInput.value = state.libraryFilters.query;
            history.hidden = true;
            state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
            renderLibraryGrid();
          });
        });
        history.hidden = false;
      }
    });
    searchInput?.addEventListener('blur', () => {
      const pill = searchInput.closest('.library-search-pill');
      if (pill) {
        const icon = pill.querySelector('span');
        if (icon) {
          icon.style.background = '';
          const svg = icon.querySelector('svg');
          if (svg) svg.style.stroke = '';
        }
      }
      setTimeout(() => {
        const history = document.getElementById('search-history-dropdown');
        if (history) history.hidden = true;
      }, 200);
    });
    document.getElementById('library-hero-search')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        state.libraryFilters.query = event.target.value.trim();
        const search = document.getElementById('library-search');
        if (search) search.value = state.libraryFilters.query;
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        filterLibraryCardsInPlace();
        applyLibraryQueryExpansion(state.libraryFilters.query);
      }
    });
    const filterBtn = document.getElementById('library-filter-btn');
    const filterPanel = document.getElementById('library-filter-panel');
    filterBtn?.addEventListener('click', () => {
      if (!filterPanel) return;
      filterPanel.hidden = !filterPanel.hidden;
      if (!filterPanel.hidden) populateFilterOptions();
    });
    // 收藏筛选
    document.getElementById('filter-favorites-btn')?.addEventListener('click', function() {
      state.libraryFilters.favorites = !state.libraryFilters.favorites;
      this.classList.toggle('active', state.libraryFilters.favorites);
      this.innerHTML = (state.libraryFilters.favorites ? '★' : '☆') + ' ' + (state.lang === 'zh' ? '仅收藏' : 'Favorites only');
      state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
      filterLibraryCardsInPlace();
    });
    document.addEventListener('click', event => {
      const wrap = document.querySelector('.filter-dropdown-wrap');
      if (filterPanel && wrap && !wrap.contains(event.target) && !filterPanel.hidden) {
        filterPanel.hidden = true;
      }
    });
    // 多选操作条按钮
    document.querySelectorAll('#multi-select-bar [data-bar-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.dataset.barAction;
        if (action === 'cancel') exitMultiSelect();
        if (action === 'delete') batchDeleteSelected();
        if (action === 'download') batchDownloadSelected();
        if (action === 'edit') openBatchEditModal();
        if (action === 'move') openMoveGroupModal(Array.from(state.librarySelectedIds).map(function(pid) { var it = libraryItemByPreviewId(pid); return it ? it.source.id : null; }).filter(Boolean));
      });
    });
    // 批量编辑弹窗事件
    document.getElementById('close-batch-edit')?.addEventListener('click', closeBatchEditModal);
    document.getElementById('cancel-batch-edit')?.addEventListener('click', closeBatchEditModal);
    document.getElementById('batch-edit-form')?.addEventListener('submit', saveBatchEdit);
    // 移动分组弹窗事件
    document.getElementById('close-move-group')?.addEventListener('click', closeMoveGroupModal);
    document.getElementById('cancel-move-group')?.addEventListener('click', closeMoveGroupModal);
    document.getElementById('confirm-move-group')?.addEventListener('click', confirmMoveGroup);
    document.querySelectorAll('#move-group-modal .move-group-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        moveGroupChosenTag = btn.dataset.moveGroupTag;
        document.querySelectorAll('#move-group-modal .move-group-option').forEach(function(b) {
          b.classList.toggle('active', b.dataset.moveGroupTag === moveGroupChosenTag);
        });
      });
    });
    // Esc 退出多选模式
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && state.libraryMultiSelect) {
        exitMultiSelect();
      }
    });
    // 全局点击关闭右键菜单（点击菜单外部时）
    document.addEventListener('click', function(e) {
      var menu = document.getElementById('context-menu');
      if (menu && menu.classList.contains('show') && !menu.contains(e.target)) {
        hideContextMenu();
      }
    });
    document.addEventListener('contextmenu', function(e) {
      // 卡片右键有自己的处理，不要在这里关掉
      if (e.target.closest('.library-card')) return;
      var menu = document.getElementById('context-menu');
      if (menu && menu.classList.contains('show')) {
        hideContextMenu();
      }
    });

  }

  function wireLibraryTagButtons() {
    document.querySelectorAll('[data-library-tag-key]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.libraryTagKey;
        const value = button.dataset.libraryTagValue || 'all';
        // 案例库没有「全部」chip（v709），再点一次已选标签 = 取消该层筛选
        const canToggleOff = (state.libraryFilters.kind || 'all') === 'source';
        state.libraryFilters[key] = (canToggleOff && state.libraryFilters[key] === value) ? 'all' : value;
        if (key === 'tag1') {
          state.libraryFilters.tag2 = 'all';
          state.libraryFilters.tag3 = 'all';
          state.libraryFilters.tag4 = 'all';
        }
        if (key === 'tag2') {
          state.libraryFilters.tag3 = 'all';
          state.libraryFilters.tag4 = 'all';
        }
        if (key === 'tag3') state.libraryFilters.tag4 = 'all';
        state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
        filterLibraryCardsInPlace();
        document.getElementById('library-tag-rows').innerHTML = renderLibraryTagRows(state.libraryFilters.kind || 'all');
        wireLibraryTagButtons();
      });
    });
  }

  function filterLibraryCardsInPlace() {
    // 过滤条件只在 renderLibraryGrid 里集中计算（单一事实来源）。
    // v663 之前这里还有一套平行的过滤链 + return 之后一段永远执行不到的死代码，已删除；
    // 各调用方都是先把条件写进 state.libraryFilters（并重置 libraryVisibleLimit）再调这里。
    renderLibraryGrid();
  }

  // 统一的检索匹配（v663，全站只有这一份）：
  // 查询按空白分词，所有词都要命中（AND），每个词在同一段候选文本里做子串匹配（大小写不敏感）。
  // 候选文本包含卡上看不见的字段（所有者/国家/活动/分类/文件名/库类型），命中结果未必在卡片上显式可见。
  function libraryItemSearchText(item) {
    const source = item.source;
    const preview = item.preview;
    // 案例库一个项目只有一张卡，但物料类型是逐张的（弹窗/头图/会场…），
    // 项目卡要把整个项目的物料类型都算进来，不能只看封面那张。
    const projectMaterials = isCaseProject(source) ? caseMaterialsOf(source) : null;
    const materialTypes = projectMaterials
      ? projectMaterials.map(function(p) { return p.material_type || ''; })
      : [preview.material_type || ''];
    const vocab = [
      libraryKindLabel(libraryKindOfSource(source)),
      optionNameById(source.country_id),
      optionNameById(source.activity_id),
      optionNameById(source.category_id),
    ].concat(materialTypes, visibleLibraryTags(source));
    const parts = [
      source.title,
      source.owner_name,
      source.source_filename,
      preview.preview_filename,
    ].concat(vocab);
    // 受控词表挂上拼音 / 英文别名：hanbao、burger、tanchuang、popup、shate、saudi 都能命中
    vocab.forEach(function(term) {
      const key = String(term || '').trim();
      if (!key) return;
      if (LIBRARY_SEARCH_PINYIN[key]) parts.push(LIBRARY_SEARCH_PINYIN[key]);
      if (LIBRARY_SEARCH_EN_EXTRA[key]) parts.push(LIBRARY_SEARCH_EN_EXTRA[key]);
      if (LIBRARY_LABELS_EN[key]) parts.push(LIBRARY_LABELS_EN[key]);
    });
    return parts.map(function(part) { return String(part || ''); }).join(' ').toLowerCase();
  }

  // v829 搜索词扩展：AI 把搜索词翻译成相关词（骑手 → 摩托/头盔/餐箱…），命中关联词也算命中。
  // 扩展结果按词永久缓存在本地：同一个词只问一次 AI，之后直接走缓存（词表随真实搜索量自长）。
  // v833：缓存键升到 v2（旧 v1 里存的是词表/桥接升级前的无效词，永久不过期会拖住旧结果），
  // 并加 7 天有效期：词表随素材增长，老缓存到期后自动重新扩展。
  // v839：缓存键升到 v3（v2 里缓存了词表锚定前的无效联想词，如红包→红包礼券，需要重新扩展）
  // v856：缓存键升到 v5（v4 里没有英文翻译 termsEn，英文模式下联想词缺英文显示），沿用 7 天有效期
  var LIBRARY_EXPANSION_CACHE_PREFIX = 'vf_library_search_expansion_v5:';
  var LIBRARY_EXPANSION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var libraryExpansionTerms = [];
  var libraryExpansionTermsEn = {};        // v856 英文模式：中文联想词→英文说法（AI 逐词翻译，配不上的走词表兑底）
  var libraryExpansionRefreshing = false;  // v856 手动刷新中：chips 不清空，仅刷新按钮转圈
  var libraryExpansionRequestKey = '';
  var libraryExpansionLastQuery = null;
  var libraryExpansionPendingQuery = '';

  function librarySearchExactOnly() {
    try { return localStorage.getItem('vf_library_search_exact_only_v1') === '1'; }
    catch (_error) { return false; }
  }

  function setLibrarySearchExactOnly(value) {
    try {
      if (value) localStorage.setItem('vf_library_search_exact_only_v1', '1');
      else localStorage.removeItem('vf_library_search_exact_only_v1');
    } catch (_error) {}
  }

  function readLibraryExpansionCache(query) {
    try {
      const raw = localStorage.getItem(LIBRARY_EXPANSION_CACHE_PREFIX + String(query).trim().toLowerCase());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.terms) ? parsed.terms : null;
      if (!list) return null;
      if (typeof parsed.ts === 'number' && Date.now() - parsed.ts > LIBRARY_EXPANSION_CACHE_TTL_MS) return null;
      const terms = list.filter(Boolean);
      const termsEn = !Array.isArray(parsed) && parsed.termsEn && typeof parsed.termsEn === 'object' ? parsed.termsEn : {};
      return { terms: terms, termsEn: termsEn };
    } catch (_error) { return null; }
  }

  function writeLibraryExpansionCache(query, terms, termsEn) {
    try { localStorage.setItem(LIBRARY_EXPANSION_CACHE_PREFIX + String(query).trim().toLowerCase(), JSON.stringify({ ts: Date.now(), terms: terms || [], termsEn: termsEn || {} })); }
    catch (_error) {}
  }

  // v843 筛选标签的 AI 扩展：选中的筛选值也走 /api/expand-query 联想（如「世界杯」→「足球」），
  // 让打了相关标签的物料也能被筛出来。两条安全线：
  // 1) 词表只喂该维度自己的候选值（面板配置项 + 库内实际取值），引导 AI 往同维度联想；
  // 2) 返回的词必须和该维度候选值集合求交集后才生效——国家「沙特」永远不会匹配到足球标签，
  //    扩展只在该维度内部收编（活动主题「世界杯」可以收编活动/标签里的「足球」）。
  var LIBRARY_FILTER_EXPANSION_PREFIX = 'vf_library_filter_expansion_v1:';
  // v844：只给语义性维度做联想；国家（专有名词）、格式/数量（硬属性）、收藏不联想
  var LIBRARY_FILTER_EXPANSION_DIMS = ['activity', 'strategy', 'element'];
  var libraryFilterExpansionTerms = {};    // 'activity:世界杯' -> ['足球', …]（含空数组=已问过且无同维度联想）
  var libraryFilterExpansionInflight = {}; // key -> true，防重复请求

  function libraryFilterExpansionKey(dim, value) {
    return dim + ':' + String(value || '').trim().toLowerCase();
  }

  function readLibraryFilterExpansionCache(key) {
    try {
      const raw = localStorage.getItem(LIBRARY_FILTER_EXPANSION_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.terms) ? parsed.terms : null;
      if (!list) return null;
      if (typeof parsed.ts === 'number' && Date.now() - parsed.ts > LIBRARY_EXPANSION_CACHE_TTL_MS) return null;
      return list.filter(Boolean);
    } catch (_error) { return null; }
  }

  function writeLibraryFilterExpansionCache(key, terms) {
    try { localStorage.setItem(LIBRARY_FILTER_EXPANSION_PREFIX + key, JSON.stringify({ ts: Date.now(), terms: terms || [] })); }
    catch (_error) {}
  }

  // 维度候选值：面板配置项 + 库内实际出现过的取值（活动还收 libActivityLabel，标签维度收所有真实标签）
  function libraryDimensionValues(dim) {
    var values = {};
    ((FILTER_SECTIONS_CONFIG[dim] && FILTER_SECTIONS_CONFIG[dim].values) || []).forEach(function(v) {
      var k = String(v || '').trim().toLowerCase();
      if (k) values[k] = String(v).trim();
    });
    try {
      visibleLibrarySourcesForSession().forEach(function(source) {
        if (dim === 'country') {
          var c = String(libCountryLabel(source) || '').trim();
          if (c) values[c.toLowerCase()] = c;
          return;
        }
        if (dim === 'activity') {
          var a = String(libActivityLabel(source) || '').trim();
          if (a) values[a.toLowerCase()] = a;
        }
        visibleLibraryTags(source).forEach(function(tag) {
          var t = String(tag || '').trim();
          if (t) values[t.toLowerCase()] = t;
        });
      });
    } catch (_error) {}
    return values;
  }

  function libraryFilterExpansionTermsFor(dim, value) {
    return libraryFilterExpansionTerms[libraryFilterExpansionKey(dim, value)] || [];
  }

  // 一个筛选项对一个物料的匹配：先保持原精确语义（完全相等 / 标签完全一致），
  // 再叠加该筛选值的 AI 扩展词（扩展词已和维度候选值求过交集，作为子串在该维度文本里找）。
  // AI 开关关闭时只用精确语义，和 v841 之前行为一致。
  function librarySourceMatchesFilterValue(dim, source, value) {
    var target = String(value || '').trim();
    if (!target) return false;
    var tags = visibleLibraryTags(source);
    if (dim === 'country') {
      if (String(libCountryLabel(source) || '') === target) return true;
    } else if (dim === 'activity') {
      if (String(libActivityLabel(source) || '') === target || tags.indexOf(target) >= 0) return true;
    } else {
      if (tags.indexOf(target) >= 0) return true;
      // v862：业务策略自定义值存的是标记，解码后匹配（同词表值直接命中 tags）
      if (dim === 'strategy' && tags.map(caseStrategyMarkerValue).indexOf(target) >= 0) return true;
    }
    var terms = (LIBRARY_FILTER_EXPANSION_DIMS.indexOf(dim) < 0 || librarySearchExactOnly()) ? [] : libraryFilterExpansionTermsFor(dim, value);
    if (!terms.length) return false;
    var text = '';
    if (dim === 'country') text = String(libCountryLabel(source) || '');
    else if (dim === 'activity') text = String(libActivityLabel(source) || '') + ' ' + tags.join(' ');
    else text = tags.join(' ');
    text = text.toLowerCase();
    return terms.some(function(t) { return text.indexOf(String(t).toLowerCase()) >= 0; });
  }

  // 为当前选中的筛选值补齐 AI 扩展（带缓存的异步请求，回来后重筛一次）
  function applyLibraryFilterExpansion() {
    if (librarySearchExactOnly()) return;
    var token = (state.session && state.session.access_token) || '';
    if (!token) return;
    var wanted = [];
    LIBRARY_FILTER_EXPANSION_DIMS.forEach(function(dim) {
      (state.libraryFilters[FILTER_STATE_KEYS[dim]] || []).forEach(function(v) {
        if (!v) return;
        var key = libraryFilterExpansionKey(dim, v);
        if (libraryFilterExpansionTerms[key] || libraryFilterExpansionInflight[key]) return;
        var cached = readLibraryFilterExpansionCache(key);
        if (cached) { libraryFilterExpansionTerms[key] = cached; return; }
        wanted.push({ dim: dim, value: v, key: key });
      });
    });
    if (!wanted.length) return;
    wanted.slice(0, 6).forEach(function(job) {
      libraryFilterExpansionInflight[job.key] = true;
      fetch('/api/expand-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ query: job.value, vocabulary: Object.keys(libraryDimensionValues(job.dim)).slice(0, 120) })
      }).then(r => r.json()).then(function(data) {
        delete libraryFilterExpansionInflight[job.key];
        var raw = data && data.success && Array.isArray(data.terms) ? data.terms : [];
        var allowed = libraryDimensionValues(job.dim);
        var valueKey = String(job.value).trim().toLowerCase();
        var terms = raw.map(function(t) { return String(t || '').trim(); }).filter(function(t) {
          return t && t.toLowerCase() !== valueKey && allowed[t.toLowerCase()];
        }).slice(0, 8);
        libraryFilterExpansionTerms[job.key] = terms;
        if (terms.length) writeLibraryFilterExpansionCache(job.key, terms);
        filterLibraryCardsInPlace();
      }).catch(function() { delete libraryFilterExpansionInflight[job.key]; });
    });
  }

// 给扩展模型的词表：筛选面板六类 + 库内实际用到的物料类型 + 真实标签，让 AI 优先返回库内真实存在的标签
function librarySearchVocabulary() {
const vocab = [];
Object.keys(FILTER_SECTIONS_CONFIG).forEach(function(key) {
(FILTER_SECTIONS_CONFIG[key].values || []).forEach(function(v) { if (v && vocab.indexOf(v) < 0) vocab.push(v); });
});
// v840：物料类型只收“库内实际在用”的——静态目录里的预设类型（如餐箱/骑手服装）
// 可能一件物料都没有，发给 AI 会误导它锚定到搜不到的虚词上
var usedTypes = {};
try {
state.libraryPreviews.forEach(function(p) {
var t = String((p && p.material_type) || '').trim();
if (t) usedTypes[t] = true;
});
['C端', 'B端', 'D端', 'M端'].forEach(function(platform) {
materialCatalogTypeNames(platform).forEach(function(name) {
if (name && usedTypes[name] && vocab.indexOf(name) < 0) vocab.push(name);
});
});
} catch (_error) {}
    // v832：物料身上真实存在的元素/活动标签也进词表。AI 返回「汉堡店」这类复合词时，
    // 后端桥接逻辑才能补出库里真实标签「汉堡」，搜「汉堡包」才能命中打「汉堡」标的物料。
    try {
      visibleLibrarySourcesForSession().forEach(function(source) {
        visibleLibraryTags(source).forEach(function(tag) {
          if (tag && vocab.indexOf(tag) < 0) vocab.push(tag);
        });
      });
    } catch (_error) {}
    return vocab.slice(0, 120);
  }

  // v837：AI 相关词 chips 渲染（含「AI 联想中…」加载态），由 renderLibraryGrid 和扩展请求状态变化时调用
  // v856 英文模式：词条展示优先用 AI 逐词翻译（termsEn），再走词表 LIBRARY_LABELS_EN，最后原词兑底；
  // 匹配链路不变（仍用中文原词匹配库内中文标签）。词条区尾部加了刷新按钮（手动追加新联想词）。
  function libraryChipDisplayLabel(term) {
    if (state.lang === 'zh') return term;
    const key = String(term || '').replace(/\s+/g, '').toLowerCase();
    return libraryExpansionTermsEn[key] || libraryDisplayLabel(term);
  }

  function renderLibraryExpansionChips() {
    const chipsHost = document.getElementById('library-expansion-chips');
    if (!chipsHost) return;
    const q = String(state.libraryFilters.query || '').trim();
    if (!q) {
      chipsHost.hidden = true;
      chipsHost.innerHTML = '';
      return;
    }
if (librarySearchExactOnly()) {
// v841：AI 开关改到搜索框右侧滑块，关闭时左侧词条区直接隐藏（恢复普通搜索）
chipsHost.hidden = true;
chipsHost.innerHTML = '';
return;
}
    if (libraryExpansionPendingQuery === q && !libraryExpansionTerms.length) {
      chipsHost.hidden = false;
      chipsHost.innerHTML = `<span class="library-expansion-chip is-pending"><span class="library-expansion-spinner" aria-hidden="true"></span>${state.lang === 'zh' ? 'AI 联想中…' : '…AI thinking…'}</span>`;
      return;
    }
    if (libraryExpansionTerms.length) {
      // v839：词条装进裁剪区（chips-clip），开关按钮放裁剪区外——
      // 否则词条多时容器 overflow:hidden 会把「仅精确匹配」切掉一半
      // v856：词条不再只显示前 3 个（裁剪区可横向滚动），尾部加刷新按钮手动追加联想词
      chipsHost.hidden = false;
      chipsHost.innerHTML = `<span class="library-expansion-chips-clip"><small class="library-expansion-chips-label">${state.lang === 'zh' ? 'AI 相关词' : 'AI related terms'}</small>`
        + libraryExpansionTerms.map(term => `<span class="library-expansion-chip" title="${state.lang === 'zh' ? '命中这个词的物料也会出现在结果里' : 'Matching assets for this term also appear in results'}">${escapeHtml(libraryChipDisplayLabel(term))}</span>`).join('')
        + `</span><button type="button" class="library-expansion-refresh${libraryExpansionRefreshing ? ' is-busy' : ''}" id="library-expansion-refresh" title="${state.lang === 'zh' ? 'AI 重新联想，追加相关词' : 'Ask AI for more related terms'}" aria-label="${state.lang === 'zh' ? '重新联想' : 'Refresh related terms'}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg></button>`;
      return;
    }
    chipsHost.hidden = true;
    chipsHost.innerHTML = '';
  }

  function applyLibraryQueryExpansion(query) {
    const q = String(query || '').trim();
    if (!q || librarySearchExactOnly()) {
      libraryExpansionTerms = [];
      libraryExpansionTermsEn = {};
      libraryExpansionRefreshing = false;
      libraryExpansionPendingQuery = '';
      if (libraryExpansionLastQuery !== null) filterLibraryCardsInPlace();
      libraryExpansionLastQuery = q;
      renderLibraryExpansionChips();
      return;
    }
    const cached = readLibraryExpansionCache(q);
    if (cached) {
      libraryExpansionTerms = cached.terms;
      libraryExpansionTermsEn = cached.termsEn || {};
      libraryExpansionRefreshing = false;
      libraryExpansionPendingQuery = '';
      if (libraryExpansionLastQuery !== q) filterLibraryCardsInPlace();
      libraryExpansionLastQuery = q;
      renderLibraryExpansionChips();
      return;
    }
    libraryExpansionLastQuery = q;
    const token = (state.session && state.session.access_token) || '';
    if (!token) return;
    const requestKey = q + ':' + Date.now();
    libraryExpansionRequestKey = requestKey;
    libraryExpansionRefreshing = false;   // v856 新查询开始，取消进行中的手动刷新态
    libraryExpansionTerms = [];          // 旧查询的词条对新查询无效，清空后才能渲染 pending 态
    libraryExpansionPendingQuery = q;
    renderLibraryExpansionChips();
    fetch('/api/expand-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ query: q, vocabulary: librarySearchVocabulary() })
    }).then(r => r.json()).then(function(data) {
      if (libraryExpansionRequestKey !== requestKey) return;         // 已换搜索词，旧结果作废
      const terms = data && data.success && Array.isArray(data.terms) ? data.terms.filter(Boolean).slice(0, 8) : [];
      const termsEn = data && data.termsEn && typeof data.termsEn === 'object' ? data.termsEn : {};
      libraryExpansionTermsEn = termsEn;
      writeLibraryExpansionCache(q, terms, termsEn);
      libraryExpansionTerms = terms;
      libraryExpansionPendingQuery = '';
      renderLibraryExpansionChips();
      const live = document.getElementById('library-search');
      if (terms.length && live && live.value.trim() === q) filterLibraryCardsInPlace();
    }).catch(function() {
      if (libraryExpansionRequestKey !== requestKey) return;
      libraryExpansionPendingQuery = '';
      renderLibraryExpansionChips();
    });
  }

  // v856 手动刷新：AI 重新联想当前搜索词。已有词条保留、新词追加（去重，总上限 12），
  // 依然优先匹配库内已有标签（服务端词表锚定规则不变）；结果合并后写回本地缓存。
  function refreshLibraryExpansionTerms() {
    const q = String(state.libraryFilters.query || '').trim();
    if (!q || librarySearchExactOnly() || libraryExpansionRefreshing) return;
    const token = (state.session && state.session.access_token) || '';
    if (!token) return;
    libraryExpansionRefreshing = true;
    libraryExpansionRequestKey = q + ':refresh:' + Date.now();   // 作废在途的自动请求，避免旧结果后到覆盖
    const requestKey = libraryExpansionRequestKey;
    renderLibraryExpansionChips();
    fetch('/api/expand-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ query: q, vocabulary: librarySearchVocabulary() })
    }).then(r => r.json()).then(function(data) {
      if (libraryExpansionRequestKey !== requestKey) return;
      libraryExpansionRefreshing = false;
      libraryExpansionPendingQuery = '';
      const incoming = data && data.success && Array.isArray(data.terms) ? data.terms.filter(Boolean) : [];
      const enMap = data && data.termsEn && typeof data.termsEn === 'object' ? data.termsEn : {};
      const normKey = function(value) { return String(value || '').replace(/\s+/g, '').toLowerCase(); };
      const beforeCount = libraryExpansionTerms.length;
      const merged = libraryExpansionTerms.slice();
      incoming.forEach(function(term) {
        const key = normKey(term);
        if (!key || merged.length >= 12) return;
        if (merged.some(function(existing) { return normKey(existing) === key; })) return;
        merged.push(term);
      });
      // v857：刷新没挤出任何新词（词库收敛或达到 12 上限）时轻提示，避免误以为按钮失灵
      if (merged.length === beforeCount) {
        showCaseToast(state.lang === 'zh' ? 'AI 暂时没有更多新联想词了' : 'AI has no new related terms for now');
      }
      libraryExpansionTerms = merged;
      libraryExpansionTermsEn = Object.assign({}, libraryExpansionTermsEn, enMap);
      writeLibraryExpansionCache(q, merged, libraryExpansionTermsEn);
      renderLibraryExpansionChips();
      filterLibraryCardsInPlace();
    }).catch(function() {
      if (libraryExpansionRequestKey !== requestKey) return;
      libraryExpansionRefreshing = false;
      renderLibraryExpansionChips();
    });
  }

  // 刷新按钮随 chips 重建，用一次性事件委托绑定
  if (!window.__vfLibraryExpansionRefreshBound) {
    window.__vfLibraryExpansionRefreshBound = true;
    document.addEventListener('click', function(event) {
      const target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('#library-expansion-refresh')) {
        event.preventDefault();
        refreshLibraryExpansionTerms();
      }
    });
  }

  // 匹配返回秩：-1 不命中；0 每个词都原文命中（精确）；1 靠扩展词才命中（排后面）
  function libraryItemQueryMatchRank(item, query, expansionTerms) {
    const tokens = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return 0;
    const text = libraryItemSearchText(item);
    const terms = (expansionTerms || []).map(function(t) { return String(t || '').toLowerCase(); }).filter(Boolean);
    let exact = true;
    for (let i = 0; i < tokens.length; i++) {
      if (text.includes(tokens[i])) continue;
      exact = false;
      // v849 搜索扩展：搜子类别名（如 顶通）时，命中所属大类别（头图）的物料；映射来自当前清单，实时生效
      const subNameTypes = (typeof materialCatalogSubNameTypes === 'function') ? materialCatalogSubNameTypes(tokens[i]) : [];
      if (subNameTypes.some(function(t) { return text.includes(t); })) continue;
      const hitByExpansion = terms.some(function(t) { return text.includes(t); });
      if (!hitByExpansion) return -1;
    }
    return exact ? 0 : 1;
  }

  function libraryItemMatchesQuery(item, query) {
    return libraryItemQueryMatchRank(item, query, []) >= 0;
  }


  var FILTER_SECTIONS_CONFIG = {
    country: { values: ['沙特阿拉伯','阿联酋','卡塔尔','科威特','巴林','阿曼'], matchBy: 'country' },
    // v750 活动主题：只留各国重复度高的主题词；premium/picks/一人食/品牌合作 移入业务策略
    activity: { values: ['聚餐','足球','夏日','新年','世界杯','游戏','开学','开斋节','宰牲节','国庆节'], matchBy: 'activity' },
    strategy: { values: ['premium','picks','一人食','品牌合作','新人专属','裂变','大促','闪购','买一送一','抽奖','免运'], matchBy: 'tags' },
    // v750 元素：词条 ≤5 字、不限量、支持用户自定义；复合词条拆成独立标签
    element: { values: ['银行卡','券','kiki','骑手','国旗','手机','耳机','PS5'], matchBy: 'tags' },
    format: { values: ['仅jpg/png/pdf','含Psd文件','含Ai文件'], matchBy: 'tags' },
    quantity: { values: ['单素材','成套素材'], matchBy: 'tags' }
  };
  var FILTER_STATE_KEYS = { country: 'selectedCountries', activity: 'selectedActivities', strategy: 'selectedStrategies', element: 'selectedElements', format: 'selectedFormats', quantity: 'selectedQuantities' };

  // 案例库上传/编辑窗的标签面板：标签一 + 筛选面板六大类，选项与筛选同源保证「传得上就能筛得到」
  function caseTagChipRows() {
    return [
      { key: 'tag1', label: '平台', values: (LIBRARY_TAGS.source && LIBRARY_TAGS.source.tag1) || [] },
      { key: 'country', label: '国家', values: FILTER_SECTIONS_CONFIG.country.values },
      { key: 'activity', label: '活动主题', values: FILTER_SECTIONS_CONFIG.activity.values },
      { key: 'strategy', label: '业务策略', values: FILTER_SECTIONS_CONFIG.strategy.values },
      { key: 'element', label: '元素', values: FILTER_SECTIONS_CONFIG.element.values },
      { key: 'format', label: '格式', values: FILTER_SECTIONS_CONFIG.format.values },
      { key: 'quantity', label: '数量', values: FILTER_SECTIONS_CONFIG.quantity.values }
    ];
  }
  var CASE_TAG_CHIP_EN = { tag1: 'Platform', country: 'Country', activity: 'Theme', strategy: 'Strategy', element: 'Element', format: 'Format', quantity: 'Quantity' };
  // 这四类以中文原串存进 tags，与筛选 matchBy:'tags' 对齐；国家/活动类型另存 country_id/activity_id
  var CASE_TAG_CHIP_TAG_KEYS = ['strategy', 'element', 'format', 'quantity'];
  // v750 内容标签多选：活动主题/业务策略/元素/格式 的选择值升级为数组（平台/国家/数量仍单选）。
  // 存储统一进 tags 数组（每类可多个值）；活动的第一个选择仍写 activity_id（正式站 v561 兼容）。
  var CASE_TAG_MULTI_KEYS = ['activity', 'strategy', 'element', 'format'];
  const CASE_ELEMENT_MARKER_PREFIX = 'vf:case-element:v1:';
  // v826 活动主题支持自定义：不在词表里的主题用标记前缀存进 tags，读回时还原（同元素标记机制）
  const CASE_ACTIVITY_MARKER_PREFIX = 'vf:case-activity:v1:';
  // v862：业务策略也支持自定义标签——词表外值用标记前缀存进 tags，读回时还原（同元素/主题标记机制）
  const CASE_STRATEGY_MARKER_PREFIX = 'vf:case-strategy:v1:';
  const LAST_CASE_UPLOAD_COUNTRY_PREFIX = 'vf_last_case_upload_country_v1:';

  function caseTagSelHas(sel, key, value) {
    const v = sel ? sel[key] : '';
    return Array.isArray(v) ? v.includes(value) : v === value;
  }
  function caseTagSelValues(sel, key) {
    const v = sel ? sel[key] : '';
    return Array.isArray(v) ? v.slice() : (v ? [v] : []);
  }
  function caseTagSelFirst(sel, key) {
    const v = sel ? sel[key] : '';
    return Array.isArray(v) ? (v[0] || '') : (v || '');
  }
  function caseTagSelToggle(sel, key, value) {
    if (CASE_TAG_MULTI_KEYS.includes(key)) {
      const list = caseTagSelValues(sel, key);
      const idx = list.indexOf(value);
      if (idx >= 0) list.splice(idx, 1); else list.push(value);
      if (list.length) sel[key] = list; else delete sel[key];
      return;
    }
    if (sel[key] === value) delete sel[key]; else sel[key] = value;
  }

  function caseTagSelSet(sel, key, value) {
    if (!value) { delete sel[key]; return; }
    sel[key] = CASE_TAG_MULTI_KEYS.includes(key) ? [value] : value;
  }

  function lastCaseUploadPlatform() {
    try {
      const userId = state.session?.user?.id || 'anonymous';
      const value = localStorage.getItem('vf_last_case_upload_platform_v1:' + userId) || '';
      return LIBRARY_TAGS.source.tag1.includes(value) ? value : '';
    } catch (_error) { return ''; }
  }

  function rememberLastCaseUploadPlatform(value) {
    if (!LIBRARY_TAGS.source.tag1.includes(value)) return;
    try {
      const userId = state.session?.user?.id || 'anonymous';
      localStorage.setItem('vf_last_case_upload_platform_v1:' + userId, value);
    } catch (_error) {}
  }

  function defaultCaseUploadPlatform(explicit, pageTag) {
    const values = LIBRARY_TAGS.source.tag1;
    return [explicit, pageTag, lastCaseUploadPlatform(), 'C端'].find(value => values.includes(value)) || '';
  }

  function lastCaseUploadCountry() {
    try {
      const userId = state.session?.user?.id || 'anonymous';
      const value = localStorage.getItem(LAST_CASE_UPLOAD_COUNTRY_PREFIX + userId) || '';
      return FILTER_SECTIONS_CONFIG.country.values.includes(value) ? value : '';
    } catch (_error) { return ''; }
  }

  function rememberLastCaseUploadCountry(value) {
    if (!FILTER_SECTIONS_CONFIG.country.values.includes(value)) return;
    try {
      const userId = state.session?.user?.id || 'anonymous';
      localStorage.setItem(LAST_CASE_UPLOAD_COUNTRY_PREFIX + userId, value);
    } catch (_error) {}
  }

  function isCaseTagChipValue(value) {
    return caseTagChipRows().some(function(row) { return row.values.includes(value); });
  }

  function caseElementMarker(value) {
    return CASE_ELEMENT_MARKER_PREFIX + encodeURIComponent(String(value || '').trim());
  }

  function caseElementMarkerValue(tag) {
    if (!String(tag || '').startsWith(CASE_ELEMENT_MARKER_PREFIX)) return '';
    try { return decodeURIComponent(String(tag).slice(CASE_ELEMENT_MARKER_PREFIX.length)); }
    catch (_error) { return ''; }
  }

  function caseActivityMarker(value) {
    return CASE_ACTIVITY_MARKER_PREFIX + encodeURIComponent(String(value || '').trim());
  }

  function caseActivityMarkerValue(tag) {
    if (!String(tag || '').startsWith(CASE_ACTIVITY_MARKER_PREFIX)) return '';
    try { return decodeURIComponent(String(tag).slice(CASE_ACTIVITY_MARKER_PREFIX.length)); }
    catch (_error) { return ''; }
  }

  function caseStrategyMarker(value) {
    return CASE_STRATEGY_MARKER_PREFIX + encodeURIComponent(String(value || '').trim());
  }

  function caseStrategyMarkerValue(tag) {
    if (!String(tag || '').startsWith(CASE_STRATEGY_MARKER_PREFIX)) return '';
    try { return decodeURIComponent(String(tag).slice(CASE_STRATEGY_MARKER_PREFIX.length)); }
    catch (_error) { return ''; }
  }

  // v864：手动改类型的「手动分类保护」——在所属项目标签里记隐形标记（每张物料一个），
  // 「按清单重跑识别」看到标记就跳过这张，绝不覆盖人工分类。
  const CASE_MANUAL_TYPE_MARKER_PREFIX = 'vf:manual-mtype:v1:';

  function caseManualTypeMarker(previewId) {
    return CASE_MANUAL_TYPE_MARKER_PREFIX + String(previewId || '');
  }

  function caseManualTypeMarkerIds(tags) {
    return (Array.isArray(tags) ? tags : [])
      .map(function(tag) {
        return String(tag || '').startsWith(CASE_MANUAL_TYPE_MARKER_PREFIX) ? String(tag).slice(CASE_MANUAL_TYPE_MARKER_PREFIX.length) : '';
      })
      .filter(Boolean);
  }

  function markCaseManualTypes(source, previewIds) {
    if (!source || !Array.isArray(previewIds) || !previewIds.length) return Promise.resolve();
    const want = previewIds.map(String);
    // 先读库里最新 tags 再合并：避免覆盖并发写入的其它标签。
    // v868 修复：supabase 的 .then() 拿到的是 { data, error } 包装，标签在 fresh.data.tags——
    // 之前误写成 fresh.tags（永远 undefined），导致每次手动改类型都把项目业务标签整组抹掉（v864 引入的严重 bug）
    return state.supabase.from('vf_source_files').select('tags').eq('id', source.id).maybeSingle().then(function(fresh) {
      if (!fresh || fresh.error || fresh.data == null) return null; // v868：行读不到就绝不写，绝不拿空 tags 起底
      const tags = Array.isArray(fresh.data.tags) ? fresh.data.tags.slice() : [];
      let changed = false;
      want.forEach(function(id) {
        const marker = caseManualTypeMarker(id);
        if (tags.indexOf(marker) < 0) { tags.push(marker); changed = true; }
      });
      if (!changed) return null;
      source.tags = tags.slice();
      return state.supabase.from('vf_source_files').update({ tags: tags }).eq('id', source.id);
    }).catch(function() {});
  }

  function caseElementValuesOf(source) {
    const tags = Array.isArray(source && source.tags) ? source.tags : [];
    const known = FILTER_SECTIONS_CONFIG.element.values.filter(value => tags.includes(value));
    const marked = tags.map(caseElementMarkerValue).filter(Boolean);
    if (marked.length) return Array.from(new Set(known.concat(marked)));
    // v767 及更早没有元素类别标记：把不属于其它标签组的短自定义词按元素读回。
    const classified = new Set(caseTagChipRows().flatMap(row => row.values));
    sourceTag2Values('all').forEach(value => classified.add(value));
    // 旧的二级标签词表也算「已知标签」：不能因为清单瘦身，就把历史数据里的短标签认成元素
    const legacyTag2 = (LIBRARY_TAGS.source && LIBRARY_TAGS.source.tag2ByTag1) || {};
    Object.keys(legacyTag2).forEach(function(key) {
      (legacyTag2[key] || []).forEach(function(name) { if (name) classified.add(name); });
    });
    const legacyCustom = tags.filter(tag => !String(tag).startsWith('vf:') && String(tag).length <= 5 && !classified.has(tag));
    return Array.from(new Set(known.concat(legacyCustom)));
  }

  // v858：把标签选择态折算成 vf_source_files 更新载荷（tags + country_id/activity_id）。
  // 基底保留 vf: 标记等非标签内容，只摘掉标签值再按当前选择重填——
  // 编辑项目弹窗与详情弹窗左下角快捷标签编辑共用这一份逻辑，避免两处序列化漂移。
  function caseTagSelectionUpdatePayload(source, chipSel) {
    const currentTags = Array.isArray(source && source.tags) ? source.tags : [];
    // v868：选择态整体为空（编辑保存没带入任何标签、快捷编辑未选）时，原样保留现有 tags 与
    // 国家/活动归属——绝不因为「什么都没选」就把项目标签清空（配合 v868 修掉静默丢标签）
    const selectionKeys = ['tag1', 'country', 'activity'].concat(CASE_TAG_CHIP_TAG_KEYS);
    const hasAnySelection = selectionKeys.some(function(key) { return caseTagSelValues(chipSel, key).length > 0; });
    if (!hasAnySelection) {
      return {
        tags: currentTags,
        country_id: source.country_id || null,
        activity_id: source.activity_id || null
      };
    }
    const tag1Values = (LIBRARY_TAGS.source && LIBRARY_TAGS.source.tag1) || [];
    const previousElements = caseElementValuesOf(source);
    const nextTags = currentTags.filter(t => !tag1Values.includes(t) && !isCaseTagChipValue(t) && !String(t).startsWith(CASE_ELEMENT_MARKER_PREFIX) && !String(t).startsWith(CASE_ACTIVITY_MARKER_PREFIX) && !String(t).startsWith(CASE_STRATEGY_MARKER_PREFIX) && !previousElements.includes(t));
    if (chipSel.tag1) nextTags.push(chipSel.tag1);
    CASE_TAG_CHIP_TAG_KEYS.forEach(function(key) {
      // v862：strategy 词表外值用标记存（见下），不走这里的原词直存
      if (key === 'strategy') return;
      caseTagSelValues(chipSel, key).forEach(function(v) { nextTags.push(v); });
    });
    // 词表内主题直接存 tags；自定义主题用标记存（读回时还原，同元素标记机制）
    caseTagSelValues(chipSel, 'activity').forEach(function(v) { nextTags.push(FILTER_SECTIONS_CONFIG.activity.values.includes(v) ? v : caseActivityMarker(v)); });
    // v862：业务策略同理——词表内原词、词表外标记
    caseTagSelValues(chipSel, 'strategy').forEach(function(v) { nextTags.push(FILTER_SECTIONS_CONFIG.strategy.values.includes(v) ? v : caseStrategyMarker(v)); });
    caseTagSelValues(chipSel, 'element').forEach(function(v) { nextTags.push(caseElementMarker(v)); });
    return {
      tags: Array.from(new Set(nextTags)),
      country_id: caseTagSelFirst(chipSel, 'country') ? libraryOptionIdByZhName('country', caseTagSelFirst(chipSel, 'country')) : null,
      activity_id: caseTagSelFirst(chipSel, 'activity') ? libraryOptionIdByZhName('activity', caseTagSelFirst(chipSel, 'activity')) : null
    };
  }

  // v826 元素和活动主题都支持 "＋" 手动添加；v850 起两者统一按加权长度限制：
  // CJK 字符（中文/日文/韩文/全角）算 2 单位、其余算 1 单位，上限 12 单位＝中文 6 字 / 英文 12 字符。
  var CASE_TAG_CUSTOM_KEYS = ['element', 'activity', 'strategy'];
  const CASE_TAG_CUSTOM_MAX_UNITS = 12;

  function caseTagCharUnits(code) {
    return (code >= 0x2E80 && code <= 0x9FFF) || (code >= 0xAC00 && code <= 0xD7AF) || (code >= 0xF900 && code <= 0xFAFF) || (code >= 0xFF00 && code <= 0xFFEF) ? 2 : 1;
  }
  function caseTagCustomWeightedLength(value) {
    const s = String(value || '');
    let units = 0;
    for (let i = 0; i < s.length; i++) units += caseTagCharUnits(s.charCodeAt(i));
    return units;
  }
  function caseTagCustomClipToLimit(value) {
    const s = String(value || '');
    let units = 0;
    for (let i = 0; i < s.length; i++) {
      units += caseTagCharUnits(s.charCodeAt(i));
      if (units > CASE_TAG_CUSTOM_MAX_UNITS) return s.slice(0, i);
    }
    return s;
  }

  // v853：超出字数限制时的小气泡提醒（定位在输入框上方，1.8s 自动消失）
  let caseTagLimitTipTimer = 0;
  function showCaseTagLimitTip(input) {
    if (!input || !input.getBoundingClientRect) return;
    const zh = state.lang === 'zh';
    const text = zh
      ? '最多中文 ' + (CASE_TAG_CUSTOM_MAX_UNITS / 2) + ' 字 / 英文 ' + CASE_TAG_CUSTOM_MAX_UNITS + ' 字符'
      : 'Max ' + (CASE_TAG_CUSTOM_MAX_UNITS / 2) + ' CJK chars or ' + CASE_TAG_CUSTOM_MAX_UNITS + ' characters';
    let tip = document.querySelector('.case-tag-limit-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'case-tag-limit-tip';
      document.body.appendChild(tip);
    }
    tip.textContent = text;
    const rect = input.getBoundingClientRect();
    tip.style.left = Math.round(rect.left + rect.width / 2) + 'px';
    tip.style.top = Math.round(rect.top - 8) + 'px';
    tip.style.display = 'block';
    clearTimeout(caseTagLimitTipTimer);
    caseTagLimitTipTimer = setTimeout(function() {
      tip.style.display = 'none';
    }, 2200);
  }

  // v854：统一按加权长度限制输入框内容，超限截断并弹气泡。
  // 拼音/注音组词期间（composition）不干预，避免打断输入法；上屏（compositionend）后统一截断。
  function applyCaseTagInputLimit(input) {
    if (!input) return;
    const clipped = caseTagCustomClipToLimit(input.value);
    if (clipped !== input.value) {
      input.value = clipped;
      showCaseTagLimitTip(input);
    }
  }

  function caseTagCustomRowMarkup(key) {
    if (!CASE_TAG_CUSTOM_KEYS.includes(key)) return '';
    const isActivity = key === 'activity';
    const title = state.lang === 'zh' ? (isActivity ? '添加自定义主题' : '添加自定义标签') : (isActivity ? 'Add custom theme' : 'Add custom tag');
    const placeholder = state.lang === 'zh'
      ? '自定义标签，中文 6 字 / 英文 12 字符以内'
      : 'Custom tag, max 6 CJK chars or 12 characters';
    return `<button type="button" class="case-tag-custom-toggle" data-case-tag-custom-toggle data-case-tag-custom-key="${key}" title="${title}">＋</button><span class="case-tag-custom" data-case-tag-custom-row data-case-tag-custom-key="${key}" hidden><input type="text" class="case-tag-custom-input" data-case-tag-custom-input data-case-tag-custom-key="${key}" placeholder="${placeholder}"><button type="button" class="case-tag-custom-add" data-case-tag-custom-add data-case-tag-custom-key="${key}">${state.lang === 'zh' ? '添加' : 'Add'}</button></span>`;
  }

  function renderCaseTagChipGroups(selected) {
    const sel = selected || {};
    // v754：去掉「必填 / 选填」分组标题，七行标签平铺展示（必填约束由保存校验兜底）
    return `
      <div class="case-tag-pop-group">
        ${caseTagChipRows().map(function(row) {
          return `
        <div class="case-tag-row" data-case-tag-row="${row.key}">
          <span class="case-tag-cat">${state.lang === 'zh' ? row.label : (CASE_TAG_CHIP_EN[row.key] || row.label)}</span>
          <div class="case-tag-opts">
            ${row.values.map(value => `<button type="button" class="case-tag-chip${caseTagSelHas(sel, row.key, value) ? ' active' : ''}" data-case-tag-key="${row.key}" data-case-tag-value="${escapeAttr(value)}">${escapeHtml(libraryDisplayLabel(value))}</button>`).join('')}
            ${caseTagCustomRowMarkup(row.key)}
          </div>
        </div>`;
        }).join('')}
      </div>`;
  }

  function caseTagBubblesHtml(sel) {
    return caseTagChipRows().map(function(row) {
      return caseTagSelValues(sel, row.key).map(function(value) {
        return `<button type="button" class="case-tag-bubble" data-case-tag-kind="${row.key}" data-case-bubble-key="${row.key}" data-case-bubble-value="${escapeAttr(value)}" title="${state.lang === 'zh' ? '点击移除' : 'Remove'}">${escapeHtml(libraryDisplayLabel(value))}<span aria-hidden="true">×</span></button>`;
      }).join('');
    }).join('');
  }

  function renderCaseTagBar(selected) {
    const sel = selected || {};
    return `
      <div class="case-tag-bubbles" data-case-tag-bubbles>${caseTagBubblesHtml(sel)}</div>
      <div class="case-tag-ai" data-case-tag-ai hidden><span class="case-tag-ai-title">${state.lang === 'zh' ? 'AI 建议' : 'AI suggests'}</span><span class="case-tag-ai-chips" data-case-tag-ai-chips></span><span class="case-tag-ai-actions" data-case-tag-ai-actions hidden><button type="button" class="case-tag-ai-bulk" data-case-tag-ai-bulk="accept">${state.lang === 'zh' ? '全部采纳' : 'Accept all'}</button><button type="button" class="case-tag-ai-bulk" data-case-tag-ai-bulk="clear">${state.lang === 'zh' ? '取消采纳' : 'Clear accepted'}</button></span><button type="button" class="case-tag-ai-bulk" data-case-tag-ai-rerun hidden title="${state.lang === 'zh' ? '再识一次：只补充上次没认出的标签，已认过的保留' : 'Detect again: only adds previously missed tags'}">${state.lang === 'zh' ? '↻ 重新识别' : '↻ Re-detect'}</button></div>
      <button type="button" class="case-tag-add" data-case-tag-add>＋ ${state.lang === 'zh' ? '添加标签' : 'Add tags'}</button>`;
  }

  // 封面缩到长边 ≤1024px 的 JPEG：太小会把小羊这类小物体糊掉，太大又浪费上传
  function caseElementThumbnailDataUrl(file) {
    return new Promise(function(resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);
        try {
          const scale = Math.min(1, 1024 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
          canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
          const ctx = canvas.getContext('2d');
          fillCanvasWhite(ctx, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        } catch (error) { reject(error); }
      };
      img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
      img.src = url;
    });
  }

  // 上传时请求 AI 元素建议（只建议，不自动写入；用户点一下才进标签）。
  // 「重新识别」：结果与上一轮合并去重（只补新不覆盖），已采纳状态保持不变 —— 识别遗漏的保底机制。
  async function requestCaseElementSuggestions(root, file) {
    const ai = root ? root.querySelector('[data-case-tag-ai]') : null;
    const chipsBox = root ? root.querySelector('[data-case-tag-ai-chips]') : null;
    const actions = root ? root.querySelector('[data-case-tag-ai-actions]') : null;
    const rerunBtn = root ? root.querySelector('[data-case-tag-ai-rerun]') : null;
    if (!ai || !chipsBox || !file || state.localPreview) return;
    const requestKey = file.name + '|' + file.size + '|' + file.lastModified;
    root._caseTagAiFile = file;          // 供「重新识别」按钮复用同一张图
    if (!Array.isArray(root._caseTagAiSeen)) root._caseTagAiSeen = [];
    if (!Array.isArray(root._caseTagAiThemes)) root._caseTagAiThemes = [];
    const token = (state.session && state.session.access_token) || '';
    if (!token) return;
    const hint = function(text) { return '<span class="case-tag-ai-hint">' + escapeHtml(text) + '</span>'; };
    ai.hidden = false;
    if (actions) actions.hidden = true;
    if (rerunBtn) rerunBtn.hidden = true;   // 识别中不允许重复点
    chipsBox.innerHTML = hint(state.lang === 'zh' ? '正在识别画面元素…' : 'Detecting elements…');
    try {
      const image = await caseElementThumbnailDataUrl(file);
      if (!root.isConnected || root.dataset.aiElementKey !== requestKey) return;
      const response = await fetch('/api/analyze-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ image: image, vocabulary: FILTER_SECTIONS_CONFIG.element.values, activities: FILTER_SECTIONS_CONFIG.activity.values })
      });
      const data = await response.json().catch(function() { return {}; });
      if (!response.ok || !data.success) throw new Error(translateServerError(data.message) || ('HTTP ' + response.status));
      const list = Array.isArray(data.elements) ? data.elements : [];
      if (!root.isConnected || root.dataset.aiElementKey !== requestKey) return;
      // v828 活动主题和元素同套建议机制：AI 自由识别（不限词表），点一下才采纳
      const themes = Array.isArray(root._caseTagAiThemes) ? root._caseTagAiThemes.slice() : [];
      const freshThemes = [];
      const rawTheme = String(data.activity || '').trim();
      if (rawTheme && themes.indexOf(rawTheme) < 0) { themes.push(rawTheme); freshThemes.push(rawTheme); }
      root._caseTagAiThemes = themes;
      if (rerunBtn) rerunBtn.hidden = false;
      if (!list.length && !themes.length) {
        chipsBox.innerHTML = hint(state.lang === 'zh' ? '没识别到可用的元素或主题，可手动添加或重新识别' : 'No elements detected');
        return;
      }
      // 与上一轮建议合并：老建议保留在前，新认出的追加在后（去重），本次新增的高亮标出
      const seen = Array.isArray(root._caseTagAiSeen) ? root._caseTagAiSeen.slice() : [];
      const fresh = [];
      list.forEach(function(value) {
        if (!value || seen.indexOf(value) >= 0) return;
        seen.push(value);
        fresh.push(value);
      });
      root._caseTagAiSeen = seen;
      // 主题 chip 在前（蓝色调），元素 chip 在后；两者都是点一下采纳
      const themeChips = themes.map(function(value) {
        const added = caseTagSelHas(root._caseTagSel, 'activity', value);
        const isNew = freshThemes.indexOf(value) >= 0 && themes.length > freshThemes.length;
        return '<button type="button" class="case-tag-ai-chip case-tag-ai-activity' + (added ? ' is-added' : '') + (isNew ? ' is-new' : '') + '" data-case-tag-ai-activity="' + escapeAttr(value) + '">' + escapeHtml(value) + '</button>';
      }).join('');
      const elementChips = seen.map(function(value) {
        const added = caseTagSelHas(root._caseTagSel, 'element', value);
        const isNew = fresh.indexOf(value) >= 0 && seen.length > fresh.length;
        return '<button type="button" class="case-tag-ai-chip' + (added ? ' is-added' : '') + (isNew ? ' is-new' : '') + '" data-case-tag-ai-value="' + escapeAttr(value) + '">' + escapeHtml(value) + '</button>';
      }).join('');
      const freshCount = fresh.length + freshThemes.length;
      chipsBox.innerHTML = themeChips + elementChips + hint(state.lang === 'zh'
        ? (seen.length + themes.length > freshCount ? '（本次新认出 ' + freshCount + ' 个，点一下采纳）' : '（点一下采纳）')
        : '(click to add)');
      if (actions) actions.hidden = false;
      syncCaseAiSuggestionState(root);
    } catch (error) {
      if (!root.isConnected || root.dataset.aiElementKey !== requestKey) return;
      chipsBox.innerHTML = hint(state.lang === 'zh' ? '识别失败，可重新识别或手动添加' : 'Detection failed');
      if (rerunBtn) rerunBtn.hidden = false;
    }
  }

  async function selectCaseElementSuggestionFile(files) {
    const images = Array.from(files || []).filter(function(file) {
      return file && /^image\//.test(file.type || '') && !isCaseVideoFile(file);
    });
    if (!images.length) return null;
    await refreshMaterialCatalogForCases();
    const classified = await Promise.all(images.map(async function(file) {
      try {
        const dims = await readImageDimensions(file);
        return { file: file, type: detectCaseMaterialType(file.name, dims.width, dims.height, uploadCasePlatform()) };
      } catch (_error) {
        return { file: file, type: '' };
      }
    }));
    // 有「开屏/开机海报」类别就优先拿它当主图（AI 元素建议只跑一张）
    const splashType = caseSplashTypeName(uploadCasePlatform());
    const splash = splashType ? classified.find(function(item) { return item.type === splashType; }) : null;
    return splash ? splash.file : images[0];
  }

  function clearCaseElementSuggestions(root) {
    if (!root) return;
    delete root.dataset.aiElementKey;
    delete root.dataset.aiElementBatchKey;
    root._caseTagAiFile = null;      // 换图后重置：重新识别的合并历史不能跨图沿用
    root._caseTagAiSeen = [];
    root._caseTagAiThemes = [];
    const ai = root.querySelector('[data-case-tag-ai]');
    if (!ai) return;
    ai.hidden = true;
    const chips = ai.querySelector('[data-case-tag-ai-chips]');
    const actions = ai.querySelector('[data-case-tag-ai-actions]');
    const rerunBtn = ai.querySelector('[data-case-tag-ai-rerun]');
    if (chips) chips.innerHTML = '';
    if (actions) actions.hidden = true;
    if (rerunBtn) rerunBtn.hidden = true;
  }

  function clearCaseAutoQuantity(root) {
    if (!root) return;
    delete root.dataset.caseAutoTagBatchKey;
    if (!root._caseTagAutoQuantity || root._caseTagQuantityManual) return;
    caseTagSelSet(root._caseTagSel, 'quantity', '');
    root._caseTagAutoQuantity = '';
    syncCaseTagSelectionUi(root);
  }

  function syncCaseTagBubbles(root) {
    if (!root) return;
    const bubbles = root.querySelector('[data-case-tag-bubbles]');
    if (bubbles) bubbles.innerHTML = caseTagBubblesHtml(root._caseTagSel);
  }

  function syncCaseAiSuggestionState(root) {
    if (!root) return;
    const chips = Array.from(root.querySelectorAll('[data-case-tag-ai-value]'));
    chips.forEach(function(chip) {
      chip.classList.toggle('is-added', caseTagSelHas(root._caseTagSel, 'element', chip.dataset.caseTagAiValue));
    });
    // v828 主题建议 chip 的已采纳状态
    Array.from(root.querySelectorAll('[data-case-tag-ai-activity]')).forEach(function(chip) {
      chip.classList.toggle('is-added', caseTagSelHas(root._caseTagSel, 'activity', chip.dataset.caseTagAiActivity));
    });
    const acceptAll = root.querySelector('[data-case-tag-ai-bulk="accept"]');
    const clearAll = root.querySelector('[data-case-tag-ai-bulk="clear"]');
    if (acceptAll) acceptAll.disabled = !chips.length || chips.every(function(chip) { return caseTagSelHas(root._caseTagSel, 'element', chip.dataset.caseTagAiValue); });
    if (clearAll) clearAll.disabled = !chips.some(function(chip) { return caseTagSelHas(root._caseTagSel, 'element', chip.dataset.caseTagAiValue); });
  }

  function syncCaseTagSelectionUi(root) {
    if (!root) return;
    syncCaseTagBubbles(root);
    syncCaseAiSuggestionState(root);
    refreshCaseTagRequiredMarks(root);
    if (!root._caseTagPop) return;
    root._caseTagPop.querySelectorAll('.case-tag-chip').forEach(function(chip) {
      chip.classList.toggle('active', caseTagSelHas(root._caseTagSel, chip.dataset.caseTagKey, chip.dataset.caseTagValue));
    });
    const addBtn = root.querySelector('[data-case-tag-add]');
    if (addBtn) positionCaseTagPop(root, root._caseTagPop, addBtn);
  }

  function applyCaseAutoQuantity(root, dimensions) {
    if (!root || root._caseTagQuantityManual || !dimensions.length) return;
    const sizes = new Set(dimensions.map(function(dims) { return Math.round(dims.width) + 'x' + Math.round(dims.height); }));
    const quantity = sizes.size > 1 ? '成套素材' : '单素材';
    caseTagSelSet(root._caseTagSel, 'quantity', quantity);
    root._caseTagAutoQuantity = quantity;
    syncCaseTagSelectionUi(root);
  }

  // 平台（标签一）和国家是上传必填：缺哪个就把标签面板里那一行标红，
  // 面板没开着就直接弹出来（不然用户看不到标在哪），提醒他先选。
  function flagMissingCaseTagRows(bar, keys) {
    if (!bar) return;
    const missing = Array.isArray(keys) ? keys.filter(Boolean) : [];
    bar._caseTagMissing = missing.slice();
    const addBtn = bar.querySelector('[data-case-tag-add]');
    if (addBtn) addBtn.classList.toggle('is-required', missing.length > 0);
    if (missing.length && !bar._caseTagPop && addBtn) openCaseTagPop(bar, addBtn);
    if (!bar._caseTagPop) return;
    bar._caseTagPop.querySelectorAll('[data-case-tag-row]').forEach(function(row) {
      row.classList.toggle('is-missing', missing.indexOf(row.getAttribute('data-case-tag-row')) >= 0);
    });
  }

  // 补选之后：还在缺的继续标红，全选齐了就自动消红（没被拦过就不动）
  function refreshCaseTagRequiredMarks(root) {
    if (!root || !Array.isArray(root._caseTagMissing) || !root._caseTagMissing.length) return;
    flagMissingCaseTagRows(root, root._caseTagMissing.filter(function(key) { return !caseTagSelFirst(root._caseTagSel, key); }));
  }

  // 浮窗挂到 body 上：弹窗外壳 overflow:hidden + backdrop-filter 会裁掉/困住内部定位的浮窗
  function openCaseTagPop(root, addBtn) {
    closeCaseTagPop(root);
    const pop = document.createElement('div');
    pop.className = 'case-tag-pop';
    pop.innerHTML = renderCaseTagChipGroups(root._caseTagSel);
    document.body.append(pop);
    pop.addEventListener('click', function(event) {
      const customToggle = event.target.closest('[data-case-tag-custom-toggle]');
      if (customToggle) {
        const customKey = customToggle.dataset.caseTagCustomKey || 'element';
        const rowEl = pop.querySelector('[data-case-tag-custom-row][data-case-tag-custom-key="' + customKey + '"]');
        if (rowEl) {
          rowEl.hidden = false;
          const focusInput = rowEl.querySelector('[data-case-tag-custom-input]');
          if (focusInput) {
            focusInput.focus();
            // v850：输入时按加权长度实时截断（中文 6 字 / 英文 12 字符）；只绑一次
            if (!focusInput.dataset.vfTagLimitBound) {
              focusInput.dataset.vfTagLimitBound = '1';
              // v854：组词期间不干预拼音输入，上屏后统一截断 + 气泡
              let composing = false;
              focusInput.addEventListener('compositionstart', function() { composing = true; });
              focusInput.addEventListener('compositionend', function() {
                composing = false;
                applyCaseTagInputLimit(focusInput);
              });
              focusInput.addEventListener('input', function() {
                if (!composing) applyCaseTagInputLimit(focusInput);
              });
            }
          }
        }
        positionCaseTagPop(root, pop, addBtn);
        return;
      }
      const customAdd = event.target.closest('[data-case-tag-custom-add]');
      if (customAdd) {
        const customKey = customAdd.dataset.caseTagCustomKey || 'element';
        const input = pop.querySelector('[data-case-tag-custom-input][data-case-tag-custom-key="' + customKey + '"]');
        addCaseTagCustomValue(root, pop, addBtn, input && input.value, customKey);
        return;
      }
      const chip = event.target.closest('.case-tag-chip');
      if (!chip) return;
      const key = chip.dataset.caseTagKey;
      const value = chip.dataset.caseTagValue;
      if (key === 'activity') { root._caseTagActivityManual = true; root._caseTagAutoActivity = ''; }
      if (key === 'quantity') { root._caseTagQuantityManual = true; root._caseTagAutoQuantity = ''; }
      caseTagSelToggle(root._caseTagSel, key, value);
      chip.closest('.case-tag-opts').querySelectorAll('.case-tag-chip').forEach(btn => btn.classList.toggle('active', caseTagSelHas(root._caseTagSel, key, btn.dataset.caseTagValue)));
      // 换端后，上传弹窗里各图的类别选项与识别结果都要跟着换成本端的清单
      if (key === 'tag1' && root.id === 'upload-case-tag-bar') refreshCaseUploadTypeOptions();
      syncCaseTagBubbles(root);
      refreshCaseTagRequiredMarks(root);
      positionCaseTagPop(root, pop, addBtn);
    });
    pop.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter') return;
      const input = event.target.closest('[data-case-tag-custom-input]');
      if (!input) return;
      event.preventDefault();
      addCaseTagCustomValue(root, pop, addBtn, input.value, input.dataset.caseTagCustomKey || 'element');
    });
    positionCaseTagPop(root, pop, addBtn);
    root._caseTagPop = pop;
  }

  function addCaseTagCustomValue(root, pop, addBtn, rawValue, tagKey) {
    const key = CASE_TAG_CUSTOM_KEYS.includes(tagKey) ? tagKey : 'element';
    const value = String(rawValue || '').trim();
    if (!value) return;
    // v850 加权长度上限：超限拒绝并红框提示（输入框已实时截断，这里防粘贴/程序写入绕过）
    if (caseTagCustomWeightedLength(value) > CASE_TAG_CUSTOM_MAX_UNITS) {
      const limitInput = pop.querySelector('[data-case-tag-custom-input][data-case-tag-custom-key="' + key + '"]');
      if (limitInput) {
        limitInput.classList.add('case-tag-custom-too-long');
        limitInput.focus();
        showCaseTagLimitTip(limitInput);
        setTimeout(function() { limitInput.classList.remove('case-tag-custom-too-long'); }, 1200);
      }
      return;
    }
    // 手动选主题即视为人工指定，AI 不再自动覆盖
    if (key === 'activity') { root._caseTagActivityManual = true; root._caseTagAutoActivity = ''; }
    caseTagSelToggle(root._caseTagSel, key, value);
    // 只把新标签补成 chip，不整块重绘浮窗：重绘会让被点的按钮脱离 DOM，
    // 「点浮窗外关闭」的判断随之失效，浮窗会被误关。
    const rowEl = pop.querySelector('[data-case-tag-custom-row][data-case-tag-custom-key="' + key + '"]');
    const opts = rowEl ? rowEl.parentElement : null;
    if (opts) {
      const existing = Array.from(opts.querySelectorAll('.case-tag-chip')).find(function(chip) { return chip.dataset.caseTagValue === value; });
      if (existing) {
        existing.classList.add('active');
      } else {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'case-tag-chip active';
        chip.dataset.caseTagKey = key;
        chip.dataset.caseTagValue = value;
        chip.textContent = libraryDisplayLabel(value);
        opts.insertBefore(chip, rowEl);
      }
    }
    const input = rowEl ? rowEl.querySelector('[data-case-tag-custom-input]') : null;
    if (input) { input.value = ''; input.focus(); }
    syncCaseTagBubbles(root);
    positionCaseTagPop(root, pop, addBtn);
  }

  // 向上翻时锚定整条标签栏顶部，避免浮窗盖住已选气泡；气泡增删会改变栏高，需重新定位
  function positionCaseTagPop(root, pop, addBtn) {
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const r = addBtn.getBoundingClientRect();
    const barRect = root.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) {
      const above = barRect.top - 6 - h;
      top = above >= 8 ? above : Math.max(8, window.innerHeight - h - 8);
    }
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = top + 'px';
  }

  function closeCaseTagPop(root) {
    if (root && root._caseTagPop) { root._caseTagPop.remove(); root._caseTagPop = null; }
  }

  function wireCaseTagBar(root) {
    if (!root || root.dataset.barBound === 'true') return;
    root.dataset.barBound = 'true';
    root._caseTagSel = root._caseTagSel || {};
    const addBtn = root.querySelector('[data-case-tag-add]');
    const bubbles = root.querySelector('[data-case-tag-bubbles]');
    if (!addBtn || !bubbles) return;
    addBtn.addEventListener('click', function() {
      if (root._caseTagPop) closeCaseTagPop(root);
      else openCaseTagPop(root, addBtn);
    });
    bubbles.addEventListener('click', function(event) {
      const bubble = event.target.closest('.case-tag-bubble');
      if (!bubble) return;
      // 删除会重绘气泡条，被点的气泡随即脱离 DOM；先打标记，避免 document 的"点外面关闭"误判
      if (root._caseTagPop) root._caseTagPopKeepOpen = true;
      if (bubble.dataset.caseBubbleKey === 'activity') { root._caseTagActivityManual = true; root._caseTagAutoActivity = ''; }
      if (bubble.dataset.caseBubbleKey === 'quantity') { root._caseTagQuantityManual = true; root._caseTagAutoQuantity = ''; }
      const isPlatformBubble = bubble.dataset.caseBubbleKey === 'tag1';
      caseTagSelToggle(root._caseTagSel, bubble.dataset.caseBubbleKey, bubble.dataset.caseBubbleValue);
      // 换端后，上传弹窗里各图的类别选项与识别结果都要跟着换成本端的清单
      if (isPlatformBubble && root.id === 'upload-case-tag-bar') refreshCaseUploadTypeOptions();
      if (root._caseTagPop) {
        root._caseTagPop.querySelectorAll('.case-tag-chip').forEach(function(chip) {
          chip.classList.toggle('active', caseTagSelHas(root._caseTagSel, chip.dataset.caseTagKey, chip.dataset.caseTagValue));
        });
      }
      syncCaseTagBubbles(root);
      syncCaseAiSuggestionState(root);
      refreshCaseTagRequiredMarks(root);
      if (root._caseTagPop) positionCaseTagPop(root, root._caseTagPop, addBtn);
    });
    // 采纳 AI 建议的元素：支持单条切换、全部采纳和取消采纳
    root.addEventListener('click', function(event) {
      const rerunBtn = event.target.closest('[data-case-tag-ai-rerun]');
      if (rerunBtn) {
        // 重新识别：同一张图再识一次，结果与上一轮合并（只补新不覆盖）
        if (root._caseTagAiFile) void requestCaseElementSuggestions(root, root._caseTagAiFile);
        return;
      }
      const aiChip = event.target.closest('[data-case-tag-ai-value]');
      const themeChip = event.target.closest('[data-case-tag-ai-activity]');
      const bulk = event.target.closest('[data-case-tag-ai-bulk]');
      if (!aiChip && !bulk && !themeChip) return;
      if (root._caseTagPop) root._caseTagPopKeepOpen = true;
      if (themeChip) {
        const themeValue = themeChip.dataset.caseTagAiActivity;
        if (!themeValue) return;
        caseTagSelToggle(root._caseTagSel, 'activity', themeValue);
      } else if (bulk) {
        const shouldSelect = bulk.dataset.caseTagAiBulk === 'accept';
        root.querySelectorAll('[data-case-tag-ai-value]').forEach(function(chip) {
          const value = chip.dataset.caseTagAiValue;
          if (value && caseTagSelHas(root._caseTagSel, 'element', value) !== shouldSelect) caseTagSelToggle(root._caseTagSel, 'element', value);
        });
      } else {
        const value = aiChip.dataset.caseTagAiValue;
        if (!value) return;
        caseTagSelToggle(root._caseTagSel, 'element', value);
      }
      syncCaseAiSuggestionState(root);
      syncCaseTagBubbles(root);
      if (root._caseTagPop) {
        root._caseTagPop.querySelectorAll('.case-tag-chip').forEach(function(chip) {
          chip.classList.toggle('active', caseTagSelHas(root._caseTagSel, chip.dataset.caseTagKey, chip.dataset.caseTagValue));
        });
        positionCaseTagPop(root, root._caseTagPop, addBtn);
      }
    });
    // 点浮窗外关闭；已选内容保留在气泡条上
    document.addEventListener('click', function(event) {
      if (!root._caseTagPop) return;
      if (root._caseTagPopKeepOpen) { root._caseTagPopKeepOpen = false; return; }
      if (!root.isConnected) { closeCaseTagPop(root); return; }
      // 被点的元素可能在这次点击中已被移除（标签条重绘）：contains 判定会失手，直接跳过
      if (!document.contains(event.target)) return;
      if (root._caseTagPop.contains(event.target) || addBtn.contains(event.target) || bubbles.contains(event.target)) return;
      closeCaseTagPop(root);
    });
  }

  function applyCaseTagBarSelections(root, sel) {
    if (!root) return;
    root._caseTagSel = Object.assign({}, sel || {});
    root._caseTagActivityManual = caseTagSelValues(root._caseTagSel, 'activity').length > 0;
    root._caseTagQuantityManual = caseTagSelValues(root._caseTagSel, 'quantity').length > 0;
    root._caseTagAutoActivity = '';
    root._caseTagAutoQuantity = '';
    // 多选组归一化为数组（上传预览等入口可能传单值字符串）
    CASE_TAG_MULTI_KEYS.forEach(function(key) {
      const v = root._caseTagSel[key];
      if (v && !Array.isArray(v)) root._caseTagSel[key] = [v];
    });
    closeCaseTagPop(root);
    syncCaseTagBubbles(root);
  }

  function libraryOptionIdByZhName(type, name) {
    if (!name) return null;
    const opt = libraryOptions(type).find(item => item.name_zh === name || item.name_en === name);
    return opt ? opt.id : null;
  }

  function caseProjectTagsForChips(formData, chipSel) {
    const tags = libraryTagsForForm(formData, 'source').filter(tag => !isCaseTagChipValue(tag));
    if (chipSel.tag1) tags.push(chipSel.tag1);
    CASE_TAG_CHIP_TAG_KEYS.forEach(function(key) {
      // v862：strategy 词表外值用标记存（见下），不走这里的原词直存
      if (key === 'strategy') return;
      caseTagSelValues(chipSel, key).forEach(function(v) { tags.push(v); });
    });
    // 活动主题多选：词表内的直接进 tags（筛选按 tags 匹配）；自定义主题用标记存，activity_id 只兼容写第一个（正式站 v561 依赖）
    const customActivities = [];
    caseTagSelValues(chipSel, 'activity').forEach(function(v) {
      if (FILTER_SECTIONS_CONFIG.activity.values.includes(v)) tags.push(v); else customActivities.push(v);
    });
    // v862：业务策略同理——词表内原词、词表外标记
    const customStrategies = [];
    caseTagSelValues(chipSel, 'strategy').forEach(function(v) {
      if (FILTER_SECTIONS_CONFIG.strategy.values.includes(v)) tags.push(v); else customStrategies.push(v);
    });
    const normalized = normalizeLibraryTags('source', tags, 40);
    caseTagSelValues(chipSel, 'element').forEach(function(value) {
      const marker = caseElementMarker(value);
      if (!normalized.includes(marker)) normalized.push(marker);
    });
    customActivities.forEach(function(value) {
      const marker = caseActivityMarker(value);
      if (!normalized.includes(marker)) normalized.push(marker);
    });
    customStrategies.forEach(function(value) {
      const marker = caseStrategyMarker(value);
      if (!normalized.includes(marker)) normalized.push(marker);
    });
    return normalized.slice(0, 64);
  }

  // 从项目记录读回标签选择（上传/编辑/项目窗展示共用同一套存储口径）
  function caseChipSelectionOf(source) {
    const tags = Array.isArray(source && source.tags) ? source.tags : [];
    const tag1Values = (LIBRARY_TAGS.source && LIBRARY_TAGS.source.tag1) || [];
    const zhNameOfOption = id => { const opt = state.libraryOptions.find(o => o.id === id); return opt ? (opt.name_zh || opt.name_en) : ''; };
    const sel = { tag1: tags.find(t => tag1Values.includes(t)) || '' };
    const countryZh = zhNameOfOption(source.country_id);
    if (FILTER_SECTIONS_CONFIG.country.values.includes(countryZh)) sel.country = countryZh;
    // v750 多选：内容标签从 tags 里收集全部命中值；活动主题额外兼容 activity_id（存量单选数据）和自定义主题标记（v826）
    const activityValues = [];
    const activityZh = zhNameOfOption(source.activity_id);
    if (FILTER_SECTIONS_CONFIG.activity.values.includes(activityZh)) activityValues.push(activityZh);
    tags.map(caseActivityMarkerValue).filter(Boolean).forEach(function(v) { if (!activityValues.includes(v)) activityValues.push(v); });
    // v862：业务策略自定义标记读回（同活动主题机制）
    const strategyValues = tags.map(caseStrategyMarkerValue).filter(Boolean);
    CASE_TAG_MULTI_KEYS.forEach(function(key) {
      const list = key === 'element' ? caseElementValuesOf(source) : FILTER_SECTIONS_CONFIG[key].values.filter(v => tags.includes(v));
      if (key === 'activity') {
        activityValues.forEach(function(v) { if (!list.includes(v)) list.push(v); });
        sel.activity = list;
      } else if (key === 'strategy') {
        strategyValues.forEach(function(v) { if (!list.includes(v)) list.push(v); });
        sel[key] = list;
      } else {
        sel[key] = list;
      }
    });
    return sel;
  }

  // 项目窗所有标签统一放底部：绿色分类在前，橙色元素在后。
  function caseFootTagsHtml(source) {
    const sel = caseChipSelectionOf(source);
    const chips = [];
    ['tag1', 'country', 'activity', 'strategy', 'format', 'quantity', 'element'].forEach(function(key) {
      caseTagSelValues(sel, key).forEach(function(value) { chips.push({ key: key, value: value }); });
    });
    return chips.map(function(item) {
      return `<span class="case-foot-tag${item.key === 'element' ? ' is-element' : ''}" data-case-tag-kind="${item.key}">${escapeHtml(libraryDisplayLabel(item.value))}</span>`;
    }).join('');
  }

  // 底部标签只显示一行（超出裁掉）；hover 标签区弹浮窗列出全部（元素标签会越来越多）
  function wireCaseFootTagsHover(root) {
    const box = root ? root.querySelector('.case-foot-tags') : null;
    if (!box || box.dataset.hoverBound === 'true') return;
    box.dataset.hoverBound = 'true';
    let pop = null;
    let showTimer = 0;
    let hideTimer = 0;
    const removePop = function() {
      if (pop) { pop.remove(); pop = null; }
      box.classList.remove('is-muted');
    };
    const closeSoon = function() {
      if (hideTimer) return;
      hideTimer = window.setTimeout(function() { hideTimer = 0; removePop(); }, 140);
    };
    const cancelClose = function() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
    };
    const open = function() {
      if (pop || !box.isConnected) return;
      // 没被裁就不用弹（标签都在一行里看得见）
      if (box.scrollWidth <= box.clientWidth + 1) return;
      const chips = Array.from(box.querySelectorAll('.case-foot-tag')).map(function(el) { return { text: el.textContent.trim(), element: el.classList.contains('is-element') }; });
      if (!chips.length) return;
      pop = document.createElement('div');
      pop.className = 'case-foot-tags-pop';
      pop.innerHTML = '<div class="case-foot-tags-pop-title">'
        + (state.lang === 'zh' ? '全部标签 · ' + chips.length : 'All tags · ' + chips.length)
        + '</div>'
        + chips.map(function(item) { return '<span class="case-foot-tag' + (item.element ? ' is-element' : '') + '">' + escapeHtml(item.text) + '</span>'; }).join('');
      // v858：标签多到出浮窗时，「＋标签 / AI 识别」两个按钮也放进浮窗（与左下角同款，点了关浮窗并打开对应编辑器）
      const footToolBtns = box.parentElement ? Array.from(box.parentElement.querySelectorAll('.case-foot-tool-btn')) : [];
      if (footToolBtns.length) {
        const toolsRow = document.createElement('div');
        toolsRow.className = 'case-foot-tags-pop-tools';
        footToolBtns.forEach(function(btn) {
          const clone = document.createElement('button');
          clone.type = 'button';
          clone.className = 'case-foot-tool-btn';
          clone.textContent = btn.textContent;
          clone.addEventListener('click', function() { removePop(); btn.click(); });
          toolsRow.append(clone);
        });
        pop.append(toolsRow);
      }
      document.body.append(pop);
      box.classList.add('is-muted');
      const rect = box.getBoundingClientRect();
      const w = pop.offsetWidth, h = pop.offsetHeight;
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - w - 8));
      let top = rect.top - h - 8;
      if (top < 8) top = Math.min(Math.max(8, window.innerHeight - h - 8), rect.bottom + 8);
      pop.style.left = left + 'px';
      pop.style.top = Math.max(8, top) + 'px';
      pop.addEventListener('mouseenter', cancelClose);
      pop.addEventListener('mouseleave', closeSoon);
    };
    box.addEventListener('mouseenter', function() {
      cancelClose();
      if (showTimer) clearTimeout(showTimer);
      showTimer = window.setTimeout(function() { showTimer = 0; open(); }, 120);
    });
    box.addEventListener('mouseleave', function() {
      if (showTimer) { clearTimeout(showTimer); showTimer = 0; }
      closeSoon();
    });
  }

  // ── v858 详情弹窗左下角标签快捷编辑 ─────────────────────────
  // 「＋标签」：弹出标签选择浮窗（与上传表单同套词表），点一下即时写云端（读库最新 tags 再合并，
  // 与封面标记同一路数，防并发互覆盖），再点取消；「AI 识别」：拿封面/第一张图片走
  // /api/analyze-elements 建议元素与活动主题，点建议词采纳（同样即时保存），可重新识别只补新。
  let caseFootToolsCleanup = null;
  function wireCaseFootTagTools(backdrop, source, canManage) {
    if (!canManage || caseFootToolsCleanup) return;
    const box = backdrop.querySelector('#case-foot-tags');
    const addBtn = backdrop.querySelector('#case-foot-add-tag');
    const aiBtn = backdrop.querySelector('#case-foot-ai-tag');
    if (!box || !addBtn || !aiBtn) return;
    let footSel = null;       // 编辑中的选择态（打开编辑器/AI 采纳时从 source 现算）
    let editorPop = null;
    let suggestPop = null;
    let suggestSeen = [];     // AI 已建议过的元素（重新识别只补新不覆盖）
    let suggestThemes = [];
    const zh = function() { return state.lang === 'zh'; };

    const closeEditor = function() { if (editorPop) { editorPop.remove(); editorPop = null; } };
    const closeSuggest = function() { if (suggestPop) { suggestPop.remove(); suggestPop = null; } };
    const positionPop = function(pop, anchor) {
      pop.style.position = 'fixed';
      pop.style.visibility = 'hidden';
      document.body.append(pop);
      const rect = anchor.getBoundingClientRect();
      const w = pop.offsetWidth, h = pop.offsetHeight;
      let left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - w - 8));
      let top = rect.bottom + 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, rect.top - h - 8);
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      pop.style.visibility = 'visible';
    };
    const refreshFootChips = function() { box.innerHTML = caseFootTagsHtml(source); };
    const persistError = function(error) {
      alert(zh() ? ('标签保存失败：' + ((error && error.message) || '请重试')) : ('Failed to save tags: ' + ((error && error.message) || 'Please retry')));
    };
    // 读库里最新 tags 再按当前选择态重填（与 mergeSourceTagsMarker 同一路数，防并发互覆盖）
    const persistSelection = function() {
      return state.supabase.from('vf_source_files').select('tags,country_id,activity_id').eq('id', source.id).maybeSingle().then(function(fresh) {
        if (fresh.error) throw fresh.error;
        if (!fresh.data) throw new Error(zh() ? '项目不存在' : 'Project does not exist.');
        const baseline = Object.assign({}, source, { tags: Array.isArray(fresh.data.tags) ? fresh.data.tags : [] });
        const payload = caseTagSelectionUpdatePayload(baseline, footSel);
        return state.supabase.from('vf_source_files').update({ tags: payload.tags, country_id: payload.country_id, activity_id: payload.activity_id }).eq('id', source.id).then(function(update) {
          if (update.error) throw update.error;
          source.tags = payload.tags;
          source.country_id = payload.country_id;
          source.activity_id = payload.activity_id;
          refreshFootChips();
        });
      });
    };

    // ── ＋标签：标签选择浮窗（点一下即保存） ──
    const openEditor = function() {
      if (editorPop) { closeEditor(); return; }
      closeSuggest();
      footSel = caseChipSelectionOf(source);
      editorPop = document.createElement('div');
      editorPop.className = 'case-tag-pop case-foot-tag-editor';
      editorPop.innerHTML = '<div class="case-foot-tag-editor-hint">' + (zh() ? '点一下即保存到云端，再点一下取消' : 'Click a tag to save instantly; click again to remove') + '</div>' + renderCaseTagChipGroups(footSel);
      positionPop(editorPop, addBtn);
      editorPop.addEventListener('click', function(event) {
        const customToggle = event.target.closest('[data-case-tag-custom-toggle]');
        if (customToggle) {
          const customKey = customToggle.dataset.caseTagCustomKey || 'element';
          const rowEl = editorPop.querySelector('[data-case-tag-custom-row][data-case-tag-custom-key="' + customKey + '"]');
          if (rowEl) {
            rowEl.hidden = false;
            const focusInput = rowEl.querySelector('[data-case-tag-custom-input]');
            if (focusInput) {
              focusInput.focus();
              if (!focusInput.dataset.vfTagLimitBound) {
                focusInput.dataset.vfTagLimitBound = '1';
                let composing = false;
                focusInput.addEventListener('compositionstart', function() { composing = true; });
                focusInput.addEventListener('compositionend', function() { composing = false; applyCaseTagInputLimit(focusInput); });
                focusInput.addEventListener('input', function() { if (!composing) applyCaseTagInputLimit(focusInput); });
              }
            }
          }
          positionPop(editorPop, addBtn);
          return;
        }
        const customAdd = event.target.closest('[data-case-tag-custom-add]');
        if (customAdd) { addCustomFromEditor(customAdd); return; }
        const chip = event.target.closest('.case-tag-chip');
        if (!chip) return;
        const key = chip.dataset.caseTagKey;
        const value = chip.dataset.caseTagValue;
        caseTagSelToggle(footSel, key, value);
        chip.classList.toggle('active', caseTagSelHas(footSel, key, value));
        persistSelection().catch(persistError);
      });
      editorPop.addEventListener('keydown', function(event) {
        if (event.key !== 'Enter') return;
        const input = event.target.closest('[data-case-tag-custom-input]');
        if (!input) return;
        event.preventDefault();
        addCustomFromEditor(input.closest('[data-case-tag-custom-row]').querySelector('[data-case-tag-custom-add]'));
      });
    };
    // 自定义元素/主题：与上传表单同一套加权长度限制（中文 6 字 / 英文 12 字符），超限红框 + 气泡
    const addCustomFromEditor = function(addEl) {
      const key = (addEl && addEl.dataset.caseTagCustomKey) || 'element';
      const input = editorPop.querySelector('[data-case-tag-custom-input][data-case-tag-custom-key="' + key + '"]');
      if (!input) return;
      const value = String(input.value || '').trim();
      if (!value) return;
      if (caseTagCustomWeightedLength(value) > CASE_TAG_CUSTOM_MAX_UNITS) {
        input.classList.add('case-tag-custom-too-long');
        showCaseTagLimitTip(input);
        return;
      }
      input.classList.remove('case-tag-custom-too-long');
      caseTagSelToggle(footSel, key, value);
      input.value = '';
      const rowEl = editorPop.querySelector('[data-case-tag-custom-row][data-case-tag-custom-key="' + key + '"]');
      if (rowEl) rowEl.hidden = true;
      positionPop(editorPop, addBtn);
      persistSelection().catch(persistError);
    };

    // ── AI 识别：封面/第一张图片 → 元素与活动主题建议，点建议词采纳（即时保存） ──
    const runAiSuggest = function() {
      const token = (state.session && state.session.access_token) || '';
      if (!token) return;
      const isVideo = p => String(p.preview_mime_type || '').toLowerCase().startsWith('video/');
      const coverPick = caseCoverFor(source, 'all');
      let imageMaterial = coverPick && coverPick.cover && !isVideo(coverPick.cover) ? coverPick.cover : null;
      if (!imageMaterial) imageMaterial = caseMaterialsOf(source).find(function(p) { return !isVideo(p); }) || null;
      if (!imageMaterial) { alert(zh() ? '没有可识别的图片物料。' : 'No image material to analyze.'); return; }
      const url = state.libraryPreviewUrls[imageMaterial.preview_path] || '';
      if (!url) { alert(zh() ? '拿不到原图，请先刷新页面再试。' : 'Cannot fetch the image. Refresh and retry.'); return; }
      if (!footSel) footSel = caseChipSelectionOf(source);
      showCaseToast(zh() ? '正在识别画面元素…' : 'Detecting elements…', 2000);
      aiBtn.disabled = true;
      fetch(url, { mode: 'cors' }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(function(blob) { return caseElementThumbnailDataUrl(new File([blob], String(imageMaterial.preview_filename || 'preview'), { type: blob.type || 'image/jpeg' })); })
        .then(function(image) {
          return fetch('/api/analyze-elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ image: image, vocabulary: FILTER_SECTIONS_CONFIG.element.values, activities: FILTER_SECTIONS_CONFIG.activity.values })
          });
        })
        .then(r => r.json())
        .then(function(data) {
          aiBtn.disabled = false;
          if (!data || !data.success) throw new Error(translateServerError(data && data.message) || 'HTTP 错误');
          const elements = Array.isArray(data.elements) ? data.elements : [];
          const theme = String(data.activity || '').trim();
          if (theme && suggestThemes.indexOf(theme) < 0) suggestThemes.push(theme);
          elements.forEach(function(v) { if (v && suggestSeen.indexOf(v) < 0) suggestSeen.push(v); });
          if (!suggestSeen.length && !suggestThemes.length) {
            showCaseToast(zh() ? '没识别到可用的元素或主题' : 'No elements detected', 2400);
            return;
          }
          renderSuggestPop();
        })
        .catch(function(error) {
          aiBtn.disabled = false;
          alert(zh() ? ('AI 识别失败：' + ((error && error.message) || '请重试')) : ('AI detection failed: ' + ((error && error.message) || 'Please retry')));
        });
    };
    const renderSuggestPop = function() {
      closeSuggest();
      if (!suggestSeen.length && !suggestThemes.length) return;
      suggestPop = document.createElement('div');
      suggestPop.className = 'case-tag-pop case-foot-ai-suggest';
      suggestPop.innerHTML = '<div class="case-foot-tag-editor-hint">' + (zh() ? '点一下采纳（即时保存），再点取消' : 'Click to adopt (saved instantly); click again to remove') + '</div>'
        + suggestThemes.map(function(value) {
          const added = caseTagSelHas(footSel, 'activity', value);
          return '<button type="button" class="case-tag-ai-chip case-tag-ai-activity' + (added ? ' is-added' : '') + '" data-foot-ai-activity="' + escapeAttr(value) + '">' + escapeHtml(value) + '</button>';
        }).join('')
        + suggestSeen.map(function(value) {
          const added = caseTagSelHas(footSel, 'element', value);
          return '<button type="button" class="case-tag-ai-chip' + (added ? ' is-added' : '') + '" data-foot-ai-value="' + escapeAttr(value) + '">' + escapeHtml(value) + '</button>';
        }).join('')
        + '<div class="case-foot-ai-rerun-row"><button type="button" class="case-tag-ai-bulk" id="case-foot-ai-rerun" title="' + (zh() ? '再识一次：只补充上次没认出的标签' : 'Detect again: only adds previously missed tags') + '">↻ ' + (zh() ? '重新识别' : 'Re-detect') + '</button></div>';
      positionPop(suggestPop, aiBtn);
      suggestPop.addEventListener('click', function(event) {
        if (event.target.closest('#case-foot-ai-rerun')) { runAiSuggest(); return; }
        const themeChip = event.target.closest('[data-foot-ai-activity]');
        const elementChip = event.target.closest('[data-foot-ai-value]');
        const chip = themeChip || elementChip;
        if (!chip) return;
        const key = themeChip ? 'activity' : 'element';
        const value = themeChip ? themeChip.dataset.footAiActivity : elementChip.dataset.footAiValue;
        caseTagSelToggle(footSel, key, value);
        persistSelection().then(function() { renderSuggestPop(); }).catch(persistError);
      });
    };

    addBtn.addEventListener('click', function() { closeSuggest(); openEditor(); });
    aiBtn.addEventListener('click', function() { closeEditor(); if (suggestPop) { closeSuggest(); return; } runAiSuggest(); });
    const outsideHandler = function(event) {
      if (editorPop && !editorPop.contains(event.target) && !addBtn.contains(event.target)) closeEditor();
      if (suggestPop && !suggestPop.contains(event.target) && !aiBtn.contains(event.target)) closeSuggest();
    };
    document.addEventListener('click', outsideHandler, true);
    caseFootToolsCleanup = function() {
      closeEditor();
      closeSuggest();
      document.removeEventListener('click', outsideHandler, true);
    };
  }

  function closeCaseFootTagsPop() {
    document.querySelectorAll('.case-foot-tags-pop').forEach(function(node) { node.remove(); });
    document.querySelectorAll('.case-foot-tags.is-muted').forEach(function(node) { node.classList.remove('is-muted'); });
  }

  function populateFilterOptions() {
    Object.keys(FILTER_SECTIONS_CONFIG).forEach(function(sectionId) {
      var container = document.querySelector('[data-filter-options="' + sectionId + '"]');
      if (!container) return;
      var config = FILTER_SECTIONS_CONFIG[sectionId];
      var stateKey = FILTER_STATE_KEYS[sectionId];
      var selected = state.libraryFilters[stateKey] || [];
      var selectedAll = !selected.length;
      var html = '<button type="button" class="filter-capsule' + (selectedAll ? ' active' : '') + '" data-value="all">' + (state.lang === 'zh' ? '全部' : 'All') + '</button>';
      config.values.forEach(function(val) {
        var sel = selected.includes(val);
        html += '<button type="button" class="filter-capsule' + (sel ? ' active' : '') + '" data-value="' + val + '">' + escapeHtml(libraryDisplayLabel(val)) + '</button>';
      });
      container.innerHTML = html;
      container.querySelectorAll('.filter-capsule').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (btn.dataset.value === 'all') {
            container.querySelectorAll('.filter-capsule').forEach(function(b) { b.classList.toggle('active', b === btn); });
          } else {
            var allBtn = container.querySelector('.filter-capsule[data-value="all"]');
            if (allBtn) allBtn.classList.remove('active');
            btn.classList.toggle('active');
          }
          var activeButtons = container.querySelectorAll('.filter-capsule.active:not([data-value="all"])');
          state.libraryFilters[stateKey] = Array.from(activeButtons).map(function(b) { return b.dataset.value; });
          state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
          filterLibraryCardsInPlace();
          applyLibraryFilterExpansion();   // v843：新选中的筛选值补 AI 联想，回来后重筛
        });
      });
    });
    // 显示/隐藏：模版库不显示国家
    var countrySection = document.querySelector('[data-filter-section="country"]');
    if (countrySection) countrySection.style.display = state.libraryFilters.kind === 'template' ? 'none' : '';
  }

  function updateKindTabIndicator() {
    const tabs = document.querySelector('.library-kind-tabs');
    const indicator = tabs?.querySelector('.kind-tab-indicator');
    const active = tabs?.querySelector('[data-library-kind].active');
    if (!indicator || !active) {
      if (indicator) indicator.style.display = 'none';
      return;
    }
    const tabRect = active.getBoundingClientRect();
    const containerRect = tabs.getBoundingClientRect();
    indicator.style.display = 'block';
    indicator.style.left = (tabRect.left - containerRect.left) + 'px';
    indicator.style.width = tabRect.width + 'px';
  }

  function alignTagRows() {
    const tabs = document.querySelector('.library-kind-tabs');
    const tagRows = document.getElementById('library-tag-rows');
    if (!tabs || !tagRows) return;
    const tabRect = tabs.getBoundingClientRect();
    const tagRect = tagRows.getBoundingClientRect();
    const diff = Math.round(tabRect.left - tagRect.left);
    console.log('[align] tabLeft:', tabRect.left, 'tagLeft:', tagRect.left, 'diff:', diff);
    // 只允许把标签行往右对齐；负值会把标签行推出检索栏底板左侧，所以按 0 处理。
    if (diff > 0) {
      tagRows.style.paddingLeft = diff + 'px';
      console.log('[align] set paddingLeft to', diff);
    } else {
      tagRows.style.paddingLeft = '';
    }
  }

  function renderLibraryTagRows(kind) {
    if (!kind || kind === 'all') return '';
    var rows = libraryTagRows(kind);
    return rows.map(function(row, rowIdx) {
      // 计算父级已选标签（用于 tag2/tag3/tag4 计数过滤）
      var parentFilters = {};
      for (var pi = 0; pi < rowIdx; pi++) {
        var pkey = rows[pi].key;
        var pval = state.libraryFilters[pkey];
        if (pval && pval !== 'all') parentFilters[pkey] = pval;
      }
      // 案例库不显示「全部」chip（v709）：默认就是全部，再点已选标签即可取消筛选
      const values = kind === 'source' ? [...row.values] : ['all', ...row.values];
      return `
        <div class="library-tag-row">
          <div>
            ${values.map(value => {
              const label = value === 'all' ? (state.lang === 'zh' ? '全部' : 'All') : libraryDisplayLabel(value);
              const active = (state.libraryFilters[row.key] || 'all') === value;
              const count = value === 'all' ? countKindSources(kind, parentFilters) : countTagOccurrences(kind, value, parentFilters);
              return `<button type="button" class="${active ? 'active' : ''}" data-library-tag-key="${row.key}" data-library-tag-value="${escapeAttr(value)}">${escapeHtml(label)}<small> · ${isLibraryCountPending() ? '…' : count}</small></button>`;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function countKindSources(kind, parentFilters) {
    return visibleLibrarySourcesForSession().filter(function(source) {
      if (libraryKindOfSource(source) !== kind) return false;
      var tags = visibleLibraryTags(source);
      return Object.keys(parentFilters).every(function(k) {
        return !parentFilters[k] || parentFilters[k] === 'all' || tags.includes(parentFilters[k]);
      });
    }).length;
  }

  function countTagOccurrences(kind, tagValue, parentFilters) {
    var matchingSources = visibleLibrarySourcesForSession().filter(function(source) {
      if (libraryKindOfSource(source) !== kind) return false;
      var tags = visibleLibraryTags(source);
      var isProject = isCaseProject(source);
      var types = kind === 'source' ? caseMaterialTypeSet(tagValue) : null;
      var matchesTag;
      if (isProject) {
        matchesTag = types ? projectMatchesType(source, tagValue) : tags.includes(tagValue);
      } else {
        matchesTag = tags.includes(tagValue);
      }
      if (!matchesTag) return false;
      return Object.keys(parentFilters).every(function(k) {
        var pv = parentFilters[k];
        if (!pv || pv === 'all') return true;
        if (isProject) {
          if (kind === 'source' && caseMaterialTypeSet(pv)) return projectMatchesType(source, pv);
          return tags.includes(pv);
        }
        return tags.includes(pv);
      });
    });
    // 字体标签按「字体家族」统计，而非按每个字重的文件记录统计。
    if (kind === 'template' && tagValue === '字体') {
      return new Set(matchingSources.map(function(source) {
        return fontFamilyNameFromTitle(source.title).toLocaleLowerCase();
      })).size;
    }
    return matchingSources.length;
  }

  function libraryTagRows(kind) {
    const config = LIBRARY_TAGS[kind];
    if (!config) return [];
    const labels = state.lang === 'zh'
      ? { tag1: '标签一', tag2: '标签二', tag3: '标签三', tag4: '标签四' }
      : { tag1: 'Tag 1', tag2: 'Tag 2', tag3: 'Tag 3', tag4: 'Tag 4' };
    const rows = [];
    if (config.tag1) rows.push({ key: 'tag1', label: labels.tag1, values: config.tag1 });
    if (config.tag2) rows.push({ key: 'tag2', label: labels.tag2, values: config.tag2 });
    if (config.tag3) rows.push({ key: 'tag3', label: labels.tag3, values: config.tag3 });
    const tag1 = state.libraryFilters.tag1;
    const tag2 = state.libraryFilters.tag2;
    const tag3 = state.libraryFilters.tag3;
    if (kind === 'source') {
      const typeValues = tag1 && tag1 !== 'all' ? sourceTag2Values(tag1) : [];
      if (typeValues.length) rows.push({ key: 'tag2', label: labels.tag2, values: typeValues });
    } else if (config.tag2ByTag1?.[tag1]) {
      rows.push({ key: 'tag2', label: labels.tag2, values: config.tag2ByTag1[tag1] });
    }
    if (config.tag3ByTag2?.[tag2]) rows.push({ key: 'tag3', label: labels.tag3, values: config.tag3ByTag2[tag2] });
    if (config.tag4ByTag3?.[tag3]) rows.push({ key: 'tag4', label: labels.tag4, values: config.tag4ByTag3[tag3] });
    return rows;
  }

  // 预览行的小改动（物料类型、语言）都是「乐观更新」：界面上先变，请求还在路上。用户看一眼就刷新的话，
  // 这一刀就丢了 —— 刷新后又是旧值，看起来像「改了没用」。所以先落一份本机待写入清单（按 previewId
  // 合并成一次 patch），请求确认写进库了再删；下次进库时把没落地的补写回去。
  const PREVIEW_PENDING_KEY = 'vf:case-preview-pending:v1';
  const PREVIEW_PENDING_LEGACY_KEY = 'vf:case-type-pending:v1'; // v815 只存物料类型时的老 key
  function readPendingPreviewWrites() {
    const out = {};
    const absorb = function(key, legacy) {
      let raw = {};
      try { raw = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (_e) { return; }
      Object.keys(raw).forEach(function(id) {
        const entry = raw[id] || {};
        const patch = legacy ? { material_type: String(entry.type || '') } : Object.assign({}, entry.patch || {});
        if (!Object.keys(patch).length) return;
        const merged = Object.assign({}, (out[id] && out[id].patch) || {}, patch);
        out[id] = { patch: merged, at: Number(entry.at) || Date.now() };
      });
    };
    absorb(PREVIEW_PENDING_KEY, false);
    absorb(PREVIEW_PENDING_LEGACY_KEY, true);
    return out;
  }
  function writePendingPreviewWrites(map) {
    try {
      const keys = Object.keys(map);
      localStorage.removeItem(PREVIEW_PENDING_LEGACY_KEY);
      if (!keys.length) localStorage.removeItem(PREVIEW_PENDING_KEY);
      else localStorage.setItem(PREVIEW_PENDING_KEY, JSON.stringify(map));
    } catch (_e) {}
  }
  function queuePreviewWrite(previewId, patch) {
    if (!previewId || !patch || !Object.keys(patch).length) return;
    const map = readPendingPreviewWrites();
    const entry = map[previewId] || { patch: {}, at: Date.now() };
    entry.patch = Object.assign({}, entry.patch, patch);
    entry.at = Date.now();
    map[previewId] = entry;
    writePendingPreviewWrites(map);
  }
  function clearPreviewWrite(previewId) {
    const map = readPendingPreviewWrites();
    if (!(previewId in map)) return;
    delete map[previewId];
    writePendingPreviewWrites(map);
  }
  let previewWriteFlushPromise = null;
  // 补写本机待写入的改动：成功就删掉；写不进去（没权限/行已不在）留着重试，超过一天丢掉
  function flushPendingPreviewWrites() {
    if (previewWriteFlushPromise) return previewWriteFlushPromise;
    previewWriteFlushPromise = (async function() {
      const map = readPendingPreviewWrites();
      const ids = Object.keys(map);
      if (!ids.length || !state.supabase) return;
      const settled = {};
      for (const id of ids) {
        const entry = map[id] || {};
        const patch = Object.assign({}, entry.patch || {});
        if (typeof patch.language === 'string') patch.language = normalizePreviewLanguage(patch.language);
        try {
          const result = await state.supabase.from('vf_asset_previews')
            .update(patch).eq('id', id).select('id');
          if (result && result.error) throw result.error;
          const rows = Array.isArray(result && result.data) ? result.data : [];
          if (rows.length) { settled[id] = true; continue; }
          // 0 行＝这次修改没落到库里（多半是没权限改这条）：留着重试，过一天就放弃
          if (Date.now() - (entry.at || 0) > 24 * 60 * 60 * 1000) settled[id] = true;
        } catch (_error) { /* 断网/离线：留着下次再试 */ }
      }
      const left = {};
      Object.keys(map).forEach(function(id) { if (!settled[id]) left[id] = map[id]; });
      writePendingPreviewWrites(left);
      if (!Object.keys(left).length && Object.keys(settled).length) console.info('[vf] 已补写上次没落地的物料改动：' + Object.keys(settled).length + ' 条');
      // 内存里的预览记录也改过来，免得这次会话继续显示旧值
      Object.keys(settled).forEach(function(id) {
        const row = state.libraryPreviews.find(function(item) { return item.id === id; });
        if (row) Object.assign(row, map[id] && map[id].patch || {});
      });
    })();
    // 跑完就放开锁：同一会话里再进库还能把新攒下的待写入补一遍
    previewWriteFlushPromise.then(function() { previewWriteFlushPromise = null; }, function() { previewWriteFlushPromise = null; });
    return previewWriteFlushPromise;
  }

  async function loadLibraryData() {
    const status = document.getElementById('library-status');
    if (!state.localPreview && state.libraryDataLoaded) {
      // 先快速渲染内存数据，后台静默刷新 Supabase
      refreshLibraryLoadedUi();
      // 后台从 Supabase 拉最新数据合并（处理其他设备/用户的变更）
      setTimeout(async function() {
        try { state.libraryDataLoaded = false; await loadLibraryData(); } catch(e) {}
      }, 2000);
      return;
    }
    if (!state.localPreview && state.libraryDataPromise) {
      await state.libraryDataPromise;
      refreshLibraryLoadedUi();
      return;
    }
    try {
      if (state.localPreview || !state.supabase) {
        if (isLibraryCountPending()) setLibraryLoadingState(true, state.lang === 'zh' ? '正在读取旧平台恢复素材…' : 'Loading recovered platform assets…');
        const recovered = await loadRecoveredPlatformLibrary();
        if (!recovered) loadLocalLibraryDemo();
        return;
      }
      if (isLibraryCountPending()) setLibraryLoadingState(true, state.lang === 'zh' ? '正在读取分类和素材…' : 'Loading options and assets…');
      // 先把上一次「改了但请求没落地」的补上，再拉素材：这样刷新后看到的就是最新值
      await flushPendingPreviewWrites();
      state.libraryDataPromise = (async () => {
        await ensureCaseActivityOptions();
        // 分类、收藏和素材清单彼此独立，并行读取可显著缩短线上首屏等待。
        await Promise.all([
          loadLibraryOptions(),
          loadLibraryFavorites(),
          loadLibrarySources(),
          // 物料清单是识别的唯一依据：进库时拉一次，团队改了清单立刻反映到标签行与识别
          refreshMaterialCatalogForCases()
        ]);
        // source 到达后立即更新主分类及全部标签数字；预览图和书签封面
        // 可以继续在后台读取，不能让计数一直停留在初始的 0。
        refreshLibraryFilterCounts();
        await Promise.all([
          loadLibraryPreviews(),
          loadLibraryBookmarkGroups()
        ]);
        state.libraryDataLoaded = true;
      })();
      await state.libraryDataPromise;
      refreshLibraryLoadedUi();
    } catch (error) {
      if (!status) return;
      status.classList.remove('is-loading');
      status.innerHTML = `
        <strong>${state.lang === 'zh' ? '素材库还未就绪' : 'Library is not ready'}</strong>
        <p>${escapeHtml(error.message)}</p>
        <p class="muted">${state.lang === 'zh' ? '如果这是第一次打开 V2，需要先运行 sql/002_library_v2.sql。' : 'If this is the first V2 run, execute sql/002_library_v2.sql first.'}</p>
      `;
      document.getElementById('library-grid').innerHTML = '';
    } finally {
      state.libraryDataPromise = null;
    }
  }

  async function reloadLibraryData() {
    state.libraryDataLoaded = false;
    state.libraryDataPromise = null;
    state.libraryPreviewUrls = {};
    state.libraryPreviewUrlSignedAt = {};
    libraryPreviewImageNodeCache.clear();
    libraryUnavailableThumbnailPaths.clear();
    state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
    await loadLibraryData();
  }

  // case_activity 是 v738 新增的类型值：数据库约束（sql/017 放宽前仍拦 23514）不允许时
  // 整页退回 activity 存放，与 v736 行为一致；约束放宽后下一次加载自动改型。
  let caseActivityTypeReady = null;

  async function writeCaseActivityOptions(runWrite) {
    if (caseActivityTypeReady !== false) {
      const preferred = await runWrite(CASE_ACTIVITY_OPTION_TYPE);
      if (!preferred.error) { caseActivityTypeReady = true; return; }
      caseActivityTypeReady = false;
      console.warn('case_activity option type unavailable, falling back to activity:', preferred.error.message);
    }
    const fallback = await runWrite('activity');
    if (fallback.error) console.warn('activity options write failed:', fallback.error.message);
  }

  // 活动类型的选项必须和案例库标签面板的取值同源（FILTER_SECTIONS_CONFIG.activity）：
  // 面板里点得到、选项表里查不到 id 时，保存会把 activity_id 落成 null——「加了足球标签
  // 却不显示、搜不到」就是这么来的。这里只补缺，绝不删改已有选项（历史数据可能还引用着）；
  // 并把非通用三项的历史行改型到 case_activity，躲开正式站旧版的删除逻辑。
  async function ensureCaseActivityOptions() {
    if (!state.supabase) return;
    const { data, error } = await state.supabase
      .from('vf_library_options')
      .select('id,name_zh,option_type')
      .in('option_type', ['activity', CASE_ACTIVITY_OPTION_TYPE]);
    if (error) return;
    const legacyNames = new Set(CASE_ACTIVITY_LEGACY_NAMES);
    const toMigrate = (data || [])
      .filter(item => item.option_type === 'activity' && !legacyNames.has(String(item.name_zh)))
      .map(item => item.id);
    if (toMigrate.length) {
      await writeCaseActivityOptions(function(type) {
        return state.supabase.from('vf_library_options').update({ option_type: type }).in('id', toMigrate);
      });
    }
    const existingNames = new Set((data || []).map(o => String(o.name_zh)));
    const values = (FILTER_SECTIONS_CONFIG.activity && FILTER_SECTIONS_CONFIG.activity.values) || [];
    const toInsert = values
      .map(function(name, index) { return { name: name, order: (index + 1) * 10 }; })
      .filter(item => !existingNames.has(item.name));
    if (!toInsert.length) return;
    await writeCaseActivityOptions(function(type) {
      return state.supabase.from('vf_library_options').insert(toInsert.map(item => ({ option_type: type, name_zh: item.name, name_en: LIBRARY_LABELS_EN[item.name] || item.name, sort_order: item.order })));
    });
  }

  async function loadLibraryOptions() {
    const { data, error } = await state.supabase
      .from('vf_library_options')
      .select('id,option_type,name_en,name_zh,sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    state.libraryOptions = data || [];
  }

  async function loadLibraryFavorites() {
    const favs = [];
    let favFrom = 0;
    for (;;) {
      // v866：同样按页拉全，收藏数过千不再丢
      const { data, error } = await state.supabase
        .from('vf_asset_favorites')
        .select('preview_id')
        .order('preview_id', { ascending: true })
        .range(favFrom, favFrom + LIBRARY_PREVIEW_PAGE_SIZE - 1);
      if (error) throw error;
      const rows = data || [];
      favs.push(...rows);
      if (rows.length < LIBRARY_PREVIEW_PAGE_SIZE) break;
      favFrom += LIBRARY_PREVIEW_PAGE_SIZE;
    }
    state.libraryFavorites = new Set(favs.map(item => item.preview_id));
  }

  async function loadLibrarySources() {
    const sources = [];
    for (let from = 0; from < LIBRARY_SOURCE_MAX_ROWS; from += LIBRARY_SOURCE_PAGE_SIZE) {
      const buildQuery = full => {
        let q = state.supabase
          .from('vf_source_files')
          .select('id,title,country_id,activity_id,category_id,tags,visibility,source_path,source_filename,source_mime_type,source_size_bytes,source_ext,uploaded_by' + (full ? ',owner_name,owner_contact,project_note,download_link' : '') + ',created_at,updated_at')
          .order('updated_at', { ascending: false })
          .range(from, from + LIBRARY_SOURCE_PAGE_SIZE - 1);
        ['country', 'activity', 'category'].forEach(type => {
          const value = state.libraryFilters[type];
          if (value && value !== 'all') q = q.eq(`${type}_id`, value);
        });
        return q;
      };
      const { data, error } = await caseAwareQuery(buildQuery);
      if (error) throw translateCaseSchemaError(error);
      const batch = data || [];
      sources.push(...batch);
      if (batch.length < LIBRARY_SOURCE_PAGE_SIZE) break;
    }
    state.librarySources = sources;
  }

  async function loadLibraryPreviews() {
    if (state.librarySources.length === 0) {
      state.libraryPreviews = [];
      state.libraryItems = [];
      return;
    }
    const ids = state.librarySources.map(item => item.id);
    const previews = [];
    for (const idBatch of chunkArray(ids, SUPABASE_IN_BATCH_SIZE)) {
      // v866：接口单次最多回 1000 行，项目一多物料会被悄悄截断（弹窗显示「素材 13」其实有 40 张），
      // 追加物料后按单项目重拉才露出真实数量。改成按页拉全，页内加 id 做稳定排序防止翻页漏行/重行。
      let from = 0;
      for (;;) {
        const { data, error } = await previewAwareQuery((full) => state.supabase
          .from('vf_asset_previews')
          .select(previewSelectFields(full))
          .in('source_file_id', idBatch)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + LIBRARY_PREVIEW_PAGE_SIZE - 1));
        if (error) throw translateCaseSchemaError(error);
        const rows = data || [];
        previews.push(...rows);
        if (rows.length < LIBRARY_PREVIEW_PAGE_SIZE) break;
        from += LIBRARY_PREVIEW_PAGE_SIZE;
      }
    }
    // 字体本身没有位图预览时，也要在素材库中生成一个虚拟卡片预览。
    // 这样旧字体资产和新上传字体都能以字体卡片的方式出现。
    const previewedSourceIds = new Set(previews.map(item => item.source_file_id));
    state.librarySources.forEach(function(source) {
      const tags = visibleLibraryTags(source);
      if (tags.includes('组件') && tags.includes('字体') && !previewedSourceIds.has(source.id)) {
        previews.push({
          id: 'font-preview-' + source.id,
          source_file_id: source.id,
          preview_path: '', preview_filename: source.title + '.font-card',
          preview_mime_type: 'font/card', preview_size_bytes: 0,
          width: 960, height: 520, sort_order: 10, created_at: source.created_at || ''
        });
      }
      // 图片类模板没有预览记录时，用源文件自身当预览
      var isImageTemplate = tags.includes('vf:kind:template') && IMAGE_EXTENSIONS.includes(fileExt(source.source_filename || ''));
      if (isImageTemplate && !previewedSourceIds.has(source.id)) {
        previews.push({
          id: 'img-preview-' + source.id,
          source_file_id: source.id,
          preview_path: source.source_path || '',
          preview_filename: source.source_filename || '',
          preview_mime_type: source.source_mime_type || 'image/png',
          preview_size_bytes: source.source_size_bytes || 0,
          width: 0, height: 0, sort_order: 10, created_at: source.created_at || ''
        });
      }
    });
    const sourceOrder = new Map(state.librarySources.map((source, index) => [source.id, index]));
    state.libraryPreviews = previews.sort((a, b) => {
      const sourceDiff = (sourceOrder.get(a.source_file_id) ?? 999999) - (sourceOrder.get(b.source_file_id) ?? 999999);
      if (sourceDiff) return sourceDiff;
      const sortDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (sortDiff) return sortDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }

  async function loadLibraryBookmarkGroups() {
    const memberIds = new Set();
    const groups = [];
    const bookmarkSources = state.librarySources.filter(function(source) {
      return (source.tags || []).includes('模板书签');
    });
    // 书签快照原来逐个串行下载；线上有多个书签时会直接叠加网络往返时间。
    // 分批并行既缩短等待，也避免一次性向存储服务发出过多请求。
    for (const sourceBatch of chunkArray(bookmarkSources, 8)) {
      const batchGroups = await Promise.all(sourceBatch.map(async function(source) {
        try {
          const snapshot = await loadLibraryTemplateSnapshot({ source: source });
          return {
            source: source,
            refs: Array.isArray(snapshot?.templateRefs) ? snapshot.templateRefs : [],
            coverTemplateId: snapshot?.coverTemplateId || ''
          };
        } catch (_error) {
          // 单个书签快照读取失败不影响整体；跳过即可。
          return null;
        }
      }));
      batchGroups.filter(Boolean).forEach(function(group) {
        group.refs.forEach(function(ref) {
          const id = typeof ref === 'string' ? ref : ref?.templateId;
          if (id) memberIds.add(id);
        });
        groups.push(group);
      });
    }
    state.libraryBookmarkMemberIds = memberIds;
    state.libraryBookmarkGroups = groups;
  }

  function libraryBookmarkCoverPreview(sourceId) {
    const group = state.libraryBookmarkGroups.find(function(item) { return item.source.id === sourceId; });
    if (!group) return null;
    const memberIds = [];
    if (group.coverTemplateId) memberIds.push(group.coverTemplateId);
    (group.refs || []).forEach(function(ref) {
      const id = typeof ref === 'string' ? ref : ref?.templateId;
      if (id && !memberIds.includes(id)) memberIds.push(id);
    });
    for (const memberId of memberIds) {
      const preview = state.libraryPreviews.find(function(item) {
        return item.source_file_id === memberId && item.preview_path;
      });
      if (preview?.preview_path) return preview;
    }
    return null;
  }

  function libraryBookmarkCoverPreviewPath(sourceId) {
    return libraryBookmarkCoverPreview(sourceId)?.preview_path || '';
  }

  function rememberLibraryPreviewImageNode(image) {
    if (!image || !image.complete || !image.naturalWidth) return;
    const card = image.closest('.library-card[data-preview-id]');
    const previewId = card?.dataset.previewId || '';
    if (!previewId || !image.src) return;
    libraryPreviewImageNodeCache.delete(previewId);
    libraryPreviewImageNodeCache.set(previewId, image);
    while (libraryPreviewImageNodeCache.size > LIBRARY_PREVIEW_NODE_CACHE_LIMIT) {
      const oldestKey = libraryPreviewImageNodeCache.keys().next().value;
      if (!oldestKey) break;
      libraryPreviewImageNodeCache.delete(oldestKey);
    }
  }

  function rememberRenderedLibraryPreviewImages(grid) {
    if (!grid) return;
    grid.querySelectorAll('.library-card[data-preview-id] .library-thumb img').forEach(rememberLibraryPreviewImageNode);
  }

  function restoreRememberedLibraryPreviewImages(grid) {
    if (!grid || !libraryPreviewImageNodeCache.size) return;
    grid.querySelectorAll('.library-card[data-preview-id]').forEach(function(card) {
      const previewId = card.dataset.previewId || '';
      const cachedImage = libraryPreviewImageNodeCache.get(previewId);
      const nextImage = card.querySelector('.library-thumb img');
      if (!cachedImage || !nextImage || !cachedImage.complete || !cachedImage.naturalWidth) return;
      // URL 改变代表签名刷新、封面变化或显式重载，不能复用旧像素。
      if (!nextImage.src || cachedImage.src !== nextImage.src) {
        libraryPreviewImageNodeCache.delete(previewId);
        return;
      }
      const oldHost = cachedImage.closest('.library-thumb');
      const nextHost = nextImage.closest('.library-thumb');
      const rememberedRatio = oldHost?.style.getPropertyValue('--preview-ratio') || '';
      nextImage.parentNode.replaceChild(cachedImage, nextImage);
      cachedImage.classList.add('loaded', 'is-ready');
      if (nextHost) {
        nextHost.classList.add('library-preview-shell', 'img-loaded', 'is-preview-ready');
        nextHost.classList.remove('is-preview-loading', 'is-preview-error');
        if (rememberedRatio) nextHost.style.setProperty('--preview-ratio', rememberedRatio);
      }
      libraryPreviewImageNodeCache.delete(previewId);
      libraryPreviewImageNodeCache.set(previewId, cachedImage);
    });
  }

  // 签名地址跨刷新复用：一次 createSignedUrls 往返约 1 秒，封面必须等它回来才能开
  // 始下载；而且每次重签都换 token，浏览器把同一张封面当新资源整张重下。把 50 分钟
  // 内的地址存进 sessionStorage，刷新后直接可用（旧地址仍可 304 复用字节）。
  const LIBRARY_SIGNED_URL_CACHE_KEY = 'vf:library-signed-urls:v1';
  const LIBRARY_SIGNED_URL_CACHE_MAX = 600;

  function hydrateLibraryPreviewUrlCache() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(LIBRARY_SIGNED_URL_CACHE_KEY) || '{}');
      const refreshAfter = Date.now() - 50 * 60 * 1000;
      Object.keys(parsed).forEach(function(path) {
        const entry = parsed[path];
        const signedAt = Number((entry && entry.at) || 0);
        if (!entry || !entry.url || signedAt < refreshAfter) return;
        if (state.libraryPreviewUrls[path]) return;
        state.libraryPreviewUrls[path] = entry.url;
        state.libraryPreviewUrlSignedAt[path] = signedAt;
      });
    } catch (error) { /* 隐私模式或配额不可用：退回纯内存缓存 */ }
  }

  function persistLibraryPreviewUrlCache() {
    try {
      const entries = Object.keys(state.libraryPreviewUrls).map(function(path) {
        return [path, Number(state.libraryPreviewUrlSignedAt[path] || 0)];
      }).filter(function(pair) { return pair[1] > 0; });
      entries.sort(function(a, b) { return b[1] - a[1]; });
      const cache = {};
      entries.slice(0, LIBRARY_SIGNED_URL_CACHE_MAX).forEach(function(pair) {
        cache[pair[0]] = { url: state.libraryPreviewUrls[pair[0]], at: pair[1] };
      });
      sessionStorage.setItem(LIBRARY_SIGNED_URL_CACHE_KEY, JSON.stringify(cache));
    } catch (error) { /* 同上 */ }
  }

  async function signLibraryPreviewUrls(paths) {
    const refreshBefore = Date.now() - 50 * 60 * 1000;
    const requestedPaths = Array.from(new Set((paths || state.libraryPreviews.map(item => item.preview_path)).filter(Boolean)));
    const waits = new Set();
    const targetPaths = [];
    requestedPaths.forEach(function(path) {
      if (state.libraryPreviewUrls[path] && Number(state.libraryPreviewUrlSignedAt[path] || 0) >= refreshBefore) return;
      const pending = libraryPreviewSigningPromises.get(path);
      if (pending) waits.add(pending);
      else targetPaths.push(path);
    });
    chunkArray(targetPaths, SIGNED_URL_BATCH_SIZE).forEach(function(pathBatch) {
      const signingPromise = (async function() {
        const { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).createSignedUrls(pathBatch, 60 * 60);
        if (error) throw error;
        const signedAt = Date.now();
        (data || []).forEach(function(item) {
          if (item.path && item.signedUrl) {
            state.libraryPreviewUrls[item.path] = item.signedUrl;
            state.libraryPreviewUrlSignedAt[item.path] = signedAt;
          }
        });
      })().finally(function() {
        pathBatch.forEach(function(path) {
          if (libraryPreviewSigningPromises.get(path) === signingPromise) libraryPreviewSigningPromises.delete(path);
        });
      });
      pathBatch.forEach(function(path) { libraryPreviewSigningPromises.set(path, signingPromise); });
      waits.add(signingPromise);
    });
    if (waits.size) await Promise.all(Array.from(waits));
  }

  function clearLibraryImageLoadWatchdog(img) {
    const timer = img ? libraryImageLoadTimers.get(img) : 0;
    if (timer) clearTimeout(timer);
    if (img) libraryImageLoadTimers.delete(img);
  }

  function watchLibraryImageLoad(img, timeoutMs) {
    if (!img || !img.isConnected || !img.getAttribute('src')) return;
    // loading="lazy" 的屏外图片尚未被浏览器启动，不能将这段正常的等待
    // 误判为网络超时。进入视口附近后由 IntersectionObserver 启动看门狗。
    if ('IntersectionObserver' in window && img.classList.contains('lazy-img') && !img.classList.contains('observed')) return;
    clearLibraryImageLoadWatchdog(img);
    if (img.complete && img.naturalWidth) return;
    const timer = setTimeout(function() {
      libraryImageLoadTimers.delete(img);
      if (!img.isConnected || (img.complete && img.naturalWidth)) return;
      // GIF 动图（原图或 1/3 小动图）动辄几 MB 到十几 MB，正常下载也会超过
      // 12 秒；中途“恢复”会重签名并重启下载，还会把还在下载的小动图误判成
      // 不可用而退回十几 MB 的原图。GIF 第一次超时只追加一次长宽限。
      const stagePath = img.dataset.libraryImageStage === 'thumb'
        ? (img.dataset.thumbPath || '')
        : (img.dataset.previewPath || '');
      if (/\.gif(\?|$)/i.test(stagePath) && img.dataset.libraryImageGrace !== '1') {
        img.dataset.libraryImageGrace = '1';
        watchLibraryImageLoad(img, LIBRARY_GIF_IMAGE_LOAD_TIMEOUT_MS);
        return;
      }
      // Chromium 在网络或图片解码拥堵时不一定及时派发 error；主动进入
      // 缩略图→预览图→刷新签名地址的恢复链路，避免灰色占位永久停留。
      void recoverLibraryCardImage(img);
    }, Number(timeoutMs) || LIBRARY_IMAGE_LOAD_TIMEOUT_MS);
    libraryImageLoadTimers.set(img, timer);
  }

  async function signVisibleLibraryUrls(items) {
    if (state.localPreview || !state.supabase) return;
    var paths = [];
    items.forEach(function(item) {
      var src = (state.librarySources || []).find(function(s) { return s.id === item.preview.source_file_id; });
      var bookmarkCoverPath = src && isBookmarkSource(src) ? libraryBookmarkCoverPreviewPath(src.id) : '';
      var p = bookmarkCoverPath || item.preview.preview_path;
      if (p) paths.push(p);
      // 案例项目没有源文件，缩略图同样需要签名，否则网格/列表拿不到最后一帧
      var thumbPath = src ? libraryThumbnailPathForPreview(item.preview, src) : '';
      if (thumbPath && !libraryThumbUnavailable(thumbPath)) paths.push(thumbPath);
      // GIF 转出来的无声循环视频：静态位用的是它的 poster，视频本身要单独签名
      var gifVideo = src ? libraryGifVideoForPreview(item.preview, src) : null;
      if (gifVideo?.video) paths.push(gifVideo.video);
    });
    if (paths.length) {
      try {
        await signLibraryPreviewUrls(paths);
      } catch (error) {
        console.warn('Preview signing failed:', error);
      }
    }
    // 不管有没有新签名，都更新 DOM 里的图片 src，防止并发清缓存导致图片空白
    updateLibraryCardImages(items);
    // 签名刚下来的无声循环视频在这一轮补上地址
    scheduleAutoplayVideoSweep();
  }

  // 等小图签名最多等这么久：签名迟迟不来（文件缺失/签名接口挂了）就退回原图，别让封面一直空着
  const LIBRARY_THUMB_WAIT_MS = 8000;
  const libraryThumbWaitTimers = new Map();
  function scheduleLibraryThumbWaitEscape(img, item) {
    if (!img || libraryThumbWaitTimers.has(img)) return;
    const timer = setTimeout(function() {
      libraryThumbWaitTimers.delete(img);
      if (!img.isConnected) return;
      img.dataset.libraryThumbWaitDone = '1';
      updateLibraryCardImages([item]);
    }, LIBRARY_THUMB_WAIT_MS);
    libraryThumbWaitTimers.set(img, timer);
  }

  function updateLibraryCardImages(items) {
    var grid = document.getElementById('library-grid');
    if (!grid) return;
    var thumbCount = 0;
    items.forEach(function(item) {
      var card = grid.querySelector('.library-card[data-preview-id="' + item.preview.id + '"]');
      if (!card) return;
      var img = card.querySelector('.library-thumb img');
      if (!img) return;
      var src = (state.librarySources || []).find(function(s) { return s.id === item.preview.source_file_id; });
      var bookmarkCoverPath = src && isBookmarkSource(src) ? libraryBookmarkCoverPreviewPath(src.id) : '';
      var displayPreviewPath = bookmarkCoverPath || item.preview.preview_path || '';
      var fullUrl = state.libraryPreviewUrls[displayPreviewPath] || '';
      var thumbPath = libraryThumbnailPathForPreview(item.preview, src);
      const imageIdentityChanged = img.dataset.previewPath !== displayPreviewPath || img.dataset.thumbPath !== thumbPath;
      const thumbUsable = !!thumbPath && !libraryThumbUnavailable(thumbPath);
      var thumbUrl = thumbUsable ? state.libraryPreviewUrls[thumbPath] || '' : '';
      // 只有缩略图确实加载失败过才停留在完整预览图；「还没签好名」不算失败，
      // 签名下来后仍要切回缩略图（之前用 stage 判断，卡一次就再也回不去了）。
      const keepFullFallback = !imageIdentityChanged && img.dataset.libraryThumbFailed === '1';
      // GIF 的原图动辄几 MB 到十几 MB：小图地址还没签好时先空着等签名，
      // 不要让封面先跑起来一个原图下载；超时兜底另见 scheduleLibraryThumbWaitEscape。
      const waitForThumb = !keepFullFallback && thumbUsable && !thumbUrl
        && !img.dataset.libraryThumbWaitDone && isCaseGifPreview(item.preview);
      var newUrl = (!keepFullFallback && thumbUrl) || (waitForThumb ? '' : fullUrl);
      if (imageIdentityChanged) delete img.dataset.libraryThumbFailed;
      if (waitForThumb) scheduleLibraryThumbWaitEscape(img, item);
      img.dataset.previewPath = displayPreviewPath;
      img.dataset.thumbPath = thumbPath;
      img.dataset.libraryImageStage = (!keepFullFallback && thumbUrl) ? 'thumb' : 'full';
      if (imageIdentityChanged || !img.dataset.libraryImageRetries) {
        img.dataset.libraryImageRetries = '0';
        img.dataset.libraryThumbRetries = '0';
        delete img.dataset.libraryImageGrace;
      }
      img.onload = function() {
        clearLibraryImageLoadWatchdog(this);
        this.classList.add('loaded');
        // 成功一次即归还重试预算：长开页面里签名过期后的下次失败仍有一次重试。
        delete this.dataset.libraryThumbRetries;
        var t = this.closest('.library-thumb');
        if (t) {
          t.classList.add('img-loaded');
          t.classList.remove('is-preview-error');
        }
        rememberLibraryPreviewImageNode(this);
        queueLibraryThumbnailBackfill(item, this);
      };
      img.onerror = function() {
        clearLibraryImageLoadWatchdog(this);
        void recoverLibraryCardImage(this);
      };
      if (newUrl && img.src !== newUrl) {
        img.classList.remove('loaded');
        var thumb = img.closest('.library-thumb');
        if (thumb) thumb.classList.remove('img-loaded');
        img.src = newUrl;
        watchLibraryImageLoad(img);
        if (thumbUrl && fullUrl) thumbCount++;
      } else if (newUrl && img.complete && img.naturalWidth === 0) {
        void recoverLibraryCardImage(img);
      } else if (newUrl && !img.complete) {
        watchLibraryImageLoad(img);
      }
      if (newUrl && img.complete && img.naturalWidth) queueLibraryThumbnailBackfill(item, img);
    });
    console.log('[缩略图] ' + thumbCount + ' 张缩略图, ' + (items.length - thumbCount) + ' 张原图（无缩略图文件）');
    // 同步更新 state.libraryItems 里的 url，供详情弹窗等使用
    if (state.libraryItems) {
      state.libraryItems.forEach(function(libItem) {
        var s = (state.librarySources || []).find(function(s) { return s.id === libItem.preview.source_file_id; });
        var bp = s && isBookmarkSource(s) ? libraryBookmarkCoverPreviewPath(s.id) : '';
        var pp = bp || libItem.preview.preview_path || '';
        libItem.url = state.libraryPreviewUrls[pp] || libItem.url;
        var tp = libraryThumbnailPathForPreview(libItem.preview, s);
        libItem.thumbUrl = state.libraryPreviewUrls[tp] || libItem.thumbUrl;
      });
    }
  }

  function canBackfillLibraryThumbnail(source) {
    if (!source || state.localPreview || !state.supabase || !state.session?.user?.id) return false;
    return currentRole() === 'admin' || source.uploaded_by === state.session.user.id;
  }

  function libraryGifVideoTarget(preview) {
    const paths = libraryGifVideoPaths(preview);
    if (!paths) return null;
    return {
      key: 'gif-video:' + preview.id,
      kind: 'gif-video',
      path: paths.video,
      posterPath: paths.poster,
      marker: libraryGifVideoMarker(preview.id),
      scope: 'preview'
    };
  }

  function libraryGifSmallTarget(preview, knownPath) {
    return {
      key: 'gif-small:' + preview.id,
      kind: 'gif-small',
      path: knownPath || preview.preview_path.replace(/\/[^/]+$/, '/_small-' + preview.id + '.gif'),
      marker: libraryGifSmallMarker(preview.id),
      scope: 'preview'
    };
  }

  function libraryThumbnailBackfillTarget(item) {
    const source = item?.source;
    const preview = item?.preview;
    if (!source || !preview?.id || !preview.preview_path || isBookmarkSource(source) || !canBackfillLibraryThumbnail(source)) return null;
    // GIF 的目标是无声循环视频，和静态缩略图互不影响：即使已经有 1/3 小动图，
    // 也要把它升级成视频，所以这一支排在下面的“已有可用缩略图”判断之前。
    if (isCaseGifPreview(preview)) {
      if (libraryGifVideoForPreview(preview, source)) return null;
      // 本会话已确认转不了视频：退回原来的 1/3 小动图兜底
      if (libraryGifVideoUnavailablePreviewIds.has(preview.id)) {
        if (libraryGifSmallReady(preview, source)) return null;
        return libraryGifSmallTarget(preview, libraryThumbnailPathForPreview(preview, source));
      }
      return libraryGifVideoTarget(preview);
    }
    const knownPath = libraryThumbnailPathForPreview(preview, source);
    // 已经有可用缩略图时不做任何后台工作；只修复本会话已确认丢失的旧路径。
    if (knownPath && !libraryThumbUnavailable(knownPath)) return null;
    const kind = libraryKindOfSource(source);
    if (kind === 'gallery' || kind === 'template') {
      if (!source.source_path) return null;
      return {
        key: 'source:' + source.id,
        path: knownPath || source.source_path.replace(/\/[^/]+$/, '/_thumb.jpg'),
        marker: LIBRARY_THUMBNAIL_TAG,
        scope: 'source'
      };
    }
    return {
      key: 'preview:' + preview.id,
      path: knownPath || preview.preview_path.replace(/\/[^/]+$/, '/_thumb-' + preview.id + '.jpg'),
      marker: LIBRARY_PREVIEW_THUMBNAILS_TAG,
      scope: 'preview'
    };
  }

  function queueLibraryThumbnailBackfill(item, image) {
    if (!image || image.dataset.libraryImageStage !== 'full' || !image.complete || !image.naturalWidth || !image.naturalHeight) return;
    const target = libraryThumbnailBackfillTarget(item);
    if (!target || !target.path || libraryThumbnailBackfillQueued.has(target.key)) return;
    libraryThumbnailBackfillQueued.add(target.key);
    libraryThumbnailBackfillQueue.push({ item: item, image: image, target: target });
    scheduleLibraryThumbnailBackfill();
  }

  function libraryGifSmallMarker(previewId) {
    return LIBRARY_GIF_SMALL_TAG_PREFIX + previewId;
  }

  function libraryGifVideoMarker(previewId) {
    return LIBRARY_GIF_VIDEO_TAG_PREFIX + previewId;
  }

  function libraryGifVideoPaths(preview) {
    if (!preview?.id || !preview.preview_path) return null;
    const base = preview.preview_path.replace(/\/[^/]+$/, '/');
    return {
      video: base + '_small-' + preview.id + '.mp4',
      poster: base + '_poster-' + preview.id + '.jpg'
    };
  }

  // 无声循环视频的可用产物：内存里刚转好的优先，其次看数据库标记（换页/换设备也认）
  function libraryGifVideoForPreview(preview, source) {
    if (!isCaseGifPreview(preview)) return null;
    const generated = preview?.id ? libraryGeneratedGifVideoPathsByPreviewId.get(preview.id) : null;
    if (generated) return generated;
    const tags = Array.isArray(source?.tags) ? source.tags : [];
    if (!preview?.id || !tags.includes(libraryGifVideoMarker(preview.id))) return null;
    return libraryGifVideoPaths(preview);
  }

  function libraryGifSmallReady(preview, source) {
    if (preview?.id && libraryGeneratedThumbnailPathsByPreviewId.has(preview.id)) return true;
    const tags = Array.isArray(source?.tags) ? source.tags : [];
    return !!preview?.id && tags.includes(libraryGifSmallMarker(preview.id));
  }

  // 案例项目的非封面 GIF 物料不经过网格卡片的图片事件；在悬停浮层/物料栏
  // 渲染它们时单独入队，让所有物料都能用上转码后的产物。
  function queueGifSmallPreviewBackfill(preview, source) {
    if (!preview?.id || !preview.preview_path || !isCaseGifPreview(preview)) return;
    if (!canBackfillLibraryThumbnail(source)) return;
    if (libraryGifVideoForPreview(preview, source)) return;
    const target = libraryGifVideoUnavailablePreviewIds.has(preview.id)
      ? (libraryGifSmallReady(preview, source) ? null : libraryGifSmallTarget(preview, ''))
      : libraryGifVideoTarget(preview);
    if (!target || libraryThumbnailBackfillQueued.has(target.key)) return;
    libraryThumbnailBackfillQueued.add(target.key);
    libraryThumbnailBackfillQueue.push({
      item: { source: source, preview: preview },
      image: null,
      target: target
    });
    scheduleLibraryThumbnailBackfill();
  }

  function scheduleLibraryThumbnailBackfill() {
    if (libraryThumbnailBackfillActive || libraryThumbnailBackfillTimer || !libraryThumbnailBackfillQueue.length) return;
    // 自动补缩略图属于低优先级维护任务。离开素材库后暂停，避免后台解码
    // 大图和 Canvas 编码与 DIY 导出、页面刷新争抢同一个渲染进程。
    if (state.route !== 'library' || document.visibilityState !== 'visible') return;
    const run = function() {
      libraryThumbnailBackfillTimer = 0;
      if (state.route !== 'library' || document.visibilityState !== 'visible') return;
      void runNextLibraryThumbnailBackfill();
    };
    if (typeof window.requestIdleCallback === 'function') {
      libraryThumbnailBackfillTimer = window.requestIdleCallback(run, { timeout: 5000 });
    } else {
      libraryThumbnailBackfillTimer = window.setTimeout(run, LIBRARY_THUMBNAIL_BACKFILL_DELAY_MS);
    }
  }

  function thumbnailBlobFromLoadedImage(image) {
    return new Promise(function(resolve, reject) {
      try {
        const naturalWidth = Number(image?.naturalWidth || 0);
        const naturalHeight = Number(image?.naturalHeight || 0);
        if (!naturalWidth || !naturalHeight) return resolve(null);
        const ratio = Math.min(1, LIBRARY_THUMBNAIL_BACKFILL_WIDTH / naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(naturalHeight * ratio));
        const context = canvas.getContext('2d');
        if (!context) return resolve(null);
        fillCanvasWhite(context, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) { resolve(blob || null); }, 'image/jpeg', 0.7);
      } catch (error) {
        // 旧页面缓存中未以 CORS 模式加载的图片可能会污染 canvas；
        // 这只是后台优化，不应影响用户已看到的原图。
        reject(error);
      }
    });
  }

  let gifEncoderScriptPromise = null;

  function loadGifEncoderScript() {
    if (window.GIF) return Promise.resolve(window.GIF);
    if (!gifEncoderScriptPromise) {
      gifEncoderScriptPromise = new Promise(function(resolve, reject) {
        const script = document.createElement('script');
        script.src = 'vendor/gif.js?v=' + encodeURIComponent(TOOL_UI_VERSION);
        script.onload = function() { window.GIF ? resolve(window.GIF) : reject(new Error('GIF encoder unavailable')); };
        script.onerror = function() { gifEncoderScriptPromise = null; reject(new Error('GIF encoder failed to load')); };
        document.head.appendChild(script);
      });
    }
    return gifEncoderScriptPromise;
  }

  // 把 GIF 原图按 1/3 边长（约 1/9 像素）转成小动图，供封面优先加载；
  // 只处理明显偏大的文件，其余情况返回 null，展示层继续用原图。
  async function transcodeGifSmallFromUrl(url) {
    if (!url || typeof window.ImageDecoder !== 'function') return null;
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('GIF source fetch failed: ' + response.status);
    const sourceBlob = await response.blob();
    if (sourceBlob.size <= LIBRARY_GIF_SMALL_MIN_BYTES) return null;
    const decoder = new ImageDecoder({ data: await sourceBlob.arrayBuffer(), type: 'image/gif' });
    try {
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      if (!track || !track.animated || !track.frameCount) return null;
      const firstFrame = await decoder.decode({ frameIndex: 0 });
      const sourceWidth = firstFrame.image.displayWidth;
      const sourceHeight = firstFrame.image.displayHeight;
      const sourceDelayMs = Math.max(20, Math.round((firstFrame.image.duration || 0) / 1000) || 40);
      firstFrame.image.close();
      const targetWidth = Math.max(1, Math.round(sourceWidth / 3));
      const targetHeight = Math.max(1, Math.round(sourceHeight / 3));
      if (Math.min(targetWidth, targetHeight) < LIBRARY_GIF_SMALL_MIN_EDGE) return null;
      const fpsStep = Math.max(1, Math.ceil((1000 / sourceDelayMs) / LIBRARY_GIF_SMALL_MAX_FPS));
      const frameStep = Math.max(fpsStep, Math.ceil(track.frameCount / LIBRARY_GIF_SMALL_MAX_FRAMES));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return null;
      const GIF = await loadGifEncoderScript();
      const encoder = new GIF({
        workers: Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1)),
        quality: 10,
        width: targetWidth,
        height: targetHeight,
        repeat: 0,
        workerScript: 'vendor/gif.worker.js?v=' + encodeURIComponent(TOOL_UI_VERSION)
      });
      for (let frameIndex = 0; frameIndex < track.frameCount; frameIndex += frameStep) {
        const frame = await decoder.decode({ frameIndex: frameIndex });
        const frameDelayMs = Math.round((frame.image.duration || 0) / 1000) * frameStep;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, targetWidth, targetHeight);
        context.drawImage(frame.image, 0, 0, targetWidth, targetHeight);
        frame.image.close();
        encoder.addFrame(context.getImageData(0, 0, targetWidth, targetHeight), {
          delay: Math.min(1000, Math.max(20, frameDelayMs || 40))
        });
      }
      return await new Promise(function(resolve, reject) {
        const timer = setTimeout(function() { reject(new Error('GIF encode timeout')); }, 180000);
        encoder.on('finished', function(blob) { clearTimeout(timer); resolve(blob || null); });
        encoder.render();
      });
    } finally {
      try { decoder.close(); } catch (decoderError) { /* 已关闭 */ }
    }
  }

  let mediabunnyModulePromise = null;

  function loadMediabunnyModule() {
    // 只有在真的要转码时才拉这个库：动态 import 独立文件，完全不影响首屏
    if (!mediabunnyModulePromise) {
      // 经典脚本里的动态 import 只认绝对地址或 ./ ../ 开头的写法，
      // 'vendor/...' 会被当成裸模块名而解析失败，必须先拼成绝对 URL。
      const moduleUrl = new URL('vendor/mediabunny.min.mjs?v=' + encodeURIComponent(TOOL_UI_VERSION), document.baseURI);
      mediabunnyModulePromise = import(moduleUrl.href)
        .catch(function(error) {
          mediabunnyModulePromise = null;
          throw error;
        });
    }
    return mediabunnyModulePromise;
  }

  function gifPosterBlobFromFrame(image, sourceWidth, sourceHeight) {
    return new Promise(function(resolve) {
      try {
        const ratio = Math.min(1, LIBRARY_THUMBNAIL_BACKFILL_WIDTH / sourceWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sourceWidth * ratio));
        canvas.height = Math.max(1, Math.round(sourceHeight * ratio));
        const context = canvas.getContext('2d');
        if (!context) return resolve(null);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) { resolve(blob || null); }, 'image/jpeg', 0.72);
      } catch (error) {
        resolve(null);
      }
    });
  }

  // GIF 转无声循环视频（H.264/MP4）：同样的画面，MP4 的体积只有 GIF 的零头，
  // 顺带导出首帧 poster 供视频就位前占位。转不了（浏览器不支持/编码失败）返回 null，
  // 调用方继续用原来的 1/3 小动图。
  async function transcodeGifVideoFromUrl(url) {
    if (!url || typeof window.ImageDecoder !== 'function' || typeof window.VideoEncoder !== 'function') return null;
    // 先确认这台浏览器能编 H.264，再下载源码：原图动辄十几 MB，
    // 编不了就没必要先把它拉一遍。getFirstEncodableVideoCodec 返回 Promise。
    const mediabunny = await loadMediabunnyModule();
    if (await mediabunny.getFirstEncodableVideoCodec([LIBRARY_GIF_VIDEO_CODEC]) !== LIBRARY_GIF_VIDEO_CODEC) return null;
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('GIF source fetch failed: ' + response.status);
    const sourceBlob = await response.blob();
    if (sourceBlob.size <= LIBRARY_GIF_SMALL_MIN_BYTES) return null;
    const decoder = new ImageDecoder({ data: await sourceBlob.arrayBuffer(), type: 'image/gif' });
    try {
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      if (!track || !track.animated || !track.frameCount) return null;
      const firstFrame = await decoder.decode({ frameIndex: 0 });
      const sourceWidth = firstFrame.image.displayWidth;
      const sourceHeight = firstFrame.image.displayHeight;
      const sourceDelayMs = Math.max(20, Math.round((firstFrame.image.duration || 0) / 1000) || 40);
      // H.264 要求偶数边长
      const targetWidth = Math.max(2, Math.round(sourceWidth / 3 / 2) * 2);
      const targetHeight = Math.max(2, Math.round(sourceHeight / 3 / 2) * 2);
      if (Math.min(targetWidth, targetHeight) < LIBRARY_GIF_SMALL_MIN_EDGE) {
        firstFrame.image.close();
        return null;
      }
      const poster = await gifPosterBlobFromFrame(firstFrame.image, sourceWidth, sourceHeight);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        firstFrame.image.close();
        return null;
      }
      // 首帧既进 poster 也进视频第 0 帧
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.drawImage(firstFrame.image, 0, 0, targetWidth, targetHeight);
      firstFrame.image.close();
      const fpsStep = Math.max(1, Math.ceil((1000 / sourceDelayMs) / LIBRARY_GIF_SMALL_MAX_FPS));
      const frameStep = Math.max(fpsStep, Math.ceil(track.frameCount / LIBRARY_GIF_SMALL_MAX_FRAMES));
      const frameRate = Math.max(1, Math.round((1000 / (sourceDelayMs * frameStep)) * 100) / 100);
      const bitrate = Math.min(LIBRARY_GIF_VIDEO_MAX_BITRATE, Math.max(LIBRARY_GIF_VIDEO_MIN_BITRATE,
        Math.round(targetWidth * targetHeight * frameRate * LIBRARY_GIF_VIDEO_BITS_PER_PIXEL)));
      const target = new mediabunny.BufferTarget();
      const output = new mediabunny.Output({ format: new mediabunny.Mp4OutputFormat(), target: target });
      const videoSource = new mediabunny.CanvasSource(canvas, {
        codec: LIBRARY_GIF_VIDEO_CODEC,
        quality: new mediabunny.Quality({ bitrate: bitrate }),
        keyFrameInterval: 2
      });
      output.addVideoTrack(videoSource, { frameRate: frameRate });
      await output.start();
      const deadline = Date.now() + 300000;
      const firstDelayMs = Math.max(20, sourceDelayMs * frameStep);
      let timestamp = 0;
      await videoSource.add(timestamp, firstDelayMs / 1000);
      timestamp += firstDelayMs / 1000;
      for (let frameIndex = frameStep; frameIndex < track.frameCount; frameIndex += frameStep) {
        if (Date.now() > deadline) throw new Error('GIF video encode timeout');
        const frame = await decoder.decode({ frameIndex: frameIndex });
        const frameDelayMs = Math.max(20, Math.round((frame.image.duration || 0) / 1000) * frameStep || firstDelayMs);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, targetWidth, targetHeight);
        context.drawImage(frame.image, 0, 0, targetWidth, targetHeight);
        frame.image.close();
        await videoSource.add(timestamp, frameDelayMs / 1000);
        timestamp += frameDelayMs / 1000;
      }
      videoSource.close();
      await output.finalize();
      const buffer = target.buffer;
      if (!buffer || !buffer.byteLength) return null;
      return { video: new Blob([buffer], { type: 'video/mp4' }), poster: poster };
    } finally {
      try { decoder.close(); } catch (decoderError) { /* 已关闭 */ }
    }
  }

  // 写标记前先读库里的最新 tags 再合并：排队/上传期间用户可能改过标签，
  // 拿旧引用整组写回会把编辑结果抹掉（「改了标签刷新又复原」）。
  async function mergeSourceTagsMarker(source, marker) {
    const fresh = await state.supabase.from('vf_source_files').select('tags').eq('id', source.id).maybeSingle();
    if (fresh.error) throw fresh.error;
    if (!fresh.data) return false;
    const current = Array.isArray(fresh.data.tags) ? fresh.data.tags : [];
    source.tags = current;
    if (current.includes(marker)) return false;
    const nextTags = Array.from(new Set([...current, marker]));
    const update = await state.supabase.from('vf_source_files').update({ tags: nextTags }).eq('id', source.id);
    if (update.error) throw update.error;
    source.tags = nextTags;
    return true;
  }

  async function markLibraryThumbnailBackfill(item, target) {
    const source = item.source;
    const preview = item.preview;
    const isGifProduct = target.kind === 'gif-small' || target.kind === 'gif-video';
    if (target.scope === 'source') libraryGeneratedThumbnailPathsBySourceId.set(source.id, target.path);
    else if (target.kind === 'gif-video') libraryGeneratedGifVideoPathsByPreviewId.set(preview.id, { video: target.path, poster: target.posterPath || '' });
    else libraryGeneratedThumbnailPathsByPreviewId.set(preview.id, target.path);
    const freshPaths = [target.path, target.posterPath].filter(Boolean);
    freshPaths.forEach(function(path) {
      libraryUnavailableThumbnailPaths.delete(path);
      delete state.libraryPreviewUrls[path];
      delete state.libraryPreviewUrlSignedAt[path];
    });
    try {
      await signLibraryPreviewUrls(freshPaths);
    } catch (signError) {
      console.warn('Generated thumbnail signing failed:', target.path, signError);
    }

    const tags = Array.isArray(source.tags) ? source.tags : [];
    if (tags.includes(target.marker)) return;
    // GIF 的产物（1/3 小动图 / 无声循环视频）是单张预览独立的，
    // 不参与“全部预览都生成后才标记”的聚合门限。
    if (target.scope === 'preview' && !isGifProduct) {
      const sourcePreviews = state.libraryPreviews.filter(function(candidate) { return candidate.source_file_id === source.id; });
      const allGenerated = sourcePreviews.length > 0 && sourcePreviews.every(function(candidate) {
        return libraryGeneratedThumbnailPathsByPreviewId.has(candidate.id);
      });
      // 案例可能有多张预览图；全部生成后才写入“均有小图”标记，
      // 避免下次打开去请求尚未存在的其他缩略图。
      if (!allGenerated) return;
    }
    await mergeSourceTagsMarker(source, target.marker);
  }
  async function uploadLibraryBackfillBlob(path, blob, contentType) {
    const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(path, blob, { upsert: true, contentType: contentType });
    if (upload.error) throw upload.error;
  }

  // GIF 按 URL 重新拉取源文件（走 HTTP 缓存）：原图是跨域加载的，
  // 不能复用页面里已加载的 <img>（会污染画布）。
  function libraryBackfillSourceUrl(task) {
    return task.image
      ? (task.image.currentSrc || task.image.src)
      : (state.libraryPreviewUrls[task.item.preview.preview_path] || '');
  }

  // 空闲回调可能在预览地址签名完成之前就触发；缺地址只是"还没轮到"，
  // 不是"这个浏览器转不了"，所以这里按需补签一次，拿不到就交给调度器重排。
  async function ensureLibraryBackfillSourceUrl(task) {
    const ready = libraryBackfillSourceUrl(task);
    if (ready) return ready;
    const previewPath = task.item?.preview?.preview_path;
    if (!previewPath || state.localPreview || !state.supabase) return '';
    try {
      await signLibraryPreviewUrls([previewPath]);
    } catch (error) {
      console.warn('素材地址签名失败:', previewPath, error);
    }
    return libraryBackfillSourceUrl(task);
  }

  // 有限次重排：网络抖动或地址未就绪不该让这张 GIF 在本会话里被判死刑
  function requeueLibraryBackfillTask(task) {
    const attempts = Number(task.sourceRetries || 0) + 1;
    if (attempts > LIBRARY_GIF_BACKFILL_MAX_ATTEMPTS) {
      libraryThumbnailBackfillQueued.delete(task.target.key);
      return;
    }
    task.sourceRetries = attempts;
    libraryThumbnailBackfillQueue.push(task);
    scheduleLibraryThumbnailBackfill();
  }

  async function runGifSmallBackfill(item, target, sourceUrl) {
    const blob = await transcodeGifSmallFromUrl(sourceUrl);
    if (!blob) return;
    await uploadLibraryBackfillBlob(target.path, blob, 'image/gif');
    await markLibraryThumbnailBackfill(item, target);
    console.log('[缩略图] 已自动回填:', target.path, Math.round(blob.size / 1024) + 'KB');
  }

  // 返回 false 表示这次只是没成（下载/解码中断），调用方重排；true 表示已定论
  async function runGifVideoBackfill(task, sourceUrl) {
    const preview = task.item.preview;
    const source = task.item.source;
    let produced = null;
    try {
      produced = await transcodeGifVideoFromUrl(sourceUrl);
    } catch (error) {
      console.warn('GIF 视频转码待重试:', preview.preview_path, error);
      return false;
    }
    if (!produced) {
      // 这台浏览器确实转不了视频：改回原来的 1/3 小动图，别让 GIF 一直用原图
      libraryGifVideoUnavailablePreviewIds.add(preview.id);
      if (!libraryGifSmallReady(preview, source)) await runGifSmallBackfill(task.item, libraryGifSmallTarget(preview, ''), sourceUrl);
      return true;
    }
    await uploadLibraryBackfillBlob(task.target.path, produced.video, 'video/mp4');
    if (produced.poster && task.target.posterPath) {
      await uploadLibraryBackfillBlob(task.target.posterPath, produced.poster, 'image/jpeg');
    }
    await markLibraryThumbnailBackfill(task.item, task.target);
    console.log('[缩略图] 已自动回填无声循环视频:', task.target.path, Math.round(produced.video.size / 1024) + 'KB');
    // 产物刚就绪：让卡片立刻换成 poster + 无声循环视频，不用等下次重渲染
    if (state.route === 'library') renderLibraryGrid();
    return true;
  }

  async function runNextLibraryThumbnailBackfill() {
    if (libraryThumbnailBackfillActive || !libraryThumbnailBackfillQueue.length) return;
    if (state.route !== 'library' || document.visibilityState !== 'visible') return;
    libraryThumbnailBackfillActive = true;
    const task = libraryThumbnailBackfillQueue.shift();
    try {
      if (!canBackfillLibraryThumbnail(task.item.source)) return;
      const isGifProduct = task.target.kind === 'gif-video' || task.target.kind === 'gif-small';
      if (isGifProduct) {
        const sourceUrl = await ensureLibraryBackfillSourceUrl(task);
        if (!sourceUrl) {
          requeueLibraryBackfillTask(task);
          return;
        }
        if (task.target.kind === 'gif-video') {
          if (!(await runGifVideoBackfill(task, sourceUrl))) requeueLibraryBackfillTask(task);
        } else {
          await runGifSmallBackfill(task.item, task.target, sourceUrl);
        }
        return;
      }
      const blob = await thumbnailBlobFromLoadedImage(task.image);
      if (!blob) return;
      await uploadLibraryBackfillBlob(task.target.path, blob, 'image/jpeg');
      await markLibraryThumbnailBackfill(task.item, task.target);
      console.log('[缩略图] 已自动回填:', task.target.path, Math.round(blob.size / 1024) + 'KB');
    } catch (error) {
      console.warn('Automatic thumbnail backfill skipped:', task.target.path, error);
    } finally {
      libraryThumbnailBackfillActive = false;
      scheduleLibraryThumbnailBackfill();
    }
  }

  async function recoverLibraryCardImage(img) {
    if (!img || !img.isConnected) return;
    if (img.dataset.libraryImageRecovering === '1') return;
    clearLibraryImageLoadWatchdog(img);
    // 还没签名时 src 是空串：浏览器会拿它当页面地址去请求并立即报 error，
    // 这只是「暂时没地址」，按加载失败处理会立刻把封面打回原图。
    if (!img.getAttribute('src')) return;
    const previewPath = img.dataset.previewPath || '';
    const thumbPath = img.dataset.thumbPath || '';
    const stage = img.dataset.libraryImageStage || 'full';
    const fullUrl = previewPath ? state.libraryPreviewUrls[previewPath] || '' : '';
    if (stage === 'thumb' && fullUrl) {
      const thumbRetries = Number(img.dataset.libraryThumbRetries || 0);
      // 缩略图失败多半只是网络抖动或带宽被大文件挤占：先重签地址重试一次，
      // 仍失败才退回原图；否则一次失败就逼封面去下几 MB 到十几 MB 的原图。
      if (thumbPath && thumbRetries < 1 && state.supabase && !state.localPreview) {
        img.dataset.libraryThumbRetries = String(thumbRetries + 1);
        img.dataset.libraryImageRecovering = '1';
        delete state.libraryPreviewUrls[thumbPath];
        delete state.libraryPreviewUrlSignedAt[thumbPath];
        let retryUrl = '';
        try {
          await signLibraryPreviewUrls([thumbPath]);
          retryUrl = state.libraryPreviewUrls[thumbPath] || '';
        } catch (error) {
          console.warn('Thumbnail re-sign failed:', thumbPath, error);
        }
        delete img.dataset.libraryImageRecovering;
        if (!img.isConnected) return;
        if (retryUrl && img.dataset.libraryImageStage === 'thumb') {
          delete img.dataset.libraryImageGrace;
          img.classList.remove('loaded');
          img.closest('.library-thumb')?.classList.remove('img-loaded');
          img.src = retryUrl;
          watchLibraryImageLoad(img);
          return;
        }
      }
      // 重试后仍失败：这张小图进入冷却期（不是整场会话拉黑），
      // 本次先退回预览图，避免切换分组时反复先等一次失败请求。
      if (thumbPath) {
        markLibraryThumbUnavailable(thumbPath);
        delete state.libraryPreviewUrls[thumbPath];
        delete state.libraryPreviewUrlSignedAt[thumbPath];
      }
      // 记下「确实降级过」，updateLibraryCardImages 才不会把小图地址一签好就切回来，
      // 造成一次下载原图之后再下载小图的来回抖动。
      img.dataset.libraryThumbFailed = '1';
      img.dataset.libraryImageStage = 'full';
      img.classList.remove('loaded');
      img.src = fullUrl;
      watchLibraryImageLoad(img);
      return;
    }

    const retries = Number(img.dataset.libraryImageRetries || 0);
    if (!previewPath || retries >= 3 || state.localPreview || !state.supabase) {
      img.classList.add('loaded');
      const failedHost = img.closest('.library-thumb');
      failedHost?.classList.add('img-loaded', 'is-preview-error');
      failedHost?.classList.remove('is-preview-loading');
      return;
    }

    img.dataset.libraryImageRetries = String(retries + 1);
    img.dataset.libraryImageRecovering = '1';
    delete state.libraryPreviewUrls[previewPath];
    delete state.libraryPreviewUrlSignedAt[previewPath];
    if (thumbPath) {
      delete state.libraryPreviewUrls[thumbPath];
      delete state.libraryPreviewUrlSignedAt[thumbPath];
    }
    try {
      await signLibraryPreviewUrls([previewPath]);
      if (!img.isConnected) return;
      const refreshedUrl = state.libraryPreviewUrls[previewPath] || '';
      if (!refreshedUrl) throw new Error('Preview URL was not returned');
      img.dataset.libraryImageStage = 'full';
      img.classList.remove('loaded');
      img.closest('.library-thumb')?.classList.remove('img-loaded');
      img.src = refreshedUrl;
      watchLibraryImageLoad(img);
    } catch (error) {
      console.warn('Preview recovery failed:', previewPath, error);
      if (Number(img.dataset.libraryImageRetries || 0) < 3) {
        setTimeout(function() { void recoverLibraryCardImage(img); }, 500);
      } else {
        img.classList.add('loaded');
        const failedHost = img.closest('.library-thumb');
        failedHost?.classList.add('img-loaded', 'is-preview-error');
        failedHost?.classList.remove('is-preview-loading');
      }
    } finally {
      delete img.dataset.libraryImageRecovering;
    }
  }

  function renderLibrarySelects() {
    const filterMap = {
      country: document.getElementById('library-country-filter'),
      activity: document.getElementById('library-activity-filter'),
      category: document.getElementById('library-category-filter')
    };
    Object.entries(filterMap).forEach(([type, select]) => {
      if (!select) return;
      select.innerHTML = `<option value="all">${state.lang === 'zh' ? '全部' : 'All'}</option>${libraryOptions(type).map(option => `<option value="${option.id}">${escapeHtml(optionName(option))}</option>`).join('')}`;
      select.value = state.libraryFilters[type] || 'all';
    });
    ['upload'].forEach(prefix => {
      ['country', 'activity'].forEach(type => {
        const select = document.getElementById(`library-${prefix}-${type}`);
        if (!select) return;
        select.innerHTML = libraryOptions(type).map(option => `<option value="${option.id}">${escapeHtml(optionName(option))}</option>`).join('');
      });
    });
  }

  const CASE_BOARD_COLUMNS = 4;

  // 案例卡的高度（以列宽为单位）：卡片就是封面本身（标题/标签收进 hover 覆盖层），
  // 高度即封面高宽比。只用来比"哪一列最矮"，不需要像素级准确。
  function caseCardHeightEstimate(item) {
    const pw = item.preview.width, ph = item.preview.height;
    return (pw && ph) ? ph / pw : 1.33;
  }

  // 案例墙四列分列：前四张按顺序各占一列（首行从左边开始），之后的卡落进当前最矮的那列——
  // 通常正是短封面下方，把网格行高造成的大片空白补上；列内顺序即阅读顺序。
  function renderCaseBoardColumns(items) {
    const columns = [];
    const heights = [];
    for (let c = 0; c < CASE_BOARD_COLUMNS; c += 1) { columns.push([]); heights.push(0); }
    items.forEach(function(item, index) {
      let target = index;
      if (index >= CASE_BOARD_COLUMNS) {
        target = 0;
        for (let c = 1; c < CASE_BOARD_COLUMNS; c += 1) if (heights[c] < heights[target]) target = c;
      }
      heights[target] += caseCardHeightEstimate(item);
      columns[target].push(item);
    });
    return columns
      .map(function(column) { return `<div class="library-column">${column.map(renderLibraryCard).join('')}</div>`; })
      .join('');
  }

  function renderLibraryGrid() {
    const status = document.getElementById('library-status');
    const grid = document.getElementById('library-grid');
    if (!grid || !status) return;
    const queryRankById = new Map();
    const sourcesById = new Map(visibleLibrarySourcesForSession().map(source => [source.id, source]));
    const filteredItems = state.libraryPreviews
      .map(function(preview) {
        var src = sourcesById.get(preview.source_file_id);
        var bookmarkCoverPath = src && isBookmarkSource(src) ? libraryBookmarkCoverPreviewPath(src.id) : '';
        var displayPreviewPath = bookmarkCoverPath || preview.preview_path || '';
        var url = state.libraryPreviewUrls[displayPreviewPath] || '';
        var thumbPath = libraryThumbnailPathForPreview(preview, src);
        var thumbUrl = thumbPath && !libraryThumbUnavailable(thumbPath) ? state.libraryPreviewUrls[thumbPath] || '' : '';
        return { preview: preview, source: src, url: url, thumbUrl: thumbUrl };
      })
      .filter(item => item.source)
      .filter(item => !state.libraryBookmarkMemberIds.has(item.source.id))
      .filter(item => {
        const kind = libraryKindOfSource(item.source);
        return state.libraryFilters.kind === 'all' || state.libraryFilters.kind === kind;
      })
      .filter(item => librarySourceMatchesSelectedTags(item.source))
      .filter(item => !state.libraryFilters.favorites || state.libraryFavorites.has(item.preview.id))
      // v843：六个筛选维度都走 librarySourceMatchesFilterValue——原精确语义 + 该维度 AI 扩展词
      .filter(item => { var sel = state.libraryFilters.selectedCountries || []; return !sel.length || sel.some(function(v) { return librarySourceMatchesFilterValue('country', item.source, v); }); })
      .filter(item => { var sel = state.libraryFilters.selectedActivities || []; return !sel.length || sel.some(function(v) { return librarySourceMatchesFilterValue('activity', item.source, v); }); })
      .filter(item => { var sel = state.libraryFilters.selectedStrategies || []; return !sel.length || sel.some(function(v) { return librarySourceMatchesFilterValue('strategy', item.source, v); }); })
      .filter(item => { var sel = state.libraryFilters.selectedElements || []; return !sel.length || sel.some(function(v) { return librarySourceMatchesFilterValue('element', item.source, v); }); })
      .filter(item => { var sel = state.libraryFilters.selectedFormats || []; return !sel.length || sel.some(function(v) { return librarySourceMatchesFilterValue('format', item.source, v); }); })
      .filter(item => { var sel = state.libraryFilters.selectedQuantities || []; return !sel.length || sel.some(function(v) { return librarySourceMatchesFilterValue('quantity', item.source, v); }); })
      .filter(item => {
        if (!state.libraryFilters.query) return true;
        const rank = libraryItemQueryMatchRank(item, state.libraryFilters.query, libraryExpansionTerms);
        if (rank < 0) return false;
        const prev = queryRankById.get(item.source.id);
        queryRankById.set(item.source.id, prev === undefined ? rank : Math.min(prev, rank));
        return true;
      });
    // 精确命中的排在仅靠扩展词命中的前面（同一项目内任一物料精确命中就算精确；排序稳定，不打乱新图优先）
    filteredItems.sort(function(a, b) { return (queryRankById.get(a.source.id) || 0) - (queryRankById.get(b.source.id) || 0); });
    state.libraryItems = groupFontLibraryItems(collapseCaseProjectItems(filteredItems));
    if (state.libraryScrollToSource) {
      const target = findLibrarySourceLocation(state.libraryScrollToSource);
      if (target.index >= 0) state.libraryVisibleLimit = Math.max(state.libraryVisibleLimit, Math.ceil((target.index + 1) / LIBRARY_RENDER_STEP) * LIBRARY_RENDER_STEP);
    }
    var visibleItems = state.libraryItems.slice(0, state.libraryVisibleLimit);
    // 全是案例项目卡时走四列分列布局（renderCaseBoardColumns）：案例封面高矮参差，
    // 真网格行高被最高卡撑满、短封面下方留一大块空白；CSS 多列瀑布流又按列高平衡分配，
    // 数量不足一整行时末几张会漂到中间的列上。分列后按"最矮列优先"落卡，两者都能避免。
    // 只在超级库用：首页(home)那份板面被 [data-route="home"] 的 !important 瀑布流样式接管
    // （列数还按宽度 3/2/1 响应），分列在那儿会被压回 block、列与列叠成一竖排。
    const caseBoard = state.route === 'library'
      && visibleItems.length > 0
      && visibleItems.every(function(item) { return !!item.isCaseProjectCard; });
    if (!caseBoard) {
      // 按宽高比交替排列，每4张一组，保持新图优先
      var GROUP = 4;
      var balanced = [];
      for (var g = 0; g < visibleItems.length; g += GROUP) {
        var group = visibleItems.slice(g, g + GROUP).map(function(item, idx) {
          var pw = item.preview.width, ph = item.preview.height;
          return { item: item, ratio: (pw && ph) ? pw / ph : 1 };
        });
        group.sort(function(a, b) { return a.ratio - b.ratio; });
        var l = 0, r = group.length - 1;
        while (l <= r) {
          balanced.push(group[r--].item);
          if (l <= r) balanced.push(group[l++].item);
        }
      }
      visibleItems = balanced;
    }
    const counts = countLibraryKinds();
    const sourceBadge = state.libraryRecoveryLabel
      ? `<span class="library-stat recovery"><small>${state.lang === 'zh' ? '来源' : 'Source'}</small><strong>${escapeHtml(state.libraryRecoveryLabel)}</strong></span>`
      : '';
    status.classList.remove('is-loading');
    // 有搜索词时给出命中数，避免"搜了但不知道有没有结果"（空结果时网格只有一句空态文案）
    const queryBadge = state.libraryFilters.query
      ? `<span class="library-stat"><small>${state.lang === 'zh' ? '命中' : 'Matches'}</small><strong>${state.libraryItems.length}</strong><small>“${escapeHtml(state.libraryFilters.query)}”</small></span>`
      : '';
    // v835：扩展词不再拼进状态条，改为渲染在搜索框左侧 chips（下方 chipsHost）
    status.innerHTML = `${sourceBadge}${queryBadge}`;
    // v835：AI 相关词渲染在搜索框左侧；v837 抽成独立函数（含「AI 联想中…」加载态）
    renderLibraryExpansionChips();
    grid.classList.toggle('library-grid-cases', caseBoard);
    if (visibleItems.length === 0) {
      state.librarySelectedPreviewId = '';
      grid.innerHTML = `<div class="empty-card">
        <strong>${state.lang === 'zh' ? '还没有符合条件的素材' : 'No matching assets'}</strong>
        <span>${state.lang === 'zh' ? '可以先上传图库图片或案例文件。模板库素材从静态设计师保存进入。' : 'Upload gallery images or case files first. Templates come from Static Designer.'}</span>
      </div>`;
      renderLibraryInspector();
      return;
    }
    if (!visibleItems.some(item => item.preview.id === state.librarySelectedPreviewId)) {
      state.librarySelectedPreviewId = '';
    }
    // 重建前把已解码图片保存在跨分组缓存中；切到其他分类再回来时直接挂回同一节点。
    rememberRenderedLibraryPreviewImages(grid);
    grid.innerHTML = caseBoard
      ? renderCaseBoardColumns(visibleItems)
      : visibleItems.map(renderLibraryCard).join('');
    // 把此前任意分组中已加载的节点挂回新 DOM，保持浏览器内的已解码像素。
    restoreRememberedLibraryPreviewImages(grid);
    wireLibraryCards();
    bindLibraryInfiniteScroll();
    renderLibraryInspector();
    void signVisibleLibraryUrls(visibleItems);
    visibleItems.forEach(function(item) { void hydrateLibraryTemplateDimension(item); });
    // GIF 封面的无声循环视频：进视口才播（顺带把还没有视频产物的 GIF 排进转码队列）
    scheduleAutoplayVideoSweep();
    visibleItems.forEach(function(item) {
      if (isCaseGifPreview(item.preview)) queueGifSmallPreviewBackfill(item.preview, item.source);
    });
  }

  // ── 素材库检索栏自动收起（v658 / v661）──
  // 需求：往下滚时整条检索栏向上叠起消失，鼠标移到顶部（或往上滚）再放出来。
  // 注意：这里刻意不用 requestAnimationFrame —— 部分环境下 rAF 会被暂停，
  // 挂在 rAF 上的回调永远不执行（v656 的吸顶阴影就是这么失效的），事件里直接切类名最稳。
  const LIBRARY_PIN_TOP_SAFE_MIN = 64;    // 至少滚过这么多像素才允许收起（不足一条高度时按此下限）
  const LIBRARY_PIN_REVEAL_ZONE = 64;     // 鼠标进入窗口顶部这个高度就展开（原来只有 16px，不好触发）
  const LIBRARY_PIN_HOLD_BELOW = 32;      // 展开后光标在条子下方这么多像素内仍算"在条上"
  const LIBRARY_PIN_HOVER_GRACE = 900;    // 光标离开后先留这么久再收起，避免来回弹
  const LIBRARY_PIN_DIRECTION_STEP = 8;   // 方向判定最小位移，避免加载抖动导致来回收放
  const libraryPinAutoHide = {
    bound: false, visible: true, pointerInside: false, holdReveal: false,
    hoverTimer: 0, lastScrollTop: 0, barHeight: 0,
  };

  function libraryPinScrollTop() {
    const content = els.content;
    // 两种滚动容器都考虑：文档在滚时 window.scrollY 有效，#content 自己在滚时它的 scrollTop 有效
    return Math.max(window.scrollY || 0, content ? (content.scrollTop || 0) : 0);
  }

  function applyLibraryPinVisibility() {
    const strip = document.getElementById('library-pin-strip');
    if (!strip) return;
    // 光标在条上、或还在离开后的宽限期内，都不收——免得从光标底下抽走、也不来回弹
    const stowed = !libraryPinAutoHide.visible
      && !libraryPinAutoHide.pointerInside
      && !libraryPinAutoHide.holdReveal;
    strip.classList.toggle('is-stowed', stowed);
    if (!stowed) libraryPinAutoHide.barHeight = strip.offsetHeight || libraryPinAutoHide.barHeight;
  }

  function clearLibraryPinHoverTimer() {
    if (libraryPinAutoHide.hoverTimer) {
      clearTimeout(libraryPinAutoHide.hoverTimer);
      libraryPinAutoHide.hoverTimer = 0;
    }
  }

  function handleLibraryPinScroll() {
    if (!document.getElementById('library-pin-strip')) return;
    const top = libraryPinScrollTop();
    const last = libraryPinAutoHide.lastScrollTop;
    // 还没滚过一整条检索栏（且至少 64px）之前不收起，免得刚往下滚一点整条就消失
    const safe = Math.max(LIBRARY_PIN_TOP_SAFE_MIN, libraryPinAutoHide.barHeight || 0);
    if (top <= safe) libraryPinAutoHide.visible = true;
    else if (top < last - LIBRARY_PIN_DIRECTION_STEP) libraryPinAutoHide.visible = true;   // 往上滚：放出来
    else if (top > last + LIBRARY_PIN_DIRECTION_STEP) libraryPinAutoHide.visible = false; // 往下滚：叠起来
    libraryPinAutoHide.lastScrollTop = top;
    applyLibraryPinVisibility();
  }

  // 光标离场：先给一段宽限期再收，用户想把鼠标挪回顶部时不会刚离开就折叠
  function releaseLibraryPinHover() {
    if (!libraryPinAutoHide.pointerInside && !libraryPinAutoHide.holdReveal) return;
    libraryPinAutoHide.pointerInside = false;
    clearLibraryPinHoverTimer();
    libraryPinAutoHide.holdReveal = true;
    libraryPinAutoHide.hoverTimer = setTimeout(function() {
      libraryPinAutoHide.hoverTimer = 0;
      libraryPinAutoHide.holdReveal = false;
      applyLibraryPinVisibility();
    }, LIBRARY_PIN_HOVER_GRACE);
  }

  function handleLibraryPinPointerMove(event) {
    const strip = document.getElementById('library-pin-strip');
    if (!strip) return;
    const height = libraryPinAutoHide.barHeight || strip.offsetHeight || 0;
    // 顶部一条较宽的感应带；展开后整个条子 + 下方一段余量也算，鼠标不用贴着走
    const inside = event.clientY <= LIBRARY_PIN_REVEAL_ZONE
      || (!strip.classList.contains('is-stowed') && event.clientY <= height + LIBRARY_PIN_HOLD_BELOW);
    if (!inside) {
      releaseLibraryPinHover();
      return;
    }
    clearLibraryPinHoverTimer();
    libraryPinAutoHide.holdReveal = false;
    if (libraryPinAutoHide.pointerInside) return;
    libraryPinAutoHide.pointerInside = true;
    applyLibraryPinVisibility();
  }

  function resetLibraryPinAutoHide() {
    const strip = document.getElementById('library-pin-strip');
    if (!strip) return;
    clearLibraryPinHoverTimer();
    libraryPinAutoHide.barHeight = strip.offsetHeight || 0;
    libraryPinAutoHide.lastScrollTop = libraryPinScrollTop();
    // 重新渲染后按当前滚动位置恢复状态：已经滚远了就别让检索栏自己弹回来
    libraryPinAutoHide.visible = libraryPinAutoHide.lastScrollTop
      <= Math.max(LIBRARY_PIN_TOP_SAFE_MIN, libraryPinAutoHide.barHeight || 0);
    libraryPinAutoHide.pointerInside = false;
    libraryPinAutoHide.holdReveal = false;
    applyLibraryPinVisibility();
  }

  function bindLibraryPinAutoHide() {
    if (!libraryPinAutoHide.bound) {
      libraryPinAutoHide.bound = true;
      window.addEventListener('scroll', handleLibraryPinScroll, { passive: true });
      window.addEventListener('resize', resetLibraryPinAutoHide);
      // 感应带挂在 window 上（而不是只挂 #content），鼠标从左侧栏上方划过也能触发
      window.addEventListener('pointermove', handleLibraryPinPointerMove, { passive: true });
      document.addEventListener('pointerleave', releaseLibraryPinHover);
      if (els.content) els.content.addEventListener('scroll', handleLibraryPinScroll, { passive: true });
    }
    resetLibraryPinAutoHide();
  }

  function bindLibraryInfiniteScroll() {
    const target = els.content || document.scrollingElement;
    if (!target) return;
    if (libraryInfiniteScrollTarget !== target) {
      if (libraryInfiniteScrollTarget && libraryInfiniteScrollTarget !== document.scrollingElement) {
        libraryInfiniteScrollTarget.removeEventListener('scroll', scheduleLibraryInfiniteScrollCheck);
      } else if (libraryInfiniteScrollTarget === document.scrollingElement) {
        window.removeEventListener('scroll', scheduleLibraryInfiniteScrollCheck);
      }
      libraryInfiniteScrollTarget = target;
      if (target === document.scrollingElement) window.addEventListener('scroll', scheduleLibraryInfiniteScrollCheck, { passive: true });
      else target.addEventListener('scroll', scheduleLibraryInfiniteScrollCheck, { passive: true });
    }
    // 首批素材不足以填满高屏时也会自动继续补齐，不需要用户先滚动一次。
    scheduleLibraryInfiniteScrollCheck();
  }

  function scheduleLibraryInfiniteScrollCheck() {
    if (libraryInfiniteScrollFrame) return;
    libraryInfiniteScrollFrame = requestAnimationFrame(function() {
      libraryInfiniteScrollFrame = 0;
      const grid = document.getElementById('library-grid');
      if (!grid || !state.libraryItems || state.libraryVisibleLimit >= state.libraryItems.length) return;
      const target = libraryInfiniteScrollTarget;
      const scrollTop = target === document.scrollingElement ? (window.scrollY || document.documentElement.scrollTop || 0) : target.scrollTop;
      const clientHeight = target === document.scrollingElement ? window.innerHeight : target.clientHeight;
      const scrollHeight = target === document.scrollingElement ? document.documentElement.scrollHeight : target.scrollHeight;
      // 在距离底部约 1.5 屏时预先追加，用户滚到末尾前新卡片已经开始加载。
      if (scrollHeight - scrollTop - clientHeight > Math.max(900, clientHeight * 1.5)) return;
      state.libraryVisibleLimit = Math.min(state.libraryItems.length, state.libraryVisibleLimit + LIBRARY_RENDER_STEP);
      renderLibraryGrid();
    });
  }

  async function loadRecoveredPlatformLibrary() {
    try {
      const response = await fetch(`recovered/platform/index.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Recovery index ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.sources) || !Array.isArray(data.previews) || data.sources.length === 0) {
        throw new Error('Recovery index is empty');
      }
      state.libraryOptions = Array.isArray(data.options) ? data.options : [];
      state.librarySources = data.sources;
      state.libraryPreviews = data.previews;
      state.libraryPreviewUrls = Object.fromEntries(
        Object.entries(data.previewUrls || {}).map(([key, value]) => {
          if (String(value).startsWith('data:')) return [key, value];
          return [key, new URL(value, location.href).toString()];
        })
      );
      state.libraryFavorites = new Set();
      state.libraryRecoveryLabel = state.lang === 'zh' ? `旧平台恢复 ${data.totalSources || data.sources.length}` : `Recovered ${data.totalSources || data.sources.length}`;
      state.libraryDataLoaded = true;
      refreshLibraryLoadedUi();
      return true;
    } catch (error) {
      console.warn('Recovered platform library unavailable:', error);
      state.libraryRecoveryLabel = '';
      return false;
    }
  }

  function loadLocalLibraryDemo() {
    const now = new Date().toISOString();
    state.libraryRecoveryLabel = state.lang === 'zh' ? '演示数据' : 'Demo';
    state.libraryOptions = [
      { id: 'local-uae', option_type: 'country', name_zh: '阿联酋', name_en: 'UAE', sort_order: 10 },
      { id: 'local-ksa', option_type: 'country', name_zh: '沙特', name_en: 'Saudi Arabia', sort_order: 20 },
      { id: 'local-qatar', option_type: 'country', name_zh: '卡塔尔', name_en: 'Qatar', sort_order: 30 },
      { id: 'local-ramadan', option_type: 'activity', name_zh: '斋月', name_en: 'Ramadan', sort_order: 10 },
      { id: 'local-weekly', option_type: 'activity', name_zh: '周报', name_en: 'Weekly', sort_order: 20 },
      { id: 'local-launch', option_type: 'activity', name_zh: '新品', name_en: 'Launch', sort_order: 30 },
      { id: 'local-food', option_type: 'category', name_zh: '餐饮', name_en: 'F&B', sort_order: 10 },
      { id: 'local-retail', option_type: 'category', name_zh: '零售', name_en: 'Retail', sort_order: 20 },
      { id: 'local-app', option_type: 'category', name_zh: 'App 运营', name_en: 'App Ops', sort_order: 30 }
    ];
    state.librarySources = [
      {
        id: 'local-source-1',
        title: 'Ramadan App Banner Set',
        country_id: 'local-uae',
        activity_id: 'local-ramadan',
        category_id: 'local-app',
        tags: ['App', 'Banner', 'Campaign'],
        visibility: 'all',
        source_filename: 'ramadan-banner-master.psd',
        source_size_bytes: 128 * 1024 * 1024,
        source_ext: 'psd',
        uploaded_by: state.session?.user?.id || 'local_admin',
        created_at: now,
        updated_at: now
      },
      {
        id: 'local-source-2',
        title: 'KSA Weekly Offer Poster',
        country_id: 'local-ksa',
        activity_id: 'local-weekly',
        category_id: 'local-food',
        tags: ['Offer', 'Poster'],
        visibility: 'all',
        source_filename: 'ksa-weekly-offer.ai',
        source_size_bytes: 74 * 1024 * 1024,
        source_ext: 'ai',
        uploaded_by: 'local_designer',
        created_at: now,
        updated_at: now
      },
      {
        id: 'local-source-3',
        title: 'Qatar New Store Launch',
        country_id: 'local-qatar',
        activity_id: 'local-launch',
        category_id: 'local-retail',
        tags: ['Launch', 'Storefront', 'Social'],
        visibility: 'all',
        source_filename: 'qatar-store-launch.pdf',
        source_size_bytes: 52 * 1024 * 1024,
        source_ext: 'pdf',
        uploaded_by: 'local_designer',
        created_at: now,
        updated_at: now
      }
    ];
    state.libraryPreviews = [
      { id: 'local-preview-1', source_file_id: 'local-source-1', preview_path: 'local-preview-1', preview_filename: 'ramadan-banner-01.jpg', width: 1600, height: 900, sort_order: 10, created_at: now },
      { id: 'local-preview-2', source_file_id: 'local-source-1', preview_path: 'local-preview-2', preview_filename: 'ramadan-banner-02.jpg', width: 1080, height: 1350, sort_order: 20, created_at: now },
      { id: 'local-preview-3', source_file_id: 'local-source-2', preview_path: 'local-preview-3', preview_filename: 'weekly-offer.jpg', width: 1200, height: 1500, sort_order: 10, created_at: now },
      { id: 'local-preview-4', source_file_id: 'local-source-3', preview_path: 'local-preview-4', preview_filename: 'launch-social.jpg', width: 1080, height: 1080, sort_order: 10, created_at: now }
    ];
    state.libraryPreviewUrls = {
      'local-preview-1': localPreviewArtwork('Ramadan', '#155eef', '#f59e0b', '#111827'),
      'local-preview-2': localPreviewArtwork('App Banner', '#0f766e', '#60a5fa', '#111827'),
      'local-preview-3': localPreviewArtwork('Weekly Offer', '#be123c', '#f97316', '#111827'),
      'local-preview-4': localPreviewArtwork('Store Launch', '#7c3aed', '#14b8a6', '#111827')
    };
    state.libraryFavorites = new Set(['local-preview-1']);
    state.libraryDataLoaded = true;
    refreshLibraryLoadedUi();
  }

  function localPreviewArtwork(title, colorA, colorB, ink) {
    const safeTitle = escapeHtml(title);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
        <rect width="1200" height="900" fill="#f8fafc"/>
        <rect x="80" y="80" width="1040" height="740" rx="36" fill="#ffffff" stroke="#d0d5dd" stroke-width="3"/>
        <rect x="130" y="130" width="420" height="56" rx="28" fill="${colorA}"/>
        <rect x="130" y="222" width="660" height="170" rx="26" fill="${ink}"/>
        <circle cx="930" cy="248" r="116" fill="${colorB}" opacity="0.92"/>
        <circle cx="1008" cy="332" r="74" fill="${colorA}" opacity="0.88"/>
        <rect x="130" y="462" width="890" height="44" rx="22" fill="#e4e7ec"/>
        <rect x="130" y="536" width="620" height="44" rx="22" fill="#e4e7ec"/>
        <rect x="130" y="656" width="260" height="72" rx="18" fill="${colorA}"/>
        <text x="164" y="328" fill="#ffffff" font-family="Inter, Arial" font-size="72" font-weight="800">${safeTitle}</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function isFontLibraryItem(item) {
    if (!item || !item.source) return false;
    var tags = visibleLibraryTags(item.source);
    return libraryKindOfSource(item.source) === 'template' && tags.includes('组件') && tags.includes('字体');
  }

  function fontFamilyNameFromTitle(title) {
    var value = String(title || '').trim();
    // 上传字体通常以「家族名-字重」命名。只有末尾明确为常见字重时才移除，避免误伤字体名本身。
    var family = value.replace(/[\s_-]+(?:extra[\s_-]?light|ultra[\s_-]?light|thin|hairline|light|regular|normal|book|medium|semi[\s_-]?bold|demi[\s_-]?bold|bold|heavy|extra[\s_-]?bold|black)(?:[\s_-]+(?:italic|oblique))?$/i, '');
    return family.replace(/[\s_-]+$/, '').trim() || value;
  }

  function fontWeightLabelFromTitle(title) {
    var match = String(title || '').match(/(?:^|[\s_-])(extra[\s_-]?light|ultra[\s_-]?light|thin|hairline|light|regular|normal|book|medium|semi[\s_-]?bold|demi[\s_-]?bold|bold|heavy|extra[\s_-]?bold|black)(?:[\s_-]+(italic|oblique))?$/i);
    if (!match) return 'Regular';
    var labels = {
      extralight: 'ExtraLight', ultralight: 'UltraLight', thin: 'Thin', hairline: 'Hairline',
      light: 'Light', regular: 'Regular', normal: 'Normal', book: 'Book', medium: 'Medium',
      semibold: 'SemiBold', demibold: 'DemiBold', bold: 'Bold', heavy: 'Heavy',
      extrabold: 'ExtraBold', black: 'Black'
    };
    var key = String(match[1]).replace(/[\s_-]/g, '').toLowerCase();
    return (labels[key] || match[1]) + (match[2] ? ' Italic' : '');
  }

  function groupFontLibraryItems(items) {
    var groups = new Map();
    var result = [];
    (items || []).forEach(function(item) {
      if (!isFontLibraryItem(item)) {
        result.push(item);
        return;
      }
      var family = fontFamilyNameFromTitle(item.source.title);
      var key = family.toLocaleLowerCase();
      var group = groups.get(key);
      if (!group) {
        group = Object.assign({}, item, { fontFamilyName: family, fontVariants: [item] });
        groups.set(key, group);
        result.push(group);
      } else {
        group.fontVariants.push(item);
      }
    });
    return result;
  }

  function showFontFamilyMenu(anchor, item) {
    var menu = document.getElementById('context-menu');
    if (!menu) return;
    var variants = item.fontVariants || [item];
    var isFamily = variants.length > 1;
    menu.innerHTML = isFamily
      ? '<button type="button" data-font-menu-action="manage"><span class="ctx-icon">⚙</span>' + (state.lang === 'zh' ? '管理' : 'Manage') + '</button>'
      : '<button type="button" data-font-menu-action="download"><span class="ctx-icon">⇩</span>' + (state.lang === 'zh' ? '下载' : 'Download') + '</button>' +
        '<button type="button" class="danger" data-font-menu-action="delete"><span class="ctx-icon">⌫</span>' + (state.lang === 'zh' ? '删除' : 'Delete') + '</button>';
    menu.classList.add('show');
    var rect = anchor.getBoundingClientRect();
    requestAnimationFrame(function() {
      var x = Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8);
      var y = Math.min(rect.bottom + 8, window.innerHeight - menu.offsetHeight - 8);
      menu.style.left = Math.max(8, x) + 'px';
      menu.style.top = Math.max(8, y) + 'px';
    });
    menu.querySelectorAll('[data-font-menu-action]').forEach(function(button) {
      button.addEventListener('click', function() {
        var action = button.dataset.fontMenuAction;
        hideContextMenu();
        if (action === 'manage') return openFontFamilyManager(item);
        if (action === 'download') return downloadLibraryFile(variants[0], 'source');
        if (action === 'delete') return deleteLibrarySource(variants[0].source.id);
      });
    });
  }

  function openFontFamilyManager(item) {
    document.getElementById('font-family-manager-modal')?.remove();
    var variants = item.fontVariants || [item];
    var family = item.fontFamilyName || fontFamilyNameFromTitle(item.source.title);
    var rows = variants.map(function(variant, index) {
      var label = fontWeightLabelFromTitle(variant.source.title);
      return '<label style="display:flex;align-items:center;gap:20px;padding:13px 0;cursor:pointer;">' +
        '<input type="checkbox" data-font-variant-index="' + index + '" style="width:22px;height:22px;accent-color:#466bf6;">' +
        '<span style="flex:1;font-size:25px;line-height:1.2;font-weight:' + (/bold|heavy|black/i.test(label) ? '700' : /medium/i.test(label) ? '500' : '400') + ';font-style:' + (/italic/i.test(label) ? 'italic' : 'normal') + ';">' + escapeHtml(family) + '</span>' +
        '<span style="padding:7px 16px;border-radius:999px;background:#f1f2ff;color:#466bf6;font-size:16px;white-space:nowrap;">' + escapeHtml(label) + '</span>' +
      '</label>';
    }).join('');
    var modal = document.createElement('div');
    modal.id = 'font-family-manager-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = '<section role="dialog" aria-modal="true" style="width:min(960px,calc(100vw - 40px));height:min(820px,calc(100vh - 48px));background:#fff;border-radius:20px;display:flex;flex-direction:column;box-shadow:0 22px 80px rgba(0,0,0,.28);overflow:hidden;">' +
      '<header style="display:flex;align-items:center;justify-content:space-between;padding:28px 46px;border-bottom:1px solid #e8e8ea;"><h2 style="margin:0;font-size:30px;font-weight:500;">' + escapeHtml(family) + '</h2><button type="button" data-font-modal-close style="border:0;background:transparent;font-size:38px;line-height:1;cursor:pointer;">×</button></header>' +
      '<div style="flex:1;overflow:auto;padding:30px 46px;">' + rows + '</div>' +
      '<footer style="display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 46px;border-top:1px solid #e8e8ea;">' +
        '<label style="display:flex;align-items:center;gap:10px;font-size:18px;cursor:pointer;"><input id="font-family-select-all" type="checkbox" style="width:22px;height:22px;accent-color:#466bf6;">' + (state.lang === 'zh' ? '全选' : 'Select all') + '</label>' +
        '<div style="display:flex;gap:16px;"><button type="button" data-font-modal-delete style="padding:13px 28px;border:1px solid #d8dadd;background:#fff;border-radius:12px;font-size:18px;cursor:pointer;">' + (state.lang === 'zh' ? '删除' : 'Delete') + '</button><button type="button" data-font-modal-download style="padding:13px 28px;border:0;background:#466bf6;color:#fff;border-radius:12px;font-size:18px;cursor:pointer;">' + (state.lang === 'zh' ? '下载' : 'Download') + '</button></div>' +
      '</footer></section>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(event) { if (event.target === modal) modal.remove(); });
    modal.querySelector('[data-font-modal-close]').addEventListener('click', function() { modal.remove(); });
    var boxes = Array.from(modal.querySelectorAll('[data-font-variant-index]'));
    modal.querySelector('#font-family-select-all').addEventListener('change', function(event) {
      boxes.forEach(function(box) { box.checked = event.target.checked; });
    });
    function selectedVariants() { return boxes.filter(function(box) { return box.checked; }).map(function(box) { return variants[Number(box.dataset.fontVariantIndex)]; }); }
    modal.querySelector('[data-font-modal-download]').addEventListener('click', async function() {
      var selected = selectedVariants();
      if (!selected.length) return alert(state.lang === 'zh' ? '请先选择字重。' : 'Select at least one style.');
      for (var i = 0; i < selected.length; i++) await downloadLibraryFile(selected[i], 'source');
    });
    modal.querySelector('[data-font-modal-delete]').addEventListener('click', async function() {
      var selected = selectedVariants();
      if (!selected.length) return alert(state.lang === 'zh' ? '请先选择字重。' : 'Select at least one style.');
      for (var i = 0; i < selected.length; i++) await deleteLibrarySource(selected[i].source.id);
      modal.remove();
    });
  }

  function libraryBookmarkSizeEntries(group) {
    const sizeGroups = new Map();
    libraryBookmarkMemberItems(group).forEach(function(member) {
      const info = libraryBookmarkMemberDimensionInfo(member);
      if (!info) return;
      const key = info.width + 'x' + info.height;
      if (!sizeGroups.has(key)) sizeGroups.set(key, { info: info });
    });
    return Array.from(sizeGroups.values());
  }

  function renderLibraryBookmarkInlineHover(group) {
    const entries = libraryBookmarkSizeEntries(group);
    const rows = entries.map(function(entry) {
      return `<div class="library-bookmark-inline-row">${libraryBookmarkSizeIconMarkup(entry.info)}<div class="library-bookmark-inline-copy"><strong>${escapeHtml(entry.info.ratio)}</strong><span>${entry.info.width} × ${entry.info.height} px</span></div></div>`;
    }).join('');
    return `<div class="library-bookmark-inline-hover" aria-hidden="true"><div class="library-bookmark-inline-list">${rows || `<div class="library-bookmark-inline-empty">${state.lang === 'zh' ? '暂无可用关联模板' : 'No linked templates'}</div>`}</div></div>`;
  }

  function prepareDecodedLibraryImage(image, host) {
    if (!image || image.dataset.previewRevealBound === '1') return;
    image.dataset.previewRevealBound = '1';
    image.classList.add('library-progressive-image');
    host = host || image.closest('.library-thumb, .library-bookmark-template-thumb, .library-bookmark-editor-thumb, .inspector-preview, #library-detail-preview');
    if (host) {
      host.classList.add('library-preview-shell', 'is-preview-loading');
      host.classList.remove('is-preview-ready', 'is-preview-error');
    }
    let revealed = false;
    const reveal = function() {
      if (revealed) return;
      revealed = true;
      clearLibraryImageLoadWatchdog(image);
      // load 已经证明图片可以绘制；不再等待 decode() 才撤掉模糊层。
      // Chromium 在多图内存压力下可能长时间不解决 decode Promise。
      requestAnimationFrame(function() {
        image.classList.add('is-ready');
        if (host) {
          host.classList.remove('is-preview-loading', 'is-preview-error');
          host.classList.add('is-preview-ready');
        }
        rememberLibraryPreviewImageNode(image);
      });
      if (typeof image.decode === 'function') void image.decode().catch(function() {});
    };
    image.addEventListener('load', reveal, { once: true });
    image.addEventListener('error', function() {
      clearLibraryImageLoadWatchdog(image);
      const fallbackSrc = image.dataset.fallbackSrc || '';
      if (fallbackSrc && image.dataset.fallbackTried !== '1') {
        image.dataset.fallbackTried = '1';
        image.src = fallbackSrc;
        return;
      }
      // 素材库主卡片还有刷新签名地址的自动恢复链路，不要在第一次
      // 缩略图错误时就把它标成最终失败。
      if (host && !image.dataset.previewPath) {
        host.classList.remove('is-preview-loading');
        host.classList.add('is-preview-error');
      }
    });
    if (image.complete && image.naturalWidth) reveal();
  }

  function prepareDecodedLibraryImages(root) {
    (root || document).querySelectorAll('img.library-progressive-image, img.lazy-img').forEach(function(image) {
      prepareDecodedLibraryImage(image);
    });
  }

  function mountDecodedBookmarkPreview(thumb, url, member) {
    if (!thumb || !url) return;
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    thumb.appendChild(image);
    prepareDecodedLibraryImage(image, thumb);
    if (member) {
      image.addEventListener('error', function() {
        void recoverBookmarkMemberPreview(member).then(function(recoveredUrl) {
          if (!recoveredUrl || !thumb.isConnected) return;
          thumb.replaceChildren();
          mountDecodedBookmarkPreview(thumb, recoveredUrl);
        });
      }, { once: true });
    }
    image.src = url;
  }

  function updateOpenBookmarkPreview(sourceId, url) {
    if (!sourceId || !url) return;
    const card = document.querySelector(`#library-bookmark-members [data-template-source-id="${CSS.escape(sourceId)}"]`);
    const thumb = card?.querySelector('.library-bookmark-template-thumb');
    if (!thumb) return;
    const current = thumb.querySelector('img');
    if (current?.src === url) return;
    thumb.replaceChildren();
    mountDecodedBookmarkPreview(thumb, url);
  }

  // ===== 案例项目卡片与项目弹窗 =====
  // hover 浮层挂在 body 上：卡片内部的浮层会被卡片圆角的 overflow 裁掉。
  let casePopTimer = null;
  // 浮窗只展示前 8 张：尺寸压小后放不下全部，也避免一次拉几十张图
  const CASE_POP_MAX_ITEMS = 8;
  function showCaseHoverPop(card, sourceId) {
    try {
    clearTimeout(casePopTimer);
    const source = state.librarySources.find(s => s.id === sourceId);
    if (!source || !isCaseProject(source)) return;
    const materials = caseMaterialsOf(source);
    if (!materials.length) return;
    let pop = document.getElementById('case-hover-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'case-hover-pop';
      pop.className = 'case-hover-pop';
      document.body.append(pop);
    }
    // 卡片内每次 mouseover 都会冒泡到这里的委托：同一项目已经渲染过就不重建，
    // 否则鼠标划过时整块 DOM（含所有图片）会反复销毁重建，看起来像加载很慢
    if (pop.dataset.caseProject === sourceId && pop.style.display === 'flex' && pop.childElementCount) return;
    pop.dataset.caseProject = sourceId;
    const shownMaterials = materials.slice(0, CASE_POP_MAX_ITEMS);
    pop.innerHTML = '';
    // 按尺寸分组：竖版组横向并排、横版组纵向堆叠；浮窗宽高随内容自适应
    const popGroups = [];
    const popGroupMap = new Map();
    shownMaterials.forEach(function(p) {
      const key = p.width && p.height ? p.width + 'x' + p.height : 'unknown';
      if (!popGroupMap.has(key)) {
        const group = { key: key, ratio: p.width && p.height ? p.height / p.width : 1.4, items: [] };
        popGroupMap.set(key, group);
        popGroups.push(group);
      }
      popGroupMap.get(key).items.push(p);
    });
    popGroups.sort(function(a, b) { return a.ratio - b.ratio; });
    popGroups.forEach(function(group) {
      const block = document.createElement('div');
      const portrait = group.ratio > 1.05;
      block.className = 'case-pop-group ' + (portrait ? 'is-portrait' : 'is-landscape');
      group.items.forEach(function(p) {
        const thumb = document.createElement('div');
        thumb.className = 'case-pop-thumb';
        thumb.setAttribute('data-case-pop-path', p.preview_path || '');
        thumb.innerHTML = casePopMediaWithRatio(p, source) + '<small>' + escapeHtml(p.material_type || '未分类') + '</small>';
        block.append(thumb);
      });
      pop.append(block);
    });
    const hiddenCount = materials.length - shownMaterials.length;
    if (hiddenCount > 0) {
      const more = document.createElement('div');
      more.className = 'case-pop-more';
      more.textContent = state.lang === 'zh' ? '还有 ' + hiddenCount + ' 张，点开项目查看全部' : '+' + hiddenCount + ' more';
      pop.append(more);
    }
    pop.style.display = 'flex';
    const rect = card.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    // 优先贴在卡片右侧；放不下时改贴左侧，避免盖住正在查看的这张卡片
    let left = rect.right + 10;
    if (left + popRect.width > window.innerWidth - 12) left = Math.max(12, rect.left - popRect.width - 10);
    pop.style.top = Math.max(10, Math.min(window.innerHeight - popRect.height - 10, rect.top)) + 'px';
    pop.style.left = left + 'px';
    void signVisibleLibraryUrls(shownMaterials.map(p => ({ source: source, preview: p }))).then(function() {
      // 浮窗可能已经切到别的项目；只在仍展示本项目时替换节点
      if (pop.dataset.caseProject !== sourceId) return;
      // 签名完成后再决定用缩略图还是视频元素（渲染时 URL 还没签名）
      pop.querySelectorAll('.case-pop-thumb').forEach(function(node) {
        const path = node.getAttribute('data-case-pop-path') || '';
        const material = shownMaterials.find(p => p.preview_path === path);
        if (!material) return;
        const label = node.querySelector('small');
        node.innerHTML = casePopMediaWithRatio(material, source) + (label ? '<small>' + escapeHtml(label.textContent) + '</small>' : '');
      });
    });
    } catch (error) { if (window.console && console.warn) console.warn('case hover pop:', error); }
  }
  window.__casePopShow = function(card) { showCaseHoverPop(card, card.getAttribute('data-case-project')); };
  window.__casePopHide = hideCaseHoverPop;
  // ===== GIF 转成的无声循环视频 =====
  // 网格 / 浮窗里可能同时挂几十个视频元素：只有进入视口才赋 src 并播放，
  // 离开视口立即暂停，避免几十路解码拖慢滚动。
  let autoplayVideoObserver = null;
  let autoplayVideoSweepTimer = 0;
  // video → 被观察的容器：视频自己先挂着 hidden（要等首帧画出来才亮），
  // display:none 的元素没有盒子，交叉观察永远返回"不可见"，会变成死锁；
  // 所以观察有实际高度的外层容器。
  const autoplayVideoTargets = new Map();

  // 元素渲染时地址可能还没签名；每次扫描/进入视口时按路径再解析一次
  function resolveAutoplayVideoSources(video) {
    if (!video.getAttribute('src')) {
      const path = video.getAttribute('data-autoplay-path') || '';
      const url = path ? (state.libraryPreviewUrls[path] || '') : '';
      if (!url) return false;
      video.src = url;
    }
    if (!video.getAttribute('poster')) {
      const posterPath = video.getAttribute('data-autoplay-poster-path') || '';
      const posterUrl = posterPath ? (state.libraryPreviewUrls[posterPath] || '') : '';
      if (posterUrl) video.poster = posterUrl;
    }
    return true;
  }

  function playAutoplayVideo(video) {
    if (!video.isConnected) return;
    if (resolveAutoplayVideoSources(video)) {
      const started = video.play();
      if (started && started.catch) started.catch(function() {});
      return;
    }
    // 地址缺失（签名超 50 分钟被清理、或这一批还没签过）：过去只是静默放弃，
    // 卡在静态首帧再也不重试。这里当场补签一次再播；autoplaySignQueued 防止反复循环。
    if (video.dataset.autoplaySignQueued || !state.supabase) return;
    video.dataset.autoplaySignQueued = '1';
    const paths = [video.getAttribute('data-autoplay-path'), video.getAttribute('data-autoplay-poster-path')].filter(Boolean);
    if (!paths.length) return;
    void signLibraryPreviewUrls(paths).then(function() {
      if (!video.isConnected || video.getAttribute('src')) return;
      if (resolveAutoplayVideoSources(video)) {
        const started = video.play();
        if (started && started.catch) started.catch(function() {});
      }
    }).catch(function() { /* 补签失败：保持静态首帧，等下一次扫描 */ });
  }

  function pauseAutoplayVideo(video) {
    try { video.pause(); } catch (error) { /* 未挂载 */ }
  }

  // 首帧真正画出来之后再把视频亮出来：在它下面留着图片，避免出现白屏闪烁
  function revealAutoplayVideo(video) {
    if (video.hidden) video.hidden = false;
    const holder = video.parentElement;
    const img = holder ? holder.querySelector('img') : null;
    if (img) img.style.opacity = '0';
    // 底下的 img 可能永远加载不出来（大 GIF 原图回退失败）：视频既然有画面，
    // 占位底必须同步撤掉，否则灰底从视频 letterbox 边缘一直露着，看着像卡住+扫光。
    const shell = holder && holder.classList && holder.classList.contains('library-preview-shell') ? holder : (holder ? holder.closest('.library-preview-shell') : null);
    if (shell) {
      shell.classList.remove('is-preview-loading', 'is-preview-error');
      shell.classList.add('is-preview-ready', 'img-loaded');
    }
  }

  function observeAutoplayVideo(video) {
    if (autoplayVideoTargets.has(video)) return;
    const watched = video.parentElement || video;
    autoplayVideoTargets.set(video, watched);
    video.addEventListener('playing', function() { revealAutoplayVideo(video); });
    if (autoplayVideoObserver) autoplayVideoObserver.observe(watched);
    else playAutoplayVideo(video);
  }

  // IO 的目标是容器，回调里再找回里面的循环视频
  function autoplayVideoOf(entryTarget) {
    if (!entryTarget || typeof entryTarget.querySelector !== 'function') return null;
    if (entryTarget.tagName === 'VIDEO') return entryTarget;
    return entryTarget.querySelector('video[data-autoplay-path]');
  }

  function registerAutoplayVideos(scope) {
    const root = scope || document;
    if (!root || typeof root.querySelectorAll !== 'function') return;
    if (typeof IntersectionObserver === 'function' && !autoplayVideoObserver) {
      autoplayVideoObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          const video = autoplayVideoOf(entry.target);
          if (!video || !video.isConnected) return;
          video.dataset.autoplayVisible = entry.isIntersecting ? '1' : '0';
          if (entry.isIntersecting) playAutoplayVideo(video);
          else pauseAutoplayVideo(video);
        });
      }, { rootMargin: '200px 0px' });
    }
    autoplayVideoTargets.forEach(function(watched, video) {
      // 卡片会被整块重建：把已脱离文档的视频从观察列表里摘掉
      if (!video.isConnected) {
        pauseAutoplayVideo(video);
        if (autoplayVideoObserver) autoplayVideoObserver.unobserve(watched);
        autoplayVideoTargets.delete(video);
        return;
      }
      // 在视口里但还没拿到地址的（签名刚完成），这次扫描补上
      if (video.dataset.autoplayVisible === '1' && !video.getAttribute('src')) playAutoplayVideo(video);
    });
    root.querySelectorAll('video[data-autoplay-path]').forEach(observeAutoplayVideo);
  }

  function scheduleAutoplayVideoSweep() {
    if (autoplayVideoSweepTimer) return;
    autoplayVideoSweepTimer = window.setTimeout(function() {
      autoplayVideoSweepTimer = 0;
      registerAutoplayVideos(document);
    }, 120);
  }

  // 封面视频（MP4 直传 / GIF 转码产物）统一走视口自动播放通道（is-auto + data-autoplay-path），
  // 悬停播放逻辑已移除；下面仅保留地址查询辅助。
  window.__vfCaseUrl = function(path) { return state.libraryPreviewUrls[path] || ''; };
  function hideCaseHoverPop() {
    clearTimeout(casePopTimer);
    casePopTimer = setTimeout(function() {
      const pop = document.getElementById('case-hover-pop');
      if (pop) pop.style.display = 'none';
    }, 180);
  }
  if (!window.caseHoverBound) {
    window.caseHoverBound = true;
    // 浮窗 pointer-events: none，事件永远到不了它身上；鼠标移到被浮窗盖住的
    // 卡片上时直接换成那张卡片的内容
    document.addEventListener('mouseover', function(event) {
      const card = event.target.closest('.library-case-card');
      if (card) { showCaseHoverPop(card, card.getAttribute('data-case-project')); return; }
      hideCaseHoverPop();
    });
  }

  function renderCaseProjectCard(item) {
    const source = item.source;
    const materials = caseMaterialsOf(source);
    const selected = state.librarySelectedPreviewId === item.preview.id;
    const favorite = state.libraryFavorites.has(item.preview.id);
    // MP4 直传封面与 GIF 转码产物一样：进视口就无声循环播放，出视口暂停
    const coverIsVideo = String(item.preview.preview_mime_type || '').toLowerCase().startsWith('video/');
    const coverGifVideo = coverIsVideo ? null : libraryGifVideoForPreview(item.preview, source);
    return `
      <article class="library-card library-case-card${selected ? ' selected' : ''}" data-preview-id="${item.preview.id}" data-case-project="${escapeAttr(source.id)}" tabindex="0" onmouseenter="window.__casePopShow && window.__casePopShow(this)" onmouseleave="window.__casePopHide && window.__casePopHide()">
        <div class="library-thumb-wrap">
          <div class="library-thumb" style="${previewAspectStyle(item.preview)}"><img${libraryCardImgSrcAttr(item)} alt="${escapeAttr(source.title)}" loading="lazy" decoding="async" class="lazy-img library-progressive-image">${coverIsVideo ? `<video class="case-cover-video is-auto" data-autoplay-path="${escapeAttr(item.preview.preview_path)}" muted loop playsinline preload="none" hidden></video>` : ''}${coverGifVideo ? `<video class="case-cover-video is-auto" data-autoplay-path="${escapeAttr(coverGifVideo.video)}"${coverGifVideo.poster ? ` data-autoplay-poster-path="${escapeAttr(coverGifVideo.poster)}"` : ''} muted loop playsinline preload="none" hidden></video>` : ''}</div>
          <div class="library-card-icons">
            <button class="favorite-btn ${favorite ? 'active' : ''}" type="button" data-action="favorite" title="${state.lang === 'zh' ? '收藏' : 'Favorite'}" aria-label="${state.lang === 'zh' ? '收藏' : 'Favorite'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"/></svg></button>
          </div>
          <div class="case-card-overlay">
            <strong>${escapeHtml(source.title)}</strong>
            <div class="case-card-chips">
              ${source.country_id ? `<span class="case-chip">${escapeHtml(optionNameById(source.country_id))}</span>` : ''}
              ${source.activity_id ? `<span class="case-chip">${escapeHtml(optionNameById(source.activity_id))}</span>` : ''}
              <span class="case-card-count">${state.lang === 'zh' ? materials.length + ' 个物料' : materials.length + ' materials'}</span>
            </div>
          </div>
        </div>
      </article>`;
  }

  // 编辑项目信息：与上传表单同构，预填当前值，按钮为「保存编辑」
  function openCaseProjectEdit(source, callbacks) {
    const onClose = (callbacks && callbacks.onClose) || null;
    const onSaved = (callbacks && callbacks.onSaved) || null;
    const chipPrefill = caseChipSelectionOf(source);
    const backdrop = document.createElement('div');
    backdrop.id = 'case-edit-backdrop';
    backdrop.className = 'case-project-backdrop';
    backdrop.innerHTML = `
      <div class="case-project-modal case-edit-modal" role="dialog" aria-modal="true">
        <header class="case-project-head">
          <div class="case-project-head-left">
            <div class="case-project-titlewrap">
              <div class="case-title-row"><h2>${state.lang === 'zh' ? '编辑项目信息' : 'Edit Project'}</h2></div>
              <div class="case-project-sub"><span>${state.lang === 'zh' ? '修改后会立即更新，图片物料不受影响' : 'Changes apply immediately; image materials are unaffected.'}</span></div>
            </div>
          </div>
          <div class="case-head-actions"><button type="button" class="icon-btn" data-edit-close aria-label="${state.lang === 'zh' ? '关闭' : 'Close'}"><svg viewBox="0 0 16 16" width="15" height="15"><path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        </header>
        <div class="case-edit-body">
          <label><span>${state.lang === 'zh' ? '项目名称' : 'Project Name'}</span><input name="title" maxlength="120" value="${escapeAttr(source.title || '')}"></label>
          <div class="case-tag-bar" data-case-edit-bar>${renderCaseTagBar(chipPrefill)}</div>
          <div class="library-form-grid library-form-grid-owner">
            <label class="case-field-secondary"><span>${state.lang === 'zh' ? '物料所有者' : 'Material Owner'}</span>${renderOwnerCombobox({ value: source.owner_name || '', contact: source.owner_contact || '', inputId: 'case-edit-owner' })}</label>
            <label class="case-field-secondary"><span>${state.lang === 'zh' ? '项目链接' : 'Project Link'}</span><input name="project_link" maxlength="500" value="${escapeAttr(source.project_note || '')}"></label>
            <label class="case-field-secondary"><span>${state.lang === 'zh' ? '下载链接' : 'Download Link'}</span><input name="download_link" maxlength="500" value="${escapeAttr(source.download_link || '')}"></label>
          </div>
        </div>
        <footer class="case-project-foot">
          <div class="case-foot-actions">
            <button type="button" class="case-secondary-btn" data-edit-close>${state.lang === 'zh' ? '取消' : 'Cancel'}</button>
            <button type="button" class="case-primary-btn" data-edit-save>${state.lang === 'zh' ? '保存编辑' : 'Save Changes'}</button>
          </div>
        </footer>
      </div>`;
    document.body.append(backdrop);
    wireOwnerCombobox(backdrop);
    wireCaseTagBar(backdrop.querySelector('[data-case-edit-bar]'));
    applyCaseTagBarSelections(backdrop.querySelector('[data-case-edit-bar]'), chipPrefill);
    backdrop.addEventListener('click', async function(event) {
      if (event.target === backdrop || event.target.closest('[data-edit-close]')) { backdrop.remove(); if (onClose) onClose(); return; }
      const saveBtn = event.target.closest('[data-edit-save]');
      if (!saveBtn) return;
      const value = sel => String((backdrop.querySelector(sel) || {}).value || '').trim();
      const title = value('[name="title"]');
      if (!title) { alert(state.lang === 'zh' ? '请填写项目名称。' : 'Project name is required.'); return; }
      saveBtn.disabled = true;
      saveBtn.textContent = state.lang === 'zh' ? '保存中...' : 'Saving...';
      const chipSel = (backdrop.querySelector('[data-case-edit-bar]') || {})._caseTagSel || {};
      // v868：保存前先读库里最新的 tags/country/activity 做基底——页面内存可能是旧数据
      // （别的端或别的窗口刚写过），拿旧引用整组写回会把新标签抹掉
      let base = source;
      try {
        const fresh = await state.supabase.from('vf_source_files').select('tags,country_id,activity_id').eq('id', source.id).maybeSingle();
        if (fresh && !fresh.error && fresh.data) {
          base = Object.assign({}, source, {
            tags: Array.isArray(fresh.data.tags) ? fresh.data.tags : (source.tags || []),
            country_id: fresh.data.country_id,
            activity_id: fresh.data.activity_id
          });
        }
      } catch (_e) { /* 读不到就用内存基底：序列化内部还有空选择态保险 */ }
      // v858：标签序列化抽成 caseTagSelectionUpdatePayload（与详情弹窗快捷编辑共用），
      // 基底取现有 tags 原样（含 vf: 标记），只摘掉标签一/六类标签值再按当前选择重填
      const payload = caseTagSelectionUpdatePayload(base, chipSel);
      state.supabase.from('vf_source_files').update({
        title: title,
        country_id: payload.country_id || null,
        activity_id: payload.activity_id || null,
        tags: payload.tags,
        owner_name: value('[name="owner_name"]'),
        owner_contact: value('[name="owner_contact"]'),
        project_note: value('[name="project_link"]'),
        download_link: value('[name="download_link"]')
      }).eq('id', source.id).then(function(result) {
        if (result.error) throw result.error;
        source.tags = payload.tags;
        source.country_id = payload.country_id || null;
        source.activity_id = payload.activity_id || null;
        backdrop.remove();
        if (onSaved) onSaved();
      }).catch(function(error) {
        alert(error.message || (state.lang === 'zh' ? '保存失败，请重试' : 'Save failed. Please retry.'));
        saveBtn.disabled = false;
        saveBtn.textContent = state.lang === 'zh' ? '保存编辑' : 'Save Changes';
      });
    });
  }

  function showCaseToast(text, duration) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;pointer-events:none;opacity:0;transition:opacity 0.25s ease;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    toast.textContent = text;
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.style.opacity = '1'; });
    setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 400); }, duration || 2200);
  }
  function showCaseDeleteToast(count) { showCaseToast(count && count > 1 ? (state.lang === 'zh' ? ('已删除 ' + count + ' 张物料') : ('Deleted ' + count + ' material(s)')) : (state.lang === 'zh' ? '已删除该物料' : 'Deleted this material')); }
  function showCaseAppendToast(count) { showCaseToast(state.lang === 'zh' ? ('已追加 ' + count + ' 张物料') : ('Added ' + count + ' material(s)'), 2600); }

  let caseProjectKeyHandler = null;
  function openCaseProjectModal(sourceId, focusType) {
    const requestedSource = state.librarySources.find(s => s.id === sourceId);
    if (!requestedSource) return;
    const source = canonicalCaseProjectSource(requestedSource);
    sourceId = source.id;
    closeCaseProjectModal();
    const materials = caseMaterialsOf(source);
    if (!materials.length) return;
    const tabValue = focusType || (caseMaterialTypeSet(state.libraryFilters.tag2 || 'all') ? state.libraryFilters.tag2 : 'all');
    const pick = caseCoverFor(source, tabValue) || { cover: materials[0], group: materials };
    const canManage = canManageSource(source);
    // 预热使用者名单：老素材可能只存了姓名/或把编号当姓名存，联系时要靠名单解析出真正的大象编号
    void loadTeamMembers().catch(function() {});
    const owner = source.owner_name || '';
    // 大象编号（v666 起「联系所有者」复制的就是它；姓名只作展示与索引）
    const ownerContact = source.owner_contact || '';
    // v858：缩略图按「同尺寸 + 名字贴近」聚拢排序展示（两个系列的开屏不再交错）；
    // stage 左右切换也用同一顺序，与网格一致
    const sideCardDefs = caseSortedMaterialDefs(materials.map(function(p) {
      const filename = String(p.preview_filename || '');
      return {
        id: p.id,
        url: state.libraryPreviewUrls[p.preview_path] || '',
        filename: String(p.preview_filename || ''),
        material: p,
        type: p.material_type || (state.lang === 'zh' ? '未分类' : 'Unclassified'),
        dims: p.width && p.height ? p.width + ' × ' + p.height : '',
        ratio: p.width && p.height ? p.height / p.width : 1.4,
        lang: caseMaterialLanguage(p)
      };
    }));
    const backdrop = document.createElement('div');
    backdrop.id = 'case-project-backdrop';
    backdrop.className = 'case-project-backdrop';
    backdrop.innerHTML = `
      <div class="case-project-modal" role="dialog" aria-modal="true">
        <header class="case-project-head">
          <div class="case-project-head-left">
            <button type="button" class="icon-btn case-back-btn" data-case-action="back" aria-label="${state.lang === 'zh' ? '返回' : 'Back'}"><svg viewBox="0 0 16 16" width="15" height="15"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <div class="case-project-titlewrap">
              <div class="case-title-row">
                <h2>${escapeHtml(source.title)}</h2>
              </div>
              <div class="case-project-sub">
                <span>${escapeHtml(source.updated_at ? formatDate(source.updated_at) : '')}</span>
                ${source.project_note ? `<span class="case-dot">·</span><a class="case-project-link" href="${escapeAttr(source.project_note)}" target="_blank" rel="noopener">${state.lang === 'zh' ? '项目链接' : 'Project Link'} ↗</a>` : ''}
              </div>
              <div class="case-owner-line">${owner ? `${state.lang === 'zh' ? '源文件请联系' : 'For the source file, contact'} <b>${escapeHtml(owner)}</b>${ownerContact ? (state.lang === 'zh' ? `（大象 ${escapeHtml(ownerContact)}）` : ` (Daxiang ${escapeHtml(ownerContact)})`) : ''}` : (state.lang === 'zh' ? '源文件未上传' : 'Source file not uploaded')}</div>
            </div>
          </div>
          <div class="case-head-actions">
            ${canManage ? `<button type="button" class="icon-btn" id="case-more-btn" aria-label="${state.lang === 'zh' ? '更多操作' : 'More actions'}">⋯</button>` : ''}
            <button type="button" class="icon-btn case-project-close" aria-label="${state.lang === 'zh' ? '关闭' : 'Close'}"><svg viewBox="0 0 16 16" width="15" height="15"><path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          </div>
        </header>
        <div class="case-project-body">
          <section class="case-stage-card">
            <div class="case-stage-row">
              <button type="button" class="case-nav-btn" data-case-nav="-1" aria-label="${state.lang === 'zh' ? '上一张' : 'Previous'}">‹</button>
              <div class="case-stage" id="case-stage"></div>
              <button type="button" class="case-nav-btn" data-case-nav="1" aria-label="${state.lang === 'zh' ? '下一张' : 'Next'}">›</button>
            </div>
            <button type="button" class="case-expand-btn" id="case-expand-btn" aria-label="${state.lang === 'zh' ? '全屏查看' : 'Fullscreen'}"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M6 2H2v4M10 14h4v-4M14 6V2h-4M2 10v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
            <div class="case-stage-info" id="case-stage-info"></div>
          </section>
          <aside class="case-side">
            <div class="case-side-head">
              <span class="case-side-title">${state.lang === 'zh' ? '素材' : 'Materials'} <b>${materials.length}</b></span>
              <div class="case-side-tools">
                <button type="button" class="case-icon-btn" id="case-layout-btn" title="切换布局">${CASE_LAYOUT_ICONS.grid2}</button>
                <button type="button" class="case-icon-btn case-icon-btn-wide" id="case-lang-btn" title="按语言筛选（依据文件名）">${state.lang === 'zh' ? '全部' : 'All'}</button>
                ${canManage ? `<button type="button" class="case-icon-btn" id="case-select-btn" title="多选（批量改类型 / 删除）">${CASE_SELECT_ICON}</button>` : ''}
              </div>
            </div>
            <div class="case-side-grid" id="case-side-grid"></div>
            ${canManage ? `<div class="case-select-bar" id="case-select-bar" hidden>
              <span class="case-select-count" id="case-select-count"></span>
              <button type="button" class="case-tool-btn" id="case-select-all"></button>
              <button type="button" class="case-tool-btn" id="case-select-type">${state.lang === 'zh' ? '改类型' : 'Change Type'}</button>
              <button type="button" class="case-tool-btn is-danger" id="case-select-delete">${state.lang === 'zh' ? '删除' : 'Delete'}</button>
              <button type="button" class="case-tool-btn" id="case-select-exit">${state.lang === 'zh' ? '退出' : 'Exit'}</button>
            </div>` : ''}
          </aside>
        </div>
        <footer class="case-project-foot">
          <div class="case-foot-line">
            <div class="case-foot-tags" id="case-foot-tags">${caseFootTagsHtml(source)}</div>
            ${canManage ? `<div class="case-foot-tools"><button type="button" class="case-foot-tool-btn" id="case-foot-add-tag" title="${state.lang === 'zh' ? '点击标签即时保存到云端' : 'Click a tag to save instantly'}">＋ ${state.lang === 'zh' ? '标签' : 'Tags'}</button><button type="button" class="case-foot-tool-btn" id="case-foot-ai-tag" title="${state.lang === 'zh' ? 'AI 识别画面元素并建议标签' : 'AI suggests tags from the cover'}">${state.lang === 'zh' ? 'AI 识别' : 'AI Tags'}</button></div>` : ''}
          </div>
          <div class="case-foot-actions">
            <button type="button" class="case-secondary-btn" id="case-download-all">${state.lang === 'zh' ? '下载图片物料' : 'Download Images'}</button>
            <button type="button" class="case-primary-btn" id="case-download-source" ${String(source.download_link || '').trim() ? '' : 'disabled title="当前无下载链接，请联系所有者"'}>${state.lang === 'zh' ? '下载源文件' : 'Download Source'}</button>
            <button type="button" class="case-orange-btn" id="case-contact-btn">${state.lang === 'zh' ? '联系所有者' : 'Contact Owner'}</button>
          </div>
        </footer>
        <div class="case-drop-veil" id="case-drop-veil" aria-hidden="true">
          <div class="case-drop-veil-box">
            <span class="case-drop-veil-icon">${CLOUD_UPLOAD_ICON}</span>
            <strong>${state.lang === 'zh' ? '松开即可追加物料' : 'Release to add materials'}</strong>
            <small>${state.lang === 'zh' ? '支持 JPG / PNG / WEBP / GIF / MP4 / MOV' : 'JPG / PNG / WEBP / GIF / MP4 / MOV supported'}</small>
          </div>
        </div>
        <div class="case-append-progress" id="case-append-progress" hidden><span class="case-spinner" aria-hidden="true"></span><span id="case-append-progress-text">${state.lang === 'zh' ? '正在追加…' : 'Adding…'}</span><span class="case-append-bar" aria-hidden="true"><span class="case-append-bar-fill" id="case-append-progress-fill"></span></span></div>
        <input type="file" id="case-append-input" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.gif,.mp4,.mov,.webm" multiple hidden>
        ${canManage ? `<div class="case-more-menu" id="case-more-menu" hidden><button type="button" id="case-append-btn">＋ ${state.lang === 'zh' ? '追加物料' : 'Add Materials'}</button><button type="button" id="case-edit-btn">✎ ${state.lang === 'zh' ? '编辑信息' : 'Edit Info'}</button><button type="button" class="danger" id="case-delete-btn">${state.lang === 'zh' ? '删除项目' : 'Delete Project'}</button></div>` : ''}
      </div>`;
    document.body.append(backdrop);
    document.body.style.overflow = 'hidden';
    let currentId = pick.cover.id;
    const current = () => materials.find(m => m.id === currentId) || materials[0];
    const renderStage = function(p) {
      const stage = backdrop.querySelector('#case-stage');
      if (!stage || !p) return;
      const url = state.libraryPreviewUrls[p.preview_path] || '';
      const isVideo = String(p.preview_mime_type || '').toLowerCase().startsWith('video/');
      stage.innerHTML = isVideo
        ? '<video src="' + escapeAttr(url) + '" autoplay loop muted playsinline controls></video>'
        : '<img src="' + escapeAttr(url) + '" alt="">';
    };
    const show = function(previewId) {
      const p = materials.find(m => m.id === previewId);
      if (!p) return;
      currentId = p.id;
      renderStage(p);
      const stageInfo = backdrop.querySelector('#case-stage-info');
      if (stageInfo) {
        stageInfo.textContent = [
          p.width && p.height ? p.width + ' × ' + p.height : '',
          String(fileExt(p.preview_filename || '') || p.preview_mime_type || '').toUpperCase(),
          formatFileSize(p.preview_size_bytes)
        ].filter(Boolean).join('  ·  ');
      }
      backdrop.querySelectorAll('.case-side-card').forEach(cardEl => {
        const active = cardEl.getAttribute('data-case-side') === p.id;
        cardEl.classList.toggle('active', active);
      });
    };
    const step = function(delta) {
      const ordered = sideCardDefs.map(function(def) { return def.material; });
      const idx = ordered.findIndex(m => m.id === currentId);
      show(ordered[(idx + delta + ordered.length) % ordered.length].id);
    };
    show(currentId);
    void signVisibleLibraryUrls(materials.map(p => ({ source: source, preview: p }))).then(function() {
      renderStage(current());
      renderSideGrid();
    });
    let caseSideMode = 'grid2';
    let caseSideLang = 'all';
    // 多选（批量改类型/删除）：默认不开，开了才在卡片上出勾选框、底部才出操作条
    let caseSelectMode = false;
    const caseSelected = new Set();
    const sideCardInner = function(def) {
      const label = def.filename || def.type;
      // 左上角常显所属类型（改类型/换端识别后一眼能看到），未分类走灰色
      const typeChip = `<span class="case-side-type${def.type && def.type !== '未分类' ? '' : ' untyped'}" data-case-side-type>${escapeHtml(def.type || '未分类')}</span>`;
      // 多选模式下右上角出勾选框（此时隐藏单张删除按钮，避免同一角落两个按钮打架）
      const selectBox = caseSelectMode ? `<span class="case-side-check${caseSelected.has(def.id) ? ' is-on' : ''}" aria-hidden="true"></span>` : '';
      return `<div class="case-side-imgwrap" title="${escapeAttr(def.type)}${def.dims ? ' · ' + escapeAttr(def.dims) : ''}">${casePreviewMedia(def.material, source)}${typeChip}${selectBox}<div class="case-side-overlay"><span>${escapeHtml(label)}</span></div>${canManage && !caseSelectMode ? `<button type="button" class="case-side-del" data-case-del="${def.id}" title="${state.lang === 'zh' ? '删除这张物料' : 'Delete'}">×</button>` : ''}</div>`;
    };
    // 当前列表里实际显示的条目（受语言筛选影响）：多选「全选」也只选看得见的
    const visibleSideDefs = function() {
      return sideCardDefs.filter(function(def) {
        if (caseSideLang === 'en' || caseSideLang === 'ar') return !def.lang || def.lang === caseSideLang;
        return true;
      });
    };
    const renderSideGrid = function() {
      const gridEl = backdrop.querySelector('#case-side-grid');
      if (!gridEl) return;
      gridEl.className = 'case-side-grid view-' + caseSideMode + (caseSelectMode ? ' is-selecting' : '');
      // 重画时记住滚动位置：改类型/设为封面/重命名都会重画，之前会把列表弹回顶部，
      // 用户刚看的那张图就找不到了
      const keepScrollTop = gridEl.scrollTop;
      gridEl.innerHTML = '';
      const defs = visibleSideDefs();
      if (!defs.length) {
        const empty = document.createElement('div');
        empty.className = 'case-side-empty';
        empty.textContent = state.lang === 'zh' ? (caseSideLang === 'en' ? '没有英语物料' : caseSideLang === 'ar' ? '没有阿语物料' : '还没有物料') : (caseSideLang === 'en' ? 'No English materials' : caseSideLang === 'ar' ? 'No Arabic materials' : 'No materials yet');
        gridEl.append(empty);
        return;
      }
      if (caseSideMode === 'list') {
        defs.forEach(function(def) {
          const row = document.createElement('div');
          row.className = 'case-side-row' + (caseSelectMode && caseSelected.has(def.id) ? ' is-selected' : '');
          row.setAttribute('data-case-side', def.id);
          row.innerHTML = sideCardInner(def) + `<div class="case-side-rowmeta"><span class="case-side-file">${escapeHtml(def.filename || def.type)}</span><span class="case-side-type-text">${escapeHtml(def.type || '未分类')}</span>${def.dims ? `<span class="case-side-dims">${escapeHtml(def.dims)}</span>` : ''}</div>`;
          gridEl.append(row);
        });
        gridEl.scrollTop = keepScrollTop;
        return;
      }
      const colCount = caseSideMode === 'grid4' ? 4 : 2;
      const width = gridEl.clientWidth || 320;
      const columns = [];
      for (let i = 0; i < colCount; i++) {
        const col = document.createElement('div');
        col.className = 'case-side-col';
        gridEl.append(col);
        columns.push({ el: col, height: 0 });
      }
      const colWidth = (width - 10 * (colCount - 1)) / colCount;
      // 比例排序：尺寸相同的物料相邻聚拢，视觉不错位
      const ordered = defs.slice().sort(function(a, b) { return a.ratio - b.ratio; });
      ordered.forEach(function(def) {
        const col = columns.reduce(function(a, b) { return a.height <= b.height ? a : b; });
        const card = document.createElement('div');
        card.className = 'case-side-card' + (caseSelectMode && caseSelected.has(def.id) ? ' is-selected' : '');
        card.setAttribute('data-case-side', def.id);
        card.innerHTML = sideCardInner(def);
        col.el.append(card);
        col.height += colWidth * def.ratio + 30;
      });
      gridEl.scrollTop = keepScrollTop;
    };
    requestAnimationFrame(renderSideGrid);
    const layoutBtn = backdrop.querySelector('#case-layout-btn');
    if (layoutBtn) layoutBtn.onclick = function(event) {
      event.stopPropagation();
      caseSideMode = caseSideMode === 'grid2' ? 'grid4' : caseSideMode === 'grid4' ? 'list' : 'grid2';
      layoutBtn.innerHTML = CASE_LAYOUT_ICONS[caseSideMode];
      layoutBtn.title = caseSideMode === 'grid2' ? '切换为四列' : caseSideMode === 'grid4' ? '切换为列表' : '切换为两列';
      renderSideGrid();
    };
    const langBtn = backdrop.querySelector('#case-lang-btn');
    if (langBtn) langBtn.onclick = function(event) {
      event.stopPropagation();
      caseSideLang = caseSideLang === 'all' ? 'en' : caseSideLang === 'en' ? 'ar' : 'all';
      langBtn.textContent = caseSideLang === 'all' ? (state.lang === 'zh' ? '全部' : 'All') : caseSideLang.toUpperCase();
      renderSideGrid();
    };
    // ── 多选：批量改类型 / 批量删除 ─────────────────────────────────
    // 只在 side 头部放一个「多选」小按钮；选中后底部才出现一条操作条，平时不占位置。
    const selectBtn = backdrop.querySelector('#case-select-btn');
    const selectBar = backdrop.querySelector('#case-select-bar');
    const selectCountEl = backdrop.querySelector('#case-select-count');
    const selectAllBtn = backdrop.querySelector('#case-select-all');
    const selectTypeBtn = backdrop.querySelector('#case-select-type');
    const selectDelBtn = backdrop.querySelector('#case-select-delete');
    const updateCaseSelectBar = function() {
      if (!selectBar) return;
      const count = caseSelected.size;
      const total = visibleSideDefs().length;
      if (selectCountEl) selectCountEl.textContent = count ? (state.lang === 'zh' ? ('已选 ' + count + ' 张') : (count + ' selected')) : (state.lang === 'zh' ? '点物料图选中' : 'Click a material to select');
      if (selectAllBtn) selectAllBtn.textContent = (count && count >= total) ? (state.lang === 'zh' ? '取消全选' : 'Deselect all') : (state.lang === 'zh' ? '全选' : 'Select all');
      if (selectTypeBtn) selectTypeBtn.disabled = !count;
      if (selectDelBtn) selectDelBtn.disabled = !count;
    };
    const setCaseSelectMode = function(on) {
      caseSelectMode = !!on;
      caseSelected.clear();
      if (selectBtn) selectBtn.classList.toggle('active', caseSelectMode);
      if (selectBar) selectBar.hidden = !caseSelectMode;
      const side = backdrop.querySelector('.case-side');
      if (side) side.classList.toggle('is-selecting', caseSelectMode);
      renderSideGrid();
      updateCaseSelectBar();
    };
    // 只改这一张卡的勾选样式：不整块重画，滚动位置和已加载的图都不受影响
    const toggleCaseSelected = function(previewId) {
      const on = !caseSelected.has(previewId);
      if (on) caseSelected.add(previewId); else caseSelected.delete(previewId);
      const card = backdrop.querySelector('[data-case-side="' + CSS.escape(previewId) + '"]');
      if (card) {
        card.classList.toggle('is-selected', on);
        const box = card.querySelector('.case-side-check');
        if (box) box.classList.toggle('is-on', on);
      }
      updateCaseSelectBar();
    };
    if (selectBtn) selectBtn.onclick = function(event) { event.stopPropagation(); setCaseSelectMode(!caseSelectMode); };
    if (selectAllBtn) selectAllBtn.onclick = function(event) {
      event.stopPropagation();
      const defs = visibleSideDefs();
      const allOn = defs.length > 0 && defs.every(function(def) { return caseSelected.has(def.id); });
      caseSelected.clear();
      if (!allOn) defs.forEach(function(def) { caseSelected.add(def.id); });
      renderSideGrid();
      updateCaseSelectBar();
    };
    const selectExitBtn = backdrop.querySelector('#case-select-exit');
    if (selectExitBtn) selectExitBtn.onclick = function(event) { event.stopPropagation(); setCaseSelectMode(false); };
    // 批量改类型：类型从一个贴着操作条的浮窗里选（不额外占按钮位）
    const setMaterialTypeOf = function(previewId, nextType) {
      const material = materials.find(item => item.id === previewId);
      if (material) material.material_type = nextType;
      const def = sideCardDefs.find(item => item.id === previewId);
      if (def) def.type = nextType || '未分类';
      const row = state.libraryPreviews.find(item => item.id === previewId);
      if (row) row.material_type = nextType;
    };
    // 批量改类型：先记本机待写入（刷新打断也能补），成功再删
    const applyCaseBatchType = function(nextType) {
      const ids = caseSelected.size ? Array.from(caseSelected) : [];
      if (!ids.length) return;
      const before = ids.map(function(id) {
        const material = materials.find(item => item.id === id);
        return { id: id, type: (material && material.material_type) || '' };
      });
      ids.forEach(function(id) { setMaterialTypeOf(id, nextType); });
      renderSideGrid();
      updateCaseSelectBar();
      ids.forEach(function(id) { queuePreviewWrite(id, { material_type: nextType || '' }); });
      state.supabase.from('vf_asset_previews').update({ material_type: nextType || '' }).in('id', ids).select('id').then(function(result) {
        if (result && result.error) {
          ids.forEach(function(id) { clearPreviewWrite(id); });
          before.forEach(function(item) { setMaterialTypeOf(item.id, item.type); });
          renderSideGrid();
          alert(state.lang === 'zh' ? ('批量改类型失败：' + result.error.message) : ('Batch type change failed: ' + result.error.message));
          return;
        }
        const written = Array.isArray(result && result.data) ? result.data.length : 0;
        if (written >= ids.length) {
          ids.forEach(function(id) { clearPreviewWrite(id); });
          markCaseManualTypes(source, ids);
          // v867：批量改类型成功后自动清空这批选择（多选模式保持开启），直接就能点选下一批
          caseSelected.clear();
          renderSideGrid();
          updateCaseSelectBar();
          showCaseToast(state.lang === 'zh' ? ('已把 ' + ids.length + ' 张改为「' + (nextType || '未分类') + '」') : ('Changed ' + ids.length + ' to "' + (nextType || 'Unclassified') + '"'));
          return;
        }
        // 有没写进去的：留在待写入清单里下次补，并把没写成的那些回滚到原值
        const writtenIds = new Set((result && result.data || []).map(function(row) { return row.id; }));
        markCaseManualTypes(source, Array.from(writtenIds));
        before.forEach(function(item) {
          if (writtenIds.has(item.id)) { clearPreviewWrite(item.id); return; }
          setMaterialTypeOf(item.id, item.type);
        });
        // v867：写库成功的那部分自动取消选中，失败的那些保持选中方便重试
        writtenIds.forEach(function(id) { caseSelected.delete(id); });
        renderSideGrid();
        updateCaseSelectBar();
        showCaseToast(state.lang === 'zh' ? ('有 ' + (ids.length - written) + ' 张没写进数据库，刷新后会自动重试') : ((ids.length - written) + ' not saved to DB, will auto-retry on refresh'), 3600);
      }).catch(function(error) {
        before.forEach(function(item) { setMaterialTypeOf(item.id, item.type); });
        renderSideGrid();
        alert(state.lang === 'zh' ? ('批量改类型失败：' + ((error && error.message) || '请重试')) : ('Batch type change failed: ' + ((error && error.message) || 'Please retry')));
      });
    };
    const openCaseBatchTypeMenu = function() {
      const anchor = selectTypeBtn;
      const stale = document.getElementById('case-batch-type-menu');
      if (stale) stale.remove();
      if (!anchor || !caseSelected.size) return;
      const menu = document.createElement('div');
      menu.id = 'case-batch-type-menu';
      menu.className = 'case-type-menu';
      menu.innerHTML = [''].concat(materialCatalogTypeNames(sourcePlatformOf(source))).map(function(value) {
        return '<button type="button" data-batch-type-value="' + escapeAttr(value) + '">' + escapeHtml(value || '未分类') + '</button>';
      }).join('');
      document.body.append(menu);
      const rect = anchor.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(rect.left - 40, window.innerWidth - 170)) + 'px';
      menu.style.top = Math.max(8, rect.top - menu.offsetHeight - 8) + 'px';
      const close = function() { menu.remove(); document.removeEventListener('click', close); };
      menu.addEventListener('click', function(menuEvent) {
        const btn = menuEvent.target.closest('[data-batch-type-value]');
        if (!btn) return;
        menuEvent.stopPropagation();
        const next = btn.getAttribute('data-batch-type-value');
        close();
        applyCaseBatchType(next);
      });
      setTimeout(function() { document.addEventListener('click', close); }, 0);
    };
    if (selectTypeBtn) selectTypeBtn.onclick = function(event) { event.stopPropagation(); openCaseBatchTypeMenu(); };
    if (selectDelBtn) selectDelBtn.onclick = function(event) {
      event.stopPropagation();
      const n = caseSelected.size;
      deleteCaseMaterials(Array.from(caseSelected), state.lang === 'zh' ? ('删除选中的 ' + n + ' 张物料？此操作不能撤销。') : ('Delete ' + n + ' selected material(s)? This cannot be undone.'));
    };

    // 删除物料（单张走右上角 ×，多张走底部操作条）：乐观移除 → 删存储 → 删行 → 失败整批回滚
    const deleteCaseMaterials = function(ids, confirmText) {
      const idList = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
      const targets = idList.map(function(id) { return materials.find(m => m.id === id); }).filter(Boolean);
      if (!targets.length) return;
      if (!window.confirm(confirmText)) return;
      caseSelected.clear();
      const removedSnapshot = { defs: sideCardDefs.slice(), materials: materials.slice(), current: currentId };
      const removedIds = targets.map(t => t.id);
      const defIndexes = [];
      sideCardDefs.forEach(function(item, index) { if (removedIds.indexOf(item.id) >= 0) defIndexes.push(index); });
      defIndexes.reverse().forEach(function(index) { sideCardDefs.splice(index, 1); });
      const matIndexes = [];
      materials.forEach(function(item, index) { if (removedIds.indexOf(item.id) >= 0) matIndexes.push(index); });
      matIndexes.reverse().forEach(function(index) { materials.splice(index, 1); });
      const titleNode = backdrop.querySelector('.case-side-title b');
      if (titleNode) titleNode.textContent = String(sideCardDefs.length);
      renderSideGrid();
      updateCaseSelectBar();
      if (removedIds.indexOf(currentId) >= 0 && sideCardDefs.length) show(sideCardDefs[0].id);
      const restore = function(errorMessage) {
        sideCardDefs.length = 0;
        removedSnapshot.defs.forEach(item => sideCardDefs.push(item));
        materials.length = 0;
        removedSnapshot.materials.forEach(item => materials.push(item));
        renderSideGrid();
        if (titleNode) titleNode.textContent = String(sideCardDefs.length);
        if (removedSnapshot.current) show(removedSnapshot.current);
        if (errorMessage) alert(errorMessage);
      };
      const rmPaths = [];
      targets.forEach(function(target) {
        [target.preview_path, libraryThumbnailPathForPreview(target, source)].filter(Boolean).forEach(function(p) { rmPaths.push(p); });
      });
      const storageStep = rmPaths.length ? state.supabase.storage.from(LIBRARY_BUCKET).remove(rmPaths).catch(function() {}) : Promise.resolve();
      storageStep
        .then(function() { return state.supabase.from('vf_asset_previews').delete().in('id', removedIds); })
        .then(function(result) {
          if (result && result.error) throw result.error;
          return refreshCaseProjectPreviewState(source);
        })
        .then(function() {
          renderLibraryGrid();
          showCaseDeleteToast(removedIds.length);
        })
        .catch(function(error) { restore(error.message || (state.lang === 'zh' ? '删除失败，请重试' : 'Delete failed. Please retry.')); });
    };

    const appendInput = backdrop.querySelector('#case-append-input');
    if (canManage) {
      // v865：网格里的「＋添加物料」虚线卡已按用户要求移除，追加物料走右上角「⋯→追加物料」
      const appendBtn = backdrop.querySelector('#case-append-btn');
      const moreBtn = backdrop.querySelector('#case-more-btn');
      const moreMenu = backdrop.querySelector('#case-more-menu');
      if (appendBtn) appendBtn.onclick = function(event) {
        event.stopPropagation();
        if (moreMenu) moreMenu.hidden = true;
        appendInput.click();
      };
      if (moreBtn && moreMenu) {
        moreBtn.onclick = function(event) {
          event.stopPropagation();
          if (moreMenu.hidden) {
            const rect = moreBtn.getBoundingClientRect();
            moreMenu.style.left = 'auto';
            moreMenu.style.top = rect.bottom + 8 + 'px';
            moreMenu.style.right = Math.max(10, window.innerWidth - rect.right) + 'px';
          }
          moreMenu.hidden = !moreMenu.hidden;
        };
        backdrop.addEventListener('click', function(event) {
          if (!moreMenu.hidden && !event.target.closest('#case-more-menu') && !event.target.closest('#case-more-btn')) moreMenu.hidden = true;
        });
      }
      appendInput.onchange = function() {
        const files = Array.from(appendInput.files || []).filter(f => f && f.size > 0);
        if (!files.length) return;
        if (moreMenu) moreMenu.hidden = true;
        runAppend(files);
      };
      const editBtn = backdrop.querySelector('#case-edit-btn');
      if (editBtn) editBtn.onclick = function() {
        if (moreMenu) moreMenu.hidden = true;
        closeCaseProjectModal();
        openCaseProjectEdit(source, {
          onClose: function() { openCaseProjectModal(sourceId, tabValue); },
          onSaved: async function() {
            try { await refreshCaseProjectSource(source); } catch (error) { /* 忽略：弹窗照常恢复 */ }
            renderLibraryGrid();
            openCaseProjectModal(sourceId, tabValue);
          }
        });
      };
      const deleteBtn = backdrop.querySelector('#case-delete-btn');
      if (deleteBtn) deleteBtn.onclick = function() {
        if (moreMenu) moreMenu.hidden = true;
        deleteLibrarySource(source.id).then(function() { closeCaseProjectModal(); });
      };
    }
    const contactBtn = backdrop.querySelector('#case-contact-btn');
    if (contactBtn) contactBtn.onclick = function() {
      // 复制大象编号（唯一标识，避免重名搜错人）：
      // 优先用素材上存的编号，其次用名单把姓名解析成编号（老素材没存编号时靠这个兜底），最后才退回复制姓名
      const resolvedFromRoster = ownerContact ? '' : resolveTeamMemberDaxiang(owner);
      const contactValue = ownerContact || resolvedFromRoster || owner;
      const copiedId = !!(ownerContact || resolvedFromRoster);
      if (!contactValue) { alert(state.lang === 'zh' ? '这个项目还没有填写物料所有者。' : 'This project has no material owner yet.'); return; }
      const finish = function() {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;pointer-events:none;opacity:0;transition:opacity 0.25s ease;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
        toast.textContent = state.lang === 'zh' ? (copiedId ? '大象编号已复制，可直接在大象里搜索该同学' : '该素材只登记了姓名（无大象编号），已复制姓名') : (copiedId ? 'Daxiang ID copied, search this colleague in Daxiang' : 'Only a name is registered (no Daxiang ID); name copied');
        document.body.appendChild(toast);
        requestAnimationFrame(function() { toast.style.opacity = '1'; });
        setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 400); }, 2600);
        // 延迟打开：浏览器会把非点击手势打开的标签页放进后台，不抢当前页面焦点
        setTimeout(function() { window.open('https://x.sankuai.com', '_blank', 'noopener'); }, 400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(contactValue).then(finish).catch(function() {
          const helper = document.createElement('textarea');
          helper.value = contactValue;
          document.body.append(helper);
          helper.select();
          try { document.execCommand('copy'); finish(); } catch (e) { alert(owner); }
          helper.remove();
        });
      } else { alert(owner); }
    };
    const setMaterialType = function(previewId, nextType) {
      const material = materials.find(item => item.id === previewId);
      if (!material) return;
      const previous = material.material_type || '';
      material.material_type = nextType;
      const def = sideCardDefs.find(item => item.id === previewId);
      if (def) def.type = nextType || '未分类';
      const row = state.libraryPreviews.find(item => item.id === previewId);
      if (row) row.material_type = nextType;
      renderSideGrid();
      if (currentId === previewId) show(previewId);
      renderLibraryGrid();
      // 先排进本机待写入：改完立刻刷新（请求被打断）也不会白改，下次进库自动补
      queuePreviewWrite(previewId, { material_type: nextType || '' });
      const rollback = function() {
        material.material_type = previous;
        if (def) def.type = previous || '未分类';
        if (row) row.material_type = previous;
        renderSideGrid();
      };
      state.supabase.from('vf_asset_previews').update({ material_type: nextType || '' }).eq('id', previewId).select('id').then(function(result) {
        if (result && result.error) {
          clearPreviewWrite(previewId);
          rollback();
          alert(state.lang === 'zh' ? ('分类保存失败：' + result.error.message) : ('Type save failed: ' + result.error.message));
          return;
        }
        const written = Array.isArray(result && result.data) ? result.data.length : 0;
        if (!written) {
          // 0 行＝没写进去（多半是没权限改这条）：回滚界面，保留待写入清单下次重试
          rollback();
          alert(state.lang === 'zh' ? '这条物料的类型没能写进数据库（可能没有修改权限），已恢复原值。' : 'This material type could not be saved to the DB (maybe no edit permission). Restored to previous value.');
          return;
        }
        clearPreviewWrite(previewId);
        markCaseManualTypes(source, [previewId]);
        showCaseToast(state.lang === 'zh' ? ('已改为「' + (nextType || '未分类') + '」') : ('Changed to "' + (nextType || 'Unclassified') + '"'));
      }).catch(function(error) {
        rollback();
        alert(state.lang === 'zh' ? ('分类保存失败：' + ((error && error.message) || '网络异常，请重试')) : ('Type save failed: ' + ((error && error.message) || 'Network error, please retry')));
      });
    };
    // 改语言（英语/阿语/无）：与改类型同一套「先记账、确认写进库再销账」
    const setMaterialLanguage = function(previewId, nextLang, options) {
      const material = materials.find(item => item.id === previewId);
      if (!material) return Promise.resolve(false);
      const previous = material.language || '';
      const value = nextLang === 'en' || nextLang === 'ar' ? nextLang : 'none';
      const apply = function(lang) {
        material.language = lang;
        const def = sideCardDefs.find(item => item.id === previewId);
        if (def) def.lang = caseMaterialLanguage(material);
        const row = state.libraryPreviews.find(item => item.id === previewId);
        if (row) row.language = lang;
      };
      const useToast = !(options && options.silent);
      apply(value);
      renderSideGrid();
      queuePreviewWrite(previewId, { language: value });
      const rollback = function() { apply(previous); renderSideGrid(); };
      return state.supabase.from('vf_asset_previews').update({ language: value }).eq('id', previewId).select('id').then(function(result) {
        if (result && result.error) {
          clearPreviewWrite(previewId);
          rollback();
          if (useToast) alert(state.lang === 'zh' ? ('语言保存失败：' + result.error.message) : ('Language save failed: ' + result.error.message));
          return false;
        }
        const written = Array.isArray(result && result.data) ? result.data.length : 0;
        if (!written) {
          rollback();
          if (useToast) alert(state.lang === 'zh' ? '这条物料的语言没能写进数据库（可能还没执行 sql/020 迁移，或没有修改权限）。' : 'This material language could not be saved to the DB (maybe sql/020 migration not run, or no edit permission).');
          return false;
        }
        clearPreviewWrite(previewId);
        if (useToast) showCaseToast(state.lang === 'zh' ? ('语言已设为「' + caseLanguageLabel(value) + '」') : ('Language set to "' + caseLanguageLabel(value) + '"'));
        return true;
      }).catch(function(error) {
        rollback();
        if (useToast) alert(state.lang === 'zh' ? ('语言保存失败：' + ((error && error.message) || '网络异常，请重试')) : ('Language save failed: ' + ((error && error.message) || 'Network error, please retry')));
        return false;
      });
    };
    // 按图片识别语言（只给需要的人/需要的那张用；上传时会自动跑文件名没线索的图）
    const detectMaterialLanguage = async function(previewId) {
      const material = materials.find(item => item.id === previewId);
      if (!material || state.localPreview) return;
      showCaseToast(state.lang === 'zh' ? '正在识别语言…' : 'Detecting language…', 1600);
      try {
        const lang = await detectLanguageFromPreview(material);
        if (!lang) throw new Error('识别服务没返回结果');
        await setMaterialLanguage(previewId, lang, { silent: true });
        showCaseToast(lang === 'none'
          ? ('没看出英语或阿语，已记为「无」：' + (material.preview_filename || ''))
          : ('识别为「' + caseLanguageLabel(lang) + '」：' + (material.preview_filename || '')), 2600);
      } catch (error) {
        alert(state.lang === 'zh' ? ('语言识别失败：' + ((error && error.message) || '请重试')) : ('Language detection failed: ' + ((error && error.message) || 'Please retry')));
      }
    };
    // 右键「设为封面」：把这张物料钉成当前分类（墙上二级标签；未选分类时 all）的项目卡封面；
    // 已是当前封面时再点一次取消。标记只动 tags 里的同类条目，与标签编辑互不覆盖。
    const setCaseCover = function(previewId) {
      const key = caseCoverMarkerKey(tabValue);
      const isCover = (caseCoverOverrideFor(source, tabValue) || {}).id === previewId;
      const scope = key === 'all' ? '' : ('「' + key + '」');
      writeCaseCover(source, tabValue, isCover ? '' : previewId).then(function() {
        renderLibraryGrid();
        showCaseToast(state.lang === 'zh' ? (isCover ? ('已取消' + scope + '封面') : ('已设为' + scope + '封面')) : (isCover ? ('Removed ' + scope + ' cover') : ('Set as ' + scope + ' cover')));
      }).catch(function(error) {
        alert(state.lang === 'zh' ? ('封面保存失败：' + ((error && error.message) || '请重试')) : ('Cover save failed: ' + ((error && error.message) || 'Please retry')));
      });
    };
    // 重建封面缩略图：透明底 PNG 以前会被 JPEG 压成黑底，重做一次就正常（新上传的已经自动白底）
    const rebuildMaterialThumbnail = async function(previewId) {
      const material = materials.find(item => item.id === previewId);
      if (!material) return;
      const srcUrl = state.libraryPreviewUrls[material.preview_path] || '';
      if (!srcUrl) { alert(state.lang === 'zh' ? '拿不到原图，请先刷新页面再试。' : 'Cannot fetch the original image. Refresh the page and retry.'); return; }
      const thumbPath = String(material.preview_path || '').replace(/\/[^/]+$/, '/_thumb-' + material.id + '.jpg');
      showCaseToast(state.lang === 'zh' ? '正在重建封面缩略图…' : 'Rebuilding cover thumbnail…', 2000);
      try {
        const response = await fetch(srcUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('取原图失败（HTTP ' + response.status + '）');
        const blob = await response.blob();
        const file = new File([blob], String(material.preview_filename || 'preview.png'), { type: blob.type || 'image/png' });
        const decoded = await previewImageThumbnailAndDimensions(file, 480);
        if (!decoded.thumbnail) throw new Error('生成缩略图失败（矢量图或超大图请直接用原图）');
        const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(thumbPath, decoded.thumbnail, { upsert: true, contentType: 'image/jpeg' });
        if (upload.error) throw upload.error;
        // 换个签名地址＝换 URL，浏览器才不会继续用缓存里的旧封面
        let base = state.libraryPreviewUrls[thumbPath] || '';
        if (!base) {
          try { await signLibraryPreviewUrls([thumbPath]); base = state.libraryPreviewUrls[thumbPath] || ''; } catch (_e) {}
        }
        if (base) state.libraryPreviewUrls[thumbPath] = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();
        renderSideGrid();
        renderLibraryGrid();
        showCaseToast(state.lang === 'zh' ? '封面缩略图已重建' : 'Cover thumbnail rebuilt', 2600);
      } catch (error) {
        alert(state.lang === 'zh' ? ('重建缩略图失败：' + ((error && error.message) || '请重试')) : ('Thumbnail rebuild failed: ' + ((error && error.message) || 'Please retry')));
      }
    };
    const renameMaterial = function(previewId) {
      const material = materials.find(item => item.id === previewId);
      if (!material) return;
      const commitName = function(nextName) {
        const def = sideCardDefs.find(item => item.id === previewId);
        material.preview_filename = nextName;
        if (def) {
          def.filename = nextName;
          def.lang = caseMaterialLanguage({ language: material.language, preview_filename: nextName });
        }
        const row = state.libraryPreviews.find(item => item.id === previewId);
        if (row) row.preview_filename = nextName;
        renderSideGrid();
        if (currentId === previewId) show(previewId);
        renderLibraryGrid();
        return { def, row };
      };
      const pendingInput = backdrop.querySelector('.case-side-rename-input');
      if (pendingInput) pendingInput.blur();
      const overlay = backdrop.querySelector('[data-case-side="' + previewId + '"] .case-side-overlay');
      const labelEl = overlay ? overlay.querySelector('span') : null;
      if (!overlay || !labelEl) return;
      const oldName = String(material.preview_filename || '');
      const def = sideCardDefs.find(item => item.id === previewId);
      overlay.classList.add('case-side-renaming');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'case-side-rename-input';
      input.value = oldName;
      input.placeholder = def ? def.type : '';
      labelEl.replaceWith(input);
      input.focus();
      // 与系统重命名一致：只选中主文件名，扩展名保留可见
      const dot = oldName.lastIndexOf('.');
      if (dot > 0) input.setSelectionRange(0, dot); else input.select();
      let settled = false;
      input.onblur = function() {
        if (settled) return;
        settled = true;
        const nextName = input.value.trim();
        if (!nextName || nextName === oldName) {
          input.replaceWith(labelEl);
          overlay.classList.remove('case-side-renaming');
          return;
        }
        const optimistic = commitName(nextName);
        state.supabase.from('vf_asset_previews').update({ preview_filename: nextName }).eq('id', previewId).then(function(result) {
          if (result && result.error) {
            material.preview_filename = oldName;
            if (optimistic.def) {
              optimistic.def.filename = oldName;
              optimistic.def.lang = caseMaterialLanguage({ language: material.language, preview_filename: oldName });
            }
            if (optimistic.row) optimistic.row.preview_filename = oldName;
            renderSideGrid();
            if (currentId === previewId) show(previewId);
            alert(state.lang === 'zh' ? ('重命名保存失败：' + result.error.message) : ('Rename save failed: ' + result.error.message));
            return;
          }
          showCaseToast(state.lang === 'zh' ? ('已重命名为「' + nextName + '」') : ('Renamed to "' + nextName + '"'));
        });
      };
      input.onkeydown = function(event) {
        // 输入期间屏蔽全局快捷键（Esc 关弹窗、左右键切图）
        event.stopPropagation();
        if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
        else if (event.key === 'Escape') { input.value = oldName; input.blur(); }
      };
    };
    if (canManage) {
      backdrop.addEventListener('contextmenu', function(event) {
        const item = event.target.closest('[data-case-side]');
        if (!item) return;
        event.preventDefault();
        const previewId = item.getAttribute('data-case-side');
        const material = materials.find(m => m.id === previewId);
        if (!material) return;
        const stale = document.getElementById('case-material-menu');
        if (stale) stale.remove();
        const menu = document.createElement('div');
        menu.id = 'case-material-menu';
        menu.className = 'case-type-menu';
        const current = material.material_type || '';
        const coverNow = (caseCoverOverrideFor(source, tabValue) || {}).id === previewId;
        menu.innerHTML = [''].concat(materialCatalogTypeNames(sourcePlatformOf(source))).map(value =>
          `<button type="button" data-type-value="${escapeAttr(value)}"${current === value ? ' class="active"' : ''}>${escapeHtml(value || '未分类')}</button>`
        ).join('') + `<div class="case-type-menu-row"><span class="case-type-menu-rowlabel">${state.lang === 'zh' ? '语言' : 'Language'}</span>${!previewLanguageReady
          ? `<span class="case-type-menu-rowhint" title="${state.lang === 'zh' ? '需要先在 Supabase SQL Editor 执行 sql/020_preview_language.sql' : 'Run sql/020_preview_language.sql in Supabase SQL Editor first'}">${state.lang === 'zh' ? '需先执行 sql/020 迁移' : 'Run sql/020 migration first'}</span>`
          : (state.lang === 'zh' ? [['en', '英语'], ['ar', '阿语'], ['none', '无']] : [['en', 'English'], ['ar', 'Arabic'], ['none', 'None']]).map(function(pair) {
            const activeNow = pair[0] === 'none' ? !caseMaterialLanguage(material) : caseMaterialLanguage(material) === pair[0];
            return `<button type="button" class="case-type-menu-rowchip${activeNow ? ' active' : ''}" data-lang-value="${pair[0]}">${pair[1]}</button>`;
          }).join('') + `<button type="button" class="case-type-menu-rowchip" data-material-detect-lang="1" title="${state.lang === 'zh' ? '按图片识别英语/阿语' : 'Detect EN/AR from the image'}">${state.lang === 'zh' ? 'AI 识别' : 'AI Detect'}</button>`}</div>` + `<button type="button" data-set-cover="1"${coverNow ? ' class="active"' : ''}>${state.lang === 'zh' ? (coverNow ? '取消封面' : '设为封面') : (coverNow ? 'Remove Cover' : 'Set as Cover')}</button>` + `<button type="button" data-material-rename="1">${state.lang === 'zh' ? '重命名' : 'Rename'}</button>` + (isThumbRebuildable(material) ? `<button type="button" data-material-rebuild-thumb="1">${state.lang === 'zh' ? '重建封面缩略图' : 'Rebuild Cover Thumbnail'}</button>` : '') + `<button type="button" class="danger" data-material-delete="1">${state.lang === 'zh' ? '删除这张物料' : 'Delete This Material'}</button>`;
        document.body.append(menu);
        menu.style.left = Math.min(event.clientX, window.innerWidth - 170) + 'px';
        menu.style.top = Math.min(event.clientY, window.innerHeight - 340) + 'px';
        const close = function() { menu.remove(); document.removeEventListener('click', close); };
        menu.addEventListener('click', function(menuEvent) {
          menuEvent.stopPropagation();
          const typeBtn = menuEvent.target.closest('[data-type-value]');
          if (typeBtn) { const next = typeBtn.getAttribute('data-type-value'); menu.remove(); setMaterialType(previewId, next); return; }
          const langBtn = menuEvent.target.closest('[data-lang-value]');
          if (langBtn) { const nextLang = langBtn.getAttribute('data-lang-value'); menu.remove(); void setMaterialLanguage(previewId, nextLang); return; }
          if (menuEvent.target.closest('[data-material-detect-lang]')) { menu.remove(); void detectMaterialLanguage(previewId); return; }
          if (menuEvent.target.closest('[data-set-cover]')) { menu.remove(); setCaseCover(previewId); return; }
          if (menuEvent.target.closest('[data-material-rename]')) { menu.remove(); renameMaterial(previewId); return; }
          if (menuEvent.target.closest('[data-material-rebuild-thumb]')) { menu.remove(); void rebuildMaterialThumbnail(previewId); return; }
          if (menuEvent.target.closest('[data-material-delete]')) {
            menu.remove();
            const delBtn = backdrop.querySelector('[data-case-del="' + previewId + '"]');
            if (delBtn) delBtn.click();
          }
        });
        setTimeout(function() { document.addEventListener('click', close, { once: true }); }, 0);
      });
    }
    backdrop.addEventListener('dragover', function(event) { event.preventDefault(); backdrop.classList.add('case-drag-hover'); });
    backdrop.addEventListener('dragleave', function(event) { if (!backdrop.contains(event.relatedTarget)) backdrop.classList.remove('case-drag-hover'); });
    const runAppend = async function(files) {
      const progress = backdrop.querySelector('#case-append-progress');
      const progressText = backdrop.querySelector('#case-append-progress-text');
      const progressFill = backdrop.querySelector('#case-append-progress-fill');
      const stillOpen = () => document.getElementById('case-project-backdrop') === backdrop;
      const showAppendProgress = function(done, total, pct) {
        const percent = typeof pct === 'number' ? pct : (total ? Math.round(done * 100 / total) : 0);
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressText && stillOpen()) progressText.textContent = state.lang === 'zh' ? ('正在追加 ' + done + '/' + total + ' 张 · ' + percent + '%…') : ('Adding ' + done + '/' + total + ' · ' + percent + '%…');
      };
      if (progress) progress.hidden = false;
      showAppendProgress(0, files.length, 0);
      try {
        // 上传与入库独立于弹窗：中途关闭弹窗也会照常完成
        const added = await uploadCaseAppendPreviews(source, files, function(done, total, pct) {
          showAppendProgress(done, total, pct);
        });
        await refreshCaseProjectPreviewState(source);
        renderLibraryGrid();
        if (stillOpen()) openCaseProjectModal(sourceId, tabValue);
        else showCaseAppendToast(added || files.length);
      } catch (error) {
        if (progress) progress.hidden = true;
        const message = translateCaseSchemaError(error).message;
        if (stillOpen()) { alert(message); openCaseProjectModal(sourceId, tabValue); }
        else alert(message);
      }
    };
    backdrop.addEventListener('drop', function(event) {
      event.preventDefault();
      event.stopPropagation();
      backdrop.classList.remove('case-drag-hover');
      if (!canManage) return;
      const dropped = collectDroppedFiles(event);
      if (!dropped.length) return;
      const files = dropped.filter(f => isCasePreviewFile(f));
      if (!files.length) {
        showCaseToast(state.lang === 'zh' ? ('不支持的文件类型：' + dropped.map(f => f.name).join('、').slice(0, 36)) : ('Unsupported file type: ' + dropped.map(f => f.name).join(', ').slice(0, 36)), 3600);
        return;
      }
      runAppend(files);
    });
    backdrop.addEventListener('click', function(event) {
      if (event.target === backdrop) { closeCaseProjectModal(); return; }
      const del = event.target.closest('[data-case-del]');
      if (del) {
        event.stopPropagation();
        deleteCaseMaterials([del.getAttribute('data-case-del')], state.lang === 'zh' ? '删除这张物料？此操作不能撤销。' : 'Delete this material? This cannot be undone.');
        return;
      }
      const side = event.target.closest('[data-case-side]');
      if (side) {
        const sideId = side.getAttribute('data-case-side');
        // 多选模式下点图＝勾选（不切大图），否则照旧换大图
        if (caseSelectMode) { toggleCaseSelected(sideId); return; }
        show(sideId);
        return;
      }
      const nav = event.target.closest('[data-case-nav]');
      if (nav) { step(parseInt(nav.getAttribute('data-case-nav'), 10)); return; }
      if (event.target.closest('#case-download-all')) {
        const btn = event.target.closest('#case-download-all');
        btn.disabled = true;
        const label = btn.textContent;
        btn.textContent = state.lang === 'zh' ? '打包中...' : 'Packing...';
        Promise.resolve(downloadAllCaseMaterials(source)).catch(function(err) { alert(err.message || (state.lang === 'zh' ? '打包失败，请重试' : 'Pack failed. Please retry.')); }).finally(function() { btn.disabled = false; btn.textContent = label; });
        return;
      }
      if (event.target.closest('#case-download-source')) {
        const link = String(source.download_link || '').trim();
        if (link) { window.open(link, '_blank', 'noopener'); void logAssetEvent('download_source', { source: source }, { external_link: true }); }
        return;
      }
      if (event.target.closest('#case-expand-btn')) {
        const p = current();
        const fs = document.createElement('div');
        fs.className = 'case-fullscreen';
        fs.innerHTML = `<img src="${escapeAttr(state.libraryPreviewUrls[p.preview_path] || '')}" alt="">`;
        fs.onclick = function() { fs.remove(); };
        document.body.append(fs);
        return;
      }
      if (event.target.closest('#case-more-btn')) { const menu = backdrop.querySelector('#case-more-menu'); if (menu) menu.hidden = !menu.hidden; return; }
      if (event.target.closest('.case-project-close') || event.target.closest('[data-case-action="back"]')) { closeCaseProjectModal(); return; }
    });
    wireCaseFootTagsHover(backdrop);
    wireCaseFootTagTools(backdrop, source, canManage);
    caseProjectKeyHandler = function(event) {
      // 多选模式下 Esc 先退出多选，再按一次才关弹窗
      if (event.key === 'Escape' && caseSelectMode) { setCaseSelectMode(false); return; }
      if (event.key === 'Escape') closeCaseProjectModal();
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', caseProjectKeyHandler);
  }

  function closeCaseProjectModal() {
    const node = document.getElementById('case-project-backdrop');
    if (node) node.remove();
    closeCaseFootTagsPop();
    if (caseFootToolsCleanup) { caseFootToolsCleanup(); caseFootToolsCleanup = null; }
    if (caseProjectKeyHandler) { document.removeEventListener('keydown', caseProjectKeyHandler); caseProjectKeyHandler = null; }
    document.body.style.overflow = '';
  }

  // 只刷新单个项目的源记录（编辑信息后同步标题/标签/链接等）
  async function refreshCaseProjectSource(source) {
    const fields = 'id,title,country_id,activity_id,category_id,tags,visibility,source_path,source_filename,source_mime_type,source_size_bytes,source_ext,uploaded_by' + (caseSchemaReady ? ',owner_name,owner_contact,project_note,download_link' : '') + ',created_at,updated_at';
    const { data, error } = await state.supabase.from('vf_source_files').select(fields).eq('id', source.id).limit(1);
    if (error) throw error;
    const row = (data || [])[0];
    if (!row) return null;
    state.librarySources = state.librarySources.map(item => (item.id === row.id ? row : item));
    return row;
  }

  // 只刷新单个项目的物料数据（避免整库重载带来的延迟）
  async function refreshCaseProjectPreviewState(source) {
    const fields = previewSelectFields(caseSchemaReady);
    const { data, error } = await state.supabase.from('vf_asset_previews').select(fields).eq('source_file_id', source.id).order('sort_order', { ascending: true });
    if (error) throw translateCaseSchemaError(error);
    const rows = data || [];
    state.libraryPreviews = state.libraryPreviews.filter(item => item.source_file_id !== source.id).concat(rows);
    await signVisibleLibraryUrls(rows.map(preview => ({ source: source, preview: preview })));
  }

  // ===== 极简 ZIP 打包（store 模式：图片本身已压缩，无需再压缩）=====
  function crc32(bytes) {
    let table = crc32._table;
    if (!table) {
      table = crc32._table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c >>> 0; }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  async function buildZip(entries) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const entry of entries) {
      const nameBytes = encoder.encode(entry.name);
      const crc = crc32(entry.data);
      const local = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, entry.data.length, true);
      dv.setUint32(22, entry.data.length, true);
      dv.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, 30);
      chunks.push(local, entry.data);
      central.push({ nameBytes, crc, size: entry.data.length, offset });
      offset += local.length + entry.data.length;
    }
    const centralStart = offset;
    let centralSize = 0;
    for (const c of central) {
      const rec = new Uint8Array(46 + c.nameBytes.length);
      const dv = new DataView(rec.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 20, true);
      dv.setUint16(8, 0x0800, true);
      dv.setUint32(16, c.crc, true);
      dv.setUint32(20, c.size, true);
      dv.setUint32(24, c.size, true);
      dv.setUint16(28, c.nameBytes.length, true);
      dv.setUint32(42, c.offset, true);
      rec.set(c.nameBytes, 46);
      chunks.push(rec);
      centralSize += rec.length;
    }
    const end = new Uint8Array(22);
    const dv = new DataView(end.buffer);
    dv.setUint32(0, 0x06054b50, true);
    dv.setUint16(8, central.length, true);
    dv.setUint16(10, central.length, true);
    dv.setUint32(12, centralSize, true);
    dv.setUint32(16, centralStart, true);
    chunks.push(end);
    return new Blob(chunks, { type: 'application/zip' });
  }
  async function downloadAllCaseMaterials(source) {
    const materials = caseMaterialsOf(source);
    if (!materials.length) return;
    await signVisibleLibraryUrls(materials.map(p => ({ source: source, preview: p })));
    const entries = [];
    for (let i = 0; i < materials.length; i++) {
      const p = materials[i];
      const url = state.libraryPreviewUrls[p.preview_path] || '';
      if (!url) continue;
      const blob = await fetch(url).then(r => { if (!r.ok) throw new Error('物料下载失败，请重试'); return r.blob(); });
      const ext = fileExt(p.preview_filename || '') || 'png';
      entries.push({ name: String(i + 1).padStart(2, '0') + '_' + (p.material_type || '未分类') + '.' + ext, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    if (!entries.length) throw new Error('物料还没有就绪，请稍后重试。');
    triggerBlobDownload(await buildZip(entries), (source.title || 'case') + '-物料.zip');
    await logAssetEvent('batch_download', { source: source }, { material_count: entries.length });
  }

  async function uploadCaseAppendPreviews(source, files, onProgress) {
    const userId = state.session.user.id;
    const list = Array.from(files || []);
    const results = new Array(list.length);
    let order = (caseMaterialsOf(source).length + 1) * 10;
    const orders = list.map(() => { const value = order; order += 10; return value; });
    // 进度按字节加权：大文件慢、小文件快，文件计数百分比会跳得不准
    const totalBytes = list.reduce((sum, file) => sum + (file.size || 1), 0);
    let doneBytes = 0;
    let finished = 0;
    const uploadOne = async (file, index) => {
      const videoFile = isCaseVideoFile(file);
      try {
      const previewId = crypto.randomUUID();
      const previewPath = `${userId}/previews/${source.id}/${previewId}-${safeStorageName(file.name)}`;
      const up = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, file, { upsert: false, contentType: file.type || (videoFile ? caseVideoContentType(file) : 'application/octet-stream') });
      if (up.error) throw up.error;
      const dims = videoFile ? await readVideoDimensions(file) : await readImageDimensions(file);
      let thumbOk = false;
      // GIF 保持动图：不生成静态缩略图，卡片直接跑原图动效
      if (!isCaseGifFile(file)) try {
        const generated = videoFile ? await generateVideoThumbnail(file, 480) : await generateThumbnail(file, 480);
        const thumbFile = generated || (!videoFile && file.size <= 512 * 1024 ? file : null);
        if (thumbFile) {
          const thumbPath = previewPath.replace(/\/[^/]+$/, '/_thumb-' + previewId + '.jpg');
          const tu = await state.supabase.storage.from(LIBRARY_BUCKET).upload(thumbPath, thumbFile, { upsert: true, contentType: 'image/jpeg' });
          if (!tu.error) thumbOk = true;
        }
      } catch (_e) {}
      const appendLanguage = caseFilenameLanguage(file.name) || await detectLanguageFromImageFile(file);
      results[index] = { id: previewId, source_file_id: source.id, preview_path: previewPath, preview_filename: file.name, preview_mime_type: file.type || (videoFile ? caseVideoContentType(file) : ''), preview_size_bytes: file.size, width: dims.width, height: dims.height, material_type: videoFile ? caseDynamicMaterialType(sourcePlatformOf(source)) : detectCaseMaterialType(file.name, dims.width, dims.height, sourcePlatformOf(source)), sort_order: orders[index] };
      if (appendLanguage && previewLanguageReady) results[index].language = appendLanguage;
      finished += 1;
      doneBytes += file.size || 1;
      if (onProgress) onProgress(finished, list.length, Math.round(100 * doneBytes / (totalBytes || 1)));
      } catch (itemError) {
        const reason = itemError && (itemError.message || itemError.error_description || itemError.name) || (state.lang === 'zh' ? '未知错误' : 'Unknown error');
        throw new Error(state.lang === 'zh' ? ('文件「' + (file && file.name || '') + '」追加失败：' + reason) : ('File "' + (file && file.name || '') + '" failed to append: ' + reason));
      }
    };
    // 并行上传（最多 3 张同时），比串行快数倍
    const queue = list.map((file, index) => ({ file, index }));
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (queue.length) {
        const job = queue.shift();
        await uploadOne(job.file, job.index);
      }
    }));
    const rows = results.filter(Boolean);
    let insert = await state.supabase.from('vf_asset_previews').insert(rows);
    if (insert.error && rows.some(function(row) { return row.language !== undefined; }) && isMissingLanguageColumnError(insert.error)) {
      // 老库还没跑 sql/020：去掉 language 再插，别让追加整个失败
      previewLanguageReady = false;
      rows.forEach(function(row) { delete row.language; });
      insert = await state.supabase.from('vf_asset_previews').insert(rows);
    }
    if (insert.error) throw translateCaseSchemaError(insert.error);
    caseSchemaReady = true; // 迁移完成后自动恢复完整字段读取
    try {
      await mergeSourceTagsMarker(source, LIBRARY_PREVIEW_THUMBNAILS_TAG);
    } catch (_e) {}
    rows.forEach(function(row) { void logAssetEvent('upload', { source: source, preview: { id: row.id, preview_filename: row.preview_filename, preview_path: row.preview_path } }); });
    return rows.length;
  }

  function renderLibraryCard(item) {
    const source = item.source;
    if (item.isCaseProjectCard || isCaseProject(source)) return renderCaseProjectCard(item);
    const preview = item.preview;
    const kind = libraryKindOfSource(source);
    const favorite = state.libraryFavorites.has(preview.id);
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = visibleLibraryTags(source).slice(0, 4);
    const selected = state.librarySelectedPreviewId === preview.id;
    const ext = kind === 'template' ? 'TEMPLATE' : sourceFileLabel(source);
    const thumbStyle = previewAspectStyle(preview);
    const previewLabel = kind === 'gallery'
      ? (state.lang === 'zh' ? '原图' : 'Image')
      : (state.lang === 'zh' ? '预览图' : 'Preview');
    const sourceLabel = kind === 'template'
      ? (state.lang === 'zh' ? '模板文件' : 'Template')
      : (state.lang === 'zh' ? '源文件' : 'Source');
    // 组件也以 JSON 模板形式存储，但不属于“模板预览图”：只有模版类才显示尺寸 hover。
    const isTemplateArtwork = kind === 'template' && !tags.includes('组件');
    // 缩略图会被压缩；hover 只能显示模板 JSON 内记录的真实画板尺寸。
    const templateSizeInfo = isTemplateArtwork ? libraryTemplateDimensionInfo(item) : null;
    const cardSizeInfo = templateSizeInfo || libraryPreviewDimensionInfo(item);
    const quickUse = kind === 'gallery'
      ? `<button type="button" data-action="use-static">${state.lang === 'zh' ? '静态' : 'Static'}</button><button type="button" data-action="use-dynamic">${state.lang === 'zh' ? '动态' : 'Motion'}</button>`
      : kind === 'template'
        ? `<button type="button" data-action="use-static">${state.lang === 'zh' ? '打开' : 'Open'}</button>`
        : '';
    const isFontCard = !!item.fontVariants || (kind === 'template' && tags.includes('组件') && tags.includes('字体'));
    if (isFontCard) {
      const variants = item.fontVariants || [item];
      const fontName = item.fontFamilyName || fontFamilyNameFromTitle(source.title);
      const styleLabel = variants.length > 1 ? (state.lang === 'zh' ? `${variants.length} 个字重` : `${variants.length} styles`) : fontWeightLabelFromTitle(variants[0].source.title);
      return `
        <article class="library-card library-font-card ${selected ? 'selected' : ''}" data-preview-id="${preview.id}" data-font-family="${escapeAttr(fontName)}" tabindex="0" style="border:1px solid #e8eaed;border-radius:14px;background:#fff;overflow:hidden;box-shadow:none;">
          <div class="multi-check"></div>
          <div style="height:142px;margin:14px 14px 0;border-radius:10px;background:#f7f7f9;display:flex;align-items:center;padding:22px;overflow:hidden;">
            <span style="font-size:28px;line-height:1.2;font-weight:600;color:#202124;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(fontName)}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 16px;color:#666b73;font-size:15px;">
            <span>${escapeHtml(styleLabel)}</span>
            <button type="button" data-action="font-menu" title="${state.lang === 'zh' ? '字体选项' : 'Font options'}" style="border:0;background:#f0f1f3;color:#9aa0a6;border-radius:7px;font-size:22px;line-height:1;cursor:pointer;padding:5px 9px;">⋯</button>
          </div>
        </article>`;
    }
    if (isBookmarkSource(source)) {
      const bookmarkGroup = state.libraryBookmarkGroups.find(function(g) { return g.source.id === source.id; });
      const bookmarkCoverPreview = libraryBookmarkCoverPreview(source.id);
      const bookmarkThumbStyle = previewAspectStyle(bookmarkCoverPreview || preview);
      const memberCount = bookmarkGroup ? bookmarkGroup.refs.length : 0;
      return `
      <article class="library-card library-bookmark-card ${selected ? 'selected' : ''}" data-preview-id="${preview.id}" data-bookmark-source="${escapeAttr(source.id)}" tabindex="0">
        <div class="library-thumb-wrap">
          <div class="multi-check"></div>
          <div class="library-thumb" style="${bookmarkThumbStyle}"><img${libraryCardImgSrcAttr(item)} alt="${escapeAttr(source.title)}" loading="lazy" decoding="async" crossorigin="anonymous" class="lazy-img library-progressive-image" ${item.thumbUrl && item.url ? `data-fallback-src="${escapeAttr(item.url)}"` : ''} onload="var t=this.closest('.library-thumb');if(t&&this.naturalWidth&&this.naturalHeight)t.style.setProperty('--preview-ratio',this.naturalWidth+' / '+this.naturalHeight)"></div>
          <div class="library-bookmark-summary">
            <span class="library-bookmark-badge" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m10 3-7 4 7 4 7-4-7-4Z"/><path d="m3 11 7 4 7-4"/><path d="m3 15 7 4 7-4"/></svg></span>
            <span class="library-bookmark-count">${memberCount}</span>
          </div>
          <div class="library-card-icons">
            <button class="favorite-btn ${favorite ? 'active' : ''}" type="button" data-action="favorite" title="${state.lang === 'zh' ? '收藏' : 'Favorite'}" aria-label="${state.lang === 'zh' ? '收藏' : 'Favorite'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"/></svg></button>
          </div>
          ${renderLibraryBookmarkInlineHover(bookmarkGroup)}
        </div>
      </article>
    `;
    }
    return `
      <article class="library-card ${isTemplateArtwork ? 'template-preview-card' : ''} ${selected ? 'selected' : ''}" data-preview-id="${preview.id}" tabindex="0">
        <div class="library-thumb-wrap">
          <div class="multi-check"></div>
          <div class="library-thumb" style="${thumbStyle}"><img${libraryCardImgSrcAttr(item)} alt="${escapeAttr(source.title)}" loading="lazy" decoding="async" crossorigin="anonymous" class="lazy-img library-progressive-image" ${item.thumbUrl && item.url ? `data-fallback-src="${escapeAttr(item.url)}"` : ''} onload="var t=this.closest('.library-thumb');if(t&&this.naturalWidth&&this.naturalHeight)t.style.setProperty('--preview-ratio',this.naturalWidth+' / '+this.naturalHeight)"></div>
          <div class="library-card-icons">
            <button class="favorite-btn ${favorite ? 'active' : ''}" type="button" data-action="favorite" title="${state.lang === 'zh' ? '收藏' : 'Favorite'}" aria-label="${state.lang === 'zh' ? '收藏' : 'Favorite'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9L12 3Z"/></svg></button>
            ${kind !== 'template' ? `<button class="card-download-btn" type="button" data-action="download-preview" title="${previewLabel}" aria-label="${previewLabel}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg></button>` : ''}
          </div>
          <div class="library-card-overlay">
            <div class="library-hover-dimensions" ${isTemplateArtwork ? `data-template-size-source="${escapeAttr(source.id)}"` : ''}>
              <span class="library-template-size-ratio">${escapeHtml(cardSizeInfo?.ratio || '—')}</span>
              <span class="library-template-size-pixels">${escapeHtml(cardSizeInfo?.pixels || (isTemplateArtwork ? (state.lang === 'zh' ? '读取真实画板尺寸中…' : 'Reading actual canvas size…') : '—'))}</span>
            </div>
            <div class="library-card-actions">
              ${quickUse}
              <button type="button" data-action="download-preview">${previewLabel}</button>
              ${canSource && kind !== 'gallery' && source.source_path ? `<button type="button" data-action="download-source">${sourceLabel}</button>` : ''}
              ${canManage ? `<button type="button" data-action="edit">${state.lang === 'zh' ? '编辑' : 'Edit'}</button><button class="danger" type="button" data-action="delete">${state.lang === 'zh' ? '删除' : 'Delete'}</button>` : ''}
            </div>
          </div>
        </div>
        <div class="library-home-card-meta">
          <div><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml([libraryKindLabel(kind), ...tags.slice(0, 1)].filter(Boolean).join(' · '))}</span></div>
          <button type="button" data-action="download-preview" aria-label="${previewLabel}">↓</button>
        </div>
      </article>
    `;
  }

  function libraryPreviewDimensionInfo(item) {
    const preview = item?.preview || {};
    const width = Math.round(Number(preview.width) || 0);
    const height = Math.round(Number(preview.height) || 0);
    if (width < 1 || height < 1) return null;
    let a = width, b = height;
    while (b) { const remainder = a % b; a = b; b = remainder; }
    const divisor = a || 1;
    return { ratio: `${width / divisor}:${height / divisor}`, pixels: `${width} × ${height} px` };
  }

  function libraryTemplateDimensionInfo(item) {
    const source = item?.source || {};
    const width = Math.round(Number(source.canvasW) || 0);
    const height = Math.round(Number(source.canvasH) || 0);
    if (width < 1 || height < 1) return null;
    let a = width, b = height;
    while (b) { const remainder = a % b; a = b; b = remainder; }
    const divisor = a || 1;
    return { ratio: `${width / divisor}:${height / divisor}`, pixels: `${width} × ${height} px` };
  }

  async function hydrateLibraryTemplateDimension(item) {
    if (!item?.source || libraryKindOfSource(item.source) !== 'template' || visibleLibraryTags(item.source).includes('组件')) return;
    const source = item.source;
    if (libraryTemplateDimensionInfo(item) || source._templateDimensionLoading) return;
    source._templateDimensionLoading = true;
    try {
      const snapshot = await loadLibraryTemplateSnapshot(item);
      const snapshotSize = templateSnapshotCanvasSize(snapshot);
      const width = snapshotSize.width;
      const height = snapshotSize.height;
      if (width < 1 || height < 1) return;
      source.canvasW = width;
      source.canvasH = height;
      const info = libraryTemplateDimensionInfo(item);
      document.querySelectorAll('[data-template-size-source="' + CSS.escape(String(source.id)) + '"]').forEach(function(overlay) {
        overlay.innerHTML = '<span class="library-template-size-ratio">' + escapeHtml(info.ratio) + '</span><span class="library-template-size-pixels">' + escapeHtml(info.pixels) + '</span>';
      });
    } catch (_error) {
      // 不得回退到缩略图尺寸，避免把 400px 缩略图误标成模板尺寸。
    } finally {
      source._templateDimensionLoading = false;
    }
  }

  function templateSnapshotCanvasSize(snapshot) {
    const directWidth = Math.round(Number(snapshot?.canvasW) || 0);
    const directHeight = Math.round(Number(snapshot?.canvasH) || 0);
    if (directWidth > 0 && directHeight > 0) return { width: directWidth, height: directHeight };
    const editor = snapshot?.editorState || {};
    const currentId = editor.currentArtboardId;
    const custom = (editor.artboardPresets || []).find(function(board) { return board.id === currentId; });
    if (custom?.w && custom?.h) return { width: Math.round(custom.w), height: Math.round(custom.h) };
    const ratio = editor.currentRatio || editor.artboards?.[currentId]?.ratio || '';
    const sizes = {
      head: [750, 500], splash: [750, 1626], banner: [1396, 424],
      '1:1': [1080, 1080], '3:4': [1080, 1440], '4:3': [1440, 1080],
      '16:9': [1920, 1080], '9:16': [1080, 1920], '3:3.75': [1080, 1350]
    };
    const pair = sizes[ratio];
    return pair ? { width: pair[0], height: pair[1] } : { width: 0, height: 0 };
  }

  function wireLibraryCards() {
    document.querySelectorAll('.library-card').forEach(card => {
      // 双击模板 → 跳转静态DIY编辑
      card.addEventListener('dblclick', function(event) {
        if (event.target.closest('button')) return; // 忽略按钮上的双击
        var item = libraryItemByPreviewId(card.dataset.previewId);
        if (!item || !item.source) return;
        if (isBookmarkSource(item.source)) { openLibraryBookmarkPopup(item.source.id); return; }
        var kind = libraryKindOfSource(item.source);
        if (kind === 'template') {
          openLibraryTemplate(item).catch(function(e) { alert(e.message); });
        }
      });
      card.addEventListener('click', event => {
        // 多选模式下：点击卡片=勾选切换，点击按钮照常
        if (state.libraryMultiSelect) {
          if (event.target.closest('button[data-action]')) {
            const btn = event.target.closest('button[data-action]');
            const item = libraryItemByPreviewId(card.dataset.previewId);
            if (!item) return;
            handleLibraryCardAction(btn.dataset.action, item);
            return;
          }
          toggleMultiCard(card.dataset.previewId);
          return;
        }
        const button = event.target.closest('button[data-action]');
        if (!button) {
          var clickItem = libraryItemByPreviewId(card.dataset.previewId);
          if (clickItem && isBookmarkSource(clickItem.source)) { openLibraryBookmarkPopup(clickItem.source.id); return; }
          if (clickItem && clickItem.isCaseProjectCard) { openCaseProjectModal(clickItem.source.id); void logAssetEvent('view', { source: clickItem.source }); return; }
          if (clickItem && libraryKindOfSource(clickItem.source) === 'template') return; // 模版单击不弹窗，双击打开
          selectLibraryItem(card.dataset.previewId);
          return;
        }
        const item = libraryItemByPreviewId(card.dataset.previewId);
        if (!item) return;
        if (button.dataset.action === 'font-menu') {
          event.stopPropagation();
          showFontFamilyMenu(button, item);
          return;
        }
        handleLibraryCardAction(button.dataset.action, item);
      });
      card.addEventListener('contextmenu', event => {
        event.preventDefault();
        const item = libraryItemByPreviewId(card.dataset.previewId);
        if (!item) return;
        showContextMenu(event, item);
      });
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (state.libraryMultiSelect) {
          toggleMultiCard(card.dataset.previewId);
          return;
        }
        var projItem = libraryItemByPreviewId(card.dataset.previewId);
        if (projItem && projItem.isCaseProjectCard) { openCaseProjectModal(projItem.source.id); void logAssetEvent('view', { source: projItem.source }); return; }
        selectLibraryItem(card.dataset.previewId);
      });
    });
    prepareDecodedLibraryImages(document.getElementById('library-grid'));
    // 图片懒加载淡入
    var lazyImages = document.querySelectorAll('img.lazy-img:not(.observed)');
    if (lazyImages.length && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          var img = entry.target;
          img.classList.add('observed');
          observer.unobserve(img);
          watchLibraryImageLoad(img);
          if (img.complete) {
            img.classList.add('loaded');
          } else {
            img.addEventListener('load', function() { img.classList.add('loaded'); });
            img.addEventListener('error', function() { img.classList.add('loaded'); });
          }
        });
      }, { rootMargin: '200px' });
      lazyImages.forEach(function(img) { observer.observe(img); });
    }
  }

  /* ── 右键菜单 ── */
  function showContextMenu(event, item) {
    var menu = document.getElementById('context-menu');
    if (!menu) return;
    if (item.isCaseProjectCard) { showCaseProjectContextMenu(event, item); return; }
    var source = item.source, preview = item.preview;
    var kind = libraryKindOfSource(source);
    var canManage = canManageSource(source);
    var lang = state.lang;
    var userTemplateMenu = state.interfaceMode === 'user' && kind === 'template';
    var items = [];
    // 模板卡只留两项（2026-09-21 定）：编组卡=释放编组+多选模式，普通模板卡=模板编组+多选模式。
    // 查看详情/编辑信息/下载预览图/下载模板/打开静态模板/移动分组都不再出现在模板卡上；
    // 删除改走多选模式的批量删除。组件/套组本来就不能编组，只剩多选模式。
    if (kind === 'template' && !userTemplateMenu) {
      var ctxIcon = function(inner) { return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; };
      var templateTags = visibleLibraryTags(source);
      if (isBookmarkSource(source)) {
        if (canManage) {
          items.push({ icon: ctxIcon('<polyline points="2 4 14 4"/><path d="M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4"/><rect x="3" y="4" width="10" height="10" rx="1"/>'), label: lang === 'zh' ? '释放编组' : 'Release group', action: 'delete', danger: true });
        }
      } else if (!templateTags.includes('组件') && !templateTags.includes('套组')) {
        items.push({ icon: ctxIcon('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9v5M9 11.5h5"/>'), label: lang === 'zh' ? '模板编组' : 'Group templates', action: 'template-bookmark' });
      }
      items.push({ icon: ctxIcon('<rect x="1" y="1" width="14" height="14" rx="3"/><polyline points="4.5 8 7 10.5 11.5 5.5"/>'), label: lang === 'zh' ? '多选模式' : 'Multi-select', action: 'multi-select' });
      renderContextMenu(event, items, function(action) {
        if (action === 'multi-select') { enterMultiSelect(); return; }
        handleLibraryCardAction(action, item);
      });
      return;
    }
    items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"/><circle cx="7" cy="7" r="2"/><line x1="10.5" y1="10.5" x2="15" y2="15"/></svg>', label: lang === 'zh' ? '查看详情' : 'View details', action: 'detail' });
    if (!userTemplateMenu) {
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11.5V14h2.5L13 5.5 10.5 3 2 11.5z"/></svg>', label: lang === 'zh' ? '编辑信息' : 'Edit', action: 'edit' });
    }
    items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/><line x1="3" y1="15" x2="13" y2="15"/></svg>', label: kind === 'gallery' ? (lang === 'zh' ? '下载原图' : 'Download image') : (lang === 'zh' ? '下载预览图' : 'Download preview'), action: 'download-preview' });
    if (!userTemplateMenu && kind !== 'gallery' && canDownloadSource() && item.source.source_path) {
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="2" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/><line x1="3" y1="15" x2="13" y2="15"/></svg>', label: kind === 'template' ? (lang === 'zh' ? '下载模板' : 'Download template') : (lang === 'zh' ? '下载源文件' : 'Download source'), action: 'download-source' });
    }
    if (kind === 'gallery') {
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="5" y1="5" x2="11" y2="11"/><line x1="11" y1="5" x2="5" y2="11"/></svg>', label: lang === 'zh' ? '静态 DIY' : 'Static DIY', action: 'use-static' });
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 1 14 8 3 15 3 1"/></svg>', label: lang === 'zh' ? '动态 DIY' : 'Dynamic DIY', action: 'use-dynamic' });
    }
    if (!userTemplateMenu) {
      items.push({ divider: true });
      if (canManage) {
        items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 4 14 4"/><path d="M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4"/><rect x="3" y="4" width="10" height="10" rx="1"/></svg>', label: isBookmarkSource(source) ? (lang === 'zh' ? '释放编组' : 'Release group') : (lang === 'zh' ? '删除' : 'Delete'), action: 'delete', danger: true });
      }
      items.push({ icon: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="3"/><polyline points="4.5 8 7 10.5 11.5 5.5"/></svg>', label: lang === 'zh' ? '多选模式' : 'Multi-select', action: 'multi-select' });
    }

    renderContextMenu(event, items, function(action) {
      if (action === 'detail') { openLibraryDetailModal(preview.id); return; }
      if (action === 'multi-select') { enterMultiSelect(); return; }
      handleLibraryCardAction(action, item);
    });
  }

  // 案例项目卡右键：菜单走项目自己的弹窗 / 编辑面板，不复用素材图库的详情、编辑界面
  function showCaseProjectContextMenu(event, item) {
    var menu = document.getElementById('context-menu');
    if (!menu) return;
    var source = item.source;
    var lang = state.lang;
    var canManage = canManageSource(source);
    var downloadLink = String(source.download_link || '').trim();
    var icon = function(inner) { return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; };
    var detailIcon = icon('<circle cx="7" cy="7" r="4.5"/><circle cx="7" cy="7" r="2"/><line x1="10.5" y1="10.5" x2="15" y2="15"/>');
    var editIcon = icon('<path d="M2 11.5V14h2.5L13 5.5 10.5 3 2 11.5z"/>');
    var downloadIcon = icon('<line x1="8" y1="2" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/><line x1="3" y1="15" x2="13" y2="15"/>');
    var deleteIcon = icon('<polyline points="2 4 14 4"/><path d="M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4"/><rect x="3" y="4" width="10" height="10" rx="1"/>');
    var items = [];
    items.push({ icon: detailIcon, label: lang === 'zh' ? '查看详情' : 'View details', action: 'case-detail' });
    if (canManage) items.push({ icon: editIcon, label: lang === 'zh' ? '编辑信息' : 'Edit', action: 'case-edit' });
    items.push({ icon: downloadIcon, label: lang === 'zh' ? '下载图片物料' : 'Download images', action: 'case-download-all' });
    if (downloadLink) items.push({ icon: downloadIcon, label: lang === 'zh' ? '下载源文件' : 'Download source', action: 'case-download-source' });
    if (canManage) {
      items.push({ divider: true });
      items.push({ icon: deleteIcon, label: lang === 'zh' ? '删除项目' : 'Delete project', action: 'case-delete', danger: true });
    }

    renderContextMenu(event, items, function(action) {
      if (action === 'case-detail') { openCaseProjectModal(source.id); void logAssetEvent('view', { source: source }); return; }
      if (action === 'case-edit') {
        openCaseProjectEdit(source, {
          onSaved: async function() {
            try { await refreshCaseProjectSource(source); } catch (error) { /* 忽略：列表照常刷新 */ }
            renderLibraryGrid();
          }
        });
        return;
      }
      if (action === 'case-download-all') {
        showCaseToast('正在打包物料…');
        Promise.resolve(downloadAllCaseMaterials(source))
          .then(function() { showCaseToast('已开始下载'); })
          .catch(function(err) { alert(err.message || '打包失败，请重试'); });
        return;
      }
      if (action === 'case-download-source') { if (downloadLink) { window.open(downloadLink, '_blank', 'noopener'); void logAssetEvent('download_source', { source: source }, { external_link: true }); } return; }
      if (action === 'case-delete') { deleteLibrarySource(source.id); return; }
    });
  }

  // 渲染菜单项 + 点击回调 + 屏幕边缘定位（素材菜单与案例项目菜单共用）
  function renderContextMenu(event, items, onClick) {
    var menu = document.getElementById('context-menu');
    if (!menu) return;
    var html = '';
    items.forEach(function(it) {
      if (it.divider) { html += '<div class="ctx-divider"></div>'; return; }
      html += '<button type="button" class="' + (it.danger ? 'danger' : '') + '" data-ctx-action="' + it.action + '"><span class="ctx-icon">' + it.icon + '</span>' + escapeHtml(it.label) + '</button>';
    });
    menu.innerHTML = html;

    // 绑定菜单点击
    menu.querySelectorAll('[data-ctx-action]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.dataset.ctxAction;
        hideContextMenu();
        onClick(action);
      });
    });

    // 定位菜单（防止溢出屏幕边缘）
    var x = event.clientX;
    var y = event.clientY;
    menu.classList.add('show');
    requestAnimationFrame(function() {
      var w = menu.offsetWidth;
      var h = menu.offsetHeight;
      if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
      if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
    });
  }

  function hideContextMenu() {
    var menu = document.getElementById('context-menu');
    if (menu) menu.classList.remove('show');
  }

  /* ── 多选模式 ── */
  function enterMultiSelect() {
    state.libraryMultiSelect = true;
    state.librarySelectedIds.clear();
    document.getElementById('library-grid').classList.add('multi-select-active');
    updateMultiSelectBar();
  }

  function exitMultiSelect() {
    state.libraryMultiSelect = false;
    state.librarySelectedIds.clear();
    document.getElementById('library-grid').classList.remove('multi-select-active');
    document.querySelectorAll('.library-card.multi-selected').forEach(function(c) { c.classList.remove('multi-selected'); });
    var bar = document.getElementById('multi-select-bar');
    if (bar) bar.style.display = 'none';
  }

  function toggleMultiCard(previewId) {
    if (state.librarySelectedIds.has(previewId)) {
      state.librarySelectedIds.delete(previewId);
    } else {
      state.librarySelectedIds.add(previewId);
    }
    var card = document.querySelector('.library-card[data-preview-id="' + previewId + '"]');
    if (card) card.classList.toggle('multi-selected', state.librarySelectedIds.has(previewId));
    updateMultiSelectBar();
  }

  function updateMultiSelectBar() {
    var bar = document.getElementById('multi-select-bar');
    if (!bar) return;
    var count = state.librarySelectedIds.size;
    var countEl = bar.querySelector('.bar-count');
    if (countEl) countEl.textContent = (state.lang === 'zh' ? '已选 ' : '') + count + (state.lang === 'zh' ? ' 项' : ' selected');
    bar.style.display = state.libraryMultiSelect ? 'flex' : 'none';
  }

  async function batchDeleteSelected() {
    var ids = Array.from(state.librarySelectedIds);
    if (!ids.length) return;
    if (!confirm((state.lang === 'zh' ? '确定删除已选的 ' : 'Delete ') + ids.length + (state.lang === 'zh' ? ' 项素材？此操作不可恢复。' : ' items? This cannot be undone.'))) return;
    var sourceIds = [];
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) sourceIds.push(item.source.id);
    });
    try {
      var { error } = await state.supabase.from('vf_source_files').delete().in('id', sourceIds);
      if (error) throw error;
    } catch(e) {
      alert(e.message);
    }
    exitMultiSelect();
    await reloadLibraryData();
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) void logAssetEvent('batch_delete', item);
    });
  }

  async function batchDownloadSelected() {
    var ids = Array.from(state.librarySelectedIds);
    if (!ids.length) return;
    showDownloadToast((state.lang === 'zh' ? '正在打包 ' : 'Packing ') + ids.length + (state.lang === 'zh' ? ' 张图片...' : ' images...'));
    // 并行拉取所有图片
    var tasks = ids.map(function(pid, i) {
      var item = libraryItemByPreviewId(pid);
      if (!item) return Promise.resolve(null);
      var filename = item.preview.preview_filename || ('image_' + (i + 1) + '.jpg');
      if (item.url) {
        return fetch(item.url).then(function(r) {
          if (!r.ok) throw new Error('bad');
          return r.blob().then(function(b) { return { name: filename, blob: b }; });
        }).catch(function() {
          return state.supabase.storage.from(LIBRARY_BUCKET).download(item.preview.preview_path).then(function(r) {
            return r.data ? { name: filename, blob: r.data } : null;
          });
        });
      }
      return state.supabase.storage.from(LIBRARY_BUCKET).download(item.preview.preview_path).then(function(r) {
        return r.data ? { name: filename, blob: r.data } : null;
      });
    });
    var results = await Promise.all(tasks);
    var zip = new JSZip();
    results.forEach(function(r) {
      if (r) zip.file(r.name, r.blob);
    });
    var zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(zipBlob, 'batch-download-' + ids.length + '.zip');
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) void logAssetEvent('batch_download', item);
    });
  }

  /* ── 批量编辑 ── */
  function openBatchEditModal() {
    var ids = Array.from(state.librarySelectedIds);
    if (!ids.length) return;
    document.getElementById('batch-edit-modal').hidden = false;
    var countEl = document.getElementById('batch-edit-count');
    if (countEl) countEl.textContent = (state.lang === 'zh' ? '将修改已选的 ' : 'Will update ') + ids.length + (state.lang === 'zh' ? ' 项素材。未改的字段保持原值。' : ' items. Unchanged fields stay as-is.');
    // 判断选中项的 kind 来决定显示/隐藏国家活动
    var kinds = new Set();
    ids.forEach(function(pid) {
      var item = libraryItemByPreviewId(pid);
      if (item) kinds.add(libraryKindOfSource(item.source));
    });
    var showCountry = kinds.has('gallery') || kinds.has('source');
    var showActivity = kinds.has('source') || kinds.has('template');
    var countryField = document.getElementById('batch-country-field');
    var activityField = document.getElementById('batch-activity-field');
    if (countryField) countryField.style.display = showCountry ? '' : 'none';
    if (activityField) activityField.style.display = showActivity ? '' : 'none';
    // 填充 picker 菜单（带"保持不变"选项）
    populateBatchMetaPickers();
    // 渲染 tag controls（以最常见 kind 为准）
    var primaryKind = kinds.has('source') ? 'source' : (kinds.has('gallery') ? 'gallery' : 'template');
    ['uploadTag1','uploadTag2','uploadTag3','uploadTag4'].forEach(function(key) { state.libraryFilters[key] = 'all'; });
    document.getElementById('batch-edit-tag-controls').innerHTML = renderUploadTagControls(primaryKind);
    wireEditTagPickers();
    wireEditTagHover();
    document.getElementById('batch-edit-message').textContent = '';
  }

  function closeBatchEditModal() {
    document.getElementById('batch-edit-modal').hidden = true;
  }

  function populateBatchMetaPickers() {
    ['country', 'activity'].forEach(function(type) {
      var menu = document.querySelector('#batch-edit-modal [data-upload-meta-menu="' + type + '"]');
      if (!menu) return;
      var keepLabel = state.lang === 'zh' ? '保持不变' : 'Keep';
      var html = '<button type="button" class="active" data-upload-tag-option="' + type + '" data-upload-tag-value="keep">' + keepLabel + '</button>';
      html += '<button type="button" data-upload-tag-option="' + type + '" data-upload-tag-value="all">' + (state.lang === 'zh' ? '清空' : 'Clear') + '</button>';
      var items = libraryOptions(type);
      html += items.map(function(item) {
        return '<button type="button" data-upload-tag-option="' + type + '" data-upload-tag-value="' + item.id + '">' + escapeHtml(optionName(item)) + '</button>';
      }).join('');
      menu.innerHTML = html;
    });
    wireEditTagPickers();
    wireEditTagHover();
  }

  async function saveBatchEdit(event) {
    event.preventDefault();
    var message = document.getElementById('batch-edit-message');
    setMessage(message, state.lang === 'zh' ? '正在保存...' : 'Saving...');
    try {
      var form = new FormData(event.currentTarget);
      var ids = Array.from(state.librarySelectedIds);
      var titlePrefix = form.get('title_prefix').trim();
      var rawCountry = form.get('country');
      var rawActivity = form.get('activity');
      // 确定 primary kind 给 libraryTagsForForm 用
      var kinds = new Set();
      ids.forEach(function(pid) {
        var item = libraryItemByPreviewId(pid);
        if (item) kinds.add(libraryKindOfSource(item.source));
      });
      var primaryKind = kinds.has('source') ? 'source' : (kinds.has('gallery') ? 'gallery' : 'template');
      var tags = libraryTagsForForm(form, primaryKind);
      var hasTagChange = tags.some(function(t) { return t !== 'all' && t !== 'keep'; });
      var sourceIds = [];
      ids.forEach(function(pid) {
        var item = libraryItemByPreviewId(pid);
        if (item) sourceIds.push(item.source.id);
      });
      // 分批更新
      for (var i = 0; i < sourceIds.length; i += 50) {
        var batch = sourceIds.slice(i, i + 50);
        var update = {};
        if (titlePrefix) update.title = titlePrefix;
        if (rawCountry && rawCountry !== 'keep') update.country_id = rawCountry === 'all' ? null : rawCountry;
        if (rawActivity && rawActivity !== 'keep') update.activity_id = rawActivity === 'all' ? null : rawActivity;
        if (hasTagChange) update.tags = tags;
        if (Object.keys(update).length > 0) {
          if (hasTagChange) {
            // 每个模板可能拥有不同的内部语言标签，批量编辑普通标签时必须逐项保留。
            for (var batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
              var batchId = batch[batchIndex];
              var batchSource = state.librarySources.find(function(item) { return item.id === batchId; });
              var perSourceUpdate = Object.assign({}, update, {
                tags: preserveTemplateLanguageTags(tags, batchSource?.tags)
              });
              var { error: perSourceError } = await state.supabase.from('vf_source_files').update(perSourceUpdate).eq('id', batchId);
              if (perSourceError) throw perSourceError;
              notifyStaticIframe({ type: 'vf:template-tags-updated', id: batchId, tags: perSourceUpdate.tags });
            }
          } else {
            var { error } = await state.supabase.from('vf_source_files').update(update).in('id', batch);
            if (error) throw error;
          }
        }
      }
      setMessage(message, state.lang === 'zh' ? '已保存。' : 'Saved.', false, true);
      setTimeout(closeBatchEditModal, 500);
      exitMultiSelect();
      await reloadLibraryData();
      ids.forEach(function(pid) {
        var item = libraryItemByPreviewId(pid);
        if (item) void logAssetEvent('batch_edit', item);
      });
    } catch(e) {
      setMessage(message, e.message, true);
    }
  }


  function selectLibraryItem(previewId) {
    state.librarySelectedPreviewId = previewId || '';
    document.querySelectorAll('.library-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.previewId === state.librarySelectedPreviewId);
    });
    renderLibraryInspector();
    if (previewId) openLibraryDetailModal(previewId);
  }

  function renderLibraryInspector() {
    const inspector = document.getElementById('library-inspector');
    if (!inspector) return;
    const item = libraryItemByPreviewId(state.librarySelectedPreviewId);
    if (!item) {
      inspector.innerHTML = `
        <div class="inspector-empty">
          <strong>${state.lang === 'zh' ? '选择一个素材' : 'Select an asset'}</strong>
          <span>${state.lang === 'zh' ? '右侧会显示预览、源文件信息和可执行操作。' : 'Preview, source details, and actions appear here.'}</span>
        </div>
      `;
      return;
    }
    const { source, preview } = item;
    const kind = libraryKindOfSource(source);
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = visibleLibraryTags(source);
    const primaryActions = [
      kind === 'gallery' ? `<button class="primary-btn" type="button" data-preview-id="${preview.id}" data-action="use-static">${state.lang === 'zh' ? '静态 DIY' : 'Static DIY'}</button>` : '',
      kind === 'gallery' ? `<button class="secondary-btn" type="button" data-preview-id="${preview.id}" data-action="use-dynamic">${state.lang === 'zh' ? '动态 DIY' : 'Dynamic DIY'}</button>` : '',
      kind === 'template' ? `<button class="primary-btn" type="button" data-preview-id="${preview.id}" data-action="use-static">${state.lang === 'zh' ? '打开静态模板' : 'Open Static Template'}</button>` : ''
    ].filter(Boolean).join('');
    const previewLabel = kind === 'gallery'
      ? (state.lang === 'zh' ? '下载原图' : 'Download image')
      : (state.lang === 'zh' ? '下载预览图' : 'Download preview');
    const sourceLabel = kind === 'template'
      ? (state.lang === 'zh' ? '下载模板文件' : 'Download template')
      : (state.lang === 'zh' ? '下载源文件' : 'Download source');
    inspector.innerHTML = `
      <div class="inspector-sticky">
        <div class="inspector-preview">${item.url ? `<img src="${escapeAttr(item.url)}" alt="${escapeAttr(source.title)}" decoding="async" class="library-progressive-image">` : `<span>${state.lang === 'zh' ? '预览生成中' : 'Preview'}</span>`}</div>
        <div class="inspector-content">
          <div>
            <div class="kicker">${escapeHtml(libraryKindLabel(kind))} / ${escapeHtml(sourceFileLabel(source))}</div>
            <h3>${escapeHtml(source.title)}</h3>
            <p>${escapeHtml(source.source_filename)} · ${formatFileSize(source.source_size_bytes)}</p>
          </div>
          ${primaryActions ? `<div class="inspector-actions">${primaryActions}</div>` : `<div class="inspector-note">${state.lang === 'zh' ? '案例库用于团队下载与归档，暂不直接带入编辑器。' : 'Case assets are for team download and archive, not direct editor import.'}</div>`}
          <dl class="inspector-list">
            <div><dt>${state.lang === 'zh' ? '所在库' : 'Section'}</dt><dd>${escapeHtml(libraryKindLabel(kind))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '标签' : 'Tags'}</dt><dd>${tags.length ? escapeHtml(tags.map(libraryDisplayLabel).join(' / ')) : '-'}</dd></div>
            <div><dt>${state.lang === 'zh' ? '文件类型' : 'File type'}</dt><dd>${escapeHtml(sourceFileLabel(source))}</dd></div>
            <div><dt>${state.lang === 'zh' ? '预览尺寸' : 'Preview size'}</dt><dd>${escapeHtml(formatDimensions(preview) || '-')}</dd></div>
            <div><dt>${state.lang === 'zh' ? '更新时间' : 'Updated'}</dt><dd>${formatDate(source.updated_at || source.created_at)}</dd></div>
          </dl>
          ${tags.length ? `<div class="inspector-tags">${tags.map(tag => `<span class="badge">${escapeHtml(libraryDisplayLabel(tag))}</span>`).join('')}</div>` : ''}
          <div class="inspector-secondary-actions">
            <button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="download-preview">${previewLabel}</button>
            ${canSource && kind !== 'gallery' && source.source_path ? `<button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="download-source">${sourceLabel}</button>` : ''}
            ${canManage ? `<button class="ghost-btn" type="button" data-preview-id="${preview.id}" data-action="edit">${state.lang === 'zh' ? '编辑信息' : 'Edit details'}</button><button class="ghost-btn danger" type="button" data-preview-id="${preview.id}" data-action="delete">${state.lang === 'zh' ? '删除整组' : 'Delete source'}</button>` : ''}
          </div>
        </div>
      </div>
    `;
    prepareDecodedLibraryImages(inspector);
    wireLibraryInspectorActions();
  }

  function wireLibraryInspectorActions() {
    document.querySelectorAll('#library-inspector button[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        const item = libraryItemByPreviewId(button.dataset.previewId);
        if (!item) return;
        handleLibraryCardAction(button.dataset.action, item);
      });
    });
  }

  async function handleLibraryCardAction(action, item) {
    if (action === 'favorite') return toggleLibraryFavorite(item);
    if (action === 'download-preview') return downloadLibraryFile(item, 'preview');
    if (action === 'download-source') return downloadLibraryFile(item, 'source');
    if (action === 'use-static') return useLibraryAsset(item, 'static');
    if (action === 'use-dynamic') return useLibraryAsset(item, 'dynamic');
    if (action === 'open-bookmark') return openLibraryBookmarkPopup(item.source.id);
    if (action === 'template-bookmark') return openLibraryTemplateBookmarkEditor(item);
    if (action === 'edit') return openLibraryEditModal(item.source.id);
    if (action === 'delete') return deleteLibrarySource(item.source.id);
    if (action === 'move-group') return openMoveGroupModal([item.source.id]);
  }

  function renderLibraryDetailModal() {
    return `
      <div id="library-detail-modal" class="modal-backdrop" hidden>
        <section class="modal library-modal" style="max-width:680px;padding:24px 28px 20px;">
          <div class="modal-head" style="margin-bottom:10px;">
            <h3 id="library-detail-title" style="font-size:18px;">${state.lang === 'zh' ? '素材详情' : 'Asset Details'}</h3>
            <button class="icon-btn modal-close-circle" id="close-library-detail" type="button" aria-label="Close"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg></button>
          </div>
          <div id="library-detail-preview" style="width:100%;aspect-ratio:16/10;max-height:55vh;overflow:auto;background:#f4f5f7;border-radius:14px;margin-bottom:14px;border:1px solid #e8ebf0;"></div>
          <div id="library-detail-meta" style="margin-bottom:14px;"></div>
          <div id="library-detail-actions" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;"></div>
        </section>
      </div>
    `;
  }

  function openLibraryDetailModal(previewId) {
    const item = libraryItemByPreviewId(previewId);
    if (!item) return;
    void logAssetEvent('view', item);
    const { source, preview } = item;
    const kind = libraryKindOfSource(source);
    const canManage = canManageSource(source);
    const canSource = canDownloadSource();
    const tags = visibleLibraryTags(source);
    const previewUrl = item.url || '';

    // Title
    const titleEl = document.getElementById('library-detail-title');
    if (titleEl) titleEl.textContent = source.title || (state.lang === 'zh' ? '素材详情' : 'Asset Details');

    // Preview image - clean, no buttons
    const previewEl = document.getElementById('library-detail-preview');
    if (previewEl) {
      previewEl.innerHTML = previewUrl
        ? `<img src="${escapeAttr(previewUrl)}" alt="${escapeAttr(source.title)}" decoding="async" class="library-progressive-image" style="width:100%;height:auto;display:block;">`
        : `<span style="color:#94a3b8;font-size:14px;">${state.lang === 'zh' ? '预览生成中' : 'Preview loading...'}</span>`;
		      prepareDecodedLibraryImages(previewEl);
		      previewEl.scrollTop = 0;
		      previewEl.onwheel = function(e) {
		        var atTop = previewEl.scrollTop <= 0;
		        var atBottom = previewEl.scrollTop + previewEl.clientHeight >= previewEl.scrollHeight - 1;
		        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
		          e.preventDefault();
		        }
		      };
    }

    // Meta info
    const metaEl = document.getElementById('library-detail-meta');
    if (metaEl) {
      metaEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px;">
          <div><span style="color:#667085;">${state.lang === 'zh' ? '类型' : 'Kind'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(libraryKindLabel(kind))}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '文件' : 'File'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(sourceFileLabel(source))}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '大小' : 'Size'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(formatFileSize(source.source_size_bytes))}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '尺寸' : 'Dimensions'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${escapeHtml(formatDimensions(preview) || '-')}</span></div>
          <div><span style="color:#667085;">${state.lang === 'zh' ? '更新' : 'Updated'}</span><span style="margin-left:8px;color:#0f172a;font-weight:650;">${formatDate(source.updated_at || source.created_at)}</span></div>
        </div>
        ${tags.length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">${tags.map(tag => `<span style="display:inline-block;padding:3px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;color:#334155;">${escapeHtml(libraryDisplayLabel(tag))}</span>`).join('')}</div>` : ''}
      `;
    }

    // Action buttons
    const actionsEl = document.getElementById('library-detail-actions');
    if (actionsEl) {
      const buttons = [];
      if (kind === 'gallery') {
        buttons.push(`<button class="primary-btn" type="button" data-action="use-static" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '静态 DIY' : 'Static DIY'}</button>`);
        buttons.push(`<button class="secondary-btn" type="button" data-action="use-dynamic" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '动态 DIY' : 'Dynamic DIY'}</button>`);
      } else if (kind === 'template') {
        buttons.push(`<button class="primary-btn" type="button" data-action="use-static" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '打开静态模板' : 'Open Template'}</button>`);
      }
      buttons.push(`<button class="ghost-btn" type="button" data-action="download-preview" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${kind === 'gallery' ? (state.lang === 'zh' ? '下载原图' : 'Download') : (state.lang === 'zh' ? '下载预览图' : 'Download Preview')}</button>`);
      if (canSource && kind !== 'gallery' && source.source_path) {
        buttons.push(`<button class="ghost-btn" type="button" data-action="download-source" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${kind === 'template' ? (state.lang === 'zh' ? '下载模板' : 'Download Template') : (state.lang === 'zh' ? '下载源文件' : 'Download Source')}</button>`);
      }
      if (canManage) {
        buttons.push(`<button class="ghost-btn" type="button" data-action="edit" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '编辑信息' : 'Edit'}</button>`);
        buttons.push(`<button class="ghost-btn danger" type="button" data-action="delete" data-preview-id="${preview.id}" style="min-height:36px;border-radius:8px;padding:6px 16px;font-size:13px;">${state.lang === 'zh' ? '删除' : 'Delete'}</button>`);
      }
      actionsEl.innerHTML = buttons.join('');
      // Wire action buttons
      actionsEl.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const it = libraryItemByPreviewId(btn.dataset.previewId);
          if (!it) return;
          handleLibraryCardAction(btn.dataset.action, it);
        });
      });
    }

    document.getElementById('library-detail-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLibraryDetailModal() {
    const modal = document.getElementById('library-detail-modal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  /* ── 模板快捷书签：素材库卡片 + 关联模板弹窗 ── */
  function renderLibraryBookmarkModal() {
    return `
      <div id="library-bookmark-modal" class="modal-backdrop library-bookmark-modal-backdrop" hidden>
        <section class="modal library-modal library-bookmark-picker-dialog" role="dialog" aria-modal="true" aria-label="${state.lang === 'zh' ? '模板选择' : 'Template picker'}">
          <div class="modal-head library-bookmark-picker-header">
            <button class="icon-btn modal-close-circle" id="close-library-bookmark" type="button" aria-label="${state.lang === 'zh' ? '关闭' : 'Close'}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg></button>
          </div>
          <div class="library-bookmark-picker-body">
            <p class="library-bookmark-picker-intro">${state.lang === 'zh' ? '选择模板即可打开。' : 'Select a template to open it.'}</p>
            <div id="library-bookmark-toolbar" class="library-bookmark-picker-toolbar"></div>
            <div id="library-bookmark-members" class="library-bookmark-grid-wrap"></div>
          </div>
        </section>
      </div>
    `;
  }

  function syncLibraryBookmarkModalLanguage(modal) {
    if (!modal) return;
    modal.dataset.uiLang = state.lang;
    const dialog = modal.querySelector('.library-bookmark-picker-dialog');
    const closeButton = modal.querySelector('#close-library-bookmark');
    const intro = modal.querySelector('.library-bookmark-picker-intro');
    const resultCount = modal.querySelector('.library-bookmark-result-count');
    const loadingCopy = modal.querySelector('.library-bookmark-picker-loading span:last-child');
    const emptyCopy = modal.querySelector('.library-bookmark-picker-empty');
    if (dialog) dialog.setAttribute('aria-label', state.lang === 'zh' ? '模板选择' : 'Template picker');
    if (closeButton) closeButton.setAttribute('aria-label', state.lang === 'zh' ? '关闭' : 'Close');
    if (intro) intro.textContent = state.lang === 'zh' ? '选择模板即可打开。' : 'Select a template to open it.';
    if (resultCount && resultCount.dataset.memberCount !== undefined) {
      const count = Number(resultCount.dataset.memberCount) || 0;
      resultCount.textContent = state.lang === 'zh' ? `显示 ${count} 个模板` : `${count} templates`;
    }
    if (loadingCopy) loadingCopy.textContent = state.lang === 'zh' ? '正在读取关联模板…' : 'Loading linked templates…';
    if (emptyCopy) emptyCopy.textContent = state.lang === 'zh' ? '暂无可用关联模板' : 'No linked templates';
  }

  function ensureLibraryBookmarkModal() {
    let modal = document.getElementById('library-bookmark-modal');
    if (modal) {
      syncLibraryBookmarkModalLanguage(modal);
      return modal;
    }
    const host = document.createElement('div');
    host.innerHTML = renderLibraryBookmarkModal().trim();
    modal = host.firstElementChild;
    document.body.appendChild(modal);
    syncLibraryBookmarkModalLanguage(modal);
    return modal;
  }

  function closeLibraryBookmarkPopup() {
    const modal = document.getElementById('library-bookmark-modal');
    if (modal) modal.hidden = true;
    hideLibraryBookmarkMemberMenu();
    document.body.style.overflow = '';
  }

  function libraryTemplateBookmarkCandidates(existingGroup) {
    const previewsBySource = new Map();
    state.libraryPreviews.forEach(function(preview) {
      if (!previewsBySource.has(preview.source_file_id)) previewsBySource.set(preview.source_file_id, preview);
    });
    const currentIds = new Set((existingGroup?.refs || []).map(function(ref) {
      return typeof ref === 'string' ? ref : ref?.templateId;
    }).filter(Boolean));
    return state.librarySources.map(function(source) {
      const preview = previewsBySource.get(source.id);
      if (!preview || libraryKindOfSource(source) !== 'template' || isBookmarkSource(source)) return null;
      const tags = visibleLibraryTags(source);
      if (tags.includes('组件') || tags.includes('套组')) return null;
      if (state.libraryBookmarkMemberIds.has(source.id) && !currentIds.has(source.id)) return null;
      const previewPath = preview.preview_path || '';
      return {
        source: source,
        preview: preview,
        url: state.libraryPreviewUrls[previewPath] || '',
        thumbUrl: state.libraryPreviewUrls[libraryThumbnailPathForPreview(preview, source)] || ''
      };
    }).filter(Boolean);
  }

  function chooseLibraryBookmarkCoverItem(items) {
    const list = (items || []).slice();
    if (!list.length) return null;
    function isNineSixteen(item) {
      const width = Math.round(Number(item?.source?.canvasW) || Number(item?.preview?.width) || 0);
      const height = Math.round(Number(item?.source?.canvasH) || Number(item?.preview?.height) || 0);
      return width > 0 && height > width && Math.abs(width / height - 9 / 16) < 0.05;
    }
    return list.find(isNineSixteen) || list[0];
  }

  function libraryBookmarkRefFromItem(item) {
    return {
      templateId: item.source.id,
      name: item.source.title || '',
      canvasW: Math.round(Number(item.source.canvasW) || 0),
      canvasH: Math.round(Number(item.source.canvasH) || 0)
    };
  }

  function libraryUrlToDataUrl(url) {
    if (!url || String(url).startsWith('data:')) return Promise.resolve(url || '');
    return fetch(url).then(function(response) {
      if (!response.ok) throw new Error('Preview fetch failed');
      return response.blob();
    }).then(function(blob) {
      return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function() { resolve(String(reader.result || '')); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }).catch(function() { return ''; });
  }

  function closeLibraryTemplateBookmarkEditor() {
    const modal = document.getElementById('library-template-bookmark-editor');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  async function openLibraryTemplateBookmarkEditor(seedItem) {
    const existingGroup = isBookmarkSource(seedItem?.source)
      ? state.libraryBookmarkGroups.find(function(group) { return group.source.id === seedItem.source.id; })
      : null;
    const candidates = libraryTemplateBookmarkCandidates(existingGroup);
    if (!candidates.length) {
      alert(state.lang === 'zh' ? '没有可用于编组的独立模板。' : 'No independent templates are available for grouping.');
      return;
    }
    try {
      await signLibraryPreviewUrls(candidates.map(function(item) { return item.preview.preview_path; }));
    } catch (_error) {}
    candidates.forEach(function(item) {
      item.url = state.libraryPreviewUrls[item.preview.preview_path] || item.url || '';
    });
    const selectedIds = new Set(existingGroup
      ? existingGroup.refs.map(function(ref) { return typeof ref === 'string' ? ref : ref?.templateId; }).filter(Boolean)
      : [seedItem?.source?.id].filter(Boolean));
    let modal = document.getElementById('library-template-bookmark-editor');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'library-template-bookmark-editor';
      modal.className = 'modal-backdrop library-bookmark-editor-backdrop';
      document.body.appendChild(modal);
    }
    const rows = candidates.map(function(item) {
      const info = libraryTemplateDimensionInfo(item) || libraryPreviewDimensionInfo(item);
      const imageUrl = item.url || item.thumbUrl || '';
      return `<label class="library-bookmark-editor-row"><input type="checkbox" value="${escapeAttr(item.source.id)}" ${selectedIds.has(item.source.id) ? 'checked' : ''}><span class="library-bookmark-editor-thumb">${imageUrl ? `<img src="${escapeAttr(imageUrl)}" alt="" decoding="async" class="library-progressive-image">` : ''}</span><span class="library-bookmark-editor-copy"><strong>${escapeHtml(item.source.title || (state.lang === 'zh' ? '未命名模板' : 'Untitled template'))}</strong><small>${escapeHtml(info ? info.ratio + '  ' + info.pixels : (state.lang === 'zh' ? '实际尺寸读取中' : 'Reading dimensions'))}</small></span></label>`;
    }).join('');
    modal.innerHTML = `<section class="modal library-bookmark-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="library-bookmark-editor-title"><div class="library-bookmark-editor-header"><div><h3 id="library-bookmark-editor-title">${existingGroup ? (state.lang === 'zh' ? '编辑模板编组' : 'Edit template group') : (state.lang === 'zh' ? '模板编组' : 'Group templates')}</h3><p>${state.lang === 'zh' ? '书签只关联现有模板，不会复制或修改原模板。至少选择 1 个模板。' : 'Bookmarks only reference existing templates. Select at least one template.'}</p></div><button type="button" id="close-library-bookmark-editor" aria-label="${state.lang === 'zh' ? '关闭' : 'Close'}">×</button></div><div class="library-bookmark-editor-list">${rows}</div><div class="library-bookmark-editor-footer"><button type="button" class="library-bookmark-editor-cancel">${state.lang === 'zh' ? '取消' : 'Cancel'}</button><button type="button" class="library-bookmark-editor-save">${existingGroup ? (state.lang === 'zh' ? '保存关联' : 'Save links') : (state.lang === 'zh' ? '创建书签' : 'Create bookmark')}</button></div></section>`;
    prepareDecodedLibraryImages(modal);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.onclick = function(event) { if (event.target === modal) closeLibraryTemplateBookmarkEditor(); };
    modal.querySelector('#close-library-bookmark-editor').onclick = closeLibraryTemplateBookmarkEditor;
    modal.querySelector('.library-bookmark-editor-cancel').onclick = closeLibraryTemplateBookmarkEditor;
    modal.querySelector('.library-bookmark-editor-save').onclick = async function() {
      const saveButton = this;
      const ids = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map(function(input) { return input.value; });
      if (!ids.length) {
        alert(state.lang === 'zh' ? '请至少选择 1 个模板。' : 'Select at least one template.');
        return;
      }
      const selectedItems = ids.map(function(id) { return candidates.find(function(item) { return item.source.id === id; }); }).filter(Boolean);
      saveButton.disabled = true;
      saveButton.textContent = state.lang === 'zh' ? '保存中...' : 'Saving...';
      try {
        await Promise.all(selectedItems.map(function(item) { return hydrateLibraryTemplateDimension(item); }));
        const refs = selectedItems.map(libraryBookmarkRefFromItem);
        const cover = chooseLibraryBookmarkCoverItem(selectedItems) || selectedItems[0];
        const coverUrl = state.libraryPreviewUrls[cover.preview.preview_path] || cover.url || '';
        const previewDataUrl = await libraryUrlToDataUrl(coverUrl);
        let result = null;
        const replyWindow = { postMessage: function(message) { result = message; } };
        if (existingGroup) {
          await handleUpdateTemplateBookmark({ id: existingGroup.source.id, name: existingGroup.source.title, data: { templateRefs: refs, coverTemplateId: cover.source.id }, previewDataUrl: previewDataUrl }, replyWindow);
        } else {
          const name = (selectedItems[0].source.title || (state.lang === 'zh' ? '未命名模板' : 'Untitled template')) + (state.lang === 'zh' ? '套组' : ' group');
          await handleSaveTemplate({ templateType: 'bookmark', name: name, data: { templateRefs: refs, coverTemplateId: cover.source.id }, previewDataUrl: previewDataUrl }, replyWindow);
        }
        if (result && (result.status === 'error' || result.type === 'vf:bookmark-update-error')) throw new Error(result.error || (state.lang === 'zh' ? '保存失败' : 'Save failed'));
        closeLibraryTemplateBookmarkEditor();
        await reloadLibraryData();
      } catch (error) {
        alert((state.lang === 'zh' ? '模板编组失败：' : 'Template grouping failed: ') + (error.message || error));
        saveButton.disabled = false;
        saveButton.textContent = existingGroup ? (state.lang === 'zh' ? '保存关联' : 'Save links') : (state.lang === 'zh' ? '创建书签' : 'Create bookmark');
      }
    };
  }

  function libraryBookmarkMemberItems(group) {
    const sourcesById = new Map(state.librarySources.map(function(s) { return [s.id, s]; }));
    const previewsBySource = new Map();
    state.libraryPreviews.forEach(function(p) {
      if (!previewsBySource.has(p.source_file_id)) previewsBySource.set(p.source_file_id, p);
    });
    return (group?.refs || []).map(function(ref) {
      const id = typeof ref === 'string' ? ref : ref?.templateId;
      const source = sourcesById.get(id);
      if (!source) return null;
      const preview = previewsBySource.get(id);
      let url = '';
      let thumbUrl = '';
      if (preview) {
        url = _templatePreviewBlobUrls[preview.preview_path] || state.libraryPreviewUrls[preview.preview_path] || '';
        const thumbPath = libraryThumbnailPathForPreview(preview, source);
        thumbUrl = state.libraryPreviewUrls[thumbPath] || '';
      }
      // Full previews are guaranteed records; generated _thumb files are optional.
      // Prefer the full preview so a signed-but-missing thumbnail cannot leave the
      // picker as a permanent grey card.
      return { ref: ref, source: source, preview: preview, url: url, thumbUrl: url || thumbUrl };
    }).filter(Boolean);
  }

  async function signLibraryBookmarkMemberUrls(group) {
    const members = libraryBookmarkMemberItems(group);
    const paths = [];
    members.forEach(function(m) {
      if (m.preview && m.preview.preview_path) paths.push(m.preview.preview_path);
      if (m.source && m.source.source_path) {
        const thumbPath = libraryThumbnailPathForPreview(m.preview, m.source);
        if (thumbPath) paths.push(thumbPath);
      }
    });
    if (paths.length) {
      try {
        // signLibraryPreviewUrls checks the signed-at timestamp and renews stale
        // URLs. Do not filter merely by URL presence here.
        await signLibraryPreviewUrls(paths);
      } catch (error) {
        console.warn('Bookmark preview signing failed; individual recovery will run:', error);
      }
    }
  }

  var _bookmarkMemberPreviewPromises = {};
  function recoverBookmarkMemberPreview(member) {
    const previewPath = member?.preview?.preview_path || '';
    if (!previewPath || !state.supabase) return Promise.resolve('');
    if (_templatePreviewBlobUrls[previewPath]) return Promise.resolve(_templatePreviewBlobUrls[previewPath]);
    if (_bookmarkMemberPreviewPromises[previewPath]) return _bookmarkMemberPreviewPromises[previewPath];
    _bookmarkMemberPreviewPromises[previewPath] = (async function() {
      const result = await state.supabase.storage.from(LIBRARY_BUCKET).download(previewPath);
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Empty bookmark preview');
      _templatePreviewBlobs[previewPath] = result.data;
      const objectUrl = URL.createObjectURL(result.data);
      _templatePreviewBlobUrls[previewPath] = objectUrl;
      return objectUrl;
    })().catch(function(error) {
      console.warn('Bookmark preview recovery failed:', previewPath, error);
      return '';
    }).finally(function() {
      delete _bookmarkMemberPreviewPromises[previewPath];
    });
    return _bookmarkMemberPreviewPromises[previewPath];
  }

  function repairOpenBookmarkMemberPreviews(group) {
    libraryBookmarkMemberItems(group).forEach(function(member) {
      const selector = `#library-bookmark-members [data-template-source-id="${CSS.escape(member.source.id)}"]`;
      const thumb = document.querySelector(selector)?.querySelector('.library-bookmark-template-thumb');
      if (!thumb) return;
      const image = thumb.querySelector('img');
      if (image && (!image.complete || image.naturalWidth > 0)) return;
      void recoverBookmarkMemberPreview(member).then(function(url) {
        if (!url || !thumb.isConnected) return;
        thumb.replaceChildren();
        mountDecodedBookmarkPreview(thumb, url);
      });
    });
  }

  function libraryBookmarkMemberDimensionInfo(member) {
    const width = Math.round(Number(member?.ref?.canvasW) || Number(member?.preview?.width) || 0);
    const height = Math.round(Number(member?.ref?.canvasH) || Number(member?.preview?.height) || 0);
    if (width < 1 || height < 1) return null;
    let a = width;
    let b = height;
    while (b) { const remainder = a % b; a = b; b = remainder; }
    const divisor = a || 1;
    return { width: width, height: height, ratio: `${width / divisor}:${height / divisor}` };
  }

  function libraryBookmarkSizeIconMarkup(info) {
    const width = Math.max(1, Number(info?.width) || 1);
    const height = Math.max(1, Number(info?.height) || 1);
    const scale = Math.min(22 / width, 19 / height);
    const frameW = Math.max(5, Math.round(width * scale));
    const frameH = Math.max(5, Math.round(height * scale));
    return `<span class="library-bookmark-size-icon" aria-hidden="true"><i style="width:${frameW}px;height:${frameH}px"></i></span>`;
  }

  function hideLibraryBookmarkMemberMenu() {
    const menu = document.getElementById('library-bookmark-member-menu');
    if (menu) menu.hidden = true;
  }

  function showLibraryBookmarkMemberMenu(event, group, member, nameEl) {
    event.preventDefault();
    event.stopPropagation();
    let menu = document.getElementById('library-bookmark-member-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'library-bookmark-member-menu';
      menu.className = 'library-bookmark-member-menu';
      document.body.appendChild(menu);
    }
    const actions = [
      { id: 'rename', label: state.lang === 'zh' ? '重命名' : 'Rename' },
      { id: 'release', label: state.lang === 'zh' ? '释放到组外' : 'Release from group' },
      { id: 'delete', label: state.lang === 'zh' ? '删除模板' : 'Delete template', danger: true }
    ];
    menu.innerHTML = actions.map(function(action) {
      return `<button type="button" data-bookmark-member-action="${action.id}"${action.danger ? ' class="danger"' : ''}>${action.label}</button>`;
    }).join('');
    menu.hidden = false;
    menu.style.left = Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 10) + 'px';
    menu.style.top = Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 10) + 'px';
    menu.querySelectorAll('[data-bookmark-member-action]').forEach(function(button) {
      button.onclick = function() {
        const action = button.dataset.bookmarkMemberAction;
        hideLibraryBookmarkMemberMenu();
        if (action === 'rename') {
          renameLibraryBookmarkMemberInline(member, nameEl);
          return;
        }
        const frame = state.toolFrames.static;
        if (frame?.contentWindow) {
          frame.contentWindow.postMessage({
            type: 'vf:bookmark-member-command',
            action: action,
            bookmarkId: group.source.id,
            memberId: member.source.id,
            templateRefs: group.refs || [],
            coverTemplateId: group.coverTemplateId || ''
          }, location.origin);
        }
      };
    });
    setTimeout(function() {
      document.addEventListener('click', hideLibraryBookmarkMemberMenu, { once: true });
    }, 0);
  }

  function libraryBookmarkPopupCacheKey(group) {
    const refs = (group?.refs || []).map(function(ref) {
      return typeof ref === 'string' ? ref : ref?.templateId;
    }).filter(Boolean);
    return [group?.source?.id || '', group?.source?.updated_at || '', refs.join(',')].join('|');
  }

  function prefetchLibraryBookmarkMemberSnapshots(group) {
    // Keep full source preloading; members of the opened group move to the front.
    getTemplateSourceCache().prioritize(libraryBookmarkMemberItems(group).map(function(member) { return member.source; }));
  }

  async function openLibraryBookmarkPopup(sourceId) {
    let group = state.libraryBookmarkGroups.find(function(g) { return g.source.id === sourceId; });
    if (!group) {
      try {
        group = await loadLibraryBookmarkGroupOnDemand(sourceId);
      } catch (error) {
        alert((state.lang === 'zh' ? '套组读取失败：' : 'Failed to load group: ') + (error.message || error));
        return;
      }
    }
    if (!group) return;
    const modal = ensureLibraryBookmarkModal();
    const listEl = document.getElementById('library-bookmark-members');
    if (!listEl) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    prefetchLibraryBookmarkMemberSnapshots(group);
    const popupCacheKey = libraryBookmarkPopupCacheKey(group);
    const popupRenderedAt = Number(modal.dataset.bookmarkRenderedAt || 0);
    if (modal.dataset.bookmarkCacheKey === popupCacheKey
      && Date.now() - popupRenderedAt < 10 * 60 * 1000
      && listEl.querySelector('.library-bookmark-template-grid')) {
      repairOpenBookmarkMemberPreviews(group);
      return;
    }
    listEl.innerHTML = `<div class="library-bookmark-picker-loading" role="status" aria-live="polite"><span class="library-loading-spinner" aria-hidden="true"></span><span>${state.lang === 'zh' ? '正在读取关联模板…' : 'Loading linked templates…'}</span></div>`;
    await signLibraryBookmarkMemberUrls(group);
    const allMembers = libraryBookmarkMemberItems(group);
    const toolbar = document.getElementById('library-bookmark-toolbar');
    if (!toolbar) return;
    toolbar.innerHTML = '';

    const resultCount = document.createElement('span');
    resultCount.className = 'library-bookmark-result-count';
    toolbar.append(resultCount);

    function renderMembers() {
      const members = allMembers.slice().sort(function(a, b) {
        const aInfo = libraryBookmarkMemberDimensionInfo(a);
        const bInfo = libraryBookmarkMemberDimensionInfo(b);
        const aLength = aInfo ? aInfo.height / Math.max(1, aInfo.width) : 0;
        const bLength = bInfo ? bInfo.height / Math.max(1, bInfo.width) : 0;
        if (bLength !== aLength) return bLength - aLength;
        return (bInfo?.height || 0) - (aInfo?.height || 0);
      });
      resultCount.dataset.memberCount = String(members.length);
      resultCount.textContent = state.lang === 'zh' ? `显示 ${members.length} 个模板` : `${members.length} templates`;
      listEl.innerHTML = '';
      if (!members.length) {
        listEl.innerHTML = `<div class="library-bookmark-picker-empty">${state.lang === 'zh' ? '暂无可用关联模板' : 'No linked templates'}</div>`;
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'library-bookmark-template-grid';
      members.forEach(function(member) {
        const info = libraryBookmarkMemberDimensionInfo(member);
        const card = document.createElement('div');
        card.className = 'library-bookmark-template-card';
        card.dataset.templateSourceId = member.source.id;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', (state.lang === 'zh' ? '打开模板 ' : 'Open template ') + (member.source.title || member.ref?.name || ''));
        const thumb = document.createElement('div');
        thumb.className = 'library-bookmark-template-thumb';
        thumb.style.aspectRatio = info ? (info.width + ' / ' + info.height) : '3 / 4';
        if (member.thumbUrl) mountDecodedBookmarkPreview(thumb, member.thumbUrl, member);
        else thumb.innerHTML = `<span class="library-bookmark-template-placeholder">${state.lang === 'zh' ? '预览生成中' : 'Preview'}</span>`;
        const meta = document.createElement('div');
        meta.className = 'library-bookmark-template-meta';
        const nameEl = document.createElement('div');
        nameEl.className = 'library-bookmark-template-name';
        nameEl.textContent = member.source.title || member.ref?.name || (state.lang === 'zh' ? '未命名模板' : 'Untitled template');
        const details = document.createElement('div');
        details.className = 'library-bookmark-template-details';
        const ratio = document.createElement('strong');
        ratio.textContent = info ? info.ratio : (state.lang === 'zh' ? '读取中' : 'Loading');
        const size = document.createElement('span');
        size.textContent = info ? (info.width + ' × ' + info.height + ' px') : (state.lang === 'zh' ? '正在读取实际尺寸' : 'Reading actual size');
        details.append(ratio, size);
        meta.append(nameEl, details);
        card.append(thumb, meta);
        card.onclick = function() { closeLibraryBookmarkPopup(); openLibraryTemplate({ source: member.source }).catch(function(e) { alert(e.message); }); };
        card.onkeydown = function(event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
        };
        card.oncontextmenu = function(event) { showLibraryBookmarkMemberMenu(event, group, member, nameEl); };
        grid.appendChild(card);
      });
      listEl.appendChild(grid);
    }

    renderMembers();
    repairOpenBookmarkMemberPreviews(group);
    modal.dataset.bookmarkCacheKey = popupCacheKey;
    modal.dataset.bookmarkRenderedAt = String(Date.now());
    const closeBtn = document.getElementById('close-library-bookmark');
    if (closeBtn) closeBtn.onclick = closeLibraryBookmarkPopup;
    modal.onclick = function(event) { if (event.target === modal) closeLibraryBookmarkPopup(); };
  }

  async function loadLibraryBookmarkGroupOnDemand(sourceId) {
    if (state.localPreview || !state.supabase || !sourceId) {
      throw new Error(state.lang === 'zh' ? '云端素材尚未就绪' : 'Cloud library is not ready');
    }
    const sourceFields = 'id,title,country_id,activity_id,category_id,tags,visibility,source_path,source_filename,source_mime_type,source_size_bytes,source_ext,uploaded_by' + (caseSchemaReady ? ',owner_name,owner_contact,project_note,download_link' : '') + ',created_at,updated_at';
    const sourceResult = await state.supabase.from('vf_source_files').select(sourceFields).eq('id', sourceId).limit(1);
    if (sourceResult.error || !sourceResult.data?.length) {
      throw (sourceResult.error || new Error(state.lang === 'zh' ? '找不到模板套组' : 'Template group not found'));
    }
    const source = sourceResult.data[0];
    const snapshot = await loadLibraryTemplateSnapshot({ source: source });
    const refs = Array.isArray(snapshot?.templateRefs) ? snapshot.templateRefs : [];
    const memberIds = refs.map(function(ref) {
      return typeof ref === 'string' ? ref : ref?.templateId;
    }).filter(Boolean);
    let members = [];
    for (const idBatch of chunkArray(memberIds, SUPABASE_IN_BATCH_SIZE)) {
      const memberResult = await state.supabase.from('vf_source_files').select(sourceFields).in('id', idBatch);
      if (memberResult.error) throw memberResult.error;
      members.push(...(memberResult.data || []));
    }
    let previews = [];
    for (const idBatch of chunkArray([sourceId].concat(memberIds), SUPABASE_IN_BATCH_SIZE)) {
      const previewResult = await state.supabase
        .from('vf_asset_previews')
        .select('id,source_file_id,preview_path,preview_filename,preview_mime_type,preview_size_bytes,width,height,material_type,sort_order,created_at')
        .in('source_file_id', idBatch)
        .order('sort_order', { ascending: true });
      if (previewResult.error) throw previewResult.error;
      previews.push(...(previewResult.data || []));
    }
    const sourceMap = new Map(state.librarySources.map(function(item) { return [item.id, item]; }));
    [source].concat(members).forEach(function(item) { sourceMap.set(item.id, item); });
    state.librarySources = Array.from(sourceMap.values());
    const previewMap = new Map(state.libraryPreviews.map(function(item) { return [item.id, item]; }));
    previews.forEach(function(item) { previewMap.set(item.id, item); });
    state.libraryPreviews = Array.from(previewMap.values());
    memberIds.forEach(function(id) { state.libraryBookmarkMemberIds.add(id); });
    const group = { source: source, refs: refs, coverTemplateId: snapshot?.coverTemplateId || '' };
    state.libraryBookmarkGroups = state.libraryBookmarkGroups.filter(function(item) { return item.source.id !== sourceId; });
    state.libraryBookmarkGroups.push(group);
    return group;
  }

  function renameLibraryBookmarkInline(sourceId) {
    const source = state.librarySources.find(function(s) { return s.id === sourceId; });
    const titleEl = document.getElementById('library-bookmark-title');
    if (!source || !titleEl) return;
    const oldName = source.title || '';
    const input = document.createElement('input');
    input.type = 'text'; input.value = oldName;
    input.className = 'library-bookmark-rename-input';
    titleEl.replaceWith(input);
    input.focus(); input.select();
    input.onblur = function() {
      const newName = input.value.trim();
      if (!newName || newName === oldName) { input.replaceWith(titleEl); return; }
      source.title = newName;
      titleEl.textContent = newName;
      input.replaceWith(titleEl);
      state.supabase.from('vf_source_files').update({ title: newName }).eq('id', source.id).then(function(res) {
        if (res.error) console.warn('Rename bookmark failed:', res.error.message);
        else notifyStaticIframe({ type: 'vf:template-renamed', id: source.id, name: newName });
      });
    };
    input.onkeydown = function(e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = oldName; input.blur(); }
    };
  }

  function renameLibraryBookmarkMemberInline(member, nameEl) {
    const oldName = member.source.title || member.ref?.name || '';
    const input = document.createElement('input');
    input.type = 'text'; input.value = oldName;
    input.className = 'library-bookmark-member-name-input';
    nameEl.replaceWith(input);
    input.focus(); input.select();
    input.onblur = function() {
      const newName = input.value.trim();
      if (!newName || newName === oldName) { input.replaceWith(nameEl); return; }
      member.source.title = newName;
      if (member.ref) member.ref.name = newName;
      nameEl.textContent = newName;
      input.replaceWith(nameEl);
      state.supabase.from('vf_source_files').update({ title: newName }).eq('id', member.source.id).then(function(res) {
        if (res.error) console.warn('Rename member failed:', res.error.message);
        else notifyStaticIframe({ type: 'vf:template-renamed', id: member.source.id, name: newName });
      });
    };
    input.onkeydown = function(e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = oldName; input.blur(); }
    };
  }

  function dissolveLibraryBookmarkFromPopup(sourceId, group) {
    const members = libraryBookmarkMemberItems(group);
    closeLibraryBookmarkPopup();
    if (!confirm(state.lang === 'zh'
      ? `解散「${group.source.title}」？${members.length} 个关联模板会恢复显示在素材库和资产库。`
      : `Dissolve "${group.source.title}"? ${members.length} linked templates will reappear.`)) return;
    handleDissolveTemplateBookmark({ id: sourceId }, null);
  }

  async function handleDissolveTemplateBookmark(msg, sourceWindow) {
    var sourceId = msg.id || msg.sourceId;
    if (!sourceId || state.localPreview || !state.supabase) return;
    try {
      var source = state.librarySources.find(function(s) { return s.id === sourceId; });
      if (!source) {
        var fetched = await state.supabase.from('vf_source_files').select('id, source_path').eq('id', sourceId).limit(1);
        source = fetched && fetched.data && fetched.data.length ? fetched.data[0] : null;
      }
      var paths = [];
      if (source && source.source_path) paths.push(source.source_path);
      var previewRes = await state.supabase.from('vf_asset_previews').select('preview_path').eq('source_file_id', sourceId);
      (previewRes.data || []).forEach(function(p) { if (p.preview_path) paths.push(p.preview_path); });
      if (paths.length) {
        var remove = await state.supabase.storage.from(LIBRARY_BUCKET).remove(Array.from(new Set(paths.filter(Boolean))));
        if (remove.error) {
          if (sourceWindow) { try { sourceWindow.postMessage({ type: 'vf:bookmark-dissolve-error', id: sourceId, error: remove.error.message }, location.origin); } catch (_e) {} }
          return;
        }
      }
      var del = await state.supabase.from('vf_source_files').delete().eq('id', sourceId);
      if (del.error) {
        if (sourceWindow) { try { sourceWindow.postMessage({ type: 'vf:bookmark-dissolve-error', id: sourceId, error: del.error.message }, location.origin); } catch (_e) {} }
        return;
      }
      await reloadLibraryData();
      notifyStaticIframe({ type: 'vf:template-deleted', sourceId: sourceId });
    } catch (error) {
      console.warn('Dissolve bookmark failed:', error);
      if (sourceWindow) { try { sourceWindow.postMessage({ type: 'vf:bookmark-dissolve-error', id: sourceId, error: error.message || '解散失败' }, location.origin); } catch (_e) {} }
    }
  }

  function populateDropZoneWithFiles(kind, files) {
    var inputId;
    if (kind === 'gallery') {
      inputId = 'library-gallery-input';
    } else if (kind === 'source') {
      inputId = 'library-preview-input';
    } else {
      return; // template 不支持拖入图片
    }
    var input = document.getElementById(inputId);
    if (!input) return;
    var dt = new DataTransfer();
    var imageFiles = files.filter(function(f) { return (f.type || '').startsWith('image/'); });
    imageFiles.forEach(function(f) { dt.items.add(f); });
    input.files = dt.files;
    var zone = document.querySelector('[data-drop-input="' + inputId + '"]');
    if (zone) updateDropZoneSummary(zone, input.files);
    // 自动填名称
    var titleInput = document.getElementById('library-upload-title');
    if (titleInput && !titleInput.value.trim() && imageFiles.length) {
      titleInput.value = stripExtension(imageFiles[0].name);
    }
  }

  function openLibraryUploadModal(opts) {
    if (!canUploadAssets()) return;
    opts = opts || {};
    // 提前把使用者名单拉好，打开就打字也能立刻看到「姓名 · 大象编号」候选
    void loadTeamMembers().then(function() {
      const root = document.querySelector('#library-upload-modal [data-owner-combobox]');
      if (root) delete root.dataset.ownerRosterLoaded;
    }).catch(function() {});
    renderLibrarySelects();
    const form = document.getElementById('library-upload-form');
    if (!form) return;
    form.reset();
    // 确定入库类型：优先用传入的 kind，其次当前页面筛选的 kind，最后默认 gallery
    var defaultKind = opts.kind;
    if (!defaultKind) {
      var currentKind = state.libraryFilters.kind;
      defaultKind = (currentKind && currentKind !== 'all') ? currentKind : 'gallery';
    }
    const kindInput = document.getElementById('library-upload-kind');
    if (kindInput) kindInput.value = defaultKind;
    // 确定各层级 tag：优先用传入的，其次当前页面筛选的
    var pageTag1 = state.libraryFilters.tag1;
    var fallbackTag1 = (pageTag1 && pageTag1 !== 'all') ? pageTag1 : (defaultKind === 'source' ? 'C端' : 'all');
    state.libraryFilters.uploadTag1 = defaultKind === 'source'
      ? defaultCaseUploadPlatform(opts.tag1, pageTag1)
      : (opts.tag1 || fallbackTag1);
    state.libraryFilters.uploadTag2 = opts.tag2 || ((state.libraryFilters.tag2 && state.libraryFilters.tag2 !== 'all') ? state.libraryFilters.tag2 : 'all');
    state.libraryFilters.uploadTag3 = opts.tag3 || ((state.libraryFilters.tag3 && state.libraryFilters.tag3 !== 'all') ? state.libraryFilters.tag3 : 'all');
    state.libraryFilters.uploadTag4 = opts.tag4 || ((state.libraryFilters.tag4 && state.libraryFilters.tag4 !== 'all') ? state.libraryFilters.tag4 : 'all');
    // 确定国家/活动：优先用传入的，其次用右上角筛选面板已选中的（单选取第一个）
    var pageCountries = state.libraryFilters.selectedCountries || [];
    var pageActivities = state.libraryFilters.selectedActivities || [];
    // 国家记住当前浏览器/账号上次成功上传的选择；首次使用才回退页面筛选。
    state.libraryFilters.uploadCountry = opts.country || lastCaseUploadCountry() || (pageCountries.length === 1 ? pageCountries[0] : 'all');
    state.libraryFilters.uploadActivity = opts.activity || (pageActivities.length === 1 ? pageActivities[0] : 'all');
    const tagControls = document.getElementById('library-upload-tag-controls');
    if (tagControls) tagControls.innerHTML = renderUploadTagControls(defaultKind);
    // 兜底：上一轮上传中途关窗不该把按钮留在「上传中...」（没有在跑的上传时才重置）
    if (!libraryUploadRun) resetLibraryUploadButton();
    document.getElementById('library-upload-title').value = opts.title || '';
    document.getElementById('library-upload-message').textContent = '';
    document.getElementById('library-upload-modal').hidden = false;
    setTimeout(function() { populateUploadMetaPickers(); }, 50);
    setTimeout(function() { prefillUploadMetaSelections(); }, 120);
    document.querySelector('.library-upload-scroll')?.scrollTo({ top: 0, behavior: 'auto' });
    updateLibraryUploadMode(defaultKind);
    // 标签一只在「属于当前入库位置」时预填：页面筛选停在「模版」时打开案例库上传，
    // 不许把模版的标签一带进项目（它不属于案例库标签一，选了也筛不到）。
    var prefillKindTag1Values = (LIBRARY_TAGS[defaultKind] && LIBRARY_TAGS[defaultKind].tag1) || [];
    var prefillTag1 = state.libraryFilters.uploadTag1 && state.libraryFilters.uploadTag1 !== 'all' ? state.libraryFilters.uploadTag1 : '';
    applyCaseTagBarSelections(document.getElementById('upload-case-tag-bar'), {
      tag1: prefillKindTag1Values.includes(prefillTag1) ? prefillTag1 : '',
      country: state.libraryFilters.uploadCountry && state.libraryFilters.uploadCountry !== 'all' ? state.libraryFilters.uploadCountry : '',
      activity: state.libraryFilters.uploadActivity && state.libraryFilters.uploadActivity !== 'all' ? state.libraryFilters.uploadActivity : ''
    });
    wireLibraryUploadKindCards();
    wireUploadTagPickers();
    wireUploadTagHover();
    document.querySelectorAll('.library-drop-zone').forEach(zone => updateDropZoneSummary(zone, []));
    // 清掉上一次的 AI 元素建议与去重键，避免带进新一次上传
    var uploadTagBarForAi = document.getElementById('upload-case-tag-bar');
    if (uploadTagBarForAi) {
      clearCaseElementSuggestions(uploadTagBarForAi);
    }
    // 如有拖入的文件，填入对应的 drop zone
    if (opts.files && opts.files.length) {
      populateDropZoneWithFiles(defaultKind, opts.files);
    }
  }

  function prefillUploadMetaSelections() {
    ['country', 'activity'].forEach(function(type) {
      var key = 'upload' + type.charAt(0).toUpperCase() + type.slice(1);
      var val = state.libraryFilters[key];
      if (!val || val === 'all') return;
      var btn = document.querySelector('[data-upload-tag-option="' + type + '"][data-upload-tag-value="' + val + '"]');
      if (btn) btn.click();
    });
  }

  function closeLibraryUploadModal() {
    const modal = document.getElementById('library-upload-modal');
    if (modal) modal.hidden = true;
  }

  // 上传「本次运行」的标记：点取消 / ✕ 时用它中断后面的文件并回滚已经写进去的行，
  // 同时立刻把提交按钮恢复成「上传入库」——否则中途关窗按钮会一直卡在「上传中...」。
  let libraryUploadRun = null;
  const LIBRARY_UPLOAD_CANCELLED = 'vf:upload-cancelled';

  function libraryUploadSubmitButton() {
    return document.querySelector('#library-upload-modal button[type="submit"]');
  }

  function resetLibraryUploadButton() {
    const button = libraryUploadSubmitButton();
    if (!button) return;
    button.disabled = false;
    button.textContent = button.dataset.defaultLabel || (state.lang === 'zh' ? '上传入库' : 'Upload');
  }

  function cancelLibraryUpload() {
    if (libraryUploadRun) libraryUploadRun.cancelled = true;
    resetLibraryUploadButton();
    closeLibraryUploadModal();
  }

  function updateLibraryUploadMode(kind) {
    // 图库的品类（标签二）改在图片预览上点选，弹窗里不再放下拉框
    document.querySelectorAll('#library-upload-modal [data-upload-tag-picker="tag2"]').forEach(function(picker) {
      picker.hidden = kind === 'gallery';
    });
    document.querySelectorAll('[data-upload-mode]').forEach(node => {
      node.hidden = node.dataset.uploadMode !== kind;
    });
    document.querySelectorAll('[data-upload-kind-card]').forEach(button => {
      button.classList.toggle('active', button.dataset.uploadKindCard === kind);
      button.setAttribute('aria-checked', button.dataset.uploadKindCard === kind ? 'true' : 'false');
    });
    const countryField = document.getElementById('upload-country-field');
    const activityField = document.getElementById('upload-activity-field');
    if (countryField) countryField.style.display = kind === 'gallery' ? '' : 'none';
    if (activityField) activityField.style.display = kind === 'template' ? '' : 'none';
    // 案例库项目化：标题=项目名称（必填）；标签改由标签面板选择。
    const isSource = kind === 'source';
    const titleLabel = document.getElementById('library-upload-title-label');
    const titleInput = document.getElementById('library-upload-title');
    if (titleLabel) titleLabel.textContent = isSource ? (state.lang === 'zh' ? '项目名称' : 'Project name') : (state.lang === 'zh' ? '素材名称' : 'Asset title');
    if (titleInput) {
      titleInput.required = isSource;
      titleInput.placeholder = isSource
        ? (state.lang === 'zh' ? '例如：斋月营销活动' : 'e.g. Ramadan campaign')
        : (state.lang === 'zh' ? '选填，不填则不显示名称' : 'Optional');
    }
    const tagControls = document.getElementById('library-upload-tag-controls');
    const metaRow = document.getElementById('upload-meta-row');
    const tagBar = document.getElementById('upload-case-tag-bar');
    // 案例库用标签气泡条 + 浮窗点选；图库/模板库沿用旧标签区 + 国家/活动下拉
    if (tagBar) { tagBar.hidden = !isSource; wireCaseTagBar(tagBar); }
    if (metaRow) metaRow.hidden = isSource;
    if (tagControls) tagControls.hidden = isSource;
    // 物料所有者：可输入可联想（候选来自团队管理页的使用者名单 + 历史姓名）
    wireOwnerCombobox(document.getElementById('library-upload-modal'));
    setTimeout(function() { populateUploadMetaPickers(); }, 50);

  }

  function wireLibraryUploadKindCards() {
    const kind = document.getElementById('library-upload-kind')?.value || 'source';
    updateLibraryUploadMode(kind);
  }

  function wireUploadTagPickers() {
    document.querySelectorAll('#library-upload-modal [data-upload-tag-option]').forEach(button => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const key = button.dataset.uploadTagOption;
        const value = button.dataset.uploadTagValue || 'all';
        const picker = button.closest('[data-upload-tag-picker]');
        const input = document.querySelector(`#library-upload-modal [data-upload-tag-input="${key}"]`);
        if (input) input.value = value;
        if (picker) {
          picker.querySelectorAll('[data-upload-tag-option]').forEach(option => option.classList.toggle('active', option === button));
          var label;
          if (value === 'all') {
            label = state.lang === 'zh' ? '未分类' : 'Unclassified';
          } else if (key === 'country' || key === 'activity') {
            label = button.textContent.trim();
          } else {
            label = value;
          }
          const triggerLabel = picker.querySelector('[data-upload-tag-trigger] strong');
          if (triggerLabel) triggerLabel.textContent = label;
          picker.classList.remove('menu-open');
        }

        if (key === 'tag1') {
          const newVal = value === 'all' ? 'all' : value;
          if (newVal !== state.libraryFilters.uploadTag1) {
            state.libraryFilters.uploadTag1 = newVal;
            const kind = document.getElementById('library-upload-kind')?.value || 'gallery';
            document.getElementById('library-upload-tag-controls').innerHTML = renderUploadTagControls(kind);
            wireUploadTagPickers();
            wireUploadTagHover();
          }
        }
      });
    });
  }

  function wireUploadTagHover() {
    document.querySelectorAll('#library-upload-modal .upload-tag-picker').forEach(function(picker) {
      if (picker.dataset.hoverBound === 'true') return;
      picker.dataset.hoverBound = 'true';
      var menu = picker.querySelector('.upload-tag-menu');
      if (!menu) return;
      var hideTimer = null;

      // 菜单超出弹窗滚动区底边会被裁切：空间不够就向上弹，并限制菜单高度（与物料所有者联想框同一套算法）
      function positionMenu() {
        var clip = picker.closest('.library-upload-scroll') || picker.closest('.library-modal') || picker.closest('.modal');
        var clipRect = (clip || document.documentElement).getBoundingClientRect();
        var pickerRect = picker.getBoundingClientRect();
        var gap = 8;
        var below = clipRect.bottom - pickerRect.bottom - gap - 8;
        var above = pickerRect.top - clipRect.top - gap - 8;
        var openUp = below < 140 && above > below;
        menu.style.maxHeight = Math.max(96, Math.min(220, openUp ? above : below)) + 'px';
        if (openUp) {
          menu.style.top = 'auto';
          menu.style.bottom = 'calc(100% + ' + gap + 'px)';
        } else {
          menu.style.top = '';
          menu.style.bottom = '';
        }
      }

      function showMenu() {
        clearTimeout(hideTimer);
        positionMenu();
        picker.classList.add('menu-open');
      }
      function hideMenu() {
        hideTimer = setTimeout(function() {
          picker.classList.remove('menu-open');
        }, 150);
      }
      function hideNow() {
        clearTimeout(hideTimer);
        picker.classList.remove('menu-open');
      }

      picker.addEventListener('mouseenter', showMenu);
      picker.addEventListener('focusin', positionMenu);
      picker.addEventListener('mouseleave', hideMenu);
      if (menu) {
        menu.addEventListener('mouseenter', showMenu);
        menu.addEventListener('mouseleave', hideNow);
      }
    });
  }

  function populateUploadMetaPickers() {
    ['country', 'activity'].forEach(function(type) {
      var menu = document.querySelector('#library-upload-modal [data-upload-meta-menu="' + type + '"]');
      if (!menu) return;
      var key = 'upload' + type.charAt(0).toUpperCase() + type.slice(1);
      var selectedVal = state.libraryFilters[key] || 'all';
      var items = libraryOptions(type);
      var emptyLabel = state.lang === 'zh' ? '全部' : 'All';
      var allActive = selectedVal === 'all';
      var html = '<button type="button" class="' + (allActive ? 'active' : '') + '" data-upload-tag-option="' + type + '" data-upload-tag-value="all">' + emptyLabel + '</button>';
      html += items.map(function(item) {
        var isActive = selectedVal === item.id;
        return '<button type="button" class="' + (isActive ? 'active' : '') + '" data-upload-tag-option="' + type + '" data-upload-tag-value="' + item.id + '">' + escapeHtml(optionName(item)) + '</button>';
      }).join('');
      menu.innerHTML = html;
      // 同步更新隐藏 input 和触发按钮的文字
      var input = document.querySelector('#library-upload-modal [data-upload-tag-input="' + type + '"]');
      if (input) input.value = selectedVal;
      var triggerLabel = document.querySelector('#library-upload-modal [data-upload-tag-trigger="' + type + '"] strong');
      if (triggerLabel) {
        if (selectedVal === 'all') {
          triggerLabel.textContent = state.lang === 'zh' ? '全部' : 'All';
        } else {
          var selItem = items.find(function(it) { return it.id === selectedVal; });
          triggerLabel.textContent = selItem ? optionName(selItem) : selectedVal;
        }
      }
    });
    wireUploadTagPickers();
    wireUploadTagHover();
  }

  function populateEditMetaPickers() {
    ['country', 'activity'].forEach(function(type) {
      var menu = document.querySelector('#library-edit-modal [data-upload-meta-menu="' + type + '"]');
      if (!menu) return;
      var items = libraryOptions(type);
      var emptyLabel = state.lang === 'zh' ? '全部' : 'All';
      var html = '<button type="button" class="active" data-upload-tag-option="' + type + '" data-upload-tag-value="all">' + emptyLabel + '</button>';
      html += items.map(function(item) {
        return '<button type="button" data-upload-tag-option="' + type + '" data-upload-tag-value="' + item.id + '">' + escapeHtml(optionName(item)) + '</button>';
      }).join('');
      menu.innerHTML = html;
    });
    wireEditTagPickers();
    wireEditTagHover();
  }

  function populateEditKindPicker(currentKind) {
    currentKind = currentKind || 'source';
    var menu = document.getElementById('edit-kind-menu');
    if (!menu) return;
    var kinds = [
      { id: 'source', zh: '案例库', en: 'Case Library' },
      { id: 'gallery', zh: '图库', en: 'Gallery' },
      { id: 'template', zh: '模板库', en: 'Templates' }
    ];
    var html = '';
    kinds.forEach(function(k) {
      var label = state.lang === 'zh' ? k.zh : k.en;
      var active = k.id === currentKind ? ' active' : '';
      html += '<button type="button" class="' + active + '" data-edit-kind-option="' + k.id + '">' + label + '</button>';
    });
    menu.innerHTML = html;
    // 更新 trigger 显示
    var found = kinds.find(function(k) { return k.id === currentKind; });
    var label = found ? (state.lang === 'zh' ? found.zh : found.en) : currentKind;
    var triggerLabel = document.querySelector('#edit-kind-field [data-upload-tag-trigger] strong');
    if (triggerLabel) triggerLabel.textContent = label;
    // 绑定 kind 选项点击
    menu.querySelectorAll('[data-edit-kind-option]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var newKind = btn.dataset.editKindOption;
        // 更新 hidden input
        document.getElementById('library-edit-kind').value = newKind;
        document.getElementById('library-edit-kind-value').value = newKind;
        // 更新 trigger 显示
        var kf = [{ id: 'source', zh: '案例库', en: 'Case Library' }, { id: 'gallery', zh: '图库', en: 'Gallery' }, { id: 'template', zh: '模板库', en: 'Templates' }].find(function(k) { return k.id === newKind; });
        var lbl = kf ? (state.lang === 'zh' ? kf.zh : kf.en) : newKind;
        var tl = document.querySelector('#edit-kind-field [data-upload-tag-trigger] strong');
        if (tl) tl.textContent = lbl;
        // 更新菜单选中态
        menu.querySelectorAll('[data-edit-kind-option]').forEach(function(b) { b.classList.toggle('active', b === btn); });
        // 关闭菜单
        document.getElementById('edit-kind-field').classList.remove('menu-open');
        // 重置 tag 值并重新渲染 tag controls
        ['uploadTag1','uploadTag2','uploadTag3','uploadTag4'].forEach(function(key) { state.libraryFilters[key] = 'all'; });
        document.getElementById('library-edit-tag-controls').innerHTML = renderUploadTagControls(newKind);
        wireUploadTagPickers();
        wireUploadTagHover();
        // 根据 kind 显示/隐藏国家和活动
        var cf = document.getElementById('edit-country-field');
        var af = document.getElementById('edit-activity-field');
        if (cf) cf.style.display = (newKind === 'gallery' || newKind === 'source') ? '' : 'none';
        if (af) af.style.display = (newKind === 'source' || newKind === 'template') ? '' : 'none';
      });
    });
  }

  function wireEditTagPickers(scope) {
    scope = scope || ':is(#library-edit-modal, #batch-edit-modal)';
    document.querySelectorAll(scope + ' [data-upload-tag-option]').forEach(function(button) {
      if (button.dataset.editBound === 'true') return;
      button.dataset.editBound = 'true';
      button.addEventListener('click', function() {
        var key = button.dataset.uploadTagOption;
        var value = button.dataset.uploadTagValue || 'all';
        var picker = button.closest('[data-upload-tag-picker]');
        var input = picker.querySelector('[data-upload-tag-input="' + key + '"]');
        if (input) input.value = value;
        if (picker) {
          picker.querySelectorAll('[data-upload-tag-option]').forEach(function(option) { option.classList.toggle('active', option === button); });
          var label = value === 'all' ? (state.lang === 'zh' ? '全部' : 'All') : button.textContent.trim();
          var triggerLabel = picker.querySelector('[data-upload-tag-trigger] strong');
          if (triggerLabel) triggerLabel.textContent = label;
          picker.classList.remove('menu-open');
        }
      });
    });
  }

  function wireEditTagHover(scope) {
    scope = scope || ':is(#library-edit-modal, #batch-edit-modal)';
    document.querySelectorAll(scope + ' .upload-tag-picker').forEach(function(picker) {
      if (picker.dataset.editHoverBound === 'true') return;
      picker.dataset.editHoverBound = 'true';
      var menu = picker.querySelector('.upload-tag-menu');
      if (!menu) return;
      var hideTimer = null;
      function showMenu() { clearTimeout(hideTimer); picker.classList.add('menu-open'); }
      function hideMenu() { hideTimer = setTimeout(function() { picker.classList.remove('menu-open'); }, 350); }
      function hideNow() { clearTimeout(hideTimer); picker.classList.remove('menu-open'); }
      function toggleMenu() { clearTimeout(hideTimer); picker.classList.toggle('menu-open'); }
      picker.addEventListener('mouseenter', showMenu);
      picker.addEventListener('mouseleave', hideMenu);
      if (menu) { menu.addEventListener('mouseenter', showMenu); menu.addEventListener('mouseleave', hideNow); }
      // 点击触发器也可以开关菜单（兜底）
      var trigger = picker.querySelector('[data-upload-tag-trigger]');
      if (trigger) { trigger.addEventListener('click', function(e) { e.stopPropagation(); toggleMenu(); }); }
    });
  }

  function filterOversizedFiles(input) {
    // 不再拦截大文件，上传时自动压缩
  }

  function wireLibraryUploadDrops() {
    document.querySelectorAll('.library-drop-zone').forEach(zone => {
      const input = document.getElementById(zone.dataset.dropInput);
      if (!input) return;
      input.addEventListener('change', () => {
        if (!canUploadAssets()) {
          input.value = '';
          zone.classList.remove('dragging');
          closeLibraryUploadModal();
          return;
        }
        filterOversizedFiles(input);
        updateDropZoneSummary(zone, input.files);
        // 有文件时让隐形 input 不拦截点击，× 按钮才能被点到
        input.style.pointerEvents = (input.files && input.files.length) ? 'none' : '';
      });
      zone.addEventListener('dragenter', event => {
        event.preventDefault();
        if (!canUploadAssets()) {
          event.dataTransfer.dropEffect = 'none';
          zone.classList.remove('dragging');
          return;
        }
        zone.classList.add('dragging');
      });
      zone.addEventListener('dragover', event => {
        event.preventDefault();
        if (!canUploadAssets()) {
          event.dataTransfer.dropEffect = 'none';
          zone.classList.remove('dragging');
          return;
        }
        zone.classList.add('dragging');
      });
      zone.addEventListener('dragleave', event => {
        if (!zone.contains(event.relatedTarget)) zone.classList.remove('dragging');
      });
      zone.addEventListener('drop', event => {
        event.preventDefault();
        zone.classList.remove('dragging');
        if (!canUploadAssets()) return;
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return;
        // 根据 input 的 accept 属性过滤文件
        const accept = (input.getAttribute('accept') || '').toLowerCase();
        let acceptedFiles = files;
        if (accept) {
          const allowedExts = accept.split(',').map(function(s) { return s.trim().replace('.', '').toLowerCase(); });
          acceptedFiles = files.filter(function(file) {
            var ext = (file.name.split('.').pop() || '').toLowerCase();
            var mime = (file.type || '').toLowerCase();
            return allowedExts.some(function(a) { return ext === a || mime.includes(a) || (a === 'pdf' && mime === 'application/pdf'); });
          });
        }
        if (!acceptedFiles.length) return;
        const dt = new DataTransfer();
        // 保留已有的文件（多选 input 追加而非替换）
        if (input.multiple) {
          Array.from(input.files || []).forEach(function(f) { dt.items.add(f); });
        }
        const maxFiles = input.multiple ? acceptedFiles.length : 1;
        acceptedFiles.slice(0, maxFiles).forEach(file => dt.items.add(file));
        input.files = dt.files;
        updateDropZoneSummary(zone, input.files);
        const titleInput = document.getElementById('library-upload-title');
        if (titleInput && !titleInput.value.trim() && input.id !== 'library-preview-input') {
          titleInput.value = stripExtension(acceptedFiles[0].name);
        }
      });
    });
  }

  // 案例库上传：大图预览网格。每张图一个类型下拉（初始值=尺寸自动识别，
  // 用户手选后以手选为准——select 的 dataset.touched 标记保护手动选择不被异步识别覆盖）。
  function renderCaseDropGrid(zone, fileList) {
    const files = Array.from(fileList || []);
    const grid = document.getElementById('case-drop-panel');
    if (!grid) return;
    const has = files.length > 0;
    // 拖入文件后隐藏提示区（图标+标题+说明+文件名行），只留缩略图列表。
    const head = zone.querySelector('.case-zone-head');
    const summary = zone.querySelector('[data-file-summary]');
    if (head) head.style.display = has ? 'none' : '';
    if (summary) summary.style.display = has ? 'none' : '';
    if (!has) {
      clearCaseElementSuggestions(document.getElementById('upload-case-tag-bar'));
      clearCaseAutoQuantity(document.getElementById('upload-case-tag-bar'));
      zone.style.removeProperty('display');
      grid.hidden = true;
      grid.innerHTML = '';
      return;
    }
    grid.hidden = false;
    // 有文件后收起提示区（输入框保留在 DOM，表单仍能读取文件）；
    // 面板接管拖放与点击，用于继续追加图片。
    zone.style.setProperty('display', 'none', 'important');
    if (!grid.dataset.dropBound) {
      grid.dataset.dropBound = '1';
      grid.addEventListener('dragover', event => event.preventDefault());
      grid.addEventListener('drop', event => {
        event.preventDefault();
        const input = document.getElementById('library-preview-input');
        if (!input) return;
        const dto = new DataTransfer();
        Array.from(input.files || []).forEach(f => dto.items.add(f));
        const incoming = collectDroppedFiles(event);
        const accepted = incoming.filter(f => isCasePreviewFile(f));
        accepted.forEach(f => dto.items.add(f));
        if (!accepted.length && incoming.length) showCaseToast(state.lang === 'zh' ? ('不支持的文件类型：' + incoming.map(f => f.name).join('、').slice(0, 36)) : ('Unsupported file type: ' + incoming.map(f => f.name).join(', ').slice(0, 36)), 3600);
        if (dto.files.length) { input.files = dto.files; updateDropZoneSummary(zone, input.files); }
      });
      grid.addEventListener('click', event => {
        if (event.target !== grid) return;
        const input = document.getElementById('library-preview-input');
        if (input) input.click();
      });
    }
    const chipOptions = type => [''].concat(materialCatalogTypeNames(uploadCasePlatform())).map(t =>
      `<option value="${escapeAttr(t)}"${t === type ? ' selected' : ''}>${escapeHtml(t || '未分类')}</option>`
    ).join('');
    grid.innerHTML = files.map((file, i) =>
      '<div class="case-drop-card" data-file-index="' + i + '">' +
        '<div class="case-drop-thumb">' +
          (isCaseVideoFile(file)
            ? '<video src="' + URL.createObjectURL(file) + '" muted playsinline preload="metadata"></video><span class="case-drop-mp4">MP4</span>'
            : '<img src="' + URL.createObjectURL(file) + '" alt="" loading="lazy">') +
          '<button type="button" class="drop-thumb-del" data-file-index="' + i + '" data-drop-input="' + zone.dataset.dropInput + '">&times;</button>' +
          '<button type="button" class="case-drop-type untyped" data-case-type-label="' + i + '" title="点击修改分类">未分类</button>' +
        '</div>' +
        '<div class="case-drop-name" data-case-dims-index="' + i + '">' + escapeHtml(file.name) + '</div>' +
        '<select class="case-type-chip case-type-hidden" data-case-type-index="' + i + '" tabindex="-1">' + chipOptions('') + '</select>' +
      '</div>'
    ).join('');
    const syncTypeLabel = (index, value) => {
      const label = grid.querySelector('[data-case-type-label="' + index + '"]');
      if (!label) return;
      label.textContent = value || '未分类';
      label.classList.toggle('untyped', !value);
    };
    const syncChip = select => {
      select.classList.toggle('untyped', !select.value);
      syncTypeLabel(select.getAttribute('data-case-type-index'), select.value);
    };
    // 点击悬浮小标签 → 弹出分类菜单（原生 select 隐藏保留，作为提交数据来源）
    const closeTypeMenu = () => {
      const menu = document.getElementById('case-type-menu');
      if (menu) menu.remove();
    };
    grid.querySelectorAll('[data-case-type-label]').forEach(label => {
      label.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        const index = this.getAttribute('data-case-type-label');
        const select = grid.querySelector('select[data-case-type-index="' + index + '"]');
        if (!select) return;
        const existing = document.getElementById('case-type-menu');
        closeTypeMenu();
        if (existing && existing.dataset.forIndex === index) return;
        const menu = document.createElement('div');
        menu.id = 'case-type-menu';
        menu.className = 'case-type-menu';
        menu.dataset.forIndex = index;
        menu.innerHTML = [''].concat(materialCatalogTypeNames(uploadCasePlatform())).map(v =>
          '<button type="button" data-type-value="' + escapeAttr(v) + '">' + escapeHtml(v || '未分类') + '</button>'
        ).join('');
        document.body.append(menu);
        const rect = this.getBoundingClientRect();
        menu.style.top = (rect.bottom + 6) + 'px';
        menu.style.left = Math.max(8, Math.min(window.innerWidth - 150, rect.left)) + 'px';
        menu.addEventListener('click', ev => {
          const btn = ev.target.closest('[data-type-value]');
          if (!btn) return;
          select.value = btn.getAttribute('data-type-value');
          select.dataset.touched = '1';
          syncChip(select);
          closeTypeMenu();
        });
        setTimeout(() => document.addEventListener('click', closeTypeMenu, { once: true }), 0);
      });
    });
    grid.querySelectorAll('.drop-thumb-del').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        removeDropFile(btn.dataset.dropInput, parseInt(btn.dataset.fileIndex, 10));
      });
    });
    // 同尺寸物料（同一坑位的 EN/AR 等版本）手动改一个，整组同步。
    function syncSameDimsChips(source) {
      const sourceIndex = source.getAttribute('data-case-type-index');
      const dims = window.caseDropDims && window.caseDropDims[sourceIndex];
      if (!dims) return;
      grid.querySelectorAll('select[data-case-type-index]').forEach(other => {
        if (other === source) return;
        const otherIndex = other.getAttribute('data-case-type-index');
        if (window.caseDropDims && window.caseDropDims[otherIndex] === dims) {
          other.value = source.value;
          other.dataset.touched = '1';
          syncChip(other);
        }
      });
    }
    grid.querySelectorAll('.case-type-chip').forEach(select => {
      select.addEventListener('change', function() { this.dataset.touched = '1'; syncChip(this); syncSameDimsChips(this); });
    });
    window.caseDropDims = window.caseDropDims || {};
    const autoTagBar = document.getElementById('upload-case-tag-bar');
    const autoTagBatchKey = files.map(function(file) { return file.name + '|' + file.size + '|' + file.lastModified; }).join('||');
    if (autoTagBar) {
      if (autoTagBar.dataset.caseAutoTagBatchKey !== autoTagBatchKey) clearCaseAutoQuantity(autoTagBar);
      autoTagBar.dataset.caseAutoTagBatchKey = autoTagBatchKey;
    }
    // 清单是识别的唯一依据：这一批文件识别前先确保清单是最新的（60 秒内直接复用）
    const materialCatalogReady = refreshMaterialCatalogForCases();
    const dimensionTasks = files.map(function(file, i) {
      const videoFile = isCaseVideoFile(file);
      const dimsPromise = videoFile ? readVideoDimensions(file) : readImageDimensions(file);
      return dimsPromise.then(async function(dims) {
        await materialCatalogReady;
        window.caseDropDims[i] = dims.width + 'x' + dims.height;
        const dimNode = grid.querySelector('[data-case-dims-index="' + i + '"]');
        if (dimNode && dimNode.isConnected) dimNode.textContent = dims.width + '×' + dims.height + ' · ' + file.name;
        const select = grid.querySelector('select[data-case-type-index="' + i + '"]');
        if (!select || select.dataset.touched === '1' || !select.isConnected) return dims;
        // 与提交口径一致：视频/GIF 是动态物料，其余按物料清单尺寸识别
        const detected = videoFile ? caseDynamicMaterialType(uploadCasePlatform()) : detectCaseMaterialType(file.name, dims.width, dims.height, uploadCasePlatform());
        if (detected) select.value = detected;
        syncChip(select);
        return dims;
      }).catch(function() { return null; });
    });
    void Promise.all(dimensionTasks).then(function(dimensions) {
      if (!autoTagBar || !autoTagBar.isConnected || autoTagBar.dataset.caseAutoTagBatchKey !== autoTagBatchKey) return;
      if (dimensions.some(function(dims) { return !dims; })) return;
      applyCaseAutoQuantity(autoTagBar, dimensions);
    });
    // 多图时优先让 AI 识别开屏；没有开屏才回退第一张图片。同一批/同一优先图只跑一次。
    const aiImages = files.filter(function(file) { return file && /^image\//.test(file.type || '') && !isCaseVideoFile(file); });
    const tagBar = document.getElementById('upload-case-tag-bar');
    if (aiImages.length && tagBar && !tagBar.hidden) {
      const batchKey = aiImages.map(function(file) { return file.name + '|' + file.size + '|' + file.lastModified; }).join('||');
      tagBar.dataset.aiElementBatchKey = batchKey;
      void selectCaseElementSuggestionFile(aiImages).then(function(priorityImage) {
        if (!priorityImage || !tagBar.isConnected || tagBar.dataset.aiElementBatchKey !== batchKey) return;
        const aiKey = priorityImage.name + '|' + priorityImage.size + '|' + priorityImage.lastModified;
        if (tagBar.dataset.aiElementKey === aiKey) return;
        tagBar.dataset.aiElementKey = aiKey;
        void requestCaseElementSuggestions(tagBar, priorityImage);
      });
    }
  }

  // 图库预览：与案例库同一套卡片（固定容器 / 原比例 / hover 删除 / 有图隐藏提示），仅无分类标签
  // 图库品类（标签二）：直接标在图片预览上，点一下可手动改。识别到就直接显示，不给「建议」。
  // 图库上传＝一个文件一个 source，所以每个文件各自记一份品类；没识别出／判断不出＝「未分类」。
  const galleryTypeChoices = Object.create(null);   // {fileKey: 品类}
  const galleryTypeTouched = Object.create(null);   // 用户手改过的文件，识别结果不再覆盖
  const galleryTypePending = Object.create(null);   // 正在识别中的文件

  function galleryFileKey(file) {
    return file ? String(file.name) + '|' + String(file.size) + '|' + String(file.lastModified) : '';
  }

  function galleryTypeValueOf(file) {
    return galleryTypeChoices[galleryFileKey(file)] || '';
  }

  function galleryTypeChipLabel(file) {
    const key = galleryFileKey(file);
    if (galleryTypePending[key]) return state.lang === 'zh' ? '识别中…' : 'Detecting…';
    return galleryTypeChoices[key] || (state.lang === 'zh' ? '未分类' : 'Unclassified');
  }

  function syncGalleryTypeChips() {
    const grid = document.getElementById('gallery-drop-panel');
    if (!grid) return;
    const files = window.__vfGalleryDropFiles || [];
    grid.querySelectorAll('[data-gallery-type-chip]').forEach(function(chip) {
      const file = files[Number(chip.getAttribute('data-gallery-type-chip'))];
      if (!file) return;
      const key = galleryFileKey(file);
      chip.textContent = galleryTypeChipLabel(file);
      chip.classList.toggle('untyped', !galleryTypeChoices[key]);
      chip.classList.toggle('is-detecting', !!galleryTypePending[key]);
    });
  }

  function setGalleryTypeValue(file, value, touched) {
    const key = galleryFileKey(file);
    if (!key) return;
    if (value) galleryTypeChoices[key] = value; else delete galleryTypeChoices[key];
    if (touched) galleryTypeTouched[key] = '1';
    syncGalleryTypeChips();
  }

  function openGalleryTypeMenu(anchor, file) {
    const stale = document.getElementById('gallery-type-menu');
    if (stale) stale.remove();
    const menu = document.createElement('div');
    menu.id = 'gallery-type-menu';
    menu.className = 'case-type-menu';
    const current = galleryTypeValueOf(file);
    menu.innerHTML = [''].concat(galleryTypeVocabulary()).map(function(value) {
      return '<button type="button" data-gallery-type-value="' + escapeAttr(value) + '"' + (value === current ? ' class="active"' : '') + '>' +
        escapeHtml(value || (state.lang === 'zh' ? '未分类' : 'Unclassified')) + '</button>';
    }).join('');
    document.body.append(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(rect.left - 60, window.innerWidth - 170)) + 'px';
    menu.style.top = Math.min(rect.bottom + 6, window.innerHeight - 300) + 'px';
    const close = function() {
      menu.remove();
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
    menu.addEventListener('click', function(event) {
      const button = event.target.closest('[data-gallery-type-value]');
      if (!button) return;
      event.stopPropagation();
      setGalleryTypeValue(file, button.getAttribute('data-gallery-type-value'), true);
      close();
    });
    setTimeout(function() {
      document.addEventListener('click', close);
      window.addEventListener('scroll', close, true);
    }, 0);
  }

  // 图库「品类」全量词表（去重、去掉「未分类」）：识别和手动改都只认这里面的词
  function galleryTypeVocabulary() {
    const map = (LIBRARY_TAGS.gallery && LIBRARY_TAGS.gallery.tag2ByTag1) || {};
    const values = [];
    Object.keys(map).forEach(function(key) {
      (map[key] || []).forEach(function(value) {
        if (value && value !== '未分类' && values.indexOf(value) < 0) values.push(value);
      });
    });
    return values;
  }

  // 品类词表按当前「标签一」收窄：选了 LOGO素材 就不该再出现「汉堡」，没选就是全部品类
  function galleryTypeVocabularyForSelection() {
    const controls = document.getElementById('library-upload-tag-controls');
    const input = controls ? controls.querySelector('[data-upload-tag-input="tag1"]') : null;
    const tag1 = input ? String(input.value || '') : '';
    const map = (LIBRARY_TAGS.gallery && LIBRARY_TAGS.gallery.tag2ByTag1) || {};
    const selected = (tag1 && tag1 !== 'all' && map[tag1]) ? map[tag1] : null;
    if (!selected) return galleryTypeVocabulary();
    return selected.filter(function(value) { return value && value !== '未分类'; });
  }

  async function classifyGalleryFile(file) {
    const key = galleryFileKey(file);
    if (!file || !key || state.localPreview) return;
    if (galleryTypeTouched[key]) return;
    const token = (state.session && state.session.access_token) || '';
    if (!token) return;
    galleryTypePending[key] = '1';
    syncGalleryTypeChips();
    try {
      const image = await caseElementThumbnailDataUrl(file);
      if (galleryTypeTouched[key]) return;
      const response = await fetch('/api/analyze-gallery-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ image: image, vocabulary: galleryTypeVocabularyForSelection() })
      });
      const data = await response.json().catch(function() { return null; });
      const tag = data && data.success ? String(data.tag || '') : '';
      // 识别结果为空＝保持「未分类」，不写任何值
      if (!galleryTypeTouched[key]) setGalleryTypeValue(file, tag, false);
    } catch (_error) {
      // 识别失败＝保持「未分类」，不打扰用户
    } finally {
      delete galleryTypePending[key];
      syncGalleryTypeChips();
    }
  }

  // 每张图各自识图（不是只看第一张）：整批都跑，并发 3 个，避免几十张图同时打接口
  function classifyGalleryFiles(files) {
    const images = Array.from(files || []).filter(function(file) { return file && /^image\//.test(file.type || ''); });
    if (!images.length) return;
    void mapWithConcurrency(images, 3, function(file) {
      return classifyGalleryFile(file);
    });
  }

  function wireGalleryTypeChips(grid) {
    if (grid.dataset.galleryTypeBound === '1') return;
    grid.dataset.galleryTypeBound = '1';
    grid.addEventListener('click', function(event) {
      const chip = event.target.closest('[data-gallery-type-chip]');
      if (!chip) return;
      event.preventDefault();
      event.stopPropagation();
      const file = (window.__vfGalleryDropFiles || [])[Number(chip.getAttribute('data-gallery-type-chip'))];
      if (!file) return;
      openGalleryTypeMenu(chip, file);
    });
  }

  // 保存用：图库每个文件写各自的品类（标签二），弹窗里那个被隐藏的标签二不参与
  function galleryTagsForFile(formData, file) {
    const vocabulary = galleryTypeVocabulary();
    const tags = libraryTagsForForm(formData, 'gallery').filter(function(tag) {
      return vocabulary.indexOf(tag) < 0;
    });
    const value = galleryTypeValueOf(file);
    if (value) tags.push(value);
    return normalizeLibraryTags('gallery', tags);
  }

  function renderGalleryDropGrid(zone, fileList) {
    const files = Array.from(fileList || []);
    const grid = document.getElementById('gallery-drop-panel');
    if (!grid) return;
    const has = files.length > 0;
    const head = zone.querySelector('.drop-zone-head');
    const summary = zone.querySelector('[data-file-summary]');
    if (head) head.style.display = has ? 'none' : '';
    if (summary) summary.style.display = has ? 'none' : '';
    // 有图时整个拖拽框收起，避免上方留出空白（输入框保留在 DOM，表单仍能读取文件）
    if (has) zone.style.setProperty('display', 'none', 'important');
    else zone.style.removeProperty('display');
    if (!has) {
      grid.hidden = true;
      grid.innerHTML = '';
      return;
    }
    grid.hidden = false;
    window.__vfGalleryDropFiles = files;
    grid.innerHTML = files.map((file, i) =>
      '<div class="case-drop-card" data-file-index="' + i + '">' +
        '<div class="case-drop-thumb">' +
          '<img src="' + URL.createObjectURL(file) + '" alt="" loading="lazy">' +
          '<button type="button" class="case-drop-type" data-gallery-type-chip="' + i + '" title="' + (state.lang === 'zh' ? '点击修改品类' : 'Change category') + '">' + escapeHtml(galleryTypeChipLabel(file)) + '</button>' +
          '<button type="button" class="drop-thumb-del" data-file-index="' + i + '" data-drop-input="' + zone.dataset.dropInput + '">&times;</button>' +
        '</div>' +
        '<div class="case-drop-name">' + escapeHtml(file.name) + '</div>' +
      '</div>'
    ).join('');
    syncGalleryTypeChips();
    wireGalleryTypeChips(grid);
    grid.querySelectorAll('.drop-thumb-del').forEach(btn => {
      btn.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        removeDropFile(btn.dataset.dropInput, parseInt(btn.dataset.fileIndex, 10));
      });
    });
    if (!grid.dataset.dropBound) {
      grid.dataset.dropBound = '1';
      grid.addEventListener('dragover', event => event.preventDefault());
      grid.addEventListener('drop', event => {
        event.preventDefault();
        const input = document.getElementById('library-gallery-input');
        if (!input) return;
        const dto = new DataTransfer();
        Array.from(input.files || []).forEach(f => dto.items.add(f));
        Array.from(event.dataTransfer.files || []).forEach(f => { if (PREVIEW_MIME_TYPES.includes(f.type)) dto.items.add(f); });
        if (dto.files.length) { input.files = dto.files; updateDropZoneSummary(zone, input.files); }
      });
      grid.addEventListener('click', event => {
        if (event.target !== grid) return;
        const input = document.getElementById('library-gallery-input');
        if (input) input.click();
      });
    }
  }

  function updateDropZoneSummary(zone, fileList) {
    if (zone.hasAttribute('data-case-preview')) { renderCaseDropGrid(zone, fileList); return; }
    if (zone.hasAttribute('data-gallery-preview')) {
      renderGalleryDropGrid(zone, fileList);
      classifyGalleryFiles(fileList);   // 每张图各自识别品类，直接显示在图上
      return;
    }
    const files = Array.from(fileList || []);
    const summary = zone.querySelector('[data-file-summary]');
    const thumbStrip = zone.querySelector('[data-thumb-strip]');
    if (!files.length) {
      if (summary) {
        summary.style.display = 'none';
      }
      if (thumbStrip) { thumbStrip.style.display = 'none'; thumbStrip.innerHTML = ''; }
      return;
    }
    const isImage = files.some(function(f) { return (f.type || '').startsWith('image/'); });
    if (isImage && thumbStrip) {
      if (summary) summary.style.display = 'none';
      thumbStrip.style.display = '';
      thumbStrip.innerHTML = files.map(function(file, i) {
        var url = URL.createObjectURL(file);
        return '<div class="drop-thumb">' +
          '<img src="' + url + '" alt="">' +
          '<button type="button" class="drop-thumb-del" data-file-index="' + i + '" data-drop-input="' + zone.dataset.dropInput + '">&times;</button>' +
          '<small>' + escapeHtml(file.name) + '</small>' +
          '</div>';
      }).join('');
      thumbStrip.querySelectorAll('.drop-thumb-del').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          removeDropFile(btn.dataset.dropInput, parseInt(btn.dataset.fileIndex));
        });
      });
    } else if (summary) {
      summary.style.display = '';
      if (thumbStrip) thumbStrip.style.display = 'none';
      var names = files.slice(0, 3).map(function(f) { return f.name; }).join(' / ');
      var text = files.length > 3 ? names + ' +' + (files.length - 3) : names;
      summary.innerHTML = '<span>' + escapeHtml(text) + '</span>' +
        ' <button type="button" class="drop-file-clear" data-drop-input="' + zone.dataset.dropInput + '" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border:0;border-radius:999px;background:rgba(0,0,0,0.45);color:#fff;font-size:13px;line-height:1;cursor:pointer;padding:0;vertical-align:middle;">&times;</button>';
      summary.querySelector('.drop-file-clear').addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        removeDropFile(this.dataset.dropInput, 0);
      });
    }
  }

  function removeDropFile(inputId, index) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var files = Array.from(input.files || []);
    files.splice(index, 1);
    var dt = new DataTransfer();
    files.forEach(function(f) { dt.items.add(f); });
    input.files = dt.files;
    var zone = document.querySelector('[data-drop-input="' + inputId + '"]');
    if (zone) updateDropZoneSummary(zone, input.files);
  }

  async function uploadLibraryAsset(event) {
    event.preventDefault();
    if (!canUploadAssets()) {
      closeLibraryUploadModal();
      return;
    }
    const form = event.currentTarget;
    const submitButton = event.submitter || form.querySelector('button[type="submit"]');
    const originalSubmitText = submitButton?.textContent || '';
    const run = { cancelled: false };
    libraryUploadRun = run;
    const assertNotCancelled = function() {
      if (run.cancelled) throw new Error(LIBRARY_UPLOAD_CANCELLED);
    };
    if (submitButton) {
      if (!submitButton.dataset.defaultLabel) submitButton.dataset.defaultLabel = originalSubmitText.trim();
      submitButton.disabled = true;
      submitButton.textContent = state.lang === 'zh' ? '上传中...' : 'Uploading...';
    }
    const message = document.getElementById('library-upload-message');
    function setUploadProgress(pct, done, total) {
      const count = (typeof done === 'number' && typeof total === 'number' && total > 0)
        ? '<span class="upload-progress-count">' + done + '/' + total + ' 张</span>' : '';
      message.innerHTML = '<div class="upload-progress-row"><div class="upload-progress-bar-wrap"><div class="upload-progress-bar-fill" style="width:' + pct + '%"></div></div><span class="upload-progress-text">' + pct + '%</span>' + count + '</div>';
    }
    setUploadProgress(0);
    const uploadedPaths = [];
    let sourceInserted = false;
    let sourceId = '';
    try {
      const formData = new FormData(form);
      const libraryKind = formData.get('library_kind') || 'gallery';
      if (libraryKind === 'gallery') {
        await uploadGalleryAssets(formData, setUploadProgress, run);
        setUploadProgress(100);
        setMessage(message, state.lang === 'zh' ? '图库素材已上传。' : 'Gallery assets uploaded.', false, true);
        setTimeout(closeLibraryUploadModal, 600);
        state.libraryFilters.kind = 'gallery';
        await reloadLibraryData();
        return;
      }
      if (libraryKind === 'template') {
        setUploadProgress(20);
        await uploadTemplateAsset(formData);
        setUploadProgress(100);
        setMessage(message, state.lang === 'zh' ? '模板已上传。' : 'Template uploaded.', false, true);
        setTimeout(closeLibraryUploadModal, 600);
        state.libraryFilters.kind = 'template';
        await reloadLibraryData();
        return;
      }
      const previewFiles = Array.from(formData.getAll('preview_files')).filter(file => file && file.size > 0);
      const isCaseProject = libraryKind === 'source';
      const chipSel = isCaseProject ? ((document.getElementById('upload-case-tag-bar') || {})._caseTagSel || {}) : {};
      let sourceFile = null;
      if (isCaseProject) {
        validateCaseProjectUpload(previewFiles, formData, chipSel);
      } else {
        sourceFile = formData.get('source_file');
        validateLibraryUpload(sourceFile, previewFiles);
      }
      setUploadProgress(10);
      sourceId = crypto.randomUUID();
      const userId = state.session.user.id;
      let sourcePath = '';
      assertNotCancelled();
      if (!isCaseProject) {
        sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(sourceFile.name)}`;
        const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, sourceFile, { upsert: false, contentType: sourceFile.type || 'application/octet-stream' });
        if (sourceUpload.error) throw sourceUpload.error;
        uploadedPaths.push(sourcePath);
      }
      setUploadProgress(30);
      const title = formData.get('title').trim();
      const countryId = isCaseProject ? libraryOptionIdByZhName('country', chipSel.country) : formData.get('country');
      const activityId = isCaseProject ? libraryOptionIdByZhName('activity', caseTagSelFirst(chipSel, 'activity')) : formData.get('activity');
      const categoryId = formData.get('category');
      const sourceRow = {
        id: sourceId,
        title,
        country_id: (countryId && countryId !== 'all') ? countryId : null,
        activity_id: (activityId && activityId !== 'all') ? activityId : null,
        category_id: (categoryId && categoryId !== 'all') ? categoryId : null,
        tags: isCaseProject ? caseProjectTagsForChips(formData, chipSel) : libraryTagsForForm(formData, 'source'),
        visibility: formData.get('visibility') || 'all',
        source_path: sourcePath,
        source_filename: isCaseProject ? '' : sourceFile.name,
        source_mime_type: isCaseProject ? '' : (sourceFile.type || ''),
        source_size_bytes: isCaseProject ? 0 : sourceFile.size,
        source_ext: isCaseProject ? '' : fileExt(sourceFile.name),
        uploaded_by: userId
      };
      if (isCaseProject) {
        sourceRow.owner_name = String(formData.get('owner_name') || '').trim();
        // 大象编号：从使用者名单选中（或输入命中名单）时由 combo 的隐藏字段带过来
        sourceRow.owner_contact = String(formData.get('owner_contact') || '').trim();
        sourceRow.project_note = String(formData.get('project_link') || '').trim();
        sourceRow.download_link = String(formData.get('download_link') || '').trim();
        rememberCaseOwnerName(sourceRow.owner_name);
      }
      const sourceInsert = await state.supabase.from('vf_source_files').insert([sourceRow]);
      if (sourceInsert.error) throw translateCaseSchemaError(sourceInsert.error);
      caseSchemaReady = true; // 插入成功说明新字段已存在
      setUploadProgress(45);
      sourceInserted = true;
      let hasAllPreviewThumbnails = previewFiles.length > 0;
      // 进度按「文件数」算：素材大小差很多时按字节算会显示成「3/56 张却 62%」，看着像卡死。
      // 每个文件都会很快回来，按张数推进反而更直观，也和右边的「x/y 张」对得上。
      let previewDoneCount = 0;
      // 并行处理（最多 6 个同时）：素材多、单张上传慢的时候（跨境到存储只有几十 KB/s），
      // 多开几个流明显更快；上传原图、生成缩略图、读尺寸互相重叠
      await mapWithConcurrency(previewFiles, 6, async function(file, index) {
        assertNotCancelled();
        try {
        const videoFile = isCaseVideoFile(file);
        const previewId = crypto.randomUUID();
        const previewPath = `${userId}/previews/${sourceId}/${previewId}-${safeStorageName(file.name)}`;
        const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, file, { upsert: false, contentType: file.type || (videoFile ? caseVideoContentType(file) : 'application/octet-stream') });
        if (upload.error) throw upload.error;
        uploadedPaths.push(previewPath);
        // 图片一次解码同时拿尺寸与缩略图（视频仍走各自的解码）
        const decoded = videoFile ? null : await previewImageThumbnailAndDimensions(file, 480);
        let dimensions = decoded ? { width: decoded.width, height: decoded.height } : null;
        try {
          // GIF 保持动图：跳过静态缩略图（不算失败，不影响其它物料的缩略图标记）
          if (!isCaseGifFile(file)) {
            const generatedThumbnail = videoFile ? await generateVideoThumbnail(file, 480) : decoded.thumbnail;
            const thumbnailFile = generatedThumbnail || (!videoFile && file.size <= 512 * 1024 ? file : null);
            if (thumbnailFile) {
              const thumbnailPath = previewPath.replace(/\/[^/]+$/, '/_thumb-' + previewId + '.jpg');
              const thumbnailUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(thumbnailPath, thumbnailFile, {
                upsert: true,
                contentType: generatedThumbnail ? 'image/jpeg' : (file.type || 'image/jpeg')
              });
              if (thumbnailUpload.error) {
                hasAllPreviewThumbnails = false;
                console.warn('Case preview thumbnail upload failed:', thumbnailUpload.error);
              } else {
                uploadedPaths.push(thumbnailPath);
              }
            } else {
              hasAllPreviewThumbnails = false;
            }
          }
        } catch (thumbnailError) {
          hasAllPreviewThumbnails = false;
          console.warn('Case preview thumbnail generation failed:', thumbnailError);
        }
        if (!dimensions) dimensions = await readVideoDimensions(file);
        let materialType = '';
        if (isCaseProject) {
          const chip = document.querySelector(`#library-upload-modal select[data-case-type-index="${index}"]`);
          // 没手动改过就按物料清单识别；视频/GIF 是动态物料，归动态类别
          materialType = (chip?.value) || (videoFile ? caseDynamicMaterialType(uploadCasePlatform()) : detectCaseMaterialType(file.name, dimensions.width, dimensions.height, uploadCasePlatform()));
        }
        // 语言：文件名里有 en/ar 线索就以文件名为准；没有才识图判（识别不出记 none，EN/AR 筛选里照旧显示）
        const language = caseFilenameLanguage(file.name) || await detectLanguageFromImageFile(file);
        const previewRow = {
          id: previewId,
          source_file_id: sourceId,
          preview_path: previewPath,
          preview_filename: file.name,
          preview_mime_type: file.type || (videoFile ? caseVideoContentType(file) : ''),
          preview_size_bytes: file.size,
          width: dimensions.width,
          height: dimensions.height,
          material_type: materialType,
          sort_order: (index + 1) * 10
        };
        if (language && previewLanguageReady) previewRow.language = language;
        // 每张传完就写一行：几十张跨境上传要十几分钟，中途关窗/断网也能留下已经传好的部分
        // （失败或取消时删源文件行会级联删掉这些预览行）
        let previewInsert = await state.supabase.from('vf_asset_previews').insert([previewRow]);
        if (previewInsert.error && previewRow.language && isMissingLanguageColumnError(previewInsert.error)) {
          // 老库还没跑 sql/020：去掉 language 再试，别让整张图传不上去
          previewLanguageReady = false;
          delete previewRow.language;
          previewInsert = await state.supabase.from('vf_asset_previews').insert([previewRow]);
        }
        if (previewInsert.error) throw translateCaseSchemaError(previewInsert.error);
        void logAssetEvent('upload', { source: sourceRow, preview: { id: previewRow.id, preview_filename: previewRow.preview_filename, preview_path: previewRow.preview_path } });
        previewDoneCount += 1;
        setUploadProgress(45 + Math.round(50 * previewDoneCount / (previewFiles.length || 1)), previewDoneCount, previewFiles.length);
        return previewRow;
        } catch (itemError) {
          const reason = itemError && (itemError.message || itemError.error_description || itemError.name) || (state.lang === 'zh' ? '未知错误' : 'Unknown error');
          throw new Error(state.lang === 'zh' ? ('第 ' + (index + 1) + ' 个文件「' + (file && file.name || '') + '」处理失败：' + reason) : ('File ' + (index + 1) + ' "' + (file && file.name || '') + '" failed to process: ' + reason));
        }
      });
      setUploadProgress(95);
      assertNotCancelled();
      if (hasAllPreviewThumbnails) {
        sourceRow.tags = Array.from(new Set([...(sourceRow.tags || []), LIBRARY_PREVIEW_THUMBNAILS_TAG]));
        const thumbnailTagUpdate = await state.supabase.from('vf_source_files').update({ tags: sourceRow.tags }).eq('id', sourceId);
        if (thumbnailTagUpdate.error) throw thumbnailTagUpdate.error;
      }
      setUploadProgress(100);
      setMessage(message, state.lang === 'zh' ? '上传成功，已入库。' : 'Uploaded.', false, true);
      setTimeout(closeLibraryUploadModal, 600);
      await reloadLibraryData();
      if (isCaseProject) {
        rememberLastCaseUploadCountry(chipSel.country);
        rememberLastCaseUploadPlatform(caseTagSelFirst(chipSel, 'tag1'));
      }
    } catch (error) {
      // 用户点了取消：同样要回滚（可能已经写进去源文件和几张图），但不当成失败来提示
      await cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths);
      if (error && error.message === LIBRARY_UPLOAD_CANCELLED) return;
      setMessage(message, error.message, true);
    } finally {
      if (libraryUploadRun === run) libraryUploadRun = null;
      // 取消时按钮已经在 cancelLibraryUpload 里恢复过了，这里不要再动（可能已经是新一轮上传了）
      if (submitButton && !run.cancelled) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  }

  // 限制并发的工作队列：最多 limit 个任务同时进行，结果按输入顺序返回；
  // 某个任务失败后不再领新任务，等在途任务结束再抛出第一个错误（让调用方能在清理前拿到完整的已上传路径）
  async function mapWithConcurrency(items, limit, worker) {
    const list = Array.from(items || []);
    const results = new Array(list.length);
    const queue = list.map((item, index) => ({ item, index }));
    let failure = null;
    await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
      while (queue.length && !failure) {
        const job = queue.shift();
        try {
          results[job.index] = await worker(job.item, job.index);
        } catch (error) {
          failure = failure || error;
        }
      }
    }));
    if (failure) throw failure;
    return results;
  }

  // 图片一次解码同时拿到尺寸与缩略图（省掉重复解码）；解码失败不抛错，尺寸为 null、无缩略图
  // JPEG 存不了透明通道：画之前先铺白底，否则透明底的 PNG 做成封面会变黑底
  // （视频/视频帧那条路本来就没有透明，GIF 海报早就这么做，这里补上其余各处）
  function fillCanvasWhite(context, width, height) {
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  function previewImageThumbnailAndDimensions(file, maxWidth) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const width = img.naturalWidth || null;
        const height = img.naturalHeight || null;
        if (!width || !height) { resolve({ width, height, thumbnail: null }); return; }
        try {
          const ratio = Math.min(1, maxWidth / width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(width * ratio));
          canvas.height = Math.max(1, Math.round(height * ratio));
          const context = canvas.getContext('2d');
          fillCanvasWhite(context, canvas.width, canvas.height);
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            // 压缩后反而更大就放弃缩略图
            resolve({ width, height, thumbnail: blob && blob.size < file.size ? blob : null });
          }, 'image/jpeg', 0.7);
        } catch (_error) {
          resolve({ width, height, thumbnail: null });
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: null, height: null, thumbnail: null }); };
      img.src = url;
    });
  }

  function generateThumbnail(file, maxWidth) {
    maxWidth = maxWidth || 400;
    return new Promise(function(resolve, reject) {
      if (!file.type.startsWith('image/')) return resolve(null);
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var ratio = Math.min(1, maxWidth / img.width);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        var ctx = canvas.getContext('2d');
        fillCanvasWhite(ctx, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
          // 如果压缩后反而更大就放弃
          resolve(blob && blob.size < file.size ? blob : null);
        }, 'image/jpeg', 0.7);
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  function compressImageIfNeeded(file, maxSize) {
    maxSize = maxSize || 10 * 1024 * 1024; // 默认 10MB
    if (!file.type.startsWith('image/') || file.size <= maxSize) return Promise.resolve(file);
    return new Promise(function(resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        // 逐级降低质量直到满足大小
        function tryQuality(q) {
          canvas.width = img.width;
          canvas.height = img.height;
          fillCanvasWhite(ctx, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(function(blob) {
            if (!blob || blob.size <= maxSize || q <= 0.3) {
              resolve(blob && blob.size < file.size ? blob : file);
            } else {
              tryQuality(q - 0.1);
            }
          }, 'image/jpeg', q);
        }
        tryQuality(0.85);
      };
      img.onerror = function() { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function uploadGalleryAssets(formData, onProgress, run) {
    const files = Array.from(formData.getAll('gallery_files')).filter(file => file && file.size > 0);
    validateGalleryUpload(files);
    const userId = state.session.user.id;
    var baseTitle = formData.get('title').trim();
    const uploadedPaths = [];
    const insertedSourceIds = [];
    // 进度按字节加权：图库一次可传多张大图，按文件数算百分比会一直卡在 0
    const totalBytes = files.reduce((sum, file) => sum + (file.size || 1), 0);
    let doneBytes = 0;
    let doneCount = 0;
    const report = () => { if (onProgress) onProgress(Math.round(90 * doneBytes / (totalBytes || 1)), doneCount, files.length); };
    const cancelled = function() { return !!(run && run.cancelled); };
    try {
      report();
      // 并行上传（最多 3 张同时），比串行快数倍
      await mapWithConcurrency(files, 3, async function(file) {
        if (cancelled()) throw new Error(LIBRARY_UPLOAD_CANCELLED);
        // 压缩超大图片
        var uploadFile = file;
        if (file.size > 10 * 1024 * 1024) {
          uploadFile = await compressImageIfNeeded(file, 10 * 1024 * 1024);
        }
        const sourceId = crypto.randomUUID();
        const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(file.name)}`;
        const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, uploadFile, { upsert: false, contentType: uploadFile.type || file.type });
        if (sourceUpload.error) throw sourceUpload.error;
        uploadedPaths.push(sourcePath);
        const decoded = await previewImageThumbnailAndDimensions(uploadFile, 400);
        const dimensions = { width: decoded.width, height: decoded.height };
        var title = files.length === 1 ? baseTitle : (baseTitle ? baseTitle + ' · ' + stripExtension(file.name) : '');
        const countryId = formData.get('country');
        const activityId = formData.get('activity');
        const categoryId = formData.get('category');
        const sourceRow = {
          id: sourceId,
          title,
          country_id: (countryId && countryId !== 'all') ? countryId : null,
          activity_id: (activityId && activityId !== 'all') ? activityId : null,
          category_id: (categoryId && categoryId !== 'all') ? categoryId : null,
          tags: galleryTagsForFile(formData, file),
          visibility: formData.get('visibility') || 'all',
          source_path: sourcePath,
          source_filename: file.name,
          source_mime_type: uploadFile.type || file.type || '',
          source_size_bytes: uploadFile.size,
          source_ext: fileExt(file.name),
          uploaded_by: userId
        };
        const sourceInsert = await state.supabase.from('vf_source_files').insert([sourceRow]);
        if (sourceInsert.error) throw sourceInsert.error;
        insertedSourceIds.push(sourceId);
        // 缩略图（与尺寸同一次解码产出）
        var thumbPath = null;
        try {
          var thumbBlob = decoded.thumbnail;
          if (thumbBlob) {
            thumbPath = `${userId}/sources/${sourceId}/_thumb.jpg`;
            var thumbUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(thumbPath, thumbBlob, { upsert: true, contentType: 'image/jpeg' });
            if (thumbUpload.error) { console.warn('Thumbnail upload failed:', thumbUpload.error); thumbPath = null; }
            else { uploadedPaths.push(thumbPath); }
          }
        } catch (e) { console.warn('Thumbnail generation failed:', e); }
        var previewId = crypto.randomUUID();
        const previewInsert = await state.supabase.from('vf_asset_previews').insert([{
          id: previewId,
          source_file_id: sourceId,
          preview_path: sourcePath,
          preview_filename: file.name,
          preview_mime_type: uploadFile.type || file.type,
          preview_size_bytes: uploadFile.size,
          width: dimensions.width,
          height: dimensions.height,
          sort_order: 10
        }]);
        if (previewInsert.error) throw previewInsert.error;
        void logAssetEvent('upload', { source: sourceRow, preview: { id: previewId, preview_filename: file.name, preview_path: sourcePath } });
        doneBytes += file.size || 1;
        doneCount += 1;
        report();
      });
      // 与案例库同一套「上次选的国家」记忆：图库完整上传成功后也记住，下次自动预填
      // 取消发生在收尾前：整批回滚，别留下「点了取消却多出一堆图」的结果
      if (cancelled()) throw new Error(LIBRARY_UPLOAD_CANCELLED);
      rememberLastCaseUploadCountry(optionNameById(formData.get('country')));
      if (onProgress) onProgress(95, doneCount, files.length);
    } catch (error) {
      await cleanupGalleryUpload(insertedSourceIds, uploadedPaths);
      throw error;
    }
  }

  async function cleanupGalleryUpload(sourceIds, uploadedPaths) {
    try {
      if (sourceIds.length) await state.supabase.from('vf_source_files').delete().in('id', sourceIds);
      if (uploadedPaths.length) await state.supabase.storage.from(LIBRARY_BUCKET).remove(uploadedPaths);
    } catch (error) {
      console.warn('Gallery upload cleanup failed:', error);
    }
  }

  async function cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths) {
    if (state.localPreview || !state.supabase) return;
    try {
      if (sourceInserted && sourceId) {
        await state.supabase.from('vf_source_files').delete().eq('id', sourceId);
      }
      if (uploadedPaths.length) {
        await state.supabase.storage.from(LIBRARY_BUCKET).remove(uploadedPaths);
      }
    } catch (error) {
      console.warn('Library upload cleanup failed:', error);
    }
  }

  function validateLibraryUpload(sourceFile, previewFiles) {
    if (!sourceFile || !sourceFile.size) throw new Error(state.lang === 'zh' ? '请选择源文件。' : 'Choose a source file.');
    if (!SOURCE_EXTENSIONS.includes(fileExt(sourceFile.name))) throw new Error(state.lang === 'zh' ? '源文件仅支持 PSD / PSB / AI / PDF / 压缩包。' : 'Source must be PSD / PSB / AI / PDF / archive.');
    if (previewFiles.length === 0) throw new Error(state.lang === 'zh' ? '至少上传一张预览图。' : 'Upload at least one preview image.');
    if (previewFiles.length > 5) throw new Error(state.lang === 'zh' ? '一个源文件最多绑定 5 张预览图。' : 'A source file can have at most 5 previews.');
    previewFiles.forEach(file => {
      if (!PREVIEW_MIME_TYPES.includes(file.type)) throw new Error(state.lang === 'zh' ? '预览图仅支持 JPG / PNG / WEBP。' : 'Preview must be JPG / PNG / WEBP.');
    });
  }

  // ===== 案例库项目化：schema 兼容 =====
  // sql/013 未执行时自动用旧字段加载素材库，浏览永不因缺列而中断；
  // 上传写入新字段仍会给出执行迁移的明确提示。
  var caseSchemaReady = true;
  function isCaseSchemaError(error) {
    return /owner_name|owner_contact|project_note|material_type|download_link/.test(String(error && error.message || ''));
  }
  // 物料语言列语言单独降级：老库还没跑 sql/020 时，只有 language 这一个字段缺席，
  // 不能把它并进 caseSchemaReady（那样会连带丢掉 owner_name/material_type 等已有字段）。
  var previewLanguageReady = true;
  function previewSelectFields(withMaterialType) {
    return 'id,source_file_id,preview_path,preview_filename,preview_mime_type,preview_size_bytes,width,height'
      + (withMaterialType ? ',material_type' : '')
      + (previewLanguageReady ? ',language' : '')
      + ',sort_order,created_at';
  }
  function isMissingLanguageColumnError(error) {
    const message = String((error && error.message) || error || '');
    return /language/.test(message) && /column|schema|does not exist|找不到/i.test(message);
  }
  async function previewAwareQuery(runQuery) {
    let result = await runQuery(caseSchemaReady, previewLanguageReady);
    if (result.error && isCaseSchemaError(result.error) && caseSchemaReady) {
      caseSchemaReady = false;
      result = await runQuery(false, previewLanguageReady);
    }
    if (result.error && previewLanguageReady && isMissingLanguageColumnError(result.error)) {
      previewLanguageReady = false;
      result = await runQuery(caseSchemaReady, false);
    }
    return result;
  }

  async function caseAwareQuery(runQuery) {
    let result = await runQuery(caseSchemaReady);
    if (result.error && isCaseSchemaError(result.error) && caseSchemaReady) {
      caseSchemaReady = false;
      result = await runQuery(false);
    }
    return result;
  }

  // ===== 案例库项目化：物料类型自动识别 =====
  // v776 起唯一依据是团队管理页「物料清单」（类别 + 子类别尺寸）：不再有硬编码尺寸/文件名规则，
  // 改清单即时改变识别结果。判定顺序见 detectMaterialTypeByCatalog（先具体尺寸，再「高不固定」通配）。
  var CASE_DYNAMIC_MATERIAL_TYPE = '弹窗'; // 视频/GIF 等动态物料默认归的类别（清单里没有该类别时退回第一个）
  var CASE_LAYOUT_ICONS = {
    grid2: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1"/><rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1"/><rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1"/><rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1"/></svg>',
    grid4: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="2.8" height="2.8" rx="0.8"/><rect x="6.6" y="2" width="2.8" height="2.8" rx="0.8"/><rect x="11.2" y="2" width="2.8" height="2.8" rx="0.8"/><rect x="2" y="6.6" width="2.8" height="2.8" rx="0.8"/><rect x="6.6" y="6.6" width="2.8" height="2.8" rx="0.8"/><rect x="11.2" y="6.6" width="2.8" height="2.8" rx="0.8"/><rect x="2" y="11.2" width="2.8" height="2.8" rx="0.8"/><rect x="6.6" y="11.2" width="2.8" height="2.8" rx="0.8"/><rect x="11.2" y="11.2" width="2.8" height="2.8" rx="0.8"/></svg>',
    list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M2.5 8h11M2.5 12h11"/></svg>'
  };
  // 多选（批量改类型 / 批量删除）：勾选框图标
  var CASE_SELECT_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.3" y="2.3" width="11.4" height="11.4" rx="2.4"/><path d="m5.3 8.2 1.9 1.9 3.6-4"/></svg>';
  var CLOUD_UPLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 18.5a4.5 4.5 0 1 1 .72-8.95A6 6 0 0 1 19.6 11.2 3.75 3.75 0 0 1 18.75 18.5H7.5Z"/><path d="M12 12.5v5.5m0-5.5-2.4 2.4M12 12.5l2.4 2.4"/></svg>';
  // 动态物料（视频/GIF）默认类别：该端清单里有「弹窗」就用它，否则用该端第一个类别。
  function caseDynamicMaterialType(platform) {
    return materialCatalogDynamicDefaultType(CASE_DYNAMIC_MATERIAL_TYPE, platform);
  }

  function detectCaseMaterialType(filename, width, height, platform) {
    // GIF 与视频同口径：动态物料，不按尺寸判（上传时仍可手动改）。
    if (/\.gif$/i.test(String(filename || ''))) return caseDynamicMaterialType(platform);
    // 静态物料：只在该端（C端/B端/D端/M端）的清单里按尺寸匹配，清单没写的不猜。
    return detectMaterialTypeByCatalog(platform, width, height);
  }

  // ===== 案例库动态物料（MP4 / GIF）支持 =====
  var CASE_PREVIEW_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
  var CASE_VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'];
  var CASE_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  function isCaseVideoFile(file) {
    const type = String((file && file.type) || '').toLowerCase();
    if (type.startsWith('video/')) return true;
    return CASE_VIDEO_EXTENSIONS.includes(fileExt((file && file.name) || ''));
  }
  // GIF 是动态物料：不生成静态缩略图，展示时直接跑原图动效
  function isCaseGifFile(file) {
    const type = String((file && file.type) || '').toLowerCase();
    if (type === 'image/gif') return true;
    return fileExt((file && file.name) || '') === 'gif';
  }
  // 能不能重建封面缩略图：只对静态图片（视频有自己的首帧、GIF 走小动图，都不该静态化）
  function isThumbRebuildable(preview) {
    const mime = String((preview && preview.preview_mime_type) || '').toLowerCase();
    if (!mime.startsWith('image/')) return false;
    return !isCaseGifPreview(preview);
  }
  function isCaseGifPreview(preview) {
    const mime = String((preview && preview.preview_mime_type) || '').toLowerCase();
    if (mime === 'image/gif') return true;
    return fileExt((preview && preview.preview_filename) || '') === 'gif';
  }
  function isCasePreviewFile(file) {
    const type = String((file && file.type) || '').toLowerCase();
    const ext = fileExt((file && file.name) || '');
    if (type.startsWith('image/') || type.startsWith('video/')) return true;
    if (CASE_IMAGE_EXTENSIONS.includes(ext) || CASE_VIDEO_EXTENSIONS.includes(ext)) return true;
    return false;
  }
  // 拖拽取文件：部分应用（Finder 预览、播放器）只放在 items 里
  function collectDroppedFiles(event) {
    const dt = event.dataTransfer;
    let files = Array.from((dt && dt.files) || []);
    if (!files.length && dt && dt.items) {
      files = Array.from(dt.items).filter(item => item && item.kind === 'file').map(item => item.getAsFile()).filter(Boolean);
    }
    return files;
  }
  function caseVideoContentType(file) {
    const type = String((file && file.type) || '').toLowerCase();
    if (type.startsWith('video/')) return type;
    return fileExt((file && file.name) || '') === 'webm' ? 'video/webm' : 'video/mp4';
  }
  function readVideoDimensions(file) {
    return new Promise(function(resolve) {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      let settled = false;
      const finish = function(result) { if (settled) return; settled = true; URL.revokeObjectURL(url); resolve(result); };
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = function() { finish({ width: video.videoWidth || 0, height: video.videoHeight || 0 }); };
      video.onerror = function() { finish({ width: 0, height: 0 }); };
      setTimeout(function() { finish({ width: 0, height: 0 }); }, 10000);
      video.src = url;
    });
  }
  // 视频缩略图取「最后一帧」：动态物料通常要展示结束状态
  function generateVideoThumbnail(file, maxWidth) {
    return new Promise(function(resolve) {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      let settled = false;
      const finish = function(blob) { if (settled) return; settled = true; URL.revokeObjectURL(url); resolve(blob); };
      const capture = function() {
        try {
          const width = video.videoWidth || maxWidth;
          const height = video.videoHeight || maxWidth;
          const scale = Math.min(1, maxWidth / width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function(blob) {
            finish(blob ? new File([blob], 'video-thumb.jpg', { type: 'image/jpeg' }) : null);
          }, 'image/jpeg', 0.86);
        } catch (error) { finish(null); }
      };
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = function() {
        const target = Math.max(0, (video.duration || 0) - 0.08);
        if (target > 0.02) {
          video.onseeked = capture;
          // 兜底：3 秒内没等到 seeked 就截当前帧，避免完全没有缩略图
          setTimeout(capture, 3000);
          try { video.currentTime = target; } catch (error) { capture(); }
        } else { capture(); }
      };
      video.onerror = function() { finish(null); };
      setTimeout(function() { finish(null); }, 15000);
      video.src = url;
    });
  }

  function validateCaseProjectUpload(previewFiles, formData, chipSel) {
    const zh = state.lang === 'zh';
    if (!String(formData.get('title') || '').trim()) throw new Error(zh ? '请填写项目名称。' : 'Project name is required.');
    if (!String(formData.get('owner_name') || '').trim()) throw new Error(zh ? '请填写物料所有者，方便团队找谁要源文件。' : 'Material owner is required.');
    if (previewFiles.length === 0) throw new Error(zh ? '请至少选择 1 张物料预览图。' : 'Upload at least one preview image.');
    if (previewFiles.length > 100) throw new Error(zh ? '一个项目最多 100 张物料预览图。' : 'A project can have at most 100 previews.');
    previewFiles.forEach(file => {
      if (!isCasePreviewFile(file)) throw new Error(zh ? '物料预览图仅支持 JPG / PNG / WEBP / GIF / MP4。' : 'Preview must be JPG / PNG / WEBP / GIF / MP4.');
    });
    // 平台和国家是必填：缺了就标红标签面板对应行 + 弹提醒，不上传
    const missing = [];
    if (!caseTagSelFirst(chipSel, 'tag1')) missing.push('tag1');
    if (!caseTagSelFirst(chipSel, 'country')) missing.push('country');
    flagMissingCaseTagRows(document.getElementById('upload-case-tag-bar'), missing);
    if (missing.length) {
      const labels = missing.map(function(key) {
        if (key === 'tag1') return zh ? '平台' : 'Platform';
        return zh ? '国家' : 'Country';
      });
      throw new Error(zh
        ? '请先选择' + labels.join('和') + '，再上传。'
        : 'Select ' + labels.join(' and ') + ' before uploading.');
    }
  }

  function translateCaseSchemaError(error) {
    const raw = String(error && error.message || '');
    if (/owner_name|owner_contact|project_note|material_type|download_link/.test(raw)) {
      return new Error(state.lang === 'zh' ? '数据库缺少案例库新字段：请先在 Supabase 控制台执行 sql/013_case_projects.sql，再重试上传。' : raw);
    }
    return error;
  }

  // ===== 案例项目：聚合 / 封面 / 分类 =====
  // 案例物料的展示媒体：优先缩略图（视频即最后一帧），视频无缩略图时用 <video> 显示首帧
  function casePreviewMedia(preview, source) {
    const thumbPath = libraryThumbnailPathForPreview(preview, source);
    const thumbUrl = thumbPath && !libraryThumbUnavailable(thumbPath) ? (state.libraryPreviewUrls[thumbPath] || '') : '';
    const sourceUrl = state.libraryPreviewUrls[preview.preview_path] || '';
    const isVideo = String(preview.preview_mime_type || '').toLowerCase().startsWith('video/');
    if (isCaseGifPreview(preview)) {
      queueGifSmallPreviewBackfill(preview, source);
      const gifVideo = libraryGifVideoForPreview(preview, source);
      if (gifVideo) {
        scheduleAutoplayVideoSweep();
        return '<video data-autoplay-path="' + escapeAttr(gifVideo.video) + '"'
          + (gifVideo.poster ? ' data-autoplay-poster-path="' + escapeAttr(gifVideo.poster) + '"' : '')
          + ' muted loop playsinline preload="none"></video>';
      }
    }
    if (thumbUrl) return '<img src="' + escapeAttr(thumbUrl) + '" alt="" loading="lazy">';
    if (isVideo) {
      return sourceUrl
        ? '<video src="' + escapeAttr(sourceUrl) + '" muted playsinline preload="metadata"></video>'
        : '';
    }
    return sourceUrl ? '<img src="' + escapeAttr(sourceUrl) + '" alt="" loading="lazy">' : '';
  }

  function caseMaterialsOf(source) {
    return state.libraryPreviews
      .filter(preview => preview.source_file_id === source.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  // 历史导入可能留下同名的小项目副本。若它的全部文件名都包含在另一个
  // 同名大项目中，保留数据库旧记录，但弹窗转到完整项目，避免把旧副本
  // 的 18 张误当成完整项目的 83 张再次被截断。
  function caseProjectIdentity(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  }

  function caseMaterialIdentity(preview) {
    return caseProjectIdentity(String(preview && preview.preview_filename || '').replace(/\.[^.]+$/, ''));
  }

  function canonicalCaseProjectSource(source) {
    if (!source || !isCaseProject(source)) return source;
    const titleKey = caseProjectIdentity(source.title);
    const sourceMaterials = caseMaterialsOf(source);
    if (!titleKey || !sourceMaterials.length) return source;
    const sourceNames = new Set(sourceMaterials.map(caseMaterialIdentity).filter(Boolean));
    if (!sourceNames.size) return source;
    let best = source;
    let bestCount = sourceMaterials.length;
    state.librarySources.forEach(function(candidate) {
      if (!candidate || candidate.id === source.id || !isCaseProject(candidate)) return;
      if (caseProjectIdentity(candidate.title) !== titleKey) return;
      const candidateMaterials = caseMaterialsOf(candidate);
      if (candidateMaterials.length <= bestCount) return;
      const candidateNames = new Set(candidateMaterials.map(caseMaterialIdentity).filter(Boolean));
      if (Array.from(sourceNames).every(function(name) { return candidateNames.has(name); })) {
        best = candidate;
        bestCount = candidateMaterials.length;
      }
    });
    return best;
  }

  // v858 素材缩略图聚拢排序：同尺寸聚在一起；同尺寸里「名字贴近」的——去掉扩展名、尾部序号、
  // 语言词后同名的——聚成一簇，簇按最先出现的位置排，簇内保持原相对顺序。
  // 解决：一个项目里两个系列的开屏在存储顺序里交错，看起来很乱。
  function caseMaterialNameStem(filename) {
    let s = String(filename || '');
    s = s.replace(/\.[a-z0-9]+$/i, '');
    while (true) {
      const stripped = s.replace(/[\s\-_·]*\(?\d+\)?\s*$/g, '');
      if (stripped === s) break;
      s = stripped;
    }
    s = s.replace(/\b(en|ar|english|arabic)\b/ig, '');
    s = s.replace(/英[文语]|阿语|阿拉伯语?/g, '');
    return s.replace(/[\s\-_—–·()（）\[\]【】#]+/g, '').toLowerCase();
  }
  function caseSortedMaterialDefs(defs) {
    const items = defs.map(function(def, idx) {
      return { def: def, idx: idx, dims: (def.material.width || 0) + 'x' + (def.material.height || 0), stem: caseMaterialNameStem(def.filename) };
    });
    const firstIdx = {};
    items.forEach(function(item) {
      const groupKey = item.dims + '|' + item.stem;
      if (!(groupKey in firstIdx) || item.idx < firstIdx[groupKey]) firstIdx[groupKey] = item.idx;
    });
    items.sort(function(a, b) {
      if (a.dims !== b.dims) {
        const aw = a.def.material.width || 0, bw = b.def.material.width || 0;
        if (aw !== bw) return aw - bw;
        return (a.def.material.height || 0) - (b.def.material.height || 0);
      }
      const ga = a.dims + '|' + a.stem, gb = b.dims + '|' + b.stem;
      if (ga !== gb) return firstIdx[ga] - firstIdx[gb];
      return a.idx - b.idx;
    });
    return items.map(function(item) { return item.def; });
  }

  // 浮窗缩略图按记录的宽高先占位：图片加载完成前高度就是最终高度，
  // 避免浮窗先渲染一条细条、图片到位后突然“长高”导致位置跳动
  function casePopMediaWithRatio(preview, source) {
    const media = casePreviewMedia(preview, source);
    if (!media || !preview.width || !preview.height) return media;
    return media.replace(/^<(img|video)(?=[\s>])/, '<$1 style="aspect-ratio: ' + preview.width + ' / ' + preview.height + ';"');
  }
  // ── 物料语言（英语 / 阿拉伯语）─────────────────────────────────
  // 存储值：en / ar / none（人工判「无」，不再按文件名猜）/ 空（没判过）。
  // 判断优先级：库里存着的（手改或 AI 识别）> 文件名里的 en/ar 线索 > 未分类（EN/AR 筛选里照旧显示）。
  var CASE_LANGUAGES = ['en', 'ar'];
  function normalizePreviewLanguage(value) {
    const v = String(value == null ? '' : value).trim().toLowerCase();
    if (v === 'en' || v === 'ar') return v;
    if (v === 'none' || v === '') return v;
    if (['eng', 'english', '英语', '英文'].indexOf(v) >= 0) return 'en';
    if (['ara', 'arabic', '阿拉伯语', '阿语', '阿拉伯'].indexOf(v) >= 0) return 'ar';
    return '';
  }
  function caseFilenameLanguage(filename) {
    const name = String(filename || '');
    if (/(^|[^a-z])(ar|arb|arabic)([^a-z]|$)/i.test(name) || /阿拉伯|عربي/.test(name)) return 'ar';
    if (/(^|[^a-z])en([^a-z]|$)/i.test(name)) return 'en';
    return '';
  }
  function caseMaterialLanguage(preview) {
    const stored = normalizePreviewLanguage(preview && preview.language);
    if (stored === 'en' || stored === 'ar') return stored;
    if (stored === 'none') return '';
    return caseFilenameLanguage(preview && preview.preview_filename);
  }
  function caseLanguageLabel(value) {
    const lang = normalizePreviewLanguage(value);
    return state.lang === 'zh' ? (lang === 'en' ? '英语' : lang === 'ar' ? '阿语' : '无') : (lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : 'None');
  }
  // 识图判语言（GLM-4V）：返回 en / ar / none（看了但判断不出）/ ''（没看成功，之后可再试）
  async function requestLanguageDetection(imageDataUrl) {
    const token = (state.session && state.session.access_token) || '';
    if (!token || !imageDataUrl) return '';
    const response = await fetch('/api/analyze-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ image: imageDataUrl })
    });
    const data = await response.json().catch(function() { return null; });
    if (!response.ok || !data || !data.success) return '';
    const lang = normalizePreviewLanguage(data.lang);
    return (lang === 'en' || lang === 'ar') ? lang : 'none';
  }
  async function detectLanguageFromImageFile(file) {
    if (!file || state.localPreview) return '';
    try {
      return await requestLanguageDetection(await caseElementThumbnailDataUrl(file));
    } catch (_error) { return ''; }
  }
  // 项目窗里对已有物料重新识别：拿签名 URL 的图去识别
  async function detectLanguageFromPreview(preview) {
    const url = state.libraryPreviewUrls[preview.preview_path] || '';
    if (!url) return '';
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(state.lang === 'zh' ? ('取图失败（HTTP ' + response.status + '）') : ('Failed to fetch image (HTTP ' + response.status + ')'));
    const blob = await response.blob();
    const file = new File([blob], String(preview.preview_filename || 'preview'), { type: blob.type || 'image/jpeg' });
    return requestLanguageDetection(await caseElementThumbnailDataUrl(file));
  }
  // 该物料在某个语言筛选下是否显示：没判出语言的图「英语/阿语」两边都要显示（不藏图）
  function caseMaterialMatchesLanguage(preview, want) {
    if (want !== 'en' && want !== 'ar') return true;
    const lang = caseMaterialLanguage(preview);
    return !lang || lang === want;
  }
  function isCaseProject(source) {
    return libraryKindOfSource(source) === 'source' && !source.source_path && caseMaterialsOf(source).length > 0;
  }
  // 同分类多张时优先文件名带 EN 的（同一物料的 EN 版代表整组），否则取第一张
  function casePreferEn(previews) {
    if (!previews.length) return null;
    const en = previews.filter(p => /(^|[^a-z])en([^a-z]|$)/i.test(String(p.preview_filename || '')));
    return en.length ? en[0] : previews[0];
  }
  // 二级标签 → 项目 material_type 集合（头图/楼层条/Tab 归入会场；「标签」不参与项目）
  // 右键「设为封面」：把某张物料钉成当前分类（案例墙二级标签；未选分类时 all）的项目卡封面。
  // 选择存进 vf_source_files.tags 的标记里（不动表结构）：vf:cover:v1:<分类>:<previewId>；
  // 每个分类至多一条标记，读取时按 previewId 找回物料，物料被删就退回自动封面。
  var CASE_COVER_MARKER_PREFIX = 'vf:cover:v1:';
  function caseCoverMarkerKey(typeValue) {
    return caseMaterialTypeSet(typeValue) ? typeValue : 'all';
  }
  function caseCoverOverrideFor(source, typeValue) {
    const tags = Array.isArray(source && source.tags) ? source.tags : [];
    const prefix = CASE_COVER_MARKER_PREFIX + caseCoverMarkerKey(typeValue) + ':';
    const marker = tags.find(function(tag) { return String(tag).startsWith(prefix); });
    if (!marker) return null;
    const previewId = String(marker).slice(prefix.length);
    return caseMaterialsOf(source).find(function(material) { return material.id === previewId; }) || null;
  }
  // 写封面标记：先读库里最新 tags（编辑/回填可能同时在写），只摘掉同类旧标记再写新的，
  // 绝不整组覆盖——与 mergeSourceTagsMarker 同一路数，防「改完刷新又复原」。
  async function writeCaseCover(source, typeValue, previewId) {
    const prefix = CASE_COVER_MARKER_PREFIX + caseCoverMarkerKey(typeValue) + ':';
    const fresh = await state.supabase.from('vf_source_files').select('tags').eq('id', source.id).maybeSingle();
    if (fresh.error) throw fresh.error;
    if (!fresh.data) throw new Error(state.lang === 'zh' ? '项目不存在' : 'Project does not exist.');
    const current = Array.isArray(fresh.data.tags) ? fresh.data.tags : [];
    const nextTags = current.filter(function(tag) { return !String(tag).startsWith(prefix); });
    if (previewId) nextTags.push(prefix + previewId);
    const update = await state.supabase.from('vf_source_files').update({ tags: nextTags }).eq('id', source.id);
    if (update.error) throw update.error;
    source.tags = nextTags;
    return nextTags;
  }
  function caseCoverFor(source, typeValue) {
    const materials = caseMaterialsOf(source);
    if (!materials.length) return null;
    const override = caseCoverOverrideFor(source, typeValue);
    const types = caseMaterialTypeSet(typeValue);
    if (!types) {
      if (override) return { cover: override, group: materials };
      const priority = caseCoverTypePriority();
      for (const t of priority) {
        const group = materials.filter(p => (p.material_type || '') === t);
        if (group.length) return { cover: casePreferEn(group), group: materials };
      }
      return { cover: materials[0], group: materials };
    }
    const group = materials.filter(p => types.includes(p.material_type || ''));
    if (!group.length) return null;
    return { cover: override || casePreferEn(group), group: group };
  }
  function projectMatchesType(source, typeValue) {
    const types = caseMaterialTypeSet(typeValue);
    if (!types) return false;
    return caseMaterialsOf(source).some(p => types.includes(p.material_type || ''));
  }
  // 检索词本身就是一个物料类型时（含拼音/英文别名），用它决定项目卡封面：
  // 否则 caseCoverFor 会退回「开机海报优先」的默认优先级，搜"弹窗"却看到开屏封面。
  function caseCoverTypeFromQuery(query) {
    const word = String(query || '').trim().toLowerCase();
    if (!word || /\s/.test(word)) return '';
    for (const type of materialCatalogTypeNames()) {
      const words = [type, LIBRARY_SEARCH_PINYIN[type], LIBRARY_SEARCH_EN_EXTRA[type], LIBRARY_LABELS_EN[type]];
      for (const value of words) {
        if (!value) continue;
        if (String(value).toLowerCase().split(/\s+/).filter(Boolean).includes(word)) return type;
      }
    }
    return '';
  }
  // 网格里每个项目只出一张卡片，封面跟随当前分类标签（搜索词是物料类型时优先跟随搜索词）
  function collapseCaseProjectItems(items) {
    const fallbackType = state.libraryFilters.tag2 || 'all';
    const queryType = caseCoverTypeFromQuery(state.libraryFilters.query);
    const seen = new Set();
    const out = [];
    items.forEach(function(item) {
      if (!isCaseProject(item.source)) { out.push(item); return; }
      if (seen.has(item.source.id)) return;
      seen.add(item.source.id);
      // 只有项目里真有这个类型才切换封面，避免匹配来自标签时把卡片弄丢
      const typeValue = (queryType && projectMatchesType(item.source, queryType)) ? queryType : fallbackType;
      const pick = caseCoverFor(item.source, typeValue);
      if (!pick) return;
      const coverItem = items.find(i => i.preview.id === pick.cover.id);
      out.push({ source: item.source, preview: pick.cover, url: coverItem ? coverItem.url : '', thumbUrl: coverItem ? coverItem.thumbUrl : '', isCaseProjectCard: true });
    });
    return out;
  }

  function recentCaseOwnerNames() {
    try {
      const names = JSON.parse(localStorage.getItem(CASE_OWNER_NAMES_KEY) || '[]');
      return Array.isArray(names) ? names.filter(Boolean) : [];
    } catch (_e) { return []; }
  }

  function rememberCaseOwnerName(name) {
    const value = String(name || '').trim();
    if (!value) return;
    try {
      let names = recentCaseOwnerNames();
      names = names.filter(item => item !== value);
      names.unshift(value);
      localStorage.setItem(CASE_OWNER_NAMES_KEY, JSON.stringify(names.slice(0, 20)));
    } catch (_e) {}
  }

  // ── 使用者名单（v666）开始 ──
  // 团队管理页维护；上传弹窗 / 编辑项目弹窗的「物料所有者」联想候选。
  // 名字只用于展示和索引用（大象里按姓名搜不可靠，可能重名），大象编号才是唯一标识，
  // 「联系所有者」复制的就是它，并随素材存进 vf_source_files.owner_contact。
  const TEAM_MEMBERS_TABLE = 'vf_team_members';
  const TEAM_MEMBERS_STORAGE_KEY = 'vf_team_members';
  let teamMembersCache = [];
  let teamMembersTableReady = true;   // 表还没建时自动降级到本机 localStorage，功能不停摆

  function isTeamTableMissingError(error) {
    const message = String((error && error.message) || error || '').toLowerCase();
    return message.includes('could not find the table')
      || message.includes('does not exist')
      || message.includes('schema cache')
      || message.includes('undefined table');
  }

  // 名单暂时读不到：表还没建，或服务端数据策略还没放行这张表（都退回本机名单，不阻塞功能）
  function isTeamRosterUnavailableError(error) {
    const message = String((error && error.message) || error || '');
    return isTeamTableMissingError(error) || message.includes('请求路径无效');
  }

  // 名单读不到时给一句人话提示，并说明具体原因（缺表 / 服务端策略未放行 / 其它）
  function teamRosterHintText() {
    const zh = state.lang === 'zh';
    const message = String((teamRosterLastError && teamRosterLastError.message) || '');
    if (message.includes('Could not find the table') || message.includes('does not exist')) {
      return zh
        ? '名单表还没建（Supabase 里查不到 vf_team_members）：现在只保存在这台电脑上。请在 Supabase SQL Editor 执行 sql/015_team_members.sql，再点上面的「刷新」，即可变成团队共享。'
        : 'Roster table missing: run sql/015_team_members.sql, then hit Refresh to share it with the team.';
    }
    if (message.includes('请求路径无效')) {
      return zh ? '服务端还没放行名单表：部署最新 functions 后点「刷新」。' : 'Server policy does not allow the roster table yet; deploy the latest functions.';
    }
    if (!message) {
      return zh ? '名单暂时读不到：现在只保存在这台电脑上，点上面的「刷新」重试。'
                : 'Roster unavailable; stored in this browser only. Hit Refresh to retry.';
    }
    return zh ? '名单暂时读不到（' + message.slice(0, 60) + '）：现在只保存在这台电脑上，点「刷新」重试。'
              : 'Roster unavailable (' + message.slice(0, 60) + '); stored locally.';
  }

  function teamRosterErrorText(error) {
    const message = String((error && error.message) || error || '');
    const zh = state.lang === 'zh';
    if (message.includes('需要开发者维护权限')) return zh ? '需要开发者维护权限：先进入「开发者维护」再维护名单。' : 'Developer maintenance mode is required.';
    if (message.includes('请求路径无效')) return zh ? '服务端还没放行名单表：执行 sql/015_team_members.sql 并部署最新 functions 后刷新。' : 'Server policy does not allow the roster table yet.';
    if (isTeamTableMissingError(error)) return zh ? '名单表还没建：请在 Supabase SQL Editor 执行 sql/015_team_members.sql。' : 'Roster table missing; run sql/015_team_members.sql.';
    return message;
  }

  function normalizeTeamMember(member) {
    const source = member || {};
    return {
      id: String(source.id || ''),
      // 兼容早期本机缓存里的单 name 字段
      name_zh: String(source.name_zh || source.name || '').trim(),
      name_en: String(source.name_en || '').trim(),
      daxiang_id: String(source.daxiang_id || source.daxiangId || '').trim()
    };
  }

  function teamMemberDisplayName(member) {
    const item = normalizeTeamMember(member);
    return item.name_zh || item.name_en || '';
  }

  function readLocalTeamMembers() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TEAM_MEMBERS_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.map(normalizeTeamMember).filter(m => m.name_zh || m.name_en) : [];
    } catch (_e) { return []; }
  }

  function writeLocalTeamMembers(list) {
    try { localStorage.setItem(TEAM_MEMBERS_STORAGE_KEY, JSON.stringify(list.map(normalizeTeamMember))); } catch (_e) {}
  }

  // 联想候选 = 使用者名单（优先，带大象编号） + 历史上用过的名字（没有编号的补在后面）
  function teamMemberOptions() {
    const options = [];
    const used = new Set();   // 已经占用过的姓名（小写）与大象编号（小写），避免同一人出现两次
    const add = function(option) {
      const words = [option.nameZh, option.nameEn].map(function(word) { return String(word || '').trim(); }).filter(Boolean);
      if (!words.length) return;
      if (words.some(function(word) { return used.has(word.toLowerCase()); })) return;
      words.forEach(function(word) { used.add(word.toLowerCase()); });
      if (option.daxiangId) used.add(String(option.daxiangId).toLowerCase());
      options.push(option);
    };
    teamMembersCache.map(normalizeTeamMember).forEach(function(member) {
      add({ nameZh: member.name_zh, nameEn: member.name_en, daxiangId: member.daxiang_id, fromRoster: true });
    });
    // 历史上把大象编号当姓名填过的那条会被 used 里的编号挡掉，不再单独出现
    recentCaseOwnerNames().forEach(function(name) {
      add({ nameZh: String(name || '').trim(), nameEn: '', daxiangId: '', fromRoster: false });
    });
    return options;
  }

  // 按输入过滤并排序：完全命中 → 前缀命中 → 包含命中；姓名和大象编号都能匹配，大小写不敏感
  function filterTeamMemberOptions(options, query) {
    const text = String(query || '').trim().toLowerCase();
    if (!text) return options.slice();
    // 排序：完全命中（中文名 → 英文名 → 编号）→ 前缀命中 → 包含命中
    const rankOf = function(value, base) {
      const word = String(value || '').toLowerCase();
      if (!word) return -1;
      if (word === text) return base;
      if (word.startsWith(text)) return base + 3;
      if (word.includes(text)) return base + 6;
      return -1;
    };
    const scored = [];
    options.forEach(function(option) {
      const ranks = [
        rankOf(option.nameZh, 0),
        rankOf(option.nameEn, 1),
        rankOf(option.daxiangId, 2)
      ].filter(function(rank) { return rank >= 0; });
      if (!ranks.length) return;
      scored.push({ option: option, rank: Math.min.apply(null, ranks) });
    });
    scored.sort(function(a, b) { return a.rank - b.rank; });
    return scored.map(function(entry) { return entry.option; });
  }

  // 输入的姓名能对上名单时，直接解析出大象编号（边打字边显示，提交时也用它）
  function resolveTeamMemberDaxiang(name) {
    const text = String(name || '').trim().toLowerCase();
    if (!text) return '';
    const members = teamMembersCache.map(normalizeTeamMember);
    // 中文名 / 英文名 精确匹配
    const byName = members.find(function(member) {
      return member.name_zh.toLowerCase() === text || member.name_en.toLowerCase() === text;
    });
    if (byName) return byName.daxiang_id;
    // 兼容老数据：历史素材里把大象编号当姓名存过，直接输入编号也应认出对应使用者
    const byId = members.find(function(member) {
      return member.daxiang_id && member.daxiang_id.toLowerCase() === text;
    });
    return byId ? byId.daxiang_id : '';
  }

  async function loadTeamMembers() {
    const local = readLocalTeamMembers();
    if (!state.supabase) {
      teamMembersTableReady = false;
      teamMembersCache = local;
      teamRosterLastLoadAt = Date.now();
      return teamMembersCache;
    }
    const result = await state.supabase.from(TEAM_MEMBERS_TABLE)
      .select('id,name_zh,name_en,daxiang_id,created_at').order('created_at', { ascending: true });
    if (result.error) {
      if (!isTeamRosterUnavailableError(result.error)) throw result.error;
      teamMembersTableReady = false;
      teamRosterLastError = result.error;
      teamMembersCache = local;
      teamRosterLastLoadAt = Date.now();
      return teamMembersCache;
    }
    teamMembersTableReady = true;
    teamRosterLastError = null;
    teamRosterLastLoadAt = Date.now();
    const serverList = (result.data || []).map(normalizeTeamMember);
    const key = function(member) {
      return [member.name_zh, member.name_en, member.daxiang_id].join('|').toLowerCase();
    };
    const serverKeys = new Set(serverList.map(key));
    // 本机新建（local- 前缀）且服务端还没有的条目：留着提示导入，别被覆盖掉
    teamRosterPendingLocal = local.filter(function(member) {
      return String(member.id).startsWith('local-') && !serverKeys.has(key(member));
    });
    teamMembersCache = serverList;
    // 缓存 = 服务端名单 + 本机还没上传的条目：本地条目不能因为这次覆盖就丢（否则一刷新就没了）
    writeLocalTeamMembers(serverList.concat(teamRosterPendingLocal));
    return teamMembersCache;
  }

  async function addTeamMember(nameZh, nameEn, daxiangId) {
    const member = normalizeTeamMember({ name_zh: nameZh, name_en: nameEn, daxiang_id: daxiangId });
    if (!member.name_zh && !member.name_en) throw new Error(state.lang === 'zh' ? '中文名和英文名至少填一个。' : 'Fill at least one name.');
    if (teamMembersTableReady && state.supabase) {
      const result = await state.supabase.from(TEAM_MEMBERS_TABLE)
        .insert([{ name_zh: member.name_zh, name_en: member.name_en, daxiang_id: member.daxiang_id }])
        .select('id,name_zh,name_en,daxiang_id').single();
      if (result.error) {
        if (!isTeamTableMissingError(result.error)) throw result.error;
        teamMembersTableReady = false;   // 表不存在 → 转本机名单
      } else {
        teamMembersCache.push(normalizeTeamMember(result.data));
        writeLocalTeamMembers(teamMembersCache);
        return teamMembersCache;
      }
    }
    member.id = 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    teamMembersCache.push(member);
    writeLocalTeamMembers(teamMembersCache);
    return teamMembersCache;
  }

  async function updateTeamMember(id, nameZh, nameEn, daxiangId) {
    const clean = normalizeTeamMember({ id: id, name_zh: nameZh, name_en: nameEn, daxiang_id: daxiangId });
    if (!clean.name_zh && !clean.name_en) throw new Error(state.lang === 'zh' ? '中文名和英文名至少填一个。' : 'Fill at least one name.');
    const index = teamMembersCache.findIndex(function(member) { return String(member.id) === String(id); });
    if (index < 0) return teamMembersCache;
    const isLocal = String(id).startsWith('local-');
    if (teamMembersTableReady && state.supabase && !isLocal) {
      const result = await state.supabase.from(TEAM_MEMBERS_TABLE)
        .update({ name_zh: clean.name_zh, name_en: clean.name_en, daxiang_id: clean.daxiang_id }).eq('id', id);
      if (result.error && !isTeamTableMissingError(result.error)) throw result.error;
    }
    teamMembersCache[index] = clean;
    writeLocalTeamMembers(teamMembersCache);
    return teamMembersCache;
  }

  async function deleteTeamMember(id) {
    const index = teamMembersCache.findIndex(function(member) { return String(member.id) === String(id); });
    if (index < 0) return teamMembersCache;
    const isLocal = String(id).startsWith('local-');
    if (teamMembersTableReady && state.supabase && !isLocal) {
      const result = await state.supabase.from(TEAM_MEMBERS_TABLE).delete().eq('id', id);
      if (result.error && !isTeamTableMissingError(result.error)) throw result.error;
    }
    teamMembersCache.splice(index, 1);
    writeLocalTeamMembers(teamMembersCache);
    return teamMembersCache;
  }
  // ── 使用者名单（v666）结束 ──

  // ── 物料清单（v707 开始；v775 两级结构；v777 按端分组）──
  // 团队管理页维护：案例库上传自动识别所依据的「物料类别 + 子类别 + 标准尺寸」清单。
  // 预设条目来自 docs/案例库物料类型规范.md（用户 2026-09-16 提供）+ v610 竖版 banner 增补。
  // 存储：服务端单行 jsonb（vf_material_catalog.entries）；表没建时退回本机 localStorage，功能不停摆。
  // 保存一律「整份覆盖」（清单小、结构嵌套，比逐行增删改简单也不易错）。
  // v775 起为两级结构：大类别（分组文件夹，可为空）→ 子类别（名称 + 各自的比例尺寸）。
  // 大类别是常驻文件夹：删光里面的子类别，类别本身保留。旧的单层条目（category/label/size）
  // 读取时自动升级成两级（同类别按子类名归并），写回即固化，无需 SQL 迁移。
  const MATERIAL_CATALOG_TABLE = 'vf_material_catalog';
  const MATERIAL_CATALOG_STORAGE_KEY = 'vf_material_catalog';
  // v849：搜索扩展——太通用的子类别名不参与「子类别名→大类别名」映射（搜「默认」不该命中所有大类）
  const MATERIAL_CATALOG_GENERIC_SUB_NAMES = ['默认'];
  let materialCatalogCache = [];        // [{ id, name, subs: [{ id, name, size }] }]
  let materialCatalogTableReady = true;
  let materialCatalogRowId = '';        // 服务端那行的 id；空 = 还没建行
  let materialCatalogSource = 'local';  // 保存写向哪里：'server' | 'local'
  let materialCatalogLastError = null;
  let materialCatalogLastLoadAt = 0;
  let materialCatalogPendingLocal = []; // 本机有、服务端还没有的类别（表后建好时提示一键导入）

  function materialCatalogUid() {
    return 'mc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // 预设 = C端 的默认尺寸；B/D/M 端由词表补齐（空条目，等用户填尺寸）
  function materialCatalogPresetCore() {
    return [
      { name: '开机海报', subs: [{ name: '开屏', sizes: ['1000×2168', '750×1626'] }] },
      { name: '弹窗', subs: [{ name: '默认', sizes: ['654×941'] }] },
      { name: 'banner', subs: [
        { name: '首页banner', sizes: ['1372×416'] },
        { name: '领券banner', sizes: ['1242×460'] },
        { name: '主页竖版banner', sizes: ['222×280', '444×560'] }
      ] },
      { name: '头图', subs: [{ name: '默认', sizes: ['750×高不固定'] }, { name: '顶通氛围图A', sizes: ['750×520'] }] },
      { name: '会场', subs: [
        { name: 'Tab', sizes: ['180×88', '336×88'] },
        { name: '楼层条', sizes: ['750×高不固定≤30%'] },
        { name: '顶通横条B', sizes: ['750×200'] }
      ] }
    ];
  }
  function materialCatalogPreset() {
    return materialCatalogSeedPlatforms(materialCatalogPresetCore());
  }

  // 子类别 = 一个名称 + 多个比例尺寸（同一子类别的不同适配尺寸不再拆成多条）
  function normalizeMaterialSub(sub) {
    const source = sub || {};
    const raw = Array.isArray(source.sizes) ? source.sizes : [source.size];
    const sizes = [];
    raw.forEach(function(value) {
      const text = String(value == null ? '' : value).trim();
      if (text && sizes.indexOf(text) < 0) sizes.push(text);
    });
    return {
      id: String(source.id || ''),
      name: String(source.name || '').trim(),
      sizes: sizes
    };
  }
  // 同一个类别里同名的子类别合并成一条：尺寸按出现顺序拼接去重
  function materialCatalogMergeSubs(list) {
    const out = [];
    const index = new Map();
    (Array.isArray(list) ? list : []).forEach(function(sub) {
      const key = sub.name || ('#' + sub.id);
      const found = index.get(key);
      if (!found) {
        index.set(key, sub);
        out.push(sub);
        return;
      }
      sub.sizes.forEach(function(size) { if (found.sizes.indexOf(size) < 0) found.sizes.push(size); });
    });
    return out;
  }

  // 兼容三种形态：v3（subs[].sizes）、v2（subs[].size 单尺寸）与 v1 单层（category/label/size）
  function normalizeMaterialCategory(entry) {
    const source = entry || {};
    const name = String(source.name || source.category || '').trim();
    const id = String(source.id || '');
    const platform = String(source.platform || '').trim() || materialCatalogPlatformForName(name);
    if (Array.isArray(source.subs)) {
      return { id: id, platform: platform, name: name, subs: materialCatalogMergeSubs(source.subs.map(normalizeMaterialSub)) };
    }
    let subs = [];
    if (source.category !== undefined) {
      const label = String(source.label || '').trim();
      const size = String(source.size || '').trim();
      if (label || size) subs = [{ id: '', name: label || '默认', size: size }];
    }
    return { id: id, platform: platform, name: name, subs: materialCatalogMergeSubs(subs.map(normalizeMaterialSub)) };
  }

  function materialCatalogCategories(raw) {
    const items = Array.isArray(raw) ? raw : [];
    const out = [];
    const legacy = new Map();
    const legacyOrder = [];
    items.forEach(function(item) {
      const source = item || {};
      if (Array.isArray(source.subs)) {
        out.push(normalizeMaterialCategory(source));
        return;
      }
      const name = String(source.category || '').trim();
      if (!name) return;
      let bucket = legacy.get(name);
      if (!bucket) {
        bucket = { id: String(source.id || ''), platform: materialCatalogPlatformForName(name), name: name, subs: [] };
        legacy.set(name, bucket);
        legacyOrder.push(bucket);
      }
      const label = String(source.label || '').trim();
      const size = String(source.size || '').trim();
      if (label || size) bucket.subs.push({ id: '', name: label || '默认', size: size });
    });
    legacyOrder.forEach(function(bucket) { out.push(bucket); });
    return out;
  }

  // ── 端（平台）维度：物料清单按 C端/B端/D端/M端 分队，大类别沿用案例库二级标签词表 ──
  var MATERIAL_CATALOG_PLATFORM_FALLBACK = ['C端', 'B端', 'D端', 'M端'];
  function materialCatalogPlatforms() {
    const list = (LIBRARY_TAGS.source && LIBRARY_TAGS.source.tag1) || [];
    return list.length ? list.slice() : MATERIAL_CATALOG_PLATFORM_FALLBACK.slice();
  }
  // 某个端现有的大类别词表（案例库二级标签；用户已挂了很多物料，这张表不能动）
  function materialCatalogPlatformVocab(platform) {
    const map = (LIBRARY_TAGS.source && LIBRARY_TAGS.source.tag2ByTag1) || {};
    return (map[platform] || []).slice();
  }
  function materialCatalogPlatformForName(name) {
    const platforms = materialCatalogPlatforms();
    for (const platform of platforms) {
      if (materialCatalogPlatformVocab(platform).indexOf(name) >= 0) return platform;
    }
    return platforms[0] || 'C端';
  }
  // 同一个端里同名的大类别合并成一条：大类别名就是识别产物，同名即同一个类别。
  // 合并后「删除/拖动/重命名」都不会再出现两条互相牵连；同名子类别再并尺寸。
  let materialCatalogMergedGroups = 0;
  // 团队表里还残留着几组「重名大类别」（读取时会合并显示，但服务端那行要写回才会真的合并）
  let materialCatalogServerDuplicateGroups = 0;
  function materialCatalogMergeCategories(list) {
    const out = [];
    const index = new Map();
    (Array.isArray(list) ? list : []).forEach(function(cat) {
      const key = String(cat.platform || '') + '|' + String(cat.name || '');
      const found = index.get(key);
      if (!found) {
        index.set(key, cat);
        out.push(cat);
        return;
      }
      materialCatalogMergedGroups += 1;
      (cat.subs || []).forEach(function(sub) {
        const same = found.subs.find(function(x) { return String(x.name) === String(sub.name); });
        if (!same) { found.subs.push(sub); return; }
        (sub.sizes || []).forEach(function(size) { if (same.sizes.indexOf(size) < 0) same.sizes.push(size); });
      });
    });
    return out;
  }

  // 老清单（没有端信息）升级：按词表把每个端的大类别补全，已有的条目保留自己的子类别
  function materialCatalogHasPlatformInfo(raw) {
    return (Array.isArray(raw) ? raw : []).some(function(item) {
      return item && typeof item.platform === 'string' && item.platform.trim();
    });
  }
  function materialCatalogSeedPlatforms(list) {
    const cats = materialCatalogCategories(list);
    const byKey = new Map();
    cats.forEach(function(cat) { byKey.set(cat.platform + '|' + cat.name, cat); });
    const out = [];
    materialCatalogPlatforms().forEach(function(platform) {
      materialCatalogPlatformVocab(platform).forEach(function(name) {
        const key = platform + '|' + name;
        const found = byKey.get(key);
        if (found) {
          found.platform = platform;
          out.push(found);
          byKey.delete(key);
        } else {
          out.push({ id: '', platform: platform, name: name, subs: [] });
        }
      });
    });
    // 词表以外的历史/自定义类别：接在各自端的后面，不丢
    byKey.forEach(function(cat) { out.push(cat); });
    return out;
  }
  function materialCatalogPrepare(raw) {
    materialCatalogMergedGroups = 0;
    const list = materialCatalogHasPlatformInfo(raw) ? materialCatalogCategories(raw) : materialCatalogSeedPlatforms(raw);
    return materialCatalogMergeCategories(list);
  }

  // 补 id 并保证唯一：历史数据里出现过「同名同 id」的重复类别（导入本机条目时按 id 复制出来的），
  // id 撞车会让「删除/拖动」一次动到两条，这里读入就修掉。
  function materialCatalogWithIds(list) {
    const usedCatIds = new Set();
    const usedSubIds = new Set();
    return materialCatalogMergeCategories(materialCatalogCategories(list)).map(function(cat) {
      if (!cat.id || usedCatIds.has(cat.id)) cat.id = materialCatalogUid();
      usedCatIds.add(cat.id);
      cat.subs = cat.subs.map(function(sub) {
        if (!sub.id || usedSubIds.has(sub.id)) sub.id = materialCatalogUid();
        usedSubIds.add(sub.id);
        return sub;
      });
      return cat;
    });
  }

  function materialCatalogKey(cat) {
    const c = normalizeMaterialCategory(cat);
    return [c.platform, c.name]
      .concat(c.subs.map(function(sub) { return sub.name + '|' + sub.sizes.slice().sort().join(','); }))
      .join('|').toLowerCase();
  }

  function isMaterialCatalogUnavailableError(error) {
    const message = String((error && error.message) || error || '');
    const lower = message.toLowerCase();
    return lower.includes('could not find the table') || lower.includes('does not exist')
      || lower.includes('schema cache') || lower.includes('undefined table')
      || message.includes('请求路径无效');
  }

  function materialCatalogHintText() {
    const zh = state.lang === 'zh';
    const message = String((materialCatalogLastError && materialCatalogLastError.message) || '');
    if (message.includes('Could not find the table') || message.includes('does not exist')) {
      return zh
        ? '物料清单表还没建（Supabase 里查不到 vf_material_catalog）：现在只保存在这台电脑上。请在 Supabase SQL Editor 执行 sql/016_material_catalog.sql，再点上面的「刷新」，即可变成团队共享。'
        : 'Catalog table missing: run sql/016_material_catalog.sql, then hit Refresh to share it with the team.';
    }
    if (message.includes('请求路径无效')) {
      return zh ? '服务端还没放行物料清单表：部署最新 functions 后点「刷新」。' : 'Server policy does not allow the catalog table yet; deploy the latest functions.';
    }
    if (!message) {
      return zh ? '物料清单暂时读不到：现在只保存在这台电脑上，点上面的「刷新」重试。'
                : 'Catalog unavailable; stored in this browser only. Hit Refresh to retry.';
    }
    return zh ? '物料清单暂时读不到（' + message.slice(0, 60) + '）：现在只保存在这台电脑上，点「刷新」重试。'
              : 'Catalog unavailable (' + message.slice(0, 60) + '); stored locally.';
  }

  function materialCatalogErrorText(error) {
    const message = String((error && error.message) || error || '');
    const zh = state.lang === 'zh';
    if (message.includes('需要开发者维护权限')) return zh ? '需要开发者维护权限：先进入「开发者维护」再改清单。' : 'Developer maintenance mode is required.';
    if (message.includes('请求路径无效')) return zh ? '服务端还没放行物料清单表：执行 sql/016_material_catalog.sql 并部署最新 functions 后刷新。' : 'Server policy does not allow the catalog table yet.';
    if (isMaterialCatalogUnavailableError(error)) return zh ? '物料清单表还没建：请在 Supabase SQL Editor 执行 sql/016_material_catalog.sql。' : 'Catalog table missing; run sql/016_material_catalog.sql.';
    return message;
  }

  function readLocalMaterialCatalog() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MATERIAL_CATALOG_STORAGE_KEY) || '[]');
      return materialCatalogPrepare(parsed);
    } catch (_e) { return []; }
  }

  function writeLocalMaterialCatalog(list) {
    try { localStorage.setItem(MATERIAL_CATALOG_STORAGE_KEY, JSON.stringify(materialCatalogPrepare(list))); } catch (_e) {}
  }

  async function loadMaterialCatalog() {
    const local = readLocalMaterialCatalog();
    const useFallback = function() {
      materialCatalogServerDuplicateGroups = 0;
      materialCatalogSource = 'local';
      materialCatalogPendingLocal = [];
      materialCatalogCache = materialCatalogWithIds(local.length ? local : materialCatalogPreset());
    };
    if (!state.supabase) {
      materialCatalogTableReady = false;
      useFallback();
      materialCatalogLastLoadAt = Date.now();
      return materialCatalogCache;
    }
    const result = await state.supabase.from(MATERIAL_CATALOG_TABLE)
      .select('id,entries').order('updated_at', { ascending: false }).limit(1);
    if (result.error) {
      if (!isMaterialCatalogUnavailableError(result.error)) throw result.error;
      materialCatalogTableReady = false;
      materialCatalogLastError = result.error;
      useFallback();
      materialCatalogLastLoadAt = Date.now();
      return materialCatalogCache;
    }
    materialCatalogTableReady = true;
    materialCatalogLastError = null;
    materialCatalogLastLoadAt = Date.now();
    const row = (result.data || [])[0];
    materialCatalogRowId = row ? String(row.id || '') : '';
    const rawServerList = materialCatalogPrepare(row && row.entries);
    const serverList = rawServerList;
    materialCatalogServerDuplicateGroups = materialCatalogMergedGroups;
    if (!serverList.length) {
      // 团队表还没有内容：本机条目优先显示（没有就显示预设）。本机条目算「未同步」，
      // 第一次编辑或点「导入到团队表」时整体写进服务端；保存目标直接算服务端（表已就绪）。
      materialCatalogServerDuplicateGroups = 0;
      materialCatalogSource = 'server';
      // 显示 = 本机内容补齐各端词表（团队表还没内容，第一次编辑/导入时整体落库）
      materialCatalogCache = materialCatalogWithIds(materialCatalogPrepare(local.length ? local : materialCatalogPreset()));
      materialCatalogPendingLocal = local.length ? materialCatalogWithIds(local) : [];
      return materialCatalogCache;
    }
    materialCatalogSource = 'server';
    const serverKeys = new Set(serverList.map(materialCatalogKey));
    materialCatalogPendingLocal = local.filter(function(entry) { return !serverKeys.has(materialCatalogKey(entry)); });
    materialCatalogCache = materialCatalogWithIds(serverList);
    // 本机缓存 = 服务端内容 + 仍未同步的行：本机条目不能因为这次覆盖就丢
    writeLocalMaterialCatalog(materialCatalogCache.concat(materialCatalogPendingLocal));
    return materialCatalogCache;
  }

  async function saveMaterialCatalog(list) {
    const rows = materialCatalogWithIds(list);
    if (materialCatalogSource === 'server' && materialCatalogTableReady && state.supabase) {
      const payload = rows.map(function(cat) {
        return {
          id: cat.id,
          platform: cat.platform,
          name: cat.name,
          subs: cat.subs.map(function(sub) { return { id: sub.id, name: sub.name, sizes: sub.sizes.slice() }; })
        };
      });
      let result;
      if (materialCatalogRowId) {
        result = await state.supabase.from(MATERIAL_CATALOG_TABLE)
          .update({ entries: payload, updated_at: new Date().toISOString() }).eq('id', materialCatalogRowId);
      } else {
        result = await state.supabase.from(MATERIAL_CATALOG_TABLE)
          .insert([{ entries: payload }]).select('id').single();
      }
      if (result.error) {
        if (!isMaterialCatalogUnavailableError(result.error)) throw result.error;
        // 表刚好读不到：降级成本机保存，别让这次修改丢
        materialCatalogTableReady = false;
        materialCatalogSource = 'local';
        materialCatalogLastError = result.error;
      } else if (result.data && result.data.id) {
        materialCatalogRowId = String(result.data.id);
      }
    }
    const beforeKeys = new Set(materialCatalogCache.map(materialCatalogKey));
    const afterKeys = new Set(rows.map(materialCatalogKey));
    // 已写进服务端的行不再算「未同步」；显示列表里被删掉/改掉的行也跟着去掉，
    // 只留下用户看不到的本机独有行（否则删过的行会在导入提示里诈尸）
    materialCatalogPendingLocal = materialCatalogPendingLocal.filter(function(entry) {
      const key = materialCatalogKey(entry);
      return !afterKeys.has(key) && !beforeKeys.has(key);
    });
    materialCatalogCache = rows;
    materialCatalogServerDuplicateGroups = 0;
    writeLocalMaterialCatalog(rows.concat(materialCatalogPendingLocal));
    materialCatalogLastLoadAt = Date.now();
    return materialCatalogCache;
  }

  // 把「本机有、服务端还没有」的行并进团队表（当前显示的清单一起整体写入）。
  // 本机行已经在显示列表里时不重复追加（那种情况下导入 = 把当前清单整体落库）。
  async function importMaterialCatalogPending() {
    if (!materialCatalogPendingLocal.length) return materialCatalogCache;
    if (materialCatalogTableReady && state.supabase) materialCatalogSource = 'server';
    const cacheKeys = new Set(materialCatalogCache.map(materialCatalogKey));
    const extras = materialCatalogPendingLocal.filter(function(entry) { return !cacheKeys.has(materialCatalogKey(entry)); });
    // 同端同名的大类别不再追加成第二个（会撞 id 也撞名字）：把它的尺寸并进已有类别
    const merged = materialCatalogWithIds(materialCatalogCache);
    const rest = [];
    const mergedNames = new Set();
    extras.forEach(function(entry) {
      const sameName = merged.find(function(cat) {
        return String(cat.platform) === String(entry.platform) && String(cat.name) === String(entry.name);
      });
      if (!sameName) { rest.push(entry); return; }
      mergedNames.add(String(entry.platform) + '|' + String(entry.name));
      (entry.subs || []).forEach(function(sub) {
        const existing = sameName.subs.find(function(x) { return String(x.name) === String(sub.name); });
        if (!existing) { sameName.subs.push({ id: '', name: sub.name, sizes: (sub.sizes || []).slice() }); return; }
        (sub.sizes || []).forEach(function(size) { if (existing.sizes.indexOf(size) < 0) existing.sizes.push(size); });
      });
    });
    // 已并入的条目不再算「未同步」（它的尺寸已经在上面并进同名类别了）
    materialCatalogPendingLocal = materialCatalogPendingLocal.filter(function(entry) {
      return !mergedNames.has(String(entry.platform) + '|' + String(entry.name));
    });
    return saveMaterialCatalog(merged.concat(rest));
  }

  // 「本机待同步」用户不需要了（多半是已经删掉的行 / 旧格式遗留在本机缓存里）：清掉即可。
  // 团队表不动；本机缓存改写成团队表内容，下次加载不会再把它算成「未同步」。
  function materialCatalogDismissPending() {
    materialCatalogPendingLocal = [];
    writeLocalMaterialCatalog(materialCatalogCache);
  }

  // 「按清单重跑识别」：把存量案例物料的 material_type 按当前清单重算，只写变化的行。
  // 先只读统计会变多少张，由调用方弹确认；这里只负责算 + 写。
  async function collectCaseMaterialTypeChanges() {
    // 识别严格按端：先按项目标签定出每个案例项目属于哪个端，再逐张物料用该端的清单重算。
    // 图库/模板库的预览图没有物料类别，跳过不动。
    const sources = await state.supabase.from('vf_source_files').select('id,tags');
    if (sources.error) throw sources.error;
    const platformBySource = new Map();
    const manualIds = new Set();
    (sources.data || []).forEach(function(row) {
      if (libraryKindOfSource(row) !== 'source') return;
      platformBySource.set(String(row.id), sourcePlatformOf(row));
      // v864：手动设置过类型的物料带保护标记，重跑时保持不动
      caseManualTypeMarkerIds(row && row.tags).forEach(function(id) { manualIds.add(id); });
    });
    const changes = [];
    let skippedManual = 0;
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const result = await state.supabase.from('vf_asset_previews')
        .select('id,source_file_id,preview_filename,preview_mime_type,width,height,material_type')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (result.error) throw result.error;
      const rows = result.data || [];
      rows.forEach(function(row) {
        const platform = platformBySource.get(String(row.source_file_id || ''));
        if (!platform) return;
        if (manualIds.has(String(row.id || ''))) { skippedManual += 1; return; }
        const dynamic = String(row.preview_mime_type || '').startsWith('video/') || /\.gif$/i.test(String(row.preview_filename || ''));
        const next = dynamic ? caseDynamicMaterialType(platform) : detectMaterialTypeByCatalog(platform, row.width, row.height);
        const current = String(row.material_type || '');
        if (next !== current) changes.push({ id: row.id, platform: platform, material_type: next, from: current, to: next });
      });
      if (rows.length < pageSize) break;
    }
    return { changes: changes, skippedManual: skippedManual };
  }

  async function recaseMaterialTypesByCatalog(onProgress) {
    const zh = state.lang === 'zh';
    const say = typeof onProgress === 'function' ? onProgress : function() {};
    say(zh ? '正在比对清单…' : 'Comparing…');
    const outcome = await collectCaseMaterialTypeChanges();
    const changes = outcome.changes;
    const skippedManual = outcome.skippedManual;
    const manualNote = skippedManual
      ? (zh ? `另有 ${skippedManual} 张手动设置过类型，保持不动。` : ` ${skippedManual} manually set item(s) stay untouched.`)
      : '';
    if (!changes.length) return zh
      ? ('全部物料都已经是清单里的类别，不用改。' + (skippedManual ? `（另有 ${skippedManual} 张手动设置过，保持不动）` : ''))
      : 'Everything already matches the list.';
    const names = Array.from(new Set(changes.map(function(item) { return (item.platform || '') + '·' + (item.to || (state.lang === 'zh' ? '未分类' : 'Unclassified')); })));
    const ok = confirm(zh
      ? `有 ${changes.length} 张物料的类别与当前清单不一致，将按清单改成：${names.join('、')}。${manualNote}继续？（只改这些物料的类别）`
      : `${changes.length} material(s) differ from the list. Re-detect them?${manualNote}`);
    if (!ok) return zh ? '已取消。' : 'Cancelled.';
    say(zh ? `正在重跑 ${changes.length} 张…` : `Re-detecting ${changes.length}…`);
    const concurrency = 4;
    let index = 0;
    let failed = 0;
    const worker = async function() {
      while (index < changes.length) {
        const item = changes[index++];
        const result = await state.supabase.from('vf_asset_previews')
          .update({ material_type: item.material_type }).eq('id', item.id);
        if (result && result.error) failed += 1;
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, changes.length) }, worker));
    return failed
      ? (zh ? `重跑完成，${changes.length - failed} 张已更新，${failed} 张失败。` : `Done: ${changes.length - failed} updated, ${failed} failed.`)
      : (zh ? `重跑完成：${changes.length} 张物料的类别已按清单更新。` : `Done: ${changes.length} updated.`);
  }

  async function restoreMaterialCatalogPreset() {
    return saveMaterialCatalog(materialCatalogPreset());
  }

  // ── 识别内核（v776：清单即规则）──
  // 尺寸写法：`宽×高` 具体尺寸；`宽×高不固定`（也接受 高不限/高任意/*）= 宽固定、高任意；
  // 通配还可以带「高占宽的百分比」区间：`750×高不固定≤30%`（薄条如楼层条）、`750×高不固定30%~150%`（头图）；
  // 带区间时也可以不锚宽度：`高不固定≤30%` = 宽不限，只要高/宽落在区间内（比例与缩放无关，@2x 导出也能命中）
  var MATERIAL_SIZE_WILDCARD = /^(高不固定|高不限|高任意|任意高|不限|\*)/;
  var MATERIAL_SIZE_WILDCARD_BAND = /^(?:高不固定|高不限|高任意|任意高|不限|\*)\s*(?:≤\s*([0-9]+(?:\.[0-9]+)?)\s*%?|≥\s*([0-9]+(?:\.[0-9]+)?)\s*%?|(?:([0-9]+(?:\.[0-9]+)?)\s*%?)\s*[~～〜]\s*(?:([0-9]+(?:\.[0-9]+)?)\s*%?)?)$/;
  var MATERIAL_SIZE_RATIO_TOLERANCE = 0.02;
  // 只可能是竖图（高 > 宽）的类别：横图一律不判给它。
  // 起因：弹窗的规则里有「1500×940」这种横尺寸，靠「同比例 ±2%」把 750×465 的横图吸成了弹窗。
  var CASE_PORTRAIT_ONLY_TYPES = ['弹窗'];
  // 波浪号在实际输入里可能是半角 ~、全角 ～、日文 〜：都认，存的时候统一成半角
  var MATERIAL_SIZE_RANGE_SPLIT = /^([0-9]+(?:\.[0-9]+)?)\s*[~～〜]\s*([0-9]+(?:\.[0-9]+)?)$/;
  // 单维：`180` 或区间 `180~336`（写反了也认，内部按小到大归一）
  function parseMaterialSizeDim(text) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw) return null;
    const range = raw.match(MATERIAL_SIZE_RANGE_SPLIT);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (!(a > 0) || !(b > 0)) return null;
      return { value: Math.min(a, b), max: Math.max(a, b) };
    }
    const single = Number(raw);
    if (!(single > 0)) return null;
    return { value: single, max: null };
  }
  // 解析通配里的百分比区间：`≤30` → {min:null,max:30}；`≥30` → {min:30,max:null}；`30~150` → {min:30,max:150}；纯通配 → {min:null,max:null}；非通配 → null
  function parseMaterialSizeBand(text) {
    const m = String(text == null ? '' : text).trim().match(MATERIAL_SIZE_WILDCARD_BAND);
    if (!m) return null;
    if (m[1] != null) return { bandMin: null, bandMax: Number(m[1]) };
    if (m[2] != null) return { bandMin: Number(m[2]), bandMax: null };
    if (m[3] == null) return { bandMin: null, bandMax: null };
    const a = Number(m[3]);
    const b = m[4] != null ? Number(m[4]) : null;
    return b == null ? { bandMin: null, bandMax: a } : { bandMin: Math.min(a, b), bandMax: Math.max(a, b) };
  }
  // 展示用：高≤宽的30% / 高≥宽的30% / 高为宽的30%~150%；无区间返回 ''
  function materialSizeBandLabelText(spec) {
    if (!spec || (spec.bandMax == null && spec.bandMin == null)) return '';
    if (spec.bandMin != null && spec.bandMax != null) return (state.lang === 'zh' ? '高为宽的' : 'height ') + spec.bandMin + '%~' + spec.bandMax + '%';
    if (spec.bandMin != null) return (state.lang === 'zh' ? '高≥宽的' : 'height ≥ ') + spec.bandMin + '%';
    return (state.lang === 'zh' ? '高≤宽的' : 'height ≤ ') + spec.bandMax + '%';
  }
  // 编辑框用：`≤30%` / `≥30%` / `30%~150%`；无区间返回 ''
  function materialSizeBandInputText(spec) {
    if (!spec || (spec.bandMax == null && spec.bandMin == null)) return '';
    if (spec.bandMin != null && spec.bandMax != null) return spec.bandMin + '%~' + spec.bandMax + '%';
    if (spec.bandMin != null) return '≥' + spec.bandMin + '%';
    return '≤' + spec.bandMax + '%';
  }
  // 尺寸写法：`宽×高`；宽/高各自可以是数字或区间 `180~336`；高还可以是「高不固定」（可带百分比区间）
  function parseMaterialSizeSpec(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const bare = parseMaterialSizeBand(text);
    if (bare) {
      // 不锚宽度的通配必须带区间，否则「宽高都不限」会吞掉一切 → 仍视为无效
      if (bare.bandMin == null && bare.bandMax == null) return null;
      return { width: null, widthMax: null, height: null, heightMax: null, bandMin: bare.bandMin, bandMax: bare.bandMax };
    }
    const match = text.match(/^([0-9]+(?:\.[0-9]+)?(?:\s*[~～〜]\s*[0-9]+(?:\.[0-9]+)?)?)\s*[×xX]\s*(.+)$/);
    if (!match) return null;
    const width = parseMaterialSizeDim(match[1]);
    if (!width) return null;
    const heightText = match[2].trim();
    if (MATERIAL_SIZE_WILDCARD.test(heightText)) {
      const band = parseMaterialSizeBand(heightText);
      const spec = { width: width.value, widthMax: width.max, height: null, heightMax: null };
      if (band && (band.bandMin != null || band.bandMax != null)) {
        spec.bandMin = band.bandMin;
        spec.bandMax = band.bandMax;
      }
      return spec;
    }
    const height = parseMaterialSizeDim(heightText);
    if (!height) return null;
    return { width: width.value, widthMax: width.max, height: height.value, heightMax: height.max };
  }
  function materialSizeNear(value, target, tolerance) {
    const limit = typeof tolerance === 'number' ? tolerance : MATERIAL_SIZE_RATIO_TOLERANCE;
    return Math.abs(value - target) / Math.max(Math.abs(target), 1e-6) <= limit;
  }
  function materialCatalogList() {
    return materialCatalogPrepare(materialCatalogCache.length ? materialCatalogCache : materialCatalogPreset());
  }
  function materialCatalogPlatformOf(value) {
    const name = String(value || '').trim();
    return materialCatalogPlatforms().indexOf(name) >= 0 ? name : '';
  }
  // 清单 → 有序识别条目（只取某个端）：类别名 + 尺寸，按清单顺序先到先得
  function materialCatalogDetectionEntries(platform) {
    const want = String(platform || '').trim();
    const out = [];
    materialCatalogList().forEach(function(cat) {
      const name = String((cat && cat.name) || '').trim();
      if (!name) return;
      if (want && String(cat.platform || '') !== want) return;
      (cat.subs || []).forEach(function(sub) {
        (sub && sub.sizes ? sub.sizes : []).forEach(function(size) {
          const spec = parseMaterialSizeSpec(size);
          if (!spec) return;
          const entry = { type: name, width: spec.width, widthMax: spec.widthMax, height: spec.height, heightMax: spec.heightMax };
          if (spec.bandMin != null || spec.bandMax != null) {
            entry.bandMin = spec.bandMin == null ? null : spec.bandMin;
            entry.bandMax = spec.bandMax;
          }
          out.push(entry);
        });
      });
    });
    return out;
  }
  // 先比具体尺寸（同比例即命中，含等比缩放），再比带「高/宽百分比」区间的通配（更具体，如楼层条≤30%），
  // 最后比无区间的通配兕底（如头图 750×高不固定）；都没命中返回 ''（不猜）
  // 单条规则是否命中：固定高（含高区间）→ 用高反推缩放倍数，再看宽落不落在区间；
  // 高不固定 → 宽（若有锚定）±2% 命中，再验高/宽百分比区间。具体尺寸（两边都不是区间）等价于「同比例命中」。
  function materialSizeEntryMatches(entry, width, height) {
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    if (!(w > 0) || !(h > 0)) return false;
    const inRange = function(value, min, max) {
      const lo = min * (1 - MATERIAL_SIZE_RATIO_TOLERANCE);
      const hi = (max != null ? max : min) * (1 + MATERIAL_SIZE_RATIO_TOLERANCE);
      return value >= lo && value <= hi;
    };
    if (entry.height != null) {
      if (entry.heightMax != null) {
        return inRange(w, entry.width, entry.widthMax) && inRange(h, entry.height, entry.heightMax);
      }
      const scale = h / entry.height;
      if (!(scale > 0)) return false;
      return inRange(w / scale, entry.width, entry.widthMax);
    }
    // 高不固定通配：宽度锚定（可省略）+ 可选「高占宽百分比」区间
    if (entry.width != null && !inRange(w, entry.width, entry.widthMax)) return false;
    if (entry.bandMax == null && entry.bandMin == null) return true;
    const ratio = (h / w) * 100;
    const lo = entry.bandMin != null ? entry.bandMin * (1 - MATERIAL_SIZE_RATIO_TOLERANCE) : 0;
    const hi = entry.bandMax != null ? entry.bandMax * (1 + MATERIAL_SIZE_RATIO_TOLERANCE) : Infinity;
    return ratio >= lo && ratio <= hi;
  }
  // 横图不该判给「只可能是竖图」的类别（弹窗）：直接跳过，让它落到通配或别的类别
  function materialTypeAllowsOrientation(type, width, height) {
    if (CASE_PORTRAIT_ONLY_TYPES.indexOf(String(type || '')) < 0) return true;
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    return h > w;
  }
  function detectMaterialTypeFromCatalogList(list, width, height) {
    const entries = Array.isArray(list) ? list : [];
    for (const entry of entries) {
      if (entry.height == null) continue;
      if (!materialTypeAllowsOrientation(entry.type, width, height)) continue;
      if (materialSizeEntryMatches(entry, width, height)) return entry.type;
    }
    // 通配分两档：带百分比区间的更具体（楼层条≤30%），先试；无区间的兕底（头图任意高）后试
    for (const entry of entries) {
      if (entry.height != null) continue;
      if (entry.bandMax == null && entry.bandMin == null) continue;
      if (!materialTypeAllowsOrientation(entry.type, width, height)) continue;
      if (materialSizeEntryMatches(entry, width, height)) return entry.type;
    }
    for (const entry of entries) {
      if (entry.height != null) continue;
      if (entry.bandMax != null || entry.bandMin != null) continue;
      if (!materialTypeAllowsOrientation(entry.type, width, height)) continue;
      if (materialSizeEntryMatches(entry, width, height)) return entry.type;
    }
    return '';
  }
  // 识别严格按端：传了 C端 就只在 C端 的清单里匹配，不跨端兜底
  function detectMaterialTypeByCatalog(platform, width, height) {
    const onlyPlatform = materialCatalogPlatformOf(platform);
    if (!onlyPlatform) return '';
    return detectMaterialTypeFromCatalogList(materialCatalogDetectionEntries(onlyPlatform), width, height);
  }
  // 某个端的大类别名（顺序即清单顺序）；不传端 = 全部端（按清单顺序去重）
  function materialCatalogTypeNames(platform) {
    const want = String(platform || '').trim();
    const names = [];
    materialCatalogList().forEach(function(cat) {
      const name = String((cat && cat.name) || '').trim();
      if (!name) return;
      if (want && String(cat.platform || '') !== want) return;
      if (names.indexOf(name) < 0) names.push(name);
    });
    return names;
  }
  // v849 搜索扩展：子类别名 → 所属大类别名（多端可能同名子类别，去重）。
  // 映射每次从「当前清单」动态构建：服务端清单改完、页面刷新后即实时生效，无需发版。
  // 用途：搜「顶通」→ 命中「头图」大类物料（子类别名不进物料字段，靠映射把词带到搜索文本上）。
  let materialCatalogSubNameMap = null;
  let materialCatalogSubNameMapSource = null;
  function materialCatalogSubNameTypes(name) {
    const want = String(name || '').trim().toLowerCase();
    if (!want) return [];
    if (materialCatalogSubNameMapSource !== materialCatalogCache) {
      const map = {};
      materialCatalogList().forEach(function(cat) {
        const catName = String((cat && cat.name) || '').trim();
        if (!catName) return;
        (cat.subs || []).forEach(function(sub) {
          const subName = String((sub && sub.name) || '').trim().toLowerCase();
          if (!subName || MATERIAL_CATALOG_GENERIC_SUB_NAMES.indexOf(subName) >= 0) return;
          const bucket = map[subName] || (map[subName] = []);
          if (bucket.indexOf(catName) < 0) bucket.push(catName);
        });
      });
      materialCatalogSubNameMap = map;
      materialCatalogSubNameMapSource = materialCatalogCache;
    }
    return materialCatalogSubNameMap[want] || [];
  }
  function materialCatalogDynamicDefaultType(preferred, platform) {
    const names = materialCatalogTypeNames(platform);
    if (!names.length) return '';
    const want = String(preferred || '').trim();
    return (want && names.indexOf(want) >= 0) ? want : names[0];
  }
  // 某个值是不是「物料类别」（任一端清单里的大类别）：是则返回筛选集合，否则 null（按普通标签处理）
  function caseMaterialTypeSet(value) {
    const name = String(value || '').trim();
    return (name && materialCatalogTypeNames().indexOf(name) >= 0) ? [name] : null;
  }
  // 案例库「开屏/开机海报」类别名：清单里有就用它，否则用该端第一个类别（AI 元素建议优先拿它当主图）
  function caseSplashTypeName(platform) {
    const names = materialCatalogTypeNames(platform);
    const fallback = names.length ? names : materialCatalogTypeNames();
    return fallback.indexOf('开机海报') >= 0 ? '开机海报' : (fallback[0] || '');
  }
  // 项目卡默认封面的类别优先级：开机海报优先（版式最完整），其余按清单顺序
  function caseCoverTypePriority() {
    const order = materialCatalogTypeNames();
    const splash = order.indexOf('开机海报');
    if (splash > 0) {
      order.splice(splash, 1);
      order.unshift('开机海报');
    }
    return order;
  }
  // 上传弹窗当前所属的端：以案例库上传标签条里选的平台为准，其次上传控件/页面筛的平台，最后 C端
  function uploadCasePlatform() {
    const bar = document.getElementById('upload-case-tag-bar');
    if (bar && bar._caseTagSel) {
      const platform = materialCatalogPlatformOf(caseTagSelFirst(bar._caseTagSel, 'tag1'));
      if (platform) return platform;
    }
    const filters = state.libraryFilters || {};
    return materialCatalogPlatformOf(filters.uploadTag1)
      || materialCatalogPlatformOf(filters.tag1)
      || (materialCatalogPlatforms()[0] || '');
  }
  // 某个案例项目所属的端（平台标签），没有平台标签时按 C端（与上传预填默认一致）
  function sourcePlatformOf(source) {
    const tags = (typeof visibleLibraryTags === 'function')
      ? visibleLibraryTags(source)
      : (Array.isArray(source && source.tags) ? source.tags : []);
    for (const platform of materialCatalogPlatforms()) {
      if (tags.indexOf(platform) >= 0) return platform;
    }
    return materialCatalogPlatforms()[0] || '';
  }
  // 案例库某端的大类别＝**物料清单里的类别**（清单是唯一来源）：清单里删掉的类别，这里就不再出现。
  // 只有该端清单读不到任何类别时才回退到旧的二级标签词表，免得整行空白。
  function caseLibraryTypeTagValues(platform) {
    const want = String(platform || '').trim();
    if (!want) return materialCatalogTypeNames();
    const names = materialCatalogTypeNames(want);
    return names.length ? names : materialCatalogPlatformVocab(want).slice();
  }
  // 案例库二级标签行：直接取当前端的清单类别（清单删了这里就没了）
  function sourceTag2Values(tag1) {
    if (tag1 && tag1 !== 'all') return caseLibraryTypeTagValues(tag1);
    const merged = [];
    materialCatalogPlatforms().forEach(function(platform) {
      caseLibraryTypeTagValues(platform).forEach(function(value) {
        if (value && merged.indexOf(value) < 0) merged.push(value);
      });
    });
    return merged;
  }
  // 清单是团队共享的单行数据：案例库/上传路径按需刷新（默认 60 秒内不重复拉）
  function refreshMaterialCatalogForCases(options) {
    const force = !!(options && options.force);
    if (!state.supabase) return Promise.resolve(materialCatalogCache);
    if (!force && materialCatalogLastLoadAt && Date.now() - materialCatalogLastLoadAt < 60000) {
      return Promise.resolve(materialCatalogCache);
    }
    return loadMaterialCatalog().catch(function() { return materialCatalogCache; });
  }
  // 折叠状态（v778）：记住展开了哪些端、以及正在维护的那一个大类别（手风琴，只开一个）
  var MATERIAL_CATALOG_OPEN_KEY = 'vf_admin_fold_catalog_open_v1';
  let materialCatalogOpenState = null;
  function materialCatalogReadOpenState() {
    if (materialCatalogOpenState) return materialCatalogOpenState;
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(MATERIAL_CATALOG_OPEN_KEY) || 'null'); } catch (_e) { parsed = null; }
    const platforms = (parsed && Array.isArray(parsed.platforms)) ? parsed.platforms.filter(Boolean).slice() : null;
    // 类别可以同时展开多个（拖动归类要在两个大类别之间来回看，强行只开一个没法拖）
    const categories = (parsed && Array.isArray(parsed.categories)) ? parsed.categories.filter(Boolean).map(String) : [];
    if (!categories.length && parsed && parsed.category) categories.push(String(parsed.category));
    materialCatalogOpenState = {
      platforms: platforms || [materialCatalogPlatforms()[0] || ''],
      categories: categories
    };
    return materialCatalogOpenState;
  }
  function materialCatalogWriteOpenState() {
    try { localStorage.setItem(MATERIAL_CATALOG_OPEN_KEY, JSON.stringify(materialCatalogReadOpenState())); } catch (_e) {}
  }
  // 端改成横排页签（v822）：open.platforms[0] = 当前选中的页签，一次只显示一个端
  function materialCatalogTogglePlatform(platform) {
    const open = materialCatalogReadOpenState();
    open.platforms = [platform];
    materialCatalogWriteOpenState();
  }
  function materialCatalogToggleCategory(id) {
    const open = materialCatalogReadOpenState();
    const key = String(id);
    const at = open.categories.indexOf(key);
    if (at >= 0) open.categories.splice(at, 1); else open.categories.push(key);
    const cat = materialCatalogCache.find(function(c) { return String(c.id) === key; });
    if (cat && open.platforms.indexOf(String(cat.platform || '')) < 0) open.platforms.push(String(cat.platform || ''));
    materialCatalogWriteOpenState();
  }
  function materialCatalogCloseMenus() {
    document.querySelectorAll('#material-catalog-section .material-catalog-cat-menu').forEach(function(menu) { menu.hidden = true; });
  }
  // 尺寸统一展示：1000 × 2168 px；通配写「750 px × 高不固定」
  // 上一个保存成功的尺寸：新尺寸默认沿用它，输入时只改需要变的那一栏
  let materialCatalogLastDim = null;
  function materialCatalogRememberDim(size) {
    const spec = parseMaterialSizeSpec(size);
    if (!spec) return;
    materialCatalogLastDim = {
      width: spec.width == null ? '' : String(spec.width),
      height: spec.height == null ? '' : String(spec.height),
      wildcard: spec.height == null,
      band: materialSizeBandInputText(spec)
    };
  }
  // 新尺寸的默认值：优先「上次保存过的尺寸」，其次同类里最后一条，都没有就留空
  function materialCatalogSeedSize(siblingSizes) {
    const last = materialCatalogLastDim;
    if (last && (last.width || last.band)) return materialCatalogSizeFromParts(last.width, last.height, last.wildcard, last.band);
    const list = Array.isArray(siblingSizes) ? siblingSizes : [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (parseMaterialSizeSpec(list[i])) return list[i];
    }
    return '';
  }
  // 拖动排序：把某个大类别移到目标大类别的前/后（跨端时顺带改端）；targetCatId 为空 = 追加到某个端的末尾
  function materialCatalogMoveCategory(list, catId, targetCatId, position, platform) {
    const cats = materialCatalogCategories(list).map(function(cat) {
      return { id: cat.id, platform: cat.platform, name: cat.name, subs: cat.subs.slice() };
    });
    const from = cats.findIndex(function(c) { return String(c.id) === String(catId); });
    if (from < 0) return null;
    const moved = cats.splice(from, 1)[0];
    const to = targetCatId ? cats.findIndex(function(c) { return String(c.id) === String(targetCatId); }) : -1;
    if (to < 0 && !platform) { cats.splice(from, 0, moved); return cats; }
    if (to < 0) {
      moved.platform = platform;
      cats.push(moved);
      return cats;
    }
    if (String(catId) === String(targetCatId)) { cats.splice(from, 0, moved); return cats; }
    moved.platform = cats[to].platform;
    cats.splice(position === 'after' ? to + 1 : to, 0, moved);
    return cats;
  }
  // 拖动归类：把子类别移到目标大类别（targetSubId 为空 = 追加到该大类别末尾；同类内即换位）
  function materialCatalogMoveSub(list, subId, targetCatId, targetSubId, position) {
    const cats = materialCatalogCategories(list).map(function(cat) {
      return { id: cat.id, platform: cat.platform, name: cat.name, subs: cat.subs.map(function(sub) { return { id: sub.id, name: sub.name, sizes: sub.sizes.slice() }; }) };
    });
    let moved = null;
    cats.forEach(function(cat) {
      const idx = cat.subs.findIndex(function(sub) { return String(sub.id) === String(subId); });
      if (idx >= 0) moved = cat.subs.splice(idx, 1)[0];
    });
    if (!moved) return null;
    const target = cats.find(function(cat) { return String(cat.id) === String(targetCatId); });
    if (!target) return null;
    const at = targetSubId ? target.subs.findIndex(function(sub) { return String(sub.id) === String(targetSubId); }) : -1;
    if (at < 0) target.subs.push(moved);
    else target.subs.splice(position === 'after' ? at + 1 : at, 0, moved);
    return cats;
  }
  // 通配的「高占宽百分比」后缀：`≤30%` / `≥30%` / `30%~150%`；无区间返回 ''
  function materialCatalogBandSuffix(bandText) {
    const raw = String(bandText == null ? '' : bandText).trim();
    if (!raw) return '';
    const m = raw.match(/^(≤|≥)?\s*([0-9]+(?:\.[0-9]+)?)\s*%?(?:\s*[~～〜]\s*([0-9]+(?:\.[0-9]+)?)\s*%?)?$/);
    if (!m) return '';
    if (m[3] != null) {
      const a = Number(m[2]);
      const b = Number(m[3]);
      return Math.min(a, b) + '%~' + Math.max(a, b) + '%';
    }
    return (m[1] === '≥' ? '≥' : '≤') + Number(m[2]) + '%';
  }
  // 从一组 (W/H/高不固定/百分比区间) 拼回清单里的尺寸文本；宽缺失且无区间时返回 ''
  function materialCatalogSizeFromParts(width, height, wildcard, bandText) {
    const clean = function(value) { return String(value == null ? '' : value).replace(/[^0-9.~～〜]/g, '').trim(); };
    const bandSuffix = materialCatalogBandSuffix(bandText);
    if (wildcard) {
      const wSpec = parseMaterialSizeDim(clean(width));
      if (wSpec) {
        const wText = wSpec.max != null ? (wSpec.value + '~' + wSpec.max) : String(wSpec.value);
        return wText + (state.lang === 'zh' ? '×高不固定' : ' × any H') + bandSuffix;
      }
      // 不锚宽度：必须带百分比区间，否则「宽高都不限」无效
      return bandSuffix ? (state.lang === 'zh' ? '高不固定' : 'any H') + bandSuffix : '';
    }
    const hSpec = parseMaterialSizeDim(clean(height));
    if (!hSpec) return '';
    const wSpec = parseMaterialSizeDim(clean(width));
    if (!wSpec) return '';
    const wText = wSpec.max != null ? (wSpec.value + '~' + wSpec.max) : String(wSpec.value);
    const hText = hSpec.max != null ? (hSpec.value + '~' + hSpec.max) : String(hSpec.value);
    return wText + '×' + hText;
  }
  function materialCatalogSizeLabel(size) {
    const text = String(size || '').trim();
    if (!text) return '';
    const spec = parseMaterialSizeSpec(text);
    if (!spec) return text;
    const dim = function(value, max) { return max != null ? (value + '~' + max) : String(value); };
    if (spec.height == null) {
      const band = materialSizeBandLabelText(spec);
      const prefix = spec.width == null ? (state.lang === 'zh' ? '宽不限 × 高不固定' : 'any W × any H') : (dim(spec.width, spec.widthMax) + (state.lang === 'zh' ? ' × 高不固定' : ' × any H'));
      // v859：常态就把区间含义写明白——带区间的写「高≤宽的30%」，没带区间的写「高不限」
      return prefix + (band ? '（' + band + '）' : (state.lang === 'zh' ? '（高不限）' : ' (any ratio)'));
    }
    return dim(spec.width, spec.widthMax) + ' × ' + dim(spec.height, spec.heightMax) + ' px';
  }

  // ── 物料清单（v707）结束 ──

  // 物料所有者「可输入可联想」下拉：
  // 边打字边出候选（姓名/大象编号都能匹配），命中名单时输入框下方直接显示大象编号，随时可点选。
  function renderOwnerCombobox(options) {
    const settings = options || {};
    const inputId = settings.inputId ? `id="${settings.inputId}"` : '';
    return `
      <div class="owner-combobox" data-owner-combobox>
        <div class="owner-combobox-field">
          <input name="owner_name" ${inputId} autocomplete="off" maxlength="80" value="${escapeAttr(settings.value || '')}"
                 placeholder="${state.lang === 'zh' ? '输入姓名或大象编号' : 'Name or Daxiang ID'}">
          <span class="owner-combobox-badge" data-owner-badge hidden></span>
        </div>
        <div class="owner-combobox-menu" data-owner-menu role="listbox" hidden></div>
        <input type="hidden" name="owner_contact" data-owner-contact value="${escapeAttr(settings.contact || '')}">
      </div>`;
  }

  function wireOwnerCombobox(scope) {
    const root = scope && scope.querySelector ? scope.querySelector('[data-owner-combobox]') : null;
    if (!root || root.dataset.ownerWired === 'true') return;
    root.dataset.ownerWired = 'true';
    const input = root.querySelector('[name="owner_name"]');
    const menu = root.querySelector('[data-owner-menu]');
    const contactInput = root.querySelector('[data-owner-contact]');
    const badge = root.querySelector('[data-owner-badge]');
    if (!input || !menu || !contactInput) return;
    let current = [];
    let highlight = -1;

    // 隐藏字段给提交用；编号标签贴在输入框右侧（比在框下面加文字更不打扰布局）。
    // clearWhenUnmatched=false 用于「刚打开时/名单刚加载完」，不因为暂时没匹配到就把已有编号抹掉
    const syncContact = (clearWhenUnmatched) => {
      const resolved = resolveTeamMemberDaxiang(input.value);
      if (resolved) contactInput.value = resolved;
      else if (clearWhenUnmatched) contactInput.value = '';
      if (badge) {
        const text = contactInput.value;
        badge.hidden = !text;
        badge.textContent = text;
        badge.title = text ? (state.lang === 'zh' ? '大象编号：' + text : 'Daxiang ID: ' + text) : '';
      }
    };

    const closeMenu = () => {
      menu.hidden = true;
      menu.innerHTML = '';
      current = [];
      highlight = -1;
    };

    const renderMenu = () => {
      current = filterTeamMemberOptions(teamMemberOptions(), input.value);
      if (!current.length) { closeMenu(); return; }
      // 默认高亮第一条：这样「打完名字」时大象编号就在眼前，回车即可选中
      highlight = 0;
      menu.innerHTML = current.map(function(option, index) {
        // 顺序：英文名（主，加粗）→ 中文名（次，淡色）→ 大象编号（右侧标签）
        // 没有英文名时中文名升为主显示；两个名字都有时中文名作为次要信息保留
        const primary = option.nameEn || option.nameZh;
        const secondary = option.nameEn && option.nameZh ? option.nameZh : '';
        const nameHtml = `<span class="owner-option-name">${escapeHtml(primary)}</span>`
          + (secondary ? `<span class="owner-option-name-zh">${escapeHtml(secondary)}</span>` : '');
        const idText = option.daxiangId
          ? `<span class="owner-option-id">${escapeHtml(option.daxiangId)}</span>`
          : `<span class="owner-option-id owner-option-id-empty">${state.lang === 'zh' ? '未登记编号' : 'no ID'}</span>`;
        return `<button type="button" class="owner-option${index === 0 ? ' is-active' : ''}" data-owner-option="${index}" role="option">${nameHtml}${idText}</button>`;
      }).join('');
      menu.hidden = false;
      positionMenu();
    };

    // 菜单始终完整露出：下方空间不够就向上弹；名单变长时菜单内部滚动
    const positionMenu = () => {
      menu.style.top = '';
      menu.style.bottom = '';
      menu.style.maxHeight = '';
      const clip = root.closest('.library-upload-scroll') || root.closest('.modal') || root.closest('.case-project-modal');
      const clipRect = (clip || document.documentElement).getBoundingClientRect();
      const field = root.querySelector('.owner-combobox-field');
      if (!field) return;
      const fieldRect = field.getBoundingClientRect();
      const gap = 6;
      const below = clipRect.bottom - fieldRect.bottom - gap - 8;
      const above = fieldRect.top - clipRect.top - gap - 8;
      const openUp = below < 120 && above > below;
      menu.style.maxHeight = Math.max(96, Math.min(240, openUp ? above : below)) + 'px';
      if (openUp) {
        menu.style.top = 'auto';
        menu.style.bottom = 'calc(100% + ' + gap + 'px)';
      }
    };

    const selectOption = (option) => {
      if (!option) return;
      // 优先用英文名（与候选显示一致）；没有英文名才用中文名
      input.value = option.nameEn || option.nameZh || '';
      closeMenu();
      syncContact(true);
    };

    const loadRosterOnce = () => {
      if (root.dataset.ownerRosterLoaded === 'true') return Promise.resolve();
      root.dataset.ownerRosterLoaded = 'true';
      return loadTeamMembers().catch(function() { return teamMembersCache; });
    };

    input.addEventListener('input', function() { renderMenu(); syncContact(true); });
    input.addEventListener('focus', function() {
      loadRosterOnce().then(function() { renderMenu(); syncContact(false); });
    });
    input.addEventListener('keydown', function(event) {
      // 中文输入法组合期间的回车是「确认候选」，不能截胡，否则组合文本会在值被重置后才提交，多出一个字母
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (menu.hidden) { renderMenu(); return; }
        const items = Array.from(menu.querySelectorAll('[data-owner-option]'));
        if (!items.length) return;
        event.preventDefault();
        highlight = event.key === 'ArrowDown'
          ? (highlight + 1) % items.length
          : (highlight - 1 + items.length) % items.length;
        items.forEach(function(item, index) { item.classList.toggle('is-active', index === highlight); });
      } else if (event.key === 'Enter') {
        if (!menu.hidden && highlight >= 0 && current[highlight]) {
          event.preventDefault();
          selectOption(current[highlight]);
        } else {
          closeMenu();
        }
      } else if (event.key === 'Escape') {
        closeMenu();
      }
    });
    // mousedown 早于 blur，先 preventDefault 才能点得到候选
    menu.addEventListener('mousedown', function(event) {
      const button = event.target.closest('[data-owner-option]');
      if (!button) return;
      event.preventDefault();
      selectOption(current[Number(button.dataset.ownerOption)]);
    });
    menu.addEventListener('mousemove', function(event) {
      const button = event.target.closest('[data-owner-option]');
      if (!button) return;
      highlight = Number(button.dataset.ownerOption);
      Array.from(menu.querySelectorAll('[data-owner-option]')).forEach(function(item, index) {
        item.classList.toggle('is-active', index === highlight);
      });
    });
    input.addEventListener('blur', function() { setTimeout(closeMenu, 150); });
    document.addEventListener('click', function(event) { if (!root.contains(event.target)) closeMenu(); });
    syncContact(false);
  }

  function validateGalleryUpload(files) {
    if (!files.length) throw new Error(state.lang === 'zh' ? '请选择至少一张图库图片。' : 'Choose at least one gallery image.');
    files.forEach(file => {
      if (!PREVIEW_MIME_TYPES.includes(file.type) || !IMAGE_EXTENSIONS.includes(fileExt(file.name))) {
        throw new Error(state.lang === 'zh' ? '图库仅支持 JPG / PNG / WEBP。' : 'Gallery only supports JPG / PNG / WEBP.');
      }
    });
  }

  function openLibraryEditModal(sourceId) {
    closeLibraryDetailModal();
    const source = state.librarySources.find(item => item.id === sourceId);
    if (!source) return;
    const kind = libraryKindOfSource(source);
    // 先显示弹窗才能 query DOM
    document.getElementById('library-edit-modal').hidden = false;
    const form = document.getElementById('library-edit-form');
    if (!form) return;
    form.elements.id.value = source.id;
    form.elements.library_kind.value = kind;
    document.getElementById('library-edit-kind-value').value = kind;
    form.elements.title.value = source.title || '';
    // 根据 kind 显示/隐藏国家和活动
    var countryField = document.getElementById('edit-country-field');
    var activityField = document.getElementById('edit-activity-field');
    if (countryField) countryField.style.display = (kind === 'gallery' || kind === 'source') ? '' : 'none';
    if (activityField) activityField.style.display = (kind === 'source' || kind === 'template') ? '' : 'none';
    // 填充所在库 picker 并选中当前值
    populateEditKindPicker(kind);
    // 预设 tag 值到 state，渲染 tag pickers
    var tags = visibleLibraryTags(source);
    var tagMap = {};
    tags.forEach(function(t) { tagMap[t] = true; });
    var tagKeys = ['tag1','tag2','tag3','tag4'];
    var config = LIBRARY_TAGS[kind] || {};
    tagKeys.forEach(function(key) {
      var vals = config[key];
      // tag2 可能以 tag2ByTag1 形式存在（案例库 C端 的物料类别来自物料清单）
      if (!vals && key === 'tag2' && config.tag2ByTag1) {
        vals = kind === 'source' ? sourceTag2Values('all') : [...new Set(Object.values(config.tag2ByTag1).flat())];
      }
      if (vals && Array.isArray(vals)) {
        var found = vals.find(function(v) { return tagMap[v]; });
        state.libraryFilters['upload' + key.charAt(0).toUpperCase() + key.slice(1)] = found || 'all';
      } else {
        state.libraryFilters['upload' + key.charAt(0).toUpperCase() + key.slice(1)] = 'all';
      }
    });
    document.getElementById('library-edit-tag-controls').innerHTML = renderUploadTagControls(kind);
    // 填充 country/activity picker 菜单
    populateEditMetaPickers();
    // 绑定编辑弹窗自己的 picker 事件（包括 tag controls 新生成的按钮）
    wireEditTagPickers();
    wireEditTagHover();
    // 预设 country/activity 选中值
    setTimeout(function() {
      if (source.country_id) {
        var cbtn = document.querySelector('#library-edit-modal [data-upload-tag-option="country"][data-upload-tag-value="' + source.country_id + '"]');
        if (cbtn) cbtn.click();
      }
      if (source.activity_id) {
        var abtn = document.querySelector('#library-edit-modal [data-upload-tag-option="activity"][data-upload-tag-value="' + source.activity_id + '"]');
        if (abtn) abtn.click();
      }
    }, 80);
    document.getElementById('library-edit-message').textContent = '';
  }

  function closeLibraryEditModal() {
    const modal = document.getElementById('library-edit-modal');
    if (modal) modal.hidden = true;
  }

  async function saveLibraryEdit(event) {
    event.preventDefault();
    const message = document.getElementById('library-edit-message');
    setMessage(message, state.lang === 'zh' ? '正在保存...' : 'Saving...');
    try {
      const form = new FormData(event.currentTarget);
      const id = form.get('id');
      const source = state.librarySources.find(item => item.id === id);
      const oldKind = source ? libraryKindOfSource(source) : 'source';
      const newKind = form.get('library_kind') || oldKind;
      // 从 picker hidden inputs 读取 tag 值
      const tags = preserveTemplateLanguageTags(libraryTagsForForm(form, newKind), source?.tags);
      var rawCountry = form.get('country');
      var rawActivity = form.get('activity');
      const update = {
        title: form.get('title').trim(),
        country_id: (rawCountry && rawCountry !== 'all') ? rawCountry : null,
        activity_id: (rawActivity && rawActivity !== 'all') ? rawActivity : null,
        tags: tags
      };
      const { error } = await state.supabase.from('vf_source_files').update(update).eq('id', id);
      if (error) throw error;
      notifyStaticIframe({ type: 'vf:template-tags-updated', id: id, tags: tags });
      setMessage(message, state.lang === 'zh' ? '已保存。' : 'Saved.', false, true);
      setTimeout(closeLibraryEditModal, 500);
      await reloadLibraryData();
      var editItem = state.libraryItems.find(function(li) { return li.source.id === id; });
      if (editItem) void logAssetEvent('edit', editItem);
    } catch (error) {
      setMessage(message, error.message, true);
    }
  }

  async function deleteAllLibraryData() {
    if (!state.supabase || !state.session) {
      alert(state.lang === 'zh' ? '请先登录。' : 'Please log in first.');
      return;
    }
    var totalSources = state.librarySources.length;
    var totalPreviews = state.libraryPreviews.length;
    if (totalSources === 0) {
      alert(state.lang === 'zh' ? '没有可删除的数据。' : 'No data to delete.');
      return;
    }
    var ok = window.confirm(state.lang === 'zh'
      ? '确定删除全部 ' + totalSources + ' 个素材及其 ' + totalPreviews + ' 张预览图吗？\n\n此操作不可撤销！'
      : 'Delete all ' + totalSources + ' sources and ' + totalPreviews + ' previews?\n\nThis cannot be undone!');
    if (!ok) return;
    alert(state.lang === 'zh' ? ('共 ' + totalSources + ' 个素材，开始删除...') : ('Deleting ' + totalSources + ' sources...'));
    try {
      // 按外键依赖顺序：收藏 → 预览 → 源文件 → 存储文件
      var uId = state.session.user.id;
      var step = '';
      // 1. 收藏
      step = state.lang === 'zh' ? '收藏' : 'Favorites';
      var fRes = await state.supabase.from('vf_asset_favorites').delete().eq('user_id', uId).select();
      if (fRes.error) throw new Error(step + ': ' + fRes.error.message);
      alert(step + (state.lang === 'zh' ? ' 已删 ' : ' deleted ') + (fRes.data || []).length + (state.lang === 'zh' ? ' 条' : ' rows'));
      // 2. 预览
      step = state.lang === 'zh' ? '预览' : 'Previews';
      var pvIds = state.libraryPreviews.map(function(p) { return p.id; });
      var pRes = await state.supabase.from('vf_asset_previews').delete().in('id', pvIds).select();
      if (pRes.error) throw new Error(step + ': ' + pRes.error.message);
      alert(step + (state.lang === 'zh' ? ' 已删 ' : ' deleted ') + (pRes.data || []).length + '/' + pvIds.length + (state.lang === 'zh' ? ' 条' : ' rows'));
      // 3. 源文件
      step = state.lang === 'zh' ? '源文件' : 'Sources';
      var srcIds = state.librarySources.map(function(s) { return s.id; });
      var sRes = await state.supabase.from('vf_source_files').delete().in('id', srcIds).select();
      if (sRes.error) throw new Error(step + ': ' + sRes.error.message);
      alert(step + (state.lang === 'zh' ? ' 已删 ' : ' deleted ') + (sRes.data || []).length + '/' + srcIds.length + (state.lang === 'zh' ? ' 条' : ' rows'));
      // 4. 存储文件（按目录清空，派生文件一并带走）
      step = state.lang === 'zh' ? '存储' : 'Storage';
      var folders = [];
      state.librarySources.forEach(function(s) {
        if (s.source_path) folders.push(s.source_path.replace(/\/[^/]+$/, ''));
      });
      state.libraryPreviews.forEach(function(p) {
        if (p.preview_path) folders.push(p.preview_path.replace(/\/[^/]+$/, ''));
      });
      var uniqueFolders = Array.from(new Set(folders)).filter(Boolean);
      var removedFiles = 0;
      try {
        for (const folder of uniqueFolders) removedFiles += await removeStorageFolder(folder);
        alert(step + (state.lang === 'zh' ? ' 已删 ' : ' deleted ') + removedFiles + (state.lang === 'zh' ? ' 个文件（' : ' files (') + uniqueFolders.length + (state.lang === 'zh' ? ' 个目录）' : ' folders)'));
      } catch (folderError) {
        alert(step + (state.lang === 'zh' ? ' 警告: ' : ' warning: ') + (folderError.message || folderError));
      }
      alert(state.lang === 'zh' ? '完成！刷新页面看看。' : 'Done! Refresh the page to see the changes.');
      state.libraryDataLoaded = false;
      state.libraryPreviewUrls = {};
      state.libraryPreviewUrlSignedAt = {};
      state.librarySources = [];
      state.libraryPreviews = [];
      window.location.reload();
    } catch (error) {
      alert(state.lang === 'zh' ? ('删除失败 [' + (step || '?') + ']: ' + (error.message || error)) : ('Delete failed [' + (step || '?') + ']: ' + (error.message || error)));
    }
  }
  window.deleteAllLibraryData = deleteAllLibraryData;

  // 按目录清空存储：缩略图（_thumb-<previewId>.jpg）、GIF 小动图（_small-…）、
  // 视频产物（_small-*.mp4 / _poster-*.jpg）都躺在原图旁边，逐个删已知路径永远会漏
  async function removeStorageFolder(folderPath) {
    const bucket = state.supabase.storage.from(LIBRARY_BUCKET);
    let removed = 0;
    for (;;) {
      const listing = await bucket.list(folderPath, { limit: 100 });
      if (listing.error) throw listing.error;
      const entries = listing.data || [];
      // list 里 id 为 null 的是子目录，其余是文件
      const files = entries.filter(entry => entry && entry.id && entry.name);
      if (files.length) {
        const remove = await bucket.remove(files.map(entry => folderPath + '/' + entry.name));
        if (remove.error) throw remove.error;
        removed += files.length;
      }
      const subfolders = entries.filter(entry => entry && !entry.id && entry.name);
      for (const sub of subfolders) removed += await removeStorageFolder(folderPath + '/' + sub.name);
      if (!files.length) break;
    }
    return removed;
  }

  async function deleteLibrarySource(sourceId) {
    const source = state.librarySources.find(item => item.id === sourceId);
    if (!source) return;
    const relatedPreviews = state.libraryPreviews.filter(item => item.source_file_id === sourceId);
    const ok = window.confirm(state.lang === 'zh'
      ? `确定删除「${source.title}」吗？源文件和 ${relatedPreviews.length} 张预览图会一起删除。`
      : `Delete "${source.title}" and ${relatedPreviews.length} previews?`);
    if (!ok) return;
    const paths = [source.source_path, ...relatedPreviews.map(item => item.preview_path)].filter(Boolean);
    const folders = Array.from(new Set(paths.map(path => String(path).replace(/\/[^/]+$/, ''))));
    try {
      for (const folder of folders) await removeStorageFolder(folder);
    } catch (error) {
      alert(error.message || String(error));
      return;
    }
    const { error } = await state.supabase.from('vf_source_files').delete().eq('id', sourceId);
    if (error) {
      alert(error.message);
      return;
    }
    await reloadLibraryData();
    // 通知静态DIY iframe 同步删除
    notifyStaticIframe({ type: 'vf:template-deleted', sourceId: sourceId });
    void logAssetEvent('delete', { source: source, preview: relatedPreviews[0] || null });
  }

  function notifyStaticIframe(msg) {
    try {
      var frame = state.toolFrames['static'];
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(msg, location.origin);
      }
    } catch(e) {}
  }

  async function toggleLibraryFavorite(item) {
    const uid = state.session.user.id;
    const pid = item.preview.id;
    if (state.libraryFavorites.has(pid)) {
      const { error } = await state.supabase.from('vf_asset_favorites').delete().eq('user_id', uid).eq('preview_id', pid);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await state.supabase.from('vf_asset_favorites').upsert([{ user_id: uid, preview_id: pid }], { onConflict: 'user_id,preview_id' });
      if (error) { alert(error.message); return; }
      void logAssetEvent('favorite', item);
    }
    await loadLibraryFavorites();
    renderLibraryGrid();
  }

  async function downloadLibraryFile(item, kind) {
    if (kind === 'source' && !canDownloadSource()) return;
    if (kind === 'source' && isFontLibraryItem(item)) {
      return downloadFontLibraryFile(item);
    }
    var filename = kind === 'source' ? item.source.source_filename : item.preview.preview_filename || 'preview.svg';
    // 即时反馈：轻 toast
    showDownloadToast(filename);
    if (state.localPreview) {
      var recoveredUrl = kind === 'source' ? item.source.source_public_url : item.url;
      if (!recoveredUrl) {
        alert(state.lang === 'zh' ? '这个恢复记录缺少对应文件，暂时不能下载。' : 'This recovered record is missing its file.');
        return;
      }
      var blob = await fetch(new URL(recoveredUrl, location.href).toString()).then(function(r) { return r.blob(); });
      triggerBlobDownload(blob, filename);
      return;
    }
    // 优先走已缓存的签名 URL（预览图直接秒下）
    if (kind !== 'source' && item.url) {
      try {
        var directBlob = await fetch(item.url).then(function(r) {
          if (!r.ok) throw new Error('expired');
          return r.blob();
        });
        triggerBlobDownload(directBlob, filename);
        await logAssetEvent('download_preview', item);
        return;
      } catch(e) { /* 签名过期，走 Supabase SDK 兜底 */ }
    }
    // Supabase SDK 兜底
    var path = kind === 'source' ? item.source.source_path : item.preview.preview_path;
    var { data, error } = await state.supabase.storage.from(LIBRARY_BUCKET).download(path);
    if (error) { alert(error.message); return; }
    triggerBlobDownload(data, filename);
    await logAssetEvent(kind === 'source' ? 'download_source' : 'download_preview', item);
  }

  async function downloadFontLibraryFile(item) {
    try {
      var source = item.source;
      var jsonBlob;
      if (state.localPreview) {
        var recoveredUrl = source.source_public_url;
        if (!recoveredUrl) throw new Error(state.lang === 'zh' ? '该字体记录缺少原始数据。' : 'This font record has no source data.');
        var response = await fetch(new URL(recoveredUrl, location.href).toString());
        if (!response.ok) throw new Error('Font source request failed: ' + response.status);
        jsonBlob = await response.blob();
      } else {
        var result = await state.supabase.storage.from(LIBRARY_BUCKET).download(source.source_path);
        if (result.error) throw result.error;
        jsonBlob = result.data;
      }
      var fontPayload = JSON.parse(await jsonBlob.text());
      if (!fontPayload.data || !String(fontPayload.data).startsWith('data:')) {
        throw new Error(state.lang === 'zh' ? '字体文件数据不完整。' : 'The stored font data is incomplete.');
      }
      var filename = fontPayload.fileName || (fontPayload.name || source.title || 'font') + '.ttf';
      // 旧记录可能没有 fileName；避免仍以 JSON 扩展名下载。
      if (/\.json$/i.test(filename)) filename = filename.replace(/\.json$/i, '.ttf');
      showDownloadToast(filename);
      triggerBlobDownload(dataUrlToBlob(fontPayload.data), filename);
      await logAssetEvent('download_source', item, { asset_type: 'font' });
    } catch (error) {
      console.warn('Font download failed:', error);
      alert(state.lang === 'zh'
        ? '字体下载失败：' + (error.message || '无法读取字体文件')
        : 'Font download failed: ' + (error.message || 'Unable to read the font file.'));
    }
  }

  function showDownloadToast(filename) {
    var toast = document.getElementById('download-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'download-toast';
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;padding:8px 18px;border-radius:10px;font-size:13px;pointer-events:none;opacity:0;transition:opacity 0.2s ease;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
      document.body.appendChild(toast);
    }
    toast.textContent = (state.lang === 'zh' ? '下载中: ' : 'Downloading: ') + filename;
    toast.style.opacity = '1';
    toast.style.transition = 'none';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() { toast.style.transition = 'opacity 0.4s ease'; toast.style.opacity = '0'; }, 2000);
  }

  async function useLibraryAsset(item, tool) {
    const kind = libraryKindOfSource(item.source);
    if (kind === 'source') {
      alert(state.lang === 'zh' ? '案例库素材用于下载归档，暂不直接带入编辑器。' : 'Case library assets are for download/archive and cannot be imported directly yet.');
      return;
    }
    if (kind === 'template') {
      return openLibraryTemplate(item);
    }
    if (!item.url) {
      await signLibraryPreviewUrls([item.preview.preview_path]);
      item.url = state.libraryPreviewUrls[item.preview.preview_path] || '';
    }
    if (!item.url) {
      alert(state.lang === 'zh' ? '预览图链接还没准备好，请稍后再试。' : 'The preview link is not ready. Try again shortly.');
      return;
    }
    const target = tool === 'dynamic' ? 'dynamic' : 'static';
    localStorage.setItem('vf_pending_library_asset', JSON.stringify({
      targetTool: target,
      previewId: item.preview.id,
      sourceFileId: item.source.id,
      title: item.source.title,
      filename: item.preview.preview_filename,
      url: item.url,
      storedAt: new Date().toISOString()
    }));
    await logAssetEvent(target === 'dynamic' ? 'use_dynamic' : 'use_static', item);
    location.hash = target;
    navigate(target);
  }

  var templateOpenGeneration = 0;
  function reportTemplateOpenState(phase, message) {
    const frame = state.toolFrames.static;
    try { frame?.contentWindow?.VF_TEMPLATE_IMPORT_STATUS?.(phase, message); } catch (_) {}
  }
  async function openLibraryTemplate(item) {
    if (state.localPreview || !state.supabase) {
      alert(state.lang === 'zh' ? '本地预览不能打开云端模板。' : 'Local preview cannot open cloud templates.');
      return;
    }
    const openGeneration = ++templateOpenGeneration;
    const openUser = state.session?.user?.id;
    reportTemplateOpenState('loading', state.lang === 'zh' ? '正在读取模板…' : 'Loading template…');
    try {
      const snapshot = await loadLibraryTemplateSnapshot(item);
      if (openGeneration !== templateOpenGeneration || openUser !== state.session?.user?.id) return;
      // 从 DIY 内的模板组切换模板时，当前 iframe 已经可用。再次 navigate('static')
      // 会先把 iframe 移入隐藏缓存再重新挂载，期间只剩整页空白。
      if (state.route !== 'static' || !state.activeFrame || state.activeFrame !== state.toolFrames.static) {
        location.hash = 'static';
        navigate('static');
      }
      if (snapshot.schema === 'vf-project-snapshot/v1') {
        validateProjectSnapshot(snapshot, 'static');
        await waitForToolImporter();
        if (openGeneration !== templateOpenGeneration || openUser !== state.session?.user?.id) return;
        const result = await state.activeFrame.contentWindow.VF_IMPORT_PROJECT(snapshot);
        if (!result?.success) throw new Error(result?.message || (state.lang === 'zh' ? '模板打开失败。' : 'Failed to open template.'));
      } else {
        // 版式/套组/标签组/Logo → 发送数据到 iframe 应用
        await waitForToolImporter();
        if (openGeneration !== templateOpenGeneration || openUser !== state.session?.user?.id) return;
        notifyStaticIframe({ type: 'vf:apply-template', data: snapshot, sourceId: item.source.id });
      }
      await logAssetEvent('use_static', item);
    } catch (error) {
      if (openGeneration !== templateOpenGeneration || openUser !== state.session?.user?.id) return;
      if (error.name === 'AbortError') return;
      reportTemplateOpenState('error', error.message || (state.lang === 'zh' ? '模板加载失败，请重试' : 'Template failed to load. Please retry.'));
      alert(error.message);
    }
  }

  var _templateSnapshotCache = {};
  var _templatePreviewBlobUrls = {};
  var _templatePreviewBlobs = {};
  var _templateSnapshotPromises = {};
  var _templateSnapshotDownloads = {};
  var _templateSnapshotRecency = [];
  var _templateSnapshotBytes = {};
  function rememberTemplateSnapshot(path, snapshot, size) {
    _templateSnapshotCache[path] = snapshot;
    _templateSnapshotBytes[path] = Number(size) || JSON.stringify(snapshot).length;
    _templateSnapshotRecency = _templateSnapshotRecency.filter(function(key) { return key !== path; });
    _templateSnapshotRecency.push(path);
    let bytes = _templateSnapshotRecency.reduce(function(total, key) { return total + (_templateSnapshotBytes[key] || 0); }, 0);
    while (_templateSnapshotRecency.length > 8 || bytes > 64 * 1024 * 1024) {
      const oldest = _templateSnapshotRecency.shift();
      if (!oldest) break;
      bytes -= _templateSnapshotBytes[oldest] || 0;
      delete _templateSnapshotBytes[oldest]; delete _templateSnapshotCache[oldest];
    }
  }
  var _templateSourceCache;
  function templateCacheScope() {
    if (window.VFAccountAccess?.enabled && !window.VFAccountAccess.can('static') && !window.VFAccountAccess.can('library')) return '';
    return state.session?.user?.id || '';
  }
  function templateSourceUrl(source) {
    return String(config.supabaseUrl).replace(/\/$/, '') + '/storage/v1/object/authenticated/' + LIBRARY_BUCKET + '/' + source.source_path.split('/').map(encodeURIComponent).join('/');
  }
  function getTemplateSourceCache() {
    if (!_templateSourceCache) _templateSourceCache = window.VFTemplateSourceCache.create({
      scope: templateCacheScope,
      download: async function(source, options) {
        // The existing authenticated fetch wrapper preserves product permissions.
        const response = await fetch(templateSourceUrl(source), {
          headers: { apikey: config.supabaseAnonKey, Authorization: 'Bearer ' + (state.session?.access_token || '') },
          signal: AbortSignal.any([options.signal, AbortSignal.timeout(90000)])
        });
        if (!response.ok) throw new Error(state.lang === 'zh' ? ('模板读取失败（' + response.status + '），请重试') : ('Failed to read template (HTTP ' + response.status + '). Please retry.'));
        return response.blob();
      },
      onProgress: function(progress) {
        notifyStaticIframe({ type: 'vf:template-cache-progress', ...progress });
      }
    });
    return _templateSourceCache;
  }
  async function invalidateSavedTemplate(path) {
    await getTemplateSourceCache().invalidate({ source_path: path });
    for (const key of Object.keys(_templateSnapshotCache)) {
      if (JSON.parse(key)[1] === path) { delete _templateSnapshotCache[key]; delete _templateSnapshotBytes[key]; }
    }
    _templateSnapshotRecency = _templateSnapshotRecency.filter(function(key) { return !!_templateSnapshotCache[key]; });
    _templateMetadataCache = {};
  }
  async function loadLibraryTemplateSnapshot(item) {
    const source = item.source, cache = getTemplateSourceCache(), key = cache.key(source);
    const scope = templateCacheScope();
    if (!scope) throw new Error(state.lang === 'zh' ? '请先登录有模板权限的账号' : 'Sign in with an account that has template access.');
    if (_templateSnapshotCache[key]) {
      _templateSnapshotRecency = _templateSnapshotRecency.filter(function(id) { return id !== key; });
      _templateSnapshotRecency.push(key);
      return _templateSnapshotCache[key];
    }
    // Even if JSON decoding is shared, promote this request above background work.
    const blobPromise = cache.get(source);
    if (_templateSnapshotPromises[key] && _templateSnapshotDownloads[key] === blobPromise) return _templateSnapshotPromises[key];
    _templateSnapshotDownloads[key] = blobPromise;
    const request = (async function() {
      const blob = await blobPromise;
      const json = JSON.parse(await blob.text());
      if (scope !== templateCacheScope()) throw Object.assign(new Error(state.lang === 'zh' ? '账号已切换' : 'Account switched'), { name: 'AbortError' });
      rememberTemplateSnapshot(key, json, blob.size);
      return json;
    })();
    _templateSnapshotPromises[key] = request;
    try { return await request; }
    finally { if (_templateSnapshotPromises[key] === request) { delete _templateSnapshotPromises[key]; delete _templateSnapshotDownloads[key]; } }
  }

  async function logAssetEvent(eventType, item, extraMeta) {
    if (state.localPreview || !state.supabase) return;
    try {
      var row = {
        actor_id: state.session.user.id,
        actor_role: displayRole(),
        event_type: eventType,
        meta: { account_label: window.VFAccountAccess?.snapshot?.()?.displayName || state.profile?.display_name || '' }
      };
      if (item && item.source) {
        row.source_file_id = item.source.id;
        row.preview_id = item.preview ? item.preview.id : null;
        row.meta.title = item.source.title;
        row.meta.filename = eventType === 'download_source'
          ? item.source.source_filename
          : (item.preview ? item.preview.preview_filename : (item.source.source_filename || ''));
      }
      if (extraMeta) Object.assign(row.meta, extraMeta);
      var insertResult = await state.supabase.from('vf_asset_events').insert([row]);
      if (insertResult.error) console.warn('Event insert error:', insertResult.error.message);
    } catch (error) {
      console.warn('Asset event log failed:', error);
    }
  }

  function libraryOptions(type) {
    if (type !== 'activity') return state.libraryOptions.filter(item => item.option_type === type);
    // 活动词表分两类存放：旧的三项留在 activity，案例库的值在 case_activity；
    // 合并后按 sort_order 排序，调用方仍然当一份清单用。
    return state.libraryOptions
      .filter(item => item.option_type === 'activity' || item.option_type === CASE_ACTIVITY_OPTION_TYPE)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  function libraryKindOfSource(source) {
    const tags = source?.tags || [];
    if (tags.includes(LIBRARY_KIND_MARKERS.gallery)) return 'gallery';
    if (tags.includes(LIBRARY_KIND_MARKERS.template)) return 'template';
    if (tags.includes(LIBRARY_KIND_MARKERS.source)) return 'source';
    const ext = fileExt(source?.source_filename || source?.source_ext || '');
    if (IMAGE_EXTENSIONS.includes(ext)) return 'gallery';
    if (TEMPLATE_EXTENSIONS.includes(ext)) return 'template';
    return 'source';
  }

  function isBookmarkSource(source) {
    return (source?.tags || []).includes('模板书签');
  }

  function libraryKindLabel(kind) {
    const item = LIBRARY_KIND_TABS.find(tab => tab.id === kind);
    return item ? (state.lang === 'zh' ? item.zh : item.en) : kind;
  }

  function visibleLibraryTags(source) {
    return (source?.tags || [])
      .filter(tag => !String(tag).startsWith('vf:'))
      .filter(Boolean);
  }

  function selectedLibraryTagValues() {
    return ['tag1', 'tag2', 'tag3', 'tag4']
      .map(key => state.libraryFilters[key])
      .filter(value => value && value !== 'all');
  }

  function librarySourceMatchesSelectedTags(source) {
    const selectedTags = selectedLibraryTagValues();
    if (!selectedTags.length) return true;
    if (isCaseProject(source)) {
      return selectedTags.every(tag => {
        if (caseMaterialTypeSet(tag)) return projectMatchesType(source, tag);
        return visibleLibraryTags(source).includes(tag);
      });
    }
    if (selectedTags.every(tag => visibleLibraryTags(source).includes(tag))) return true;
    if (!isBookmarkSource(source)) return false;

    const group = state.libraryBookmarkGroups.find(item => item.source.id === source.id);
    if (!group) return false;
    const sourcesById = new Map(state.librarySources.map(item => [item.id, item]));
    return group.refs.some(ref => {
      const memberId = typeof ref === 'string' ? ref : ref?.templateId;
      const member = sourcesById.get(memberId);
      return member && selectedTags.every(tag => visibleLibraryTags(member).includes(tag));
    });
  }

  function countLibraryKinds() {
    return visibleLibrarySourcesForSession().reduce((counts, source) => {
      const kind = libraryKindOfSource(source);
      counts[kind] = (counts[kind] || 0) + 1;
      return counts;
    }, { gallery: 0, source: 0, template: 0 });
  }

  
  async function uploadTemplateAsset(formData) {
    const templateFile = formData.get('template_file');
    if (!templateFile || !templateFile.size) throw new Error(state.lang === 'zh' ? '请选择模板文件。' : 'Choose a template file.');
    const title = formData.get('title').trim();
    const sourceId = crypto.randomUUID();
    const userId = state.session.user.id;
    const isImage = templateFile.type.startsWith('image/');
    const ext = (templateFile.name.split('.').pop() || 'json').toLowerCase();
    const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(templateFile.name)}`;
    const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, templateFile, { upsert: false, contentType: templateFile.type || 'application/octet-stream' });
    if (upload.error) throw upload.error;
    const tags = libraryTagsForForm(formData, 'template');
    tags.push('vf:kind:template');
    const { error } = await state.supabase.from('vf_source_files').insert([{
      id: sourceId, title, tags,
      source_path: sourcePath, source_filename: templateFile.name, source_mime_type: templateFile.type || 'application/octet-stream',
      source_size_bytes: templateFile.size, source_ext: isImage ? ext : 'json', uploaded_by: userId,
      visibility: formData.get('visibility') || 'all'
    }]);
    if (error) throw error;
    // 图片模板：生成缩略图并创建预览记录
    if (isImage) {
      var thumbBlob = null;
      try {
        thumbBlob = await generateThumbnail(templateFile, 400);
      } catch (e) { console.warn('Thumbnail generation failed:', e); }
      var dimensions = { width: 0, height: 0 };
      try { dimensions = await readImageDimensions(templateFile); } catch (e) {}
      var previewPath = '';
      if (thumbBlob) {
        previewPath = `${userId}/sources/${sourceId}/_thumb.jpg`;
        var thumbUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, thumbBlob, { upsert: true, contentType: 'image/jpeg' });
        if (thumbUpload.error) { console.warn('Thumbnail upload failed:', thumbUpload.error); previewPath = ''; }
      }
      var previewId = crypto.randomUUID();
      var { error: previewError } = await state.supabase.from('vf_asset_previews').insert([{
        id: previewId, source_file_id: sourceId,
        preview_path: previewPath || sourcePath,
        preview_filename: templateFile.name,
        preview_mime_type: thumbBlob ? 'image/jpeg' : templateFile.type,
        preview_size_bytes: thumbBlob ? thumbBlob.size : templateFile.size,
        width: dimensions.width || 0, height: dimensions.height || 0,
        sort_order: 10
      }]);
      if (previewError) console.warn('Preview insert failed:', previewError);
    }
    void logAssetEvent('upload', { source: { id: sourceId, title: title, source_filename: templateFile.name } });
  }

function libraryTagsForForm(formData, kind) {
    const tags = [];
    ['tag1', 'tag2', 'tag3', 'tag4'].forEach(key => {
      const raw = String(formData.get(key) || '').trim();
      if (raw && raw !== 'all') {
        raw.split(',').forEach(v => { const t = v.trim(); if (t) tags.push(t); });
      }
    });
    return normalizeLibraryTags(kind, tags);
  }

  function preserveTemplateLanguageTags(tags, existingTags) {
    const next = (Array.isArray(tags) ? tags : []).filter(function(tag) { return tag !== 'vf:lang:EN' && tag !== 'vf:lang:AR'; });
    (Array.isArray(existingTags) ? existingTags : []).forEach(function(tag) {
      // 仅保留移动分组的类型锁定标记；模板不再保存语言标签。
      if (String(tag).startsWith('vf:type:') && !next.includes(tag)) next.push(tag);
    });
    return next;
  }

  function normalizeLibraryTags(kind, tags, limit = 18) {
    const marker = LIBRARY_KIND_MARKERS[kind] || LIBRARY_KIND_MARKERS.source;
    const cleaned = tags
      .map(tag => String(tag || '').trim())
      .filter(Boolean)
      .filter(tag => !String(tag).startsWith('vf:'));
    return [marker, ...Array.from(new Set(cleaned))].slice(0, limit);
  }

  function optionName(option) {
    if (!option) return '-';
    return state.lang === 'zh' ? (option.name_zh || option.name_en) : option.name_en;
  }

  function libraryDisplayLabel(value) {
    const label = String(value || '');
    return state.lang === 'zh' ? label : (LIBRARY_LABELS_EN[label] || label);
  }

  function optionNameById(id) {
    return optionName(state.libraryOptions.find(item => item.id === id));
  }

  function libCountryLabel(source) {
    return optionNameById(source.country_id);
  }

  function libActivityLabel(source) {
    return optionNameById(source.activity_id);
  }

  function libraryItemByPreviewId(id) {
    return state.libraryItems.find(item => item.preview.id === id);
  }

  function hasUploadPermission() {
    const features = window.VFAccountAccess?.snapshot?.()?.features;
    return Array.isArray(features) && features.includes('upload');
  }

  function canUploadAssets() {
    return !state.localPreview && !!state.session && (state.interfaceMode === 'developer' || hasUploadPermission());
  }

  function canDownloadSource() {
    return !!state.session;
  }

  function canManageSource(_source) {
    return !state.localPreview && !!state.session;
  }

  function parseTags(value) {
    return String(value || '')
      .split(/[,，\n]/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function fileExt(name) {
    const clean = String(name || '').split('?')[0];
    return clean.includes('.') ? clean.split('.').pop().toLowerCase() : '';
  }

  function stripExtension(name) {
    return String(name || '').replace(/\.[^/.]+$/, '');
  }

  function safeStorageName(name) {
    const ext = fileExt(name);
    const base = stripExtension(name)
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'file';
    return `${base}-${Date.now()}${ext ? `.${ext}` : ''}`;
  }

  function readImageDimensions(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: null, height: null });
      };
      img.src = url;
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, body] = String(dataUrl || '').split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    var bytes;
    if (header.includes(';base64')) {
      const binary = atob(body || '');
      bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    } else {
      // URI 编码的数据 URL（如 SVG），用 TextEncoder
      const decoded = decodeURIComponent(body || '');
      bytes = new TextEncoder().encode(decoded);
    }
    return new Blob([bytes], { type: mime });
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toolFrameDefinition(type) {
    const legacyRole = currentRole() === 'operator' ? 'viewer' : currentRole();
    const map = {
      library: {
        src: `./tools/library/index.html?embedded=1&role=${encodeURIComponent(legacyRole)}&mode=${encodeURIComponent(state.interfaceMode)}&v=${TOOL_UI_VERSION}`
      },
      static: {
        src: `./tools/static/frontend.html?embedded=1&mode=${encodeURIComponent(state.interfaceMode)}&lang=${encodeURIComponent(state.lang)}&v=${TOOL_UI_VERSION}`
      },
      icons: {
        src: `./tools/icons/index.html?embedded=1&mode=${encodeURIComponent(state.interfaceMode)}&lang=${encodeURIComponent(state.lang)}&v=${TOOL_UI_VERSION}`
      },
      dynamic: {
        src: `./tools/dynamic/animator.html?embedded=1&mode=${encodeURIComponent(state.interfaceMode)}&v=${TOOL_UI_VERSION}`
      }
    };
    return map[type];
  }

  function createToolFrame(type) {
    const item = toolFrameDefinition(type);
    const frame = document.createElement('iframe');
    frame.id = `tool-frame-${type}`;
    frame.className = 'tool-frame';
    frame.src = item.src;
    frame.title = type === 'icons' ? t('iconStudio') : type;
    if (type === 'static') {
      frame.allow = 'display-capture';
      frame.dataset.staticAssetsReady = '0';
      frame.dataset.staticCatalogReady = '0';
      frame.dataset.staticCatalogSyncedAt = '0';
      frame.dataset.staticVisibleReady = '0';
      frame.dataset.staticVisibleGeneration = '0';
    }
    frame.dataset.toolFrame = type;
    state.toolFrames[type] = frame;
    frame.addEventListener('load', function() {
      if (type === 'static') {
        frame.dataset.staticAssetsReady = '0';
        frame.dataset.staticCatalogReady = '0';
        frame.dataset.staticCatalogSyncedAt = '0';
      }
      broadcastInterfaceMode(frame);
      broadcastUiLanguage(frame);
      if (type === 'static' && state.route === 'static' && state.activeFrame === frame) {
        notifyToolHostVisible(frame);
      }
    });
    return frame;
  }

  function notifyToolHostVisible(frame) {
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({
        type: 'vf:host-visible',
        generation: Number(frame.dataset.staticVisibleGeneration || 0)
      }, location.origin);
    } catch (_error) {}
  }

  function finishStaticToolLoadingWhenReady(frame) {
    if (!frame || state.route !== 'static' || state.activeFrame !== frame) return;
    if (frame.dataset.staticCatalogReady !== '1' || frame.dataset.staticVisibleReady !== '1') return;
    setStaticToolLoading(frame, false);
  }

  function setStaticToolLoading(frame, loading) {
    if (!frame) return;
    const mount = frame.parentElement && frame.parentElement.classList.contains('tool-frame-mount')
      ? frame.parentElement
      : null;
    frame.classList.toggle('is-entry-loading', !!loading);
    if (!mount) return;
    const indicator = mount.querySelector('.tool-entry-loading');
    if (indicator) indicator.hidden = !loading;
    if (frame._vfEntryLoadingTimer) {
      clearTimeout(frame._vfEntryLoadingTimer);
      frame._vfEntryLoadingTimer = 0;
    }
    // 即使云端目录异常，也不能让加载层永久挡住本地画板。
    if (loading) {
      frame._vfEntryLoadingTimer = setTimeout(function() {
        frame._vfEntryLoadingTimer = 0;
        if (state.route === 'static' && state.activeFrame === frame) setStaticToolLoading(frame, false);
      }, 15000);
    }
  }

  function scheduleStaticToolPrewarm() {
    if (window.VFAccountAccess?.enabled && !window.VFAccountAccess.can('static')) return;
    if (state.route === 'static' || state.toolFrames.static) return;
    const prewarm = function() {
      if (window.VFAccountAccess?.enabled && !window.VFAccountAccess.can('static')) return;
      if (els.appShell.hidden || state.route === 'static' || state.toolFrames.static) return;
      const frame = createToolFrame('static');
      frame.dataset.prewarming = '1';
      ensureToolFrameMount('static').appendChild(frame);
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(prewarm, { timeout: 600 });
    } else {
      setTimeout(prewarm, 250);
    }
  }

  function renderTool(type) {
    const cache = toolFrameCache();
    els.content.hidden = true;
    cache.hidden = false;
    cache.querySelectorAll('[data-tool-mount]').forEach(item => { item.hidden = true; });
    const mount = ensureToolFrameMount(type);
    mount.hidden = false;
    let frame = state.toolFrames[type];
    if (!frame) frame = createToolFrame(type);
    if (type === 'static') {
      frame.dataset.prewarming = '0';
      frame.dataset.staticVisibleReady = '0';
      frame.dataset.staticVisibleGeneration = String(Number(frame.dataset.staticVisibleGeneration || 0) + 1);
    }
    // Keep each iframe under one permanent mount for its whole lifetime. Moving
    // an iframe between DOM parents reloads its browsing context in Chromium,
    // which caused every Library -> DIY return to show the full white startup.
    if (frame.parentElement !== mount) mount.appendChild(frame);
    state.activeFrame = frame;
    // 缓存 iframe 从隐藏状态恢复后仍需重新完成一轮可见布局；目录曾经加载过
    // 不能代表本次已经可以绘制。等 iframe 回传 visible-ready 后再撤掉遮罩。
    if (type === 'static') setStaticToolLoading(frame, true);
    setTimeout(function() {
      broadcastInterfaceMode(frame);
      broadcastUiLanguage(frame);
      if (type === 'static' && state.route === 'static' && state.activeFrame === frame) {
        notifyToolHostVisible(frame);
      }
    }, 0);
    // 静态 DIY iframe 和已经完成的云端目录都会保留在内存中。短时间内切换模板
    // 不再重复拉取整套目录；超过一分钟后再次进入才做一次后台校准。
    if (type === 'static') {
      const syncStaticAssets = function() {
        queueStaticTemplateFetch(frame.contentWindow);
      };
      if (frame.dataset.staticAssetsReady === '1') {
        const syncedAt = Number(frame.dataset.staticCatalogSyncedAt || 0);
        const catalogStale = !syncedAt || Date.now() - syncedAt > 60000;
        if (frame.dataset.staticCatalogReady !== '1' || catalogStale) setTimeout(syncStaticAssets, 0);
      } else {
        frame.addEventListener('load', function() {
          frame.dataset.staticAssetsReady = '0';
          // 正常情况由 iframe 的 vf:static-ready 握手触发；兜底计时防止旧缓存
          // 或脚本异常让资产同步永久停住。
          setTimeout(function() {
            if (frame.dataset.staticAssetsReady !== '1' && state.route === 'static') syncStaticAssets();
          }, 1800);
        }, { once: true });
      }
    }
  }

  async function renderProjects() {
    parkActiveToolFrame();
    els.content.innerHTML = `
      <div class="panel-page">
        <div class="panel card">
          <h3>${t('projects')}</h3>
          <p>${state.lang === 'zh' ? '个人项目保存在 Supabase 云端。管理员可通过数据库查看全部项目。' : 'Personal projects are saved to Supabase cloud. Admins can inspect all projects from the database.'}</p>
        </div>
        <section class="panel">
          <table class="table">
            <thead><tr><th>${t('projectName')}</th><th>Type</th><th>Updated</th><th>Status</th></tr></thead>
            <tbody id="projects-table"><tr><td colspan="4">${state.lang === 'zh' ? '正在读取...' : 'Loading...'}</td></tr></tbody>
          </table>
        </section>
      </div>
    `;
    await loadProjects();
  }

  async function renderStatus() {
    parkActiveToolFrame();
    els.content.innerHTML = `
      <div class="panel-page">
        <section class="panel card">
          <h3>${t('systemCheck')}</h3>
          <p>${state.lang === 'zh' ? '这个页面会把上线前的关键状态翻译成能直接判断的结果。绿色代表可以继续，红色代表需要我补配置或处理。' : 'This page translates launch readiness into direct checks. Green means ready; red means I need to finish setup.'}</p>
        </section>
        <section class="panel">
          <table class="table">
            <thead><tr><th>${t('checkItem')}</th><th>${t('checkResult')}</th><th>${t('checkDetail')}</th></tr></thead>
            <tbody id="status-table"><tr><td colspan="3">${state.lang === 'zh' ? '正在检查...' : 'Checking...'}</td></tr></tbody>
          </table>
        </section>
      </div>
    `;
    const checks = await runSystemChecks();
    const table = document.getElementById('status-table');
    table.innerHTML = checks.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td><span class="badge ${item.ok ? 'ok' : item.local ? 'warn' : 'bad'}">${item.local ? t('localOnly') : item.ok ? t('ready') : t('notReady')}</span></td>
        <td>${escapeHtml(item.detail)}</td>
      </tr>
    `).join('');
  }

  async function runSystemChecks() {
    const checks = [];
    checks.push({
      name: state.lang === 'zh' ? 'Supabase 前端配置' : 'Supabase frontend config',
      ok: !!(config.supabaseUrl && config.supabaseAnonKey && state.supabase),
      detail: config.supabaseUrl ? config.supabaseUrl : (state.lang === 'zh' ? '缺少 Supabase 地址或公开 key。' : 'Missing Supabase URL or anon key.')
    });
    checks.push({
      name: state.lang === 'zh' ? '当前登录状态' : 'Current login',
      ok: !!state.session,
      local: state.localPreview,
      detail: state.localPreview
        ? (state.lang === 'zh' ? '当前是本地预览角色，适合检查界面。' : 'Using local preview role for UI checks.')
        : (state.profile ? `${state.profile.display_name || state.profile.email} · ${roleLabel(state.profile.role)}` : (state.lang === 'zh' ? '尚未登录。' : 'Not signed in.'))
    });

    if (state.localPreview || !state.supabase) {
      checks.push({
        name: state.lang === 'zh' ? '云端数据库表' : 'Cloud database tables',
        ok: false,
        local: true,
        detail: state.lang === 'zh' ? '本地预览不检查云端表。真实登录后会自动检查。' : 'Local preview does not check cloud tables.'
      });
    } else {
      checks.push(await checkTable('vf_profiles', state.lang === 'zh' ? '账号资料表' : 'Profiles table'));
      checks.push(await checkTable('vf_categories', state.lang === 'zh' ? '分类权限表' : 'Categories table'));
      checks.push(await checkTable('vf_projects', state.lang === 'zh' ? '项目保存表' : 'Projects table'));
      checks.push(await checkTable('vf_library_options', state.lang === 'zh' ? 'V2 素材分类选项' : 'V2 library options'));
      checks.push(await checkTable('vf_source_files', state.lang === 'zh' ? 'V2 源文件表' : 'V2 source files'));
      checks.push(await checkTable('vf_asset_previews', state.lang === 'zh' ? 'V2 预览图表' : 'V2 previews'));
      checks.push(await checkTable('vf_asset_events', state.lang === 'zh' ? 'V2 下载/使用日志' : 'V2 events'));
    }

    checks.push(await checkApiHealth());
    checks.push(await checkLegacyTool('tools/library/index.html', state.lang === 'zh' ? '素材库入口' : 'Library entry'));
    checks.push(await checkLegacyTool('tools/static/frontend.html', state.lang === 'zh' ? '静态 DIY 入口' : 'Static DIY entry'));
    checks.push(await checkLegacyTool('tools/dynamic/animator.html', state.lang === 'zh' ? '动态 DIY 入口' : 'Dynamic DIY entry'));
    return checks;
  }

  async function checkTable(tableName, label) {
    try {
      const { error } = await state.supabase.from(tableName).select('id').limit(1);
      if (error) throw error;
      return {
        name: label,
        ok: true,
        detail: state.lang === 'zh' ? '能正常读取，说明 SQL 基础结构已存在。' : 'Readable, so the SQL foundation exists.'
      };
    } catch (error) {
      return {
        name: label,
        ok: false,
        detail: error.message || (state.lang === 'zh' ? '读取失败。' : 'Read failed.')
      };
    }
  }

  async function checkApiHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const missing = (data.missingEnv || []).join(', ');
      return {
        name: state.lang === 'zh' ? '上线 API 配置' : 'Deploy API config',
        ok: data.ready,
        detail: data.ready
          ? (state.lang === 'zh' ? '创建账号 API 的环境变量已配置。' : 'Account API env vars are configured.')
          : `${state.lang === 'zh' ? '缺少' : 'Missing'}: ${missing || 'unknown'}`
      };
    } catch (_error) {
      return {
        name: state.lang === 'zh' ? '上线 API 配置' : 'Deploy API config',
        ok: false,
        local: true,
        detail: state.lang === 'zh' ? '本地静态预览不运行 Serverless API；部署到 Vercel 后会检查。' : 'Local static preview does not run Serverless API; Vercel will.'
      };
    }
  }

  async function checkLegacyTool(path, label) {
    try {
      const response = await fetch(`/${path}`, { method: 'GET' });
      return {
        name: label,
        ok: response.ok,
        detail: response.ok
          ? (state.lang === 'zh' ? '入口文件存在。' : 'Entry file exists.')
          : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        name: label,
        ok: false,
        detail: error.message
      };
    }
  }

  async function loadProjects() {
    const table = document.getElementById('projects-table');
    if (!table) return;
    if (state.localPreview || !state.supabase) {
      const localItems = JSON.parse(localStorage.getItem('vf_local_projects') || '[]');
      if (localItems.length === 0) {
        table.innerHTML = `<tr><td colspan="4">${state.lang === 'zh' ? '本地预览模式还没有项目记录。' : 'No local preview projects yet.'}</td></tr>`;
        return;
      }
      table.innerHTML = localItems.map(project => `
        <tr>
          <td>${escapeHtml(project.title)}</td>
          <td><span class="badge">${escapeHtml(project.project_type)}</span></td>
          <td>${formatDate(project.updated_at)}</td>
          <td>${project.snapshot_meta?.exportError ? escapeHtml(project.snapshot_meta.exportError) : 'Local'}</td>
        </tr>
      `).join('');
      return;
    }
    const { data, error } = await state.supabase
      .from('vf_projects')
      .select('id,title,project_type,updated_at,snapshot_meta')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) {
      table.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
      return;
    }
    if (!data || data.length === 0) {
      table.innerHTML = `<tr><td colspan="4">${state.lang === 'zh' ? '还没有项目。进入 DIY 工具后点击“保存项目”。' : 'No projects yet. Open a DIY tool and click Save Project.'}</td></tr>`;
      return;
    }
    table.innerHTML = data.map(project => `
      <tr>
        <td>${escapeHtml(project.title)}</td>
        <td><span class="badge">${escapeHtml(project.project_type)}</span></td>
        <td>${formatDate(project.updated_at)}</td>
        <td>${project.snapshot_meta?.exportError ? escapeHtml(project.snapshot_meta.exportError) : 'OK'}</td>
      </tr>
    `).join('');
  }

  let analyticsPreviewTimer = null;
  let analyticsPreviewAnchor = null;
  let analyticsPreviewWindowCleanup = null;
  function ensureAnalyticsInteractionStyles() {
    if (document.getElementById('analytics-interaction-styles')) return;
    const style = document.createElement('style');
    style.id = 'analytics-interaction-styles';
    style.textContent = `
      .ana-preview-trigger{display:inline-flex;align-items:center;justify-content:center;flex:0 0 36px;width:36px;height:36px;padding:0;border:0;border-radius:8px;background:#f1f5f9;cursor:pointer;overflow:hidden}
      .ana-preview-trigger:focus-visible{outline:2px solid #0d9488;outline-offset:3px}
      #analytics-preview-pop{position:fixed;z-index:10000;pointer-events:none;width:min(360px,calc(100vw - 24px));padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.15);box-sizing:border-box}
      #analytics-preview-pop .ana-preview-stage{display:flex;align-items:center;justify-content:center;height:min(420px,60vh);background:#303236;border-radius:7px;overflow:hidden}
      #analytics-preview-pop img,#analytics-preview-pop video{display:block;width:100%;height:100%;object-fit:contain}
      #analytics-preview-pop p{margin:8px 0 0;font-size:12px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #analytics-preview-pop .ana-preview-message{color:#e2e8f0;font-size:13px}
      .library-location-highlight{outline:3px solid #0d9488!important;outline-offset:4px;animation:library-location-fade 2s ease-out both;scroll-margin-block:120px}
      @keyframes library-location-fade{0%,35%{outline-color:#0d9488;box-shadow:0 0 0 7px rgba(13,148,136,.15)}100%{outline-color:transparent;box-shadow:0 0 0 7px transparent}}
      @media(prefers-reduced-motion:reduce){.library-location-highlight{animation:none}}
    `;
    document.head.appendChild(style);
  }
  function closeAnalyticsPreview() {
    clearTimeout(analyticsPreviewTimer);
    analyticsPreviewTimer = null;
    analyticsPreviewAnchor?.removeAttribute('aria-describedby');
    analyticsPreviewAnchor = null;
    document.getElementById('analytics-preview-pop')?.remove();
    analyticsPreviewWindowCleanup?.();
    analyticsPreviewWindowCleanup = null;
  }
  function analyticsPopoverPosition(anchor, width, height, viewportWidth, viewportHeight) {
    const gap = 12;
    let left = anchor.right + gap;
    if (left + width > viewportWidth - gap) left = anchor.left - width - gap;
    return {left:Math.max(gap, Math.min(left, viewportWidth - width - gap)), top:Math.max(gap, Math.min(anchor.top, viewportHeight - height - gap))};
  }
  function showAnalyticsPreview(anchor, media, name) {
    closeAnalyticsPreview();
    if (!anchor.isConnected || state.route !== 'analytics') return;
    ensureAnalyticsInteractionStyles();
    const pop = document.createElement('div');
    pop.id = 'analytics-preview-pop';
    pop.setAttribute('role', 'tooltip');
    const stage = document.createElement('div');
    stage.className = 'ana-preview-stage';
    const message = document.createElement('span');
    message.className = 'ana-preview-message';
    message.textContent = state.lang === 'zh' ? '预览暂不可用' : 'Preview unavailable';
    if (media?.url) {
      const element = document.createElement(media.video ? 'video' : 'img');
      if (media.video) { element.muted = true; element.autoplay = true; element.loop = true; element.playsInline = true; }
      else element.alt = name;
      element.src = media.url;
      element.onerror = function() { if (media.thumbUrl && element.src !== media.thumbUrl && !media.video) element.src = media.thumbUrl; else stage.replaceChildren(message); };
      stage.appendChild(element);
    } else stage.appendChild(message);
    const caption = document.createElement('p');
    caption.textContent = name;
    pop.append(stage, caption);
    document.body.appendChild(pop);
    analyticsPreviewAnchor = anchor;
    anchor.setAttribute('aria-describedby', pop.id);
    const rect = pop.getBoundingClientRect();
    const position = analyticsPopoverPosition(anchor.getBoundingClientRect(), rect.width, rect.height, window.innerWidth, window.innerHeight);
    pop.style.left = position.left + 'px'; pop.style.top = position.top + 'px';
    window.addEventListener('scroll', closeAnalyticsPreview, true);
    window.addEventListener('resize', closeAnalyticsPreview);
    analyticsPreviewWindowCleanup = function() { window.removeEventListener('scroll', closeAnalyticsPreview, true); window.removeEventListener('resize', closeAnalyticsPreview); };
  }
  function wireAnalyticsPreviews(root, mediaById, sourcesById) {
    ensureAnalyticsInteractionStyles();
    root.querySelectorAll('.ana-preview-trigger').forEach(function(button) {
      const source = sourcesById[button.dataset.sourceId] || {};
      const open = function() { showAnalyticsPreview(button, mediaById[button.dataset.sourceId], source.title || source.source_filename || ''); };
      button.addEventListener('mouseenter', function() { closeAnalyticsPreview(); analyticsPreviewTimer = setTimeout(open, 250); });
      button.addEventListener('mouseleave', closeAnalyticsPreview);
      button.addEventListener('focus', open);
      button.addEventListener('blur', closeAnalyticsPreview);
      button.addEventListener('keydown', function(event) { if (event.key === 'Escape') { event.preventDefault(); closeAnalyticsPreview(); } });
      const image = button.querySelector('img');
      if (image) image.onerror = function() { image.hidden = true; button.textContent = '▧'; };
    });
  }
  function analyticsMediaPaths(source, previews) {
    const preview = previews.find(function(item) { return item.source_file_id === source.id && item.preview_path; });
    const original = preview?.preview_path || (/\.(png|jpe?g|gif|webp|svg|avif|mp4|webm|mov)$/i.test(source.source_path || '') ? source.source_path : '');
    const thumbnail = libraryThumbnailPathForPreview(preview, source) || original;
    return {path:original || thumbnail, thumbnail:thumbnail, video:/\.(mp4|webm|mov)$/i.test(original) || /^video\//.test(preview?.preview_mime_type || '')};
  }
  async function loadAnalyticsMedia(items, sourcesById) {
    const media = Object.create(null);
    if (!items.length || !state.supabase) return media;
    try {
      const result = await state.supabase.from('vf_asset_previews')
        .select('id,source_file_id,preview_path,preview_mime_type,sort_order').in('source_file_id', items.map(function(item) { return item.id; }))
        .order('sort_order', {ascending:true}).order('id', {ascending:true});
      if (result.error) throw result.error;
      const paths = new Set();
      items.forEach(function(item) {
        const plan = analyticsMediaPaths(sourcesById[item.id] || {}, result.data || []);
        media[item.id] = plan;
        if (plan.path) paths.add(plan.path);
        if (plan.thumbnail) paths.add(plan.thumbnail);
      });
      if (!paths.size) return media;
      const signed = await state.supabase.storage.from(LIBRARY_BUCKET).createSignedUrls(Array.from(paths), 3600);
      if (signed.error) throw signed.error;
      const urls = Object.create(null);
      (signed.data || []).forEach(function(row) { if (!row.error && row.signedUrl) urls[row.path] = row.signedUrl; });
      Object.values(media).forEach(function(item) { item.url = urls[item.path] || ''; item.thumbUrl = urls[item.thumbnail] || (!item.video ? item.url : ''); });
    } catch (error) { console.warn('Analytics previews unavailable'); }
    return media;
  }
  function prepareLibrarySourceLocation(source) {
    const filters = state.libraryFilters;
    filters.kind = libraryKindOfSource(source);
    filters.query = ''; filters.favorites = false;
    ['tag1','tag2','tag3','tag4','country','activity','category'].forEach(function(key) { filters[key] = 'all'; });
    ['selectedCountries','selectedActivities','selectedStrategies','selectedElements','selectedFormats','selectedQuantities'].forEach(function(key) { filters[key] = []; });
    state.libraryMultiSelect = false; state.librarySelectedIds.clear(); state.librarySelectedPreviewId = '';
    state.libraryVisibleLimit = LIBRARY_RENDER_STEP;
    state.libraryScrollToSource = source.id;
  }
  function findLibrarySourceLocation(sourceId) {
    let index = state.libraryItems.findIndex(function(item) { return item.source.id === sourceId || item.fontVariants?.some(function(variant) { return variant.source.id === sourceId; }); });
    let group = null;
    if (index < 0) {
      group = state.libraryBookmarkGroups.find(function(item) { return item.refs.some(function(ref) { return (typeof ref === 'string' ? ref : ref.templateId) === sourceId; }); });
      if (group) index = state.libraryItems.findIndex(function(item) { return item.source.id === group.source.id; });
    }
    return {index:index, item:index >= 0 ? state.libraryItems[index] : null, group:group};
  }
  async function highlightLibraryLocation(card) {
    if (!card?.isConnected || state.route !== 'library') return;
    ensureAnalyticsInteractionStyles();
    // Wait briefly for preview dimensions/layout to settle; no rAF dependency.
    let previous = '', stable = 0;
    for (let attempt = 0; attempt < 12 && stable < 3; attempt++) {
      if (!card.isConnected || state.route !== 'library') return;
      const rect = card.getBoundingClientRect(), key = Math.round(rect.top) + ':' + Math.round(rect.height);
      stable = key === previous ? stable + 1 : 0; previous = key;
      await new Promise(function(resolve) { setTimeout(resolve, 60); });
    }
    if (!card.isConnected || state.route !== 'library') return;
    // Immediate scroll keeps the full highlight visible after long-distance jumps.
    card.scrollIntoView({behavior:'instant', block:'center', inline:'nearest'});
    card.focus({preventScroll:true});
    card.classList.add('library-location-highlight');
    setTimeout(function() { card.classList.remove('library-location-highlight'); }, 2200);
  }
  async function finishLibrarySourceLocation() {
    const sourceId = state.libraryScrollToSource;
    if (!sourceId || state.route !== 'library') return;
    const target = findLibrarySourceLocation(sourceId);
    if (!target.item) {
      state.libraryScrollToSource = null;
      showCaseToast(state.lang === 'zh' ? '该物料已移除或当前账号无法查看。' : 'This item was removed or is unavailable to this account.');
      return;
    }
    const card = document.querySelector('#library-grid .library-card[data-preview-id="' + CSS.escape(target.item.preview.id) + '"]');
    if (!card) return;
    state.libraryScrollToSource = null;
    if (target.group) {
      card.scrollIntoView({behavior:'instant', block:'center'});
      await openLibraryBookmarkPopup(target.group.source.id);
      const member = document.querySelector('#library-bookmark-members [data-template-source-id="' + CSS.escape(sourceId) + '"]');
      await highlightLibraryLocation(member || card);
    } else await highlightLibraryLocation(card);
  }

  // Analytics uses stable account IDs; labels are presentation only.
  function analyticsAccountKey(event) {
    return event.actor_id || 'unknown:' + ((event.meta || {}).account_label || '');
  }
  function analyticsAccountName(event, accounts) {
    var account = accounts && accounts[event.actor_id];
    return (account && account.displayName) || (event.meta || {}).account_label ||
      (event.actor_id ? (state.lang === 'zh' ? '账号 ' + String(event.actor_id).slice(0, 8) : 'Account ' + String(event.actor_id).slice(0, 8)) : (state.lang === 'zh' ? '未知账号' : 'Unknown account'));
  }
  function analyticsIsAdmin(event, accounts) {
    var account = accounts && accounts[event.actor_id];
    return account ? account.role === 'admin' : event.actor_role === 'admin';
  }
  function analyticsDateKey(value) {
    var d = new Date(value);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function analyticsDayIndex(value, start) {
    var d = new Date(value), base = new Date(start);
    return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(base.getFullYear(), base.getMonth(), base.getDate())) / 86400000;
  }
  async function fetchAnalyticsRows(query) {
    var rows = [], offset = 0;
    for (;;) {
      var result = await query().range(offset, offset + 499);
      if (result.error) throw result.error;
      var page = result.data || [];
      if (!page.length) {
        if (Number.isFinite(result.count) && offset < result.count) throw new Error('Analytics pagination incomplete');
        break;
      }
      rows.push(...page);
      offset += page.length;
      if (Number.isFinite(result.count) ? offset >= result.count : page.length < 500) break;
    }
    return { data: rows };
  }
  async function fetchAnalyticsAccounts() {
    try {
      var response = await fetch('/api/analytics-accounts', { headers: window.VFAccountAccess?.headers?.() || {}, cache: 'no-store' });
      if (!response.ok) throw new Error('Account labels unavailable');
      var data = await response.json(), accounts = Object.create(null);
      (data.accounts || []).forEach(function(account) { accounts[account.id] = account; });
      return accounts;
    } catch (error) {
      console.warn('Analytics account labels unavailable');
      return Object.create(null);
    }
  }

  // ── 数据看板：数据查询辅助 ──
  async function fetchAnalyticsData(rangeDays) {
    if (!state.supabase) return null;
    var startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - rangeDays + 1);
    var startISO = startDate.toISOString();
    var endISO = new Date().toISOString();

    try {
      // Page through all rows, including when the service caps each response.
      var [eventsRes, sourcesRes, genRes, accounts] = await Promise.all([
        fetchAnalyticsRows(() => state.supabase.from('vf_asset_events')
          .select('id,actor_id,actor_role,event_type,source_file_id,preview_id,meta,created_at', { count: 'exact' })
          .neq('event_type', 'imagegen').gte('created_at', startISO).lte('created_at', endISO)
          .order('created_at', { ascending: false }).order('id', { ascending: false })),
        fetchAnalyticsRows(() => state.supabase.from('vf_source_files')
          .select('id,title,source_filename,source_ext,tags,source_path,country_id,activity_id,created_at,source_size_bytes', { count: 'exact' })
          .order('created_at', { ascending: true }).order('id', { ascending: true })),
        fetchAnalyticsRows(() => state.supabase.from('vf_asset_events')
          .select('id,actor_id,actor_role,event_type,meta,created_at', { count: 'exact' })
          .eq('event_type', 'imagegen').gte('created_at', startISO).lte('created_at', endISO)
          .order('created_at', { ascending: false }).order('id', { ascending: false })),
        fetchAnalyticsAccounts()
      ]);
      var events = eventsRes.data;
      var sources = sourcesRes.data;
      var seenJobs = new Set();
      var imagegenEvents = genRes.data.filter(function(event) {
        var key = (event.meta || {}).job_id;
        if (!key) return true;
        key = analyticsAccountKey(event) + ':' + key;
        if (seenJobs.has(key)) return false;
        seenJobs.add(key); return true;
      });

      // 通过 tags 判断素材类型（复用 libraryKindOfSource 逻辑）
      function sourceKind(s) {
        var tags = s.tags || [];
        if (tags.indexOf('vf:kind:gallery') !== -1) return 'gallery';
        if (tags.indexOf('vf:kind:template') !== -1) return 'template';
        if (tags.indexOf('vf:kind:source') !== -1) return 'source';
        var ext = (s.source_ext || '').toLowerCase();
        var imgExts = ['jpg','jpeg','png','gif','webp','bmp','svg','tiff','psd','ai','eps','heic','heif'];
        if (imgExts.indexOf(ext) !== -1) return 'gallery';
        if (ext === 'json') return 'template';
        return 'source';
      }

      // 计算素材累计增长（按日期 + 类型）+ 存储空间统计
      var sourceCountByDate = {};
      var sourceTypes = { source: 0, gallery: 0, template: 0 };
      var totalStorageBytes = 0;
      var storageByType = { source: 0, gallery: 0, template: 0 };
      sources.forEach(function(s) {
        var kind = sourceKind(s);
        if (!sourceCountByDate[kind]) sourceCountByDate[kind] = {};
        var d = s.created_at ? analyticsDateKey(s.created_at) : '';
        if (d) {
          sourceCountByDate[kind][d] = (sourceCountByDate[kind][d] || 0) + 1;
          sourceCountByDate.all = sourceCountByDate.all || {};
          sourceCountByDate.all[d] = (sourceCountByDate.all[d] || 0) + 1;
        }
        sourceTypes[kind] = (sourceTypes[kind] || 0) + 1;
        var bytes = Number(s.source_size_bytes) || 0;
        totalStorageBytes += bytes;
        storageByType[kind] = (storageByType[kind] || 0) + bytes;
      });

      // 按日期排序并计算累计值
      var allDates = Object.keys(sourceCountByDate.all || {}).sort();
      var assetGrowth = { labels: allDates, total: [], source: [], gallery: [], template: [] };
      var cumTotal = 0, cumSource = 0, cumGallery = 0, cumTemplate = 0;
      // 计算起始值（range 之外的累计）
      var rangeStartStr = analyticsDateKey(startDate);
      allDates.forEach(function(d) {
        cumTotal += (sourceCountByDate.all && sourceCountByDate.all[d]) || 0;
        cumSource += (sourceCountByDate.source && sourceCountByDate.source[d]) || 0;
        cumGallery += (sourceCountByDate.gallery && sourceCountByDate.gallery[d]) || 0;
        cumTemplate += (sourceCountByDate.template && sourceCountByDate.template[d]) || 0;
        if (d >= rangeStartStr) {
          assetGrowth.total.push(cumTotal);
          assetGrowth.source.push(cumSource);
          assetGrowth.gallery.push(cumGallery);
          assetGrowth.template.push(cumTemplate);
        }
      });
      // labels 也只保留 range 内的
      assetGrowth.labels = allDates.filter(function(d) { return d >= rangeStartStr; });

      return { events: events, sources: sources, assetGrowth: assetGrowth, sourceTypes: sourceTypes, startISO: startISO, totalStorageBytes: totalStorageBytes, storageByType: storageByType, imagegenEvents: imagegenEvents, accounts: accounts };
    } catch (e) {
      console.warn('Analytics data fetch failed:', e);
      return null;
    }
  }

  // ── 数据看板：页面渲染 ──
  async function renderAnalyticsPage() {
    parkActiveToolFrame();
    var zh = state.lang === 'zh';
    await loadChartLibrary();

    // ===== HTML + Scoped CSS =====
    els.content.innerHTML = '\
      <div class="panel-page" id="analytics-page">\
        <p class="muted" id="ana-data-status" role="status"></p>\
        <style>\
          #analytics-page { --ana-primary: #0d9488; --ana-primary-light: #ccfbf1; --ana-bg-card: #ffffff; --ana-text: #1e293b; --ana-muted: #64748b; --ana-label: #94a3b8; --ana-border: #e2e8f0; --ana-shadow: 0 4px 20px rgba(0,0,0,0.04); --ana-radius: 20px; --ana-radius-sm: 12px; }\
          #analytics-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: transparent; color: var(--ana-text); }\
          #analytics-page .ana-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }\
          #analytics-page .ana-panel-title { font-size: 22px; font-weight: 700; color: var(--ana-text); }\
          #analytics-page .ana-filter-group { display: flex; gap: 6px; background: #e8eaed; padding: 3px; border-radius: 100px; }\
          #analytics-page .ana-filter-btn { padding: 7px 18px; border: none; border-radius: 100px; font-size: 13px; font-weight: 500; color: var(--ana-muted); background: transparent; cursor: pointer; transition: all 0.2s; font-family: inherit; }\
          #analytics-page .ana-filter-btn:hover { color: var(--ana-text); }\
          #analytics-page .ana-filter-btn.active { background: #fff; color: var(--ana-text); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }\
          #analytics-page .ana-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 22px; }\
          #analytics-page .ana-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); }\
          #analytics-page .ana-card-icon { width: 40px; height: 40px; border-radius: var(--ana-radius-sm); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }\
          #analytics-page .ana-card-icon.teal { background: var(--ana-primary-light); color: var(--ana-primary); }\
          #analytics-page .ana-card-icon.blue { background: #dbeafe; color: #2563eb; }\
          #analytics-page .ana-card-icon.violet { background: #ede9fe; color: #7c3aed; }\
          #analytics-page .ana-card-icon.rose { background: #ffe4e6; color: #e11d48; }\
          #analytics-page .ana-card-icon svg { width: 20px; height: 20px; }\
          #analytics-page .ana-card-value { font-size: 30px; font-weight: 700; color: var(--ana-text); line-height: 1.2; margin-bottom: 4px; }\
          #analytics-page .ana-card-label { font-size: 13px; color: var(--ana-muted); font-weight: 500; }\
          #analytics-page .ana-gen-fold { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 0; border: none; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--ana-muted); cursor: pointer; }\
          #analytics-page .ana-gen-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: 0; }\
          #analytics-page .ana-gen-sub { font-size: 12px; font-weight: 600; color: var(--ana-muted); }\
          #analytics-page .ana-gen-sep { font-size: 12px; color: var(--ana-border); margin: 0 7px; }\
          #analytics-page .ana-gen-fold:hover { color: var(--ana-text); }\
          #analytics-page .ana-gen-fold-arrow { display: inline-block; font-size: 10px; transition: transform 160ms ease; }\
          #analytics-page .ana-gen-fold.open .ana-gen-fold-arrow { transform: rotate(90deg); }\
          #analytics-page .ana-gen-detail { margin-top: 10px; }\
          #analytics-page .ana-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }\
          #analytics-page .ana-chart-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); }\
          #analytics-page .ana-chart-card.full { margin-bottom: 22px; }\
          #analytics-page .ana-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }\
          #analytics-page .ana-chart-title { font-size: 15px; font-weight: 600; color: var(--ana-text); }\
          #analytics-page .ana-chart-sub { font-size: 18px; font-weight: 700; color: var(--ana-text); }\
          #analytics-page .ana-chart-sub-label { font-size: 12px; color: var(--ana-muted); margin-left: 4px; }\
          #analytics-page .ana-chart-sub-sep { font-size: 14px; color: var(--ana-border); margin: 0 8px; }\
          #analytics-page .ana-chart-wrap { position: relative; height: 250px; }\
          #analytics-page .ana-chart-wrap-sm { position: relative; height: 200px; }\
          #analytics-page .ana-table-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); margin-bottom: 22px; }\
          #analytics-page .ana-table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }\
          #analytics-page .ana-table-title { font-size: 15px; font-weight: 600; }\
          #analytics-page .ana-cat-tabs { display: flex; gap: 3px; background: #f1f5f9; padding: 3px; border-radius: 100px; }\
          #analytics-page .ana-cat-tab { padding: 5px 14px; border: none; border-radius: 100px; font-size: 12px; font-weight: 500; color: var(--ana-muted); background: transparent; cursor: pointer; font-family: inherit; }\
          #analytics-page .ana-cat-tab.active { background: #fff; color: var(--ana-text); font-weight: 600; }\
          #analytics-page .ana-table { width: 100%; border-collapse: collapse; }\
          #analytics-page .ana-table th { text-align: left; font-size: 11px; font-weight: 600; color: var(--ana-label); text-transform: uppercase; padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }\
          #analytics-page .ana-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }\
          #analytics-page .ana-table tr:last-child td { border-bottom: none; }\
          #analytics-page .ana-rank { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; font-size: 12px; font-weight: 700; background: #f1f5f9; color: var(--ana-muted); }\
          #analytics-page .ana-rank.top { background: var(--ana-primary-light); color: var(--ana-primary); }\
          #analytics-page .ana-thumb-cell { display: flex; align-items: center; gap: 10px; }\
          #analytics-page .ana-thumb-img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: #f1f5f9; }\
          #analytics-page .ana-thumb-name { font-size: 13px; font-weight: 500; }\
          #analytics-page .ana-thumb-file { font-size: 11px; color: var(--ana-muted); }\
          #analytics-page .ana-stat { font-size: 13px; font-weight: 600; color: var(--ana-text); }\
          #analytics-page .ana-view-more { text-align: center; padding: 10px 0 2px; }\
          #analytics-page .ana-view-btn { background: transparent; border: none; color: var(--ana-primary); font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 14px; border-radius: 8px; font-family: inherit; }\
          #analytics-page .ana-view-btn:hover { background: rgba(13,148,136,0.06); }\
          #analytics-page .ana-activity-card { background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 22px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); margin-bottom: 22px; }\
          #analytics-page .ana-activity-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: scroll; padding-right: 4px; }\
          #analytics-page .ana-activity-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; background: #f8fafc; }\
          #analytics-page .ana-activity-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }\
          #analytics-page .ana-activity-body { flex: 1; min-width: 0; }\
          #analytics-page .ana-activity-text { font-size: 13px; line-height: 1.4; }\
          #analytics-page .ana-activity-text .u { font-weight: 600; }\
          #analytics-page .ana-activity-text .a { font-weight: 500; }\
          #analytics-page .ana-activity-text .m { font-weight: 500; color: var(--ana-primary); }\
          #analytics-page .ana-activity-time { font-size: 11px; color: var(--ana-muted); white-space: nowrap; flex-shrink: 0; }\
          #analytics-page .ana-controls { display: flex; align-items: center; justify-content: space-between; background: var(--ana-bg-card); border-radius: var(--ana-radius); padding: 16px 24px; box-shadow: var(--ana-shadow); border: 1px solid var(--ana-border); }\
          #analytics-page .ana-controls-left { display: flex; align-items: center; gap: 14px; }\
          #analytics-page .ana-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }\
          #analytics-page .ana-toggle-sw { width: 38px; height: 20px; background: var(--ana-border); border-radius: 10px; position: relative; transition: background 0.25s; }\
          #analytics-page .ana-toggle-sw::after { content: ""; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }\
          #analytics-page .ana-toggle.active .ana-toggle-sw { background: var(--ana-primary); }\
          #analytics-page .ana-toggle.active .ana-toggle-sw::after { transform: translateX(18px); }\
          #analytics-page .ana-toggle-label { font-size: 13px; font-weight: 500; }\
          #analytics-page .ana-btn-clear { font-size: 12px; font-weight: 500; color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 5px 10px; border-radius: 6px; font-family: inherit; }\
          #analytics-page .ana-btn-clear:hover { background: #fef2f2; }\
          #analytics-page .ana-empty { padding: 40px 0; text-align: center; color: var(--ana-muted); font-size: 14px; }\
          #analytics-page .ana-scroll { overflow-y: scroll; }\
          @media (max-width: 980px) {\
            #analytics-page .ana-card-grid { grid-template-columns: 1fr; }\
            #analytics-page .ana-charts-row { grid-template-columns: 1fr; }\
          }\
        </style>\
        <div>\
          <div class="ana-panel-header">\
            <div class="ana-filter-group" id="ana-range-btns">\
              <button class="ana-filter-btn" data-range="1">' + (zh ? '今日' : 'Today') + '</button>\
              <button class="ana-filter-btn active" data-range="7">' + (zh ? '近7天' : '7 Days') + '</button>\
              <button class="ana-filter-btn" data-range="30">' + (zh ? '近30天' : '30 Days') + '</button>\
              <button class="ana-filter-btn" data-range="90">' + (zh ? '本季度' : 'Quarter') + '</button>\
            </div>\
          </div>\
          <div class="ana-card-grid">\
            <div class="ana-card"><div class="ana-card-icon teal"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg></div><div class="ana-card-value" id="ana-total-ops">-</div><div class="ana-card-label">' + (zh ? '总操作次数' : 'Total Ops') + '</div></div>\
            <div class="ana-card"><div class="ana-card-icon blue"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg></div><div class="ana-card-value" id="ana-active-users">-</div><div class="ana-card-label">' + (zh ? '活跃用户数' : 'Active Users') + '</div></div>\
            <div class="ana-card"><div class="ana-card-icon violet"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg></div><div class="ana-card-value" id="ana-upload-count">-</div><div class="ana-card-label">' + (zh ? '上传次数' : 'Uploads') + '</div></div>\
            <div class="ana-card"><div class="ana-card-icon rose"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg></div><div class="ana-card-value" id="ana-download-count">-</div><div class="ana-card-label">' + (zh ? '下载次数' : 'Downloads') + '</div></div>\
          </div>\
          <div class="ana-chart-card full"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '生图统计（即梦）' : 'Image Generation') + '</span><span><span class="ana-gen-sub">' + (zh ? '总次数' : 'Total') + ' </span><span class="ana-gen-sub" id="ana-gen-total" style="color:var(--ana-text)">-</span><span class="ana-gen-sep">|</span><span class="ana-gen-sub" style="color:#0d9488"><span class="ana-gen-dot" style="background:#0d9488"></span>' + (zh ? 'Lite 免费' : 'Lite free') + ' </span><span class="ana-gen-sub" id="ana-gen-lite" style="color:#0d9488">-</span><span class="ana-gen-sep">|</span><span class="ana-gen-sub" style="color:#7c3aed"><span class="ana-gen-dot" style="background:#7c3aed"></span>' + (zh ? 'Pro 8积分/张' : 'Pro 8cr/img') + ' </span><span class="ana-gen-sub" id="ana-gen-pro" style="color:#7c3aed">-</span><span class="ana-gen-sep">|</span><span class="ana-gen-sub" style="color:#ef4444">' + (zh ? 'Pro 积分消耗' : 'Pro credits') + ' </span><span class="ana-gen-sub" id="ana-gen-credits" style="color:#ef4444">-</span></span></div><div class="ana-chart-wrap-sm"><canvas id="ana-gen-trend"></canvas></div><button type="button" class="ana-gen-fold" id="ana-gen-fold"><span class="ana-gen-fold-arrow">▸</span>' + (zh ? '按账号查看积分消耗' : 'Credits by account') + '</button><div class="ana-gen-detail" id="ana-gen-detail" hidden><div class="ana-scroll" style="max-height:260px;"><table class="ana-table"><thead><tr><th>' + (zh ? '账号' : 'Account') + '</th><th style="width:90px;">' + (zh ? 'Lite' : 'Lite') + '</th><th style="width:90px;">' + (zh ? 'Pro' : 'Pro') + '</th><th style="width:110px;">' + (zh ? '积分消耗' : 'Credits') + '</th></tr></thead><tbody id="ana-gen-body"><tr><td colspan="4" class="ana-empty">' + (zh ? '暂无生图记录' : 'No generations yet') + '</td></tr></tbody></table></div></div></div>\
          <div class="ana-charts-row">\
            <div class="ana-chart-card"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '事件类型分布' : 'Event Distribution') + '</span></div><div class="ana-chart-wrap" style="height:280px;"><canvas id="ana-doughnut"></canvas></div></div>\
            <div class="ana-chart-card"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '上传 vs 下载趋势' : 'Upload vs Download') + '</span></div><div class="ana-chart-wrap"><canvas id="ana-upload-download"></canvas></div></div>\
          </div>\
          <div class="ana-chart-card full"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '用户活跃度趋势' : 'User Activity Trend') + '</span><span><span class="ana-chart-sub" id="ana-today-active">-</span><span class="ana-chart-sub-label">' + (zh ? '今日活跃' : 'today active') + '</span></span></div><div class="ana-chart-wrap-sm"><canvas id="ana-line"></canvas></div></div>\
          <div class="ana-charts-row">\
            <div class="ana-chart-card full"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '素材总量趋势' : 'Asset Growth') + '</span><span><span class="ana-chart-sub">' + (zh ? '总量' : 'Total') + ' </span><span class="ana-chart-sub" id="ana-asset-total">-</span><span class="ana-chart-sub-sep"> | </span><span class="ana-chart-sub">' + (zh ? '案例库' : 'Case') + ' </span><span class="ana-chart-sub" id="ana-asset-source" style="color:#3b82f6">-</span><span class="ana-chart-sub-sep"> | </span><span class="ana-chart-sub">' + (zh ? '图库' : 'Gallery') + ' </span><span class="ana-chart-sub" id="ana-asset-gallery" style="color:#f59e0b">-</span><span class="ana-chart-sub-sep"> | </span><span class="ana-chart-sub">' + (zh ? '模版库' : 'Template') + ' </span><span class="ana-chart-sub" id="ana-asset-template" style="color:#8b5cf6">-</span><span class="ana-chart-sub-sep"> | </span><span class="ana-chart-sub">' + (zh ? '已用' : 'Used') + ' </span><span class="ana-chart-sub" id="ana-storage-used" style="color:#ef4444">-</span><span class="ana-chart-sub-sep"> / </span><span class="ana-chart-sub">' + (zh ? '总量' : 'Total') + ' </span><span class="ana-chart-sub" id="ana-storage-limit" style="color:#6b7280">-</span></span></div><div class="ana-chart-wrap-sm"><canvas id="ana-asset-growth"></canvas></div></div>\
            <div class="ana-chart-card full"><div class="ana-chart-header"><span class="ana-chart-title">' + (zh ? '操作时段分布' : 'Peak Hours') + '</span><span><span class="ana-chart-sub" id="ana-peak-hour">-</span><span class="ana-chart-sub-label">' + (zh ? '峰值时段' : 'peak') + '</span></span></div><div class="ana-chart-wrap-sm"><canvas id="ana-peak-hours"></canvas></div></div>\
          </div>\
          <div class="ana-table-card">\
            <div class="ana-table-header"><span class="ana-table-title">' + (zh ? '热门素材 Top 10' : 'Hot Content Top 10') + '</span><div class="ana-cat-tabs" id="ana-cat-tabs"><button class="ana-cat-tab active" data-cat="all">' + (zh ? '全部' : 'All') + '</button><button class="ana-cat-tab" data-cat="source">' + (zh ? '案例库' : 'Case') + '</button><button class="ana-cat-tab" data-cat="gallery">' + (zh ? '图库' : 'Gallery') + '</button><button class="ana-cat-tab" data-cat="template">' + (zh ? '模版库' : 'Template') + '</button></div></div>\
            <div class="ana-scroll" style="max-height:420px;"><table class="ana-table"><thead><tr><th style="width:60px;">#</th><th>' + (zh ? '素材' : 'Asset') + '</th><th style="width:90px;">' + (zh ? '下载' : 'DL') + '</th><th style="width:90px;">' + (zh ? '查看' : 'Views') + '</th><th style="width:90px;">' + (zh ? '使用' : 'Uses') + '</th></tr></thead><tbody id="ana-top10-body"><tr><td colspan="5" class="ana-empty">' + (zh ? '暂无数据' : 'No data yet') + '</td></tr></tbody></table></div>\
          </div>\
          <div class="ana-activity-card"><div class="ana-table-header"><span class="ana-table-title">' + (zh ? '最近操作动态' : 'Recent Activity') + '</span></div><div class="ana-activity-list" id="ana-activity-list"><div class="ana-empty">' + (zh ? '暂无操作记录' : 'No activity yet') + '</div></div></div>\
          <div class="ana-controls"><div class="ana-controls-left"><div class="ana-toggle" id="ana-toggle-admin"><div class="ana-toggle-sw"></div><span class="ana-toggle-label">' + (zh ? '排除管理员操作' : 'Exclude Admin Ops') + '</span></div></div><button class="ana-btn-clear" id="ana-btn-clear">' + (zh ? '清除我的测试数据' : 'Clear My Test Data') + '</button></div>\
        </div>\
      </div>';

    // ===== 状态 =====
    var currentRange = 7;
    var excludeAdmin = false;
    var fetchedData = null;
    var analyticsRequest = 0, top10Request = 0;
    var charts = {};
    var top10Cat = 'all';
    // ===== 图表颜色 =====
    var CHART_COLORS = ['#0d9488','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#06b6d4','#64748b','#ec4899','#84cc16'];

    // ===== 事件类型归类 =====
    function eventCategory(et) {
      if (et === 'upload') return 'upload';
      if (et === 'view') return 'view';
      if (et === 'favorite') return 'favorite';
      if (et === 'edit' || et === 'batch_edit') return 'edit';
      if (et === 'delete' || et === 'batch_delete') return 'delete';
      if (et === 'login') return 'login';
      if (et === 'batch_download' || et === 'download_preview' || et === 'download_source') return 'download';
      if (et === 'use_static' || et === 'use_dynamic' || et === 'use_template') return 'diy';
      return 'other';
    }

    var CAT_LABELS_ZH = { upload: '上传素材', download: '下载素材', view: '查看详情', favorite: '收藏', edit: '编辑素材', delete: '删除素材', diy: '使用DIY', imagegen: '生图' };
    var CAT_LABELS_EN = { upload: 'Upload', download: 'Download', view: 'View', favorite: 'Favorite', edit: 'Edit', delete: 'Delete', diy: 'DIY Use', imagegen: 'Image Generation' };
    var CAT_ORDER = ['upload','download','view','favorite','edit','delete','diy','imagegen'];

    // ===== 销毁旧图表 =====
    function destroyCharts() {
      Object.values(charts).forEach(function(c) { try { c.destroy(); } catch(e) {} });
      charts = {};
    }

    // ===== 生成日期标签 =====
    function dateLabels(days) {
      var labels = [];
      var d = new Date();
      for (var i = days - 1; i >= 0; i--) {
        var dt = new Date(d);
        dt.setDate(dt.getDate() - i);
        labels.push((dt.getMonth() + 1) + '/' + dt.getDate());
      }
      return labels;
    }

    // ===== 相对时间 =====
    function relativeTime(iso) {
      if (!iso) return '';
      var diff = (Date.now() - new Date(iso).getTime()) / 1000;
      if (diff < 60) return zh ? '刚刚' : 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + (zh ? '分钟前' : 'm ago');
      if (diff < 86400) return Math.floor(diff / 3600) + (zh ? '小时前' : 'h ago');
      return Math.floor(diff / 86400) + (zh ? '天前' : 'd ago');
    }

    // ===== 渲染全部内容 =====
    async function renderAll() {
      var request = ++analyticsRequest;
      var data = await fetchAnalyticsData(currentRange);
      if (request !== analyticsRequest || state.route !== 'analytics') return;
      fetchedData = data;
      if (!data) { document.getElementById('ana-data-status').textContent = zh ? '数据读取失败，请刷新重试；当前数字不可用于核对。' : 'Data failed to load. Refresh before using these totals.'; return; }
      document.getElementById('ana-data-status').textContent = zh ? '统计已记录的操作次数；重复使用会累加，共享账号不区分同事；源文件外链按点击计数。' : 'Recorded actions; repeated uses count separately and shared accounts do not identify individuals.';
      // 生图埋点单独统计，不混入通用操作事件（总操作/活跃/分布的口径保持不变）
      var events = ((data && data.events) ? data.events : []).filter(function(e) { return e.event_type !== 'imagegen'; });
      var effectiveEvents = excludeAdmin ? events.filter(function(e) { return !analyticsIsAdmin(e, data && data.accounts); }) : events;
      var todayStr = analyticsDateKey(new Date());

      // --- 生图统计（即梦 Lite/Pro，Pro 每张 8 积分）---
      var genEvents = ((data && data.imagegenEvents) ? data.imagegenEvents : []).slice();
      if (excludeAdmin) genEvents = genEvents.filter(function(e) { return !analyticsIsAdmin(e, data && data.accounts); });
      var genTotal = genEvents.length, genLite = 0, genPro = 0;
      var genByAccount = Object.create(null);
      genEvents.forEach(function(e) {
        var m = e.meta || {};
        var isPro = m.model === 'site-jimeng-pro';
        if (isPro) genPro++; else genLite++;
        var key = analyticsAccountKey(e);
        var row = genByAccount[key] = genByAccount[key] || { name: analyticsAccountName(e, data.accounts), lite: 0, pro: 0 };
        if (isPro) row.pro++; else row.lite++;
      });
      var genSetText = function(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };
      genSetText('ana-gen-total', String(genTotal));
      genSetText('ana-gen-lite', genTotal ? genLite + '（' + Math.round(genLite * 100 / genTotal) + '%）' : '0');
      genSetText('ana-gen-pro', genTotal ? genPro + '（' + Math.round(genPro * 100 / genTotal) + '%）' : '0');
      genSetText('ana-gen-credits', String(genPro * 8));
      // 按账号积分消耗（默认折叠，点击「按账号查看积分消耗」展开）
      var genBody = document.getElementById('ana-gen-body');
      if (genBody) {
        var genKeys = Object.keys(genByAccount).sort(function(a, b) {
          return (genByAccount[b].pro * 8) - (genByAccount[a].pro * 8) || (genByAccount[b].lite + genByAccount[b].pro) - (genByAccount[a].lite + genByAccount[a].pro);
        });
        if (!genKeys.length) {
          genBody.innerHTML = '<tr><td colspan="4" class="ana-empty">' + (zh ? '暂无生图记录' : 'No generations yet') + '</td></tr>';
        } else {
          genBody.innerHTML = genKeys.map(function(k) {
            var r = genByAccount[k];
            return '<tr><td>' + escapeHtml(r.name) + '</td><td>' + r.lite + '</td><td>' + r.pro + '</td><td>' + (r.pro * 8) + '</td></tr>';
          }).join('');
        }
      }
      // 生图趋势双折线（纵轴张数 / 横轴日期，随顶部天数切换联动）
      var genLabels = dateLabels(currentRange);
      var genRangeStart = new Date();
      genRangeStart.setHours(0, 0, 0, 0);
      genRangeStart.setDate(genRangeStart.getDate() - currentRange + 1);
      var dailyGenLite = new Array(currentRange).fill(0);
      var dailyGenPro = new Array(currentRange).fill(0);
      genEvents.forEach(function(e) {
        var ed = e.created_at ? analyticsDateKey(e.created_at) : '';
        if (!ed) return;
        var idx = analyticsDayIndex(e.created_at, genRangeStart);
        if (idx < 0 || idx >= currentRange) return;
        if ((e.meta || {}).model === 'site-jimeng-pro') dailyGenPro[idx]++; else dailyGenLite[idx]++;
      });
      if (charts.genTrend) charts.genTrend.destroy();
      var gtCtx = document.getElementById('ana-gen-trend');
      if (gtCtx) {
        charts.genTrend = new Chart(gtCtx.getContext('2d'), {
          type: 'line', data: { labels: genLabels, datasets: [
            { label: zh ? 'Lite 免费' : 'Lite', data: dailyGenLite, borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.08)', fill: true, tension: 0, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#0d9488' },
            { label: zh ? 'Pro（8积分/张）' : 'Pro', data: dailyGenPro, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)', fill: true, tension: 0, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#7c3aed' }
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- KPI 卡片 ---
      var uniqueUsers = new Set(effectiveEvents.map(function(e) { return e.actor_id; }));
      var uploadCount = 0, downloadCount = 0;
      effectiveEvents.forEach(function(e) {
        if (eventCategory(e.event_type) === 'upload') uploadCount++;
        if (eventCategory(e.event_type) === 'download') downloadCount++;
      });
      document.getElementById('ana-total-ops').textContent = effectiveEvents.length;
      document.getElementById('ana-active-users').textContent = uniqueUsers.size;
      document.getElementById('ana-upload-count').textContent = uploadCount;
      document.getElementById('ana-download-count').textContent = downloadCount;
      document.getElementById('ana-today-active').textContent = effectiveEvents.length ? new Set(effectiveEvents.filter(function(e) { return analyticsDateKey(e.created_at) === todayStr; }).map(function(e) { return e.actor_id; })).size : '0';
      var st = (data && data.sourceTypes) ? data.sourceTypes : { source: 0, gallery: 0, template: 0 };
      document.getElementById('ana-asset-total').textContent = (st.source + st.gallery + st.template) || '0';
      document.getElementById('ana-asset-source').textContent = st.source || '0';
      document.getElementById('ana-asset-gallery').textContent = st.gallery || '0';
      document.getElementById('ana-asset-template').textContent = st.template || '0';
      // 存储空间（总量从 config.js 读取，升级服务器后修改 storageLimitGB 即可）
      var usedBytes = (data && data.totalStorageBytes) ? data.totalStorageBytes : 0;
      var limitGB = (window.VF_CONFIG && window.VF_CONFIG.storageLimitGB) ? window.VF_CONFIG.storageLimitGB : 1;
      var limitBytes = limitGB * 1024 * 1024 * 1024;
      var elUsed = document.getElementById('ana-storage-used');
      var elLimit = document.getElementById('ana-storage-limit');
      if (elUsed) elUsed.textContent = formatFileSize(usedBytes);
      if (elLimit) elLimit.textContent = formatFileSize(limitBytes);

      // --- 环形图：事件类型分布（登录不展示，生图使用同一筛选后的真实次数）---
      var catCounts = { imagegen: genEvents.length };
      effectiveEvents.forEach(function(e) {
        if (e.event_type === 'login') return;
        var cat = eventCategory(e.event_type);
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
      var catLabels = CAT_ORDER.filter(function(c) { return catCounts[c]; });
      var catValues = catLabels.map(function(c) { return catCounts[c]; });
      var catDisplayLabels = catLabels.map(function(c) { return zh ? CAT_LABELS_ZH[c] : CAT_LABELS_EN[c]; });
      var totalCat = catValues.reduce(function(a, b) { return a + b; }, 0);

      if (charts.doughnut) charts.doughnut.destroy();
      var dCtx = document.getElementById('ana-doughnut');
      if (dCtx) {
        charts.doughnut = new Chart(dCtx.getContext('2d'), {
          type: 'doughnut',
          data: { labels: catDisplayLabels, datasets: [{ data: catValues, backgroundColor: CHART_COLORS.slice(0, catValues.length), borderWidth: 0, hoverOffset: 8 }] },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            layout: { padding: { bottom: 10 } },
            plugins: {
              legend: { position: 'right', onClick: function(e, legendItem, legend) { if (legendItem.index !== undefined) { legend.chart.toggleDataVisibility(legendItem.index); legend.chart.update(); } }, labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 14, font: { size: 11 }, color: '#64748b' } },
              tooltip: { callbacks: { label: function(ctx) { var pct = ((ctx.raw / totalCat) * 100).toFixed(1); return ' ' + ctx.label + ': ' + ctx.raw + ' (' + pct + '%)'; } } }
            }
          },
          plugins: [{
            id: 'centerText', afterDraw: function(chart) {
              var meta = chart.getDatasetMeta(0); if (!meta.data.length) return;
              // 只统计未隐藏的项，点击图例屏蔽后中间数字同步变化
              var visibleTotal = 0;
              var ds = chart.data.datasets[0];
              for (var i = 0; i < ds.data.length; i++) {
                if (chart.getDataVisibility(i)) visibleTotal += ds.data[i];
              }
              var ctx = chart.ctx, c = meta.data[0], x = c.x, y = c.y;
              ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.font = "bold 24px -apple-system, sans-serif"; ctx.fillStyle = '#1e293b'; ctx.fillText(visibleTotal, x, y - 6);
              ctx.font = "11px -apple-system, sans-serif"; ctx.fillStyle = '#64748b'; ctx.fillText(zh ? '总操作' : 'Total', x, y + 14);
              ctx.restore();
            }
          }]
        });
      }

      // --- 每日趋势数据 ---
      var labels = dateLabels(currentRange);
      var dailyUploads = new Array(currentRange).fill(0);
      var dailyDownloads = new Array(currentRange).fill(0);
      var dailyUsers = new Array(currentRange).fill(0);
      var dailyUserSets = new Array(currentRange).fill(null).map(function() { return new Set(); });
      var todayActive = 0;

      var d = new Date();
      var rangeStartDate = new Date(d);
      rangeStartDate.setHours(0,0,0,0);
      rangeStartDate.setDate(rangeStartDate.getDate() - currentRange + 1);

      effectiveEvents.forEach(function(e) {
        var ed = e.created_at ? analyticsDateKey(e.created_at) : '';
        if (!ed) return;
        var idx = analyticsDayIndex(e.created_at, rangeStartDate);
        if (idx < 0 || idx >= currentRange) return;
        var cat = eventCategory(e.event_type);
        if (cat === 'upload') dailyUploads[idx]++;
        if (cat === 'download') dailyDownloads[idx]++;
        if (dailyUserSets[idx]) dailyUserSets[idx].add(e.actor_id);
        if (ed === todayStr) todayActive++;
      });
      var dailyUserCounts = dailyUserSets.map(function(s) { return s ? s.size : 0; });

      // --- 上传 vs 下载趋势 ---
      if (charts.uploadDownload) charts.uploadDownload.destroy();
      var udCtx = document.getElementById('ana-upload-download');
      if (udCtx) {
        charts.uploadDownload = new Chart(udCtx.getContext('2d'), {
          type: 'line', data: { labels: labels, datasets: [
            { label: zh ? '上传' : 'Uploads', data: dailyUploads, borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.08)', fill: true, tension: 0, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#0d9488' },
            { label: zh ? '下载' : 'Downloads', data: dailyDownloads, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#3b82f6' }
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 }, color: '#64748b' } } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- 用户活跃度趋势 ---
      if (charts.line) charts.line.destroy();
      var lCtx = document.getElementById('ana-line');
      if (lCtx) {
        charts.line = new Chart(lCtx.getContext('2d'), {
          type: 'line', data: { labels: labels, datasets: [{ data: dailyUserCounts, borderColor: '#0d9488', backgroundColor: 'rgba(13,148,136,0.1)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#0d9488' }] },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- 素材总量趋势 ---
      if (charts.assetGrowth) charts.assetGrowth.destroy();
      var agCtx = document.getElementById('ana-asset-growth');
      if (agCtx && data && data.assetGrowth && data.assetGrowth.labels.length) {
        var ag = data.assetGrowth;
        charts.assetGrowth = new Chart(agCtx.getContext('2d'), {
          type: 'line', data: { labels: ag.labels, datasets: [
            { label: zh ? '案例库' : 'Case', data: ag.source, borderColor: '#3b82f6', borderDash: [5,3], fill: false, tension: 0, borderWidth: 2, pointRadius: 2 },
            { label: zh ? '图库' : 'Gallery', data: ag.gallery, borderColor: '#f59e0b', borderDash: [5,3], fill: false, tension: 0, borderWidth: 2, pointRadius: 2 },
            { label: zh ? '模版库' : 'Template', data: ag.template, borderColor: '#8b5cf6', borderDash: [5,3], fill: false, tension: 0, borderWidth: 2, pointRadius: 2 },
            { label: zh ? '总量' : 'Total', data: ag.total, borderColor: '#0d9488', fill: false, tension: 0, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#0d9488' }
          ]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 12, padding: 18, font: { size: 11 }, color: '#64748b' } } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- 操作时段分布 ---
      var hourCounts = new Array(8).fill(0);
      var hourLabels = ['0-3', '3-6', '6-9', '9-12', '12-15', '15-18', '18-21', '21-24'];
      effectiveEvents.forEach(function(e) {
        var h = e.created_at ? new Date(e.created_at).getHours() : -1;
        if (h >= 0) { var slot = Math.floor(h / 3); if (slot < 8) hourCounts[slot]++; }
      });
      var maxHourIdx = hourCounts.indexOf(Math.max.apply(null, hourCounts));
      document.getElementById('ana-peak-hour').textContent = hourLabels[maxHourIdx] + (zh ? '时' : '');

      if (charts.peakHours) charts.peakHours.destroy();
      var phCtx = document.getElementById('ana-peak-hours');
      if (phCtx) {
        charts.peakHours = new Chart(phCtx.getContext('2d'), {
          type: 'bar', data: { labels: hourLabels, datasets: [{ data: hourCounts, backgroundColor: 'rgba(13,148,136,0.25)', borderColor: '#0d9488', borderWidth: 1, borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8' } } }
          }
        });
      }

      // --- Top 10 表格（异步：需要签名缩略图）---
      await renderTop10Table();

      // --- 最近操作动态 ---
      renderActivityFeed();
    }

    // ===== 热门素材 Top 10 =====
    async function renderTop10Table() {
      var tbody = document.getElementById('ana-top10-body');
      if (!tbody) return;
      var request = ++top10Request;
      // 确保 library options 已加载（用于显示国家/活动标签）
      if (!state.libraryOptions || !state.libraryOptions.length) {
        try { await loadLibraryOptions(); } catch(e) { /* 静默 */ }
      }
      var data = fetchedData;
      var events = (data && data.events) ? data.events : [];
      var effectiveEvents = excludeAdmin ? events.filter(function(e) { return !analyticsIsAdmin(e, data && data.accounts); }) : events;

      // 按素材聚合
      var assetMap = {};
      effectiveEvents.forEach(function(e) {
        var sid = e.source_file_id;
        if (!sid) return;
        var cat = eventCategory(e.event_type);
        if (!['download', 'view', 'diy'].includes(cat)) return;
        if (!assetMap[sid]) assetMap[sid] = { downloads: 0, views: 0, uses: 0, accounts: Object.create(null) };
        var accountKey = analyticsAccountKey(e);
        var account = assetMap[sid].accounts[accountKey] = assetMap[sid].accounts[accountKey] || { name: analyticsAccountName(e, data.accounts), downloads: 0, views: 0, uses: 0 };
        if (cat === 'download') account.downloads++;
        if (cat === 'view') account.views++;
        if (cat === 'diy') account.uses++;
        if (cat === 'download') assetMap[sid].downloads++;
        if (cat === 'view') assetMap[sid].views++;
        if (cat === 'diy') assetMap[sid].uses++;
      });

      // 关联源文件信息
      var sources = data && data.sources ? data.sources : [];
      var sourceMap = {};
      sources.forEach(function(s) { sourceMap[s.id] = s; });

      // 素材类型判断
      function itemKind(src) {
        var tags = src.tags || [];
        if (tags.indexOf('vf:kind:gallery') !== -1) return 'gallery';
        if (tags.indexOf('vf:kind:template') !== -1) return 'template';
        if (tags.indexOf('vf:kind:source') !== -1) return 'source';
        var ext = (src.source_ext || '').toLowerCase();
        var imgExts = ['jpg','jpeg','png','gif','webp','bmp','svg','tiff','psd','ai','eps','heic','heif'];
        if (imgExts.indexOf(ext) !== -1) return 'gallery';
        if (ext === 'json') return 'template';
        return 'source';
      }

      var list = [];
      Object.keys(assetMap).forEach(function(sid) {
        var src = sourceMap[sid] || {};
        var kind = itemKind(src);
        var tags = src.tags || [];
        var kindMarkers = ['vf:kind:gallery', 'vf:kind:template', 'vf:kind:source'];
        var displayTags = tags.filter(function(t) { return typeof t === 'string' && !t.startsWith('vf:'); });
        var countryName = optionNameById(src.country_id);
        var activityName = optionNameById(src.activity_id);
        if (countryName && countryName !== '-') displayTags.push(countryName);
        if (activityName && activityName !== '-') displayTags.push(activityName);
        list.push({
          id: sid, title: src.title || '', filename: src.source_filename || '',
          kind: kind, sourcePath: src.source_path || '',
          downloads: assetMap[sid].downloads, views: assetMap[sid].views, uses: assetMap[sid].uses,
          score: assetMap[sid].downloads + assetMap[sid].uses,
          tags: Array.from(new Set(displayTags)), accounts: assetMap[sid].accounts
        });
      });

      var filtered = top10Cat === 'all' ? list : list.filter(function(item) { return item.kind === top10Cat; });
      filtered.sort(function(a, b) { return b.score - a.score || b.views - a.views || a.id.localeCompare(b.id); });
      filtered = filtered.slice(0, 10);

      var mediaById = await loadAnalyticsMedia(filtered, sourceMap);

      if (request !== top10Request || data !== fetchedData || !tbody.isConnected) return;
      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="ana-empty">' + (zh ? '暂无数据' : 'No data yet') + '</td></tr>';
        return;
      }

      closeAnalyticsPreview();
      tbody.innerHTML = filtered.map(function(item, i) {
        var rankCls = i < 3 ? 'ana-rank top' : 'ana-rank';
        var name = escapeHtml(item.title || item.filename || '?');
        var media = mediaById[item.id] || {};
        var thumbHtml = '<button type="button" class="ana-preview-trigger" data-source-id="' + escapeAttr(item.id) + '" aria-label="' + escapeAttr((zh ? '预览并定位 ' : 'Preview and locate ') + (item.title || item.filename || '')) + '">' +
          (media.thumbUrl ? '<img class="ana-thumb-img" src="' + escapeAttr(media.thumbUrl) + '" alt="" loading="lazy">' : '▧') + '</button>';
        var subText = item.tags.length ? item.tags.join(' · ') : '';
        var accountDetails = '<details class="ana-account-detail"><summary>' + (zh ? '按账号查看' : 'By account') + '</summary>' + Object.values(item.accounts).map(function(account) { return '<div class="muted">' + escapeHtml(account.name) + ' · ' + (zh ? '下载 ' : 'Downloads ') + account.downloads + ' / ' + (zh ? '查看 ' : 'Views ') + account.views + ' / ' + (zh ? '使用 ' : 'Uses ') + account.uses + '</div>'; }).join('') + '</details>';
        return '<tr style="cursor:pointer" data-source-id="' + item.id + '">' +
          '<td><span class="' + rankCls + '">' + (i + 1) + '</span></td>' +
          '<td><div class="ana-thumb-cell">' + thumbHtml + '<div><div class="ana-thumb-name">' + name + '</div>' + (subText ? '<div class="ana-thumb-file">' + escapeHtml(subText) + '</div>' : '') + accountDetails + '</div></div></td>' +
          '<td><span class="ana-stat">' + item.downloads + '</span></td>' +
          '<td><span class="ana-stat">' + item.views + '</span></td>' +
          '<td><span class="ana-stat">' + item.uses + '</span></td>' +
          '</tr>';
      }).join('');
      wireAnalyticsPreviews(tbody, mediaById, sourceMap);
    }

    // ===== 最近操作动态 =====
    function renderActivityFeed() {
      var list = document.getElementById('ana-activity-list');
      if (!list) return;
      var data = fetchedData;
      var events = data ? data.events.concat(data.imagegenEvents).sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); }) : [];
      var effectiveEvents = excludeAdmin ? events.filter(function(e) { return !analyticsIsAdmin(e, data && data.accounts); }) : events;

      var recent = effectiveEvents.slice(0, 100);
      if (!recent.length) {
        list.innerHTML = '<div class="ana-empty">' + (zh ? '暂无操作记录' : 'No activity yet') + '</div>';
        return;
      }

      var sources = data && data.sources ? data.sources : [];
      var sourceMap = {};
      sources.forEach(function(s) { sourceMap[s.id] = s; });

      var actionLabels = {
        upload: zh ? '上传了' : 'uploaded',
        download_preview: zh ? '下载了' : 'downloaded', download_source: zh ? '下载了' : 'downloaded', batch_download: zh ? '批量下载了' : 'batch-downloaded',
        view: zh ? '查看了' : 'viewed',
        favorite: zh ? '收藏了' : 'favorited',
        edit: zh ? '编辑了' : 'edited', batch_edit: zh ? '批量编辑了' : 'batch-edited',
        delete: zh ? '删除了' : 'deleted', batch_delete: zh ? '批量删除了' : 'batch-deleted',
        use_static: zh ? '使用了' : 'used', use_dynamic: zh ? '使用了' : 'used', use_template: zh ? '使用了' : 'used',
        imagegen: zh ? '生成了图片' : 'generated an image',
        login: zh ? '登录了' : 'logged in'
      };
      var actionColors = { upload: '#10b981', download_preview: '#3b82f6', download_source: '#3b82f6', batch_download: '#3b82f6', view: '#8b5cf6', favorite: '#f59e0b', edit: '#06b6d4', batch_edit: '#06b6d4', delete: '#ef4444', batch_delete: '#ef4444', use_static: '#0d9488', use_dynamic: '#0d9488', use_template: '#0d9488', login: '#64748b' };

      list.innerHTML = recent.map(function(e) {
        var src = (e.source_file_id && sourceMap[e.source_file_id]) ? sourceMap[e.source_file_id] : null;
        var assetName = src ? (src.title || src.source_filename || '?') : '';
        var action = actionLabels[e.event_type] || e.event_type;
        var color = actionColors[e.event_type] || '#64748b';
        var accountName = analyticsAccountName(e, data.accounts);
        var initial = escapeHtml(accountName.charAt(0).toUpperCase());
        return '<div class="ana-activity-item">' +
          '<div class="ana-activity-avatar">' + initial + '</div>' +
          '<div class="ana-activity-body"><div class="ana-activity-text"><span class="u">' + escapeHtml(accountName) + '</span> <span class="a" style="color:' + color + '">' + action + '</span>' + (assetName ? ' <span class="m">' + escapeHtml(assetName) + '</span>' : '') + '</div></div>' +
          '<div class="ana-activity-time">' + relativeTime(e.created_at) + '</div>' +
          '</div>';
      }).join('');
    }

    // ===== 事件绑定 =====
    function bindEvents() {
      // 时间范围切换
      document.querySelectorAll('#ana-range-btns .ana-filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          document.querySelectorAll('#ana-range-btns .ana-filter-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          currentRange = parseInt(btn.dataset.range) || 7;
          destroyCharts();
          renderAll();
        });
      });

      // 管理员开关
      var toggle = document.getElementById('ana-toggle-admin');
      if (toggle) {
        toggle.addEventListener('click', function() {
          toggle.classList.toggle('active');
          excludeAdmin = toggle.classList.contains('active');
          destroyCharts();
          renderAll();
        });
      }

      // 生图按账号积分折叠
      var genFold = document.getElementById('ana-gen-fold');
      if (genFold) {
        genFold.addEventListener('click', function() {
          var detail = document.getElementById('ana-gen-detail');
          if (!detail) return;
          var willOpen = detail.hidden;
          detail.hidden = !willOpen;
          genFold.classList.toggle('open', willOpen);
        });
      }

      // 热门素材分类 tab
      document.querySelectorAll('#ana-cat-tabs .ana-cat-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          document.querySelectorAll('#ana-cat-tabs .ana-cat-tab').forEach(function(t) { t.classList.remove('active'); });
          tab.classList.add('active');
          top10Cat = tab.dataset.cat || 'all';
          renderTop10Table();
        });
      });

      // 热门素材点击跳转
      var top10Body = document.getElementById('ana-top10-body');
      if (top10Body) {
        top10Body.addEventListener('click', function(e) {
          if (e.target.closest('details')) return;
          var row = e.target.closest('tr[data-source-id]');
          if (!row) return;
          const source = fetchedData?.sources.find(function(item) { return item.id === row.dataset.sourceId; });
          if (!source) { showCaseToast(zh ? '该物料已移除。' : 'This item was removed.'); return; }
          prepareLibrarySourceLocation(source);
          navigate('library');
        });
      }

      // 清除测试数据
      var clearBtn = document.getElementById('ana-btn-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', async function() {
          if (!confirm(zh ? '确定删除当前时间范围内你的所有操作记录？此操作不可恢复。' : 'Delete all your event records in this date range? This cannot be undone.')) return;
          if (!state.supabase) return;
          var startDate = new Date();
          startDate.setHours(0,0,0,0);
          startDate.setDate(startDate.getDate() - currentRange + 1);
          try {
            var { error } = await state.supabase.from('vf_asset_events')
              .delete()
              .eq('actor_id', state.session.user.id)
              .gte('created_at', startDate.toISOString());
            if (error) throw error;
            destroyCharts();
            await renderAll();
          } catch(e) {
            alert(e.message || 'Clear failed');
          }
        });
      }
    }

    // ===== 初始化 =====
    destroyCharts();
    await renderAll();
    bindEvents();
  }

  // ── 团队管理页：使用者名单区块（v666）──
  // 挂在账号面板渲染结果后面（不改 public/account-access.js，保住它的现有单测）。
  function patchAccountPanelForTeamRoster() {
    const accountAccess = window.VFAccountAccess;
    if (!accountAccess || typeof accountAccess.renderPanel !== 'function' || accountAccess.__vfTeamRosterPatched) return;
    const original = accountAccess.renderPanel.bind(accountAccess);
    // finally：不管账号面板渲染成功还是自己走了错误态，都补挂一次（失败也不影响调用方拿到原来的结果/错误）
    accountAccess.renderPanel = function(container) {
      return Promise.resolve(original(container))
        .finally(function() { return mountTeamRosterSection(container); })
        .finally(function() { applyAdminPanelFolds(container); });
    };
    accountAccess.__vfTeamRosterPatched = true;
  }

  // 账号面板在「重试」「退出维护」等路径上会自己重绘整块 #content，把补挂的区块抹掉。
  // 不改进 account-access.js，改用 MutationObserver：区块不在就补上。
  let teamRosterObserver = null;
  let teamRosterMounting = false;
  let teamRosterLastLoadAt = 0;
  let teamRosterLastError = null;   // 最近一次读取失败的原始错误：用来在提示里说明具体原因
  let teamRosterPendingLocal = [];  // 本机新增、还没进服务端的条目（服务端名单可用时提示一键导入，避免被静默覆盖）
  // 正在填写的表单内容：区块万一被重绘（账号面板自己重绘 / 自动刷新）也不丢用户输入
  let teamRosterFormDraft = { name_zh: '', name_en: '', daxiang_id: '' };

  function ensureTeamRosterSection(container) {
    if (!container || teamRosterMounting || state.route !== 'admin') return;
    const page = container.querySelector('.panel-page');
    if (!page || page.querySelector('#team-roster-section')) return;
    teamRosterMounting = true;
    const section = document.createElement('section');
    section.id = 'team-roster-section';
    section.className = 'panel team-roster-section';
    page.append(section);
    Promise.resolve()
      .then(function() { return renderTeamRosterSection(section); })
      .catch(function(error) {
        section.remove();
        console.warn('[team-roster] render failed:', error);
      })
      .then(function() { teamRosterMounting = false; });
  }

  // 自动刷新（回到页面/切回标签页）只更新列表与提示，**不重绘整个区块**，
  // 否则正在填的中文名/英文名/大象编号会被清空（用户反馈过的 bug）。
  function refreshTeamRosterData(options) {
    const force = !!(options && options.force);
    if (state.route !== 'admin') return;
    const section = document.getElementById('team-roster-section');
    if (!section) return;
    // 正在输入（表单或行内编辑）时绝不刷新，别打断用户
    const active = document.activeElement;
    if (!force && active && section.contains(active) && active.tagName === 'INPUT') return;
    // 冷却：短时间内反复 focus/visibilitychange 不重复请求
    if (!force && Date.now() - teamRosterLastLoadAt < 15000) return;
    const list = section.querySelector('#team-roster-list');
    const hint = section.querySelector('#team-roster-hint');
    const message = section.querySelector('#team-roster-message');
    const zh = state.lang === 'zh';
    const hintText = teamRosterHintText();;
    loadTeamMembers().then(function() {
      if (list) list.innerHTML = teamRosterRowsMarkup();
      renderTeamRosterPending(section, !window.VFAccountAccess?.enabled || !!window.VFAccountAccess.maintenance());
      if (hint) {
        hint.hidden = teamMembersTableReady;
        hint.textContent = teamMembersTableReady ? '' : hintText;
      }
      if (message && !message.textContent) message.textContent = '';
    }).catch(function(error) {
      if (message) message.textContent = teamRosterErrorText(error);
    });
  }

  function mountTeamRosterSection(container) {
    if (!container) return Promise.resolve();
    if (!teamRosterObserver && typeof MutationObserver === 'function') {
      teamRosterObserver = new MutationObserver(function() {
        ensureTeamRosterSection(container);
        ensureMaterialCatalogSection(container);
        applyAdminPanelFolds(container);
      });
      teamRosterObserver.observe(container, { childList: true, subtree: true });
    }
    // 回到页面 / 切换标签页回来时自动重拉名单与清单，不用手点「刷新」
    if (!window.__vfTeamRosterWatch) {
      window.__vfTeamRosterWatch = true;
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') { refreshTeamRosterData(); refreshMaterialCatalogData(); }
      });
      window.addEventListener('focus', function() { refreshTeamRosterData(); refreshMaterialCatalogData(); });
    }
    ensureTeamRosterSection(container);
    ensureMaterialCatalogSection(container);
    return Promise.resolve();
  }

  // ── 团队管理折叠：账号管理 / 使用者名单 / 物料清单（v705/v707）开始 ──
  // 面板结构由 account-access.js 生成，这里只做补挂；折叠状态存 localStorage。
  const panelFoldKeys = { accounts: 'vf_admin_fold_accounts', roster: 'vf_admin_fold_roster', catalog: 'vf_admin_fold_catalog' };

  function readPanelFold(key) {
    try { return localStorage.getItem(panelFoldKeys[key]) === '1'; } catch (_) { return false; }
  }
  function savePanelFold(key, folded) {
    try { folded ? localStorage.setItem(panelFoldKeys[key], '1') : localStorage.removeItem(panelFoldKeys[key]); } catch (_) {}
  }
  function applyPanelFold(section, key) {
    if (!section || section.dataset.vfFold) return;
    const head = section.querySelector(':scope > .account-panel-head');
    if (!head) return;
    section.dataset.vfFold = key;
    const zh = state.lang === 'zh';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'panel-fold-toggle';
    toggle.innerHTML = '<span class="panel-fold-caret" aria-hidden="true"></span>';
    const sync = function() {
      const folded = section.classList.contains('panel-collapsed');
      toggle.setAttribute('aria-expanded', folded ? 'false' : 'true');
      toggle.setAttribute('aria-label', zh ? (folded ? '展开' : '折叠') : (folded ? 'Expand' : 'Collapse'));
      toggle.title = toggle.getAttribute('aria-label');
    };
    const setFolded = function(folded) {
      section.classList.toggle('panel-collapsed', folded);
      savePanelFold(key, folded);
      sync();
    };
    const flip = function() { setFolded(!section.classList.contains('panel-collapsed')); };
    (head.querySelector('.account-row-actions') || head).append(toggle);
    toggle.addEventListener('click', flip);
    // 点标题区域折叠；按钮/链接/输入保持原行为
    head.addEventListener('click', function(event) {
      if (event.target.closest('button, a, input, select, label')) return;
      flip();
    });
    if (readPanelFold(key)) section.classList.add('panel-collapsed');
    sync();
  }
  function applyAdminPanelFolds(container) {
    if (!container || state.route !== 'admin') return;
    applyPanelFold(container.querySelector('.account-management > section.panel:not(#team-roster-section):not(#material-catalog-section)'), 'accounts');
    applyPanelFold(container.querySelector('#team-roster-section'), 'roster');
    applyPanelFold(container.querySelector('#material-catalog-section'), 'catalog');
  }
  // ── 团队管理折叠：账号管理 / 使用者名单 / 物料清单（v705/v707）结束 ──

  function teamRosterRowsMarkup() {
    const members = teamMembersCache.map(normalizeTeamMember).filter(m => m.name_zh || m.name_en);
    if (!members.length) {
      return `<tr><td colspan="4" class="team-roster-empty">${state.lang === 'zh' ? '还没有使用者，先在下面添加。' : 'No members yet.'}</td></tr>`;
    }
    return members.map(function(member) {
      const manageActions = (!window.VFAccountAccess?.enabled || window.VFAccountAccess.maintenance())
        ? `<div class="team-roster-actions">
          <button type="button" class="ghost-btn" data-team-edit>${state.lang === 'zh' ? '编辑' : 'Edit'}</button>
          <button type="button" class="ghost-btn danger" data-team-delete>${state.lang === 'zh' ? '删除' : 'Delete'}</button>
        </div>`
        : `<span class="muted">${state.lang === 'zh' ? '只读' : 'Read-only'}</span>`;
      const dash = '<span class="team-roster-missing">—</span>';
      return `<tr data-team-member="${escapeAttr(member.id)}">
        <td class="team-roster-name">${member.name_zh ? escapeHtml(member.name_zh) : dash}</td>
        <td class="team-roster-name-en">${member.name_en ? escapeHtml(member.name_en) : dash}</td>
        <td class="team-roster-id">${member.daxiang_id ? escapeHtml(member.daxiang_id) : `<span class="team-roster-missing">${state.lang === 'zh' ? '未登记' : 'none'}</span>`}</td>
        <td>${manageActions}</td>
      </tr>`;
    }).join('');
  }

  // 「本机还有 N 条未上传」提示：本机独有条目要等 loadTeamMembers 之后才知道，所以单独抽出来反复调用
  function renderTeamRosterPending(section, canEditRoster) {
    const slot = section && section.querySelector('#team-roster-pending-slot');
    if (!slot) return;
    const zh = state.lang === 'zh';
    if (!canEditRoster || !teamRosterPendingLocal.length) { slot.innerHTML = ''; return; }
    slot.innerHTML = `<div class="team-roster-pending">
      <span>${zh ? `本机还有 ${teamRosterPendingLocal.length} 条未上传的使用者：` : `${teamRosterPendingLocal.length} local-only member(s): `}${teamRosterPendingLocal.map(m => escapeHtml(teamMemberDisplayName(m))).join('、')}</span>
      <button type="button" class="ghost-btn" id="team-roster-import">${zh ? '导入到团队名单' : 'Import'}</button>
    </div>`;
  }

  async function renderTeamRosterSection(section) {
    if (!section) return;
    const zh = state.lang === 'zh';
    // 服务端策略：读名单所有账号都行，写名单需要开发者维护权限
    const canEditRoster = !window.VFAccountAccess?.enabled || !!window.VFAccountAccess.maintenance();
    section.innerHTML = `
      <div class="account-panel-head">
        <div>
          <h3>${zh ? '使用者名单' : 'Team members'}</h3>
          <p class="muted">${zh
            ? '上传素材时「物料所有者」的联想候选。姓名用于展示与检索；大象编号是唯一标识，「联系所有者」复制的就是它。'
            : 'Feeds the material-owner suggestions. Name is for display/search; the Daxiang ID is what 联系所有者 copies.'}</p>
        </div>
        <div class="account-row-actions">
          <button class="ghost-btn" id="team-roster-refresh" type="button">${zh ? '刷新' : 'Refresh'}</button>
        </div>
      </div>
      ${canEditRoster ? `<form id="team-roster-form" class="team-roster-form">
        <label><span>${zh ? '中文名' : 'Chinese name'}</span><input name="name_zh" maxlength="40" autocomplete="off" value="${escapeAttr(teamRosterFormDraft.name_zh)}" placeholder="${zh ? '例如：王新泽' : 'e.g. 王新泽'}"></label>
        <label><span>${zh ? '英文名' : 'English name'}</span><input name="name_en" maxlength="60" autocomplete="off" value="${escapeAttr(teamRosterFormDraft.name_en)}" placeholder="${zh ? '例如：Wang Xinze' : 'e.g. Wang Xinze'}"></label>
        <label><span>${zh ? '大象编号' : 'Daxiang ID'}</span><input name="daxiang_id" maxlength="60" autocomplete="off" value="${escapeAttr(teamRosterFormDraft.daxiang_id)}" placeholder="${zh ? '例如：wb_wangxinze02' : 'e.g. wb_wangxinze02'}"></label>
        <button class="primary-btn" type="submit">${zh ? '添加使用者' : 'Add member'}</button>
        <span class="team-roster-tip">${zh ? '中文名和英文名至少填一个' : 'Fill at least one name'}</span>
      </form>` : `<p class="muted team-roster-readonly">${zh ? '当前是只读：名单可由所有人用于上传联想，编辑需要「开发者维护」权限。' : 'Read-only: editing requires developer maintenance mode.'}</p>`}
      <div id="team-roster-pending-slot"></div>
      <p class="team-roster-hint" id="team-roster-hint" hidden></p>
      <div class="message" id="team-roster-message" role="status"></div>
      <div class="account-table-wrap">
        <table class="table">
          <thead><tr><th>${zh ? '中文名' : 'Chinese name'}</th><th>${zh ? '英文名' : 'English name'}</th><th>${zh ? '大象编号' : 'Daxiang ID'}</th><th>${zh ? '操作' : 'Actions'}</th></tr></thead>
          <tbody id="team-roster-list">${teamRosterRowsMarkup()}</tbody>
        </table>
      </div>`;

    const list = section.querySelector('#team-roster-list');
    const message = section.querySelector('#team-roster-message');
    const hint = section.querySelector('#team-roster-hint');
    const form = section.querySelector('#team-roster-form');
    const refreshBtn = section.querySelector('#team-roster-refresh');
    const say = (text, isError) => {
      if (!message) return;
      message.textContent = text || '';
      message.classList.toggle('error', !!isError);
    };
    const repaintList = () => { if (list) list.innerHTML = teamRosterRowsMarkup(); };

    repaintList();
    if (hint) {
      hint.hidden = teamMembersTableReady;
      hint.textContent = teamMembersTableReady ? '' : teamRosterHintText();
    }

    form?.querySelectorAll('input').forEach(function(field) {
      field.addEventListener('input', function() { teamRosterFormDraft[field.name] = field.value; });
    });
    form?.addEventListener('submit', function(event) {
      event.preventDefault();
      const data = new FormData(form);
      const nameZh = String(data.get('name_zh') || '').trim();
      const nameEn = String(data.get('name_en') || '').trim();
      const daxiangId = String(data.get('daxiang_id') || '').trim();
      if (!nameZh && !nameEn) { say(zh ? '中文名和英文名至少填一个。' : 'Fill at least one name.', true); return; }
      say(zh ? '正在保存…' : 'Saving…');
      addTeamMember(nameZh, nameEn, daxiangId).then(function() {
        teamRosterFormDraft = { name_zh: '', name_en: '', daxiang_id: '' };
        form.reset();
        repaintList();
        say(zh ? '已添加。' : 'Added.');
      }).catch(function(error) { say(teamRosterErrorText(error), true); });
    });

    list?.addEventListener('click', function(event) {
      const row = event.target.closest('[data-team-member]');
      if (!row) return;
      const id = row.getAttribute('data-team-member');
      const member = teamMembersCache.map(normalizeTeamMember).find(m => String(m.id) === String(id));
      if (!member) return;
      if (event.target.closest('[data-team-delete]')) {
        const label = teamMemberDisplayName(member);
        if (!confirm(zh ? `删除使用者「${label}」？` : `Delete ${label}?`)) return;
        deleteTeamMember(id).then(function() {
          repaintList();
          say(zh ? '已删除。' : 'Deleted.');
        }).catch(function(error) { say(teamRosterErrorText(error), true); });
        return;
      }
      if (!event.target.closest('[data-team-edit]')) return;
      // 行内编辑：姓名 / 大象编号
      row.innerHTML = `<td><input class="team-roster-inline-input" data-team-name-zh maxlength="40" value="${escapeAttr(member.name_zh)}"></td>
        <td><input class="team-roster-inline-input" data-team-name-en maxlength="60" value="${escapeAttr(member.name_en)}"></td>
        <td><input class="team-roster-inline-input" data-team-id maxlength="60" value="${escapeAttr(member.daxiang_id)}"></td>
        <td><div class="team-roster-actions">
          <button type="button" class="ghost-btn" data-team-save>${zh ? '保存' : 'Save'}</button>
          <button type="button" class="ghost-btn" data-team-cancel>${zh ? '取消' : 'Cancel'}</button>
        </div></td>`;
      row.querySelector('[data-team-name-zh]')?.focus();
    });

    list?.addEventListener('click', function(event) {
      const row = event.target.closest('[data-team-member]');
      if (!row) return;
      const id = row.getAttribute('data-team-member');
      if (event.target.closest('[data-team-cancel]')) { repaintList(); return; }
      if (!event.target.closest('[data-team-save]')) return;
      const nameZh = String(row.querySelector('[data-team-name-zh]')?.value || '').trim();
      const nameEn = String(row.querySelector('[data-team-name-en]')?.value || '').trim();
      const daxiangId = String(row.querySelector('[data-team-id]')?.value || '').trim();
      if (!nameZh && !nameEn) { say(zh ? '中文名和英文名至少填一个。' : 'Fill at least one name.', true); return; }
      updateTeamMember(id, nameZh, nameEn, daxiangId).then(function() {
        repaintList();
        say(zh ? '已保存。' : 'Saved.');
      }).catch(function(error) { say(teamRosterErrorText(error), true); });
    });

    // 先把数据拉一次再刷新列表；事件绑定已在上面完成，不受这次 await 影响
    loadTeamMembers()
      .then(function() {
        repaintList();
        renderTeamRosterPending(section, canEditRoster);
        if (hint) {
          hint.hidden = teamMembersTableReady;
          hint.textContent = teamMembersTableReady ? '' : teamRosterHintText();
        }
      })
      .catch(function(error) { say(teamRosterErrorText(error), true); });

    // 导入按钮用委托：提示区会被重建，直接绑定会失效
    section.addEventListener('click', function(event) {
      if (!event.target.closest('#team-roster-import')) return;
      const pending = teamRosterPendingLocal.slice();
      if (!pending.length) return;
      say(zh ? '正在导入…' : 'Importing…');
      Promise.all(pending.map(function(member) {
        return addTeamMember(member.name_zh, member.name_en, member.daxiang_id).catch(function() { return null; });
      })).then(function() {
        teamRosterPendingLocal = [];
        return renderTeamRosterSection(section);
      }).catch(function(error) { say(teamRosterErrorText(error), true); });
    });

    refreshBtn?.addEventListener('click', function() {
      say(zh ? '正在刷新…' : 'Refreshing…');
      loadTeamMembers().then(function() {
        repaintList();
        renderTeamRosterPending(section, canEditRoster);
        if (hint) {
          hint.hidden = teamMembersTableReady;
          hint.textContent = teamMembersTableReady ? '' : teamRosterHintText();
        }
        say(zh ? '已刷新。' : 'Refreshed.');
      }).catch(function(error) { say(teamRosterErrorText(error), true); });
    });
  }

  // ── 物料清单区块（v707）──
  // 挂在团队管理页使用者名单下面；数据逻辑在上面的「物料清单（v707）」区块里。
  let materialCatalogMounting = false;

  function materialCatalogCanEdit() {
    return !window.VFAccountAccess?.enabled || !!window.VFAccountAccess.maintenance();
  }

  function ensureMaterialCatalogSection(container) {
    if (!container || materialCatalogMounting || state.route !== 'admin') return;
    const page = container.querySelector('.panel-page');
    if (!page || page.querySelector('#material-catalog-section')) return;
    materialCatalogMounting = true;
    const section = document.createElement('section');
    section.id = 'material-catalog-section';
    section.className = 'panel material-catalog-section';
    const rosterSection = page.querySelector('#team-roster-section');
    if (rosterSection) rosterSection.insertAdjacentElement('afterend', section);
    else page.append(section);
    Promise.resolve()
      .then(function() { return renderMaterialCatalogSection(section); })
      .catch(function(error) {
        section.remove();
        console.warn('[material-catalog] render failed:', error);
      })
      .then(function() { materialCatalogMounting = false; });
  }

  // 自动刷新（回到页面/切回标签页）只更新列表与提示，不重绘整个区块，避免打断正在填的输入
  function refreshMaterialCatalogData(options) {
    const force = !!(options && options.force);
    if (state.route !== 'admin') return;
    const section = document.getElementById('material-catalog-section');
    if (!section) return;
    // 正在编辑就别重绘：切窗口/切标签回来会触发自动重拉（window focus / visibilitychange），
    // 重绘会把「新增子类别」的临时行和就地编辑器一起抹掉——用户会看到「写着写着突然关闭」。
    // 注意不能只看 document.activeElement：focus 事件触发时焦点往往还没落到输入框上。
    const isEditing = function() {
      const active = document.activeElement;
      if (active && section.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return true;
      if (section.querySelector('[data-material-new-row]')) return true;
      if (section.querySelector('.material-catalog-table input, .material-catalog-cat-head input')) return true;
      if (document.querySelector('.material-catalog-dim-pop')) return true;
      return false;
    };
    if (!force && isEditing()) return;
    if (!force && Date.now() - materialCatalogLastLoadAt < 15000) return;
    const canEdit = materialCatalogCanEdit();
    const body = section.querySelector('#material-catalog-body');
    const hint = section.querySelector('#material-catalog-hint');
    const message = section.querySelector('#material-catalog-message');
    loadMaterialCatalog().then(function() {
      if (body) body.innerHTML = materialCatalogBodyMarkup(canEdit);
      renderMaterialCatalogPending(section, canEdit);
      if (hint) {
        hint.hidden = materialCatalogTableReady;
        hint.textContent = materialCatalogTableReady ? '' : materialCatalogHintText();
      }
      if (message && !message.textContent) message.textContent = '';
    }).catch(function(error) {
      if (message) message.textContent = materialCatalogErrorText(error);
    });
  }

  // 单个尺寸的编辑控件：(W) [数字] × (H) [数字] + 「高不固定」开关 + 百分比区间（勾了高不固定才出现）
  // v860：百分比区间改符号下拉——用户建议「大于小于号的下拉菜单」：
  // 下拉四选「不限 / ≤（不超过） / ≥（不低于） / ~（介于）」，选中后填纯数字，连读是完整句子；不再手打 ≤、~ 符号
  // attrs 里给出属性名：w / h / wild / bandOp / bandMin / bandMax
  function materialCatalogDimensionMarkup(value, attrs) {
    const zh = state.lang === 'zh';
    const names = attrs || { w: 'data-material-dim-w', h: 'data-material-dim-h', wild: 'data-material-dim-wild', bandOp: 'data-material-dim-band-op', bandMin: 'data-material-dim-band-min', bandMax: 'data-material-dim-band-max' };
    const text = String(value || '').trim();
    const spec = parseMaterialSizeSpec(text);
    const width = spec && spec.width != null ? (spec.widthMax != null ? spec.width + '~' + spec.widthMax : String(spec.width)) : '';
    const wildcard = !!spec && spec.height == null;
    const height = (spec && spec.height != null)
      ? (spec.heightMax != null ? spec.height + '~' + spec.heightMax : String(spec.height))
      : '';
    const bandMode = spec ? (spec.bandMin != null ? (spec.bandMax != null ? 'range' : 'floor') : (spec.bandMax != null ? 'cap' : '')) : '';
    const bandCap = spec && spec.bandMax != null ? String(spec.bandMax) : '';
    const bandMin = spec && spec.bandMin != null ? String(spec.bandMin) : '';
    const bandMax = spec && spec.bandMax != null ? String(spec.bandMax) : '';
    const capOn = bandMode === 'cap';
    const floorOn = bandMode === 'floor';
    const rangeOn = bandMode === 'range';
    const bandOn = capOn || floorOn || rangeOn;
    const bandTitle = zh ? '高占宽的百分比，选「不限」= 高完全不限；配了范围可以不填宽 = 宽不限' : 'Height as % of width; pick "any" = any height';
    return `<span class="material-catalog-dim${wildcard ? ' is-wild' : ''}" data-material-dim>
      <span class="material-catalog-dim-field"><i>(W)</i><input class="team-roster-inline-input material-catalog-dim-input" ${names.w} inputmode="numeric" autocomplete="off" value="${escapeAttr(width)}" placeholder="${zh ? '宽，可不填' : 'W, optional'}" title="${zh ? '填数字，或区间如 180~336（全角～也认）；配百分比区间时可不填 = 宽不限' : 'Number or range e.g. 180~336'}"></span>
      <span class="material-catalog-dim-x">×</span>
      <span class="material-catalog-dim-field"><i>(H)</i><input class="team-roster-inline-input material-catalog-dim-input" ${names.h} inputmode="numeric" autocomplete="off" value="${escapeAttr(height)}" placeholder="${zh ? '高' : 'H'}" title="${zh ? '填数字，或区间如 600~900' : 'Number or range e.g. 600~900'}"></span>
      <span class="material-catalog-dim-field material-catalog-dim-band">
        <i>${zh ? '高' : 'H'}</i>
        <select class="material-catalog-band-op" ${names.bandOp || names.bandMin + '-op'} title="${zh ? '选一个符号，再填高是宽的百分之几；不限 = 高完全不限' : 'Pick a sign, then fill % of width'}">
          <option value=""${!bandOn ? ' selected' : ''}>${zh ? '不限' : 'any'}</option>
          <option value="cap"${capOn ? ' selected' : ''}>≤${zh ? '（不超过）' : ' (max)'}</option>
          <option value="floor"${floorOn ? ' selected' : ''}>≥${zh ? '（不低于）' : ' (min)'}</option>
          <option value="range"${rangeOn ? ' selected' : ''}>~${zh ? '（介于）' : ' (between)'}</option>
        </select>
        <span class="material-catalog-band-pre${bandOn ? '' : ' is-hidden'}">${zh ? '宽的' : 'of W'}</span>
        <input class="team-roster-inline-input material-catalog-dim-input material-catalog-band-num${bandOn ? '' : ' is-hidden'}" ${names.bandMin} inputmode="decimal" autocomplete="off" value="${escapeAttr(capOn ? bandCap : bandMin)}" placeholder="30" title="${bandTitle}">
        <span class="material-catalog-band-sep${rangeOn ? '' : ' is-hidden'}">${zh ? '到' : 'to'}</span>
        <input class="team-roster-inline-input material-catalog-dim-input material-catalog-band-num${rangeOn ? '' : ' is-hidden'}" ${names.bandMax} inputmode="decimal" autocomplete="off" value="${escapeAttr(rangeOn ? bandMax : '')}" placeholder="150" title="${bandTitle}">
        <span class="material-catalog-band-pct${bandOn ? '' : ' is-hidden'}">%</span>
      </span>
      <button type="button" class="material-catalog-dim-wild${wildcard ? ' is-active' : ''}" ${names.wild} title="${zh ? '点一下表示高度不固定' : 'Any height'}">${zh ? '高不固定' : 'any H'}</button>
    </span>`;
  }
  // 读取一个尺寸编辑控件；填了宽但缺高且没勾通配、或选了符号却没填数字时返回 null（调用方提示报错）
  function materialCatalogReadDimension(scope, names) {
    const pick = function(attr) { return scope.querySelector('[' + attr + ']'); };
    const w = pick(names.w);
    const h = pick(names.h);
    const wild = pick(names.wild);
    const opSelect = pick(names.bandOp || names.bandMin + '-op');
    const minInput = pick(names.bandMin);
    const maxInput = pick(names.bandMax);
    if (!w) return '';
    const isWild = !!(wild && wild.classList.contains('is-active'));
    let band = '';
    if (isWild) {
      const op = opSelect ? String(opSelect.value || '').trim() : '';
      if (op === 'cap') {
        const n = parseFloat(String(minInput && minInput.value || '').trim());
        if (!(n > 0)) return null;
        band = '≤' + n + '%';
      } else if (op === 'floor') {
        const n = parseFloat(String(minInput && minInput.value || '').trim());
        if (!(n > 0)) return null;
        band = '≥' + n + '%';
      } else if (op === 'range') {
        const a = parseFloat(String(minInput && minInput.value || '').trim());
        const b = parseFloat(String(maxInput && maxInput.value || '').trim());
        if (!(a > 0) || !(b > 0)) return null;
        band = Math.min(a, b) + '%~' + Math.max(a, b) + '%';
      }
    }
    const raw = { w: w.value, h: h ? h.value : '' };
    const hasAny = String(raw.w).trim() || String(raw.h).trim() || band;
    if (!hasAny && !isWild) return '';
    const size = materialCatalogSizeFromParts(raw.w, isWild ? '' : raw.h, isWild, band);
    return size || null;
  }

  var MATERIAL_NEW_DIM_ATTRS = { w: 'data-material-new-w', h: 'data-material-new-h', wild: 'data-material-new-wild', bandOp: 'data-material-new-band-op', bandMin: 'data-material-new-band-min', bandMax: 'data-material-new-band-max' };
  function materialCatalogSizeEditorMarkup(sizes) {
    const zh = state.lang === 'zh';
    const list = (Array.isArray(sizes) && sizes.length) ? sizes : [''];
    return `<div class="material-catalog-size-editor">
      ${list.map(function(size) { return materialCatalogDimensionMarkup(size, MATERIAL_NEW_DIM_ATTRS); }).join('')}
      <button type="button" class="material-catalog-size-addbtn" data-material-size-add>${zh ? '＋ 添加尺寸' : '+ Add size'}</button>
    </div>`;
  }
  // 读取新增行里的尺寸；返回 { sizes, invalid }，invalid=true 表示有条目填了宽缺高
  function materialCatalogReadEditorSizes(scope) {
    const sizes = [];
    let invalid = false;
    if (!scope) return { sizes: sizes, invalid: invalid };
    scope.querySelectorAll('[data-material-dim]').forEach(function(dim) {
      const size = materialCatalogReadDimension(dim, MATERIAL_NEW_DIM_ATTRS);
      if (size === null) { invalid = true; return; }
      if (size && sizes.indexOf(size) < 0) sizes.push(size);
    });
    return { sizes: sizes, invalid: invalid };
  }
  function materialCatalogBodyMarkup(canEdit) {
    const zh = state.lang === 'zh';
    const dash = '<span class="team-roster-missing">—</span>';
    const cats = materialCatalogCache;
    if (!cats.length) {
      return `<p class="muted material-catalog-empty">${zh ? '清单是空的：点「恢复预设」填回默认条目。' : 'Empty. Restore the preset to fill it in.'}</p>`;
    }
    const open = materialCatalogReadOpenState();
    const caret = function(isOpen) { return `<span class="material-catalog-caret${isOpen ? ' is-open' : ''}"></span>`; };

    const categoryMarkup = function(cat) {
      const isOpen = open.categories.indexOf(String(cat.id)) >= 0;
      const subRows = cat.subs.map(function(sub) {
        // 就地编辑：名字和每个尺寸气泡都能直接点开改，气泡右上角 × 删这一个尺寸
        const sizeChips = (sub.sizes || []).map(function(size, index) {
          return `<span class="material-catalog-chip-wrap">
            <button type="button" class="material-catalog-size-chip" data-material-size-edit="${index}" title="${zh ? '点击修改这个尺寸' : 'Click to edit'}">${escapeHtml(materialCatalogSizeLabel(size))}</button>
            ${canEdit ? `<button type="button" class="material-catalog-size-x" data-material-size-drop="${index}" title="${zh ? '移除这个尺寸' : 'Remove'}">×</button>` : ''}
          </span>`;
        }).join('');
        const sizesTitle = (sub.sizes || []).map(function(size) { return materialCatalogSizeLabel(size); }).join('、');
        return `<tr data-material-sub="${escapeAttr(sub.id)}">
          <td class="material-catalog-cell-grip">${canEdit ? `<span class="material-catalog-grip" data-material-drag-handle title="${zh ? '按住拖到别的大类别可改归类' : 'Drag to re-classify'}">⠿</span>` : ''}</td>
          <td class="material-catalog-label">${canEdit
            ? `<button type="button" class="material-catalog-inline-text" data-material-name-edit title="${zh ? '点击改名' : 'Click to rename'}">${sub.name ? escapeHtml(sub.name) : `<span class="team-roster-missing">${zh ? '未命名' : 'unnamed'}</span>`}</button>`
            : (sub.name ? escapeHtml(sub.name) : dash)}</td>
          <td class="material-catalog-size">
            <div class="material-catalog-size-cell">
              <span class="material-catalog-size-chips"${sizesTitle ? ` title="${escapeAttr(sizesTitle)}"` : ''}>${sizeChips}${(canEdit || !sizeChips) ? '' : dash}</span>
              ${canEdit ? `<button type="button" class="material-catalog-size-quick" data-material-size-quick-add title="${zh ? '添加一个比例尺寸' : 'Add a size'}">＋</button>` : ''}
            </div>
          </td>
          <td class="material-catalog-cell-actions">${canEdit
            ? `<div class="material-catalog-row-actions">
                <button type="button" class="material-catalog-act danger" data-material-delete>${zh ? '删除子类别' : 'Delete'}</button>
              </div>`
            : ''}</td>
        </tr>`;
      }).join('');
      return `<div class="material-catalog-cat${isOpen ? ' is-open' : ''}" data-material-group="${escapeAttr(cat.id)}" data-material-group-name="${escapeAttr(cat.name)}">
        <div class="material-catalog-cat-head">
          ${canEdit ? `<span class="material-catalog-grip" data-material-drag-handle title="${zh ? '按住拖动调整顺序/换端' : 'Drag to reorder'}">⠿</span>` : ''}
          <button type="button" class="material-catalog-cat-toggle" data-material-toggle-category aria-expanded="${isOpen}">
            ${caret(isOpen)}
            <span class="material-catalog-cat-name">${escapeHtml(cat.name)}</span>
            <span class="material-catalog-count">${cat.subs.length} ${zh ? '个子类别' : 'sub-types'}</span>
          </button>
          ${canEdit ? `<div class="material-catalog-cat-actions">
            <button type="button" class="material-catalog-act material-catalog-quiet-add" data-material-add-sub title="${zh ? '添加子类别' : 'Add sub-type'}"><span class="material-catalog-quiet-plus">＋</span><span class="material-catalog-quiet-label">${zh ? '添加子类别' : 'Add sub-type'}</span></button>
            <span class="material-catalog-cat-more">
              <button type="button" class="material-catalog-act material-catalog-more-btn" data-material-menu-toggle aria-haspopup="true" title="${zh ? '重命名 / 删除类别' : 'Rename / delete'}">···</button>
              <span class="material-catalog-cat-menu" hidden>
                <button type="button" data-material-rename>${zh ? '重命名' : 'Rename'}</button>
                <button type="button" data-material-move="up">${zh ? '上移' : 'Move up'}</button>
                <button type="button" data-material-move="down">${zh ? '下移' : 'Move down'}</button>
                ${materialCatalogPlatforms().filter(function(platform) { return platform !== String(cat.platform || ''); }).map(function(platform) {
                  return `<button type="button" data-material-move-platform="${escapeAttr(platform)}">${zh ? `移动到${platform}` : `Move to ${platform}`}</button>`;
                }).join('')}
                <button type="button" class="danger" data-material-delete-category>${zh ? '删除类别' : 'Delete category'}</button>
              </span>
            </span>
          </div>` : ''}
        </div>
        <div class="material-catalog-cat-body"${isOpen ? '' : ' hidden'}>
          <table class="table material-catalog-table"><tbody>${subRows}</tbody></table>
          ${cat.subs.length ? '' : `<p class="muted material-catalog-empty-sub">${zh ? '暂无子类别' : 'No sub-types yet'}</p>`}
        </div>
      </div>`;
    };

    // 端 → 大类别 → 子类别尺寸（v822）：端改成横排页签，一次只显示当前端的大类别；
    // 把大类别拖到别的端不再可行（其它端没渲染），改用类别菜单里的「移动到 X端」
    const platforms = materialCatalogPlatforms();
    const active = platforms.filter(function(platform) { return open.platforms.indexOf(platform) >= 0; })[0] || platforms[0] || '';
    const tabs = platforms.map(function(platform) {
      const count = cats.filter(function(cat) { return String(cat.platform || '') === platform; }).length;
      return `<button type="button" class="material-catalog-tab${platform === active ? ' is-active' : ''}" data-material-toggle-platform="${escapeAttr(platform)}" aria-pressed="${platform === active}">
        <span class="material-catalog-tab-name">${escapeHtml(platform)}</span>
        <span class="material-catalog-tab-count">${count}</span>
      </button>`;
    }).join('');
    const activeList = cats.filter(function(cat) { return String(cat.platform || '') === active; });
    return `<div class="material-catalog-tabs">
        ${tabs}
        ${canEdit ? `<button type="button" class="material-catalog-act material-catalog-quiet-add material-catalog-tab-add" data-material-add-category="${escapeAttr(active)}" title="${zh ? '在当前端新增大类别' : 'Add category'}"><span class="material-catalog-quiet-plus">＋</span><span class="material-catalog-quiet-label">${zh ? '新增大类别' : 'Add category'}</span></button>` : ''}
      </div>
      <section class="material-catalog-platform is-active" data-material-platform-group="${escapeAttr(active)}">
        <div class="material-catalog-platform-body">
          ${activeList.length ? activeList.map(categoryMarkup).join('') : `<p class="muted material-catalog-empty-sub">${zh ? '暂无大类别' : 'No categories'}</p>`}
        </div>
      </section>`;
  }

  function renderMaterialCatalogPending(section, canEdit) {
    const slot = section && section.querySelector('#material-catalog-pending-slot');
    if (!slot) return;
    const zh = state.lang === 'zh';
    if (!canEdit || !materialCatalogTableReady) { slot.innerHTML = ''; return; }
    if (materialCatalogServerDuplicateGroups > 0) {
      slot.innerHTML = `<div class="team-roster-pending">
        <span>${zh
          ? `团队表里有 ${materialCatalogServerDuplicateGroups} 组重名的大类别（已合并显示，不会再出现「删一条连坐另一条」）；点右边写回，团队表也变成合并后的一条。`
          : `Team table has ${materialCatalogServerDuplicateGroups} duplicate-named group(s); merged for display. Write back to persist.`}</span>
        <button type="button" class="ghost-btn" id="material-catalog-writeback">${zh ? '写回团队表' : 'Write back'}</button>
      </div>`;
      return;
    }
    if (!materialCatalogPendingLocal.length) { slot.innerHTML = ''; return; }
    const categories = Array.from(new Set(materialCatalogPendingLocal.map(function(entry) { return entry.name || ''; }).filter(Boolean)));
    // 本机与团队表只是「同名大类别合并前后的差异」时，文案要说清是写回合并结果，而不是「本机有新增」
    const allMerged = materialCatalogPendingLocal.every(function(entry) {
      return materialCatalogCache.some(function(cat) {
        return String(cat.platform) === String(entry.platform) && String(cat.name) === String(entry.name);
      });
    });
    slot.innerHTML = `<div class="team-roster-pending">
      <span>${zh
        ? (allMerged
          ? `团队表里有重名的大类别，已合并显示为 ${materialCatalogPendingLocal.length} 条：${escapeHtml(categories.join('、'))}（写回后即永久合并）`
          : `本机还有 ${materialCatalogPendingLocal.length} 条没同步到团队表：${escapeHtml(categories.join('、'))}`)
        : (allMerged
          ? `Team table has duplicate-named categories; merged for display: ${escapeHtml(categories.join(', '))}`
          : `${materialCatalogPendingLocal.length} row(s) not on the team table: ${escapeHtml(categories.join(', '))}`)}</span>
      <button type="button" class="ghost-btn" id="material-catalog-import">${zh ? (allMerged ? '写回团队表' : '导入到团队表') : (allMerged ? 'Write back' : 'Import')}</button>
      <button type="button" class="ghost-btn" id="material-catalog-pending-dismiss" title="${zh ? '只清本机这份残留，团队表内容不动' : 'Clears the local leftovers only; the team table is untouched'}">${zh ? '不用了' : 'Dismiss'}</button>
    </div>`;
  }

  async function renderMaterialCatalogSection(section) {
    if (!section) return;
    const zh = state.lang === 'zh';
    const canEdit = materialCatalogCanEdit();
    section.innerHTML = `
      <div class="account-panel-head">
        <div>
          <h3>${zh ? '物料清单' : 'Material list'}</h3>
          <p class="muted">${zh
            ? '按端、大类别、子类别维护尺寸；修改后即时生效。'
            : 'Maintain sizes by platform, category and sub-type; edits apply immediately.'}
            <button type="button" class="material-catalog-rules-toggle" id="material-catalog-rules-toggle">${zh ? '规则说明' : 'Rules'}</button></p>
        </div>
        <div class="account-row-actions">
          ${canEdit ? `<button class="ghost-btn" id="material-catalog-restore" type="button">${zh ? '恢复预设' : 'Restore preset'}</button>` : ''}
          <button class="ghost-btn" id="material-catalog-refresh" type="button">${zh ? '刷新' : 'Refresh'}</button>
          ${canEdit ? `<button class="ghost-btn material-catalog-recase" id="material-catalog-recase" type="button" title="${zh ? '按当前清单重算已有物料的类别（会写库）' : 'Re-detect existing materials (writes to DB)'}">${zh ? '按清单重跑识别' : 'Re-detect existing'}</button>` : ''}
        </div>
      </div>
      <div class="material-catalog-rules" id="material-catalog-rules" hidden>
        <p>${zh
? '案例库上传时只按所选端的清单识别：先比具体尺寸（<strong>同比例即命中，公差 ±2%</strong>，等比缩放的导出尺寸都算），再比「高不固定」通配（如 750×高不固定 = 宽固定、高任意）；通配可以配<strong>高占宽的百分比范围</strong>（更具体、优先匹配）——点「高不固定」后从<strong>符号下拉</strong>里选 <strong>≤（不超过）/ ≥（不低于）/ ~（介于）</strong>，再填纯数字即可，不用手打符号：如 <strong>高 ≤ 宽的 30%</strong>（薄条，存为 750×高不固定≤30%）、<strong>高 ~ 宽的 30% 到 150%</strong>（头图）；配了范围时也可以不填宽 = 宽不限（如 高不固定≤30%，比例与缩放无关，@2x 导出也命中）。尺寸也可以写<strong>区间</strong>，如 180~336×88。都没命中留「未分类」，可手动改。'
: 'Case-library upload matches only the selected platform\'s list: exact-size ratio first (±2% tolerance, scaled exports included), then any-height wildcards — banded ones first (e.g. 750×any-H≤30%), then unbanded (750×any-H). No match → unclassified.'}</p>
        <p>${zh
          ? '各端互不通用：C端 的尺寸不会用于 B端/D端/M端。GIF 与视频等动态物料默认归本端的「弹窗」类别。'
          : 'Platforms are isolated. GIF/video materials default to this platform\'s Pop-ups category.'}</p>
        <p>${zh
          ? '「按清单重跑识别」会按上面的规则重算<strong>已有物料</strong>的类别（写共享库，先弹确认，只改与清单不一致的行；手动设置过类型的物料带保护标记，重跑不会覆盖）；「刷新」只是重新读一遍清单，不改任何物料。'
          : '“Re-detect existing” rewrites material categories in the shared DB (with confirmation); “Refresh” only re-reads the list.'}</p>
      </div>
      <div id="material-catalog-pending-slot"></div>
      <p class="team-roster-hint" id="material-catalog-hint" hidden></p>
      <div class="message" id="material-catalog-message" role="status"></div>
      <div id="material-catalog-body">${materialCatalogBodyMarkup(canEdit)}</div>
      ${canEdit
        ? ''
        : `<p class="muted team-roster-readonly">${zh ? '当前是只读：编辑清单需要「开发者维护」权限。' : 'Read-only: editing requires developer maintenance mode.'}</p>`}
    `;

    const body = section.querySelector('#material-catalog-body');
    const message = section.querySelector('#material-catalog-message');
    const hint = section.querySelector('#material-catalog-hint');
    const say = function(text, isError) {
      if (!message) return;
      message.textContent = text || '';
      message.classList.toggle('error', !!isError);
    };
    const repaint = function() {
      closeSizePop();
      if (body) body.innerHTML = materialCatalogBodyMarkup(canEdit);
      renderMaterialCatalogPending(section, canEdit);
    };
    // 就地编辑：把节点（或往尺寸气泡行里）换成输入框；回车/失焦保存，Esc 取消，都靠重绘复位
    const inlineEdit = function(host, value, onCommit, insertInto, variant) {
      if (insertInto && insertInto.querySelector('[data-material-inline-input]')) return;
      const input = document.createElement('input');
      input.className = 'team-roster-inline-input material-catalog-inline-input' + (variant === 'chip' ? ' material-catalog-inline-chip' : '');
      input.setAttribute('data-material-inline-input', '');
      input.value = value == null ? '' : String(value);
      if (insertInto) {
        const addBtn = insertInto.querySelector('[data-material-size-quick-add]');
        if (addBtn) insertInto.insertBefore(input, addBtn); else insertInto.appendChild(input);
      } else if (host) {
        host.replaceWith(input);
      } else {
        return;
      }
      input.focus();
      input.select();
      let done = false;
      const finish = function(save) {
        if (done) return;
        done = true;
        if (save && input.isConnected) onCommit(input.value);
        else repaint();
      };
      input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') { event.preventDefault(); finish(true); }
        else if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      });
      input.addEventListener('blur', function() {
        if (done) return;
        if (!input.isConnected) { done = true; return; }
        finish(true);
      });
    };

    // 尺寸编辑浮窗：点气泡/点＋ 在它下面弹一个小面板（(W)(H) + 高不固定 + 保存/取消），
    // 不挤进行内、不会被行容器裁掉；回车保存、Esc 取消、点面板外取消（避免误写）。
    let closeSizePop = function() {};
    const openSizeEditor = function(anchor, value, onCommit) {
      closeSizePop();
      const dimAttrs = { w: 'data-material-dim-w', h: 'data-material-dim-h', wild: 'data-material-dim-wild', bandOp: 'data-material-dim-band-op', bandMin: 'data-material-dim-band-min', bandMax: 'data-material-dim-band-max' };
      const pop = document.createElement('div');
      pop.className = 'material-catalog-dim-pop';
      pop.innerHTML = `
        <div class="material-catalog-dim-pop-body">${materialCatalogDimensionMarkup(value, dimAttrs)}</div>
        <div class="material-catalog-dim-pop-actions">
          <span class="material-catalog-dim-pop-hint">${zh ? '回车保存 · Esc 取消' : 'Enter saves · Esc cancels'}</span>
          <button type="button" class="ghost-btn" data-material-dim-cancel>${zh ? '取消' : 'Cancel'}</button>
          <button type="button" class="ghost-btn is-primary" data-material-dim-save>${zh ? '保存' : 'Save'}</button>
        </div>`;
      document.body.appendChild(pop);
      const node = pop.querySelector('[data-material-dim]');
      const wInput = pop.querySelector('[' + dimAttrs.w + ']');
      const hInput = pop.querySelector('[' + dimAttrs.h + ']');
      const wildBtn = pop.querySelector('[' + dimAttrs.wild + ']');
      const opSelect = pop.querySelector('[' + dimAttrs.bandOp + ']');
      const bandMinInput = pop.querySelector('[' + dimAttrs.bandMin + ']');
      const bandMaxInput = pop.querySelector('[' + dimAttrs.bandMax + ']');
      const bandField = pop.querySelector('.material-catalog-dim-band');
      const syncWild = function() {
        const on = wildBtn.classList.contains('is-active');
        node.classList.toggle('is-wild', on);
        if (hInput) {
          hInput.disabled = on;
          if (on) hInput.value = '';
        }
      };
      // v860：符号下拉三态（不限 / ≤ / ≥ / ~）联动显示对应的数字框和连接词
      const syncBand = function() {
        const op = opSelect ? String(opSelect.value || '') : '';
        const cap = op === 'cap';
        const floor = op === 'floor';
        const range = op === 'range';
        const bandOn = cap || floor || range;
        const pre = bandField ? bandField.querySelector('.material-catalog-band-pre') : null;
        if (pre) pre.classList.toggle('is-hidden', !bandOn);
        if (bandMinInput) bandMinInput.classList.toggle('is-hidden', !bandOn);
        if (bandMaxInput) {
          bandMaxInput.classList.toggle('is-hidden', !range);
          if (!range) bandMaxInput.value = '';
        }
        const sep = bandField ? bandField.querySelector('.material-catalog-band-sep') : null;
        const pct = bandField ? bandField.querySelector('.material-catalog-band-pct') : null;
        if (sep) sep.classList.toggle('is-hidden', !range);
        if (pct) pct.classList.toggle('is-hidden', !(cap || range));
      };
      syncWild();
      syncBand();
      // 贴着锚点下方（空间不够往上弹），左右不出视口
      const place = function() {
        const rect = (anchor && anchor.isConnected) ? anchor.getBoundingClientRect() : null;
        const popRect = pop.getBoundingClientRect();
        const top = rect ? rect.bottom + 6 : 120;
        const openUp = rect && (top + popRect.height > window.innerHeight - 8);
        pop.style.top = Math.max(8, (openUp ? rect.top - popRect.height - 6 : top)) + 'px';
        const left = rect ? rect.left : 24;
        pop.style.left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8)) + 'px';
      };
      place();
      const teardown = function() {
        document.removeEventListener('mousedown', onOutside, true);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', place);
        pop.remove();
        closeSizePop = function() {};
      };
      const onOutside = function(event) {
        if (pop.contains(event.target)) return;
        teardown();   // 点面板外 = 取消，不写数据
      };
      const onKey = function(event) {
        if (!pop.isConnected) return;
        if (event.key === 'Escape') { event.preventDefault(); teardown(); }
      };
      const save = function() {
        const size = materialCatalogReadDimension(node, dimAttrs);
        if (size === null) {
          say(zh ? '宽和高都要填；选了符号（≤ / ≥ / ~）就要填百分比数字。' : 'Fill both W and H; a % sign needs its numbers.', true);
          return;
        }
        if (!size) {
          say(zh ? '请先填宽度再保存。' : 'Enter a width first.', true);
          if (wInput) wInput.focus();
          return;
        }
        materialCatalogRememberDim(size);
        teardown();
        onCommit(size);
      };
      [wInput, hInput, bandMinInput, bandMaxInput].forEach(function(input) {
        if (!input) return;
        input.addEventListener('keydown', function(event) {
          if (event.key === 'Enter') { event.preventDefault(); save(); }
        });
      });
      wildBtn.addEventListener('mousedown', function(event) { event.preventDefault(); });
      wildBtn.addEventListener('click', function() {
        wildBtn.classList.toggle('is-active');
        syncWild();
        if (wInput) wInput.focus();
      });
      if (opSelect) {
        opSelect.addEventListener('change', function() {
          syncBand();
          if (bandMinInput && !bandMinInput.classList.contains('is-hidden')) bandMinInput.focus();
        });
      }
      pop.querySelector('[data-material-dim-save]')?.addEventListener('click', save);
      pop.querySelector('[data-material-dim-cancel]')?.addEventListener('click', teardown);
      closeSizePop = teardown;
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', place);
      wInput?.focus();
      wInput?.select();
    };

    const findEntry = function(id) {
      return materialCatalogCache.find(function(entry) { return String(entry.id) === String(id); });
    };
    const commit = function(nextList) {
      return saveMaterialCatalog(nextList).then(function() {
        repaint();
        say(zh ? '已保存。' : 'Saved.');
      }).catch(function(error) { say(materialCatalogErrorText(error), true); });
    };
    const refreshHint = function() {
      if (!hint) return;
      hint.hidden = materialCatalogTableReady;
      hint.textContent = materialCatalogTableReady ? '' : materialCatalogHintText();
    };

    renderMaterialCatalogPending(section, canEdit);
    refreshHint();
    loadMaterialCatalog().then(function() {
      repaint();
      refreshHint();
    }).catch(function(error) { say(materialCatalogErrorText(error), true); });

    // ── 拖动排序（指针实现，不依赖原生 HTML5 DnD）──
    // 顺序就是识别优先级：大类别可同端换位（改优先级）或拖到别的端；子类别可换位或拖到别的大类别改归类。
    // 只有把手（⠿）能起拖，名字/气泡仍是点击编辑；移动超过 4px 才算拖动，否则当普通点击。
    let dragCtx = null;
    const dropSideOf = function(node, clientY) {
      const rect = node.getBoundingClientRect();
      return clientY > rect.top + rect.height / 2 ? 'after' : 'before';
    };
    const clearDropMarks = function() {
      section.querySelectorAll('.is-dragging, .is-drop-before, .is-drop-after, .is-drop-into').forEach(function(node) {
        node.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after', 'is-drop-into');
      });
    };
    const markDrop = function(node, side) {
      section.querySelectorAll('.is-drop-before, .is-drop-after, .is-drop-into').forEach(function(other) {
        other.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-into');
      });
      node.classList.add(side === 'into' ? 'is-drop-into' : (side === 'after' ? 'is-drop-after' : 'is-drop-before'));
    };
    const onDragMove = function(event) {
      if (!dragCtx) return;
      if (!dragCtx.active) {
        if (Math.abs(event.clientX - dragCtx.x) < 4 && Math.abs(event.clientY - dragCtx.y) < 4) return;
        dragCtx.active = true;
        dragCtx.node.classList.add('is-dragging');
        document.body.classList.add('is-catalog-dragging');
      }
      const el = document.elementFromPoint(event.clientX, event.clientY);
      if (!el) return;
      const rowNode = el.closest('tr[data-material-sub]');
      const catNode = el.closest('.material-catalog-cat');
      if (dragCtx.kind === 'sub') {
        if (rowNode && String(rowNode.getAttribute('data-material-sub')) !== String(dragCtx.id)) {
          markDrop(rowNode, dropSideOf(rowNode, event.clientY));
          return;
        }
        if (!rowNode && catNode) {
          markDrop(catNode, 'after');   // 拖到折叠的大类别上 = 追加进它
          return;
        }
      } else if (catNode && String(catNode.getAttribute('data-material-group')) !== String(dragCtx.id)) {
        markDrop(catNode, dropSideOf(catNode, event.clientY));
        return;
      }
      const body = el.closest('.material-catalog-platform-body');
      if (body) {
        markDrop(body, 'into');        // 拖到端的空白处 = 追加到该端
        return;
      }
      clearDropMarks();
    };
    const onDragUp = function() {
      const ctx = dragCtx;
      dragCtx = null;
      document.removeEventListener('mousemove', onDragMove, true);
      document.removeEventListener('mouseup', onDragUp, true);
      document.body.classList.remove('is-catalog-dragging');
      if (!ctx) return;
      if (!ctx.active) { clearDropMarks(); return; }   // 没移动 = 普通点击，不做事
      const rowNode = section.querySelector('tr[data-material-sub].is-drop-before, tr[data-material-sub].is-drop-after');
      const catNode = section.querySelector('.material-catalog-cat.is-drop-before, .material-catalog-cat.is-drop-after');
      const bodyNode = section.querySelector('.material-catalog-platform-body.is-drop-into');
      const side = function(node) {
        if (node.classList.contains('is-drop-into')) return 'into';
        return node.classList.contains('is-drop-after') ? 'after' : 'before';
      };
      let next = null;
      if (ctx.kind === 'cat') {
        if (catNode) next = materialCatalogMoveCategory(materialCatalogCache, ctx.id, catNode.getAttribute('data-material-group'), side(catNode));
        else if (bodyNode) {
          const platform = bodyNode.closest('[data-material-platform-group]').getAttribute('data-material-platform-group');
          next = materialCatalogMoveCategory(materialCatalogCache, ctx.id, '', 'after', platform);
        }
      } else if (rowNode) {
        const catId = rowNode.closest('[data-material-group]').getAttribute('data-material-group');
        next = materialCatalogMoveSub(materialCatalogCache, ctx.id, catId, rowNode.getAttribute('data-material-sub'), side(rowNode));
      } else if (catNode) {
        next = materialCatalogMoveSub(materialCatalogCache, ctx.id, catNode.getAttribute('data-material-group'), '', 'after');
      } else if (bodyNode) {
        const platform = bodyNode.closest('[data-material-platform-group]').getAttribute('data-material-platform-group');
        const last = materialCatalogCache.filter(function(c) { return String(c.platform) === platform; }).pop();
        if (last) next = materialCatalogMoveSub(materialCatalogCache, ctx.id, last.id, '', 'after');
      }
      clearDropMarks();
      if (next) commit(next);
    };
    section.addEventListener('mousedown', function(event) {
      if (event.button !== 0) return;
      const handle = event.target.closest('[data-material-drag-handle]');
      if (!handle) return;
      const rowNode = event.target.closest('tr[data-material-sub]');
      const catNode = event.target.closest('.material-catalog-cat');
      if (!rowNode && !catNode) return;
      dragCtx = {
        kind: rowNode ? 'sub' : 'cat',
        id: rowNode ? rowNode.getAttribute('data-material-sub') : catNode.getAttribute('data-material-group'),
        node: rowNode || catNode,
        x: event.clientX,
        y: event.clientY,
        active: false
      };
      event.preventDefault();   // 别选中文字
      document.addEventListener('mousemove', onDragMove, true);
      document.addEventListener('mouseup', onDragUp, true);
    });

    // 回车 = 确认：新增子类别 / 新增大类别 / 重命名 的输入框里按回车，等同点同区块的「保存」
    // （尺寸浮窗与就地改名各自已处理，这里补齐剩下的几个）
    section.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter') return;
      // 中文输入法组合期间的回车是「确认候选」，不能截胡
      if (event.isComposing || event.keyCode === 229) return;
      const target = event.target;
      if (!target || !/^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      const pick = function(selector) { return section.querySelector(selector); };
      let button = null;
      if (target.matches('[data-material-new-label], [data-material-new-w], [data-material-new-h]')) button = pick('[data-material-new-save]');
      else if (target.matches('[data-material-new-cat-name]')) button = pick('[data-material-new-cat-save]');
      else if (target.matches('[data-material-rename-input]')) button = pick('[data-material-rename-save]');
      else if (target.matches('[data-material-label-input], [data-material-size-input]')) button = pick('[data-material-save]');
      if (!button) return;
      event.preventDefault();
      button.click();
    });

    // 事件全在 section 上委托：列表会被整体重绘，直接绑定会失效
    section.addEventListener('click', function(event) {
      // 点 ··· 以外的地方先收起类别菜单；点行本身（非按钮）标记选中，好让行内操作常显
      if (!event.target.closest('[data-material-menu-toggle]') && !event.target.closest('.material-catalog-cat-menu')) materialCatalogCloseMenus();
      if (!event.target.closest('button')) {
        const clickedRow = event.target.closest('tr[data-material-sub]');
        if (clickedRow) clickedRow.classList.toggle('is-active');
      }
      if (event.target.closest('#material-catalog-refresh')) {
        say(zh ? '正在刷新…' : 'Refreshing…');
        loadMaterialCatalog().then(function() {
          repaint();
          refreshHint();
          say(zh ? '已刷新。' : 'Refreshed.');
        }).catch(function(error) { say(materialCatalogErrorText(error), true); });
        return;
      }
      if (event.target.closest('#material-catalog-rules-toggle')) {
        const rules = section.querySelector('#material-catalog-rules');
        if (rules) rules.hidden = !rules.hidden;
        return;
      }
      if (event.target.closest('[data-material-toggle-platform]')) {
        materialCatalogTogglePlatform(event.target.closest('[data-material-toggle-platform]').getAttribute('data-material-toggle-platform'));
        repaint();
        return;
      }
      if (event.target.closest('[data-material-toggle-category]')) {
        const toggleGroup = event.target.closest('[data-material-group]');
        materialCatalogToggleCategory(toggleGroup ? toggleGroup.getAttribute('data-material-group') : '');
        repaint();
        return;
      }
      if (event.target.closest('#material-catalog-recase')) {
        void recaseMaterialTypesByCatalog(function(text) { say(text); }).then(function(summary) {
          say(summary, false);
        }).catch(function(error) { say(materialCatalogErrorText(error), true); });
        return;
      }
      if (event.target.closest('#material-catalog-writeback')) {
        say(zh ? '正在写回…' : 'Writing back…');
        commit(materialCatalogCache);
        return;
      }
      if (event.target.closest('#material-catalog-import')) {
        if (!materialCatalogPendingLocal.length) return;
        say(zh ? '正在导入…' : 'Importing…');
        importMaterialCatalogPending().then(function() {
          repaint();
          say(zh ? '已导入到团队表。' : 'Imported.');
        }).catch(function(error) { say(materialCatalogErrorText(error), true); });
        return;
      }
      if (event.target.closest('#material-catalog-pending-dismiss')) {
        // 本机这份「待同步」用户已经不需要了（多半是删掉的行 / 旧格式遗留）：清掉即可，
        // 团队表内容原样保留，也不会再被下次加载重新算出来。
        materialCatalogDismissPending();
        repaint();
        say(zh ? '已清掉本机残留，团队表没动。' : 'Local leftovers cleared; team table untouched.');
        return;
      }
      if (!canEdit) return;
      if (event.target.closest('#material-catalog-restore')) {
        if (!confirm(zh
          ? '恢复预设清单？\n当前清单（含你自建的大类别与所有尺寸）会被预设整份替换掉，服务端和本机都改，且不能撤销。'
          : 'Restore the preset? Your custom categories and sizes will be replaced entirely (server + local, no undo).')) return;
        say(zh ? '正在恢复…' : 'Restoring…');
        restoreMaterialCatalogPreset().then(function() {
          repaint();
          say(zh ? '已恢复预设。' : 'Preset restored.');
        }).catch(function(error) { say(materialCatalogErrorText(error), true); });
        return;
      }
      const addCategoryBtn = event.target.closest('[data-material-add-category]');
      if (addCategoryBtn) {
        const platform = addCategoryBtn.getAttribute('data-material-add-category') || '';
        const block = addCategoryBtn.closest('[data-material-platform-group]');
        if (block && block.querySelector('[data-material-new-category]')) return;
        const wrap = document.createElement('div');
        wrap.className = 'material-catalog-group material-catalog-new-group';
        wrap.setAttribute('data-material-new-category', platform);
        wrap.innerHTML = `
          <div class="material-catalog-group-head"><h4>${zh ? '新类别' : 'New category'}</h4></div>
          <div class="material-catalog-new-fields">
            <input class="team-roster-inline-input" data-material-new-cat-name maxlength="40" placeholder="${zh ? '类别名，例如：首页横版banner' : 'Category, e.g. Home banner'}">
            <div class="team-roster-actions">
              <button type="button" class="ghost-btn" data-material-new-cat-save>${zh ? '保存' : 'Save'}</button>
              <button type="button" class="ghost-btn" data-material-new-cat-cancel>${zh ? '取消' : 'Cancel'}</button>
            </div>
          </div>`;
        (block || body)?.appendChild(wrap);
        wrap.querySelector('[data-material-new-cat-name]')?.focus();
        return;
      }
      if (event.target.closest('[data-material-new-cat-cancel]')) {
        section.querySelector('[data-material-new-category]')?.remove();
        return;
      }
      if (event.target.closest('[data-material-new-cat-save]')) {
        const wrap = event.target.closest('[data-material-new-category]');
        const platform = (wrap?.getAttribute('data-material-new-category') || '').trim();
        const name = String(wrap?.querySelector('[data-material-new-cat-name]')?.value || '').trim();
        if (!name) { say(zh ? '类别名不能空。' : 'Category name is required.', true); return; }
        if (materialCatalogCache.some(function(cat) { return String(cat.platform || '') === platform && cat.name === name; })) {
          say(zh ? '这个端下已有同名大类别。' : 'That category already exists for this platform.', true); return;
        }
        commit(materialCatalogCache.concat([{ platform: platform, name: name, subs: [] }]));
        return;
      }

      if (event.target.closest('[data-material-menu-toggle]')) {
        const wrap = event.target.closest('.material-catalog-cat-more');
        const menu = wrap ? wrap.querySelector('.material-catalog-cat-menu') : null;
        if (!menu) return;
        const wasHidden = menu.hidden;
        materialCatalogCloseMenus();
        menu.hidden = !wasHidden;
        return;
      }
      const group = event.target.closest('[data-material-group]');
      const catId = group ? group.getAttribute('data-material-group') : '';
      const row = event.target.closest('[data-material-sub]');
      if (event.target.closest('[data-material-delete]')) {
        if (!row || !group) return;
        const subId = row.getAttribute('data-material-sub');
        const cat = materialCatalogCache.find(function(c) { return String(c.id) === String(catId); });
        const sub = cat ? cat.subs.find(function(s) { return String(s.id) === String(subId); }) : null;
        if (!sub) return;
        const name = [cat.name, sub.name, materialCatalogSizeLabel(sub.size)].filter(Boolean).join(' · ');
        if (!confirm(zh
          ? `删除「${cat.name}」下的子类别「${name}」？\n只影响后续识别：以后这个尺寸不再自动归到「${cat.name}」，已上传物料的类别不变。`
          : `Delete sub-type ${name} under ${cat.name}?`)) return;
        commit(materialCatalogCache.map(function(c) {
          return String(c.id) === String(catId)
            ? { id: c.id, platform: c.platform, name: c.name, subs: c.subs.filter(function(s) { return String(s.id) !== String(subId); }) }
            : c;
        }));
        return;
      }
      const newRowHost = event.target.closest('[data-material-new-row]');
      if (newRowHost) {
        if (event.target.closest('[data-material-size-add]')) {
          const editor = newRowHost.querySelector('.material-catalog-size-editor');
          const added = editor ? materialCatalogAppendSizeRow(editor) : null;
          if (added) added.querySelector('input')?.focus();
          return;
        }
        if (event.target.closest('[data-material-size-drop]')) {
          const editor = newRowHost.querySelector('.material-catalog-size-editor');
          const sizeRow = event.target.closest('.material-catalog-size-row');
          if (editor && sizeRow) {
            sizeRow.remove();
            if (!editor.querySelector('.material-catalog-size-row')) materialCatalogAppendSizeRow(editor);
          }
          return;
        }
      }
      const subOf = function() {
        const cat = materialCatalogCache.find(function(c) { return String(c.id) === String(catId); });
        const subId = row ? row.getAttribute('data-material-sub') : '';
        const found = cat ? cat.subs.find(function(s) { return String(s.id) === String(subId); }) : null;
        return { cat: cat, sub: found };
      };
      const commitSubSizes = function(sizes) {
        const ctx = subOf();
        if (!ctx.sub) return;
        commit(materialCatalogCache.map(function(c) {
          if (String(c.id) !== String(catId)) return c;
          return { id: c.id, platform: c.platform, name: c.name, subs: c.subs.map(function(x) {
            return String(x.id) === String(ctx.sub.id) ? { id: x.id, name: x.name, sizes: sizes } : x;
          }) };
        }));
      };
      if (event.target.closest('[data-material-name-edit]')) {
        const ctx = subOf();
        if (!ctx.sub) return;
        inlineEdit(event.target.closest('[data-material-name-edit]'), ctx.sub.name, function(next) {
          const name = String(next || '').trim();
          if (!name) { say(zh ? '子类别名不能空。' : 'Name is required.', true); repaint(); return; }
          if (ctx.cat.subs.some(function(x) { return String(x.id) !== String(ctx.sub.id) && x.name === name; })) {
            say(zh ? '这个类别下已有同名子类别。' : 'That name already exists here.', true); repaint(); return;
          }
          if (name === ctx.sub.name) { repaint(); return; }
          commit(materialCatalogCache.map(function(c) {
            if (String(c.id) !== String(catId)) return c;
            return { id: c.id, platform: c.platform, name: c.name, subs: c.subs.map(function(x) {
              return String(x.id) === String(ctx.sub.id) ? { id: x.id, name: name, sizes: x.sizes } : x;
            }) };
          }));
        });
        return;
      }
      if (event.target.closest('[data-material-size-edit]')) {
        const ctx = subOf();
        if (!ctx.sub) return;
        const index = Number(event.target.closest('[data-material-size-edit]').getAttribute('data-material-size-edit'));
        openSizeEditor(event.target.closest('.material-catalog-chip-wrap') || event.target, (ctx.sub.sizes || [])[index] || '', function(next) {
          const sizes = (ctx.sub.sizes || []).slice();
          if (!next) sizes.splice(index, 1);
          else sizes[index] = next;
          commitSubSizes(sizes);
        });
        return;
      }
      if (event.target.closest('[data-material-size-drop]')) {
        const ctx = subOf();
        if (!ctx.sub) return;
        const index = Number(event.target.closest('[data-material-size-drop]').getAttribute('data-material-size-drop'));
        commitSubSizes((ctx.sub.sizes || []).filter(function(_size, i) { return i !== index; }));
        return;
      }
      if (event.target.closest('[data-material-size-quick-add]')) {
        const ctx = subOf();
        if (!ctx.sub) return;
        openSizeEditor(event.target.closest('[data-material-size-quick-add]') || event.target, materialCatalogSeedSize(ctx.sub.sizes), function(next) {
          if (!next) { repaint(); return; }
          commitSubSizes((ctx.sub.sizes || []).concat([next]));
        });
        return;
      }
      if (event.target.closest('[data-material-cancel]')) { repaint(); return; }
      if (event.target.closest('[data-material-save]')) {
        if (!row || !group) return;
        const subId = row.getAttribute('data-material-sub');
        const name = String(row.querySelector('[data-material-label-input]')?.value || '').trim();
        const sizes = materialCatalogReadEditorSizes(row);
        if (!name && !sizes.length) { say(zh ? '至少填一个：子类别名或尺寸。' : 'Fill a name or a size.', true); return; }
        commit(materialCatalogCache.map(function(c) {
          if (String(c.id) !== String(catId)) return c;
          return { id: c.id, platform: c.platform, name: c.name, subs: c.subs.map(function(s) {
            return String(s.id) === String(subId) ? { id: s.id, name: name, sizes: sizes } : s;
          }) };
        }));
        return;
      }
      if (event.target.closest('[data-material-new-wild]')) {
        const wildBtn2 = event.target.closest('[data-material-new-wild]');
        wildBtn2.classList.toggle('is-active');
        const dimNode = wildBtn2.closest('[data-material-dim]');
        if (dimNode) {
          const on = wildBtn2.classList.contains('is-active');
          dimNode.classList.toggle('is-wild', on);
          const hInput2 = dimNode.querySelector('[data-material-new-h]');
          if (hInput2) { hInput2.disabled = on; if (on) hInput2.value = ''; }
        }
        return;
      }
      if (event.target.closest('[data-material-add-sub]')) {
        if (!group) return;
        const tbody = group.querySelector('tbody');
        const host = tbody || group;
        const tr = document.createElement('tr');
        tr.setAttribute('data-material-new-row', '');
        tr.innerHTML = `<td class="material-catalog-cell-grip"></td>
          <td><input class="team-roster-inline-input" data-material-new-label maxlength="40" placeholder="${zh ? '子类别名，如：Static / 动画' : 'Sub-type'}"></td>
          <td>${materialCatalogSizeEditorMarkup([materialCatalogSeedSize([])])}</td>
          <td><div class="material-catalog-row-actions material-catalog-row-editing">
            <button type="button" class="ghost-btn" data-material-new-save>${zh ? '保存' : 'Save'}</button>
            <button type="button" class="ghost-btn" data-material-new-cancel>${zh ? '取消' : 'Cancel'}</button>
          </div></td>`;
        if (tbody) tbody.appendChild(tr); else host.appendChild(tr);
        tr.querySelector('[data-material-new-label]')?.focus();
        return;
      }
      if (event.target.closest('[data-material-new-cancel]')) {
        event.target.closest('[data-material-new-row]')?.remove();
        return;
      }
      if (event.target.closest('[data-material-new-save]')) {
        const tr = event.target.closest('[data-material-new-row]');
        if (!group || !tr) return;
        const name = String(tr.querySelector('[data-material-new-label]')?.value || '').trim();
        const parsed = materialCatalogReadEditorSizes(tr);
        if (parsed.invalid) { say(zh ? '宽和高都要填；选了符号（≤ / ≥ / ~）就要填百分比数字。' : 'Fill both W and H; a % sign needs its numbers.', true); return; }
        const sizes = parsed.sizes;
        if (!name && !sizes.length) { say(zh ? '至少填一个：子类别名或尺寸。' : 'Fill a name or a size.', true); return; }
        if (sizes.length) materialCatalogRememberDim(sizes[sizes.length - 1]);
        commit(materialCatalogCache.map(function(c) {
          if (String(c.id) !== String(catId)) return c;
          return { id: c.id, platform: c.platform, name: c.name, subs: materialCatalogMergeSubs(c.subs.concat([{ id: materialCatalogUid(), name: name, sizes: sizes }])) };
        }));
        return;
      }
      const moveBtn = event.target.closest('[data-material-move]');
      if (moveBtn && group) {
        const cat = materialCatalogCache.find(function(c) { return String(c.id) === String(catId); });
        if (!cat) return;
        const sameSide = materialCatalogCache.filter(function(c) { return String(c.platform) === String(cat.platform); });
        const at = sameSide.findIndex(function(c) { return String(c.id) === String(cat.id); });
        const dir = moveBtn.getAttribute('data-material-move');
        const target = sameSide[dir === 'up' ? at - 1 : at + 1];
        materialCatalogCloseMenus();
        if (!target) return;
        const next = materialCatalogMoveCategory(materialCatalogCache, cat.id, target.id, dir === 'up' ? 'before' : 'after');
        if (next) commit(next);
        return;
      }
      if (event.target.closest('[data-material-rename]')) {
        if (!group) return;
        const cat = materialCatalogCache.find(function(c) { return String(c.id) === String(catId); });
        const head = group.querySelector('.material-catalog-cat-head');
        if (!head || !cat) return;
        head.innerHTML = `<input class="team-roster-inline-input" data-material-rename-input maxlength="40" value="${escapeAttr(cat.name)}">
          <div class="material-catalog-cat-actions">
            <button type="button" class="ghost-btn" data-material-rename-save>${zh ? '保存' : 'Save'}</button>
            <button type="button" class="ghost-btn" data-material-rename-cancel>${zh ? '取消' : 'Cancel'}</button>
          </div>`;
        head.querySelector('[data-material-rename-input]')?.focus();
        return;
      }
      if (event.target.closest('[data-material-rename-cancel]')) { repaint(); return; }
      if (event.target.closest('[data-material-rename-save]')) {
        if (!group) return;
        const next = String(group.querySelector('[data-material-rename-input]')?.value || '').trim();
        if (!next) { say(zh ? '类别名不能空。' : 'Category name is required.', true); return; }
        commit(materialCatalogCache.map(function(c) {
          return String(c.id) === String(catId) ? { id: c.id, platform: c.platform, name: next, subs: c.subs } : c;
        }));
        return;
      }
      if (event.target.closest('[data-material-move-platform]')) {
        const movePlatformBtn = event.target.closest('[data-material-move-platform]');
        const toPlatform = movePlatformBtn.getAttribute('data-material-move-platform') || '';
        const cat = materialCatalogCache.find(function(c) { return String(c.id) === String(catId); });
        materialCatalogCloseMenus();
        if (!cat || String(cat.platform) === toPlatform) return;
        const next = materialCatalogMoveCategory(materialCatalogCache, cat.id, '', 'after', toPlatform);
        if (next) {
          materialCatalogTogglePlatform(toPlatform); // 移完顺便切到目标端页签，立刻能看到
          commit(next);
        }
        return;
      }
      if (event.target.closest('[data-material-delete-category]')) {
        if (!group) return;
        const cat = materialCatalogCache.find(function(c) { return String(c.id) === String(catId); });
        if (!cat) return;
        if (!confirm(zh
          ? `删除「${cat.platform}」下的类别「${cat.name}」？\n会连同它的 ${cat.subs.length} 个子类别一起删除，之后这些尺寸不再自动识别；已上传物料的类别标签不受影响。`
          : `Delete category ${cat.name} under ${cat.platform}?\nIts ${cat.subs.length} sub-type(s) go too; existing materials keep their category.`)) return;
        let removed = false;
        commit(materialCatalogCache.filter(function(c) {
          if (!removed && String(c.id) === String(catId)) { removed = true; return false; }
          return true;
        }));
        return;
      }
    });
  }

  async function renderAdmin() {
    parkActiveToolFrame();
    if (window.VFAccountAccess?.enabled && !state.localPreview) {
      // renderPanel 已被包过一层：返回后面板 HTML 已就绪，直接补挂使用者名单
      await window.VFAccountAccess.renderPanel(els.content);
      mountTeamRosterSection(els.content);
      return;
    }
    const managementSettingsHtml = state.uiRestricted ? '' : `
        <section class="admin-section">
          <div>
            <div class="kicker">TEAM ACCESS</div>
            <h3>${t('createAccount')}</h3>
          </div>
          <form id="create-user-form" class="toolbar">
            <label><span>${t('displayName')}</span><input name="display_name" required></label>
            <label><span>${t('email')}</span><input name="email" type="email" required></label>
            <label><span>${t('initialPassword')}</span><input name="password" type="password" minlength="8" required></label>
            <label><span>${t('role')}</span><select name="role"><option value="designer">${roleLabel('designer')}</option><option value="operator">${roleLabel('operator')}</option><option value="admin">${roleLabel('admin')}</option></select></label>
            <button class="primary-btn" type="submit">${t('createAccount')}</button>
          </form>
          <div id="create-user-message" class="message"></div>
        </section>
`;
    els.content.innerHTML = `
      <div class="panel-page">
        ${managementSettingsHtml}
        <section class="admin-section ui-restriction-section">
          <div class="ui-restriction-copy">
            <div class="kicker">DEVELOPER TOOLS</div>
            <h3>${state.lang === 'zh' ? '开发者模式悬浮球' : 'Developer mode floating control'}</h3>
            <p>${state.lang === 'zh'
              ? '开启后，所有页面都会显示可拖动的开发者模式悬浮球。开启时需要输入密码。'
              : 'When enabled, the draggable developer-mode control is shown on every page. A password is required to enable it.'}</p>
          </div>
          <label class="ui-restriction-control" for="developer-ball-visibility-toggle">
            <span id="developer-ball-visibility-status" class="ui-restriction-status">${isDeveloperBallVisible() ? (state.lang === 'zh' ? '已显示' : 'Shown') : (state.lang === 'zh' ? '已隐藏' : 'Hidden')}</span>
            <input id="developer-ball-visibility-toggle" type="checkbox" ${isDeveloperBallVisible() ? 'checked' : ''}>
            <span class="ui-restriction-switch" aria-hidden="true"></span>
          </label>
        </section>
        <div id="developer-ball-password-modal" class="modal-backdrop" hidden>
          <section class="modal developer-ball-password-dialog" role="dialog" aria-modal="true" aria-labelledby="developer-ball-password-title">
            <div class="modal-head">
              <h3 id="developer-ball-password-title">${state.lang === 'zh' ? '开启开发者悬浮球' : 'Enable developer control'}</h3>
              <button id="close-developer-ball-password" class="icon-btn modal-close-circle" type="button" aria-label="${state.lang === 'zh' ? '关闭' : 'Close'}">×</button>
            </div>
            <p class="developer-ball-password-hint">${state.lang === 'zh' ? '请输入开发者密码后继续。' : 'Enter the developer password to continue.'}</p>
            <label class="developer-ball-password-field">
              <span>${state.lang === 'zh' ? '密码' : 'Password'}</span>
              <input id="developer-ball-password-input" type="password" inputmode="numeric" autocomplete="off">
            </label>
            <div id="developer-ball-password-message" class="message"></div>
            <div class="modal-actions">
              <button id="cancel-developer-ball-password" class="ghost-btn" type="button">${state.lang === 'zh' ? '取消' : 'Cancel'}</button>
              <button id="confirm-developer-ball-password" class="primary-btn" type="button">${state.lang === 'zh' ? '确认开启' : 'Enable'}</button>
            </div>
          </section>
        </div>
      </div>
    `;
    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) createUserForm.addEventListener('submit', createUser);
    const ballToggle = document.getElementById('developer-ball-visibility-toggle');
    const ballStatus = document.getElementById('developer-ball-visibility-status');
    const passwordModal = document.getElementById('developer-ball-password-modal');
    const passwordInput = document.getElementById('developer-ball-password-input');
    const passwordMessage = document.getElementById('developer-ball-password-message');
    const updateBallControl = visible => {
      if (ballToggle) ballToggle.checked = visible;
      if (ballStatus) ballStatus.textContent = visible
        ? (state.lang === 'zh' ? '已显示' : 'Shown')
        : (state.lang === 'zh' ? '已隐藏' : 'Hidden');
    };
    const closePasswordModal = () => {
      if (passwordModal) passwordModal.hidden = true;
      if (passwordInput) passwordInput.value = '';
      if (passwordMessage) setMessage(passwordMessage, '', false);
      updateBallControl(isDeveloperBallVisible());
    };
    const confirmDeveloperBall = () => {
      if (state.localPreview) { setDeveloperBallVisibility(true); closePasswordModal(); updateBallControl(true); }
      else window.VFAccountAccess?.promptUnlock();
    };
    ballToggle?.addEventListener('change', function() {
      if (!ballToggle.checked) {
        setDeveloperBallVisibility(false);
        updateBallControl(false);
        return;
      }
      ballToggle.checked = false;
      if (passwordModal) passwordModal.hidden = false;
      requestAnimationFrame(() => passwordInput?.focus());
    });
    document.getElementById('close-developer-ball-password')?.addEventListener('click', closePasswordModal);
    document.getElementById('cancel-developer-ball-password')?.addEventListener('click', closePasswordModal);
    document.getElementById('confirm-developer-ball-password')?.addEventListener('click', confirmDeveloperBall);
    passwordInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmDeveloperBall();
      }
    });
    passwordModal?.addEventListener('click', event => {
      if (event.target === passwordModal) closePasswordModal();
    });
  }

  async function createUser(event) {
    event.preventDefault();
    const message = document.getElementById('create-user-message');
    message.className = 'message';
    message.textContent = '';
    if (state.localPreview) {
      setMessage(message, state.lang === 'zh' ? '本地预览模式不会创建真实账号。部署后由 Serverless API 创建。' : 'Local preview does not create real accounts.', true);
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Create user failed');
      setMessage(message, state.lang === 'zh' ? '账号已创建。' : 'Account created.', false, true);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(message, error.message, true);
    }
  }

  function openProjectModal() {
    const typeName = state.route === 'dynamic' ? t('dynamicDiy') : t('staticDiy');
    els.projectTitleInput.value = `${typeName} ${new Date().toLocaleString()}`;
    els.projectSaveNote.textContent = state.lang === 'zh'
      ? 'V1 会保存项目元数据和编辑器快照。静态工具可记录更多图层信息，动态序列帧会先记录结构信息。'
      : 'V1 saves project metadata and an editor snapshot. Static snapshots include more layer data; dynamic sequences start with structural data.';
    els.projectModalMessage.textContent = '';
    els.projectModalMessage.className = 'message';
    els.projectModal.hidden = false;
    els.projectTitleInput.focus();
  }

  function closeProjectModal() {
    els.projectModal.hidden = true;
  }

  async function saveStaticTemplateToLibrary() {
    if (state.route !== 'static') return;
    if (state.localPreview || !state.supabase || !state.session) {
      alert(state.lang === 'zh' ? '模板库保存需要登录云端账号。' : 'Saving templates requires a cloud login.');
      return;
    }
    const title = window.prompt(state.lang === 'zh' ? '模板名称' : 'Template name', `${state.lang === 'zh' ? '静态模板' : 'Static Template'} ${new Date().toLocaleString()}`);
    if (!title || !title.trim()) return;
    const button = els.saveTemplateBtn;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = state.lang === 'zh' ? '保存中...' : 'Saving...';
    const sourceId = crypto.randomUUID();
    const uploadedPaths = [];
    let sourceInserted = false;
    try {
      await waitForToolTemplateExporter();
      const exported = await state.activeFrame.contentWindow.VF_EXPORT_TEMPLATE_ASSET({ title: title.trim() });
      const snapshot = exported?.snapshot;
      validateProjectSnapshot(snapshot, 'static');
      if (!exported?.previewDataUrl) throw new Error(state.lang === 'zh' ? '没有生成模板预览图。' : 'Template preview was not generated.');
      const userId = state.session.user.id;
      const templateBlob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const previewBlob = dataUrlToBlob(exported.previewDataUrl);
      const sourcePath = `${userId}/sources/${sourceId}/${safeStorageName(`${title.trim()}.json`)}`;
      const previewPath = `${userId}/previews/${sourceId}/${safeStorageName(`${title.trim()}-preview.png`)}`;
      const sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, templateBlob, {
        upsert: false,
        contentType: 'application/json'
      });
      if (sourceUpload.error) throw sourceUpload.error;
      uploadedPaths.push(sourcePath);
      const previewUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, previewBlob, {
        upsert: false,
        contentType: previewBlob.type || 'image/png'
      });
      if (previewUpload.error) throw previewUpload.error;
      uploadedPaths.push(previewPath);
      let hasTemplateThumbnail = false;
      try {
        const thumbnailBlob = await generateThumbnail(new File([previewBlob], 'template-preview.png', { type: previewBlob.type || 'image/png' }), 480);
        const thumbnailFile = thumbnailBlob || (previewBlob.size <= 512 * 1024 ? previewBlob : null);
        if (thumbnailFile) {
          const thumbnailPath = `${userId}/sources/${sourceId}/_thumb.jpg`;
          const thumbnailUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(thumbnailPath, thumbnailFile, {
            upsert: true,
            contentType: thumbnailBlob ? 'image/jpeg' : (previewBlob.type || 'image/png')
          });
          if (!thumbnailUpload.error) {
            uploadedPaths.push(thumbnailPath);
            hasTemplateThumbnail = true;
          } else {
            console.warn('Template thumbnail upload failed:', thumbnailUpload.error);
          }
        }
      } catch (thumbnailError) {
        console.warn('Template thumbnail generation failed:', thumbnailError);
      }
      const dimensions = await readImageDimensions(new File([previewBlob], 'template-preview.png', { type: previewBlob.type || 'image/png' }));
      const savedProjectBoards = snapshot?.editorState?.artboards || {};
      const savedProjectBoardCount = Object.keys(savedProjectBoards).filter(function(boardId) {
        return Array.isArray(savedProjectBoards[boardId]?.layers) && savedProjectBoards[boardId].layers.length > 0;
      }).length;
      const templateTags = normalizeLibraryTags('template', savedProjectBoardCount > 1
        ? ['模版', '社媒物料', '套组']
        : ['模版', '社媒物料']);
      if (hasTemplateThumbnail) templateTags.push(LIBRARY_THUMBNAIL_TAG);
      const sourceInsert = await state.supabase.from('vf_source_files').insert([{
        id: sourceId,
        title: title.trim(),
        country_id: null,
        activity_id: null,
        category_id: null,
        tags: templateTags,
        visibility: 'all',
        source_path: sourcePath,
        source_filename: `${title.trim()}.json`,
        source_mime_type: 'application/json',
        source_size_bytes: templateBlob.size,
        source_ext: 'json',
        uploaded_by: userId
      }]);
      if (sourceInsert.error) throw sourceInsert.error;
      sourceInserted = true;
      const previewId = crypto.randomUUID();
      const previewInsert = await state.supabase.from('vf_asset_previews').insert([{
        id: previewId,
        source_file_id: sourceId,
        preview_path: previewPath,
        preview_filename: `${title.trim()}-preview.png`,
        preview_mime_type: previewBlob.type || 'image/png',
        preview_size_bytes: previewBlob.size,
        width: dimensions.width,
        height: dimensions.height,
        sort_order: 10
      }]);
      if (previewInsert.error) throw previewInsert.error;
      // 顶部开发者入口原先只写云端，已预加载的 DIY 目录不会自动知道。
      // 保存成功后立即重取该 iframe 的轻量模板目录，无需刷新整页。
      await invalidateSavedTemplate(sourcePath);
      state.librarySessionHiddenSourceIds.delete(sourceId);
      var savedAt = new Date().toISOString();
      var savedSource = {
        id: sourceId, title: title.trim(), tags: templateTags,
        country_id: null, activity_id: null, category_id: null,
        visibility: 'all', source_path: sourcePath,
        source_filename: title.trim() + '.json', source_mime_type: 'application/json',
        source_size_bytes: templateBlob.size, source_ext: 'json', uploaded_by: userId,
        created_at: savedAt, updated_at: savedAt
      };
      var savedPreview = {
        id: previewId, source_file_id: sourceId, preview_path: previewPath,
        preview_filename: title.trim() + '-preview.png',
        preview_mime_type: previewBlob.type || 'image/png', preview_size_bytes: previewBlob.size,
        width: dimensions.width, height: dimensions.height, sort_order: 10, created_at: savedAt
      };
      if (!state.librarySources.some(function(source) { return source.id === sourceId; })) state.librarySources.unshift(savedSource);
      if (!state.libraryPreviews.some(function(preview) { return preview.id === previewId; })) state.libraryPreviews.unshift(savedPreview);
      state.libraryPreviewUrls[previewPath] = exported.previewDataUrl;
      var staticFrame = state.toolFrames.static;
      if (staticFrame && staticFrame.contentWindow) await handleFetchTemplates(staticFrame.contentWindow);
      alert(state.lang === 'zh' ? '已保存到模板库。' : 'Saved to Template Library.');
    } catch (error) {
      await cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths);
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  // ===== 顶部同步进度条 =====
  var _syncQueue = [];
  var globalAITaskId = '';
  var globalAITaskSource = null;
  var globalAITaskHideTimer = 0;
  function hideGlobalAITaskStatus() {
    var status = document.getElementById('global-ai-task-status');
    clearTimeout(globalAITaskHideTimer);
    globalAITaskHideTimer = 0;
    globalAITaskId = '';
    globalAITaskSource = null;
    if (status) status.hidden = true;
  }
  function cancelGlobalAITask() {
    var cancel = document.getElementById('global-ai-task-cancel');
    if (!globalAITaskId || !globalAITaskSource) return;
    globalAITaskSource.postMessage({ type: 'vf:cancel-ai-task', taskId: globalAITaskId }, location.origin);
    if (cancel) {
      cancel.disabled = true;
      cancel.textContent = state.lang === 'zh' ? '正在取消…' : 'Cancelling…';
    }
  }
  function showGlobalAITaskStatus(message, sourceWindow) {
    var status = document.getElementById('global-ai-task-status');
    var indicator = status?.querySelector('.global-ai-task-indicator');
    var copy = document.getElementById('global-ai-task-copy');
    var cancel = document.getElementById('global-ai-task-cancel');
    var close = document.getElementById('global-ai-task-close');
    if (!status || !indicator || !copy || !cancel || !close) return;
    var phase = message?.status === 'success' || message?.status === 'error' ? message.status : (message?.status === 'idle' ? 'idle' : 'running');
    var taskId = String(message?.taskId || '');
    if (phase === 'idle') {
      if (!taskId || !globalAITaskId || taskId === globalAITaskId) hideGlobalAITaskStatus();
      return;
    }
    if (phase !== 'running' && taskId && globalAITaskId && taskId !== globalAITaskId) return;
    if (taskId) globalAITaskId = taskId;
    if (sourceWindow) globalAITaskSource = sourceWindow;
    clearTimeout(globalAITaskHideTimer);
    globalAITaskHideTimer = 0;
    status.hidden = false;
    status.classList.toggle('is-success', phase === 'success');
    status.classList.toggle('is-error', phase === 'error');
    status.setAttribute('aria-live', phase === 'running' ? 'polite' : 'assertive');
    copy.textContent = String(message?.message || (state.lang === 'zh'
      ? (phase === 'running' ? '正在生成图片…' : phase === 'success' ? '图片生成完成' : '图片生成失败')
      : (phase === 'running' ? 'Generating image…' : phase === 'success' ? 'Image generation complete' : 'Image generation failed')));
    if (phase === 'running') {
      indicator.innerHTML = '<span class="global-ai-task-spinner"></span>';
      cancel.hidden = message?.cancellable !== true;
      cancel.disabled = false;
      cancel.textContent = state.lang === 'zh' ? '取消生图' : 'Cancel';
      close.hidden = true;
      return;
    }
    cancel.hidden = true;
    indicator.textContent = phase === 'success' ? '✓' : '!';
    close.hidden = false;
    close.setAttribute('aria-label', state.lang === 'zh' ? '关闭提醒' : 'Dismiss notification');
    globalAITaskHideTimer = setTimeout(hideGlobalAITaskStatus, 7000);
  }
  function showGlobalProgress(text) {
    var bar = document.getElementById('sync-progress-bar');
    var fill = document.getElementById('sync-progress-fill');
    var toast = document.getElementById('sync-progress-toast');
    if (bar) bar.style.display = 'block';
    if (fill) fill.style.width = '30%';
    if (toast) { toast.style.display = 'block'; toast.textContent = text || (state.lang === 'zh' ? '正在同步...' : 'Syncing...'); }
  }
  function updateGlobalProgress(percent, text) {
    var fill = document.getElementById('sync-progress-fill');
    var toast = document.getElementById('sync-progress-toast');
    if (fill) fill.style.width = (percent || 50) + '%';
    if (toast && text) toast.textContent = text;
  }
  function hideGlobalProgress(doneText) {
    var bar = document.getElementById('sync-progress-bar');
    var fill = document.getElementById('sync-progress-fill');
    var toast = document.getElementById('sync-progress-toast');
    if (fill) fill.style.width = '100%';
    if (toast) {
      const finalText = doneText || (state.lang === 'zh' ? '✅ 同步完成' : '✅ Sync complete');
      toast.textContent = finalText;
      toast.style.background = finalText.startsWith('❌') ? '#dc2626' : '#0d9488';
    }
    setTimeout(function() {
      if (bar) bar.style.display = 'none';
      if (fill) fill.style.width = '0%';
      if (toast) { toast.style.display = 'none'; toast.style.background = '#0f172a'; }
    }, 2000);
  }
  // ===== 静态DIY模板 ↔ 素材库同步 =====
  var staticTemplateFetchByWindow = new WeakMap();
  function queueStaticTemplateFetch(sourceWindow) {
    if (!sourceWindow) return Promise.resolve();
    var active = staticTemplateFetchByWindow.get(sourceWindow);
    if (active) return active;
    var timeoutId = 0;
    var timeout = new Promise(function(resolve) {
      timeoutId = setTimeout(function() {
        try {
          sourceWindow.postMessage({
            type: 'vf:templates-loaded',
            error: state.lang === 'zh'
              ? '资产清单读取超时，正在自动重试'
              : 'Asset catalog timed out. Retrying automatically.'
          }, location.origin);
        } catch (_error) {}
        resolve();
      }, 20000);
    });
    var request = Promise.race([Promise.resolve(handleFetchTemplates(sourceWindow)), timeout]).finally(function() {
      clearTimeout(timeoutId);
      if (staticTemplateFetchByWindow.get(sourceWindow) === request) staticTemplateFetchByWindow.delete(sourceWindow);
    });
    staticTemplateFetchByWindow.set(sourceWindow, request);
    return request;
  }

  async function handleToolMessage(event) {
    var msg = event.data;
    // Icon tool messages are scoped to its registered same-origin iframe.
    // Do not pass them into Static DIY asset/template handlers.
    if (event.source && event.source === state.toolFrames.icons?.contentWindow) {
      if (event.origin !== location.origin || !msg || typeof msg !== 'object') return;
      if (msg.type === 'vf:tool-ready' && msg.protocolVersion === 1 && msg.toolType === 'icons') {
        const iconFrame = state.toolFrames.icons;
        iconFrame.dataset.iconReady = '1';
        broadcastInterfaceMode(iconFrame);
        broadcastUiLanguage(iconFrame);
      }
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;
    // 只接受来自静态DIY iframe 的消息
    if (!msg.type.startsWith('vf:')) return;
    var sourceWindow = event.source;
    switch (msg.type) {
      case 'vf:static-ready':
        var readyFrame = state.toolFrames.static;
        if (readyFrame && readyFrame.contentWindow === sourceWindow) readyFrame.dataset.staticAssetsReady = '1';
        // 预热必须包含云端目录；只预热 iframe 外壳会把真正的长等待推迟到用户点击 DIY 时。
        queueStaticTemplateFetch(sourceWindow);
        break;
      case 'vf:static-catalog-ready':
        var catalogFrame = state.toolFrames.static;
        if (catalogFrame && catalogFrame.contentWindow === sourceWindow) {
          catalogFrame.dataset.staticCatalogReady = '1';
          catalogFrame.dataset.staticCatalogSyncedAt = String(Date.now());
          finishStaticToolLoadingWhenReady(catalogFrame);
        }
        break;
      case 'vf:static-visible-ready':
        var visibleFrame = state.toolFrames.static;
        if (visibleFrame && visibleFrame.contentWindow === sourceWindow
            && Number(msg.generation || 0) === Number(visibleFrame.dataset.staticVisibleGeneration || 0)) {
          visibleFrame.dataset.staticVisibleReady = '1';
          finishStaticToolLoadingWhenReady(visibleFrame);
        }
        break;
      case 'vf:save-template':
        await handleSaveTemplate(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:delete-template':
        await handleDeleteTemplate(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:purge-recycle-bin':
        await handlePurgeRecycleBin(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:template-recycle-state':
        setLibraryTemplateRecycleState(msg.sourceId, msg.hidden !== false);
        break;
      case 'vf:request-templates':
        queueStaticTemplateFetch(sourceWindow);
        break;
      case 'vf:request-template-data':
        handleFetchSingleTemplate(msg.id, sourceWindow);
        break;
      case 'vf:request-template-metadata':
        handleFetchTemplateMetadata(msg.id, sourceWindow);
        break;
      case 'vf:open-template-bookmark':
        await openLibraryBookmarkPopup(msg.id);
        break;
      case 'vf:rename-template':
        handleRenameTemplate(msg.id, msg.name, sourceWindow);
        break;
      case 'vf:set-template-language':
        await handleSetTemplateLanguage(msg, sourceWindow);
        break;
      case 'vf:move-component-group':
        await handleMoveComponentGroup(msg);
        break;
      case 'vf:save-font':
        await handleSaveTemplate(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:update-template-bookmark':
        await handleUpdateTemplateBookmark(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:dissolve-template-bookmark':
        await handleDissolveTemplateBookmark(msg, sourceWindow);
        refreshLibraryIfOpen();
        break;
      case 'vf:fetch-font-binary':
        handleFetchFontBinary(msg, sourceWindow);
        break;
      case 'vf:save-shared-assets':
        await handleSaveSharedAssets(msg, sourceWindow, event.origin);
        break;
      case 'vf:shared-assets-status':
        if (msg.status === 'uploading') showGlobalProgress(msg.message || (state.lang === 'zh' ? '正在同步配色方案…' : 'Syncing color scheme…'));
        else if (msg.status === 'done') hideGlobalProgress(msg.message || (state.lang === 'zh' ? '✅ 配色方案已同步' : '✅ Color scheme synced'));
        else if (msg.status === 'error') hideGlobalProgress(msg.message || (state.lang === 'zh' ? '❌ 配色方案同步失败' : '❌ Color scheme sync failed'));
        break;
      case 'vf:ai-task-status':
        if (state.toolFrames.static?.contentWindow === sourceWindow) showGlobalAITaskStatus(msg, sourceWindow);
        break;
    }
  }

  async function handleSaveTemplate(msg, sourceWindow) {
    if (state.localPreview || !state.supabase || !state.session) {
      replySyncProgress(sourceWindow, 'error', null, 'Not logged in');
      return;
    }
    showGlobalProgress(state.lang === 'zh' ? ('⏳ 正在保存「' + (msg.name || '模板') + '」到素材库...') : ('⏳ Saving "' + (msg.name || 'template') + '" to the library...'));
    replySyncProgress(sourceWindow, 'uploading');
    var sourceId = crypto.randomUUID();
    var uploadedPaths = [];
    var sourceInserted = false;
    try {
      var userId = state.session.user.id;
      // 重名检测：如已有同名模板 → 名称加数字后缀
      var finalName = msg.name || (state.lang === 'zh' ? '未命名模板' : 'Untitled template');
      var { data: existing } = await state.supabase.from('vf_source_files')
        .select('title').ilike('title', finalName + '%').limit(20);
      if (existing && existing.length > 0) {
        var existingNames = existing.map(function(r) { return r.title; });
        var suffix = 2;
        var candidate = finalName + ' (' + suffix + ')';
        while (existingNames.indexOf(candidate) !== -1) {
          suffix++;
          candidate = finalName + ' (' + suffix + ')';
        }
        finalName = candidate;
      }
      // 构建 JSON 数据
      var schemaMap = { pack: 'vf-template-pack/v1', bookmark: 'vf-template-bookmark/v1', layout: 'vf-layout-preset/v1', tagcombo: 'vf-tag-combo/v1', logo: 'vf-logo-asset/v1', font: 'vf-font-asset/v1', groupcombo: 'vf-group-combo/v1' };
      var schemaName = schemaMap[msg.templateType] || 'vf-layout-preset/v1';
      var jsonData = { schema: schemaName, name: finalName, exportedAt: new Date().toISOString() };
      if (msg.templateType === 'pack') {
        jsonData.artboards = msg.data.artboards;
        jsonData.artboardPresets = msg.data.artboardPresets || [];
        jsonData.linkedArtboardGroupId = msg.data.linkedArtboardGroupId || '';
        jsonData.linkedArtboardIds = msg.data.linkedArtboardIds || [];
        jsonData.linked = !!jsonData.linkedArtboardIds.length;
      } else if (msg.templateType === 'bookmark') {
        // 快捷书签仅保存已有模板的引用，不复制模板图层或画板数据。
        jsonData.templateRefs = Array.isArray(msg.data?.templateRefs) ? msg.data.templateRefs : [];
        jsonData.coverTemplateId = msg.data?.coverTemplateId || '';
      } else if (msg.templateType === 'tagcombo' || msg.templateType === 'groupcombo') {
        jsonData.elements = msg.data.elements || [];
      } else if (msg.templateType === 'logo') {
        jsonData.src = msg.data.src || '';
      } else if (msg.templateType === 'font') {
        jsonData.familyName = msg.familyName || finalName;
        jsonData.familyId = msg.familyId || '';
        jsonData.weight = msg.weight || 400;
        jsonData.weightLabel = msg.weightLabel || (state.lang === 'zh' ? '常规' : 'Regular');
        jsonData.fileName = msg.fileName || (finalName + '.ttf');
        jsonData.data = msg.data || '';
      } else {
        jsonData.size = msg.data.size || '';
        jsonData.canvasW = msg.data.canvasW || 0;
        jsonData.canvasH = msg.data.canvasH || 0;
        jsonData.canvasLanguage = msg.data.canvasLanguage === 'ar' ? 'ar' : 'en';
        jsonData.canvasLanguagesInitialized = {
          en: msg.data.canvasLanguagesInitialized?.en === true,
          ar: msg.data.canvasLanguagesInitialized?.ar === true
        };
        jsonData.elements = msg.data.elements || [];
      }
      var jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      // 预览图处理
      var previewBlob = msg.previewDataUrl ? dataUrlToBlob(msg.previewDataUrl) : null;
      if (previewBlob && previewBlob.size > 2 * 1024 * 1024) {
        previewBlob = await compressImageBlob(previewBlob, 2 * 1024 * 1024);
      }
      // 上传到 Supabase Storage
      var sourcePath = userId + '/sources/' + sourceId + '/' + safeStorageName(finalName + '.json');
      var sourceUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, jsonBlob, { upsert: false, contentType: 'application/json' });
      if (sourceUpload.error) throw sourceUpload.error;
      uploadedPaths.push(sourcePath);
      var previewPath = '', dimensions = { width: 0, height: 0 };
      var hasTemplateThumbnail = false;
      if (previewBlob) {
        previewPath = userId + '/previews/' + sourceId + '/' + safeStorageName(finalName + '-preview.png');
        var previewUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, previewBlob, { upsert: false, contentType: previewBlob.type || 'image/png' });
        if (previewUpload.error) throw previewUpload.error;
        uploadedPaths.push(previewPath);
        dimensions = await readImageDimensions(new File([previewBlob], 'preview.png', { type: previewBlob.type || 'image/png' }));
        try {
          var thumbnailBlob = await generateThumbnail(new File([previewBlob], 'preview.png', { type: previewBlob.type || 'image/png' }), 480);
          var thumbnailFile = thumbnailBlob || (previewBlob.size <= 512 * 1024 ? previewBlob : null);
          if (thumbnailFile) {
            var thumbnailPath = userId + '/sources/' + sourceId + '/_thumb.jpg';
            var thumbnailUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(thumbnailPath, thumbnailFile, { upsert: true, contentType: thumbnailBlob ? 'image/jpeg' : (previewBlob.type || 'image/png') });
            if (!thumbnailUpload.error) {
              uploadedPaths.push(thumbnailPath);
              hasTemplateThumbnail = true;
            } else {
              console.warn('Template thumbnail upload failed:', thumbnailUpload.error);
            }
          }
        } catch (thumbnailError) {
          console.warn('Template thumbnail generation failed:', thumbnailError);
        }
      }
      // 插入数据库
      // 按新标签结构分配 tag1/tag2
      var tagMap = {
        layout: ['模版', msg.subTag || '社媒物料'],
        pack: ['模版', msg.subTag || '社媒物料', '套组'],
        bookmark: ['模版', '模板书签'],
        full: ['模版', msg.subTag || '社媒物料'],
        tagcombo: ['组件', msg.subTag || '标签'],
        logo: ['组件', msg.subTag || 'LOGO'],
        font: ['组件', msg.subTag || '字体'],
        groupcombo: ['组件', msg.subTag || '组合']
      };
      var tagsToUse = tagMap[msg.templateType] || ['模版', '社媒物料'];
      var normalizedTags = normalizeLibraryTags('template', tagsToUse);
      if (hasTemplateThumbnail) normalizedTags.push(LIBRARY_THUMBNAIL_TAG);
      // 组合组件可保存到任意子分组（标签/KIKI/其他素材/组合），用 vf:type 锁定本质类型，
      // 避免按「标签」等二级标签反向推断成 tagcombo 导致打开错乱。
      if (msg.templateType === 'groupcombo') normalizedTags.push('vf:type:groupcombo');
      var sourceInsert = await state.supabase.from('vf_source_files').insert([{
        id: sourceId,
        title: finalName,
        country_id: null, activity_id: null, category_id: null,
        tags: normalizedTags,
        visibility: 'all',
        source_path: sourcePath,
        source_filename: finalName + '.json',
        source_mime_type: 'application/json',
        source_size_bytes: jsonBlob.size,
        source_ext: 'json',
        uploaded_by: userId
      }]);
      if (sourceInsert.error) throw sourceInsert.error;
      sourceInserted = true;
      if (previewBlob) {
        var previewInsert = await state.supabase.from('vf_asset_previews').insert([{
          id: crypto.randomUUID(),
          source_file_id: sourceId,
          preview_path: previewPath,
          preview_filename: finalName + '-preview.png',
          preview_mime_type: previewBlob.type || 'image/png',
          preview_size_bytes: previewBlob.size,
          width: dimensions.width, height: dimensions.height,
          sort_order: 10
        }]);
        if (previewInsert.error) throw previewInsert.error;
      }
      // 立即更新内存中的 library 数据，切换时无需等 Supabase 复制
      state.librarySources.push({
        id: sourceId, title: finalName, tags: normalizedTags,
        country_id: null, activity_id: null, category_id: null,
        source_path: sourcePath, source_filename: finalName + '.json',
        source_mime_type: 'application/json', source_size_bytes: jsonBlob.size,
        source_ext: 'json', uploaded_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        canvasW: jsonData.canvasW || 0, canvasH: jsonData.canvasH || 0
      });
      if (previewBlob) {
        state.libraryPreviews.push({
          id: crypto.randomUUID(), source_file_id: sourceId,
          preview_path: previewPath, preview_filename: finalName + '-preview.png',
          preview_mime_type: previewBlob.type || 'image/png', preview_size_bytes: previewBlob.size,
          width: dimensions.width, height: dimensions.height, sort_order: 10
        });
        state.libraryPreviewUrls[previewPath] = msg.previewDataUrl || '';
      }
      state.libraryDataLoaded = true;
      await invalidateSavedTemplate(sourcePath);
      updateGlobalProgress(80, state.lang === 'zh' ? ('正在保存「' + finalName + '」...') : ('Saving "' + finalName + '"...'));
      replySyncProgress(sourceWindow, 'done', sourceId, null, finalName, msg.name, msg.tempId);
      hideGlobalProgress(state.lang === 'zh' ? ('✅「' + finalName + '」已保存') : ('✅ "' + finalName + '" saved'));
    } catch (error) {
      await cleanupFailedLibraryUpload(sourceId, sourceInserted, uploadedPaths);
      replySyncProgress(sourceWindow, 'error', null, error.message, msg.name, msg.tempId);
      hideGlobalProgress(state.lang === 'zh' ? '❌ 保存失败' : '❌ Save failed');
    }
  }

  function replySyncProgress(sourceWindow, status, sourceId, error, finalName, originalName, tempId) {
    try {
      sourceWindow.postMessage({ type: 'vf:sync-progress', status: status, sourceId: sourceId || '', error: error || '', finalName: finalName || '', originalName: originalName || '', tempId: tempId || '' }, location.origin);
    } catch (e) { /* 忽略发送失败 */ }
  }

  async function handleDeleteTemplate(msg, sourceWindow) {
    if (!msg.sourceId || state.localPreview || !state.supabase) return false;
    try {
      var { data: src } = await state.supabase.from('vf_source_files').select('source_path').eq('id', msg.sourceId).single();
      if (src && src.source_path) {
        var userId = state.session ? state.session.user.id : '';
        // 预览图文件夹属于原上传者（source_path 第一段是上传者 uid），
        // 不能用当前登录用户的 uid 拼，否则删除他人模板时预览图会清不干净。
        var ownerId = (src.source_path || '').split('/')[0] || userId;
        var previewsPath = ownerId + '/previews/' + msg.sourceId + '/';
        var { data: previews } = await state.supabase.storage.from(LIBRARY_BUCKET).list(previewsPath, { limit: 10 });
        var pathsToDelete = [src.source_path];
        if (previews && previews.length > 0) {
          previews.forEach(function(p) { pathsToDelete.push(previewsPath + p.name); });
        }
        await state.supabase.storage.from(LIBRARY_BUCKET).remove(pathsToDelete);
      }
      // 用 .select() 取回实际被删除的行：RLS 拒绝（非本人上传 / 无权限）或 id 不存在时，
      // delete 返回空数组且不抛错，必须显式判断，否则会误以为删除成功，导致模板刷新后“复活”。
      var { data: deleted, error: deleteError } = await state.supabase.from('vf_source_files').delete().eq('id', msg.sourceId).select();
      if (deleteError) throw deleteError;
      if (!deleted || deleted.length === 0) {
        console.warn('Template delete blocked (RLS/not owner):', msg.sourceId);
        return false;
      }
      // 立即从内存移除，无需等 Supabase 复制
      state.librarySources = state.librarySources.filter(function(s) { return s.id !== msg.sourceId; });
      state.libraryPreviews = state.libraryPreviews.filter(function(p) { return p.source_file_id !== msg.sourceId; });
      state.librarySessionHiddenSourceIds.delete(msg.sourceId);
      return true;
    } catch (error) {
      console.warn('Template delete failed:', error);
      return false;
    }
  }

  async function handleUpdateTemplateBookmark(msg, sourceWindow) {
    if (state.localPreview || !state.supabase || !state.session || !msg.id) {
      try { sourceWindow.postMessage({ type: 'vf:bookmark-update-error', id: msg.id || '', error: 'Not logged in' }, location.origin); } catch (_error) {}
      return;
    }
    try {
      var { data: sourceRows, error: sourceError } = await state.supabase.from('vf_source_files')
        .select('id, source_path, updated_at, source_size_bytes').eq('id', msg.id).limit(1);
      if (sourceError || !sourceRows || !sourceRows.length) throw (sourceError || new Error(state.lang === 'zh' ? '模板书签不存在' : 'Template bookmark does not exist.'));
      var source = sourceRows[0];
      var refs = Array.isArray(msg.data?.templateRefs) ? msg.data.templateRefs : [];
      var snapshot = {
        schema: 'vf-template-bookmark/v1',
        name: msg.name || (state.lang === 'zh' ? '未命名模板套组' : 'Untitled template group'),
        exportedAt: new Date().toISOString(),
        templateRefs: refs,
        coverTemplateId: msg.data?.coverTemplateId || ''
      };
      var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      var upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(source.source_path, blob, { upsert: true, contentType: 'application/json' });
      if (upload.error) throw upload.error;
      await invalidateSavedTemplate(source.source_path);
      _templateMetadataCache[msg.id] = { templateRefs: refs, coverTemplateId: snapshot.coverTemplateId };
      // 封面变化时同步刷新素材库静态预览图，保证素材库与资产库显示一致。
      if (msg.previewDataUrl) {
        try {
          var previewBlob = dataUrlToBlob(msg.previewDataUrl);
          if (previewBlob && previewBlob.size > 2 * 1024 * 1024) previewBlob = await compressImageBlob(previewBlob, 2 * 1024 * 1024);
          if (previewBlob) {
            var userId = state.session.user.id;
            var previewRes = await state.supabase.from('vf_asset_previews').select('id, preview_path').eq('source_file_id', msg.id).limit(1);
            var existingPreview = previewRes.data && previewRes.data[0];
            var previewPath = existingPreview?.preview_path || (userId + '/previews/' + msg.id + '/' + safeStorageName((msg.name || 'bookmark') + '-preview.png'));
            var previewUpload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(previewPath, previewBlob, { upsert: true, contentType: previewBlob.type || 'image/png' });
            if (!previewUpload.error) {
              var dimensions = await readImageDimensions(new File([previewBlob], 'preview.png', { type: previewBlob.type || 'image/png' }));
              if (existingPreview) {
                await state.supabase.from('vf_asset_previews').update({ preview_size_bytes: previewBlob.size, width: dimensions.width, height: dimensions.height }).eq('id', existingPreview.id);
              } else {
                await state.supabase.from('vf_asset_previews').insert([{ id: crypto.randomUUID(), source_file_id: msg.id, preview_path: previewPath, preview_filename: (msg.name || 'bookmark') + '-preview.png', preview_mime_type: previewBlob.type || 'image/png', preview_size_bytes: previewBlob.size, width: dimensions.width, height: dimensions.height, sort_order: 10 }]);
              }
              state.libraryPreviewUrls[previewPath] = msg.previewDataUrl;
            }
          }
        } catch (_error) {
          console.warn('Bookmark preview sync failed:', _error);
        }
      }
      try {
        sourceWindow.postMessage({ type: 'vf:bookmark-updated', id: msg.id, name: snapshot.name, templateRefs: refs, coverTemplateId: snapshot.coverTemplateId }, location.origin);
      } catch (_error) {}
    } catch (error) {
      console.warn('Template bookmark update failed:', error);
      try { sourceWindow.postMessage({ type: 'vf:bookmark-update-error', id: msg.id, error: error.message || (state.lang === 'zh' ? '更新失败' : 'Update failed') }, location.origin); } catch (_error) {}
    }
  }

  async function handlePurgeRecycleBin(msg, sourceWindow) {
    var ids = Array.from(new Set((msg.sourceIds || []).filter(Boolean)));
    var failed = [];
    for (var i = 0; i < ids.length; i += 1) {
      var ok = await handleDeleteTemplate({ sourceId: ids[i] }, sourceWindow);
      if (!ok) failed.push(ids[i]);
    }
    try { sourceWindow.postMessage({ type: 'vf:recycle-purged', failed: failed }, location.origin); } catch (_error) {}
  }

  function setLibraryTemplateRecycleState(sourceId, hidden) {
    if (!sourceId) return;
    if (hidden) state.librarySessionHiddenSourceIds.add(sourceId);
    else state.librarySessionHiddenSourceIds.delete(sourceId);
    // 素材库已在当前页面打开时原位重绘；其他页面只更新内存，
    // 下次进入素材库就会直接使用已同步的隐藏状态。
    if (state.route === 'library') {
      refreshLibraryFilterCounts();
      renderLibraryGrid();
    }
  }

  async function runTemplatePreviewTasks(tasks, batchSize = 6) {
    for (let index = 0; index < tasks.length; index += batchSize) {
      while (_templateSourceCache?.foregroundActive()) await new Promise(function(resolve) { setTimeout(resolve, 100); });
      await Promise.all(tasks.slice(index, index + batchSize).map(function(start) { return start(); }));
    }
  }
  async function handleFetchTemplates(sourceWindow) {
    if (state.localPreview || !state.supabase) {
      try { sourceWindow.postMessage({ type: 'vf:templates-loaded', templates: [] }, location.origin); } catch (e) {}
      return;
    }
    const catalogScope = templateCacheScope();
    try {
      // 同时拉取 template 和 source 类型的资产，确保素材库里上传的背景图也能在 DIY 里显示
      var { data: sources, error } = await state.supabase.from('vf_source_files')
        .select('id, title, tags, source_path, updated_at, source_size_bytes')
        .or('tags.cs.{vf:kind:template},tags.cs.{vf:kind:source}')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      // 模板不再区分 EN / AR。读取时一次性清理历史云端语言标签，
      // 同时更新当前内存数据，避免旧角标或语言筛选再次出现。
      var languageTaggedSources = (sources || []).filter(function(source) {
        return Array.isArray(source.tags) && (source.tags.includes('vf:lang:EN') || source.tags.includes('vf:lang:AR'));
      });
      for (var cleanupIndex = 0; cleanupIndex < languageTaggedSources.length; cleanupIndex += 20) {
        await Promise.all(languageTaggedSources.slice(cleanupIndex, cleanupIndex + 20).map(async function(source) {
          var cleanedTags = source.tags.filter(function(tag) { return tag !== 'vf:lang:EN' && tag !== 'vf:lang:AR'; });
          var cleanupResult = await state.supabase.from('vf_source_files').update({ tags: cleanedTags }).eq('id', source.id);
          if (!cleanupResult.error) {
            source.tags = cleanedTags;
            var localSource = state.librarySources.find(function(item) { return item.id === source.id; });
            if (localSource) localSource.tags = cleanedTags;
          } else {
            console.warn('Template language tag cleanup failed:', source.id, cleanupResult.error);
          }
        }));
      }
      // DIY 只接收模板库条目及明确标记为组件的 source 条目。
      // 案例库同样使用 vf:kind:source，不能只按该标记直接混入 DIY。
      sources = (sources || []).filter(function(source) {
        var tags = source.tags || [];
        var isCaseAsset = tags.includes('案例库') || tags.includes('案例') || tags.includes('案例素材');
        var isTemplateAsset = tags.includes('vf:kind:template');
        var isDiyComponent = ['组件', '标签', '背景', '品牌圆弧', 'LOGO', 'Logo', 'KIKI', '其他素材', '字体', '组合']
          .some(function(tag) { return tags.includes(tag); });
        return !isCaseAsset && (isTemplateAsset || isDiyComponent);
      });
      // 查询所有预览图
      var sourceIds = (sources || []).map(function(s) { return s.id; });
      var previewMap = {};
      var previewDims = {}; // { sourceId: { w, h } }
      var previews = [];
      if (sourceIds.length > 0) {
        // Keep the same complete preview record shape used by the Library route.
        // The old DIY bootstrap omitted `id`, then merged by preview.id, causing
        // all records to overwrite the same undefined key.
        for (const idBatch of chunkArray(sourceIds, SUPABASE_IN_BATCH_SIZE)) {
          const previewResult = await caseAwareQuery(full => state.supabase.from('vf_asset_previews')
            .select('id,source_file_id,preview_path,preview_filename,preview_mime_type,preview_size_bytes,width,height' + (full ? ',material_type' : '') + ',sort_order,created_at')
            .in('source_file_id', idBatch)
            .order('sort_order', { ascending: true }));
          if (previewResult.error) throw translateCaseSchemaError(previewResult.error);
          previews.push(...(previewResult.data || []));
        }
        // 每个 source 取第一个预览图
        var seen = {};
        previews.forEach(function(p) {
          if (!seen[p.source_file_id] && p.preview_path) {
            seen[p.source_file_id] = true;
            previewMap[p.source_file_id] = p.preview_path;
            if (p.width && p.height) previewDims[p.source_file_id] = { w: p.width, h: p.height };
          }
        });
      }
      // 先准备轻量元数据（不包含预览 URL），再后台下载预览图 + JSON。
      // 书签关系必须在首次列表绘制前可用；否则 iframe 会先把书签成员当普通模板
      // 全部渲染出来，等书签 JSON 到达后再移走，既浪费 DOM 工作也会明显闪烁。
      var templates = [];
      for (var i = 0; i < (sources || []).length; i++) {
        var s = sources[i];
        var t = s.tags || [];
        var templateType = resolveTemplateType(t);
        var dims = previewDims[s.id] || {};
        templates.push({ id: s.id, name: s.title, templateType: templateType, tags: t, previewW: dims.w || 0, previewH: dims.h || 0, updatedAt: s.updated_at || '' });
      }
      var bookmarkTemplates = templates.filter(function(template) { return template.templateType === 'bookmark'; });
      await Promise.all(bookmarkTemplates.map(async function(template) {
        var bookmarkSource = (sources || []).find(function(source) { return source.id === template.id; });
        try {
          var bookmarkMetadata = await Promise.race([
            loadTemplateMetadata(template.id, bookmarkSource),
            new Promise(function(_resolve, reject) {
              setTimeout(function() { reject(new Error('Bookmark metadata timeout')); }, 5000);
            })
          ]);
          template.templateRefs = Array.isArray(bookmarkMetadata.templateRefs) ? bookmarkMetadata.templateRefs : [];
          template.coverTemplateId = bookmarkMetadata.coverTemplateId || '';
          template.metadataLoaded = true;
        } catch (bookmarkError) {
          // 单个旧书签损坏时仍允许素材库打开；后续常规元数据预取会继续重试。
          console.warn('Bootstrap bookmark metadata failed:', template.id, bookmarkError);
        }
      }));
      // DIY 预热只能在父页面素材库尚未开始读取时填充内存。
      // 素材库正在加载、已加载或当前可见时都不能被 DIY 的局部查询覆盖。
      var shouldWarmParentLibrary =
        state.route !== 'library' &&
        !state.libraryDataLoaded &&
        !state.libraryDataPromise;
      if (shouldWarmParentLibrary) {
        var warmSourceMap = new Map((state.librarySources || []).map(function(source) { return [source.id, source]; }));
        (sources || []).forEach(function(source) { warmSourceMap.set(source.id, source); });
        state.librarySources = Array.from(warmSourceMap.values());
        var warmPreviewMap = new Map((state.libraryPreviews || []).map(function(preview) { return [preview.id, preview]; }));
        (previews || []).forEach(function(preview) { warmPreviewMap.set(preview.id, preview); });
        state.libraryPreviews = Array.from(warmPreviewMap.values());
      }
      var bookmarkMemberPriority = new Set();
      bookmarkTemplates.forEach(function(template) {
        if (!template.metadataLoaded) return;
        var bookmarkSource = (sources || []).find(function(source) { return source.id === template.id; });
        if (!bookmarkSource) return;
        var refs = Array.isArray(template.templateRefs) ? template.templateRefs : [];
        refs.forEach(function(ref) {
          var memberId = typeof ref === 'string' ? ref : ref?.templateId;
          if (memberId) {
            bookmarkMemberPriority.add(memberId);
            if (shouldWarmParentLibrary) state.libraryBookmarkMemberIds.add(memberId);
          }
        });
        if (shouldWarmParentLibrary) {
          state.libraryBookmarkGroups = state.libraryBookmarkGroups.filter(function(group) {
            return group.source.id !== template.id;
          });
          state.libraryBookmarkGroups.push({
            source: bookmarkSource,
            refs: refs,
            coverTemplateId: template.coverTemplateId || ''
          });
        }
      });
      if (catalogScope !== templateCacheScope()) return;
      sourceWindow.postMessage({ type: 'vf:templates-loaded', templates: templates }, location.origin);
      // 尺寸信息在列表出现后马上预取。悬停时只展示已到达的数据，不能再把网络请求
      // 放到 mouseenter 里，否则每次移入卡片都会出现可感知的等待。
      var metadataTemplateIds = templates.filter(function(template) {
        return template.templateType === 'layout' || template.templateType === 'pack' || (template.templateType === 'bookmark' && !template.metadataLoaded);
      }).map(function(template) { return template.id; });
      (async function preloadTemplateMetadata() {
        var METADATA_BATCH = 3;
        for (var metadataIndex = 0; metadataIndex < metadataTemplateIds.length; metadataIndex += METADATA_BATCH) {
          await Promise.all(metadataTemplateIds.slice(metadataIndex, metadataIndex + METADATA_BATCH).map(function(templateId) {
            return handleFetchTemplateMetadata(templateId, sourceWindow);
          }));
        }
      })();
      // 把 previewMap 缓存下来供 on-demand JSON 下载使用
      _templatePreviewMap = previewMap;
      // 模板组成员预览优先下载；用户随后打开组弹窗时直接复用这些 Blob，
      // 不再先显示一轮空卡片再逐张请求。
      var previewSources = (sources || []).slice().sort(function(a, b) {
        return Number(bookmarkMemberPriority.has(b.id)) - Number(bookmarkMemberPriority.has(a.id));
      });
      // 预览图并行批量下载（每批 6 个并发）
      var previewTasks = [];
      for (var j = 0; j < previewSources.length; j++) {
        (function(src) {
          var previewPath = previewMap[src.id];
          if (!previewPath) return;
          previewTasks.push(async function() {
            try {
              var pBlob = bookmarkMemberPriority.has(src.id) ? _templatePreviewBlobs[previewPath] : null;
              if (!pBlob) {
                var previewDownload = await state.supabase.storage.from(LIBRARY_BUCKET).download(previewPath);
                pBlob = previewDownload.data;
              }
              if (pBlob) {
                if (bookmarkMemberPriority.has(src.id)) {
                  _templatePreviewBlobs[previewPath] = pBlob;
                  if (!_templatePreviewBlobUrls[previewPath]) {
                    _templatePreviewBlobUrls[previewPath] = URL.createObjectURL(pBlob);
                  }
                  updateOpenBookmarkPreview(src.id, _templatePreviewBlobUrls[previewPath]);
                }
                // Blob 可被 structured clone 高效传给 iframe；不再转成体积增加约 1/3 的 Base64。
                sourceWindow.postMessage({ type: 'vf:template-preview', id: src.id, previewBlob: pBlob }, location.origin);
              }
            } catch(e) {}
          });
        })(previewSources[j]);
      }
      // 分批并发执行，避免同时 50+ 个请求打爆浏览器
      await runTemplatePreviewTasks(previewTasks);
      if (catalogScope === templateCacheScope()) {
        getTemplateSourceCache().preload(previewSources.filter(function(source) {
          return /\.json$/i.test(source.source_path || '') && ['layout', 'pack', 'bookmark'].includes(resolveTemplateType(source.tags));
        }));
      }
    } catch (error) {
      try { sourceWindow.postMessage({ type: 'vf:templates-loaded', templates: [], error: error.message }, location.origin); } catch (e) {}
    }
  }
  var _templatePreviewMap = {};
  var _templateMetadataCache = {};

  // Read complete top-level fields from a bounded JSON prefix. Incomplete
  // arrays/strings are never evaluated or treated as complete template data.
  function parseTemplateMetadataPrefix(text) {
    const fields = Object.create(null);
    let offset = 0;
    const white = function() { while (/\s/.test(text[offset] || '') && offset < text.length) offset++; };
    white(); if (text[offset++] !== '{') throw new Error(state.lang === 'zh' ? '模板元数据格式无效' : 'Invalid template metadata format.');
    function endOfValue(start) {
      let string = false, escaped = false, depth = 0;
      for (let index = start; index < text.length; index++) {
        const ch = text[index];
        if (string) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') { string = false; if (depth === 0) return index + 1; } continue; }
        if (ch === '"') { string = true; continue; }
        if (ch === '[' || ch === '{') depth++;
        else if (ch === ']' || ch === '}') { if (depth === 0) return index; depth--; if (depth === 0) return index + 1; }
        else if (depth === 0 && ch === ',') return index;
      }
      return -1;
    }
    while (offset < text.length) {
      white(); if (text[offset] === '}') break;
      if (text[offset] !== '"') break;
      const keyEnd = endOfValue(offset); if (keyEnd < 0) break;
      const key = JSON.parse(text.slice(offset, keyEnd)); offset = keyEnd; white();
      if (text[offset++] !== ':') break; white();
      const valueEnd = endOfValue(offset); if (valueEnd < 0) break;
      fields[key] = JSON.parse(text.slice(offset, valueEnd)); offset = valueEnd; white();
      if (text[offset] === ',') offset++; else break;
    }
    return fields;
  }
  async function loadTemplateMetadataHeader(source) {
    const diskBlob = await getTemplateSourceCache().cached(source);
    if (diskBlob) return parseTemplateMetadataPrefix(await diskBlob.slice(0, 16384).text());
    const url = templateSourceUrl(source);
    const response = await fetch(url, { headers: { Range: 'bytes=0-16383', apikey: config.supabaseAnonKey, Authorization: 'Bearer ' + (state.session?.access_token || '') }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(state.lang === 'zh' ? '模板尺寸读取失败' : 'Failed to read template size.');
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let prefix = '', bytes = 0;
    try {
      while (bytes < 16384) {
        const result = await reader.read(); if (result.done) break;
        const remaining = Math.min(result.value.byteLength, 16384 - bytes);
        prefix += decoder.decode(result.value.subarray(0, remaining), { stream: true }); bytes += remaining;
      }
      prefix += decoder.decode();
    } finally { await reader.cancel().catch(function() {}); reader.releaseLock(); }
    return parseTemplateMetadataPrefix(prefix);
  }
  async function loadTemplateMetadata(id, sourceOverride) {
      // 复用主列表已经取得的 source_path，避免在预取几十张卡片时额外并发数据库查询。
      // 这也是此前 metadata 偶发 Failed to fetch、卡片停在“0 个尺寸”的根源之一。
      var source = sourceOverride && sourceOverride.source_path
        ? sourceOverride
        : (state.librarySources || []).find(function(item) { return item.id === id && item.source_path; });
      if (!source) {
        var { data: sources, error } = await state.supabase.from('vf_source_files')
          .select('id, source_path, updated_at, source_size_bytes').eq('id', id).limit(1);
        if (error || !sources || !sources.length) throw (error || new Error(state.lang === 'zh' ? '模板源文件不存在' : 'Template source file does not exist.'));
        source = sources[0];
      }
      const cacheKey = getTemplateSourceCache().key(source);
      if (_templateMetadataCache[cacheKey]) return _templateMetadataCache[cacheKey];
      var snapshot = _templateSnapshotCache[cacheKey] || (_templateSnapshotPromises[cacheKey] ? await _templateSnapshotPromises[cacheKey] : await loadTemplateMetadataHeader(source));
      if (snapshot.schema === 'vf-template-pack/v1' && !snapshot.artboards) throw new Error('套组详细尺寸将在打开后读取');
      if (snapshot.schema === 'vf-project-snapshot/v1' && !snapshot.editorState) throw new Error('项目详细尺寸将在打开后读取');
      var metadata;
      if (snapshot.schema === 'vf-template-bookmark/v1') {
        metadata = {
          templateRefs: Array.isArray(snapshot.templateRefs) ? snapshot.templateRefs : [],
          coverTemplateId: snapshot.coverTemplateId || ''
        };
      } else if (snapshot.schema === 'vf-template-pack/v1') {
        var presets = (snapshot.artboardPresets || []).map(function(preset) {
          return { id: preset.id, label: preset.label, ratio: preset.ratio, w: preset.w, h: preset.h };
        });
        var artboards = {};
        Object.keys(snapshot.artboards || {}).forEach(function(boardId) {
          var board = snapshot.artboards[boardId] || {};
          // 轻量元数据也要携带每张副本的真实宽高。不能只下发 ratio，
          // 因为同一 ratio 名称在不同模板中的自定义画板可能是不同尺寸。
          var matchingPreset = presets.find(function(preset) { return preset.id === boardId; }) || {};
          artboards[boardId] = {
            id: board.id || boardId,
            label: board.label || matchingPreset.label || '',
            ratio: board.ratio || matchingPreset.ratio || boardId,
            w: Number(board.w) || Number(matchingPreset.w) || 0,
            h: Number(board.h) || Number(matchingPreset.h) || 0
          };
        });
        // [] 在 JS 中是真值，但对套组而言并不是有效 ID 列表；此时必须由快照
        // 里的真实画板键补全，避免卡片错误显示 0 个画板。
        var snapshotIds = Array.isArray(snapshot.linkedArtboardIds) ? snapshot.linkedArtboardIds.filter(Boolean) : [];
        metadata = { artboardPresets: presets, linkedArtboardIds: snapshotIds.length ? snapshotIds : Object.keys(artboards), artboards: artboards };
      } else {
        var canvasSize = templateSnapshotCanvasSize(snapshot);
        if (!canvasSize.width || !canvasSize.height) throw new Error('模板详细尺寸将在打开后读取');
        metadata = { size: snapshot.size || '', canvasW: canvasSize.width || 0, canvasH: canvasSize.height || 0, canvasLanguage: snapshot.canvasLanguage === 'ar' ? 'ar' : 'en' };
      }
      _templateMetadataCache[cacheKey] = metadata;
      return metadata;
  }

  async function handleFetchTemplateMetadata(id, sourceWindow) {
    if (state.localPreview || !state.supabase || !id) return;
    try {
      var metadata = await loadTemplateMetadata(id);
      sourceWindow.postMessage({ type: 'vf:template-metadata', id: id, data: metadata }, location.origin);
    } catch (error) {
      console.warn('Fetch template metadata failed:', error);
      try { sourceWindow.postMessage({ type: 'vf:template-metadata-error', id: id }, location.origin); } catch (e) {}
    }
  }

  async function handleRenameTemplate(id, name, sourceWindow) {
    if (state.localPreview || !state.supabase || !id || !name) return;
    try {
      var { error } = await state.supabase.from('vf_source_files').update({ title: name.trim() }).eq('id', id);
      if (error) throw error;
      // 通知前端刷新
      try { sourceWindow.postMessage({ type: 'vf:template-renamed', id: id, name: name.trim() }, location.origin); } catch (e) {}
    } catch (e) { console.warn('Rename template failed:', e); }
  }

  async function handleSetTemplateLanguage(msg, sourceWindow) {
    if (state.localPreview || !state.supabase || !msg.id) return;
    try {
      var { data: rows, error } = await state.supabase.from('vf_source_files')
        .select('tags').eq('id', msg.id).limit(1);
      if (error || !rows || !rows.length) throw (error || new Error(state.lang === 'zh' ? '模板不存在' : 'Template does not exist.'));
      var tags = Array.isArray(rows[0].tags) ? rows[0].tags.slice() : [];
      // 模板语言功能已移除：兼容旧消息时也只执行清理，不再写入 EN/AR。
      tags = tags.filter(function(t) { return t !== 'vf:lang:EN' && t !== 'vf:lang:AR'; });
      var { error: updateError } = await state.supabase.from('vf_source_files').update({ tags: tags }).eq('id', msg.id);
      if (updateError) throw updateError;
      var local = state.librarySources.find(function(s) { return s.id === msg.id; });
      if (local) local.tags = tags;
      try { sourceWindow.postMessage({ type: 'vf:template-language-set', id: msg.id, language: '', tags: tags }, location.origin); } catch (e) {}
    } catch (e) { console.warn('Set template language failed:', e); }
  }

  // 反向推断组件/模板的本质类型；vf:type:* 标记（移动分组写入）优先于标签推断。
  function resolveTemplateType(tags) {
    var t = Array.isArray(tags) ? tags : [];
    var typeMarker = t.find(function(x) { return String(x).startsWith('vf:type:'); });
    if (typeMarker) return typeMarker.slice('vf:type:'.length);
    if (t.includes('字体') && t.includes('组件')) return 'font';
    if (t.includes('组合') && t.includes('组件')) return 'groupcombo';
    if ((t.includes('标签') && t.includes('组件')) || t.includes('标签组')) return 'tagcombo';
    if (t.includes('模板书签')) return 'bookmark';
    if (t.includes('套组')) return 'pack';
    // 模版特征优先于组件标签判断：带「背景/品牌圆弧/LOGO」等标签的模板仍应归入模版，
    // 而不是被误判成 logo 组件，避免模版跑到「组件 → LOGO」分类里且预览图丢失。
    if (t.includes('模版') || t.includes('社媒物料') || t.includes('C端物料') || t.includes('版式') || t.includes('静态模板')) return 'layout';
    if (t.includes('LOGO') || t.includes('Logo') || t.includes('背景') || t.includes('KIKI') || t.includes('其他素材') || t.includes('品牌圆弧')) return 'logo';
    return 'layout';
  }

  // 把组件从一个子分组移动到另一个子分组（替换语义），类型用 vf:type:* 锁定，只改 tags 不动 JSON。
  async function moveComponentGroup(sourceId, newTag) {
    if (state.localPreview || !state.supabase || !sourceId || !newTag) return { id: sourceId, tags: null };
    if (MOVEABLE_COMPONENT_SUBTAGS.indexOf(newTag) === -1) return { id: sourceId, tags: null };
    var { data: rows, error } = await state.supabase.from('vf_source_files')
      .select('tags').eq('id', sourceId).limit(1);
    if (error || !rows || !rows.length) throw (error || new Error(state.lang === 'zh' ? '模板不存在' : 'Template does not exist.'));
    var existing = Array.isArray(rows[0].tags) ? rows[0].tags.slice() : [];
    var lockedType = resolveTemplateType(existing);
    var ALL_COMPONENT_SUBTAGS = ['标签', '背景', '品牌圆弧', 'LOGO', 'KIKI', '其他素材', '字体', '组合'];
    var next = existing.filter(function(tag) {
      if (String(tag).startsWith('vf:type:')) return false; // 移除旧类型锁
      if (ALL_COMPONENT_SUBTAGS.indexOf(tag) !== -1) return false; // 移除旧二级标签
      return true; // 保留 vf:kind / vf:lang /「组件」大类标签等
    });
    next.push(newTag);
    next.push('vf:type:' + lockedType);
    var { error: updateError } = await state.supabase.from('vf_source_files').update({ tags: next }).eq('id', sourceId);
    if (updateError) throw updateError;
    var local = state.librarySources.find(function(s) { return s.id === sourceId; });
    if (local) local.tags = next;
    notifyStaticIframe({ type: 'vf:template-tags-updated', id: sourceId, tags: next });
    return { id: sourceId, tags: next };
  }

  // 资产库（DIY iframe）发起的批量移动分组。
  async function handleMoveComponentGroup(msg) {
    if (state.localPreview || !state.supabase || !Array.isArray(msg.ids) || !msg.tag) return;
    if (MOVEABLE_COMPONENT_SUBTAGS.indexOf(msg.tag) === -1) return;
    for (var i = 0; i < msg.ids.length; i++) {
      try { await moveComponentGroup(msg.ids[i], msg.tag); } catch (e) { console.warn('Move component failed:', e); }
    }
    await refreshLibraryIfOpen();
  }

  async function handleFetchSingleTemplate(id, sourceWindow) {
    if (state.localPreview || !state.supabase) return;
    try {
      // 查找该模板的 source 记录
      var { data: sources, error } = await state.supabase.from('vf_source_files')
        .select('id, title, tags, source_path, updated_at, source_size_bytes')
        .eq('id', id).limit(1);
      if (error) throw error;
      if (!sources || !sources.length) throw new Error(state.lang === 'zh' ? '素材不存在' : 'Asset does not exist.');
      var src = sources[0];
      if (!src.source_path) throw new Error(state.lang === 'zh' ? '素材源文件路径为空' : 'Asset source path is empty.');
      var srcExt = (src.source_path || '').split('.').pop().toLowerCase();
      var IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
      if (IMAGE_EXTS.includes(srcExt)) {
        // 图片素材（logo/背景/KIKI/其他素材）与图片模板共用此分支。
        // 优先直接下发短期签名 URL，避免在替换前完整下载图片并转成更大的
        // data URL。浏览器可以立即开始解码，同一素材的签名地址也可复用。
        var imgData = { schema: 'vf-layout-preset/v1', name: src.title || '图片模板', size: '1:1', canvasW: 1080, canvasH: 1080, elements: [], isImageTemplate: true };
        await signLibraryPreviewUrls([src.source_path]);
        imgData.src = state.libraryPreviewUrls[src.source_path] || '';
        if (!imgData.src) throw new Error(state.lang === 'zh' ? '无法生成素材访问地址' : 'Could not generate an asset URL.');
        sourceWindow.postMessage({ type: 'vf:template-data', id: src.id, data: imgData }, location.origin);
      } else {
        // 元数据预取和点击打开共用同一份下载与有界缓存。
        var json = await loadLibraryTemplateSnapshot({ source: src });
        if (json) {
          // 通过「保存模板」生成的项目快照把画板信息嵌在 editorState 中；
          // 下发给 DIY 卡片前标准化到 canvasW/canvasH，hover 不会再误读预览图尺寸。
          if (!json.canvasW || !json.canvasH) {
            var realSize = templateSnapshotCanvasSize(json);
            if (realSize.width && realSize.height) {
              json.canvasW = realSize.width;
              json.canvasH = realSize.height;
            }
          }
          sourceWindow.postMessage({ type: 'vf:template-data', id: src.id, data: json }, location.origin);
        }
      }
      // 下载预览图
      var previewPath = _templatePreviewMap[src.id];
      if (previewPath) {
        var { data: pBlob } = await state.supabase.storage.from(LIBRARY_BUCKET).download(previewPath);
        if (pBlob) {
          sourceWindow.postMessage({ type: 'vf:template-preview', id: src.id, previewBlob: pBlob }, location.origin);
        }
      }
    } catch (e) {
      console.warn('Fetch single template failed:', e);
      try {
        sourceWindow.postMessage({
          type: 'vf:template-data-error',
          id: id,
          error: e && e.message ? e.message : (state.lang === 'zh' ? '素材加载失败' : 'Asset failed to load.')
        }, location.origin);
      } catch (postError) {}
    }
  }

  async function handleSaveSharedAssets(msg, sourceWindow, replyOrigin) {
    const targetOrigin = replyOrigin || location.origin;
    if (!state.supabase) {
      try { sourceWindow.postMessage({ type: 'vf:shared-assets-saved', success: false, message: (state.lang === 'zh' ? 'Supabase 未初始化' : 'Supabase is not initialized.') }, targetOrigin); } catch (e) {}
      return;
    }
    try {
      var payload = msg.payload || {};
      var jsonStr = JSON.stringify(payload, null, 2);
      var jsonBlob = new Blob([jsonStr], { type: 'application/json' });
      var file = new File([jsonBlob], 'shared-assets.json', { type: 'application/json' });
      var upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload('static/shared-assets.json', file, { upsert: true, contentType: 'application/json' });
      if (upload.error) throw upload.error;
      try { sourceWindow.postMessage({ type: 'vf:shared-assets-saved', success: true }, targetOrigin); } catch (e) {}
    } catch (error) {
      try { sourceWindow.postMessage({ type: 'vf:shared-assets-saved', success: false, message: error.message || (state.lang === 'zh' ? '保存失败' : 'Save failed.') }, targetOrigin); } catch (e) {}
    }
  }

  // 生图关键词与配色使用同一份私有全局预设配置，不会作为素材库卡片展示。
  const PALETTE_CONFIG_TAG = 'vf:internal:palette-config';
  window.VF_SAVE_COLOR_PALETTES = async function (payload) {
    if (!state.supabase || !state.session?.user?.id) throw new Error(state.lang === 'zh' ? '未登录，无法同步全局预设' : 'Sign in to sync global presets.');
    // 保险：本地预览模式（localhost 假账号）只读不写，防止把本地旧配色反向覆盖到线上云端
    if (state.localPreview && !state.emergencyMode) throw new Error(state.lang === 'zh' ? '本地预览模式只读，不会写入云端' : 'Local preview is read-only and will not write to cloud.');
    const userId = state.session.user.id;
    const data = payload?.data || payload || {};
    const jsonText = JSON.stringify({
      tagColorPresets: Array.isArray(data.tagColorPresets) ? data.tagColorPresets : [],
      arcColorPresets: Array.isArray(data.arcColorPresets) ? data.arcColorPresets : [],
      keywordTags: Array.isArray(data.keywordTags) ? data.keywordTags : [],
      updatedAt: new Date().toISOString()
    });
    const existing = await state.supabase.from('vf_source_files').select('id, source_path, updated_at, source_size_bytes').eq('uploaded_by', userId).contains('tags', [PALETTE_CONFIG_TAG]).order('updated_at', { ascending: false }).limit(1);
    if (existing.error) throw existing.error;
    const sourceId = existing.data?.[0]?.id || crypto.randomUUID();
    const sourcePath = existing.data?.[0]?.source_path || `${userId}/sources/${sourceId}/color-palettes.json`;
    const file = new File([new Blob([jsonText], { type: 'application/json' })], 'color-palettes.json', { type: 'application/json' });
    const upload = await state.supabase.storage.from(LIBRARY_BUCKET).upload(sourcePath, file, { upsert: true, contentType: 'application/json' });
    if (upload.error) throw upload.error;
    if (existing.data?.[0]) {
      const update = await state.supabase.from('vf_source_files').update({ updated_at: new Date().toISOString(), source_size_bytes: file.size }).eq('id', sourceId);
      if (update.error) throw update.error;
    } else {
      const insert = await state.supabase.from('vf_source_files').insert([{ id: sourceId, title: 'DIY 全局预设', tags: [PALETTE_CONFIG_TAG], visibility: 'all', source_path: sourcePath, source_filename: file.name, source_mime_type: 'application/json', source_size_bytes: file.size, source_ext: 'json', uploaded_by: userId }]);
      if (insert.error) throw insert.error;
    }
    return { data: JSON.parse(jsonText) };
  };
  window.VF_LOAD_COLOR_PALETTES = async function () {
    if (!state.supabase || !state.session?.user?.id) return null;
    const userId = state.session.user.id;
    const latest = await state.supabase.from('vf_source_files').select('source_path')
      .eq('uploaded_by', userId)
      .contains('tags', [PALETTE_CONFIG_TAG])
      .order('updated_at', { ascending: false })
      .limit(1);
    if (latest.error || !latest.data?.[0]?.source_path) return null;
    const file = await state.supabase.storage.from(LIBRARY_BUCKET).download(latest.data[0].source_path);
    if (file.error) throw file.error;
    return { data: JSON.parse(await file.data.text()) };
  };

  async function handleFetchFontBinary(msg, sourceWindow) {
    try {
      var { data: source } = await state.supabase.from('vf_source_files')
        .select('source_path').eq('id', msg.sourceId).single();
      if (!source || !source.source_path) throw new Error(state.lang === 'zh' ? '字体未找到' : 'Font not found.');
      var { data: blob, error } = await state.supabase.storage
        .from(LIBRARY_BUCKET).download(source.source_path);
      if (error) throw error;
      var json = JSON.parse(await blob.text());
      sourceWindow.postMessage({
        type: 'vf:font-binary',
        id: msg.sourceId,
        dataUrl: json.data || '',
        familyName: json.familyName || '',
        familyId: json.familyId || '',
        weight: json.weight || 400,
        weightLabel: json.weightLabel || '',
        error: ''
      }, location.origin);
    } catch (e) {
      sourceWindow.postMessage({
        type: 'vf:font-binary',
        id: msg.sourceId,
        dataUrl: '',
        error: e.message || (state.lang === 'zh' ? '下载失败' : 'Download failed.')
      }, location.origin);
    }
  }

  // 如果当前在素材库页面，自动刷新数据
  async function refreshLibraryIfOpen() {
    if (state.route === 'library') {
      try {
        await loadLibraryData();
      } catch(e) { /* 静默 */ }
    }
  }

  // 图片 Blob 压缩到目标大小以下
  function compressImageBlob(blob, maxBytes) {
    return new Promise(function(resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);
        var canvas = document.createElement('canvas');
        var w = img.width, h = img.height;
        // 逐步缩小直到满足大小
        var quality = 0.9;
        var attempt = 0;
        function tryCompress() {
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          fillCanvasWhite(ctx, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(function(compressed) {
            if (!compressed) { resolve(blob); return; }
            if (compressed.size <= maxBytes || attempt > 5) { resolve(compressed); return; }
            // 缩小尺寸并降低质量
            w = Math.floor(w * 0.7); h = Math.floor(h * 0.7);
            quality = Math.max(0.3, quality - 0.1);
            attempt++;
            tryCompress();
          }, 'image/jpeg', quality);
        }
        tryCompress();
      };
      img.onerror = function() { URL.revokeObjectURL(url); resolve(blob); };
      img.src = url;
    });
  }
  // ===== 模板同步结束 =====

  async function saveProject(event) {
    event.preventDefault();
    const submitButton = event.submitter || els.projectForm.querySelector('button[type="submit"]');
    const originalSubmitText = submitButton?.textContent || '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = state.lang === 'zh' ? '保存中...' : 'Saving...';
    }
    const title = els.projectTitleInput.value.trim();
    const projectType = state.route === 'dynamic' ? 'dynamic' : 'static';
    setMessage(els.projectModalMessage, state.lang === 'zh' ? '正在保存...' : 'Saving...');
    let dataPath = '';
    let uploadedProjectFile = false;
    try {
      const snapshot = await captureProjectSnapshot(projectType);
      validateProjectSnapshot(snapshot, projectType);
      if (state.localPreview || !state.supabase) {
        saveLocalProject(title, projectType, snapshot);
        setMessage(els.projectModalMessage, state.lang === 'zh' ? '已保存到本地预览记录。' : 'Saved to local preview.', false, true);
        setTimeout(closeProjectModal, 700);
        return;
      }
      const id = crypto.randomUUID();
      dataPath = `${state.session.user.id}/${id}.json`;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const upload = await state.supabase.storage.from('vf-projects').upload(dataPath, blob, {
        contentType: 'application/json',
        upsert: true
      });
      if (upload.error) throw upload.error;
      uploadedProjectFile = true;
      const meta = {
        schema: snapshot.schema,
        toolType: snapshot.toolType,
        exportedAt: snapshot.exportedAt,
        exportError: snapshot.exportError || null,
        layerCount: snapshot.layerCount || snapshot.editorState?.layers?.length || 0
      };
      const insert = await state.supabase.from('vf_projects').insert([{
        id,
        title,
        project_type: projectType,
        data_path: dataPath,
        snapshot_meta: meta
      }]);
      if (insert.error) throw insert.error;
      setMessage(els.projectModalMessage, state.lang === 'zh' ? '项目已保存到云端。' : 'Project saved to cloud.', false, true);
      setTimeout(closeProjectModal, 700);
    } catch (error) {
      if (uploadedProjectFile && dataPath && state.supabase) {
        try {
          await state.supabase.storage.from('vf-projects').remove([dataPath]);
        } catch (cleanupError) {
          console.warn('Project upload cleanup failed:', cleanupError);
        }
      }
      setMessage(els.projectModalMessage, error.message, true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalSubmitText;
      }
    }
  }

  async function captureProjectSnapshot(projectType) {
    const frame = state.activeFrame;
    const base = {
      schema: 'vf-project-snapshot/v1',
      toolType: projectType,
      exportedAt: new Date().toISOString(),
      capturedBy: state.profile?.id || 'unknown'
    };
    if (!frame || !frame.contentWindow) {
      return { ...base, exportError: 'Tool frame is not available.' };
    }
    try {
      await waitForToolExporter();
      if (typeof frame.contentWindow.VF_EXPORT_PROJECT === 'function') {
        return await frame.contentWindow.VF_EXPORT_PROJECT();
      }
    } catch (error) {
      return { ...base, exportError: error.message };
    }
    return { ...base, exportError: 'Tool bridge is not ready yet.' };
  }

  function waitForToolExporter(timeoutMs = 10000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (state.activeFrame?.contentWindow && typeof state.activeFrame.contentWindow.VF_EXPORT_PROJECT === 'function') {
            resolve();
            return;
          }
        } catch (_error) {}
        if (Date.now() - start > timeoutMs) {
          reject(new Error(state.lang === 'zh' ? '编辑器保存桥接还没有准备好，请稍后再试。' : 'The editor save bridge is not ready yet. Please try again.'));
          return;
        }
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  function waitForToolTemplateExporter(timeoutMs = 10000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (state.activeFrame?.contentWindow && typeof state.activeFrame.contentWindow.VF_EXPORT_TEMPLATE_ASSET === 'function') {
            resolve();
            return;
          }
        } catch (_error) {}
        if (Date.now() - start > timeoutMs) {
          reject(new Error(state.lang === 'zh' ? '静态设计师模板导出还没有准备好，请稍后再试。' : 'The Static Designer template exporter is not ready yet.'));
          return;
        }
        setTimeout(tick, 120);
      };
      tick();
    });
  }

  function validateProjectSnapshot(snapshot, projectType) {
    if (!snapshot || snapshot.schema !== 'vf-project-snapshot/v1') {
      throw new Error(state.lang === 'zh' ? '没有拿到可保存的项目快照。' : 'No valid project snapshot was captured.');
    }
    if (snapshot.toolType && snapshot.toolType !== projectType) {
      throw new Error(state.lang === 'zh' ? '当前编辑器类型和项目类型不一致，请刷新后再保存。' : 'The editor type does not match this project type. Refresh and save again.');
    }
    if (snapshot.exportError) {
      throw new Error(`${state.lang === 'zh' ? '项目快照未保存成功' : 'Project snapshot was not saved'}: ${snapshot.exportError}`);
    }
    if (!snapshot.editorState) {
      throw new Error(state.lang === 'zh' ? '项目缺少编辑器状态，已阻止保存。' : 'The project is missing editor state, so save was blocked.');
    }
  }

  function saveLocalProject(title, projectType, snapshot) {
    const key = 'vf_local_projects';
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    items.unshift({
      id: crypto.randomUUID(),
      title,
      project_type: projectType,
      updated_at: new Date().toISOString(),
      snapshot,
      snapshot_meta: {
        schema: snapshot.schema,
        toolType: snapshot.toolType,
        exportedAt: snapshot.exportedAt,
        exportError: snapshot.exportError || null,
        layerCount: snapshot.layerCount || snapshot.editorState?.layers?.length || 0
      }
    });
    localStorage.setItem(key, JSON.stringify(items.slice(0, 20)));
  }

  function toggleLanguage(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (languageToggleInProgress) return;
    languageToggleInProgress = true;
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('vf_lang', state.lang);
    refreshTranslations();
    renderNav();
    const activeRoute = ROUTES.find(route => route.id === state.route);
    if (activeRoute && els.routeTitle) els.routeTitle.textContent = t(activeRoute.title);
    renderUserChip();
    syncLibraryBookmarkModalLanguage(document.getElementById('library-bookmark-modal'));
    let rerenderPromise = null;
    if (state.route === 'library') rerenderPromise = renderLibrary({ preserveView: true, useLoadedData: true });
    if (state.route === 'home') rerenderPromise = renderLibrary({ homeMode: true, preserveView: true, useLoadedData: true });
    if (state.route === 'request') renderRequestFlow();
    if (state.route === 'admin') renderAdmin();
    if (state.route === 'analytics') renderAnalyticsPage();
    broadcastUiLanguage();
    Promise.resolve(rerenderPromise).catch(function(error) {
      console.warn('Language UI refresh failed:', error);
    }).finally(function() {
      languageToggleInProgress = false;
    });
  }

  function refreshTranslations() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(node => {
      node.setAttribute('aria-label', t(node.dataset.i18nAria));
    });
    els.langToggle.textContent = state.lang === 'zh' ? 'EN' : '中文';
    syncInterfaceModeControl();
  }

  function currentRole() {
    if (window.VFAccountAccess?.enabled && !state.localPreview) return window.VFAccountAccess.maintenance() && state.interfaceMode === 'developer' ? 'admin' : 'operator';
    return state.profile?.role || 'operator';
  }

  function roleLabel(role) {
    return ROLE_LABELS[state.lang][role] || role;
  }

  function visibilityLabel(value) {
    if (value === 'designers') return t('designersOnly');
    if (value === 'operators') return t('operatorsOnly');
    return t('allVisible');
  }

  function sourceFileLabel(source) {
    return (source?.source_ext || fileExt(source?.source_filename) || 'file').toUpperCase();
  }

  function formatDimensions(preview) {
    if (!preview?.width || !preview?.height) return '';
    return `${preview.width} x ${preview.height}`;
  }

  function previewAspectStyle(preview) {
    if (!preview?.width || !preview?.height) return '--preview-ratio: 3 / 4; aspect-ratio: 3 / 4;';
    const ratio = preview.width / preview.height;
    return `--preview-ratio: ${preview.width} / ${preview.height}; aspect-ratio: ${ratio.toFixed(3)};`;
  }

  // 签名还没回来时不要写出 src=""：浏览器会把它当成页面地址去请求并立刻派发 error，
  // 恢复逻辑一旦当成加载失败，封面就会抢先去下几 MB 到十几 MB 的原图。
  function libraryCardImgSrcAttr(item) {
    const url = item?.thumbUrl || item?.url || '';
    return url ? ` src="${escapeAttr(url)}"` : '';
  }

  function showLoginMessage(message, isError) {
    setMessage(els.loginMessage, message, isError);
  }

  function setMessage(element, message, isError, isSuccess) {
    element.textContent = message || '';
    element.className = `message${isError ? ' error' : ''}${isSuccess ? ' success' : ''}`;
  }

  function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString(state.lang === 'zh' ? 'zh-CN' : 'en-US');
  }

  function formatFileSize(value) {
    const size = Number(value || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

})();
