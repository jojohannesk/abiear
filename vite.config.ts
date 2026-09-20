import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  // GitHub Pages liefert unter einem Unterpfad; der Pfad kommt aus dem Bau.
  base: process.env.ABIEAR_BASE ?? "/",
  build: { target: "es2022" },
  test: {
    include: ["tests/**/*.test.ts"],
    // Die Goldmaster-Prüfungen rechnen Tausende Diktate — mehr Zeit als üblich.
    testTimeout: 60_000,
  },
});
