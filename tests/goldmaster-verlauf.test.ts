// Verlauf: Faktoren für einen festen Verlauf und Folgen über mehrere Läufe
// mit einer Vorgeschichte — gleich mit Swift, samt `verlauf.json` Byte für
// Byte.
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { QuizStore } from "../src/kern/QuizStore.svelte";
import { SpeicherAblage } from "../src/kern/Statistics";
import { SpeicherEinstellungen } from "../src/plattform/Einstellungen";
import { MusicData } from "../src/kern/MusicData";
import { BODEN, Verlauf, VERLAUF_DATEI, type VerlaufKategorie } from "../src/kern/Verlauf";
import type { Kind, TrainingMode } from "../src/kern/QuizTask";
import { fixture } from "./fixtures";

interface VerlaufFile {
  boden: number;
  faktoren: { kategorie: VerlaufKategorie; name: string; tempo: number; faktor: number }[];
  folgen: { mode: TrainingMode; seed: number; laeufe: string[][]; datei: string }[];
}

describe("verlauf.json", () => {
  const file = fixture<VerlaufFile>("verlauf.json");

  it("Boden gleich", () => expect(BODEN).toBe(file.boden));

  it(`${file.faktoren.length} Faktoren gleich`, () => {
    const v = new Verlauf();
    for (const i of MusicData.intervals) v.merke(i.name, "intervalle");
    for (const c of MusicData.chords.slice(0, 3)) v.merke(c.name, "akkorde");
    for (const f of file.faktoren) {
      expect(v.faktor(f.name, f.kategorie, f.tempo), `${f.name} × ${f.tempo}`).toBe(f.faktor);
    }
  });

  for (const folge of file.folgen) {
    it(`${folge.mode}: ${folge.laeufe.length} Läufe mit Vorgeschichte gleich`, async () => {
      const ablage = new SpeicherAblage();
      const store = new QuizStore({ ablage, einstellungen: new SpeicherEinstellungen() });
      for (const kind of ["interval", "chord", "rhythm", "melody"] as Kind[]) store.setAdaptive(false, kind);
      store.setLevel("mittel", "rhythm");
      store.setLevel("mittel", "melody");
      Rand.source = Rand.seeded(BigInt(folge.seed));
      const laeufe: string[][] = [];
      for (let i = 0; i < folge.laeufe.length; i++) {
        store.generateQuizStructure(folge.mode);
        laeufe.push(store.tasks.map((t) => t.melodyData?.key.name ?? t.name).filter((n) => n.length > 0));
      }
      expect(laeufe).toEqual(folge.laeufe);
      expect(store.verlauf.json()).toBe(folge.datei);
      expect(await ablage.lesen(VERLAUF_DATEI)).toBe(folge.datei);

      // Neustart: derselbe Verlauf aus der Ablage
      const neu = new QuizStore({ ablage, einstellungen: new SpeicherEinstellungen() });
      await neu.laden();
      expect(neu.verlauf.json()).toBe(folge.datei);
    });
  }

  it("unbekannte Namen und unlesbare Dateien", () => {
    expect(Verlauf.aus('{"formatVersion":1,"zuletzt":{"akkorde":["Gibt es nicht","Moll"]}}').zuletzt).toEqual({ akkorde: ["Moll"] });
    expect(Verlauf.aus("kaputt").json()).toBe(Verlauf.leer().json());
    expect(Verlauf.aus('{"formatVersion":99,"zuletzt":{"akkorde":["Moll"]}}').json()).toBe(Verlauf.leer().json());
  });
});
