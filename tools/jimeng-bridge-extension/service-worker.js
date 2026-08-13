const JIMENG_URL = /(^|\.)jimeng\.jianying\.com$/i;
const DIY_URL = /(^|\.)gccdesign\.app$/i;

function isJimengTab(tab) {
  try { return JIMENG_URL.test(new URL(tab?.url || '').hostname); } catch { return false; }
}
function isDiyTab(tab) {
  try {
    const url = new URL(tab?.url || '');
    return DIY_URL.test(url.hostname)
      || url.hostname === 'h18333531920-cmyk.github.io'
      || ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch { return false; }
}
async function pairedTabId() {
  return (await chrome.storage.local.get('pairedJimengTabId')).pairedJimengTabId;
}
async function status() {
  const tabId = await pairedTabId();
  if (!tabId) return { connected: false, reason: '尚未选择即梦标签页' };
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isJimengTab(tab)) return { connected: false, reason: '已配对标签页不是即梦页面' };
    return { connected: true, tabId, title: tab.title || '即梦', url: tab.url };
  } catch {
    await chrome.storage.local.remove('pairedJimengTabId');
    return { connected: false, reason: '已配对的即梦标签页已关闭' };
  }
}
async function sendToDiy(message) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter(isDiyTab).map(tab => chrome.tabs.sendMessage(tab.id, message).catch(() => undefined)));
}
async function ensureJimengBridge(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'vf:bridge-ping' });
    return;
  } catch (error) {
    if (!/Receiving end does not exist/i.test(error?.message || '')) throw error;
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ['jimeng-bridge.js'] });
  await new Promise(resolve => setTimeout(resolve, 80));
  await chrome.tabs.sendMessage(tabId, { type: 'vf:bridge-ping' });
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  (async () => {
    if (message?.type === 'vf:bridge-status') return respond(await status());
    if (message?.type === 'vf:pair-jimeng-tab') {
      const tab = await chrome.tabs.get(message.tabId);
      if (!isJimengTab(tab)) throw new Error('请选择已打开的即梦网页标签页');
      await ensureJimengBridge(tab.id);
      await chrome.storage.local.set({ pairedJimengTabId: tab.id });
      const next = await status();
      await sendToDiy({ type: 'vf:jimeng-status', ...next });
      return respond(next);
    }
    if (message?.type === 'vf:to-jimeng') {
      const current = await status();
      if (!current.connected) throw new Error(current.reason);
      await ensureJimengBridge(current.tabId);
      if (message.action === 'capture-result') {
        const tab = await chrome.tabs.get(current.tabId);
        if (!tab.active) throw new Error('请先切换到即梦标签页并打开要导入的结果图，再点击“导入最新即梦结果”。');
        const rect = await chrome.tabs.sendMessage(current.tabId, { type: 'vf:get-latest-result-rect' });
        if (!rect?.width || !rect?.height) throw new Error('没有找到可导入的即梦结果图。请确认结果已在当前页面完整显示。');
        const image = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        await sendToDiy({ type: 'vf:jimeng-result', requestId: message.requestId, status: 'captured', image, rect, devicePixelRatio: rect.devicePixelRatio || 1 });
        return respond({ accepted: true, ...current });
      }
      await chrome.tabs.sendMessage(current.tabId, { type: 'vf:invoke-jimeng', requestId: message.requestId, action: message.action, payload: message.payload });
      return respond({ accepted: true, ...current });
    }
    if (message?.type === 'vf:from-jimeng') {
      await sendToDiy({ type: 'vf:jimeng-result', ...message });
      return respond({ delivered: true });
    }
    if (message?.type === 'vf:get-jimeng-sessionid') {
      try {
        const picked = await pickJimengSession();
        return respond({ sessionId: picked.sessionId, cookies: picked.cookies, candidates: picked.candidates });
      } catch (e) { return respond({ sessionId: null, cookies: {}, candidates: [], error: e.message }); }
    }
    if (message?.type === 'vf:jimeng-ready') {
      const current = await status();
      if (current.connected && current.tabId === sender.tab?.id) await sendToDiy({ type: 'vf:jimeng-status', ...current, pageReady: true });
      return respond({ ok: true });
    }
  })().catch(error => respond({ error: error.message || String(error) }));
  return true;
});

chrome.tabs.onRemoved.addListener(async tabId => {
  if (tabId === await pairedTabId()) {
    await chrome.storage.local.remove('pairedJimengTabId');
    await sendToDiy({ type: 'vf:jimeng-status', connected: false, reason: '已配对的即梦标签页已关闭' });
  }
});

// ===== 自动同步 sessionid 到云端 =====
const JIMENG_SESSION_API = 'https://visual-factory.pages.dev/api/jimeng-session';
const SYNC_SECRET = 'vf-jimeng-sync-2026';
const SYNC_INTERVAL_MIN = 30;

// 即梦可能在不同域名/路径下存了多个同名 sessionid。单一 chrome.cookies.get
// 只会取到其中一条（常是失效的旧值），导致"自动获取的码"和 F12 里真实有效的
// 码不一致。这里改用 getAll 列出全部候选，并按"最近访问"选取主值，同时把完整
// 候选列表透传给 DIY 用于诊断。
async function readJimengSessionCookies() {
  const list = [];
  try {
    const all = await chrome.cookies.getAll({ name: 'sessionid' });
    for (const c of all) {
      if (!/jianying\.com$/i.test(c.domain || '')) continue;
      list.push({
        domain: c.domain,
        path: c.path,
        value: c.value || '',
        len: (c.value || '').length,
        lastAccessed: c.lastAccessed || 0,
        secure: !!c.secure,
        httpOnly: !!c.httpOnly,
        hostOnly: !!c.hostOnly,
      });
    }
  } catch (e) {
    console.warn('[即梦同步] 读取 sessionid 失败：', e && e.message);
  }
  // 有效的 sessionid 会随着即梦的每个请求持续刷新 lastAccessed，取最近的那条作主值。
  list.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  return list;
}
const JIMENG_AUTH_COOKIE_NAMES = ['sessionid', 'sessionid_ss', 'sid_guard', 'sid_tt', 'uid_tt', 'uid_tt_ss', '_tea_web_id'];

// 读取即梦真实的关键认证 cookie（尤其 sid_guard——后端伪造的 sid_guard 时间戳每次
// 请求都在跳变，会被即梦风控判定为异常会话）。原样透传给后端，后端不再自己伪造。
async function readJimengAuthCookies() {
  const cookies = {};
  for (const name of JIMENG_AUTH_COOKIE_NAMES) {
    try {
      const c = await chrome.cookies.get({ url: 'https://jimeng.jianying.com', name });
      if (c && c.value) cookies[name] = c.value;
    } catch (_) { /* 某些 cookie 可能不存在，忽略 */ }
  }
  return cookies;
}
async function pickJimengSession() {
  const candidates = await readJimengSessionCookies();
  const cookies = await readJimengAuthCookies();
  const sessionId = cookies.sessionid || (candidates.length ? candidates[0].value : null);
  return { sessionId, cookies, candidates };
}

async function syncSessionIdToCloud() {
  try {
    const picked = await pickJimengSession();
    const cookie = picked.sessionId;
    if (!cookie) {
      console.log('[即梦同步] 未找到 sessionid cookie');
      return;
    }
    const resp = await fetch(JIMENG_SESSION_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SYNC_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionid: cookie, cookies: picked.cookies, candidates: picked.candidates }),
    });
    const data = await resp.json();
    if (data.success) {
      console.log('[即梦同步] ✅ sessionid 已同步到云端');
    } else {
      console.log('[即梦同步] ⚠️ 同步失败：' + (data.message || '未知错误'));
    }
  } catch (e) {
    console.log('[即梦同步] ❌ 网络错误：' + e.message);
  }
}

// 启动时立即同步一次
syncSessionIdToCloud();

// 每 30 分钟同步一次
setInterval(syncSessionIdToCloud, SYNC_INTERVAL_MIN * 60 * 1000);

// 也监听 storage 变化（当用户保存 sessionid 时立即同步）
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.jimengSessionId) {
    syncSessionIdToCloud();
  }
});
