# RunningPlans

A static, responsive running-plan website using the visual language of the existing RunningLeague project.

## What is included

- 156 fixed training schedules:
  - 36 × 5K
  - 36 × 10K
  - 36 × Half Marathon
  - 48 × Marathon
- Plan matching by race distance, available plan length, 3–6 runs per week and current weekly running volume
- Exact target-time input
- Training pace guide in min/km or min/mile
- Optional recent-race sense-check
- Automatic km ↔ mile distance conversion
- Print / Save as PDF support
- Responsive layouts
- No account or backend required

The 156 schedules are stored in `plans-data.js`. The browser does not invent a new schedule after the questionnaire. It selects one of those fixed schedules. Only pace/unit conversion and recent-race comparison are calculated in the browser.

## Plan matrix

| Distance | Plan lengths | Running days | Volume levels | Plans |
| --- | --- | --- | --- | ---: |
| 5K | 4 / 8 / 12 weeks | 3 / 4 / 5 / 6 | 3 | 36 |
| 10K | 4 / 8 / 12 weeks | 3 / 4 / 5 / 6 | 3 | 36 |
| Half Marathon | 8 / 12 / 16 weeks | 3 / 4 / 5 / 6 | 3 | 36 |
| Marathon | 8 / 12 / 16 / 20 weeks | 3 / 4 / 5 / 6 | 3 | 48 |
| **Total** | | | | **156** |

## Current-running bands

| Race | Low volume | Established | High volume |
| --- | ---: | ---: | ---: |
| 5K | 0–15 km | 16–30 km | 31+ km |
| 10K | 0–20 km | 21–35 km | 36+ km |
| Half Marathon | 0–25 km | 26–45 km | 46+ km |
| Marathon | 0–30 km | 31–50 km | 51+ km |

Mile inputs are converted to kilometres internally for matching.

## Training approach

The schedules mix easy running, long runs, controlled threshold work, intervals and race-specific running. Easier/cutback and taper weeks are included in longer plans, with conservative warnings where a selected race timeline is short relative to current volume.

Public guidance considered while shaping the plan language and guardrails:

- NHS Couch to 5K: https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/
- NHS running injury guidance: https://www.nhs.uk/live-well/exercise/knee-pain-and-other-running-injuries/
- England Athletics training pace guidance: https://www.englandathletics.org/news/simplifying-the-running-jargon-training-pace-2/
- England Athletics / RunTogether runner FAQs: https://www.englandathletics.org/runtogether/support/runner-frequently-asked-questions/

These are general-purpose plans rather than medical or individual coaching advice.

## Run locally

No build step is required.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

The repository is static and can be deployed directly to Vercel, Netlify, GitHub Pages or another static host.

## Files

- `index.html` — page structure
- `styles.css` — design system and responsive styling
- `app.js` — questionnaire, plan matching, pace calculations and results UI
- `plans-data.js` — all 156 fixed schedules
- `vercel.json` — static deployment settings
