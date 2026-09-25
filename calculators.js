(() => {
  const KM_PER_MILE = 1.609344;
  const pacePanel = document.getElementById('paceCalculatorPanel');
  const paceResult = document.getElementById('paceCalculatorResult');
  const vdotForm = document.getElementById('vdotForm');
  const vdotResult = document.getElementById('vdotResult');
  if (!pacePanel || !paceResult || !vdotForm || !vdotResult) return;

  const paceState = {
    mode: 'pace',
    unit: 'km',
    distance: '5',
    time: '25:00',
    pace: '5:00'
  };

  const commonRaces = [
    { label: '1 mile', km: KM_PER_MILE },
    { label: '5K', km: 5 },
    { label: '10K', km: 10 },
    { label: 'Half Marathon', km: 21.0975 },
    { label: 'Marathon', km: 42.195 }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }

  function parseTime(value) {
    if (!value) return 0;
    const parts = String(value).trim().split(':').map(Number);
    if (parts.some(function (part) { return !Number.isFinite(part) || part < 0; })) return 0;
    if (parts.length === 2) {
      if (parts[1] >= 60) return 0;
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      if (parts[1] >= 60 || parts[2] >= 60) return 0;
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  function formatDuration(totalSeconds) {
    const rounded = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const seconds = rounded % 60;
    if (hours) return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    return minutes + ':' + String(seconds).padStart(2, '0');
  }

  function formatPace(secondsPerKm, unit) {
    const seconds = unit === 'mi' ? secondsPerKm * KM_PER_MILE : secondsPerKm;
    const rounded = Math.max(1, Math.round(seconds));
    const minutes = Math.floor(rounded / 60);
    const remainder = rounded % 60;
    return minutes + ':' + String(remainder).padStart(2, '0') + '/' + unit;
  }

  function formatPaceRange(fastSecondsPerKm, slowSecondsPerKm, unit) {
    const fast = unit === 'mi' ? fastSecondsPerKm * KM_PER_MILE : fastSecondsPerKm;
    const slow = unit === 'mi' ? slowSecondsPerKm * KM_PER_MILE : slowSecondsPerKm;
    function shortPace(seconds) {
      const rounded = Math.max(1, Math.round(seconds));
      return Math.floor(rounded / 60) + ':' + String(rounded % 60).padStart(2, '0');
    }
    return shortPace(fast) + '–' + shortPace(slow) + '/' + unit;
  }

  function formatDistance(km, unit) {
    const value = unit === 'mi' ? km / KM_PER_MILE : km;
    const decimals = value < 10 ? 2 : 1;
    return Number(value.toFixed(decimals)) + ' ' + unit;
  }

  function distanceForUnit(km, unit) {
    return unit === 'mi' ? km / KM_PER_MILE : km;
  }

  function distanceInputMarkup() {
    const presets = commonRaces.slice(1).map(function (race) {
      return '<button type="button" class="calc-preset" data-pace-preset="' + race.km + '">' + race.label + '</button>';
    }).join('');
    return '<div class="calc-field full">' +
      '<label for="paceDistance">Distance</label>' +
      '<div class="calc-input-wrap">' +
        '<input class="field-input" id="paceDistance" type="number" min="0.1" step="0.01" inputmode="decimal" value="' + escapeHtml(paceState.distance) + '">' +
        '<select class="field-select" id="paceCalcUnit"><option value="km"' + (paceState.unit === 'km' ? ' selected' : '') + '>km</option><option value="mi"' + (paceState.unit === 'mi' ? ' selected' : '') + '>miles</option></select>' +
      '</div>' +
      '<div class="calc-presets">' + presets + '</div>' +
    '</div>';
  }

  function renderPaceForm() {
    document.querySelectorAll('[data-pace-mode]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.paceMode === paceState.mode);
    });

    let fields = '';
    if (paceState.mode === 'pace') {
      fields = distanceInputMarkup() +
        '<div class="calc-field full"><label for="paceTime">Finish time</label><input class="field-input" id="paceTime" type="text" inputmode="numeric" value="' + escapeHtml(paceState.time) + '" placeholder="e.g. 25:00 or 1:45:00"><span class="calc-help">Enter the total time for the distance above.</span></div>';
    } else if (paceState.mode === 'time') {
      fields = distanceInputMarkup() +
        '<div class="calc-field full"><label for="pacePace">Target pace per ' + paceState.unit + '</label><input class="field-input" id="pacePace" type="text" inputmode="numeric" value="' + escapeHtml(paceState.pace) + '" placeholder="e.g. 5:00"><span class="calc-help">Use mm:ss for your pace.</span></div>';
    } else {
      fields =
        '<div class="calc-field"><label for="paceTime">Total running time</label><input class="field-input" id="paceTime" type="text" inputmode="numeric" value="' + escapeHtml(paceState.time) + '" placeholder="e.g. 45:00"></div>' +
        '<div class="calc-field"><label for="pacePace">Pace per ' + paceState.unit + '</label><div class="calc-input-wrap"><input class="field-input" id="pacePace" type="text" inputmode="numeric" value="' + escapeHtml(paceState.pace) + '" placeholder="e.g. 5:00"><select class="field-select" id="paceCalcUnit"><option value="km"' + (paceState.unit === 'km' ? ' selected' : '') + '>per km</option><option value="mi"' + (paceState.unit === 'mi' ? ' selected' : '') + '>per mile</option></select></div></div>';
    }

    const labels = {
      pace: ['Calculate my pace', 'Enter a distance and finish time.'],
      time: ['Calculate finish time', 'Enter a distance and target pace.'],
      distance: ['Calculate distance', 'Enter a total time and pace.']
    };

    pacePanel.innerHTML =
      '<form class="calc-form" id="paceCalcForm">' +
        '<div class="calc-form-grid">' + fields + '</div>' +
        '<div class="calc-help">' + labels[paceState.mode][1] + '</div>' +
        '<button class="button button-primary" type="submit">' + labels[paceState.mode][0] + ' <span aria-hidden="true">→</span></button>' +
      '</form>';

    wirePaceForm();
  }

  function setPaceUnit(nextUnit) {
    if (nextUnit === paceState.unit) return;
    const currentDistance = Number(paceState.distance);
    if (Number.isFinite(currentDistance) && currentDistance > 0) {
      const km = paceState.unit === 'mi' ? currentDistance * KM_PER_MILE : currentDistance;
      const converted = nextUnit === 'mi' ? km / KM_PER_MILE : km;
      paceState.distance = String(Number(converted.toFixed(2)));
    }
    const paceSeconds = parseTime(paceState.pace);
    if (paceSeconds) {
      const secPerKm = paceState.unit === 'mi' ? paceSeconds / KM_PER_MILE : paceSeconds;
      const nextPace = nextUnit === 'mi' ? secPerKm * KM_PER_MILE : secPerKm;
      paceState.pace = formatDuration(nextPace);
    }
    paceState.unit = nextUnit;
    renderPaceForm();
  }

  function wirePaceForm() {
    const form = document.getElementById('paceCalcForm');
    const unit = document.getElementById('paceCalcUnit');
    unit && unit.addEventListener('change', function () { setPaceUnit(unit.value); });

    document.querySelectorAll('[data-pace-preset]').forEach(function (button) {
      button.addEventListener('click', function () {
        const km = Number(button.dataset.pacePreset);
        paceState.distance = String(Number(distanceForUnit(km, paceState.unit).toFixed(2)));
        renderPaceForm();
        calculatePace(false);
      });
    });

    form && form.addEventListener('submit', function (event) {
      event.preventDefault();
      calculatePace(true);
    });
  }

  function readPaceInputs() {
    const distance = document.getElementById('paceDistance');
    const time = document.getElementById('paceTime');
    const pace = document.getElementById('pacePace');
    if (distance) paceState.distance = distance.value;
    if (time) paceState.time = time.value.trim();
    if (pace) paceState.pace = pace.value.trim();

    let distanceKm = 0;
    let totalSeconds = 0;
    let secondsPerKm = 0;

    if (paceState.mode !== 'distance') {
      const value = Number(paceState.distance);
      if (!Number.isFinite(value) || value <= 0) return { error: 'Enter a distance greater than zero.' };
      distanceKm = paceState.unit === 'mi' ? value * KM_PER_MILE : value;
      if (distanceKm > 500) return { error: 'Enter a realistic running distance.' };
    }

    if (paceState.mode !== 'time') {
      totalSeconds = parseTime(paceState.time);
      if (!totalSeconds) return { error: 'Enter a valid time using mm:ss or hh:mm:ss.' };
    }

    if (paceState.mode !== 'pace') {
      const enteredPace = parseTime(paceState.pace);
      if (!enteredPace) return { error: 'Enter a valid pace using mm:ss.' };
      secondsPerKm = paceState.unit === 'mi' ? enteredPace / KM_PER_MILE : enteredPace;
      if (secondsPerKm < 100 || secondsPerKm > 1800) return { error: 'Enter a realistic running pace.' };
    }

    if (paceState.mode === 'pace') secondsPerKm = totalSeconds / distanceKm;
    if (paceState.mode === 'time') totalSeconds = secondsPerKm * distanceKm;
    if (paceState.mode === 'distance') distanceKm = totalSeconds / secondsPerKm;

    if (![distanceKm, totalSeconds, secondsPerKm].every(Number.isFinite) || distanceKm <= 0 || totalSeconds <= 0 || secondsPerKm <= 0) {
      return { error: 'Check the values and try again.' };
    }

    return { distanceKm: distanceKm, totalSeconds: totalSeconds, secondsPerKm: secondsPerKm };
  }

  function calculatePace(showErrors) {
    const values = readPaceInputs();
    if (values.error) {
      if (showErrors) paceResult.innerHTML = '<div class="calc-error">' + escapeHtml(values.error) + '</div>';
      return;
    }

    const kmh = 3600 / values.secondsPerKm;
    const mph = kmh / KM_PER_MILE;
    let primaryLabel = 'YOUR PACE';
    let primaryValue = formatPace(values.secondsPerKm, paceState.unit);
    let primaryDetail = paceState.unit === 'km' ? formatPace(values.secondsPerKm, 'mi') : formatPace(values.secondsPerKm, 'km');

    if (paceState.mode === 'time') {
      primaryLabel = 'ESTIMATED FINISH TIME';
      primaryValue = formatDuration(values.totalSeconds);
      primaryDetail = formatDistance(values.distanceKm, 'km') + ' · ' + formatDistance(values.distanceKm, 'mi');
    } else if (paceState.mode === 'distance') {
      primaryLabel = 'DISTANCE COVERED';
      primaryValue = formatDistance(values.distanceKm, paceState.unit);
      primaryDetail = paceState.unit === 'km' ? formatDistance(values.distanceKm, 'mi') : formatDistance(values.distanceKm, 'km');
    }

    const metrics =
      '<div class="calc-metrics">' +
        '<div class="calc-metric"><span>Pace / km</span><strong>' + formatPace(values.secondsPerKm, 'km') + '</strong></div>' +
        '<div class="calc-metric"><span>Pace / mile</span><strong>' + formatPace(values.secondsPerKm, 'mi') + '</strong></div>' +
        '<div class="calc-metric"><span>Speed</span><strong>' + kmh.toFixed(1) + ' km/h</strong></div>' +
        '<div class="calc-metric"><span>Speed</span><strong>' + mph.toFixed(1) + ' mph</strong></div>' +
      '</div>';

    const raceRows = commonRaces.map(function (race) {
      const raceTime = values.secondsPerKm * race.km;
      return '<tr><td><strong>' + race.label + '</strong></td><td>' + formatDuration(raceTime) + '</td><td>' + formatPace(values.secondsPerKm, 'km') + '</td><td>' + formatPace(values.secondsPerKm, 'mi') + '</td></tr>';
    }).join('');

    paceResult.innerHTML =
      '<div class="calc-result-primary"><div><small>' + primaryLabel + '</small><strong>' + primaryValue + '</strong><span>' + primaryDetail + '</span></div></div>' +
      metrics +
      '<div class="calc-subheading">IF YOU HELD THIS PACE</div>' +
      '<div class="calc-table-wrap"><table class="calc-table"><thead><tr><th>Distance</th><th>Finish time</th><th>Pace / km</th><th>Pace / mile</th></tr></thead><tbody>' + raceRows + '</tbody></table></div>';
  }

  document.querySelectorAll('[data-pace-mode]').forEach(function (button) {
    button.addEventListener('click', function () {
      paceState.mode = button.dataset.paceMode;
      renderPaceForm();
      calculatePace(false);
    });
  });

  function oxygenCost(velocityMetresPerMinute) {
    return -4.60 + 0.182258 * velocityMetresPerMinute + 0.000104 * velocityMetresPerMinute * velocityMetresPerMinute;
  }

  function sustainableFraction(minutes) {
    return 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
  }

  function vdotFromPerformance(distanceKm, seconds) {
    const minutes = seconds / 60;
    const velocity = distanceKm * 1000 / minutes;
    return oxygenCost(velocity) / sustainableFraction(minutes);
  }

  function velocityForOxygen(targetVo2) {
    const a = 0.000104;
    const b = 0.182258;
    const c = -4.60 - targetVo2;
    const discriminant = b * b - 4 * a * c;
    if (discriminant <= 0) return 0;
    return (-b + Math.sqrt(discriminant)) / (2 * a);
  }

  function paceForIntensity(vdot, fraction) {
    const velocity = velocityForOxygen(vdot * fraction);
    return velocity > 0 ? 60000 / velocity : 0;
  }

  function equivalentTimeForVdot(vdot, distanceKm) {
    let low = 1;
    let high = 1000;
    for (let i = 0; i < 100; i += 1) {
      const mid = (low + high) / 2;
      const score = vdotFromPerformance(distanceKm, mid * 60);
      if (score > vdot) low = mid;
      else high = mid;
    }
    return ((low + high) / 2) * 60;
  }

  function getVdotDistanceKm() {
    const distanceSelect = document.getElementById('vdotDistance');
    if (!distanceSelect) return NaN;
    if (distanceSelect.value !== 'custom') return Number(distanceSelect.value);
    const customValue = Number(document.getElementById('vdotCustomValue') && document.getElementById('vdotCustomValue').value);
    const customUnit = document.getElementById('vdotCustomUnit') && document.getElementById('vdotCustomUnit').value;
    if (!Number.isFinite(customValue)) return NaN;
    return customUnit === 'mi' ? customValue * KM_PER_MILE : customValue;
  }

  function zoneRange(vdot, lowFraction, highFraction) {
    const slow = paceForIntensity(vdot, lowFraction);
    const fast = paceForIntensity(vdot, highFraction);
    return { fast: fast, slow: slow };
  }

  function renderVdotResult() {
    const distanceKm = getVdotDistanceKm();
    const timeValue = document.getElementById('vdotTime').value.trim();
    const totalSeconds = parseTime(timeValue);

    if (!Number.isFinite(distanceKm) || distanceKm < 0.8 || distanceKm > 100) {
      vdotResult.innerHTML = '<div class="calc-error">Enter a race distance between 800 metres and 100 km.</div>';
      return;
    }
    if (!totalSeconds || totalSeconds < 120 || totalSeconds > 24 * 3600) {
      vdotResult.innerHTML = '<div class="calc-error">Enter a valid performance time using mm:ss or hh:mm:ss.</div>';
      return;
    }

    const score = vdotFromPerformance(distanceKm, totalSeconds);
    if (!Number.isFinite(score) || score < 10 || score > 100) {
      vdotResult.innerHTML = '<div class="calc-error">That combination produces an unusual result. Check the distance and time.</div>';
      return;
    }

    const racePace = totalSeconds / distanceKm;
    const zones = [
      { name: 'Easy', note: 'Conversational aerobic running', low: 0.59, high: 0.74 },
      { name: 'Marathon', note: 'Sustained aerobic / marathon effort', low: 0.75, high: 0.84 },
      { name: 'Threshold', note: 'Controlled, comfortably hard', low: 0.83, high: 0.88 },
      { name: 'Interval', note: 'Hard, repeatable VO₂-focused work', low: 0.95, high: 1.00 },
      { name: 'Repetition', note: 'Short, fast running with full recovery', low: 1.05, high: 1.15 }
    ];

    const zoneRows = zones.map(function (zone) {
      const range = zoneRange(score, zone.low, zone.high);
      return '<div class="zone-row"><span><strong>' + zone.name + '</strong><small>' + zone.note + '</small></span><b>' +
        formatPaceRange(range.fast, range.slow, 'km') + '<br>' + formatPaceRange(range.fast, range.slow, 'mi') +
        '</b></div>';
    }).join('');

    const equivalents = [
      { label: '1 mile', km: KM_PER_MILE },
      { label: '3K', km: 3 },
      { label: '5K', km: 5 },
      { label: '10K', km: 10 },
      { label: 'Half Marathon', km: 21.0975 },
      { label: 'Marathon', km: 42.195 }
    ].map(function (race) {
      const seconds = equivalentTimeForVdot(score, race.km);
      const paceKm = seconds / race.km;
      return '<div class="vdot-equivalent"><span>' + race.label + '</span><strong>' + formatDuration(seconds) + '</strong><small>' + formatPace(paceKm, 'km') + ' · ' + formatPace(paceKm, 'mi') + '</small></div>';
    }).join('');

    vdotResult.innerHTML =
      '<div class="vdot-score-row">' +
        '<div class="vdot-score"><span><strong>' + score.toFixed(1) + '</strong><small>VDOT</small></span></div>' +
        '<div class="vdot-summary"><small>PERFORMANCE ESTIMATE</small><h3>' + formatDistance(distanceKm, 'km') + ' in ' + formatDuration(totalSeconds) + '</h3><p>Race pace: ' + formatPace(racePace, 'km') + ' · ' + formatPace(racePace, 'mi') + '. Use the ranges below as training guidance rather than rigid limits.</p></div>' +
      '</div>' +
      '<div class="vdot-grid">' +
        '<section class="vdot-panel"><div class="vdot-panel-head"><strong>Training pace ranges</strong><small>MIN/KM · MIN/MILE</small></div>' + zoneRows + '</section>' +
        '<section class="vdot-panel"><div class="vdot-panel-head"><strong>Equivalent race performances</strong><small>ESTIMATES</small></div>' + equivalents + '</section>' +
      '</div>' +
      '<div class="vdot-note">Equivalent performances assume comparable fitness, pacing, course and distance-specific preparation. A strong 5K does not automatically mean you are marathon-trained, and vice versa.</div>';
  }

  const vdotDistance = document.getElementById('vdotDistance');
  const customDistance = document.getElementById('vdotCustomDistance');
  vdotDistance.addEventListener('change', function () {
    customDistance.hidden = vdotDistance.value !== 'custom';
  });

  vdotForm.addEventListener('submit', function (event) {
    event.preventDefault();
    renderVdotResult();
  });

  renderPaceForm();
  calculatePace(false);
  renderVdotResult();
})();
