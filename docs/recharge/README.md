# /recharge: the campaign landing page (CONFIDENTIAL until launch)

Every outside link and QR code of the campaign points here. Arrival (co-brand lockup, title, one line, **Begin**) →
the session in the browser (the /breathe Tide player, `src/components/breathe/PlayerStage.astro` + `player.js`) →
the offer: "First month free, then 499 kr per year. Cancel anytime before the trial ends." and one button.

Files: `src/pages/recharge.astro`, `src/scripts/recharge/{app,link}.js`, `src/styles/recharge.css`,
`src/data/recharge.json` (everything that changes), `scripts/recharge-qr.mjs`, `tests/recharge.test.js`.

## URL parameters
| Param | Meaning |
|---|---|
| `k` | the preview key (only while the gate is on); removed from the address bar once checked |
| `ch` | `newsletter`, `flyer`, `pdp`, `influencer` → `af_sub1` (anything else: `web`) |
| `c` | the code → `deep_link_value` (default `RECHARGE`); influencers' personal codes arrive this way |
| `utm_*`, `h`, `v`, `src` | the site's parameter contract (`src/scripts/contract.js`), as on /breathe |
| `screen=offer` (`&done=1`) | review aid: open the offer directly |

The OneLink: `https://wehale.onelink.me/zcid?pid=<pid>&c=recharge&deep_link_value=<CODE>&af_sub1=<ch>`, plus
`af_channel` (utm_source), `af_ad` (utm_content), `af_adset` (h), `af_sub5` (`at=…;med=…;camp=…`). A
`utm_campaign` never replaces `c=recharge`. The app applies `deep_link_value` at sign-up (email, Apple, Google).
On desktop the offer shows a QR code of the same link. Nobody is ever asked to type a code.

## Placeholders
- **Codes:** `RECHARGE` is a placeholder. The owner of main creates the real campaign code and the influencers'
  codes in the admin; change `code.default` if the campaign code differs.
- **pid:** `partner_campaign`, a config choice for the lead and the owner of main (`onelink.pid`).
- **Session:** The Wake Up (Edvin) stands in. When the real session is recorded: `score.json` and `audio.mp3` into
  `public/recharge/session/`, then `session.score`, `session.audio`, `narrator`, `minutes`, `start` (about 1 s
  before the guide's first word) in `recharge.json`, and `stand_in: false`.
- **World:** `blackcurrant`, a Tide-field stand-in in the campaign's palette (Isak, 29 Sep). The campaign's own Cell
  visual (recharge-visual branch) replaces it once integrated; `session.world` is the switch.
- **Partner logo:** `public/recharge/partner-logo.svg` is a dashed placeholder. Replace the file (same name), or
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
2. If the page should then be findable: drop the `hidden` prop in `recharge.astro`, the
   sitemap filter and the netlify.toml headers. Otherwise leave them: the page works from its links and QR codes.

## QR codes
`node scripts/recharge-qr.mjs <outDir> [influencers.csv]`: newsletter, flyer, pdp, and one per influencer from a
CSV with `name,code` columns. Each QR code points at the page (`https://wehale.io/recharge?ch=…&c=…`), never
straight at a store, and shows the 404 until the gate is off.
