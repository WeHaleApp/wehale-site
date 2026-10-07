# Every link carries its code: the matrix (item 3)

Status: **links, tests and AppsFlyer settings proven locally; the store and app hand-over needs a real phone** (list at the end).

## What the page produces
One OneLink for every device; only `af_sub5 at=` differs (`offer` on a phone's button, `qr` on a desktop's QR code).
Template `zcid` (AppsFlyer, read only): domain `wehale.onelink.me`, iOS `id6739413667` with Universal Links, Android `com.wehale.app`,
default (no phone) `https://www.wehale.io`.

| Channel (`ch`) | Code (`c`) | Example OneLink (phone button) |
|---|---|---|
| newsletter | `RECHARGE` (the channel's code) | `…/zcid?pid=partner_campaign&c=recharge&deep_link_value=RECHARGE&deep_link_sub1=newsletter&deep_link_sub2=RECHARGE&af_sub1=newsletter&af_sub5=at%3Doffer` |
| pdp | the partner's own, from its URL (`?c=`, not in this public repo) | `…&deep_link_value=PARTNER-TEST1&deep_link_sub1=pdp&deep_link_sub2=PARTNER-TEST1&af_sub1=pdp…` |
| influencer | their own code (`?c=anna-rc`) | `…&deep_link_value=ANNA-RC&deep_link_sub1=influencer&deep_link_sub2=ANNA-RC&af_sub1=influencer…` (QR: `at%3Dqr`) |
| social | `RECHARGE` | `…&deep_link_value=RECHARGE&deep_link_sub1=social&deep_link_sub2=RECHARGE&af_sub1=social…` |
| none / unknown `ch` | `RECHARGE` | `ch` becomes `web` |

**A gap found and fixed:** the app reads the channel from `deep_link_sub1` (then `ch`, then `af_sub2`) and the reference from
`deep_link_sub2` (then `c`, then `af_sub3`) (`wehale-app src/lib/link-attribution.ts`). The page sent only `af_sub1`, so the channel
was never read, and the reference would have been `c=recharge` (the campaign name) instead of the code. The link now carries
`deep_link_sub1` (channel) and `deep_link_sub2` (code); `af_sub1` stays for AppsFlyer's reports. The app's own parser, run on every
generated link, returns exactly `{ch, c}` (`tests/recharge-matrix.test.js`, 18 tests, in `npm test`). Note: the server's channel list
in MEASUREMENT.md says `product`; the page's channel is `pdp` (the brief). The server accepts any `[a-z][a-z0-9_-]*`, so both store; the funnel will show `pdp`.

**Attribution rule, a partner code beats an ad:** a partner's `?c=` always wins over the channel's code, and an ad's `utm_*` and click ids
never replace the code, `c=recharge` or the channel; the ad's source/content ride in `af_channel`/`af_ad`/`af_sub5` (tested). `fbclid`/`ttclid` are not passed on.

## Device × state: where it goes and whether the code reaches the sign-up
| Device | App installed | App not installed |
|---|---|---|
| **iPhone** (Safari/Chrome, button) | Universal Link opens the app; the link data holds `deep_link_value`, sub1, sub2; the app applies the code at sign-up (email, Apple, Google). *Not proven: opening, delivery.* | App Store; after install, first open: the conversion data holds the same fields (`appsflyer.ts` stashes them). iOS matching is **probabilistic** (enabled in app settings; AAP is on), so it can fail; a missed match = no code. *Needs a phone.* |
| **Android** (Chrome, button) | The template shows no Android deep-link config in the connector (only "Universal Links, App Clips"); whether an installed app opens or the link goes to Google Play is **unknown**. *Needs a phone; if it goes to Play, an Android URI scheme / App Link must be set in the template (AppsFlyer change = Isak).* | Google Play with the install referrer (deterministic); first open delivers the fields. *Needs a phone.* |
| **Desktop** | The QR code (`at=qr`) is scanned by a phone: then the phone's row. A OneLink clicked on a desktop goes to the template default `www.wehale.io` (no code); the page never shows a clickable link on desktop, only the QR code. | same |

AppsFlyer settings read (both apps): re-engagement attribution is **off** and the minimum time between re-engagements is 0, so a link opened in an
installed app will not be counted as a re-engagement in AppsFlyer's reports; the link data still reaches the app (deep linking is separate from
re-engagement attribution), and the member's channel is stored by the server (`POST /offer/code/link`), which is where the funnel counts it. Probabilistic modeling is on for both.
The template has exactly one link (`my_first_link`, pid `my_media_source`); our `pid=partner_campaign` is set in the URL, no AppsFlyer change is needed for that.

## Phone-test list for Isak (a real phone and a store install; in this order)
Use the password gate's page on the live address, `/recharge?ch=influencer&c=<test code>` (a real code from the owner of main; the server logs the member).
1. iPhone, app **not** installed: scan the QR code on a desktop (and once tap the button), App Store, install, open: does the Welcome show the campaign and does sign-up apply the code? (Note the install: AppsFlyer dashboard shows media source `partner_campaign`.)
2. iPhone, app installed: same link from Safari: does the app open on the Welcome/sign-up with the code? Then from Instagram's in-app browser (item 4).
3. Android, app not installed: Chrome, Play, install, open: code applied?
4. Android, app installed: does the app open, or does Play open?
5. Repeat 1 and 3 with `?ch=newsletter` (no `c`) and a partner-style `c`; then check the server funnel: right channel, right code.
6. A bare `/recharge` link must give `RECHARGE` and channel `web`.
