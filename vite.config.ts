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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
