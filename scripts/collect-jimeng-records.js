/* 即梦「生成记录」收集脚本（只读，不触发任何生成）
 *
 * 用途：网站的生图借用了同一个即梦账号，把该账号的生成记录抓下来，作为生图统计的
 * 独立旁证（总数 / 图片张数 / 能拿到的按天分布）。注意这是「账号维度」的记录：
 * 如果有人直接在即梦网页上手动生成，也会被算进来，所以是上限值，不是网站用量的精确值。
 *
 * 用法（保姆级）：
 *   1. 在自己电脑的 Chrome 里打开并登录即梦：https://jimeng.jianying.com/ai-tool/generate?workspace=0
 *   2. 确认能看到生成记录列表（不要停在别的页面）
 *   3. 按 F12 打开开发者工具 → 切到「Console（控制台）」
 *   4. 把本文件内容整段粘贴进去，回车
 *   5. 页面会自己往下滚，滚到底后浏览器会下载一个 jimeng-records-YYYY-MM-DD.json
 *   6. 把这个 json 交给开发同学统计即可
 *
 * 说明：
 *   - 脚本会挂上 fetch / XHR 监听，只收集「像列表接口」的 JSON 返回（历史/记录/列表/资产），
 *     以及页面上尺寸较大的图片地址，不改页面、不发额外请求。
 *   - 单条响应超过 2MB 会被截断，总收集上限 24MB，避免文件过大。
 *   - 想早点结束：把下面 MAX_ROUNDS 调小；想抓更全：调大。
 */
(async () => {
  const MAX_ROUNDS = 400;      // 最多滚动多少轮
  const STEP_WAIT_MS = 700;    // 每轮等待（太快会漏数据/被限流）
  const MAX_TOTAL_BYTES = 24 * 1024 * 1024;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const apiHits = [];
  let totalBytes = 0;
  const looksLikeList = (url) => /history|record|list|workspace|asset|item|work|feed/i.test(String(url || ''));

  const pushHit = (url, text) => {
    if (!text || totalBytes >= MAX_TOTAL_BYTES) return;
    totalBytes += text.length;
    apiHits.push({ url: String(url || ''), body: text.slice(0, 2 * 1024 * 1024) });
  };

  // 挂 fetch
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      const type = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
      if (/json/i.test(type) && looksLikeList(url)) {
        const text = await res.clone().text();
        pushHit(url, text);
      }
    } catch (_e) { /* 忽略 */ }
    return res;
  };

  // 挂 XHR
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__vfUrl = url;
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      try {
        if (looksLikeList(this.__vfUrl)) pushHit(this.__vfUrl, String(this.responseText || ''));
      } catch (_e) { /* 忽略 */ }
    });
    return origSend.apply(this, args);
  };

  // 页面上的图（虚拟列表里的记录也会被逐步收进来）
  const images = new Map();
  const collectImages = () => {
    document.querySelectorAll('img').forEach((img) => {
      const src = (img.currentSrc || img.src || '').split('?')[0];
      if (!src || !/^https?:/.test(src)) return;
      if ((img.naturalWidth || 0) < 200) return;   // 过滤头像/图标
      if (images.has(src)) return;
      const holder = img.closest('[class*="item"], [class*="card"], [class*="record"], li, article') || img.parentElement;
      const text = holder ? String(holder.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
      images.set(src, { src, w: img.naturalWidth, h: img.naturalHeight, text });
    });
  };

  const scrollAll = () => {
    const targets = [document.scrollingElement, document.documentElement, document.body];
    document.querySelectorAll('div, main, section').forEach((node) => {
      if (node.scrollHeight > node.clientHeight + 200 && node.clientHeight > 300) targets.push(node);
    });
    targets.forEach((node) => { if (node) node.scrollTop = node.scrollHeight; });
  };

  let lastCount = -1;
  let stable = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    collectImages();
    scrollAll();
    await sleep(STEP_WAIT_MS);
    const now = images.size + apiHits.length;
    if (now === lastCount) {
      stable += 1;
      if (stable >= 4) break;   // 连续 4 轮没新东西 → 到底了
    } else {
      stable = 0;
      lastCount = now;
    }
  }
  collectImages();

  const payload = {
    collectedAt: new Date().toISOString(),
    page: location.href,
    apiHits: apiHits.length,
    imageCount: images.size,
    images: Array.from(images.values()),
    responses: apiHits
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jimeng-records-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  console.log('[即梦收集] 列表接口返回 ' + apiHits.length + ' 条、页面图片 ' + images.size + ' 张，文件已下载（约 ' + Math.round(blob.size / 1024) + ' KB）');
})();
