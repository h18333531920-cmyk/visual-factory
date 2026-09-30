/*
 * 即梦页面会持续升级，所有 DOM 选择都集中在此文件。扩展只在用户主动配对的
 * 已登录标签页执行，不读取浏览记录，也不在后台自行发起生成。
 */
(() => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const findPrompt = () => document.querySelector('textarea, [contenteditable="true"]');
  const findFileInput = () => document.querySelector('input[type="file"]');
  const findGenerate = () => Array.from(document.querySelectorAll('button')).find(button => /生成|创作|Generate/i.test((button.innerText || button.getAttribute('aria-label') || '').trim()) && !button.disabled);
  const dataUrlToFile = async (dataUrl, index) => {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], `gcc-reference-${index + 1}.${blob.type.includes('png') ? 'png' : 'jpg'}`, { type: blob.type || 'image/png' });
  };
  async function applyRequest(payload) {
    const prompt = findPrompt();
    if (!prompt) throw new Error('未找到即梦提示词输入框。请确认当前已进入“生成”页面后重试。');
    if ('value' in prompt) {
      prompt.focus(); prompt.value = payload.prompt || ''; prompt.dispatchEvent(new Event('input', { bubbles: true })); prompt.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      prompt.focus(); prompt.textContent = payload.prompt || ''; prompt.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: payload.prompt || '' }));
    }
    const refs = Array.isArray(payload.references) ? payload.references : [];
    if (refs.length) {
      const input = findFileInput();
      if (!input) throw new Error('未找到即梦参考图上传控件。请先展开即梦的参考图区域。');
      const transfer = new DataTransfer();
      for (let i = 0; i < refs.length; i += 1) transfer.items.add(await dataUrlToFile(refs[i], i));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await sleep(350);
    const generate = findGenerate();
    if (!generate) throw new Error('已填写内容，但未找到可点击的即梦生成按钮。即梦页面可能已改版。');
    generate.click();
  }
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'vf:bridge-ping') {
      respond({ ok: true });
      return;
    }
    if (message?.type === 'vf:get-latest-result-rect') {
      const candidates = Array.from(document.images).filter(image => {
        const rect = image.getBoundingClientRect();
        return image.complete && image.naturalWidth >= 256 && image.naturalHeight >= 256 && rect.width >= 180 && rect.height >= 180 && rect.bottom > 0 && rect.top < innerHeight;
      }).sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));
      const image = candidates[0];
      if (!image) return respond(null);
      const rect = image.getBoundingClientRect();
      return respond({ left: rect.left, top: rect.top, width: rect.width, height: rect.height, devicePixelRatio: devicePixelRatio || 1 });
    }
    if (message?.type !== 'vf:invoke-jimeng') return;
    (async () => {
      if (message.action !== 'generate') throw new Error('暂不支持的即梦操作');
      await applyRequest(message.payload || {});
      await chrome.runtime.sendMessage({ type: 'vf:from-jimeng', requestId: message.requestId, status: 'submitted' });
    })().catch(error => chrome.runtime.sendMessage({ type: 'vf:from-jimeng', requestId: message.requestId, status: 'error', message: error.message || String(error) })).finally(() => respond({ accepted: true }));
    return true;
  });
  chrome.runtime.sendMessage({ type: 'vf:jimeng-ready' }).catch(() => undefined);
})();
