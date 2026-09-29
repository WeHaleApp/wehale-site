# wehale.io redesign: direction

For the marketing lead and Isak, 29 Sep 2026. A proposal, not a rebuild. The prototype is at
`/redesign-preview` (home) and `/redesign-preview/about`. Both are unlinked, noindex, out of the
sitemap, with no GTM and no API calls. Use "Show copy changes" in the top bar (or `?marks`) to see every
rewritten line with the old wording, plus the lines that need Isak's yes. Screenshots and a contact
sheet: `~/Documents/WeHale ads review/2026-q4-paid/site-redesign/`.

## 1. The design language

The partner pages already look like WeHale does today. /breathe shows how the product feels. The app's
tokens make both precise. The site takes the partner pages' structure and the app's values.

| | Carry across the site | Source |
|---|---|---|
| **Type** | Nunito Sans, self-hosted (one variable woff2), with headings in medium 500. There are six web steps built from the app's eight: display `clamp(40–80px)` / 1.04, title1 28–44, title2 22–28, title3 18/600, body 16–17 / 1.55, footnote 14, caption 12/700 caps +0.12em. Balanced headings, pretty body text. | app `type.ts`, `fonts.ts`; partner `.p-h2`/`.p-body` |
| **Colour** | Navy `#090F1D` ground, with raised `#0E1525` and surface `#131926`. Off-white text at the app's four levels (1 / .72 / .55 / .35), so tertiary passes AA at 5.6:1. Sea glass `#45B5A0` for progress only, amber for ratings and milestones. No category colours. | app `colors.ts`, principles 3 and 4 |
| **Action** | One white pill per screen, and it names the action: "Try a session", "Begin". A quiet glass pill is the secondary. On hover the pill dims or presses; it never turns teal. | principle 2; partner `.p-btn` |
| **Depth** | Light, not lines. Photo bands with scrims, glass cards with a gradient from above, and a hairline only on image cards. No bordered boxes. | principle 4 |
| **Photography** | "The place, not the page". Each page opens on a photograph. The brand film still (closed eyes) goes on a right-hand panel on desktop and a top band on phones, so the headline never crosses the face. A full-bleed landscape band (forest at dawn) sits behind the belief line. Reuse only the stills the site and partner pages already have, then move to the graded Quiet dusk covers. | partner hero, `#tro` |
| **Rhythm** | A photo hero, then alternating sections: text and image in two columns, a full-bleed photo band, a grid, a raised band, then a centred sign-off. Section padding is 64 px on phones and 112 px on desktop, in a 1152 px container with a 20 px gutter. | partner page |
| **Motion** | Few moves, slow, and never overshooting. The hero enters in a stagger (0/120/260/380 ms). Each group reveals once, on the app's `enter` curve `cubic-bezier(.33,1,.68,1)`, with an 80 ms stagger for at most 4 items. There is a gentle scroll parallax on photo bands. The breathing light keeps the app tempo (4 s in, 6 s out). Nothing lifts or zooms on hover, and Reduce Motion gets still pages. | app `motion.ts` `m`; partner layout |
| **Voice** | Short, warm and plain. We describe what the practice *is*, never what it does to your body. We name Edvin. No swipes at meditation apps or caffeine. | principle 6; audit H1/H2/B13 |
| **Components** | Header, Footer, `StoreButtons` (both stores, one URL constant), `OfferLine` (the one approved sentence), photo hero, photo band, glass card, session tile ("BALANCE · 8 MIN"), review card and the breathing light. In the prototype they live in `src/components/redesign/` and `src/styles/redesign.css`. | audit §5 |

## 2. Keep, replace, drop

**Keep:** the navy ground and the logo. "Come back to yourself." stays as the line that opens and closes
the page. We keep the real App Store reviews, the session covers until the graded set is ready, the
founders' bios, Varberg, hello@wehale.io, the performance budget (static and fast), the skip link and a
single h1 per page.

**Replace:**
- Inter becomes Nunito Sans.
- `#7CB5A2` becomes `#45B5A0`, used for progress only.
- The dim text levels become the app's.
- The hero video with its old UI poster becomes a still, or later a short dusk loop with a dusk poster.
- The "Download on the App Store" pill becomes "Try a session" plus both stores.
- "Why breathwork?" and its effect bullets become "The practice", which describes the techniques and
  links Russo 2017 only as further reading.
- Pillars, with their icons, coloured titles and "Best for" tables, become three plain lines over a photo.
- The phone slider becomes two current screenshots, recaptured.
- About's initial circles and duplicate team grid become one set of bios.
- The duplicate newsletter forms become one quiet line in the footer, with the privacy wording.

**Drop:**
- the trust strip with its "New on the App Store" stars
- the "Free" badges on the wrong sessions
- "Investors" in the header (it moves to the footer)
- the final CTA photo of a person with the baked-in tagline
- `UseCases.astro`
- "new sessions added every month", unless it is true

## 3. Page map and navigation

```
Header:  WeHale | Sessions · About · Support | Get the app (text) | [Try a session] (white pill)
Phone:   WeHale | [Try a session] | ≡ (Sessions, About, Support, Get the app)

/            Home: hero → try it here (/breathe) → what WeHale is → belief band → library → reviews → the practice → sign-off
/breathe     The web session (PR #3), its own full-screen layout, the primary CTA everywhere
/about       People, why breathing, Varberg, say hello, try a session
/support     Help (restyled; Android steps and a "what's free" entry added)
/investors   Footer only; figures updated by Isak or the page paused
/credits /privacy /terms   Footer only; legal pages get the layout only, wording untouched
/for, /for/<slug>          Partner pages: unlisted (see §5)
/404         New, on brand: "This page isn't here." + Try a session + home
Footer:  stores · newsletter line · WeHale / Help / Legal columns (Support, Investors, Credits included)
```

"Try a session" is the one white action in the header and the hero, and it closes every page. "Get the
app" is the secondary action and scrolls to the stores in the footer. Later a user-agent check can open
the right store directly.

## 4. Audit items the redesign fixes

- **Brand:** B1–B10 (tokens, type, contrast, pills, no category colours, no borders, motion), B13–B14
  (voice, "course" not "journey").
- **Home:** H1 and H2 (claims rewritten and marked in the prototype), H3 (offer line, pending Isak; the
  Free badges are removed and the Always Free sessions named), H4 and H5 (both stores, neutral App Store
  URL in one constant), H6 (one honest rating line, pending Isak), H7 and H8 (slider and broken CTA photo
  removed), H9 and H10 (one length statement), H11 (one newsletter form with privacy wording), H13.
- **About:** the placeholder copy is removed, the bios appear once, and the page gets a CTA.
- **Support and navigation:** Support goes into the header and footer, and phones get a menu (T9). The
  footer headings become h2 (T10).
- **Conversion:** one job per page, and something to try before installing.

The redesign doesn't fix the items that stay outside the design: GA without consent (T1), the SEO
canonicals and sitemap (T2, T3), the mail function (T4), headers (T5) and the 20 MB of PNGs (T8). Ship
them in phase 1 alongside it. The layout drops GTM, so consent comes up again only if measurement is
added.

## 5. The partner pages: public or unlisted?

**For linking them publicly** ("For studios and teachers" in the footer):
- It gives the partner programme credibility and makes it findable. A studio that hears about WeHale can
  look it up.
- It brings inbound leads without outreach.
- It is SEO for "breathwork for yoga studios".

**For keeping them unlisted** (noindex, out of the nav and the sitemap, shared by invitation):
- A named page with the partner's own logo and tint, behind a password, reads as a proposal written for
  them, which is Isak's "more special". A public page turns it into a rate card.
- The pages carry commercial terms (referral maths, the gift we finance, pilot terms) that are still
  changing. Publishing them fixes prices in public and invites comparison between partners.
- They are in Swedish and written for a conversation, not for a cold visitor. Linking them from an
  English consumer site built for ad traffic adds an exit that is irrelevant to 99 % of visitors.
- The gate is soft: the HTML is readable by anyone. That works for "unlisted" but would look odd on a
  public page.

**My pick: unlisted, as Isak leans.** Keep `/for` and `/for/<slug>` noindex, out of the nav and out of
the sitemap, and keep the gate. They should still be visibly the same product, built on the same tokens
and components as the rest of the site, so a partner who clicks the logo lands on a site that looks like
their page. The public site only needs one line on About, "Studios and teachers: hello@wehale.io", which
brings in inbound interest without showing the terms. Revisit a public "For studios" page once the model
has settled after the pilot. It should be a short summary page, not the invitation.

## 6. Plan

**Phase 1: can ship this week** (one PR, owner of main merges; no design approval needed beyond the
claims)
1. Shared tokens: Nunito Sans, the app's colours and text levels, white-pill hover. These go into
   `global.css`, which is off limits here, so this item goes to the owner of main.
2. The claim rewrites on the current pages, using the prototype's lines (Edvin and Isak check them).
3. Both store buttons with one URL constant; "iPhone and Android"; remove the trust strip and the wrong
   Free badges.
4. The audit quick wins: the 404, Support in the footer, canonicals and sitemap, the mail function.

**Phase 2: the new home and About** (about a week after Isak's yes on this direction)
1. Promote `src/components/redesign/*` to the real components. BaseLayout takes the new header and
   footer.
2. Home and About as prototyped, pointing at `/breathe` once PR #3 merges.
3. Recapture the current app screens. Use a dusk poster as the hero still.

**Phase 3: the rest**
1. Support, Investors and Credits restyled. The legal pages get the layout and a table of contents only.
2. The graded session covers and a short dusk hero loop. The Magnific credit is resolved.
3. Put the partner pages on the shared tokens and components (they already match closely).
4. A session-aware `/session/*` fallback (with the owner of main; the redirect is paired with the app).

## 7. Decisions for Isak

1. **Direction:** go ahead with phase 2 on this design?
2. **Offer line:** "Your first 14 days are free, with everything open. No card needed." And name the three
   Always Free sessions? (access wording)
3. **Rating:** "5.0 · 8 ratings on the App Store (Sweden)", or no rating for now?
4. **Hero image:** the brand-film still of a woman's face (already the site's hero video), or a landscape
   only, as the ads plan says no people?
5. **Partner pages:** unlisted, with one "Studios and teachers" line on About. Agree?
6. **Claims:** do the rewritten lines work for you and Edvin (see "Show copy changes")?
