import {json, requireAdmin, supabaseFetch} from '../_shared.js';

const EXPERIMENT_SOURCE_ID = 'bfa82ce5-fca0-403b-8f7e-c6b6eafaf4c5';
const EXPERIMENT_KEY = 'augpicks-v1';
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const STATUSES = new Set(['running', 'failed', 'expired']);

function cleanTags(values) {
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const value = String(raw || '').trim();
    if (!value || value.length > 12 || out.includes(value)) continue;
    out.push(value);
    if (out.length >= 12) break;
  }
  return out;
}

async function previewFor(env, previewId) {
  const query = `/rest/v1/vf_asset_previews?id=eq.${encodeURIComponent(previewId)}`
    + `&source_file_id=eq.${EXPERIMENT_SOURCE_ID}`
    + '&select=id,source_file_id,preview_path,preview_size_bytes,updated_at';
  const rows = await supabaseFetch(env, query, {method: 'GET'}, true);
  if (!Array.isArray(rows) || rows.length !== 1) throw Object.assign(new Error('实验物料不存在'), {status: 404});
  return rows[0];
}

function previewContentKey(preview) {
  return [preview.preview_path || '', preview.preview_size_bytes || 0, preview.updated_at || ''].join('|');
}

async function currentFor(env, previewId) {
  const rows = await supabaseFetch(env,
    `/rest/v1/vf_preview_ai_tags?experiment_key=eq.${EXPERIMENT_KEY}&preview_id=eq.${encodeURIComponent(previewId)}&select=*`,
    {method: 'GET'}, true);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function saveRow(env, row) {
  const rows = await supabaseFetch(env, '/rest/v1/vf_preview_ai_tags?on_conflict=experiment_key,preview_id', {
    method: 'POST',
    headers: {Prefer: 'resolution=merge-duplicates,return=representation'},
    body: JSON.stringify(row)
  }, true);
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('逐图标签保存失败');
  return rows[0];
}

export async function handleCasePreviewAiTags(request, env) {
  try {
    if (request.method !== 'POST') return json({success: false, message: 'Method not allowed'}, 405);
    const user = await requireAdmin(request, env);
    const body = await request.json().catch(() => ({}));
    const previewId = String(body.previewId || '');
    if (!UUID.test(previewId)) return json({success: false, message: '物料标识无效'}, 400);
    const preview = await previewFor(env, previewId);
    const current = await currentFor(env, previewId);
    const action = String(body.action || '');
    const expectedContentKey = previewContentKey(preview);
    const base = {
      experiment_key: EXPERIMENT_KEY,
      preview_id: preview.id,
      source_file_id: preview.source_file_id,
      ai_tags: cleanTags(current?.ai_tags),
      manual_tags: cleanTags(current?.manual_tags),
      excluded_tags: cleanTags(current?.excluded_tags),
      status: current?.status || 'idle',
      model: String(current?.model || ''),
      content_key: String(current?.content_key || ''),
      run_id: current?.run_id || null,
      error_message: String(current?.error_message || ''),
      updated_by: user.id
    };

    if (action === 'status') {
      const status = String(body.status || '');
      if (!STATUSES.has(status)) return json({success: false, message: '状态无效'}, 400);
      base.status = status;
      base.run_id = UUID.test(String(body.runId || '')) ? body.runId : base.run_id;
      const contentKey = String(body.contentKey || '').slice(0, 500);
      if (contentKey !== expectedContentKey) return json({success: false, message: '物料内容已变化，请刷新后重试'}, 409);
      base.content_key = contentKey;
      base.error_message = status === 'failed' ? String(body.error || '识别失败').slice(0, 500) : '';
      return json({success: true, row: await saveRow(env, base)});
    }

    if (action === 'save') {
      const contentKey = String(body.contentKey || '').slice(0, 500);
      if (contentKey !== expectedContentKey) return json({success: false, message: '物料内容已变化，请刷新后重试'}, 409);
      const excluded = new Set(base.excluded_tags);
      base.ai_tags = cleanTags(body.tags).filter(tag => !excluded.has(tag));
      base.status = 'success';
      base.model = String(body.model || 'glm-4v-flash').slice(0, 80);
      base.content_key = contentKey;
      base.run_id = UUID.test(String(body.runId || '')) ? body.runId : null;
      base.error_message = '';
      return json({success: true, row: await saveRow(env, base)});
    }

    if (action === 'exclude') {
      const tag = String(body.tag || '').trim();
      if (!tag || tag.length > 12) return json({success: false, message: '标签无效'}, 400);
      base.ai_tags = base.ai_tags.filter(value => value !== tag);
      base.excluded_tags = cleanTags(base.excluded_tags.concat(tag));
      return json({success: true, row: await saveRow(env, base)});
    }

    if (action === 'manual-add') {
      const tag = String(body.tag || '').trim();
      if (!tag || tag.length > 12) return json({success: false, message: '标签无效'}, 400);
      if (base.content_key && base.content_key !== expectedContentKey) {
        base.ai_tags = [];
        base.manual_tags = [];
        base.excluded_tags = [];
        base.status = 'idle';
        base.model = '';
        base.error_message = '';
      }
      base.content_key = expectedContentKey;
      base.ai_tags = base.ai_tags.filter(value => value !== tag);
      base.manual_tags = cleanTags(base.manual_tags.concat(tag));
      base.excluded_tags = base.excluded_tags.filter(value => value !== tag);
      return json({success: true, row: await saveRow(env, base)});
    }

    if (action === 'manual-remove') {
      const tag = String(body.tag || '').trim();
      if (!tag || tag.length > 12) return json({success: false, message: '标签无效'}, 400);
      base.manual_tags = base.manual_tags.filter(value => value !== tag);
      return json({success: true, row: await saveRow(env, base)});
    }

    if (action === 'restore') {
      const tag = String(body.tag || '').trim();
      if (!tag || tag.length > 12) return json({success: false, message: '标签无效'}, 400);
      base.excluded_tags = base.excluded_tags.filter(value => value !== tag);
      base.ai_tags = cleanTags(base.ai_tags.concat(tag));
      return json({success: true, row: await saveRow(env, base)});
    }

    return json({success: false, message: '操作不支持'}, 400);
  } catch (error) {
    const status = Number(error.status) || (/relation .*vf_preview_ai_tags|does not exist/i.test(error.message || '') ? 503 : 500);
    return json({success: false, message: status === 503 ? '逐图标签表尚未建立，请执行 sql/021_preview_ai_tags_experiment.sql。' : (error.message || '逐图标签服务暂时不可用')}, status);
  }
}

export const onRequest = ({request, env}) => handleCasePreviewAiTags(request, env);
