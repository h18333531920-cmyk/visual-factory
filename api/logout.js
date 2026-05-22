const { clearSessionCookie } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }
  try {
    clearSessionCookie(res);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Logout failed' });
  }
};
