import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { generateWithOpenAI, generateWithOpenAIReference, generateWithVolc, generateWithVolcReference, hasLK888, hasOpenAI, hasVolcImage, requireAI, submitLK888ImageReferenceTask, tryLK888ImageTaskWithoutRef } from '../_ai.js';

function isRegionUnsupportedError(error) {
  return /country,?\s*region,?\s*or\s*territory\s*not\s*supported|country.*region.*territory.*not\s*supported/i.test(String(error?.message || error));
}

async function generateWithProvider(env, provider, prompt, ratio, referenceImages) {
  if (provider === 'openai') {
    if (hasLK888(env) && referenceImages.length) {
      const task = await submitLK888ImageReferenceTask(env, prompt, ratio, referenceImages);
      if (task.imageBase64) return { imageBase64: task.imageBase64 };
      return { pending: true, taskId: task.taskId };
    }
    if (hasLK888(env)) {
      // 无参考图时也优先走 LK888 异步任务，避免同步生图撞上 Cloudflare 执行时长上限。
      // media/generate 若不支持无图会返回 null，再回退到同步 images/generations。
      const task = await tryLK888ImageTaskWithoutRef(env, prompt, ratio);
      if (task && task.imageBase64) return { imageBase64: task.imageBase64 };
      if (task && task.taskId) return { pending: true, taskId: task.taskId };
    }
    const imageBase64 = referenceImages.length
      ? await generateWithOpenAIReference(env, prompt, ratio, referenceImages)
      : await generateWithOpenAI(env, prompt, ratio);
    return { imageBase64 };
  }

  const imageBase64 = referenceImages.length
    ? await generateWithVolcReference(env, prompt, ratio, referenceImages)
    : await generateWithVolc(env, prompt, ratio);
  return { imageBase64 };
}

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
    const hasGPTImage = hasLK888(env) || hasOpenAI(env);
    const provider = requestedProvider || (hasGPTImage ? 'openai' : 'volc');
    // 前端已压缩参考图；后端保持八张上限，支持多主体/多角度的创作，
    // 同时避免绕过页面直接提交无限数量的大图。
    const referenceImages = Array.isArray(body.referenceImages)
      ? body.referenceImages.slice(0, 8).filter(item => item?.image)
      : body.referenceImage
        ? [{ image: body.referenceImage, mimeType: body.referenceMimeType }]
        : [];
    if (provider === 'openai' && !hasGPTImage) {
      throw new Error('GPT 生图未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY 或 OPENAI_API_KEY。');
    }
    if (provider === 'volc' && !hasVolcImage(env)) {
      throw new Error('火山生图未配置：请设置 VOLC_API_KEY + ENDPOINT_ID。');
    }

    try {
      const result = await generateWithProvider(env, provider, body.prompt, body.ratio, referenceImages);
      if (result.pending) return json({ success: true, provider, pending: true, taskId: result.taskId });
      return json({ success: true, provider, imageBase64: result.imageBase64 });
    } catch (error) {
      // A direct OpenAI image request can be unavailable in some regions. Keep the
      // public endpoint stable and use the already-configured Volc image provider.
      if (provider === 'openai' && hasVolcImage(env) && isRegionUnsupportedError(error)) {
        const result = await generateWithProvider(env, 'volc', body.prompt, body.ratio, referenceImages);
        if (result.pending) return json({
          success: true,
          provider: 'volc',
          requestedProvider: 'openai',
          pending: true,
          taskId: result.taskId,
          warning: 'GPT 图片服务暂不支持当前地区，已切换到火山大模型。'
        });
        return json({
          success: true,
          provider: 'volc',
          requestedProvider: 'openai',
          imageBase64: result.imageBase64,
          warning: 'GPT 图片服务暂不支持当前地区，已切换到火山大模型。'
        });
      }
      throw error;
    }
  } catch (error) {
    const message = error.message || 'AI 生图失败。';
    const status = /未配置/i.test(message) ? 503 : /Unauthorized|Invalid session/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
