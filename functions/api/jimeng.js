/**
 * 即梦 (Jimeng) 图生中转 — Cloudflare Pages Function
 *
 * 把原来跑在本机 localhost:5567 的 Node.js 即梦 API 中转逻辑
 * 完整迁到 Cloudflare，所有用户打开网页就能直接用（仍需自己的即梦 sessionid）。
 *
 * GET  → 健康检测 + 模型列表
 * POST → 文生图 / 参考图生图
 */

// ---------------------------------------------------------------------------
// 工具函数（替代 Node.js crypto / uuid 等依赖）
// ---------------------------------------------------------------------------

/** 纯 JS MD5 — Cloudflare Workers 的 Web Crypto 不支持 MD5 */
function md5(str) {
  function r(n, c) { return (n << c) | (n >>> (32 - c)); }
  function q(n, c) { return (n & c) | ((~n) & 0xFFFFFFFF & c); }
  function p(n, c, d, x, s, t) {
    return (r((n + q(c, d) + x + t) | 0, s) + c) | 0;
  }
  function h(n, c) { return (n & c) | (n & d) | (c & d); }
  function i(n, c, d, x, s, t) {
    return (r((n + h(c, d) + x + t) | 0, s) + c) | 0;
  }
  function j(n, c) { return n ^ c; }
  function k(n, c, d, x, s, t) {
    return (r((n + (j(c, d) ^ d) + x + t) | 0, s) + c) | 0;
  }
  var a = str;
  var b = [];
  for (var c = 0; c < a.length; c++) b[c >> 2] |= (a.charCodeAt(c) & 255) << ((c % 4) << 3);
  b.push(0, 0);
  b.push(((a.length * 8) >>> 0) & 0xFF, ((a.length * 8) >>> 8) & 0xFF,
    ((a.length * 8) >>> 16) & 0xFF, ((a.length * 8) >>> 24) & 0xFF);
  var d = 0x67452301, e = 0xEFCDAB89, f = 0x98BADCFE, g = 0x10325476;
  var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  for (c = 0; c < b.length; c += 16) {
    var A = d, B = e, C = f, D = g;
    d = p(d, e, f, g, b[c + 0], S11, 0xD76AA478);
    g = p(g, d, e, f, b[c + 1], S12, 0xE8C7B756);
    f = p(f, g, d, e, b[c + 2], S13, 0x242070DB);
    e = p(e, f, g, d, b[c + 3], S14, 0xC1BDCEEE);
    d = p(d, e, f, g, b[c + 4], S11, 0xF57C0FAF);
    g = p(g, d, e, f, b[c + 5], S12, 0x4787C62A);
    f = p(f, g, d, e, b[c + 6], S13, 0xA8304613);
    e = p(e, f, g, d, b[c + 7], S14, 0xFD469501);
    d = p(d, e, f, g, b[c + 8], S11, 0x698098D8);
    g = p(g, d, e, f, b[c + 9], S12, 0x8B44F7AF);
    f = p(f, g, d, e, b[c + 10], S13, 0xFFFF5BB1);
    e = p(e, f, g, d, b[c + 11], S14, 0x895CD7BE);
    d = p(d, e, f, g, b[c + 12], S11, 0x6B901122);
    g = p(g, d, e, f, b[c + 13], S12, 0xFD987193);
    f = p(f, g, d, e, b[c + 14], S13, 0xA679438E);
    e = p(e, f, g, d, b[c + 15], S14, 0x49B40821);
    d = i(d, e, f, g, b[c + 1], 5, 0xF61E2562);
    g = i(g, d, e, f, b[c + 6], 9, 0xC040B340);
    f = i(f, g, d, e, b[c + 11], 14, 0x265E5A51);
    e = i(e, f, g, d, b[c + 0], 20, 0xE9B6C7AA);
    d = i(d, e, f, g, b[c + 5], 5, 0xD62F105D);
    g = i(g, d, e, f, b[c + 10], 9, 0x2441453);
    f = i(f, g, d, e, b[c + 15], 14, 0xD8A1E681);
    e = i(e, f, g, d, b[c + 4], 20, 0xE7D3FBC8);
    d = i(d, e, f, g, b[c + 9], 5, 0x21E1CDE6);
    g = i(g, d, e, f, b[c + 14], 9, 0xC33707D6);
    f = i(f, g, d, e, b[c + 3], 14, 0xF4D50D87);
    e = i(e, f, g, d, b[c + 8], 20, 0x455A14ED);
    d = i(d, e, f, g, b[c + 13], 5, 0xA9E3E905);
    g = i(g, d, e, f, b[c + 2], 9, 0xFCEFA3F8);
    f = i(f, g, d, e, b[c + 7], 14, 0x676F02D9);
    e = i(e, f, g, d, b[c + 12], 20, 0x8D2A4C8A);
    d = k(d, e, f, g, b[c + 5], 4, 0xFFFA3942);
    g = k(g, d, e, f, b[c + 8], 11, 0x8771F681);
    f = k(f, g, d, e, b[c + 11], 16, 0x6D9D6122);
    e = k(e, f, g, d, b[c + 14], 23, 0xFDE5380C);
    d = k(d, e, f, g, b[c + 1], 4, 0xA4BEEA44);
    g = k(g, d, e, f, b[c + 4], 11, 0x4BDECFA9);
    f = k(f, g, d, e, b[c + 7], 16, 0xF6BB4B60);
    e = k(e, f, g, d, b[c + 10], 23, 0xBEBFBC70);
    d = k(d, e, f, g, b[c + 13], 4, 0x289B7EC6);
    g = k(g, d, e, f, b[c + 0], 11, 0xEAA127FA);
    f = k(f, g, d, e, b[c + 3], 16, 0xD4EF3085);
    e = k(e, f, g, d, b[c + 6], 23, 0x4881D05);
    d = k(d, e, f, g, b[c + 9], 4, 0xD9D4D039);
    g = k(g, d, e, f, b[c + 12], 11, 0xE6DB99E5);
    f = k(f, g, d, e, b[c + 15], 16, 0x1FA27CF8);
    e = k(e, f, g, d, b[c + 2], 23, 0xC4AC5665);
    d = r(d + A, 0); e = r(e + B, 0); f = r(f + C, 0); g = r(g + D, 0);
  }
  d = ((d & 0xFF) << 24) | (((d >>> 8) & 0xFF) << 16) | (((d >>> 16) & 0xFF) << 8) | ((d >>> 24) & 0xFF);
  e = ((e & 0xFF) << 24) | (((e >>> 8) & 0xFF) << 16) | (((e >>> 16) & 0xFF) << 8) | ((e >>> 24) & 0xFF);
  f = ((f & 0xFF) << 24) | (((f >>> 8) & 0xFF) << 16) | (((f >>> 16) & 0xFF) << 8) | ((f >>> 24) & 0xFF);
  g = ((g & 0xFF) << 24) | (((g >>> 8) & 0xFF) << 16) | (((g >>> 16) & 0xFF) << 8) | ((g >>> 24) & 0xFF);
  d = (d >>> 0).toString(16).padStart(8, '0');
  e = (e >>> 0).toString(16).padStart(8, '0');
  f = (f >>> 0).toString(16).padStart(8, '0');
  g = (g >>> 0).toString(16).padStart(8, '0');
  return d + e + f + g;
}

function uuid() {
  return crypto.randomUUID();
}

function unixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const DEFAULT_ASSISTANT_ID = 513695;
const VERSION_CODE = '5.8.0';
const PLATFORM_CODE = '7';
const DRAFT_VERSION = '3.3.20';
const WEB_VERSION = '7.5.0';
const MIN_VERSION = '3.0.2';

// 延迟初始化（避免 Cloudflare Workers 全局作用域限制）
let _webId = null;
let _userId = null;
function getWebId() { if (!_webId) _webId = String(Math.floor(Math.random() * 999999999999999999) + 7000000000000000000); return _webId; }
function getUserId() { if (!_userId) _userId = uuid().replace(/-/g, ''); return _userId; }

const FAKE_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-language': 'zh-CN,zh;q=0.9',
  'Cache-control': 'no-cache',
  'Appid': String(DEFAULT_ASSISTANT_ID),
  'Appvr': VERSION_CODE,
  'Origin': 'https://jimeng.jianying.com',
  'Pragma': 'no-cache',
  'Priority': 'u=1, i',
  'Referer': 'https://jimeng.jianying.com',
  'Pf': PLATFORM_CODE,
  'Sec-Ch-Ua': '"Google Chrome";v="142", "Chromium";v="142", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

const MODEL_MAP = {
  'jimeng-image-5.0-pro': 'high_aes_general_v50',
  'jimeng-image-5.0-lite': 'high_aes_general_v50',
  'jimeng-image-4.7': 'high_aes_general_v43',
  'jimeng-image-4.6': 'high_aes_general_v42',
  'jimeng-image-4.5': 'high_aes_general_v40l',
  'jimeng-image-4.1': 'high_aes_general_v41',
  'jimeng-image-4.0': 'high_aes_general_v40',
  'jimeng-image-3.1': 'high_aes_general_v30l_art_fangzhou:general_v3.0_18b',
  'jimeng-image-3.0': 'high_aes_general_v30l:general_v3.0_18b',
  'jimeng-image-2.0-pro': 'high_aes_general_v20_L:general_v2.0_L',
};

const RATIO_VALUES = {
  '21:9': 0, '16:9': 1, '3:2': 2, '4:3': 3,
  '1:1': 8, '3:4': 4, '2:3': 5, '9:16': 6,
};

const DIMENSIONS_1K = {
  '21:9': { w: 2016, h: 846 }, '16:9': { w: 1664, h: 936 },
  '3:2': { w: 1584, h: 1056 }, '4:3': { w: 1472, h: 1104 },
  '1:1': { w: 1328, h: 1328 }, '3:4': { w: 1104, h: 1472 },
  '2:3': { w: 1056, h: 1584 }, '9:16': { w: 936, h: 1664 },
};

const DIMENSIONS_2K = {
  '21:9': { w: 3024, h: 1296 }, '16:9': { w: 2560, h: 1440 },
  '3:2': { w: 2496, h: 1664 }, '4:3': { w: 2304, h: 1728 },
  '1:1': { w: 2048, h: 2048 }, '3:4': { w: 1728, h: 2304 },
  '2:3': { w: 1664, h: 2496 }, '9:16': { w: 1440, h: 2560 },
};

const DIMENSIONS_4K = {
  '21:9': { w: 6197, h: 2656 }, '16:9': { w: 5404, h: 3040 },
  '3:2': { w: 4992, h: 3328 }, '4:3': { w: 4693, h: 3520 },
  '1:1': { w: 4096, h: 4096 }, '3:4': { w: 3520, h: 4693 },
  '2:3': { w: 3328, h: 4992 }, '9:16': { w: 3040, h: 5404 },
};

const HIGH_RES_MODELS = new Set([
  'jimeng-image-5.0-pro', 'jimeng-image-5.0-lite',
  'jimeng-image-4.7', 'jimeng-image-4.6', 'jimeng-image-4.5',
  'jimeng-image-4.1', 'jimeng-image-4.0',
]);

function isHighResModel(modelName) {
  return HIGH_RES_MODELS.has(modelName);
}

// ---------------------------------------------------------------------------
// 即梦 API 请求
// ---------------------------------------------------------------------------

function buildCookie(token) {
  return [
    `_tea_web_id=${getWebId()}`,
    'is_staff_user=false',
    'store-region=cn-gd',
    'store-region-src=uid',
    `sid_guard=${token}%7C${unixTimestamp()}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
    `uid_tt=${getUserId()}`,
    `uid_tt_ss=${getUserId()}`,
    `sid_tt=${token}`,
    `sessionid=${token}`,
    `sessionid_ss=${token}`,
  ].join('; ');
}

async function jimengRequest(token, method, uri, data) {
  const deviceTime = unixTimestamp();
  const sign = md5(`9e2c|${uri.slice(-7)}|${PLATFORM_CODE}|${VERSION_CODE}|${deviceTime}||11ac`);

  const url = `https://jimeng.jianying.com${uri}`;
  const headers = {
    ...FAKE_HEADERS,
    'Cookie': buildCookie(token),
    'Device-Time': String(deviceTime),
    'Sign': sign,
    'Sign-Ver': '1',
    'Content-Type': 'application/json',
  };

  const resp = await fetch(url, { method, headers, body: JSON.stringify(data) });
  const json = await resp.json();

  if (!resp.ok) {
    throw new Error(`Jimeng HTTP ${resp.status}: ${json.errmsg || json.message || 'unknown'}`);
  }

  const ret = json.ret;
  if (ret && ret !== '0') {
    const errmsg = json.errmsg || 'unknown error';
    if (ret === '5000' || ret === '1006') {
      throw new Error(`即梦积分不足：${errmsg}（错误码 ${ret}）`);
    }
    throw new Error(`即梦 API 错误：${errmsg}（错误码 ${ret}）`);
  }

  return json.data || json;
}

// ---------------------------------------------------------------------------
// CRC32（纯 JS，用于即梦图片上传校验）
// ---------------------------------------------------------------------------

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xEDB88320;
      else crc >>>= 1;
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ---------------------------------------------------------------------------
// AWS Signature V4（Web Crypto 实现，用于字节跳动 imagex 上传）
// ---------------------------------------------------------------------------

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey('raw', typeof key === 'string' ? new TextEncoder().encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, typeof data === 'string' ? new TextEncoder().encode(data) : data);
  return new Uint8Array(sig);
}

async function sha256Hex(data) {
  const hash = await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateAWSAuthorizationHeader(accessKeyID, secretAccessKey, sessionToken, region, service, requestMethod, requestParams, requestBody = {}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const amzDay = amzDate.substring(0, 8);

  const requestHeaders = {
    'X-Amz-Date': amzDate,
    'X-Amz-Security-Token': sessionToken,
  };

  const bodyStr = JSON.stringify(requestBody);
  if (Object.keys(requestBody).length > 0) {
    requestHeaders['X-Amz-Content-Sha256'] = await sha256Hex(bodyStr);
  }

  const credentialString = `${amzDay}/${region}/${service}/aws4_request`;
  const signedHeaders = Object.keys(requestHeaders).map(k => k.toLowerCase()).sort().join(';');
  const canonicalHeaders = Object.keys(requestHeaders).sort().map(k => `${k.toLowerCase()}:${requestHeaders[k]}`).join('\n') + '\n';

  const bodyHash = Object.keys(requestBody).length > 0
    ? await sha256Hex(bodyStr)
    : await sha256Hex('');

  const canonicalRequest = [
    requestMethod.toUpperCase(),
    '/',
    new URLSearchParams(requestParams).toString(),
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialString,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = await hmacSha256('AWS4' + secretAccessKey, amzDay);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const signingKey = await hmacSha256(kService, 'aws4_request');

  const signature = await hmacSha256(signingKey, stringToSign);
  const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyID}/${credentialString}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

  return { ...requestHeaders, 'Authorization': authorization };
}

// ---------------------------------------------------------------------------
// 参考图上传到即梦 CDN（字节跳动 imagex）
// ---------------------------------------------------------------------------

async function uploadImageToJimeng(token, imageDataUrl) {
  // 1. 解析图片数据
  let fileData;
  const isBase64 = /^data:/.test(imageDataUrl);
  if (isBase64) {
    const mimeMatch = imageDataUrl.match(/^data:(.+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const ext = mimeType.split('/')[1] || 'png';
    const base64Data = imageDataUrl.replace(/^data:.+;base64,/, '');
    // 使用 Uint8Array 而不是 Buffer
    const binaryStr = atob(base64Data);
    fileData = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      fileData[i] = binaryStr.charCodeAt(i);
    }
    var filename = `${uuid()}.${ext}`;
  } else if (/^https?:\/\//.test(imageDataUrl)) {
    const resp = await fetch(imageDataUrl);
    const arrBuf = await resp.arrayBuffer();
    fileData = new Uint8Array(arrBuf);
    filename = imageDataUrl.split('/').pop()?.split('?')[0] || `${uuid()}.jpg`;
  } else {
    throw new Error('参考图格式不支持，请使用 base64 或 HTTP URL');
  }

  // 2. 获取上传令牌
  const uploadAuth = await jimengRequest(token, 'POST', '/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync', { scene: 2 });
  if (!uploadAuth?.access_key_id) throw new Error('获取上传凭证失败，账号可能已掉线');

  // 3. 计算 CRC32
  const imageCrc32 = crc32(fileData).toString(16);

  // 4. ApplyImageUpload
  const applyParams = {
    Action: 'ApplyImageUpload',
    FileSize: fileData.length,
    ServiceId: 'tb4s082cfz',
    Version: '2018-08-01',
    s: Array.from({ length: 11 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join(''),
  };

  const applyHeaders = await generateAWSAuthorizationHeader(
    uploadAuth.access_key_id, uploadAuth.secret_access_key, uploadAuth.session_token,
    'cn-north-1', 'imagex', 'GET', applyParams
  );

  const applyResp = await fetch('https://imagex.bytedanceapi.com/?' + new URLSearchParams(applyParams).toString(), {
    headers: applyHeaders, timeout: 30000
  });
  const applyData = await applyResp.json();
  if (applyData['Response ']?.hasOwnProperty('Error')) {
    throw new Error(applyData['Response ']['Error']['Message']);
  }

  const UploadAddress = applyData.Result.UploadAddress;
  const uploadImgUrl = `https://${UploadAddress.UploadHosts[0]}/upload/v1/${UploadAddress.StoreInfos[0].StoreUri}`;

  // 5. 上传图片
  const uploadResp = await fetch(uploadImgUrl, {
    method: 'POST',
    headers: {
      'Authorization': UploadAddress.StoreInfos[0].Auth,
      'Content-Crc32': imageCrc32,
      'Content-Type': 'application/octet-stream',
    },
    body: fileData,
  });
  const uploadResult = await uploadResp.json();
  if (uploadResult.code !== 2000) {
    throw new Error(uploadResult.message || '上传图片失败');
  }

  // 6. CommitImageUpload
  const commitParams = {
    Action: 'CommitImageUpload',
    FileSize: fileData.length,
    ServiceId: 'tb4s082cfz',
    Version: '2018-08-01',
  };
  const commitBody = { SessionKey: UploadAddress.SessionKey };

  const commitHeaders = await generateAWSAuthorizationHeader(
    uploadAuth.access_key_id, uploadAuth.secret_access_key, uploadAuth.session_token,
    'cn-north-1', 'imagex', 'POST', commitParams, commitBody
  );

  const commitResp = await fetch('https://imagex.bytedanceapi.com/?' + new URLSearchParams(commitParams).toString(), {
    method: 'POST',
    headers: { ...commitHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(commitBody),
  });
  const commitData = await commitResp.json();
  if (commitData['Response ']?.hasOwnProperty('Error')) {
    throw new Error(commitData['Response ']['Error']['Message']);
  }

  return commitData.Result.Results[0].Uri;
}

// ---------------------------------------------------------------------------
// 健康检测 (GET)
// ---------------------------------------------------------------------------

async function handleHealth(token) {
  // 用 account info 接口验证 token 有效性
  try {
    const result = await jimengRequest(token, 'POST', '/passport/account/info/v2', {});
    const userId = result?.user_id;
    const valid = Boolean(userId);
    return {
      status: valid ? 'ok' : 'invalid',
      message: valid ? '即梦 sessionid 有效' : 'sessionid 无效或已过期',
      models: Object.keys(MODEL_MAP).filter(m => m.startsWith('jimeng-image')),
    };
  } catch (e) {
    return {
      status: 'error',
      message: e.message || '连接即梦失败',
      models: Object.keys(MODEL_MAP).filter(m => m.startsWith('jimeng-image')),
    };
  }
}

// ---------------------------------------------------------------------------
// 文生图 (POST)
// ---------------------------------------------------------------------------

async function handleGenerate(token, body) {
  const model = body.model || 'jimeng-image-5.0-pro';
  const prompt = body.prompt || '';
  const n = body.n || 1;
  const ratio = body.ratio || '1:1';
  const resolution = body.resolution || '2k';
  const responseFormat = body.response_format || 'url';
  const images = body.images || [];

  if (!prompt) throw new Error('缺少 prompt 参数');

  const reqKey = MODEL_MAP[model] || MODEL_MAP['jimeng-image-5.0-lite'];
  const isHigh = isHighResModel(model);

  // 解析分辨率
  let resolutionType = resolution;
  if (isHigh && resolutionType !== '2k' && resolutionType !== '4k') {
    resolutionType = '2k';
  }
  if (!isHigh && resolutionType !== '1k') {
    resolutionType = '1k';
  }

  // 解析比例
  const ratioKey = RATIO_VALUES.hasOwnProperty(ratio) ? ratio : '1:1';
  const imageRatio = RATIO_VALUES[ratioKey];

  // 解析尺寸
  const dimMap = resolutionType === '4k' ? DIMENSIONS_4K
    : resolutionType === '2k' ? DIMENSIONS_2K : DIMENSIONS_1K;
  const dims = dimMap[ratioKey] || dimMap['1:1'];

  // 上传参考图
  let uploadIDs = [];
  if (images.length > 0) {
    for (const img of images) {
      try {
        const uri = await uploadImageToJimeng(token, img);
        uploadIDs.push(uri);
      } catch (e) {
        throw new Error(`参考图上传失败：${e.message}`);
      }
    }
  }

  // 构建 abilities
  const componentId = uuid();
  const submitId = uuid();

  let abilities;
  let generateType = 'generate';
  if (uploadIDs.length > 0) {
    generateType = 'blend';
    abilities = {
      type: '',
      id: uuid(),
      blend: {
        type: '',
        id: uuid(),
        min_features: [],
        core_param: {
          type: '',
          id: uuid(),
          model: reqKey,
          prompt: prompt + '##',
          sample_strength: 0.5,
          image_ratio: imageRatio,
          large_image_info: {
            type: '',
            id: uuid(),
            height: dims.h,
            width: dims.w,
            resolution_type: resolutionType,
          },
        },
        ability_list: uploadIDs.map((uid) => ({
          type: '',
          id: uuid(),
          name: 'byte_edit',
          image_uri_list: [uid],
          image_list: [{
            type: 'image',
            id: uuid(),
            source_from: 'upload',
            platform_type: 1,
            name: '',
            image_uri: uid,
            width: 0,
            height: 0,
            format: '',
            uri: uid,
          }],
          strength: 0.5,
        })),
        history_option: { type: '', id: uuid() },
        prompt_placeholder_info_list: uploadIDs.map((_uid, index) => ({
          type: '',
          id: uuid(),
          ability_index: index,
        })),
        postedit_param: { type: '', id: uuid(), generate_type: 0 },
      },
      gen_option: { type: '', id: uuid(), gen_count: n, generate_all: false },
    };
  } else {
    abilities = buildTextGenerateAbilities(reqKey, prompt, imageRatio, resolutionType, dims, n);
  }

  // 构建请求
  const requestData = {
    extend: { root_model: reqKey },
    submit_id: submitId,
    metrics_extra: uploadIDs.length > 0 ? undefined : JSON.stringify({
      promptSource: 'custom',
      generateCount: n,
      enterFrom: 'click',
      sceneOptions: JSON.stringify([{
        type: 'image',
        scene: 'ImageBasicGenerate',
        modelReqKey: reqKey,
        resolutionType,
        abilityList: [],
        benefitCount: isHigh && resolutionType === '2k' ? 3 : 1,
        reportParams: {
          enterSource: 'generate',
          vipSource: 'generate',
          extraVipFunctionKey: `${reqKey}-${resolutionType}`,
          useVipFunctionDetailsReporterHoc: true,
        },
      }]),
      isBoxSelect: false,
      isCutout: false,
      generateId: submitId,
      isRegenerate: false,
    }),
    draft_content: JSON.stringify({
      type: 'draft',
      id: uuid(),
      min_version: MIN_VERSION,
      min_features: [],
      is_from_tsn: true,
      version: DRAFT_VERSION,
      main_component_id: componentId,
      component_list: [{
        type: 'image_base_component',
        id: componentId,
        min_version: MIN_VERSION,
        metadata: {
          type: '',
          id: uuid(),
          created_platform: 3,
          created_platform_version: '',
          created_time_in_ms: String(Date.now()),
          created_did: '',
        },
        generate_type: generateType,
        aigc_mode: 'workbench',
        abilities,
      }],
    }),
    http_common_info: { aid: DEFAULT_ASSISTANT_ID },
  };

  // 调用生成接口
  const { aigc_data } = await jimengRequest(token, 'POST',
    `/mweb/v1/aigc_draft/generate?da_version=${DRAFT_VERSION}&web_component_open_flag=1&web_version=${WEB_VERSION}`,
    requestData
  );

  const historyId = aigc_data?.history_record_id;
  if (!historyId) throw new Error('即梦未返回记录 ID');

  // 轮询等待结果
  const PROCESSING = new Set([20, 42, 45]);
  const FAIL = 30;
  let status = 20;
  let itemList = [];
  let retries = 0;
  const MAX = 90; // 最多 90 次（约 3 分钟）

  while (PROCESSING.has(status) && itemList.length === 0 && retries < MAX) {
    await new Promise(r => setTimeout(r, 2000)); // 每 2 秒轮询一次
    retries++;

    const result = await jimengRequest(token, 'POST', '/mweb/v1/get_history_by_ids', {
      history_ids: [historyId],
      image_info: {
        width: 2048, height: 2048, format: 'webp',
        image_scene_list: [
          { scene: 'normal', width: 2400, height: 2400, uniq_key: '2400', format: 'webp' },
          { scene: 'normal', width: 1080, height: 1080, uniq_key: '1080', format: 'webp' },
        ],
      },
      http_common_info: { aid: DEFAULT_ASSISTANT_ID },
    });

    const record = result[historyId];
    if (!record) throw new Error('即梦记录不存在');

    status = record.status;
    itemList = record.item_list || [];
  }

  if (retries >= MAX) throw new Error('即梦生图超时（超过 3 分钟）');
  if (status === FAIL) throw new Error('即梦生图失败');

  // 组装返回结果（兼容 OpenAI 图片 API 格式 + b64_json 支持）
  const data = [];
  for (const item of itemList) {
    const imgUrl = item?.image?.large_images?.[0]?.image_url
      || item?.common_attr?.cover_url
      || '';

    const entry = { url: imgUrl };

    if (responseFormat === 'b64_json' && imgUrl) {
      try {
        const imgResp = await fetch(imgUrl);
        const arr = await imgResp.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(arr)));
        entry.b64_json = b64;
      } catch (_) {
        // b64 转换失败，保留 url
      }
    }

    data.push(entry);
  }

  return { data };
}

function buildTextGenerateAbilities(reqKey, prompt, imageRatio, resolutionType, dims, n = 1) {
  return {
    type: '',
    id: uuid(),
    generate: {
      type: '',
      id: uuid(),
      core_param: {
        type: '',
        id: uuid(),
        model: reqKey,
        prompt,
        negative_prompt: '',
        seed: Math.floor(Math.random() * 100000000) + 2500000000,
        sample_strength: 0.5,
        image_ratio: imageRatio,
        large_image_info: {
          type: '',
          id: uuid(),
          height: dims.h,
          width: dims.w,
          resolution_type: resolutionType,
        },
      },
      history_option: { type: '', id: uuid() },
    },
    gen_option: { type: '', id: uuid(), gen_count: n, generate_all: false },
  };
}

// ---------------------------------------------------------------------------
// Cloudflare Pages Function 入口
// ---------------------------------------------------------------------------

export async function onRequest({ request }) {
  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: corsHeaders });
  }

  // 提取即梦 sessionid（走 Bearer token）
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json({ message: '请先设置即梦 Session ID' }, 401);
  }

  try {
    if (request.method === 'GET') {
      const health = await handleHealth(token);
      return json(health);
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const result = await handleGenerate(token, body);
      return json(result);
    }

    return json({ message: 'Method not allowed' }, 405);
  } catch (e) {
    return json({ message: e.message || '即梦 API 调用失败' }, 500);
  }
}
