# Partner pages

One JSON file here = one page at `wehale.io/for/<slug>`. Copy `studio-frid.json`, change the
values, commit, push. Netlify rebuilds in about a minute. `/for` without a slug is the generic page.

Fields are documented in `src/lib/partner.ts`. Anything left out falls back to the generic
defaults, so a minimal file is `slug`, `name`, `teamCode` and their two numbers
(`avgOrder`, `ordersPerMonth`).

The pages are invitation-only while the model is piloted: `noindex` on the route, a shared
password in front (`src/components/partner/Gate.astro`), and the slug is the only address.
Phase 2 moves this data into the admin panel's Partners page (CR-0.20).
