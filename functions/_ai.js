const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-2';
const DEFAULT_OPENAI_TEXT_MODEL = 'gpt-5.1-mini';
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

export function hasVolcImage(env) {
  return !!env?.VOLC_API_KEY && !!env?.ENDPOINT_ID;
}

export function hasVolcOutpaint(env) {
  return !!env?.VOLC_ACCESS_KEY_ID && !!env?.VOLC_SECRET_ACCESS_KEY;
}

export function aiReady(env) {
  return hasOpenAI(env) || hasVolcImage(env) || hasVolcOutpaint(env);
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
  requireAI(env, 'image generation');
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

export async function enhancePromptWithOpenAI(env, prompt, ratio) {
  if (!hasOpenAI(env)) {
    throw new Error('提示词增强未配置：请在 Cloudflare Pages 环境变量中设置 OPENAI_API_KEY。');
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
    expand
  } = options;
  requireAI(env, 'outpaint');
  if (hasOpenAI(env)) {
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
