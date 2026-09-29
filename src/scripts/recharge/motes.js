// The room's motes (src/pages/[campaign].astro): a sparse field of faint warm-white specks rising very slowly, like
// bubbles in still water; near the orb they take a little blackcurrant and brighten a touch with its inhale. One small
// 2D canvas over the still CSS field, loaded after the page has arrived; nothing with Reduce Motion, nothing while the
// tab is hidden. Its clock is the document timeline, the same one the orb's CSS breath runs on.
const WARM = [246, 238, 228], BERRY = [222, 184, 210];
const BREATH = 10000, IN = 0.4;   // ms, and the inhale's share (the app's 4 s in, 6 s out)

export function startMotes(canvas, orb, breathStart) {
  const rm = matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!ctx || rm.matches) return () => {};
  const now = () => (document.timeline && document.timeline.currentTime != null ? document.timeline.currentTime : performance.now());
  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0, H = 0, ox = 0, oy = 0, orr = 80, raf = 0, last = 0;
  const motes = [];
  const seed = (m, y) => { m.x = rnd(0, W); m.y = y ?? rnd(0, H); m.r = rnd(0.5, 1.5); m.v = rnd(5, 12); m.a = rnd(0.16, 0.46);
    m.ph = rnd(0, 6.283); m.sw = rnd(0.12, 0.3); m.amp = rnd(3, 11); return m; };
  const place = () => { const r = orb.getBoundingClientRect(), i = orb.querySelector("i"); ox = r.left + r.width / 2; oy = r.top + r.height / 2; orr = (i ? i.offsetWidth : 168) / 2; };
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(48, Math.max(22, (W * H) / 11000)));   // sparse: ~28 on a phone, 48 at most on a desktop
    while (motes.length < n) motes.push(seed({}));
    motes.length = n; for (const m of motes) if (m.x > W) seed(m);
    place();
  };
  // the breath, 0 (fully out) to 1 (fully in), on the CSS curve's shape (a smooth ease in and out)
  const breath = (t) => { const u = (((t - breathStart) % BREATH) + BREATH) % BREATH / BREATH, s = u < IN ? u / IN : 1 - (u - IN) / (1 - IN); return s * s * (3 - 2 * s); };
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const t = now(), dt = Math.min(0.05, Math.max(0, (t - (last || t)) / 1000)); last = t;
    const ts = t / 1000, br = breath(t);
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.y -= m.v * dt; if (m.y < -8) seed(m, H + 8);
      const x = m.x + Math.sin(ts * m.sw + m.ph) * m.amp;
      // k: 1 at the orb's rim, fading to 0 about one and a half radii out
      const d = Math.hypot(x - ox, m.y - oy), k = Math.max(0, Math.min(1, 1 - (d - orr) / (orr * 1.5)));
      const edge = Math.min(1, m.y / (H * 0.14), (H - m.y) / (H * 0.1));   // born and gone softly at the edges
      const yu = Math.min(1, Math.max(0, (m.y / H - 0.52) / 0.14)), low = 1 - 0.5 * yu * yu * (3 - 2 * yu);   // quieter behind the words
      const tw = 0.78 + 0.22 * Math.sin(ts * 0.5 + m.ph * 2);                // a slow shimmer, never a twinkle
      const a = m.a * tw * Math.max(0, edge) * low * (1 + k * (0.35 + 0.45 * br));
      if (a < 0.01) continue;
      const c = k > 0 ? WARM.map((w, j) => Math.round(w + (BERRY[j] - w) * k)) : WARM;
      ctx.globalAlpha = Math.min(0.85, a); ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.beginPath(); ctx.arc(x, m.y, m.r * (1 + 0.25 * k), 0, 6.283); ctx.fill();
    }
  };
  const run = () => { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  const halt = () => { cancelAnimationFrame(raf); raf = 0; };
  const onVis = () => (document.hidden ? halt() : run());
  const stop = () => { halt(); ctx.clearRect(0, 0, W, H); canvas.classList.remove("on"); removeEventListener("resize", size); removeEventListener("scroll", place); document.removeEventListener("visibilitychange", onVis); };
  size(); addEventListener("resize", size); addEventListener("scroll", place, { passive: true }); document.addEventListener("visibilitychange", onVis);
  if (rm.addEventListener) rm.addEventListener("change", (e) => e.matches && stop());
  setTimeout(place, 1000);   // after the orb's bloom
  run(); requestAnimationFrame(() => canvas.classList.add("on"));
  return stop;
}
