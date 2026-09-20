// Auswertung der aufgezeichneten Übungsergebnisse. Portierung von
// `Models/StatisticsInsights.swift`.
//
// Geglättet wird über die Mitte des Wilson-Intervalls, nicht über seine
// Untergrenze — die Begründung steht in Swift und im README. Alles
// Zeitabhängige nimmt Kalender und „jetzt" als Parameter.

import { MusicData } from "./MusicData";
import { DictationLevels, type DictationLevel } from "./DictationLevel";
import { MelodicContours, MelodicMoves } from "./MelodicMove";
import { Kinds, type Kind } from "./QuizTask";
import { LokalerKalender, type Kalender } from "./Kalender";
import { neutralProfile, type AdaptiveProfile } from "./AdaptiveProfile";
import type { AnswerRecord, BarRecord, StatisticsStore } from "./Statistics";

// MARK: - Ergebnistypen

export interface ItemStats {
  readonly name: string;
  readonly attempts: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly smoothed: number;
}

export function hasEnoughData(s: ItemStats): boolean {
  return s.attempts >= StatisticsInsights.minimumSamples;
}

export interface BarStats {
  readonly bar: number;
  readonly assessed: number;
  readonly averagePoints: number;
}

export interface Confusion {
  readonly solution: string;
  readonly mistaken: string;
  readonly count: number;
}

export function confusionId(c: Confusion): string {
  return c.solution + "→" + c.mistaken;
}

export interface Uebungsserie {
  readonly aktuell: number;
  readonly laengste: number;
  readonly geuebteTage: number;
  readonly heuteGeuebt: boolean;
  readonly kulanzUebrig: number;
  readonly kulanzGenutzt: number;
  readonly letzterTag: Date | null;
}

export const LEERE_SERIE: Uebungsserie = Object.freeze({
  aktuell: 0, laengste: 0, geuebteTage: 0, heuteGeuebt: false, kulanzUebrig: 0, kulanzGenutzt: 0, letzterTag: null,
});

export const KULANZ_INTERVALL = 30;

export interface TrendPoint {
  readonly weekStart: Date;
  readonly value: number | null;
  readonly samples: number;
}

export interface DisciplineOverview {
  readonly kind: Kind;
  readonly headline: number | null;
  readonly samples: number;
}

export interface Tagesvergleich {
  readonly kind: Kind;
  readonly heute: number;
  readonly gestern: number;
}

export const TAGESVERGLEICH_MINDESTSTICHPROBE = 3;

export function tagesvergleichBesser(t: Tagesvergleich): boolean { return t.heute > t.gestern + 0.05; }
export function tagesvergleichSchlechter(t: Tagesvergleich): boolean { return t.heute < t.gestern - 0.05; }

/** Ein Satz für die Auswertung — ohne Zahlen. */
export function tagesvergleichSatz(t: Tagesvergleich): string {
  const name = Kinds.badgeTitle(t.kind);
  if (tagesvergleichBesser(t)) return `${name}: heute besser als gestern.`;
  if (tagesvergleichSchlechter(t)) return `${name}: gestern lief es besser.`;
  return `${name}: wie gestern.`;
}

// MARK: - Auswertung

function istGehoer(kind: Kind): boolean {
  return kind === "interval" || kind === "chord";
}

function summe(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function zaehle(map: Map<string, number>, key: string, n: number): void {
  map.set(key, (map.get(key) ?? 0) + n);
}

export class StatisticsInsights {
  static readonly minimumSamples = 5;
  static readonly adaptiveThreshold = 20;
  static readonly minWeight = 0.5;
  static readonly maxWeight = 3.0;
  static get neutralWeight(): number {
    return StatisticsInsights.minWeight + 0.5 * (StatisticsInsights.maxWeight - StatisticsInsights.minWeight);
  }

  constructor(readonly answers: readonly AnswerRecord[], readonly bars: readonly BarRecord[]) {}

  static fromStore(store: StatisticsStore): StatisticsInsights {
    return new StatisticsInsights(store.answers, store.bars);
  }

  // MARK: Niveau

  filtered(level: DictationLevel | null): StatisticsInsights {
    if (level === null) return this;
    return new StatisticsInsights(this.answers, this.bars.filter((b) => b.level === level));
  }

  levelBreakdown(kind: Kind): { level: DictationLevel; stats: ItemStats }[] {
    const out: { level: DictationLevel; stats: ItemStats }[] = [];
    for (const level of DictationLevels.all) {
      const inLevel = this.bars.filter((b) => b.kind === kind && b.level === level);
      if (inLevel.length === 0) continue;
      const points = summe(inLevel.map((b) => b.points));
      out.push({ level, stats: makeItem(DictationLevels.title(level), points, inLevel.length * 2) });
    }
    return out;
  }

  barsWithoutLevel(kind: Kind): number {
    return this.bars.filter((b) => b.kind === kind && b.level === null).length;
  }

  // MARK: Durchgänge

  runCount(kind: Kind): number {
    const quelle = istGehoer(kind) ? this.answers : this.bars;
    return new Set(quelle.filter((r) => r.kind === kind).map((r) => r.sessionId)).size;
  }

  // MARK: Glättung

  static wilsonInterval(k: number, n: number, z = 1.96): { lower: number; center: number; upper: number } {
    if (n <= 0) return { lower: 0, center: 0.5, upper: 1 };
    const p = k / n;
    const z2 = z * z;
    const denominator = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denominator;
    const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / denominator;
    return { lower: Math.max(0, center - margin), center, upper: Math.min(1, center + margin) };
  }

  static smoothedRate(k: number, n: number): number {
    return StatisticsInsights.wilsonInterval(k, n).center;
  }

  static wilsonLowerBound(k: number, n: number): number {
    return n > 0 ? StatisticsInsights.wilsonInterval(k, n).lower : 0;
  }

  // MARK: Intervalle und Akkorde

  itemStats(kind: Kind): ItemStats[] {
    const relevant = this.answers.filter((a) => a.kind === kind);
    if (relevant.length === 0) return [];

    const attempts = new Map<string, number>();
    const correct = new Map<string, number>();
    for (const record of relevant) {
      zaehle(attempts, record.solution, 1);
      if (record.correct) zaehle(correct, record.solution, 1);
    }

    return weakestFirst([...attempts].map(([name, n]) => makeItem(name, correct.get(name) ?? 0, n)));
  }

  confusions(kind: Kind, minCount = 2, limit = 5): Confusion[] {
    const counts = new Map<string, number>();
    for (const record of this.answers) {
      if (record.kind !== kind || record.correct) continue;
      zaehle(counts, record.solution + "" + record.answer, 1);
    }

    const out: Confusion[] = [];
    for (const [key, count] of counts) {
      if (count < minCount) continue;
      const i = key.indexOf("");
      if (i < 0) continue;
      out.push({ solution: key.slice(0, i), mistaken: key.slice(i + 1), count });
    }
    out.sort((a, b) => a.count !== b.count ? b.count - a.count : (confusionId(a) < confusionId(b) ? -1 : 1));
    return out.slice(0, limit);
  }

  // MARK: Diktate

  barStats(kind: Kind): BarStats[] {
    const relevant = this.bars.filter((b) => b.kind === kind);
    return [0, 1, 2, 3].map((index) => {
      const inBar = relevant.filter((b) => b.bar === index);
      const sum = summe(inBar.map((b) => b.points));
      return { bar: index, assessed: inBar.length, averagePoints: inBar.length === 0 ? 0 : sum / inBar.length };
    });
  }

  figureStats(): ItemStats[] {
    return this.tally("rhythm", (b) => b.figures, StatisticsInsights.figureName);
  }

  moveStats(): ItemStats[] {
    return this.tally("melody", (b) => b.moves, MelodicMoves.titleFor);
  }

  contourStats(): ItemStats[] {
    const attempts = new Map<string, number>();
    const points = new Map<string, number>();
    for (const bar of this.bars) {
      if (bar.kind !== "melody" || bar.contour === null) continue;
      zaehle(attempts, bar.contour, 2);
      zaehle(points, bar.contour, bar.points);
    }
    return weakestFirst([...attempts].map(([id, n]) => makeItem(MelodicContours.titleFor(id), points.get(id) ?? 0, n)));
  }

  private tally(kind: Kind, items: (b: BarRecord) => readonly string[], name: (id: string) => string): ItemStats[] {
    const attempts = new Map<string, number>();
    const points = new Map<string, number>();

    for (const bar of this.bars) {
      if (bar.kind !== kind) continue;
      const all = items(bar);

      if (bar.wrongItems !== null) {
        const remaining = new Map<string, number>();
        for (const w of bar.wrongItems) zaehle(remaining, w, 1);
        for (const item of all) {
          zaehle(attempts, item, 2);
          const open = remaining.get(item);
          if (open !== undefined && open > 0) {
            remaining.set(item, open - 1);
          } else {
            zaehle(points, item, 2);
          }
        }
      } else {
        for (const item of new Set(all)) {
          zaehle(attempts, item, 2);
          zaehle(points, item, bar.points);
        }
      }
    }

    return weakestFirst([...attempts].map(([id, n]) => makeItem(name(id), points.get(id) ?? 0, n)));
  }

  keyStats(): ItemStats[] {
    const attempts = new Map<string, number>();
    const points = new Map<string, number>();
    for (const bar of this.bars) {
      if (bar.kind !== "melody" || bar.key === null) continue;
      zaehle(attempts, bar.key, 2);
      zaehle(points, bar.key, bar.points);
    }
    return weakestFirst([...attempts].map(([key, n]) => makeItem(key, points.get(key) ?? 0, n)));
  }

  static figureName(id: string): string {
    const all = [...MusicData.rhythm1Beat, ...MusicData.rhythm2Beat];
    return all.find((c) => c.id === id)?.name ?? id;
  }

  // MARK: Übersicht und Verlauf

  overview(): DisciplineOverview[] {
    return Kinds.all.map((kind) => {
      if (istGehoer(kind)) {
        const relevant = this.answers.filter((a) => a.kind === kind);
        const hits = relevant.filter((a) => a.correct).length;
        return { kind, headline: relevant.length === 0 ? null : hits / relevant.length, samples: relevant.length };
      }
      const relevant = this.bars.filter((b) => b.kind === kind);
      const sum = summe(relevant.map((b) => b.points));
      return { kind, headline: relevant.length === 0 ? null : sum / (relevant.length * 2), samples: relevant.length };
    });
  }

  trend(kind: Kind, weeks = 8, kalender: Kalender = LokalerKalender, now: Date = new Date()): TrendPoint[] {
    if (weeks <= 0) return [];
    const currentWeek = kalender.weekStart(now);
    const starts: Date[] = [];
    for (let k = weeks - 1; k >= 0; k--) starts.push(kalender.addDays(currentWeek, -7 * k));

    return starts.map((start) => {
      const end = kalender.addDays(start, 7);
      if (istGehoer(kind)) {
        const inWeek = this.answers.filter((a) => a.kind === kind && a.date >= start && a.date < end);
        if (inWeek.length === 0) return { weekStart: start, value: null, samples: 0 };
        const hits = inWeek.filter((a) => a.correct).length;
        return { weekStart: start, value: hits / inWeek.length, samples: inWeek.length };
      }
      const inWeek = this.bars.filter((b) => b.kind === kind && b.date >= start && b.date < end);
      if (inWeek.length === 0) return { weekStart: start, value: null, samples: 0 };
      const sum = summe(inWeek.map((b) => b.points));
      return { weekStart: start, value: sum / (inWeek.length * 2), samples: inWeek.length };
    });
  }

  // MARK: Heute gegen gestern

  tagesvergleich(kind: Kind, kalender: Kalender = LokalerKalender, now: Date = new Date()): Tagesvergleich | null {
    const heute = kalender.startOfDay(now);
    const gestern = kalender.addDays(heute, -1);

    const quote = (tag: Date): number | null => {
      if (istGehoer(kind)) {
        const z = this.answers.filter((a) => a.kind === kind && kalender.isSameDay(a.date, tag));
        if (z.length < TAGESVERGLEICH_MINDESTSTICHPROBE) return null;
        return z.filter((a) => a.correct).length / z.length;
      }
      const z = this.bars.filter((b) => b.kind === kind && kalender.isSameDay(b.date, tag));
      if (z.length < TAGESVERGLEICH_MINDESTSTICHPROBE) return null;
      return summe(z.map((b) => b.points)) / (z.length * 2);
    };

    const h = quote(heute);
    const g = quote(gestern);
    if (h === null || g === null) return null;
    return { kind, heute: h, gestern: g };
  }

  // MARK: Übungsserie

  geuebteTage(kind: Kind | null = null, kalender: Kalender = LokalerKalender): Date[] {
    const tage = new Map<number, Date>();
    const ausAntworten = kind === null || istGehoer(kind);
    const ausTakten = kind === null || !istGehoer(kind);

    if (ausAntworten) {
      for (const a of this.answers) {
        if (kind !== null && a.kind !== kind) continue;
        const t = kalender.startOfDay(a.date);
        tage.set(t.getTime(), t);
      }
    }
    if (ausTakten) {
      for (const b of this.bars) {
        if (kind !== null && b.kind !== kind) continue;
        const t = kalender.startOfDay(b.date);
        tage.set(t.getTime(), t);
      }
    }
    return [...tage.values()].sort((a, b) => a.getTime() - b.getTime());
  }

  serie(kind: Kind | null = null, kalender: Kalender = LokalerKalender, now: Date = new Date()): Uebungsserie {
    return StatisticsInsights.laufRechnen(this.geuebteTage(kind, kalender), now, kalender);
  }

  static laufRechnen(tage: readonly Date[], heute: Date, kalender: Kalender): Uebungsserie {
    if (tage.length === 0) return LEERE_SERIE;
    const letzter = tage[tage.length - 1];
    const heutigerTag = kalender.startOfDay(heute);
    const abstand = (von: Date, bis: Date) => kalender.daysBetween(von, bis);

    let laufLaenge = 0;
    let guthaben = 0;
    let genutzt = 0;
    let laengste = 0;
    let vorheriger: Date | null = null;

    const guthabenNachfuehren = (vorher: number) => {
      guthaben += Math.floor(laufLaenge / 30) - Math.floor(vorher / 30);
    };

    for (const tag of tage) {
      if (vorheriger !== null) {
        const luecke = abstand(vorheriger, tag) - 1;
        if (luecke > 0) {
          if (luecke <= guthaben) {
            guthaben -= luecke;
            genutzt += luecke;
            const vorher = laufLaenge;
            laufLaenge += luecke;
            guthabenNachfuehren(vorher);
          } else {
            laengste = Math.max(laengste, laufLaenge);
            laufLaenge = 0;
            guthaben = 0;
            genutzt = 0;
          }
        }
      }
      const vorher = laufLaenge;
      laufLaenge += 1;
      guthabenNachfuehren(vorher);
      vorheriger = tag;
    }
    laengste = Math.max(laengste, laufLaenge);

    const seitLetztem = abstand(letzter, heutigerTag);
    const offeneLuecke = Math.max(0, seitLetztem - 1);
    let aktuell: number;
    if (offeneLuecke === 0) aktuell = laufLaenge;
    else if (offeneLuecke <= guthaben) aktuell = laufLaenge + offeneLuecke;
    else aktuell = 0;

    return {
      aktuell,
      laengste,
      geuebteTage: tage.length,
      heuteGeuebt: seitLetztem === 0,
      kulanzUebrig: aktuell > 0 ? guthaben - offeneLuecke : 0,
      kulanzGenutzt: aktuell > 0 ? genutzt + offeneLuecke : 0,
      letzterTag: letzter,
    };
  }

  erinnerungsTermine(uhrzeit: { hour: number; minute: number }, tage = 30,
                     kalender: Kalender = LokalerKalender, now: Date = new Date()): Date[] {
    if (tage <= 0) return [];
    const heute = kalender.startOfDay(now);
    const heuteGeuebt = this.geuebteTage(null, kalender).some((t) => t.getTime() === heute.getTime());

    const termine: Date[] = [];
    let tag = heute;
    for (let versatz = 0; versatz <= tage; versatz++) {
      if (termine.length >= tage) break;
      if (!(versatz === 0 && heuteGeuebt)) {
        const termin = kalender.at(tag, uhrzeit.hour, uhrzeit.minute);
        if (termin > now) termine.push(termin);
      }
      tag = kalender.addDays(tag, 1);
    }
    return termine;
  }

  // MARK: Zahlen für den Vorbereitungsbildschirm

  funFacts(kind: Kind, limit = 2): string[] {
    const facts: string[] = [];

    const runs = this.runCount(kind);
    if (runs >= 3) {
      const what = kind === "rhythm" || kind === "melody" ? "Diktate gemacht" : "Durchgänge geübt";
      facts.push(`Du hast hier schon ${runs} ${what}.`);
    }

    let items: ItemStats[];
    switch (kind) {
      case "interval": case "chord": items = this.itemStats(kind); break;
      case "rhythm": items = this.figureStats(); break;
      case "melody": items = this.moveStats(); break;
    }
    const solid = items.filter(hasEnoughData);

    const best = solid[solid.length - 1];
    if (best && best.accuracy >= 0.8) {
      facts.push(`Am sichersten: ${best.name} — ${best.correct} von ${best.attempts}.`);
    }
    const worst = solid[0];
    if (worst && worst.accuracy <= 0.7 && solid.length >= 2) {
      facts.push(`Am schwersten fällt dir ${worst.name}.`);
    }

    if (kind === "rhythm" || kind === "melody") {
      const barsWithData = this.barStats(kind).filter((b) => b.assessed >= 5);
      if (barsWithData.length === 4) {
        let weakest = barsWithData[0];
        let strongest = barsWithData[0];
        for (const b of barsWithData) {
          if (b.averagePoints < weakest.averagePoints) weakest = b;
          if (b.averagePoints > strongest.averagePoints) strongest = b;
        }
        if (strongest.averagePoints - weakest.averagePoints >= 0.4) {
          facts.push(`Takt ${weakest.bar + 1} ist bei dir der schwächste.`);
        }
      }
    }

    return facts.slice(0, limit);
  }

  // MARK: Freischaltung des adaptiven Modus

  isAdaptiveUnlocked(kind: Kind): boolean {
    return this.runCount(kind) >= StatisticsInsights.adaptiveThreshold;
  }

  runsUntilAdaptive(kind: Kind): number {
    return Math.max(0, StatisticsInsights.adaptiveThreshold - this.runCount(kind));
  }

  // MARK: Übungsgewichte

  practiceWeights(kind: Kind): Record<string, number> {
    let catalog: string[];
    let liste: ItemStats[];
    switch (kind) {
      case "interval": catalog = MusicData.intervals.map((i) => i.name); liste = this.itemStats("interval"); break;
      case "chord": catalog = MusicData.chords.map((c) => c.name); liste = this.itemStats("chord"); break;
      case "rhythm": catalog = [...MusicData.rhythm1Beat, ...MusicData.rhythm2Beat].map((c) => c.name); liste = this.figureStats(); break;
      case "melody": catalog = MelodicMoves.all.map((m) => MelodicMoves.title(m)); liste = this.moveStats(); break;
    }
    const stats = new Map(liste.map((s) => [s.name, s]));

    const weights: Record<string, number> = {};
    for (const name of catalog) {
      const item = stats.get(name);
      if (!item || item.attempts <= 0) {
        weights[name] = StatisticsInsights.neutralWeight;
        continue;
      }
      weights[name] = StatisticsInsights.minWeight
        + (1 - item.smoothed) * (StatisticsInsights.maxWeight - StatisticsInsights.minWeight);
    }
    return weights;
  }

  keyPracticeWeights(): Record<string, number> {
    const stats = new Map(this.keyStats().map((s) => [s.name, s]));
    const out: Record<string, number> = {};
    for (const key of MusicData.keyCatalog) {
      const item = stats.get(key.name);
      if (!item || item.attempts <= 0) { out[key.name] = 1; continue; }
      const full = StatisticsInsights.minWeight + (1 - item.smoothed) * (StatisticsInsights.maxWeight - StatisticsInsights.minWeight);
      out[key.name] = 1 + (full - 1) * 0.4;
    }
    return out;
  }

  adaptiveProfile(kinds: ReadonlySet<Kind>): AdaptiveProfile {
    const profile = neutralProfile();
    if (kinds.has("interval")) profile.intervals = this.practiceWeights("interval");
    if (kinds.has("chord")) profile.chords = this.practiceWeights("chord");
    if (kinds.has("rhythm")) profile.figures = this.practiceWeights("rhythm");
    if (kinds.has("melody")) {
      profile.moves = this.practiceWeights("melody");
      profile.keys = this.keyPracticeWeights();
    }
    return profile;
  }
}

function makeItem(name: string, correct: number, attempts: number): ItemStats {
  return {
    name, attempts, correct,
    accuracy: attempts > 0 ? correct / attempts : 0,
    smoothed: StatisticsInsights.smoothedRate(correct, attempts),
  };
}

function weakestFirst(items: ItemStats[]): ItemStats[] {
  return items.sort((a, b) => a.smoothed !== b.smoothed ? a.smoothed - b.smoothed : (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
