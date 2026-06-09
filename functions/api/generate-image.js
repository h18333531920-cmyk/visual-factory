import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { generateWithOpenAI, generateWithVolc, hasOpenAI, requireAI } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    requireAI(env, 'image generation');

    const body = await request.json().catch(() => ({}));
    const provider = hasOpenAI(env) ? 'openai' : 'volc';
    const imageBase64 = hasOpenAI(env)
      ? await generateWithOpenAI(env, body.prompt, body.ratio)
      : await generateWithVolc(env, body.prompt, body.ratio);

    return json({ success: true, provider, imageBase64 });
  } catch (error) {
    const message = error.message || 'AI 生图失败。';
    const status = /未配置/i.test(message) ? 503 : /Unauthorized|Invalid session/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
