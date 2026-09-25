(() => {
  const rawPlans = window.RUNNING_PLAN_DATA || [];
  const DISTANCES = {
    "5K": { code: "5", km: 5, weeks: [4, 8, 12], goals: ["20:00", "22:30", "25:00", "30:00", "35:00", "40:00"] },
    "10K": { code: "10", km: 10, weeks: [4, 8, 12], goals: ["40:00", "45:00", "50:00", "55:00", "60:00", "70:00"] },
    "Half Marathon": { code: "H", km: 21.0975, weeks: [8, 12, 16], goals: ["1:30:00", "1:40:00", "1:50:00", "2:00:00", "2:15:00", "2:30:00"] },
    "Marathon": { code: "M", km: 42.195, weeks: [8, 12, 16, 20], goals: ["3:15:00", "3:30:00", "3:45:00", "4:00:00", "4:30:00", "5:00:00"] }
  };
  const RECENT_DISTANCES = { "1 mile": 1.609344, "5K": 5, "10K": 10, "Half Marathon": 21.0975, "Marathon": 42.195 };
  const LEVELS = {
    "5K": { low: 15, established: 30 }, "10K": { low: 20, established: 35 },
    "Half Marathon": { low: 25, established: 45 }, "Marathon": { low: 30, established: 50 }
  };
  const LEVEL_META = { L: { key: "low", label: "Low volume" }, E: { key: "established", label: "Established" }, H: { key: "high", label: "High volume" } };
  const DIST_BY_CODE = { "5": "5K", "10": "10K", "H": "Half Marathon", "M": "Marathon" };
  const FOCUS = { B: "Build consistency", S: "Build strength", R: "Race-specific fitness", P: "Sharpen", T: "Taper", X: "Race week" };
  const DAY = { M: "Monday", T: "Tuesday", W: "Wednesday", H: "Thursday", S: "Saturday", U: "Sunday" };
  const state = { step: 1, distance: "10K", weeks: null, days: null, units: "km", weeklyDistance: "", targetTime: "45:00", skipRecent: true, recentDistance: "5K", recentTime: "", recentAge: "1–3 months" };
  const builderPanel = document.getElementById("builderPanel");
  const stepLabel = document.getElementById("stepLabel");
  const stepTitle = document.getElementById("stepTitle");
  const progressFill = document.getElementById("progressFill");
  const resultSection = document.getElementById("result");
  const resultContent = document.getElementById("resultContent");
  const STEP_TITLES = ["Race distance", "Plan length", "Running days", "Current running", "Target time", "Recent race"];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

  function parseDuration(value) {
    if (!value) return 0;
    const parts = String(value).trim().split(":").map(Number);
    if (parts.some(n => !Number.isFinite(n) || n < 0)) return 0;
    if (parts.length === 2) { if (parts[1] >= 60) return 0; return parts[0] * 60 + parts[1]; }
    if (parts.length === 3) { if (parts[1] >= 60 || parts[2] >= 60) return 0; return parts[0] * 3600 + parts[1] * 60 + parts[2]; }
    return 0;
  }
  function formatClock(seconds) {
    const s = Math.max(0, Math.round(seconds)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  }
  function kmFromInput() {
    const value = Number(state.weeklyDistance);
    if (!Number.isFinite(value) || value < 0) return NaN;
    return state.units === "mi" ? value * 1.609344 : value;
  }
  function volumeLevel() {
    const km = kmFromInput(); if (!Number.isFinite(km)) return null;
    const t = LEVELS[state.distance]; if (km <= t.low) return "low"; if (km <= t.established) return "established"; return "high";
  }
  const levelLabel = level => level === "low" ? "Low volume" : level === "established" ? "Established" : "High volume";
  const levelCode = level => level === "low" ? "L" : level === "established" ? "E" : "H";
  function targetBounds(distance) {
    return { "5K": [14 * 60, 90 * 60], "10K": [28 * 60, 150 * 60], "Half Marathon": [60 * 60, 5 * 3600], "Marathon": [2 * 3600, 8 * 3600] }[distance];
  }
  function distanceLabel(km, unit = state.units) {
    if (unit === "mi") { const mi = km / 1.609344, value = mi < 10 ? Math.round(mi * 10) / 10 : Math.round(mi); return `${value} mi`; }
    const value = km < 10 ? Math.round(km * 10) / 10 : Math.round(km); return `${value} km`;
  }
  function paceString(secondsPerKm, unit = state.units) {
    const seconds = unit === "mi" ? secondsPerKm * 1.609344 : secondsPerKm, mins = Math.floor(seconds / 60), secs = Math.round(seconds % 60);
    const m = secs === 60 ? mins + 1 : mins, s = secs === 60 ? 0 : secs;
    return `${m}:${String(s).padStart(2, "0")}/${unit}`;
  }
  const paceRange = (a, b, unit = state.units) => `${paceString(a, unit).replace(`/${unit}`, "")}–${paceString(b, unit)}`;

  function trainingPaces() {
    const targetSeconds = parseDuration(state.targetTime), raceKm = DISTANCES[state.distance].km, racePace = targetSeconds / raceKm;
    const eq5Time = targetSeconds * Math.pow(5 / raceKm, 1.06), eq5Pace = eq5Time / 5;
    const sixtyMinuteDistance = raceKm * Math.pow(3600 / targetSeconds, 1 / 1.06), thresholdPace = 3600 / sixtyMinuteDistance;
    return {
      race: [racePace, racePace], threshold: [thresholdPace, thresholdPace + 8],
      interval: [Math.max(120, eq5Pace - 5), eq5Pace + 6], steady: [eq5Pace + 45, eq5Pace + 70],
      easy: [eq5Pace + 70, eq5Pace + 110], long: [eq5Pace + 65, eq5Pace + 100], recovery: [eq5Pace + 90, eq5Pace + 130]
    };
  }

  function volumeBandsText() {
    const t = LEVELS[state.distance];
    if (state.units === "km") return `0–${t.low} km low, ${t.low + 1}–${t.established} km established, ${t.established + 1}+ km high`;
    const low = Math.round(t.low / 1.609344), est = Math.round(t.established / 1.609344);
    return `0–${low} mi low, ${low + 1}–${est} mi established, ${est + 1}+ mi high`;
  }
  function suitabilityWarning(km = kmFromInput()) {
    if (!Number.isFinite(km) || !state.weeks) return "";
    let message = "";
    if (state.distance === "5K" && state.weeks === 4 && km < 5) message = "Four weeks is a short build if you are not already running consistently. An 8- or 12-week option gives you more time to adapt.";
    else if (state.distance === "10K" && state.weeks === 4 && km < 10) message = "A 4-week 10K build is better suited to somebody already running regularly. Consider 8 or 12 weeks if you are building from a small base.";
    else if (state.distance === "Half Marathon" && state.weeks === 8 && km < 15) message = "Eight weeks is an aggressive half-marathon build from this weekly volume. The 12- or 16-week plan offers a more gradual progression.";
    else if (state.distance === "Marathon") {
      if (state.weeks === 8 && km < 40) message = "An 8-week marathon block assumes a substantial existing base. From this weekly volume, 16 or 20 weeks would usually be a more sensible build.";
      else if (state.weeks === 12 && km < 25) message = "Twelve weeks is a relatively short marathon build from this weekly volume. Consider 16 or 20 weeks if your race date allows.";
      else if (state.weeks === 16 && km < 12) message = "Your current running base is very low for marathon training. A 20-week build—or first building a consistent running base—would be more appropriate.";
    }
    return message ? `<div class="inline-warning">${esc(message)}</div>` : "";
  }
  function currentLevelHint() {
    const level = volumeLevel(); if (!level) return "";
    const shown = state.units === "mi" ? `${state.weeklyDistance} miles` : `${state.weeklyDistance} km`;
    return `<div class="inline-note"><strong>${esc(shown)} per week → ${levelLabel(level)} plan.</strong> For ${esc(state.distance)}, the current-volume bands are ${volumeBandsText()}.</div>${suitabilityWarning()}`;
  }

  function setStep(n) {
    state.step = Math.min(6, Math.max(1, n)); stepLabel.textContent = `Step ${state.step} of 6`; stepTitle.textContent = STEP_TITLES[state.step - 1];
    progressFill.style.width = `${(state.step / 6) * 100}%`; renderStep();
  }
  function choiceButton(value, title, subtitle, selected) {
    return `<button type="button" class="choice-card ${selected ? "selected" : ""}" data-choice="${esc(value)}"><strong>${title}</strong><small>${subtitle}</small></button>`;
  }
  function actions(nextLabel = "Continue") {
    return `<div class="question-actions">${state.step > 1 ? '<button type="button" class="back-button" id="backStep">← Back</button>' : "<span></span>"}<button type="button" class="button button-primary" id="nextStep">${esc(nextLabel)} <span aria-hidden="true">→</span></button></div>`;
  }

  function renderStep() {
    let html = "";
    if (state.step === 1) {
      html = `<div class="question-head"><span>QUESTION 01</span><h3>What are you training for?</h3><p>Your race distance determines the available plan lengths and how we interpret your current weekly running.</p></div>
      <div class="choice-grid four">
        ${choiceButton("5K", '<span class="big-number">5K</span>', "Speed, strength and race-specific work", state.distance === "5K")}
        ${choiceButton("10K", '<span class="big-number">10K</span>', "Aerobic strength plus controlled speed", state.distance === "10K")}
        ${choiceButton("Half Marathon", '<span class="big-number">Half</span>', "Endurance with threshold and race pace", state.distance === "Half Marathon")}
        ${choiceButton("Marathon", '<span class="big-number">26.2</span>', "Long-run durability and marathon pace", state.distance === "Marathon")}
      </div>${actions()}`;
    } else if (state.step === 2) {
      const options = DISTANCES[state.distance].weeks.map(w => choiceButton(String(w), `<span class="big-number">${w}</span> weeks`, w <= 4 ? "Short, focused block" : w <= 8 ? "Compact build" : w <= 12 ? "Balanced build" : w <= 16 ? "Progressive build" : "Maximum build time", state.weeks === w)).join("");
      html = `<div class="question-head"><span>QUESTION 02</span><h3>How long until race day?</h3><p>Choose the plan length that matches your race date. More time generally allows a gentler build and more recovery weeks.</p></div><div class="choice-grid">${options}</div>${actions()}`;
    } else if (state.step === 3) {
      html = `<div class="question-head"><span>QUESTION 03</span><h3>How many days a week do you want to run?</h3><p>Choose what you can sustain most weeks, not the maximum you could squeeze in on a perfect week.</p></div>
      <div class="choice-grid four">${[3,4,5,6].map(d => choiceButton(String(d), `<span class="big-number">${d}</span> days`, d === 3 ? "Minimum effective frequency" : d === 4 ? "Balanced and flexible" : d === 5 ? "More aerobic volume" : "High-frequency running", state.days === d)).join("")}</div>${actions()}`;
    } else if (state.step === 4) {
      html = `<div class="question-head"><span>QUESTION 04</span><h3>What does your running look like now?</h3><p>Use your average weekly running distance over the last four weeks. Choose the units you want us to use throughout the plan.</p></div>
      <div class="choice-grid">${choiceButton("km", "Kilometres", "Distances in km · paces in min/km", state.units === "km")}${choiceButton("mi", "Miles", "Distances in miles · paces in min/mile", state.units === "mi")}</div>
      <div class="field-group" style="margin-top:22px"><label class="field-label" for="weeklyDistance">Average weekly distance over the last 4 weeks</label><div class="field-row"><input class="field-input" id="weeklyDistance" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(state.weeklyDistance)}" placeholder="${state.units === "km" ? "e.g. 28" : "e.g. 18"}"><span class="field-suffix">${state.units}</span></div><div id="volumeHint">${state.weeklyDistance !== "" ? currentLevelHint() : ""}</div><div class="field-error" id="weeklyError" hidden></div></div>${actions()}`;
    } else if (state.step === 5) {
      const goalButtons = DISTANCES[state.distance].goals.map(g => `<button type="button" class="chip-button ${state.targetTime === g ? "active" : ""}" data-goal="${g}">${g}</button>`).join("");
      html = `<div class="question-head"><span>QUESTION 05</span><h3>What is your target finish time?</h3><p>Enter an exact goal. This does not change the schedule you receive; it gives you personalised training pace guidance.</p></div>
      <div class="field-group"><label class="field-label" for="targetTime">Target ${esc(state.distance)} time</label><input class="field-input" id="targetTime" type="text" value="${esc(state.targetTime)}" placeholder="${state.distance.includes("Marathon") ? "e.g. 3:45:00" : "e.g. 45:00"}" inputmode="numeric"><div class="chip-group" aria-label="Common target times">${goalButtons}</div><div class="field-error" id="targetError" hidden></div></div>${actions()}`;
    } else {
      html = `<div class="question-head"><span>QUESTION 06</span><h3>Do you have a recent race result?</h3><p>This is optional. It will never switch you to a different schedule; we only use it to sense-check how demanding your target looks right now.</p></div>
      <label class="skip-row"><input type="checkbox" id="skipRecent" ${state.skipRecent ? "checked" : ""}><span>I don't want to add a recent race result</span></label>
      <div id="recentFields" ${state.skipRecent ? "hidden" : ""} style="margin-top:22px"><div class="recent-grid">
      <div class="field-group"><label class="field-label" for="recentDistance">Recent race distance</label><select class="field-select" id="recentDistance">${Object.keys(RECENT_DISTANCES).map(d => `<option ${state.recentDistance === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></div>
      <div class="field-group"><label class="field-label" for="recentTime">Finish time</label><input class="field-input" id="recentTime" value="${esc(state.recentTime)}" placeholder="e.g. 22:45" inputmode="numeric"></div>
      <div class="field-group full"><label class="field-label" for="recentAge">How recent was it?</label><select class="field-select" id="recentAge">${["Last 4 weeks","1–3 months","3–6 months","More than 6 months"].map(x => `<option ${state.recentAge === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      </div></div><div class="field-error" id="recentError" hidden></div>${actions("Show my plan")}`;
    }
    builderPanel.innerHTML = html; wireStep();
  }

  function showError(id, message) { const el = document.getElementById(id); if (!el) return; el.hidden = !message; el.textContent = message || ""; }
  function validStep() {
    if (state.step === 1) return Boolean(state.distance);
    if (state.step === 2) return Boolean(state.weeks);
    if (state.step === 3) return Boolean(state.days);
    if (state.step === 4) {
      const input = document.getElementById("weeklyDistance"); state.weeklyDistance = input?.value ?? state.weeklyDistance; const km = kmFromInput();
      const ok = Number.isFinite(km) && km >= 0 && km <= 300; showError("weeklyError", ok ? "" : "Enter an average weekly running distance between 0 and 300 km (or the equivalent in miles)."); return ok;
    }
    if (state.step === 5) {
      const input = document.getElementById("targetTime"); state.targetTime = input?.value.trim() || ""; const sec = parseDuration(state.targetTime), [min,max] = targetBounds(state.distance);
      const ok = sec >= min && sec <= max; showError("targetError", ok ? "" : `Enter a plausible ${state.distance} target time, for example ${DISTANCES[state.distance].goals[1]}.`); return ok;
    }
    const skip = document.getElementById("skipRecent"); state.skipRecent = Boolean(skip?.checked); if (state.skipRecent) return true;
    state.recentDistance = document.getElementById("recentDistance")?.value || state.recentDistance; state.recentTime = document.getElementById("recentTime")?.value.trim() || ""; state.recentAge = document.getElementById("recentAge")?.value || state.recentAge;
    const sec = parseDuration(state.recentTime), ok = sec >= 4 * 60 && sec <= 10 * 3600; showError("recentError", ok ? "" : "Enter a valid recent race time, or tick the box to skip this question."); return ok;
  }

  function wireStep() {
    builderPanel.querySelectorAll("[data-choice]").forEach(btn => btn.addEventListener("click", () => {
      const value = btn.dataset.choice;
      if (state.step === 1) { state.distance = value; state.weeks = null; state.targetTime = DISTANCES[value].goals[1]; }
      else if (state.step === 2) state.weeks = Number(value);
      else if (state.step === 3) state.days = Number(value);
      else if (state.step === 4) state.units = value;
      renderStep();
    }));
    document.getElementById("backStep")?.addEventListener("click", () => setStep(state.step - 1));
    document.getElementById("nextStep")?.addEventListener("click", () => { if (!validStep()) return; if (state.step < 6) setStep(state.step + 1); else showPlan(); });
    const weekly = document.getElementById("weeklyDistance");
    weekly?.addEventListener("input", () => { state.weeklyDistance = weekly.value; document.getElementById("volumeHint").innerHTML = weekly.value === "" ? "" : currentLevelHint(); showError("weeklyError", ""); });
    document.getElementById("targetTime")?.addEventListener("input", e => { state.targetTime = e.target.value; showError("targetError", ""); });
    builderPanel.querySelectorAll("[data-goal]").forEach(btn => btn.addEventListener("click", () => { state.targetTime = btn.dataset.goal; renderStep(); }));
    const skipRecent = document.getElementById("skipRecent");
    skipRecent?.addEventListener("change", () => { state.skipRecent = skipRecent.checked; const fields = document.getElementById("recentFields"); if (fields) fields.hidden = state.skipRecent; showError("recentError", ""); });
  }

  function decodePlan(entry) {
    const [id, distanceCode, durationWeeks, daysPerWeek, lvlCode, weeks] = entry;
    return { id, distance: DIST_BY_CODE[distanceCode], durationWeeks, daysPerWeek, level: LEVEL_META[lvlCode].key, levelLabel: LEVEL_META[lvlCode].label,
      weeks: weeks.map(([week, focus, sessions]) => ({ week, focus: FOCUS[focus], sessions: sessions.map(([day, workout, distanceKm]) => ({ day: DAY[day], workout, distanceKm })) })) };
  }
  function selectedPlan() {
    const code = DISTANCES[state.distance].code, lvl = levelCode(volumeLevel());
    const entry = rawPlans.find(p => p[1] === code && p[2] === state.weeks && p[3] === state.days && p[4] === lvl);
    return entry ? decodePlan(entry) : null;
  }

  function workoutInfo(code, distance) {
    if (code === "E") return { name: "Easy run", pace: "easy", kind: "easy", detail: "Relaxed, conversational running. Keep the effort genuinely easy." };
    if (code === "REC") return { name: "Recovery run", pace: "recovery", kind: "easy", detail: "Very easy running. Finish feeling fresher than you started." };
    if (code === "ES") return { name: "Easy + strides", pace: "easy", kind: "easy", detail: "Easy running, then 4–6 × 20 sec relaxed strides with full recovery." };
    if (code === "L" || code === "LS") return { name: "Long run", pace: "long", kind: "easy", detail: code === "LS" ? "Keep this conversational. If you feel good, let the final 15–20% become steady rather than hard." : "Keep this conversational and controlled." };
    if (code === "SH") return { name: "Sharpening session", pace: "race", kind: "quality", detail: "4 × 2 min at race pace with generous easy recovery. Finish wanting one more repetition." };
    if (code === "SO") return { name: "Shakeout", pace: "easy", kind: "easy", detail: "Very relaxed running with 4 × 15 sec light strides if they feel natural." };
    if (code === "RACE") return { name: `${distance} race`, pace: "race", kind: "quality", detail: "Race day. Start controlled, settle into goal effort and adjust by feel." };
    if (code === "TS") return { name: "Tempo + strides", pace: "threshold", kind: "quality", detail: "15–20 min at threshold, then 4 × 20 sec relaxed strides. Keep the rest of the run easy." };
    if (code === "TEM") return { name: "Tempo", pace: "threshold", kind: "quality", detail: "20 min continuous threshold running. Keep it controlled rather than racing the session." };
    if (code === "ST") return { name: "Steady run", pace: "steady", kind: "quality", detail: distance === "Marathon" ? "Finish the final 20 min at a steady aerobic effort. Keep the rest easy." : "Finish the final 15 min at a steady aerobic effort. Keep the rest easy." };
    if (code === "RQM") return { name: "Marathon-pace run", pace: "race", kind: "quality", detail: "2 × 15 min at marathon pace with 5 min easy between. Keep the rest easy." };
    if (code === "RQS") return { name: "Race-pace run", pace: "race", kind: "quality", detail: "2 × 12 min at half-marathon pace with 3 min easy between. Keep the rest easy." };
    const stage = Number(code.slice(-1)) || 1;
    if (code.startsWith("INT")) {
      if (distance === "5K") {
        const details = {1:"8 × 1 min at a controlled hard effort, 75–90 sec easy jog. Warm up and cool down easily.",2:"6 × 2 min around 5K effort, 90 sec easy jog. Warm up and cool down easily.",3:"5 × 3 min at 5K pace, 2 min easy jog. Warm up and cool down easily."};
        return { name: stage === 3 ? "5K-pace reps" : "Intervals", pace: stage === 3 ? "race" : "interval", kind: "quality", detail: details[stage] };
      }
      const details = {1:"6 × 2 min around 10K effort, 90 sec easy jog. Warm up and cool down easily.",2:"5 × 4 min around 10K pace, 2 min easy jog. Warm up and cool down easily.",3:"3 × 8 min at 10K pace, 3 min easy jog. Warm up and cool down easily."};
      return { name: stage === 1 ? "Intervals" : "10K-pace reps", pace: stage === 1 ? "threshold" : "race", kind: "quality", detail: details[stage] };
    }
    if (code.startsWith("TH")) {
      const details = {1:"3 × 8 min at threshold, 2 min easy jog. Warm up and cool down easily.",2:distance === "Marathon" ? "3 × 10 min at threshold, 2 min easy jog. Warm up and cool down easily." : "2 × 15 min at threshold, 3 min easy jog. Warm up and cool down easily.",3:distance === "Marathon" ? "2 × 20 min at marathon pace, 5 min easy between. Warm up and cool down easily." : "3 × 10 min at half-marathon pace, 3 min easy jog. Warm up and cool down easily."};
      const isRace = stage === 3; return { name: isRace ? (distance === "Marathon" ? "Marathon pace" : "Half-marathon pace") : "Threshold", pace: isRace ? "race" : "threshold", kind: "quality", detail: details[stage] };
    }
    if (code.startsWith("RP")) {
      if (distance === "5K") return { name: "5K-pace reps", pace: "race", kind: "quality", detail: "5 × 3 min at 5K pace, 2 min easy jog. Warm up and cool down easily." };
      if (distance === "10K") return { name: "10K-pace reps", pace: "race", kind: "quality", detail: stage >= 3 ? "3 × 8 min at 10K pace, 3 min easy jog. Warm up and cool down easily." : "5 × 4 min around 10K pace, 2 min easy jog. Warm up and cool down easily." };
      if (distance === "Half Marathon") return { name: "Half-marathon pace", pace: "race", kind: "quality", detail: "3 × 10 min at half-marathon pace, 3 min easy jog. Warm up and cool down easily." };
      return { name: "Marathon pace", pace: "race", kind: "quality", detail: "2 × 20 min at marathon pace, 5 min easy between. Warm up and cool down easily." };
    }
    return { name: "Quality session", pace: "threshold", kind: "quality", detail: "Run this session with control and keep enough in reserve to finish strongly." };
  }

  function recentAssessment() {
    if (state.skipRecent || !state.recentTime) return { title: "No recent race added", text: "Your plan uses your chosen target for pace guidance. Keep the effort descriptions in charge if the numbers feel too hard on a given day.", status: "Use effort as well as pace." };
    const recentSec = parseDuration(state.recentTime), recentKm = RECENT_DISTANCES[state.recentDistance], goalKm = DISTANCES[state.distance].km;
    const equivalent = recentSec * Math.pow(goalKm / recentKm, 1.06), target = parseDuration(state.targetTime), ratio = target / equivalent, stale = state.recentAge === "More than 6 months";
    if (ratio < .93) return { title: "Your target is a stretch", text: `Your recent ${state.recentDistance} time of ${state.recentTime} gives a rough ${state.distance} equivalent of about ${formatClock(equivalent)}. Your ${state.targetTime} goal is materially quicker, so use the pace guide cautiously and let effort override the watch.`, status: stale ? "The result is over six months old, so treat this comparison as low-confidence." : "Ambitious can be fine—but the plan should not force the target pace before your fitness supports it." };
    if (ratio > 1.10) return { title: "Your recent result supports the goal", text: `Your recent ${state.recentDistance} time of ${state.recentTime} gives a rough ${state.distance} equivalent of about ${formatClock(equivalent)}, which is faster than your ${state.targetTime} target.`, status: stale ? "The result is over six months old, so current fitness may be different." : "The goal looks conservative relative to that result; train to the prescribed effort rather than forcing faster paces." };
    return { title: "Target and recent form are broadly aligned", text: `Your recent ${state.recentDistance} time of ${state.recentTime} gives a rough ${state.distance} equivalent of about ${formatClock(equivalent)}. That sits in the same broad range as your ${state.targetTime} goal.`, status: stale ? "The result is over six months old, so use it as context rather than a current fitness test." : "That is a useful starting point, not a guarantee of race-day performance." };
  }
  function paceValue(key, unit = state.units) { const p = trainingPaces()[key]; if (!p) return "By effort"; return Math.abs(p[0] - p[1]) < .5 ? paceString(p[0], unit) : paceRange(p[0], p[1], unit); }
  const totalWeekDistance = week => week.sessions.reduce((sum, session) => sum + session.distanceKm, 0);

  function planHtml(plan) {
    const assess = recentAssessment(), warning = suitabilityWarning(kmFromInput());
    const paceCells = [["Race pace","race","Exact goal pace"],["Threshold","threshold","Comfortably hard"],["Intervals","interval","Hard but repeatable"],["Steady","steady","Controlled aerobic"],["Easy","easy","Conversation pace"],["Long run","long","Relaxed endurance"]]
      .map(([label,key,note]) => `<div class="pace-cell"><span>${label}</span><strong>${paceValue(key)}</strong><small>${note}</small></div>`).join("");
    const weeks = plan.weeks.map((week, index) => {
      const sessions = week.sessions.map(session => {
        const info = workoutInfo(session.workout, plan.distance);
        return `<div class="session-row"><span class="session-day">${esc(session.day.slice(0,3))}</span><i class="session-line ${info.kind}"></i><div class="session-main"><strong>${esc(info.name)}</strong><small>${esc(info.detail)}</small></div><span class="session-distance">${esc(distanceLabel(session.distanceKm))}</span><span class="session-pace">${esc(paceValue(info.pace))}</span></div>`;
      }).join("");
      return `<details class="week-card" ${index < 2 ? "open" : ""}><summary><span class="week-number"><small>WEEK</small><strong>${week.week}</strong></span><span class="week-focus"><strong>${esc(week.focus)}</strong><small>${esc(distanceLabel(totalWeekDistance(week)))} scheduled</small></span><span class="week-chevron" aria-hidden="true">+</span></summary><div class="session-list">${sessions}</div></details>`;
    }).join("");
    return `<div class="result-hero">
      <article class="result-summary"><span class="result-kicker">YOUR MATCHED PLAN</span><h2>${esc(plan.durationWeeks)}-week ${esc(plan.distance)} plan</h2><p>${esc(plan.daysPerWeek)} runs a week · ${esc(plan.levelLabel)} starting volume · target ${esc(state.targetTime)}</p><div class="result-tags"><span>${esc(state.units === "km" ? "MIN/KM" : "MIN/MILE")}</span><span>${esc(levelLabel(plan.level))}</span><span>${esc(plan.id.toUpperCase())}</span></div><div class="result-actions"><button type="button" class="button button-primary" id="printPlan">Print / save PDF</button><button type="button" class="button button-outline" id="changeAnswers">Change answers</button></div></article>
      <aside class="advice-card"><small>RECENT-FORM CHECK</small><h3>${esc(assess.title)}</h3><p>${esc(assess.text)}</p><div class="advice-status">${esc(assess.status)}</div></aside></div>
      ${warning ? warning : ""}
      <article class="pace-card"><div class="pace-card-head"><div><small>YOUR PACE GUIDE</small><h3>${esc(state.targetTime)} ${esc(state.distance)} target</h3></div><div class="pace-toggle" aria-label="Pace units"><button type="button" data-unit="km" class="${state.units === "km" ? "active" : ""}">MIN/KM</button><button type="button" data-unit="mi" class="${state.units === "mi" ? "active" : ""}">MIN/MILE</button></div></div><div class="pace-grid">${paceCells}</div></article>
      <div class="plan-header"><div><span class="eyebrow"><span></span>YOUR SCHEDULE</span><h3>${esc(plan.durationWeeks)} weeks to race day</h3></div><p>The schedule is fixed for this plan combination. Distances and paces below switch units, but the training itself does not change.</p></div>
      <div class="weeks-list">${weeks}</div>
      <div class="result-note"><strong>How to use this:</strong> Easy means conversational. Threshold should feel controlled and comfortably hard, not like a race. Interval repetitions are harder but repeatable. Warm up before quality work and cool down afterwards. If pain changes your stride, worsens as you run, or persists, stop and seek appropriate advice rather than trying to “complete the plan”.</div>`;
  }

  function showPlan() {
    const plan = selectedPlan(); if (!plan) { alert("We could not match that combination. Please check your answers."); return; }
    resultContent.innerHTML = planHtml(plan); resultSection.hidden = false; resultSection.scrollIntoView({ behavior: "smooth", block: "start" }); wireResult(plan);
  }
  function wireResult(plan) {
    document.getElementById("printPlan")?.addEventListener("click", () => window.print());
    document.getElementById("changeAnswers")?.addEventListener("click", () => { document.getElementById("builder").scrollIntoView({ behavior: "smooth" }); setStep(1); });
    resultContent.querySelectorAll("[data-unit]").forEach(btn => btn.addEventListener("click", () => { state.units = btn.dataset.unit; resultContent.innerHTML = planHtml(plan); wireResult(plan); }));
  }

  const menuButton = document.querySelector(".menu-button"), mobileNav = document.getElementById("mobileNav");
  menuButton?.addEventListener("click", () => { const open = menuButton.getAttribute("aria-expanded") === "true"; menuButton.setAttribute("aria-expanded", String(!open)); mobileNav.hidden = open; });
  mobileNav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { mobileNav.hidden = true; menuButton?.setAttribute("aria-expanded", "false"); }));
  window.addEventListener("beforeprint", () => document.querySelectorAll(".week-card").forEach(d => d.open = true));
  const counts = rawPlans.reduce((acc,p) => { acc[p[1]] = (acc[p[1]] || 0) + 1; return acc; }, {});
  if (rawPlans.length !== 156 || counts["5"] !== 36 || counts["10"] !== 36 || counts.H !== 36 || counts.M !== 48) console.error("Plan library integrity check failed.", { total: rawPlans.length, counts });
  setStep(1);
})();