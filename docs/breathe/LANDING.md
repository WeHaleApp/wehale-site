# /breathe landing: research and design principles

For the marketing lead and Isak, 28 Sep 2026. It covers someone arriving from a 10-second Reels or TikTok ad, in an
in-app browser, sound probably off, sceptical, with three seconds of attention. The goals, in order: land → Start,
then finishing the session, then tapping into the app. The variants are live on the preview behind `?v=0|a|b|c`
(see the end).

## 1. What the research says

**The first second is visual, the next two are one sentence.** People judge a page's visual appeal within 50 ms,
before they read anything ([Lindgaard et al. 2006](https://www.tandfonline.com/doi/abs/10.1080/01449290500330448)).
Then they need to know *what this is* and *what happens if I tap*. Across 57 million conversions, pages written at a
5th–7th grade reading level converted at 11.1%, about twice as well as professional-level copy
([Unbounce Conversion Benchmark](https://unbounce.com/conversion-benchmark-report/)). Health and wellness gets 7× more
mobile traffic than desktop, but mobile converts worse, so the mobile first screen is the whole page.

**Message match with the ad.** A page whose first line repeats the ad's promise is the most-cited single lever on
paid traffic. The documented cases report large lifts (+66% from aligning headline and ad copy; +213% in a
Disruptive Advertising case), although these are agency case studies, not controlled research
([Leadpages](https://leadpages.com/blog/landing-page-message-match), [WebTonic](https://www.webtonic.io/blog/message-match)).
The mechanism is sound, and it's cheap here: the ad sets `?h=`.

**One action, and fewer choices before value.** In the jam study, 6 options drew fewer shoppers than 24, but they
bought 10× as often (30% vs 3%) ([Iyengar and Lepper 2000](https://digitalwellbeing.org/the-jam-study-strikes-back-when-less-choice-does-mean-more-sales/)).
Later meta-analyses find choice overload is real but depends on context. The practical rule holds: a default, a
recommended option, and other options kept secondary. For us, **three choices is not "overload", but a question
before any value** ("What do you need right now?") costs a decision that the ad has often already made.

**How the category starts a first session.** Calm opens with "Take a deep breath" on screen for the length of one
breath, before goals or sign-up, so the first thing you do *is* the product
([Usability Geek, Calm case study](https://usabilitygeek.com/ux-case-study-calm-mobile-app/),
[UI Sources](https://uisources.com/explainer/calm-onboarding)). Headspace validates the decision and runs an early
breathing exercise in onboarding, with soft animation, before asking much
([ScreensDesign](https://screensdesign.com/explore/apps/headspace/onboarding/),
[App Fuel](https://theappfuel.com/examples/headspace_onboarding)). Othership keeps free sessions but only inside
the app ([Othership](https://www.othership.us/resources/breathwork-apps)). I found no competitor that plays a full
guided session on the web without an account. That is WeHale's opening, and it argues for getting people *into* the
session fast, not for more explanation.

**Sound.** About 85% of Facebook video views happen without sound
([Digiday](https://digiday.com/media/silent-world-facebook-video/)), and most people react badly to sound that starts
unexpectedly ([Brandwatch](https://www.brandwatch.com/blog/facebook-video-ads-best-practices/)). So the visitor arrives muted, and
Edvin's voice is the product. The page must *ask* for sound, and it can only start audio from a tap anyway.

**The in-app browser.** Instagram on iOS is a WKWebView. It shares no cookies with Safari, has no password manager,
and media with sound needs a user gesture ([U2L](https://u2l.ai/blog/instagram-in-app-browser),
[WebKit video policies](https://webkit.org/blog/6784/new-video-policies-for-ios/)). The toolbar changes the viewport
height; `dvh`/`svh` fix the jump ([WebKit, Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)).
The page already uses `100dvh`, a fixed body and safe-area insets. The start action must sit well above the bottom
edge, where toolbars and the home indicator are.

**Rewarding the finish.** The goal-gradient effect: people speed up as a reward gets closer. Coffee-card holders
bought more often the fuller their card was ([Kivetz, Urminsky and Zheng 2006](https://journals.sagepub.com/doi/abs/10.1509/jmkr.43.1.39)).
Endowed progress: a 10-stamp card with 2 stamps given completed 34% vs 19% for a blank 8-stamp card
([Nunes and Drèze 2006](https://productphilosophy.com/articles/goal-gradient-progress-mechanics)). Both need the
reward to be **known while you work toward it**. An offer revealed only at the end can't pull anyone through minute
4. Announcing it at the start, with a quiet "3 min to go · 30 days waiting", is the textbook use. The honest limit:
only the arm that actually gets 30 days may see it (OFFER-CONFIG §5).

## 2. What changed in my thinking

- **The question comes too early.** "What do you need right now?" is warm, but it asks before saying what this is.
  Say it in one line first. Keep the choice, but secondary and pre-selected. When the ad already chose, skip it.
- **The one breath before Edvin is justified, and it doubles as the sound check.** Calm's opening is exactly this.
  It also teaches the one rule of the visual ("it rises as you breathe in"), which silent-ad arrivals otherwise
  miss. The risk is 9 extra seconds before value. It's measurable: SessionStart fires after it, so compare
  Start→SessionStart and Session1Min across b and c vs a.
- **Choosing a session should change the world.** It makes the choice felt, and it is cheap: the same renderer,
  a 0.6 s cross-fade (Dawn/Ember, Water, Night). The CSS fallback keeps each world's colour.
- **The offer at the start is right for arm B, and must be invisible otherwise.** Control sees nothing new (today's
  truth stays on the end screen), so the A/B stays clean.
- **Social proof: leave it out for now.** 5.0 from 8 ratings in one storefront reads thin (site audit H6). The name
  and role do more: "Guided by Edvin, WeHale co-founder" (his title on /about is "Co-founder", so not "breathwork
  guide").

## 3. Design principles for /breathe

1. **Say what it is in one line, above everything:** a 6-minute guided breathing session with Edvin, right here,
   free, no account.
2. **Echo the ad.** With `?h=`, the ad's own first line comes first and the ad's session is pre-chosen.
3. **One obvious action that names what happens:** "Start The Wake Up", a white pill, in the thumb zone and clear of
   the bottom edge.
4. **Show how it works in three tiny steps, no paragraph:** Sound on · Follow the light: it rises as you breathe in ·
   About 6 minutes.
5. **Choice is secondary and pre-made** (time of day, or the ad). Choosing changes the world, so it's felt.
6. **Ask for sound at the moment it matters, and teach the visual once:** one silent guided breath after Start, with
   a Skip.
7. **Reward only what is true for this visitor.** The offer at the start and a quiet progress marker only for the
   arm that gets it. Everyone else sees today's copy, at the end.
8. **Trust through a person, not numbers:** Edvin's name and role, "Free · No account". No ratings until they're
   meaningful. No effect claims.
9. **Light and fast:** first paint without WebGL or audio, and the field in the lazy tier.

## 4. The variants on the preview

| | Start screen | After Start |
|---|---|---|
| `?v=0` | The original: "What do you need right now?", three cards, round play button | Straight into Edvin |
| `?v=a` | One line of what it is, three steps, the sphere in the middle, three small chips that change the world, "Start The Wake Up" | Straight into Edvin |
| `?v=b` | As a | One silent breath with the light ("Breathe in as it rises… and out as it falls", Sound on, Skip), then Edvin |
| `?v=c` | As a, but no chips: time of day (or the ad) decides; "or choose another session" link | As b |

Any of a, b or c with `?h=coffee` (hooks in `src/data/breathe-hooks.json`, drafts) puts the ad's line first and
skips the choice. Events carry `v` (and `h`). The default for visitors without `?v=` is `DEFAULT_VARIANT` in
`config.js`: "c" (the lead's pick, 28 Sep), A/B against `?v=a`; the original is `?v=0`.
