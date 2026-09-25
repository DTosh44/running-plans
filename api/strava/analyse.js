const { getSession, setSession, signPayload } = require('../../lib/session');
const { validSession, listRecentRuns, fetchRunStreams } = require('../../lib/strava');
const { analyseRunning } = require('../../lib/analysis');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  try {
    const current = getSession(req);
    if (!current) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Connect Strava before analysing your running.' }));
    }
    const session = await validSession(current);
    if (session.accessToken !== current.accessToken) setSession(res, session);

    const activities = await listRecentRuns(session.accessToken, 84);
    const streamedRuns = await fetchRunStreams(session.accessToken, activities, 36);
    const analysis = analyseRunning(activities, streamedRuns, 84);
    const analysisToken = signPayload({ analysis, athleteId: session.athlete && session.athlete.id }, 20 * 60);

    res.statusCode = 200;
    res.end(JSON.stringify({
      analysis,
      analysisToken,
      athlete: session.athlete,
      rawDataStored: false
    }));
  } catch (error) {
    console.error('Running analysis failed', error);
    res.statusCode = error.status === 429 ? 429 : 500;
    res.end(JSON.stringify({
      error: error.status === 429
        ? 'Strava rate limit reached. Please try the analysis again later.'
        : 'We could not analyse the Strava data. Please try again.'
    }));
  }
};
