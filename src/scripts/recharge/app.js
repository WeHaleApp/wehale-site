// The campaign page's controller (src/pages/recharge.astro): arrival -> the session (the /breathe player) -> the offer.
// Waits for the gate (window.__rcGate); nothing loads or measures on a page that turned into the 404.
import DATA from "../../data/recharge.json";
import { readCampaign, campaignLink, phoneOf } from "./link.js";
import { initMeasurement, track } from "../breathe/measure.js";
import { eventParams } from "../contract.js";

const $ = (id) => document.getElementById(id);
const S = DATA.session;
const body = document.body;

(window.__rcGate || Promise.resolve(true)).then((open) => { if (open) run(); });

function run() {
  const CAMP = readCampaign(location.search, document.referrer, DATA);
  const PHONE = phoneOf(navigator.userAgent, navigator.maxTouchPoints || 0);
  const DESK = !PHONE && matchMedia("(hover: hover) and (pointer: fine) and (min-width: 700px)").matches;
  const audio = $("round");
  body.classList.add("rc", "calm-start");
  body.dataset.world = S.world;
  body.dataset.phone = PHONE || "desktop";

  // every event: the contract, plus the campaign's own fields (no personal data; the code is a campaign code)
  const params = (extra = {}) => eventParams(CAMP.contract, { session: S.slug, page: "recharge", campaign: DATA.onelink.c, ch: CAMP.ch, code: CAMP.code, arm: "none", ...extra });
  initMeasurement();

  // ---------- the player: loaded on idle, the score fetched with it, the audio only after Begin ----------
  let player = null, loading = null, finished = false, started = false, exitAt = 0, oneMin = false;
  const score = () => fetch(S.score, { credentials: "omit" }).then((r) => { if (!r.ok) throw new Error("score " + r.status); return r.json(); });
  function loadPlayer() {
    if (loading) return loading;
    loading = Promise.all([import("../breathe/player.js"), score()]).then(([mod, sc]) => {
      sc.look = { ...(sc.look || {}), world: S.world }; delete sc.look.journey; sc.title = DATA.copy.title; sc.kicker = "";
      player = mod.createPlayer({ score: sc, audio, onTick: tick, onFinish: finish, onExit: exitEarly, gather: true, hideAfter: 3000 });
      player.setWorld(S.world, 0);
      body.classList.add("gl-on"); body.dataset.tier = player.tier;
      return player;
    });
    loading.catch(() => { loading = null; });
    return loading;
  }
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  const boot = () => idle(() => loadPlayer().catch(() => {}), { timeout: 1200 });
  if (document.readyState === "complete") boot(); else addEventListener("load", boot, { once: true });

  // unlock the audio inside the tap (iOS) without letting it sound
  function unlockAudio() { try { const pr = audio.play(); audio.pause(); if (pr && pr.catch) pr.catch(() => {}); } catch (_) {} }
  async function begin(from) {
    if (!audio.src.endsWith(S.audio)) { audio.src = S.audio; audio.preload = "auto"; }
    if (!player) {
      $("beginBtn").setAttribute("aria-busy", "true"); $("beginLbl").textContent = "Getting the session ready…";
      unlockAudio();
      try { await loadPlayer(); } catch (_) { $("beginLbl").textContent = "The session didn't load. Check your connection and try again."; $("beginBtn").removeAttribute("aria-busy"); return; }
      $("beginBtn").removeAttribute("aria-busy"); $("beginLbl").textContent = "";
    }
    hide(); body.classList.remove("calm-start");
    // the guide speaks within about a second: start 1 s before the first word, the sound fading in over that second
    const at0 = from || (S.start > 0 ? S.start : player.startAt);
    if (!from && at0 > 0) { try { audio.volume = 0; const t0 = performance.now(); const up = () => { const u = Math.min(1, (performance.now() - t0) / 1000); try { audio.volume = u; } catch (_) {} if (u < 1) requestAnimationFrame(up); }; requestAnimationFrame(up); } catch (_) {} }
    if (!from) { const c = $("safeCap"); c.hidden = false; c.classList.remove("out"); setTimeout(() => c.classList.add("out"), 2600); setTimeout(() => { c.hidden = true; }, 3400); }
    const pr = player.start(at0);
    $("ttlK").textContent = "With " + S.narrator + " · " + S.minutes + " min"; $("ttlT").textContent = DATA.copy.title;
    if (pr && pr.catch) pr.catch(() => { player.exit(); show("arriveScr"); $("beginLbl").textContent = "Tap Begin again to turn the sound on."; });
    if (!from) { finished = false; started = true; track.start(params()); }
  }
  function tick(at) { if (!oneMin && at >= 60) { oneMin = true; track.oneMinute(params()); } }
  function finish() { if (finished) return; finished = true; track.finish(params()); offer("end"); }
  function exitEarly(at) {
    exitAt = at || 0;
    if (player && exitAt >= player.dur - 15) { finish(); return; }   // left during the goodbye: that counts as finished
    offer("exit");
  }

  // ---------- screens ----------
  const SCREENS = ["arriveScr", "offerScr"];
  function hide() { SCREENS.forEach((id) => { $(id).classList.add("gone"); $(id).setAttribute("aria-hidden", "true"); }); }
  function show(id) {
    hide(); $(id).classList.remove("gone"); $(id).removeAttribute("aria-hidden");
    const h = $(id).querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (_) {} }
  }

  // ---------- the offer: one button (the OneLink), a QR code of the same link on desktop ----------
  let from = "skip";
  function offer(why) {
    from = why; body.classList.add("calm-start");
    const h = $("offerH"); h.textContent = why === "end" ? h.dataset.done : h.dataset.title;
    const b = $("sessBtn"); b.textContent = why === "end" ? b.dataset.again : why === "exit" ? b.dataset.back : b.dataset.first;
    const link = campaignLink(DATA, { ...CAMP, at: why === "end" ? "offer" : why });
    const cta = $("ctaBtn");
    if (!link) cta.hidden = true; else cta.href = link;
    cta.onclick = () => track.appTap(params({ completed: finished ? 1 : 0, at: why }));
    const store = $("ctaStore"); store.textContent = PHONE ? store.dataset[PHONE] : ""; store.hidden = !PHONE;
    body.classList.toggle("rc-desk", DESK);
    if (DESK && link) drawQr(link);
    show("offerScr");
  }
  let qrFor = null;
  async function drawQr(link) {
    if (qrFor === link) { $("qrBox").hidden = false; return; }
    try {
      const QR = (await import("qrcode")).default;
      $("qrCode").innerHTML = await QR.toString(link, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#0a040f", light: "#f3d8f0" } });
      qrFor = link; $("qrBox").hidden = false;
    } catch (_) { $("qrBox").hidden = true; }
  }

  $("beginBtn").addEventListener("click", () => begin(0));
  $("skipBtn").addEventListener("click", () => offer("skip"));
  $("sessBtn").addEventListener("click", () => { if (from === "exit") begin(exitAt); else begin(0); });
  // arrival: the words wait for their font (no fallback flash), then rise in
  let shown = false; const arrive = () => { if (!shown) { shown = true; body.classList.add("arrived"); } };
  try { Promise.all(["500 32px 'Nunito Sans'", "700 18px 'Nunito Sans'"].map((f) => document.fonts.load(f))).then(arrive, arrive); } catch (_) { arrive(); }
  setTimeout(arrive, 700);
  // review aid: ?screen=offer opens the offer directly (as "finished" with &done=1)
  const q = new URLSearchParams(location.search);
  if (q.get("screen") === "offer") { if (q.get("done") === "1") finished = true; offer(q.get("done") === "1" ? "end" : "skip"); }
  window.__recharge = { get player() { return player; }, offer, begin, get link() { return campaignLink(DATA, { ...CAMP, at: "offer" }); } };
}
