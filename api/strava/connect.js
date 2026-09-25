const crypto = require('crypto');
const { setOauthState } = require('../../lib/session');
const { authorizeUrl } = require('../../lib/strava');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  try {
    const consent = req.query && req.query.consent;
    if (consent !== '1') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Explicit consent is required before connecting Strava.' }));
    }
    const state = crypto.randomBytes(24).toString('hex');
    setOauthState(res, {
      state,
      consentAt: new Date().toISOString(),
      purpose: 'running_profile'
    });
    res.statusCode = 302;
    res.setHeader('Location', authorizeUrl(req, state));
    res.end();
  } catch (error) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error.message || 'Strava connection is not configured.' }));
  }
};
