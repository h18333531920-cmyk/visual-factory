import { getBearerToken, getUserFromToken, json, requireCloudflareEnv } from '../_shared.js';
import { checkLK888MediaTask, hasLK888 } from '../_ai.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') {
    return json({ success: false, message: 'Method not allowed' }, 405);
  }

  try {
    requireCloudflareEnv(env);
    await getUserFromToken(env, getBearerToken(request));
    if (!hasLK888(env)) throw new Error('GPT 生图未配置：请在 Cloudflare Pages 环境变量中设置 LK888_API_KEY。');

    const url = new URL(request.url);
    const taskId = url.searchParams.get('task_id') || url.searchParams.get('taskId') || '';
    const result = await checkLK888MediaTask(env, taskId);
    if (result.done) {
      return json({
        success: true,
        pending: false,
        provider: 'openai',
        status: result.status,
        imageBase64: result.imageBase64
      });
    }
    return json({
      success: true,
      pending: true,
      provider: 'openai',
      status: result.status,
      message: result.message
    });
  } catch (error) {
    const message = error.message || '查询 GPT 生图任务失败。';
    const status = /未配置/i.test(message) ? 503 : /Unauthorized|Invalid session/i.test(message) ? 401 : 500;
    return json({ success: false, message }, status);
  }
}
