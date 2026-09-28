# /breathe landing loop: log

The loop works to `docs/marketing/2026-q4-paid/LOOP-GOALS.md` (app repo, agreed with Isak 28 Sep 2026). Variant `?v=f`
starts as a copy of d; each iteration makes one change, runs the automatic checks, and is scored by a fresh blind
persona judge (a separate agent that sees only the screenshots, frames, copy, the persona cards and the rubric). A change
is kept only if the total rises and no score drops.

## How each version is tested
- Journey per person, from the ad's last frame and caption in the Reels mock: overloaded (`?h=parked&s=unravel`, 13:40),
  foggy (`?h=coffee&s=wake-up`, 15:05), challenger (`?h=keepup&s=wake-up`, 18:30), can't switch off
  (`?h=night&s=soft-reboot`, 23:20; the ad doesn't exist yet, so its frame is a stand-in: the "slowest" ad's end card
  with a draft caption "Lights off. Mind still on.").
- 375x812 and 375x667, Chromium with iPhone emulation (no element fullscreen, touch, Instagram UA), audio muted.
  Stills at arrival 0 / 0.3 / 0.8 / 1.5 / 3 s, after choosing, the save sheet, Start +0.5 / 1 / 2 / 3 s, the end screen;
  a screencast of the journey. WebKit (Playwright, iPhone) spot checks.
- Checks: Lighthouse mobile (simulated slow 4G, 2 runs), first paint, CLS, arrival frame timing at 4x CPU throttle,
  contrast of every glyph and icon against the pixels behind it (worst of the 5th/50th/95th percentile), Edvin's first
  word after the Start tap, tap targets >= 44 px, clipping.
- Scores: 8 criteria x 4 people, 1-5 (clarity3s, oneAction, choice, arrival, speed, adMatch, readability, honesty).

## Iterations

### 0. Baseline: d (as f, unchanged)
- Checks: Lighthouse 99 / 93; first paint 20-84 ms locally; CLS 0; arrival 55-58 fps at 4x CPU throttle (4-12 dropped
  frames, the worst while WebGL starts); contrast min 8.2:1 start screen, 6.7:1 sheet; Edvin's first word 1.07-1.23 s
  after Start (Wind down 0.4 s). Fails: "Save it for later" 42 px tall at 375x667, the sheet's close 40 px.
- Judge (two fresh blind passes, 117 and 122; mean 119.5 / 160, avg 3.73). Start: overloaded, foggy, switchoff yes;
  challenger no in one pass. Lowest: choice (2-3), adMatch (switchoff 2). The judges' reasons: the tile lines are tied
  to the clock ("Energy for your morning" at 15:00 and 18:30), three names per session (Wake up / The Wake Up /
  Activate), switchoff gets no ad line, the challenger's dare isn't followed through, frame 0 is black, the ad's gold
  orb doesn't carry into the Reset and Wind down pages.
- Judge noise: the same version scored 117 and 122 by two fresh judges, and single criteria move by 1 between passes.
  So every version from here gets **two** fresh blind judges and the rule is applied to their mean: keep if the mean
  total rises and no person's criterion falls by a full point or more. (Stricter single-judge comparisons are in
  the judge folder for the record.)

### 1. Tile lines say what the session does; one name per session - NOT KEPT
- Change: tile lines "Quick, lively breathing" / "A slow pause between things" / "Long exhales before sleep" (new
  `does_en` in breathe-sessions.json); the player's title and the save sheet use the tile's name ("Wake up · With
  Edvin · 6 min"). Plus a check fix: 44 px for the save button at 375x667 and the sheet's close.
- Checks: all pass (Lighthouse 93 / 99, CLS 0, contrast min 8.3:1, Edvin 1.08-1.22 s, no tap target under 44 px).
- Judge mean 119.5 -> 125.0 (choice 2.75 -> 3.6 avg), but challenger honesty 4.5 -> 3.5 ("quick, lively breathing is
  soft for a challenge"; the ad's own "the rest is slower"). Rule says revert; the tile lines stay in the data for the
  next move, which pairs them with a line that keeps the challenger's dare.

### 2. The line under the headline follows the ad; a night hook - NOT KEPT
- Change (on top of 1): each hook gets a `sub_en` line in breathe-hooks.json ("Breath of fire, then a long hold. 6
  minutes with Edvin, free." for keepup; "Try 6 minutes of breathing with Edvin instead. Free, no app needed." for
  coffee; ...) and a draft hook `night`, "Lights off. Mind still on." (Wind down; no ad uses it yet).
- Checks: all pass.
- Judge mean 119.0 (vs 119.5): switchoff got its line (adMatch 2 -> 3) and the challenger now says Start in both
  passes, but switchoff readability 4 -> 3 (the end-screen headline on the moon) and choice fell back to 2-3. The
  judges moved on to things that aren't copy: the particle field's hard rectangle at 375x667, the end screen headline
  over the orb, names changing after Start (the end screen says Unravel / The Soft Reboot), Edvin's first captions
  ("This is your morning reset" at 15:00). 1 and 2 are now flags (`does`, `sub`) in VARIANTS.f, off.

### 3. The room fades out at its edges - KEPT
- Change: while the sphere sits small between the headline and the tiles, the scaled-down field canvas had hard left
  and right edges (a visible rectangle at 375x667, called out by a judge as "not premium"). f masks it with a soft
  radial fade (`feather`), removed 1.1 s after Start once the room is full size again.
- Checks: all pass (Lighthouse 93 / 94; arrival 57.6-58 fps at 4x throttle, 5-6 dropped frames, same as d; CLS 0).
- Judge mean 119.5 -> 123.5, no criterion down a full point; Start from all four in both passes.
- Note found here: the three `score.json` files with `startAt` (Edvin 1 s after Start) were built locally but never
  committed, so the preview still started every session at 0:00 (Reset's first word at 4.8 s). Committed with this.

### 4. Retry of 1 + 2 on top of 3 - NOT KEPT
- Change: the `does` and `sub` flags on again, with a sharper Wake up line ("Fast breaths, then a long hold") and the
  keepup line "About 50 fast breaths in half a minute. 6 minutes with Edvin, free." (the breath of fire runs about
  29 s at 0.51 s a breath, so about 57). The judge kit now carries every person's copy, not only foggy's.
- Checks: all pass.
- Judge mean 123.5 -> 124.5, choice up (challenger 2 -> 3, foggy 2.5 -> 4), but challenger honesty 4.5 -> 3.5 again:
  one judge read "50 fast breaths in half a minute" as hype. Not kept; flags off.
- Note: the draft `night` hook line ("Lights off. Mind still on.") lives in the hook data since 2, so from 3 on the
  switchoff journey shows it as its headline in d and f alike. No ad links to it yet.

### 5. Arrive in the ad's amber world, take on the session's colour 1.3 s later - NOT KEPT
- Change (`adOrb`): every ad ends on the amber orb, so the room arrived as Ember for every session and cross-faded
  (1.4 s) to Water or Night 1.3 s after the words were in.
- Checks: all pass (56.8-57.5 fps, 6-8 dropped frames at 4x throttle; the extra cross-fade costs a little).
- Judge mean 123.5 -> 115.5: the judges saw the orb "visibly swap" at about 3 s ("then a grey moon swap"); switchoff
  wants the night palette from 0 s. Clearly worse; flag off.

### 6. Frame 0 is an orb like the ad's, in the session's colour; Start never looks greyed - NOT KEPT
- Change: an inline script placed the CSS poster's orb (a disc with a bright rim, drawn like the ad's last frame, in
  Ember, Water or Night) where the sphere will sit, before first paint; words and buttons reach full opacity at 35 %
  of their rise, so Start isn't a grey pill at 0.8 s.
- Checks: all pass (Lighthouse 99 / 99).
- Judge mean 123.5 -> 118.0 (foggy adMatch 5 -> 4, switchoff choice 4 -> 3). The judges still read Reset's teal and
  Wind down's moon as "not the ad's orb", and one flagged the moon's texture as a blotch. Reverted (the script is
  removed; its CSS is inert).
- Three iterations in a row without a keep (4, 5, 6): the plateau rule. Next is one bigger, different move.

### 7. The bigger move: the page fits the person's moment - KEPT, and f is the default
- Change (`moment`, with `does` and `sub` on again):
  - the chosen session is the big card (orb, name, what it does, 6 min); the other two are slim rows that grow into the
    big card when tapped. The sphere gets the space the rows give back.
  - tile lines say what the session does, not when ("Fast breaths, then a long hold" / "A slow pause between things"
    / "Long exhales before sleep"); one name per session on the tile, Start, player title, save sheet and end screen
    ("You just did Wake up.").
  - the line under the ad's headline follows the ad (`sub_en`): "Take 6 minutes with Edvin first. Free, no app
    needed." for parked; "Fast breaths, then a long hold. 6 minutes with Edvin, free." for keepup (no numbers after 4).
  - save for later offers "Remind me in 2 hours" (before 21:00), else "tomorrow at <this time>".
  - end screen: a darker ground under the words so the headline doesn't sit on the orb; next-time lines without a
    time of day (`next_f_en`). At night the Start pill is a softer cream.
- Checks: all pass (Lighthouse 94 / 94; 56.7-57.2 fps, 7-8 dropped frames at 4x throttle; contrast min 8.3:1 start,
  7.9:1 sheet; Edvin 1.08-1.22 s, Wind down 0.41 s; no tap target under 44 px; nothing clipped; CLS 0).
- Judge mean 123.5 -> 127.0 (vs d 119.5), no criterion down a full point, Start from all four in both passes.
  Passes disagreed widely (115 and 139).
- After judging, two small fixes: "6 min" no longer wraps in the big card, and Wake up's next-time line is
  "Next time you need a lift" (a judge saw foggy's "slump" on the challenger's end screen).
- Halfway milestone (m1).
- On the deployed preview (real network, Chromium, iPhone emulation): Edvin's first word 1.1-1.9 s after Start (Wind
  down 0.8-1.2 s), inside 2 s but with less margin than locally (the audio streams); CLS 0 in 7 of 8 loads and
  0.013 once at 375x667 (not reproduced in a focused test; open for m2).

## Second half (to m2): the lead's M1 rulings
Two blind passes per version with a full-point drop rule are now the rule. `?h=night` stays. The ads loop's M1 ads
replace the v1 ads as each person's last frame (overloaded now arrives from "Before the first email.", `?h=email&s=unravel`,
at 08:50); the judge brief says each person's ad is getting its own colour world. New baseline (f after the narrator
fix, the M1 ads): **125.0** (two passes, 124 and 126).

Fact fix, own commit: The Soft Reboot is guided by **Philip**, not Edvin (production database). `narrator` in
breathe-sessions.json; every name on the page follows the chosen session; the generic headline is "Breathe with us."

### 8. Skip the opening lines that don't fit - KEPT (8b)
- Change (`openings`, `web_start_f` in breathe-sessions.json): The Wake Up starts at 4.28 s, so the first words are "A
  short practice to clear the fog", not "This is your morning reset." (at 15:00 and 18:30). The Soft Reboot starts at
  9.35 s, past "Welcome to this breathwork session, which is designed to cultivate more peace, more calm, and a way
  for you to manage your stress more effectively" (a claim), so Philip's first words are "We'll be using a technique
  called 4-7-8". Unravel is unchanged ("Welcome. This practice is called the physiological sigh.").
- 8a started The Soft Reboot at 8.82 s, which showed the tail "more effectively." as the first caption; mean 124.5
  (flat). 8b (9.35 s) fixed that.
- Checks: all pass; the first word 1.08-1.25 s after Start, Philip 0.55 s.
- Judge mean 125.0 -> 131.0, no drops; Start from all four in both passes.
- Still said in The Wake Up's introduction: "let's begin this morning practice together" (36.6 s), part of the
  instructions, so it stays.

### The one-round journey (`?seen=round`), outside the scored four
People who already breathed a round with the guide in a 45-60 s ad: the subline is "That was one round. The whole
session is 6 minutes with <guide>, free.", Start reads "Continue with Edvin" (or Philip), and playback starts after
the session's introduction (`web_continue_f`: The Wake Up 39.86 s, first words "We'll start with four seconds in";
Unravel 39.04 s; The Soft Reboot 48.38 s). Tested for the challenger (keepup): the first word 1.1-1.2 s after the tap.

### 9. Frame 0 glows: an orb in the hook's colour world, before first paint - NOT KEPT
- Change (`glow`): each hook gets a `world` (the ads loop's plan: coffee and keepup ember, email and parked water,
  night night). An inline script, before first paint, sets the world and draws a CSS orb with a bright rim where the
  sphere will sit; words reach full opacity early. Found and fixed on the way: the hook's words went in after first
  paint and shifted the tiles (Lighthouse CLS 0.009-0.013), so the start screen is hidden until the words are final
  and f's layout classes are set before first paint. CLS 0 since.
- Judge mean 131.0 -> 123.5 (foggy arrival 4 -> 3, challenger choice 3 -> 2). Every judge: the bright ringed orb
  "dims into a dull brown disc by 0.8 s" (the live room behind the start screen is dimmed to 55 %). Reverted, and
  retried with the room lit in 11.

### 10. The challenge on the page: card, subline and first words - NOT KEPT
- Change (`edge`): with `?h=keepup` the Wake up card says "Three rounds, each one harder", the subline "Each round
  builds, then a long hold. 6 minutes with Edvin, free." and playback starts at 9.6 s: "We'll move through three
  breathing techniques, each one building in intensity." (both his words).
- Judge mean 131.0 -> 129.5; challenger choice stays 3.0 ("visually identical to the foggy page"). Flag off.

### 11. Frame 0 glows (retry), with the room kept lit - NOT KEPT
- Change: 9's glowing orb before first paint, plus the start screen's room at 90 % brightness instead of 55 %, so the
  orb doesn't dim after the live room takes over.
- Checks: all pass (Lighthouse 94 / 94, CLS 0, 58-59 fps).
- Judge mean 131.0 -> 125.0 (challenger honesty 5 -> 4, switchoff arrival 4 -> 3: "the bright moon and the cream
  button are glaring in the dark"). Reverted.
- 9, 10, 11: three in a row without a keep, the plateau rule again. 12 is the bigger move; after it, stop.

### 12. The bigger move: each person gets their own page - KEPT
- Change (`own`, with `edge` and `softMoon` on):
  - every row keeps its one line (unselected rows were bare names: "the choice feels defaulted");
  - the challenger's page (`?h=keepup`): the room at full contrast, a bolder headline, the challenge in amber ("Each
    round builds, then a long hold. 6 minutes with Edvin, free."), the card "Three rounds, each one harder", and
    Edvin starts at "We'll move through three breathing techniques, each one building in intensity" (10.1 s; at 9.6 s
    the previous caption still showed);
  - at night, Start is a quiet night-blue pill; Wind down's centre is a smooth pearl instead of the cratered moon
    (a new orb kind in the rim shader, f only).
- Checks: all pass (Lighthouse 93; 57.6-58.4 fps, 4-6 dropped frames at 4x throttle; CLS 0; contrast min 4.9:1, the
  amber challenge line on the brighter room, with a dark halo; 44 px targets; nothing clipped); the voice 0.6-1.35 s
  after Start.
- Judge mean 131.0 -> 133.5 (avg 4.17), no drops; Start from all four in both passes; challenger 3.88 -> 4.25.
- The plateau move lifted the score. With 12 iterations and the rest of the weak points on the ads' side, the loop
  stops here for m2.
