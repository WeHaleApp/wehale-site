# Round 2 audit: the one-thumb site

30 September 2026. Audited against section 7 of `SITE-GOALS.md` ("Round 2 goal"), with the four people from `LOOP-GOALS.md`
(both files are in the app repo, `docs/marketing/2026-q4-paid/`).

**What was audited:**
- **Live:** https://wehale.io, main at `75c389b` (#13).
- **Branch:** `claude/marketing-site-round2-nav` (PR #14, "Session page: a clear way back home on mobile"), built and served locally.

**How:**
- Headless Chrome at 375×812, 375×667 and 390×844, with an iPhone user agent and an Instagram in-app user agent for the ad arrivals.
- Sound muted, trackers blocked, nothing submitted, consent declined.
- Every /breathe state was opened: start, playing, paused, end, exit and the save sheet.
- Tap counts are in-page taps only; browser chrome doesn't count. "Fail" means the page offers no way to finish the task.

**Automatic checks (`scripts/check-site.mjs`):** 0 failures, live and branch, in 21 page/viewport runs each. The script
doesn't open the save sheet, which is why it missed the sheet's 40 px close control (problem 10).
Lighthouse was not run in this audit.

**Honest limit:** one judge, not the two blind judges from section 6. The inner voices are an informed guess, not users.
A real phone in Instagram and TikTok should confirm problem 5 before anything is built for it.

---

## 1. The four tasks

The four people, and the ad each arrives from:

| Person | Ad (hook) | Lands on |
|---|---|---|
| The overloaded | "Before the first email." (`?h=email`) | The Wake Up |
| The foggy | "Fourth coffee. Still foggy." (`?h=coffee`) | The Wake Up |
| The curious challenger | "Can you keep up with this?" (`?h=keepup`) | The Wake Up, "Start round 1" |
| The one who can't switch off | "Lights off. Mind still on." (`?h=night`) | The Soft Reboot |

### Task 1: "Start The Wake Up from the ad, stop after 1 minute, get back to the home page"

| Person | Live: taps | Live: result | Branch (PR 1): taps | Branch: result |
|---|---|---|---|---|
| Overloaded | Begin · (1 min) · tap the screen · × → exit, then nothing | **Fail** (3 taps, then stuck) | Begin · × · wehale.io | **Done, 3 taps** |
| Foggy | the same | **Fail** | the same | **Done, 3** |
| Challenger | Start round 1 · tap · × → exit, then nothing | **Fail** | Start round 1 · × · wehale.io | **Done, 3** |
| Can't switch off | ‹ · ‹ (to The Wake Up) · Begin · tap · × → exit, then nothing | **Fail** (5 taps, then stuck) | ‹ · ‹ · Begin · × · wehale.io | **Done, 5** |

**Inner voices (live):**
- **Overloaded:** 1 s "Before the first email. Yes." 3 s "Six minutes, fine." One minute in: "I need to go. Where's stop? Nothing on screen." Taps the screen, sees ×. At the exit screen: "Back to the session, Continue in the app, Save for later… I just want the website. The logo does nothing." Presses Back, and Instagram's feed comes back. Gives up.
- **Foggy:** "Fourth coffee, ha. That's me." When stopping: "Is it paused? Is it over?" At the exit screen: "Too many buttons."
- **Challenger:** "Start round 1: okay, game on." When stopping: "Where's the menu? No home, no logo link. That's sloppy."
- **Can't switch off:** "Lights off, yes, but you want The Wake Up? The arrows: is that another session?" Takes two taps to reach it. When stopping, the same dead end.

**Inner voices (branch):**
- The × stays visible while breathing: "Oh, there's the way out." The exit screen has one cream pill and "wehale.io" underneath: "There, the site."
- From the home page, `history.back()` returns them to the place they were reading. It was tested at a 1400 px scroll.

### Task 2: "Find out what the app costs" (starting from the ad page)

| Person | Live | Branch |
|---|---|---|
| All four | /breathe says "Your first 14 days in the app are free." Then what? There's no link, and Back leaves to Instagram. The only on-site answer is the end screen, after a whole session: "Everyone gets a 14-day Welcome Period…, then three sessions stay free forever." There's no price. Or: Save for later · "Get it in the app" (2 taps) → the App Store, and scroll to In-App Purchases. **Fail on the site** | ‹ wehale.io · ≡ · Support (3 taps + scroll) → "What's free? Your first 14 days are free, with everything open. After that, three sessions stay free…" There's still no price. **Partial**: they learn what's free, not what the rest costs |

**Inner voices (branch):**
- **Overloaded:** "Fine, it's free for two weeks. And then? I'm not reading the terms."
- **Foggy:** "Probably a subscription. How much?"
- **Challenger:** "No price anywhere is a red flag."
- **Can't switch off:** "Three free sessions is enough for me. But they don't say what 'everything' costs."

**Also:** Terms §3.1 says "Prices are displayed in the App and on the Site", but the site shows none.

### Task 3: "Get the app"

| From | Live | Branch |
|---|---|---|
| The ad page (start) | Save for later · "Get it in the app, it'll be waiting" = 2 taps. **Doubt:** "I don't want to save it, I want the app." | ‹ wehale.io · Get the app = **2 taps, no doubt**. The Save path still works |
| During the session | Tap the screen · "Continue in the app" = 2. It only shows while the controls are up | × · Get the app = 2. The link is always reachable |
| The home page | Get the app (hero) = **1** | 1 |

**Inner voices:**
- **Foggy (live):** "Where's the app? Oh, under 'Save for later'. Odd."
- **Challenger (branch):** "wehale.io, Get the app. Easy."
- **Everyone:** the OneLink opens the store. Whether Instagram's and TikTok's in-app browsers hand over cleanly was not verified on a device.

### Task 4: "Come back to a saved session"

| Step | Live | Branch |
|---|---|---|
| Save | Save for later · "Remind me in 2 hours" (Google Calendar) or "Share or copy the link" = **2 taps** | the same (PR 1 doesn't touch saving) |
| Come back | The calendar reminder → `/breathe?s=wake-up&src=saved` · Begin = **2 taps** | the same |

**Inner voices:**
- **Overloaded:** "Remind me in 2 hours, good." Inside Instagram, Google Calendar opens in the in-app browser and asks for a Google sign-in. "Ugh, never mind." They copy the link instead: "…and paste it where?"
- **Can't switch off:** "Remind me tonight" at 20:00 fits.
- **On return:** the page says "Breathe with Edvin." as if new. "Is this the one I saved?" It is (the right session, preselected), but nothing says so.
- **"Get it in the app, it'll be waiting":** the app today reads only the offer token (`deep_link_value`), not the session, so nothing is actually waiting. That's a promise the product doesn't keep yet.

### Section 6 scores (the /breathe journey, 1–5, one judge)

| Criterion | Live | Branch |
|---|---|---|
| 3-second clarity | 4 | 4 |
| One obvious action | 4 | 5 (exit and end now have one primary each) |
| The feeling in order | 4 | 4 |
| Trust and honesty | 3 | 3 (the offer wording and "it'll be waiting" are unchanged) |
| Craft and consistency | 3 | 4 |
| Speed | 4 | 4 |
| Match with the ad | 5 | 5 |
| **Total** | **27** | **29** |

The scores are the same for all four people. The night person's ad lands on their own session (The Soft Reboot, in the
night world); only Task 1's "The Wake Up" costs them two extra taps on the carousel arrows.

**Keep rule:** +2 (≥ 0.5) and nothing drops, so PR 1 is a keep. The site isn't "ready" yet: trust and honesty is 3 for everyone.

---

## 2. The problems, ranked by pain × reach

Pain and reach are each scored 1–5. Reach is the share of mobile visitors who meet the problem.

| # | Problem | Pain | Reach | Score | Smallest fix | Status |
|---|---|---|---|---|---|---|
| 1 | No way home from /breathe: the logo is an `<img>`, with no link on the start, end or exit screen. Back from an ad leaves the site | 5 | 5 | **25** | The logo links home, a quiet "‹ wehale.io" on the start screen, "wehale.io" on end and exit, `history.back()` when the visitor came from home | **PR #14** |
| 2 | While playing, the leave control is invisible; stopping needs a hunt (tap the screen, then find ×) | 4 | 5 | **20** | Keep × in sight at 62 % opacity while breathing | **PR #14** |
| 3 | "What does it cost?" has no answer on the site: no price anywhere, although Terms §3.1 says prices are on the Site | 4 | 4 | **16** | One Support answer, "What does it cost?", with the store prices (Isak's wording and numbers), and the offer line links to it | PR B (needs Isak) |
| 4 | The offer is said three ways: "Your first 14 days are free, with everything open." (site), "Your first 14 days in the app are free." (/breathe start), and "Everyone gets a 14-day Welcome Period…, then three sessions stay free forever." (end screen). "Free forever" is a claim, and Isak said the terms may change | 3 | 5 | **15** | Use `OFFER_LINE` on the /breathe start and as the end screen's standard copy (`breathe-offers.json` mirrors the server config, so agree it with the owner of main) | PR C |
| 5 | In the Instagram and TikTok in-app browsers, the page's own × and "‹ wehale.io" sit at top left, right under the browser's own × that closes everything. A mis-tap loses the visitor | 3 | 4 | **12** | Verify on a real phone first. If mis-taps happen, give the top controls 12 px more top offset in in-app browsers (the UA is already detected for the save sheet) | Verify |
| 6 | The exit screen is messy: the headline lies on the orb's ring, text sits on the particle field, and there are three stacked full-width pills plus a two-line explainer | 3 | 4 | **12** | The orb rests smaller above the words, a scrim, one cream pill, one row of quiet links. The same on the end screen | **PR #14** |
| 7 | "Get it in the app, it'll be waiting" promises the saved session opens in the app, but the app reads only the offer token | 3 | 3 | **9** | Copy: "Get the free app" / "The Wake Up is free in the app". Bring the promise back when the app reads the session | PR C |
| 8 | One action, five names: Get the app · Continue in the app · Continue in the WeHale app · Get it in the app · Open the WeHale app (§7.3: the same words everywhere) | 2 | 4 | **8** | "Get the app" everywhere. The end screen keeps "Continue in the app", the one place where "continue" is true | PR C |
| 9 | Saving inside Instagram or TikTok: "Remind me" opens Google Calendar in the webview (a sign-in wall), and the .ics option is hidden there | 3 | 2 | **6** | In in-app browsers, lead with "Share or copy the link", and label the calendar option "Opens Google Calendar" | PR E |
| 10 | The save sheet's close control is 40 px (§7.1 asks 44) | 2 | 2 | **4** | 44 px | **PR #14** |
| 11 | The phone menu's open state has no visible close: the icon stays ≡ and Escape doesn't close it. An outside tap does close it | 1 | 3 | 3 | Swap ≡ for × while open, and close on Escape (a few lines in `site.js`) | PR D |
| 12 | The header steps aside while scrolling down on phones, so the logo is out of sight until you scroll up | 1 | 3 | 3 | Keep it (a known pattern, and it comes back on the first scroll up). Revisit only if tests show doubt | — |
| 13 | Returning from a saved link, nothing says "this is the one you saved" | 1 | 1 | 1 | When `src=saved`, the subline reads "Your saved session · 6 min" | PR E |

### What already holds (checked, no change needed)
- Nothing overlaps at 375×812, 375×667 or 390×844 on the pages checked (the automatic check).
- On /breathe, the consent card never covers Begin, the end screen or the exit screen (branch, measured).
- The main actions sit in the lower half on /breathe (Begin at about 80 % of the height) and in the home hero.
- Tap targets are ≥ 44 px, apart from inline text links and problem 10.
- No tracking request before consent (network log, live and branch).
- The app-link files are untouched.

---

## 3. Small PRs, most painful first

| PR | Contents | Problems | Size | Blocked by |
|---|---|---|---|---|
| **#14** (open) | The way home and a calmer exit and end on /breathe | 1, 2, 6, 10 | 3 files | review |
| **B: "What it costs"** | A Support answer with the price, and the offer line links to it | 3 | 1–2 files | Isak: the price wording and numbers |
| **C: "One offer line, one name for the app"** | `OFFER_LINE` on /breathe start and end, "Get the app" everywhere, and the save sheet copy that doesn't promise | 4, 7, 8 | 3 files + `breathe-offers.json` | owner of main (the offer config mirror) |
| **D: "The menu shows its close"** | × while open, and Escape | 11 | 2 files | — |
| **E: "Saving from Instagram"** | Copy link first in in-app browsers, and the saved-return subline | 9, 13 | 2 files | — |
| **Verify** | A real iPhone in Instagram and TikTok: the top-left controls, the OneLink handover | 5 | no code | a phone |

The PR letters are placeholders; the fixes are not implemented here.
