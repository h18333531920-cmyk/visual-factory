import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { outpaintWithBestProvider, requireAI } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    requireAI(env, 'outpaint');

    const body = await request.json().catch(() => ({}));
    const result = await outpaintWithBestProvider(env, {
      prompt: body.prompt,
      ratio: body.ratio,
      baseImage: body.baseImage,
      volcBaseImage: body.volcBaseImage,
      maskBase64: body.maskBase64,
      mimeType: body.mimeType,
      expand: body.expand
    });

    return json({ success: true, provider: result.provider, imageBase64: result.imageBase64 });
  } catch (error) {
    const message = error.message || 'AI 扩图失败。';
    const status = /未配置/i.test(message) ? 503 : /Unauthorized|Invalid session/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
