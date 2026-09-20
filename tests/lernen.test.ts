// Portierung von `Checks/lernen.swift`: Hörhilfen, Zählweise, Strategien,
// Sprüche. Was dort als Invariante steht, steht hier genauso.
import { describe, expect, it } from "vitest";
import { Lernhilfen } from "../src/kern/Lernhilfen";
import { MusicData } from "../src/kern/MusicData";
import { Kinds, TrainingModes } from "../src/kern/QuizTask";
import { StatisticsInsights } from "../src/kern/StatisticsInsights";
import { Sprueche, type Stufe } from "../src/kern/Sprueche";

const insights = new StatisticsInsights([], []);
const alleZellen = [...MusicData.rhythm1Beat, ...MusicData.rhythm2Beat];

describe("Hörhilfen", () => {
  for (const kind of [...Lernhilfen.abgedeckt].sort()) {
    it(`${kind}: Katalog und Hörhilfen decken sich`, () => {
      const katalog = new Set(Object.keys(insights.practiceWeights(kind)));
      const hilfen = new Set(Lernhilfen.alle(kind).map((h) => h.titel));
      expect([...katalog].filter((k) => !hilfen.has(k))).toEqual([]);
      expect([...hilfen].filter((h) => !katalog.has(h))).toEqual([]);
    });
  }

  it("keine Disziplin hat Einträge, ohne als abgedeckt zu gelten", () => {
    for (const kind of Kinds.all) {
      if (!Lernhilfen.abgedeckt.has(kind)) expect(Lernhilfen.alle(kind)).toEqual([]);
    }
    expect(Lernhilfen.alle("melody")).toEqual([]);
  });

  it("Klang, Lieder, Titel", () => {
    for (const kind of Kinds.all) {
      const hilfen = Lernhilfen.alle(kind);
      if (kind !== "rhythm") expect(hilfen.filter((h) => h.klang === "")).toEqual([]);
      expect(hilfen.filter((h) => h.lied.some((l) => l === ""))).toEqual([]);
      expect(new Set(hilfen.map((h) => h.titel)).size).toBe(hilfen.length);
    }
    expect(Lernhilfen.alle("rhythm").every((h) => h.klang === "" && h.lied.length === 0)).toBe(true);
  });

  it("Verwechslungshinweise gehen in beide Richtungen", () => {
    for (const kind of Kinds.all) {
      const hilfen = Lernhilfen.alle(kind);
      for (const h of hilfen) {
        expect((h.verwechseltMit === null) === (h.verwechslung === null), h.titel).toBe(true);
        if (h.verwechseltMit === null) continue;
        const partner = hilfen.find((p) => p.titel === h.verwechseltMit);
        expect(partner, `${h.titel} → ${h.verwechseltMit}`).toBeDefined();
        expect(partner!.verwechseltMit).toBe(h.titel);
      }
    }
    expect(Lernhilfen.hilfe("interval", "Tritonus")?.verwechseltMit).toBe("Große Septime");
    expect(Lernhilfen.hilfe("interval", "Große Septime")?.verwechseltMit).toBe("Tritonus");
  });

  it("jedes Klangbeispiel stimmt mit dem Katalog überein", () => {
    for (const kind of Kinds.all) {
      for (const h of Lernhilfen.alle(kind)) {
        expect(h.beispiel, `${kind}/${h.titel}`).not.toBeNull();
        if (h.beispiel!.art === "zusammenklang") {
          const erwartet = kind === "interval"
            ? [0, MusicData.intervals.find((i) => i.name === h.titel)!.semitones]
            : MusicData.chords.find((c) => c.name === h.titel)!.offsets;
          expect(h.beispiel!.offsets, h.titel).toEqual(erwartet);
        } else {
          expect(alleZellen.some((c) => c.id === (h.beispiel as { id: string }).id), h.titel).toBe(true);
        }
      }
    }
  });

  it("jede Hörhilfe ist über Disziplin und Titel auffindbar", () => {
    for (const kind of Kinds.all) {
      for (const h of Lernhilfen.alle(kind)) expect(Lernhilfen.hilfe(kind, h.titel)).toBe(h);
    }
    expect(Lernhilfen.hilfe("interval", "Reine Prime")).toBeNull();
  });
});

describe("Zählweise", () => {
  it("so viele offene Silben wie Anschläge, beginnt mit 1", () => {
    for (const cell of alleZellen) {
      const silben = Lernhilfen.zaehlweise(cell).split(" – ").filter((s) => !s.startsWith("("));
      expect(silben.length, cell.name).toBe(cell.offsets.length);
      if (!cell.isTriplet) expect(silben[0], cell.name).toBe("1");
    }
  });

  it("trifft die bekannten Fälle", () => {
    const z = (id: string) => Lernhilfen.zaehlweise(alleZellen.find((c) => c.id === id)!);
    expect(z("viertel")).toBe("1");
    expect(z("zwei_achtel")).toBe("1 – und");
    expect(z("vier_sechz")).toBe("1 – e – und – e");
    expect(z("achtel_triole")).toBe("tri – o – le");
    expect(z("halbe")).toBe("1");
    expect(z("punk_viert_acht")).toBe("1 – (2) – und");
    expect(z("sechz_acht_sechz")).toBe("1 – e – (und) – e");
    expect(z("punk_acht_sechz")).toBe("1 – (und) – e");
    expect(z("acht_zwei_sechz")).toBe("1 – und – e");
    expect(z("acht_punk_viert")).toBe("1 – und");
  });
});

describe("Strategien und Modi", () => {
  it("jede Disziplin hat mindestens drei vollständige Schritte", () => {
    for (const kind of Kinds.all) {
      const schritte = Lernhilfen.strategie(kind);
      expect(schritte.length, kind).toBeGreaterThanOrEqual(3);
      for (const s of schritte) expect(s.symbol && s.title && s.text, `${kind}/${s.title}`).toBeTruthy();
    }
    expect(Lernhilfen.vorbehalt.toLowerCase()).toContain("unterricht");
  });

  it("Akkordkatalog und Terzschichtung", () => {
    expect(MusicData.chords.map((c) => c.name)).toEqual([
      "Dur", "Moll", "Dur mit Sixte ajoutée", "Moll mit Sixte ajoutée",
      "Dur7 (Dominantseptakkord)", "Moll7", "DurMaj7", "Verminderter Septakkord", "Übermäßig",
    ]);
    const terzen = (name: string) => {
      const o = MusicData.chords.find((c) => c.name === name)!.offsets;
      return [o[1] - o[0], o[2] - o[1]];
    };
    expect(terzen("Dur")).toEqual([4, 3]);
    expect(terzen("Moll")).toEqual([3, 4]);
    expect(terzen("Übermäßig")).toEqual([4, 4]);
    expect(terzen("Verminderter Septakkord")).toEqual([3, 3]);
  });

  it("Komplettprüfung ohne Hörhilfe, Reihenfolge des Ablaufs", () => {
    expect(TrainingModes.allowsLearningHints("mix")).toBe(false);
    expect(TrainingModes.visible.filter((m) => m !== "mix").every(TrainingModes.allowsLearningHints)).toBe(true);
    expect(TrainingModes.kinds("mix")).toEqual(["rhythm", "melody", "interval", "chord"]);
  });
});

describe("Sprüche", () => {
  const stufen: Stufe[] = ["voll", "gut", "offen"];
  it("mindestens vier je Stufe, keine Zahl, nicht länger als zwei Zeilen", () => {
    for (const s of stufen) expect(Sprueche.alle(s).length).toBeGreaterThanOrEqual(4);
    const alle = stufen.flatMap((s) => Sprueche.alle(s));
    expect(alle.filter((t) => /[0-9]/.test(t))).toEqual([]);
    expect(alle.filter((t) => [...t].length > 110)).toEqual([]);
  });
  it("deterministisch, Stufe folgt der Quote", () => {
    const stichtag = new Date(1_780_000_000 * 1000);
    expect(Sprueche.spruch(5, 7, stichtag)).toBe(Sprueche.spruch(5, 7, stichtag));
    expect(Sprueche.stufe(7, 7)).toBe("voll");
    expect(Sprueche.stufe(5, 7)).toBe("gut");
    expect(Sprueche.stufe(4, 7)).toBe("offen");
    expect(Sprueche.stufe(0, 0)).toBe("offen");
  });
});
