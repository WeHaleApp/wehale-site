// /breathe page controller: the picker, the lazy player, the end and exit screens, consent and events.
// The player (WebGL, ~25 KB gzipped) is imported after first paint; the score is fetched on idle; the audio
// streams only after the Play tap.
import { MORNING_ENDS, DAYTIME_ENDS, META_PIXEL_ID, META_CAPI_URL } from "./config.js";
import { initMeasurement, consent, setConsent, track } from "./measure.js";
import { STANDARD, loadOffer, assign, storedAssignment, shortCodeOf, pick, oneLink } from "./offers.js";
import SESSIONS_FILE from "../../data/breathe-sessions.json";

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const SESSIONS = (window.__BREATHE_SESSIONS || SESSIONS_FILE.sessions);
const bySlug = (s) => SESSIONS.find((x) => x.slug === s);
const LANG = (Q.get("lang") || document.documentElement.lang || "en").slice(0, 2) === "sv" ? "sv" : "en";
const audio = $("round");
const body = document.body;

// ---------- where the visitor came from (no personal data) ----------
const source = (() => {
  const u = Q.get("utm_source"); if (u) return u.slice(0, 40);
  if (Q.get("fbclid")) return "meta";
  if (Q.get("ttclid")) return "tiktok";
  try { if (document.referrer) return new URL(document.referrer).hostname.slice(0, 60); } catch (_) {}
  return "direct";
})();

// ---------- which session: ?s= (the ad link) skips the question; otherwise the local time preselects ----------
export function timeSlug(h) { return h < MORNING_ENDS ? "wake-up" : h < DAYTIME_ENDS ? "unravel" : "soft-reboot"; }
const hour = (() => { const f = +Q.get("hour"); return Q.has("hour") && f >= 0 && f < 24 ? f : new Date().getHours(); })(); // ?hour= is a test hook
const fromAd = bySlug(Q.get("s") || "") ? Q.get("s") : null;
const wanted = fromAd || timeSlug(hour);
// a session without its files yet shows "Coming soon"; the preselect then falls back to the first ready one
let selected = (bySlug(wanted) && bySlug(wanted).ready) ? wanted : (SESSIONS.find((s) => s.ready) || SESSIONS[0]).slug;
body.dataset.wanted = wanted;

const choiceEls = [...document.querySelectorAll(".choice")];
function renderChoice() {
  const s = bySlug(selected);
  choiceEls.forEach((el) => el.setAttribute("aria-checked", String(el.dataset.slug === selected)));
  $("startTitle").textContent = s.title;
  $("startBtn").setAttribute("aria-label", "Play " + s.title);
  $("startBtn").disabled = !s.ready;
  body.dataset.selected = selected;
}
choiceEls.forEach((el) => el.addEventListener("click", () => {
  if (el.dataset.ready !== "1") { $("startLbl").textContent = bySlug(el.dataset.slug).title + " is coming soon."; return; }
  if (selected !== el.dataset.slug) { selected = el.dataset.slug; renderChoice(); prefetchScore(selected); }
  $("startLbl").textContent = "";
  track.picked(params());
}));
// the radio group: arrow keys move the choice
$("choices").addEventListener("keydown", (e) => {
  if (!/Arrow(Left|Right|Up|Down)/.test(e.key)) return; e.preventDefault();
  const ready = choiceEls.filter((c) => c.dataset.ready === "1"); const i = ready.findIndex((c) => c.dataset.slug === selected);
  const n = ready[(i + (/Right|Down/.test(e.key) ? 1 : ready.length - 1)) % ready.length]; if (n) { n.click(); n.focus(); }
});
if (fromAd && bySlug(fromAd).ready) {
  $("choices").hidden = true; $("changeBtn").hidden = false;
  $("startH").textContent = bySlug(fromAd).title;
  $("changeBtn").addEventListener("click", () => { $("choices").hidden = false; $("changeBtn").hidden = true; $("startH").textContent = "What do you need right now?"; });
}
renderChoice();

// ---------- event params: {session, arm, source}; assignment_id once an offer arm exists ----------
let assignment = null;
function params() {
  const a = assignment || storedAssignment();
  const p = { session: selected, arm: a ? a.arm : "none", source };
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
let player = null, playerSlug = null, loading = null;
function loadPlayer() {
  if (loading) return loading;
  loading = Promise.all([import("./player.js"), prefetchScore(selected)]).then(([mod, score]) => {
    playerSlug = score.slug || selected;
    player = mod.createPlayer({
      score, audio,
      onTick: tick, onEvent: onEvent, onFinish: finish, onExit: exitEarly,
    });
    body.classList.add("gl-on"); body.dataset.tier = player.tier;
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
async function play(from) {
  const s = bySlug(selected); if (!s || !s.ready) return;
  const src = audioSrc(selected);
  if (!audio.src.endsWith(src)) { audio.src = src; audio.preload = "auto"; }
  if (player && playerSlug === selected) { begin(from); return; }
  // not ready yet (slow network, or another session): unlock the audio inside this tap, then start when loaded
  $("startBtn").setAttribute("aria-busy", "true"); $("startLbl").textContent = "Getting the session ready…";
  try { const pr = audio.play(); if (pr && pr.then) pr.then(() => audio.pause(), () => {}); } catch (_) {}
  try {
    await loadPlayer();
    if (playerSlug !== selected) { const sc = await prefetchScore(selected); player.setScore(sc); playerSlug = selected; }
    begin(from);
  } catch (_) {
    $("startLbl").textContent = "The session didn't load. Check your connection and try again.";
  } finally { $("startBtn").removeAttribute("aria-busy"); }
}
function begin(from) {
  hideScreens();
  $("startLbl").textContent = "";
  const pr = player.start(from || 0);
  if (pr && pr.catch) pr.catch(() => { player.exit(); showScreen("startScr"); $("startLbl").textContent = "Tap play again to start the sound."; });
  if (!from) { finished = false; if (!started) { started = true; } track.start(params()); }
  requestWake();
}
$("startBtn").addEventListener("click", () => play(0));
$("againBtn").addEventListener("click", () => play(0));
let exitAt = 0;
$("resumeBtn").addEventListener("click", () => play(exitAt));
$("exitStart").addEventListener("click", () => { showScreen("startScr"); });

function tick(at) {
  if (!oneMin && at >= 60) { oneMin = true; track.oneMinute(params()); }
}
function onEvent(ev) {
  if (!firstHold && (ev.type === "hold" || ev.type === "holdEmpty")) { firstHold = true; track.firstHold(params()); }
}
function requestWake() { /* the player holds the wake lock while audio plays */ }

// ---------- screens ----------
const screens = ["startScr", "endScr", "exitScr"];
function hideScreens() { screens.forEach((id) => { $(id).classList.add("gone"); $(id).setAttribute("aria-hidden", "true"); }); }
function showScreen(id) {
  hideScreens(); $(id).classList.remove("gone"); $(id).removeAttribute("aria-hidden");
  const h = $(id).querySelector("h1"); if (h) { h.setAttribute("tabindex", "-1"); try { h.focus({ preventScroll: true }); } catch (_) {} }
}
function setTitles() { document.querySelectorAll("[data-title]").forEach((el) => { el.textContent = bySlug(selected).title; }); }
function wireApp(el, link, tapParams) {
  if (!link) { el.hidden = true; return; }
  el.hidden = false; el.href = link;
  el.onclick = () => track.appTap(tapParams());
}

async function finish() {
  if (finished) return; finished = true;
  setTitles();
  const s = bySlug(selected);
  $("endNext").textContent = s.next_en;
  // the offer: read (or the built-in file), draw the arm once; standard copy whenever nothing is live
  $("endOffer").textContent = pick(STANDARD, "copy", LANG);
  $("endCode").hidden = true;
  $("endAppLine").textContent = pick(STANDARD, "app_line", LANG);
  wireApp($("endApp"), oneLink({ session: selected, completed: true, assignment: null }), () => ({ ...params(), completed: 1 }));
  showScreen("endScr");
  const offer = await loadOffer(selected);
  assignment = assign(offer);
  if (assignment) {
    const arm = assignment.armDef;
    $("endOffer").textContent = (LANG === "sv" && arm.copy_sv) || arm.copy_en;
    if (arm.app_line_en) $("endAppLine").textContent = (LANG === "sv" && arm.app_line_sv) || arm.app_line_en;
    if (arm.show_code) {
      const code = shortCodeOf(assignment);
      $("endCode").hidden = false;
      $("endCode").textContent = (LANG === "sv" ? "Ange koden när du skapar ditt konto: " : "Enter this code when you sign up: ") + code;
    }
    wireApp($("endApp"), oneLink({ session: selected, completed: true, assignment }), () => ({ ...params(), completed: 1 }));
  }
  track.finish(params());
}

function exitEarly(at) {
  exitAt = at || 0;
  const dur = player ? player.dur : 340;
  if (exitAt >= dur - 15) { finish(); return; }          // left during the last goodbye: that counts as finished
  setTitles();
  $("exitAppLine").textContent = pick(STANDARD, "app_line", LANG);
  wireApp($("exitApp"), oneLink({ session: selected, completed: false, assignment: null }), () => ({ ...params(), completed: 0 }));
  showScreen("exitScr");
}

// ---------- consent: shown only when something is configured to measure (or ?consent=1 for review) ----------
const T = {
  en: { text: 'May we measure this visit? With your OK, Meta’s pixel tells us which ads bring people here and whether they finish the session. It uses cookies. The session works the same either way. <a href="/privacy">Privacy</a>', yes: "Accept", no: "Decline" },
  sv: { text: 'Får vi mäta besöket? Med ditt ok berättar Metas pixel vilka annonser som leder hit och om sessionen görs klart. Den använder cookies. Sessionen fungerar likadant oavsett. <a href="/privacy">Integritet</a>', yes: "Godkänn", no: "Avböj" },
};
initMeasurement();
const measuring = !!(META_PIXEL_ID || META_CAPI_URL);
if ((measuring || Q.get("consent") === "1") && !consent()) {
  const t = T[LANG];
  $("consentText").innerHTML = t.text; $("consentYes").textContent = t.yes; $("consentNo").textContent = t.no;
  $("consent").lang = LANG; $("consent").hidden = false;
  const done = (c) => { setConsent(c); $("consent").hidden = true; };
  $("consentYes").addEventListener("click", () => done("granted"));
  $("consentNo").addEventListener("click", () => done("denied"));
}

// test hooks for the preview checks (no effect for visitors)
window.__breathe = { get player() { return player; }, loadPlayer, timeSlug, get selected() { return selected; }, finish, exitEarly };
