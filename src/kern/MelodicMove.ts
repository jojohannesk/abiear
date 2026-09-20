// Bewegungen und Konturen des Melodiediktats. Portierung von
// `Models/MelodicMove.swift`.

import type { MelodyDictation, MelodyNote, MusicKey } from "./MusicData";
import { degreeOfMidi, mod7 } from "./Stufen";

export type MelodicMove =
  | "repeatedNote"
  | "secondUp" | "secondDown"
  | "leadingToneToTonic"
  | "thirdUp" | "thirdDown"
  | "fourthUp" | "fourthDown"
  | "fifthUp" | "fifthDown";

const MOVE_TITLES: Record<MelodicMove, string> = {
  repeatedNote: "Tonwiederholung",
  secondUp: "Sekunde aufwärts",
  secondDown: "Sekunde abwärts",
  leadingToneToTonic: "Leitton zum Grundton",
  thirdUp: "Terz aufwärts",
  thirdDown: "Terz abwärts",
  fourthUp: "Quarte aufwärts",
  fourthDown: "Quarte abwärts",
  fifthUp: "Quinte aufwärts",
  fifthDown: "Quinte abwärts",
};

export const MelodicMoves = {
  all: Object.keys(MOVE_TITLES) as readonly MelodicMove[],

  title(move: MelodicMove): string {
    return MOVE_TITLES[move];
  },

  /**
   * Der Schritt von Stufe `a` nach Stufe `b`. Der Leitton bekommt ein
   * eigenes Etikett; alles über der Quinte wird auf die Quinte abgebildet.
   */
  between(a: number, b: number, _key?: MusicKey): MelodicMove {
    const diff = b - a;
    const size = Math.abs(diff);
    const up = diff > 0;

    if (size === 0) return "repeatedNote";
    if (size === 1 && up && mod7(a) === 6 && mod7(b) === 0) return "leadingToneToTonic";

    switch (size) {
      case 1: return up ? "secondUp" : "secondDown";
      case 2: return up ? "thirdUp" : "thirdDown";
      case 3: return up ? "fourthUp" : "fourthDown";
      default: return up ? "fifthUp" : "fifthDown";
    }
  },

  /** Alle Bewegungen einer Stufenfolge, in ihrer Reihenfolge. */
  sequence(degrees: readonly number[], key?: MusicKey): MelodicMove[] {
    if (degrees.length < 2) return [];
    const out: MelodicMove[] = [];
    for (let i = 1; i < degrees.length; i++) out.push(MelodicMoves.between(degrees[i - 1], degrees[i], key));
    return out;
  },

  /** Klarname zu einer gespeicherten Kennung; Unbekanntes behält die Kennung. */
  titleFor(id: string): string {
    return (MOVE_TITLES as Record<string, string>)[id] ?? id;
  },
};

export type MelodicContour = "rising" | "falling" | "arch" | "valley" | "leapAndRecover" | "circling";

const CONTOUR_TITLES: Record<MelodicContour, string> = {
  rising: "Streng aufwärts",
  falling: "Streng abwärts",
  arch: "Bogen aufwärts",
  valley: "Bogen abwärts",
  leapAndRecover: "Sprung mit Ausgleich",
  circling: "Umspielend",
};

export const MelodicContours = {
  all: Object.keys(CONTOUR_TITLES) as readonly MelodicContour[],

  title(c: MelodicContour): string {
    return CONTOUR_TITLES[c];
  },

  /** Bestimmt die Form aus den Stufen eines Taktes. */
  of(degrees: readonly number[]): MelodicContour {
    const steps: number[] = [];
    for (let i = 1; i < degrees.length; i++) steps.push(degrees[i] - degrees[i - 1]);
    const directions = steps.map((s) => Math.sign(s)).filter((s) => s !== 0);
    if (directions.length === 0) return "circling";
    const first = directions[0];

    let changes = 0;
    let previous = first;
    for (const d of directions.slice(1)) {
      if (d !== previous) {
        changes += 1;
        previous = d;
      }
    }

    const biggestLeap = steps.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
    if (biggestLeap >= 3 && changes >= 1) return "leapAndRecover";

    switch (changes) {
      case 0: return first > 0 ? "rising" : "falling";
      case 1: return first > 0 ? "arch" : "valley";
      default: return "circling";
    }
  },

  titleFor(id: string): string {
    return (CONTOUR_TITLES as Record<string, string>)[id] ?? id;
  },
};

// MARK: - MelodyDictation

/** Die Töne je Takt (0 … 3). */
export function notesPerBar(m: MelodyDictation): MelodyNote[][] {
  const bars: MelodyNote[][] = [[], [], [], []];
  for (const note of m.notes) {
    bars[Math.min(3, Math.max(0, Math.floor(note.beatPosition / 4)))].push(note);
  }
  return bars;
}

/** Diatonische Stufen je Takt; leiterfremde Töne fallen heraus. */
export function degreesPerBar(m: MelodyDictation): number[][] {
  return notesPerBar(m).map((bar) =>
    bar.map((n) => degreeOfMidi(n.midiNumber, m.key)).filter((d): d is number => d !== null));
}

/** Die Bewegung, die auf den Ton mit dem Gesamtindex `index` hinführt. */
export function moveToNoteAt(m: MelodyDictation, index: number): MelodicMove | null {
  if (index <= 0 || index >= m.notes.length) return null;
  const from = degreeOfMidi(m.notes[index - 1].midiNumber, m.key);
  const to = degreeOfMidi(m.notes[index].midiNumber, m.key);
  if (from === null || to === null) return null;
  return MelodicMoves.between(from, to, m.key);
}

/** Alle Bewegungen, die in einem Takt enden. */
export function movesInBar(m: MelodyDictation, bar: number): MelodicMove[] {
  const counts = notesPerBar(m).map((b) => b.length);
  if (bar < 0 || bar >= counts.length) return [];
  let start = 0;
  for (let i = 0; i < bar; i++) start += counts[i];
  const out: MelodicMove[] = [];
  for (let i = start; i < start + counts[bar]; i++) {
    const mv = moveToNoteAt(m, i);
    if (mv !== null) out.push(mv);
  }
  return out;
}

/** Die Bewegungsform eines Taktes. */
export function contourOfBar(m: MelodyDictation, bar: number): MelodicContour | null {
  const degrees = degreesPerBar(m);
  if (bar < 0 || bar >= degrees.length || degrees[bar].length < 2) return null;
  return MelodicContours.of(degrees[bar]);
}
