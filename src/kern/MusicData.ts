// Musikalische Grunddaten. Portierung von `Models/MusicData.swift`.
//
// Die Zahlen hier sind die Referenz — Zellen, Gewichte, Tonarten, Schemata
// stehen wörtlich wie in Swift. `katalog.json` aus dem Goldmaster hält das
// fest.

export interface RhythmCell {
  readonly id: string;
  readonly duration: number;
  readonly name: string;
  readonly offsets: readonly number[];
  /** Grundhäufigkeit in der Auswahl. */
  readonly weight: number;
  /** Triole: drei Töne in der Zeit von zweien. */
  readonly isTriplet: boolean;
}

function cell(id: string, duration: number, name: string, offsets: number[],
              weight: number, isTriplet = false): RhythmCell {
  return { id, duration, name, offsets, weight, isTriplet };
}

export interface RhythmFigure {
  readonly id: string;
  readonly duration: number;
  readonly name: string;
  readonly offsets: readonly number[];
  readonly startBeat: number;
  readonly isTriplet: boolean;
}

export interface DictationStep {
  /** Indizes der Takte, die in diesem Durchgang erklingen. */
  readonly bars: readonly number[];
}

/** Beschriftung für die Anzeige; die Durchgangsnummer steht daneben. */
export function stepShortTitle(step: DictationStep): string {
  switch (step.bars.length) {
    case 4: return "Ganzes Diktat";
    case 1: return `Takt ${step.bars[0] + 1}`;
    default: return "Takt " + step.bars.map((b) => String(b + 1)).join(" & ");
  }
}

export interface Interval {
  readonly name: string;
  readonly semitones: number;
}

export interface Chord {
  readonly name: string;
  readonly offsets: readonly number[];
}

export interface MusicKey {
  readonly name: string;
  readonly isMajor: boolean;
  /** MIDI-Grundton. Wird im Generator oktaviert. */
  readonly root: number;
  /** Stufen als Halbtonabstände zum Grundton. */
  readonly scale: readonly number[];
  /** Tonartkürzel für ABC-Notation. */
  readonly abcKey: string;
  /** Stammtonbuchstaben der Leiter in ABC-Schreibweise (H = B). */
  readonly letters: readonly string[];
  /** Vorzeichen: positiv = Kreuze, negativ = B. */
  readonly acc: number;
}

export function keysEqual(a: MusicKey, b: MusicKey): boolean {
  return a.name === b.name && a.isMajor === b.isMajor && a.root === b.root && a.abcKey === b.abcKey
    && a.acc === b.acc && a.scale.length === b.scale.length && a.scale.every((s, i) => s === b.scale[i])
    && a.letters.every((l, i) => l === b.letters[i]);
}

function key(name: string, isMajor: boolean, root: number, scale: number[],
             abcKey: string, letters: string[], acc: number): MusicKey {
  return { name, isMajor, root, scale, abcKey, letters, acc };
}

const DUR = [0, 2, 4, 5, 7, 9, 11];
const MOLL = [0, 2, 3, 5, 7, 8, 11];

/** Eine einzelne Note des Melodiediktats. */
export interface MelodyNote {
  readonly midiNumber: number;
  readonly durationBeats: number;
  /** Position in Vierteln vom Beginn des Diktats (Takt 1, Zählzeit 1 = 0.0). */
  readonly beatPosition: number;
  readonly cellId: string;
}

/** Ein vollständig generiertes Melodiediktat. */
export interface MelodyDictation {
  readonly key: MusicKey;
  readonly notes: readonly MelodyNote[];
}

export const MusicData = {
  /** Zellen, die genau einen Schlag füllen. */
  rhythm1Beat: [
    cell("viertel", 1.0, "Viertel", [0], 40),
    cell("zwei_achtel", 1.0, "2 Achtel", [0, 0.5], 40),
    cell("punk_acht_sechz", 1.0, "Punktierte Achtel + Sechzehntel", [0, 0.75], 20),
    cell("sechz_punk_acht", 1.0, "Sechzehntel + Punktierte Achtel", [0, 0.25], 12),
    cell("vier_sechz", 1.0, "4 Sechzehntel", [0, 0.25, 0.5, 0.75], 20),
    cell("zwei_sechz_acht", 1.0, "2 Sechzehntel + Achtel", [0, 0.25, 0.5], 22),
    cell("acht_zwei_sechz", 1.0, "Achtel + 2 Sechzehntel", [0, 0.5, 0.75], 22),
    cell("sechz_acht_sechz", 1.0, "Sechzehntel + Achtel + Sechzehntel", [0, 0.25, 0.75], 10),
    cell("achtel_triole", 1.0, "Achteltriole", [0, 1.0 / 3.0, 2.0 / 3.0], 14, true),
  ] as readonly RhythmCell[],

  /** Zellen über zwei Schläge — nur auf Zählzeit 1 oder 3. */
  rhythm2Beat: [
    cell("halbe", 2.0, "Halbe Note", [0], 15),
    cell("punk_viert_acht", 2.0, "Punktierte Viertel + Achtel", [0, 1.5], 15),
    cell("acht_punk_viert", 2.0, "Achtel + Punktierte Viertel", [0, 0.5], 15),
  ] as readonly RhythmCell[],

  /** Die Durchgänge für ein Diktat mit `bars` Takten. */
  steps(forBars: number): readonly DictationStep[] {
    return forBars === 1
      ? [{ bars: [0] }, { bars: [0] }, { bars: [0] }]
      : MusicData.rhythmSteps;
  },

  rhythmSteps: [
    { bars: [0, 1, 2, 3] },
    { bars: [0] },
    { bars: [0] },
    { bars: [0, 1] },
    { bars: [1] },
    { bars: [1, 2] },
    { bars: [2] },
    { bars: [2, 3] },
    { bars: [3] },
    { bars: [3] },
    { bars: [0, 1, 2, 3] },
  ] as readonly DictationStep[],

  /** Die zwölf Intervalle der Prüfungsordnung — ohne Prime. */
  intervals: [
    { name: "Kleine Sekunde", semitones: 1 },
    { name: "Große Sekunde", semitones: 2 },
    { name: "Kleine Terz", semitones: 3 },
    { name: "Große Terz", semitones: 4 },
    { name: "Reine Quarte", semitones: 5 },
    { name: "Tritonus", semitones: 6 },
    { name: "Reine Quinte", semitones: 7 },
    { name: "Kleine Sexte", semitones: 8 },
    { name: "Große Sexte", semitones: 9 },
    { name: "Kleine Septime", semitones: 10 },
    { name: "Große Septime", semitones: 11 },
    { name: "Reine Oktave", semitones: 12 },
  ] as readonly Interval[],

  chords: [
    { name: "Dur", offsets: [0, 4, 7, 12] },
    { name: "Moll", offsets: [0, 3, 7, 12] },
    { name: "Dur mit Sixte ajoutée", offsets: [0, 4, 7, 9] },
    { name: "Moll mit Sixte ajoutée", offsets: [0, 3, 7, 9] },
    { name: "Dur7 (Dominantseptakkord)", offsets: [0, 4, 7, 10] },
    { name: "Moll7", offsets: [0, 3, 7, 10] },
    { name: "DurMaj7", offsets: [0, 4, 7, 11] },
    { name: "Verminderter Septakkord", offsets: [0, 3, 6, 9] },
    { name: "Übermäßig", offsets: [0, 4, 8, 12] },
  ] as readonly Chord[],

  keyCatalog: [
    key("C-Dur", true, 60, DUR, "C", ["C", "D", "E", "F", "G", "A", "B"], 0),
    key("a-Moll", false, 57, MOLL, "Am", ["A", "B", "C", "D", "E", "F", "G"], 0),
    key("G-Dur", true, 67, DUR, "G", ["G", "A", "B", "C", "D", "E", "F"], 1),
    key("e-Moll", false, 64, MOLL, "Em", ["E", "F", "G", "A", "B", "C", "D"], 1),
    key("D-Dur", true, 62, DUR, "D", ["D", "E", "F", "G", "A", "B", "C"], 2),
    key("h-Moll", false, 71, MOLL, "Bm", ["B", "C", "D", "E", "F", "G", "A"], 2),
    key("F-Dur", true, 65, DUR, "F", ["F", "G", "A", "B", "C", "D", "E"], -1),
    key("d-Moll", false, 62, MOLL, "Dm", ["D", "E", "F", "G", "A", "B", "C"], -1),
    key("B-Dur", true, 70, DUR, "Bb", ["B", "C", "D", "E", "F", "G", "A"], -2),
    key("g-Moll", false, 67, MOLL, "Gm", ["G", "A", "B", "C", "D", "E", "F"], -2),
    // Drei Vorzeichen — die Obergrenze der Prüfungsordnung.
    key("A-Dur", true, 69, DUR, "A", ["A", "B", "C", "D", "E", "F", "G"], 3),
    key("fis-Moll", false, 66, MOLL, "F#m", ["F", "G", "A", "B", "C", "D", "E"], 3),
    key("Es-Dur", true, 63, DUR, "Eb", ["E", "F", "G", "A", "B", "C", "D"], -3),
    key("c-Moll", false, 60, MOLL, "Cm", ["C", "D", "E", "F", "G", "A", "B"], -3),
  ] as readonly MusicKey[],

  /** Harmonische Gerüste der Periode, ein Eintrag je Halbtakt (8 Stück). */
  harmonySchemas: [
    [1, 1, 4, 5, 1, 1, 5, 1],   // Grundform
    [1, 5, 4, 5, 1, 6, 5, 1],   // Nachsatz mit vi vor der Dominante
    [1, 4, 2, 5, 1, 4, 5, 1],   // mit Subdominantparallele
    [1, 1, 5, 5, 6, 4, 5, 1],   // Nachsatz beginnt auf der VI.
  ] as readonly (readonly number[])[],

  /** Stufen, auf denen der Vordersatz enden darf, 0-basiert. */
  halfCadenceDegrees: [
    { degree: 4, weight: 0.55 },   // Quinte
    { degree: 1, weight: 0.35 },   // Sekunde
    { degree: 6, weight: 0.10 },   // Leitton
  ] as readonly { degree: number; weight: number }[],

  /** Akkordtöne je Stufe, als Indizes in `MusicKey.scale`. */
  chordTones: new Map<number, readonly number[]>([
    [1, [0, 2, 4]],
    [2, [1, 3, 5]],
    [4, [3, 5, 0]],
    [5, [4, 6, 1]],
    [6, [5, 0, 2]],
  ]),
};
