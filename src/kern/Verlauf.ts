// Was zuletzt drankam — damit Intervalle, Akkorde und Tonarten nicht ständig
// wiederkehren. Portierung von `Models/Verlauf.swift`; dort steht die
// Begründung samt Messung.
//
// Der Verlauf dämpft, er schließt nicht aus: ein eben gezogener Name zählt
// `BODEN`, danach erholt er sich kubisch, bis er nach so vielen Ziehungen,
// wie der Katalog Einträge hat, wieder voll zählt. Ein höheres Grundgewicht
// (adaptiver Modus) erholt sich schneller (`tempo`). Ein leerer Verlauf
// ändert nichts — der Zug ist dann derselbe wie ohne.
import { MusicData } from "./MusicData";
import { WeightedSampler } from "./RhythmGenerator";

export type VerlaufKategorie = "intervalle" | "akkorde" | "tonarten";
export const VERLAUF_KATEGORIEN: readonly VerlaufKategorie[] = ["intervalle", "akkorde", "tonarten"];

export const VERLAUF_DATEI = "verlauf.json";
export const BODEN = 0.02;
const FORMAT_VERSION = 1;

function katalog(k: VerlaufKategorie): string[] {
  switch (k) {
    case "intervalle": return MusicData.intervals.map((i) => i.name);
    case "akkorde": return MusicData.chords.map((c) => c.name);
    case "tonarten": return MusicData.keyCatalog.map((t) => t.name);
  }
}

function spanne(k: VerlaufKategorie): number {
  return katalog(k).length;
}

export class Verlauf {
  /** Je Kategorie die zuletzt gezogenen Klarnamen, neueste zuerst. */
  readonly zuletzt: Partial<Record<VerlaufKategorie, string[]>>;

  constructor(zuletzt: Partial<Record<VerlaufKategorie, string[]>> = {}) {
    this.zuletzt = zuletzt;
  }

  static leer(): Verlauf {
    return new Verlauf();
  }

  /** Faktor zwischen `BODEN` und 1. `x * x * x` wie in Swift, nicht `**`. */
  faktor(name: string, kategorie: VerlaufKategorie, tempo = 1): number {
    const k = this.zuletzt[kategorie]?.indexOf(name) ?? -1;
    if (k < 0) return 1;
    const x = Math.min(1, (k * tempo) / spanne(kategorie));
    return Math.min(1, BODEN + (1 - BODEN) * x * x * x);
  }

  merke(name: string, kategorie: VerlaufKategorie): void {
    const liste = (this.zuletzt[kategorie] ?? []).filter((n) => n !== name);
    liste.unshift(name);
    this.zuletzt[kategorie] = liste.slice(0, spanne(kategorie));
  }

  /** Grundgewicht mal Verlaufsfaktor; verbraucht genau einen Zufallswert. */
  ziehe<T>(pool: readonly T[], kategorie: VerlaufKategorie, name: (t: T) => string, grundgewicht: (t: T) => number): T {
    const basis = pool.map(grundgewicht);
    let summe = 0;
    for (const b of basis) summe += b;
    const mittel = summe / Math.max(1, basis.length);
    const gewichte = pool.map((t, i) => basis[i] * this.faktor(name(t), kategorie, mittel > 0 ? basis[i] / mittel : 1));
    return pool[WeightedSampler.sampleIndex(pool.map((_, i) => i), (i) => gewichte[i])];
  }

  /** Wie `JSONEncoder` mit `.sortedKeys` — Byte für Byte gleich mit Swift. */
  json(): string {
    const zuletzt: Record<string, string[]> = {};
    for (const k of [...VERLAUF_KATEGORIEN].sort()) {
      const liste = this.zuletzt[k];
      if (liste) zuletzt[k] = liste;
    }
    return JSON.stringify({ formatVersion: FORMAT_VERSION, zuletzt });
  }

  /** Liest nur, was zum heutigen Katalog passt; Unlesbares gilt als leer. */
  static aus(json: string | null): Verlauf {
    if (!json) return Verlauf.leer();
    try {
      const datei = JSON.parse(json) as { formatVersion?: unknown; zuletzt?: Record<string, unknown> };
      if (typeof datei.formatVersion !== "number" || datei.formatVersion > FORMAT_VERSION) return Verlauf.leer();
      const v = new Verlauf();
      for (const k of VERLAUF_KATEGORIEN) {
        const roh = datei.zuletzt?.[k];
        if (!Array.isArray(roh)) continue;
        const gueltig = new Set(katalog(k));
        const liste = roh.filter((n): n is string => typeof n === "string" && gueltig.has(n)).slice(0, spanne(k));
        if (liste.length) v.zuletzt[k] = liste;
      }
      return v;
    } catch {
      return Verlauf.leer();
    }
  }
}
