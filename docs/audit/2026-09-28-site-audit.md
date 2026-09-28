# wehale.io audit, 28 September 2026

A review of the marketing site as it runs on `main` (commit `eaea26b`) and live on wehale.io. It is a
report, not a change: nothing on the site was edited. Prepared for the marketing lead, Isak and the
owner of main.

**How it was checked.** I built `origin/main` in a separate worktree and captured the live pages with
headless Chrome, sound muted, at 390×844 @2x and 1440×900. Google Tag Manager and the WeHale API were
blocked in every capture, and the newsletter form was not submitted. I ran Lighthouse 12 (mobile) on
`/`, `/about` and `/support`, and compared the site with the app's tokens (`src/tokens/`), the design
programme (`docs/reviews/2026-09-27-design-program/`) and the app screens in
`admin/workspace/public/screens/`. Screenshots and Lighthouse JSON are in
`~/Documents/WeHale ads review/2026-q4-paid/site-audit/`, named as referenced below.

---

## Executive summary

**What's good.** The site is fast and light: Lighthouse mobile gives Performance 96, Best Practices
100 and SEO 92–100, with CLS 0 on every page and no render-blocking JavaScript. The palette starts from
the same navy (`#090F1D`), off-white text, amber and rose as the app, and the logo file is the app's own
horizontal logo. The main action is a white pill, as in the app. The tone is mostly calm and restrained,
the reviews are real App Store reviews, there is a skip link, reduced motion is respected and there is
exactly one `h1` per page. The hero footage (misty lake at blue hour) is on-brand.

**The highest-impact problems, in order:**

1. **Analytics run without consent, and the privacy policy describes a different setup.** Every page
   loads GTM container `GTM-NCPSJ2QF`, which fires GA4 (`G-3PNSPY5RNF`) with scroll and
   `app_store_click` events. There is no cookie banner. The policy (section 6) promises analytics
   "only with your consent… through our cookie banner" and names Mixpanel. The web-session scope
   (`SCOPE.md` §8) also says the site has "no pixel or analytics", which is wrong. Legal risk (Swedish
   ePrivacy/GDPR) and a planning risk for the paid test. **High.**
2. **Effect and health claims in the copy.** "anxiety drops in real time", "improves attention and
   working memory more reliably than caffeine", "compounding nervous-system resilience", "a calmer
   nervous system on the other side", "Five minutes is enough to feel the shift". These are the kind
   of claims the app's rules and the ad plan forbid, and a paid-traffic landing page makes them a
   compliance risk (Meta ad policy, consumer law). **High.**
3. **The offer is not on the site, and Android doesn't exist on it.** Nothing says what a newcomer gets
   (14 days with the full library, then three Always Free sessions plus intro course days 1–2, no card).
   The "Free" badges point at two sessions that are not the Always Free ones. There is no Google Play
   link anywhere, and the hero says "Guided breathwork for iOS". Every Android visitor from an ad hits
   a dead end. **High.**
4. **The site looks like the app before its redesign.** Inter instead of Nunito Sans; the old accent
   (`#7CB5A2`, app `#45B5A0`); text a step dimmer than the app (tertiary text fails contrast at 2.97:1);
   category colour dots, teal button fills and bordered boxes that the new app has removed; app
   screenshots from an old Home. **Medium–high.**
5. **Broken or empty parts.** The phone slider's dots and captions never change (the script looks for
   them in the wrong element); the final call-to-action's background photo never shows; the 404 is
   Netlify's white default page; `/session/*` links drop people on the home page with no word about
   the session. **Medium.**
6. **Stale or placeholder content that erodes trust.** Investors: "launching May 2026", "Founding team
   6" (the page lists three founders and an advisor), "traction metrics published here post-launch".
   About: "We'll add real photos once everyone's camera-ready", initials instead of faces. The trust
   strip says "New on the App Store" right under the hero's "5.0 on the App Store". **Medium.**
7. **SEO signals contradict each other.** Canonicals point to `/about.html`-style URLs while the
   generated sitemap lists `/about`; `robots.txt` points to an old hand-written `sitemap.xml` that lists
   `/business.html` (a 404). **Medium.**
8. **An unused mail function can send email from support@wehale.io to any address.**
   `netlify/functions/support.cjs` is no longer used by any page but is still deployed. **Medium
   (security).**

**Recommended order of work.** First the two compliance items (consent and claims), because they block
paid traffic regardless of design. Then the offer, the Google Play link and the broken components, which
are quick and directly affect conversion. Then the brand refresh onto the app's tokens, shared
components and /breathe together, so the refresh is done once.

---

## 1. Brand consistency with the app's design system

The app's reference: `src/tokens/colors.ts`, `type.ts`, `fonts.ts`, `layout.ts`, `motion.ts`, and the
eight principles in `PRINCIPLES.md` ("Quiet dusk"). The site's tokens are all in
`src/styles/global.css:9-49`.

| # | Sev | Where | Mismatch | Fix | Effort |
|---|---|---|---|---|---|
| B1 | High | `global.css:32-34`, `public/fonts/`, `BaseLayout.astro:69-70` | **Typeface.** Site: Inter. App: Nunito Sans (300–800) on every screen since 31 Aug. The two look clearly different side by side (Inter is narrower and more technical). Evidence: `home-mobile-first-screen.jpg` vs app `home.home.new.jpg`. | Self-host Nunito Sans variable (latin subset, woff2, `font-display: swap`, preload), set `--font-sans` and `--font-display` to it, delete Inter. | S |
| B2 | High | `global.css:14-16` | **Accent.** Site `#7CB5A2` (sage). App `#45B5A0` (sea glass) since 23 Sep. | `--color-accent: #45B5A0`; derive `-soft`/`-line` from it. | S |
| B3 | Medium | `global.css:20-22` | **Calm colour.** Site `#93A5CF`; app `categoryCalm` `#7EABD4`. | Match, or drop category colours entirely (B7). | S |
| B4 | High | `global.css:25-27` | **Text levels are one step dimmer than the app.** Site secondary 0.55 / tertiary 0.35 / muted 0.18; app 0.72 / 0.55 / 0.35. The site's tertiary is used for eyebrows, footer headings, meta, the newsletter note and "Back to home", and fails WCAG AA at **2.94–2.97:1** (Lighthouse on all three pages). | Adopt the app's four levels exactly. Tertiary becomes 5.6:1. | S |
| B5 | Medium | Hero, sections, `about.astro`, `investors.astro` | **Type scale and weight.** The app uses 8 steps, headings in *medium* (500): display 34/40, title1 28/34, title2 22/28, body 16/24, caption 11/14 bold caps +1.2. The site uses semibold (600) headlines up to 120 px (`Hero.astro:43`), 12 px eyebrows at 0.12em, and roughly 15 different sizes. It reads louder than the app. | Define a web scale from the app's steps (scaled up for desktop only: e.g. display 44→72 px, medium 500, tight leading), use medium for headings, set eyebrows like the app caption. | M |
| B6 | Medium | `SiteHeader.astro:45`, `Hero.astro:60`, `FinalCta.astro:42`, `NewsletterForm.astro:35` | **Principles 2 and 3.** White pills turn *teal* on hover, and "Subscribe" is a teal-filled button. The app: "white main actions", "Don't: accent-filled buttons"; accent means progress only. | Keep white pills; hover = slight dim/press scale, no colour change. Make Subscribe a white pill (or a quiet outline if it's the secondary action). | S |
| B7 | Medium | `TrustStrip.astro:34-47`, `Pillars.astro`, `SessionShowcase.astro:113-119`, `UseCases`, `WhyBreathwork.astro:55` | **Category colours and dots.** The site colour-codes Activate/Balance/Calm everywhere: coloured titles, dots, pills, glows. The app's group-4 and group-5 passes removed them ("no dots", "no category colours"). | Drop the category colours: category as a plain caption ("BALANCE · 8 MIN", as in the app), accent only where something shows progress. | M |
| B8 | Medium | Cards across all pages (`rounded-3xl border …`) | **Principle 4, "depth from light, not lines".** Nearly every block is a bordered box on a raised surface. The app uses glass, gradients and scrims, and a hairline only where a shape would dissolve. | Remove borders from text cards; use the app's surfaces (`#0E1525`, `#131926`) or no card at all; keep a hairline only on image cards. | M |
| B9 | Low | Radius | Site 16/24 px cards and pills; app `radius.lg` 16 for cards, `button` 18, pills 999. The 24 px (`rounded-3xl`) cards are the outlier. | Cards 16 px; pills full. | S |
| B10 | Low | `global.css:48,133-134`, `hover:-translate-y-1`, `group-hover:scale-105`, slider auto-advance every 4.5 s | **Motion.** Site: 600 ms on `cubic-bezier(0.22,1,0.36,1)`, hover lifts and zooms. App: `enter` 500 ms on `[0.33,1,0.68,1]`, stagger 80 ms for at most 4 items, no decorative motion ("motion moves real content, never decoration"). | Use the app's `enter` curve and duration, cap the stagger, drop hover lifts/zooms on cards, stop the slider auto-advancing (let people swipe). | S |
| B11 | Medium | `SessionShowcase.astro` covers, `FinalCta.astro:13`, `public/assets/images/marketing/` | **Imagery (principle 1).** The session covers are the old ungraded ones (a green forest, a bright alpine lake, a warm sunset mountain) that the design programme is replacing with the graded "Quiet dusk" set. **Box Breath's cover is a free Magnific photo that needs attribution** (ASSETS.md, open with Isak), and it is shown here too. The final-CTA image is a person with the old tagline "Regain your inner power." and a logo baked into it. The lifestyle folder has people; the ads plan says no people. | Use the graded covers from `server/scripts/design-capture/.graded/` once uploaded; resolve the Magnific credit for the site as well as the app; use landscape-only dusk photos with no baked-in text. | M |
| B12 | Medium | `PhoneSlider.astro:14-40`, `public/assets/images/screens/` | **The app screenshots are out of date.** The slider shows the old Home ("1 of 5 this week", a teal ring, "Intro course · 7 days, Start Breathing"). Today's Home says "0 of 3 this week", "Begin Within", "Start day 1" (`home.home.new.jpg`). The hero poster `ui/home-feed.jpg` is an even older Home (waterfall, teal ring). | Recapture from the current design captures (made-up personas only), 5 screens: Home, Practice, player, Afterglow, Progress. Use a dusk still as the video poster instead. | S |
| B13 | Low | Tone | Mostly on voice, with some exceptions: "Real sessions. Real techniques.", "Start your morning with intention, not caffeine", "The combination is the differentiator", "operator chops". | Rewrite in the app's voice: short, warm and plain, with no swipes at other things. | S |
| B14 | Low | `Hero.astro:83`, `index.astro:15`, `WhyBreathwork` | **Vocabulary.** "Multi-day journeys": in WeHale a journey is a long *session*, and the multi-day container is a *course*. | "Short sessions and guided courses". | S |
| B15 | Low | Logo, favicon | The logo SVG is identical to the app's `Logo_Horizontal_White.svg` (good). The favicon is the drop on navy; fine. `/favicon.ico` and `/apple-touch-icon.png` at the root return 404, so some browsers and iOS "Add to Home Screen" get no icon. | Add root `favicon.ico` and a 180×180 `apple-touch-icon.png` made from the app icon. | S |

## 2. Page by page

### Home (`/`)
First screen (`home-mobile-first-screen.jpg`, `home-desktop-first-screen.jpg`): calm and legible, with one
clear white action. What WeHale is gets across in about 3 seconds ("Audio-guided breathwork sessions").
What you get does not: nothing says it's free to start.

| # | Sev | Where | What's wrong | Fix | Effort |
|---|---|---|---|---|---|
| H1 | High | `WhyBreathwork.astro:19,23,27,31` | Effect claims: "anxiety drops in real time", "improves attention and working memory more reliably than caffeine without the rebound" (no citation at all), "A calmer baseline under pressure and better recovery from stress", "builds compounding nervous-system resilience over weeks". One study (Russo 2017, a review of slow breathing in healthy people) is cited for two of them. It doesn't support "anxiety drops in real time" as a product promise. Evidence: `home-mobile-why.jpg`. | Replace with descriptions of what the practice *is* rather than what it does to you, e.g. "Slow breathing with a longer exhale is one of the oldest ways people settle themselves." / "Sessions are built on named techniques: box breathing, coherent breathing, 4-7-8." Keep the Russo link only as "further reading". Edvin and Isak sign off. | S |
| H2 | High | `Hero.astro:51-52`, `FinalCta.astro:34-35`, `SiteFooter.astro:21-22`, `Pillars.astro:33`, `SessionShowcase.astro:53`, `about.astro:165`, `investors.astro:60` | Softer claims repeated site-wide: "Five minutes is enough to feel the shift", "a calmer nervous system on the other side", "Reset your nervous system midday", "Sync breath with heart rhythm", "measurable physiological intent". | Neutral versions: "Most sessions take 5–15 minutes." / "Guided by Edvin, one breath at a time." Remove "nervous system" as an outcome everywhere. | S |
| H3 | High | Hero, `SessionShowcase.astro:24,74` | **No offer.** And the "Free" badges sit on Box Breath and Nighttime Serenity. The Always Free sessions are The Wake Up, Unravel and The Soft Reboot (release 2.7.0, ratified 21 Aug), and during the Welcome Period everything is open, so the badges are wrong on both counts. | Under the hero actions, one line in the app's own words (the Welcome screen's "Your first 14 days are free · Everything in WeHale is open to you · No card needed"). Wording needs Isak's yes (access wording). Remove the Free badges or move them to the three Always Free sessions. | S |
| H4 | High | Everywhere (`SiteHeader.astro:10-11`, `Hero.astro:12,56-67`, `FinalCta.astro:7`, `SiteFooter.astro:8`) | **No Google Play link.** The Android app exists (`com.wehale.app`, the Play URL returns 200). "Guided breathwork for iOS" (`Hero.astro:40`) tells Android visitors to leave. | Two official store badges (App Store + Google Play) in the hero and final CTA. The header "Download" picks the store from the user agent (desktop: scroll to the badges). Eyebrow: "Guided breathwork for iPhone and Android". Later, one OneLink for both (see section 5). | S |
| H5 | Medium | `Hero.astro:12` etc. | App Store link uses the Swedish storefront `apps.apple.com/se/app/wehale/id6739413667`. The server already uses the neutral `https://apps.apple.com/app/id6739413667`, which opens the visitor's own store. | Use the neutral link, defined once in a shared constant (it is copied four times now). | S |
| H6 | Medium | `Hero.astro:74-77`, `TrustStrip.astro:10-28` | Two contradicting ratings: "5.0 on the App Store" and, directly below it, five stars with "New on the App Store". The true figure is 5.0 from **8 ratings** (SE storefront, 28 Sep); 0 ratings in the UK. Five stars next to "New" reads as fake. | Say it honestly once: "5.0 · 8 ratings on the App Store (Sweden)", or leave the rating out until there are more. Remove the trust strip's stars. | S |
| H7 | Medium | `PhoneSlider.astro:157-161` | **Slider is broken.** `slider.querySelectorAll("[data-slide-dot]")` and `querySelector("[data-slide-caption]")` search inside `[data-phone-slider]`, but the dots and caption sit outside it (lines 126, 130). So the images auto-advance while the first dot stays selected and the caption stays "Your daily practice…". Clicking a dot does nothing. Measured: after 5 s slide 2 showed with dot 1 selected; after clicking dot 4, still slide 2 (`home-desktop-phone-slider-after-dot-4-click.jpg`). The dots are also 8×6 px tap targets (Lighthouse `target-size`). | Query from the section (`#product`), not the inner div. Make dots 44 px hit areas. Stop auto-advance (B10). | S |
| H8 | Medium | `FinalCta.astro:10-11` | **The final CTA's photo never renders.** The image layer is `-z-10` inside a section without `isolate`, so it paints behind the page background. The section is flat navy (`home-desktop-final-cta.jpg`), and the 99 KB image still downloads. | Add `isolate` to the section, as in the Hero, after replacing the image (B11). | S |
| H9 | Low | `PhoneSlider.astro:38` | "Tell it how you feel. It picks the right session." overstates the mood picker (principle 6). | "Tell it how you feel, and it suggests a session." | S |
| H10 | Low | Hero list vs `index.astro:15` vs `SessionShowcase.astro:87` vs `Pillars` | Lengths disagree: "Five to twenty minutes", "five to forty-five", "2–15 min". | One statement from the catalogue, e.g. "Most sessions 5–15 minutes; a few longer journeys." | S |
| H11 | Low | `index.astro:28-33`, `SiteFooter.astro:24-26` | The newsletter form appears twice at the bottom of home. It has no privacy link or consent wording next to it, although it posts emails to the production API with marketing consent. | Show it once; add "We'll email you occasionally. Unsubscribe any time. [Privacy]" under it. | S |
| H12 | Low | `SessionShowcase.astro:145` | "new sessions added every month": check this is true before keeping it. | Keep only if true. | S |
| H13 | Low | `src/components/UseCases.astro` | Unused component, and it would duplicate `id="sessions"` if used. | Delete. | S |

### About (`/about`), `about-mobile-full.jpg`
Purpose: trust in the people. Today the page mostly says "we don't have photos yet".
- **Medium** `about.astro:130-131`: "We'll add real photos once everyone's camera-ready." is placeholder
  copy in public. Remove it now. Add real photos (Edvin's voice is the product, so his face matters
  most). **S** now, **M** for photos.
- **Low** `about.astro:21,38`: Edvin has no surname and all founders are initial circles in category
  colours. Use full names if they agree. **S**.
- **Low** `about.astro:47-99`: Founder bios are shown twice (bio cards, then "The team" grid). Keep
  one. **S**.
- **Low**: There's no link to the app from About apart from the header. Add the store badges at the end. **S**.

### Support (`/support`), `support-mobile-first-screen.jpg`
Clear and useful. It isn't linked from the header or footer, so nobody can find it except via the App Store.
- **Medium** `SiteFooter.astro:29-55`: Add "Support" to the footer (and "Help" to the mobile menu). **S**.
- **Medium** `support.astro:21-34`: Only iPhone instructions. Add the Google Play path (the app's support
  AI already has it: Play app → profile → Payments & subscriptions). **S**.
- **Low** `support.astro:11`: "Effective: July 5, 2026" is legal-page chrome on a help page. Use
  "Updated" or nothing (the LegalLayout prop is shared). **S**.
- **Low**: Nothing explains what's free (the Welcome Period, then the Always Free sessions). A short FAQ
  entry in the app's own words would cut support mail. Wording needs Isak. **S**.

### Investors (`/investors`)
- **Medium** `investors.astro:10-12,88-90,131`: "launching May 2026", "Founding team: 6", "Live
  traction metrics published here post-launch as they materialize". It's September and the app
  is live, and six contradicts the three founders and one advisor shown below. For an investor this reads as
  abandoned. Update or remove the stats row. Investor communication is Red-tier, so Isak writes the
  figures. **S**.
- **Low** `investors.astro:88-91`: "the calmest, most credible app in a category that's been dominated by
  hype" is the kind of superlative the page itself says it avoids (line 15). **S**.
- **Low**: It sits in the main navigation next to Sessions and Stories. For ad visitors that's noise. Move it to the
  footer only. **S**.

### Privacy (`/privacy`) and Terms (`/terms`): off limits, issues for Isak only
- **High** `privacy.astro:383-407`: Section 6 describes Mixpanel, a cookie banner and consent that
  don't exist, and doesn't mention Google Analytics/GTM, which does run. It also mentions
  "wehale.io/business", which is gone (404). Either the site changes to match the policy (preferred:
  consent first, see T1) or the policy changes. Isak's wording.
- **Low**: The Terms read correctly for the store; section 3 is subscription-generic and doesn't
  describe the Welcome Period. That's a legal question for Isak, not a design one.
- Readability: long pages with no table of contents. A contents list at the top would help on
  mobile (`privacy-mobile-full.jpg` is 21,000 px tall). That's layout only, the wording stays as it is. **S**.

### 404 and deep links
- **Medium**: There's no `src/pages/404.astro`, so any bad link shows Netlify's white "If this is your site…"
  card (`404-mobile-first-screen.jpg`). It's off-brand and tells visitors the site is unmaintained. Add
  an on-brand 404 with the store badges and a link home. **S**.
- **Medium** `netlify.toml` (off limits, report only): `/session/*` → `/` (302) lands a person who
  tapped a session link from email on the generic home page, with nothing about the session they
  asked for (`session-link-mobile-first-screen.jpg`). Once /breathe exists, a softer fallback could be
  a page that names the session and offers "Open in the app / Get the app". That's the owner's and Isak's call,
  because the redirect and AASA are paired with the app.
- **Low**: Android has no App Links (`/.well-known/assetlinks.json` is 404 and the app has no
  `intentFilters` for wehale.io), so on Android session links always open the browser. That's worth doing
  together with the OneLink work.

## 3. Conversion readiness for paid traffic

A stranger from a Reels ad lands on the hero. What works: it's calm, fast, and the product is obvious
from the footage and the headline. What stops them:

1. **No offer and no price signal (High).** Without "free to start", people assume a paywall. The app's
   real offer is strong and honest. Say it in the hero, in the app's words, with Isak's yes on the wording:
   14 days with the whole library, then three sessions that stay free plus the first two days of the
   intro course; no card, nothing to cancel. Don't mention a trial or a discount (none exists in the store).
2. **Half the audience can't install (High).** No Google Play (H4).
3. **Claims an ad reviewer will flag (High).** Meta reviews the landing page as well as the ad. H1/H2 must be
   fixed before the first paid click.
4. **Thin social proof (Medium).** Three real reviews are good. Fix the contradicting stars (H6), put one review
   right under the hero, and add Edvin by name and face ("Guided by Edvin, breathwork teacher") as the
   strongest trust signal the product has.
5. **Nothing to try (Medium).** The whole page asks for an install. The web session (/breathe) is the planned
   answer. Until it exists, a 20–30 s muted clip of a real session (player + captions) would show the product
   better than static screenshots.
6. **Too many exits (Low).** Investors in the top nav; two newsletter forms. For ad traffic, the page should
   have one job.
7. **Measurement (High, but Isak's decision).** Today GA4 runs without consent (T1), and there's no way to
   attribute an install to a click. The paid test needs consent first, then the events and OneLink in
   SCOPE.md §8. Nothing was added in this audit.

## 4. Technical

| # | Sev | Where | Finding | Fix | Effort |
|---|---|---|---|---|---|
| T1 | High | `BaseLayout.astro:72-95` | GTM `GTM-NCPSJ2QF` → GA4 `G-3PNSPY5RNF` (event tags `app_store_click`, `scroll`, `support_submit_success`; link-click and scroll listeners) loads on every page before any consent. No banner. | Isak decides: remove GTM until a consent tool exists, or add a small consent banner and load GTM only after "Accept" (Consent Mode v2 default "denied"). Then update SCOPE.md §8 ("no analytics" is wrong). | S (remove) / M (consent) |
| T2 | Medium | `BaseLayout.astro:31`, `astro.config.mjs:8-13` | Canonical and `og:url` are `https://wehale.io/about.html` etc. (`build.format: "file"` makes `Astro.url.pathname` end in `.html`). The sitemap lists `/about`. Both `/about` and `/about.html` return 200. | Strip `.html` in the canonical helper (`pathname.replace(/\.html$/, "")`), or set the canonical per page. Optionally redirect `*.html` to the clean URL with a 301. | S |
| T3 | Medium | `public/sitemap.xml`, `public/robots.txt:4` | A hand-written April sitemap (lists `/business.html` → 404, `.html` URLs) overrides nothing but is the one robots.txt points to; the generated `sitemap-index.xml` is ignored. | Delete `public/sitemap.xml`; `Sitemap: https://wehale.io/sitemap-index.xml`. Set per-page `changefreq`/priority or drop them. | S |
| T4 | Medium | `netlify/functions/support.cjs` | Unused (only `legacy/support.html` called it), still deployed. It accepts any email address and sends that address a message containing submitted text, from WeHale Support via Postmark: a spam relay that could hurt the domain's mail reputation, if `POSTMARK_SERVER_TOKEN` is set. I did not call it. | Remove the function (and `legacy/` if nothing uses it), or at least stop sending the confirmation to the submitted address. Check whether the Netlify env still holds the token. | S |
| T5 | Medium | `netlify.toml` (report only) | Only HSTS (Netlify default, no `includeSubDomains`/preload). Missing: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`frame-ancestors`. | Add a `/*` headers block (the owner of main, since the file carries the session redirect): nosniff, `strict-origin-when-cross-origin`, `frame-ancestors 'none'`, a Permissions-Policy that disables camera/mic/geolocation, then a CSP once /breathe's needs (WebGL, audio origin, Supabase storage) are known. Leave the AASA block untouched. | S |
| T6 | Medium | Home, `lighthouse-home-mobile.json` | Mobile LCP 2.7 s (Lighthouse, slow 4G), LCP element = the hero `<video>` (838 KB MP4; poster is an old 73 KB UI screenshot). Home weighs 1.46 MB. | Poster: a small dusk still (≈30 KB AVIF/WebP) with `fetchpriority="high"` and a `<link rel="preload">`; serve a 540p portrait cut to phones (`<source media>`); keep `preload="metadata"`. | S |
| T7 | Low | `SessionShowcase.astro:103-108` | Session covers 1000×1500 shown at 340×255; Box Breath's WebP is 298 KB. Lighthouse: 353 KB wasted. No `width`/`height` on covers or the CTA image (CLS is 0 today only because of the aspect boxes). | Resize to 800 w + `srcset` 400/800, AVIF/WebP ≈40 KB each, add dimensions. Astro's `<Image>` does this. | S |
| T8 | Low | `public/assets/images/**.png` | 20 MB of unused PNG originals are deployed (next to the WebPs). | Move originals out of `public/` (they're in git LFS anyway). | S |
| T9 | Low | Header (`SiteHeader.astro:33`) | On mobile the nav is `hidden`; there is no menu at all, so About, Support, Privacy are reachable only via the footer. | A simple menu button (or a short second row) on mobile. | S |
| T10 | Low | Accessibility | Good: `lang="en"`, skip link, one `h1`, alt text on content images, decorative images `alt=""`, focus ring. Issues: contrast (B4); slider dots 8×6 px and a broken `tablist` (tabs with no `tabpanel`; buttons would do); footer headings are `h3` with no `h2`; stars in the trust strip have no text alternative; the hero `<ul>` uses "·" list items that screen readers read out. | Fix with B4/H7; footer headings as `h2` styled as captions; remove the bullet `li`s. | S |
| T11 | Low | SEO | Titles fine; meta descriptions fine but carry the claims (fix with H2). OG image 1200×630, 30 KB, `og:image:width/height` and `og:image:alt` missing; Twitter card present. JSON-LD says `operatingSystem: "iOS"` only, `price 0 USD`, `applicationCategory: HealthApplication`. | Add OG dimensions and alt; JSON-LD `"iOS, Android"` and consider `HealthAndFitnessApplication`/`LifestyleApplication` (less medical). Refresh the OG image with the new look. | S |
| T12 | Low | `package.json` | `npm audit`: 16 vulnerabilities (1 critical, 14 high), dev/build dependencies. Static output limits the exposure. | `npm audit fix` / bump Astro on a branch, rebuild, compare. | S |
| T13 | Low | Repo root | `_audit-screenshots.mjs`, `_to-webp.mjs`, `legacy/`, a README describing a v0 static site. | Tidy: move scripts to `scripts/`, delete `legacy/` after checking, rewrite the README for the Astro site. | S |

Fonts: one self-hosted variable woff2 (47 KB), preloaded, `swap`. That's good practice. Keep the same
approach for Nunito Sans (latin subset, one variable file).

## 5. Where /breathe fits

**Navigation.** /breathe is the page ads point at, so it shouldn't feel like a subpage of the brochure.
- Put it in the header as the one text link on mobile: "Try a session" (white text, not a button), next
  to "Get the app". Put it in the hero as the secondary action, replacing "Explore sessions".
- In the player itself, hide the site header and footer (full screen). Show them again on the end screen.

**Layout and shared parts to build first, so /breathe and the home page share them:**
- `tokens.css`: the app's colours, text levels, radius and motion (`--ease-enter: cubic-bezier(.33,1,.68,1)`,
  `--dur-enter: 500ms`, breath 4 s / 6 s), plus Nunito Sans. This is B1–B5 and B10, done once.
- `StoreButtons.astro`: App Store + Google Play badges, one shared URL constant, and later the OneLink
  carrying the session id.
- `PillButton.astro`: the white main action, as in the app.
- `OfferLine.astro`: the one approved sentence about the Welcome Period, so the hero, the /breathe end
  screen and Support never drift apart.
- A minimal `BreatheLayout` (no header or footer, `100dvh`, safe-area insets, `theme-color` `#090F1D`).
- `ConsentBanner` if measurement goes ahead. It must not block the session.

**Loading fast and feeling like the same product (Breath Canvas: WebGL, about 4 MB audio):**
- Render the start screen as plain HTML/CSS: title, "About 6 minutes, guided by Edvin", a white "Begin"
  pill, and a still of the first WebGL frame as a CSS background. First paint needs under 100 KB, with
  no WebGL and no audio.
- Load the WebGL bundle (`silk.js`) as a separate module after first paint (`type="module"`, or
  `requestIdleCallback`), and start the canvas behind the start screen.
- **Audio:** don't autoplay (browsers block it anyway). Fetch after the tap, or preload `metadata` only.
  Serve AAC/Opus at about 64–96 kbps mono voice+music (≈3 MB for 6 min). Stream it from Netlify's CDN or
  Supabase storage with `Accept-Ranges`, and start playing as soon as it can play through. Fade in over
  1.5 s (app `m.audio.fadeIn`).
- Honour Reduce Motion: a still background, and the breath line only. Keep a no-WebGL fallback (the field
  has one).
- Fonts: self-hosted Nunito Sans, not Google Fonts (the prototype loads it from `fonts.googleapis.com`,
  which also sends visitor IPs to Google before consent).
- Cache: hashed assets under `/_astro/` (already immutable, one year). Put the audio under `/assets/`
  with the same header.
- Size budget: start screen under 150 KB; WebGL bundle under 300 KB gzipped; audio streamed.
- Before launch: the claims check (SCOPE.md §8.2), consent, and the CSP from T5.

---

## Work plan

**Quick wins (1 day, one PR on the site, owner of main merges)**
1. Remove or rewrite the effect claims (H1, H2), with Edvin's and Isak's OK on the final lines.
2. Add the Google Play link and store badges; neutral App Store URL in one constant; eyebrow says iPhone and Android (H4, H5).
3. Fix the slider's dots and captions and stop the auto-advance; fix the final CTA's `isolate` (H7, H8).
4. One honest rating line; remove the trust strip's stars; fix or remove the Free badges (H6, H3 badges).
5. Remove the placeholder copy: About "camera-ready", Investors stale stats (Isak supplies figures) (About, Investors).
6. Canonical without `.html`; delete `public/sitemap.xml`; robots → `sitemap-index.xml` (T2, T3).
7. On-brand 404 page; Support in the footer (404, Support).
8. Remove `netlify/functions/support.cjs` (T4).
9. Text levels to the app's values (contrast AA) (B4).

**Next (1 week)**
1. Consent: remove GTM, or add a consent banner (Isak's decision), then align the privacy policy (T1).
2. The brand refresh onto the app's tokens: Nunito Sans, accent, type scale, no category colours, fewer borders, app motion (B1–B10).
3. Current app screenshots and a dusk poster; graded covers once uploaded; resolve the Magnific credit (B11, B12, T6, T7).
4. The offer line in the hero and a Support FAQ entry, wording approved by Isak (H3).
5. Shared components (`StoreButtons`, `PillButton`, `OfferLine`, `BreatheLayout`) and a mobile menu (section 5, T9).
6. Security headers, except the CSP (T5).

**Later**
1. /breathe on these components, with CSP, consent and OneLink.
2. Real photos of the team, and Edvin on the home page.
3. A session-aware fallback for `/session/*` links, and Android App Links.
4. A dependency upgrade and repo tidy (T12, T13); a table of contents on the legal pages (layout only).

## Decisions for Isak

1. **Analytics now:** remove GTM/GA4 from wehale.io until there is consent (my recommendation), or add a
   consent banner now? Either way, the privacy policy's section 6 needs your wording to match.
2. **Offer wording on the site:** OK to use the app's own Welcome words ("Your first 14 days are free.
   Everything in WeHale is open to you. No card needed.") in the hero and on Support?
3. **Claims:** OK to remove the "Why breathwork" effect bullets and the "calmer nervous system" lines,
   and replace them with descriptions of the practice (Edvin to check the new lines)?
4. **Rating:** show "5.0 · 8 ratings (Sweden)", or no rating until there are more?
5. **Investors page:** update the figures (which ones?), move it to the footer, or take it down until
   there's news?
6. **Photos:** credit the Magnific photos on the site, upgrade the plan, or replace them (same question as
   in the app's ASSETS.md); and do the founders want photos and full names on About?
7. **Unused support mail function:** OK to delete it?
8. **/breathe in the navigation:** "Try a session" as the header link and the hero's secondary action?
