// 词表「相关词」建议：给一个词，让 AI 从词表里挑出「搜这个词时用户其实想找的词」（下位词/同类）。
// 只读不写：建议原样回前端，由人工删改后再由前端落库（所以这里不碰数据库）。
// 会跑模型（要花钱），所以限管理员。
import { json, requireAdmin, requireCloudflareEnv, supabaseFetch } from '../_shared.js';
import { suggestRelatedTagsWithGlm } from '../_ai.js';

const TABLE = 'vf_tag_vocabulary';
const MAX_VOCABULARY = 240;
const MAX_TERM_CHARS = 20;

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  try {
    requireCloudflareEnv(env);
    await requireAdmin(request, env);

    const body = await request.json().catch(() => ({}));
    const term = String(body.term || '').trim().slice(0, MAX_TERM_CHARS);
    if (!term) return json({ success: false, message: '缺少词。' }, 400);

    const rows = await supabaseFetch(env, `/rest/v1/${TABLE}?select=name_zh&limit=1000`, { method: 'GET' }, true);
    const vocabulary = (Array.isArray(rows) ? rows : [])
      .map(row => String(row && row.name_zh || '').trim())
      .filter(Boolean)
      .slice(0, MAX_VOCABULARY);

    let suggestion = { related: [], relatedNew: [] };
    try {
      suggestion = await suggestRelatedTagsWithGlm(env, term, vocabulary);
    } catch (error) {
      const message = String(error && error.message || '相关词建议失败');
      return json({ success: false, reason: 'ai-failed', message, related: [], relatedNew: [] }, /未配置/.test(message) ? 503 : 502);
    }
    // related = 词表里已有的；relatedNew = 词表里没有符合的时 AI 新造的（前端会标「新」）
    return json({ success: true, term, related: suggestion.related, relatedNew: suggestion.relatedNew });
  } catch (error) {
    const message = error.message || '相关词建议失败。';
    const explicit = Number(error && error.status);
    const status = /未配置/.test(message) ? 503
      : (explicit >= 400 && explicit < 600) ? explicit
        : /Unauthorized|Invalid session|Missing bearer|token|未登录|登录|admin|管理员|权限|Forbidden|permission/i.test(message) ? 403 : 500;
    return json({ success: false, message }, status);
  }
}
