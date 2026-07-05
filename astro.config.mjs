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
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
