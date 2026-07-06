import { json } from '../_shared.js';
import { aiReady, hasLK888, hasOpenAI, hasVolcImage, hasVolcOutpaint } from '../_ai.js';

export async function onRequestGet({ env }) {
  const missingEnv = ['SUPABASE_SERVICE_ROLE_KEY'].filter(key => !env?.[key]);
  return json({
    success: true,
    ready: missingEnv.length === 0,
    missingEnv,
    aiReady: aiReady(env),
    openaiReady: hasOpenAI(env),
    lk888Ready: hasLK888(env),
    volcImageReady: hasVolcImage(env),
    volcOutpaintReady: hasVolcOutpaint(env),
    runtime: 'cloudflare-pages',
    checkedAt: new Date().toISOString()
  });
}
