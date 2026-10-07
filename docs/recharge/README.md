# /recharge: the campaign landing page, "Charge Your Current" (CONFIDENTIAL until launch)

The path is one config value, `route` in `src/data/recharge.json` (today `recharge`): the page
(`src/pages/[campaign].astro`), the sitemap exclusion, the noindex headers (written into `dist/_headers` at build,
`astro.config.mjs`) and the QR codes all follow it.

One "get the app" page (Isak, 29 Sep): the campaign session lives only in the WeHale app, so there is no web session here.
On the app's ink design (7 Oct): it looks like the app's Ready and offer screens. The campaign's `ink_long` loop is the ground
(`public/recharge/ink-long.mp4`, 2.1 MB, with its still `ink-poster.webp`, 15 kB), under the app's veil; Nunito Sans; the words in
a block at the bottom; one lilac pill with a deep violet label (`#C9B6F2` / `#150C2B`, the app's Start now). Dark by design in every colour scheme.
- The poster is the first paint and the Reduce Motion picture. The loop is added only after the page has loaded and never for Reduce
  Motion or Save-Data, and fades in over the poster, so there is no jump. The words are in the HTML from the first byte; they rise
  in over about a second (CSS only, off with Reduce Motion).
- A desktop (a mouse and 700 px or more, decided in CSS so nothing moves) shows a QR code of the same link in a glass card instead of
  the pill; a phone shows the pill.
- Evidence: `scripts/capture-campaign.mjs` (screenshots at 390, 768 and 1280 px, light and dark, Reduce Motion, a recording,
  and throttled performance numbers) writes `docs/recharge/evidence/`.

The screen, in order: the lockup (WeHale × the partner); "Charge Your Current" and the ritual (three beats); the offer, "Your first month
of WeHale free." (the second line of the hook; the prices are chosen in the app) and "Only through this link."; **Start in the app** (the OneLink
with the code); the fine print, "Cancel anytime before the trial ends." On a desktop, the QR code and "Only through this code." replace the pill.

Files: `src/pages/[campaign].astro`, `src/scripts/recharge/{app,link}.js`, `src/styles/recharge.css`,
`src/data/recharge.json` (everything that changes, all the words), `netlify/edge-functions/recharge-gate.ts`, `scripts/recharge-qr.mjs`,
`scripts/capture-campaign.mjs`, `tests/recharge*.test.js`.

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

## The gate (until launch): a server-side password
`netlify/edge-functions/recharge-gate.ts`, a Netlify Edge Function on `/recharge`, `/recharge.html` and `/recharge/*` (the page
and all its media). Without the password the server sends a one-field form (401), never the page or its files. One shared
password, for the team and for outside people.
- The password is the Netlify variable **`RECHARGE_PASS`**. It is never in the repo. If it is missing, the page answers 404 (closed).
- The one flag is `gate.on` in `src/data/recharge.json`: `true` asks for the password, `false` opens the page (launch).
- A right password sets a signed cookie, `wehale_rc` (HttpOnly, Secure, SameSite=Lax, 7 days; signed with the password, so changing
  the password signs everybody out) and returns to the same address with its query string, so a QR code or a link carrying
  `?ch=` and `&c=` keeps working. A form and a cookie, not the browser's basic-auth box: it types well on a phone and works in
  in-app browsers. `Authorization: Basic` (any user name) is also accepted, for curl.
- The OneLink and the stores are other hosts: the gate is never between the button and the app. Nothing on the page's way to
  AppsFlyer changes.
- Also: `noindex, nofollow, noarchive` (meta and `X-Robots-Tag`, also on the form), no referrer, out of the sitemap, no links from
  anywhere. Deliberately **not** in robots.txt: a Disallow would name the path publicly.
- Not in the gate: `/_astro/*` (shared site code, not the campaign) and the other pages.
- Limits, honestly: one password for everyone, no per-person revocation (change `RECHARGE_PASS` to sign everybody out), no
  rate limit beyond a 0.4 s delay on a wrong guess. Enough for a confidential preview; not for secrets.

Test it locally (Deno, the same runtime as Netlify's edge; changes nothing online):
`npm run build && RECHARGE_PASS='a test password' npx deno run -A scripts/recharge-gate-local.ts` then
`curl -i localhost:8899/recharge` (401 form), `curl -d 'password=...' -c jar localhost:8899/recharge` (303 and cookie),
`curl -b jar localhost:8899/recharge` (the page). `npm test` covers it too (`tests/recharge-gate.test.js`).

### Turn it on in Netlify (Isak logs in; needs his yes first)
1. Netlify → the WeHale site → **Site configuration** → **Environment variables** → **Add a variable** → **Add a single variable**.
2. Key `RECHARGE_PASS`; value: the password you choose (not in chat or the repo); tick **Contains secret values**; scopes: all scopes (including Functions and Runtime);
   deploy contexts: all (production, deploy previews, branch deploys), **Save variable**.
3. Merge this branch (the function ships with it; `gate.on` is `true`). Netlify redeploys.
4. Verify on the live site, from a phone and a laptop that never had the cookie (a private window): `/recharge` shows the
   password form, `/recharge/bloom-720.webp` shows the form, a wrong password stays on the form, the right one shows the page,
   and `/breathe` is untouched. Only then is the page safe to share.
The first real run of the function is that deploy; locally it has run in Deno and in the unit tests, not on Netlify itself.
Rollback: delete the variable (the page then answers 404) or revert the merge.

## Measurement (item 5)
Events follow the app repo's `docs/…/MEASUREMENT.md` (the funnel) and the site's contract (`src/scripts/contract.js`, `src/scripts/tags.js`): nothing is sent before the
visitor's yes (Consent Mode v2 denied by default; GTM, Meta and TikTok load only after consent, and the pixels stay keyless until `PUBLIC_*_PIXEL_ID` are set).
Every event carries the contract (`source`, `utm_*`, `h`, `v`, `src`) plus `session`, `page: recharge`, `campaign: recharge`, `ch`, `code`, `device`, `inapp`.
| Event | When | Notes |
|---|---|---|
| `PageView` | the pixels' own, once, after ads consent | as on every page |
| `CampaignView` | on arrival (or when consent arrives later) | `at` = `offer` (phone) or `qr` (desktop) |
| `AppTap` + `Lead` | the tap on "Start in the app" | `completed: 0`; Lead is the standard event Meta can optimise for |
| `StoreOpened` | the page is hidden within 5 s of the tap | **inferred** (`inferred: 1`): the store or the app took over; not proof of an install (AppsFlyer is) |
| `InAppHint`, `InAppCopy` | the in-app fallback shown / "Copy link" tapped | only when the hint is on |
A desktop visitor scans the QR code with a phone: that scan is not seen by the page, only by AppsFlyer (the link's `at=qr`) and by the app. Tester mode (`#test=`) measures nothing.
One local run, with consent given, late, never, in Instagram's browser and in tester mode: `docs/recharge/evidence/events-local-run.txt` (`node scripts/check-campaign-events.mjs`).
**What the page sets** (Isak and the measurement lead write the cookie wording): the page itself sets no cookie; `localStorage` `wehale.consent.v1` (the visitor's choice);
while the gate is on, the cookie `wehale_rc` (functional: HttpOnly, Secure, 7 days, only after the password); after "Accept" the tags set `_ga*` (GA via GTM), `_fbp`/`_fbc`
(Meta), `_ttp` (TikTok). The OneLink's host (`wehale.onelink.me`, AppsFlyer) sets its own when the button is followed. `code` is a campaign string (an influencer's code), no person's data.

## In-app browsers (item 4)
Influencer and newsletter traffic often opens inside Instagram, TikTok, Facebook, Snapchat, LinkedIn or X, which use their own web view. There, a OneLink often does not hand over
to the app or the store as it does from Safari or Chrome (iOS Universal Links are not followed in web views; Android intents can be blocked). The page cannot fix that, but it can say so:
`inAppBrowser(ua)` (`link.js`) names those browsers and unnamed web views; the page then shows a quiet line and a **Copy link** button ("Opened inside Instagram? For the best result, open this page in Safari." /
"Link copied. Paste it in Safari."). The words are **proposed** and the hint is **off** (`inapp.on: false` in `recharge.json`) until Isak picks them; `?inapp=1` previews it (`evidence/page-390-inapp-hint-preview.jpg`).
The button and the QR code stay as they are. A QR code is scanned by the phone's camera, which opens the system browser, so the QR path avoids the problem.
| Browser | Tested | How |
|---|---|---|
| Instagram, Facebook, TikTok, Snapchat, unnamed web view (user agent detection) | yes, in unit tests (`tests/recharge.test.js`) and a headless run with Instagram's user agent | detection, hint, copy |
| The OneLink hand-over inside those apps | **no, needs a phone** (phone-test list in `LINK-MATRIX.md`) | whether the store/app opens |
| Safari, Chrome (desktop, in the pane), Chrome with an iPhone user agent | yes | page, button, QR |
| Mail apps (Gmail, Apple Mail, Outlook) | no | most open the system browser or a Custom Tab/SFSafariViewController, which cannot be told apart by user agent |
| Real Android Chrome / iPhone Safari | **no, needs a phone** | |

## At launch (item 7)
Before: (1) the gate verified on the live address (steps above) and the phone tests in `LINK-MATRIX.md` passed; (2) Isak has picked the copy (`SPRINT-NOTES.md` proposals) and the
in-app hint (`inapp.on`); (3) the partner's real logo and the real session are in (`stand_in: false`); (4) the Android deep-link question answered (AppsFlyer, Isak); (5) the cookie wording and
privacy text cover what the page sets (above), and pixel keys are set if wanted; (6) the codes for pdp and influencers exist on the server.
Flip: **one flag**, `gate.on: false` in `src/data/recharge.json`, merge, let Netlify deploy. The edge function then lets everyone through (it stays in place; `RECHARGE_PASS` can stay). The page stays
`noindex`, out of the sitemap and unlinked, so it works from its links and QR codes only. To make it findable later: drop the `hidden` prop in `[campaign].astro`, the sitemap filter and the headers hook in `astro.config.mjs`.
Rollback, fastest first: Netlify → **Deploys** → the last good deploy → **Publish deploy**; or set `gate.on: true` and redeploy (the password form is back); or delete `RECHARGE_PASS` with the gate on (the page answers 404).
First hour (open a private window on a phone and on a laptop, never signed in):
- minute 0: `/recharge` loads, `?ch=influencer&c=<test code>` button goes to the OneLink, the QR code on a laptop scans to the same link; `/breathe` still fine.
- minute 5: AppsFlyer, the app's overview filtered to media source `partner_campaign`: clicks and installs begin; Netlify → **Logs** → **Edge functions**/**Functions**: no errors from `recharge-gate`, `meta-capi`, `tiktok-events`.
- minute 15 and 60: the admin Partners → Campaigns → Results: members joined, the right channel and code per channel (a member with no channel means the link data did not reach the app: stop and check `deep_link_sub1/2`); Meta/TikTok Events Manager (if keyed): `CampaignView` and `AppTap` arriving, none before consent.
- Stop and roll back if: the page errors or is blank, the button does not reach a store, installs arrive with no code/channel, or the page can be reached without the password while `gate.on` is still true.

## The campaign's media: not in git (decided 7 Oct)
This repo is public, so the campaign's confidential media is never committed, and is in no commit's history of this branch:
`public/recharge/ink-long.mp4` (the ink loop), `ink-poster.webp` (its still), the screenshots and recording of the page (`docs/recharge/evidence/*.jpg|webm`), and the partner's real logo
(`public/recharge/*.local.*`). All are in `.gitignore`. Also not committed: product-page codes, QR files with codes (`recharge-qr.mjs` reads them from a file outside the repo), the password.
Placeholders (the dashed partner logo SVGs) are the only partner files in git. (Earlier branches, not this sprint's work, still carry `bloom-*.webp` and the Plasma poster stills: see SPRINT-NOTES.)
- **Local dev copy:** `npm run media:local` copies it from the app repo's stand-in cache into `public/recharge/` (ignored by git). Without the files the page is still complete, on its dark ground.
- **Production, chosen: fetch at build time from the campaign's private storage.** `npm run build` runs `scripts/fetch-campaign-media.mjs` first (`prebuild`). With two Netlify
  variables set it downloads the two files (`GET <base>/<file>`, `Authorization: Bearer <token>`) into `public/recharge/`; the build publishes them under `/recharge/`, which is
  **behind the same password gate** (the function covers `/recharge/*`, on production, deploy previews and each deploy's own address). Nothing is stored in git or by hand per
  deploy; the master copy stays in the campaign's private storage (for example a private Supabase Storage bucket and a read-only key, or the app server's media route if it can
  check a bearer token). Tested here against a local token-protected server (no variables: skipped with a warning; wrong token: the build fails; right token: both files fetched).
  Needs from the owner of main: the storage address and a read-only token. **Do not merge to main before the two variables are set**, or the production page has no picture.
- **Fallback if that is awkward: Netlify Blobs**, filled once by hand with the Netlify CLI (`netlify blobs:set campaign-media ink-long.mp4 --input ink-long.mp4`), and the edge function serving
  `/recharge/ink-*` from the store after the password check. More code in the gate; not chosen.
### Set it up in Netlify (Isak logs in; needs his yes; the sprint-planning chat clicks with him)
1. Netlify → the WeHale site → **Site configuration** → **Environment variables** → **Add a variable** → **Add a single variable**.
2. Key `CAMPAIGN_MEDIA_BASE_URL`, value the storage address (no trailing slash); scopes: **Builds**; deploy contexts: all; **Create variable**.
3. Again: key `CAMPAIGN_MEDIA_TOKEN`, value the read-only token, tick **Contains secret values**, scopes **Builds**, contexts all; **Create variable**.
4. After the next deploy: Deploys → the deploy → **Deploy log**: two lines "[campaign media] … fetched". Then in a private window: `/recharge/ink-poster.webp` shows the password form, not the picture.
Rollback: delete the two variables (the page shows its dark ground); the files are never in git.

## QR codes
`RECHARGE_CODES=<channel-codes.json> node scripts/recharge-qr.mjs <outDir> [influencers.csv]`: newsletter, pdp, and one per influencer from a
CSV with `name,code` columns. Each QR code points at the page (`https://wehale.io/recharge?ch=…&c=…`), never
straight at a store, and shows the 404 until the gate is off.
