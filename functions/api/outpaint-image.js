import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    return json({
      success: false,
      message: 'AI outpainting is authenticated but not configured in V1. Set VOLC_API_KEY or OPENAI_API_KEY when ready.'
    }, 501);
  } catch (error) {
    return json({ success: false, message: error.message || 'Unauthorized' }, 401);
  }
}
