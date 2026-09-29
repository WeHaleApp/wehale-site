# wehale.io environment variables

Every tag on the site is driven by a Netlify environment variable. **A missing variable means that tag stays off**, and
nothing blocks a release (SITE-GOALS §5). Set them in Netlify → Site configuration → Environment variables, context
**Production** (add **Deploy previews** too when testing), then trigger a new deploy: `PUBLIC_*` values are built into
the pages, and the server flags are read at build time.

Nothing loads before consent: GTM and the pixels load only after the visitor accepts in the banner. The banner shows
whenever a tag is configured, which, with the GTM fallback, is always. Code: `src/scripts/tags.js`, `src/scripts/consent.js`,
`netlify/functions/meta-capi.cjs`, `netlify/functions/tiktok-events.cjs`.

| Variable | What it does | Where Isak gets it | Scope | Secret |
|---|---|---|---|---|
| `PUBLIC_GTM_ID` | Google Tag Manager container (GA4 inside it), loaded in Consent Mode v2 after the visitor accepts site or ad measurement. Unset: today's container `GTM-NCPSJ2QF` (see note below). | tagmanager.google.com → the WeHale container → the ID top right (`GTM-…`) | Builds | No |
| `PUBLIC_META_PIXEL_ID` | The Meta Pixel in the browser, after ad consent. Unset: no Meta request at all. | Meta Events Manager → Data sources → the WeHale dataset → Settings → Dataset ID | Builds | No |
| `META_PIXEL_ID` | The same dataset ID, for the server copy (Conversions API). | as above | Builds, Functions | No |
| `META_CAPI_TOKEN` | The Conversions API token: server copies of the pixel events with the same `event_id` (de-duplicated). Needs `META_PIXEL_ID` and `PUBLIC_META_PIXEL_ID`. | Events Manager → the dataset → Settings → Conversions API → Generate access token | Builds, Functions | **Yes** |
| `PUBLIC_TIKTOK_PIXEL_ID` | The TikTok Pixel in the browser, after ad consent. Unset: no TikTok request at all. | TikTok Ads Manager → Tools → Events → Web events → the pixel → Pixel ID (the pixel code) | Builds | No |
| `TIKTOK_PIXEL_ID` | The same pixel code, for the server copy (Events API). | as above | Builds, Functions | No |
| `TIKTOK_EVENTS_TOKEN` | The TikTok Events API access token: server copies with the same `event_id`. Needs `TIKTOK_PIXEL_ID` and `PUBLIC_TIKTOK_PIXEL_ID`. | TikTok Events Manager → the pixel → Settings → Events API → Generate access token | Builds, Functions | **Yes** |

**Why the tokens need the Builds scope too:** the pages ask the server for a copy only when the token existed at build
time (the build writes a true/false flag into the page, never the token). With the Functions scope only, the functions
work but the pages never call them.

Optional, only while testing (remove afterwards):

| Variable | What it does |
|---|---|
| `PUBLIC_META_TEST_EVENT_CODE` | Meta Events Manager → Test events code (`TEST12345`); `?fbtest=TEST12345` on a URL does the same for one visit. |
| `PUBLIC_TIKTOK_TEST_EVENT_CODE` | TikTok Events Manager → Test events code; `?tttest=…` on a URL does the same. |
| `PUBLIC_BREATHE_OFFER_URL` | /breathe's live completion-offer read (owner of main; unchanged from PR #3). |

**GTM fallback:** when `PUBLIC_GTM_ID` is unset, the site uses today's container `GTM-NCPSJ2QF` (the lead's decision).
It is strictly safer than before: the old layout loaded it on every page without consent; now it loads only after the
visitor accepts, in Google Consent Mode v2 with everything denied by default. Because GTM always has an ID, the consent
banner now shows on every first visit. Set `PUBLIC_GTM_ID` only to switch containers.

**In GTM (tracking session):** the container must respect consent: GA4 tags with built-in consent checks (they are, by
default, for Consent Mode v2), and no other tag that fires without `analytics_storage` or `ad_storage` granted. The site
pushes its events to the `dataLayer` with the names in `docs/breathe/MEASUREMENT.md`.
