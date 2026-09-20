// Motivischer Melodiegenerator. Portierung von
// `Generation/MelodyGenerator.swift` — die Begründungen stehen dort und im
// README („Wie das Melodiediktat entsteht"); hier steht die Rechnung.
//
// Vier Ebenen von oben nach unten: Bauplan (Periode, Registerbogen) → Motiv
// (Takt 1) → Ableitungen (Takt 2 Halbschluss, Takt 3 Wiederaufnahme, Takt 4
// Schlussformel) → Prüfung (Bogen, Höhepunkt, Ambitus, Sprungregeln).
//
// Tonhöhen sind durchgehend diatonische Stufen (0 = Grundton, 7 = Oktave,
// −1 = Leitton darunter). `melody-<niveau>.json` verlangt Zeichengleichheit
// mit Swift — deshalb ist jede Zufallsziehung an derselben Stelle und in
// derselben Reihenfolge wie dort.

import { Rand } from "./Random";
import { MusicData, type MelodyDictation, type MelodyNote, type MusicKey } from "./MusicData";
import { DictationLevels, type DictationLevel } from "./DictationLevel";
import { NEUTRAL, Profile, type AdaptiveProfile } from "./AdaptiveProfile";
import { WeightedSampler } from "./RhythmGenerator";
import { MelodicMoves } from "./MelodicMove";
import { degreeOfMidi, midiOfDegree, mod7 } from "./Stufen";

// MARK: - Bausteine

/** Ein rhythmischer Platz innerhalb eines Taktes: Dauer und Zählzeit. */
export interface RhythmSlot {
  readonly dur: number;
  readonly beat: number;
}

/** Ein Motiv: Rhythmus plus Konturschritte ab dem eigenen ersten Ton. */
interface Motif {
  rhythm: RhythmSlot[];
  steps: number[];
}

/** Ein fertiger Takt: Rhythmus und absolute Stufen. */
interface Bar {
  rhythm: RhythmSlot[];
  degrees: number[];
}

/** Lage und Umfang des Ambitus, gemessen am Schlussgrundton. */
type AmbitusRule = "fifthAboveTonic" | "octaveFromTonic" | "ninthAnchoredToTonic";

const Ambitus = {
  permits(rule: AmbitusRule, low: number, high: number, tonic: number, degrees: readonly number[]): boolean {
    switch (rule) {
      case "fifthAboveTonic":
        return low === tonic && high >= tonic + 3 && high <= tonic + 4;
      case "octaveFromTonic":
        return low >= tonic - 1 && low <= tonic && high <= tonic + 7 && high - low >= 5;
      case "ninthAnchoredToTonic":
        if (!degrees.includes(tonic + 7)) return false;
        return (low === tonic - 1 && high === tonic + 7) || (low === tonic && high === tonic + 8);
    }
  },
  highestAboveTonic(rule: AmbitusRule): number {
    switch (rule) {
      case "fifthAboveTonic": return 4;
      case "octaveFromTonic": return 7;
      case "ninthAnchoredToTonic": return 8;
    }
  },
  lowestAboveTonic(rule: AmbitusRule): number {
    return rule === "fifthAboveTonic" ? 0 : -1;
  },
};

interface Range {
  readonly lower: number;
  readonly upper: number;
}

function inRange(r: Range, x: number): boolean {
  return x >= r.lower && x <= r.upper;
}

/** Spielraum je Schwierigkeitsgrad. `mittel` ist der Nullpunkt. */
interface Difficulty {
  level: DictationLevel;
  maxLeap: number;
  maxLeapSemitones: number;
  allowedDurations: Set<number> | null;
  figureProbability: number;
  anchoredToTonic: boolean;
  simpleKeysOnly: boolean;
  ambitus: AmbitusRule;
  profile: AdaptiveProfile;
  strictPeak: boolean;
  degreeWindow: Range | null;
}

function difficultyFor(level: DictationLevel): Difficulty {
  switch (level) {
    case "leicht":
      return { level, maxLeap: 2, maxLeapSemitones: 4, allowedDurations: new Set([0.5, 1.0, 2.0]),
        figureProbability: 0, anchoredToTonic: true, simpleKeysOnly: true,
        ambitus: "fifthAboveTonic", profile: NEUTRAL, strictPeak: false, degreeWindow: null };
    case "mittel":
      return { level, maxLeap: 4, maxLeapSemitones: 7, allowedDurations: null,
        figureProbability: 0.20, anchoredToTonic: false, simpleKeysOnly: false,
        ambitus: "octaveFromTonic", profile: NEUTRAL, strictPeak: true, degreeWindow: null };
    case "abitur":
      return { level, maxLeap: 4, maxLeapSemitones: 7, allowedDurations: null,
        figureProbability: 0.55, anchoredToTonic: false, simpleKeysOnly: false,
        ambitus: "ninthAnchoredToTonic", profile: NEUTRAL, strictPeak: true, degreeWindow: null };
  }
}

// MARK: - Tonhöhen

const hardMin = 55;
const hardMax = 81;

const midi = midiOfDegree;

/** In Moll: übermäßige Sekunde zwischen 6. und 7. Stufe — nie direkt. */
function isAugmentedSecond(a: number, b: number, key: MusicKey): boolean {
  if (key.isMajor || Math.abs(a - b) !== 1) return false;
  const x = mod7(a), y = mod7(b);
  return (x === 5 && y === 6) || (x === 6 && y === 5);
}

/** Stufenabstand, Halbtonabstand und keine übermäßige Sekunde — alle drei. */
function isSingableStep(a: number, b: number, key: MusicKey, difficulty: Difficulty): boolean {
  if (Math.abs(a - b) > difficulty.maxLeap) return false;
  if (Math.abs(midi(a, key) - midi(b, key)) > difficulty.maxLeapSemitones) return false;
  return !isAugmentedSecond(a, b, key);
}

/** Nächstgelegene Stufe mit der gewünschten Stufenklasse. */
function nearestDegree(pc: number, d: number): number {
  const base = d - mod7(d) + mod7(pc);
  let best = base - 7;
  for (const c of [base, base + 7]) if (Math.abs(c - d) < Math.abs(best - d)) best = c;
  return best;
}

interface DegreeWeight {
  degree: number;
  weight: number;
}

function weightedPick(options: readonly DegreeWeight[]): number {
  return WeightedSampler.sample(options, (o) => o.weight).degree;
}

// MARK: - Ebene 1: Bauplan

/** Bringt den Grundton in eine Lage, in der die ganze Periode Platz hat. */
function playableKey(key: MusicKey): MusicKey {
  let root = key.root;
  while (root < hardMin) root += 12;
  while (root > hardMin + 11) root -= 12;
  return { ...key, root };
}

/** Wählt die Stufe, um die das Motiv im nächsten Takt versetzt wird. */
function chooseTransposition(previous: number, motif: Motif, barIndex: number,
                             schema: readonly number[], key: MusicKey): number | null {
  const candidates: DegreeWeight[] = [];

  for (let rise = 1; rise <= 3; rise++) {
    const start = previous + rise;
    if (start > 7) continue;

    let playable = true;
    for (const s of motif.steps) {
      const m = midi(start + s, key);
      if (m < hardMin || m > hardMax) { playable = false; break; }
    }
    if (!playable) continue;

    const a = alignment(motif, start, barIndex, schema);
    candidates.push({ degree: start, weight: 0.15 + a * a * 2.5 });
  }

  if (candidates.length === 0) return null;
  return weightedPick(candidates);
}

/** Anteil der betonten Töne, die bei dieser Versetzung auf Akkordtöne fallen. */
function alignment(motif: Motif, start: number, barIndex: number, schema: readonly number[]): number {
  let hits = 0;
  let total = 0;
  for (let i = 0; i < motif.rhythm.length; i++) {
    const absBeat = barIndex * 4.0 + motif.rhythm[i].beat;
    if (absBeat % 1.0 !== 0) continue;
    const s = Math.min(schema.length - 1, Math.floor(absBeat / 2.0));
    const tones = MusicData.chordTones.get(schema[s]) ?? [];
    total += 1;
    if (tones.includes(mod7(start + motif.steps[i]))) hits += 1;
  }
  return total === 0 ? 0 : hits / total;
}

// MARK: - Ebene 2: Linienbau

/** Baut die Stufenfolge eines Taktes — der einzige Ort, an dem Ton für Ton entschieden wird. */
function buildLine(rhythm: readonly RhythmSlot[], barIndex: number, startDegree: number,
                   endTarget: number | null, descending: boolean, previousDegree: number | null,
                   schema: readonly number[], key: MusicKey, difficulty: Difficulty): number[] | null {

  if (previousDegree !== null) {
    if (!isSingableStep(previousDegree, startDegree, key, difficulty)) return null;
  }

  const n = rhythm.length;
  if (n < 2) return null;

  const degrees = [startDegree];
  let lastMove = 0;
  let leapRun = 0;

  for (let i = 1; i < n; i++) {
    const isLast = i === n - 1;
    const prev = degrees[i - 1];

    if (isLast && endTarget !== null) {
      const move = endTarget - prev;
      if (!(move !== 0 || n === 2)) return null;
      if (Math.abs(move) > difficulty.maxLeap || !isSingableStep(prev, endTarget, key, difficulty)) return null;
      if (Math.abs(lastMove) >= 2 && Math.abs(move) >= 2) return null;
      degrees.push(endTarget);
      continue;
    }

    const candidates: DegreeWeight[] = [];
    let barMinSoFar = Infinity, barMaxSoFar = -Infinity;
    for (const d of degrees) { if (d < barMinSoFar) barMinSoFar = d; if (d > barMaxSoFar) barMaxSoFar = d; }

    for (let move = -difficulty.maxLeap; move <= difficulty.maxLeap; move++) {
      const cand = prev + move;

      if (Math.abs(lastMove) >= 2) {
        if (!(Math.abs(move) === 1 && Math.sign(move) !== Math.sign(lastMove))) continue;
      }
      if (Math.abs(move) >= 2 && leapRun >= 2) continue;
      if (!isSingableStep(prev, cand, key, difficulty)) continue;

      if (difficulty.degreeWindow && !inRange(difficulty.degreeWindow, cand)) continue;
      const m = midi(cand, key);
      if (m < hardMin || m > hardMax) continue;

      const barMin = Math.min(barMinSoFar, cand);
      const barMax = Math.max(barMaxSoFar, cand);
      if (barMax - barMin > 5) continue;

      if (descending && cand > startDegree) continue;

      let w: number;
      switch (Math.abs(move)) {
        case 0: w = 0.7; break;
        case 1: w = 6.0; break;
        case 2: w = 3.0; break;
        case 3: w = 1.2; break;
        case 4: w = 0.7; break;
        default: w = 0.3;
      }

      w *= Profile.move(difficulty.profile, MelodicMoves.title(MelodicMoves.between(prev, cand, key)));

      const absBeat = barIndex * 4.0 + rhythm[i].beat;
      if (absBeat % 1.0 === 0) {
        const slot = Math.min(schema.length - 1, Math.floor(absBeat / 2.0));
        const tones = MusicData.chordTones.get(schema[slot]) ?? [];
        w *= tones.includes(mod7(cand)) ? 6.0 : 0.35;
      }

      if (descending) w *= move < 0 ? 4.0 : 0.25;

      if (!key.isMajor && mod7(cand) === 6 && endTarget === null) w *= 0.25;

      candidates.push({ degree: cand, weight: w });
    }

    if (candidates.length === 0) return null;
    const chosen = weightedPick(candidates);
    const move = chosen - degrees[i - 1];
    leapRun = Math.abs(move) >= 2 ? leapRun + 1 : 0;
    lastMove = move;
    degrees.push(chosen);
  }

  return degrees;
}

// MARK: - Ebene 3: Ableitungen

/** Schrittfolge einer Stufenfolge — die Gestalt ohne ihre Tonhöhe. */
export function stepPattern(degrees: readonly number[]): number[] {
  if (degrees.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < degrees.length; i++) out.push(degrees[i] - degrees[i - 1]);
  return out;
}

/** Längster zusammenhängender gemeinsamer Abschnitt zweier Schrittfolgen. */
export function longestCommonRun(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let best = 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] !== b[j - 1]) continue;
      cur[j] = prev[j - 1] + 1;
      best = Math.max(best, cur[j]);
    }
    prev = cur;
  }
  return best;
}

/** Takt 2: die Fortführung zum Halbschluss — bewusst nicht das Motiv. */
function continuationBar(target: number, startDegree: number, barIndex: number,
                         previousDegree: number | null, motifSteps: readonly number[],
                         schema: readonly number[], key: MusicKey, difficulty: Difficulty): Bar | null {
  for (let t = 0; t < 14; t++) {
    const rhythm = barRhythm("continuation", difficulty);
    if (!rhythm) continue;
    const line = buildLine(rhythm, barIndex, startDegree, target, false, previousDegree, schema, key, difficulty);
    if (!line) continue;
    if (longestCommonRun(stepPattern(line), motifSteps) < 4) {
      return { rhythm, degrees: line };
    }
  }

  return formulaBar(target, continuationFormulas, "continuation", barIndex, previousDegree, difficulty, schema, key);
}

/** Takt 3: das Motiv wird aufgegriffen — meist wörtlich transponiert. */
function restatementBar(motif: Motif, start: number, previousDegree: number | null,
                        schema: readonly number[], key: MusicKey, difficulty: Difficulty): Bar | null {
  const literal = motif.rhythm.length < 4 || Rand.next() < 0.85;
  if (literal) {
    const degrees = motif.steps.map((s) => start + s);
    if (isValidBar(degrees, previousDegree, key, difficulty)) {
      return { rhythm: motif.rhythm, degrees };
    }
  }

  const noteCount = motif.rhythm.length;
  const headLength = Math.max(2, Math.floor(noteCount / 2));
  if (headLength > noteCount - 1) return null;
  const degrees = motif.steps.slice(0, headLength).map((s) => start + s);
  const tail = buildLine(motif.rhythm.slice(headLength - 1), 2, degrees[headLength - 1],
                         null, false, null, schema, key, difficulty);
  if (!tail) return null;
  degrees.push(...tail.slice(1));

  if (!isValidBar(degrees, previousDegree, key, difficulty)) return null;
  return { rhythm: motif.rhythm, degrees };
}

/** Setzt höchstens eine Figur aus dem Rhythmusvokabular in die Melodie. */
function insertRhythmicFigure(bars: Bar[], key: MusicKey, difficulty: Difficulty): void {
  if (!(Rand.next() < difficulty.figureProbability)) return;

  const barChoice: DegreeWeight[] = [
    { degree: 0, weight: 0.10 }, { degree: 1, weight: 0.25 },
    { degree: 2, weight: 0.35 }, { degree: 3, weight: 0.30 },
  ];
  const barIdx = weightedPick(barChoice);
  const bar = bars[barIdx];

  const candidates: number[] = [];
  for (let i = 0; i < bar.rhythm.length; i++) {
    if (bar.rhythm[i].dur === 1.0 && i + 1 < bar.rhythm.length) candidates.push(i);
  }
  if (candidates.length === 0) return;
  const idx = candidates[Rand.index(candidates.length)];

  const cells = MusicData.rhythm1Beat.filter((c) => c.offsets.length >= 2);
  if (cells.length === 0) return;
  const cell = WeightedSampler.sample(cells, (c) => c.weight);

  const from = bar.degrees[idx];
  const target = bar.degrees[idx + 1];
  const line = figureLine(from, target, cell.offsets.length);
  if (!line) return;

  const targetIsFinal = barIdx === 3 && idx + 1 === bar.rhythm.length - 1;
  if (targetIsFinal) {
    if (Math.abs(line[line.length - 1] - target) !== 1) return;
  }

  const chain: number[] = [];
  if (idx > 0) chain.push(bar.degrees[idx - 1]);
  chain.push(...line);
  chain.push(target);
  for (let k = 1; k < chain.length; k++) {
    if (!isSingableStep(chain[k - 1], chain[k], key, difficulty)) return;
  }
  for (const g of line) {
    const m = midi(g, key);
    if (m < hardMin || m > hardMax) return;
  }

  const beat = bar.rhythm[idx].beat;
  const slots: RhythmSlot[] = [];
  for (let i = 0; i < cell.offsets.length; i++) {
    const off = cell.offsets[i];
    const next = i + 1 < cell.offsets.length ? cell.offsets[i + 1] : cell.duration;
    slots.push({ dur: next - off, beat: beat + off });
  }

  const newRhythm = bar.rhythm.slice();
  const newDegrees = bar.degrees.slice();
  newRhythm.splice(idx, 1, ...slots);
  newDegrees.splice(idx, 1, ...line);
  bars[barIdx] = { rhythm: newRhythm, degrees: newDegrees };
}

/** Tonfolge einer eingesetzten Figur: Durchgang oder Umspielung. */
function figureLine(d: number, target: number, n: number): number[] | null {
  if (n < 2 || n > 4) return null;
  const delta = target - d;

  if (Math.abs(delta) >= n) {
    const s = delta > 0 ? 1 : -1;
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(d + i * s);
    return out;
  }

  const u = Rand.next() < 0.6 ? 1 : -1;
  switch (n) {
    case 2: return [d, d + u];
    case 3: return [d, d + u, d];
    default: return [d, d + u, d, d - u];
  }
}

/** Idiomatische Schlussformeln, in Stufen relativ zum Zielgrundton. */
const cadenceFormulas: readonly (readonly number[])[] = [
  [2, 1, 0], [3, 1, 0], [1, -1, 0], [4, 1, 0],
  [3, 2, 1, 0], [4, 2, 1, 0], [2, 1, -1, 0], [3, 1, -1, 0], [2, 3, 1, 0],
  [4, 3, 2, 1, 0], [5, 3, 2, 1, 0], [3, 2, 1, -1, 0], [4, 2, 1, -1, 0], [3, 4, 2, 1, 0],
  [5, 4, 3, 2, 1, 0], [4, 3, 2, 1, -1, 0], [5, 3, 2, 1, -1, 0], [4, 5, 3, 2, 1, 0],
  [6, 5, 4, 3, 2, 1, 0], [5, 4, 3, 2, 1, -1, 0], [6, 4, 3, 2, 1, -1, 0],
];

/** Wege zum Halbschluss, relativ zum Zielton, der immer zuletzt steht. */
const continuationFormulas: readonly (readonly number[])[] = [
  [-2, -1, 0], [2, 1, 0], [1, -1, 0], [-1, 1, 0], [3, 1, 0], [-3, -1, 0],
  [-3, -2, -1, 0], [3, 2, 1, 0], [1, 2, -1, 0], [-1, -2, 1, 0],
  [2, -1, 1, 0], [-2, 1, -1, 0], [0, 2, 1, 0], [0, -2, -1, 0],
  [4, 3, 2, 1, 0], [-4, -3, -2, -1, 0], [2, 3, 1, -1, 0], [-2, -3, -1, 1, 0],
  [1, 3, 2, 1, 0], [-1, -3, -2, -1, 0],
  [3, 4, 2, 1, -1, 0], [-3, -4, -2, -1, 1, 0], [5, 4, 3, 2, 1, 0],
];

/** Takt 4: fallende Schlussformel zum Grundton. */
function cadenceBar(target: number, previousDegree: number | null, difficulty: Difficulty,
                    schema: readonly number[], key: MusicKey): Bar | null {
  return formulaBar(target, cadenceFormulas, "cadence", 3, previousDegree, difficulty, schema, key);
}

/** Baut einen Takt aus einem festen Formelvorrat statt Ton für Ton. */
function formulaBar(target: number, formulas: readonly (readonly number[])[], role: BarRole,
                    barIndex: number, previousDegree: number | null, difficulty: Difficulty,
                    schema: readonly number[], key: MusicKey): Bar | null {
  for (let t = 0; t < 16; t++) {
    const rhythm = barRhythm(role, difficulty);
    if (!rhythm) continue;

    const options: { formula: readonly number[]; weight: number }[] = [];
    for (const formula of formulas) {
      if (formula.length !== rhythm.length) continue;
      const degrees = formula.map((f) => target + f);

      if (!isValidBar(degrees, previousDegree, key, difficulty)) continue;

      let hits = 0;
      let total = 0;
      for (let i = 0; i < rhythm.length; i++) {
        const absBeat = barIndex * 4.0 + rhythm[i].beat;
        if (absBeat % 1.0 !== 0) continue;
        const s = Math.min(schema.length - 1, Math.floor(absBeat / 2.0));
        const tones = MusicData.chordTones.get(schema[s]) ?? [];
        total += 1;
        if (tones.includes(mod7(degrees[i]))) hits += 1;
      }
      const a = total === 0 ? 0 : hits / total;
      options.push({ formula, weight: 0.02 + a * a * a * 6.0 });
    }

    if (options.length === 0) continue;
    const chosen = WeightedSampler.sample(options, (o) => o.weight).formula;
    return { rhythm, degrees: chosen.map((f) => target + f) };
  }
  return null;
}

/** Prüft eine fertig übernommene Motivgestalt. */
function isValidBar(degrees: readonly number[], previousDegree: number | null,
                    key: MusicKey, difficulty: Difficulty): boolean {
  if (degrees.length < 2) return false;

  if (previousDegree !== null) {
    if (!isSingableStep(previousDegree, degrees[0], key, difficulty)) return false;
  }
  for (let i = 1; i < degrees.length; i++) {
    if (!isSingableStep(degrees[i - 1], degrees[i], key, difficulty)) return false;
  }
  for (const d of degrees) {
    if (difficulty.degreeWindow && !inRange(difficulty.degreeWindow, d)) return false;
    const m = midi(d, key);
    if (m < hardMin || m > hardMax) return false;
  }
  return true;
}

// MARK: - Ebene 4: musikalische Prüfung

function passesMusicalChecks(bars: readonly Bar[], key: MusicKey, difficulty: Difficulty): boolean {
  const allDegrees = bars.flatMap((b) => b.degrees);
  const allMidi = allDegrees.map((d) => midi(d, key));

  if (allDegrees.length === 0) return false;
  const tonic = allDegrees[allDegrees.length - 1];
  if (!Ambitus.permits(difficulty.ambitus, Math.min(...allDegrees), Math.max(...allDegrees), tonic, allDegrees)) {
    return false;
  }

  const means = bars.map((bar) => bar.degrees.reduce((a, b) => a + b, 0) / bar.degrees.length);
  if (!(means[0] < means[1] && means[1] < means[2] && means[3] < means[2])) return false;

  const peak = Math.max(...allMidi);
  const peakIndex = allMidi.indexOf(peak);
  const peakCount = allMidi.filter((m) => m === peak).length;
  if (difficulty.strictPeak) {
    if (peakCount !== 1) return false;
    const nachsatz = bars[0].degrees.length + bars[1].degrees.length;
    if (peakIndex < nachsatz) return false;
  } else {
    if (peakCount > 2) return false;
    if (peakIndex < bars[0].degrees.length) return false;
  }

  for (const bar of bars) if (new Set(bar.degrees).size < 2) return false;

  for (let i = 1; i < allDegrees.length; i++) {
    if (!isSingableStep(allDegrees[i - 1], allDegrees[i], key, difficulty)) return false;
  }

  if (mod7(tonic) !== 0) return false;

  return true;
}

// MARK: - Rhythmus

type BarRole = "motif" | "continuation" | "cadence";

interface SlotGroup {
  readonly duration: number;
  readonly weight: number;
  readonly build: (pos: number) => RhythmSlot[];
}

function group(duration: number, build: (pos: number) => RhythmSlot[]): SlotGroup {
  return { duration, weight: 0, build };
}

const quarter = group(1.0, (pos) => [{ dur: 1, beat: pos }]);
const twoEighths = group(1.0, (pos) => [{ dur: 0.5, beat: pos }, { dur: 0.5, beat: pos + 0.5 }]);
const dottedQuarterEighth = group(2.0, (pos) => [{ dur: 1.5, beat: pos }, { dur: 0.5, beat: pos + 1.5 }]);
const eighthDottedQuarter = group(2.0, (pos) => [{ dur: 0.5, beat: pos }, { dur: 1.5, beat: pos + 0.5 }]);
const half = group(2.0, (pos) => [{ dur: 2, beat: pos }]);
const fourSixteenths = group(1.0, (pos) => [0, 1, 2, 3].map((i) => ({ dur: 0.25, beat: pos + i * 0.25 })));
const dottedEighthSixteenth = group(1.0, (pos) => [{ dur: 0.75, beat: pos }, { dur: 0.25, beat: pos + 0.75 }]);
const eighthTwoSixteenths = group(1.0, (pos) => [
  { dur: 0.5, beat: pos }, { dur: 0.25, beat: pos + 0.5 }, { dur: 0.25, beat: pos + 0.75 }]);
const twoSixteenthsEighth = group(1.0, (pos) => [
  { dur: 0.25, beat: pos }, { dur: 0.25, beat: pos + 0.25 }, { dur: 0.5, beat: pos + 0.5 }]);

function weighted(g: SlotGroup, w: number): SlotGroup {
  return { duration: g.duration, weight: w, build: g.build };
}

/** Baut den Rhythmus eines Taktes; das Motiv braucht mindestens zwei Notenwerte. */
function barRhythm(role: BarRole, difficulty: Difficulty): RhythmSlot[] | null {
  for (let t = 0; t < 12; t++) {
    const candidate = buildBarRhythm(role, difficulty);
    if (!candidate) continue;
    if (role === "motif" && new Set(candidate.map((s) => s.dur)).size < 2) continue;
    return candidate;
  }
  return null;
}

function rhythmOptions(role: BarRole, level: DictationLevel, pos: number): SlotGroup[] {
  const vorn = pos < 2.0;
  switch (`${role}/${level}`) {
    case "motif/leicht":
      return vorn
        ? [weighted(quarter, 0.50), weighted(twoEighths, 0.50)]
        : [weighted(quarter, 0.45), weighted(twoEighths, 0.30), weighted(half, 0.25)];
    case "continuation/leicht":
      return vorn
        ? [weighted(twoEighths, 0.55), weighted(quarter, 0.45)]
        : [weighted(quarter, 0.55), weighted(twoEighths, 0.30), weighted(half, 0.15)];
    case "continuation/mittel":
      return vorn
        ? [weighted(twoEighths, 0.45), weighted(quarter, 0.40), weighted(dottedQuarterEighth, 0.15)]
        : [weighted(quarter, 0.40), weighted(twoEighths, 0.30),
           weighted(dottedQuarterEighth, 0.15), weighted(half, 0.15)];
    case "continuation/abitur":
      return vorn
        ? [weighted(twoEighths, 0.28), weighted(quarter, 0.20), weighted(dottedQuarterEighth, 0.14),
           weighted(dottedEighthSixteenth, 0.16), weighted(eighthTwoSixteenths, 0.12), weighted(fourSixteenths, 0.10)]
        : [weighted(quarter, 0.30), weighted(twoEighths, 0.24), weighted(dottedQuarterEighth, 0.16),
           weighted(dottedEighthSixteenth, 0.14), weighted(half, 0.16)];
    case "cadence/leicht":
      return vorn
        ? [weighted(quarter, 0.55), weighted(twoEighths, 0.45)]
        : [weighted(half, 0.60), weighted(quarter, 0.40)];
    case "motif/mittel":
      return vorn
        ? [weighted(quarter, 0.40), weighted(twoEighths, 0.40),
           weighted(dottedQuarterEighth, 0.10), weighted(eighthDottedQuarter, 0.10)]
        : [weighted(quarter, 0.45), weighted(twoEighths, 0.35), weighted(half, 0.10), weighted(dottedQuarterEighth, 0.10)];
    case "cadence/mittel":
      return vorn
        ? [weighted(twoEighths, 0.55), weighted(quarter, 0.35), weighted(dottedQuarterEighth, 0.10)]
        : [weighted(half, 0.50), weighted(quarter, 0.50)];
    case "motif/abitur":
      return vorn
        ? [weighted(quarter, 0.24), weighted(twoEighths, 0.30), weighted(dottedQuarterEighth, 0.12),
           weighted(eighthDottedQuarter, 0.10), weighted(dottedEighthSixteenth, 0.10),
           weighted(eighthTwoSixteenths, 0.08), weighted(twoSixteenthsEighth, 0.06)]
        : [weighted(quarter, 0.28), weighted(twoEighths, 0.26), weighted(half, 0.06), weighted(dottedQuarterEighth, 0.14),
           weighted(dottedEighthSixteenth, 0.12), weighted(fourSixteenths, 0.06), weighted(eighthTwoSixteenths, 0.08)];
    case "cadence/abitur":
      return vorn
        ? [weighted(twoEighths, 0.34), weighted(quarter, 0.18), weighted(dottedQuarterEighth, 0.12),
           weighted(dottedEighthSixteenth, 0.14), weighted(fourSixteenths, 0.10), weighted(eighthTwoSixteenths, 0.12)]
        : [weighted(half, 0.45), weighted(quarter, 0.45), weighted(dottedQuarterEighth, 0.10)];
    default:
      throw new Error(`Kein Rhythmusvorrat für ${role}/${level}`);
  }
}

function buildBarRhythm(role: BarRole, difficulty: Difficulty): RhythmSlot[] | null {
  const beats: RhythmSlot[] = [];
  let pos = 0.0;

  while (pos < 4.0) {
    const remaining = 4.0 - pos;
    const options = rhythmOptions(role, difficulty.level, pos);

    const fitting = options.filter((o) => o.duration <= remaining + 1e-9);
    if (fitting.length === 0) return null;

    const chosen = WeightedSampler.sample(fitting, (o) => o.weight);
    beats.push(...chosen.build(pos));
    pos += chosen.duration;
  }

  if (beats.length < 2) return null;
  return beats;
}

// MARK: - Ersatzmelodie

/** Baut ein Diktat aus Paaren (MIDI, Dauer in Vierteln). */
function handwritten(pairs: readonly [number, number][]): MelodyDictation {
  let position = 0.0;
  const notes: MelodyNote[] = pairs.map(([midiNumber, dur]) => {
    const note = { midiNumber, durationBeats: dur, beatPosition: position, cellId: "Note" };
    position += dur;
    return note;
  });
  return { key: MusicData.keyCatalog[0], notes };
}

/** C-Dur, Ambitus eine Quinte, Anfang und Schluss auf c. */
const narrowFallback = handwritten([
  [60, 1], [62, 1], [64, 1], [62, 1],
  [64, 1], [65, 1], [64, 1], [67, 1],
  [67, 1], [65, 1], [64, 1], [65, 1],
  [64, 1], [62, 1], [60, 2],
]);

/** C-Dur, Ambitus eine None — wie im Abitur verlangt. */
const wideFallback = handwritten([
  [60, 1], [62, 1], [64, 1], [60, 1],
  [64, 1], [67, 1], [65, 1], [62, 1],
  [64, 1], [69, 1], [72, 1], [74, 1],
  [71, 1], [67, 1], [64, 1], [60, 1],
]);

function legacyFallback(): MelodyDictation {
  const n = (midiNumber: number, durationBeats: number, beatPosition: number): MelodyNote =>
    ({ midiNumber, durationBeats, beatPosition, cellId: "Note" });
  return {
    key: MusicData.keyCatalog[0],
    notes: [
      n(60, 1, 0), n(62, 1, 1), n(64, 1, 2), n(62, 1, 3),
      n(64, 1, 4), n(67, 1, 5), n(65, 1, 6), n(67, 1, 7),
      n(67, 1, 8), n(69, 1, 9), n(71, 1, 10), n(69, 1, 11),
      n(69, 0.5, 12), n(67, 0.5, 12.5), n(65, 0.5, 13), n(64, 0.5, 13.5), n(62, 1, 14), n(60, 1, 15),
    ],
  };
}

function fallbackDictation(level: DictationLevel): MelodyDictation {
  switch (level) {
    case "leicht": return narrowFallback;
    case "abitur": return wideFallback;
    case "mittel": return legacyFallback();
  }
}

// MARK: - Öffentliche Erzeugung

export const MelodyGenerator = {
  midi: midiOfDegree,
  degree: degreeOfMidi,

  /** Der Tonvorrat, den die Eingabe anbieten muss — Stufen relativ zur Tonika. */
  pitchWindow(level: DictationLevel): Range {
    const ambitus = difficultyFor(level).ambitus;
    return { lower: Ambitus.lowestAboveTonic(ambitus), upper: Ambitus.highestAboveTonic(ambitus) };
  },

  /** Die Tonika, auf die sich das Stufenfenster bezieht — aus dem angesagten Anfangston. */
  tonicDegree(startMidi: number, key: MusicKey): number | null {
    const start = degreeOfMidi(startMidi, key);
    if (start === null) return null;
    return start - mod7(start);
  },

  /** Erzeugt ein Melodiediktat als viertaktige Periode. */
  generateDictation(level: DictationLevel = DictationLevels.standard,
                    profile: AdaptiveProfile = NEUTRAL): MelodyDictation {
    const diff = difficultyFor(level);
    diff.profile = profile;

    const pool = MusicData.keyCatalog.filter((k) => !diff.simpleKeysOnly || Math.abs(k.acc) <= 1);
    for (let t = 0; t < 120; t++) {
      const key = WeightedSampler.sample(pool, (k) => Profile.key(profile, k.name));
      const dictation = MelodyGenerator.tryGenerateMelody(key, level, profile);
      if (dictation) return dictation;
    }
    return fallbackDictation(level);
  },

  /** Ein Erzeugungsversuch. `null`, wenn der Bauplan nicht aufging. */
  tryGenerateMelody(key: MusicKey, level: DictationLevel, profile: AdaptiveProfile = NEUTRAL): MelodyDictation | null {
    const keyCopy = playableKey(key);
    const diff = difficultyFor(level);
    diff.profile = profile;

    // --- Ebene 1: Bauplan
    const schema = Rand.element(MusicData.harmonySchemas);
    const start0 = diff.anchoredToTonic ? 0 : (Rand.next() < 0.65 ? 0 : 2);

    if (diff.anchoredToTonic) {
      diff.degreeWindow = { lower: start0 - 1, upper: start0 + Ambitus.highestAboveTonic(diff.ambitus) };
    }

    // --- Ebene 2: das Motiv (Takt 1)
    const motifRhythm = barRhythm("motif", diff);
    if (!motifRhythm) return null;
    const bar1Degrees = buildLine(motifRhythm, 0, start0, null, false, null, schema, keyCopy, diff);
    if (!bar1Degrees) return null;

    const motif: Motif = { rhythm: motifRhythm, steps: bar1Degrees.map((d) => d - bar1Degrees[0]) };

    const start1 = chooseTransposition(start0, motif, 1, schema, keyCopy);
    if (start1 === null) return null;
    const start2 = chooseTransposition(start1, motif, 2, schema, keyCopy);
    if (start2 === null) return null;

    const halfCadence = nearestDegree(weightedPick(MusicData.halfCadenceDegrees), start1 + 1);
    const finalTarget = diff.anchoredToTonic ? start0 : 7 * Math.floor((start2 - 1) / 7);
    if (start2 - finalTarget < 2) return null;
    for (const d of [halfCadence, finalTarget]) {
      const m = midi(d, keyCopy);
      if (m < hardMin || m > hardMax) return null;
    }

    // --- Ebene 3: Ableitungen
    const bar2 = continuationBar(halfCadence, start1, 1, bar1Degrees[bar1Degrees.length - 1],
                                 stepPattern(bar1Degrees), schema, keyCopy, diff);
    if (!bar2) return null;

    const bar3 = restatementBar(motif, start2, bar2.degrees[bar2.degrees.length - 1], schema, keyCopy, diff);
    if (!bar3) return null;

    const bar4 = cadenceBar(finalTarget, bar3.degrees[bar3.degrees.length - 1], diff, schema, keyCopy);
    if (!bar4) return null;

    const bars: Bar[] = [{ rhythm: motifRhythm, degrees: bar1Degrees }, bar2, bar3, bar4];

    insertRhythmicFigure(bars, keyCopy, diff);

    // --- Ebene 4: Prüfung
    if (!passesMusicalChecks(bars, keyCopy, diff)) return null;

    const notes: MelodyNote[] = [];
    bars.forEach((bar, m) => {
      bar.rhythm.forEach((slot, i) => {
        notes.push({
          midiNumber: midi(bar.degrees[i], keyCopy),
          durationBeats: slot.dur,
          beatPosition: m * 4.0 + slot.beat,
          cellId: slot.dur === 0.25 ? "SechzehntelLauf" : "Note",
        });
      });
    });
    return { key: keyCopy, notes };
  },
};
