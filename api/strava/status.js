const { getSession, setSession } = require('../../lib/session');
const { validSession } = require('../../lib/strava');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const configured = Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET && process.env.SESSION_SECRET);
  if (!configured) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      configured: false,
      connected: false,
      reportTestMode: process.env.REPORT_TEST_MODE === 'true',
      paymentReady: false
    }));
  }
  try {
    const current = getSession(req);
    if (!current) {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        configured: true,
        connected: false,
        reportTestMode: process.env.REPORT_TEST_MODE === 'true',
        paymentReady: false
      }));
    }
    const session = await validSession(current);
    if (!session) throw new Error('Session expired');
    if (session.accessToken !== current.accessToken) setSession(res, session);
    res.statusCode = 200;
    res.end(JSON.stringify({
      configured: true,
      connected: true,
      athlete: session.athlete,
      scopes: session.scopes || [],
      consentAt: session.consentAt,
      reportTestMode: process.env.REPORT_TEST_MODE === 'true',
      paymentReady: false
    }));
  } catch {
    res.statusCode = 200;
    res.end(JSON.stringify({
      configured: true,
      connected: false,
      reportTestMode: process.env.REPORT_TEST_MODE === 'true',
      paymentReady: false
    }));
  }
};
