const { getOauthState, clearOauthState, setSession } = require('../../lib/session');
const { baseUrl, exchangeCode } = require('../../lib/strava');

module.exports = async function handler(req, res) {
  const home = `${baseUrl(req)}/?profile=strava#running-profile`;
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  try {
    const oauthState = getOauthState(req);
    const query = req.query || {};
    if (query.error) {
      clearOauthState(res);
      res.statusCode = 302;
      res.setHeader('Location', `${baseUrl(req)}/?profile=denied#running-profile`);
      return res.end();
    }
    if (!oauthState || !query.state || query.state !== oauthState.state || !query.code) {
      throw new Error('The Strava sign-in session could not be verified. Please try connecting again.');
    }
    const token = await exchangeCode(query.code);
    const scopes = String(token.scope || query.scope || '').split(/[ ,]+/).filter(Boolean);
    if (!scopes.includes('activity:read') && !scopes.includes('activity:read_all')) {
      throw new Error('RunningPlans needs permission to read your Strava activities in order to create the report.');
    }
    const athlete = token.athlete || {};
    setSession(res, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_at,
      scopes,
      consentAt: oauthState.consentAt,
      athlete: {
        id: athlete.id,
        firstName: athlete.firstname || '',
        lastName: athlete.lastname || ''
      }
    });
    clearOauthState(res);
    res.statusCode = 302;
    res.setHeader('Location', home);
    res.end();
  } catch (error) {
    clearOauthState(res);
    res.statusCode = 302;
    res.setHeader('Location', `${baseUrl(req)}/?profile=error&message=${encodeURIComponent(error.message || 'Unable to connect Strava')}#running-profile`);
    res.end();
  }
};
