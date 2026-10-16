# Charge Your Current: the landing page (how to change it)

Live path (gated): `wehale.io/campaign/charge-your-current`. Swedish draft: `.../sv`. The old `/recharge` redirects here (query string and code kept).
Target design: the flow review's "Landing page" screen (photo, lockup, one button, QR on desktop). Built on the existing campaign page; details in `docs/recharge/README.md`.
Link, code and store handoff: `HANDOFF.md`. Tracking, IDs needed, consent, privacy proposal: `TRACKING.md`.

## Change the words
`src/data/recharge.json`: `copy` (English), `copy_sv` (Swedish, overrides English word by word), `partner_name` (fills "made with {partner}"; today "our partner", set it when Isak says so).
Wording rules: "first month free" only with "for new members where eligible" (the fine print); no price or trial-length claims without Isak's legal OK.

## Swap the picture or film
The photo and film are confidential, so they are never in git. Files live in `public/recharge/` (ignored):
- `hero.webp` the landing photo (focus point: `hero.focus`). Local: `CAMPAIGN_HERO_SRC=<jpg> npm run media:local`. Production: Netlify variable `CAMPAIGN_MEDIA_HERO_URL` (a signed link, secret, Builds scope).
- `ink-long.mp4` + `ink-poster.webp` the ink film and its still. Used only when there is no `hero.webp`. Variables `CAMPAIGN_MEDIA_LOOP_URL`, `CAMPAIGN_MEDIA_POSTER_URL`.
- The partner logo: `public/recharge/partner-logo-white.local.png` (ignored); the committed file is a placeholder.

## Change the path
`route` in `src/data/recharge.json`. The edge function's literal paths in `netlify/edge-functions/recharge-gate.ts` must match (a test checks it) and so must the redirect in `netlify.toml`.

## The password
Set in Netlify, never in the repo: variable `RECHARGE_PASS` (secret). Without it the page answers 404. `gate.on: true` in `recharge.json` asks for it; the page is also `noindex`, out of the sitemap, no referrer.
**Remove the password (a separate yes from Isak):** set `gate.on` to `false`, merge, let Netlify deploy. The page stays noindex and unlisted: to make it findable later, drop `hidden` in `src/pages/[...campaign].astro`, the sitemap filter and the header hook in `astro.config.mjs`. Roll back: set `gate.on` back to `true`, or publish the last good deploy.

## Check before shipping
`npm test`, `npm run build`, `npx astro preview` then `node scripts/check-campaign-events.mjs` (no events before consent) and `node scripts/capture-campaign.mjs` (screenshots, performance).
