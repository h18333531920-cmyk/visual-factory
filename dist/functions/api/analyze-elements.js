// 元素识别：上传案例库物料时看懂封面，产出「元素」标签建议（用户在前端点采纳才算数）。
// 走智谱 GLM-4V-Flash（免费视觉通道），密钥只放服务端：Cloudflare Pages 环境变量 GLM_API_KEY。
// v906 起支持「按组识别」：body.images 传 2–4 张同款图（例如同一设计的 EN / AR 版），
// 一次产出**一套共同标签** + 是否同一设计的判断；body.image 单图老路径行为不变。
import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { analyzeCaseTagGroupsWithGlm, analyzeCaseTagsWithGlm } from '../_ai.js';

const GROUP_IMAGES_MIN = 2;
const GROUP_IMAGES_MAX = 4;
// 体积上限按**解码后的字节数**算（dataURL 的 base64 长度约是字节数的 4/3）
const GROUP_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;
const GROUP_TOTAL_MAX_BYTES = 4 * 1024 * 1024;

function imageByteLength(value) {
  const base64 = String(value || '').replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (!base64) return 0;
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.max(0, Math.floor(base64.length * 3 / 4) - padding);
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));

    const body = await request.json().catch(() => ({}));
    const images = (Array.isArray(body.images) ? body.images : [])
      .filter(value => typeof value === 'string' && value.trim());

    if (images.length) {
      if (images.length < GROUP_IMAGES_MIN || images.length > GROUP_IMAGES_MAX) {
        return json({ success: false, message: `按组识别需要 ${GROUP_IMAGES_MIN}–${GROUP_IMAGES_MAX} 张图片。` }, 400);
      }
      let totalBytes = 0;
      for (const image of images) {
        const bytes = imageByteLength(image);
        if (bytes > GROUP_IMAGE_MAX_BYTES) {
          return json({ success: false, message: '组内单张图片过大（每张最多 1.5MB），请改用缩略图识别。' }, 413);
        }
        totalBytes += bytes;
      }
      if (totalBytes > GROUP_TOTAL_MAX_BYTES) {
        return json({ success: false, message: '组内图片合计过大（合计最多 4MB），请改用缩略图识别。' }, 413);
      }
      const grouped = await analyzeCaseTagGroupsWithGlm(env, images, body.vocabulary, body.activities);
      return json({
        success: true,
        provider: 'glm-4v-flash',
        elements: grouped.elements,
        activity: grouped.activity,
        sameDesign: grouped.sameDesign
      });
    }

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
