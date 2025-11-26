import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".", "node_modules/astro"],
    },
  },
  // Add Astro virtual modules support for tests
  define: {
    "import.meta.env.PROD": false,
    "import.meta.env.DEV": true,
  },
  // Configure for Astro virtual modules
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/", "**/*.d.ts", "**/*.config.*", "**/mockData", "dist/", ".astro/"],
    },
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".astro", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Add Astro virtual modules for testing
      "astro:transitions/client": path.resolve(__dirname, "./test/mocks/astro-transitions-client.ts"),
    },
  },
});
