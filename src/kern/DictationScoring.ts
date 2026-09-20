// Vergleich der Eingabe mit der Lösung — für Rhythmus und Melodie.
// Portierung von `Models/DictationScoring.swift`.
//
// Beim Rhythmus werden Anschlagspunkte verglichen, bei der Melodie Paare aus
// Stelle und diatonischer Stufe. Gewertet wird schlagweise; ein Schlag
// stimmt nur, wenn er zusätzlich lückenlos gefüllt ist.

import type { MelodyDictation, RhythmFigure } from "./MusicData";
import { DictationEntry } from "./DictationEntry";
import { moveToNoteAt, notesPerBar } from "./MelodicMove";
import { degreeOfMidi } from "./Stufen";

export interface BarResult {
  readonly bar: number;
  /** 0 … 3 — welche Schläge nicht stimmen, aufsteigend. */
  readonly wrongBeats: readonly number[];
  readonly points: number;
  /** Kennungen der verfehlten Vokabeln: Zellen beim Rhythmus, Bewegungen bei der Melodie. */
  readonly wrongItems: readonly string[];
}

export function isPerfect(r: BarResult): boolean {
  return r.wrongBeats.length === 0;
}

interface Step {
  units: number;
  item: number;
}

function beatOfUnits(units: number): number {
  return Math.floor(units / DictationEntry.unitsPerBeat);
}

/** Schläge, deren Inhalt zwischen Lösung und Eingabe abweicht — oder die nicht gefüllt sind. */
function wrongBeats(bar: number, entry: DictationEntry, soll: readonly Step[], ist: readonly Step[]): number[] {
  const out: number[] = [];
  for (let b = 0; b < 4; b++) {
    const a = new Set(soll.filter((s) => beatOfUnits(s.units) === b).map((s) => `${s.units}:${s.item}`));
    const c = new Set(ist.filter((s) => beatOfUnits(s.units) === b).map((s) => `${s.units}:${s.item}`));
    const gleich = a.size === c.size && [...a].every((x) => c.has(x));
    if (!gleich || !entry.fullyCovers(bar * 4 + b)) out.push(b);
  }
  return out;
}

export const DictationScoring = {
  /** kein Fehler 2 Punkte · ein Schlag 1 Punkt · zwei oder mehr 0 Punkte */
  points(wrong: readonly number[]): number {
    switch (wrong.length) {
      case 0: return 2;
      case 1: return 1;
      default: return 0;
    }
  },

  // MARK: - Rhythmus

  /** Anschlagspunkte eines Lösungstaktes, in Einheiten ab Taktbeginn. */
  onsetsOfSolutionBar(bar: readonly RhythmFigure[]): number[] {
    const out: number[] = [];
    for (const figure of bar) {
      for (const offset of figure.offsets) {
        out.push(Math.round((figure.startBeat + offset) * DictationEntry.unitsPerBeat));
      }
    }
    return out.sort((a, b) => a - b);
  },

  scoreRhythmBar(index: number, entry: DictationEntry, solution: readonly (readonly RhythmFigure[])[]): BarResult {
    if (index < 0 || index >= solution.length) {
      return { bar: index, wrongBeats: [], points: 0, wrongItems: [] };
    }
    const soll = DictationScoring.onsetsOfSolutionBar(solution[index]).map((u) => ({ units: u, item: 0 }));
    const ist = entry.onsets(index).map((u) => ({ units: u, item: 0 }));
    const wrong = wrongBeats(index, entry, soll, ist);
    return { bar: index, wrongBeats: wrong, points: DictationScoring.points(wrong),
             wrongItems: DictationScoring.missedCells(solution[index], wrong) };
  },

  scoreRhythm(entry: DictationEntry, solution: readonly (readonly RhythmFigure[])[]): BarResult[] {
    return solution.map((_, i) => DictationScoring.scoreRhythmBar(i, entry, solution));
  },

  /** Welche Zellen der Lösung sind verfehlt worden? */
  missedCells(bar: readonly RhythmFigure[], wrong: readonly number[]): string[] {
    if (wrong.length === 0) return [];
    const out: string[] = [];
    for (const figure of bar) {
      const von = Math.floor(figure.startBeat);
      const bis = Math.floor(figure.startBeat + figure.duration - 0.001);
      let trifft = false;
      for (let b = von; b <= bis; b++) if (wrong.includes(b)) { trifft = true; break; }
      if (trifft) out.push(figure.id);
    }
    return out;
  },

  // MARK: - Melodie

  /** Stelle und Stufe jedes Lösungstons eines Taktes; Leiterfremdes fällt still heraus. */
  stepsOfSolutionBar(bar: number, melody: MelodyDictation): Step[] {
    const von = bar * DictationEntry.unitsPerBar;
    const out: Step[] = [];
    for (const note of notesPerBar(melody)[bar]) {
      const degree = degreeOfMidi(note.midiNumber, melody.key);
      if (degree === null) continue;
      const units = Math.round(note.beatPosition * DictationEntry.unitsPerBeat);
      out.push({ units: units - von, item: degree });
    }
    return out;
  },

  scoreMelodyBar(index: number, entry: DictationEntry, melody: MelodyDictation): BarResult {
    if (index < 0 || index >= entry.barCount) {
      return { bar: index, wrongBeats: [], points: 0, wrongItems: [] };
    }
    const soll = DictationScoring.stepsOfSolutionBar(index, melody);
    const ist: Step[] = entry.notesInBar(index).map((n) => ({
      units: n.start - index * DictationEntry.unitsPerBar,
      item: n.degree ?? Number.MIN_SAFE_INTEGER,
    }));
    const wrong = wrongBeats(index, entry, soll, ist);
    return { bar: index, wrongBeats: wrong, points: DictationScoring.points(wrong),
             wrongItems: DictationScoring.missedMoves(index, melody, wrong) };
  },

  scoreMelody(entry: DictationEntry, melody: MelodyDictation): BarResult[] {
    const out: BarResult[] = [];
    for (let i = 0; i < entry.barCount; i++) out.push(DictationScoring.scoreMelodyBar(i, entry, melody));
    return out;
  },

  /** Welche Bewegungen der Lösung sind verfehlt worden? Maßgeblich ist der Zielton. */
  missedMoves(bar: number, melody: MelodyDictation, wrong: readonly number[]): string[] {
    if (wrong.length === 0) return [];
    const takte = notesPerBar(melody);
    if (bar < 0 || bar >= takte.length) return [];
    let ersterIndex = 0;
    for (let i = 0; i < bar; i++) ersterIndex += takte[i].length;
    const von = bar * DictationEntry.unitsPerBar;

    const out: string[] = [];
    takte[bar].forEach((note, n) => {
      const units = Math.round(note.beatPosition * DictationEntry.unitsPerBeat);
      if (!wrong.includes(beatOfUnits(units - von))) return;
      const move = moveToNoteAt(melody, ersterIndex + n);
      if (move !== null) out.push(move);
    });
    return out;
  },
};
