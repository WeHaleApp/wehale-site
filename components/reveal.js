// Minimal reveal-on-scroll. No dependencies.
// Adds the class "in" when elements enter the viewport.

(function () {
  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  // Respect reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { root: null, threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
  );

  els.forEach(function (el) { io.observe(el); });
})();
