const { json, getBearerToken, getUserFromToken, requireEnv } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    json(res, 405, { success: false, message: 'Method not allowed' });
    return;
  }

  try {
    requireEnv();
    await getUserFromToken(getBearerToken(req));
    json(res, 501, {
      success: false,
      message: 'AI image generation is authenticated but not configured in V1. Set VOLC_API_KEY and migrate server0603 logic when ready.'
    });
  } catch (error) {
    json(res, 401, { success: false, message: error.message || 'Unauthorized' });
  }
};
