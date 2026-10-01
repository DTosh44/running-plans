# Running Plans — project status

Last reviewed: 1 October 2026

## Purpose

Provide useful free running-planning/calculator tools and a paid £5.99 Running Profile that analyses recent Strava training and returns a personalised, clearly caveated report.

## Current state

The free tools are implemented. The Running Profile pre-payment workflow is substantially implemented: Strava connection, up-to-12-week analysis, data-quality checks, deterministic metrics, AI/fallback report generation, printable output and disconnect flow exist.

The paid journey is **not live end-to-end** because the Payhip verification step is not yet wired. Production report generation remains payment-gated.

## What works

- 5K, 10K, half-marathon and marathon plan finder.
- Race-date driven plan selection.
- Pace/time/distance calculator.
- VDOT/equivalent-performance/training-pace tools.
- km/mile support.
- Strava OAuth code and analysis flow.
- Structured training metrics and heart-rate estimates.
- AI report generation with deterministic fallback.
- Printable / Save as PDF report.
- Privacy-focused processing that avoids storing raw Strava streams.

## Live / deployment status

GitHub Pages can serve the static/free-tool preview. The full Running Profile requires Vercel or equivalent server functions.

No evidence currently supports describing the paid Running Profile as publicly launched.

## Current milestone

**Complete the £5.99 Running Profile purchase → verification → report journey.**

## Key decisions

- Introductory Running Profile price: £5.99.
- Payhip is the intended payment layer.
- Strava activity data is analysed transiently; raw streams are not persisted in the current design.
- OpenAI receives structured summary metrics rather than raw streams or identity.
- Training outputs are guidance, not medical assessment.

## Current blockers / dependencies

- Configure/test the real Strava application and callback.
- Implement Payhip paid-webhook verification and secure report-request correlation.
- Finalise controller/contact, retention wording and UK GDPR/privacy review.
- Run a real end-to-end paid test.

## Next actions

1. Configure the production Strava app/domain.
2. Verify OAuth, analysis and disconnect with the real deployment.
3. Implement Payhip purchase verification.
4. Bind verified purchase to the short-lived analysis/report request.
5. Complete privacy/controller wording.
6. Run an end-to-end £5.99 customer-style purchase and report test.

## Deferred / out of scope for this milestone

- subscription coaching;
- WhatsApp coaching;
- live coach messaging;
- social/community features;
- clinical or diagnostic claims;
- major new training products before the paid Running Profile works end-to-end.

## Handoff notes

Continue from the paid Running Profile milestone. Do not add major new features until payment, privacy and live Strava verification are complete.
