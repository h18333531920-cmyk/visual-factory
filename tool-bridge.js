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
        const editorState = {
          currentRatio: typeof currentRatio !== 'undefined' ? currentRatio : null,
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
