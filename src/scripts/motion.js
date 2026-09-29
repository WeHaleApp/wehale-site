// The site's one motion helper, on the app's tokens (src/tokens/motion.ts in wehale-app; mapping in docs/MOTION.md).
// - reveal(): each [data-reveal] group enters once, in reading order within its section (stagger m.stagger, at most 4).
//   Content is visible without JS or with Reduce Motion: the hidden start state exists only under html.motion.
// - press: the app's PressableScale feel on touch (.is-pressed; :active covers mouse and keyboard).
// - swipe rows: dots that follow the scroll position; arrow keys move one card.
export const m = { pressIn: 100, pressOut: 220, fade: 400, enter: 500, stagger: 80, exit: 300, reveal: 800 };
export const curve = { enter: "cubic-bezier(.33,1,.68,1)", exit: "cubic-bezier(.32,0,.67,0)", breath: "cubic-bezier(.37,0,.63,1)" };
export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function reveal(root = document) {
  const els = [...root.querySelectorAll("[data-reveal]")];
  // reading order: number the groups within each section, unless a group sets its own --i
  const bySection = new Map();
  els.forEach((el) => {
    if (el.style.getPropertyValue("--i")) return;
    const s = el.closest("section") || document.body;
    const n = bySection.get(s) || 0; bySection.set(s, n + 1);
    el.style.setProperty("--i", String(Math.min(n, 4)));
  });
  if (!document.documentElement.classList.contains("motion") || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible")); return;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  els.forEach((el) => io.observe(el));
}

export function press(root = document) {
  const sel = ".btn, .btn-quiet, .press-card";
  const clear = () => root.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
  root.addEventListener("pointerdown", (e) => { if (e.pointerType !== "touch") return; const t = e.target.closest(sel); if (t) t.classList.add("is-pressed"); }, { passive: true });
  ["pointerup", "pointercancel", "scroll"].forEach((ev) => root.addEventListener(ev, clear, { passive: true, capture: ev === "scroll" }));
}

export function swipeRows(root = document) {
  root.querySelectorAll("[data-swipe]").forEach((row) => {
    const dots = row.parentElement.querySelector(".dots");
    const items = [...row.children];
    if (dots) dots.innerHTML = items.map(() => "<i></i>").join("");
    const mark = () => {
      const r = row.getBoundingClientRect(), c = r.left + r.width / 2;
      let best = 0, bd = Infinity;
      items.forEach((it, i) => { const b = it.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - c); if (d < bd) { bd = d; best = i; } });
      if (dots) [...dots.children].forEach((d, i) => d.classList.toggle("on", i === best));
    };
    row.addEventListener("scroll", () => requestAnimationFrame(mark), { passive: true });
    row.addEventListener("keydown", (e) => {
      if (!/^Arrow(Left|Right)$/.test(e.key)) return;
      e.preventDefault(); row.scrollBy({ left: (e.key === "ArrowRight" ? 1 : -1) * items[0].clientWidth, behavior: reduced() ? "auto" : "smooth" });
    });
    // the app-screens row starts on its middle phone
    if (row.classList.contains("swipe-phones") && matchMedia("(max-width: 767px)").matches) {
      const mid = items[Math.floor(items.length / 2)];
      if (mid) { const r = row.getBoundingClientRect(), b = mid.getBoundingClientRect(); row.scrollLeft += b.left + b.width / 2 - (r.left + r.width / 2); }
    }
    mark();
  });
}

export function startMotion() { reveal(); press(); swipeRows(); }
