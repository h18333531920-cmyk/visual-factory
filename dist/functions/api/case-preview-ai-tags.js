import {json, requireAdmin, supabaseFetch} from '../_shared.js';

// 逐图 AI 标签是所有案例项目共用的功能（前端门禁 = isCaseProject，v908 起写入范围已放开）。
// EXPERIMENT_KEY 现在只是分区名：库里已有的行都挂在这个 key 下，新项目的行也写这里，
// 改名 = 现有数据全部读不到，所以不要动它。
// v918：save 动作额外接收并写入 effect_tags（动效/弹窗的"效果类型"，与 ai_tags 并列的独立一维，
// 由「动态物料抽帧识别」那条路产出，见 scripts/recognize-case-tags.mjs）；静态物料传空数组。
// sql/028 没执行（列不存在）时自动降级为"不写这一列"，不报错 —— 见 isMissingEffectTagsColumn。
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

// v908：不再锁实验项目来源，但**仍然只认请求里带的那一张**（id 精确匹配、必须唯一一条）。
// 写库时 source_file_id 取库里这一行自己的值，调用方无法指定别的项目/别的行。
async function previewFor(env, previewId) {
  const query = `/rest/v1/vf_asset_previews?id=eq.${encodeURIComponent(previewId)}`
    + '&select=id,source_file_id,preview_path,preview_size_bytes,updated_at';
  const rows = await supabaseFetch(env, query, {method: 'GET'}, true);
  if (!Array.isArray(rows) || rows.length !== 1) throw Object.assign(new Error('物料不存在'), {status: 404});
  return rows[0];
}

function previewContentKey(preview) {
  return [preview.preview_path || '', preview.preview_size_bytes || 0, preview.updated_at || ''].join('|');
}

// v918：sql/028 还没执行时表里没有 effect_tags 列，带这一列写会被 PostgREST 整条拒掉
// （PGRST204「Could not find the 'effect_tags' column…」/ 42703）。识别出这种错就**降级**：
// 去掉这一列重写一次，别的列照常 —— 不报错、只是这轮不写效果标签。
// `select=*` 读那一侧本来就列无关（列不存在只是读回来没有这个字段），不用改。
export function isMissingEffectTagsColumn(error) {
  const message = String(error && error.message || error || '');
  return /effect_tags/i.test(message) && /column|does not exist|schema cache|Could not find/i.test(message);
}

async function currentFor(env, previewId) {
  const rows = await supabaseFetch(env,
    `/rest/v1/vf_preview_ai_tags?experiment_key=eq.${EXPERIMENT_KEY}&preview_id=eq.${encodeURIComponent(previewId)}&select=*`,
    {method: 'GET'}, true);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function saveRow(env, row) {
  const post = async (payload) => {
    const rows = await supabaseFetch(env, '/rest/v1/vf_preview_ai_tags?on_conflict=experiment_key,preview_id', {
      method: 'POST',
      headers: {Prefer: 'resolution=merge-duplicates,return=representation'},
      body: JSON.stringify(payload)
    }, true);
    if (!Array.isArray(rows) || rows.length !== 1) throw new Error('逐图标签保存失败');
    return rows[0];
  };
  if (!Object.prototype.hasOwnProperty.call(row || {}, 'effect_tags')) return post(row);
  try {
    return await post(row);
  } catch (error) {
    if (!isMissingEffectTagsColumn(error)) throw error;
    const {effect_tags, ...rest} = row;   // eslint-disable-line no-unused-vars
    return post(rest);
  }
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
      // v914 去重：人工标签（manual_tags）不再作为 AI 标签存第二份 —— 同一个词只留在 manual_tags。
      // manual_tags / excluded_tags 本身照旧原样保留、绝不覆盖。
      const excluded = new Set(base.excluded_tags);
      const manual = new Set(base.manual_tags);
      base.ai_tags = cleanTags(body.tags).filter(tag => !excluded.has(tag) && !manual.has(tag));
      // v918 效果标签（动态物料的"效果类型"，独立一维）：与 ai_tags **同一条去重口径**。
      // **只在调用方真的带了这个字段时才写**（静态物料传 effectTags: []，就是显式清空）：
      // 浏览器那条识别路（v917 起不抽帧）根本没产出效果标签，不带这个字段 ⇒ 这一列不被它清掉。
      if (Object.prototype.hasOwnProperty.call(body, 'effectTags') || Object.prototype.hasOwnProperty.call(body, 'effect_tags')) {
        base.effect_tags = cleanTags(body.effectTags || body.effect_tags).filter(tag => !excluded.has(tag) && !manual.has(tag));
      }
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
        // 画面变过 ⇒ 旧的动效效果标签同样作废（与 ai_tags 一起清，别留着上一版的动效描述）
        base.effect_tags = [];
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
