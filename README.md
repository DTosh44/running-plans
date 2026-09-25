# RunningPlans

RunningPlans combines free race-planning tools with a paid Running Profile product.

## Public tools

- Personalised 5K, 10K, half-marathon and marathon plan finder
- Race-date driven plan selection with pre-plan lead-in guidance
- Pace / time / distance calculator
- VDOT estimate, equivalent race performances and training pace ranges
- km / mile support throughout

## Running Profile — £5.99 introductory price

The Vercel backend now supports the full pre-payment workflow:

1. Explicit consent to process Strava activity and heart-rate data
2. Strava OAuth connection using `activity:read_all`
3. Automatic analysis of up to 12 weeks of running
4. Data-quality / confidence check before a report can be produced
5. Deterministic calculations for:
   - weekly running volume and trend
   - runs per week and consistency
   - longest run
   - heart-rate coverage
   - estimated threshold heart rate
   - five estimated training zones
   - time spent in each zone
   - pace at comparable easy heart rates / aerobic-efficiency trend
6. Structured Running Profile generation using the OpenAI Responses API
7. Deterministic report fallback if no OpenAI key is configured
8. Printable / Save as PDF report
9. Strava deauthorisation / disconnect
10. Privacy page explaining the current processing and retention model

The £5.99 Payhip checkout is deliberately not wired yet. In normal production mode `/api/report/generate` returns a payment-required response. Set `REPORT_TEST_MODE=true` only while testing your own reports.

## Privacy-by-design choices

- Raw Strava streams are processed in memory and are not written to a database in the current version.
- The analysis requests time, distance, heart rate, speed, cadence and altitude streams; it does not request the lat/lng stream.
- The browser receives calculated summary metrics, not raw heart-rate streams.
- OpenAI receives structured summary metrics rather than raw activity streams, GPS data, Strava tokens or the athlete name.
- Strava access/refresh tokens are kept in an encrypted HttpOnly session cookie, not browser JavaScript.
- Signed analysis data expires after approximately 20 minutes.
- The current report backend does not permanently store the generated report.
- A final controller identity/contact, retention wording and UK GDPR privacy review are still required before public paid launch.

## Vercel setup

GitHub Pages remains useful as a static preview of the free tools and an example Running Profile. The live Strava workflow requires Vercel (or another host that can run the `/api` server functions).

Add these environment variables in Vercel:

```
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
SESSION_SECRET=
OPENAI_API_KEY=
OPENAI_REPORT_MODEL=gpt-6-luna
REPORT_TEST_MODE=false
PUBLIC_BASE_URL=https://your-production-domain
```

Generate a long random value for `SESSION_SECRET`. Do not commit real keys.

### Strava application

Create/manage the Strava API app at Strava's API settings page.

For the app:
- Set its callback/authorization domain to the hostname of your Vercel/custom domain.
- The site requests `activity:read_all` so a runner can choose to include private activities in the analysis.
- New Strava apps start in single-player mode, so the first integration can be tested against your own Strava account before applying for wider athlete access.

The OAuth callback used by RunningPlans is:

```
https://YOUR-DOMAIN/api/strava/callback
```

### OpenAI

The report uses the Responses API with Structured Outputs. If `OPENAI_API_KEY` is absent or an API request fails, RunningPlans generates a deterministic report from the calculated metrics instead.

## Payhip integration point

The intended final flow is:

```
Connect Strava
→ Analyse 12 weeks
→ Confirm enough data
→ Pay £5.99 via Payhip
→ Payhip paid webhook verifies purchase
→ /api/report/generate
→ Running Profile
```

The analysis endpoint already returns a short-lived signed `analysisToken`. Payhip will be added between the data-quality screen and report generation, with a report-request identifier passed through checkout metadata and verified by webhook.

## Repository structure

- `index.html` — public site and product UI
- `styles.css` — shared design system
- `app.js` — training-plan builder
- `plans-data.js` — training-plan schedules
- `calculators.js` — pace and VDOT calculators
- `profile.js` — Running Profile browser flow
- `privacy.html` — Strava/privacy explanation
- `api/strava/*` — OAuth, status, analysis and disconnect endpoints
- `api/report/generate.js` — report generation gate
- `lib/analysis.js` — deterministic Strava analysis
- `lib/report.js` — structured AI/fallback report writing
- `lib/session.js` — encrypted session and signed analysis tokens
- `lib/strava.js` — Strava API helper functions
- `.env.example` — server configuration template
- `vercel.json` — static + server-function deployment settings

## Important

The Running Profile is training guidance, not medical advice, a laboratory VO₂ max test or a clinical heart-rate assessment. Heart-rate zones are explicitly presented as estimates from historic running data.
