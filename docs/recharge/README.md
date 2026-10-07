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

## QR codes
`RECHARGE_CODES=<channel-codes.json> node scripts/recharge-qr.mjs <outDir> [influencers.csv]`: newsletter, pdp, and one per influencer from a
CSV with `name,code` columns. Each QR code points at the page (`https://wehale.io/recharge?ch=…&c=…`), never
straight at a store, and shows the 404 until the gate is off.
