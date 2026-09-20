// Statistik: die Datei aus dem Goldmaster wird gelesen, byteidentisch
// zurückgeschrieben und ausgewertet — alles, was `StatisticsInsights`
// rechnet, muss mit `insights.json` übereinstimmen. Dazu die leere
// Statistik und die Sprüche.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decodeStatistics, encodeStatistics, isoSekunden, SpeicherAblage, StatisticsStore } from "../src/kern/Statistics";
import { StatisticsInsights, tagesvergleichSatz, type Uebungsserie } from "../src/kern/StatisticsInsights";
import { Kinds } from "../src/kern/QuizTask";
import { DictationLevels } from "../src/kern/DictationLevel";
import { LokalerKalender } from "../src/kern/Kalender";
import { Sprueche } from "../src/kern/Sprueche";
import { fixture, stabil } from "./fixtures";

const hier = dirname(fileURLToPath(import.meta.url));
const dateiText = readFileSync(join(hier, "..", "fixtures", "statistics.json"), "utf8");

function serieFx(s: Uebungsserie) {
  return { ...s, letzterTag: s.letzterTag ? isoSekunden(s.letzterTag) : undefined };
}

describe("statistics.json", () => {
  it("lässt sich lesen und byteidentisch zurückschreiben", () => {
    const file = decodeStatistics(dateiText);
    expect(file.answers.length).toBe(406);
    expect(file.bars.length).toBe(144);
    expect(encodeStatistics(file)).toBe(dateiText);
  });

  it("Speicher: laden, ändern, sichern, neu laden", async () => {
    const ablage = new SpeicherAblage();
    await ablage.schreiben("statistics.json", dateiText);
    const store = new StatisticsStore(ablage);
    await store.load();
    expect(store.answers.length).toBe(406);
    await store.saveNow();
    expect(ablage.dateien.get("statistics.json")).toBe(dateiText);
  });
});

describe("insights.json", () => {
  const soll = fixture<any>("insights.json");
  const file = decodeStatistics(dateiText);
  const insights = new StatisticsInsights(file.answers, file.bars);
  const jetzt = new Date(soll.jetzt);
  const kal = LokalerKalender;

  it("läuft in Europe/Berlin", () => {
    expect(process.env.TZ).toBe("Europe/Berlin");
    expect(isoSekunden(kal.startOfDay(jetzt))).toBe("2026-09-19T22:00:00Z");
  });

  it("Übersicht, Vokabeln, Tonarten, Gewichte, Profil", () => {
    expect(stabil(insights.overview())).toBe(stabil(soll.overview));
    expect(stabil(insights.figureStats())).toBe(stabil(soll.figureStats));
    expect(stabil(insights.moveStats())).toBe(stabil(soll.moveStats));
    expect(stabil(insights.contourStats())).toBe(stabil(soll.contourStats));
    expect(stabil(insights.keyStats())).toBe(stabil(soll.keyStats));
    expect(stabil(insights.keyPracticeWeights())).toBe(stabil(soll.keyPracticeWeights));
    expect(stabil(insights.adaptiveProfile(new Set(Kinds.all)))).toBe(stabil(soll.adaptiveProfile));
    expect(StatisticsInsights.neutralWeight).toBe(soll.neutralWeight);
  });

  it("Wilson", () => {
    for (const [k, n, lower, center, upper, smoothed, lowerBound] of soll.wilson as number[][]) {
      const iv = StatisticsInsights.wilsonInterval(k, n);
      expect([iv.lower, iv.center, iv.upper]).toEqual([lower, center, upper]);
      expect(StatisticsInsights.smoothedRate(k, n)).toBe(smoothed);
      expect(StatisticsInsights.wilsonLowerBound(k, n)).toBe(lowerBound);
    }
  });

  for (const kind of Kinds.all) {
    it(`je Disziplin: ${kind}`, () => {
      const s = soll.kinds[kind];
      expect(stabil(insights.itemStats(kind)), "itemStats").toBe(stabil(s.itemStats));
      expect(stabil(insights.confusions(kind)), "confusions").toBe(stabil(s.confusions));
      expect(stabil(insights.barStats(kind)), "barStats").toBe(stabil(s.barStats));
      expect(stabil(insights.levelBreakdown(kind)), "levelBreakdown").toBe(stabil(s.levelBreakdown));
      expect(insights.barsWithoutLevel(kind)).toBe(s.barsWithoutLevel);
      expect(insights.runCount(kind)).toBe(s.runCount);
      expect(stabil(insights.trend(kind, 8, kal, jetzt).map((t) => ({ ...t, weekStart: isoSekunden(t.weekStart) }))), "trend")
        .toBe(stabil(s.trend));
      const tv = insights.tagesvergleich(kind, kal, jetzt);
      expect(stabil(tv ? { heute: tv.heute, gestern: tv.gestern, text: tagesvergleichSatz(tv) } : undefined), "tagesvergleich")
        .toBe(stabil(s.tagesvergleich));
      expect(stabil(serieFx(insights.serie(kind, kal, jetzt))), "serie").toBe(stabil(s.serie));
      expect(stabil(insights.practiceWeights(kind)), "practiceWeights").toBe(stabil(s.practiceWeights));
      expect(insights.funFacts(kind), "funFacts").toEqual(s.funFacts);
      expect(insights.isAdaptiveUnlocked(kind)).toBe(s.isAdaptiveUnlocked);
      expect(insights.runsUntilAdaptive(kind)).toBe(s.runsUntilAdaptive);
      expect(insights.geuebteTage(kind, kal).map(isoSekunden), "geuebteTage").toEqual(s.geuebteTage);
      for (const level of DictationLevels.all) {
        expect(stabil(insights.filtered(level).itemStats(kind)), `itemStats ${level}`).toBe(stabil(s.itemStatsJeNiveau[level]));
      }
    });
  }

  it("Serie, geübte Tage, Erinnerungstermine", () => {
    expect(insights.geuebteTage(null, kal).map(isoSekunden)).toEqual(soll.geuebteTage);
    expect(stabil(serieFx(insights.serie(null, kal, jetzt)))).toBe(stabil(soll.serie));
    for (const [k, v] of Object.entries(soll.serieSpaeter as Record<string, unknown>)) {
      const tage = Number(k);
      expect(stabil(serieFx(insights.serie(null, kal, kal.addDays(jetzt, tage)))), k).toBe(stabil(v));
    }
    const uhrzeit = { hour: 18, minute: 30 };
    expect(insights.erinnerungsTermine(uhrzeit, 30, kal, kal.addDays(jetzt, 1)).map(isoSekunden)).toEqual(soll.erinnerungsTermine);
    expect(insights.erinnerungsTermine(uhrzeit, 30, kal, jetzt).map(isoSekunden)).toEqual(soll.erinnerungsTermineNachUebung);
  });

  it("leere Statistik", () => {
    const leer = fixture<any>("insights-leer.json");
    const i = new StatisticsInsights([], []);
    expect(stabil(i.overview())).toBe(stabil(leer.overview));
    expect(stabil(serieFx(i.serie(null, kal, jetzt)))).toBe(stabil(leer.serie));
    expect(i.erinnerungsTermine({ hour: 18, minute: 30 }, 30, kal, jetzt).map(isoSekunden)).toEqual(leer.erinnerungsTermine);
    expect(stabil(i.practiceWeights("interval"))).toBe(stabil(leer.practiceWeights));
    expect(i.runsUntilAdaptive("rhythm")).toBe(leer.runsUntilAdaptive);
  });
});

describe("sprueche.json", () => {
  const liste = fixture<{ erreicht: number; moeglich: number; tag: string; spruch: string }[]>("sprueche.json");
  it(`${liste.length} Sprüche gleich`, () => {
    for (const s of liste) {
      expect(Sprueche.spruch(s.erreicht, s.moeglich, new Date(s.tag), LokalerKalender), `${s.erreicht}/${s.moeglich} ${s.tag}`).toBe(s.spruch);
    }
  });
});
