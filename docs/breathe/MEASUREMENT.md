# /breathe measurement

How wehale.io/breathe measures the funnel from a paid ad to the app, and what has to be set up before anything
fires. Today nothing does: no pixel ID is set, so no request goes to Meta, with or without consent.

Code: `src/scripts/breathe/measure.js` (consent, pixel, events), `config.js` (every gap), `offers.js` (OneLink,
offer arm), `netlify/functions/meta-capi.cjs` (proposed server events, needs the owner of main's approval).

## Consent

- A small banner at the top of the start screen, with **Accept** and **Decline** as equal buttons, in English, or in
  Swedish with `?lang=sv` (the page itself is English, like the rest of the site). It links to `/privacy`.
- It appears only when there is something to consent to: `PUBLIC_META_PIXEL_ID` or `PUBLIC_META_CAPI_URL` is set.
  For review, `?consent=1` shows it anyway.
- Nothing non-essential loads before Accept. Decline, or no answer, means no pixel and no server events. The session
  works the same either way; the banner never covers the player (it hides during the session).
- The choice is stored in `localStorage` (`wehale.consent.v1`), not in a cookie. No cookie is set by the page. After
  Accept, Meta's `fbevents.js` sets its own first-party cookies (`_fbp`, and `_fbc` when the visitor came from an ad
  click).
- This page does not load Google Tag Manager (`BreatheLayout.astro`). The rest of the site still loads
  GTM-NCPSJ2QF without consent; that's for Isak and the owner of main.

## Events

All events go to the pixel only after Accept and only with an ID. Each has a fresh `event_id` (UUID), passed as
`eventID` to the pixel and as `event_id` to the server copy, so Meta de-duplicates the two.

| Event | Type | When | Params |
|---|---|---|---|
| `PageView` | standard | once, when the pixel loads (on Accept, or on load if consent was given before) | none |
| `SessionPicked` | custom | the visitor taps a session choice | session, arm, source |
| `SessionStart` | custom | Play, from the beginning (in variants b and c: after the one breath) | session, arm, source |
| `ViewContent` | standard | together with SessionStart | content_name = session, content_category = web_session, session, arm, source |
| `Session1Min` | custom | 60 s into the session audio (once per page view) | session, arm, source |
| `SessionHold` | custom | the first breath hold is reached | session, arm, source |
| `SessionFinish` | custom | the end screen (the audio finished, or the visitor left in the last 15 s) | session, arm, source, assignment_id* |
| `AppTap` | custom | tap on the app button (end or exit screen) | session, arm, source, completed (1/0), assignment_id* |
| `Lead` | standard | together with AppTap, so Meta can optimise for a standard event | content_name = session, plus the above |

- `session`: `wake-up`, `unravel` or `soft-reboot`.
- `arm`: the offer arm (`A`, `B`) once one is assigned, otherwise `none`. *`assignment_id` only then.
- `v`: the landing variant (`0`, `a` to `f`, `g1`; LANDING.md, landing-loop/LOG.md). `h`: the ad hook id, when the visitor came with `?h=`.
- `source`: `utm_source`, else `meta` (fbclid) or `tiktok` (ttclid), else the referrer's host, else `direct`.
- No personal data: no email, phone, name, account id or free text.

## The OneLink

`https://wehale.onelink.me/zcid?pid=web_session&c=breathe&af_sub3=<session>&af_sub4=<1 finished | 0 left early>`

While a test offer is live, the finished visitor's link also carries
`deep_link_value=WO.<OFFERID>.<ARM>.<assignmentId>` (the only field the app reads), `af_sub1=<offer id>` and
`af_sub2=<arm>`, and arm B's end screen shows the short code (`WSOCT01-7KQ2M9XW3T`) as a fallback. While only the
standard offer applies (today), there is no token and no code. Spec: app repo,
`docs/marketing/2026-q4-paid/web-session/OFFER-CONFIG.md`.

## What Isak (and the owner of main) must set up

| Item | Where | Who |
|---|---|---|
| Meta Pixel (dataset) ID | Netlify env `PUBLIC_META_PIXEL_ID`, then redeploy | Isak |
| Conversions API token | Netlify env `META_CAPI_TOKEN` and `META_PIXEL_ID` (secret, server only) | Isak |
| Approve `netlify/functions/meta-capi.cjs`, then set `PUBLIC_META_CAPI_URL=/.netlify/functions/meta-capi` | this repo | owner of main |
| Events Manager test code, only while testing | `PUBLIC_META_TEST_EVENT_CODE`, or `?fbtest=TEST…` on the URL | Isak |
| Confirm the OneLink template `wehale.onelink.me/zcid` (iOS + Android) and its store fallbacks | `ONELINK_BASE` in `config.js` | lead + Isak |
| The live offer read (`GET /public/web-offer`), when built | Netlify env `PUBLIC_BREATHE_OFFER_URL` | owner of main |
| `/privacy` wording (below) | `src/pages/privacy.astro` | Isak |
| GTM on the rest of the site | `BaseLayout.astro` | Isak + owner of main |

### What /privacy must say (for Isak to word)

1. On wehale.io/breathe, with your consent only, we use the Meta Pixel (Meta Platforms Ireland Ltd) to measure
   which ads bring visitors and whether they start and finish the session and tap through to the app. It sets
   Meta's cookies `_fbp`/`_fbc`. Legal basis: consent. You can change your choice (a way to reopen the banner, or
   clearing site data).
2. If the server events are switched on: the same events are also sent from our server to Meta (Conversions API),
   with your IP address and browser user agent, only after consent, to match and de-duplicate them.
3. Without consent nothing is sent to Meta. We store your choice in your browser's local storage, not a cookie.
4. When a completion offer test runs, the page stores a random assignment (offer, arm, a random id) in local
   storage so a reload shows the same offer, and puts it in the app link; it identifies no person. Isak to decide
   whether this needs consent or counts as part of delivering the offer.
5. The app link goes through AppsFlyer (OneLink), which records the click and the install for attribution.
6. Section 6 today names Mixpanel and a cookie banner that don't exist and omits GA/GTM (site audit, T1).

## Test plan (5 steps, on the Netlify deploy preview)

1. **Before any setup.** Open `/breathe` in Chrome with DevTools → Network, filter `facebook`. Play for a minute,
   finish (drag the scrubber to the end) and tap the app button. Expect zero requests to `facebook.com`/`facebook.net`
   and no banner.
2. **Set the IDs.** In Netlify, set `PUBLIC_META_PIXEL_ID` (and `PUBLIC_META_TEST_EVENT_CODE`) for deploy previews,
   and retrigger the deploy. In Events Manager → the dataset → **Test events**, copy the test code (`TEST12345`).
3. **Decline.** Open `/breathe?fbtest=TEST12345` in a private window. The banner shows; tap **Decline**. Play and
   finish. Expect still no Meta requests, and nothing in Test events.
4. **Accept.** New private window, same URL, tap **Accept**. Expect `fbevents.js`, then in Test events within a
   minute: PageView, then on Play SessionStart + ViewContent, at 1:00 Session1Min, at the first hold SessionHold,
   at the end SessionFinish, and on the app button AppTap + Lead, each with session, arm and source.
5. **Server events (only after the owner approves the function).** Set `META_CAPI_TOKEN`, `META_PIXEL_ID` and
   `PUBLIC_META_CAPI_URL=/.netlify/functions/meta-capi`, redeploy, repeat step 4. Each event should show as
   "Browser and server", de-duplicated (same event ID). Repeat step 3: the function must receive nothing.
