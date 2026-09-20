// Melodiediktate zeichengleich mit der Swift-Fassung — je Niveau 500, jedes
// einzeln geseedet, dazu 200 mit adaptivem Profil. Verglichen werden
// Tonart, Noten, Bewegungen, Konturen und Tonika-Stufe.
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { MelodyGenerator } from "../src/kern/MelodyGenerator";
import { contourOfBar, movesInBar, notesPerBar } from "../src/kern/MelodicMove";
import { neutralProfile } from "../src/kern/AdaptiveProfile";
import { AbcNotation } from "../src/kern/AbcNotation";
import type { DictationLevel } from "../src/kern/DictationLevel";
import { fixture, stabil } from "./fixtures";

interface MelodyFile {
  level: DictationLevel;
  profileKeys: Record<string, number>;
  profileMoves: Record<string, number>;
  dictations: {
    seed: number; key: string;
    notes: { midi: number; dur: number; pos: number; cell: string }[];
    abc: string; beschreibung: string;
    moves: string[][]; contours: (string | null)[]; tonicDegree: number | null;
  }[];
}

for (const name of ["melody-leicht", "melody-mittel", "melody-abitur", "melody-profil"]) {
  describe(name, () => {
    const file = fixture<MelodyFile>(`${name}.json`);
    const profile = neutralProfile();
    profile.keys = file.profileKeys;
    profile.moves = file.profileMoves;

    it(`${file.dictations.length} Diktate gleich`, () => {
      let abweichungen = 0;
      let erste = "";
      for (const d of file.dictations) {
        Rand.source = Rand.seeded(BigInt(d.seed));
        const m = MelodyGenerator.generateDictation(file.level, profile);
        const bars = notesPerBar(m).length;
        const ist = {
          key: m.key.name,
          notes: m.notes.map((n) => ({ midi: n.midiNumber, dur: n.durationBeats, pos: n.beatPosition, cell: n.cellId })),
          moves: Array.from({ length: bars }, (_, b) => movesInBar(m, b)),
          contours: Array.from({ length: bars }, (_, b) => contourOfBar(m, b)),
          tonicDegree: m.notes.length ? MelodyGenerator.tonicDegree(m.notes[0].midiNumber, m.key) : null,
          abc: AbcNotation.melodyToAbc(m),
          beschreibung: AbcNotation.melodyBeschreibung(m),
        };
        const soll = { key: d.key, notes: d.notes, moves: d.moves, contours: d.contours, tonicDegree: d.tonicDegree,
          abc: d.abc, beschreibung: d.beschreibung };
        if (stabil(ist) !== stabil(soll)) {
          abweichungen++;
          if (!erste) erste = `Seed ${d.seed}:\n${stabil(ist)}\n≠\n${stabil(soll)}`;
        }
      }
      expect(abweichungen, erste).toBe(0);
    });
  });
}
