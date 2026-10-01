# Running Plans — repository instructions

## Read first

Before significant work, read:

1. `AGENTS.md`
2. `PROJECT.md`
3. `README.md`
4. the relevant implementation files

The user's latest explicit instruction overrides repository documentation.

## Product boundary

Running Plans combines free race-planning tools with a paid Running Profile product. The current commercial milestone is completing the Running Profile journey, not broadening into a general coaching platform.

Do not silently add subscriptions, live coaching, social features, medical claims or unrelated products. Record material scope changes in `PROJECT.md` first.

## Security and privacy

- Never commit Strava, OpenAI, Payhip or session secrets.
- Keep Strava tokens server-side in the existing encrypted HttpOnly session model.
- Do not send raw activity streams, GPS data, athlete identity or credentials to OpenAI.
- Preserve the current short-lived analysis-token approach unless an explicit architecture decision changes it.
- Treat heart-rate zones, threshold estimates and VO2-related outputs as training estimates, not clinical measurements.
- Public paid launch requires final privacy/controller/retention wording.

## Payments

Do not bypass the payment gate in production. `REPORT_TEST_MODE=true` is for controlled testing only.

A paid report must be generated only after a verified purchase flow. Do not trust browser-only payment state.

## Engineering rules

- Preserve the free plan finder, calculators and existing public tools.
- Keep deterministic analysis/report fallbacks working.
- Inspect before rewriting.
- Add tests where behaviour changes.
- Keep external provider failures honest and visible.
- Do not present unverified Strava/payment integrations as live.

## Documentation is part of done

Update `PROJECT.md` whenever the milestone, live state, blocker, privacy posture, payment flow or provider readiness materially changes.

Update `README.md` when stable setup, architecture or customer-facing behaviour changes.

## Handoff rule

At the start of a session: read `PROJECT.md`, inspect recent work, then continue from the recorded milestone.

Before ending: run appropriate checks, update `PROJECT.md`, and leave the next action clear.
