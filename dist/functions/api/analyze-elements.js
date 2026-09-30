// 元素识别：上传案例库物料时看懂封面，产出「元素」标签建议（用户在前端点采纳才算数）。
// 走智谱 GLM-4V-Flash（免费视觉通道），密钥只放服务端：Cloudflare Pages 环境变量 GLM_API_KEY。
import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { analyzeCaseTagsWithGlm } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));

    const body = await request.json().catch(() => ({}));
    const result = await analyzeCaseTagsWithGlm(env, body.image, body.vocabulary, body.activities);

    return json({ success: true, provider: 'glm-4v-flash', elements: result.elements, activity: result.activity });
  } catch (error) {
    const message = error.message || '元素识别失败。';
    const status = /未配置/.test(message)
      ? 503
      : /Unauthorized|Invalid session|Missing bearer|token/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
