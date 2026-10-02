# /recharge: the campaign landing page, "Charge Your Current" (CONFIDENTIAL until launch)

The path is one config value, `route` in `src/data/recharge.json` (today `recharge`): the page
(`src/pages/[campaign].astro`), the sitemap exclusion, the noindex headers (written into `dist/_headers` at build,
`astro.config.mjs`) and the QR codes all follow it.

One "get the app" page (Isak, 29 Sep): the campaign session lives only in the WeHale app, so there is no web session
here. On the wehale.io look: the deep navy ground, a calm orb that breathes slowly (still with reduced motion), Nunito
Sans, one white pill; the campaign shows only as the small co-brand lockup and blackcurrant as a quiet accent.
The motion (Isak, 29 Sep: "more living"), all on the app's tokens and one 10 s breath (4 s in, 6 s out), started together
when the words arrive: a staggered entrance over about 1.2 s; the orb swells with its halo; one thin ripple leaves its
rim on each exhale; the cream pill (on a desktop the QR card) glows faintly with each inhale; a sparse field of motes rises
very slowly (a small 2D canvas, `src/scripts/recharge/motes.js`, loaded after arrival, paused in a hidden tab). With
Reduce Motion all of it is still. Check with `scripts/record-campaign.mjs` (recordings, 4x-throttled frame rate, first paint).

Every outside link and QR code of the campaign points here. The screen, in order: the lockup; "Charge Your Current"
and one line (a breathing session made for you, free in the WeHale app, yours to keep) with the guide and the length;
the offer, "Your first month free." (the prices are chosen in the app); **Get the app** (the OneLink with the code); the fine print,
"Cancel anytime before the trial ends." and that the free month is a trial through the App Store or Google Play. On a
desktop, a QR code of the same link replaces the button.

Files: `src/pages/[campaign].astro`, `src/scripts/recharge/{app,link}.js`, `src/styles/recharge.css`,
`src/data/recharge.json` (everything that changes, all the words), `scripts/recharge-qr.mjs`, `tests/recharge.test.js`.

## URL parameters
| Param | Meaning |
|---|---|
| `k` | the preview key (only while the gate is on); removed from the address bar once checked |
| `ch` | `newsletter`, `pdp`, `influencer`, `social` → `af_sub1` (anything else: `web`) |
| `c` | the code → `deep_link_value` (default `RECHARGE`); influencers' personal codes arrive this way |
| `utm_*`, `h`, `v`, `src` | the site's parameter contract (`src/scripts/contract.js`), as on /breathe |

The OneLink: `https://wehale.onelink.me/zcid?pid=<pid>&c=recharge&deep_link_value=<CODE>&af_sub1=<ch>`, plus
`af_channel` (utm_source), `af_ad` (utm_content), `af_adset` (h), `af_sub5` (`at=…;med=…;camp=…`). A
`utm_campaign` never replaces `c=recharge`. The app applies `deep_link_value` at sign-up (email, Apple, Google).
On desktop the page shows a QR code of the same link instead of the button (`af_sub5` `at=qr`). Nobody is ever asked to type a code.

## Codes (live on the server 29 Sep; the app side ships in 2.7.9)
| Channel | Code | How it arrives |
|---|---|---|
| newsletter | `RECHARGE` | `code.by_channel` (the link is just `?ch=newsletter`) |
| product page | the partner-named codes from the owner of main | `?c=` in their URL / QR code |
| influencer | their own code | `?c=` in their URL / QR code |

The product-page code contains the partner's name and this repo is public, so they are never committed:
they live in `channel-codes.json` in the confidential folder and reach the QR script as `RECHARGE_CODES=<file>`.

## Placeholders
- **pid:** `partner_campaign`, a config choice for the lead and the owner of main (`onelink.pid`).
- **Session:** the page names the app's campaign session from `session` in `recharge.json` (today the stand-in
  values, Edvin, 6 min). When the real session is set, update `narrator` and `minutes`, and `stand_in: false`.
- **Partner logo:** `public/recharge/partner-logo.svg` is a dashed placeholder (black, for a light ground) and
  `partner-logo-white.svg` (white, used on the page's navy). Replace the file (same name), or
  set `partner_logo.src`/`width`/`height`. The design session supplies the real lockup.

## The gate (until launch): obscurity, not security
- The page renders only with `?k=<key>`. The browser hashes `salt:key` (SHA-256) and compares it with
  `gate.sha256`; a miss replaces the page with the site's 404 (the HTTP status is still 200). The key is not in the
  repo; the lead holds it.
- Anyone who reads the page source or the JS bundle can see the page's text and bypass the check. The key only keeps
  the page from being stumbled on. Real protection needs the server: see `edge-gate.proposed.ts` (a Netlify Edge
  Function with basic auth, **proposed, not deployed**: it sits outside `netlify/edge-functions/` on purpose).
- Also: `noindex, nofollow` (meta and `X-Robots-Tag`), no referrer, out of the sitemap, no links from anywhere on the
  site. Deliberately **not** in robots.txt: a Disallow would name the path publicly and stop crawlers from seeing the noindex.
- To rotate the key: `printf '%s' "<salt>:<new key>" | shasum -a 256`, put the hash in `gate.sha256`.

## At launch
1. `gate.on: false` in `src/data/recharge.json` (the one flag).
2. If the page should then be findable: drop the `hidden` prop in `[campaign].astro`, the
   sitemap filter and the headers hook in `astro.config.mjs`. Otherwise leave them: the page works from its links and QR codes.

## QR codes
`RECHARGE_CODES=<channel-codes.json> node scripts/recharge-qr.mjs <outDir> [influencers.csv]`: newsletter, pdp, and one per influencer from a
CSV with `name,code` columns. Each QR code points at the page (`https://wehale.io/recharge?ch=…&c=…`), never
straight at a store, and shows the 404 until the gate is off.
