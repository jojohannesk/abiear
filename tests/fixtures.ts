// Lädt eine Goldmaster-Datei aus `Web/fixtures/` — geschrieben von
// `Werkzeuge/goldmaster.swift`, nie von Hand.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));

export function fixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(join(hier, "..", "fixtures", name), "utf8")) as T;
}

/**
 * JSON mit sortierten Schlüsseln, ohne `null`-Felder — wie der Swift-Encoder
 * schreibt (Optionale ohne Wert lässt er weg).
 */
export function stabil(wert: unknown): string {
  return JSON.stringify(wert, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v as object).sort()
          .filter((k) => (v as Record<string, unknown>)[k] !== null)
          .map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v);
}
