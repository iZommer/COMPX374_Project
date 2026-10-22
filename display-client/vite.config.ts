/**
 * display-client/vite.config.ts
 *
 * Purpose: Configures the browser bundle entry, public assets, and output directory for the display client.
 */
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  publicDir: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/local": "http://127.0.0.1:3000",
    },
  },
});
