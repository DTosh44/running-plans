(() => {
  const root = document.getElementById('profileApp');
  if (!root) return;

  let serviceStatus = null;
  let analysisState = null;

  const staticPreview = location.hostname.endsWith('github.io') || location.protocol === 'file:';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function formatKm(value) {
    return Number(value || 0).toFixed(1).replace('.0', '') + ' km';
  }

  function formatPercent(value) {
    return Number(value || 0).toFixed(0) + '%';
  }

  function ordinalConfidence(value) {
    return value || 'Limited';
  }

  function connectView(message = '') {
    root.innerHTML = `
      <div class="profile-step-label">STEP 1 · CONNECT YOUR DATA</div>
      <h3>Connect Strava securely</h3>
      <p class="profile-intro">We use your recent running history to create the analysis. You stay in control and can disconnect at any time.</p>
      ${message ? `<div class="profile-alert">${esc(message)}</div>` : ''}
      <div class="profile-data-list">
        <span><b>✓</b> Last 12 weeks of running activities</span>
        <span><b>✓</b> Heart-rate, pace, cadence and elevation streams where available</span>
        <span><b>✓</b> No GPS stream is requested for the analysis</span>
        <span><b>✓</b> Raw activity streams are not retained by the current report service</span>
      </div>
      <label class="profile-consent">
        <input type="checkbox" id="profileConsent">
        <span>I explicitly consent to RunningPlans processing my Strava activity and heart-rate data for the purpose of creating my personalised Running Profile. I understand that I can disconnect Strava at any time.</span>
      </label>
      <button type="button" class="button button-primary button-full" id="connectStrava" disabled>Connect with Strava <span aria-hidden="true">→</span></button>
      <div class="profile-secondary-actions">
        <button type="button" class="profile-text-button" id="exampleReport">View an example report</button>
        <a href="./privacy.html">Privacy &amp; data use</a>
      </div>
    `;
    const consent = document.getElementById('profileConsent');
    const connect = document.getElementById('connectStrava');
    consent.addEventListener('change', () => { connect.disabled = !consent.checked; });
    connect.addEventListener('click', () => { location.href = '/api/strava/connect?consent=1'; });
    document.getElementById('exampleReport').addEventListener('click', renderExampleReport);
  }

  function staticPreviewView() {
    root.innerHTML = `
      <div class="profile-preview-flag">GITHUB PREVIEW MODE</div>
      <h3>Running Profile is built and ready for Strava setup.</h3>
      <p class="profile-intro">The live Strava connection uses secure server-side functions, so it cannot run on GitHub Pages. The public product experience is still previewable here.</p>
      <div class="profile-preview-metrics">
        <div><strong>12</strong><span>weeks analysed</span></div>
        <div><strong>HR</strong><span>zone analysis</span></div>
        <div><strong>£5.99</strong><span>intro price</span></div>
      </div>
      <button type="button" class="button button-primary button-full" id="exampleReport">View example Running Profile <span aria-hidden="true">→</span></button>
      <p class="profile-inline-note">Deploy this repository to Vercel and add the Strava environment variables to activate the real connect-and-analyse flow.</p>
    `;
    document.getElementById('exampleReport').addEventListener('click', renderExampleReport);
  }

  function setupNeededView() {
    root.innerHTML = `
      <div class="profile-preview-flag">BACKEND READY · CREDENTIALS NEEDED</div>
      <h3>Strava integration is waiting for its API credentials.</h3>
      <p class="profile-intro">The report engine is installed. Add the Strava Client ID, Client Secret and session secret in Vercel to activate real customer connections.</p>
      <button type="button" class="button button-primary button-full" id="exampleReport">View example Running Profile <span aria-hidden="true">→</span></button>
    `;
    document.getElementById('exampleReport').addEventListener('click', renderExampleReport);
  }

  function connectedView(status) {
    const athlete = status.athlete || {};
    const name = [athlete.firstName, athlete.lastName].filter(Boolean).join(' ') || 'Strava athlete';
    root.innerHTML = `
      <div class="profile-connected">
        <span class="profile-connected-dot"></span>
        <span>STRAVA CONNECTED</span>
      </div>
      <h3>Ready to analyse your running, ${esc(name.split(' ')[0])}.</h3>
      <p class="profile-intro">We’ll look at up to 12 weeks of runs and sample detailed heart-rate streams across the whole period.</p>
      <button type="button" class="button button-primary button-full" id="analyseStrava">Analyse my last 12 weeks <span aria-hidden="true">→</span></button>
      <div class="profile-secondary-actions">
        <button type="button" class="profile-text-button" id="disconnectStrava">Disconnect Strava</button>
        <button type="button" class="profile-text-button" id="exampleReport">View example</button>
      </div>
    `;
    document.getElementById('analyseStrava').addEventListener('click', analyseStrava);
    document.getElementById('disconnectStrava').addEventListener('click', disconnectStrava);
    document.getElementById('exampleReport').addEventListener('click', renderExampleReport);
  }

  function loadingView(title, detail) {
    root.innerHTML = `
      <div class="profile-loading profile-loading-large">
        <span class="profile-spinner"></span>
        <strong>${esc(title)}</strong>
        <small>${esc(detail)}</small>
      </div>
    `;
  }

  async function analyseStrava() {
    loadingView('Analysing your last 12 weeks…', 'Reading running volume, heart-rate coverage, training intensity and aerobic-efficiency trends.');
    try {
      const response = await fetch('/api/strava/analyse', { credentials: 'include', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed.');
      analysisState = data;
      renderAnalysisReady(data);
    } catch (error) {
      root.innerHTML = `
        <div class="profile-alert">${esc(error.message || 'We could not analyse your Strava data.')}</div>
        <button type="button" class="button button-primary button-full" id="retryAnalysis">Try again</button>
      `;
      document.getElementById('retryAnalysis').addEventListener('click', analyseStrava);
    }
  }

  function renderAnalysisReady(data) {
    const a = data.analysis;
    const q = a.dataQuality;
    const t = a.training;
    const eligibleClass = a.eligibility.eligible ? 'profile-quality-good' : 'profile-quality-limited';
    const heartMessage = a.eligibility.heartRateEligible
      ? 'Heart-rate detail is strong enough to include estimated zones and intensity distribution.'
      : 'The training report can still be useful, but heart-rate sections will be limited until more HR-enabled runs are available.';

    const paymentAction = serviceStatus && serviceStatus.reportTestMode
      ? '<button type="button" class="button button-primary button-full" id="generateProfile">Generate my report · TEST MODE <span aria-hidden="true">→</span></button>'
      : '<button type="button" class="button button-primary button-full" disabled>Get my full report · £5.99</button><p class="profile-inline-note">The Payhip checkout will be connected to this button next. The analysis and report engine behind it are already built.</p>';

    root.innerHTML = `
      <div class="profile-step-label">STEP 2 · DATA CHECK</div>
      <div class="profile-quality ${eligibleClass}">
        <span>REPORT CONFIDENCE</span><strong>${esc(ordinalConfidence(a.eligibility.confidence))}</strong>
      </div>
      <h3>${a.eligibility.eligible ? 'Your data is ready for a Running Profile.' : 'We need a little more running data first.'}</h3>
      <p class="profile-intro">${esc(a.eligibility.reason)} ${esc(heartMessage)}</p>
      <div class="profile-stat-grid">
        <div><span>Runs</span><strong>${q.runs}</strong></div>
        <div><span>Active weeks</span><strong>${q.activeWeeks}/12</strong></div>
        <div><span>HR runs analysed</span><strong>${q.heartRateRuns}</strong></div>
        <div><span>Avg weekly</span><strong>${formatKm(t.averageWeeklyKm)}</strong></div>
      </div>
      <div class="profile-mini-summary">
        <span><b>Longest run</b> ${formatKm(t.longestRunKm)}</span>
        <span><b>Consistency</b> ${formatPercent(t.consistencyPct)}</span>
        <span><b>Recent 4-week avg</b> ${formatKm(t.recentFourWeekAverageKm)}</span>
      </div>
      ${a.eligibility.eligible ? paymentAction : ''}
      <div class="profile-secondary-actions">
        <button type="button" class="profile-text-button" id="analyseAgain">Refresh analysis</button>
        <button type="button" class="profile-text-button" id="disconnectStrava">Disconnect Strava</button>
      </div>
    `;
    document.getElementById('analyseAgain').addEventListener('click', analyseStrava);
    document.getElementById('disconnectStrava').addEventListener('click', disconnectStrava);
    const generate = document.getElementById('generateProfile');
    if (generate) generate.addEventListener('click', generateReport);
  }

  async function generateReport() {
    if (!analysisState || !analysisState.analysisToken) return;
    loadingView('Creating your Running Profile…', 'Turning the analysis into a clear, personalised report with practical next steps.');
    try {
      const response = await fetch('/api/report/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisToken: analysisState.analysisToken })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Report generation failed.');
      renderReport(data.report, data.analysis, false);
    } catch (error) {
      root.innerHTML = `
        <div class="profile-alert">${esc(error.message || 'We could not generate the report.')}</div>
        <button type="button" class="button button-primary button-full" id="backToAnalysis">Back to analysis</button>
      `;
      document.getElementById('backToAnalysis').addEventListener('click', () => renderAnalysisReady(analysisState));
    }
  }

  function zoneText(zone) {
    if (!zone) return '—';
    if (zone.min == null) return '≤ ' + zone.max + ' bpm';
    if (zone.max == null) return zone.min + '+ bpm';
    return zone.min + '–' + zone.max + ' bpm';
  }

  function reportList(items) {
    return '<ul>' + (items || []).map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>';
  }

  function renderReport(report, analysis, example) {
    const zones = (analysis.heartRate && analysis.heartRate.zones) || [];
    const distribution = (analysis.heartRate && analysis.heartRate.distribution) || [];
    const zoneRows = zones.length
      ? zones.map((zone, index) => {
          const dist = distribution[index];
          return `<div class="profile-zone-row"><span><b>${esc(zone.name)}</b><small>${dist ? esc(dist.percent + '% of recorded HR time') : ''}</small></span><strong>${esc(zoneText(zone))}</strong></div>`;
        }).join('')
      : '<div class="profile-report-muted">Not enough reliable heart-rate data to estimate zones.</div>';

    const t = analysis.training;
    const q = analysis.dataQuality;
    const efficiency = analysis.aerobicEfficiency;

    root.innerHTML = `
      ${example ? '<div class="profile-preview-flag">EXAMPLE REPORT</div>' : '<div class="profile-connected"><span class="profile-connected-dot"></span><span>REPORT COMPLETE</span></div>'}
      <div class="profile-report-header">
        <span>RUNNING PROFILE</span>
        <h3>${esc(report.headline)}</h3>
        <p>${esc(report.executive_summary)}</p>
      </div>
      <div class="profile-report-stats">
        <div><span>Runs</span><strong>${q.runs}</strong></div>
        <div><span>Avg weekly</span><strong>${formatKm(t.averageWeeklyKm)}</strong></div>
        <div><span>Longest run</span><strong>${formatKm(t.longestRunKm)}</strong></div>
        <div><span>Confidence</span><strong>${esc(analysis.eligibility.confidence)}</strong></div>
      </div>
      <section class="profile-report-section">
        <small>01 · TRAINING OVERVIEW</small>
        <h4>Your recent training</h4>
        <p>${esc(report.training_overview)}</p>
      </section>
      <section class="profile-report-section">
        <small>02 · ESTIMATED HEART-RATE ZONES</small>
        <h4>${analysis.heartRate.estimatedThresholdHr ? 'Estimated threshold HR: ' + analysis.heartRate.estimatedThresholdHr + ' bpm' : 'Heart-rate analysis'}</h4>
        <p>${esc(report.heart_rate)}</p>
        <div class="profile-zones">${zoneRows}</div>
      </section>
      <section class="profile-report-section">
        <small>03 · AEROBIC EFFICIENCY</small>
        <h4>${efficiency ? esc(efficiency.olderPace + ' → ' + efficiency.recentPace) : 'Not enough comparable data'}</h4>
        <p>${esc(report.aerobic_efficiency)}</p>
      </section>
      <div class="profile-report-two">
        <section class="profile-report-section">
          <small>04 · STRENGTHS</small>
          <h4>What looks positive</h4>
          ${reportList(report.strengths)}
        </section>
        <section class="profile-report-section">
          <small>05 · OPPORTUNITIES</small>
          <h4>Where to focus</h4>
          ${reportList(report.opportunities)}
        </section>
      </div>
      <section class="profile-report-section profile-next">
        <small>06 · NEXT FOUR WEEKS</small>
        <h4>What to do with this</h4>
        ${reportList(report.next_four_weeks)}
      </section>
      <section class="profile-report-caveats">
        <strong>Important context</strong>
        ${reportList(report.caveats)}
      </section>
      <div class="profile-report-actions">
        <button type="button" class="button button-primary" id="printProfile">Print / save PDF</button>
        ${example ? '<button type="button" class="button button-outline" id="closeExample">Back</button>' : '<button type="button" class="button button-outline" id="disconnectStrava">Disconnect Strava</button>'}
      </div>
    `;
    document.getElementById('printProfile').addEventListener('click', () => window.print());
    if (example) {
      document.getElementById('closeExample').addEventListener('click', () => staticPreview ? staticPreviewView() : (serviceStatus && serviceStatus.connected ? connectedView(serviceStatus) : connectView()));
    } else {
      document.getElementById('disconnectStrava').addEventListener('click', disconnectStrava);
    }
  }

  function renderExampleReport() {
    const analysis = {
      eligibility: { eligible: true, heartRateEligible: true, confidence: 'High' },
      dataQuality: { runs: 42, activeWeeks: 12, heartRateRuns: 35, heartRateCoveragePct: 83, heartRateHours: 31.4 },
      training: { averageWeeklyKm: 37.6, averageRunsPerWeek: 3.5, totalDistanceKm: 451.2, longestRunKm: 18.4, consistencyPct: 100, recentFourWeekAverageKm: 40.8, previousFourWeekAverageKm: 36.2, volumeTrendPct: 13 },
      heartRate: {
        estimatedThresholdHr: 171,
        zones: [
          { name: 'Recovery', min: null, max: 144 },
          { name: 'Easy / aerobic', min: 145, max: 152 },
          { name: 'Steady', min: 153, max: 161 },
          { name: 'Threshold', min: 162, max: 169 },
          { name: 'High intensity', min: 170, max: 184 }
        ],
        distribution: [
          { percent: 27 }, { percent: 43 }, { percent: 17 }, { percent: 9 }, { percent: 4 }
        ]
      },
      aerobicEfficiency: { olderPace: '5:21/km', recentPace: '5:06/km', changeSecPerKm: -15 }
    };
    const report = {
      headline: 'Your 12-week Running Profile',
      executive_summary: 'Your running has been consistent and your recent volume is building gradually. The strongest signal is an improvement in the pace you can hold at a comparable easy heart rate, while the majority of your recorded HR time remains in the recovery and easy ranges.',
      training_overview: 'Across the last 12 weeks you completed 42 runs, averaging 3.5 runs and 37.6 km per week. Your longest run was 18.4 km. Weekly volume has risen by around 13% comparing the most recent four weeks with the preceding four.',
      heart_rate: 'Your historic sustained-effort patterns suggest an estimated threshold heart rate around 171 bpm. The zones below are practical training estimates based on your own data, not a laboratory test.',
      aerobic_efficiency: 'At a comparable easy heart-rate range, your median pace improved from around 5:21/km in the older half of the analysis period to 5:06/km more recently. That is a useful positive trend, although terrain, weather and fatigue can also influence it.',
      strengths: [
        'You have run consistently across the entire 12-week period.',
        'Most recorded HR time is in the estimated recovery and easy ranges.',
        'Aerobic efficiency has improved at a comparable easy effort.'
      ],
      opportunities: [
        'Keep volume increases gradual now that weekly distance is trending upward.',
        'Protect truly easy days so threshold and interval sessions stay purposeful.',
        'Continue building the long run progressively rather than adding intensity to it every week.'
      ],
      next_four_weeks: [
        'Keep roughly three quarters of routine running conversational.',
        'Retain one purposeful harder session most weeks rather than turning several runs into moderate efforts.',
        'Keep the long run relaxed and build it in small steps with periodic cutback weeks.'
      ],
      caveats: [
        'This report is training guidance, not medical advice or a laboratory assessment.',
        'Heart-rate data can be affected by sensor accuracy, heat, hills, fatigue, caffeine, stress and illness.',
        'Training trends should be judged across several weeks rather than from one run.'
      ]
    };
    renderReport(report, analysis, true);
  }

  async function disconnectStrava() {
    loadingView('Disconnecting Strava…', 'Removing this RunningPlans connection.');
    try {
      await fetch('/api/strava/disconnect', { method: 'POST', credentials: 'include' });
    } catch {}
    analysisState = null;
    serviceStatus = serviceStatus ? { ...serviceStatus, connected: false } : null;
    connectView('Strava has been disconnected from RunningPlans.');
  }

  async function init() {
    if (staticPreview) {
      staticPreviewView();
      return;
    }

    const params = new URLSearchParams(location.search);
    let message = '';
    if (params.get('profile') === 'denied') message = 'Strava access was not granted. Nothing has been connected.';
    if (params.get('profile') === 'error') message = params.get('message') || 'The Strava connection could not be completed.';

    try {
      const response = await fetch('/api/strava/status', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Report service unavailable');
      serviceStatus = await response.json();
      if (!serviceStatus.configured) setupNeededView();
      else if (serviceStatus.connected) connectedView(serviceStatus);
      else connectView(message);
    } catch {
      staticPreviewView();
    }
  }

  init();
})();
