import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { enhancePromptWithOpenAI } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));

    const body = await request.json().catch(() => ({}));
    const enhancedPrompt = await enhancePromptWithOpenAI(env, body.prompt, body.ratio);

    return json({ success: true, provider: 'openai', enhancedPrompt });
  } catch (error) {
    const message = error.message || '提示词优化失败。';
    const status = /未配置/i.test(message) ? 503 : /Unauthorized|Invalid session|Missing bearer/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
