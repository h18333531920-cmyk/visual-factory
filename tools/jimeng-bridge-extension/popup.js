const list = document.getElementById('tabs');
const switchButton = document.getElementById('switch-tab');
let showAllTabs = false;

function isJimengTab(tab) {
  try {
    return /(^|\.)jimeng\.jianying\.com$/i.test(new URL(tab?.url || '').hostname);
  } catch {
    return false;
  }
}

function normalizedJimengUrl(rawUrl) {
  try {
    const url = new URL(rawUrl || '');
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(from|source|enter_from|utm_|timestamp|t$)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function tabScore(tab, pairedTabId, currentWindowId) {
  return (tab.id === pairedTabId ? 1_000_000 : 0)
    + (tab.active ? 100_000 : 0)
    + (tab.windowId === currentWindowId ? 10_000 : 0)
    + (/未命名项目/i.test(tab.title || '') ? 0 : 1_000)
    + Math.floor((tab.lastAccessed || 0) / 1_000_000);
}

function dedupeTabs(tabs, pairedTabId, currentWindowId) {
  const byPage = new Map();
  for (const tab of tabs) {
    // chrome.tabs.query 本身不会返回重复的 tabId；这里继续按页面地址合并，
    // 避免同一个项目被复制/恢复成多个标签页后在弹窗里出现多个相同按钮。
    const key = normalizedJimengUrl(tab.url) || `tab:${tab.id}`;
    const previous = byPage.get(key);
    if (!previous || tabScore(tab, pairedTabId, currentWindowId) > tabScore(previous, pairedTabId, currentWindowId)) {
      byPage.set(key, tab);
    }
  }
  return [...byPage.values()].sort((a, b) => tabScore(b, pairedTabId, currentWindowId) - tabScore(a, pairedTabId, currentWindowId));
}

function createTabButton(tab, pairedTabId) {
  const item = document.createElement('button');
  const paired = tab.id === pairedTabId;
  const title = (tab.title || '即梦').replace(/\s*[-·|]\s*即梦(?:AI)?\s*$/i, '').trim() || '即梦';
  item.className = `tab${paired ? ' is-paired' : ''}`;
  item.textContent = paired ? `✓ 已连接：${title}` : `连接：${title}`;
  item.onclick = async () => {
    item.disabled = true;
    item.textContent = '正在连接…';
    const result = await chrome.runtime.sendMessage({ type: 'vf:pair-jimeng-tab', tabId: tab.id });
    if (result?.error) {
      item.disabled = false;
      item.textContent = result.error;
      return;
    }
    showAllTabs = false;
    await render();
  };
  return item;
}

async function render() {
  // 先让 service worker 校验/恢复配对关系。浏览器恢复标签页后 tabId 可能变化，
  // 直接读 storage 会短暂显示成“未连接”。
  const bridgeStatus = await chrome.runtime.sendMessage({ type: 'vf:bridge-status' }).catch(() => null);
  const [tabs, currentWindow] = await Promise.all([
    chrome.tabs.query({}),
    chrome.windows.getCurrent().catch(() => null),
  ]);
  const pairedTabId = bridgeStatus?.connected ? bridgeStatus.tabId : null;
  const jimeng = dedupeTabs(tabs.filter(isJimengTab), pairedTabId, currentWindow?.id);
  const pairedTab = jimeng.find(tab => tab.id === pairedTabId);

  if (!jimeng.length) {
    list.className = 'empty';
    list.textContent = '未发现已打开的即梦网页。请先在 Chrome 或 Edge 中登录并打开即梦。';
    switchButton.hidden = true;
    return;
  }

  list.className = '';
  list.replaceChildren();
  const visibleTabs = pairedTab && !showAllTabs ? [pairedTab] : jimeng;
  for (const tab of visibleTabs) list.append(createTabButton(tab, pairedTabId));

  const alternatives = jimeng.filter(tab => tab.id !== pairedTabId);
  switchButton.hidden = !pairedTab || !alternatives.length;
  switchButton.textContent = showAllTabs ? '收起其他标签页' : `选择其他标签页（${alternatives.length}）`;
}

switchButton.addEventListener('click', async () => {
  showAllTabs = !showAllTabs;
  await render();
});

render().catch(error => {
  list.className = 'empty error';
  list.textContent = `读取即梦标签页失败：${error.message || error}`;
});
