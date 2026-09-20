// Aufgabe und Übungsmodus. Portierung von `Models/QuizTask.swift`.

import type { MelodyDictation, RhythmFigure } from "./MusicData";
import type { DictationLevel } from "./DictationLevel";
import { DictationEntry } from "./DictationEntry";

export type Kind = "interval" | "chord" | "rhythm" | "melody";

export const Kinds = {
  all: ["interval", "chord", "rhythm", "melody"] as readonly Kind[],
  dictations: ["rhythm", "melody"] as readonly Kind[],

  badgeTitle(kind: Kind): string {
    switch (kind) {
      case "interval": return "Intervall";
      case "chord": return "Akkord";
      case "rhythm": return "Rhythmus";
      case "melody": return "Melodie";
    }
  },
};

export interface QuizTask {
  readonly id: string;
  readonly kind: Kind;
  name: string;
  rootNote: number;
  offsets: number[];
  rhythmData: RhythmFigure[][];
  playMidi: number;
  melodyData: MelodyDictation | null;
  level: DictationLevel | null;
  userChoice: string | null;
  isCorrect: boolean;
}

let laufendeId = 0;

export function neueAufgabe(kind: Kind): QuizTask {
  laufendeId += 1;
  return {
    id: `aufgabe-${laufendeId}`,
    kind,
    name: "",
    rootNote: 0,
    offsets: [],
    rhythmData: [],
    playMidi: 0,
    melodyData: null,
    level: null,
    userChoice: null,
    isCorrect: false,
  };
}

export type TrainingMode = "intervals" | "chords" | "rhythm" | "melody" | "kurz" | "mix";

export const TrainingModes = {
  all: ["intervals", "chords", "rhythm", "melody", "kurz", "mix"] as readonly TrainingMode[],
  visible: ["intervals", "chords", "rhythm", "melody", "kurz", "mix"] as readonly TrainingMode[],
  kacheln: ["intervals", "chords", "rhythm", "melody"] as readonly TrainingMode[],

  title(mode: TrainingMode): string {
    switch (mode) {
      case "intervals": return "Intervalle";
      case "chords": return "Akkorde";
      case "rhythm": return "Rhythmus";
      case "melody": return "Melodiediktat";
      case "kurz": return "Schnell üben";
      case "mix": return "Komplettprüfung";
    }
  },

  istKurz: (mode: TrainingMode) => mode === "kurz",
  aufgabenJeGehoerDisziplin: (mode: TrainingMode) => (mode === "kurz" ? 3 : 7),
  rhythmusTakte: (mode: TrainingMode) => (mode === "kurz" ? 1 : DictationEntry.standardBarCount),

  kinds(mode: TrainingMode): readonly Kind[] {
    switch (mode) {
      case "intervals": return ["interval"];
      case "chords": return ["chord"];
      case "rhythm": return ["rhythm"];
      case "melody": return ["melody"];
      case "kurz": return ["interval", "chord", "rhythm"];
      case "mix": return ["rhythm", "melody", "interval", "chord"];
    }
  },

  allowsAdaptive: (mode: TrainingMode) => mode !== "mix",
  allowsLearningHints: (mode: TrainingMode) => mode !== "mix",

  subtitle(mode: TrainingMode): string {
    switch (mode) {
      case "intervals": return "7 Aufgaben";
      case "chords": return "7 Aufgaben";
      case "rhythm": return "1 Diktat (4 Takte)";
      case "melody": return "1 Diktat (4 Takte)";
      case "kurz": return "3 Intervalle · 3 Akkorde · 1 Takt";
      case "mix": return "16 Aufgaben (Simulation)";
    }
  },
};
