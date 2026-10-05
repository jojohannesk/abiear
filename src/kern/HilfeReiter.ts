// Die Reiter des Hilfe-Blatts hinter dem Fragezeichen in jeder Aufgabe.
// Aus `Models/QuizTask.swift` (`HilfeReiter`, `TrainingMode(uebungFuer:)`).
import { TrainingModes, type Kind, type TrainingMode } from "./QuizTask";
import { Lernhilfen } from "./Lernhilfen";

export type HilfeReiter = "bedienung" | "pruefung" | "lernen";

export const HilfeReiters = {
  titel(r: HilfeReiter): string {
    switch (r) {
      case "bedienung": return "Bedienung";
      case "pruefung": return "Zur Prüfung";
      case "lernen": return "Woran du es hörst";
    }
  },

  /** Bedienung und Prüfungsordnung immer; das Lernblatt nur beim Üben (die
   *  Komplettprüfung bietet keine Hörhilfe an) und nur, wo es Lernstoff gibt. */
  reiter(mode: TrainingMode, kind: Kind): HilfeReiter[] {
    const liste: HilfeReiter[] = ["bedienung", "pruefung"];
    if (TrainingModes.allowsLearningHints(mode) && Lernhilfen.strategie(kind).length > 0) liste.push("lernen");
    return liste;
  },

  /** Der Übungsbereich, zu dem eine Aufgabe gehört — in Komplettprüfung und
   *  „Schnell üben“ ist `store.mode` ein Sammelbereich. */
  uebungFuer(kind: Kind): TrainingMode {
    switch (kind) {
      case "interval": return "intervals";
      case "chord": return "chords";
      case "rhythm": return "rhythm";
      case "melody": return "melody";
    }
  },
};
