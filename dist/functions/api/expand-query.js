// 搜索词扩展：把用户搜索词翻译成站内标签词 + 相关联想词（骑手 → 摩托/头盔/餐箱…）。
// 纯文本任务，走智谱 glm-4-flash 免费文本通道（与识图同一把 GLM_API_KEY，不传图片）。
// 扩展结果前端永久缓存：同一个词只问一次 AI，之后都走本地缓存。
import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { expandQueryWithGlm } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }
  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    const body = await request.json().catch(() => ({}));
    const result = await expandQueryWithGlm(env, body.query, body.vocabulary);
    const terms = Array.isArray(result) ? result : (result && Array.isArray(result.terms) ? result.terms : []);
    // v856 英文模式：把 AI 逐词翻译的 中文→英文 映射一并返回（配不上的词由前端词表兜底）
    const termsEn = result && !Array.isArray(result) && result.translations && typeof result.translations === 'object' ? result.translations : {};
    return json({ success: true, provider: 'glm-4-flash', terms: terms, termsEn: termsEn });
  } catch (error) {
    const message = error.message || '搜索扩展失败。';
    const status = /未配置/.test(message)
      ? 503
      : /Unauthorized|Invalid session|Missing bearer|token/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
