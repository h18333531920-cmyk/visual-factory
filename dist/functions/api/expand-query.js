// 搜索词扩展：把用户搜索词翻译成站内标签词 + 相关联想词（骑手 → 摩托/头盔/餐箱…）。
// 纯文本任务，走智谱 glm-4-flash 免费文本通道（与识图同一把 GLM_API_KEY，不传图片）。
// 扩展结果前端永久缓存：同一个词只问一次 AI，之后都走本地缓存。
//
// v895：喂给模型的词表不再只用前端带上来的那一份（前端有 120 上限，库一大就把真实标签裁掉了），
// 而是和库内全量标签表 vf_tag_vocabulary 合并 —— 模型能"从现有标签里挑"的前提是它真的看得到这些标签。
import { getBearerToken, getUserFromToken, json, requireCloudflareEnv, supabaseFetch } from '../_shared.js';
import { expandQueryWithGlm } from '../_ai.js';

const VOCABULARY_TABLE = 'vf_tag_vocabulary';
const DB_VOCABULARY_MAX = 300;

// 读库内全量标签名（只读；失败就当没有，不影响搜索扩展本身）
async function readVocabularyFromDb(env) {
  try {
    const rows = await supabaseFetch(env, `/rest/v1/${VOCABULARY_TABLE}?select=name_zh&limit=1000`, { method: 'GET' }, true);
    return (Array.isArray(rows) ? rows : [])
      .map(row => String(row && row.name_zh || '').trim())
      .filter(Boolean)
      .slice(0, DB_VOCABULARY_MAX);
  } catch (_error) {
    return [];
  }
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }
  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    const body = await request.json().catch(() => ({}));
    const clientVocabulary = (Array.isArray(body.vocabulary) ? body.vocabulary : []).filter(Boolean);
    const merged = [];
    clientVocabulary.concat(await readVocabularyFromDb(env)).forEach(function(word) {
      const value = String(word == null ? '' : word).trim();
      if (!value || merged.indexOf(value) >= 0) return;
      merged.push(value);
    });
    const result = await expandQueryWithGlm(env, body.query, merged);
    const terms = Array.isArray(result) ? result : (result && Array.isArray(result.terms) ? result.terms : []);
    // terms = 词表里已有的（能直接命中）；fresh = 词表里没有的兜底桶（v894 起前端不消费这一层）
    const fresh = result && !Array.isArray(result) && Array.isArray(result.fresh) ? result.fresh : [];
    // v856 英文模式：把 AI 逐词翻译的 中文→英文 映射一并返回（配不上的词由前端词表兜底）
    const termsEn = result && !Array.isArray(result) && result.translations && typeof result.translations === 'object' ? result.translations : {};
    return json({ success: true, provider: 'glm-4-flash', terms: terms, fresh: fresh, termsEn: termsEn });
  } catch (error) {
    const message = error.message || '搜索扩展失败。';
    const status = /未配置/.test(message)
      ? 503
      : /Unauthorized|Invalid session|Missing bearer|token/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
