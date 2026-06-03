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
      message: 'AI outpainting is authenticated but not configured in V1. The server0603 reference is preserved in docs/.'
    });
  } catch (error) {
    json(res, 401, { success: false, message: error.message || 'Unauthorized' });
  }
};
