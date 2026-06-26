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
      const canvas = await html2canvas(wrap, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        imageTimeout: 0
      });
      return canvas.toDataURL('image/png');
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
})();
