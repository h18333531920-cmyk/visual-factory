(function () {
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  if (nativeFetch) {
    window.fetch = function vfFetch(input, init) {
      const requestInit = init ? { ...init } : {};
      const url = typeof input === 'string' ? input : input && input.url;
      if (shouldAttachAuth(url)) {
        const headers = new Headers(requestInit.headers || (input && input.headers) || {});
        const token = localStorage.getItem('vf_access_token');
        if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
        requestInit.headers = headers;
      }
      return nativeFetch(input, requestInit);
    };
  }

  window.VF_EXPORT_PROJECT = async function VF_EXPORT_PROJECT() {
    const toolType = detectToolType();
    const base = {
      schema: 'vf-project-snapshot/v1',
      toolType,
      title: document.title,
      path: location.pathname,
      exportedAt: new Date().toISOString()
    };

    try {
      if (toolType === 'static') {
        const artboardSnapshot = typeof getArtboardSnapshot === 'function' ? safeClone(getArtboardSnapshot()) : null;
        const editorState = {
          currentRatio: typeof currentRatio !== 'undefined' ? currentRatio : null,
          currentArtboardId: artboardSnapshot?.currentArtboardId || null,
          artboards: artboardSnapshot?.artboards || null,
          activeLayerIds: typeof activeLayerIds !== 'undefined' ? safeClone(activeLayerIds) : [],
          layers: typeof layers !== 'undefined' ? safeClone(layers) : [],
          globals: typeof getGlobalSnapshot === 'function' ? safeClone(getGlobalSnapshot()) : null
        };
        return { ...base, layerCount: editorState.layers.length, editorState };
      }

      if (toolType === 'dynamic') {
        const editorState = {
          activeLayerId: typeof activeLayerId !== 'undefined' ? activeLayerId : null,
          exportBg: typeof exportBg !== 'undefined' ? exportBg : null,
          mockupBgSrc: typeof mockupBgSrc !== 'undefined' ? mockupBgSrc : '',
          maskOpacity: typeof maskOpacity !== 'undefined' ? maskOpacity : null,
          viewMode: typeof viewMode !== 'undefined' ? viewMode : null,
          layers: typeof layers !== 'undefined' ? safeClone(layers.map(normalizeDynamicLayer)) : []
        };
        return { ...base, layerCount: editorState.layers.length, editorState };
      }

      return { ...base, editorState: { note: 'No structured exporter for this tool yet.' } };
    } catch (error) {
      return { ...base, exportError: error.message };
    }
  };

  window.VF_EXPORT_TEMPLATE_ASSET = async function VF_EXPORT_TEMPLATE_ASSET(options = {}) {
    const toolType = detectToolType();
    if (toolType !== 'static') {
      throw new Error('Only Static Designer can export template assets.');
    }
    const snapshot = await window.VF_EXPORT_PROJECT();
    if (options.title) snapshot.title = options.title;
    const previewDataUrl = await captureStaticPreviewDataUrl();
    return {
      schema: 'vf-template-asset/v1',
      title: options.title || snapshot.title || 'Static Template',
      exportedAt: new Date().toISOString(),
      snapshot,
      previewDataUrl
    };
  };

  window.VF_IMPORT_PROJECT = async function VF_IMPORT_PROJECT(snapshot) {
    const toolType = detectToolType();
    if (!snapshot || snapshot.schema !== 'vf-project-snapshot/v1') {
      return { success: false, message: 'Invalid project snapshot.' };
    }
    if (snapshot.toolType && snapshot.toolType !== toolType) {
      return { success: false, message: `Snapshot is for ${snapshot.toolType}, not ${toolType}.` };
    }

    try {
      if (toolType === 'static') return await importStaticProject(snapshot);
      if (toolType === 'dynamic') return await importDynamicProject(snapshot);
      return { success: false, message: 'This tool cannot import project snapshots yet.' };
    } catch (error) {
      console.warn('Visual Factory project import failed:', error);
      return { success: false, message: error.message || 'Project import failed.' };
    }
  };

  window.addEventListener('message', async event => {
    if (!event.data || event.data.type !== 'vf:export-project') return;
    const payload = await window.VF_EXPORT_PROJECT();
    event.source?.postMessage({
      type: 'vf:project-export',
      requestId: event.data.requestId,
      payload
    }, event.origin);
  });

  if (detectToolType() === 'library') {
    window.addEventListener('load', () => {
      const params = new URLSearchParams(location.search);
      if (params.get('embedded') !== '1') return;
      const role = params.get('role') || 'viewer';
      if (typeof login === 'function') {
        setTimeout(() => login(role), 30);
      }
    });
  }

  window.addEventListener('load', () => {
    setTimeout(importPendingLibraryAsset, 300);
  });

  function shouldAttachAuth(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url, location.origin);
      return parsed.origin === location.origin && parsed.pathname.startsWith('/api/');
    } catch (_error) {
      return String(url).startsWith('/api/');
    }
  }

  function detectToolType() {
    const path = location.pathname;
    if (path.includes('/tools/static/')) return 'static';
    if (path.includes('/tools/dynamic/')) return 'dynamic';
    if (path.includes('/tools/library/')) return 'library';
    return 'unknown';
  }

  async function importPendingLibraryAsset() {
    const toolType = detectToolType();
    if (!['static', 'dynamic'].includes(toolType)) return;
    const raw = localStorage.getItem('vf_pending_library_asset');
    if (!raw) return;
    let asset = null;
    try {
      asset = JSON.parse(raw);
    } catch (_error) {
      localStorage.removeItem('vf_pending_library_asset');
      return;
    }
    if (!asset || asset.targetTool !== toolType || !asset.url) return;
    try {
      const dataUrl = await fetchAsDataUrl(asset.url);
      if (toolType === 'static') await importIntoStaticEditor(asset, dataUrl);
      if (toolType === 'dynamic') await importIntoDynamicEditor(asset, dataUrl);
      localStorage.removeItem('vf_pending_library_asset');
    } catch (error) {
      console.warn('Visual Factory asset import failed:', error);
    }
  }

  function fetchAsDataUrl(url) {
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Asset fetch failed: ${response.status}`);
        return response.blob();
      })
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      }));
  }

  async function importIntoStaticEditor(asset, dataUrl) {
    await waitFor(() => typeof addLayer === 'function', 6000);
    addLayer('image', { src: dataUrl });
    if (typeof showToast === 'function') showToast(`已导入素材：${asset.title || asset.filename || 'Asset'}`);
  }

  async function importIntoDynamicEditor(asset, dataUrl) {
    await waitFor(() => typeof layers !== 'undefined' && typeof createLayerDOM === 'function' && typeof selectLayer === 'function', 6000);
    const img = await loadImage(dataUrl);
    let w = img.naturalWidth || img.width || 240;
    let h = img.naturalHeight || img.height || 240;
    if (w > 654 || h > 941) {
      const ratio = Math.min(654 / w, 941 / h);
      w *= ratio;
      h *= ratio;
    }
    const layer = {
      id: `L_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: asset.filename || asset.title || 'Library asset',
      src: dataUrl,
      imgData: img,
      currentImgData: img,
      isSequence: false,
      x: 327,
      y: 470.5,
      rw: w,
      rh: h,
      scale: 1,
      semantic: 'none',
      direction: 'bottom',
      speed: 50,
      mag: 50,
      loop: true,
      animState: { scale: 1, tx: 0, ty: 0, opacity: 1 }
    };
    layers.push(layer);
    document.getElementById('drop-hint').style.display = 'none';
    createLayerDOM(layer);
    if (typeof updateZIndex === 'function') updateZIndex();
    selectLayer(layer.id);
    if (typeof autoSave === 'function') autoSave();
    if (typeof pushHistory === 'function') pushHistory();
    if (typeof rebuildAnimations === 'function') rebuildAnimations();
    if (typeof syncTimeToRenderers === 'function') syncTimeToRenderers();
  }

  async function captureStaticPreviewDataUrl() {
    await waitFor(() => typeof html2canvas === 'function' && !!document.getElementById('canvas-wrapper'), 8000);
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (_error) {}
    }
    const wrap = document.getElementById('canvas-wrapper');
    const safeGuide = document.getElementById('safe-guide');
    const oldGuideDisplay = safeGuide ? safeGuide.style.display : '';
    const oldActive = typeof activeLayerIds !== 'undefined' && Array.isArray(activeLayerIds) ? safeClone(activeLayerIds) : null;
    try {
      if (safeGuide) safeGuide.style.display = 'none';
      if (oldActive) {
        activeLayerIds = [];
        if (typeof renderCanvas === 'function') renderCanvas();
      }
      // 克隆 wrapper 到屏幕外固定位置截图，避免 CSS transform 导致偏移
      var clone = wrap.cloneNode(true);
      var cw = wrap.offsetWidth, ch = wrap.offsetHeight;
      clone.style.cssText = 'position:fixed;left:-9999px;top:0;transform:none;width:' + cw + 'px;height:' + ch + 'px;z-index:-1;overflow:hidden;background:#FFFFFF;';
      document.body.appendChild(clone);
      preserveStaticTextSpacingForCapture(clone);
      // 把克隆体中的背景图替换为 <img>
      clone.querySelectorAll('.layer-image-div').forEach(function(div) {
        var bg = div.style.backgroundImage;
        if (bg && /^url\(/.test(bg)) {
          var url = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
          var img = document.createElement('img');
          img.src = url;
          img.style.cssText = 'width:100%;height:100%;display:block;object-fit:cover;object-position:center;';
          div.style.backgroundImage = 'none';
          div.appendChild(img);
        }
      });
      await new Promise(function(r) { setTimeout(r, 200); });
      // 资产库只需缩略图预览，不能把 1080 画板固定导成 2160 的 2 倍大图。
      // 限制最长边为 768px，且绝不放大原画板，兼顾卡片清晰度与上传/加载体积。
      const previewScale = Math.min(1, 768 / Math.max(cw, ch));
      const canvas = await html2canvas(clone, {
        scale: previewScale,
        width: cw,
        height: ch,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        imageTimeout: 0
      });
      document.body.removeChild(clone);
      // 生成缩略图：最大 400px 宽/高，JPEG 格式大幅减小体积
      var thumbW = canvas.width, thumbH = canvas.height;
      var maxDim = 400;
      if (thumbW > maxDim || thumbH > maxDim) {
        var ratio = Math.min(maxDim / thumbW, maxDim / thumbH);
        thumbW = Math.round(thumbW * ratio);
        thumbH = Math.round(thumbH * ratio);
      }
      var thumb = document.createElement('canvas');
      thumb.width = thumbW; thumb.height = thumbH;
      var tctx = thumb.getContext('2d');
      tctx.drawImage(canvas, 0, 0, thumbW, thumbH);
      return thumb.toDataURL('image/jpeg', 0.85);
    } finally {
      if (safeGuide) safeGuide.style.display = oldGuideDisplay;
      if (typeof syncSafeGuide === 'function') syncSafeGuide();
      if (oldActive) {
        activeLayerIds = oldActive;
        if (typeof renderCanvas === 'function') renderCanvas();
        if (typeof renderLayersList === 'function') renderLayersList();
        if (typeof renderProperties === 'function') renderProperties();
      }
    }
  }

  async function rasterizeNativeFontTextForCapture(clone) {
    if (typeof window.VF_RASTERIZE_CAPTURE_TEXT !== 'function') return;
    try {
      await window.VF_RASTERIZE_CAPTURE_TEXT(clone);
    } catch (error) {
      // 发生意外时回退到通用 html2canvas 路径，不能阻断模板保存。
      console.warn('Native font capture fallback:', error);
    }
  }

  function preserveStaticTextSpacingForCapture(clone) {
    clone.querySelectorAll('.layer-text-wrapper').forEach(function(wrapper) {
      var _ff = getComputedStyle(wrapper).fontFamily || '';
      if (/ht[_\s-]*heliopolis/i.test(_ff) || /dela[_\s-]*gothic/i.test(_ff)) {
        freezeHTTextLayoutForCapture(wrapper);
        return;
      }
      wrapper.style.letterSpacing = '0px';
      wrapper.style.wordSpacing = 'normal';
      wrapper.querySelectorAll('.layer-text-content').forEach(function(content) {
        const rawText = content.textContent || '';
        const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(rawText)
          || getComputedStyle(wrapper).direction === 'rtl';
        if (isRtl) {
          // 让离屏渲染器按完整的 RTL 文本段落排版，不能逐字倒序绘制。
          wrapper.setAttribute('dir', 'rtl');
          wrapper.setAttribute('lang', 'ar');
          wrapper.style.direction = 'rtl';
          wrapper.style.unicodeBidi = 'plaintext';
          content.setAttribute('dir', 'rtl');
          content.style.direction = 'rtl';
          content.style.unicodeBidi = 'plaintext';
        }
        content.style.letterSpacing = '0px';
        content.style.wordSpacing = 'normal';
        const textNodes = [];
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach(function(textNode) {
          const value = textNode.nodeValue || '';
          if (!/[?？؟\s]/.test(value)) return;
          const fragment = document.createDocumentFragment();
          value.split(/([?？؟])/).forEach(function(part) {
            if (!part) return;
            if (part === '?' || part === '？' || part === '؟') {
              const mark = document.createElement('span');
              mark.textContent = part;
              mark.style.cssText = 'display:inline-block;letter-spacing:0!important;' + (isRtl ? 'margin-right:4px;' : 'margin-left:4px;');
              fragment.appendChild(mark);
            } else {
              // html2canvas 会把普通 ASCII 空格按字符拆分并可能漏画；不换行空格
              // 保留相同的视觉宽度，且会被它作为真实字形稳定输出。
              fragment.appendChild(document.createTextNode(part.replace(/[ \t]+/g, '\u00A0')));
            }
          });
          textNode.parentNode.replaceChild(fragment, textNode);
        });
      });
    });
  }

  // 将 HT 字体的每个可见词元固定在浏览器已计算的原生坐标上。这样 html2canvas
  // 不会参与词间距、问号和 kerning 的重新测量，导出布局与编辑器 DOM 保持一致。
  function freezeHTTextLayoutForCapture(wrapper) {
    const content = wrapper.querySelector('.layer-text-content');
    if (!content || !content.textContent) return;
    const contentRect = content.getBoundingClientRect();
    const width = Math.max(1, content.offsetWidth || contentRect.width);
    const height = Math.max(1, content.offsetHeight || contentRect.height);
    const sourceNodes = [];
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) sourceNodes.push(walker.currentNode);
    const tokens = [];
    sourceNodes.forEach(function(node) {
      const value = node.nodeValue || '';
      const matcher = /[^\s?\uFF1F\u061F]+|[?\uFF1F\u061F]/g;
      let match;
      while ((match = matcher.exec(value))) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        if (rect.width || rect.height) tokens.push({ text: match[0], left: rect.left - contentRect.left, top: rect.top - contentRect.top });
      }
    });
    if (!tokens.length) return;
    content.replaceChildren();
    content.style.position = 'relative';
    content.style.display = 'block';
    content.style.width = width + 'px';
    content.style.height = height + 'px';
    content.style.whiteSpace = 'normal';
    tokens.forEach(function(token) {
      const item = document.createElement('span');
      item.textContent = token.text;
      item.style.cssText = 'position:absolute;display:block;left:' + token.left + 'px;top:' + token.top + 'px;white-space:pre;font:inherit;line-height:inherit;letter-spacing:inherit;word-spacing:normal;color:inherit;direction:inherit;unicode-bidi:inherit;';
      content.appendChild(item);
    });
  }

  function preserveHTTextSpacingForCapture(content, wrapper, isRtl) {
    const spaceWidth = measureNativeSpaceWidthForCapture(wrapper);
    const textNodes = [];
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function(textNode) {
      const value = textNode.nodeValue || '';
      if (!/[\t ?\uFF1F\u061F]/.test(value)) return;
      const fragment = document.createDocumentFragment();
      value.split(/([ \t]+|[?\uFF1F\u061F])/).forEach(function(part) {
        if (!part) return;
        if (/^[ \t]+$/.test(part)) {
          const gap = document.createElement('span');
          gap.setAttribute('aria-hidden', 'true');
          gap.style.cssText = 'display:inline-block;width:' + (spaceWidth * part.length) + 'px;height:1px;vertical-align:baseline;';
          fragment.appendChild(gap);
        } else if (/^[?\uFF1F\u061F]$/.test(part)) {
          const mark = document.createElement('span');
          mark.textContent = part;
          const punctuationGap = Math.max(2, spaceWidth * 0.3);
          mark.style.cssText = 'display:inline-block;letter-spacing:0!important;' + (isRtl ? 'margin-right:' : 'margin-left:') + punctuationGap + 'px;';
          fragment.appendChild(mark);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  function measureNativeSpaceWidthForCapture(wrapper) {
    const style = getComputedStyle(wrapper);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;white-space:pre;font-family:' + style.fontFamily + ';font-size:' + style.fontSize + ';font-weight:' + style.fontWeight + ';font-style:' + style.fontStyle + ';letter-spacing:0;word-spacing:normal;line-height:1;';
    document.body.appendChild(probe);
    probe.textContent = 'AA';
    const compactWidth = probe.getBoundingClientRect().width;
    probe.textContent = 'A A';
    const spacedWidth = probe.getBoundingClientRect().width;
    probe.remove();
    return Math.max(1, spacedWidth - compactWidth);
  }

  async function importStaticProject(snapshot) {
    await waitFor(() => typeof renderCanvas === 'function' && typeof resizeCanvas === 'function' && typeof renderLayersList === 'function', 6000);
    const editorState = snapshot.editorState || {};
    if (typeof importArtboardSnapshot === 'function') {
      importArtboardSnapshot({
        currentArtboardId: editorState.currentArtboardId,
        artboards: editorState.artboards,
        layers: editorState.layers || []
      });
    } else {
      if (editorState.currentRatio) currentRatio = editorState.currentRatio;
      layers = safeClone(editorState.layers || []);
    }
    activeLayerIds = Array.isArray(editorState.activeLayerIds) ? safeClone(editorState.activeLayerIds) : [];
    if (typeof syncRatioNav === 'function') syncRatioNav();
    resizeCanvas();
    renderCanvas();
    if (typeof renderPromptTags === 'function') renderPromptTags();
    renderLayersList();
    if (typeof renderProperties === 'function') renderProperties();
    if (typeof renderAssetLibrary === 'function') renderAssetLibrary();
    if (typeof saveHistory === 'function') saveHistory();
    if (typeof showToast === 'function') showToast(`已打开项目：${snapshot.title || 'Project'}`);
    return { success: true };
  }

  async function importDynamicProject(snapshot) {
    await waitFor(() => typeof layers !== 'undefined' && typeof createLayerDOM === 'function' && typeof selectLayer === 'function', 6000);
    const editorState = snapshot.editorState || {};
    const importedLayers = [];
    for (const rawLayer of editorState.layers || []) {
      if (!rawLayer || rawLayer.isSequence || !rawLayer.src) continue;
      const layer = {
        ...safeClone(rawLayer),
        animState: {
          scale: 1,
          tx: 0,
          ty: 0,
          opacity: 1,
          ...(rawLayer.animState || {})
        }
      };
      try {
        const img = await loadImage(layer.src);
        layer.imgData = img;
        layer.currentImgData = img;
      } catch (_error) {}
      importedLayers.push(layer);
    }

    const activeId = editorState.activeLayerId && importedLayers.some(layer => layer.id === editorState.activeLayerId)
      ? editorState.activeLayerId
      : importedLayers[0]?.id || null;
    const restoreState = {
      layers: importedLayers,
      activeLayerId: activeId,
      mockupBgSrc: editorState.mockupBgSrc || '',
      maskOpacity: editorState.maskOpacity ?? 0.6,
      viewMode: editorState.viewMode || 'edit'
    };

    if (typeof restoreHistory === 'function') {
      restoreHistory(restoreState);
    } else {
      document.querySelectorAll('.layer-el').forEach(el => el.remove());
      layers = importedLayers;
      layers.forEach(layer => createLayerDOM(layer));
      if (typeof updateZIndex === 'function') updateZIndex();
      if (activeId) selectLayer(activeId);
    }
    if (typeof pushHistory === 'function') pushHistory();
    if (typeof rebuildAnimations === 'function') rebuildAnimations();
    if (typeof syncTimeToRenderers === 'function') syncTimeToRenderers();
    if (typeof showToast === 'function') showToast(`已打开项目：${snapshot.title || 'Project'}`);
    return { success: true };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = src;
    });
  }

  function waitFor(check, timeoutMs) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (check()) {
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timed out waiting for editor'));
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  function safeClone(value) {
    return JSON.parse(JSON.stringify(value, (_key, item) => {
      if (!item) return item;
      if (item instanceof Element) return undefined;
      if (item instanceof HTMLImageElement) return undefined;
      if (item instanceof Blob) {
        return { kind: 'Blob', type: item.type, size: item.size };
      }
      if (typeof item === 'function') return undefined;
      return item;
    }));
  }

  function normalizeDynamicLayer(layer) {
    if (!layer) return layer;
    return {
      id: layer.id,
      name: layer.name,
      src: layer.isSequence ? null : layer.src,
      isSequence: !!layer.isSequence,
      sequenceCount: Array.isArray(layer.blobs) ? layer.blobs.length : 0,
      x: layer.x,
      y: layer.y,
      rw: layer.rw,
      rh: layer.rh,
      scale: layer.scale,
      semantic: layer.semantic,
      direction: layer.direction,
      speed: layer.speed,
      mag: layer.mag,
      loop: layer.loop
    };
  }

  // 暴露给 frontend.html 调用（模板同步需要生成预览图）
  window.captureStaticPreviewDataUrl = captureStaticPreviewDataUrl;
})();
