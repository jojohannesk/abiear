import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// Die Goldmaster-Fixtures sind in Europe/Berlin gerechnet; die Prüfungen
// laufen in derselben Zeitzone, egal wo der Rechner steht.
process.env.TZ = "Europe/Berlin";

export default defineConfig({
  plugins: [
    svelte(),
    // Installierbar und offline: Seite, abcjs, Samples und Bild im Cache.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["abcjs-basic-min.js", "piano/*.mp3", "akkordbaum.png", "icon-180.png"],
      manifest: {
        name: "AbiEar — Gehörbildung fürs Abitur",
        short_name: "AbiEar",
        description: "Gehörbildungstrainer für das Abitur Musik in Baden-Württemberg: Intervalle, Akkorde, Rhythmus- und Melodiediktat.",
        lang: "de",
        display: "standalone",
        orientation: "portrait",
        background_color: "#15171b",
        theme_color: "#15171b",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,mp3}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  // GitHub Pages liefert unter einem Unterpfad; der Pfad kommt aus dem Bau.
  base: process.env.ABIEAR_BASE ?? "/",
  build: { target: "es2022" },
  test: {
    include: ["tests/**/*.test.ts"],
    // Die Goldmaster-Prüfungen rechnen Tausende Diktate — mehr Zeit als üblich.
    testTimeout: 60_000,
  },
});
