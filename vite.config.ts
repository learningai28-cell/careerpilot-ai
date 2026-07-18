import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Relative base so built asset paths work whether the app is served
  // from a subpath (e.g. GitHub Pages' <user>.github.io/<repo>/ before a
  // custom domain is attached) or from a domain root (the eventual
  // careerpilot.operix.in setup). Avoids needing to flip this back and
  // forth as the deployment target changes.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
