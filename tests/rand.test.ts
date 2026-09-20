// Der LCG muss bitgleich mit Swift laufen — sonst ist keine andere
// Goldmaster-Prüfung aussagekräftig.
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { fixture } from "./fixtures";

describe("Rand.seeded", () => {
  const werte = fixture<Record<string, number[]>>("rand.json");

  for (const [seed, erwartet] of Object.entries(werte)) {
    it(`Seed ${seed}: 1000 Werte gleich`, () => {
      const quelle = Rand.seeded(BigInt(seed));
      const ist = erwartet.map(() => quelle());
      expect(ist).toEqual(erwartet);
    });
  }

  it("index rundet ab und bleibt im Bereich", () => {
    Rand.source = Rand.seeded(1);
    for (let i = 0; i < 1000; i++) {
      const k = Rand.index(7);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(7);
    }
    expect(Rand.index(0)).toBe(0);
  });
});
