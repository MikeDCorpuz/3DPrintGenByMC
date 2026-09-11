import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths so the app works from Electron file:// and Azure root.
  base: "./",
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["manifold-3d"],
  },
});
