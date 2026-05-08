// WeHale — Scroll-driven reveals + header scroll state.
// Supports: [data-reveal], .reveal-scale, .reveal-head
// No dependencies.

(function () {
  // Respect reduced motion
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Reveal on scroll ───
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    if (prefersReduced) {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    } else {
      var revealObs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              revealObs.unobserve(entry.target);
            }
          });
        },
        { root: null, threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
      );
      revealEls.forEach(function (el) { revealObs.observe(el); });
    }
  }

  // ─── Header scroll state ───
  var header = document.querySelector('.site-header');
  if (header && !prefersReduced) {
    var scrolled = false;
    var onScroll = function () {
      var isScrolled = window.scrollY > 40;
      if (isScrolled !== scrolled) {
        scrolled = isScrolled;
        header.classList.toggle('scrolled', isScrolled);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ─── Parallax-like depth on hero ───
  var heroMedia = document.querySelector('.hero-media');
  if (heroMedia && !prefersReduced) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var y = window.scrollY;
          if (y < window.innerHeight) {
            heroMedia.style.transform = 'translateY(' + (y * 0.18) + 'px) scale(' + (1 + y * 0.0001) + ')';
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
})();
