const OPENAI_IMAGE_MODEL = 'gpt-image-1';
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

export function hasOpenAI(env) {
  return !!env?.OPENAI_API_KEY;
}

export function hasVolcImage(env) {
  return !!env?.VOLC_API_KEY && !!env?.ENDPOINT_ID;
}

export function aiReady(env) {
  return hasOpenAI(env) || hasVolcImage(env);
}

export function requireAI(env, capability = 'image generation') {
  if (capability === 'outpaint') {
    if (!hasOpenAI(env)) {
      throw new Error('AI 扩图未配置：请在 Cloudflare Pages 环境变量中设置 OPENAI_API_KEY。');
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

export function parseImageBase64(data) {
  const item = data?.data?.[0] || data?.output?.[0] || data;
  const base64 = item?.b64_json || item?.image_base64 || item?.base64 || item?.data;
  if (!base64) throw new Error('AI 接口没有返回图片数据。');
  return String(base64).replace(/^data:[^;]+;base64,/, '');
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

export async function generateWithOpenAI(env, prompt, ratio) {
  requireAI(env, 'image generation');
  const data = await postJson('https://api.openai.com/v1/images/generations', {
    model: OPENAI_IMAGE_MODEL,
    prompt: finalImagePrompt(prompt),
    size: getOpenAIImageSize(ratio),
    quality: 'medium',
    n: 1
  }, {
    Authorization: `Bearer ${env.OPENAI_API_KEY}`
  });
  return parseImageBase64(data);
}

export async function generateWithVolc(env, prompt, ratio) {
  requireAI(env, 'image generation');
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

export async function outpaintWithOpenAI(env, prompt, baseImage, ratio) {
  requireAI(env, 'outpaint');
  const form = new FormData();
  form.append('model', OPENAI_IMAGE_MODEL);
  form.append('prompt', [
    normalizePrompt(prompt) || 'extend the background naturally',
    'extend the existing image naturally, preserve the main subject, commercial poster background, no watermark'
  ].join(', '));
  form.append('size', getOpenAIImageSize(ratio));
  form.append('quality', 'medium');
  form.append('image', base64ToBlob(baseImage, 'image/png'), 'source.png');

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
