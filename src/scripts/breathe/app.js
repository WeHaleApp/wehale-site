// /breathe page controller: the picker, the lazy player, the end and exit screens, consent and events.
// The player (WebGL, ~25 KB gzipped) is imported after first paint; the score is fetched on idle; the audio
// streams only after the Play tap.
import { MORNING_ENDS, DAYTIME_ENDS, DEFAULT_VARIANT } from "./config.js";
import { initMeasurement, onConsent, track } from "./measure.js";
import { STANDARD, loadOffer, assign, storedAssignment, shortCodeOf, pick, oneLink, setLinkContext } from "./offers.js";
import { readContract, eventParams } from "../contract.js";
import SESSIONS_FILE from "../../data/breathe-sessions.json";
import HOOKS from "../../data/hooks.json";

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const SESSIONS = (window.__BREATHE_SESSIONS || SESSIONS_FILE.sessions);
const bySlug = (s) => SESSIONS.find((x) => x.slug === s);
const LANG = (Q.get("lang") || document.documentElement.lang || "en").slice(0, 2) === "sv" ? "sv" : "en";
const audio = $("round");
// the guide's name follows the chosen session (The Soft Reboot is Philip; Unravel and The Wake Up are Edvin)
const guideOf = (slug) => (bySlug(slug) && bySlug(slug).narrator) || "Edvin";
const fillGuide = (t, slug) => String(t || "").replace(/\{guide\}/g, guideOf(slug || selected));
const body = document.body;

// ---------- the landing test: ?v=0 (the original), a, b, c. Every event carries v. ----------
//   a: say what it is + three tiny steps, the choice changes the world, straight into Edvin after Start
//   b: as a, plus one silent guided breath with the light after Start, then Edvin
//   c: one tap: no picker (time of day or the ad decides; "or choose another" link), plus the breath
const VARIANTS = {
  "0": { x: false, worlds: false, intro: false, picker: true, offerAtStart: false },
  a: { x: true, worlds: true, intro: false, picker: true, offerAtStart: true },
  b: { x: true, worlds: true, intro: true, picker: true, offerAtStart: true },
  c: { x: true, worlds: true, intro: true, picker: false, offerAtStart: true },
  // d, e (Isak, 28 Sep): a reason, a choice, Start. Big world-coloured tiles, a calmer room, Edvin within ~1 s
  // of Start (the session's startAt), and "Save it for later". d: stacked tiles, safety under Start; e: a row of
  // square tiles, safety as a short caption when the session starts.
  d: { y: true, worlds: true, intro: false, picker: true, offerAtStart: true, fast: true, safety: "under" },
  e: { y: true, worlds: true, intro: false, picker: true, offerAtStart: true, fast: true, safety: "caption" },
  // f: the landing loop's variant (docs/breathe/landing-loop/LOG.md), built on d one judged change at a time
  // Each loop change is a flag, so a change that isn't kept is switched off, not lost (LOG.md says which and why).
  f: { y: true, worlds: true, intro: false, picker: true, offerAtStart: true, fast: true, safety: "under",
    does: true, sub: true, feather: true, adOrb: false, moment: true, openings: true, softMoon: true, edge: true, glow: false, own: true },
  // g (Isak, 29 Sep): a radical reduction. One line, the sphere, Begin; swipe between the three worlds; save for later.
  // g1: tap Begin (or the sphere). g2: hold the sphere to breathe in (about 1.2 s), release to begin; Begin stays.
  g1: { y: true, g: true, worlds: true, intro: false, picker: true, offerAtStart: false, fast: true, safety: "caption",
    does: true, sub: false, feather: true, moment: true, openings: true, softMoon: true, edge: true, own: false, hold: false },
  "g2-next": { y: true, g: true, worlds: true, intro: false, picker: true, offerAtStart: false, fast: true, safety: "caption",
    does: true, sub: false, feather: true, moment: true, openings: true, softMoon: true, edge: true, own: false, hold: true },
};
const V = Q.get("v") === "g" ? "g1" : VARIANTS[Q.get("v")] ? Q.get("v") : (VARIANTS[DEFAULT_VARIANT] ? DEFAULT_VARIANT : "0");
const VAR = VARIANTS[V];
body.dataset.v = V;
if (VAR.does) body.classList.add("f-does");
if (VAR.moment && !VAR.g) body.classList.add("f-moment");   // the chosen session is the big card; the others stay small until tapped
if (VAR.softMoon) window.__breatheSoftMoon = true;   // Wind down's centre: a smooth pearl instead of the cratered moon
if (VAR.feather) body.classList.add("f-feather");
if (VAR.own) body.classList.add("f-own");   // each person's own page: every row keeps its line, a dim night Start, the challenger's edge   // the scaled-down room fades out at its edges (no visible canvas rectangle)
// message match: ?h=<hook> echoes the ad's first line (variants a, b, c) and picks its session
const HOOK_ID = (VAR.x || VAR.y) && HOOKS.hooks[Q.get("h") || ""] ? Q.get("h") : null;
const HOOK = HOOK_ID ? HOOKS.hooks[HOOK_ID] : null;
// f: ?seen=round, the visitor already breathed one round with the guide in the ad: "Continue with …", no second introduction
const SEEN = !!(VAR.moment && Q.get("seen") === "round");
// g: the one line (the ad's hook on its own session, else "Breathe with <guide>.") and one quiet line
function gLines() {
  const s = bySlug(selected);
  $("startHy").textContent = HOOK && HOOK.session === selected ? ((LANG === "sv" && HOOK.line_sv) || HOOK.line_en) : "Breathe with " + guideOf(selected) + ".";
  const hooked = !!(HOOK && HOOK.session === selected);   // the headline names the guide only without a hook, so the line names them only with one
  $("ySub").textContent = hooked && HOOK.g_sub_en ? fillGuide(HOOK.g_sub_en) : hooked ? s.choice + " with " + guideOf(selected) + " · 6 min · free" : s.choice + " · 6 min · free";
  if (VAR.g) $(START_BTN).querySelector("span").textContent = hooked && HOOK.g_cta_en ? HOOK.g_cta_en : "Begin";
  body.classList.toggle("g-hooked", hooked);
  body.classList.toggle("g-edge", !!(HOOK && HOOK.g_edge && HOOK.session === selected)); window.__breatheEdge = body.classList.contains("g-edge");
}
let player = null, playerSlug = null, loading = null;

// ---------- where the visitor came from, and the rest of the ad-to-site contract (no personal data) ----------
const CONTRACT = readContract(location.search, document.referrer);
const source = CONTRACT.source;
setLinkContext({ contract: CONTRACT, v: V });

// ---------- which session: ?s= (the ad link) skips the question; otherwise the local time preselects ----------
export function timeSlug(h) { return h < MORNING_ENDS ? "wake-up" : h < DAYTIME_ENDS ? "unravel" : "soft-reboot"; }
const hour = (() => { const f = +Q.get("hour"); return Q.has("hour") && f >= 0 && f < 24 ? f : new Date().getHours(); })(); // ?hour= is a test hook
const fromAd = bySlug(Q.get("s") || "") ? Q.get("s") : (HOOK && bySlug(HOOK.session) ? HOOK.session : null);
const wanted = fromAd || timeSlug(hour);
// a session without its files yet shows "Coming soon"; the preselect then falls back to the first ready one
let selected = (bySlug(wanted) && bySlug(wanted).ready) ? wanted : (SESSIONS.find((s) => s.ready) || SESSIONS[0]).slug;
body.dataset.wanted = wanted;

const LAY = VAR.y ? "Y" : VAR.x ? "X" : "";
const START_BTN = "startBtn" + LAY, START_LBL = "startLbl" + LAY;
const choiceEls = [...document.querySelectorAll(VAR.y ? ".tile" : VAR.x ? ".chip" : ".choice")];
// f (adOrb): every ad ends on the warm amber orb, so the page arrives in that world and takes on the session's colour
// about 1.3 s later (or at the first tap on a tile)
let holdWorld = VAR.adOrb ? "ember" : null;
const worldOf = (slug) => holdWorld || (VAR.worlds && bySlug(slug) && bySlug(slug).world) || "ember";
function releaseWorld() { if (!holdWorld) return; holdWorld = null; if (player) player.setWorld(worldOf(selected), 1.4); else body.dataset.world = worldOf(selected); }
function renderChoice(fade) {
  const s = bySlug(selected);
  choiceEls.forEach((el) => el.setAttribute("aria-checked", String(el.dataset.slug === selected)));
  if (SEEN) $(START_BTN).querySelector("span").textContent = "Continue with " + guideOf(selected);
  else if (VAR.g) $(START_BTN).querySelector("span").textContent = HOOK && HOOK.session === selected && HOOK.g_cta_en ? HOOK.g_cta_en : "Begin";
  else $("startTitle" + LAY).textContent = VAR.y ? s.choice : s.title;
  $(START_BTN).setAttribute("aria-label", (VAR.g && !SEEN ? $(START_BTN).querySelector("span").textContent + ": " : LAY ? "Start " : "Play ") + s.title);
  $(START_BTN).disabled = !s.ready;
  body.dataset.selected = selected;
  document.querySelectorAll("[data-guide]").forEach((el) => { el.textContent = guideOf(selected); });
  document.querySelectorAll("[data-tpl]").forEach((el) => { el.textContent = fillGuide(el.dataset.tpl); });
  if (VAR.g) gLines();
  // choosing a session changes the room: a 0.6 s cross-fade in the live field, or the CSS light's colour
  if (VAR.worlds) { if (player) player.setWorld(worldOf(selected), fade ? .6 : 0); else body.dataset.world = worldOf(selected); }
}
choiceEls.forEach((el) => el.addEventListener("click", () => {
  if (el.dataset.ready !== "1") { $(START_LBL).textContent = bySlug(el.dataset.slug).title + " is coming soon."; return; }
  if (holdWorld) holdWorld = null;
  if (selected !== el.dataset.slug) { selected = el.dataset.slug; renderChoice(true); prefetchScore(selected); showOfferAtStart(); }
  $(START_LBL).textContent = "";
  track.picked(params());
}));
// the radio group: arrow keys move the choice
$("choices" + LAY).addEventListener("keydown", (e) => {
  if (!/Arrow(Left|Right|Up|Down)/.test(e.key)) return; e.preventDefault();
  const ready = choiceEls.filter((c) => c.dataset.ready === "1"); const i = ready.findIndex((c) => c.dataset.slug === selected);
  const n = ready[(i + (/Right|Down/.test(e.key) ? 1 : ready.length - 1)) % ready.length]; if (n) { n.click(); n.focus(); }
});
if (!LAY && fromAd && bySlug(fromAd).ready) {
  $("choices").hidden = true; $("changeBtn").hidden = false;
  $("startH").textContent = bySlug(fromAd).title;
  $("changeBtn").addEventListener("click", () => { $("choices").hidden = false; $("changeBtn").hidden = true; $("startH").textContent = "What do you need right now?"; });
}
if (VAR.x) {
  $("startScr").setAttribute("aria-labelledby", "startHx");
  if (HOOK) {   // the ad's own line first; the page's description follows as one line
    // message match: the ad's line is the headline; what this is moves to the subline
    body.classList.add("hooked");
    $("startHx").textContent = (LANG === "sv" && HOOK.line_sv) || HOOK.line_en;
    $("ledeSub").dataset.tpl = "A 6-minute guided breathing session with {guide}.";
    $("ledeSub2").hidden = false;
  }
  // skip the choice when the ad chose the session, and always in c: the picker becomes a small link
  if (!VAR.picker || (fromAd && bySlug(fromAd).ready)) {
    body.classList.add("collapsed"); $("otherBtn").hidden = false;
    $("otherBtn").addEventListener("click", () => { body.classList.remove("collapsed"); $("otherBtn").hidden = true; });
  }
}
if (VAR.y) {
  $("startScr").setAttribute("aria-labelledby", "startHy");
  if (HOOK) { $("startHy").textContent = (LANG === "sv" && HOOK.line_sv) || HOOK.line_en; $("ySub").dataset.tpl = (VAR.sub && HOOK.sub_en) || "Breathe with {guide}. 6 minutes, free."; }
  if (VAR.own && HOOK && HOOK.edge_sub_en) body.classList.add("f-edge");
  if (VAR.edge && HOOK && HOOK.card_en) { const t = document.querySelector(`#choicesY .tile[data-slug="${HOOK.session}"] .rf`); if (t) t.textContent = HOOK.card_en; }
  if (VAR.edge && HOOK && HOOK.edge_sub_en) $("ySub").dataset.tpl = HOOK.edge_sub_en;
  if (SEEN) $("ySub").dataset.tpl = "That was one round. The whole session is 6 minutes with {guide}, free.";
  body.classList.add("calm-start");   // a dimmer, softer room behind the start screen; detail returns with the session
  requestAnimationFrame(() => sphereUp(true));
}
renderChoice(false);
// f (glow): the page's words are final now; move the poster's orb to where the sphere will sit and show the words
function placePoster() {
  if (!body.classList.contains("f-poster")) return;
  const a = $("ySub").getBoundingClientRect().bottom, c = $("choicesY").getBoundingClientRect().top, U = Math.min(innerWidth, innerHeight * .5625), r = .2 * U;
  if (!(c > a)) return; const sc = Math.max(.55, Math.min(1, (c - a - 24) / (2 * r)));
  body.style.setProperty("--orb-y", ((a + c) / 2).toFixed(0) + "px"); body.style.setProperty("--orb-r", (r * sc).toFixed(0) + "px");
}
placePoster(); body.classList.add("f-ready");
// arrival (d, e): the text waits for its font (no fallback flash), then the headline rises in and the tiles follow
if (VAR.y) {
  let shown = false; const arrive = () => { if (shown) return; shown = true; body.classList.add("arrived"); if (holdWorld) setTimeout(releaseWorld, 1300); };
  try { Promise.all(["500 32px 'Nunito Sans'", "700 18px 'Nunito Sans'"].map((f) => document.fonts.load(f))).then(arrive, arrive); } catch (_) { arrive(); }
  setTimeout(arrive, 700);   // never hold the page for a slow font
}

if (VAR.g) {
  $("safeCap").textContent = "Go at your own pace. Stop if you feel dizzy.";
  $("exitStart").hidden = true;
}

// ---------- event params: {session, arm, source}; assignment_id once an offer arm exists ----------
let assignment = null;
function params() {
  const a = assignment || storedAssignment();
  const p = eventParams(CONTRACT, { session: selected, arm: a ? a.arm : "none", source, v: V });
  if (HOOK_ID) p.h = HOOK_ID;
  if (a) p.assignment_id = a.assignmentId;
  return p;
}

// ---------- scores and the player, loaded lazily ----------
const scores = {};
function prefetchScore(slug) {
  if (!scores[slug]) scores[slug] = fetch(`/breathe/sessions/${slug}/score.json`, { credentials: "omit" }).then((r) => { if (!r.ok) throw new Error("score " + r.status); return r.json(); });
  scores[slug].catch(() => { delete scores[slug]; });
  return scores[slug];
}
function loadPlayer() {
  if (loading) return loading;
  loading = Promise.all([import("./player.js"), prefetchScore(selected)]).then(([mod, score]) => {
    playerSlug = score.slug || selected;
    player = mod.createPlayer({
      score, audio,
      onTick: tick, onEvent: onEvent, onFinish: finish, onExit: exitEarly, gather: !!VAR.y, hideAfter: VAR.g ? 3000 : 3500,
    });
    body.classList.add("gl-on"); body.dataset.tier = player.tier; if (VAR.y) sphereUp(body.classList.contains("sphere-up"));
    if (VAR.worlds) player.setWorld(worldOf(selected), 0);
    if (introOn) player.intro(true);
    return player;
  });
  loading.catch(() => { loading = null; });
  return loading;
}
// after first paint and when the main thread is free (or at the latest 1.2 s after load)
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
function boot() { idle(() => loadPlayer().catch(() => {}), { timeout: 1200 }); }
if (document.readyState === "complete") boot(); else addEventListener("load", boot, { once: true });

// ---------- play: a user tap, so audio may start ----------
let started = false, oneMin = false, firstHold = false, finished = false;
function audioSrc(slug) { return `/breathe/sessions/${slug}/audio.mp3`; }
async function ready() {
  await loadPlayer();
  if (playerSlug !== selected) { const sc = await prefetchScore(selected); player.setScore(sc); playerSlug = selected; if (VAR.worlds) player.setWorld(worldOf(selected), 0); }
}
async function play(from) {
  // g: full screen from the Begin tap itself (the gesture must be synchronous), where the browser has element full
  // screen (Android Chrome, desktop). iPhone and the in-app browsers have none: nothing is asked, nothing shows.
  if (VAR.g && !from) { try { const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if ((document.fullscreenEnabled || document.webkitFullscreenEnabled) && !(document.fullscreenElement || document.webkitFullscreenElement) && rq) { const r = rq.call(el, { navigationUI: "hide" }); if (r && r.catch) r.catch(() => {}); } } catch (_) {} }
  releaseWorld();
  if (VAR.g && !from) gGo();
  const s = bySlug(selected); if (!s || !s.ready) return;
  const src = audioSrc(selected);
  if (!audio.src.endsWith(src)) { audio.src = src; audio.preload = "auto"; }
  if (VAR.intro && !from) { runIntro(); return; }
  if (player && playerSlug === selected) { begin(from); return; }
  // not ready yet (slow network, or another session): unlock the audio inside this tap, then start when loaded
  $(START_BTN).setAttribute("aria-busy", "true"); $(START_LBL).textContent = "Getting the session ready…";
  unlockAudio();
  try { await ready(); begin(from); }
  catch (_) { $(START_LBL).textContent = "The session didn't load. Check your connection and try again."; if (VAR.g) gFail(); }
  finally { $(START_BTN).removeAttribute("aria-busy"); }
}
// unlock the audio element inside the tap (iOS), without letting it sound: play and pause in the same tick.
// (Pausing when the play promise resolves could land after the real start and stop the session.)
function unlockAudio() { try { const pr = audio.play(); audio.pause(); if (pr && pr.catch) pr.catch(() => {}); } catch (_) {} }
// ---------- the one breath before Edvin (variants b, c): in as the light rises, out as it falls, no voice ----------
let introOn = false, introTimers = [];
function runIntro() {
  unlockAudio();
  hideScreens(); introOn = true; $("intro").hidden = false;
  if (player) player.intro(true);
  const w = $("introWord"), say = (t) => { w.style.opacity = "0"; setTimeout(() => { w.textContent = t; w.style.opacity = "1"; }, 250); };
  w.textContent = ""; say("Breathe in as it rises…");
  introTimers = [setTimeout(() => say("…and out as it falls."), 4000), setTimeout(endIntro, 9300)];
  ready().catch(() => {});
}
async function endIntro() {
  if (!introOn) return; introOn = false; introTimers.forEach(clearTimeout);
  $("intro").hidden = true;
  try { await ready(); if (player) player.intro(false); begin(0); }
  catch (_) { showScreen("startScr"); $(START_LBL).textContent = "The session didn't load. Check your connection and try again."; }
}
$("introSkip").addEventListener("click", endIntro);
function begin(from) {
  hideScreens(); $("intro").hidden = true; closeSave();
  $(START_LBL).textContent = "";
  body.classList.remove("calm-start"); restSphere(null); sphereUp(false);
  if (VAR.feather) { clearTimeout(begin.ft); body.classList.add("growing"); begin.ft = setTimeout(() => body.classList.remove("growing"), 1100); }
  // d, e: start at the session's startAt (1 s before Edvin's first word), fading the sound in over 1 s
  const ws = VAR.openings && (VAR.edge && HOOK && HOOK.start_f && HOOK.session === selected ? HOOK.start_f : bySlug(selected) && bySlug(selected).web_start_f);   // f: skip an opening line that doesn't fit the moment
  const wc = SEEN && bySlug(selected) && bySlug(selected).web_continue_f;
  const at0 = !from && VAR.fast ? (wc > 0 ? wc : ws != null && ws > 0 ? ws : player.startAt) : (from || 0);
  if (!from && VAR.fast && at0 > 0) { try { audio.volume = 0; const t0 = performance.now(); const up = () => { const u = Math.min(1, (performance.now() - t0) / 1000); try { audio.volume = u; } catch (_) {} if (u < 1) requestAnimationFrame(up); }; requestAnimationFrame(up); } catch (_) {} }
  if (!from && VAR.safety === "caption") { const c = $("safeCap"); c.hidden = false; c.classList.remove("out"); setTimeout(() => c.classList.add("out"), 2600); setTimeout(() => { c.hidden = true; }, 3400); }
  wireCtlApp();
  const pr = player.start(at0);
  if (VAR.does) { const s = bySlug(selected); $("ttlK").textContent = "With " + guideOf(selected) + " · 6 min"; $("ttlT").textContent = s.choice; }   // one name per session
  if (pr && pr.catch) pr.catch(() => { player.exit(); showScreen("startScr"); $(START_LBL).textContent = "Tap start again to turn the sound on."; });
  if (!from) { finished = false; if (!started) { started = true; } track.start(params()); }
  requestWake();
}
$(START_BTN).addEventListener("click", () => play(0));
$("againBtn").addEventListener("click", () => play(0));
let exitAt = 0;
$("resumeBtn").addEventListener("click", () => play(exitAt));
$("exitStart").addEventListener("click", () => { restSphere(null); showScreen("startScr"); if (VAR.y) { body.classList.add("calm-start"); sphereUp(true); } if (VAR.g) gReset(); });

// g: a quiet "Continue in the app" in the controls (shown on tap); nothing visible while breathing
function wireCtlApp() {
  if (!VAR.g) return; const link = oneLink({ session: selected, completed: false, assignment: null, at: "in_session" });
  wireApp($("ctlApp"), link, () => ({ ...params(), completed: 0 }));
}
function showEndQr(assigned) {
  const box = $("endQr"), desk = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 700px)").matches;
  box.hidden = !desk || !!assigned;   // while an offer is live the link carries a token, so the prebuilt QR isn't shown
  [...box.querySelectorAll("figure")].forEach((f) => { f.hidden = f.dataset.slug !== selected; });
}
function tick(at) {
  if (!oneMin && at >= 60) { oneMin = true; track.oneMinute(params()); }
  // the goal marker (only an arm that has progress copy, only while its offer is live): "3 min to go · 30 days waiting"
  const arm = VAR.offerAtStart && assignment && assignment.armDef;
  if (arm && arm.progress_en && player) {
    const min = Math.max(1, Math.ceil((player.dur - at) / 60)), t = ((LANG === "sv" && arm.progress_sv) || arm.progress_en).replace("{min}", min);
    if ($("goal").textContent !== t) $("goal").textContent = t; $("goal").hidden = false;
  }
}
// the offer at the start (variants a, b, c): the arm is drawn on landing while an offer is live; control sees nothing new
async function showOfferAtStart() {
  if (!VAR.offerAtStart) return;
  const offer = await loadOffer(selected);
  assignment = assign(offer);
  const arm = assignment && assignment.armDef, el = $(VAR.y ? "offerStartY" : "offerStart");
  if (arm && arm.start_en) { el.textContent = (LANG === "sv" && arm.start_sv) || arm.start_en; el.hidden = false; } else el.hidden = true;
}
showOfferAtStart();
function onEvent(ev) {
  if (!firstHold && (ev.type === "hold" || ev.type === "holdEmpty")) { firstHold = true; track.firstHold(params()); }
}
function requestWake() { /* the player holds the wake lock while audio plays */ }

// ---------- screens ----------
const screens = ["startScr", "endScr", "exitScr"];
function hideScreens() { screens.forEach((id) => { $(id).classList.add("gone"); $(id).setAttribute("aria-hidden", "true"); }); }
function showScreen(id) {
  hideScreens(); $(id).classList.remove("gone"); $(id).removeAttribute("aria-hidden"); $("goal").hidden = true;
  const h = [...$(id).querySelectorAll("h1")].find((x) => x.offsetParent !== null); if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (_) {} }
}
function setTitles() { document.querySelectorAll("[data-title]").forEach((el) => { el.textContent = VAR.does ? bySlug(selected).choice : bySlug(selected).title; }); }
function wireApp(el, link, tapParams) {
  if (!link) { el.hidden = true; return; }
  el.hidden = false; el.href = link;
  el.onclick = () => track.appTap(tapParams());
}

async function finish() {
  if (finished) return; finished = true;
  setTitles();
  const s = bySlug(selected);
  $("endNext").textContent = (VAR.moment && s.next_f_en) || s.next_en;
  // the offer: read (or the built-in file), draw the arm once; standard copy whenever nothing is live
  $("endOffer").textContent = pick(STANDARD, "copy", LANG);
  $("endCode").hidden = true;
  wireApp($("endApp"), oneLink({ session: selected, completed: true, assignment: null }), () => ({ ...params(), completed: 1 }));
  showScreen("endScr"); showEndQr(false); restSphere("endScr");
  const offer = await loadOffer(selected);
  assignment = assign(offer);
  if (assignment) {
    const arm = assignment.armDef;
    $("endOffer").textContent = (LANG === "sv" && arm.copy_sv) || arm.copy_en;
    if (arm.show_code) {
      const code = shortCodeOf(assignment);
      $("endCode").hidden = false;
      $("endCode").textContent = (LANG === "sv" ? "Ange koden när du skapar ditt konto: " : "Enter this code when you sign up: ") + code;
    }
    wireApp($("endApp"), oneLink({ session: selected, completed: true, assignment }), () => ({ ...params(), completed: 1 }));
    showEndQr(true);
  }
  track.finish(params());
}

function exitEarly(at) {
  exitAt = at || 0;
  if (VAR.y) body.classList.add("calm-start");
  const dur = player ? player.dur : 340;
  if (exitAt >= dur - 15) { finish(); return; }          // left during the last goodbye: that counts as finished
  setTitles();
  wireApp($("exitApp"), oneLink({ session: selected, completed: false, assignment: null }), () => ({ ...params(), completed: 0 }));
  showScreen("exitScr"); restSphere("exitScr");
  // d, e: leaving in the first minute often means "not now": offer to save it
  if (VAR.g) { $("exitSave").hidden = false; return; }   // g: the exit sheet offers the app and save for later, nothing opens by itself
  if (VAR.y) { $("exitSave").hidden = false; if (exitAt < 60) openSave("Want to come back to it later?"); }
}

// ---------- d, e: the sphere whole and smaller, in the free space between the subline and the tiles ----------
// The room's canvases move and scale as one (the player measures the canvas, so words and rings follow); Start
// removes the transform, so the sphere grows into its session size from where it was.
const ROOM = ["silk", "stage"].map($);
function placeSphere() {
  if (!VAR.y) return;
  const up = body.classList.contains("sphere-up");
  if (!up) { ROOM.forEach((el) => { el.style.transform = ""; }); return; }
  if (VAR.g) {   // g: the sphere stays where the session has it, a little smaller, so Begin grows it into the session
    const H = innerHeight, U = Math.min(innerWidth, H * .5625), cy0 = H / 2 - .1 * U, sg = .9, tyg = (cy0 - H / 2) * (1 - sg);
    body.style.setProperty("--orb-y", cy0.toFixed(0) + "px"); body.style.setProperty("--orb-r", (.2 * U * sg).toFixed(0) + "px");
    ROOM.forEach((el) => { el.style.transformOrigin = "50% 50%"; el.style.transform = `translateY(${tyg.toFixed(1)}px) scale(${sg})`; }); return;
  }
  const top = $("ySub").getBoundingClientRect().bottom, bottom = $("choicesY").getBoundingClientRect().top;
  if (!(bottom > top)) return;
  const W = innerWidth, H = innerHeight, U = Math.min(W, H * .5625), cy0 = H / 2 - .1 * U;
  const r = .20 * U, space = bottom - top, s = Math.max(.55, Math.min(1, (space - 24) / (2 * r))), cy = (top + bottom) / 2;
  // scale about the canvas centre (so the player's own geometry, measured from the canvas box, stays exact)
  const ty = cy - H / 2 - s * (cy0 - H / 2);
  ROOM.forEach((el) => { el.style.transformOrigin = "50% 50%"; el.style.transform = `translateY(${ty.toFixed(1)}px) scale(${s.toFixed(3)})`; });
}
function sphereUp(on) {
  if (!VAR.y) return;
  body.classList.toggle("sphere-up", on); placeSphere();
  // keep the player's measurements in step while the transform eases (about 1 s)
  const t0 = performance.now(); const step = () => { if (player && player.relayout) player.relayout(); if (performance.now() - t0 < 1300) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
addEventListener("resize", placeSphere);

// ---------- end and exit: the orb rests smaller, above the words, with a clear gap before the headline ----------
// (Round 2, PR 1.) The same transform as the start's sphere; the screen's scrim starts just above the headline, so the
// words sit on a calm, dimmed field. restSphere(null) hands the sphere back to the session / start layout.
let restOn = null;
function restSphere(id) {
  restOn = id;
  const scr = id && $(id), h = scr && [...scr.querySelectorAll("h1")].find((x) => x.offsetParent !== null);
  body.classList.toggle("orb-rest", !!h);
  if (!h) { ROOM.forEach((el) => { el.style.transform = ""; }); return; }
  const H = innerHeight, U = Math.min(innerWidth, H * .5625), cy0 = H / 2 - .1 * U, r = .2 * U;
  const hTop = h.getBoundingClientRect().top;
  scr.style.setProperty("--scrim-top", Math.max(0, hTop - 56).toFixed(0) + "px");
  const top = (parseFloat(getComputedStyle($("brand")).top) || 6) + 52, bottom = hTop - 32;   // under the logo; 32 px clear above the headline
  const s = Math.max(.3, Math.min(.72, (bottom - top) / (2 * r))), cy = Math.max(top + r * s, (top + bottom) / 2);
  const ty = cy - H / 2 - s * (cy0 - H / 2);
  ROOM.forEach((el) => { el.style.transformOrigin = "50% 50%"; el.style.transform = `translateY(${ty.toFixed(1)}px) scale(${s.toFixed(3)})`; });
  const t0 = performance.now(); const step = () => { if (player && player.relayout) player.relayout(); if (performance.now() - t0 < 1300) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
addEventListener("resize", () => { if (restOn) restSphere(restOn); });

// ---------- save for later (d, e): the app, a reminder, or the link ----------
const inApp = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Bytedance|Snapchat|LinkedInApp/i.test(navigator.userAgent);
const savedUrl = (slug) => location.origin + "/breathe?s=" + slug + "&src=saved";
const pad = (n) => String(n).padStart(2, "0");
const calStamp = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
function reminderTime(slug) {   // the next 08:00 for Wake up, else the next 20:00, in the visitor's own time
  if (VAR.moment) {   // f: later today, in two hours (before 21:00), else tomorrow at this time
    const n = new Date(), t = new Date(n.getTime() + 2 * 3600000);
    if (t.getHours() >= 7 && t.getHours() < 21 && t.getDate() === n.getDate()) return { t, label: "Remind me in 2 hours" };
    const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, n.getHours(), n.getMinutes() < 30 ? 0 : 30, 0); return { t: m, label: "Remind me tomorrow at " + pad(m.getHours()) + ":" + pad(m.getMinutes()) };
  }
  const h = slug === "wake-up" ? 8 : 20, d = new Date(), t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0);
  const today = t > d; if (!today) t.setDate(t.getDate() + 1);
  return { t, label: slug === "wake-up" ? (today ? "Remind me this morning" : "Remind me tomorrow morning") : (today ? "Remind me tonight" : "Remind me tomorrow evening") };
}
function openSave(title) {
  const s = bySlug(selected), url = savedUrl(selected), r = reminderTime(selected), end = new Date(r.t.getTime() + 6 * 60000);
  const g = guideOf(selected), name = "Breathe with " + g + ": " + (VAR.does ? s.choice : s.title) + ", 6 min", details = "Your 6-minute session with " + g + ": " + url;
  $("saveH").textContent = title || "Save it for later";
  $("saveSub").textContent = VAR.does ? s.choice + " · 6 min with " + guideOf(selected) : s.choice + " · " + s.title + " · 6 min"; $("saveDone").hidden = true;
  const app = oneLink({ session: selected, completed: false, assignment: null, at: "saved" });
  if (app) { $("saveApp").hidden = false; $("saveApp").href = app; } else $("saveApp").hidden = true;
  $("saveCalT").textContent = r.label;
  $("saveCal").href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(name) + "&dates=" + calStamp(r.t) + "/" + calStamp(end) + "&details=" + encodeURIComponent(details);
  // an .ics file where downloads work; in-app browsers (Instagram, Facebook, TikTok) don't save files, so only Google there
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WeHale//breathe//EN", "BEGIN:VEVENT", "UID:" + Date.now() + "-" + selected + "@wehale.io",
    "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", "DTSTART:" + calStamp(r.t), "DTEND:" + calStamp(end),
    "SUMMARY:" + name, "DESCRIPTION:" + details, "URL:" + url, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  $("saveIcs").hidden = inApp; $("saveIcs").href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  $("saveCopyT").textContent = navigator.share ? "Share or copy the link" : "Copy link"; $("saveCopyS").textContent = "Open this page again when you're ready";
  $("saveScrim").hidden = false; $("saveSheet").hidden = false;
  requestAnimationFrame(() => { $("saveSheet").classList.add("open"); $("saveScrim").classList.add("on"); });
  try { $("saveSheet").querySelector(".sopt").focus({ preventScroll: true }); } catch (_) {}
}
function closeSave() { $("saveSheet").classList.remove("open"); $("saveScrim").classList.remove("on"); setTimeout(() => { $("saveSheet").hidden = true; $("saveScrim").hidden = true; }, 300); }
const saved = (option) => track.saveForLater({ ...params(), option });
// each option says what happened
function confirmSave(text) { const d = $("saveDone"); d.textContent = text; d.hidden = false; d.classList.remove("pop"); void d.offsetWidth; d.classList.add("pop"); }
$("saveBtn").addEventListener("click", () => openSave());
$("exitSave").addEventListener("click", () => openSave("Want to come back to it later?"));
$("saveClose").addEventListener("click", closeSave); $("saveScrim").addEventListener("click", closeSave);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("saveSheet").hidden) closeSave(); });
$("saveApp").addEventListener("click", () => saved("app"));
$("saveCal").addEventListener("click", () => { saved("calendar"); confirmSave("Opened in Google Calendar: tap Save there to add it"); });
$("saveIcs").addEventListener("click", () => { saved("ics"); confirmSave("Calendar file ready: open it to add the reminder"); });
$("saveCopy").addEventListener("click", async () => {
  const url = savedUrl(selected), done = (t) => { $("saveCopyT").textContent = t; };
  if (navigator.share) { try { await navigator.share({ title: "Breathe with " + guideOf(selected), text: "A 6-minute session with " + guideOf(selected) + ", for later.", url }); saved("share"); confirmSave("Link shared"); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch (_) {
    try { const t = document.createElement("textarea"); t.value = url; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); ok = document.execCommand("copy"); t.remove(); } catch (_) {}
  }
  done(ok ? "Link copied" : url); if (ok) { saved("copy"); confirmSave("Link copied. Open it when you're ready."); }
});

// ---------- consent: the site's shared banner (src/components/site/ConsentBanner.astro), never over the session ----------
initMeasurement();

if (Q.get("src") === "saved") track.returnFromSaved(params());
onConsent((c) => { if (c === "granted" && Q.get("src") === "saved") track.returnFromSaved(params()); });

// ---------- g: the carousel of worlds, the press that breathes in, and the one motion into the session ----------
// The room (both canvases) follows the finger, the ground light at .4 (parallax), the line at .6; a spring snaps it to
// a session. Gestures start 24 px in from the edges (the in-app browsers' back swipe). touch-action: none on the screen.
const G_ORDER = SESSIONS.filter((x) => x.ready).map((x) => x.slug);
let gx = 0, gAnim = 0, gDrag = null, gHold = null, gSwell = 1, gSwellAnim = 0, gBusy = false;
function gApply(x) {
  gx = x; const W = innerWidth;
  ROOM.forEach((el) => { el.style.translate = x.toFixed(1) + "px 0"; });
  $("poster").style.translate = (x * .4).toFixed(1) + "px 0";
  const lede = document.querySelector(".ylede"); lede.style.translate = (x * .6).toFixed(1) + "px 0";
  lede.style.opacity = String(Math.max(0, 1 - Math.abs(x) / (W * .4)).toFixed(3));
}
function gSpring(target, v0, done) {   // a damped spring (k 260, 85 % of critical damping), not a linear slide
  cancelAnimationFrame(gAnim); let x = gx, v = v0 || 0, last = performance.now();
  const k = 260, c = 2 * Math.sqrt(k) * .85;
  const step = (t) => { const h = Math.min(.032, Math.max(.001, (t - last) / 1000)); last = t; v += (-k * (x - target) - c * v) * h; x += v * h; gApply(x);
    if (Math.abs(x - target) < .5 && Math.abs(v) < 8) { gApply(target); if (done) done(); return; } gAnim = requestAnimationFrame(step); };
  gAnim = requestAnimationFrame(step);
}
function gScale(to, ms) {   // the swell (an inhale under the finger) and its release
  cancelAnimationFrame(gSwellAnim); const from = gSwell, t0 = performance.now();
  const step = (t) => { const u = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - u, 3); gSwell = from + (to - from) * e;
    ROOM.forEach((el) => { el.style.scale = gSwell.toFixed(4); }); if (u < 1) gSwellAnim = requestAnimationFrame(step); };
  gSwellAnim = requestAnimationFrame(step);
}
function gDots() {
  const i = G_ORDER.indexOf(selected);
  [...$("gDots").children].forEach((d, j) => d.classList.toggle("on", j === i));
  $("gPrev").disabled = i <= 0; $("gNext").disabled = i >= G_ORDER.length - 1;
  $("gLive").textContent = bySlug(selected).choice + ", " + (i + 1) + " of " + G_ORDER.length;
}
function gPick(slug) {
  const el = choiceEls.find((c) => c.dataset.slug === slug); if (el) el.click();
  try { if (navigator.vibrate) navigator.vibrate(8); } catch (_) {}   // a light tick where it exists (not iOS)
  gDots();
}
function gHideHint() { const h = $("gHint"); if (h) h.classList.add("out"); }
function gStep(dir, v) {
  if (gBusy) return; const i = G_ORDER.indexOf(selected), j = i + dir, W = innerWidth; gHideHint();
  if (j < 0 || j >= G_ORDER.length) { gSpring(0, v); return; }   // the ends give a little and come back
  gBusy = true;
  gSpring(-dir * W * .5, v, () => { gPick(G_ORDER[j]); gApply(dir * W * .42); gSpring(0, 0, () => { gBusy = false; }); });
}
function gGeom() { const cs = getComputedStyle(body); return { x: innerWidth / 2, y: parseFloat(cs.getPropertyValue("--orb-y")) || innerHeight * .45, r: parseFloat(cs.getPropertyValue("--orb-r")) || 70 }; }
function gOnSphere(e) { const g = gGeom(), dx = e.clientX - g.x, dy = e.clientY - g.y; return dx * dx + dy * dy <= Math.pow(g.r * 1.3, 2); }
function gHoldStart() {
  gHold = { t0: performance.now(), u: 0 }; body.classList.add("g-holding");
  const step = () => { if (!gHold) return; const u = Math.min(1, (performance.now() - gHold.t0) / 1200); gHold.u = u;
    gSwell = 1 + .08 * (1 - Math.pow(1 - u, 2)); ROOM.forEach((el) => { el.style.scale = gSwell.toFixed(4); });
    $("gRing").style.setProperty("--hold", u.toFixed(3));
    if (u < 1) gHold.raf = requestAnimationFrame(step); else { body.classList.add("g-full"); try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {} } };
  gHold.raf = requestAnimationFrame(step);
}
function gHoldEnd(begin) {
  if (!gHold) return false; const full = gHold.u >= 1; cancelAnimationFrame(gHold.raf); gHold = null;
  body.classList.remove("g-holding", "g-full"); $("gRing").style.setProperty("--hold", "0");
  if (full && begin) { play(0); return true; }
  gScale(1, 500); if (begin) $("gHoldHint").classList.add("nudge"); return false;
}
function gGo() {   // the start screen dissolves at once; the sphere exhales and grows into the session
  body.classList.add("g-going"); gHideHint();
  gScale(1, 700);
  const t0 = performance.now(), from = window.__breatheSparse || .35;
  const up = (t) => { const u = Math.min(1, (t - t0) / 1400); window.__breatheSparse = from + (1 - from) * u; if (u < 1) requestAnimationFrame(up); }; requestAnimationFrame(up);
}
function gFail() {   // g hides the start label; bring the screen back with the message instead of a silent Begin
  body.classList.remove("g-going"); body.classList.add("g-fail"); window.__breatheSparse = .35;
}
function gReset() { body.classList.remove("g-going"); window.__breatheSparse = .35; gApply(0); gScale(1, 10); }
if (VAR.g) {
  window.__breatheSparse = .35;
  const scr = $("startScr"), EDGE = 24;
  $("choicesY").hidden = true; ["saveBtn", "offerStartY"].forEach((id) => { $(id).hidden = true; });
  gDots();
  scr.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || scr.classList.contains("gone")) return;
    if (e.target.closest("button, a, .whc")) return;
    if (e.clientX < EDGE || e.clientX > innerWidth - EDGE) return;
    gDrag = { x0: e.clientX, y0: e.clientY, id: e.pointerId, moved: false, sphere: gOnSphere(e), hist: [[performance.now(), e.clientX]] };
    cancelAnimationFrame(gAnim); try { scr.setPointerCapture(e.pointerId); } catch (_) {}
    if (gDrag.sphere) { if (VAR.hold) gHoldStart(); else gScale(1.04, 180); }
  });
  scr.addEventListener("pointermove", (e) => {
    if (!gDrag || e.pointerId !== gDrag.id || gBusy) return;
    const mx = e.clientX - gDrag.x0;
    if (!gDrag.moved && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(e.clientY - gDrag.y0)) { gDrag.moved = true; gHoldEnd(false); gScale(1, 200); gHideHint(); }
    if (!gDrag.moved) return;
    const i = G_ORDER.indexOf(selected); let x = mx; if ((i === 0 && x > 0) || (i === G_ORDER.length - 1 && x < 0)) x *= .3;
    gApply(x); gDrag.hist.push([performance.now(), e.clientX]); if (gDrag.hist.length > 6) gDrag.hist.shift();
  });
  const end = (e, cancel) => {
    if (!gDrag || e.pointerId !== gDrag.id) return; const d = gDrag; gDrag = null;
    if (d.moved) {
      const h = d.hist, a = h[0], b = h[h.length - 1], v = b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) * 1000 : 0;   // px/s
      if (!cancel && (Math.abs(gx) > innerWidth * .2 || Math.abs(v) > 450)) gStep(gx < 0 || (Math.abs(gx) < 10 && v < 0) ? 1 : -1, v); else gSpring(0, v);
      return;
    }
    if (cancel) { gHoldEnd(false); gScale(1, 300); return; }
    if (VAR.hold) { gHoldEnd(true); return; }
    if (d.sphere) play(0); else gScale(1, 200);   // g1: a tap on the light begins
  };
  scr.addEventListener("pointerup", (e) => end(e, false));
  scr.addEventListener("pointercancel", (e) => end(e, true));
  $("gPrev").addEventListener("click", () => gStep(-1, 0)); $("gNext").addEventListener("click", () => gStep(1, 0));
  addEventListener("keydown", (e) => {
    if (scr.classList.contains("gone") || !$("saveSheet").hidden || !/^Arrow(Left|Right)$/.test(e.key)) return;
    e.preventDefault(); gStep(e.key === "ArrowRight" ? 1 : -1, 0);
  });
  // Begin: the light swells while the button is pressed, and exhales into the session on release
  $(START_BTN).addEventListener("pointerdown", () => gScale(1.05, 260));
  $(START_BTN).addEventListener("pointerleave", () => { if (!body.classList.contains("g-going")) gScale(1, 300); });
  $("gSave").addEventListener("click", () => openSave());
  // the swipe hint: first visit only, fades after 2 s or at the first swipe; g2 also says the light can be held
  let seen = false; try { seen = localStorage.getItem("wehale.breathe.swipehint") === "1"; localStorage.setItem("wehale.breathe.swipehint", "1"); } catch (_) {}
  if (seen || Q.get("hint") === "0") $("gHint").hidden = true; else setTimeout(gHideHint, 3200);
  if (VAR.hold) $("gHoldHint").hidden = false;
}

// ---------- the way home (Round 2, PR 1): the logo, "‹ wehale.io" and "Back to wehale.io" ----------
// Opened from our home page: go back, so the home page returns at the same place. Otherwise a plain link to /.
// During the session the logo leaves the way the leave control does (the exit screen, nothing lost).
const fromHome = (() => { try { const r = new URL(document.referrer); return r.origin === location.origin && r.pathname === "/"; } catch (_) { return false; } })();
document.querySelectorAll("[data-home]").forEach((a) => a.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (body.classList.contains("in-session")) { e.preventDefault(); $("closeBtn").click(); return; }
  if (fromHome && history.length > 1) { e.preventDefault(); history.back(); }
}));

// test hooks for the preview checks (no effect for visitors)
window.__breathe = { openSave, get player() { return player; }, loadPlayer, timeSlug, get selected() { return selected; }, finish, exitEarly };
