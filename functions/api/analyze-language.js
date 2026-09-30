// 物料语言识别（英语 / 阿拉伯语）：文件名里没有 en/ar 线索时，看图判断文案语言。
// 走智谱 GLM-4V-Flash（免费视觉通道），密钥只放服务端：Cloudflare Pages 环境变量 GLM_API_KEY。
// 只返回 en / ar / 空；判断不出返回空（前端记「无」，EN/AR 筛选里照旧显示，不藏图）。
import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { analyzeLanguageWithGlm } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }
  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    const body = await request.json().catch(() => ({}));
    const lang = await analyzeLanguageWithGlm(env, body.image);
    return json({ success: true, provider: 'glm-4v-flash', lang: lang });
  } catch (error) {
    const message = error.message || '语言识别失败。';
    const status = /未配置/.test(message)
      ? 503
      : /Unauthorized|Invalid session|Missing bearer|token/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
