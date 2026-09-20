// Rhythmusdiktate zeichengleich mit der Swift-Fassung — je Niveau 500,
// jedes einzeln geseedet, dazu 200 mit adaptivem Profil.
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { RhythmGenerator } from "../src/kern/RhythmGenerator";
import { neutralProfile } from "../src/kern/AdaptiveProfile";
import type { DictationLevel } from "../src/kern/DictationLevel";
import { fixture, stabil } from "./fixtures";

interface RhythmFile {
  level: DictationLevel;
  profile: Record<string, number>;
  dictations: { seed: number; bars: { id: string; startBeat: number }[][]; abc: string; beschreibung: string }[];
}

for (const name of ["rhythm-leicht", "rhythm-mittel", "rhythm-abitur", "rhythm-profil"]) {
  describe(name, () => {
    const file = fixture<RhythmFile>(`${name}.json`);
    const profile = neutralProfile();
    profile.figures = file.profile;

    it(`${file.dictations.length} Diktate gleich`, () => {
      let abweichungen = 0;
      let erste = "";
      for (const d of file.dictations) {
        Rand.source = Rand.seeded(BigInt(d.seed));
        const ist = RhythmGenerator.generate(file.level, profile)
          .map((bar) => bar.map((f) => ({ id: f.id, startBeat: f.startBeat })));
        if (stabil(ist) !== stabil(d.bars)) {
          abweichungen++;
          if (!erste) erste = `Seed ${d.seed}: ${JSON.stringify(ist)} ≠ ${JSON.stringify(d.bars)}`;
        }
      }
      expect(abweichungen, erste).toBe(0);
    });
  });
}
