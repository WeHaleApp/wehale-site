# Components (conceptual breakdown)

This project is plain static HTML (no framework). Components are represented as sections in `pages/index.html`.

## Component list

- `SiteHeader`
  - brand wordmark + minimal nav + 1 primary CTA

- `Hero`
  - cinematic background image
  - eyebrow + headline + single-sentence subhead
  - 1 primary CTA + 1 secondary

- `Pillars`
  - three cards: Calm / Clarity / Connection

- `UseCases`
  - short use contexts with time ranges

- `HowItWorks`
  - 3-step ordered list + safety note

- `WhyBreathwork`
  - compact bullets + one pull-quote

- `Stories`
  - 3 short testimonials (quiet social proof)

- `FinalCTA`
  - repeat core emotional promise + primary CTA

- `SiteFooter`
  - minimal links + legal placeholders

If you want actual file-based components (partials), add a tiny build step (e.g. Eleventy, Astro, or a simple Node include script). Not included in this first pass by request.
