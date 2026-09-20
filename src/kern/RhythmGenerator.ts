// Rhythmusdiktat. Portierung von `Generation/RhythmGenerator.swift`.
//
// Wörtlich übertragen — dieselbe Reihenfolge der Zufallszüge, dieselben
// Rundungen. `rhythm-<niveau>.json` aus dem Goldmaster verlangt Gleichheit.
//
// Ein Unterschied zur Vorlage, der leicht übersehen wird: Swift-Arrays von
// Structs haben Wertsemantik. `saved1 = pool1` ist dort eine Kopie; hier
// muss sie ausdrücklich angelegt werden (`kopie`), sonst baut jeder
// Fehlversuch die Gewichte weiter ab.

import { Rand } from "./Random";
import { MusicData, type RhythmCell, type RhythmFigure } from "./MusicData";
import { DictationLevels, type DictationLevel } from "./DictationLevel";
import { NEUTRAL, Profile, type AdaptiveProfile } from "./AdaptiveProfile";

export const WeightedSampler = {
  /** Zieht ein Element mit einer Wahrscheinlichkeit proportional zu seinem Gewicht. */
  sample<T>(arr: readonly T[], weight: (t: T) => number): T {
    return arr[WeightedSampler.sampleIndex(arr, weight)];
  },

  /** Wie `sample`, gibt aber den Index zurück. */
  sampleIndex<T>(arr: readonly T[], weight: (t: T) => number): number {
    if (arr.length === 0) throw new Error("Auswahl aus leerem Pool");
    let total = 0;
    for (const c of arr) total += Math.max(0, weight(c));
    if (!(total > 0)) return Rand.index(arr.length);

    let r = Rand.next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= Math.max(0, weight(arr[i]));
      if (r <= 0) return i;
    }
    return arr.length - 1;
  },
};

interface PoolEntry {
  cell: RhythmCell;
  baseWeight: number;
  currentWeight: number;
}

function kopie(pool: PoolEntry[]): PoolEntry[] {
  return pool.map((e) => ({ ...e }));
}

function figure(cell: RhythmCell, startBeat: number): RhythmFigure {
  return {
    id: cell.id,
    duration: cell.duration,
    name: cell.name,
    offsets: cell.offsets,
    startBeat,
    isTriplet: cell.isTriplet,
  };
}

const weightOf = (e: PoolEntry) => e.currentWeight;

/** Zieht einen vollständigen 4/4-Takt schlagweise. Mutiert beide Pools. */
function buildBar(pool1: PoolEntry[], pool2: PoolEntry[]): RhythmFigure[] {
  const barData: RhythmFigure[] = [];
  let beat = 0;

  while (beat < 4) {
    const use2Beat = pool2.length > 0 && (beat === 0 || beat === 2) && Rand.next() < 0.3;

    if (use2Beat) {
      const pick = WeightedSampler.sampleIndex(pool2, weightOf);
      pool2[pick].currentWeight *= 0.5;
      barData.push(figure(pool2[pick].cell, beat));
      beat += 2;

      for (const e of pool1) e.currentWeight = Math.min(e.baseWeight, e.currentWeight * 1.3);
      for (let i = 0; i < pool2.length; i++) {
        if (i === pick) continue;
        pool2[i].currentWeight = Math.min(pool2[i].baseWeight, pool2[i].currentWeight * 1.3);
      }
    } else {
      const pick = WeightedSampler.sampleIndex(pool1, weightOf);
      pool1[pick].currentWeight *= 0.5;
      barData.push(figure(pool1[pick].cell, beat));
      beat += 1;

      for (const e of pool2) e.currentWeight = Math.min(e.baseWeight, e.currentWeight * 1.3);
      for (let i = 0; i < pool1.length; i++) {
        if (i === pick) continue;
        pool1[i].currentWeight = Math.min(pool1[i].baseWeight, pool1[i].currentWeight * 1.3);
      }
    }
  }

  return barData;
}

export const RhythmGenerator = {
  /**
   * Erzeugt vier Takte à 4/4 aus dem Vokabular des gewählten Niveaus.
   *
   * Schlagweise gedacht: je Zählzeit eine Zelle, keine Motivik. Das
   * Decay-System halbiert das Gewicht einer gerade verwendeten Zelle und
   * erholt die übrigen um Faktor 1.3 (gedeckelt auf ihr Basisgewicht); nach
   * Takt 2 werden alle Gewichte zurückgesetzt.
   */
  generate(level: DictationLevel = DictationLevels.standard,
           profile: AdaptiveProfile = NEUTRAL): RhythmFigure[][] {
    let dictation: RhythmFigure[][] = [];
    let attempts = 0;

    const entry = (cell: RhythmCell): PoolEntry => {
      const w = cell.weight * Profile.figure(profile, cell.name);
      return { cell, baseWeight: w, currentWeight: w };
    };
    let pool1 = DictationLevels.rhythmCells1Beat(level).map(entry);
    let pool2 = DictationLevels.rhythmCells2Beat(level).map(entry);
    if (pool1.length === 0) throw new Error("Niveau ohne einschlägige Zellen");

    const minDistinct = DictationLevels.minDistinctCellsPerBar(level);

    while (attempts < 50) {
      dictation = [];
      for (const e of pool1) e.currentWeight = e.baseWeight;
      for (const e of pool2) e.currentWeight = e.baseWeight;

      for (let bar = 0; bar < 4; bar++) {
        // Der ganze Takt wird neu gezogen, wenn zu wenige verschiedene
        // Vokabeln drin sind — und der Pool dabei auf den Stand vor dem
        // Takt zurückgesetzt.
        const saved1 = kopie(pool1);
        const saved2 = kopie(pool2);
        let barData: RhythmFigure[] = [];

        for (let barAttempt = 0; barAttempt < 24; barAttempt++) {
          if (barAttempt > 0) { pool1 = kopie(saved1); pool2 = kopie(saved2); }
          barData = buildBar(pool1, pool2);
          if (new Set(barData.map((f) => f.id)).size >= minDistinct) break;
        }

        dictation.push(barData);

        if (bar === 1) {
          for (const e of pool1) e.currentWeight = e.baseWeight;
          for (const e of pool2) e.currentWeight = e.baseWeight;
        }
      }

      // Geforderte Figuren — beides zusammen prüfen.
      const alle = dictation.flat();
      const punktierung = !DictationLevels.requiresDottedFigure(level)
        || alle.some((f) => f.id.startsWith("punk"));
      const triole = !DictationLevels.requiresTriplet(level) || alle.some((f) => f.isTriplet);
      if (punktierung && triole) break;
      attempts += 1;
    }

    return dictation;
  },
};

