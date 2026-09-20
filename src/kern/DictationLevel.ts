// Schwierigkeitsgrade der Diktate. Portierung von `Models/DictationLevel.swift`.
//
// `mittel` ist der Nullpunkt: es muss genau das erzeugen, was die App vor
// Einführung der Niveaus erzeugt hat.

import { MusicData, type RhythmCell } from "./MusicData";

export type DictationLevel = "leicht" | "mittel" | "abitur";

export const DictationLevels = {
  all: ["leicht", "mittel", "abitur"] as readonly DictationLevel[],
  standard: "mittel" as DictationLevel,

  title(level: DictationLevel): string {
    switch (level) {
      case "leicht": return "Leicht";
      case "mittel": return "Mittel";
      case "abitur": return "Abi-Niveau";
    }
  },

  /** Kurzform für enge Stellen — Kacheluntertitel, Statistikfilter. */
  shortTitle(level: DictationLevel): string {
    switch (level) {
      case "leicht": return "Leicht";
      case "mittel": return "Mittel";
      case "abitur": return "Abi";
    }
  },

  /** Was auf dieser Stufe drankommt. */
  summary(level: DictationLevel, kind: "rhythm" | "melody" | string): string {
    if (kind === "rhythm") {
      switch (level) {
        case "leicht": return "Halbe, Viertel, zwei Achtel, vier Sechzehntel, Triole";
        case "mittel": return "Dazu Punktierungen und gemischte Sechzehntelfiguren";
        case "abitur": return "Ohne halbe Noten · mindestens drei Figuren je Takt · "
          + "immer mit Triole und Punktierung";
      }
    }
    if (kind === "melody") {
      switch (level) {
        case "leicht": return "Viertel, Halbe, Achtel · nur Sekund- und Terzschritte · "
          + "Ambitus bis zur Quinte · beginnt und endet auf demselben Grundton";
        case "mittel": return "Dazu Punktierungen · Sprünge bis zur Quinte · Ambitus bis zur Oktave";
        case "abitur": return "Viele kurze Werte und Punktierungen · Ambitus genau eine None, "
          + "wie in der Prüfung";
      }
    }
    return "";
  },

  /** Zellen, die auf dieser Stufe überhaupt vorkommen dürfen. `null` = alle. */
  allowedCellIds(level: DictationLevel): Set<string> | null {
    switch (level) {
      case "leicht":
        return new Set(["halbe", "viertel", "zwei_achtel", "vier_sechz", "achtel_triole"]);
      case "mittel":
        return null;
      case "abitur": {
        // Halbe Noten sind verboten.
        const alle = new Set([...MusicData.rhythm1Beat, ...MusicData.rhythm2Beat].map((c) => c.id));
        alle.delete("halbe");
        return alle;
      }
    }
  },

  rhythmCells1Beat(level: DictationLevel): readonly RhythmCell[] {
    const allowed = DictationLevels.allowedCellIds(level);
    return allowed ? MusicData.rhythm1Beat.filter((c) => allowed.has(c.id)) : MusicData.rhythm1Beat;
  },

  rhythmCells2Beat(level: DictationLevel): readonly RhythmCell[] {
    const allowed = DictationLevels.allowedCellIds(level);
    return allowed ? MusicData.rhythm2Beat.filter((c) => allowed.has(c.id)) : MusicData.rhythm2Beat;
  },

  /** Mindestzahl verschiedener Vokabeln je Takt — nur im Abitur gefordert. */
  minDistinctCellsPerBar(level: DictationLevel): number {
    return level === "abitur" ? 3 : 1;
  },

  /** Ob im Diktat mindestens eine Punktierung vorkommen muss. */
  requiresDottedFigure(level: DictationLevel): boolean {
    return level !== "leicht";
  },

  /** Ob im Diktat mindestens eine Triole vorkommen muss. */
  requiresTriplet(level: DictationLevel): boolean {
    return level === "abitur";
  },
};
