// Aufgabenstruktur je Modus: `generateQuizStructure` über 100 Läufe je
// Modus, jeder einzeln geseedet — Aufgabenarten, Namen, Grundtöne, Notenbilder
// und Antwortoptionen gleich mit Swift.
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { QuizStore } from "../src/kern/QuizStore.svelte";
import { SpeicherAblage } from "../src/kern/Statistics";
import { SpeicherEinstellungen } from "../src/plattform/Einstellungen";
import { AbcNotation } from "../src/kern/AbcNotation";
import { TrainingModes, type Kind, type TrainingMode } from "../src/kern/QuizTask";
import { fixture, stabil } from "./fixtures";

interface TaskFx {
  kind: string; name: string; rootNote: number; offsets: number[]; level?: string; playMidi: number;
  rhythmAbc?: string; melodyKey?: string; melodyAbc?: string; options: string[];
}
interface RunFx { seed: number; tasks: TaskFx[]; rhythmBarCount: number }

describe("gehoer.json", () => {
  const file = fixture<{ runs: Record<string, RunFx[]> }>("gehoer.json");
  const store = new QuizStore({ ablage: new SpeicherAblage(), einstellungen: new SpeicherEinstellungen() });
  for (const kind of ["interval", "chord", "rhythm", "melody"] as Kind[]) store.setAdaptive(false, kind);
  store.setLevel("mittel", "rhythm");
  store.setLevel("mittel", "melody");

  for (const mode of TrainingModes.all as TrainingMode[]) {
    it(`${mode}: ${file.runs[mode].length} Läufe gleich`, () => {
      for (const run of file.runs[mode]) {
        Rand.source = Rand.seeded(BigInt(run.seed));
        store.generateQuizStructure(mode);
        const ist = {
          rhythmBarCount: store.rhythmEntry.barCount,
          tasks: store.tasks.map((t, i) => {
            store.currentIdx = i;
            return {
              kind: t.kind, name: t.name, rootNote: t.rootNote, offsets: t.offsets, level: t.level, playMidi: t.playMidi,
              rhythmAbc: t.rhythmData.length ? AbcNotation.rhythmToAbc(t.rhythmData) : null,
              melodyKey: t.melodyData?.key.name ?? null,
              melodyAbc: t.melodyData ? AbcNotation.melodyToAbc(t.melodyData) : null,
              options: store.currentOptions,
            };
          }),
        };
        expect(stabil(ist), `Seed ${run.seed}`).toBe(stabil({ rhythmBarCount: run.rhythmBarCount, tasks: run.tasks }));
      }
    });
  }
});
