// 图库入库：识别画面主体属于哪个「品类」（标签二），前端只在用户没手选时自动填上。
// 走智谱 GLM-4V-Flash（免费视觉通道），密钥只放服务端：Cloudflare Pages 环境变量 GLM_API_KEY。
// 识别不出、或不在词表里 → 返回空字符串（前端保持「未分类」，不猜）。
import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { analyzeGalleryTagWithGlm } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }
  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    const body = await request.json().catch(() => ({}));
    const tag = await analyzeGalleryTagWithGlm(env, body.image, body.vocabulary);
    return json({ success: true, provider: 'glm-4v-flash', tag: tag });
  } catch (error) {
    const message = error.message || '品类识别失败。';
    const status = /未配置/.test(message)
      ? 503
      : /Unauthorized|Invalid session|Missing bearer|token/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
