// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://wehale.io",
  trailingSlash: "never",
  build: {
    inlineStylesheets: "auto",
    // "file" emits /about.html instead of /about/index.html so Netlify
    // serves /about with a 200 directly — the directory format caused a
    // 301 redirect on every subpage (trailingSlash mismatch).
    format: "file",
  },
  integrations: [
    sitemap({
      // Out of the sitemap: the 404, the partner pages (/for, unlisted by design, DIRECTION.md §5) if present, and the
      // confidential campaign page (/recharge, docs/recharge/README.md).
      filter: (page) => !/\/404(\.html)?$/.test(page) && !/\/for(\/|$)/.test(page) && !/\/recharge(\/|\.html|$)/.test(page),
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
