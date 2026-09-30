(() => {
  // 静态 DIY 编辑器运行在宿主页面的 iframe 内。扩展只注入最外层页面，
  // 再把桥接消息广播进同源 iframe，避免不同浏览器对 all_frames 注入的差异。
  let latestStatus = null;
  const extensionMessage = payload => ({ source: 'vf-jimeng-extension', ...payload });
  const sendToFrame = (frame, message) => {
    try { frame?.contentWindow?.postMessage(message, window.location.origin); } catch (_) { /* ignored */ }
  };
  const post = payload => {
    const message = extensionMessage(payload);
    if (payload.type === 'vf:jimeng-status') latestStatus = message;
    window.postMessage(message, window.location.origin);
    for (let index = 0; index < window.frames.length; index += 1) {
      try { window.frames[index].postMessage(message, window.location.origin); } catch (_) { /* ignored */ }
    }
  };
  const syncEditorFrame = frame => {
    sendToFrame(frame, extensionMessage({ type: 'vf:jimeng-bridge-ready' }));
    if (latestStatus) sendToFrame(frame, latestStatus);
  };
  const observeEditorFrames = () => {
    const knownFrames = new WeakSet();
    const register = frame => {
      if (!(frame instanceof HTMLIFrameElement) || knownFrames.has(frame)) return;
      knownFrames.add(frame);
      // app.js 会在主页面加载后才动态创建静态编辑器 iframe；必须在这里补发状态。
      frame.addEventListener('load', () => syncEditorFrame(frame));
      queueMicrotask(() => syncEditorFrame(frame));
    };
    document.querySelectorAll('iframe').forEach(register);
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.tagName === 'IFRAME') register(node);
        node.querySelectorAll?.('iframe').forEach(register);
      }));
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (data?.source !== 'vf-diy-page' || !data.type) return;
    chrome.runtime.sendMessage(data, response => {
      if (chrome.runtime.lastError) return post({ type: 'vf:jimeng-bridge-error', requestId: data.requestId, message: chrome.runtime.lastError.message });
      if (response?.error) post({ type: 'vf:jimeng-bridge-error', requestId: data.requestId, message: response.error });
      if (data.type === 'vf:bridge-status') post({ type: 'vf:jimeng-status', ...(response || {}) });
      if (data.type === 'vf:get-jimeng-sessionid') post({ type: 'vf:jimeng-sessionid', requestId: data.requestId, ...(response || {}) });
    });
  });
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'vf:jimeng-status' || message?.type === 'vf:jimeng-result') post(message);
  });
  post({ type: 'vf:jimeng-bridge-ready' });
  // 不把“已连接”的首屏状态完全依赖于 iframe → service worker 的一次往返。
  // 即使 service worker 正在冷启动，storage 中的已配对标签也足以让 DIY 发起请求；
  // 真正发送时仍会由 service worker 校验该标签是否存在。
  chrome.storage.local.get('pairedJimengTabId', values => {
    const paired = values?.pairedJimengTabId;
    post({
      type: 'vf:jimeng-status',
      connected: Boolean(paired),
      title: paired ? '已配对的即梦标签页' : '',
      reason: paired ? '' : '尚未选择即梦标签页，请在扩展弹窗中点击“连接”。'
    });
  });
  if (document.documentElement) observeEditorFrames();
  else document.addEventListener('DOMContentLoaded', observeEditorFrames, { once: true });
})();
