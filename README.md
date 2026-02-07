# WeHale — Static homepage (v0)

First-pass homepage implementation based on the "cinematic, restrained" brand direction.

## File structure

```
site/
  pages/
    index.html
  styles/
    global.css
  components/
    README.components.md
  assets/
    images/
      hero.jpg   (replace)
      cta.jpg    (replace)
      og.jpg     (optional)
      favicon.png (optional)
    fonts/       (optional)
```

## Design decisions (why it looks this way)

- **Dark, cinematic base:** deep dusk background, high-contrast type, minimal UI chrome.
- **Restraint over "wellness fluff":** short declarative headlines, low-claim language, lots of negative space.
- **Mobile-first:** layout reads cleanly at small widths; expands to multi-column at ~780px.
- **Performance-friendly:** no JS dependencies; one CSS file; images are the only heavy assets.

## Where to swap imagery

Replace these files with on-brand photography/stills:
- `assets/images/hero.jpg` — cinematic dusk/nature/human image with negative space for type.
- `assets/images/cta.jpg` — similar mood (darker), ideally different subject to avoid repetition.

This version also includes:
- `assets/video/brandmovie.mp4` — used as a silent looping texture in the Product Preview section.
- `assets/images/ui/*.png` — app screenshots used as supporting proof (not the hero).

Tips:
- Use low-saturation, high-dynamic-range images.
- Keep highlights subtle; avoid bright daytime shots.
- If text readability suffers, increase the gradient overlay in `.hero-media` / `.cta-media`.

## How to run locally

Any static server works.

Examples:
- Python: `python3 -m http.server` (run from the `site/` folder)
- Node: `npx serve` (run from the `site/` folder)

Then open:
- `http://localhost:8000/pages/` (Python)
- or the URL printed by your server.

## Deployment options

- Netlify / Vercel / Cloudflare Pages: deploy the `site/` directory as static assets.
- S3 + CloudFront: upload `site/` and serve as static website.

## Assumptions

- This is a marketing homepage only (no app/auth flows).
- CTAs are placeholders pointing to `#` or on-page anchors.
- Legal pages (Privacy/Terms) are placeholders.

Next step (when you want it): wire CTAs to real destinations (app store, waitlist, web app) and add a second page for "Sessions" or "About" without changing the visual system.
