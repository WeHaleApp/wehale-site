# Landing -> store -> app: the recommended handoff (16 Oct 2026)

Page: `wehale.io/campaign/charge-your-current` (Swedish draft: `/sv`). Built on the existing campaign page (`docs/recharge/`), moved from `/recharge`.
Read from the app repo (read only): `src/lib/link-attribution.ts`, `welcome-code-gate.ts`, `signup-code.ts`, `app.json`.

## How a code travels today
1. **Link or QR** (pack, social, creator) -> the landing page, e.g. `.../campaign/charge-your-current?ch=influencer&c=<CODE>`. `ch` = channel, `c` = the person's own code. No `c`: the channel's code, else the default.
2. **Button** (phone) or **QR** (desktop) -> one AppsFlyer OneLink (`wehale.onelink.me/zcid`, pid `partner_campaign`) carrying `deep_link_value` = code, `deep_link_sub1` = channel, `deep_link_sub2` = code as the reference, plus `af_*` fields for ads. Built in `src/scripts/recharge/link.js`, tested against the app's own parser.
3. **Store.** App installed: iOS Universal Link / Android intent filter (both for `wehale.onelink.me` are in `app.json`) open the app with the link data. Not installed: App Store / Google Play, then on **first open** AppsFlyer hands the app the install's link data (deferred deep link). The Welcome waits up to 6 s for it (`welcome-code-gate.ts`).
4. **Sign-up** applies the code (email, Apple, Google). The code is **prefilled and editable** on the sign-up page: that is the manual fallback. Nobody has to type it, and anyone whose link data was lost can type it (a wrong one shows "Code not recognised").
5. The app tells the server channel + reference once, only after analytics consent.

## What the founder QR codes do
They skip the landing page: they point straight at a OneLink short link (`zcid/charge`, pid for the founders, `c=cyc`, `deep_link_sub1=founder`). Fine for founders. They are private and are not used here.

## Where it can fail, and the fallback
| Case | Risk | Fallback |
|---|---|---|
| iPhone, not installed | iOS install matching is probabilistic: a miss = no code | typed code at sign-up; say "enter your code" in the pack/creator caption |
| Instagram / TikTok in-app browser | OneLink often does not open the store/app | the page's hint + "Copy link" (on); QR codes scanned by the camera avoid it |
| Android installed | `app.json` has the OneLink intent filter, so the app should open; **not proven on a phone** | Play opens; code still travels by install referrer |
| Desktop | a OneLink clicked on desktop goes to wehale.io without a code | the page shows a QR only, never a link |

## Recommendation
Keep this flow (landing page -> OneLink -> store -> deferred deep link -> prefilled editable code). Two small, optional additions, **not built** (they need app or AppsFlyer changes, Isak's call): (a) show the code on the page in small type ("Your code: X") so a person can type it if matching fails; (b) a printed fallback line on the pack and creator captions. Phone tests before launch are in `docs/recharge/LINK-MATRIX.md`.
