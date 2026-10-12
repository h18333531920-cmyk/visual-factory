// 词表自动归类：读整张词表 → 让 AI 给「合并别名 / 上位词」建议 → 直接应用（不做逐条确认）。
// 说明：会改动词表数据（合并会删掉被合并的行、上位词会写 parent_id），所以只允许管理员触发。
import { getBearerToken, json, requireAdmin, requireCloudflareEnv, supabaseFetch } from '../_shared.js';
import { suggestVocabularyGroupsWithGlm } from '../_ai.js';

const TABLE = 'vf_tag_vocabulary';

function encodeList(values) {
  return (Array.isArray(values) ? values : []).map(v => encodeURIComponent(v)).join(',');
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  try {
    requireCloudflareEnv(env);
    await requireAdmin(request, env);

    const rows = await supabaseFetch(env, `/rest/v1/${TABLE}?select=id,name_zh,aliases&limit=1000`, { method: 'GET' }, true);
    const list = Array.isArray(rows) ? rows : [];
    const byName = new Map();
    list.forEach(function(row) {
      const name = String(row && row.name_zh || '').trim();
      if (name) byName.set(name, row);
    });
    const terms = Array.from(byName.keys());
    if (terms.length < 2) return json({ success: true, parentsApplied: 0, mergesApplied: 0 });

    let suggestions;
    try {
      suggestions = await suggestVocabularyGroupsWithGlm(env, terms);
    } catch (error) {
      const message = String(error && error.message || '归类建议失败');
      return json({ success: false, reason: 'ai-failed', message }, /未配置/.test(message) ? 503 : 502);
    }

    let parentsApplied = 0;
    let mergesApplied = 0;
    const skipped = [];

    // 1) 上位词：按父级分组，一个父级只发一次 PATCH
    for (const group of suggestions.parents || []) {
      const parentRow = byName.get(group.parent);
      if (!parentRow || !parentRow.id) continue;
      const children = (group.children || []).filter(function(name) {
        const childRow = byName.get(name);
        return childRow && childRow.id && String(childRow.id) !== String(parentRow.id);
      });
      if (!children.length) continue;
      try {
        await supabaseFetch(env, `/rest/v1/${TABLE}?name_zh=in.(${encodeList(children)})`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ parent_id: parentRow.id })
        }, true);
        parentsApplied += children.length;
      } catch (_error) {
        skipped.push(group.parent);
      }
    }

    // 2) 合并：先把叫法写进 keep 行的别名，再删掉被合并的行（keep 保留更通用的名字）
    for (const item of suggestions.merges || []) {
      const keepRow = byName.get(item.keep);
      if (!keepRow || !keepRow.id) continue;
      const aliases = (item.aliases || []).filter(function(name) { return byName.has(name); });
      if (!aliases.length) continue;
      const merged = new Set(Array.isArray(keepRow.aliases) ? keepRow.aliases : []);
      aliases.forEach(function(name) { merged.add(name); });
      try {
        await supabaseFetch(env, `/rest/v1/${TABLE}?id=eq.${encodeURIComponent(keepRow.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ aliases: Array.from(merged).slice(0, 40), source: 'manual' })
        }, true);
        await supabaseFetch(env, `/rest/v1/${TABLE}?name_zh=in.(${encodeList(aliases)})`, {
          method: 'DELETE',
          headers: { Prefer: 'return=minimal' }
        }, true);
        mergesApplied += aliases.length;
      } catch (_error) {
        skipped.push(item.keep);
      }
    }

    return json({
      success: true,
      parentsApplied: parentsApplied,
      mergesApplied: mergesApplied,
      parentGroups: (suggestions.parents || []).length,
      mergeGroups: (suggestions.merges || []).length,
      skipped: skipped.slice(0, 5)
    });
  } catch (error) {
    const message = error.message || '自动归类失败。';
    const status = /未配置/.test(message) ? 503
      : /Unauthorized|Invalid session|Missing bearer|token/i.test(message) ? 401
        : /admin|权限|Forbidden/i.test(message) ? 403 : 500;
    return json({ success: false, message }, status);
  }
}
