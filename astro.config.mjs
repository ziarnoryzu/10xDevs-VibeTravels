// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://ziarnoryzu.github.io/10x-project/",
  // base: "/10x-project", // Removed for local development
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
      }),
      SUPABASE_ANON_KEY: envField.string({
        context: "server",
        access: "public",
      }),
      // Server-side only variables
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      DEFAULT_USER_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
    },
  },
});
