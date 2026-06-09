import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { outpaintWithOpenAI, requireAI } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    requireAI(env, 'outpaint');

    const body = await request.json().catch(() => ({}));
    const imageBase64 = await outpaintWithOpenAI(env, body.prompt, body.baseImage, body.ratio);

    return json({ success: true, provider: 'openai', imageBase64 });
  } catch (error) {
    const message = error.message || 'AI 扩图失败。';
    const status = /未配置/i.test(message) ? 503 : /Unauthorized|Invalid session/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
