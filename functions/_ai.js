const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-1.5';
const DEFAULT_OPENAI_TEXT_MODEL = 'gpt-5.4-mini';
const DEFAULT_LK888_BASE_URL = 'https://api.lk888.ai';
const DEFAULT_LK888_IMAGE_MODEL = 'gpt-image-2';
const DEFAULT_LK888_TEXT_MODEL = 'gpt-5.5';
const DEFAULT_SUPABASE_URL = 'https://juuqvjmhzdgfggzrivbb.supabase.co';
const LK888_REFERENCE_BUCKET = 'vf-projects';
const OPENAI_IMAGE_SIZE_BY_RATIO = {
  '1:1': '1024x1024',
  '3:4': '1024x1536',
  '4:3': '1536x1024',
  '9:16': '1024x1536',
  '16:9': '1536x1024'
};

const VOLC_IMAGE_SIZE_BY_RATIO = {
  '1:1': '2048x2048',
  '3:4': '1920x2560',
  '4:3': '2560x1920',
  '9:16': '1440x2560',
  '16:9': '2560x1440'
};
const VOLC_VISUAL_HOST = 'visual.volcengineapi.com';
const VOLC_VISUAL_REGION = 'cn-north-1';
const VOLC_VISUAL_SERVICE = 'cv';

export function hasOpenAI(env) {
  return !!env?.OPENAI_API_KEY;
}

export function hasLK888(env) {
  return !!env?.LK888_API_KEY;
}

export function hasVolcImage(env) {
  return !!env?.VOLC_API_KEY && !!env?.ENDPOINT_ID;
}

export function hasVolcOutpaint(env) {
  return !!env?.VOLC_ACCESS_KEY_ID && !!env?.VOLC_SECRET_ACCESS_KEY;
}

export function aiReady(env) {
  return hasOpenAI(env) || hasLK888(env) || hasVolcImage(env) || hasVolcOutpaint(env);
}

export function requireAI(env, capability = 'image generation') {
  if (capability === 'outpaint') {
    if (!hasOpenAI(env) && !hasVolcOutpaint(env)) {
      throw new Error('AI 扩图未配置：请设置 OPENAI_API_KEY，或设置 VOLC_ACCESS_KEY_ID + VOLC_SECRET_ACCESS_KEY。');
    }
    return;
  }

  if (!aiReady(env)) {
    throw new Error('AI 生图未配置：请在 Cloudflare Pages 环境变量中设置 OPENAI_API_KEY，或设置 VOLC_API_KEY + ENDPOINT_ID。');
  }
}

export function normalizePrompt(prompt) {
  return String(prompt || '').trim().slice(0, 1800);
}

function getOpenAIImageModel(env) {
  return env?.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL;
}

function getOpenAITextModel(env) {
  return env?.OPENAI_TEXT_MODEL || DEFAULT_OPENAI_TEXT_MODEL;
}

function getLK888BaseUrl(env) {
  return String(env?.LK888_BASE_URL || DEFAULT_LK888_BASE_URL).replace(/\/+$/, '');
}

function getLK888TextModel(env) {
  return env?.LK888_TEXT_MODEL || DEFAULT_LK888_TEXT_MODEL;
}

function getLK888ImageModel(env) {
  return env?.LK888_IMAGE_MODEL || DEFAULT_LK888_IMAGE_MODEL;
}

export function finalImagePrompt(prompt) {
  const cleanPrompt = normalizePrompt(prompt);
  if (!cleanPrompt) throw new Error('请输入画面描述词。');
  return [
    cleanPrompt,
    'high-end commercial visual, clean composition, premium advertising lighting, detailed product photography style',
    'no watermark, no logo unless explicitly requested'
  ].join(', ');
}

export function getOpenAIImageSize(ratio) {
  return OPENAI_IMAGE_SIZE_BY_RATIO[ratio] || OPENAI_IMAGE_SIZE_BY_RATIO['1:1'];
}

export function getVolcImageSize(ratio) {
  return VOLC_IMAGE_SIZE_BY_RATIO[ratio] || VOLC_IMAGE_SIZE_BY_RATIO['1:1'];
}

export function getVolcVisualMaxSize(ratio) {
  if (ratio === '16:9') return { max_width: 1920, max_height: 1080 };
  if (ratio === '9:16') return { max_width: 1080, max_height: 1920 };
  if (ratio === '4:3') return { max_width: 1920, max_height: 1440 };
  if (ratio === '3:4') return { max_width: 1440, max_height: 1920 };
  return { max_width: 1920, max_height: 1920 };
}

export function parseImageBase64(data) {
  const item = data?.data?.[0] || data?.output?.[0] || data;
  const base64 = item?.b64_json || item?.image_base64 || item?.base64 || item?.data;
  if (!base64) throw new Error('AI 接口没有返回图片数据。');
  return String(base64).replace(/^data:[^;]+;base64,/, '');
}

function findImageValue(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return '';
  if (seen.has(value)) return '';
  seen.add(value);

  const direct = value.b64_json || value.image_base64 || value.base64 || value.image || value.url || value.image_url || value.output_url;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  for (const key of ['images', 'image_urls', 'imageUrls', 'urls', 'result', 'results', 'data', 'output']) {
    const child = value[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (typeof item === 'string' && item.trim()) return item.trim();
        const found = findImageValue(item, seen);
        if (found) return found;
      }
    } else {
      const found = findImageValue(child, seen);
      if (found) return found;
    }
  }

  for (const item of Object.values(value)) {
    const found = findImageValue(item, seen);
    if (found) return found;
  }
  return '';
}

export async function parseImageResultAsBase64(data) {
  const image = findImageValue(data);
  if (/^https?:\/\//i.test(image)) return fetchImageUrlAsBase64(image);
  if (image) return String(image).replace(/^data:[^;]+;base64,/, '');
  const textImage = typeof data?.data === 'string'
    ? data.data
    : typeof data?.result === 'string'
      ? data.result
      : '';
  if (/^https?:\/\//i.test(textImage)) return fetchImageUrlAsBase64(textImage);
  if (textImage) return String(textImage).replace(/^data:[^;]+;base64,/, '');
  throw new Error('AI 接口没有返回图片数据。');
}

export function parseResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  (data?.output || []).forEach(item => {
    (item?.content || []).forEach(content => {
      if (typeof content?.text === 'string') parts.push(content.text);
    });
  });
  const text = parts.join('\n').trim();
  if (!text) throw new Error('OpenAI 没有返回提示词内容。');
  return text;
}

export function parseChatCompletionText(data) {
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text === 'string' && text.trim()) return text.trim();
  throw new Error('GPT-5.5 没有返回提示词内容。');
}

export async function fetchImageUrlAsBase64(url) {
  if (!url) throw new Error('AI 接口没有返回图片地址。');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`图片下载失败：HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64ToBlob(base64, mimeType = 'image/png') {
  const clean = String(base64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!clean) throw new Error('缺少需要扩图的原始图片。');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function getSupabaseStorageConfig(env) {
  return {
    url: String(env?.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, ''),
    serviceRoleKey: env?.SUPABASE_SERVICE_ROLE_KEY || ''
  };
}

function encodeStoragePath(path) {
  return String(path || '')
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

function getImageExtension(mimeType = 'image/png') {
  const lower = String(mimeType || '').toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('webp')) return 'webp';
  return 'png';
}

async function uploadLK888ReferenceImage(env, item, index) {
  const config = getSupabaseStorageConfig(env);
  if (!config.serviceRoleKey) {
    throw new Error('GPT 参考图需要临时图片 URL：请确认 Cloudflare 已配置 SUPABASE_SERVICE_ROLE_KEY。');
  }
  const mimeType = String(item.mimeType || '').startsWith('image/') ? item.mimeType : 'image/png';
  const ext = getImageExtension(mimeType);
  const path = `ai-reference/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${crypto.randomUUID()}-${index + 1}.${ext}`;
  const encodedPath = encodeStoragePath(path);
  const storageUrl = `${config.url}/storage/v1`;
  const uploadUrl = `${storageUrl}/object/${LK888_REFERENCE_BUCKET}/${encodedPath}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': mimeType,
      'x-upsert': 'true'
    },
    body: base64ToBlob(item.image, mimeType)
  });
  const uploadText = await uploadResponse.text();
  if (!uploadResponse.ok) {
    let errorData = {};
    try {
      errorData = uploadText ? JSON.parse(uploadText) : {};
    } catch {
      errorData = { raw: uploadText };
    }
    throw new Error(errorData?.message || errorData?.error || errorData?.raw || `参考图临时上传失败：HTTP ${uploadResponse.status}`);
  }

  const signResponse = await fetch(`${storageUrl}/object/sign/${LK888_REFERENCE_BUCKET}/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn: 60 * 60 })
  });
  const signText = await signResponse.text();
  let signData = {};
  try {
    signData = signText ? JSON.parse(signText) : {};
  } catch {
    signData = { raw: signText };
  }
  if (!signResponse.ok) {
    throw new Error(signData?.message || signData?.error || signData?.raw || `参考图临时链接生成失败：HTTP ${signResponse.status}`);
  }
  const signedPath = signData?.signedURL || signData?.signedUrl || signData?.url || '';
  if (!signedPath) throw new Error('参考图临时链接生成失败：Supabase 没有返回 signedURL。');
  return {
    path,
    url: /^https?:\/\//i.test(signedPath) ? signedPath : `${storageUrl}${signedPath.startsWith('/') ? '' : '/'}${signedPath}`
  };
}

async function removeLK888ReferenceImages(env, uploaded = []) {
  const paths = uploaded.map(item => item?.path).filter(Boolean);
  if (!paths.length) return;
  const config = getSupabaseStorageConfig(env);
  if (!config.serviceRoleKey) return;
  await fetch(`${config.url}/storage/v1/object/${LK888_REFERENCE_BUCKET}`, {
    method: 'DELETE',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: paths })
  }).catch(() => {});
}

export async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || data?.raw || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256(key, value) {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

async function volcVisualHeaders(env, body) {
  const now = new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = xDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);
  const signedHeaders = 'content-type;host;x-content-sha256;x-date';
  const canonicalRequest = [
    'POST',
    '/',
    'Action=CVProcess&Version=2022-08-31',
    'content-type:application/json',
    `host:${VOLC_VISUAL_HOST}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${xDate}`,
    '',
    signedHeaders,
    payloadHash
  ].join('\n');
  const credentialScope = `${shortDate}/${VOLC_VISUAL_REGION}/${VOLC_VISUAL_SERVICE}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    xDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n');
  const kDate = await hmacSha256(env.VOLC_SECRET_ACCESS_KEY, shortDate);
  const kRegion = await hmacSha256(kDate, VOLC_VISUAL_REGION);
  const kService = await hmacSha256(kRegion, VOLC_VISUAL_SERVICE);
  const kSigning = await hmacSha256(kService, 'request');
  const signature = bytesToHex(await hmacSha256(kSigning, stringToSign));

  return {
    'Content-Type': 'application/json',
    Host: VOLC_VISUAL_HOST,
    'X-Date': xDate,
    'X-Content-Sha256': payloadHash,
    Authorization: `HMAC-SHA256 Credential=${env.VOLC_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

export async function generateWithOpenAI(env, prompt, ratio) {
  if (hasLK888(env)) {
    return generateWithLK888Image(env, prompt, ratio);
  }
  if (!hasOpenAI(env)) {
    throw new Error('GPT 生图未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY 或 OPENAI_API_KEY。');
  }
  const data = await postJson('https://api.openai.com/v1/images/generations', {
    model: getOpenAIImageModel(env),
    prompt: finalImagePrompt(prompt),
    size: getOpenAIImageSize(ratio),
    quality: 'medium',
    n: 1
  }, {
    Authorization: `Bearer ${env.OPENAI_API_KEY}`
  });
  return parseImageBase64(data);
}

export async function generateWithLK888Image(env, prompt, ratio) {
  if (!hasLK888(env)) {
    throw new Error('抹尘 GPT Image 2 未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY。');
  }
  const data = await postJson(`${getLK888BaseUrl(env)}/v1/images/generations`, {
    model: getLK888ImageModel(env),
    prompt: finalImagePrompt(prompt),
    size: getOpenAIImageSize(ratio),
    n: 1
  }, {
    Authorization: `Bearer ${env.LK888_API_KEY}`
  });
  return parseImageResultAsBase64(data);
}

export async function generateWithOpenAIReference(env, prompt, ratio, referenceImages = []) {
  if (hasLK888(env)) {
    return generateWithLK888ImageReference(env, prompt, ratio, referenceImages);
  }
  if (!hasOpenAI(env)) {
    throw new Error('GPT 参考图生图未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY 或 OPENAI_API_KEY。');
  }
  const images = Array.isArray(referenceImages)
    ? referenceImages.slice(0, 8).filter(item => item?.image)
    : referenceImages
      ? [{ image: referenceImages, mimeType: 'image/png' }]
      : [];
  if (images.length === 0) throw new Error('请先添加参考图。');
  const form = new FormData();
  form.append('model', getOpenAIImageModel(env));
  form.append('prompt', [
    finalImagePrompt(prompt),
    'use the uploaded reference images for subject, composition, product style, color palette, or visual direction while creating a polished commercial poster image'
  ].join(', '));
  form.append('size', getOpenAIImageSize(ratio));
  form.append('quality', 'medium');
  images.forEach((item, index) => {
    const safeMimeType = String(item.mimeType || '').startsWith('image/') ? item.mimeType : 'image/png';
    const ext = safeMimeType.includes('jpeg') || safeMimeType.includes('jpg') ? 'jpg' : safeMimeType.includes('webp') ? 'webp' : 'png';
    form.append('image[]', base64ToBlob(item.image, safeMimeType), `reference-${index + 1}.${ext}`);
  });

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: form
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || data?.raw || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return parseImageBase64(data);
}

export async function generateWithLK888ImageReference(env, prompt, ratio, referenceImages = []) {
  if (!hasLK888(env)) {
    throw new Error('抹尘 GPT Image 2 参考图生图未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY。');
  }
  const images = Array.isArray(referenceImages)
    ? referenceImages.slice(0, 8).filter(item => item?.image)
    : referenceImages
      ? [{ image: referenceImages, mimeType: 'image/png' }]
      : [];
  if (images.length === 0) throw new Error('请先添加参考图。');
  const uploadedReferences = [];
  const promptText = [
    finalImagePrompt(prompt),
    'use the uploaded reference images for subject, composition, product style, color palette, or visual direction while creating a polished commercial poster image'
  ].join(', ');
  try {
    for (let i = 0; i < images.length; i += 1) {
      uploadedReferences.push(await uploadLK888ReferenceImage(env, images[i], i));
    }
    const referenceUrls = uploadedReferences.map(item => item.url);
    const submitData = await postJson(`${getLK888BaseUrl(env)}/v1/media/generate`, {
      model: getLK888ImageModel(env),
      prompt: promptText,
      images: referenceUrls,
      params: {
        prompt: promptText,
        images: referenceUrls,
        size: getOpenAIImageSize(ratio)
      }
    }, {
      Authorization: `Bearer ${env.LK888_API_KEY}`
    });
    return await pollLK888MediaTask(env, submitData);
  } finally {
    await removeLK888ReferenceImages(env, uploadedReferences);
  }
}

function getLK888TaskId(data) {
  if (typeof data?.data === 'string' && data.data.trim()) return data.data.trim();
  if (typeof data?.result === 'string' && data.result.trim()) return data.result.trim();
  if (typeof data?.task === 'string' && data.task.trim()) return data.task.trim();
  return findLK888TaskId(data);
}

function findLK888TaskId(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return '';
  if (seen.has(value)) return '';
  seen.add(value);

  const taskKeys = new Set([
    'task_id',
    'taskId',
    'taskID',
    'task',
    'job_id',
    'jobId',
    'request_id',
    'requestId',
    'id'
  ]);
  for (const key of taskKeys) {
    const direct = value[key];
    if ((typeof direct === 'string' || typeof direct === 'number') && String(direct).trim()) {
      return String(direct).trim();
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && /(?:task|job|request).*id/i.test(key) && child.trim()) {
      return child.trim();
    }
    if (typeof child === 'number' && /(?:task|job|request).*id/i.test(key)) {
      return String(child);
    }
    const found = findLK888TaskId(child, seen);
    if (found) return found;
  }
  return '';
}

function getLK888TaskStatus(data) {
  return String(data?.status || data?.data?.status || data?.result?.status || '').toLowerCase();
}

function getLK888Message(data) {
  return data?.error?.message || data?.message || data?.msg || data?.raw || data?.data?.message || data?.data?.msg || data?.result?.message || data?.result?.msg || '';
}

function getLK888ResponseShape(value, depth = 0, seen = new Set()) {
  if (!value || typeof value !== 'object' || depth > 2 || seen.has(value)) return '';
  seen.add(value);
  const keys = Object.keys(value).slice(0, 12);
  return keys.map(key => {
    const child = value[key];
    if (child && typeof child === 'object') {
      const nested = getLK888ResponseShape(child, depth + 1, seen);
      return nested ? `${key}.{${nested}}` : key;
    }
    return key;
  }).join(', ');
}

function assertLK888Accepted(data) {
  const code = data?.code ?? data?.status_code ?? data?.statusCode;
  if (code !== undefined && code !== null && !['0', '200', 'success', 'ok'].includes(String(code).toLowerCase())) {
    throw new Error(getLK888Message(data) || `抹尘 AI 提交失败：${code}`);
  }
  if (data?.success === false || data?.ok === false) {
    throw new Error(getLK888Message(data) || '抹尘 AI 提交失败。');
  }
  const status = getLK888TaskStatus(data);
  if (['failed', 'fail', 'error', 'cancelled', 'canceled'].includes(status)) {
    throw new Error(getLK888Message(data) || `抹尘 AI 提交失败：${status}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function pollLK888MediaTask(env, submitData) {
  assertLK888Accepted(submitData);

  const immediate = findImageValue(submitData);
  if (immediate) return parseImageResultAsBase64(submitData);

  const taskId = getLK888TaskId(submitData);
  if (!taskId) {
    const shape = getLK888ResponseShape(submitData);
    throw new Error(`抹尘 AI 没有返回 task_id，无法查询生成结果${shape ? `（返回字段：${shape}）` : ''}。`);
  }

  const successStatuses = new Set(['success', 'succeeded', 'completed', 'complete', 'done', 'finished']);
  const failedStatuses = new Set(['failed', 'fail', 'error', 'cancelled', 'canceled']);
  let lastStatus = '';
  let lastMessage = '';

  for (let i = 0; i < 90; i += 1) {
    await sleep(i < 3 ? 1200 : 2000);
    const data = await fetchLK888TaskStatus(env, taskId);
    assertLK888Accepted(data);
    const status = getLK888TaskStatus(data);
    lastStatus = status || lastStatus;
    lastMessage = getLK888Message(data) || lastMessage;
    if (successStatuses.has(status) || findImageValue(data)) return parseImageResultAsBase64(data);
    if (failedStatuses.has(status)) throw new Error(lastMessage || `抹尘 AI 生成失败：${status}`);
  }

  throw new Error(`抹尘 AI 生成超时${lastStatus ? `（当前状态：${lastStatus}）` : ''}，请稍后重试。`);
}

async function fetchLK888TaskStatus(env, taskId) {
  const baseUrl = getLK888BaseUrl(env);
  const urls = [
    `${baseUrl}/v1/skills/task-status?task_id=${encodeURIComponent(taskId)}`,
    `${baseUrl}/v1/media/status?task_id=${encodeURIComponent(taskId)}`
  ];
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${env.LK888_API_KEY}` }
      });
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }
      if (response.ok) return data;
      lastError = data?.error?.message || data?.message || data?.raw || `HTTP ${response.status}`;
      if (response.status !== 404) break;
    } catch (error) {
      lastError = error.message;
    }
  }
  throw new Error(lastError || '查询抹尘 AI 任务状态失败。');
}

export async function enhancePromptWithOpenAI(env, prompt, ratio) {
  if (hasLK888(env)) {
    return enhancePromptWithLK888(env, prompt, ratio);
  }
  if (!hasOpenAI(env)) {
    throw new Error('提示词增强未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY 或 OPENAI_API_KEY。');
  }
  const cleanPrompt = normalizePrompt(prompt);
  if (!cleanPrompt) throw new Error('请输入需要优化的画面描述词。');
  const ratioHint = ratio === '16:9'
    ? '宽幅 banner，主体和信息区要有明确左右分区，留出干净背景空间'
    : ratio === '9:16'
      ? '竖版开屏，主体避免贴边，上方可留品牌/促销信息空间'
      : ratio === '4:3'
        ? '横版头图，主体突出，适合叠加促销标签'
        : '方形商业海报，主体居中但保留排版空间';
  const data = await postJson('https://api.openai.com/v1/responses', {
    model: getOpenAITextModel(env),
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: [
              '你是资深商业美食海报创意指导和AI生图提示词专家。',
              '把用户的简短中文描述改写成适合图像生成模型的高质量提示词。',
              '只输出一段提示词，不要解释，不要编号，不要 Markdown。',
              '提示词可以中英混合，但必须保留用户明确指定的主体、国家、品类、活动和颜色。',
              '避免生成文字、水印、Logo、奇怪手指、畸形食物；除非用户明确要求，不要让画面里出现可读文字。',
              '强调商业广告摄影、真实食物质感、可叠加标签的留白、灯光、镜头、构图和背景。'
            ].join('\n')
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `原始描述：${cleanPrompt}\n画板比例：${ratio || '1:1'}\n构图要求：${ratioHint}\n请输出可直接用于AI生图的一段增强提示词。`
          }
        ]
      }
    ],
    max_output_tokens: 520
  }, {
    Authorization: `Bearer ${env.OPENAI_API_KEY}`
  });
  return parseResponseText(data).replace(/^["“]|["”]$/g, '').trim();
}

export async function enhancePromptWithLK888(env, prompt, ratio) {
  if (!hasLK888(env)) {
    throw new Error('GPT-5.5 未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY。');
  }
  const cleanPrompt = normalizePrompt(prompt);
  if (!cleanPrompt) throw new Error('请输入需要优化的画面描述词。');
  const ratioHint = ratio === '16:9'
    ? '宽幅 banner，主体和信息区要有明确左右分区，留出干净背景空间'
    : ratio === '9:16'
      ? '竖版开屏，主体避免贴边，上方可留品牌/促销信息空间'
      : ratio === '4:3'
        ? '横版头图，主体突出，适合叠加促销标签'
        : '方形商业海报，主体居中但保留排版空间';
  const data = await postJson(`${getLK888BaseUrl(env)}/v1/chat/completions`, {
    model: getLK888TextModel(env),
    messages: [
      {
        role: 'system',
        content: [
          '你是资深商业美食海报创意指导和AI生图提示词专家。',
          '把用户的简短中文描述改写成适合图像生成模型的高质量提示词。',
          '只输出一段提示词，不要解释，不要编号，不要 Markdown。',
          '提示词可以中英混合，但必须保留用户明确指定的主体、国家、品类、活动和颜色。',
          '避免生成文字、水印、Logo、奇怪手指、畸形食物；除非用户明确要求，不要让画面里出现可读文字。',
          '强调商业广告摄影、真实食物质感、可叠加标签的留白、灯光、镜头、构图和背景。'
        ].join('\n')
      },
      {
        role: 'user',
        content: `原始描述：${cleanPrompt}\n画板比例：${ratio || '1:1'}\n构图要求：${ratioHint}\n请输出可直接用于AI生图的一段增强提示词。`
      }
    ],
    temperature: 0.6,
    max_tokens: 520
  }, {
    Authorization: `Bearer ${env.LK888_API_KEY}`
  });
  return parseChatCompletionText(data).replace(/^["“]|["”]$/g, '').trim();
}

export async function generateWithVolc(env, prompt, ratio) {
  if (!hasVolcImage(env)) {
    throw new Error('火山生图未配置：请设置 VOLC_API_KEY + ENDPOINT_ID。');
  }
  const data = await postJson('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
    model: env.ENDPOINT_ID,
    prompt: finalImagePrompt(prompt),
    size: getVolcImageSize(ratio),
    response_format: 'url',
    watermark: false
  }, {
    Authorization: `Bearer ${env.VOLC_API_KEY}`
  });
  const item = data?.data?.[0];
  if (item?.b64_json) return item.b64_json;
  return fetchImageUrlAsBase64(item?.url);
}

function normalizeReferenceImages(referenceImages = []) {
  return (Array.isArray(referenceImages) ? referenceImages : [referenceImages])
    .slice(0, 8)
    .filter(item => item?.image)
    .map(item => {
      const mimeType = String(item.mimeType || '').startsWith('image/') ? item.mimeType : 'image/png';
      const clean = String(item.image || '').replace(/^data:[^;]+;base64,/, '');
      return {
        mimeType,
        base64: clean,
        dataUrl: `data:${mimeType};base64,${clean}`
      };
    })
    .filter(item => item.base64);
}

async function postVolcImageGeneration(env, payload) {
  const data = await postJson('https://ark.cn-beijing.volces.com/api/v3/images/generations', payload, {
    Authorization: `Bearer ${env.VOLC_API_KEY}`
  });
  const item = data?.data?.[0];
  if (item?.b64_json) return item.b64_json;
  return fetchImageUrlAsBase64(item?.url);
}

export async function generateWithVolcReference(env, prompt, ratio, referenceImages = []) {
  if (!hasVolcImage(env)) {
    throw new Error('火山图生图未配置：请设置 VOLC_API_KEY + ENDPOINT_ID。');
  }
  const images = normalizeReferenceImages(referenceImages);
  if (images.length === 0) throw new Error('请先添加参考图。');
  const basePayload = {
    model: env.VOLC_I2I_ENDPOINT_ID || env.ENDPOINT_ID,
    prompt: [
      finalImagePrompt(prompt),
      'use the uploaded reference image as visual reference, keep subject identity, product appearance, composition cues, color palette and commercial poster direction'
    ].join(', '),
    size: getVolcImageSize(ratio),
    response_format: 'url',
    watermark: false
  };
  const imageUrls = images.map(item => item.dataUrl);
  const payloads = [
    { ...basePayload, image: imageUrls },
    { ...basePayload, image_urls: imageUrls },
    { ...basePayload, image: imageUrls[0] }
  ];
  let lastError = null;
  for (const payload of payloads) {
    try {
      return await postVolcImageGeneration(env, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`火山图生图失败：${lastError?.message || '接口没有接受参考图参数。'}`);
}

export function normalizeExpand(expand = {}) {
  const pick = key => Math.max(0, Math.min(2, Number(expand?.[key]) || 0));
  return {
    top: pick('top'),
    bottom: pick('bottom'),
    left: pick('left'),
    right: pick('right')
  };
}

export async function outpaintWithVolc(env, prompt, baseImage, ratio, expand = {}) {
  requireAI(env, 'outpaint');
  if (!hasVolcOutpaint(env)) {
    throw new Error('火山扩图未配置：缺少 VOLC_ACCESS_KEY_ID 或 VOLC_SECRET_ACCESS_KEY。');
  }
  const { top, bottom, left, right } = normalizeExpand(expand);
  if (top + bottom + left + right <= 0) {
    throw new Error('缺少扩图方向参数。');
  }
  const { max_width, max_height } = getVolcVisualMaxSize(ratio);
  const body = JSON.stringify({
    req_key: 'i2i_outpainting',
    prompt: [
      normalizePrompt(prompt) || 'extend the background naturally',
      'seamless background extension, preserve the original subject and product, clean commercial photography, no text, no watermark'
    ].join(', '),
    binary_data_base64: [String(baseImage || '').replace(/^data:[^;]+;base64,/, '')],
    scale: 7,
    seed: -1,
    steps: 30,
    strength: 0.8,
    top,
    bottom,
    left,
    right,
    max_width,
    max_height,
    return_url: false
  });
  const response = await fetch(`https://${VOLC_VISUAL_HOST}?Action=CVProcess&Version=2022-08-31`, {
    method: 'POST',
    headers: await volcVisualHeaders(env, body),
    body
  });
  const text = await response.text();
  let root;
  try {
    root = text ? JSON.parse(text) : {};
  } catch {
    root = { raw: text };
  }
  if (!response.ok || root?.ResponseMetadata?.Error) {
    const error = root?.ResponseMetadata?.Error;
    throw new Error(error?.Message || root?.message || root?.raw || `HTTP ${response.status}`);
  }
  const data = root.data || root.Result || {};
  const status = root.status ?? root.code;
  if (status && status !== 10000) {
    throw new Error(root.message || JSON.stringify(root));
  }
  const base64Data = data.binary_data_base64?.[0];
  if (base64Data) return base64Data;
  const imageUrl = data.image_urls?.[0] || data.ImageUrls?.[0];
  if (imageUrl) return fetchImageUrlAsBase64(imageUrl);
  throw new Error('火山扩图接口没有返回图片。');
}

export async function outpaintWithBestProvider(env, options = {}) {
  const {
    prompt,
    baseImage,
    volcBaseImage,
    ratio,
    mimeType,
    maskBase64,
    expand,
    provider
  } = options;
  requireAI(env, 'outpaint');
  const requestedProvider = provider === 'volc' ? 'volc' : provider === 'openai' ? 'openai' : '';
  if (requestedProvider === 'openai' && !hasOpenAI(env)) {
    throw new Error('GPT 扩图未配置：请在 Cloudflare Pages 环境变量中设置 OPENAI_API_KEY。');
  }
  if (requestedProvider === 'volc' && !hasVolcOutpaint(env)) {
    throw new Error('火山扩图未配置：缺少 VOLC_ACCESS_KEY_ID 或 VOLC_SECRET_ACCESS_KEY。');
  }
  if ((requestedProvider && requestedProvider === 'openai') || (!requestedProvider && hasOpenAI(env))) {
    return {
      provider: 'openai',
      imageBase64: await outpaintWithOpenAI(env, prompt, baseImage, ratio, mimeType, maskBase64)
    };
  }
  return {
    provider: 'volc-i2i-outpainting',
    imageBase64: await outpaintWithVolc(env, prompt, volcBaseImage || baseImage, ratio, expand)
  };
}

export async function outpaintWithOpenAI(env, prompt, baseImage, ratio, mimeType = 'image/png', maskBase64 = '') {
  requireAI(env, 'outpaint');
  const form = new FormData();
  form.append('model', getOpenAIImageModel(env));
  form.append('prompt', [
    normalizePrompt(prompt) || 'extend the background naturally',
    'extend the existing image naturally, preserve the main subject, commercial poster background, no watermark'
  ].join(', '));
  form.append('size', getOpenAIImageSize(ratio));
  form.append('quality', 'medium');
  const safeMimeType = String(mimeType || '').startsWith('image/') ? mimeType : 'image/png';
  const ext = safeMimeType.includes('jpeg') || safeMimeType.includes('jpg') ? 'jpg' : safeMimeType.includes('webp') ? 'webp' : 'png';
  form.append('image', base64ToBlob(baseImage, safeMimeType), `source.${ext}`);
  if (maskBase64) {
    form.append('mask', base64ToBlob(maskBase64, 'image/png'), 'mask.png');
  }

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: form
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || data?.raw || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return parseImageBase64(data);
}
