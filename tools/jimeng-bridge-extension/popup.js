const list = document.getElementById('tabs');
async function render() {
  const [tabs, stored] = await Promise.all([
    chrome.tabs.query({}),
    chrome.storage.local.get('pairedJimengTabId')
  ]);
  const pairedTabId = stored.pairedJimengTabId;
  const jimeng = tabs.filter(tab => /(^|\.)jimeng\.jianying\.com/i.test(new URL(tab.url || 'https://invalid').hostname));
  if (!jimeng.length) { list.textContent = '未发现已打开的即梦网页。请先在 Chrome 或 Edge 中登录并打开即梦。'; return; }
  list.innerHTML = '';
  jimeng.forEach(tab => {
    const item = document.createElement('button');
    const paired = tab.id === pairedTabId;
    item.className = 'tab'; item.textContent = paired ? `✓ 已连接：${tab.title || '即梦'}` : `连接：${tab.title || '即梦'}`;
    item.onclick = async () => {
      const result = await chrome.runtime.sendMessage({ type: 'vf:pair-jimeng-tab', tabId: tab.id });
      if (result?.error) { item.textContent = result.error; return; }
      await render();
    };
    list.append(item);
  });
}
render();
