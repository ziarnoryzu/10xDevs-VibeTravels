// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://10xdevs-vibetravels.pages.dev",
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    // @ts-expect-error - Vite plugin type mismatch between Astro's bundled Vite and @tailwindcss/vite
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
  adapter: process.env.CF_PAGES
    ? cloudflare({
        platformProxy: {
          enabled: true,
        },
      })
    : node({
        mode: "standalone",
      }),
  env: {
    schema: {
      // Public variables (accessible in both client and server)
      SUPABASE_URL: envField.string({
        context: "server",
        access: "public",
        optional: false,
      }),
      SUPABASE_ANON_KEY: envField.string({
        context: "server",
        access: "public",
      }),
      // Server-side only variables
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      OPENROUTER_MODEL: envField.string({
        context: "server",
        access: "public",
        optional: true, // Optional - falls back to claude-3.5-haiku if not set
      }),
    },
  },
});
