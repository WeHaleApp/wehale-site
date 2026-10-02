var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
};

// vendor/app/session-visual/colourScript.ts
var TONES = {
  ember: { hot: [1, 0.45, 0.08], pale: [1, 0.88, 0.66], deep: [0.85, 0.26, 0.05] },
  dawn: { hot: [1, 0.42, 0.35], pale: [1, 0.9, 0.84], deep: [0.72, 0.26, 0.3] },
  water: { hot: [0.1, 0.72, 0.78], pale: [0.75, 0.95, 1], deep: [0.03, 0.34, 0.48], amp: 0.35 },
  // amp: how far the brightness moves (calm worlds move less)
  night: { hot: [0.66, 0.72, 1], pale: [0.95, 0.95, 1], deep: [0.3, 0.36, 0.66], amp: 0.6 },
  moss: { hot: [0.78, 0.82, 0.16], pale: [0.95, 0.95, 0.72], deep: [0.34, 0.46, 0.12] }
}, ARC = {
  start: { lum: 0.95, sat: 0.9, warm: 0, glow: 1 },
  // deep (0..1): how much a warm lean uses the deep tone instead of the hot one
  arrival: { lum: 0.8, sat: 0.8, warm: -0.15, glow: 0.85 },
  // dusky, low: first light
  box: { lum: 1, sat: 1, warm: 0, glow: 1 },
  // steady, balanced
  fire: { lum: 1.1, sat: 1.22, warm: 0.5, glow: 1.12 },
  // hotter, more saturated
  gear: { lum: 1.18, sat: 1.3, warm: 0.7, glow: 1.22 },
  // the peak: hottest, strongest contrast
  hold: { lum: 0.9, sat: 0.72, warm: -0.1, glow: 0.95 },
  // quieter, less saturated, still warm
  release: { lum: 1.15, sat: 1.08, warm: 0.4, glow: 1.3 },
  // a golden bloom spreading out
  empty: { lum: 0.72, sat: 1, warm: 0.45, glow: 0.9, tone: "deep" },
  // a low, deep ember (in each world's own deep tone)
  round2: { lum: 1.12, sat: 1.2, warm: 0.55, glow: 1.18 },
  // the richest
  integration: { lum: 1.05, sat: 0.78, warm: -0.35, glow: 1.08 },
  // soft, luminous, pale afterglow
  closing: { lum: 0.66, sat: 0.7, warm: 0.1, glow: 0.8 }
  // a gentle dusk
}, TAU = { lum: 3, sat: 3.5, warm: 4, glow: 2.5, deep: 4 };
function section(bc) {
  if (!bc || !bc.session)
    return "start";
  let at = bc.at, ph = bc.phaseAt(at), e = bc.cur, ty = e ? e.type : "";
  return ph === "Arrival" ? "arrival" : ph === "Four in, four out" ? "box" : ph === "Breath of fire" ? "fire" : ph === "Last gear" ? "gear" : ph === "Integration" ? "integration" : ph === "Closing" || ph === "" ? "closing" : ty === "holdEmpty" ? "empty" : ty === "hold" ? "hold" : ty === "release" && at - e.t < 4 ? "release" : (bc.late ? bc.late(at) : at > 205) ? "round2" : "box";
}
function create(world) {
  let m = Object.assign({}, ARC.start), name = world || "ember", sec = "start";
  return {
    get section() {
      return sec;
    },
    setWorld(w) {
      name = w;
    },
    update(dt, bc) {
      sec = section(bc);
      let T = ARC[sec] || ARC.box;
      for (let k in TAU) {
        let tv = k === "deep" ? T.tone === "deep" ? 1 : 0 : T[k];
        m[k] = (m[k] ?? tv) + (tv - (m[k] ?? tv)) * (1 - Math.exp(-Math.max(0, dt || 0) / TAU[k]));
      }
      return m;
    },
    get mods() {
      return m;
    },
    get world() {
      return name;
    }
  };
}
function apply(c, m, world) {
  let t2 = TONES[world] || TONES.ember, r = c[0], g = c[1], b = c[2], L0 = Math.max(1e-4, 0.3 * r + 0.59 * g + 0.11 * b);
  if (m.warm > 0) {
    let k = m.warm * 0.7, dp = m.deep || 0, h = [0, 1, 2].map((i) => t2.hot[i] + (t2.deep[i] - t2.hot[i]) * dp), Lh = 0.3 * h[0] + 0.59 * h[1] + 0.11 * h[2], s = L0 / Lh;
    r += (h[0] * s - r) * k, g += (h[1] * s - g) * k, b += (h[2] * s - b) * k;
  } else if (m.warm < 0) {
    let k = -m.warm * 0.7, h = t2.pale, Lh = 0.3 * h[0] + 0.59 * h[1] + 0.11 * h[2], s = L0 / Lh;
    r += (h[0] * s - r) * k, g += (h[1] * s - g) * k, b += (h[2] * s - b) * k;
  }
  let L = 0.3 * r + 0.59 * g + 0.11 * b;
  r = L + (r - L) * m.sat, g = L + (g - L) * m.sat, b = L + (b - L) * m.sat;
  let lm = 1 + (m.lum - 1) * (t2.amp ?? 1);
  return [Math.max(1e-4, r * lm), Math.max(1e-4, g * lm), Math.max(1e-4, b * lm)];
}
var colourScript = { create, apply, section, ARC, TONES };

// vendor/app/session-visual/foundation.ts
var LS_PARAMS = [
  ["size", "Size", 0.6, 1.5],
  ["reachX", "Reach sideways", 0, 1.5],
  ["reachY", "Reach up/down", 0, 1.5],
  ["ambient", "Ambient light", 0, 2],
  ["softness", "Softness", 0.6, 1.6],
  ["warmth", "Warmth", 0.5, 1.4],
  ["strands", "Strands", 0.4, 1.3],
  ["energy", "Energy", 0.6, 1.3],
  ["line", "Breath line", 0, 1.5],
  ["firePulse", "Fire pulse", 0, 2],
  ["holdDim", "Hold dimness", 0.5, 1.5]
], LS_SECS = [["arrival", "Arrival", "Arr", 0], ["box", "Four in, four out", "Box", 40.9], ["fire", "Breath of fire", "Fire", 92.8], ["gear", "Last gear", "Gear", 121.9], ["hold", "Top hold (full)", "Top", 165], ["empty", "Bottom hold (empty)", "Bot", 176.3], ["release", "Release", "Rel", 173.5], ["integration", "Integration", "Int", 246], ["closing", "Closing", "End", 327]], LS_DEF = {
  size: [1.05, 1.12, 1.25, 1.5, 1.35, 0.72, 1.1, 0.84, 0.78],
  reachX: [1, 1, 1.3, 1.5, 1.4, 0.6, 1.1, 0.75, 0.55],
  reachY: [1, 1, 1.3, 1.5, 1.4, 0.6, 1.1, 0.75, 0.55],
  ambient: [1.1, 0.9, 0.6, 0.55, 0.8, 0.7, 0.9, 0.7, 0.8],
  softness: [1.1, 1, 0.92, 0.85, 0.9, 1.3, 1.05, 1.25, 1.3],
  warmth: [1.25, 1.2, 1.35, 1.3, 1.3, 0.85, 1.1, 1.1, 1],
  strands: [0.9, 1, 1.05, 1.2, 1.05, 0.6, 1, 0.8, 0.65],
  energy: [1.1, 1.15, 1.25, 1.3, 1.22, 0.9, 1.05, 0.8, 0.85],
  line: [0.8, 1, 1, 1, 1, 1, 1, 0.6, 0.5],
  firePulse: [1, 1.1, 1.5, 1.6, 1.1, 1, 1, 1, 1],
  holdDim: [1, 1, 1, 1, 1, 1, 1, 1, 1]
}, lsMake = (f) => {
  let o = {};
  return LS_SECS.forEach(([k], i) => {
    o[k] = {}, LS_PARAMS.forEach(([p]) => {
      o[k][p] = f(p, i);
    });
  }), o;
}, LS_DEFAULT = lsMake((p, i) => LS_DEF[p][i]), LS_FLAT = lsMake(() => 1), DEFAULTS = {
  lookScore: LS_DEFAULT,
  transT: 2.5,
  skin: "silk",
  colour: "journey",
  sfx: "on",
  sfxVol: 0.55,
  sfxChar: "airy",
  caps: "below",
  holds: "new",
  cue: "axis",
  line: "thread",
  lead: 0.3,
  energy: 1,
  softness: 1,
  warmth: 0,
  presence: 1,
  warmSpeed: 1,
  follow: 1,
  firePulse: 1,
  holdDim: 0.46,
  texture: "off",
  texStrength: 1,
  texDensity: 0.5,
  texBeat: "fire",
  texDir: "converge",
  texRest: 0.1,
  texDepth: 1,
  texPar: 0.5,
  behind: 0.6,
  phaseLabel: "sub",
  skipStyle: "text",
  brandStyle: "text",
  heroRule: "mid",
  brandTop: "on",
  brandPlayer: "off",
  brandLine: "off",
  brandWording: "collab",
  brandOrder: "logo",
  countdown: "light",
  layout: "spec",
  heroY: 0.47,
  lineAdj: -84,
  ctlOff: 20,
  capPos: 0.85,
  render: "auto",
  coupling: 1,
  startField: 0.22,
  bgReach: 1,
  bgLag: 0.8,
  ambient: 1,
  chargeK: 1,
  carry: 1,
  floorA: 0.65,
  size: 1,
  reachX: 0.8,
  reachY: 0.85,
  touchReach: 1,
  holdDur: 1.5,
  curve: { arrival: 1, box: 1, fire: 1, gear: 1, holds: 1, integration: 1 },
  ring: !1,
  captions: !0,
  guides: !1
}, clone = (o) => JSON.parse(JSON.stringify(o));
var KIND_NAME = { arrival: "Arrival", steady: "Four in, four out", fire: "Breath of fire", peak: "Last gear", holds: "Hold and release", integration: "Integration", closing: "Closing" };
function makeScore(SC) {
  let PH = SC.phases.map((p) => [p[0], p[1], KIND_NAME[p[3]] || p[2]]), DUR = +SC.dur, phaseAt = (t2) => {
    for (let p of PH)
      if (t2 >= p[0] && t2 < p[1])
        return p[2];
    return "";
  }, sh = SC.shape || {}, FIRE = sh.fire || null, BOX = sh.box || null, WARP = sh.warp || null, LEAD = sh.lead || null, BRIDGE = sh.bridge || [], NATURAL = sh.natural || [], inFire = (t2) => !!FIRE && t2 > FIRE.from && t2 < FIRE.to, arrB = (t2) => {
    let B = SC.breath, x = t2 * SC.fps, i = Math.floor(x), f = x - i, n = B.length - 1;
    return i < 0 ? B[0] : i >= n ? B[n] : B[i] + (B[i + 1] - B[i]) * f;
  };
  function fireB(t2) {
    let F = FIRE, n = Math.floor((t2 - F.t0) / F.P);
    if (n < F.n0)
      return F.hi;
    n > F.n1 && (n = F.n1);
    let tau = t2 - (F.t0 + n * F.P);
    if (tau < 0)
      return F.hi;
    if (tau < F.snap) {
      let u = tau / F.snap;
      return F.hi - (F.hi - F.lo) * (1 - Math.pow(1 - u, 3));
    }
    return F.lo + (F.hi - F.lo) * (1 - Math.exp(-(tau - F.snap) / 0.15));
  }
  function warp(t2) {
    if (!WARP)
      return t2;
    for (let i = 1; i < WARP.length; i++) {
      let [n1, o1] = WARP[i];
      if (t2 <= n1) {
        let [n0, o0] = WARP[i - 1];
        return o0 + (o1 - o0) * (t2 - n0) / (n1 - n0);
      }
    }
    return t2;
  }
  function boxB(t2) {
    let x = (t2 - BOX.t0) / BOX.P, n = Math.floor(x), u = x - n, s = (1 - BOX.a) * u + BOX.a * (0.5 - 0.5 * Math.cos(Math.PI * u));
    return n % 2 === 0 ? BOX.lo + (BOX.hi - BOX.lo) * s : BOX.hi - (BOX.hi - BOX.lo) * s;
  }
  function natB(t2, t0, seed, base, depth, P) {
    let c = t0, i = 0, r = (x) => {
      let s = Math.sin(i * 12.9898 + seed * 78.233 + x * 4.1) * 43758.5453;
      return s - Math.floor(s);
    };
    if (t2 < c)
      return base;
    for (; i < 400; i++) {
      let len = P * (0.82 + 0.36 * r(1));
      if (t2 < c + len) {
        let u = (t2 - c) / len, dp = depth * (0.75 + 0.5 * r(2)), ins = 0.36 + 0.08 * r(3), y = u < ins ? 0.5 - 0.5 * Math.cos(Math.PI * u / ins) : 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, (u - ins) / ((1 - ins) * 0.86)));
        return base + dp * y;
      }
      c += len;
    }
    return base;
  }
  let inLead = (t2) => !!LEAD && t2 >= LEAD.t0 && t2 < LEAD.t1;
  function breathAt(t2) {
    let v = inLead(t2) ? arrB(t2 + LEAD.s) : arrB(warp(t2));
    for (let g of BRIDGE)
      if (t2 > g[0] && t2 < g[1]) {
        let v0 = g[2] == null ? arrB(warp(g[0])) : g[2] === "lead" ? arrB(g[0] + (LEAD ? LEAD.s : 0)) : g[2], u = (t2 - g[0]) / (g[1] - g[0]);
        return v0 + (g[3] - v0) * (g[4] === "s" ? u * u * (3 - 2 * u) : 0.5 - 0.5 * Math.cos(Math.PI * u));
      }
    BOX && t2 > BOX.t0 && t2 < BOX.t0 + BOX.n * BOX.P && (v = boxB(t2));
    for (let N of NATURAL)
      if (t2 > N.from && t2 < N.to) {
        let nat = natB(t2, N.t0, N.seed, N.base, N.depth, N.P), m = Math.min(1, Math.max(0, (N.to - t2) / (N.fade || 2)));
        v = v + (nat - v) * m * m * (3 - 2 * m);
      }
    if (inFire(t2)) {
      let wg = Math.max(0, Math.min(1, (t2 - FIRE.from) / (FIRE.fadeIn || 0.6), (FIRE.to - t2) / (FIRE.fadeOut || 0.35)));
      v += (fireB(t2) - v) * wg;
    }
    return v;
  }
  let fireW = (t2) => inFire(t2) ? Math.max(0, Math.min(1, (t2 - FIRE.from) / (FIRE.fadeIn || 0.6), (FIRE.to - t2) / (FIRE.fadeOut || 0.35))) : 0, kicks = [];
  if (FIRE)
    for (let n = FIRE.n0; n <= FIRE.n1; n++) {
      let tk = FIRE.t0 + n * FIRE.P;
      tk > FIRE.from && tk < FIRE.to && kicks.push(tk);
    }
  function buildEV() {
    let N = Math.floor(DUR * 50), cls = [], quiet = (t2) => {
      let ph = phaseAt(t2);
      return ph === "Arrival" || ph === "Integration" || ph === "Closing" || ph === "";
    };
    for (let i = 0; i < N; i++) {
      let t2 = i / 50;
      if (inFire(t2) || quiet(t2)) {
        cls.push("x");
        continue;
      }
      let v = (breathAt(t2 + 0.03) - breathAt(t2 - 0.03)) / 0.06, bb = breathAt(t2);
      cls.push(v > 0.07 ? "in" : v < -0.07 ? "out" : bb > 0.7 ? "hold" : bb < 0.3 ? "low" : "mid");
    }
    let runs = [];
    for (let i = 0; i < N; ) {
      let j = i;
      for (; j < N && cls[j] === cls[i]; )
        j++;
      runs.push({ ty: cls[i], t: i / 50, d: (j - i) / 50 }), i = j;
    }
    let out = [], last = "", ext = (t2, up) => {
      let bv = breathAt(t2);
      for (let u = t2 - 0.9; u <= t2; u += 0.01) {
        let x = breathAt(u);
        (up ? x < bv : x > bv) && (bv = x);
      }
      let bt = t2;
      for (let u = t2; u >= t2 - 0.9; u -= 0.01) {
        let x = breathAt(u);
        if (Math.abs(x - bv) < 15e-4) {
          bt = u;
          break;
        }
      }
      return bt;
    }, arrive = (t2) => {
      let pl = breathAt(t2 + 0.3), bt = t2;
      for (let u = t2; u >= t2 - 2; u -= 0.01)
        if (Math.abs(breathAt(u) - pl) > 0.05) {
          bt = u + 0.01;
          break;
        }
      return bt;
    };
    for (let r of runs)
      r.ty === "in" && r.d >= 0.2 ? (out.push({ t: ext(r.t, !0), type: "in" }), last = "in") : r.ty === "out" && r.d >= 0.2 ? (out.push({ t: ext(r.t, !1), type: last === "hold" ? "release" : "out" }), last = "out") : r.ty === "hold" && r.d >= 0.8 ? (out.push({ t: arrive(r.t), type: "hold" }), last = "hold") : r.ty === "low" && r.d >= 4 && phaseAt(r.t) === "Hold and release" && (out.push({ t: r.t, type: "holdEmpty" }), last = "holdEmpty");
    out.sort((a, b) => a.t - b.t);
    for (let i = 0; i < out.length; i++)
      if (out[i].type === "hold" || out[i].type === "holdEmpty") {
        let nx = out[i + 1];
        out[i].dur = nx ? nx.t - out[i].t : 0;
      }
    return out;
  }
  let EV = buildEV(), hb = PH.find((p) => p[2] === "Hold and release"), lateT = SC.late != null ? SC.late : hb ? (hb[0] + hb[1]) / 2 : 1e9, curEv = (t2) => {
    let e = null;
    for (let x of EV)
      if (x.t <= t2)
        e = x;
      else
        break;
    return e;
  }, bcAt = (t2) => ({ session: !0, at: t2, phaseAt, cur: curEv(t2), late: (x) => x > lateT });
  return { SC, DUR, PH, phaseAt, breathAt, fireW, kicks, cues: SC.cues || [], EV, curEv, bcAt, caps: SC.caps || [] };
}
var AMBW = [["start", 1], ["arrival", 1], ["box", 0.55], ["fire", 0.12], ["gear", 0.12], ["hold", 0.9], ["empty", 1.5], ["release", 0.7], ["round2", 0.6], ["integration", 1], ["closing", 1]], GROUP_KEYS = ["start", "arrival", "box", "fire", "gear", "hold", "empty", "release", "round2", "integration", "closing"], TAU2 = { hold: 0.6, empty: 0.6, closing: 2.5, integration: 2, fire: 0.8, gear: 0.8 };
var JOURNEY = [[0, 0], [40.9, 0.05], [92.8, 0.26], [121.9, 0.46], [160.5, 0.66], [246, 0.78], [327, 0.9], [340, 0.95]], journeyAt = (t2) => {
  for (let i = 1; i < JOURNEY.length; i++)
    if (t2 <= JOURNEY[i][0]) {
      let [a, va] = JOURNEY[i - 1], [b, vb] = JOURNEY[i], u = (t2 - a) / (b - a), s = u * u * (3 - 2 * u);
      return va + (vb - va) * s;
    }
  return 1;
}, HZ = 60;
function analyse(SCR) {
  let N = Math.floor(SCR.DUR * 100), b = new Float32Array(N + 12);
  for (let i = 0; i < b.length; i++)
    b[i] = SCR.breathAt(i / 100);
  let cls = new Int8Array(N + 1);
  for (let i = 0; i <= N; i++) {
    let a = Math.max(0, i - 5), c = Math.min(b.length - 1, i + 5), v = (b[c] - b[a]) / ((c - a) / 100);
    cls[i] = SCR.fireW(i / 100) > 0 ? 0 : v > 0.08 ? 1 : v < -0.08 ? -1 : 0;
  }
  let runs = [];
  for (let i = 0; i <= N; ) {
    let j = i;
    for (; j <= N && cls[j] === cls[i]; )
      j++;
    runs.push({ c: cls[i], t0: i / 100, t1: j / 100 }), i = j;
  }
  let segs = runs.filter((r) => r.c && r.t1 - r.t0 >= 0.25), turns = [];
  for (let k = 1; k < segs.length; k++) {
    let a = segs[k - 1], c = segs[k];
    a.c === c.c || c.t0 - a.t1 > 0.6 || turns.push({ t: (a.t1 + c.t0) / 2, kind: a.c > 0 ? "top" : "bottom" });
  }
  let ph = new Float32Array(Math.ceil(SCR.DUR * HZ) + 3);
  for (let sg2 of segs)
    for (let i = Math.floor(sg2.t0 * HZ); i <= Math.ceil(sg2.t1 * HZ) && i < ph.length; i++)
      ph[i] = Math.max(0, Math.min(1, (i / HZ - sg2.t0) / (sg2.t1 - sg2.t0)));
  let holds = SCR.EV.filter((e) => (e.type === "hold" || e.type === "holdEmpty") && e.dur > 0).map((e) => ({ t0: e.t, t1: e.t + e.dur, kind: e.type === "hold" ? "top" : "bottom" }));
  return { turns, ph, segs, holds };
}
function precompute(SCR) {
  let n = Math.ceil(SCR.DUR * HZ) + 2, arc = colourScript.create("ember"), W = {};
  for (let g of GROUP_KEYS)
    W[g] = new Float32Array(n);
  let SECI = new Uint8Array(n), A = {};
  for (let k of ["clk", "B", "Bs", "Kg", "AF", "HT", "HB", "FW", "DIR"])
    A[k] = new Float32Array(n);
  let an = analyse(SCR), w = {};
  for (let g of GROUP_KEYS)
    w[g] = g === "start" ? 1 : 0;
  let c = 0, kg = 0, af = 0, ht = 0, hb = 0, dbS = 0, dirS = 0, bp = SCR.breathAt(0), bs = bp;
  for (let i = 0; i < n; i++) {
    let t2 = i / HZ, dt = 1 / HZ, b = SCR.breathAt(t2), db = (b - bp) / dt;
    bp = b;
    let fw = SCR.fireW(t2);
    c += Math.min(Math.abs(db), 0.7) * dt * (1 - fw), arc.update(dt, SCR.bcAt(t2));
    let sec = arc.section, a = 1 - Math.exp(-dt / (TAU2[sec] ?? 1.2));
    for (let g of GROUP_KEYS)
      w[g] += ((g === sec ? 1 : 0) - w[g]) * a;
    let ph = SCR.phaseAt(t2);
    kg = Math.max(kg * Math.exp(-dt / 0.15), ph === "Last gear" ? Math.min(1, Math.max(0, -db / 2.5)) : 0), bs += (b - bs) * (1 - Math.exp(-dt / 2.5)), af += ((sec === "integration" ? 1 : 0) - af) * (1 - Math.exp(-dt / (sec === "integration" ? 3 : 1.5)));
    let inT = sec === "hold", inB = sec === "empty";
    ht += ((inT ? 1 : 0) - ht) * (1 - Math.exp(-dt / (inT ? 0.5 : 0.22))), hb += ((inB ? 1 : 0) - hb) * (1 - Math.exp(-dt / (inB ? 0.5 : 0.6))), dbS += (Math.max(-4, Math.min(4, db)) - dbS) * (1 - Math.exp(-dt / 0.07)), dirS += (Math.max(-1, Math.min(1, dbS / 0.3)) * (1 - fw) - dirS) * (1 - Math.exp(-dt / 0.12));
    for (let g of GROUP_KEYS)
      W[g][i] = w[g];
    SECI[i] = GROUP_KEYS.indexOf(sec), A.clk[i] = c, A.B[i] = b, A.Bs[i] = bs, A.Kg[i] = kg, A.AF[i] = af, A.HT[i] = ht, A.HB[i] = hb, A.FW[i] = fw, A.DIR[i] = dirS;
  }
  let at = (X, t2) => {
    let x = Math.max(0, Math.min(n - 1.001, t2 * HZ)), i = Math.floor(x), f = x - i;
    return X[i] + (X[i + 1] - X[i]) * f;
  }, lsKey = (g) => g === "round2" ? "release" : g === "start" ? "arrival" : g, LSW = {}, lsWeights = (T) => {
    let key = T.toFixed(1);
    if (LSW[key])
      return LSW[key];
    let w2 = {}, tau = Math.max(0.15, T / 2.2);
    for (let [k] of LS_SECS)
      w2[k] = new Float32Array(n);
    let cur = {};
    for (let [k] of LS_SECS)
      cur[k] = 0;
    cur.arrival = 1;
    let a = 1 - Math.exp(-1 / HZ / tau);
    for (let i = 0; i < n; i++) {
      let tgt = lsKey(GROUP_KEYS[SECI[i]]);
      for (let [k] of LS_SECS)
        cur[k] += ((k === tgt ? 1 : 0) - cur[k]) * a, w2[k][i] = cur[k];
    }
    return LSW[key] = w2;
  };
  return { at, W, A, n, an, holds: an.holds, secAt: (t2) => lsKey(GROUP_KEYS[SECI[Math.max(0, Math.min(n - 1, Math.round(t2 * HZ)))]]), lsWeights };
}
function transient(SCR, t2) {
  let k = 0;
  for (let tk of SCR.kicks) {
    let d = t2 - tk;
    d >= 0 && d < 1 && (k = Math.max(k, Math.exp(-d / 0.15)));
  }
  for (let tc of SCR.cues) {
    let d = t2 - tc;
    d >= 0 && d < 1 && (k = Math.max(k, 0.7 * Math.exp(-d / 0.15)));
  }
  return k;
}
var CH_E = [0.14, 0.36, 0.55, 0.72, 0.79], smoothS = (a, b, x) => {
  let t2 = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t2 * t2 * (3 - 2 * t2);
};
function chargeLook(v, k) {
  v = Math.max(0, Math.min(1, v));
  let x = v * 4, i = Math.min(3, Math.floor(x)), f = x - i, sv = smoothS(0.6, 1, v) * k;
  return {
    energy: Math.min(1.08, CH_E[i] + (CH_E[i + 1] - CH_E[i]) * f + 0.2 * sv),
    warmth: 0.4 * Math.pow(v, 1.15) * Math.min(1.2, k),
    breath: 0.2 + 0.42 * v,
    spd: 0.012 + 0.15 * v,
    amb: 0.5 + 0.7 * v + 0.9 * sv,
    ambSpeed: 1 + 2.4 * sv,
    edge: Math.pow(v, 2.2) * k,
    spark: 0,
    sv
  };
}
function sectionTargets(s) {
  let c = s.curve, box = 0.72, holdI = Math.max(0.02, (s.holdDim * (0.16 + 0.84 * box * c.box) - 0.16) / 0.84), nw = s.holds !== "old";
  return {
    start: 0.5,
    arrival: 0.62 * c.arrival,
    box: box * c.box,
    fire: 0.84 * c.fire,
    gear: 1.07 * c.gear,
    hold: nw ? 0.46 * c.holds : holdI * c.holds,
    // full lungs held: at or above the inhale before it
    empty: nw ? Math.min(holdI * 0.8, 0.3) * c.holds : holdI * 0.8 * c.holds,
    // empty lungs: the lowest point of the session
    release: 0.58 * c.holds,
    round2: 0.7 * c.holds,
    integration: 0.3 * c.integration,
    closing: 0.06 * c.integration
  };
}
function warmthFor(s, j) {
  return s.colour === "bc" ? 0 : s.colour === "amber" ? 1 : (j = 1 - Math.pow(1 - Math.max(0, Math.min(1, j)), s.warmSpeed), Math.max(0, Math.min(1, j + 0.3 * s.warmth)));
}
var STOPS = [[0, [0.5, 0.15, 0.42]], [0.25, [0.62, 0.18, 0.38]], [0.5, [0.74, 0.22, 0.24]], [0.7, [0.9, 0.36, 0.16]], [1, [1, 0.6, 0.24]]], mix3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
function midAt(j) {
  j = Math.max(0, Math.min(1, j));
  for (let i = 1; i < STOPS.length; i++)
    if (j <= STOPS[i][0])
      return mix3(STOPS[i - 1][1], STOPS[i][1], (j - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0]));
  return STOPS[4][1];
}
function palette(w) {
  let mid = midAt(w);
  return { mid, core: mix3(mid, [1, 0.9, 0.8], 0.55), edge: midAt(w - 0.18), deep: [mid[0] * 0.4, mid[1] * 0.3, mid[2] * 0.34] };
}
var ONES = Object.fromEntries(LS_PARAMS.map(([p]) => [p, 1]));
function createEngine(scoreJson, settings, opts = {}) {
  let RM = !!opts.reduceMotion, S = Object.assign(clone(DEFAULTS), settings), mode = "player", SCR = makeScore(scoreJson), PRE = precompute(SCR), liveM = ONES, carryOn = opts.carryOn !== !1, rotAcc = 0, wallT = 0, carryT0 = null, carryFixed = null, sg = {
    t: 0,
    phase: "",
    phaseProgress: 0,
    breath: 0.45,
    energy: 0.5,
    pulse: 0,
    hold: 0,
    holdLeft: null,
    warmth: 0,
    touch: { x: 0, y: 0, strength: 0 },
    charge: 0,
    level: null,
    checkin: null,
    bgE: 0.5,
    bgB: 0.5,
    bgK: 0,
    bgHT: 0,
    bgHB: 0,
    ant: 0,
    wave: 0,
    waveA: 0,
    rot: 0,
    reduceMotion: RM,
    motion: 0,
    afterglow: 0,
    inSession: !1,
    warmLead: 1,
    gather: 0,
    nvis: -1,
    holdKind: null,
    holdTop: 0,
    holdBot: 0,
    retract: 0,
    hT: 0,
    endRing: 0,
    shim: 1,
    dir: 0,
    dB: 0,
    phase01: 0,
    crest: 0,
    crestRaw: 0,
    tv: 0,
    lift: 0,
    flow: 0.5,
    fireW: 0,
    amb: 0.8,
    ambT: 0,
    holdFrac: 0,
    spark: 0,
    ambRate: 1
  };
  function lsMult(tv, s) {
    if (!PRE)
      return ONES;
    let W2 = PRE.lsWeights(s.transT), m = {}, den = 0;
    for (let [k] of LS_SECS)
      den += PRE.at(W2[k], tv) || 0;
    den = den || 1;
    for (let [p] of LS_PARAMS) {
      let num2 = 0;
      for (let [k] of LS_SECS)
        num2 += PRE.at(W2[k], tv) * s.lookScore[k][p];
      m[p] = num2 / den;
    }
    return m;
  }
  function energyCore(tv, s) {
    let P = PRE, at = P.at, tg = sectionTargets(s), cl = (x) => Math.max(0, Math.min(1, x)), e = 0, RAMP = { box: 0.9 + 0.2 * cl((tv - 40.9) / 51.9), fire: 0.92 + 0.13 * cl((tv - 92.8) / 29.1), integration: 1 - 0.42 * smoothS(0.55, 1, (tv - 246) / 80), closing: 0.85 };
    for (let g of GROUP_KEYS)
      e += at(P.W[g], tv) * tg[g] * (RAMP[g] || 1);
    let kS = carryOn ? s.carry * Math.exp(-tv / 14) : 0, Fa = 0.64 + 0.3 * s.floorA, ub = cl((tv - 40.9) / 51.9), wF = at(P.W.arrival, tv) + at(P.W.box, tv) * (1 - 0.8 * ub);
    return Math.max(e, (Fa + (1.02 - Fa) * kS) * wF);
  }
  function signalsAt(t2, s, dt) {
    if (sg.nvis = -1, sg.gather = 0, sg.warmLead = s.colour === "journey" ? 1 : 0, mode === "player" && PRE) {
      let tv = Math.min(SCR.DUR, t2 + s.lead), P = PRE, at = P.at, tg = sectionTargets(s), M0 = liveM, e = 0, cl = (x) => Math.max(0, Math.min(1, x)), RAMP = { box: 0.9 + 0.2 * cl((tv - 40.9) / 51.9), fire: 0.92 + 0.13 * cl((tv - 92.8) / 29.1), integration: 1 - 0.42 * smoothS(0.55, 1, (tv - 246) / 80), closing: 0.85 };
      for (let g of GROUP_KEYS)
        e += at(P.W[g], tv) * tg[g] * (RAMP[g] || 1);
      let kS = carryOn ? s.carry * Math.exp(-tv / 14) : 0, wAB = at(P.W.arrival, tv) + at(P.W.box, tv), Fa = 0.64 + 0.3 * s.floorA, ub = cl((tv - 40.9) / 51.9), wF = at(P.W.arrival, tv) + at(P.W.box, tv) * (1 - 0.8 * ub);
      e = Math.max(e, (Fa + (1.02 - Fa) * kS) * wF);
      let fw = at(P.A.FW, tv), bRaw = RM ? at(P.A.Bs, tv) : SCR.breathAt(tv), ht = at(P.A.HT, tv), hb = at(P.A.HB, tv), oldH = s.holds === "old", axis = s.cue === "axis" || s.cue === "both", b = bRaw + (0.66 - bRaw) * fw;
      if (oldH)
        b += (0.5 - b) * 0.75 * Math.max(ht, hb);
      else if (!RM) {
        let nx = P.holds.find((h) => h.t0 > tv && h.t0 - tv < 1.2);
        if (nx) {
          let pl = SCR.breathAt(nx.t0 + 0.3), u = 1 - (nx.t0 - tv) / 1.2;
          b += (pl - b) * 0.4 * u * u;
        }
      }
      oldH || (b = Math.min(b, 1 - 0.22 * ht)), b = 0.5 + (b - 0.5) * s.follow;
      let k = RM ? 0 : Math.max(transient(SCR, tv), at(P.A.Kg, tv)), ph = SCR.phaseAt(t2), p = SCR.PH.find((x) => x[2] === ph), ev = SCR.curEv(t2), hl = ev && (ev.type === "hold" || ev.type === "holdEmpty") && ev.dur > 3 ? Math.max(0, ev.dur - (t2 - ev.t)) : null, hh = P.holds.find((h) => tv >= h.t0 && tv < h.t1), hT = hh ? tv - hh.t0 : 0, left = hh ? hh.t1 - tv : 99, crest = 0;
      if (!RM)
        for (let T of P.an.turns) {
          let d = tv - T.t;
          d < 0 || d > 0.8 || (crest += (T.kind === "top" ? 1 : -1) * (d < 0.05 ? d / 0.05 : Math.exp(-(d - 0.05) / 0.09)));
        }
      let crestRaw = Math.max(-1, Math.min(1, crest));
      crest = crestRaw * (axis ? 1 : 0);
      let nwH = oldH ? 0 : 1, endR = hh && left < 3 ? Math.min(1, 1 - left / 3) : 0, shim = RM ? 1 : 1 + nwH * (ht * 0.035 * Math.sin(6.2831853 * hT / 9) + hb * 0.015 * Math.sin(6.2831853 * hT / 14)), drift = RM ? 0 : nwH * (ht * 0.4 * Math.sin(6.2831853 * hT / 9) - hb * 0.55 * Math.sin(6.2831853 * hT / 14)), wm = Math.max(warmthFor(s, journeyAt(tv)), s.colour === "journey" ? (0.3 * s.floorA + 0.36 * kS) * wAB : 0) + nwH * (0.06 * ht - 0.2 * hb) * (s.colour === "journey" ? 1 : 0), M = liveM, hw = at(P.W.hold, tv) + at(P.W.empty, tv), eM = M.energy * (1 + (M.holdDim - 1) * Math.min(1, hw));
      {
        let tl = Math.max(0, tv - s.bgLag), fl = at(P.A.FW, tl), br = RM ? at(P.A.Bs, tl) : SCR.breathAt(tl);
        sg.bgE = Math.min(1.1, energyCore(tl, s) * s.energy * M0.energy), sg.bgB = Math.max(0, Math.min(1, br + (0.66 - br) * fl)), sg.bgK = RM ? 0 : Math.max(transient(SCR, tl), at(P.A.Kg, tl)), sg.bgHT = at(P.A.HT, tl), sg.bgHB = at(P.A.HB, tl);
      }
      Object.assign(sg, {
        t: t2,
        phase: ph,
        phaseProgress: p ? (t2 - p[0]) / (p[1] - p[0]) : 0,
        breath: b,
        energy: Math.min(1.1, e * s.energy * eM),
        pulse: k * s.firePulse * M.firePulse,
        nvisMul: M.strands,
        hold: Math.max(ht, hb),
        holdLeft: hl,
        warmth: Math.max(0, Math.min(1, wm * M.warmth)),
        charge: 0,
        level: null,
        checkin: null,
        afterglow: at(P.A.AF, tv) * (1 - 0.6 * smoothS(0.55, 1, (tv - 246) / 80)),
        inSession: !0,
        motion: RM ? 0 : at(P.A.clk, tv) * s.follow + (1 - s.follow) * wallT * 0.25,
        holdKind: hh && Math.max(ht, hb) > 0.05 ? hh.kind : null,
        holdTop: nwH * ht,
        holdBot: nwH * hb,
        retract: oldH ? Math.max(ht, hb) : 0,
        hT,
        endRing: nwH * endR,
        shim,
        tv,
        crestRaw,
        amb: s.ambient * M.ambient * AMBW.reduce((a, [g, w]) => a + at(P.W[g], tv) * w, 0),
        ambT: tv,
        spark: 0,
        ambRate: 1,
        holdFrac: hh ? hT / (hh.t1 - hh.t0) : 0,
        dir: RM ? 0 : at(P.A.DIR, tv) * s.follow,
        dB: 0,
        phase01: at(P.an.ph, tv),
        crest,
        lift: axis ? (b - 0.5) * 0.5 : 0,
        flow: b + drift * 0.34,
        fireW: fw
      }), sg.ant = 0, sg.wave = 0, sg.waveA = 0, sg.rot = rotAcc, sg.coupX = 0, sg.cm = 0;
      {
        let A = 0, R = -9, Wd = 1.6;
        if (sg.swOn = RM ? 0 : 1, !RM && s.texture === "on") {
          let E = Math.min(1.1, sg.bgE), Ef = 0.3 + 0.7 * E, evs = [];
          for (let T of P.an.turns) {
            if (T.t > tv)
              break;
            evs.push(T);
          }
          if (s.texBeat === "fire") {
            for (let kt of SCR.kicks) {
              if (kt > tv)
                break;
              evs.push({ t: kt, kind: "top" });
            }
            evs.sort((a, b2) => a.t - b2.t);
          }
          let last2 = evs.slice(-2), envOf = (T) => {
            let d = tv - T.t;
            return d < 1.6 ? smoothS(0, 0.12, d) * Math.exp(-Math.max(0, d - 0.12) / 0.5) : 0;
          }, newest = last2[last2.length - 1], prev = last2.length > 1 ? last2[0] : null;
          if (newest) {
            let use = newest;
            prev && tv - newest.t < 0.05 && (use = prev);
            let d = tv - use.t;
            A = Math.max(envOf(newest), prev ? envOf(prev) : 0), R = use.kind === "top" || s.texDir === "radiate" ? d * 3.6 : 4.2 - d * 3.6;
          }
          s.texBeat === "fire" && (A = Math.min(1.25, A * (1 + 0.5 * Math.min(1, k * s.firePulse))));
          let htt = nwH * ht;
          htt > 0.05 && (A = Math.max(A, htt * (0.55 + 0.12 * Math.sin(wallT * 0.7)))), A *= Ef * (1 - 0.9 * (nwH * hb)), Wd = 1.2 + 2.2 * smoothS(0.2, 0.8, E) + 1.2 * htt;
        }
        sg.swA = A, sg.swR = R, sg.swW = Wd, sg.swT = wallT * 0.12;
        let br = b - 0.5;
        sg.swPx = br * 0.5, sg.swPy = br * 0.7;
      }
      if (carryT0 != null || carryFixed != null) {
        let rel = carryFixed ?? (performance.now() - carryT0) / 1e3, C1 = chargeLook(1, s.chargeK), cl01 = (x) => Math.max(0, Math.min(1, x)), kk = rel < 0.5 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * cl01((rel - 0.5) / 5)), ant = rel < 0.22 ? smoothS(0, 0.22, rel) : Math.max(0, 1 - (rel - 0.22) / 0.2), wv = cl01((rel - 0.2) / 1.5);
        rel > 6 ? carryFixed == null && (carryT0 = null) : (sg.energy += (Math.min(1.1, C1.energy * s.energy) - sg.energy) * kk, s.colour === "journey" && (sg.warmth += (C1.warmth - sg.warmth) * kk), sg.amb *= 1 + 0.9 * kk, sg.charge = C1.edge * kk * s.carry, sg.ant = ant * s.carry, sg.wave = wv * 5.4, sg.waveA = Math.pow(1 - wv, 1.4) * smoothS(0.2, 0.3, rel) * s.carry, sg.cm = kk, sg.coupX = kk * s.startField, sg.bgE = Math.max(sg.bgE, Math.min(1.1, sg.energy)), sg.bgB = Math.max(sg.bgB, 0.5 + 0.5 * kk * 0.3), sg.bgK = Math.max(sg.bgK, 1.2 * Math.exp(-Math.max(0, rel - 0.2) / 0.5) * smoothS(0.18, 0.26, rel)), sg.pulse = Math.max(sg.pulse, 1.9 * Math.exp(-Math.max(0, rel - 0.2) / 0.28) * smoothS(0.18, 0.26, rel)));
      }
      sg.dB = sg.dir, sg.touch = { x: 0, y: 0, strength: 0 };
    }
    return sg;
  }
  let CDL = null;
  function cdBuild() {
    CDL = [];
    let sp = SCR.caps.find((c) => /^three, two, one/i.test(c[2]) && c[3] && c[3].length >= 3);
    for (let cue of SCR.cues)
      sp && sp[0] >= cue && sp[0] <= cue + 8 ? CDL.push({ t: [sp[3][0], sp[3][1], sp[3][2]], end: sp[3][2] + 0.95 }) : CDL.push({ t: [cue - 3, cue - 2, cue - 1], end: cue });
  }
  function cdEffect(t2, sig, s) {
    CDL || cdBuild();
    let o = 0, sc = 1, ty = 0, d = -1;
    if (s.countdown !== "off")
      for (let c of CDL) {
        for (let i = 0; i < 3; i++) {
          let u = t2 - c.t[i];
          if (u >= 0 && u < 0.95) {
            d = 3 - i;
            let fi = Math.min(1, u / (RM ? 0.12 : 0.18)), fo = 1 - smoothS(0.5, 0.95, u);
            o = fi * fo, RM || (sc = 0.9 + 0.16 * u / 0.95, ty = -14 * u);
          }
        }
        let e = t2 - c.end;
        e >= 0 && e < 1.2 && !RM && (sig.pulse = Math.max(sig.pulse, 1.25 * Math.exp(-e / 0.35)));
      }
    return s.countdown === "light" && o > 0 && (sig.energy *= 1 - 0.22 * o), { o, d, sc, ty };
  }
  return {
    SCR,
    PRE,
    get S() {
      return S;
    },
    set S(v) {
      S = Object.assign(clone(DEFAULTS), v);
    },
    set carryOn(v) {
      carryOn = !!v;
    },
    /** The strands' slow turn accumulated on the start and check-in screens (the session keeps whatever turn they reached). */
    set rotAcc(v) {
      rotAcc = v;
    },
    /** Wall-clock seconds since the visual started: only the look's "follow" < 1 blend reads it (a slow drift that does not follow the breath). */
    set wallT(v) {
      wallT = v;
    },
    /** The full frame: signals for session time t (the whole prototype frame(): liveM, signalsAt, countdown effect). */
    frame(t2, s = S) {
      liveM = lsMult(Math.min(SCR.DUR, t2 + s.lead), s);
      let sig = signalsAt(t2, s, 0), cdS = cdEffect(t2, sig, s);
      return { sig, liveM, cd: cdS.o, cdDigit: cdS.d, cdScale: cdS.sc, cdShift: cdS.ty };
    }
  };
}

// vendor/app/session-visual/stage.ts
function stageGeometry(wPt, hPt, S, liveM, layout) {
  let spec = !!(layout && layout.spec), fit = wPt / 393, Hn = hPt / fit, Wn = 393;
  spec ? (fit = 1, Wn = wPt, Hn = hPt) : Hn < 852 && (fit = hPt / 852, Hn = 852, Wn = wPt / fit), Hn = Math.min(Hn, 1100);
  let heroCy = layout && layout.heroCy != null ? layout.heroCy : Math.round(S.heroY * Hn), hs = heroCy - 276, ls = hs + S.lineAdj, R = 96 * (S.size || 1) * liveM.size, below = S.caps === "below", capY = ((layout && layout.capTop != null ? layout.capTop : below ? 412 + ls : 404 + hs) - 10 - heroCy) / R, own = !!(layout && layout.lineTop != null), lineTop = own ? layout.lineTop : below ? 412 : 452, lineBottom = layout && layout.lineBottom != null ? layout.lineBottom : below ? 528 : 568, oy = own ? lineTop - 12 : below ? 400 : 440, canvasY = own ? oy : oy + ls, behind = { lineT: (below ? 412 : 452) + ls, lineB: (below ? 528 : 568) + ls, pT: 628 + (Hn - 852) + S.ctlOff, H: Hn, numY: 402 + hs };
  return own && (behind.lineT = lineTop, behind.lineB = lineBottom), layout && layout.controlsTop != null && (behind.pT = layout.controlsTop), layout && layout.numeralY != null && (behind.numY = layout.numeralY), layout && layout.behind && (behind.lineT = layout.behind.lineT, behind.lineB = layout.behind.lineB, behind.pT = layout.behind.pT, behind.numY = layout.behind.numY), { behind, cx: Wn / 2, cy: heroCy, R, capY, Wn, Hn, fit, ox: spec ? 0 : (Wn - 393) / 2, hs, ls, heroCy, line: { top: lineTop, bottom: lineBottom, oy, canvasY, W: spec ? Math.round(Wn) : 393 } };
}

// vendor/app/session-visual/uniforms.ts
function lookOf(s, liveM) {
  return {
    coupling: s.coupling,
    bgReach: s.bgReach,
    softness: s.softness * liveM.softness,
    presence: s.presence,
    touchReach: s.touchReach,
    edgeX: Math.min(1.2, s.reachX * liveM.reachX),
    edgeY: Math.min(1.2, s.reachY * liveM.reachY),
    ambient: s.ambient,
    ringAlpha: s.ring ? 0.48 : 0,
    axis: s.cue === "axis" || s.cue === "both",
    ringCue: s.cue === "ring" || s.cue === "both"
  };
}
function silkUniforms(frame, S, geo, wPx, hPx, px, coordScale) {
  let { sig: sg, liveM } = frame, look = lookOf(S, liveM), d = px * geo.fit;
  return {
    uRes: [wPx, hPx],
    uC: [geo.cx * d, (geo.cy - sg.lift * geo.R) * d],
    uPx: coordScale ?? px,
    uR: geo.R * d,
    uB: sg.breath,
    uI: sg.energy,
    uClk: sg.motion,
    uK: sg.pulse,
    uJ: sg.warmth,
    uLead: sg.warmLead,
    uAfter: sg.afterglow,
    uRetract: sg.retract,
    uFlow: sg.flow,
    uFlowMix: look.axis ? 1 : 0,
    uDir: sg.dir,
    uHT: sg.holdTop,
    uHB: sg.holdBot,
    uHTm: sg.hT,
    uEnd: sg.endRing,
    uCrest: sg.crest,
    uRingCue: look.ringCue ? 1 : 0,
    uFW: sg.fireW,
    uShim: sg.shim,
    uAxis: look.axis ? 1 : 0,
    uSoft: look.softness,
    uPG: 0.3,
    uPres: look.presence,
    uRing: look.ringAlpha,
    uCharge: sg.charge,
    uGather: sg.gather || 0,
    uCapY: geo.capY + sg.lift,
    uNvM: sg.nvisMul || 1,
    uCoup: look.coupling * (1 - (sg.cm || 0)) + (sg.coupX || 0),
    uBgReach: look.bgReach,
    uBgE: sg.bgE,
    uBgB: sg.bgB,
    uBgK: sg.bgK,
    uBgHT: sg.bgHT,
    uBgHB: sg.bgHB,
    uRot: sg.rot || 0,
    uAnt: sg.ant || 0,
    uWave: sg.wave || 0,
    uWaveA: sg.waveA || 0,
    uEdgeX: look.edgeX,
    uEdgeY: look.edgeY,
    uSpark: sg.spark,
    uAmb: sg.amb * look.ambient / Math.max(1e-3, look.ambient),
    uAT: sg.ambT,
    uHF: sg.holdFrac,
    uNvis: sg.nvis ?? -1,
    uHaze: frame.haze || 0,
    uHzS: frame.hzSoft || 0,
    uVeil: frame.veil || 0,
    uBdA: frame.bandsA || [-1, -1],
    uBdB: frame.bandsB || [-1, -1],
    uBdC: frame.bandsC || [-1, -1],
    uBehind: S.behind ?? 0.6,
    uH: geo.behind.H,
    uNumY: geo.behind.numY,
    uLineT: geo.behind.lineT,
    uLineB: geo.behind.lineB,
    uPT: geo.behind.pT,
    uF: [sg.touch.x, sg.touch.y, sg.touch.strength * look.touchReach]
  };
}

// vendor/app/session-visual/presets.ts
var CALM = {
  lookScore: {
    arrival: {
      size: 1.02,
      reachX: 1,
      reachY: 1,
      ambient: 1.05,
      softness: 1.05,
      warmth: 1.13,
      strands: 0.95,
      energy: 1.05,
      line: 0.9,
      firePulse: 1,
      holdDim: 1
    },
    box: {
      size: 1.06,
      reachX: 1,
      reachY: 1,
      ambient: 0.95,
      softness: 1,
      warmth: 1.1,
      strands: 1,
      energy: 1.08,
      line: 1,
      firePulse: 1.05,
      holdDim: 1
    },
    fire: {
      size: 1.13,
      reachX: 1.15,
      reachY: 1.15,
      ambient: 0.8,
      softness: 0.96,
      warmth: 1.18,
      strands: 1.02,
      energy: 1.13,
      line: 1,
      firePulse: 1.25,
      holdDim: 1
    },
    gear: {
      size: 1.25,
      reachX: 1.25,
      reachY: 1.25,
      ambient: 0.78,
      softness: 0.93,
      warmth: 1.15,
      strands: 1.1,
      energy: 1.15,
      line: 1,
      firePulse: 1.3,
      holdDim: 1
    },
    hold: {
      size: 1.18,
      reachX: 1.2,
      reachY: 1.2,
      ambient: 0.9,
      softness: 0.95,
      warmth: 1.15,
      strands: 1.02,
      energy: 1.11,
      line: 1,
      firePulse: 1.05,
      holdDim: 1
    },
    empty: {
      size: 0.65,
      reachX: 0.5,
      reachY: 0.5,
      ambient: 0.63,
      softness: 1.38,
      warmth: 0.81,
      strands: 0.5,
      energy: 0.88,
      line: 1,
      firePulse: 1,
      holdDim: 1
    },
    release: {
      size: 1.05,
      reachX: 1.05,
      reachY: 1.05,
      ambient: 0.95,
      softness: 1.02,
      warmth: 1.05,
      strands: 1,
      energy: 1.02,
      line: 1,
      firePulse: 1,
      holdDim: 1
    },
    integration: {
      size: 0.8,
      reachX: 0.69,
      reachY: 0.69,
      ambient: 0.63,
      softness: 1.31,
      warmth: 1.13,
      strands: 0.75,
      energy: 0.75,
      line: 0.5,
      firePulse: 1,
      holdDim: 1
    },
    closing: {
      size: 0.73,
      reachX: 0.44,
      reachY: 0.44,
      ambient: 0.75,
      softness: 1.38,
      warmth: 1,
      strands: 0.56,
      energy: 0.81,
      line: 0.38,
      firePulse: 1,
      holdDim: 1
    }
  },
  transT: 4.5,
  skin: "silk",
  colour: "journey",
  sfx: "on",
  sfxVol: 0.55,
  sfxChar: "airy",
  caps: "below",
  holds: "new",
  cue: "axis",
  line: "thread",
  lead: 0.3,
  energy: 0.9,
  softness: 1.25,
  warmth: 0,
  presence: 1,
  warmSpeed: 1,
  follow: 0.85,
  firePulse: 0.55,
  holdDim: 0.6,
  texture: "off",
  texStrength: 1,
  texDensity: 0.5,
  texBeat: "fire",
  texDir: "converge",
  texRest: 0.1,
  texDepth: 1,
  texPar: 0.5,
  brandTop: "on",
  brandPlayer: "footer",
  brandLine: "off",
  brandWording: "collab",
  brandOrder: "logo",
  countdown: "light",
  layout: "centred",
  heroY: 0.47,
  lineAdj: -84,
  ctlOff: 20,
  capPos: 0.85,
  render: "auto",
  coupling: 0.7,
  startField: 0.15,
  bgReach: 1,
  bgLag: 1.2,
  ambient: 0.9,
  chargeK: 1,
  carry: 1,
  floorA: 0.65,
  size: 0.94,
  reachX: 0.7,
  reachY: 0.75,
  touchReach: 1,
  holdDur: 1.5,
  curve: {
    arrival: 1,
    box: 1,
    fire: 1,
    gear: 1,
    holds: 1,
    integration: 1
  },
  ring: !1,
  captions: !0,
  guides: !1
}, BALANCED = {
  lookScore: {
    arrival: {
      size: 1.05,
      reachX: 1,
      reachY: 1,
      ambient: 1.1,
      softness: 1.1,
      warmth: 1.25,
      strands: 0.9,
      energy: 1.1,
      line: 0.8,
      firePulse: 1,
      holdDim: 1
    },
    box: {
      size: 1.12,
      reachX: 1,
      reachY: 1,
      ambient: 0.9,
      softness: 1,
      warmth: 1.2,
      strands: 1,
      energy: 1.15,
      line: 1,
      firePulse: 1.1,
      holdDim: 1
    },
    fire: {
      size: 1.25,
      reachX: 1.3,
      reachY: 1.3,
      ambient: 0.6,
      softness: 0.92,
      warmth: 1.35,
      strands: 1.05,
      energy: 1.25,
      line: 1,
      firePulse: 1.5,
      holdDim: 1
    },
    gear: {
      size: 1.5,
      reachX: 1.5,
      reachY: 1.5,
      ambient: 0.55,
      softness: 0.85,
      warmth: 1.3,
      strands: 1.2,
      energy: 1.3,
      line: 1,
      firePulse: 1.6,
      holdDim: 1
    },
    hold: {
      size: 1.35,
      reachX: 1.4,
      reachY: 1.4,
      ambient: 0.8,
      softness: 0.9,
      warmth: 1.3,
      strands: 1.05,
      energy: 1.22,
      line: 1,
      firePulse: 1.1,
      holdDim: 1
    },
    empty: {
      size: 0.72,
      reachX: 0.6,
      reachY: 0.6,
      ambient: 0.7,
      softness: 1.3,
      warmth: 0.85,
      strands: 0.6,
      energy: 0.9,
      line: 1,
      firePulse: 1,
      holdDim: 1
    },
    release: {
      size: 1.1,
      reachX: 1.1,
      reachY: 1.1,
      ambient: 0.9,
      softness: 1.05,
      warmth: 1.1,
      strands: 1,
      energy: 1.05,
      line: 1,
      firePulse: 1,
      holdDim: 1
    },
    integration: {
      size: 0.84,
      reachX: 0.75,
      reachY: 0.75,
      ambient: 0.7,
      softness: 1.25,
      warmth: 1.1,
      strands: 0.8,
      energy: 0.8,
      line: 0.6,
      firePulse: 1,
      holdDim: 1
    },
    closing: {
      size: 0.78,
      reachX: 0.55,
      reachY: 0.55,
      ambient: 0.8,
      softness: 1.3,
      warmth: 1,
      strands: 0.65,
      energy: 0.85,
      line: 0.5,
      firePulse: 1,
      holdDim: 1
    }
  },
  transT: 2.5,
  skin: "silk",
  colour: "journey",
  sfx: "on",
  sfxVol: 0.55,
  sfxChar: "airy",
  caps: "below",
  holds: "new",
  cue: "axis",
  line: "thread",
  lead: 0.3,
  energy: 1,
  softness: 1,
  warmth: 0,
  presence: 1,
  warmSpeed: 1,
  follow: 1,
  firePulse: 1,
  holdDim: 0.46,
  texture: "off",
  texStrength: 1,
  texDensity: 0.5,
  texBeat: "fire",
  texDir: "converge",
  texRest: 0.1,
  texDepth: 1,
  texPar: 0.5,
  brandTop: "on",
  brandPlayer: "footer",
  brandLine: "off",
  brandWording: "collab",
  brandOrder: "logo",
  countdown: "light",
  layout: "centred",
  heroY: 0.47,
  lineAdj: -84,
  ctlOff: 20,
  capPos: 0.85,
  render: "auto",
  coupling: 1,
  startField: 0.22,
  bgReach: 1,
  bgLag: 0.8,
  ambient: 1,
  chargeK: 1,
  carry: 1,
  floorA: 0.65,
  size: 1,
  reachX: 0.8,
  reachY: 0.85,
  touchReach: 1,
  holdDur: 1.5,
  curve: {
    arrival: 1,
    box: 1,
    fire: 1,
    gear: 1,
    holds: 1,
    integration: 1
  },
  ring: !1,
  captions: !0,
  guides: !1
}, BOLD = {
  lookScore: {
    arrival: {
      size: 1.07,
      reachX: 1,
      reachY: 1,
      ambient: 1.14,
      softness: 1.14,
      warmth: 1.34,
      strands: 0.87,
      energy: 1.14,
      line: 0.73,
      firePulse: 1,
      holdDim: 1
    },
    box: {
      size: 1.16,
      reachX: 1,
      reachY: 1,
      ambient: 0.87,
      softness: 1,
      warmth: 1.27,
      strands: 1,
      energy: 1.2,
      line: 1,
      firePulse: 1.14,
      holdDim: 1
    },
    fire: {
      size: 1.34,
      reachX: 1.41,
      reachY: 1.41,
      ambient: 0.46,
      softness: 0.89,
      warmth: 1.4,
      strands: 1.07,
      energy: 1.3,
      line: 1,
      firePulse: 1.68,
      holdDim: 1
    },
    gear: {
      size: 1.5,
      reachX: 1.5,
      reachY: 1.5,
      ambient: 0.39,
      softness: 0.8,
      warmth: 1.4,
      strands: 1.27,
      energy: 1.3,
      line: 1,
      firePulse: 1.81,
      holdDim: 1
    },
    hold: {
      size: 1.47,
      reachX: 1.5,
      reachY: 1.5,
      ambient: 0.73,
      softness: 0.87,
      warmth: 1.4,
      strands: 1.07,
      energy: 1.3,
      line: 1,
      firePulse: 1.14,
      holdDim: 1
    },
    empty: {
      size: 0.72,
      reachX: 0.6,
      reachY: 0.6,
      ambient: 0.7,
      softness: 1.3,
      warmth: 0.85,
      strands: 0.6,
      energy: 0.9,
      line: 1,
      firePulse: 1,
      holdDim: 1
    },
    release: {
      size: 1.14,
      reachX: 1.14,
      reachY: 1.14,
      ambient: 0.87,
      softness: 1.07,
      warmth: 1.14,
      strands: 1,
      energy: 1.07,
      line: 1,
      firePulse: 1,
      holdDim: 1
    },
    integration: {
      size: 0.84,
      reachX: 0.75,
      reachY: 0.75,
      ambient: 0.7,
      softness: 1.25,
      warmth: 1.1,
      strands: 0.8,
      energy: 0.8,
      line: 0.6,
      firePulse: 1,
      holdDim: 1
    },
    closing: {
      size: 0.78,
      reachX: 0.55,
      reachY: 0.55,
      ambient: 0.8,
      softness: 1.3,
      warmth: 1,
      strands: 0.65,
      energy: 0.85,
      line: 0.5,
      firePulse: 1,
      holdDim: 1
    }
  },
  transT: 2.2,
  skin: "silk",
  colour: "journey",
  sfx: "on",
  sfxVol: 0.55,
  sfxChar: "airy",
  caps: "below",
  holds: "new",
  cue: "axis",
  line: "thread",
  lead: 0.3,
  energy: 1.08,
  softness: 0.95,
  warmth: 0,
  presence: 1.15,
  warmSpeed: 1,
  follow: 1,
  firePulse: 1.6,
  holdDim: 0.4,
  texture: "off",
  texStrength: 1,
  texDensity: 0.5,
  texBeat: "fire",
  texDir: "converge",
  texRest: 0.1,
  texDepth: 1,
  texPar: 0.5,
  brandTop: "on",
  brandPlayer: "footer",
  brandLine: "off",
  brandWording: "collab",
  brandOrder: "logo",
  countdown: "light",
  layout: "centred",
  heroY: 0.47,
  lineAdj: -84,
  ctlOff: 20,
  capPos: 0.85,
  render: "auto",
  coupling: 0.8,
  startField: 0.3,
  bgReach: 0.85,
  bgLag: 0.8,
  ambient: 1,
  chargeK: 1,
  carry: 1,
  floorA: 0.65,
  size: 1.1,
  reachX: 0.95,
  reachY: 1,
  touchReach: 1,
  holdDur: 1.5,
  curve: {
    arrival: 1,
    box: 1,
    fire: 1,
    gear: 1,
    holds: 1,
    integration: 1
  },
  ring: !1,
  captions: !0,
  guides: !1
}, PRESETS = { calm: CALM, balanced: BALANCED, bold: BOLD };
function resolveLook(look) {
  return look ? typeof look == "string" ? PRESETS[look] ?? BALANCED : look : BALANCED;
}

// vendor/app/session-visual/interactions/chargeLook.ts
var CH_E2 = [0.14, 0.36, 0.55, 0.72, 0.79];
function smoothS2(a, b, x) {
  "worklet";
  let t2 = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t2 * t2 * (3 - 2 * t2);
}
function chargeLook2(v, k) {
  "worklet";
  v = Math.max(0, Math.min(1, v));
  let x = v * 4, i = Math.min(3, Math.floor(x)), f = x - i, sv = smoothS2(0.6, 1, v) * k;
  return {
    energy: Math.min(1.08, CH_E2[i] + (CH_E2[i + 1] - CH_E2[i]) * f + 0.2 * sv),
    warmth: 0.4 * Math.pow(v, 1.15) * Math.min(1.2, k),
    breath: 0.2 + 0.42 * v,
    spd: 0.012 + 0.15 * v,
    amb: 0.5 + 0.7 * v + 0.9 * sv,
    ambSpeed: 1 + 2.4 * sv,
    edge: Math.pow(v, 2.2) * k,
    spark: 0,
    sv
  };
}

// vendor/app/session-visual/interactions/interactionState.ts
function paramsFromSettings(S, reduceMotion) {
  let n = (v, d) => typeof v == "number" && isFinite(v) ? v : d, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  return {
    holdDur: clamp(n(S.holdDur, 1.5), 0.8, 3),
    chargeK: clamp(n(S.chargeK, 1), 0.5, 1.5),
    ambient: n(S.ambient, 1),
    follow: n(S.follow, 1),
    firePulse: n(S.firePulse, 1),
    energy: n(S.energy, 1),
    startField: n(S.startField, 0.22),
    colour: typeof S.colour == "string" ? S.colour : "journey",
    carry: n(S.carry, 1),
    reduceMotion
  };
}
var EVT = {
  /** the press landed on the light and the hold began: start the swell, unlock audio */
  HOLD_START: 1,
  /** the rising tick: a third of the way (ms 8) */
  TICK_1: 2,
  /** two thirds (ms 8) */
  TICK_2: 3,
  /** full charge (ms 30, the same frame as READY) */
  TICK_3: 4,
  /** the ready moment: bloom, the tick (ms 34), "Let go to begin" */
  READY: 5,
  /** let go after ready: the whoosh and the release choreography start */
  RELEASE: 6,
  /** let go too early: the swell fades (0.35 s), "Hold a little longer" */
  EARLY_RELEASE: 7,
  /** the check-in crossed onto another stop (ms 6) */
  CI_STOP: 8,
  /** the check-in reached the top stop (ms 30), the bloom */
  CI_TOP: 9
};
var HINT = { PRESS: 0, KEEP: 1, LET_GO: 2, LONGER: 3 };
var initSig = (reduceMotion) => ({
  t: 0,
  phase: "",
  phaseProgress: 0,
  breath: 0.45,
  energy: 0.5,
  pulse: 0,
  hold: 0,
  holdLeft: null,
  warmth: 0,
  touch: { x: 0, y: 0, strength: 0 },
  charge: 0,
  level: null,
  checkin: null,
  bgE: 0.5,
  bgB: 0.5,
  bgK: 0,
  bgHT: 0,
  bgHB: 0,
  ant: 0,
  wave: 0,
  waveA: 0,
  rot: 0,
  reduceMotion,
  motion: 0,
  afterglow: 0,
  inSession: !1,
  warmLead: 1,
  gather: 0,
  nvis: -1,
  holdKind: null,
  holdTop: 0,
  holdBot: 0,
  retract: 0,
  hT: 0,
  endRing: 0,
  shim: 1,
  dir: 0,
  dB: 0,
  phase01: 0,
  crest: 0,
  crestRaw: 0,
  tv: 0,
  lift: 0,
  flow: 0.5,
  fireW: 0,
  amb: 0.8,
  ambT: 0,
  holdFrac: 0,
  spark: 0,
  ambRate: 1,
  nvisMul: 1,
  swOn: 0,
  swA: 0,
  coupX: 0,
  cm: 0
});
function createInteractionState(mode, params, initialCheckin = 0.25) {
  "worklet";
  return {
    mode,
    wallT: 0,
    finger: null,
    lastF: null,
    fingerS: 0,
    charge: 0,
    holding: !1,
    ready: !1,
    readyT: -9,
    nudgeT: -9,
    buzzN: 0,
    releasing: !1,
    relT: 0,
    geoU: 0,
    ciV: initialCheckin,
    ciVs: initialCheckin,
    ciVel: 0,
    ciDrag: !1,
    ciLastStop: Math.round(initialCheckin * 4),
    ciBloomT: -9,
    ciLabel: Math.round(initialCheckin * 4) + 1,
    ciLabelShown: Math.round(initialCheckin * 4) + 1,
    ciLabelSwapAt: -1,
    ciB: 0,
    ciSway: !1,
    startBase: null,
    visFloor: !1,
    vS: 0,
    ciAnswer: Math.round(initialCheckin * 4) + 1,
    rotAcc: 0,
    ambClk: 0,
    events: [],
    sig: initSig(params.reduceMotion),
    out: { hint: HINT.PRESS, charge: 0, holdLevel: 0, holding: !1, ready: !1, phase: "idle", releasing: !1, rel: -1, geoU: 0, ciValue: initialCheckin, ciTarget: initialCheckin, ciStop: Math.round(initialCheckin * 4), ciLabelShown: Math.round(initialCheckin * 4) + 1, ciLabelOpacity: 1, touch: { x: 0, y: 0, strength: 0 } }
  };
}
function startPointerDown(st, ring) {
  "worklet";
  st.mode !== "start" || st.releasing || (st.finger = { x: ring.x, y: ring.y }, Math.hypot(ring.x, ring.y) < 1.2 && (st.holding = !0, st.buzzN = 0, st.events.push(EVT.HOLD_START)));
}
function startPointerMove(st, ring) {
  "worklet";
  st.mode === "start" && st.finger && (st.finger = { x: ring.x, y: ring.y });
}
function startPointerUp(st) {
  "worklet";
  if (st.mode === "start") {
    if (st.holding) {
      if (st.ready) {
        st.events.push(EVT.RELEASE), st.finger = null, st.holding = !1, st.ready = !1, st.charge = 0, st.releasing = !0, st.relT = 0;
        return;
      }
      st.nudgeT = st.wallT, st.events.push(EVT.EARLY_RELEASE);
    }
    st.finger = null, st.holding = !1, st.ready = !1;
  }
}
function setCILabel(st, n) {
  "worklet";
  n !== st.ciLabel && (st.ciLabel = n, st.ciLabelSwapAt = st.wallT + 0.11);
}
function ciSetX(st, v, ring) {
  "worklet";
  st.ciV = Math.max(0, Math.min(1, v));
  let stop = Math.round(st.ciV * 4);
  setCILabel(st, stop + 1), stop !== st.ciLastStop && (st.ciLastStop = stop, st.events.push(stop === 4 ? EVT.CI_TOP : EVT.CI_STOP), stop === 4 && (st.ciBloomT = st.wallT));
  let n = Math.hypot(ring.x, ring.y) || 1, sc = Math.min(1, 1.05 / n);
  st.finger = { x: ring.x * sc, y: ring.y * sc };
}
function ciPointerDown(st, v, ring) {
  "worklet";
  st.ciDrag = !0, ciSetX(st, v, ring);
}
function ciPointerMove(st, v, ring) {
  "worklet";
  st.ciDrag && ciSetX(st, v, ring);
}
function ciPointerUp(st) {
  "worklet";
  if (!st.ciDrag)
    return Math.round(st.ciV * 4) + 1;
  st.ciDrag = !1, st.ciV = Math.round(st.ciV * 4) / 4;
  let checkin = Math.round(st.ciV * 4) + 1;
  return st.ciAnswer = checkin, setCILabel(st, checkin), st.finger = null, checkin;
}
function ciNudge(st, dir) {
  "worklet";
  let base = Math.round(st.ciV * 4) / 4;
  st.ciV = dir < 0 ? Math.max(0, base - 0.25) : Math.min(1, base + 0.25);
  let checkin = Math.round(st.ciV * 4) + 1;
  return st.ciAnswer = checkin, setCILabel(st, checkin), checkin === 5 && (st.ciBloomT = st.wallT), checkin;
}
function stepInteraction(st, dtIn, P) {
  "worklet";
  let dt = Math.min(0.1, dtIn), RM = P.reduceMotion;
  st.wallT += dt;
  let wallT = st.wallT, isStart = st.mode === "start", sg = st.sig;
  if (st.releasing && (st.relT += dt), isStart && !st.releasing) {
    if (st.charge = st.holding ? Math.min(1, st.charge + dt / P.holdDur) : st.charge * Math.exp(-dt / 0.45), st.holding) {
      let k = Math.floor(st.charge * 3);
      k > st.buzzN && (st.buzzN = k, st.events.push(k >= 3 ? EVT.TICK_3 : k === 1 ? EVT.TICK_1 : EVT.TICK_2));
    }
    st.holding && st.charge >= 1 && !st.ready && (st.ready = !0, st.readyT = wallT, st.events.push(EVT.READY));
  } else
    isStart && (st.charge = 0);
  if (st.geoU += ((st.releasing ? 1 : 0) - st.geoU) * (1 - Math.exp(-dt / (st.releasing ? 0.55 : 0.3))), !st.releasing) {
    let fd = st.lastF && st.holding ? Math.min(1, Math.hypot(st.lastF.x, st.lastF.y)) : 0;
    st.ciB += ((st.ciDrag ? 1 : 0) - st.ciB) * (1 - Math.exp(-dt / 0.12));
    let b0 = st.startBase == null ? 0.46 : st.startBase, vC = isStart ? Math.min(1, b0 + (1 - b0) * Math.max(0, Math.min(1, st.charge)) * (1 - 0.12 * fd) + (RM ? 0 : (1 - Math.min(1, st.charge)) * 0.05 * Math.sin(wallT * 1.2))) : Math.min(1, st.ciVs + 0.07 * st.ciB + (RM || !st.ciSway ? 0 : 0.05 * Math.sin(wallT * 1.1)));
    isStart && st.startBase != null && !RM && !st.holding && !st.releasing && (vC = Math.min(1, vC + (0.05 + 0.05 * Math.max(0, Math.min(1, (0.62 - st.startBase) / 0.26))) * (0.5 - 0.5 * Math.cos(wallT * 2.09)))), isStart && st.startBase != null && (st.vS += (vC - st.vS) * (1 - Math.exp(-dt / 0.25)), vC = st.vS);
    let CL = chargeLook2(vC, P.chargeK);
    if (st.visFloor) {
      let F = chargeLook2(0.36, P.chargeK);
      CL.energy = Math.max(CL.energy, F.energy), CL.breath = Math.max(CL.breath, F.breath), CL.amb = Math.max(CL.amb, F.amb);
    }
    let cE = CL.edge, spd = RM ? 0 : 0.1, k = isStart && st.ready ? 1.5 * Math.exp(-(wallT - st.readyT) / 0.35) : 0, mo = wallT * spd;
    isStart || (k = 1.5 * Math.exp(-(wallT - st.ciBloomT) / 0.35));
    let f = st.finger, fs = f ? 1 : 0;
    st.fingerS += (fs - st.fingerS) * (1 - Math.exp(-dt / 0.18)), f && (st.lastF = f);
    let w = 0;
    sg.warmLead = 0, sg.nvisMul = 1, sg.amb = 1.4 * P.ambient * (1 + 0.5 * cE), sg.ambT = wallT, sg.holdFrac = 0, sg.crestRaw = 0, sg.tv = 0, sg.holdKind = null, sg.holdTop = 0, sg.holdBot = 0, sg.retract = 0, sg.hT = 0, sg.endRing = 0, sg.shim = 1, sg.dir = 0, sg.dB = 0, sg.phase01 = 0, sg.crest = 0, sg.lift = 0, sg.flow = 0.5, sg.fireW = 0, sg.t = 0, sg.phase = "", sg.phaseProgress = 0, sg.breath = 0.5 + (0.45 - 0.5) * P.follow, sg.pulse = k * P.firePulse, sg.hold = 0, sg.holdLeft = null, sg.warmth = Math.max(0, Math.min(1, w + (isStart && P.colour === "journey" ? 0.5 * cE : 0))), sg.level = 2, sg.checkin = isStart ? null : st.ciAnswer, sg.afterglow = 0, sg.inSession = !1, sg.motion = mo, sg.energy = Math.min(1.1, (0.34 + 0.56 * cE) * P.energy), isStart || (sg.energy = Math.min(1.1, 0.55 * P.energy)), sg.charge = cE, st.lastF && st.fingerS > 0.01 ? (sg.touch.x = st.lastF.x, sg.touch.y = st.lastF.y, sg.touch.strength = st.fingerS) : isStart && !RM ? (sg.touch.x = 0, sg.touch.y = 0.5, sg.touch.strength = 0.14 * (0.5 + 0.5 * Math.sin(wallT * 1.5)) * (1 - Math.min(1, st.charge))) : (sg.touch.x = 0, sg.touch.y = 0, sg.touch.strength = 0), sg.gather = 0.4 * cE, sg.spark = 0, sg.ambRate = 1, sg.warmLead = P.colour === "journey" ? 1.6 : 0;
    let alive = RM ? 0 : smoothS2(0.78, 1, vC), swell = alive * (0.5 + 0.5 * Math.sin(wallT * 2.4));
    st.rotAcc += dt * 0.2 * alive, sg.energy = Math.min(1.1, CL.energy * P.energy * (1 + 0.07 * swell)), sg.breath = 0.5 + (CL.breath - 0.5) * P.follow + 0.06 * swell, sg.motion = RM ? 0 : wallT * CL.spd * (1 + 1.4 * alive), sg.amb = P.ambient * (CL.amb * 1.1 + (isStart ? 0.6 : 0)), sg.ambT = st.ambClk, sg.ambRate = CL.ambSpeed * (1 + 0.6 * alive), sg.charge = CL.edge, sg.spark = 0, sg.rot = st.rotAcc, sg.pulse = Math.max(k * P.firePulse, 0.38 * swell * alive), sg.warmth = P.colour === "journey" ? CL.warmth : sg.warmth, sg.ant = 0, sg.wave = 0, sg.waveA = 0, sg.swOn = 0, sg.swA = 0, sg.coupX = 0, sg.cm = isStart ? 1 : 0, isStart && (sg.coupX = smoothS2(0.35, 1, vC) * P.startField), sg.bgE = sg.energy, sg.bgB = sg.breath, sg.bgK = sg.pulse * 0.6, sg.bgHT = 0, sg.bgHB = 0, sg.reduceMotion = RM, st.ambClk += dt * (sg.ambRate || 1);
  }
  if (!isStart) {
    for (let n = 0; n < 2; n++) {
      let h = Math.min(dt, 0.05) / 2;
      st.ciVel += (256 * (st.ciV - st.ciVs) - 27 * st.ciVel) * h, st.ciVs += st.ciVel * h;
    }
    st.ciLabelSwapAt >= 0 && wallT >= st.ciLabelSwapAt && (st.ciLabelShown = st.ciLabel, st.ciLabelSwapAt = -1);
  }
  let o = st.out;
  o.hint = st.ready ? HINT.LET_GO : st.holding ? HINT.KEEP : wallT - st.nudgeT < 1.8 ? HINT.LONGER : HINT.PRESS, o.charge = st.charge, o.holdLevel = st.holding ? st.charge : 0, o.holding = st.holding, o.ready = st.ready, o.releasing = st.releasing, o.rel = st.releasing ? st.relT : -1, o.phase = st.releasing ? "releasing" : st.ready ? "ready" : st.holding ? "holding" : st.charge > 2e-3 ? "relaxing" : "idle", o.geoU = st.geoU, o.ciValue = st.ciVs, o.ciTarget = st.ciV, o.ciStop = Math.round(st.ciV * 4), o.ciLabelShown = st.ciLabelShown, o.ciLabelOpacity = st.ciLabelSwapAt >= 0 ? 0 : 1, o.touch.x = sg.touch.x, o.touch.y = sg.touch.y, o.touch.strength = sg.touch.strength;
}

// vendor/app/session-visual/interactions/release.ts
function releaseTerms(rel, S) {
  "worklet";
  let C1 = chargeLook2(1, S.chargeK), cl01 = (x) => Math.max(0, Math.min(1, x)), kk = rel < 0.5 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * cl01((rel - 0.5) / 5)), ant = rel < 0.22 ? smoothS2(0, 0.22, rel) : Math.max(0, 1 - (rel - 0.22) / 0.2), wv = cl01((rel - 0.2) / 1.5);
  return {
    kk,
    ant: ant * S.carry,
    wv,
    edge: C1.edge * kk * S.carry,
    wave: wv * 5.4,
    waveA: Math.pow(1 - wv, 1.4) * smoothS2(0.2, 0.3, rel) * S.carry,
    active: rel <= 6
  };
}
function applyRelease(sg, rel, S) {
  "worklet";
  if (rel > 6)
    return;
  let C1 = chargeLook2(1, S.chargeK), T = releaseTerms(rel, S), kk = T.kk;
  sg.energy += (Math.min(1.1, C1.energy * S.energy) - sg.energy) * kk, S.colour === "journey" && (sg.warmth += (C1.warmth - sg.warmth) * kk), sg.amb *= 1 + 0.9 * kk, sg.charge = T.edge, sg.ant = T.ant, sg.wave = T.wave, sg.waveA = T.waveA, sg.cm = kk, sg.coupX = kk * S.startField, sg.bgE = Math.max(sg.bgE, Math.min(1.1, sg.energy)), sg.bgB = Math.max(sg.bgB, 0.5 + 0.5 * kk * 0.3), sg.bgK = Math.max(sg.bgK, 1.2 * Math.exp(-Math.max(0, rel - 0.2) / 0.5) * smoothS2(0.18, 0.26, rel)), sg.pulse = Math.max(sg.pulse, 1.9 * Math.exp(-Math.max(0, rel - 0.2) / 0.28) * smoothS2(0.18, 0.26, rel));
}

// vendor/app/plasma-flow/spec.ts
var SPEC_INSETS = { tall: { top: 47, bottom: 34 }, short: { top: 20, bottom: 0 } };
function specPos(Hn, insets) {
  let short = Hn < 760, base = short ? SPEC_INSETS.short : SPEC_INSETS.tall, dt = Math.max(0, (insets ? insets.top : base.top) - base.top), db = Math.max(0, (insets ? insets.bottom : base.bottom) - base.bottom), o;
  if (short) {
    let d = Hn - 667 - db, P = 512 + d, C = Math.round((68 + dt + P) / 2), z0 = C + 58;
    o = { short, bar: 28 + dt, ct: 32 + dt, st: 84 + dt, ss: 122 + dt, sb: 580 + d, btn: 48, Cs: Math.round((142 + dt + 580 + d) / 2), Cc: 474 + d - 34 - 118, val: 474 + d, trk: 524 + d, lab: 540 + d, times: 540 + d, ctl: 580 + d, play: 56, skip: 44, cgap: 34, P, C, z0, z1: z0 + 74, cap: z0 + 74 + 22, caph: 48, capf: 18, capl: 24, tf: 26, tl: 32, sf: 14, sl: 20 };
  } else {
    let d = Hn - 844 - db, P = 652 + d, C = Math.round((100 + dt + P) / 2), z0 = C + 66;
    o = { short, bar: 60 + dt, ct: 64 + dt, st: 124 + dt, ss: 166 + dt, sb: 740 + d, btn: 52, Cs: Math.round((188 + dt + 740 + d) / 2), Cc: 616 + d - 34 - 118, val: 616 + d, trk: 664 + d, lab: 684 + d, times: 680 + d, ctl: 720 + d, play: 72, skip: 48, cgap: 36, P, C, z0, z1: z0 + 96, cap: z0 + 96 + 16, caph: 56, capf: 20, capl: 28, tf: 28, tl: 34, sf: 15, sl: 22 };
  }
  let cta = o.sb - 130, pH = 56, rowH = o.short ? 26 : 30, stackGap = o.short ? 8 : 12, stackH = 3 * rowH + 2 * stackGap, pt = cta - 28 - pH, stackTop = pt - 22 - stackH, titleBottom = o.st + o.tl;
  return o.of = { stackTop, rowH, p: pt, C: Math.round((titleBottom + stackTop) / 2), pf: o.short ? 16 : 18, band: stackTop - titleBottom }, o;
}
function heroCentre(SP, step) {
  let T = SP.ss + SP.sl, b = SP.sb - 64;
  switch (step) {
    case "welcome":
      return Math.round((T + b) / 2);
    case "offer":
      return SP.of.C;
    case "result":
      return Math.round((T + SP.sb - 132) / 2);
    case "end":
      return Math.round((T + SP.sb) / 2);
    case "ci1":
    case "ci2":
      return SP.Cc;
    default:
      return SP.Cs;
  }
}
function stepLevel(step, after) {
  switch (step) {
    case "welcome":
      return 0.56;
    case "offer":
      return Math.max(0.62, 0.25 + 0.5 * (after - 1) / 4);
    case "end":
      return 0.34;
    case "result":
      return 0.25 + 0.5 * (after - 1) / 4;
    default:
      return 0.5;
  }
}
var offerHeroScale = (SP, R0) => Math.min(1.2, SP.of.band / (2 * R0) * 1.2);
function textBands(step, SP, h) {
  let top = [SP.bar - 12, SP.ss + 52];
  switch (step) {
    case "session":
      return [[SP.bar - 12, SP.bar + 48], [SP.z0 - 30, SP.cap + SP.caph + 10], [SP.trk - 14, h]];
    case "offer":
      return [top, [SP.of.stackTop - 8, SP.of.p + 60], [SP.sb - 70, h]];
    case "result":
      return [top, [SP.sb - 172, SP.sb - 36], [SP.sb - 12, h]];
    case "ci1":
    case "ci2":
      return [top, [SP.Cc + 100, h], [-1, -1]];
    case "welcome":
      return [[0.04 * h, 0.14 * h], [0.36 * h, 0.52 * h], [0.62 * h, h]];
    default:
      return [top, [-1, -1], [SP.sb - 12, SP.sb + 84]];
  }
}

// vendor/app/plasma-flow/flowState.ts
function openStep(fc, step, after, first = !1, before = null) {
  let ix = fc.ix;
  fc.step = step, fc.after = after, ix.mode = step === "start" ? "start" : "checkin", ix.ciSway = step !== "ci1" && step !== "ci2" && step !== "start", step === "start" ? (ix.finger = null, ix.holding = !1, ix.ready = !1, ix.charge = 0, ix.releasing = !1, ix.relT = 0, ix.nudgeT = -9, before != null ? (ix.startBase = [0.36, 0.41, 0.46, 0.54, 0.62][Math.max(0, Math.min(4, Math.round(before) - 1))], ix.vS = ix.ciVs) : ix.startBase = null) : step === "ci1" || step === "ci2" ? (ix.releasing = !1, fc.carry = !1, ix.ciV = 0.5, ix.ciVs = 0.5, ix.ciVel = 0, ix.ciDrag = !1, ix.ciLastStop = 2, ix.ciLabel = 3, ix.ciLabelShown = 3, ix.ciLabelSwapAt = -1, ix.ciAnswer = 3, ix.finger = null) : step === "session" ? fc.carry = ix.releasing : (ix.releasing = !1, fc.carry = !1, ix.ciV = fc.levelOv != null ? fc.levelOv : stepLevel(step, after), ix.ciDrag = !1, ix.finger = null);
}
function createFlowCtl(w, h, P, step, after, settled = !1, before = null, exact = !1) {
  let H = Math.min(h, 1100), SP = specPos(H), ix = createInteractionState(step === "start" ? "start" : "checkin", P, before != null ? (before - 1) / 4 : 0.5), heroCy = heroCentre(SP, step), fc = { ix, step, after, w, h: H, SP, heroCy, heroRS: 1, geoU: settled && step === "session" ? 1 : 0, geo: { cx: w / 2, cy: heroCy, R: 1, capY: 0 }, scr: { cx: w / 2, cy: heroCy, R: 1, capY: 0 }, v: 0, carry: !1, exact: !1, levelOv: null, scaleOv: null, heroY: null };
  return fc.exact = exact, ix.visFloor = !exact, openStep(fc, step, after, !0, before), fc;
}
var lerp = (a, b, u) => a + (b - a) * u;
function blendGeo(a, b, u) {
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), R: lerp(a.R, b.R, u), capY: lerp(a.capY, b.capY, u) };
}
function playGeo(fc, size) {
  let R = 96 * size;
  return { cx: fc.w / 2, cy: fc.SP.C, R, capY: (fc.SP.z0 - 26 - 10 - fc.SP.C) / R };
}
function stepFlow(fc, dt, P, size) {
  let ix = fc.ix, step = fc.step, dtc = Math.min(0.1, dt);
  fc.geoU += ((step === "session" ? 1 : 0) - fc.geoU) * (1 - Math.exp(-dtc / (ix.releasing ? 0.55 : 0.3)));
  let ciStep = step === "ci1" || step === "ci2", big = !fc.exact && ciStep ? 1.08 + 0.3 * Math.max(0, Math.min(1, ix.ciVs)) : !fc.exact && step === "start" && ix.startBase != null && !ix.holding && !ix.releasing ? [0.9, 0.95, 1, 1.04, 1.08][Math.max(0, Math.min(4, Math.round(ix.startBase < 0.385 ? 1 : ix.startBase < 0.435 ? 2 : ix.startBase < 0.5 ? 3 : ix.startBase < 0.58 ? 4 : 5) - 1))] : 1;
  fc.heroRS += ((fc.scaleOv != null ? fc.scaleOv : step === "offer" ? offerHeroScale(fc.SP, 0.36 * Math.min(fc.w, fc.h * 0.5625)) : big) - fc.heroRS) * (1 - Math.exp(-dtc / (ciStep ? 0.15 : 0.4))), fc.heroCy += ((fc.heroY != null ? fc.heroY : heroCentre(fc.SP, step)) - fc.heroCy) * (1 - Math.exp(-dtc / 0.32));
  let u = Math.min(fc.w, fc.h * 0.5625), R0 = 0.36 * u;
  fc.scr = { cx: fc.w / 2, cy: fc.heroCy, R: R0 * fc.heroRS, capY: (fc.h * 0.68 - 6 - fc.heroCy) / R0 };
  let pg = playGeo(fc, size);
  if (fc.geo = blendGeo(fc.scr, pg, fc.geoU), step === "session") {
    ix.wallT += dtc, ix.ambClk += dtc, ix.releasing && (ix.relT += dtc, ix.relT > 6 && (ix.releasing = !1, ix.relT = 0));
    let rel = ix.releasing ? ix.relT : -1;
    ix.out.rel = rel, ix.out.releasing = ix.releasing;
    let settled = fc.geoU > 0.9995;
    (!settled || rel >= 0) && fc.v++;
    let lineA = rel < 0 || rel >= 2.3 ? 1 : rel < 1.4 ? 0 : (rel - 1.4) / 0.9;
    return { sig: null, geo: null, scr: settled ? null : fc.scr, u: fc.geoU, rot: ix.rotAcc, v: fc.v, rel, carry: fc.carry, lineA };
  }
  stepInteraction(ix, dt, P), fc.v++;
  let sg = ix.sig;
  return { sig: { ...sg, touch: { x: sg.touch.x, y: sg.touch.y, strength: sg.touch.strength } }, geo: fc.geo, scr: null, u: 0, rot: ix.rotAcc, v: fc.v, rel: -1, carry: !1, lineA: 1 };
}
var ringOf = (fc, x, y) => ({ x: (x - fc.geo.cx) / fc.geo.R, y: (y - fc.geo.cy) / fc.geo.R }), pointerDown = (fc, x, y) => startPointerDown(fc.ix, ringOf(fc, x, y)), pointerMove = (fc, x, y) => startPointerMove(fc.ix, ringOf(fc, x, y)), pointerUp = (fc) => startPointerUp(fc.ix), scaleDown = (fc, v, x, y) => ciPointerDown(fc.ix, v, ringOf(fc, x, y)), scaleMove = (fc, v, x, y) => ciPointerMove(fc.ix, v, ringOf(fc, x, y)), scaleUp = (fc) => ciPointerUp(fc.ix), scaleNudge = (fc, dir) => ciNudge(fc.ix, dir);

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever, util2.arrayToEnum = (items) => {
    let obj = {};
    for (let item of items)
      obj[item] = item;
    return obj;
  }, util2.getValidEnumValues = (obj) => {
    let validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] != "number"), filtered = {};
    for (let k of validKeys)
      filtered[k] = obj[k];
    return util2.objectValues(filtered);
  }, util2.objectValues = (obj) => util2.objectKeys(obj).map(function(e) {
    return obj[e];
  }), util2.objectKeys = typeof Object.keys == "function" ? (obj) => Object.keys(obj) : (object) => {
    let keys = [];
    for (let key in object)
      Object.prototype.hasOwnProperty.call(object, key) && keys.push(key);
    return keys;
  }, util2.find = (arr, checker) => {
    for (let item of arr)
      if (checker(item))
        return item;
  }, util2.isInteger = typeof Number.isInteger == "function" ? (val) => Number.isInteger(val) : (val) => typeof val == "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val == "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues, util2.jsonStringifyReplacer = (_, value) => typeof value == "bigint" ? value.toString() : value;
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => ({
    ...first,
    ...second
    // second overwrites first
  });
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]), getParsedType = (data) => {
  switch (typeof data) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      return Array.isArray(data) ? ZodParsedType.array : data === null ? ZodParsedType.null : data.then && typeof data.then == "function" && data.catch && typeof data.catch == "function" ? ZodParsedType.promise : typeof Map < "u" && data instanceof Map ? ZodParsedType.map : typeof Set < "u" && data instanceof Set ? ZodParsedType.set : typeof Date < "u" && data instanceof Date ? ZodParsedType.date : ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]), quotelessJson = (obj) => JSON.stringify(obj, null, 2).replace(/"([^"]+)":/g, "$1:"), ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super(), this.issues = [], this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    }, this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    let actualProto = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, actualProto) : this.__proto__ = actualProto, this.name = "ZodError", this.issues = issues;
  }
  format(_mapper) {
    let mapper = _mapper || function(issue) {
      return issue.message;
    }, fieldErrors = { _errors: [] }, processError = (error) => {
      for (let issue of error.issues)
        if (issue.code === "invalid_union")
          issue.unionErrors.map(processError);
        else if (issue.code === "invalid_return_type")
          processError(issue.returnTypeError);
        else if (issue.code === "invalid_arguments")
          processError(issue.argumentsError);
        else if (issue.path.length === 0)
          fieldErrors._errors.push(mapper(issue));
        else {
          let curr = fieldErrors, i = 0;
          for (; i < issue.path.length; ) {
            let el = issue.path[i];
            i === issue.path.length - 1 ? (curr[el] = curr[el] || { _errors: [] }, curr[el]._errors.push(mapper(issue))) : curr[el] = curr[el] || { _errors: [] }, curr = curr[el], i++;
          }
        }
    };
    return processError(this), fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError))
      throw new Error(`Not a ZodError: ${value}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    let fieldErrors = {}, formErrors = [];
    for (let sub of this.issues)
      if (sub.path.length > 0) {
        let firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [], fieldErrors[firstEl].push(mapper(sub));
      } else
        formErrors.push(mapper(sub));
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => new ZodError(issues);

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      issue.received === ZodParsedType.undefined ? message = "Required" : message = `Expected ${issue.expected}, received ${issue.received}`;
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = "Invalid input";
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = "Invalid function arguments";
      break;
    case ZodIssueCode.invalid_return_type:
      message = "Invalid function return type";
      break;
    case ZodIssueCode.invalid_date:
      message = "Invalid date";
      break;
    case ZodIssueCode.invalid_string:
      typeof issue.validation == "object" ? "includes" in issue.validation ? (message = `Invalid input: must include "${issue.validation.includes}"`, typeof issue.validation.position == "number" && (message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`)) : "startsWith" in issue.validation ? message = `Invalid input: must start with "${issue.validation.startsWith}"` : "endsWith" in issue.validation ? message = `Invalid input: must end with "${issue.validation.endsWith}"` : util.assertNever(issue.validation) : issue.validation !== "regex" ? message = `Invalid ${issue.validation}` : message = "Invalid";
      break;
    case ZodIssueCode.too_small:
      issue.type === "array" ? message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? "at least" : "more than"} ${issue.minimum} element(s)` : issue.type === "string" ? message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? "at least" : "over"} ${issue.minimum} character(s)` : issue.type === "number" ? message = `Number must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${issue.minimum}` : issue.type === "bigint" ? message = `Number must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${issue.minimum}` : issue.type === "date" ? message = `Date must be ${issue.exact ? "exactly equal to " : issue.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(issue.minimum))}` : message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      issue.type === "array" ? message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? "at most" : "less than"} ${issue.maximum} element(s)` : issue.type === "string" ? message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? "at most" : "under"} ${issue.maximum} character(s)` : issue.type === "number" ? message = `Number must be ${issue.exact ? "exactly" : issue.inclusive ? "less than or equal to" : "less than"} ${issue.maximum}` : issue.type === "bigint" ? message = `BigInt must be ${issue.exact ? "exactly" : issue.inclusive ? "less than or equal to" : "less than"} ${issue.maximum}` : issue.type === "date" ? message = `Date must be ${issue.exact ? "exactly" : issue.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(issue.maximum))}` : message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = "Invalid input";
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = "Intersection results could not be merged";
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError, util.assertNever(issue);
  }
  return { message };
}, en_default = errorMap;

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  let { data, path, errorMaps, issueData } = params, fullPath = [...path, ...issueData.path || []], fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0)
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  let errorMessage = "", maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (let map of maps)
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  let overrideMap = getErrorMap(), issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    this.value === "valid" && (this.value = "dirty");
  }
  abort() {
    this.value !== "aborted" && (this.value = "aborted");
  }
  static mergeArray(status, results) {
    let arrayValue = [];
    for (let s of results) {
      if (s.status === "aborted")
        return INVALID;
      s.status === "dirty" && status.dirty(), arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    let syncPairs = [];
    for (let pair of pairs) {
      let key = await pair.key, value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    let finalObject = {};
    for (let pair of pairs) {
      let { key, value } = pair;
      if (key.status === "aborted" || value.status === "aborted")
        return INVALID;
      key.status === "dirty" && status.dirty(), value.status === "dirty" && status.dirty(), key.value !== "__proto__" && (typeof value.value < "u" || pair.alwaysSet) && (finalObject[key.value] = value.value);
    }
    return { status: status.value, value: finalObject };
  }
}, INVALID = Object.freeze({
  status: "aborted"
}), DIRTY = (value) => ({ status: "dirty", value }), OK = (value) => ({ status: "valid", value }), isAborted = (x) => x.status === "aborted", isDirty = (x) => x.status === "dirty", isValid = (x) => x.status === "valid", isAsync = (x) => typeof Promise < "u" && x instanceof Promise;

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message == "string" ? { message } : message || {}, errorUtil2.toString = (message) => typeof message == "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../../../../../../Users/isakgustafsson/Documents/wehale-app/.claude/worktrees/agent-a225cb6a2b53880b7/server/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [], this.parent = parent, this.data = value, this._path = path, this._key = key;
  }
  get path() {
    return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}, handleResult = (ctx, result) => {
  if (isValid(result))
    return { success: !0, data: result.value };
  if (!ctx.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      let error = new ZodError(ctx.common.issues);
      return this._error = error, this._error;
    }
  };
};
function processCreateParams(params) {
  if (!params)
    return {};
  let { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return errorMap2 ? { errorMap: errorMap2, description } : { errorMap: (iss, ctx) => {
    let { message } = params;
    return iss.code === "invalid_enum_value" ? { message: message ?? ctx.defaultError } : typeof ctx.data > "u" ? { message: message ?? required_error ?? ctx.defaultError } : iss.code !== "invalid_type" ? { message: ctx.defaultError } : { message: message ?? invalid_type_error ?? ctx.defaultError };
  }, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    let result = this._parse(input);
    if (isAsync(result))
      throw new Error("Synchronous parse encountered promise.");
    return result;
  }
  _parseAsync(input) {
    let result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    let result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    let ctx = {
      common: {
        issues: [],
        async: params?.async ?? !1,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    }, result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    let ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async)
      try {
        let result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        err?.message?.toLowerCase()?.includes("encountered") && (this["~standard"].async = !0), ctx.common = {
          issues: [],
          async: !0
        };
      }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    let result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    let ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: !0
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    }, maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx }), result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    let getIssueProperties = (val) => typeof message == "string" || typeof message > "u" ? { message } : typeof message == "function" ? message(val) : message;
    return this._refinement((val, ctx) => {
      let result = check(val), setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      return typeof Promise < "u" && result instanceof Promise ? result.then((data) => data ? !0 : (setError(), !1)) : result ? !0 : (setError(), !1);
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => check(val) ? !0 : (ctx.addIssue(typeof refinementData == "function" ? refinementData(val, ctx) : refinementData), !1));
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync, this._def = def, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    let defaultValueFunc = typeof def == "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    let catchValueFunc = typeof def == "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    let This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}, cuidRegex = /^c[^\s-]{8,}$/i, cuid2Regex = /^[0-9a-z]+$/, ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i, uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, nanoidRegex = /^[a-z0-9_-]{21}$/i, jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, _emojiRegex = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", emojiRegex, ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/, ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/, ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/, dateRegexSource = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = "[0-5]\\d";
  args.precision ? secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}` : args.precision == null && (secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`);
  let secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`, opts = [];
  return opts.push(args.local ? "Z?" : "Z"), args.offset && opts.push("([+-]\\d{2}:?\\d{2})"), regex = `${regex}(${opts.join("|")})`, new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  return !!((version === "v4" || !version) && ipv4Regex.test(ip) || (version === "v6" || !version) && ipv6Regex.test(ip));
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return !1;
  try {
    let [header] = jwt.split(".");
    if (!header)
      return !1;
    let base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "="), decoded = JSON.parse(atob(base64));
    return !(typeof decoded != "object" || decoded === null || "typ" in decoded && decoded?.typ !== "JWT" || !decoded.alg || alg && decoded.alg !== alg);
  } catch {
    return !1;
  }
}
function isValidCidr(ip, version) {
  return !!((version === "v4" || !version) && ipv4CidrRegex.test(ip) || (version === "v6" || !version) && ipv6CidrRegex.test(ip));
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce && (input.data = String(input.data)), this._getType(input) !== ZodParsedType.string) {
      let ctx2 = this._getOrReturnCtx(input);
      return addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      }), INVALID;
    }
    let status = new ParseStatus(), ctx;
    for (let check of this._def.checks)
      if (check.kind === "min")
        input.data.length < check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: check.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: check.message
        }), status.dirty());
      else if (check.kind === "max")
        input.data.length > check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: check.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: check.message
        }), status.dirty());
      else if (check.kind === "length") {
        let tooBig = input.data.length > check.value, tooSmall = input.data.length < check.value;
        (tooBig || tooSmall) && (ctx = this._getOrReturnCtx(input, ctx), tooBig ? addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: check.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: check.message
        }) : tooSmall && addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: check.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: check.message
        }), status.dirty());
      } else if (check.kind === "email")
        emailRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "email",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty());
      else if (check.kind === "emoji")
        emojiRegex || (emojiRegex = new RegExp(_emojiRegex, "u")), emojiRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "emoji",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty());
      else if (check.kind === "uuid")
        uuidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "uuid",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty());
      else if (check.kind === "nanoid")
        nanoidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "nanoid",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty());
      else if (check.kind === "cuid")
        cuidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "cuid",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty());
      else if (check.kind === "cuid2")
        cuid2Regex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "cuid2",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty());
      else if (check.kind === "ulid")
        ulidRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "ulid",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty());
      else if (check.kind === "url")
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          }), status.dirty();
        }
      else
        check.kind === "regex" ? (check.regex.lastIndex = 0, check.regex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "regex",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty())) : check.kind === "trim" ? input.data = input.data.trim() : check.kind === "includes" ? input.data.includes(check.value, check.position) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: { includes: check.value, position: check.position },
          message: check.message
        }), status.dirty()) : check.kind === "toLowerCase" ? input.data = input.data.toLowerCase() : check.kind === "toUpperCase" ? input.data = input.data.toUpperCase() : check.kind === "startsWith" ? input.data.startsWith(check.value) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: { startsWith: check.value },
          message: check.message
        }), status.dirty()) : check.kind === "endsWith" ? input.data.endsWith(check.value) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: { endsWith: check.value },
          message: check.message
        }), status.dirty()) : check.kind === "datetime" ? datetimeRegex(check).test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: "datetime",
          message: check.message
        }), status.dirty()) : check.kind === "date" ? dateRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: "date",
          message: check.message
        }), status.dirty()) : check.kind === "time" ? timeRegex(check).test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_string,
          validation: "time",
          message: check.message
        }), status.dirty()) : check.kind === "duration" ? durationRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "duration",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "ip" ? isValidIP(input.data, check.version) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "ip",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "jwt" ? isValidJWT(input.data, check.alg) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "jwt",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "cidr" ? isValidCidr(input.data, check.version) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "cidr",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "base64" ? base64Regex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "base64",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : check.kind === "base64url" ? base64urlRegex.test(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
          validation: "base64url",
          code: ZodIssueCode.invalid_string,
          message: check.message
        }), status.dirty()) : util.assertNever(check);
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    return typeof options == "string" ? this._addCheck({
      kind: "datetime",
      precision: null,
      offset: !1,
      local: !1,
      message: options
    }) : this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision > "u" ? null : options?.precision,
      offset: options?.offset ?? !1,
      local: options?.local ?? !1,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    return typeof options == "string" ? this._addCheck({
      kind: "time",
      precision: null,
      message: options
    }) : this._addCheck({
      kind: "time",
      precision: typeof options?.precision > "u" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (let ch of this._def.checks)
      ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
    return min;
  }
  get maxLength() {
    let max = null;
    for (let ch of this._def.checks)
      ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
    return max;
  }
};
ZodString.create = (params) => new ZodString({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodString,
  coerce: params?.coerce ?? !1,
  ...processCreateParams(params)
});
function floatSafeRemainder(val, step) {
  let valDecCount = (val.toString().split(".")[1] || "").length, stepDecCount = (step.toString().split(".")[1] || "").length, decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount, valInt = Number.parseInt(val.toFixed(decCount).replace(".", "")), stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce && (input.data = Number(input.data)), this._getType(input) !== ZodParsedType.number) {
      let ctx2 = this._getOrReturnCtx(input);
      return addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      }), INVALID;
    }
    let ctx, status = new ParseStatus();
    for (let check of this._def.checks)
      check.kind === "int" ? util.isInteger(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: "integer",
        received: "float",
        message: check.message
      }), status.dirty()) : check.kind === "min" ? (check.inclusive ? input.data < check.value : input.data <= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: check.value,
        type: "number",
        inclusive: check.inclusive,
        exact: !1,
        message: check.message
      }), status.dirty()) : check.kind === "max" ? (check.inclusive ? input.data > check.value : input.data >= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: check.value,
        type: "number",
        inclusive: check.inclusive,
        exact: !1,
        message: check.message
      }), status.dirty()) : check.kind === "multipleOf" ? floatSafeRemainder(input.data, check.value) !== 0 && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.not_multiple_of,
        multipleOf: check.value,
        message: check.message
      }), status.dirty()) : check.kind === "finite" ? Number.isFinite(input.data) || (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.not_finite,
        message: check.message
      }), status.dirty()) : util.assertNever(check);
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, !0, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, !1, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, !0, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, !1, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (let ch of this._def.checks)
      ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
    return min;
  }
  get maxValue() {
    let max = null;
    for (let ch of this._def.checks)
      ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (let ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf")
        return !0;
      ch.kind === "min" ? (min === null || ch.value > min) && (min = ch.value) : ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => new ZodNumber({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodNumber,
  coerce: params?.coerce || !1,
  ...processCreateParams(params)
});
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce)
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    if (this._getType(input) !== ZodParsedType.bigint)
      return this._getInvalidInput(input);
    let ctx, status = new ParseStatus();
    for (let check of this._def.checks)
      check.kind === "min" ? (check.inclusive ? input.data < check.value : input.data <= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        type: "bigint",
        minimum: check.value,
        inclusive: check.inclusive,
        message: check.message
      }), status.dirty()) : check.kind === "max" ? (check.inclusive ? input.data > check.value : input.data >= check.value) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        type: "bigint",
        maximum: check.value,
        inclusive: check.inclusive,
        message: check.message
      }), status.dirty()) : check.kind === "multipleOf" ? input.data % check.value !== BigInt(0) && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.not_multiple_of,
        multipleOf: check.value,
        message: check.message
      }), status.dirty()) : util.assertNever(check);
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    let ctx = this._getOrReturnCtx(input);
    return addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    }), INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, !0, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, !1, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, !0, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, !1, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (let ch of this._def.checks)
      ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
    return min;
  }
  get maxValue() {
    let max = null;
    for (let ch of this._def.checks)
      ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
    return max;
  }
};
ZodBigInt.create = (params) => new ZodBigInt({
  checks: [],
  typeName: ZodFirstPartyTypeKind.ZodBigInt,
  coerce: params?.coerce ?? !1,
  ...processCreateParams(params)
});
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce && (input.data = !!input.data), this._getType(input) !== ZodParsedType.boolean) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      }), INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => new ZodBoolean({
  typeName: ZodFirstPartyTypeKind.ZodBoolean,
  coerce: params?.coerce || !1,
  ...processCreateParams(params)
});
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce && (input.data = new Date(input.data)), this._getType(input) !== ZodParsedType.date) {
      let ctx2 = this._getOrReturnCtx(input);
      return addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      }), INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      let ctx2 = this._getOrReturnCtx(input);
      return addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      }), INVALID;
    }
    let status = new ParseStatus(), ctx;
    for (let check of this._def.checks)
      check.kind === "min" ? input.data.getTime() < check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        message: check.message,
        inclusive: !0,
        exact: !1,
        minimum: check.value,
        type: "date"
      }), status.dirty()) : check.kind === "max" ? input.data.getTime() > check.value && (ctx = this._getOrReturnCtx(input, ctx), addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        message: check.message,
        inclusive: !0,
        exact: !1,
        maximum: check.value,
        type: "date"
      }), status.dirty()) : util.assertNever(check);
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (let ch of this._def.checks)
      ch.kind === "min" && (min === null || ch.value > min) && (min = ch.value);
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (let ch of this._def.checks)
      ch.kind === "max" && (max === null || ch.value < max) && (max = ch.value);
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => new ZodDate({
  checks: [],
  coerce: params?.coerce || !1,
  typeName: ZodFirstPartyTypeKind.ZodDate,
  ...processCreateParams(params)
});
var ZodSymbol = class extends ZodType {
  _parse(input) {
    if (this._getType(input) !== ZodParsedType.symbol) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      }), INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => new ZodSymbol({
  typeName: ZodFirstPartyTypeKind.ZodSymbol,
  ...processCreateParams(params)
});
var ZodUndefined = class extends ZodType {
  _parse(input) {
    if (this._getType(input) !== ZodParsedType.undefined) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      }), INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => new ZodUndefined({
  typeName: ZodFirstPartyTypeKind.ZodUndefined,
  ...processCreateParams(params)
});
var ZodNull = class extends ZodType {
  _parse(input) {
    if (this._getType(input) !== ZodParsedType.null) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      }), INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => new ZodNull({
  typeName: ZodFirstPartyTypeKind.ZodNull,
  ...processCreateParams(params)
});
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => new ZodAny({
  typeName: ZodFirstPartyTypeKind.ZodAny,
  ...processCreateParams(params)
});
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => new ZodUnknown({
  typeName: ZodFirstPartyTypeKind.ZodUnknown,
  ...processCreateParams(params)
});
var ZodNever = class extends ZodType {
  _parse(input) {
    let ctx = this._getOrReturnCtx(input);
    return addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    }), INVALID;
  }
};
ZodNever.create = (params) => new ZodNever({
  typeName: ZodFirstPartyTypeKind.ZodNever,
  ...processCreateParams(params)
});
var ZodVoid = class extends ZodType {
  _parse(input) {
    if (this._getType(input) !== ZodParsedType.undefined) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      }), INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => new ZodVoid({
  typeName: ZodFirstPartyTypeKind.ZodVoid,
  ...processCreateParams(params)
});
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    let { ctx, status } = this._processInputParams(input), def = this._def;
    if (ctx.parsedType !== ZodParsedType.array)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      }), INVALID;
    if (def.exactLength !== null) {
      let tooBig = ctx.data.length > def.exactLength.value, tooSmall = ctx.data.length < def.exactLength.value;
      (tooBig || tooSmall) && (addIssueToContext(ctx, {
        code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
        minimum: tooSmall ? def.exactLength.value : void 0,
        maximum: tooBig ? def.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: def.exactLength.message
      }), status.dirty());
    }
    if (def.minLength !== null && ctx.data.length < def.minLength.value && (addIssueToContext(ctx, {
      code: ZodIssueCode.too_small,
      minimum: def.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: def.minLength.message
    }), status.dirty()), def.maxLength !== null && ctx.data.length > def.maxLength.value && (addIssueToContext(ctx, {
      code: ZodIssueCode.too_big,
      maximum: def.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: def.maxLength.message
    }), status.dirty()), ctx.common.async)
      return Promise.all([...ctx.data].map((item, i) => def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i)))).then((result2) => ParseStatus.mergeArray(status, result2));
    let result = [...ctx.data].map((item, i) => def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => new ZodArray({
  type: schema,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: ZodFirstPartyTypeKind.ZodArray,
  ...processCreateParams(params)
});
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    let newShape = {};
    for (let key in schema.shape) {
      let fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else
    return schema instanceof ZodArray ? new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    }) : schema instanceof ZodOptional ? ZodOptional.create(deepPartialify(schema.unwrap())) : schema instanceof ZodNullable ? ZodNullable.create(deepPartialify(schema.unwrap())) : schema instanceof ZodTuple ? ZodTuple.create(schema.items.map((item) => deepPartialify(item))) : schema;
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    let shape2 = this._def.shape(), keys = util.objectKeys(shape2);
    return this._cached = { shape: shape2, keys }, this._cached;
  }
  _parse(input) {
    if (this._getType(input) !== ZodParsedType.object) {
      let ctx2 = this._getOrReturnCtx(input);
      return addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      }), INVALID;
    }
    let { status, ctx } = this._processInputParams(input), { shape: shape2, keys: shapeKeys } = this._getCached(), extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip"))
      for (let key in ctx.data)
        shapeKeys.includes(key) || extraKeys.push(key);
    let pairs = [];
    for (let key of shapeKeys) {
      let keyValidator = shape2[key], value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      let unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough")
        for (let key of extraKeys)
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
      else if (unknownKeys === "strict")
        extraKeys.length > 0 && (addIssueToContext(ctx, {
          code: ZodIssueCode.unrecognized_keys,
          keys: extraKeys
        }), status.dirty());
      else if (unknownKeys !== "strip")
        throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      let catchall = this._def.catchall;
      for (let key of extraKeys) {
        let value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    return ctx.common.async ? Promise.resolve().then(async () => {
      let syncPairs = [];
      for (let pair of pairs) {
        let key = await pair.key, value = await pair.value;
        syncPairs.push({
          key,
          value,
          alwaysSet: pair.alwaysSet
        });
      }
      return syncPairs;
    }).then((syncPairs) => ParseStatus.mergeObjectSync(status, syncPairs)) : ParseStatus.mergeObjectSync(status, pairs);
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    return errorUtil.errToObj, new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          let defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          return issue.code === "unrecognized_keys" ? {
            message: errorUtil.errToObj(message).message ?? defaultError
          } : {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    return new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    let shape2 = {};
    for (let key of util.objectKeys(mask))
      mask[key] && this.shape[key] && (shape2[key] = this.shape[key]);
    return new _ZodObject({
      ...this._def,
      shape: () => shape2
    });
  }
  omit(mask) {
    let shape2 = {};
    for (let key of util.objectKeys(this.shape))
      mask[key] || (shape2[key] = this.shape[key]);
    return new _ZodObject({
      ...this._def,
      shape: () => shape2
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    let newShape = {};
    for (let key of util.objectKeys(this.shape)) {
      let fieldSchema = this.shape[key];
      mask && !mask[key] ? newShape[key] = fieldSchema : newShape[key] = fieldSchema.optional();
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    let newShape = {};
    for (let key of util.objectKeys(this.shape))
      if (mask && !mask[key])
        newShape[key] = this.shape[key];
      else {
        let newField = this.shape[key];
        for (; newField instanceof ZodOptional; )
          newField = newField._def.innerType;
        newShape[key] = newField;
      }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape2, params) => new ZodObject({
  shape: () => shape2,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(params)
});
ZodObject.strictCreate = (shape2, params) => new ZodObject({
  shape: () => shape2,
  unknownKeys: "strict",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(params)
});
ZodObject.lazycreate = (shape2, params) => new ZodObject({
  shape: shape2,
  unknownKeys: "strip",
  catchall: ZodNever.create(),
  typeName: ZodFirstPartyTypeKind.ZodObject,
  ...processCreateParams(params)
});
var ZodUnion = class extends ZodType {
  _parse(input) {
    let { ctx } = this._processInputParams(input), options = this._def.options;
    function handleResults(results) {
      for (let result of results)
        if (result.result.status === "valid")
          return result.result;
      for (let result of results)
        if (result.result.status === "dirty")
          return ctx.common.issues.push(...result.ctx.common.issues), result.result;
      let unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      }), INVALID;
    }
    if (ctx.common.async)
      return Promise.all(options.map(async (option) => {
        let childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    {
      let dirty, issues = [];
      for (let option of options) {
        let childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        }, result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid")
          return result;
        result.status === "dirty" && !dirty && (dirty = { result, ctx: childCtx }), childCtx.common.issues.length && issues.push(childCtx.common.issues);
      }
      if (dirty)
        return ctx.common.issues.push(...dirty.ctx.common.issues), dirty.result;
      let unionErrors = issues.map((issues2) => new ZodError(issues2));
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      }), INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => new ZodUnion({
  options: types,
  typeName: ZodFirstPartyTypeKind.ZodUnion,
  ...processCreateParams(params)
});
var getDiscriminator = (type) => type instanceof ZodLazy ? getDiscriminator(type.schema) : type instanceof ZodEffects ? getDiscriminator(type.innerType()) : type instanceof ZodLiteral ? [type.value] : type instanceof ZodEnum ? type.options : type instanceof ZodNativeEnum ? util.objectValues(type.enum) : type instanceof ZodDefault ? getDiscriminator(type._def.innerType) : type instanceof ZodUndefined ? [void 0] : type instanceof ZodNull ? [null] : type instanceof ZodOptional ? [void 0, ...getDiscriminator(type.unwrap())] : type instanceof ZodNullable ? [null, ...getDiscriminator(type.unwrap())] : type instanceof ZodBranded || type instanceof ZodReadonly ? getDiscriminator(type.unwrap()) : type instanceof ZodCatch ? getDiscriminator(type._def.innerType) : [], ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    let { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      }), INVALID;
    let discriminator = this.discriminator, discriminatorValue = ctx.data[discriminator], option = this.optionsMap.get(discriminatorValue);
    return option ? ctx.common.async ? option._parseAsync({
      data: ctx.data,
      path: ctx.path,
      parent: ctx
    }) : option._parseSync({
      data: ctx.data,
      path: ctx.path,
      parent: ctx
    }) : (addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_union_discriminator,
      options: Array.from(this.optionsMap.keys()),
      path: [discriminator]
    }), INVALID);
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    let optionsMap = /* @__PURE__ */ new Map();
    for (let type of options) {
      let discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length)
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      for (let value of discriminatorValues) {
        if (optionsMap.has(value))
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  let aType = getParsedType(a), bType = getParsedType(b);
  if (a === b)
    return { valid: !0, data: a };
  if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    let bKeys = util.objectKeys(b), sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1), newObj = { ...a, ...b };
    for (let key of sharedKeys) {
      let sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid)
        return { valid: !1 };
      newObj[key] = sharedValue.data;
    }
    return { valid: !0, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length)
      return { valid: !1 };
    let newArray = [];
    for (let index = 0; index < a.length; index++) {
      let itemA = a[index], itemB = b[index], sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid)
        return { valid: !1 };
      newArray.push(sharedValue.data);
    }
    return { valid: !0, data: newArray };
  } else
    return aType === ZodParsedType.date && bType === ZodParsedType.date && +a == +b ? { valid: !0, data: a } : { valid: !1 };
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    let { status, ctx } = this._processInputParams(input), handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight))
        return INVALID;
      let merged = mergeValues(parsedLeft.value, parsedRight.value);
      return merged.valid ? ((isDirty(parsedLeft) || isDirty(parsedRight)) && status.dirty(), { status: status.value, value: merged.data }) : (addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_intersection_types
      }), INVALID);
    };
    return ctx.common.async ? Promise.all([
      this._def.left._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }),
      this._def.right._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      })
    ]).then(([left, right]) => handleParsed(left, right)) : handleParsed(this._def.left._parseSync({
      data: ctx.data,
      path: ctx.path,
      parent: ctx
    }), this._def.right._parseSync({
      data: ctx.data,
      path: ctx.path,
      parent: ctx
    }));
  }
};
ZodIntersection.create = (left, right, params) => new ZodIntersection({
  left,
  right,
  typeName: ZodFirstPartyTypeKind.ZodIntersection,
  ...processCreateParams(params)
});
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    let { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      }), INVALID;
    if (ctx.data.length < this._def.items.length)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), INVALID;
    !this._def.rest && ctx.data.length > this._def.items.length && (addIssueToContext(ctx, {
      code: ZodIssueCode.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), status.dirty());
    let items = [...ctx.data].map((item, itemIndex) => {
      let schema = this._def.items[itemIndex] || this._def.rest;
      return schema ? schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex)) : null;
    }).filter((x) => !!x);
    return ctx.common.async ? Promise.all(items).then((results) => ParseStatus.mergeArray(status, results)) : ParseStatus.mergeArray(status, items);
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    let { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      }), INVALID;
    let pairs = [], keyType = this._def.keyType, valueType = this._def.valueType;
    for (let key in ctx.data)
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    return ctx.common.async ? ParseStatus.mergeObjectAsync(status, pairs) : ParseStatus.mergeObjectSync(status, pairs);
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    return second instanceof ZodType ? new _ZodRecord({
      keyType: first,
      valueType: second,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(third)
    }) : new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
}, ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    let { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      }), INVALID;
    let keyType = this._def.keyType, valueType = this._def.valueType, pairs = [...ctx.data.entries()].map(([key, value], index) => ({
      key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
      value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
    }));
    if (ctx.common.async) {
      let finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (let pair of pairs) {
          let key = await pair.key, value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted")
            return INVALID;
          (key.status === "dirty" || value.status === "dirty") && status.dirty(), finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      let finalMap = /* @__PURE__ */ new Map();
      for (let pair of pairs) {
        let key = pair.key, value = pair.value;
        if (key.status === "aborted" || value.status === "aborted")
          return INVALID;
        (key.status === "dirty" || value.status === "dirty") && status.dirty(), finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => new ZodMap({
  valueType,
  keyType,
  typeName: ZodFirstPartyTypeKind.ZodMap,
  ...processCreateParams(params)
});
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    let { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      }), INVALID;
    let def = this._def;
    def.minSize !== null && ctx.data.size < def.minSize.value && (addIssueToContext(ctx, {
      code: ZodIssueCode.too_small,
      minimum: def.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: def.minSize.message
    }), status.dirty()), def.maxSize !== null && ctx.data.size > def.maxSize.value && (addIssueToContext(ctx, {
      code: ZodIssueCode.too_big,
      maximum: def.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: def.maxSize.message
    }), status.dirty());
    let valueType = this._def.valueType;
    function finalizeSet(elements2) {
      let parsedSet = /* @__PURE__ */ new Set();
      for (let element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        element.status === "dirty" && status.dirty(), parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    let elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    return ctx.common.async ? Promise.all(elements).then((elements2) => finalizeSet(elements2)) : finalizeSet(elements);
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => new ZodSet({
  valueType,
  minSize: null,
  maxSize: null,
  typeName: ZodFirstPartyTypeKind.ZodSet,
  ...processCreateParams(params)
});
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments), this.validate = this.implement;
  }
  _parse(input) {
    let { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      }), INVALID;
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    let params = { errorMap: ctx.common.contextualErrorMap }, fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      let me = this;
      return OK(async function(...args) {
        let error = new ZodError([]), parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          throw error.addIssue(makeArgsIssue(args, e)), error;
        }), result = await Reflect.apply(fn, this, parsedArgs);
        return await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          throw error.addIssue(makeReturnsIssue(result, e)), error;
        });
      });
    } else {
      let me = this;
      return OK(function(...args) {
        let parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success)
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        let result = Reflect.apply(fn, this, parsedArgs.data), parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success)
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    return this.parse(func);
  }
  strictImplement(func) {
    return this.parse(func);
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args || ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
}, ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    let { ctx } = this._processInputParams(input);
    return this._def.getter()._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => new ZodLazy({
  getter,
  typeName: ZodFirstPartyTypeKind.ZodLazy,
  ...processCreateParams(params)
});
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      }), INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => new ZodLiteral({
  value,
  typeName: ZodFirstPartyTypeKind.ZodLiteral,
  ...processCreateParams(params)
});
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data != "string") {
      let ctx = this._getOrReturnCtx(input), expectedValues = this._def.values;
      return addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(input.data)) {
      let ctx = this._getOrReturnCtx(input), expectedValues = this._def.values;
      return addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      }), INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    let enumValues = {};
    for (let val of this._def.values)
      enumValues[val] = val;
    return enumValues;
  }
  get Values() {
    let enumValues = {};
    for (let val of this._def.values)
      enumValues[val] = val;
    return enumValues;
  }
  get Enum() {
    let enumValues = {};
    for (let val of this._def.values)
      enumValues[val] = val;
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    let nativeEnumValues = util.getValidEnumValues(this._def.values), ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      let expectedValues = util.objectValues(nativeEnumValues);
      return addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      }), INVALID;
    }
    if (this._cache || (this._cache = new Set(util.getValidEnumValues(this._def.values))), !this._cache.has(input.data)) {
      let expectedValues = util.objectValues(nativeEnumValues);
      return addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      }), INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => new ZodNativeEnum({
  values,
  typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
  ...processCreateParams(params)
});
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    let { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === !1)
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      }), INVALID;
    let promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => this._def.type.parseAsync(data, {
      path: ctx.path,
      errorMap: ctx.common.contextualErrorMap
    })));
  }
};
ZodPromise.create = (schema, params) => new ZodPromise({
  type: schema,
  typeName: ZodFirstPartyTypeKind.ZodPromise,
  ...processCreateParams(params)
});
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    let { status, ctx } = this._processInputParams(input), effect = this._def.effect || null, checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg), arg.fatal ? status.abort() : status.dirty();
      },
      get path() {
        return ctx.path;
      }
    };
    if (checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx), effect.type === "preprocess") {
      let processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async)
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          let result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          return result.status === "aborted" ? INVALID : result.status === "dirty" ? DIRTY(result.value) : status.value === "dirty" ? DIRTY(result.value) : result;
        });
      {
        if (status.value === "aborted")
          return INVALID;
        let result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        return result.status === "aborted" ? INVALID : result.status === "dirty" ? DIRTY(result.value) : status.value === "dirty" ? DIRTY(result.value) : result;
      }
    }
    if (effect.type === "refinement") {
      let executeRefinement = (acc) => {
        let result = effect.refinement(acc, checkCtx);
        if (ctx.common.async)
          return Promise.resolve(result);
        if (result instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return acc;
      };
      if (ctx.common.async === !1) {
        let inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        return inner.status === "aborted" ? INVALID : (inner.status === "dirty" && status.dirty(), executeRefinement(inner.value), { status: status.value, value: inner.value });
      } else
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => inner.status === "aborted" ? INVALID : (inner.status === "dirty" && status.dirty(), executeRefinement(inner.value).then(() => ({ status: status.value, value: inner.value }))));
    }
    if (effect.type === "transform")
      if (ctx.common.async === !1) {
        let base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        let result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: status.value, value: result };
      } else
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => isValid(base) ? Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
          status: status.value,
          value: result
        })) : INVALID);
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => new ZodEffects({
  schema,
  typeName: ZodFirstPartyTypeKind.ZodEffects,
  effect,
  ...processCreateParams(params)
});
ZodEffects.createWithPreprocess = (preprocess, schema, params) => new ZodEffects({
  schema,
  effect: { type: "preprocess", transform: preprocess },
  typeName: ZodFirstPartyTypeKind.ZodEffects,
  ...processCreateParams(params)
});
var ZodOptional = class extends ZodType {
  _parse(input) {
    return this._getType(input) === ZodParsedType.undefined ? OK(void 0) : this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => new ZodOptional({
  innerType: type,
  typeName: ZodFirstPartyTypeKind.ZodOptional,
  ...processCreateParams(params)
});
var ZodNullable = class extends ZodType {
  _parse(input) {
    return this._getType(input) === ZodParsedType.null ? OK(null) : this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => new ZodNullable({
  innerType: type,
  typeName: ZodFirstPartyTypeKind.ZodNullable,
  ...processCreateParams(params)
});
var ZodDefault = class extends ZodType {
  _parse(input) {
    let { ctx } = this._processInputParams(input), data = ctx.data;
    return ctx.parsedType === ZodParsedType.undefined && (data = this._def.defaultValue()), this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => new ZodDefault({
  innerType: type,
  typeName: ZodFirstPartyTypeKind.ZodDefault,
  defaultValue: typeof params.default == "function" ? params.default : () => params.default,
  ...processCreateParams(params)
});
var ZodCatch = class extends ZodType {
  _parse(input) {
    let { ctx } = this._processInputParams(input), newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    }, result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    return isAsync(result) ? result.then((result2) => ({
      status: "valid",
      value: result2.status === "valid" ? result2.value : this._def.catchValue({
        get error() {
          return new ZodError(newCtx.common.issues);
        },
        input: newCtx.data
      })
    })) : {
      status: "valid",
      value: result.status === "valid" ? result.value : this._def.catchValue({
        get error() {
          return new ZodError(newCtx.common.issues);
        },
        input: newCtx.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => new ZodCatch({
  innerType: type,
  typeName: ZodFirstPartyTypeKind.ZodCatch,
  catchValue: typeof params.catch == "function" ? params.catch : () => params.catch,
  ...processCreateParams(params)
});
var ZodNaN = class extends ZodType {
  _parse(input) {
    if (this._getType(input) !== ZodParsedType.nan) {
      let ctx = this._getOrReturnCtx(input);
      return addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      }), INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => new ZodNaN({
  typeName: ZodFirstPartyTypeKind.ZodNaN,
  ...processCreateParams(params)
});
var BRAND = Symbol("zod_brand"), ZodBranded = class extends ZodType {
  _parse(input) {
    let { ctx } = this._processInputParams(input), data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}, ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    let { status, ctx } = this._processInputParams(input);
    if (ctx.common.async)
      return (async () => {
        let inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        return inResult.status === "aborted" ? INVALID : inResult.status === "dirty" ? (status.dirty(), DIRTY(inResult.value)) : this._def.out._parseAsync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      })();
    {
      let inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      return inResult.status === "aborted" ? INVALID : inResult.status === "dirty" ? (status.dirty(), {
        status: "dirty",
        value: inResult.value
      }) : this._def.out._parseSync({
        data: inResult.value,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}, ZodReadonly = class extends ZodType {
  _parse(input) {
    let result = this._def.innerType._parse(input), freeze = (data) => (isValid(data) && (data.value = Object.freeze(data.value)), data);
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => new ZodReadonly({
  innerType: type,
  typeName: ZodFirstPartyTypeKind.ZodReadonly,
  ...processCreateParams(params)
});
function cleanParams(params, data) {
  let p = typeof params == "function" ? params(data) : typeof params == "string" ? { message: params } : params;
  return typeof p == "string" ? { message: p } : p;
}
function custom(check, _params = {}, fatal) {
  return check ? ZodAny.create().superRefine((data, ctx) => {
    let r = check(data);
    if (r instanceof Promise)
      return r.then((r2) => {
        if (!r2) {
          let params = cleanParams(_params, data), _fatal = params.fatal ?? fatal ?? !0;
          ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
        }
      });
    if (!r) {
      let params = cleanParams(_params, data), _fatal = params.fatal ?? fatal ?? !0;
      ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
    }
  }) : ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
}, ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2.ZodString = "ZodString", ZodFirstPartyTypeKind2.ZodNumber = "ZodNumber", ZodFirstPartyTypeKind2.ZodNaN = "ZodNaN", ZodFirstPartyTypeKind2.ZodBigInt = "ZodBigInt", ZodFirstPartyTypeKind2.ZodBoolean = "ZodBoolean", ZodFirstPartyTypeKind2.ZodDate = "ZodDate", ZodFirstPartyTypeKind2.ZodSymbol = "ZodSymbol", ZodFirstPartyTypeKind2.ZodUndefined = "ZodUndefined", ZodFirstPartyTypeKind2.ZodNull = "ZodNull", ZodFirstPartyTypeKind2.ZodAny = "ZodAny", ZodFirstPartyTypeKind2.ZodUnknown = "ZodUnknown", ZodFirstPartyTypeKind2.ZodNever = "ZodNever", ZodFirstPartyTypeKind2.ZodVoid = "ZodVoid", ZodFirstPartyTypeKind2.ZodArray = "ZodArray", ZodFirstPartyTypeKind2.ZodObject = "ZodObject", ZodFirstPartyTypeKind2.ZodUnion = "ZodUnion", ZodFirstPartyTypeKind2.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", ZodFirstPartyTypeKind2.ZodIntersection = "ZodIntersection", ZodFirstPartyTypeKind2.ZodTuple = "ZodTuple", ZodFirstPartyTypeKind2.ZodRecord = "ZodRecord", ZodFirstPartyTypeKind2.ZodMap = "ZodMap", ZodFirstPartyTypeKind2.ZodSet = "ZodSet", ZodFirstPartyTypeKind2.ZodFunction = "ZodFunction", ZodFirstPartyTypeKind2.ZodLazy = "ZodLazy", ZodFirstPartyTypeKind2.ZodLiteral = "ZodLiteral", ZodFirstPartyTypeKind2.ZodEnum = "ZodEnum", ZodFirstPartyTypeKind2.ZodEffects = "ZodEffects", ZodFirstPartyTypeKind2.ZodNativeEnum = "ZodNativeEnum", ZodFirstPartyTypeKind2.ZodOptional = "ZodOptional", ZodFirstPartyTypeKind2.ZodNullable = "ZodNullable", ZodFirstPartyTypeKind2.ZodDefault = "ZodDefault", ZodFirstPartyTypeKind2.ZodCatch = "ZodCatch", ZodFirstPartyTypeKind2.ZodPromise = "ZodPromise", ZodFirstPartyTypeKind2.ZodBranded = "ZodBranded", ZodFirstPartyTypeKind2.ZodPipeline = "ZodPipeline", ZodFirstPartyTypeKind2.ZodReadonly = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), stringType = ZodString.create, numberType = ZodNumber.create, nanType = ZodNaN.create, bigIntType = ZodBigInt.create, booleanType = ZodBoolean.create, dateType = ZodDate.create, symbolType = ZodSymbol.create, undefinedType = ZodUndefined.create, nullType = ZodNull.create, anyType = ZodAny.create, unknownType = ZodUnknown.create, neverType = ZodNever.create, voidType = ZodVoid.create, arrayType = ZodArray.create, objectType = ZodObject.create, strictObjectType = ZodObject.strictCreate, unionType = ZodUnion.create, discriminatedUnionType = ZodDiscriminatedUnion.create, intersectionType = ZodIntersection.create, tupleType = ZodTuple.create, recordType = ZodRecord.create, mapType = ZodMap.create, setType = ZodSet.create, functionType = ZodFunction.create, lazyType = ZodLazy.create, literalType = ZodLiteral.create, enumType = ZodEnum.create, nativeEnumType = ZodNativeEnum.create, promiseType = ZodPromise.create, effectsType = ZodEffects.create, optionalType = ZodOptional.create, nullableType = ZodNullable.create, preprocessType = ZodEffects.createWithPreprocess, pipelineType = ZodPipeline.create, ostring = () => stringType().optional(), onumber = () => numberType().optional(), oboolean = () => booleanType().optional(), coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: !0 }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: !0 }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: !0
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: !0 }),
  date: (arg) => ZodDate.create({ ...arg, coerce: !0 })
};
var NEVER = INVALID;

// vendor/server/plasma-score.ts
var SCORE_AUDIO_TOLERANCE_SECONDS = 3, PHASE_KINDS = ["arrival", "steady", "fire", "peak", "holds", "integration", "closing"], WORLDS = ["ember", "dawn", "water", "night", "moss"], t = external_exports.number().finite(), phase = external_exports.tuple([t, t, external_exports.string().min(1).max(60), external_exports.enum(PHASE_KINDS)]), caption = external_exports.tuple([t, t, external_exports.string().min(1).max(200), external_exports.array(t).min(1)]), warpPoint = external_exports.tuple([t, t]), bridge = external_exports.tuple([t, t, external_exports.union([external_exports.number(), external_exports.null(), external_exports.literal("lead")]), external_exports.number()]).rest(external_exports.literal("s")), shape = external_exports.object({
  warp: external_exports.array(warpPoint).min(2).optional(),
  lead: external_exports.object({ t0: t, t1: t, s: t }).strict().optional(),
  bridge: external_exports.array(bridge).optional(),
  box: external_exports.object({ t0: t, P: external_exports.number().positive(), n: external_exports.number().int().positive(), lo: external_exports.number(), hi: external_exports.number(), a: external_exports.number() }).strict().optional(),
  natural: external_exports.array(external_exports.object({ from: t, to: t, fade: external_exports.number().nonnegative(), t0: t, seed: external_exports.number(), base: external_exports.number(), depth: external_exports.number(), P: external_exports.number().positive() }).strict()).optional(),
  fire: external_exports.object({
    t0: t,
    P: external_exports.number().positive(),
    n0: external_exports.number().int(),
    n1: external_exports.number().int(),
    hi: external_exports.number(),
    lo: external_exports.number(),
    snap: external_exports.number().positive(),
    from: t,
    to: t,
    fadeIn: external_exports.number().nonnegative(),
    fadeOut: external_exports.number().nonnegative()
  }).strict().optional()
}).strict(), plasmaScoreSchema = external_exports.object({
  /** The format's version. Only 1 exists. */
  v: external_exports.literal(1),
  slug: external_exports.string().min(1).max(80).optional(),
  title: external_exports.string().min(1).max(120).optional(),
  kicker: external_exports.string().max(60).optional(),
  /** Seconds; the score's length. Must match the audio within 3 s when it is written. */
  dur: external_exports.number().positive().max(7200),
  /** Samples per second of `breath` (30). */
  fps: external_exports.number().int().min(1).max(120),
  phases: external_exports.array(phase).min(1),
  /** Seconds at which a section begins (a light kick marks them); ascending. */
  cues: external_exports.array(t),
  look: external_exports.object({ world: external_exports.enum(WORLDS), journey: external_exports.array(external_exports.tuple([t, external_exports.enum(WORLDS)])).min(1) }).strict().optional(),
  shape: shape.optional(),
  /** The soundtrack's loudness per sample (not read by the visual today). */
  music: external_exports.object({ fps: external_exports.number().int().positive(), v: external_exports.array(external_exports.number()) }).strict().optional(),
  caps: external_exports.array(caption),
  /** The breath curve, 0 (empty) to 1 (full): floor(dur * fps) + 1 samples. */
  breath: external_exports.array(external_exports.number().min(0).max(1)).min(2),
  ramps: external_exports.object({ steady: external_exports.tuple([t, t]), peak: external_exports.tuple([t, t]) }).strict().optional(),
  startAt: external_exports.number().nonnegative().optional(),
  /** Seconds from which the session counts as late (shifts the light's late-session colour); default: the middle of "Hold and release". */
  late: external_exports.number().nonnegative().optional()
}).strict(), near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;
function checkPlasmaScore(s) {
  let errors = [], warnings = [], want = Math.floor(s.dur * s.fps) + 1;
  s.breath.length !== want && errors.push(`breath has ${s.breath.length} samples; dur ${s.dur} s at ${s.fps} per second needs ${want}`);
  let prev = 0;
  s.phases.forEach(([a, b, label, kind], i) => {
    b > a || errors.push(`phases[${i}] (${label}) ends at ${b}, not after its start ${a}`), i === 0 && !near(a, 0) && errors.push(`phases[0] starts at ${a}, not at 0`), i > 0 && !near(a, prev) && errors.push(`phases[${i}] (${label}) starts at ${a}, but the previous section ends at ${prev}${a > prev ? " (a gap)" : " (an overlap)"}`), prev = b;
  }), near(prev, s.dur, 0.6) || errors.push(`the last section ends at ${prev}, but dur is ${s.dur}`);
  let kinds = s.phases.map((p) => p[3]);
  new Set(kinds).size !== kinds.length && warnings.push("a section kind appears twice; the light's arc treats each kind as one stretch"), kinds.includes("arrival") || warnings.push("no 'arrival' section: the session opens without the arrival's dim, low light"), s.cues.forEach((c, i) => {
    (c < 0 || c > s.dur) && errors.push(`cues[${i}] = ${c} is outside 0..${s.dur}`), i > 0 && c <= s.cues[i - 1] && errors.push(`cues[${i}] = ${c} does not come after cues[${i - 1}] = ${s.cues[i - 1]}`);
  });
  let covered = 0, longest = 0, lastEnd = 0;
  s.caps.forEach(([a, b, text, words], i) => {
    b > a || errors.push(`caps[${i}] ends at ${b}, not after its start ${a}`), (a < 0 || b > s.dur + 0.5) && errors.push(`caps[${i}] "${text.slice(0, 24)}" (${a}-${b}) is outside the session`), i > 0 && a < s.caps[i - 1][0] && errors.push(`caps[${i}] starts at ${a}, before caps[${i - 1}] (${s.caps[i - 1][0]})`);
    let n = text.split(" ").length;
    words.length !== n && errors.push(`caps[${i}] "${text.slice(0, 24)}" has ${n} words but ${words.length} word times`);
    for (let k = 1; k < words.length; k++)
      if (words[k] < words[k - 1]) {
        errors.push(`caps[${i}] word times run backwards at word ${k + 1}`);
        break;
      }
    (words[0] < a - 0.01 || words[words.length - 1] > b + 0.05) && errors.push(`caps[${i}] word times (${words[0]}-${words[words.length - 1]}) fall outside its ${a}-${b}`), i > 0 && a < s.caps[i - 1][1] - 0.5 && warnings.push(`caps[${i}] begins ${(s.caps[i - 1][1] - a).toFixed(2)} s before caps[${i - 1}] ends (two captions at once)`), covered += Math.max(0, b - Math.max(a, lastEnd)), longest = Math.max(longest, a - lastEnd), lastEnd = Math.max(lastEnd, b);
  }), longest = Math.max(longest, s.dur - lastEnd), s.caps.length === 0 && warnings.push("no captions");
  let sh = s.shape;
  sh?.warp && sh.warp.forEach(([a], i) => {
    i > 0 && a <= sh.warp[i - 1][0] && errors.push(`shape.warp[${i}] does not increase (${a} after ${sh.warp[i - 1][0]})`);
  }), sh?.lead && !(sh.lead.t1 > sh.lead.t0) && errors.push("shape.lead ends before it starts"), sh?.fire && (sh.fire.to > sh.fire.from || errors.push("shape.fire ends before it starts"), sh.fire.n1 < sh.fire.n0 && errors.push("shape.fire has n1 below n0"), sh.fire.hi <= sh.fire.lo && warnings.push("shape.fire: hi is not above lo")), sh?.bridge?.forEach((g, i) => {
    g[1] > g[0] || errors.push(`shape.bridge[${i}] ends before it starts`);
  }), sh?.natural?.forEach((n, i) => {
    n.to > n.from || errors.push(`shape.natural[${i}] ends before it starts`);
  }), s.look && s.look.journey.forEach(([a], i) => {
    i > 0 && a <= s.look.journey[i - 1][0] && errors.push(`look.journey[${i}] does not increase`);
  }), s.music && s.music.v.length < Math.floor(s.dur * s.music.fps) && warnings.push("music is shorter than the session");
  let lo = Math.min(...s.breath), hi = Math.max(...s.breath);
  return hi - lo < 0.3 && warnings.push(`the breath curve only moves between ${lo.toFixed(2)} and ${hi.toFixed(2)}`), {
    errors,
    warnings,
    facts: {
      durationSeconds: s.dur,
      sections: s.phases.length,
      captions: s.caps.length,
      captionCoveragePercent: Math.round(100 * covered / s.dur),
      longestCaptionGapSeconds: Math.round(longest * 10) / 10,
      breathSamples: s.breath.length,
      breathMin: Math.round(lo * 100) / 100,
      breathMax: Math.round(hi * 100) / 100
    }
  };
}
function validatePlasmaScore(input) {
  let parsed = plasmaScoreSchema.safeParse(input);
  if (!parsed.success)
    return { ok: !1, errors: parsed.error.issues.slice(0, 25).map((i) => `${i.path.join(".") || "(score)"}: ${i.message}`) };
  let check = checkPlasmaScore(parsed.data);
  return check.errors.length ? { ok: !1, errors: check.errors } : { ok: !0, score: parsed.data, check };
}

// parts/silk-frag.js
var SILK_FRAG = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform vec2 uRes, uC;
uniform float uPG, uFlow, uFlowMix, uDir, uHT, uHB, uHTm, uEnd, uCrest, uRingCue, uFW, uShim, uAxis;
uniform float uNvM, uRot, uAnt, uWave, uWaveA, uCoup, uBgReach, uBgE, uBgB, uBgK, uBgHT, uBgHB;
uniform float uEdgeX, uEdgeY, uAmb, uAT, uHF, uSpark;
uniform float uHaze, uHzS, uVeil;
uniform vec2 uBdA, uBdB, uBdC;
uniform float uBehind, uH, uNumY, uLineT, uLineB, uPT;
uniform float uR, uB, uI, uClk, uK, uJ, uLead, uAfter, uRetract, uSoft, uPres, uRing, uCharge, uGather, uCapY, uNvis;
uniform vec3 uF;
uniform float uCalm, uForce, uCap, uKnee, uNA, uFat, uBloom, uHalo, uVar, uDisc, uTipR, uArmA, uSkew, uCalmCurl, uLen;

const float TAU = 6.2831853;
const float PI = 3.1415927;

vec3 midAt(float j) {
  j = clamp(j, 0., 1.);
  vec3 c0 = vec3(.50, .15, .42); vec3 c1 = vec3(.62, .18, .38); vec3 c2 = vec3(.74, .22, .24); vec3 c3 = vec3(.90, .36, .16); vec3 c4 = vec3(1., .60, .24);
  if (j < .25) return mix(c0, c1, j / .25);
  if (j < .5) return mix(c1, c2, (j - .25) / .25);
  if (j < .7) return mix(c2, c3, (j - .5) / .2);
  return mix(c3, c4, (j - .7) / .3);
}
float h1(float n) { return fract(sin(n * 127.1 + 1.7) * 43758.5453); }
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float wrapA(float a) { return a - TAU * floor((a + PI) / TAU); }

void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (fc - uC) / uR; float r = length(p);
  // the warmth runs ahead at the heart and lags at the tips: amber core, berry arms
  float jl = clamp(uJ + uLead * (.25 - .33 * r) * smoothstep(0., .3, uJ), 0., 1.);
  vec3 mid = midAt(jl); vec3 deep = mid * vec3(.40, .30, .34); vec3 pale = mix(mid, vec3(1., .90, .80), .55);
  float I = uI; float b = uB; float sf = uSoft;
  float peak = smoothstep(.8, 1., I);
  float bright = (.16 + .84 * I) * (.60 + .55 * b) * (1. - .04 * peak) * (1. + uPG * uK) * (1. + .4 * uCharge) * (1. - .35 * uRetract) * uShim;
  float reach = clamp(mix(.32, 1., I) * (.72 + .42 * b) * 1.25 * uPres * (1. + .16 * uK) * (1. - .5 * uRetract) * (1. - .24 * uAnt) * (1. + .7 * max(uEdgeX, uEdgeY) * max(max(smoothstep(.55, 1.05, I), uHT * .7), uCharge)) + .3 * uAfter * uPres, .08, 1.75 + .6 * max(uEdgeX, uEdgeY));
  float pkC = max(max(max(smoothstep(.55, 1.05, I), uHT * .7), uCharge), uForce); float pkW = max(pkC, .75 * smoothstep(.1, .7, I));
  float ckS = mix(uClk, uFlow * 2.4 + uClk * .25, uFlowMix); float wm = 1. - uAxis * .26 * max(-uDir, 0.); float crest = 1. + .75 * max(uCrest, 0.) - .22 * max(-uCrest, 0.);
  vec2 q = p;
  float rq = length(q); float ph = atan(q.y, q.x);
  float nvis = min(7., (uNvis >= 0. ? uNvis : mix(2., 7., smoothstep(.0, .9, I))) * uNvM);
  nvis = mix(nvis, min(nvis, mix(2., uNA, smoothstep(.0, .9, max(I, uForce * .5)))), uCalm);
  float fa = atan(uF.y, uF.x); float fl = length(uF.xy);
  vec3 col = vec3(0.);
  for (int i = 0; i < 7; i++) {
    float fi = float(i); float vis = clamp(nvis - fi, 0., 1.);
    if (vis <= 0.) break;
    float s = mix(uClk, uFlow * 3. + uClk * .25, uFlowMix) * (.55 + .35 * h1(fi + 11.));
    float th0 = fi * 2.3999 + uRot + .45 * sin(uClk * (.20 + .08 * h1(fi)) + fi * 1.7);
    float upA = -1.5707963; th0 = upA + wrapA(th0 - upA) * (1. - uAxis * (.30 * max(uDir, 0.) - .24 * max(-uDir, 0.) + .14 * uHT));
    float Li = reach * (.72 + .34 * h1(fi + 7.)); float pulled = 0.;
    if (uCalm > 0.) { Li *= mix(1., uLen, uCalm * pkC); Li *= mix(1., .30 + .70 * h1(fi + 3.), uVar * pkC); float Lc = Li < uKnee ? Li : uKnee + (uCap - uKnee) * (1. - exp(-(Li - uKnee) / max(uCap - uKnee, .01))); Li = mix(Li, Lc, uCalm); th0 = mix(th0, -.7 + wrapA(th0 + .7) * (1. - uSkew), uCalm * pkC); th0 += uCalm * pkC * uVar * (h1(fi + 21.) - .5) * .5; }
    if (uF.z > 0.) { float dA = wrapA(fa - th0); float pull = clamp(uF.z, 0., 1.) * mix(exp(-dA * dA * 2.2), .9, uGather);
      th0 += dA * pull; Li = mix(Li, max(Li, fl + .02), pull); pulled = pull; }
    float bendK = .7 * (.35 + .9 * h1(fi + 13.)) * (h1(fi + 17.) > .45 ? 1. : -1.) * (1. - .9 * pulled) * mix(1., uCalmCurl, uCalm * pkC);
    float bend = .55 * sin(rq * 2.3 + s + fi * 2.3) + .22 * sin(rq * 3.7 - s * .7 + fi);
    float bend2 = .55 * sin((rq + .01) * 2.3 + s + fi * 2.3) + .22 * sin((rq + .01) * 3.7 - s * .7 + fi);
    th0 += uHT * .024 * sin(uHTm * 14. + fi * 2.1 + rq * 9.) * rq;
    float th = th0 + bend * min(rq, 1.2) * bendK; float dth = ((bend2 - bend) * rq + bend2 * .01) * bendK / .01;
    float sd = rq * wrapA(ph - th) / sqrt(1. + rq * rq * dth * dth); float dist = abs(sd);
    float u = rq / max(Li, .05);
    float along = mix(smoothstep(1., .4, u), smoothstep(1.04, .9, u), pulled) * vis * (1. + .14 * uHT * sin(uHTm * 9. + fi * 3.) * smoothstep(.45, 1., u));
    along *= mix(smoothstep(uCapY, uCapY - .7, p.y), mix(.8, 1., smoothstep(uCapY + .35, uCapY - 1.3, p.y)), uBehind * (1. - .75 * uHT));   // the strands fade out before the words
    along *= mix(1., uArmA, uCalm * pkC);
    if (along <= 0.) continue;
    vec3 c = mix(mid, midAt(jl - .18 * uLead) * .9, smoothstep(.35, 1., u));
    // silk: twisting soft-edged bands with a light-catching fold
    float tw = cos(rq * 2.6 - s * 1.2 + fi * 1.9);
    float w = (.052 + .17 * min(rq, 1.3)) * (.34 + .66 * abs(tw)) * sf * wm * (1. + uCalm * uFat * pkW) * mix(1., sqrt(clamp(1. - .85 * u * u * u, 0., 1.)), uCalm * uTipR); w += uCalm * uFat * .035 * pkW;
    float band = smoothstep(1., -.1, dist / w); band *= band * (3. - 2. * band) * .6 + band * .4;
    float fz = (sd - .5 * w * clamp(tw * 3., -1., 1.)) / (.30 * w + .004 * sf);
    float fold = exp(-(fz * fz));
    float edge = 1. - abs(tw);
    col += (c * band * (.34 + .34 * edge) + mix(c, pale, .4) * fold * .24 + c * .12 * exp(-dist / (w * 2.8))) * along * .8;
  }
  col *= bright * (1. - .45 * uAfter);
  if (uCalm > 0.) { float bl = uCalm * pkC; float angB = atan(p.y, p.x); float wb = 1. + .04 * sin(3. * angB + uRot * 1.5 + uClk * .18) + .025 * sin(5. * angB - uRot);
    col += mix(mid, pale, .35) * exp(-r * r / (.42 + .55 * pkC)) * uBloom * bl * (.7 + .3 * b) * .30;
    col += mix(mid, pale, .5) * exp(-pow((r / wb - (.50 + .14 * pkC + .03 * sin(uClk * .6))) / .27, 2.)) * uHalo * bl * .20 * (.75 + .25 * sin(2. * angB + uClk * .35));
    col += mix(mid, pale, .25) * exp(-pow(r / (.40 + .50 * pkC * uDisc), 2.)) * uDisc * bl * .26; }
  // integration: a rose-amber afterglow
  col += mix(midAt(.8), vec3(.92, .40, .44), .4) * .22 * uAfter * exp(-r * r / (.45 * uPres * uPres));
  // the heart: tinted by the hue (never white), it swells with the inhale; in a hold the light draws back into it
  float cs = (.010 + .016 * b) * sf * (1. + 1.5 * uRetract) * (1. + .8 * max(uCrest, 0.));
  col += pale * exp(-r * r / (cs * (1. + 1.5 * uPG * uK))) * (.15 + .45 * I) * (.55 + .5 * b) * (1. + 1.8 * uPG * uK) * crest;
  col += mid * exp(-r / (.24 * sf * uPres * (1. + .6 * uRetract))) * .20 * bright * crest;
  // a soft field around it, fading into the ground
  col += deep * (.22 + .12 * uHB) * (.3 + .7 * I + .5 * uHB) * exp(-r * r / (.9 * uPres * uPres * (1. + .6 * uHB) * (1. + .02 * uHB * sin(6.2831853 * uHTm / 14.))));
  // the last 3 s of a hold: a faint ring of light closes in
  float ang = atan(p.y, p.x); float wobT = uRot * 1.5 + uHTm * .35;
  float wob = 1. + .07 * sin(3. * ang + wobT + 1.) + .045 * sin(5. * ang - wobT * .8) + .03 * sin(2. * ang + .7 + wobT * .5);
  float thick = .72 + .28 * sin(4. * ang + wobT * .9 + 2.);
  float ep = smoothstep(0., 1., uEnd);
  float e1 = (r / wob - (.98 - .12 * ep)) / .20;
  col += mix(mid, pale, .45) * exp(-(e1 * e1)) * thick * ep * .13 * (1. - .5 * uHB);
  // option B: the breath ring
  if (uRingCue > 0.) {
    float rB = mix(mix(1.12, .16, clamp(b, 0., 1.)), .22 + .55 * (1. - uK), uFW);
    float aR = (.16 + .30 * abs(uDir)) * (1. - .5 * uHB) + .16 * uHT + .25 * uFW * (.3 + uK);
    vec3 rc = mix(midAt(clamp(jl + .08, 0., 1.)) * 1.1, pale, clamp(.5 + .5 * uDir, 0., 1.));
    float e2 = (r - rB) / (.018 + .012 * rB);
    col += rc * aR * exp(-(e2 * e2)) * (.5 + .5 * I);
  }
  // keep the caption band clear: the soft reach toward the edges, sideways and up and down, at the peaks
  {
    float pk = max(max(smoothstep(.55, 1.05, I), uHT * .7), uCharge);
    float rx = (120. + 110. * uEdgeX) / uR; float ru = (140. + 150. * uEdgeY) / uR; float rd = (140. + 280. * uEdgeY) / uR;
    float ee = length(vec2(p.x / rx, p.y < 0. ? p.y / ru : p.y / rd));
    col += mix(mid, pale, .25) * .15 * pk * (.5 * uEdgeX + .5 * uEdgeY) * (.6 + .4 * b) * (1. - smoothstep(.15, 1.0, ee));
  }
  // ambient life: three very soft veils drifting on different slow periods, and a faint glow that breathes with the light
  {
    vec2 sc = fc / uRes; float asp = uRes.y / uRes.x;
    vec3 aC = mix(midAt(clamp(jl - .12 * uHB * 4., 0., 1.)), midAt(clamp(jl * (1. - .8 * uHB), 0., 1.)), uHB) * vec3(.62, .5, .62);
    float open = 1. + .55 * uHB + .06 * uHB * sin(6.2831853 * uHTm / 14.) - .30 * uHT; float gain = (1. + .35 * uHT) * (1. + .5 * uHB);
    vec2 c1 = vec2(.5 + .30 * sin(6.2831853 * uAT / 23.), .50 + .16 * sin(6.2831853 * uAT / 37. + 1.)); vec2 d1 = (sc - c1) * vec2(1., asp); float a1 = exp(-dot(d1, d1) / (.30 * .30 * open * open));
    vec2 c2 = vec2(.5 + .34 * sin(6.2831853 * uAT / 31. + 2.), .38 + .20 * sin(6.2831853 * uAT / 27. + 4.)); vec2 d2 = (sc - c2) * vec2(1., asp); float a2 = exp(-dot(d2, d2) / (.36 * .36 * open * open));
    vec2 c3 = vec2(.5 + .28 * sin(6.2831853 * uAT / 41. + 3.), .62 + .18 * sin(6.2831853 * uAT / 29. + .5)); vec2 d3 = (sc - c3) * vec2(1., asp); float a3 = exp(-dot(d3, d3) / (.26 * .26 * open * open));
    float br = exp(-r * r / (2.6 * open)) * (.65 + .5 * b);
    col += aC * uAmb * gain * 1.8 * (.050 * a1 + .042 * a2 + .036 * a3 + .060 * br);
  }
  // the alive background: slow luminous fog that billows on the ambient clock, tinted by two tones of the palette that drift into each other, strong in the open zones
  // (around the light, beside the text) and very low in the text bands; it swells and brightens with the breath; a lit relief on the fog's sides that face the light.
  if (uHaze > 0.) {
    vec2 sc = fc / uRes; float asp = uRes.y / uRes.x; vec2 hp = vec2(sc.x, sc.y * asp) * 1.2; float tz = uAT * .07;
    float n1 = vnoise(hp + vec2(tz, -tz * .7)), n2 = vnoise(hp * 2.1 + vec2(-tz * 1.3, tz * .9) + 7.3);
    float fld = .75 * n1 + .25 * n2; float hz = mix(smoothstep(.25, .8, fld), clamp(.6 + .9 * (fld - .5), 0., 1.), uHzS);   // the Start (uHzS): a soft, even fog instead of clouds
    vec2 tl = normalize(vec2(.5 - sc.x, (uC.y / uRes.y - sc.y) * asp) + .0001);
    float fl = .75 * vnoise(hp + tl * .16 + vec2(tz, -tz * .7)) + .25 * vnoise(hp * 2.1 + tl * .16 + vec2(-tz * 1.3, tz * .9) + 7.3);
    float lit = clamp((fld - fl) * 7., 0., 1.) * exp(-r * r / 14.);
    float drift = .5 + .5 * sin(uAT * .06 + n1 * 3.);
    vec3 tA = midAt(clamp(jl - .22, 0., 1.)) * vec3(.70, .50, .56), tB = midAt(clamp(jl + .2, 0., 1.)) * vec3(.85, .60, .55);
    vec3 tint = mix(tA, tB, drift);
    float yy = sc.y, side = smoothstep(.36, .5, abs(sc.x - .5)) * .6;
    float bA = (uBdA.x >= 0.) ? smoothstep(uBdA.x - .14, uBdA.x + .03, yy) * (1. - smoothstep(uBdA.y - .03, uBdA.y + .14, yy)) : 0.;
    float bB = (uBdB.x >= 0.) ? smoothstep(uBdB.x - .14, uBdB.x + .03, yy) * (1. - smoothstep(uBdB.y - .03, uBdB.y + .14, yy)) : 0.;
    float bC = (uBdC.x >= 0.) ? smoothstep(uBdC.x - .14, uBdC.x + .03, yy) * (1. - smoothstep(uBdC.y - .03, uBdC.y + .14, yy)) : 0.;
    float inBand = max(max(bA, bB), bC) * (1. - side);
    float zone = mix(1., .18, inBand);   // the text bands keep an eighth of it (the bands' edges are feathered over ~9 % of the height)
    float swell = .78 + .44 * uBgB;      // the ground swells and brightens with the inhale
    col += (tint * (hz + 1.4 * lit) * uHaze * (.6 + .9 * exp(-r * r / (6. + 6. * uBgB))) * (.6 + .4 * uBgE) + mix(midAt(clamp(jl, 0., 1.)) * vec3(.5, .3, .3), tint, .5) * .045 * (uBgB - .5)) * swell * zone;
    col *= 1. + .14 * (uBgB - .5) * zone;   // the whole ground brightens about 7 % on the inhale and eases the same on the exhale
    col *= 1. - .08 * inBand;               // and the light itself sits a little back behind the text bands (their contrast margin)
  }
  // the release wave
  if (uWaveA > .002) { float dw = r - uWave; float prof = dw > 0. ? exp(-dw * dw / 2.6) : exp(dw * .42);
    col += mix(midAt(clamp(jl + .22, 0., 1.)), pale, .3) * prof * uWaveA * .17 * (1. - smoothstep(3.6, 5.8, r)); }
  // warm sparks rising (only at the charged end)
  if (uSpark > .01) { for (int i = 0; i < 14; i++) { float fi = float(i); float phs = fract(h1(fi + 40.) + uAT * (.10 + .07 * h1(fi + 51.))); vec2 sp = vec2((h1(fi + 60.) - .5) * 2.6 + .12 * sin(uAT * .9 + fi), .9 - phs * 2.4); float lf = sin(3.1416 * phs); float dd = length(p - sp);
      col += mix(vec3(1., .62, .22), pale, .3) * exp(-dd * dd / .0011) * lf * lf * uSpark * .6; } }
  // the background layer: a full-screen soft field driven by the main light (lagged)
  if (uCoup > 0.) { float rbg = (1.3 + 2.4 * uBgReach) * (1.22 - .34 * uBgB) * (1. - .30 * uBgHT + .85 * uBgHB); float gq = length(vec2(p.x / (rbg * .95), p.y / (rbg * 1.55))); float fld = exp(-gq * gq * 1.1);
    float amp = uCoup * mix(.38 + .45 * uBehind * (1. - .75 * uHT), 1., smoothstep(uCapY + .9, uCapY - 1.8, p.y)) * (.06 + .20 * uBgE) * (1. + .45 * uBgK) * (1. + .55 * smoothstep(.8, 1.05, uBgE)) * (1. + .55 * uBgHT) * (1. - .5 * uBgHB);
    col += mix(midAt(clamp(jl + .3 * smoothstep(.65, 1.05, uBgE), 0., 1.)) * vec3(.9, .72, .72), pale, .14 + .16 * uBgE) * fld * amp;
    // a banked warm ember around the small light in the lows
    float emb = (1. - smoothstep(.15, .6, uBgE)) * uCoup; col += midAt(clamp(jl + .28, 0., 1.)) * vec3(1., .72, .5) * exp(-r * r / (1.7 + .5 * uBgHB)) * emb * .13; }
  // the top hold's thin ring, closing slowly over the whole hold
  float e3 = (r / wob - (1.14 - .24 * uHF)) / .19;
  col += mix(mid, pale, .5) * exp(-(e3 * e3)) * thick * uHT * .17;
  // light behind the words: a darker pocket under the hold numeral and a soft dim band behind the breath line
  { float yzn = fc.y / uRes.y * uH, xzn = (fc.x / uRes.x - .5) * 393.; col *= 1. - .38 * uBehind * max(uHT, uHB) * exp(-((yzn - uNumY) / 40.) * ((yzn - uNumY) / 40.)) * exp(-(xzn / 95.) * (xzn / 95.)); }
  { float yz = fc.y / uRes.y * uH; col *= 1. - (.14 + .06 * uHT) * uBehind * smoothstep(uLineT - 30., uLineB, yz) * (1. - smoothstep(uPT - 10., uPT + 70., yz)); }
  // the alive background: a feathered veil under the breath line, its instruction label and the caption, deepening with the light's brightness: a gaussian in y over about 40 % of
  // the height and a fade toward the sides, never a box (max 45 %)
  if (uHaze > 0. && uVeil > 0.) { float yz = fc.y / uRes.y * uH; float yc = .5 * (uLineT + uPT); float gy = exp(-((yz - yc) / (.17 * uH)) * ((yz - yc) / (.17 * uH))); float gx = 1. - smoothstep(.18, .62, abs(fc.x / uRes.x - .5)); float lc = dot(col, vec3(.30, .59, .11)); col *= 1. - .45 * min(1., uBehind / .6) * gy * gx * smoothstep(.1, .6, lc); }
  col = 1. - exp(-col * 1.35);
  float ringPx = abs(r - 1.) * uR;
  col += vec3(.965, .93, .89) * uRing * exp(-ringPx * ringPx / .55);
  vec3 ground = vec3(.055, .035, .027);
  col = ground + col * (1. - ground);
  // dither: two hashes of the pixel, as the prototype (the second on the GL, bottom-left origin)
  col += (hash(fc + fract(uClk * 7.)) - .5) / 255.;
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) * (1.6 / 255.);
  outColor = vec4(col, 1.);
}
`;

// parts/silk-uniforms.js
var SILK_UNIFORMS = { uRes: "vec2", uC: "vec2", uPG: "float", uFlow: "float", uFlowMix: "float", uDir: "float", uHT: "float", uHB: "float", uHTm: "float", uEnd: "float", uCrest: "float", uRingCue: "float", uFW: "float", uShim: "float", uAxis: "float", uNvM: "float", uRot: "float", uAnt: "float", uWave: "float", uWaveA: "float", uCoup: "float", uBgReach: "float", uBgE: "float", uBgB: "float", uBgK: "float", uBgHT: "float", uBgHB: "float", uEdgeX: "float", uEdgeY: "float", uAmb: "float", uAT: "float", uHF: "float", uSpark: "float", uHaze: "float", uHzS: "float", uVeil: "float", uBdA: "vec2", uBdB: "vec2", uBdC: "vec2", uBehind: "float", uH: "float", uNumY: "float", uLineT: "float", uLineB: "float", uPT: "float", uR: "float", uB: "float", uI: "float", uClk: "float", uK: "float", uJ: "float", uLead: "float", uAfter: "float", uRetract: "float", uSoft: "float", uPres: "float", uRing: "float", uCharge: "float", uGather: "float", uCapY: "float", uNvis: "float", uF: "vec3", uCalm: "float", uForce: "float", uCap: "float", uKnee: "float", uNA: "float", uFat: "float", uBloom: "float", uHalo: "float", uVar: "float", uDisc: "float", uTipR: "float", uArmA: "float", uSkew: "float", uCalmCurl: "float", uLen: "float" };

// parts/draw2d.js
var clamp01 = (x) => Math.max(0, Math.min(1, x)), c8 = (v) => Math.round(Math.min(1, v) * 255), rgba = (c, a) => `rgba(${c8(c[0])},${c8(c[1])},${c8(c[2])},${Math.round(clamp01(a) * 1e3) / 1e3})`, FONT = '"Nunito Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
function advanceFuture(st, tv, inFire, dt, snap) {
  let target = inFire ? 3.6 : 6.5;
  snap ? st.fut = target : st.fut += (target - st.fut) * (1 - Math.exp(-dt * 3.6));
}
function setSpacing(ctx, px) {
  try {
    return ctx.letterSpacing = px + "px", !0;
  } catch {
    return !1;
  }
}
function spacedText(ctx, text, x, y, ls) {
  if (setSpacing(ctx, ls) && "letterSpacing" in ctx) {
    ctx.fillText(text, x, y), setSpacing(ctx, 0);
    return;
  }
  let px = x;
  for (let ch of text)
    ctx.fillText(ch, px, y), px += ctx.measureText(ch).width + ls;
}
function spacedWidth(ctx, text, ls) {
  let w = 0;
  for (let ch of text)
    w += ctx.measureText(ch).width + ls;
  return w;
}
function drawThread(ctx, eng, sg, S, liveM, geo, st, breathLabel = 0, aliveInk = !1) {
  if (S.line === "off")
    return;
  let SCR = eng.SCR, PRE = eng.PRE, W = geo.line && geo.line.W || 393, Hh = 150, tv = sg.tv, pal = palette(sg.warmth), CORE = pal.core, MID = pal.mid, EDGE = pal.edge, bottom = geo.line.bottom - geo.line.oy, top = geo.line.top - geo.line.oy + 26, A = bottom - top, x0 = W / 2, y = (b) => bottom - clamp01(b) * A, fut = st.fut, past = fut * 0.4, k = 0.55, g1 = (u) => (1 - Math.exp(-k * u)) / (1 - Math.exp(-k)), rev = Math.min(1, tv / 2.5, (SCR.DUR - tv) / 3), X = (dd) => dd < 0 ? x0 + dd / past * x0 : x0 + g1(Math.min(1, dd / fut)) * (W - x0), pts = [], n = Math.ceil(W * 2 / 1.5), futEnd = fut * rev;
  for (let i = 0; i <= n; i++) {
    let u = i / n, dd = -past + u * (past + fut);
    if (dd > futEnd)
      break;
    pts.push([X(dd), y(SCR.breathAt(Math.max(0, tv + dd))), dd]);
  }
  if (pts.length < 2)
    return;
  let pastP = pts.filter((q) => q[2] <= 0), futP = pts.filter((q) => q[2] >= 0), path = (P) => {
    ctx.beginPath(), P.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
  }, xEnd = X(futEnd), crest = sg.crestRaw, bh = S.behind || 0;
  if (ctx.save(), ctx.beginPath(), ctx.rect(0, 0, W, Hh), ctx.clip(), ctx.globalAlpha = Math.round(clamp01(liveM.line) * 100) / 100, ctx.lineJoin = ctx.lineCap = "round", bh > 0)
    for (let [lw, al] of [[20, 0.05], [12, 0.08], [7, 0.1]])
      ctx.lineWidth = lw, ctx.strokeStyle = rgba([8 / 255, 3 / 255, 2 / 255], al * bh * 1.6), path(pts), ctx.stroke();
  if (pastP.length > 1) {
    path(pastP);
    let gp = ctx.createLinearGradient(0, 0, x0, 0);
    gp.addColorStop(0, rgba(MID, 0)), gp.addColorStop(1, rgba(MID, 0.34)), ctx.strokeStyle = gp, ctx.lineWidth = 2.2, ctx.stroke();
  }
  if (futP.length > 1) {
    let gx1 = Math.max(x0 + 1, xEnd), g = ctx.createLinearGradient(x0, 0, gx1, 0);
    g.addColorStop(0, rgba(CORE, 0.95)), g.addColorStop(0.45, rgba(MID, 0.62)), g.addColorStop(1, rgba(MID, 0.05)), ctx.save(), ctx.globalCompositeOperation = "lighter", path(futP), ctx.strokeStyle = g, ctx.globalAlpha *= 0.16, ctx.lineWidth = 11, ctx.stroke(), ctx.restore(), path(futP), ctx.strokeStyle = g, ctx.lineWidth = 3.2 + 0.8 * bh, ctx.stroke();
    for (let h of PRE.holds) {
      let a0 = Math.max(0, h.t0 - tv), a1 = Math.min(futEnd, h.t1 - tv);
      if (a1 <= a0 || h.t1 - h.t0 < 1)
        continue;
      let yy = y(SCR.breathAt((h.t0 + h.t1) / 2)), xa = X(a0), xb = X(a1), top2 = h.kind === "top", gh = ctx.createLinearGradient(x0, 0, gx1, 0);
      if (gh.addColorStop(0, rgba(top2 ? CORE : EDGE, top2 ? 0.9 : 0.5)), gh.addColorStop(1, rgba(top2 ? CORE : EDGE, 0.06)), ctx.save(), ctx.globalCompositeOperation = "lighter", ctx.strokeStyle = gh, ctx.globalAlpha *= top2 ? 0.22 : 0.3, ctx.lineWidth = top2 ? 12 : 20, ctx.beginPath(), ctx.moveTo(xa, yy), ctx.lineTo(xb, yy), ctx.stroke(), ctx.restore(), ctx.strokeStyle = gh, ctx.lineWidth = top2 ? 4.8 : 6, ctx.beginPath(), ctx.moveTo(xa, yy), ctx.lineTo(xb, yy), ctx.stroke(), top2 && h.t1 - tv <= futEnd) {
        let gc = ctx.createRadialGradient(xb, yy, 0, xb, yy, 9);
        gc.addColorStop(0, rgba(CORE, 0.95 * Math.min(1, (W - xb) / 40))), gc.addColorStop(1, rgba(CORE, 0)), ctx.fillStyle = gc, ctx.beginPath(), ctx.arc(xb, yy, 9, 0, 6.2832), ctx.fill();
      }
    }
    ctx.font = `600 10.5px ${FONT}`, ctx.textAlign = "left", ctx.textBaseline = "alphabetic";
    for (let p of SCR.PH) {
      let dd = p[0] - tv;
      if (dd < -1.5 || dd > futEnd || p[2] === "Arrival")
        continue;
      let xx = X(dd), f = Math.min(1, (W - xx) / 70) * (dd < 0 ? Math.max(0, 1 + dd / 1.5) : 1) * rev, gm = ctx.createLinearGradient(0, top - 14, 0, bottom);
      if (gm.addColorStop(0, rgba(CORE, 0.38 * f)), gm.addColorStop(1, rgba(CORE, 0)), ctx.fillStyle = gm, ctx.fillRect(xx - 0.5, top - 14, 1, A + 14), !aliveInk || dd < 4 && Math.min(1, (4 - dd) / 0.6) * (dd < 0 ? Math.max(0, 1 + dd / 1.5) : 1) > 0.01) {
        let fl = aliveInk ? rev * Math.min(1, (4 - dd) / 0.6) * (dd < 0 ? Math.max(0, 1 + dd / 1.5) : 1) : f, lab = String(p[2]).toUpperCase(), LS = 1.4, tw = spacedWidth(ctx, lab, LS), tx = aliveInk ? (W - tw) / 2 : Math.min(xx + 6, W - tw - 12);
        aliveInk && (ctx.save(), ctx.fillStyle = rgba([8 / 255, 3 / 255, 2 / 255], 0.6 * fl), ctx.shadowColor = rgba([8 / 255, 3 / 255, 2 / 255], 0.6 * fl), ctx.shadowBlur = 11, ctx.beginPath(), ctx.roundRect ? ctx.roundRect(tx - 14, top - 30, tw + 28, 24, 12) : ctx.rect(tx - 14, top - 30, tw + 28, 24), ctx.fill(), ctx.restore(), ctx.save(), ctx.fillStyle = rgba([8 / 255, 3 / 255, 2 / 255], 0.75 * fl), ctx.shadowColor = rgba([8 / 255, 3 / 255, 2 / 255], 0.75 * fl), ctx.shadowBlur = 6, spacedText(ctx, lab, tx, top - 16, LS), spacedText(ctx, lab, tx, top - 16, LS), ctx.restore()), ctx.fillStyle = aliveInk ? rgba(mix3(CORE, [1, 0.94, 0.86], 0.75), Math.min(1, 0.98 * fl)) : rgba(CORE, 0.62 * f), spacedText(ctx, lab, tx, top - 16, LS);
      }
    }
  }
  let yb = y(SCR.breathAt(tv)), pr = Math.abs(crest) * (crest > 0 ? 1 : 0.55), rad = 10 + 9 * pr, ga = Math.max(rev, 0.4);
  ctx.globalAlpha = ga * Math.round(clamp01(liveM.line) * 100) / 100;
  {
    let gb = ctx.createRadialGradient(x0, yb, 0, x0, yb, rad);
    gb.addColorStop(0, rgba(CORE, 0.42 + 0.3 * pr)), gb.addColorStop(1, rgba(CORE, 0)), ctx.fillStyle = gb, ctx.beginPath(), ctx.arc(x0, yb, rad, 0, 6.2832), ctx.fill();
  }
  if (ctx.fillStyle = rgba(mix3(CORE, [1, 0.93, 0.84], 0.6), 1), ctx.beginPath(), ctx.arc(x0, yb, 3.1 + 0.8 * pr, 0, 6.2832), ctx.fill(), ctx.globalAlpha = Math.round(clamp01(liveM.line) * 100) / 100, breathLabel > 0.01) {
    ctx.font = `600 10px ${FONT}`, ctx.textAlign = "left", ctx.textBaseline = "alphabetic";
    let by = Math.max(14, pts[0][1] - 12), LS = 1.8;
    ctx.save(), ctx.fillStyle = rgba([8 / 255, 3 / 255, 2 / 255], 0.36 * breathLabel), ctx.shadowColor = rgba([8 / 255, 3 / 255, 2 / 255], 0.36 * breathLabel), ctx.shadowBlur = 2.5, spacedText(ctx, "BREATH", 14, by, LS), ctx.restore(), ctx.fillStyle = rgba([1, 0.93, 0.84], 0.6 * breathLabel), spacedText(ctx, "BREATH", 14, by, LS);
  }
  ctx.restore();
}
function drawCountdown(ctx, geo, S, cd) {
  if (S.countdown !== "light" || !(cd.d > 0) || !(cd.o > 0))
    return;
  let txt = String(cd.d), cx = geo.Wn / 2, cy = geo.heroCy, LH = 120, base = cy - LH / 2 + (LH - 104) / 2 + 104 * 0.8;
  ctx.save(), ctx.translate(cx, cy + Math.round(cd.ty * 10) / 10);
  let sc = Math.round(cd.sc * 1e3) / 1e3;
  ctx.scale(sc, sc), ctx.translate(-cx, -cy), ctx.globalAlpha = Math.round(cd.o * 1e3) / 1e3, ctx.font = `300 104px ${FONT}`, ctx.textAlign = "center", ctx.textBaseline = "alphabetic", ctx.shadowColor = "rgba(20,8,4,.5)", ctx.shadowBlur = 1, ctx.fillStyle = "rgba(20,8,4,.5)", ctx.fillText(txt, cx, base), ctx.shadowColor = "rgba(246,200,150,.55)", ctx.shadowBlur = 22, ctx.fillStyle = "rgba(246,200,150,.55)", ctx.fillText(txt, cx, base), ctx.shadowColor = "transparent", ctx.shadowBlur = 0, ctx.fillStyle = "rgb(246,237,227)", ctx.fillText(txt, cx, base), ctx.restore();
}
var MN = 30, mh1 = (n) => {
  let s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function drawMotes(ctx, t2, breath, w, h, warm, bands, hero) {
  ctx.save(), ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < MN; i++) {
    let depth = mh1(i + 41), per = 70 - 36 * depth, ph = (t2 / per + mh1(i + 11)) % 1, x = (mh1(i + 21) + 0.035 * Math.sin(t2 * 0.21 + i * 1.7)) * w, y = h * (1.06 - 1.12 * ph), tw = 0.55 + 0.45 * Math.sin(t2 * (0.5 + 0.4 * mh1(i + 31)) + i), edge = Math.sin(Math.PI * ph), clear = 1;
    for (let b of bands)
      if (b && b[0] >= 0) {
        let d = Math.max(b[0] - y, y - b[1]);
        clear = Math.min(clear, Math.max(0, Math.min(1, d / 30)));
      }
    let core = 1;
    if (hero) {
      let dd = Math.hypot(x - hero.cx, y - hero.cy) / hero.R;
      core = Math.max(0, Math.min(1, (dd - 0.45) / 0.35));
    }
    let a = (0.2 + 0.12 * depth) * edge * clear * core * tw * (0.8 + 0.4 * breath), r = 1.1 + 1.9 * depth;
    if (a < 2e-3)
      continue;
    let gr = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    gr.addColorStop(0, rgba(warm, a * 0.55)), gr.addColorStop(1, rgba(warm, 0)), ctx.fillStyle = gr, ctx.beginPath(), ctx.arc(x, y, r * 2.4, 0, 6.2832), ctx.fill(), ctx.fillStyle = rgba(warm, a * 0.9), ctx.beginPath(), ctx.arc(x, y, r * 0.55, 0, 6.2832), ctx.fill();
  }
  ctx.restore();
}
function drawSessionText(ctx, eng, sg, S, geo, SP, t2) {
  let SCR = eng.SCR, W = geo.Wn, C = SCR.caps, cur = -1;
  for (let i = 0; i < C.length; i++) {
    let c = C[i], until = Math.min(c[1] + 0.7, i + 1 < C.length ? C[i + 1][0] - 0.15 : c[1] + 0.7);
    t2 >= c[0] - 0.15 && t2 < until && (cur = i);
  }
  if (S.captions !== !1 && cur >= 0) {
    let c = C[cur], words = c[2].split(" "), EMPH = ["inhale", "exhale", "hold", "let", "go", "sigh", "empty", "nose", "last"];
    ctx.save(), ctx.font = `600 ${SP.capf}px ${FONT}`, ctx.textBaseline = "alphabetic", ctx.textAlign = "left";
    let fit = (txt) => ctx.measureText(txt).width, maxW = W - 48, lines = [[]], lw = 0, sp = fit(" ");
    words.forEach((wd, i) => {
      let ww = fit(wd);
      lw + ww > maxW && lines[lines.length - 1].length && (lines.push([]), lw = 0), lines[lines.length - 1].push([wd, i, ww]), lw += ww + sp;
    });
    let used = !1, em = words.map((x) => {
      let b = x.toLowerCase().replace(/[^a-z]/g, ""), e = !used && EMPH.includes(b);
      return e && (used = !0), e;
    });
    lines.forEach((ln, li) => {
      let tw = ln.reduce((a, q) => a + q[2], 0) + sp * (ln.length - 1), x = (W - tw) / 2, y = SP.cap + SP.capl * (li + 1) - (SP.capl - SP.capf) / 2 - 4;
      for (let [wd, i, ww] of ln) {
        let t0 = c[3] && c[3][i] != null ? c[3][i] : c[0], on = t2 + 0.03 >= t0;
        ctx.globalAlpha = on ? 1 : 0.55, ctx.shadowColor = "rgba(8,3,2,.6)", ctx.shadowBlur = 8, ctx.fillStyle = em[i] ? "#f2b872" : "#f6ede3", ctx.font = `${em[i] ? 800 : 600} ${SP.capf}px ${FONT}`, ctx.fillText(wd, x, y), x += ww + sp;
      }
    }), ctx.restore();
  }
  if (sg.holdLeft != null && sg.hold > 0.5) {
    let left = Math.ceil(sg.holdLeft), txt = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    ctx.save(), ctx.globalAlpha = 0.9, ctx.font = `300 36px ${FONT}`, ctx.textAlign = "center", ctx.shadowColor = "rgba(10,6,4,.6)", ctx.shadowBlur = 16, ctx.fillStyle = "#f6ede3", ctx.fillText(txt, W / 2, SP.cap + 8 + 31), ctx.restore();
  }
}
var GLOW_STOPS = [[0, [0.5, 0.15, 0.42]], [0.22, [0.58, 0.18, 0.4]], [0.42, [0.72, 0.3, 0.36]], [0.52, [0.82, 0.4, 0.34]], [0.62, [0.9, 0.47, 0.3]], [0.82, [0.97, 0.57, 0.27]], [1, [1, 0.65, 0.26]]];
function glowMid(j) {
  j = clamp01(j);
  for (let i = 1; i < GLOW_STOPS.length; i++)
    if (j <= GLOW_STOPS[i][0])
      return mix3(GLOW_STOPS[i - 1][1], GLOW_STOPS[i][1], (j - GLOW_STOPS[i - 1][0]) / (GLOW_STOPS[i][0] - GLOW_STOPS[i - 1][0]));
  return GLOW_STOPS[GLOW_STOPS.length - 1][1];
}
function drawGlow(ctx, sg, S, liveM, geo, W, H) {
  let look = lookOf(S, liveM), d = geo.fit, GR = geo.R;
  ctx.save(), ctx.fillStyle = "rgb(14,9,7)", ctx.fillRect(0, 0, W, H);
  let w = sg.warmth, mid = glowMid(w), edge = glowMid(w - 0.2), core = mix3(glowMid(w + 0.05), [1, 0.92, 0.84], 0.52), deep = [mid[0] * 0.4, mid[1] * 0.3, mid[2] * 0.3], e = sg.energy, b = sg.breath, k = sg.pulse, hb = sg.holdBot, ht = sg.holdTop, crestK = 1 + 0.12 * Math.max(sg.crest, 0) - 0.08 * Math.max(-sg.crest, 0), rad = GR * d * Math.min(1.32, (0.5 + 0.55 * e) * (0.8 + 0.34 * b) * (1 + 0.1 * k) * look.presence * (1 - 0.38 * hb) + 0.25 * sg.afterglow), lit = Math.min(1, (0.38 + 0.62 * e) * (0.75 + 0.35 * b) * (1 + 0.3 * k) * (1 + 0.3 * sg.charge) * sg.shim), off = 0.18 * sg.touch.strength * look.touchReach, cx = (geo.cx + GR * off * Math.max(-1, Math.min(1, sg.touch.x))) * d, cy = (geo.cy - sg.lift * GR + GR * off * Math.max(-1, Math.min(1, sg.touch.y))) * d, radial = (x, y, r, stops) => {
    let g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1e-3, r));
    for (let [o, c] of stops)
      g.addColorStop(o, c);
    return g;
  };
  ctx.globalCompositeOperation = "lighter", ctx.fillStyle = radial(cx, cy, rad * (1.7 + 1.5 * hb), [[0, rgba(deep, (0.42 + 0.25 * hb) * lit)], [0.6, rgba(deep, (0.14 + 0.1 * hb) * lit)], [1, rgba(deep, 0)]]), ctx.fillRect(0, 0, W, H);
  let m = sg.motion, lx = cx + rad * 0.34 * Math.cos(m * 0.55 + 1), ly = cy + rad * 0.26 * Math.sin(m * 0.43), lr = rad * 0.78;
  ctx.fillStyle = radial(lx, ly, lr, [[0, rgba(edge, 0.3 * lit)], [0.55, rgba(edge, 0.1 * lit)], [1, rgba(edge, 0)]]), ctx.fillRect(0, 0, W, H);
  let soft = look.softness;
  ctx.fillStyle = radial(cx, cy, rad, [[0, rgba(core, Math.min(1, 0.95 * lit * crestK))], [Math.min(0.5, 0.12 * soft), rgba(core, 0.72 * lit * crestK)], [Math.min(0.8, 0.38 * soft), rgba(mid, 0.5 * lit)], [0.72, rgba(edge, 0.17 * lit)], [1, rgba(edge, 0)]]), ctx.fillRect(0, 0, W, H), sg.afterglow > 0.01 && (ctx.fillStyle = radial(cx, cy, rad * 1.2, [[0, rgba([0.92, 0.52, 0.48], 0.22 * sg.afterglow)], [1, rgba([0.92, 0.52, 0.48], 0)]]), ctx.fillRect(0, 0, W, H)), ctx.restore();
}

// parts/api.js
var ARMS_NAMES = ["calm", "softer", "disc", "off"], PRESET_NAMES = Object.keys(PRESETS);
function isSupported() {
  try {
    if (typeof document > "u")
      return !1;
    let g = document.createElement("canvas").getContext("webgl2"), ok = !!g;
    if (g) {
      let x = g.getExtension("WEBGL_lose_context");
      x && x.loseContext();
    }
    return ok;
  } catch {
    return !1;
  }
}
var FLOW_STEPS = ["welcome", "start", "ci1", "session", "ci2", "result", "offer", "end"], LOOK_RANGES = {
  energy: [0.7, 1.2],
  softness: [0.75, 1.6],
  warmth: [-0.5, 0.5],
  size: [0.7, 1.3],
  reachX: [0, 1],
  reachY: [0, 1],
  carry: [0, 1],
  floorA: [0, 1],
  transT: [1, 6],
  ambient: [0, 1.5],
  presence: [0.8, 1.35],
  warmSpeed: [0.6, 1.6],
  follow: [0, 1],
  firePulse: [0, 1.6],
  holdDim: [0.25, 0.75],
  behind: [0, 1],
  coupling: [0, 1],
  startField: [0, 1],
  bgReach: [0, 1],
  bgLag: [0.1, 1.5],
  lead: [0, 0.6],
  touchReach: [0, 1.3],
  chargeK: [0.5, 1.5],
  holdDur: [0.8, 3]
}, LS_RANGE = Object.fromEntries(LS_PARAMS.map(([p, , lo, hi]) => [p, [lo, hi]])), clone2 = (o) => JSON.parse(JSON.stringify(o)), num = (v) => typeof v == "number" && isFinite(v);
function resolveLookInput(look) {
  if (look == null)
    return clone2(PRESETS.balanced);
  if (typeof look == "string")
    return clone2(PRESETS[look] || PRESETS.balanced);
  if (typeof look == "object" && (look.preset || look.overrides)) {
    let base = clone2(resolveLook(look.preset || "balanced")), o = look.overrides || {};
    for (let k of Object.keys(o))
      if (k === "lookScore")
        for (let sec of Object.keys(o.lookScore))
          Object.assign(base.lookScore[sec] || (base.lookScore[sec] = {}), o.lookScore[sec]);
      else
        base[k] = o[k];
    return base;
  }
  return Object.assign(clone2(PRESETS.balanced), clone2(look));
}
function clampLook(look) {
  let L = clone2(look), clamped = [], fix = (obj, key, lo, hi, label) => {
    let v = obj[key];
    if (!num(v))
      return;
    let w = Math.max(lo, Math.min(hi, v));
    w !== v && (clamped.push({ key: label, from: v, to: w }), obj[key] = w);
  };
  for (let [k, [lo, hi]] of Object.entries(LOOK_RANGES))
    fix(L, k, lo, hi, k);
  if (L.lookScore) {
    for (let [sec] of LS_SECS)
      if (L.lookScore[sec])
        for (let [p, [lo, hi]] of Object.entries(LS_RANGE))
          fix(L.lookScore[sec], p, lo, hi, `lookScore.${sec}.${p}`);
  }
  return { look: L, clamped };
}
function validate(input) {
  let out = { ok: !0, errors: [], warnings: [], facts: {}, clamped: [] }, hasScore = input && typeof input == "object" && "score" in input, hasLook = input && typeof input == "object" && "look" in input, score = hasScore || hasLook ? input.score : input;
  if (score !== void 0) {
    let r = validatePlasmaScore(score);
    r.ok ? (out.warnings.push(...r.check.warnings), out.facts = r.check.facts) : (out.ok = !1, out.errors.push(...r.errors));
  }
  if (hasLook && input.look != null)
    try {
      let res = clampLook(resolveLookInput(input.look));
      out.clamped = res.clamped, typeof input.look == "string" && !PRESETS[input.look] && out.warnings.push(`unknown preset "${input.look}", using balanced`);
      for (let c of res.clamped)
        out.warnings.push(`look.${c.key} = ${c.from} is outside its range; clamped to ${c.to}`);
    } catch (e) {
      out.ok = !1, out.errors.push("look: " + (e && e.message ? e.message : e));
    }
  return out;
}
var VERT = `#version 300 es
void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }`, OVER_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D uTex; out vec4 o; void main() { o = texelFetch(uTex, ivec2(gl_FragCoord.xy), 0); }`, ARMS = {
  calm: { len: 1.9, cap: 0.8, knee: 0.4, na: 3, fat: 1.6, tip: 1, bloom: 0.45, halo: 0.4, vary: 1, disc: 0.12, armA: 1.9, skew: 0.3, curl: 0.6 },
  softer: { len: 1.7, cap: 0.7, knee: 0.35, na: 3, fat: 2.4, tip: 1, bloom: 0.65, halo: 0.45, vary: 1, disc: 0.25, armA: 1.3, skew: 0.35, curl: 0.5 },
  disc: { len: 1.3, cap: 0.55, knee: 0.25, na: 2, fat: 2.4, tip: 1, bloom: 0.95, halo: 0.6, vary: 1, disc: 0.8, armA: 0.6, skew: 0.5, curl: 0.5 }
}, ONES_M = { size: 1, reachX: 1, reachY: 1, ambient: 1, softness: 1, warmth: 1, strands: 1, energy: 1, line: 1, firePulse: 1, holdDim: 1 };
function makeProgram(gl, vs, fs) {
  let sh = (type, src) => {
    let s = gl.createShader(type);
    if (gl.shaderSource(s, src), gl.compileShader(s), !gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error("shader: " + gl.getShaderInfoLog(s));
    return s;
  }, p = gl.createProgram();
  if (gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)), gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)), gl.linkProgram(p), !gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error("link: " + gl.getProgramInfoLog(p));
  return p;
}
function mount(target, opts = {}) {
  if (typeof document > "u")
    throw new Error("plasma-web: mount() needs a browser (document is undefined)");
  let canvas, owned = !1;
  target && target.tagName === "CANVAS" ? canvas = target : (canvas = document.createElement("canvas"), canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:" + (opts.touchAction || (opts.interactive === !1 ? "auto" : "none")) + ";pointer-events:" + (opts.interactive === !1 ? "none" : "auto"), getComputedStyle(target).position === "static" && (target.style.position = "relative"), target.appendChild(canvas), owned = !0);
  let O = { alive: !0, ui: !0, interactive: !0, autoRun: !0, quality: "auto", insets: null, motes: !1, pauseOffscreen: !0, pauseHidden: !0, ...opts }, mqRM = O.reduceMotion === "auto" && typeof matchMedia == "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null, lowEnd = () => {
    try {
      let n = navigator, c = n.connection;
      return !!(O.lowPower === !0 || O.lowPower !== !1 && (c && c.saveData || n.deviceMemory && n.deviceMemory <= 2 || n.hardwareConcurrency && n.hardwareConcurrency <= 2));
    } catch {
      return !1;
    }
  }, score = O.score, look = clampLook(resolveLookInput(O.look)).look, rm = mqRM ? mqRM.matches : !!O.reduceMotion, skin = O.skin || null, pausedBy = { api: !1, offscreen: !1, hidden: !1 }, lastTick = 0, time = 0, step = O.step || (score ? "session" : "welcome"), before = O.before ?? null, after = O.after ?? 3, alive = O.alive === !0 ? 2 : O.alive === !1 ? 0 : O.alive, W = 0, H = 0, dpr = 1, adapt = 1, version = 0, destroyed = !1, status = "", engine = null, fc = null, lineSt = { fut: 6.5, lastT: -1 }, wall = 0, lastNow = 0, dirty = !0, raf = 0, lastSig = null, lastCd = 0, holdLeftV = -1, frameMs = 0, slowT = 0, slowMs = 0, breathLabel = 0, releaseT = -1, gl = null, glProg = null, overProg = null, overTex = null, vao = null, uloc = {}, ov = null, ovc = null, ctx2d = null, useGL = skin !== "glow";
  function initGL() {
    try {
      if (gl = canvas.getContext("webgl2", { antialias: !1, alpha: !1, depth: !1, stencil: !1, premultipliedAlpha: !0, preserveDrawingBuffer: !0 }), !gl)
        throw new Error("WebGL 2 is not available");
      glProg = makeProgram(gl, VERT, SILK_FRAG), overProg = makeProgram(gl, VERT, OVER_FRAG);
      for (let name of Object.keys(SILK_UNIFORMS))
        uloc[name] = gl.getUniformLocation(glProg, name);
      uloc.__tex = gl.getUniformLocation(overProg, "uTex"), vao = gl.createVertexArray(), overTex = gl.createTexture(), gl.bindTexture(gl.TEXTURE_2D, overTex), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST), ov = document.createElement("canvas"), ovc = ov.getContext("2d");
    } catch (e) {
      gl = null, useGL = !1, status = String(e && e.message ? e.message : e), O.onFallback && O.onFallback("shader-compile", status);
    }
  }
  function initGlow() {
    ctx2d || (ctx2d = canvas.getContext("2d"));
  }
  useGL && initGL(), useGL || initGlow();
  let params = () => paramsFromSettings(look, rm);
  function build() {
    if (!score) {
      engine = null;
      return;
    }
    engine = createEngine(score, look, { carryOn: !1, reduceMotion: rm }), version++, fc && (fc = null);
  }
  function ensureFlow() {
    if (!fc) {
      let Hn = Math.min(H || 844, 1100);
      fc = createFlowCtl(W || 390, Hn, params(), step, after, !0, before, !1), fc.settled = !0;
    }
    return fc;
  }
  build();
  function size() {
    let r = canvas.getBoundingClientRect(), w = Math.max(1, r.width || canvas.clientWidth || 390), h = Math.max(1, r.height || canvas.clientHeight || 844), q = O.quality === "auto" || O.quality == null ? lowEnd() ? "efficient" : "auto" : O.quality, cap = O.maxDpr || (look.render === "efficient" || q === "efficient" ? 1.5 : q === "balanced" ? 2 : 3), d = Math.min(cap, (typeof devicePixelRatio == "number" ? devicePixelRatio : 1) || 1) * (q === "auto" ? adapt : 1);
    (w !== W || h !== H || d !== dpr) && (W = w, H = h, dpr = d, canvas.width = Math.round(W * dpr), canvas.height = Math.round(H * dpr), ov && (ov.width = canvas.width, ov.height = canvas.height), fc = null, dirty = !0);
  }
  function layoutFor(SP) {
    return { spec: !0, heroCy: SP.C, lineTop: SP.z0 - 26, lineBottom: SP.z1, capTop: SP.z0 - 26, behind: { lineT: SP.z0 - 26, lineB: SP.z0 + 90, pT: SP.P, numY: SP.cap + 28 }, bands: textBands(step, SP, H) };
  }
  function renderFrame(t2, dt, snap = !1) {
    if (size(), destroyed || !W)
      return null;
    let S = look, Hn = Math.min(H, 1100), SP = specPos(Hn, O.insets || void 0), flowOn = !0, F = ensureFlow();
    F.SP = SP, wall += dt, engine && (engine.wallT = O.wallPin != null ? O.wallPin : wall), F.step !== step && openStep(F, step, after, !1, before);
    let ext = stepFlow(F, dt, params(), S.size || 1), screens = !!ext.sig;
    if (!screens && !engine)
      return null;
    let frame = screens ? { sig: ext.sig, liveM: ONES_M, cd: 0, cdDigit: 0, cdScale: 1, cdShift: 0 } : engine.frame(t2);
    !screens && ext.rel != null && ext.rel >= 0 && applyRelease(frame.sig, ext.rel, engine.S), !screens && ext.rot != null && engine && (engine.rotAcc = ext.rot);
    let sg = frame.sig;
    rm && (sg.ambT = O.rmAmbT ?? 14);
    let liveM = ext.lineA != null && ext.lineA < 1 ? { ...frame.liveM, line: frame.liveM.line * ext.lineA } : frame.liveM, layout = layoutFor(SP), geo = stageGeometry(W, H, S, liveM, layout);
    if (ext.geo)
      geo = { ...geo, cx: ext.geo.cx, cy: ext.geo.cy, heroCy: ext.geo.cy, R: ext.geo.R, capY: ext.geo.capY };
    else if (ext.scr) {
      let a = ext.scr, u = ext.u == null ? 1 : ext.u, m = (p, q) => p + (q - p) * u;
      geo = { ...geo, cx: m(a.cx, geo.cx), cy: m(a.cy, geo.cy), R: m(a.R, geo.R), capY: m(a.capY, geo.capY) };
    }
    let hs = O.heroScale === "auto" ? 1.7 + 0.9 * Math.max(0, Math.min(1, W / H - 0.6)) : O.heroScale > 0 ? O.heroScale : 1;
    if (!screens) {
      let jumped = lineSt.lastT < 0 || Math.abs(t2 - lineSt.lastT) > 1, inFire = engine.SCR.phaseAt(sg.tv + 1.5) === "Breath of fire" && sg.tv > 94;
      advanceFuture(lineSt, sg.tv, inFire, dt, snap || jumped), lineSt.lastT = t2;
    }
    breathLabel = step === "session" ? Math.max(0, Math.min(1, 1 - (Math.max(0, t2) - 9.5) / 3)) * (t2 < 12.5 ? 1 : 0) : 0;
    let px = dpr;
    if (useGL && gl) {
      frame.haze = alive ? 0.24 * (O.aliveGain || 1) : 0, frame.veil = screens ? 0 : 1, frame.hzSoft = O.aliveGain && O.aliveGain > 1 || step === "start" ? 1 : 0, step === "start" && (frame.haze = alive ? 0.24 * 1.3 : 0);
      let useBands = O.bands === void 0 || O.bands === null ? step !== "welcome" : !!O.bands, bd = useBands ? layout.bands || [] : [], fr = (i) => bd[i] && bd[i][0] >= 0 ? [bd[i][0] / H, bd[i][1] / H] : [-1, -1];
      frame.bandsA = fr(0), frame.bandsB = fr(1), frame.bandsC = fr(2), useBands || (frame.hzSoft = 1, frame.haze *= O.hazeGain ?? 0.55);
      let u = silkUniforms(frame, S, geo, canvas.width, canvas.height, px, 1);
      useBands || (u.uBehind = 0);
      {
        let am = O.arms === void 0 || O.arms === null || O.arms === !0 ? step === "welcome" ? "calm" : "off" : O.arms, A = screens ? ARMS[am] : null;
        u.uCalm = A ? 1 : 0, u.uForce = A && step === "welcome" ? 1 : 0;
        let a = A || ARMS.calm;
        u.uLen = a.len, u.uCap = a.cap, u.uKnee = a.knee, u.uNA = a.na, u.uFat = a.fat, u.uTipR = a.tip, u.uBloom = a.bloom, u.uHalo = a.halo, u.uVar = a.vary, u.uDisc = a.disc, u.uArmA = a.armA, u.uSkew = a.skew, u.uCalmCurl = a.curl;
      }
      gl.viewport(0, 0, canvas.width, canvas.height), gl.disable(gl.BLEND), gl.useProgram(glProg), gl.bindVertexArray(vao);
      for (let [name, type] of Object.entries(SILK_UNIFORMS)) {
        let v = u[name], loc = uloc[name];
        if (loc != null) {
          if (v === void 0)
            throw new Error("missing uniform " + name);
          type === "float" ? gl.uniform1f(loc, v) : type === "vec2" ? gl.uniform2f(loc, v[0], v[1]) : gl.uniform3f(loc, v[0], v[1], v[2]);
        }
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3), drawOverlay(ovc, ov.width, ov.height), gl.useProgram(overProg), gl.activeTexture(gl.TEXTURE0), gl.bindTexture(gl.TEXTURE_2D, overTex), gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !0), gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, !0), gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ov), gl.uniform1i(uloc.__tex, 0), gl.enable(gl.BLEND), gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA), gl.drawArrays(gl.TRIANGLES, 0, 3), gl.disable(gl.BLEND);
    } else
      initGlow(), ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0), drawGlow(ctx2d, sg, S, liveM, geo, W, H), drawOverlay(ctx2d, canvas.width, canvas.height, !0);
    function drawOverlay(c, w, h, onMain) {
      onMain || c.clearRect(0, 0, w, h), c.save(), c.setTransform(px, 0, 0, px, 0, 0), alive > 1 && useGL && ext.sig == null || alive > 1, O.motes && alive > 1 && !rm && drawMotes(c, sg.ambT || 0, sg.bgB || 0, W, H, [1, 0.9, 0.74], layout.bands || [], { cx: geo.cx * geo.fit, cy: geo.cy * geo.fit, R: geo.R * geo.fit }), S.line !== "off" && !screens && (c.save(), c.scale(geo.fit, geo.fit), c.translate(geo.ox, geo.line.canvasY), drawThread(c, engine, sg, S, liveM, geo, lineSt, breathLabel, !!alive), c.restore()), c.save(), c.scale(geo.fit, geo.fit), drawCountdown(c, geo, S, { o: frame.cd, d: frame.cdDigit, sc: frame.cdScale, ty: frame.cdShift }), c.restore(), O.ui && !screens && drawSessionText(c, engine, sg, S, geo, SP, t2), c.restore();
    }
    lastSig = sg, lastCd = frame.cd > 0.02 ? frame.cdDigit : 0, holdLeftV = sg.holdLeft == null ? -1 : sg.holdLeft, ext && ext.events;
    let evs = F.ix.events;
    if (evs && evs.length) {
      let codes = evs.slice();
      evs.length = 0, O.onEvents && O.onEvents(codes);
    }
    return { sg, geo };
  }
  function tick(now) {
    if (raf = 0, destroyed || paused()) {
      lastNow = 0;
      return;
    }
    let fpsCap = O.maxFps || (O.quality === "efficient" || (O.quality == null || O.quality === "auto") && lowEnd() ? 30 : 0);
    if (fpsCap && lastTick && now - lastTick < 1e3 / fpsCap - 2) {
      schedule();
      return;
    }
    lastTick = now;
    let dt = Math.min(0.1, lastNow ? (now - lastNow) / 1e3 : 1 / 60);
    lastNow = now;
    let live = step !== "session" || fc && (fc.geoU < 0.9995 || fc.ix.releasing) || O.continuous;
    if (dirty || live) {
      let t0 = performance.now();
      try {
        renderFrame(time, dt, !1), dirty = !1;
      } catch (e) {
        status = String(e && e.message ? e.message : e), O.onFallback && O.onFallback("frame-error", status), destroyed = !1, dirty = !1;
      }
      frameMs = performance.now() - t0, (O.quality === "auto" || O.quality == null) && (slowMs += (dt * 1e3 - slowMs) * 0.08, slowT = slowMs > 20 ? slowT + dt : 0, slowT > 1.5 && adapt > 0.6 && (adapt *= 0.8, slowT = 0, slowMs = 0, O.onStats && O.onStats({ renderScale: adapt })));
    }
    schedule();
  }
  let paused = () => pausedBy.api || pausedBy.offscreen || pausedBy.hidden;
  function schedule() {
    !raf && !destroyed && !paused() && O.autoRun && typeof requestAnimationFrame == "function" && (raf = requestAnimationFrame(tick));
  }
  let io = null, onVis = null, onRM = null;
  O.pauseOffscreen && typeof IntersectionObserver < "u" && (io = new IntersectionObserver((es) => {
    let off = !es[es.length - 1].isIntersecting;
    off !== pausedBy.offscreen && (pausedBy.offscreen = off, off || (dirty = !0, schedule()));
  }, { threshold: 0 }), io.observe(canvas)), O.pauseHidden && typeof document < "u" && (onVis = () => {
    pausedBy.hidden = document.hidden, document.hidden || (dirty = !0, schedule());
  }, document.addEventListener("visibilitychange", onVis), onVis()), mqRM && (onRM = () => {
    rm = mqRM.matches, build(), fc = null, dirty = !0, schedule();
  }, mqRM.addEventListener ? mqRM.addEventListener("change", onRM) : mqRM.addListener(onRM));
  let ro = null;
  typeof ResizeObserver < "u" && (ro = new ResizeObserver(() => {
    dirty = !0;
  }), ro.observe(canvas));
  let rel = (e) => {
    let r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, trackV = (x) => Math.max(0, Math.min(1, (x - 24) / Math.max(1, W - 48))), PT = O.pointerTarget || canvas, down = (e) => {
    if (!O.interactive)
      return;
    let p = rel(e), F = ensureFlow();
    try {
      PT.setPointerCapture(e.pointerId);
    } catch {
    }
    O.onPointer && O.onPointer("down", p.x, p.y), api.pointer("down", p.x, p.y);
  }, move = (e) => {
    if (!O.interactive || !(e.buttons || e.pointerType === "touch"))
      return;
    let p = rel(e);
    O.onPointer && O.onPointer("move", p.x, p.y), api.pointer("move", p.x, p.y);
  }, up = () => {
    O.interactive && (O.onPointer && O.onPointer("up"), api.pointer("up"));
  };
  PT.addEventListener("pointerdown", down), PT.addEventListener("pointermove", move), PT.addEventListener("pointerup", up), PT.addEventListener("pointercancel", up);
  let api = {
    /** The host's clock, in session seconds (audio time or a scrub slider). */
    setTime(sec) {
      return num(sec) && sec !== time && (time = sec, dirty = !0, schedule()), api;
    },
    setLook(l) {
      return look = clampLook(resolveLookInput(l)).look, engine && (engine.S = look), version++, fc = null, dirty = !0, schedule(), api;
    },
    setScore(s) {
      return score = s, build(), lineSt.lastT = -1, dirty = !0, schedule(), api;
    },
    setReduceMotion(v) {
      return rm = !!v, build(), dirty = !0, schedule(), api;
    },
    setAlive(v) {
      return alive = v === !0 ? 2 : v === !1 ? 0 : v, dirty = !0, schedule(), api;
    },
    /** The flow's screen: 'session' (the score and the host's clock) or 'welcome' | 'start' | 'ci1' | 'ci2' | 'result' | 'offer' | 'end' (the light's own states on the wall clock). */
    setStep(s, o = {}) {
      return step = s, o.before !== void 0 && (before = o.before), o.after !== void 0 && (after = o.after), dirty = !0, schedule(), api;
    },
    /** The check-in answer 1..5 (the light and its label follow, as if dragged there). */
    setAnswer(level) {
      let F = ensureFlow(), ix = F.ix, a = Math.max(1, Math.min(5, Math.round(level))), st = a - 1;
      return step !== "ci1" && step !== "ci2" && api.setStep("ci1"), ix.ciV = st / 4, ix.ciLastStop = st, ix.ciAnswer = a, ix.ciLabel = a, ix.ciLabelSwapAt = ix.wallT + 0.11, dirty = !0, schedule(), api;
    },
    /** The start's hold: press (x, y optional: the light's centre by default), release. A lifted finger after "ready" begins the release choreography. */
    pointer(type, x, y) {
      let F = ensureFlow();
      if (x == null && (x = F.geo.cx, y = F.geo.cy - 3), step === "start")
        type === "down" ? pointerDown(F, x, y) : type === "move" ? pointerMove(F, x, y) : (pointerUp(F), F.ix.releasing && O.onStartDone && O.onStartDone());
      else if (step === "ci1" || step === "ci2") {
        if (type === "down")
          scaleDown(F, trackV(x), x, y);
        else if (type === "move")
          scaleMove(F, trackV(x), x, y);
        else if (F.ix.ciDrag) {
          let a = scaleUp(F);
          O.onAnswer && O.onAnswer(a);
        }
      }
      return dirty = !0, schedule(), api;
    },
    /** "Or tap to begin": the release without a hold. */
    begin() {
      let F = ensureFlow();
      return step === "start" && !F.ix.releasing && (F.ix.finger = null, F.ix.holding = !1, F.ix.releasing = !0, F.ix.relT = 0, O.onStartDone && O.onStartDone()), api;
    },
    nudge(dir) {
      let F = ensureFlow(), a = scaleNudge(F, dir);
      return O.onAnswer && O.onAnswer(a), dirty = !0, schedule(), api;
    },
    /** Stops drawing (the loop and the GPU work); resume() starts it again. The module also pauses itself when offscreen and in a hidden tab. */
    pause() {
      return pausedBy.api = !0, api;
    },
    resume() {
      return pausedBy.api = !1, dirty = !0, lastNow = 0, schedule(), api;
    },
    /** 'webgl2' (the real light) or 'canvas2d' (the flat glow fallback: no WebGL 2). */
    get mode() {
      return useGL && gl ? "webgl2" : "canvas2d";
    },
    get paused() {
      return paused();
    },
    /** Draws one frame now (tests and manual loops: use with `autoRun: false`). */
    render(dtSec = 1 / 60) {
      return renderFrame(time, dtSec, !0);
    },
    /** What the host's own UI needs. */
    getState() {
      let F = fc;
      return { step, time, holdLeft: holdLeftV, countdownDigit: lastCd, phase: engine && lastSig ? engine.SCR.phaseAt(time) : "", hint: F ? F.ix.out.hint : 0, interaction: F ? F.ix.out : null, signals: lastSig, frameMs, renderScale: adapt, status, size: [W, H], dpr };
    },
    toDataURL(type = "image/png") {
      return canvas.toDataURL(type);
    },
    get canvas() {
      return canvas;
    },
    /** Tests only: the flow's state object (the interaction state, geometry). */
    _flow() {
      return ensureFlow();
    },
    destroy() {
      destroyed = !0, raf && typeof cancelAnimationFrame == "function" && cancelAnimationFrame(raf), raf = 0, ro && ro.disconnect(), io && io.disconnect(), onVis && document.removeEventListener("visibilitychange", onVis), onRM && (mqRM.removeEventListener ? mqRM.removeEventListener("change", onRM) : mqRM.removeListener(onRM)), PT.removeEventListener("pointerdown", down), PT.removeEventListener("pointermove", move), PT.removeEventListener("pointerup", up), PT.removeEventListener("pointercancel", up);
      try {
        if (gl) {
          gl.deleteProgram(glProg), gl.deleteProgram(overProg), gl.deleteTexture(overTex);
          let ext = gl.getExtension("WEBGL_lose_context");
          ext && ext.loseContext();
        }
      } catch {
      }
      owned && canvas.parentNode && canvas.parentNode.removeChild(canvas);
    }
  };
  return O.autoRun && (dirty = !0, schedule()), api;
}
export {
  ARMS,
  ARMS_NAMES,
  FLOW_STEPS,
  LOOK_RANGES,
  PHASE_KINDS,
  PRESETS,
  PRESET_NAMES,
  SCORE_AUDIO_TOLERANCE_SECONDS,
  WORLDS,
  clampLook,
  isSupported,
  mount,
  resolveLookInput,
  validate
};
