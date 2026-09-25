const { getSession, clearSession } = require('../../lib/session');
const { validSession, deauthorize } = require('../../lib/strava');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  try {
    const current = getSession(req);
    if (current) {
      try {
        const session = await validSession(current);
        await deauthorize(session.accessToken);
      } catch {}
    }
    clearSession(res);
    res.statusCode = 200;
    res.end(JSON.stringify({ disconnected: true }));
  } catch {
    clearSession(res);
    res.statusCode = 200;
    res.end(JSON.stringify({ disconnected: true }));
  }
};
