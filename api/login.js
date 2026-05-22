const {
  signPayload,
  setSessionCookie,
  checkRolePasscode,
  createSessionUser
} = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      res.status(500).json({ success: false, message: 'Missing AUTH_SECRET' });
      return;
    }
    const { role, passcode } = req.body || {};
    if (!['admin', 'designer', 'viewer'].includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }
    if (!checkRolePasscode(role, passcode)) {
      res.status(401).json({ success: false, message: '口令错误' });
      return;
    }

    const user = createSessionUser(role);
    const token = signPayload(user, secret);
    setSessionCookie(res, token);
    res.status(200).json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
};
