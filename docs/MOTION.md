# Motion on wehale.io

The site moves like the app. Tokens are ported from wehale-app `src/tokens/motion.ts` (`m`, `curve`, `spring`) and the
motion audit (`docs/reviews/2026-09-27-motion-audit/AUDIT.md`, item 2: press feedback). CSS variables live in
`src/styles/site.css` (`:root`), and the one JS helper is `src/scripts/motion.js`.

| App token | Value | Site | Used for |
|---|---|---|---|
| `m.press.in` / `m.press.out` | 100 / 220 ms | `--m-press-in`, `--m-press-out` | press in (curve.enter), release (standard curve) |
| PressableScale depth | 0.97 button, 0.985 card | `--press-button`, `--press-card` | `.btn`, `.btn-quiet` / `.press-card`, via `:active` and `.is-pressed` (touch) |
| `m.fade` | 400 ms | `--m-fade` | QR popover, dots |
| `m.enter` | 500 ms | `--m-enter` | entries |
| `m.stagger` | 80 ms, at most 4 | `--m-stagger` | reading-order stagger inside a section |
| `m.exit` | 300 ms | `--m-exit` | exits |
| `m.sheet.open` / `.close` | 450 / 300 ms | `--m-sheet-open`, `--m-sheet-close` | Get the app sheet, consent sheet |
| `m.reveal` | 800 ms | `--m-reveal` | section reveals, hero entry |
| `m.breath.in` / `.out` | 4000 / 6000 ms | `--m-breath-in`, `--m-breath-out` | the sphere (4 s in, 6 s out) |
| `curve.enter` | cubic-bezier(.33,1,.68,1) | `--curve-enter` | every entry |
| `curve.exit` | cubic-bezier(.32,0,.67,0) | `--curve-exit` | exits |
| `curve.breath` | cubic-bezier(.37,0,.63,1) | `--curve-breath` | breathing |
| `easing.standard` | cubic-bezier(.25,.1,.25,1) | `--curve-standard` | release |
| `spring.gentle` / `.settle` | no overshoot | /breathe's swipe (damping ≥ 0.85 of critical) | carousels |

## Choreography
- **Hero:** caption, headline, line, actions at 0 / 120 / 260 / 380 ms (`.hero-in`, `--d`), `m.reveal` on curve.enter.
- **Sections:** each `[data-reveal]` group enters once as it reaches the viewport, numbered in reading order within
  its section (`--i`, capped at 4) and staggered by `m.stagger`. No parallax.
- **Without JS, or with Reduce Motion:** everything is visible from the first paint. The hidden start state exists
  only under `html.motion`, which a one-line `<head>` script sets when JS runs and Reduce Motion is off.
- **Swipe rows (phones):** sessions, the app's screens and the reviews scroll with native momentum and snap
  (`scroll-snap-type: x mandatory`); dots follow; arrow keys move one item; desktop keeps a grid.
- **Microinteractions:** the guides' voice buttons show a live waveform from the audio (Web Audio analyser); on desktop,
  hovering or focusing "Get the app" shows its QR.
- **Nothing overshoots, nothing bounces.** Sound only on a tap. The film pauses off screen and has a pause control.

## Check
`node scripts/record-motion.mjs <url> <out>`: a muted phone recording top to bottom with the swipes, and the frame
rate while scrolling at 4× CPU throttle (headless Chrome; 29 Sep: 60 fps average, p95 16.8 ms, no frame over 33 ms,
CLS 0). A real mid-range phone is still the final check.
