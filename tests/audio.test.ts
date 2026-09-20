// Klang: Portierung von `Checks/audio.swift` (Anschläge über die Hüllkurve,
// Artikulation, Pegel) und der Vergleich der Synthese-Puffer mit
// `klang.json` aus dem Goldmaster — Länge exakt, Werte mit Toleranz, weil
// Swift `Float` und `Float32Array` an der letzten Stelle voneinander abweichen
// dürfen (sin() zweier Bibliotheken).
import { describe, expect, it } from "vitest";
import { Rand } from "../src/kern/Random";
import { MusicData } from "../src/kern/MusicData";
import { RhythmGenerator } from "../src/kern/RhythmGenerator";
import { MelodyGenerator } from "../src/kern/MelodyGenerator";
import { DictationEntry } from "../src/kern/DictationEntry";
import { neueAufgabe } from "../src/kern/QuizTask";
import { ScoreBuffer, ToneRenderer } from "../src/klang/ToneRenderer";
import { Performance } from "../src/klang/Performance";
import { fixture } from "./fixtures";

const sr = 44100;

/** Hüllkurve in 1-ms-Blöcken (Spitzenwert je Block). */
function envelope(s: ScoreBuffer, blockMs = 1): number[] {
  const win = Math.trunc(blockMs / 1000 * sr);
  const env: number[] = [];
  const left = s.left;
  for (let i = 0; i + win <= s.frameCount; i += win) {
    let p = 0;
    for (let j = i; j < i + win; j++) p = Math.max(p, Math.abs(left[j]));
    env.push(p);
  }
  return env;
}

/** Anschläge über die Anstiegsflanke — nur bis `untilMs`. */
function onsets(env: number[], untilMs: number): number[] {
  const out: number[] = [];
  let last = -1000;
  for (let b = 0; b < Math.min(env.length, untilMs); b++) {
    const prev = b >= 2 ? env[b - 2] : 0;
    if (!(env[b] > 0.2 && prev < env[b] * 0.35 && b - last > 200)) continue;
    out.push(b / 1000);
    last = b;
  }
  return out;
}

describe("audio (portiert)", () => {
  const score = Performance.gehoerTask(60, [0, 7], null, sr);
  score.clamp();
  const env = envelope(score);

  it("Einzeltöne bei 0,0 s und 1,0 s, Zusammenklang bei 3,3 s", () => {
    const on = onsets(env, 3400);
    expect(on.length).toBe(3);
    const expected = [0.0, 1.0, 3.3];
    for (let i = 0; i < 3; i++) expect(Math.abs(on[i] - expected[i])).toBeLessThan(0.01);
  });

  it("Pegel bricht an der Tongrenze ein, keine hörbare Lücke, gewollte Atempause", () => {
    expect(Math.min(...env.slice(997, 1002))).toBeLessThan(0.06);
    let longest = 0, run = 0;
    for (let b = 0; b < 2350; b++) { if (env[b] < 0.01) { run++; longest = Math.max(longest, run); } else run = 0; }
    expect(longest).toBeLessThanOrEqual(3);
    let pause = 0; run = 0;
    for (let b = 2350; b < 3300; b++) { if (env[b] < 0.01) { run++; pause = Math.max(pause, run); } else run = 0; }
    expect(pause).toBeGreaterThan(700);
    expect(pause).toBeLessThan(1000);
  });

  it("nichts übersteuert", () => {
    const kadenz = new ScoreBuffer(sr);
    Performance.addCadence(kadenz, MusicData.keyCatalog[0], 0.05, null);
    const faelle = [
      Performance.gehoerTask(60, [0, 7], null, sr),
      Performance.gehoerTask(60, [0, 4, 7, 12], null, sr),
      Performance.audioTest(null, sr),
      kadenz,
    ];
    for (const s of faelle) {
      let peak = 0;
      for (const v of s.left) peak = Math.max(peak, Math.abs(v));
      expect(peak).toBeLessThanOrEqual(1.0);
    }
  });
});

describe("klang.json", () => {
  interface KlangFx { frameCount: number; rms: number; envelope: number[]; head: number[]; metronomeStart?: number; totalDuration?: number }
  const file = fixture<{ sampleRate: number; rhythmSeed: number; melodySeed: number; puffer: Record<string, KlangFx> }>("klang.json");

  function pruefe(name: string, s: ScoreBuffer, metronomeStart?: number, totalDuration?: number) {
    const soll = file.puffer[name];
    expect(soll, name).toBeDefined();
    expect(s.frameCount, `${name}: frameCount`).toBe(soll.frameCount);
    let sum = 0;
    for (const v of s.left) sum += v * v;
    const rms = s.frameCount > 0 ? Math.sqrt(sum / s.frameCount) : 0;
    expect(Math.abs(rms - soll.rms), `${name}: rms`).toBeLessThan(1e-6);
    const env = envelope(s, 10);
    expect(env.length, `${name}: Hüllkurve`).toBe(soll.envelope.length);
    let envErr = 0;
    for (let i = 0; i < env.length; i++) envErr = Math.max(envErr, Math.abs(env[i] - soll.envelope[i]));
    expect(envErr, `${name}: Hüllkurve`).toBeLessThan(1e-5);
    let headErr = 0;
    const head = s.left;
    for (let i = 0; i < soll.head.length; i++) headErr = Math.max(headErr, Math.abs(head[i] - soll.head[i]));
    expect(headErr, `${name}: erste Abtastwerte`).toBeLessThan(1e-5);
    if (soll.metronomeStart !== undefined) expect(metronomeStart, `${name}: metronomeStart`).toBeCloseTo(soll.metronomeStart, 9);
    if (soll.totalDuration !== undefined) expect(totalDuration, `${name}: totalDuration`).toBeCloseTo(soll.totalDuration, 9);
  }

  it("Audiotest, Klick, Kadenz, Gehöraufgaben, Orientierung, Zelle", () => {
    pruefe("audioTest", Performance.audioTest(null, sr));
    const klick = new ScoreBuffer(sr);
    ToneRenderer.addMetronomeClick(klick, 0, true);
    ToneRenderer.addMetronomeClick(klick, 0.5, false);
    pruefe("klick", klick);
    const kadenz = new ScoreBuffer(sr);
    const ende = Performance.addCadence(kadenz, MusicData.keyCatalog[1], 0.1, null);
    pruefe("kadenzAMoll", kadenz, ende);
    pruefe("gehoerQuinte", Performance.gehoerTask(60, [0, 7], null, sr));
    pruefe("gehoerDur7", Performance.gehoerTask(62, [0, 4, 7, 10], null, sr));
    pruefe("orientierung", Performance.orientation(MusicData.keyCatalog[2], 71, null, sr));
    pruefe("zelle", Performance.zellenBeispiel(MusicData.rhythm1Beat[4], 60, null, sr, 0.8));
  });

  it("Diktat-Durchgänge, Lösungen, eigene Notation", () => {
    Rand.source = Rand.seeded(BigInt(file.rhythmSeed));
    const rTask = neueAufgabe("rhythm");
    rTask.rhythmData = RhythmGenerator.generate("mittel");
    rTask.playMidi = 62;
    const rStep = Performance.diktatStep(rTask, MusicData.rhythmSteps[3], 3, null, sr, 1.0);
    pruefe("diktatRhythmus", rStep.score, rStep.metronomeStart, rStep.totalDuration);
    const rSol = Performance.solutionRhythm(rTask, null, sr, 0.75);
    pruefe("loesungRhythmus", rSol.score, rSol.metronomeStart, rSol.totalDuration);

    Rand.source = Rand.seeded(BigInt(file.melodySeed));
    const mTask = neueAufgabe("melody");
    mTask.melodyData = MelodyGenerator.generateDictation("mittel");
    const m0 = Performance.diktatStep(mTask, MusicData.rhythmSteps[0], 0, null, sr, 0.75);
    pruefe("diktatMelodie0", m0.score, m0.metronomeStart, m0.totalDuration);
    const m5 = Performance.diktatStep(mTask, MusicData.rhythmSteps[5], 5, null, sr, 1.0);
    pruefe("diktatMelodie5", m5.score, m5.metronomeStart, m5.totalDuration);
    const mSol = Performance.solutionMelody(mTask.melodyData!, null, sr, 1.0);
    pruefe("loesungMelodie", mSol.score, mSol.metronomeStart, mSol.totalDuration);

    const entry = new DictationEntry();
    entry.place("quarter", false, 0); entry.place("eighth", false, 1); entry.place("eighth", false, 2);
    entry.placeTriplet([3, 4, 3]); entry.moveCursorToBeat(6); entry.place("half", true, 4);
    const eMel = Performance.entryPlayback(entry, MusicData.keyCatalog[0], 60, null, sr, 1.0);
    pruefe("eingabeMelodie", eMel.score, eMel.metronomeStart, eMel.totalDuration);
    const eRh = Performance.entryPlayback(entry, null, 62, null, sr, 0.5);
    pruefe("eingabeRhythmus", eRh.score, eRh.metronomeStart, eRh.totalDuration);
  });
});
