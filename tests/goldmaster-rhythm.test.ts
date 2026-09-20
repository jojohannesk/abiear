// Rhythmusdiktate zeichengleich mit der Swift-Fassung — je Niveau 500,
// jedes einzeln geseedet, dazu 200 mit adaptivem Profil.
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { RhythmGenerator } from "../src/kern/RhythmGenerator";
import { neutralProfile } from "../src/kern/AdaptiveProfile";
import { AbcNotation } from "../src/kern/AbcNotation";
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
        const g = RhythmGenerator.generate(file.level, profile);
        const ist = {
          bars: g.map((bar) => bar.map((f) => ({ id: f.id, startBeat: f.startBeat }))),
          abc: AbcNotation.rhythmToAbc(g),
          beschreibung: AbcNotation.rhythmBeschreibung(g),
        };
        const soll = { bars: d.bars, abc: d.abc, beschreibung: d.beschreibung };
        if (stabil(ist) !== stabil(soll)) {
          abweichungen++;
          if (!erste) erste = `Seed ${d.seed}:\n${stabil(ist)}\n≠\n${stabil(soll)}`;
        }
      }
      expect(abweichungen, erste).toBe(0);
    });
  });
}
