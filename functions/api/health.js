import { json } from '../_shared.js';

export async function onRequestGet({ env }) {
  const missingEnv = ['SUPABASE_SERVICE_ROLE_KEY'].filter(key => !env?.[key]);
  return json({
    success: true,
    ready: missingEnv.length === 0,
    missingEnv,
    aiReady: !!env?.VOLC_API_KEY || !!env?.OPENAI_API_KEY,
    runtime: 'cloudflare-pages',
    checkedAt: new Date().toISOString()
  });
}
