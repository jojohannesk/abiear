// Eingabe und Bewertung: 2 × 300 Bedienfolgen aus scoring.json werden
// nachgespielt — Ergebnis der Eingabe, Bewertung je Takt, Notenbild und
// Beschreibung müssen gleich sein. Dazu vollstaendig.json: die vollständig
// eingetippte Lösung ergibt dasselbe Notenbild und volle Punkte.
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { RhythmGenerator } from "../src/kern/RhythmGenerator";
import { MelodyGenerator } from "../src/kern/MelodyGenerator";
import { DictationEntry, type NoteValue } from "../src/kern/DictationEntry";
import { DictationScoring } from "../src/kern/DictationScoring";
import { AbcNotation } from "../src/kern/AbcNotation";
import { MusicData } from "../src/kern/MusicData";
import type { DictationLevel } from "../src/kern/DictationLevel";
import { fixture, stabil } from "./fixtures";

interface Op { op: string; value?: string; dotted?: boolean; degree?: number; beat?: number; accepted?: boolean }
interface Fall {
  seed: number; solutionAbc: string; melodyKey?: string; tonicDegree?: number; ops: Op[];
  notes: { start: number; units: number; triplet: boolean; degree?: number }[]; cursor: number;
  results: { bar: number; wrongBeats: number[]; points: number; wrongItems: string[] }[];
  entryAbc: string; beschreibung: string; isComplete: boolean; filledUnits: number;
}

/** Spielt die aufgezeichnete Bedienfolge nach und prüft jede Annahme. */
function spiele(entry: DictationEntry, ops: Op[], seed: number) {
  for (const op of ops) {
    let ok: boolean | undefined;
    switch (op.op) {
      case "place": ok = entry.place(op.value as NoteValue, op.dotted ?? false, op.degree ?? null); break;
      case "triplet": ok = entry.placeTriplet(); break;
      case "tripletMember": ok = entry.placeTripletMember(op.degree ?? null); break;
      case "cursor": entry.moveCursorToBeat(op.beat!); break;
      case "cursorUnits": entry.moveCursorTo(op.beat!); break;
      case "remove": entry.removeAtCursor(); break;
      default: throw new Error(`Unbekannte Bedienung ${op.op}`);
    }
    if (op.accepted !== undefined) expect(ok, `Seed ${seed}: ${JSON.stringify(op)}`).toBe(op.accepted);
  }
}

function zustand(entry: DictationEntry) {
  return {
    notes: entry.notes.map((n) => ({ start: n.start, units: n.units, triplet: n.isTripletMember,
      ...(n.degree === null ? {} : { degree: n.degree }) })),
    cursor: entry.cursor, isComplete: entry.isComplete, filledUnits: entry.filledUnits,
  };
}

describe("scoring.json", () => {
  const file = fixture<{ rhythm: Fall[]; melody: Fall[] }>("scoring.json");

  it(`Rhythmus: ${file.rhythm.length} Bedienfolgen`, () => {
    for (const fall of file.rhythm) {
      Rand.source = Rand.seeded(BigInt(fall.seed));
      const barCount = fall.solutionAbc.split("|").length - 1 <= 1 ? 1 : DictationEntry.standardBarCount;
      const solution = RhythmGenerator.generate("mittel").slice(0, barCount);
      expect(AbcNotation.rhythmToAbc(solution), `Seed ${fall.seed}`).toBe(fall.solutionAbc);
      const entry = new DictationEntry([], 0, barCount);
      spiele(entry, fall.ops, fall.seed);
      const ist = {
        ...zustand(entry),
        results: DictationScoring.scoreRhythm(entry, solution),
        entryAbc: AbcNotation.entryToAbc(entry),
        beschreibung: AbcNotation.entryBeschreibung(entry, null),
      };
      const soll = { notes: fall.notes, cursor: fall.cursor, isComplete: fall.isComplete, filledUnits: fall.filledUnits,
        results: fall.results, entryAbc: fall.entryAbc, beschreibung: fall.beschreibung };
      expect(stabil(ist), `Seed ${fall.seed}`).toBe(stabil(soll));
    }
  });

  it(`Melodie: ${file.melody.length} Bedienfolgen`, () => {
    const levels: DictationLevel[] = ["leicht", "mittel", "abitur"];
    file.melody.forEach((fall, i) => {
      Rand.source = Rand.seeded(BigInt(fall.seed));
      const melody = MelodyGenerator.generateDictation(levels[i % 3]);
      expect(AbcNotation.melodyToAbc(melody), `Seed ${fall.seed}`).toBe(fall.solutionAbc);
      expect(melody.key.name).toBe(fall.melodyKey);
      const entry = new DictationEntry();
      spiele(entry, fall.ops, fall.seed);
      const ist = {
        ...zustand(entry),
        results: DictationScoring.scoreMelody(entry, melody),
        entryAbc: AbcNotation.entryToAbcWithKey(entry, melody.key),
        beschreibung: AbcNotation.entryBeschreibung(entry, melody.key),
      };
      const soll = { notes: fall.notes, cursor: fall.cursor, isComplete: fall.isComplete, filledUnits: fall.filledUnits,
        results: fall.results, entryAbc: fall.entryAbc, beschreibung: fall.beschreibung };
      expect(stabil(ist), `Seed ${fall.seed}`).toBe(stabil(soll));
    });
  });
});

describe("vollstaendig.json", () => {
  interface V { key: string; seed: number; solutionAbc: string; entryAbc: string; gleich: boolean; punkte: number }
  const faelle = fixture<V[]>("vollstaendig.json");

  it(`${faelle.length} vollständig eingetippte Lösungen über alle Tonarten`, () => {
    for (const v of faelle) {
      const katalogKey = MusicData.keyCatalog.find((k) => k.name === v.key)!;
      Rand.source = Rand.seeded(BigInt(v.seed));
      const melody = MelodyGenerator.tryGenerateMelody(katalogKey, "mittel");
      expect(melody, `Seed ${v.seed} muss aufgehen`).not.toBeNull();
      const key = melody!.key;
      const entry = new DictationEntry();
      for (const n of melody!.notes) {
        const units = Math.round(n.durationBeats * DictationEntry.unitsPerBeat);
        const degree = MelodyGenerator.degree(n.midiNumber, key);
        entry.moveCursorTo(Math.round(n.beatPosition * DictationEntry.unitsPerBeat));
        if (AbcNotation.isTripletDuration(n.durationBeats)) entry.placeTripletMember(degree);
        else entry.placeUnits(units, degree);
      }
      const sol = AbcNotation.melodyToAbc(melody!);
      const own = AbcNotation.entryToAbcWithKey(entry, key);
      expect(sol, `Seed ${v.seed}`).toBe(v.solutionAbc);
      expect(own, `Seed ${v.seed}`).toBe(v.entryAbc);
      expect(own === sol).toBe(v.gleich);
      expect(DictationScoring.scoreMelody(entry, melody!).reduce((s, r) => s + r.points, 0)).toBe(v.punkte);
    }
  });
});
