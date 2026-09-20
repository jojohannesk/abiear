// Lädt eine Goldmaster-Datei aus `Web/fixtures/` — geschrieben von
// `Werkzeuge/goldmaster.swift`, nie von Hand.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));

export function fixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(join(hier, "..", "fixtures", name), "utf8")) as T;
}
