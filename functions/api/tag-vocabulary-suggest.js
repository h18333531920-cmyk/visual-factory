// 词表自动归类：分批读词表 → 让 AI 给「合并别名 / 上位词」建议 → 直接应用（不做逐条确认）。
// 分批是为了避免一次喂 150+ 个词时 AI 超时/输出被截断（前端按 nextOffset 循环调用，能显示进度）。
// 说明：会改动词表数据（可能新建上位词、合并会删掉被合并的行），所以只允许管理员触发。
import { getBearerToken, json, requireAdmin, requireCloudflareEnv, supabaseFetch } from '../_shared.js';
import { suggestVocabularyGroupsWithGlm } from '../_ai.js';

const TABLE = 'vf_tag_vocabulary';
const DEFAULT_BATCH = 60;
const MAX_BATCH = 80;

function encodeList(values) {
  return (Array.isArray(values) ? values : []).map(v => encodeURIComponent(v)).join(',');
}

async function readRows(env) {
  const rows = await supabaseFetch(env, `/rest/v1/${TABLE}?select=id,name_zh,aliases&limit=1000`, { method: 'GET' }, true);
  return Array.isArray(rows) ? rows : [];
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  try {
    requireCloudflareEnv(env);
    await requireAdmin(request, env);

    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(MAX_BATCH, Math.max(10, Number(body.batchSize) || DEFAULT_BATCH));

    let rows = await readRows(env);
    const byName = new Map();
    rows.forEach(function(row) {
      const name = String(row && row.name_zh || '').trim();
      if (name) byName.set(name, row);
    });
    const terms = Array.from(byName.keys());
    const offset = Math.max(0, Math.min(terms.length, Number(body.offset) || 0));
    const batch = terms.slice(offset, offset + batchSize);
    const nextOffset = offset + batchSize < terms.length ? offset + batchSize : null;
    if (batch.length < 2) {
      return json({ success: true, parentsApplied: 0, mergesApplied: 0, parentsCreated: 0, nextOffset: null, total: terms.length });
    }

    let suggestions;
    try {
      suggestions = await suggestVocabularyGroupsWithGlm(env, batch);
    } catch (error) {
      const message = String(error && error.message || '归类建议失败');
      return json({ success: false, reason: 'ai-failed', message, nextOffset: offset }, /未配置/.test(message) ? 503 : 502);
    }

    let parentsApplied = 0;
    let parentsCreated = 0;
    let mergesApplied = 0;
    const createdNames = [];
    const skipped = [];

    // 1) 上位词：parent 不存在就当新概念建出来（例：蛋挞/蛋糕 → 新建「甜点」再挂上去）
    for (const group of suggestions.parents || []) {
      const parentName = String(group.parent || '').trim();
      if (!parentName) continue;
      let parentRow = byName.get(parentName);
      if (!parentRow) {
        try {
          const created = await supabaseFetch(env, `/rest/v1/${TABLE}?on_conflict=name_zh`, {
            method: 'POST',
            headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
            body: JSON.stringify([{ id: `el:${parentName}`, name_zh: parentName, name_en: '', aliases: [], kind: 'group', source: 'ai' }])
          }, true);
          parentRow = Array.isArray(created) && created[0] ? created[0] : null;
          if (!parentRow) {
            rows = await readRows(env);
            byName.clear();
            rows.forEach(function(row) {
              const name = String(row && row.name_zh || '').trim();
              if (name) byName.set(name, row);
            });
            parentRow = byName.get(parentName) || null;
          }
          if (parentRow) {
            parentsCreated += 1;
            createdNames.push(parentName);
          }
        } catch (_createError) {
          parentRow = null;
        }
      }
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
        skipped.push(parentName);
      }
    }

    // 2) 合并：先把叫法写进 keep 行的别名，再删掉被合并的行
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
      parentsCreated: parentsCreated,
      createdNames: createdNames.slice(0, 6),
      mergesApplied: mergesApplied,
      nextOffset: nextOffset,
      total: terms.length,
      skipped: skipped.slice(0, 5)
    });
  } catch (error) {
    const message = error.message || '自动归类失败。';
    const explicit = Number(error && error.status);
    const status = /未配置/.test(message) ? 503
      : (explicit >= 400 && explicit < 600) ? explicit
        : /Unauthorized|Invalid session|Missing bearer|token|未登录|登录|admin|管理员|权限|Forbidden|permission/i.test(message) ? 403 : 500;
    return json({ success: false, message }, status);
  }
}
