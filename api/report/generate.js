const { verifyPayload } = require('../../lib/session');
const { generateReport } = require('../../lib/report');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  if (process.env.REPORT_TEST_MODE !== 'true') {
    res.statusCode = 402;
    return res.end(JSON.stringify({
      code: 'payment_required',
      error: 'Payment verification will be added here when the £5.99 Payhip product is connected.'
    }));
  }

  const body = readBody(req);
  const payload = verifyPayload(body.analysisToken);
  if (!payload || !payload.analysis) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'The analysis has expired. Run the Strava analysis again.' }));
  }
  if (!payload.analysis.eligibility || !payload.analysis.eligibility.eligible) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'There is not enough recent running data to create a useful report yet.' }));
  }

  try {
    const result = await generateReport(payload.analysis);
    res.statusCode = 200;
    res.end(JSON.stringify({
      report: result.report,
      analysis: payload.analysis,
      source: result.source,
      generatedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Report generation failed', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'The report could not be generated. Please try again.' }));
  }
};
