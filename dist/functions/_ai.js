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
  // 生图结果进入 1080 级别画板后还会缩放。此前默认请求 2K/2.5K，
  // 不仅大幅增加火山排队和推理时间，也让参考图生图更容易超时。
  // 这里保留足够用于常用社媒画板的长边分辨率；需要印刷级大图时再由
  // 专门的高清/放大流程处理，而不是拖慢每一次普通生图。
  '1:1': '1024x1024',
  '3:4': '1024x1536',
  '4:3': '1536x1024',
  '9:16': '1024x1536',
  '16:9': '1536x1024'
};
const VOLC_VISUAL_HOST = 'visual.volcengineapi.com';
const VOLC_VISUAL_REGION = 'cn-north-1';
const VOLC_VISUAL_SERVICE = 'cv';
const GPT_REFERENCE_LIMIT = 8;

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

  const direct = value.b64_json || value.image_base64 || value.base64 || value.image || value.url || value.image_url || value.imageUrl || value.output_url || value.outputUrl || value.file_url || value.fileUrl || value.result_url || value.resultUrl || value.content;
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
    ? referenceImages.slice(0, GPT_REFERENCE_LIMIT).filter(item => item?.image)
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
  const submitted = await submitLK888ImageReferenceTask(env, prompt, ratio, referenceImages);
  if (submitted.imageBase64) return submitted.imageBase64;
  return pollLK888MediaTask(env, { task_id: submitted.taskId });
}

export async function submitLK888ImageReferenceTask(env, prompt, ratio, referenceImages = []) {
  if (!hasLK888(env)) {
    throw new Error('抹尘 GPT Image 2 参考图生图未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY。');
  }
  const images = Array.isArray(referenceImages)
    ? referenceImages.slice(0, GPT_REFERENCE_LIMIT).filter(item => item?.image)
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
    // 临时 URL 相互独立，改为并行上传以缩短参考图生图的提交阶段。
    const uploaded = await Promise.all(images.map((item, index) => uploadLK888ReferenceImage(env, item, index)));
    uploadedReferences.push(...uploaded);
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
    assertLK888Accepted(submitData);
    const immediate = findImageValue(submitData);
    if (immediate) {
      await removeLK888ReferenceImages(env, uploadedReferences);
      return {
        imageBase64: await parseImageResultAsBase64(submitData)
      };
    }
    const taskId = getLK888TaskId(submitData);
    if (!taskId) {
      await removeLK888ReferenceImages(env, uploadedReferences);
      const shape = getLK888ResponseShape(submitData);
      throw new Error(`抹尘 AI 没有返回 task_id，无法查询生成结果${shape ? `（返回字段：${shape}）` : ''}。`);
    }
    return { taskId };
  } catch (error) {
    await removeLK888ReferenceImages(env, uploadedReferences);
    throw error;
  }
}

export async function tryLK888ImageTaskWithoutRef(env, prompt, ratio) {
  if (!hasLK888(env)) return null;
  try {
    const promptText = finalImagePrompt(prompt);
    const submitData = await postJson(`${getLK888BaseUrl(env)}/v1/media/generate`, {
      model: getLK888ImageModel(env),
      prompt: promptText,
      images: [],
      params: {
        prompt: promptText,
        images: [],
        size: getOpenAIImageSize(ratio)
      }
    }, {
      Authorization: `Bearer ${env.LK888_API_KEY}`
    });
    assertLK888Accepted(submitData);
    const immediate = findImageValue(submitData);
    if (immediate) return { imageBase64: await parseImageResultAsBase64(submitData) };
    const taskId = getLK888TaskId(submitData);
    if (taskId) return { taskId };
    return null;
  } catch (_error) {
    // media/generate 可能不支持无参考图，回退到同步生图即可。
    return null;
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

  const successStatuses = new Set(['success', 'succeeded', 'completed', 'complete', 'done', 'finished', '已完成', '完成', '成功']);
  const failedStatuses = new Set(['failed', 'fail', 'error', 'cancelled', 'canceled', '失败', '已失败']);
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

export async function checkLK888MediaTask(env, taskId) {
  if (!taskId) throw new Error('缺少抹尘 AI task_id。');
  const successStatuses = new Set(['success', 'succeeded', 'completed', 'complete', 'done', 'finished', '已完成', '完成', '成功']);
  const failedStatuses = new Set(['failed', 'fail', 'error', 'cancelled', 'canceled', '失败', '已失败']);
  const data = await fetchLK888TaskStatus(env, taskId);
  assertLK888Accepted(data);
  const status = getLK888TaskStatus(data);
  const message = getLK888Message(data);
  if (failedStatuses.has(status)) throw new Error(message || `抹尘 AI 生成失败：${status}`);
  if (successStatuses.has(status) || findImageValue(data)) {
    return {
      done: true,
      status,
      imageBase64: await parseImageResultAsBase64(data)
    };
  }
  return {
    done: false,
    status: status || 'processing',
    message
  };
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
    response_format: 'b64_json',
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
    response_format: 'b64_json',
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

/* ── 元素识别（智谱 GLM-4V-Flash，免费视觉通道）──
   用途：案例库上传时看懂封面，产出可直接当搜索词的「元素」建议。
   约束：只认画面里的实体（物体/食物/动物/角色/场景道具），不读图里的文字；
   词条 1-5 字、去重、最多 12 条，并尽量归一到现有元素词表，
   保证「汉堡/汉堡包」不会分裂成两个搜索词。写入由前端在用户点采纳后进行。 */
const GLM_VISION_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_TEXT_MODEL = 'glm-4-flash';
const QUERY_EXPANSION_MAX = 8;

// v829 搜索词扩展：把用户的搜索词翻译成站内标签 + 相关联想词（纯文本，不走识图通道）
// v856：从 AI 原始输出里同时解析 terms（中文联想词）与 terms_en（逐词对应的英文说法，可能缺省）
function parseQueryExpansionRaw(text) {
  const raw = String(text || '');
  let list = [];
  let listEn = [];
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed?.terms)) {
        list = parsed.terms;
        if (Array.isArray(parsed?.terms_en)) listEn = parsed.terms_en;
      } else if (Array.isArray(parsed)) list = parsed;
    } catch { /* 落到按行兜底 */ }
  }
  if (!list.length) {
    const bracket = raw.match(/\[[\s\S]*\]/);
    if (bracket) {
      try { const parsed = JSON.parse(bracket[0]); if (Array.isArray(parsed)) list = parsed; } catch { /* 继续 */ }
    }
  }
  if (!list.length) {
    list = raw.split(/[\n,，、;；\s]+/).map(line => line.replace(/^[\s\-*"“”[]+|[\s"“”[]+$/g, '')).filter(Boolean);
  }
  return { list: list, listEn: listEn };
}

export function parseQueryExpansion(text, vocabulary = [], query = '') {
  const list = parseQueryExpansionRaw(text).list;
  const queryKey = String(query || '').replace(/\s+/g, '').toLowerCase();
  const words = (Array.isArray(vocabulary) ? vocabulary : []).filter(Boolean);
  const seen = new Set();
  const out = [];
  const push = (value) => {
    const key = String(value).replace(/\s+/g, '').toLowerCase();
    if (!key || key === queryKey || seen.has(key)) return false;
    seen.add(key);
    out.push(value);
    return true;
  };
  // v831：复合词桥接词表。AI 常返回「汉堡店/汉堡王」这类复合词，而库里标签是「汉堡」；
  // 复合词包含词表短词时，把词表词也补进扩展集，保证能命中真实标签。
  const bridgeFromVocabulary = (word) => {
    const key = word.replace(/\s+/g, '').toLowerCase();
    for (const candidate of words) {
      if (out.length >= QUERY_EXPANSION_MAX) return;
      const candidateKey = candidate.replace(/\s+/g, '').toLowerCase();
      if (candidateKey.length < 2 || candidateKey === queryKey) continue;
      if (key.includes(candidateKey)) push(candidate);
    }
  };
  // v839：语素兜底桥接。AI 会返回「红包礼券/现金券」这种语义对但库里不存在的词，
  // 而库里真实标签是「优惠券」（同属“券”族）。当复合词没有包含任何词表词时，
  // 用尾部同字（券/票/卡这类真正成族的类别语素）在词表里找同族词兜底。
  // 不用任意单字：避免「世界杯」→「咖啡杯」这种并列事物噪音。
  const SUFFIX_BRIDGE_CHARS = ['券', '票', '卡'];
  const bridgeBySuffix = (word) => {
    const key = word.replace(/\s+/g, '').toLowerCase();
    const last = key.charAt(key.length - 1);
    if (!last || SUFFIX_BRIDGE_CHARS.indexOf(last) < 0) return;
    for (const candidate of words) {
      if (out.length >= QUERY_EXPANSION_MAX) return;
      const candidateKey = candidate.replace(/\s+/g, '').toLowerCase();
      if (candidateKey.length < 2 || candidateKey === queryKey) continue;
      if (candidateKey.charAt(candidateKey.length - 1) === last) push(candidate);
    }
  };
  // v845：中东业务同义桥。本站业务偏中东（沙特/阿联酋等海湾国家），牲畜词和伊斯兰节日
  // 是强关联（宰牲节献羊是核心意象）：搜「小羊/羊/羔羊」应能出宰牲节/开斋节物料。
  // 候选词只在词表里收（保证能命中真实标签），不引入词表外自由词；双向互补，
  // 搜节日也能补回牲畜词（如果词表里有的话）。对搜索词本身和 AI 返回的每个词都触发，
  // 就算 AI 返回空列表，搜索词也能走这条确定性兑底。
  const REGION_BRIDGE_RULES = [
    { trigger: /羊|羔|lamb|sheep/i, candidates: ['宰牲节', '开斋节'] },
    { trigger: /骆驼|camel/i, candidates: ['宰牲节'] },
    { trigger: /开斋|斋月|ramadan/i, candidates: ['宰牲节'] },
    { trigger: /宰牲|古尔邦|献祭|牺牲/i, candidates: ['开斋节'] },
  ];
  const bridgeRegion = (text) => {
    const probe = String(text || '');
    if (!probe) return;
    for (const rule of REGION_BRIDGE_RULES) {
      if (!rule.trigger.test(probe)) continue;
      for (const candidate of rule.candidates) {
        if (out.length >= QUERY_EXPANSION_MAX) return;
        const candidateKey = candidate.replace(/\s+/g, '').toLowerCase();
        if (candidateKey === queryKey || seen.has(candidateKey)) continue;
        const known = words.find(w => w.replace(/\s+/g, '').toLowerCase() === candidateKey);
        if (known) push(known);
      }
    }
  };
  for (const item of list) {
    let word = String(item == null ? '' : item).trim().replace(/[「」"'（）()]/g, '');
    if (!word || word.length > 8) continue;
    const key = word.replace(/\s+/g, '').toLowerCase();
    if (!key || key === queryKey) continue;       // 不回显搜索词本身
    if (seen.has(key)) continue;
    // 词表里的写法优先原样返回（保证能命中真实标签），自由词在后
    const known = words.find(w => w.replace(/\s+/g, '').toLowerCase() === key);
    const value = known || word;
    push(value);
    if (!known) {
      bridgeFromVocabulary(word);
      bridgeBySuffix(word);
    }
    bridgeRegion(word);
    if (out.length >= QUERY_EXPANSION_MAX) break;
  }
  bridgeRegion(query);
  return out.slice(0, QUERY_EXPANSION_MAX);
}

// v856 英文模式：联想词中文原词用于匹配库内标签（匹配链路不变），展示层需要英文说法。
// 把 AI 返回的 terms / terms_en 逐词配对成 中文词→英文 映射；配不上的词由前端词表兑底。
export function parseQueryExpansionI18n(text, vocabulary = [], query = '') {
  const raw = parseQueryExpansionRaw(text);
  const norm = (value) => String(value == null ? '' : value).trim().replace(/[「」"'（）()]/g, '').replace(/\s+/g, '').toLowerCase();
  const translations = {};
  for (let i = 0; i < raw.list.length; i++) {
    const zhKey = norm(raw.list[i]);
    const en = String(raw.listEn[i] == null ? '' : raw.listEn[i]).trim();
    if (zhKey && en && norm(en) !== zhKey) translations[zhKey] = en;
  }
  return { terms: parseQueryExpansion(text, vocabulary, query), translations: translations };
}

export async function expandQueryWithGlm(env, query, vocabulary = []) {
  const key = elementTagApiKey(env);
  if (!key) throw new Error('搜索扩展未配置：请在 Cloudflare Pages 项目里添加环境变量 GLM_API_KEY。');
  const q = String(query || '').trim().slice(0, 40);
  if (!q) return [];
  const words = (Array.isArray(vocabulary) ? vocabulary : []).filter(Boolean).slice(0, 120);
  const lines = [
    '你在帮一个设计素材库做搜索词扩展。用户输入了一个搜索词，库里的物料已经打好了受控标签。',
    words.length ? `本站的标签词表：${words.join('、')}。` : '',
    `用户搜索词：「${q}」。请返回和它语义相关的词，规则：`,
    '1. 联想词必须优先从词表里选：只要词表里有和搜索词语义相关的词，必须原样返回词表词（这些能直接命中物料）。例：词表里有「优惠券」「折扣」时，搜「红包」应优先返回「优惠券」「折扣」，而不是词表外的「红包礼券」；',
    '2. 词表确实没有相关词时再自由联想，只返回搜索词指代事物的同义说法、画面主体或必要组成部分（例：搜「骑手」→ 摩托、头盔；搜「世界杯」→ 足球、球场；搜「汉堡包」→ 汉堡）；',
    '3. 搜索词是英文、拼音或其他外语时，先返回它的中文说法（优先用词表里的词），再按中文含义联想（例：搜「coupon」→ 优惠券、折扣；搜「burger」→ 汉堡）；',
    '4. 本站是中东业务（沙特、阿联酋等海湾国家）的设计素材库：搜索词涉及牲畜时，除了相关说法外必须同时返回词表里的伊斯兰节日（例：搜「小羊」「羊」「羔羊」→ 羊肉串、烤羊肉这类相关词可以保留，但「宰牲节」「开斋节」也必须在结果里；搜「骆驼」→ 宰牲节；搜「斋月」→ 开斋节、宰牲节）；',
    '5. 不要返回同类并列的其他事物（例：搜「汉堡包」不要返回薯条、炸鸡、可乐，它们和汉堡是并列关系不是主体）；',
    '6. 每个词 ≤8 个字，中英文都可以，最多 8 个，不要解释，不要返回与搜索词相同或无关的词；',
    '7. 只输出 JSON，不要代码块：{"terms":["摩托","头盔","餐箱"],"terms_en":["Motorcycle","Helmet","Delivery box"]}，terms_en 和 terms 逐词一一对应（每个中文词的英文说法），数量、顺序完全一致；',
  ].filter(Boolean);
  const data = await postJson(GLM_VISION_URL, {
    model: GLM_TEXT_MODEL,
    temperature: 0.3,
    messages: [{ role: 'user', content: lines.join('\n') }]
  }, { Authorization: `Bearer ${key}` });
  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map(part => part?.text || '').join('') : '';
  const parsed = parseQueryExpansionI18n(text, words, q);
  return { terms: parsed.terms, translations: parsed.translations };
}
const GLM_VISION_MODEL = 'glm-4v-flash';
export const ELEMENT_TAG_MAX_CHARS = 5;
export const ELEMENT_TAG_MAX_COUNT = 12;
const KIKI_ELEMENT_ALIASES = new Set(['卡通老虎', '老虎吉祥物', '黄色老虎']);

export function elementTagApiKey(env) {
  return env.GLM_API_KEY || env.ZHIPU_API_KEY || '';
}

// 模型输出容忍度：可能有代码块、前后解释、数组而不是对象、甚至纯文本列表
export function parseElementSuggestions(text, vocabulary = []) {
  const raw = String(text || '');
  let list = [];
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed?.elements)) list = parsed.elements;
    } catch { /* 落到按行兜底 */ }
  }
  if (!list.length) {
    const bracket = raw.match(/\[[\s\S]*\]/);
    if (bracket) {
      try {
        const parsed = JSON.parse(bracket[0]);
        if (Array.isArray(parsed)) list = parsed;
      } catch { /* 继续兜底 */ }
    }
  }
  if (!list.length) {
    list = raw
      .split(/[\n,，、;；]+/)
      .map(line => line.replace(/^[\s\-*"“”[\]]+|[\s"“”[\]]+$/g, ''))
      .filter(Boolean);
  }
  const words = (Array.isArray(vocabulary) ? vocabulary : []).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const item of list) {
    let word = String(item == null ? '' : item).trim();
    if (!word || word === 'elements') continue;
    word = word.replace(/[（(].*?[)）]/g, '').trim();          // 「汉堡（食物）」→「汉堡」
    // Keeta 案例库里的品牌老虎统一为现有标准词 kiki，避免搜索被「卡通老虎」分裂。
    if (words.includes('kiki') && KIKI_ELEMENT_ALIASES.has(word)) word = 'kiki';
    if (!word || word.length > ELEMENT_TAG_MAX_CHARS) continue; // 词条上限 5 字
    const exact = words.find(w => w === word);
    const contained = exact || words.find(w => w.length > 1 && word.includes(w));
    const finalWord = contained || word;
    if (seen.has(finalWord)) continue;
    seen.add(finalWord);
    out.push(finalWord);
    if (out.length >= ELEMENT_TAG_MAX_COUNT) break;
  }
  return out;
}

export function parseCaseTagSuggestions(text, elementVocabulary = [], activityVocabulary = []) {
  const elements = parseElementSuggestions(text, elementVocabulary);
  // v828 主题不限词表：AI 自由识别一个短主题词，前端作为建议 chip 展示（点采纳才写入）
  let activity = '';
  const objectMatch = String(text || '').match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      activity = String(parsed?.activity || '').replace(/[「」"'。\s]/g, '').slice(0, 8);
    } catch { /* 活动无效就保持未选择 */ }
  }
  return { elements: activity ? elements.filter(word => word !== activity) : elements, activity };
}

export async function analyzeCaseTagsWithGlm(env, imageBase64, vocabulary, activityVocabulary = []) {
  const key = elementTagApiKey(env);
  if (!key) throw new Error('元素识别未配置：请在 Cloudflare Pages 项目里添加环境变量 GLM_API_KEY（智谱开放平台）。');
  const base64 = String(imageBase64 || '').replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (!base64) throw new Error('缺少待识别的图片。');
  if (base64.length > 6 * 1024 * 1024) throw new Error('图片过大，请改用缩略图识别。');
  const words = (Array.isArray(vocabulary) ? vocabulary : []).filter(Boolean).slice(0, 100);
  const activities = (Array.isArray(activityVocabulary) ? activityVocabulary : []).filter(Boolean).slice(0, 30);
  const lines = [
    '你在帮案例库物料打搜索标签。看图，只描述画面里看得见的实体：食物、饮品、动物、人物、角色或吉祥物、餐具与道具、餐桌桌面、背景场景与节日布置（挂旗、气球、桌布等）。',
    '不要把图片里的文字当成元素输出，但判断活动主题时可以用上文字信息（节日祝福语、活动名、问候语等）。标语、价格、水印、LOGO 仍然忽略。',
    words.includes('kiki') ? '如果画面中的老虎角色是 Keeta 的黄色品牌吉祥物，必须标为 kiki，不要写卡通老虎、老虎吉祥物或黄色老虎；普通真实老虎仍标为老虎。' : '',
    words.length ? `优先使用这份现有词表的写法（命中就必须原样使用）：${words.join('、')}。` : '',
    activities.length ? `同时推断这张物料的核心活动主题：从画面内容和文字信息（节日祝福语、活动名等）自由归纳一个词，2-8 个字，例如：开学、世界杯、夏日、开斋节、宰牲节、聚餐、新年、国庆节、游戏、生日、万圣节、圣诞、情人节等，不限于以上例子；主题词要简短通用。画面和文字都推不出主题时才返回空字符串。` : '',
    `每条 1-${ELEMENT_TAG_MAX_CHARS} 个汉字，按「主体优先、再补场景与次要物体」尽量列满，最多 ${ELEMENT_TAG_MAX_COUNT} 条；不要颜色、风格、形容词，不要解释、不要重复。`,
    '只输出 JSON，不要代码块：{"elements":["汉堡","餐桌"],"activity":"聚餐"}'
  ].filter(Boolean);
  const data = await postJson(GLM_VISION_URL, {
    model: GLM_VISION_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64 } },
          { type: 'text', text: lines.join('\n') }
        ]
      }
    ]
  }, { Authorization: `Bearer ${key}` });
  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content) ? content.map(part => part?.text || '').join('') : '';
  return parseCaseTagSuggestions(text, words, activities);
}

export async function analyzeElementsWithGlm(env, imageBase64, vocabulary) {
  return (await analyzeCaseTagsWithGlm(env, imageBase64, vocabulary, [])).elements;
}
// 图库入库：看图从品类词表里选一个最匹配的（食物品类或 logo 类）
export const GALLERY_TAG_MAX_CHARS = 12;

export function parseGalleryTagSuggestion(text, vocabulary = []) {
  const allowed = (Array.isArray(vocabulary) ? vocabulary : []).filter(Boolean);
  const raw = String(text || '').trim();
  if (!raw || !allowed.length) return '';
  const compact = function(value) { return String(value || '').replace(/\s+/g, '').toLowerCase(); };
  const allowedCompact = allowed.map(function(word) { return { word: word, compact: compact(word) }; });
  const pick = function(candidate) {
    const key = compact(candidate);
    if (!key) return '';
    const hit = allowedCompact.find(function(entry) { return entry.compact === key; });
    return hit ? hit.word : '';
  };
  // 1) 优先认 JSON 里的 tag/category/label
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const value = String((parsed && (parsed.tag || parsed.category || parsed.label)) || '').trim();
      const hit = pick(value);
      if (hit) return hit;
      if (value && /^(未分类|无法判断|判断不出|不确定|none|unknown)$/i.test(value)) return '';
      if (value) return '';   // 明确给了值但不在词表 → 不猜
    } catch (_error) {}
  }
  // 2) 容忍模型直接吐词（含「商家 logo」这种带空格的写法），或一句话里带出词表词
  const cleaned = raw.replace(/[{}\[\]"'`]/g, ' ').replace(/[，,。.;；:：!！?？]/g, ' ');
  const flat = compact(cleaned);
  const embedded = allowedCompact
    .filter(function(entry) { return flat.includes(entry.compact); })
    .sort(function(a, b) { return b.compact.length - a.compact.length; })[0];
  return embedded ? embedded.word : '';
}

export async function analyzeGalleryTagWithGlm(env, imageBase64, vocabulary) {
  const key = elementTagApiKey(env);
  if (!key) throw new Error('图片识别未配置：请在 Cloudflare Pages 项目里添加环境变量 GLM_API_KEY（智谱开放平台）。');
  const base64 = String(imageBase64 || '').replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (!base64) throw new Error('缺少待识别的图片。');
  if (base64.length > 6 * 1024 * 1024) throw new Error('图片过大，请改用缩略图识别。');
  const words = (Array.isArray(vocabulary) ? vocabulary : []).filter(Boolean).slice(0, 60);
  if (!words.length) throw new Error('缺少品类词表。');
  const lines = [
    '你在帮图库素材选一个「品类」标签。看图判断画面主体属于下列哪一个品类。',
    `只能在以下词表里选一个，原样输出：${words.join('、')}。`,
    '如果画面主体是品牌标志/字标/图形标识，选 logo 类词条；如果是食物或饮品，选最接近的那一个品类。',
    '判断不出、看不清、或都不匹配时返回空字符串——不要猜、不要创造新词、不要解释。',
    '只输出 JSON，不要代码块：{"tag":"汉堡"}'
  ];
  const data = await postJson(GLM_VISION_URL, {
    model: GLM_VISION_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64 } },
          { type: 'text', text: lines.join('\n') }
        ]
      }
    ]
  }, { Authorization: `Bearer ${key}` });
  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content) ? content.map(part => part?.text || '').join('') : '';
  return parseGalleryTagSuggestion(text, words);
}


// ===== 物料语言（英语 / 阿拉伯语）：文件名里没有 en/ar 线索时，看图里的文字书写系统判断 =====
// 只认 en / ar 两个值；判断不出返回空字符串（前端记「无」，EN/AR 筛选里照旧显示，不藏图）。
export function normalizeLanguageValue(value) {
  const v = String(value == null ? '' : value).trim().toLowerCase();
  if (['en', 'eng', 'english', '英语', '英文'].indexOf(v) >= 0) return 'en';
  if (['ar', 'ara', 'arabic', '阿拉伯语', '阿语', '阿拉伯'].indexOf(v) >= 0) return 'ar';
  return '';
}

export function parseLanguageDetection(text) {
  const raw = String(text || '');
  if (!raw.trim()) return '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const direct = normalizeLanguageValue(parsed.lang || parsed.language || parsed.value);
      if (direct) return direct;
      if (Object.prototype.hasOwnProperty.call(parsed, 'lang') || Object.prototype.hasOwnProperty.call(parsed, 'language')) return '';
    } catch (_e) { /* 不是 JSON：按关键词兜底 */ }
  }
  const lower = raw.toLowerCase();
  const saysEnglish = /english|拉丁|\blatin\b|英语|英文/.test(lower);
  const saysArabic = /arabic|عربي|阿拉伯|阿语/.test(lower);
  if (saysEnglish && !saysArabic) return 'en';
  if (saysArabic && !saysEnglish) return 'ar';
  return '';
}

export async function analyzeLanguageWithGlm(env, imageBase64) {
  const key = elementTagApiKey(env);
  if (!key) throw new Error('图片识别未配置：请在 Cloudflare Pages 项目里添加环境变量 GLM_API_KEY（智谱开放平台）。');
  const base64 = String(imageBase64 || '').replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (!base64) throw new Error('缺少待识别的图片。');
  if (base64.length > 6 * 1024 * 1024) throw new Error('图片过大，请改用缩略图识别。');
  // 真实素材里「英语+阿语同一张」很常见（双语 banner）：这种一律返回空，
  // 前端记「无」，在英语、阿语两个筛选下都会显示 —— 比强行猜一个更符合实际。
  const lines = [
    '你在帮设计素材判断画面文案是英语还是阿拉伯语。只看文字的书写系统：',
    '拉丁字母（A-Z）＝英语；阿拉伯字母（ا ب ت…）＝阿拉伯语。',
    '只有一种文字、且它是画面文案的主体时，才给出 en 或 ar。',
    '画面里两种文字都有（双语 banner）、只有零星装饰/水印文字、文字太小看不清、没有文字时，返回空字符串——不要猜、不要挑一个。',
    '只输出 JSON，不要代码块：{"lang":"en"} 或 {"lang":"ar"} 或 {"lang":""}'
  ];
  const data = await postJson(GLM_VISION_URL, {
    model: GLM_VISION_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64 } },
          { type: 'text', text: lines.join('\n') }
        ]
      }
    ]
  }, { Authorization: `Bearer ${key}` });
  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content) ? content.map(part => part?.text || '').join('') : '';
  return parseLanguageDetection(text);
}
