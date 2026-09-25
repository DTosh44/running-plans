function fallbackReport(analysis) {
  const training = analysis.training;
  const hr = analysis.heartRate;
  const efficiency = analysis.aerobicEfficiency;
  const strengths = [];
  const opportunities = [];

  if (training.consistencyPct >= 75) strengths.push('Your running has been consistent across most of the 12-week period.');
  if (hr.easyPercent !== null && hr.easyPercent >= 65) strengths.push('A good proportion of recorded heart-rate time is in the estimated recovery and easy ranges.');
  if (efficiency && efficiency.changeSecPerKm < -5) strengths.push('Your pace at a comparable easy heart rate has improved, suggesting better aerobic efficiency.');

  if (training.volumeTrendPct !== null && training.volumeTrendPct > 20) opportunities.push('Your recent mileage has risen quickly; keep the next increase conservative and protect recovery.');
  if (hr.easyPercent !== null && hr.easyPercent < 60) opportunities.push('Consider making more routine runs genuinely easy so that harder sessions are more distinct.');
  if (!analysis.eligibility.heartRateEligible) opportunities.push('More runs with reliable heart-rate data will improve the confidence of your estimated training zones.');
  if (!strengths.length) strengths.push('You have enough recent running history to identify useful patterns and establish a baseline.');
  if (!opportunities.length) opportunities.push('Keep the overall structure consistent and make changes gradually rather than chasing short-term spikes in volume or intensity.');

  return {
    headline: 'Your 12-week Running Profile',
    executive_summary: `You averaged ${training.averageWeeklyKm} km per week across ${analysis.dataQuality.runs} runs. Your recent training is ${training.volumeTrendPct === null ? 'not yet comparable with the previous block' : Math.abs(training.volumeTrendPct) < 10 ? 'broadly stable' : training.volumeTrendPct > 0 ? 'trending upward' : 'trending downward'}. The analysis confidence is ${analysis.eligibility.confidence.toLowerCase()} based on the quantity and coverage of your available Strava data.`,
    training_overview: `Across the analysis window you completed ${analysis.dataQuality.runs} runs, averaging ${training.averageRunsPerWeek} runs and ${training.averageWeeklyKm} km per week. Your longest run was ${training.longestRunKm} km and your active-week consistency was ${training.consistencyPct}%.`,
    heart_rate: hr.estimatedThresholdHr
      ? `Your estimated threshold heart rate is approximately ${hr.estimatedThresholdHr} bpm, based on sustained heart-rate patterns in your historic runs. Treat the zones as training estimates rather than laboratory measurements.`
      : 'There is not yet enough reliable heart-rate stream data to estimate training zones with confidence.',
    aerobic_efficiency: efficiency
      ? `At a comparable estimated easy heart-rate range, median pace moved from ${efficiency.olderPace} in the older half of the period to ${efficiency.recentPace} more recently.`
      : 'There is not enough comparable easy-effort pace and heart-rate data to assess aerobic efficiency reliably.',
    strengths: strengths.slice(0, 3),
    opportunities: opportunities.slice(0, 3),
    next_four_weeks: [
      'Keep most routine running conversational and protect easy days.',
      'Avoid making large simultaneous increases in both weekly distance and hard-session load.',
      'Use trend changes over several weeks rather than a single run to judge progress.'
    ],
    caveats: [
      'This report is training guidance, not medical advice or a physiological laboratory assessment.',
      'Heart-rate readings can be affected by sensor error, heat, hills, fatigue, caffeine, stress and illness.',
      'Equivalent patterns from historic training do not guarantee future race performance.'
    ]
  };
}

function schema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['headline','executive_summary','training_overview','heart_rate','aerobic_efficiency','strengths','opportunities','next_four_weeks','caveats'],
    properties: {
      headline: { type: 'string' },
      executive_summary: { type: 'string' },
      training_overview: { type: 'string' },
      heart_rate: { type: 'string' },
      aerobic_efficiency: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
      opportunities: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
      next_four_weeks: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 4 },
      caveats: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 4 }
    }
  };
}

function extractOutputText(response) {
  if (response.output_text) return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return null;
}

async function generateReport(analysis) {
  if (!process.env.OPENAI_API_KEY) return { report: fallbackReport(analysis), source: 'deterministic' };

  const prompt = `Create a concise, useful running-analysis report from the structured metrics below.

Audience: recreational runner.
Tone: clear, encouraging, evidence-led, never hype.
Rules:
- Do not diagnose medical conditions.
- Do not describe estimated heart-rate zones as laboratory-verified or medically precise.
- Do not invent metrics or claims that are not supported by the supplied analysis.
- Distinguish data observations from interpretation.
- If heart-rate confidence is limited, say so plainly.
- Give practical training suggestions, but do not prescribe extreme mileage or intensity changes.
- Do not mention OpenAI, AI, ChatGPT, raw API data, or internal calculations.
- Write in UK English.

ANALYSIS:
${JSON.stringify(analysis)}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REPORT_MODEL || 'gpt-6-luna',
      input: [
        { role: 'system', content: 'You write personalised running reports from structured training metrics.' },
        { role: 'user', content: prompt }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'running_profile_report',
          strict: true,
          schema: schema()
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('OpenAI report generation failed', response.status, detail.slice(0, 500));
    return { report: fallbackReport(analysis), source: 'deterministic_fallback' };
  }

  const data = await response.json();
  const text = extractOutputText(data);
  if (!text) return { report: fallbackReport(analysis), source: 'deterministic_fallback' };

  try {
    return { report: JSON.parse(text), source: 'openai' };
  } catch {
    return { report: fallbackReport(analysis), source: 'deterministic_fallback' };
  }
}

module.exports = { generateReport, fallbackReport };
