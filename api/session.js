const {
  COOKIE_NAME,
  verifyToken,
  parseCookies
} = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      res.status(500).json({ success: false, message: 'Missing AUTH_SECRET' });
      return;
    }
    const cookies = parseCookies(req);
    const token = cookies[COOKIE_NAME];
    const session = verifyToken(token, secret);
    if (!session) {
      res.status(401).json({ success: false, message: 'No session' });
      return;
    }
    res.status(200).json({
      success: true,
      user: { id: session.id, name: session.name, role: session.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Session failed' });
  }
};
