import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { generateWithOpenAI, generateWithOpenAIReference, generateWithVolc, hasOpenAI, hasVolcImage, requireAI } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    requireAI(env, 'image generation');

    const body = await request.json().catch(() => ({}));
    const requestedProvider = body.provider === 'volc' ? 'volc' : body.provider === 'openai' ? 'openai' : '';
    const provider = requestedProvider || (hasOpenAI(env) ? 'openai' : 'volc');
    const referenceImages = Array.isArray(body.referenceImages)
      ? body.referenceImages.slice(0, 8).filter(item => item?.image)
      : body.referenceImage
        ? [{ image: body.referenceImage, mimeType: body.referenceMimeType }]
        : [];
    if (referenceImages.length && provider !== 'openai') {
      throw new Error('火山大模型暂不支持参考图生图，请切换到 GPT 大模型。');
    }
    if (provider === 'openai' && !hasOpenAI(env)) {
      throw new Error('GPT 生图未配置：请在 Cloudflare Pages 环境变量中设置 OPENAI_API_KEY。');
    }
    if (provider === 'volc' && !hasVolcImage(env)) {
      throw new Error('火山生图未配置：请设置 VOLC_API_KEY + ENDPOINT_ID。');
    }

    const imageBase64 = provider === 'openai'
      ? referenceImages.length
        ? await generateWithOpenAIReference(env, body.prompt, body.ratio, referenceImages)
        : await generateWithOpenAI(env, body.prompt, body.ratio)
      : await generateWithVolc(env, body.prompt, body.ratio);

    return json({ success: true, provider, imageBase64 });
  } catch (error) {
    const message = error.message || 'AI 生图失败。';
    const status = /未配置/i.test(message) ? 503 : /Unauthorized|Invalid session/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
