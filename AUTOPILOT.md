# ScoreZaap Autopilot

Standalone code in this repository, running on the existing Cloudflare account. This is bounded operations automation, not an unrestricted self-rewriting programmer.

## Components

- `autopilot.js`: checks existing cron completion records hourly when invoked by the guardian, retries at most one stalled job per invocation, 90-minute per-job cooldown and 10-minute lease. Repair actions call existing scores, football, news and enrichment routines. They do not erase saved data or change credentials, dependencies or source code.
- `guardian.js`: separately scheduled Worker checks homepage content, score/news schemas, sitemap and automation health. A separate Worker still runs when the main application throws errors. It cannot survive an account-wide Cloudflare outage or suspended account.
- Daily model-assisted preset review (guardian invocation at05:37 UTC,11:07 IST): at most one 64-output-token call per India calendar day to an existing Workers AI binding. It only selects a validated preset. It cannot execute model-generated code, URLs, shell commands or emails. Invalid/unavailable inference falls back without repeated calls. The free account's AI quota is shared with existing features.
- Seasonal presentation: fixed year-end and new-year windows, automatically expiring. Existing light/dark backgrounds, animations and functionality stay intact. Moving religious festivals are not guessed.
- `.github/workflows/check.yml` is an active pinned regression workflow, installed through the repository owner UI. Its first run could not start because GitHub returned an account-level billing restriction. The billing dashboard showed Free subscriptions, $0 current usage and no payment due; the restriction is not proof of debt. Tests still run locally before deployment. The workflow has read-only contents permission and no deployment secrets. `ops/github-ci-template.yml` is its reference copy.
- Cloudflare Workers Builds is an alternative test runner being configured as tests-only. Until an actual successful external run is recorded, independent CI is not proven. Model-generated code must never run in a credential-bearing build environment. No production auto-deploy is enabled by the tests-only configuration.

## Alerts

Only the guardian should get the email binding to avoid duplicate incidents. Configure its `AUTOPILOT_EMAIL_FROM`, `AUTOPILOT_EMAIL_TO` and `AUTOPILOT_EMAIL_CC` privately, plus `AUTOPILOT_EMAIL`. Destinations and the domain must meet the email provider's verification rules. `AUTOPILOT_ALERTS_ENABLED` must remain unset until domain/recipient readiness is verified, then be explicitly set to `true`. Until then sends return `held` without invoking the email binding. Never commit addresses, secret values or SMTP/API credentials. Provider acceptance is not proof of inbox delivery. No test email is sent automatically. An unchanged accepted incident is not re-mailed; verified recovery gets one update. Absent/failed delivery stays pending and visible in private status.

## Operator routes

Main Worker: `GET /api/autopilot/status`, `POST /api/autopilot/run`, optional `?mode=daily`. Guardian: `GET /status`, `POST /run`. All require the existing refresh credential in `x-refresh-token`, never a query string. Store the credential as a Worker secret, never in GitHub source. These routes contain operational state and are not public dashboards.

## Stop, rollback, limits

Set `AUTOPILOT_DISABLED=true` on each Worker to stop it. Seasonal CSS then returns empty; original design stays. Restore a previous tested deployment with Cloudflare's version rollback if needed. Source changes follow pull, test, commit/push, then deploy exactly the pushed source. The added D1 table is `sz_autopilot`; no existing table/data is deleted.

Routine checks use zero LLM tokens. One daily small inference is capped, but model availability is not guaranteed and this does not create additional free tokens. No paid plan or prepaid credits are enabled. A model rate-limit/quota failure is a fallback, not permission to spend.

Major/unclassified defects, upstream bad data, arbitrary new features, inaccessible providers and new code repairs still require a capable maintainer. This system does not promise to solve every bug, invent new features every day or make untested production code edits. Weekly review should inspect private status, outstanding alerts, provider freshness and deployment health. Keep existing protection until live independent execution and email delivery have been verified.
