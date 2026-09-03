# Partner pages

One JSON file here = one page at `wehale.io/for/<slug>`. Copy `studio-frid.json`, change the
values, commit, push. Netlify rebuilds in about a minute. `/for` without a slug is the generic page.

Fields are documented in `src/lib/partner.ts`. Anything left out falls back to the generic
defaults, so a minimal file is `slug`, `name`, `teamCode`, `ownerCode` and their numbers
(`avgOrder`, `ordersPerMonth`, `guestsPerMonth`).

**`models` decides what the page proposes.** Three ways to work together exist: `checkout`
(we finance a discount in their checkout), `referral` (they recommend, we pay X % on what the
guest buys) and `gift` (90 days to their guests, no money). Philip qualifies the partner and
lists only the ways that fit; the page shows those in full, mentions the others in one line, and
the calculators, terms and getting-started timeline follow. `studio-frid.json` proposes all three;
`exempel-instruktor.json` proposes referral and gift only.

The pages are invitation-only while the model is piloted: `noindex` on the route, a shared
password in front (`src/components/partner/Gate.astro`), and the slug is the only address.
Phase 2 moves this data into the admin panel's Partners page (CR-0.20).
