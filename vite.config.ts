import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Absolute base so built asset paths (e.g. /assets/main.js) always
  // resolve correctly regardless of what URL the browser is actually on.
  // This matters because the deploy workflow copies index.html to
  // 404.html so GitHub Pages can serve the app for any client-side route
  // (e.g. /dashboard/resume-analyzer) — that trick only works with
  // absolute paths. A relative base ("./assets/main.js") would resolve
  // against the current (nested) URL instead of the site root, so the
  // JS bundle 404s and the page stays blank. Now that the app is served
  // from the custom domain's root rather than a GitHub Pages subpath,
  // there's no longer a reason for relative paths anyway.
  base: "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendors so they cache independently
        // of app code and load in parallel with the entry chunk.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("posthog-js")) return "vendor-posthog";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("/react-router") || id.includes("/@remix-run/")) return "vendor-router";
          if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) return "vendor-react";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
