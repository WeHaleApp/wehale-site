# wehale.io and /breathe measurement

How wehale.io measures the funnel from a paid ad to the app, and what has to be set up before anything fires. With no
env var set, nothing does: no banner, no tag, no request to Google, Meta or TikTok. The variables are in `docs/ENV.md`.

Code: `src/scripts/contract.js` (the ad-to-site parameters), `src/scripts/consent.js` (the choice, Consent Mode v2),
`src/scripts/tags.js` (GTM, Meta, TikTok, the server copies), `src/scripts/site.js` (the site's events),
`src/scripts/breathe/measure.js` (the /breathe funnel), `offers.js` (OneLink, offer arm),
`netlify/functions/meta-capi.cjs`, `netlify/functions/tiktok-events.cjs`. Unit test: `tests/contract.test.js` (`npm test`).

## Consent

- One banner for the whole site (`src/components/site/ConsentBanner.astro`): **Accept** and **Decline** of equal weight,
  and **Settings** with two choices, *site measurement* (GTM/GA) and *ad measurement* (Meta, TikTok). English, and a
  Swedish draft with `?lang=sv`. A bottom sheet on phones, a small card bottom left on desktop; on /breathe a card at the
  top of the start screen, hidden during the session, so it never covers Begin or the breathing.
- It appears only when a tag ID is set (`PUBLIC_GTM_ID`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_TIKTOK_PIXEL_ID`). For review,
  `?consent=1` shows it anyway. "Privacy choices" in the footer reopens it at any time.
- **Google Consent Mode v2:** the first script in every page's `<head>` sets `ad_storage`, `analytics_storage`,
  `ad_user_data`, `ad_personalization` (and the other types) to *denied*. A stored choice is applied at once; Accept
  sends `update` with the four granted. GTM loads only after a yes (basic consent mode), so nothing reaches Google before.
- The choice is stored in `localStorage` (`wehale.consent.v1`, `{analytics, ads, choice, at, v: 2}`; the earlier
  `{choice}` from PR #3 is read too), not in a cookie. After Accept the pixels set their own first-party cookies
  (`_fbp`/`_fbc`, `_ttp`) and GA its `_ga` cookies.

## The ad-to-site contract (SITE-GOALS §4)

`?h=` (hook), `?s=` (session), `?v=` (variant), `?src=` (source such as adpreview, saved) and `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content` go into **every event** as params (only those present, plus `source`), are **carried on
every internal link** (home → /breathe keeps the ad), and **pass through into every OneLink** (below). Values are clipped
to 100 characters and reduced to letters, digits and `. - _ ~ : + | /`. Hooks and variants live in one data file,
`src/data/hooks.json`, so a new ad needs no code change.

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
| `SaveForLater` | custom | an option in the save sheet | session, arm, source, option (app, calendar, ics, share, copy) |
| `ReturnFromSaved` | custom | arriving with `?src=saved` (once consent exists) | session, arm, source |
| `TrySessionTap` | custom | the site's pages: a tap on Try a session / Begin | page, at (header, hero, try, signoff, footer, 404, support), source, v |
| `AppTap` + `Lead` (site) | custom + standard | the site's pages: Get the app (the OneLink or the QR sheet) or a store button | page, at, store (onelink, app_store, google_play), source, v |

Every event also carries the contract params present on the URL (`h`, `s`, `v`, `src`, `utm_*`). On the site's pages `v`
is the home hero variant shown (`eyes`, `land`); on /breathe it is the landing variant (`g1`, …).

**Where each event goes** (only with a yes): GTM gets every event in the `dataLayer` (`{event: <name>, event_id, …params}`)
with site or ad consent; the Meta Pixel gets each as `track` (PageView, ViewContent, Lead) or `trackCustom`, with
`eventID`; the TikTok Pixel gets `page()` for PageView, `ViewContent`, `ClickButton` for AppTap, the custom names as they
are, and no copy of Lead. The server copies (Conversions API, Events API) carry the same `event_id`.

- `session`: `wake-up`, `unravel` or `soft-reboot`.
- `arm`: the offer arm (`A`, `B`) once one is assigned, otherwise `none`. *`assignment_id` only then.
- `v`: the landing variant (`0`, `a` to `f`, `g1`; LANDING.md, landing-loop/LOG.md). `h`: the ad hook id, when the visitor came with `?h=`.
- `source`: `utm_source`, else `meta` (fbclid) or `tiktok` (ttclid), else the referrer's host, else `direct`.
- No personal data: no email, phone, name, account id or free text.

## The OneLink

`https://wehale.onelink.me/zcid?pid=web_session&c=breathe&af_sub3=<session>&af_sub4=<1 finished | 0 left early>`, plus the
contract:

| OneLink param | From |
|---|---|
| `pid` | fixed: `web_session` (/breathe), `website` (the rest of the site) |
| `c` | `utm_campaign`, else `breathe` / `site` |
| `af_channel` | `source` (utm_source, else meta/tiktok from the click id, else the referrer host) |
| `af_adset` | `h`, the hook (one per person and concept) |
| `af_ad` | `utm_content` (one per ad) |
| `af_sub1`, `af_sub2` | offer id and arm, only while a test offer is live (unchanged) |
| `af_sub3` | the session (on the site: `?s=` when present) |
| `af_sub4` | 1 finished / 0 left early (/breathe only) |
| `af_sub5` | `at=<where>;v=<variant>;src=<src>;med=<utm_medium>;s=<s if different>`; `at` is end, exit, in_session, saved (/breathe) or header, hero, menu, qr_… (site) |

While a test offer is live, the finished visitor's link also carries
`deep_link_value=WO.<OFFERID>.<ARM>.<assignmentId>` (the only field the app reads), `af_sub1=<offer id>` and
`af_sub2=<arm>`, and arm B's end screen shows the short code (`WSOCT01-7KQ2M9XW3T`) as a fallback. While only the
standard offer applies (today), there is no token and no code. Spec: app repo,
`docs/marketing/2026-q4-paid/web-session/OFFER-CONFIG.md`.

## What Isak (and the owner of main) must set up

| Item | Where | Who |
|---|---|---|
| Every tag ID and token | Netlify env, `docs/ENV.md` | Isak (the tracking session sets up the accounts) |
| Events Manager test code, only while testing | `PUBLIC_META_TEST_EVENT_CODE`, or `?fbtest=TEST…` on the URL | Isak |
| Confirm the OneLink template `wehale.onelink.me/zcid` (iOS + Android) and its store fallbacks | `ONELINK_BASE` in `config.js` | lead + Isak |
| The live offer read (`GET /public/web-offer`), when built | Netlify env `PUBLIC_BREATHE_OFFER_URL` | owner of main |
| `/privacy` wording (below) | `src/pages/privacy.astro` | Isak |
| GTM: `PUBLIC_GTM_ID`, or today's ID as the fallback | `docs/ENV.md` | Isak |

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
5. **Server events.** Set `META_CAPI_TOKEN` and `META_PIXEL_ID` (scopes Builds and Functions), redeploy, repeat step 4. Each event should show as
   "Browser and server", de-duplicated (same event ID). Repeat step 3: the function must receive nothing.
