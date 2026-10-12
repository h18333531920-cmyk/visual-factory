// 标签词表（sql/022）：中文标签 → 英文显示名。
// 第一次遇到某个标签时问一次 AI 并落库（source='ai'），之后全站命中缓存；
// 管理员改过的行（source='manual'）永不被 AI 覆盖。
import { getBearerToken, getUserFromToken, json, requireCloudflareEnv, supabaseFetch } from '../_shared.js';
import { TAG_TRANSLATE_MAX_CHARS, TAG_TRANSLATE_MAX_TERMS, translateTagsWithGlm } from '../_ai.js';

const TABLE = 'vf_tag_vocabulary';

function cleanTerms(values) {
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const value = String(raw == null ? '' : raw).trim();
    if (!value || value.length > TAG_TRANSLATE_MAX_CHARS || out.includes(value)) continue;
    out.push(value);
    if (out.length >= TAG_TRANSLATE_MAX_TERMS) break;
  }
  return out;
}

function isMissingVocabularyTable(error) {
  const message = String(error && error.message || error || '');
  return /42P01|PGRST205|vf_tag_vocabulary|relation .* does not exist|schema cache/i.test(message);
}

async function readExisting(env, terms) {
  const filter = terms.map(value => encodeURIComponent(value)).join(',');
  const rows = await supabaseFetch(env,
    `/rest/v1/${TABLE}?name_zh=in.(${filter})&select=name_zh,name_en,source`,
    { method: 'GET' }, true);
  return Array.isArray(rows) ? rows : [];
}

// 一次 upsert 写回：命中 name_zh 就更新。source='manual' 的行（人工定的译名）跳过，绝不覆盖。
async function writeTranslations(env, translations, existingSources) {
  const rows = [];
  for (const nameZh of Object.keys(translations)) {
    if (existingSources.get(nameZh) === 'manual') continue;
    rows.push({ id: `el:${nameZh}`, name_zh: nameZh, name_en: translations[nameZh], kind: 'element', source: 'ai' });
  }
  if (!rows.length) return 0;
  await supabaseFetch(env, `/rest/v1/${TABLE}?on_conflict=name_zh`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  }, true);
  return rows.length;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);
  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    const body = await request.json().catch(() => ({}));
    const terms = cleanTerms(body.terms);
    if (!terms.length) return json({ success: true, map: {}, translated: 0 });

    let rows;
    try {
      rows = await readExisting(env, terms);
    } catch (error) {
      if (isMissingVocabularyTable(error)) return json({ success: false, reason: 'vocabulary-table-missing' });
      throw error;
    }

    const map = {};
    const existingSources = new Map();
    for (const row of rows) {
      const nameZh = String(row && row.name_zh || '').trim();
      const nameEn = String(row && row.name_en || '').trim();
      if (!nameZh) continue;
      existingSources.set(nameZh, String(row && row.source || 'ai'));
      if (nameEn) map[nameZh] = nameEn;
    }

    const missing = terms.filter(term => !map[term]);
    if (!missing.length) return json({ success: true, map, translated: 0 });

    let translations = {};
    try {
      translations = await translateTagsWithGlm(env, missing);
      // 模型批量翻译会稳定地漏 1–2 个词（实测 20 个也会漏）：只把漏掉的再问一次，
      // 列表短、命中率高；两次都拿不到的留给人工在词表维护里补。
      const leftover = missing.filter(term => !translations[term]);
      if (leftover.length && leftover.length < missing.length) {
        const second = await translateTagsWithGlm(env, leftover).catch(() => ({}));
        Object.assign(translations, second);
      }
    } catch (error) {
      const message = String(error && error.message || '翻译失败');
      const status = /未配置/.test(message) ? 503 : 502;
      return json({ success: false, reason: 'ai-failed', message, map }, status);
    }

    let written = 0;
    if (Object.keys(translations).length) {
      try {
        written = await writeTranslations(env, translations, existingSources);
      } catch (error) {
        // 写库失败不影响本次显示：译名已拿到，前端先用着，下次再落库。
        console.warn('标签词表写入失败:', error && error.message);
      }
      Object.assign(map, translations);
    }
    return json({ success: true, map, translated: written });
  } catch (error) {
    const message = error.message || '标签翻译失败。';
    const status = /Unauthorized|Invalid session|Missing bearer|token/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
