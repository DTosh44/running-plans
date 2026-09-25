function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * p));
  const lower = Math.floor(index), upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function median(values) {
  return percentile(values, 0.5);
}

function paceFromSpeed(speedMetresPerSecond) {
  return speedMetresPerSecond > 0 ? 1000 / speedMetresPerSecond : null;
}

function formatPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return null;
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}/km`;
}

function bestTwentyMinuteAverage(time, hr) {
  if (!Array.isArray(time) || !Array.isArray(hr) || time.length !== hr.length || !time.length) return null;
  const points = [];
  for (let i = 0; i < time.length; i += 1) {
    const value = Number(hr[i]), t = Number(time[i]);
    if (Number.isFinite(value) && value >= 50 && value <= 230 && Number.isFinite(t)) points.push([t, value]);
  }
  if (points.length < 300 || points[points.length - 1][0] - points[0][0] < 1140) return null;
  let start = 0, sum = 0, best = null;
  for (let end = 0; end < points.length; end += 1) {
    sum += points[end][1];
    while (start < end && points[end][0] - points[start][0] > 1200) {
      sum -= points[start][1];
      start += 1;
    }
    const duration = points[end][0] - points[start][0];
    if (duration >= 1140) {
      const average = sum / (end - start + 1);
      if (best === null || average > best) best = average;
    }
  }
  return best;
}

function zoneForHeartRate(hr, threshold) {
  if (hr <= threshold * 0.84) return 0;
  if (hr <= threshold * 0.89) return 1;
  if (hr <= threshold * 0.94) return 2;
  if (hr <= threshold * 0.99) return 3;
  return 4;
}

function mondayIso(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function analyseRunning(activities, streamedRuns, windowDays = 84) {
  const now = Date.now();
  const startMs = now - windowDays * 86400000;
  const windowWeeks = Math.round(windowDays / 7);
  const runs = activities
    .map(activity => ({
      id: activity.id,
      date: new Date(activity.start_date || activity.start_date_local).getTime(),
      distanceKm: Number(activity.distance || 0) / 1000,
      movingSeconds: Number(activity.moving_time || 0),
      elapsedSeconds: Number(activity.elapsed_time || 0),
      elevationM: Number(activity.total_elevation_gain || 0),
      averageHr: Number(activity.average_heartrate || 0) || null,
      maxHr: Number(activity.max_heartrate || 0) || null,
      averageSpeed: Number(activity.average_speed || 0) || null,
      hasHeartrate: Boolean(activity.has_heartrate),
      sportType: activity.sport_type || activity.type || 'Run'
    }))
    .filter(run => Number.isFinite(run.date) && run.date >= startMs && run.distanceKm > 0.1)
    .sort((a, b) => a.date - b.date);

  const totalDistanceKm = runs.reduce((sum, run) => sum + run.distanceKm, 0);
  const totalMovingHours = runs.reduce((sum, run) => sum + run.movingSeconds, 0) / 3600;
  const longestRunKm = runs.length ? Math.max(...runs.map(run => run.distanceKm)) : 0;
  const averageRunKm = runs.length ? totalDistanceKm / runs.length : 0;
  const activeWeeksSet = new Set(runs.map(run => mondayIso(run.date)));
  const activeWeeks = activeWeeksSet.size;

  const weekly = Array.from({ length: windowWeeks }, (_, index) => {
    const bucketStart = new Date(startMs + index * 7 * 86400000);
    return { weekStart: bucketStart.toISOString().slice(0, 10), distanceKm: 0, runs: 0 };
  });
  for (const run of runs) {
    const index = Math.max(0, Math.min(windowWeeks - 1, Math.floor((run.date - startMs) / (7 * 86400000))));
    weekly[index].distanceKm += run.distanceKm;
    weekly[index].runs += 1;
  }
  weekly.forEach(item => { item.distanceKm = round(item.distanceKm, 1); });

  const previousFour = weekly.slice(-8, -4);
  const recentFour = weekly.slice(-4);
  const avg = list => list.length ? list.reduce((sum, item) => sum + item.distanceKm, 0) / list.length : 0;
  const previousFourKm = avg(previousFour);
  const recentFourKm = avg(recentFour);
  const volumeTrendPct = previousFourKm > 0 ? ((recentFourKm - previousFourKm) / previousFourKm) * 100 : null;

  const allHr = [];
  const twentyMinuteBest = [];
  let hrSampleSeconds = 0;
  const streamRecords = [];

  for (const record of streamedRuns) {
    const streams = record.streams || {};
    const time = streams.time && streams.time.data;
    const heart = streams.heartrate && streams.heartrate.data;
    const velocity = streams.velocity_smooth && streams.velocity_smooth.data;
    if (!Array.isArray(time) || !Array.isArray(heart) || time.length !== heart.length) continue;

    for (let i = 0; i < heart.length; i += 5) {
      const value = Number(heart[i]);
      if (Number.isFinite(value) && value >= 50 && value <= 230) allHr.push(value);
    }
    const best = bestTwentyMinuteAverage(time, heart);
    if (best) twentyMinuteBest.push(best);

    for (let i = 1; i < time.length; i += 1) {
      const hr = Number(heart[i]);
      const dt = Math.min(10, Math.max(0, Number(time[i]) - Number(time[i - 1])));
      if (Number.isFinite(hr) && hr >= 50 && hr <= 230) hrSampleSeconds += dt;
    }

    streamRecords.push({
      date: new Date(record.activity.start_date || record.activity.start_date_local).getTime(),
      time,
      heart,
      velocity: Array.isArray(velocity) && velocity.length === heart.length ? velocity : null
    });
  }

  const observedMaxHr = allHr.length ? Math.round(percentile(allHr, 0.995)) : null;
  const bestSorted = twentyMinuteBest.sort((a, b) => b - a).slice(0, 3);
  let thresholdHr = bestSorted.length ? Math.round(median(bestSorted)) : null;
  if (thresholdHr && observedMaxHr) thresholdHr = Math.min(thresholdHr, observedMaxHr - 1);

  let zones = null;
  let distribution = null;
  let efficiency = null;

  if (thresholdHr) {
    const bounds = [
      { name: 'Recovery', min: null, max: Math.round(thresholdHr * 0.84) },
      { name: 'Easy / aerobic', min: Math.round(thresholdHr * 0.84) + 1, max: Math.round(thresholdHr * 0.89) },
      { name: 'Steady', min: Math.round(thresholdHr * 0.89) + 1, max: Math.round(thresholdHr * 0.94) },
      { name: 'Threshold', min: Math.round(thresholdHr * 0.94) + 1, max: Math.round(thresholdHr * 0.99) },
      { name: 'High intensity', min: Math.round(thresholdHr * 0.99) + 1, max: observedMaxHr }
    ];
    zones = bounds;

    const secondsByZone = [0, 0, 0, 0, 0];
    const midpoint = startMs + windowDays * 86400000 / 2;
    const olderPaces = [];
    const recentPaces = [];

    for (const record of streamRecords) {
      for (let i = 1; i < record.time.length; i += 1) {
        const hr = Number(record.heart[i]);
        const dt = Math.min(10, Math.max(0, Number(record.time[i]) - Number(record.time[i - 1])));
        if (!Number.isFinite(hr) || hr < 50 || hr > 230 || !dt) continue;
        const zone = zoneForHeartRate(hr, thresholdHr);
        secondsByZone[zone] += dt;

        if (zone === 1 && record.velocity && i % 5 === 0) {
          const speed = Number(record.velocity[i]);
          const pace = paceFromSpeed(speed);
          if (pace && pace >= 150 && pace <= 900) {
            (record.date < midpoint ? olderPaces : recentPaces).push(pace);
          }
        }
      }
    }

    const totalZoneSeconds = secondsByZone.reduce((sum, value) => sum + value, 0);
    distribution = secondsByZone.map((seconds, index) => ({
      name: bounds[index].name,
      hours: round(seconds / 3600, 1),
      percent: totalZoneSeconds ? round(seconds / totalZoneSeconds * 100, 1) : 0
    }));

    if (olderPaces.length >= 100 && recentPaces.length >= 100) {
      const older = median(olderPaces), recent = median(recentPaces);
      efficiency = {
        olderPaceSecPerKm: Math.round(older),
        recentPaceSecPerKm: Math.round(recent),
        olderPace: formatPace(older),
        recentPace: formatPace(recent),
        changeSecPerKm: Math.round(recent - older)
      };
    }
  }

  const hrRunCount = streamedRuns.length;
  const hrCoveragePct = runs.length ? hrRunCount / runs.length * 100 : 0;
  let confidence = 'Limited';
  if (runs.length >= 24 && activeWeeks >= 8 && hrRunCount >= 16 && hrSampleSeconds >= 8 * 3600) confidence = 'High';
  else if (runs.length >= 12 && activeWeeks >= 6 && hrRunCount >= 6 && hrSampleSeconds >= 3 * 3600) confidence = 'Moderate';

  const easyPercent = distribution ? distribution[0].percent + distribution[1].percent : null;
  const hardPercent = distribution ? distribution[3].percent + distribution[4].percent : null;

  const insights = [];
  if (volumeTrendPct !== null) {
    if (volumeTrendPct > 15) insights.push(`Recent weekly volume is up about ${Math.round(volumeTrendPct)}% versus the previous four weeks.`);
    else if (volumeTrendPct < -15) insights.push(`Recent weekly volume is down about ${Math.abs(Math.round(volumeTrendPct))}% versus the previous four weeks.`);
    else insights.push('Recent weekly volume is broadly stable compared with the previous four weeks.');
  }
  if (easyPercent !== null) {
    if (easyPercent < 60) insights.push('A relatively large share of recorded heart-rate time sits above the estimated easy range.');
    else if (easyPercent > 80) insights.push('Most recorded heart-rate time sits in the estimated recovery/easy ranges.');
    else insights.push('Recorded heart-rate time shows a mixed easy and quality-intensity profile.');
  }
  if (efficiency) {
    if (efficiency.changeSecPerKm <= -8) insights.push(`Pace at a comparable easy heart rate improved by about ${Math.abs(efficiency.changeSecPerKm)} sec/km across the 12-week window.`);
    else if (efficiency.changeSecPerKm >= 8) insights.push(`Pace at a comparable easy heart rate slowed by about ${efficiency.changeSecPerKm} sec/km across the 12-week window.`);
    else insights.push('Pace at a comparable easy heart rate has been broadly stable.');
  }

  const eligible = runs.length >= 8 && activeWeeks >= 4;
  const heartRateEligible = thresholdHr !== null && hrRunCount >= 4;

  return {
    periodDays: windowDays,
    generatedAt: new Date().toISOString(),
    eligibility: {
      eligible,
      heartRateEligible,
      confidence,
      reason: !eligible
        ? 'We need at least 8 runs across 4 active weeks for a useful Running Profile.'
        : heartRateEligible
          ? 'There is enough running and heart-rate data for a detailed profile.'
          : 'There is enough running data for a training profile, but heart-rate analysis will be limited.'
    },
    dataQuality: {
      runs: runs.length,
      activeWeeks,
      heartRateRuns: hrRunCount,
      heartRateCoveragePct: round(hrCoveragePct, 0),
      heartRateHours: round(hrSampleSeconds / 3600, 1)
    },
    training: {
      totalDistanceKm: round(totalDistanceKm, 1),
      averageWeeklyKm: round(totalDistanceKm / windowWeeks, 1),
      averageRunsPerWeek: round(runs.length / windowWeeks, 1),
      totalMovingHours: round(totalMovingHours, 1),
      longestRunKm: round(longestRunKm, 1),
      averageRunKm: round(averageRunKm, 1),
      recentFourWeekAverageKm: round(recentFourKm, 1),
      previousFourWeekAverageKm: round(previousFourKm, 1),
      volumeTrendPct: volumeTrendPct === null ? null : round(volumeTrendPct, 0),
      consistencyPct: round(activeWeeks / windowWeeks * 100, 0),
      weekly
    },
    heartRate: {
      observedMaxHr,
      estimatedThresholdHr: thresholdHr,
      zones,
      distribution,
      easyPercent: easyPercent === null ? null : round(easyPercent, 1),
      hardPercent: hardPercent === null ? null : round(hardPercent, 1)
    },
    aerobicEfficiency: efficiency,
    insights
  };
}

module.exports = { analyseRunning };
