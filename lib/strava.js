const STRAVA_API = 'https://www.strava.com/api/v3';

function requireConfig() {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    throw new Error('Strava is not configured.');
  }
}

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
}

function callbackUrl(req) {
  return `${baseUrl(req)}/api/strava/callback`;
}

function authorizeUrl(req, state) {
  requireConfig();
  const query = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: callbackUrl(req),
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state
  });
  return `https://www.strava.com/oauth/authorize?${query.toString()}`;
}

async function tokenRequest(params) {
  requireConfig();
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...params
    })
  });
  if (!response.ok) throw new Error(`Strava token exchange failed (${response.status}).`);
  return response.json();
}

async function exchangeCode(code) {
  return tokenRequest({ code, grant_type: 'authorization_code' });
}

async function refreshToken(refreshToken) {
  return tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });
}

async function validSession(session) {
  if (!session || !session.accessToken) return null;
  if ((session.expiresAt || 0) > Math.floor(Date.now() / 1000) + 300) return session;
  const refreshed = await refreshToken(session.refreshToken);
  return {
    ...session,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: refreshed.expires_at
  };
}

async function api(path, accessToken) {
  const response = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Strava API request failed (${response.status}).`);
    error.status = response.status;
    error.detail = text.slice(0, 300);
    throw error;
  }
  return response.json();
}

async function listRecentRuns(accessToken, days = 84) {
  const after = Math.floor((Date.now() - days * 86400000) / 1000);
  const activities = [];
  for (let page = 1; page <= 2; page += 1) {
    const batch = await api(`/athlete/activities?after=${after}&page=${page}&per_page=100`, accessToken);
    activities.push(...batch);
    if (batch.length < 100) break;
  }
  return activities.filter(activity => {
    const type = activity.sport_type || activity.type || '';
    return type === 'Run' || type === 'TrailRun' || type === 'VirtualRun' || /Run$/i.test(type);
  });
}

async function activityStreams(accessToken, activityId) {
  const keys = 'time,distance,heartrate,velocity_smooth,cadence,altitude';
  return api(`/activities/${activityId}/streams?keys=${keys}&key_by_type=true`, accessToken);
}

async function fetchRunStreams(accessToken, activities, maximum = 36) {
  const allCandidates = activities.filter(activity => activity.has_heartrate);
  const candidates = allCandidates.length <= maximum
    ? allCandidates
    : Array.from({ length: maximum }, (_, index) => allCandidates[Math.round(index * (allCandidates.length - 1) / (maximum - 1))]);
  const results = [];
  for (let i = 0; i < candidates.length; i += 5) {
    const group = candidates.slice(i, i + 5);
    const batch = await Promise.all(group.map(async activity => {
      try {
        const streams = await activityStreams(accessToken, activity.id);
        return { activity, streams };
      } catch {
        return null;
      }
    }));
    results.push(...batch.filter(Boolean));
  }
  return results;
}

async function deauthorize(accessToken) {
  requireConfig();
  const credentials = Buffer.from(`${process.env.STRAVA_CLIENT_ID}:${process.env.STRAVA_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://www.strava.com/oauth/revoke', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ token: accessToken, token_type_hint: 'access_token' })
  });
  return response.ok;
}

module.exports = {
  baseUrl, authorizeUrl, exchangeCode, validSession,
  listRecentRuns, fetchRunStreams, deauthorize
};
