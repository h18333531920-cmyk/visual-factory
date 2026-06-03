const { json } = require('./_supabase');

module.exports = async (_req, res) => {
  const required = ['SUPABASE_SERVICE_ROLE_KEY'];
  const missingEnv = required.filter(key => !process.env[key]);
  json(res, 200, {
    success: true,
    ready: missingEnv.length === 0,
    missingEnv,
    aiReady: !!process.env.VOLC_API_KEY || !!process.env.OPENAI_API_KEY,
    checkedAt: new Date().toISOString()
  });
};
