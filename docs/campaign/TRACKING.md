# Marketing tracking on the campaign page

All of it exists and is consent-gated (`src/scripts/consent.js`, `tags.js`, `breathe/measure.js`). **Nothing loads or is sent before the visitor accepts.**
The settings file is the site's Netlify environment (`docs/ENV.md`): a missing value means that tag stays off. IDs are never invented; none are in the repo.

## What I need from Isak (nothing blocks the launch; each missing one just stays off)
| Need | Where | Variable |
|---|---|---|
| Meta pixel (dataset) ID | Events Manager -> Data sources -> dataset -> Settings | `PUBLIC_META_PIXEL_ID` and `META_PIXEL_ID` |
| Meta Conversions API token (secret) | same dataset -> Conversions API -> Generate token | `META_CAPI_TOKEN` |
| TikTok pixel code | TikTok Events Manager -> Web events | `PUBLIC_TIKTOK_PIXEL_ID` and `TIKTOK_PIXEL_ID` |
| TikTok Events API token (secret) | same pixel -> Events API | `TIKTOK_EVENTS_TOKEN` |
| Google tag | already in: GTM container (GA4 inside), Consent Mode v2 | `PUBLIC_GTM_ID` only to switch |
| AppsFlyer OneLink | already in: template `zcid`, pid `partner_campaign` (`src/data/recharge.json` `onelink`) | confirm pid; Isak/measurement lead may change it |

**AppsFlyer web SDK / Smart Script: not added (recommendation).** The OneLink click already attributes web -> install. The web SDK adds weight and one more consent surface for little gain here.

## Events (names the pixels and GTM see)
`PageView` (pixels' own), `CampaignView` (arrival; Meta/TikTok `ViewContent`-equivalent custom event), `AppTap` + `Lead` (tap on the button; Lead is the standard event to optimise for), `StoreOpened` (inferred, not proof of install), `InAppHint` / `InAppCopy`. Meta and TikTok get a server copy with the same `event_id` when the tokens are set (Conversions API plan: done in code, off until tokens exist).
UTM handling: `utm_*`, `h`, `v`, `src` are read (`src/scripts/contract.js`), put on every event, and passed into the OneLink (`af_channel`, `af_ad`, `af_adset`, `af_sub5`). `fbclid` / `ttclid` are not passed on. A `utm_campaign` never replaces the campaign.

## Consent
Banner: Accept / Decline / Settings (analytics and ads apart); stored in localStorage `wehale.consent.v1`; Google Consent Mode v2 denied by default. Local run with no consent / late consent / in-app browser: `docs/recharge/evidence/events-local-run.txt`, `node scripts/check-campaign-events.mjs`.

## Privacy policy: proposal only (Isak's legal OK, not applied)
Section 11 already names Google Analytics and Meta/TikTok measurement behind the banner. Proposed additions: (1) say the campaign page also sends a *server copy* of those events (Meta Conversions API, TikTok Events API) after the same consent; (2) name `wehale.onelink.me` (AppsFlyer) as the host the button goes to, which sets its own identifiers; (3) one line on the campaign code, "a code in the link tells us which campaign you came from". Nothing changes on the site until Isak says yes.
