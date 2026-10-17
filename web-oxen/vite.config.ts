import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Expose both VITE_* (Vite default) and EXPO_PUBLIC_* (Rork's cross-platform
  // public-env convention, written by tools like getOrCreateAuthConfig).
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
  build: {
    // Generate dedicated chunks for heavy libs so route bundles stay lean.
    // In Vite 8 (rolldown) manualChunks must be a function.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("three") || id.includes("@react-three")) return "three-vendor";
            if (id.includes("framer-motion")) return "motion-vendor";
            if (id.includes("@supabase")) return "supabase-vendor";
            if (id.includes("@tanstack/react-query")) return "query-vendor";
            if (id.includes("@radix-ui") || id.includes("lucide-react")) return "ui-vendor";
            if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/")) return "react-vendor";
          }
          return undefined;
        },
      },
    },
    // Raise the warning ceiling — the three-vendor chunk is large but loaded
    // lazily on the Globe route, so it never blocks initial paint.
    chunkSizeWarningLimit: 900,
    // Full source maps in dev only.
    sourcemap: mode === "development",
    // Target modern browsers for smaller, faster output.
    target: "es2020",
    cssCodeSplit: true,
    // Vite 8 defaults to oxc minifier — no need to specify esbuild.
  },
}));
