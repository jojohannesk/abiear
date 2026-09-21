// Bereichssymbole und Umfangsangaben. Aus `DesignSystem.swift` (Erweiterung
// von `TrainingMode`) und `TabLeiste.swift`.

import type { TrainingMode } from "../kern/QuizTask";

export function modeSymbol(mode: TrainingMode): string {
  switch (mode) {
    case "intervals": return "arrow.up.arrow.down";
    case "chords": return "square.stack.3d.up";
    case "rhythm": return "metronome";
    case "melody": return "music.quarternote.3";
    case "kurz": return "tram.fill";
    case "mix": return "checkmark.seal";
  }
}

/** Knappe Angabe zum Umfang, für die rechte Spalte der Übungsliste. */
export function scopeLabel(mode: TrainingMode): string {
  switch (mode) {
    case "intervals": case "chords": return "7 Aufgaben";
    case "rhythm": case "melody": return "4 Takte";
    case "kurz": return "2 Minuten";
    case "mix": return "16 Aufgaben";
  }
}

export type Tab = "ueben" | "lernen" | "statistik" | "mehr";

export const Tabs = {
  all: ["ueben", "lernen", "statistik", "mehr"] as readonly Tab[],
  titel(tab: Tab): string {
    switch (tab) {
      case "ueben": return "Üben";
      case "lernen": return "Lernen";
      case "statistik": return "Statistik";
      case "mehr": return "Mehr";
    }
  },
  symbol(tab: Tab, aktiv: boolean): string {
    switch (tab) {
      case "ueben": return "waveform";
      case "lernen": return aktiv ? "book.fill" : "book";
      case "statistik": return aktiv ? "chart.bar.fill" : "chart.bar";
      case "mehr": return aktiv ? "ellipsis.circle.fill" : "ellipsis.circle";
    }
  },
};
