# Sprint 2026-10-07-website: notes (executing chat)

## Item 6: the gate (done, nothing published)
- Edge function `netlify/edge-functions/recharge-gate.ts`; flag `gate.on`; secret `RECHARGE_PASS` (Netlify, never in repo).
- Chose a form + signed cookie over basic auth: works on a phone keyboard and in in-app browsers. Basic auth also accepted (curl).
- Evidence: `npm test` (8 gate tests), and the real function run in Deno in front of the built site (`scripts/recharge-gate-local.ts`):
  no password 401 + form, page text absent; wrong 401; right 303 with the query string kept and cookie; cookie 200 and the page;
  media without password 401, with 200; basic auth right 200 / wrong 401; `/recharge.html` 401; `/breathe` 200; noindex + no-store on all.
- Not proven: Netlify's own runtime (netlify-cli's edge setup would not start here). First real run = the deploy.
- Netlify CLI route (`netlify dev`) was tried and stalled on its Deno setup; not used.

## Items 1 and 2: the ink design and the one action (built; copy unchanged)
Commit: see git log. Evidence in `docs/recharge/evidence/`: `page-{390,768,1280}-{light,dark}.jpg`, `page-{390,1280}-reduce-motion.jpg`,
`page-390-recording.webm` (10 s), `performance.json` (5 runs). The page is dark by design, so "light" and "dark" are the visitor's
colour scheme and look the same on purpose (`color-scheme: dark`, the app's ink ground).

**Performance** (phone UA 390x844, Slow 4G 1.6 Mbit/s + 150 ms, 4x CPU, cold cache, 5 runs, headless Chrome on the production build):
median first contentful paint 796 ms, largest contentful paint 1088 ms (the poster), layout shift 0, load event 1071 ms, 85 kB at load (re-run after the measurement code)
(poster 15 kB, fonts, the page). The 2.1 MB loop is requested only after load (one request per run) and fades in. Reduce Motion: 0 video requests (checked at 390 and 1280).
Not measured: a real phone on a real network (that is Isak's phone test).

**Built:** the ink bloom is the ground (ink_long loop + poster from the stand-in cache), the app's veil and Ready type (38/41, -0.95), the
lilac pill (#C9B6F2 / #150C2B, 56 pt), the words at the bottom, the rise-in in reading order. The Plasma light, the motes, the three
look variants (?look=, ?arms=) and the old store badges are removed. A desktop shows a QR card instead of the pill (decided in CSS, so no
jump). `#test=<code>` still turns the button/QR into the quick-start link (checked in a run: phone button
`wehale:///quick-start?code=ABC123`, desktop QR drawn, "Open in the test build"). The partner is still the "PARTNER" placeholder word
(the partner's real logo is not committed; it goes in `public/recharge/partner-logo-white.local.png`, see recharge.json).

**Every word on the page today (unchanged from before the redesign; the default view showed these):**
1. Lockup: "WeHale" (logo, alt "WeHale"), "×", "PARTNER" (placeholder)
2. Title: "Charge Your Current"
3. Ritual, three lines: "Pour a Blackcurrant." / "Press play." / "Breathe with Philip."
4. Offer: "Your first month of WeHale free."
5. Phone: "Only through this link." Desktop: "Scan with your phone to claim it."
6. Button (phone): "Start in the app". Desktop QR caption: "Only through this code."
7. Fine print: "Cancel anytime before the trial ends."
8. No script: "Turn on JavaScript to get the app link, or find WeHale in the App Store or Google Play."
9. Page title/description (not seen on the page): "Charge Your Current · WeHale"; "Pour a Blackcurrant. Press play. Breathe with Philip. Your first month of WeHale free."
10. Consent bar (the site's component, unchanged). Tester mode only: "Open in the test build", "Test build: scan with your phone's camera, then tap Open.", "For the team: the link only works for the team test code, in a test build, and signs you in to a test account."
Defined in recharge.json but not shown: `about`, `session_line`, `trial`.

**Copy proposals for Isak (nothing applied; he picks):**
- P1. Show the store line under the fine print: "The free month is a trial through the App Store or Google Play." (already in recharge.json as `trial`; a visitor currently never learns the free month goes through the store.)
- P2. Keep "Your first month of WeHale free." as the second line, as the hook says. The title + ritual stay as the first line.
- P3. "Cancel anytime before the trial ends." was marked TO VERIFY in the prototype README (does the store flow allow it); confirm before launch or replace with P1 alone.
- P4. Button: keep "Start in the app", or "Start my free month" (the prototype's offer button) which repeats the offer.
- P5. The desktop line "Scan with your phone to claim it." and the caption "Only through this code." say almost the same; propose dropping the caption.

## Item 3: every link carries its code (done locally; phone list for Isak)
`docs/recharge/LINK-MATRIX.md`. Found and fixed a real gap: the app reads the channel from `deep_link_sub1` and the reference from `deep_link_sub2`; the page sent neither (the reference would have been the campaign name `recharge`). Now both ride the link; the app's own parser is run on every generated link in `tests/recharge-matrix.test.js`. AppsFlyer read through the connector (read only): template `zcid`, iOS Universal Links, re-engagement attribution OFF on both apps, probabilistic modelling on; **unknown: Android deep-link config for an installed app** (Isak/AppsFlyer, phone test).

## Item 4: in-app browsers (built, hint off until Isak picks words)
In `README.md` ("In-app browsers") with the tested/not-tested table. `inapp.on: false` in recharge.json; `?inapp=1` previews it. Proposed words are in the file; not applied.

## Item 5: measurement
`CampaignView`, `AppTap`+`Lead`, `StoreOpened` (inferred), `InAppHint`/`InAppCopy`; local run in `evidence/events-local-run.txt` (no events without consent, view follows a late yes, nothing in tester mode). What the page sets is in README "Measurement". Cookie wording is Isak's and the measurement lead's.

## Item 7 and 8
Launch checklist: README "At launch". `npm test` (53 tests) and `npm run build` pass.

## Open for the planning chat / Isak
1. The public repo now holds the campaign's ink media (see my check-in): decide before any merge/push.
2. Copy picks (P1-P5, the in-app words).
3. Android installed-app behaviour (AppsFlyer template), iOS deferred matching: phone tests.
4. The Netlify edge runtime has not run the gate yet.

## Media out of git (planning chat's decision, 7 Oct)
History rewritten on the unpushed branch (filter-branch, then reflog/gc): the loop, the poster and the screenshots/recording are in no commit (`git rev-list --objects --all` shows none). Gitignored, with a local copy (`npm run media:local`).
Production: build-time fetch from private storage (`scripts/fetch-campaign-media.mjs`, tested against a local token server); click-path in README "The campaign's media". Nothing set up.
**Found, not mine to fix:** `origin/claude/marketing-recharge` (already on GitHub) holds `public/recharge/bloom-720.webp`, `bloom-1080.webp` and the Plasma poster stills (`public/plasma/*/poster-*.jpg`) from earlier campaign-page work: the planning chat should decide whether those branches need rewriting/deleting.
No product-page code, QR file, password or real partner logo is in git (checked with `git grep` and `git ls-files`). The partner's name is no longer written in these notes.
