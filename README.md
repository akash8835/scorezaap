# ScoreZaap

Complete current production Cloudflare Worker for https://scorezaap.tech/.

The `index.js` module is the current production Cloudflare Worker source. It contains the application backend, page templates, CSS, browser JavaScript, multi-sport data logic, scorecards, news, SEO routes, push notification logic and Zaap assistant. The deployed Worker contains one JavaScript module and no separate static-asset bundle.

## Run and deploy

Requires Node.js and npm:

```sh
npm ci
npm run check
npm run dev
```

Authenticate Wrangler with the intended Cloudflare account before `npm run deploy`. The configuration records the existing production AI, D1 and KV bindings and both scheduled triggers. Do not point a development experiment at production storage.

**Source-control rule:** every production source change must be committed and pushed to this repository as part of the same deploy. Verify the commit is on `main` before calling a deploy complete. Never deploy a source edit that exists only in the Cloudflare dashboard or a local working tree.

## Secrets and state

Credentials are not included. The Worker expects these Cloudflare secrets as appropriate: `CRICKETDATA_KEY`, `CRON_SECRET`, `FOOTBALL_DATA_KEY`, `RAPIDAPI_KEY`, `VAPID_D`, `VAPID_X`, `VAPID_Y`. Their values remain in Cloudflare. The VAPID public key in the source is intentionally public, not a private signing key.

The repository is a source-code backup, not a database export. Existing D1 records, KV data, notification subscriptions and Cloudflare account secrets are not copied into GitHub. The checked configuration binds to the existing production resources. Moving to a different account also needs storage setup/migration, secret configuration and domain/route setup; cloning this repository alone does not transfer those resources.

## Source provenance

The exported production bundle is checked in without rewriting its application code. It is the complete production source, not the original pre-bundle development tree. Package files, README and Wrangler configuration are included for local use and deployment. Updating GitHub does not itself deploy the live site.
