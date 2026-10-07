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
median first contentful paint 712 ms, largest contentful paint 968 ms (the poster), layout shift 0, load event 949 ms, 84 kB at load
(poster 15 kB, fonts, the page). The 2.1 MB loop is requested only after load (one request per run) and fades in. Reduce Motion: 0 video requests (checked at 390 and 1280).
Not measured: a real phone on a real network (that is Isak's phone test).

**Built:** the ink bloom is the ground (ink_long loop + poster from the stand-in cache), the app's veil and Ready type (38/41, -0.95), the
lilac pill (#C9B6F2 / #150C2B, 56 pt), the words at the bottom, the rise-in in reading order. The Plasma light, the motes, the three
look variants (?look=, ?arms=) and the old store badges are removed. A desktop shows a QR card instead of the pill (decided in CSS, so no
jump). `#test=<code>` still turns the button/QR into the quick-start link (checked in a run: phone button
`wehale:///quick-start?code=ABC123`, desktop QR drawn, "Open in the test build"). The partner is still the "PARTNER" placeholder word
(the real Salte logo is not committed; it goes in `public/recharge/partner-logo-white.local.png`, see recharge.json).

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
