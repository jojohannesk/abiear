// Portierung von `Checks/ablauf.swift`: was der Store wann aufzeichnet, was
// nie. Ohne Ton (StummeAusgabe), Statistik im Arbeitsspeicher, Einstellungen
// je Store frisch — die Invarianten aus CLAUDE.md.
import { describe, expect, it } from "vitest";
import { QuizStore } from "../src/kern/QuizStore.svelte";
import { SpeicherAblage } from "../src/kern/Statistics";
import { SpeicherEinstellungen } from "../src/plattform/Einstellungen";
import { StummeAusgabe } from "../src/klang/AudioEngine";
import { MusicData } from "../src/kern/MusicData";
import type { Kind } from "../src/kern/QuizTask";

function frischerStore(): QuizStore {
  const store = new QuizStore({ ablage: new SpeicherAblage(), einstellungen: new SpeicherEinstellungen(), audio: new StummeAusgabe() });
  for (const kind of ["interval", "chord", "rhythm", "melody"] as Kind[]) store.setAdaptive(false, kind);
  return store;
}

/** Zur nächsten Aufgabe, ohne `prepareCurrentQuestion` — das würde Audio anstoßen. */
function gehe(store: QuizStore, index: number) {
  store.currentIdx = index;
  store.hasAnswered = false;
}

/** Vier volle Takte Viertel — eine gültige, meist falsche Eingabe. */
function viertelFuellen(store: QuizStore, kind: Kind, takte = 4) {
  for (let i = 0; i < takte * 4; i++) {
    if (kind === "rhythm") store.appendRhythm("quarter", false);
    else store.placeMelodyNote(0, "quarter", false);
  }
}

describe("Aufgabenstruktur", () => {
  it("Komplettprüfung: 16 Aufgaben in Prüfungsreihenfolge, 30 Punkte, vier Takte", () => {
    const s = frischerStore();
    s.generateQuizStructure("mix");
    expect(s.tasks.length).toBe(16);
    expect(s.tasks.slice(0, 2).map((t) => t.kind)).toEqual(["rhythm", "melody"]);
    expect(s.tasks.filter((t) => t.kind === "interval").length).toBe(7);
    expect(s.tasks.filter((t) => t.kind === "chord").length).toBe(7);
    expect(s.totalScore.possible).toBe(30);
    expect(s.tasks.find((t) => t.kind === "rhythm")?.rhythmData.length).toBe(4);
    expect(s.rhythmEntry.barCount).toBe(4);
  });
  it("Schnell üben: 3 Intervalle, 3 Akkorde, dann 1 Takt — 8 Punkte", () => {
    const s = frischerStore();
    s.generateQuizStructure("kurz");
    expect(s.tasks.map((t) => t.kind)).toEqual(["interval", "interval", "interval", "chord", "chord", "chord", "rhythm"]);
    expect(s.totalScore.possible).toBe(8);
    expect(s.rhythmEntry.barCount).toBe(1);
    expect(s.tasks[s.tasks.length - 1].rhythmData.length).toBe(1);
  });
  it("Intervalle: 7 Aufgaben, 7 Punkte", () => {
    const s = frischerStore();
    s.generateQuizStructure("intervals");
    expect(s.tasks.length).toBe(7);
    expect(s.totalScore.possible).toBe(7);
  });
});

describe("Antworten und Wiederholungsrunde", () => {
  const a = frischerStore();
  a.generateQuizStructure("intervals");
  a.mode = "intervals";
  const erste = a.tasks[0];

  it("richtige Antwort wird einmal aufgezeichnet, eine zweite verworfen", () => {
    a.answer(erste.name);
    expect(a.tasks[0].isCorrect).toBe(true);
    expect(a.tasks[0].userChoice).toBe(erste.name);
    expect(a.statistics.answers.length).toBe(1);
    a.answer("Reine Prime");
    expect(a.tasks[0].userChoice).toBe(erste.name);
    expect(a.statistics.answers.length).toBe(1);
    const z = a.statistics.answers[0];
    expect(z.solution).toBe(erste.name);
    expect(z.answer).toBe(erste.name);
    expect(z.rootNote).toBe(erste.rootNote);
    expect(z.kind).toBe("interval");
    expect(z.correct).toBe(true);
  });

  it("falsche Antwort: nicht richtig, trotzdem aufgezeichnet; Punkte zählen nur richtige", () => {
    gehe(a, 1);
    const zweite = a.tasks[1];
    const falsch = MusicData.intervals.find((i) => i.name !== zweite.name)!.name;
    a.answer(falsch);
    expect(a.tasks[1].isCorrect).toBe(false);
    expect(a.statistics.answers.length).toBe(2);
    expect(a.statistics.answers[1].correct).toBe(false);
    expect(a.totalScore.achieved).toBe(1);
    for (let i = 2; i < 7; i++) { gehe(a, i); a.answer(falsch === a.tasks[i].name ? "Reine Oktave" : falsch); }
    expect(a.statistics.answers.length).toBe(7);
  });

  it("die Wiederholungsrunde enthält genau die falschen Aufgaben und zeichnet nichts auf", () => {
    const vorher = a.statistics.answers.length;
    const falsche = a.wrongGradedTasks.length;
    a.repeatWrongTasks();
    expect(a.isRepeatRound).toBe(true);
    expect(a.tasks.length).toBe(falsche);
    expect(a.tasks.every((t) => t.userChoice === null)).toBe(true);
    for (let i = 0; i < a.tasks.length; i++) { gehe(a, i); a.answer(a.tasks[i].name); }
    expect(a.statistics.answers.length).toBe(vorher);
  });
});

describe("Diktate", () => {
  it("ohne Eingabe nichts, mit Eingabe vier Takte derselben Sitzung — auch beim Abbruch", () => {
    const d = frischerStore();
    d.generateQuizStructure("rhythm");
    d.mode = "rhythm";
    d.returnToStart();
    expect(d.statistics.bars.length).toBe(0);
    d.generateQuizStructure("rhythm");
    viertelFuellen(d, "rhythm");
    expect(d.rhythmEntry.isComplete).toBe(true);
    d.returnToStart();
    expect(d.statistics.bars.length).toBe(4);
    const sitzung = d.statistics.bars[0].sessionId;
    expect(d.statistics.bars.every((b) => b.sessionId === sitzung)).toBe(true);
  });

  it("Auswertung und Abbruch zeichnen denselben Takt nur einmal auf (Upsert)", () => {
    const e = frischerStore();
    e.generateQuizStructure("rhythm");
    e.mode = "rhythm";
    viertelFuellen(e, "rhythm");
    e.showResults();
    e.showResults();
    e.returnToStart();
    expect(e.statistics.bars.length).toBe(4);
    expect(e.statistics.bars.every((b) => b.figures.length > 0 && b.wrongItems !== null)).toBe(true);
  });

  it("Melodiediktat: vier Taktzeilen mit Tonart", () => {
    const m = frischerStore();
    m.generateQuizStructure("melody");
    m.mode = "melody";
    viertelFuellen(m, "melody");
    m.showResults();
    expect(m.statistics.bars.length).toBe(4);
    expect(m.statistics.bars.every((b) => b.kind === "melody" && b.key !== null)).toBe(true);
  });

  it("Schnell üben zeichnet sechs Antworten und einen Takt auf", () => {
    const k = frischerStore();
    k.generateQuizStructure("kurz");
    k.mode = "kurz";
    for (let i = 0; i < 6; i++) { gehe(k, i); k.answer(k.tasks[i].name); }
    gehe(k, 6);
    viertelFuellen(k, "rhythm", 1);
    k.showResults();
    expect(k.statistics.answers.length).toBe(6);
    expect(k.statistics.bars.length).toBe(1);
    expect(k.statistics.bars[0].bar).toBe(0);
    expect(k.totalScore.possible).toBe(8);
    expect(k.totalScore.achieved).toBeGreaterThanOrEqual(6);
  });
});

describe("Adaptiver Modus, Tempo, Tagesziel", () => {
  it("Intervalle sind nach zwanzig Durchgängen adaptiv — die Komplettprüfung nie", () => {
    const p = frischerStore();
    for (let n = 0; n < 20; n++) {
      p.generateQuizStructure("intervals");
      p.mode = "intervals";
      gehe(p, 0);
      p.answer(p.tasks[0].name);
    }
    p.setAdaptive(true, "interval");
    expect([...p.activeAdaptiveKinds("intervals")]).toEqual(["interval"]);
    expect(p.activeAdaptiveKinds("mix").size).toBe(0);
    expect([...p.activeAdaptiveKinds("kurz")]).toEqual(["interval"]);
  });

  it("Übetempo: Voreinstellung, Übersteuerung nur für den Lauf", () => {
    const u = frischerStore();
    u.setTempoBPM(60);
    expect(u.aktivesTempoBPM).toBe(60);
    expect(u.secondsPerBeat).toBe(1.0);
    u.laufTempoBPM = 40;
    expect(u.aktivesTempoBPM).toBe(40);
    expect(u.secondsPerBeat).toBe(1.5);
    expect(u.tempoBPM).toBe(60);
    u.generateQuizStructure("rhythm");
    u.mode = "rhythm";
    u.returnToStart();
    expect(u.laufTempoBPM).toBeNull();
    expect(u.aktivesTempoBPM).toBe(60);
  });

  it("eine Antwort erfüllt das Tagesziel", () => {
    const t = frischerStore();
    expect(t.insights.serie(null, undefined, t.heute).heuteGeuebt).toBe(false);
    t.generateQuizStructure("chords");
    t.mode = "chords";
    gehe(t, 0);
    t.answer(t.tasks[0].name);
    expect(t.insights.serie(null, undefined, t.heute).heuteGeuebt).toBe(true);
    expect(t.serie().aktuell).toBe(1);
  });

  it("Einstellungen überleben einen neuen Store mit denselben Schlüsseln", () => {
    const einstellungen = new SpeicherEinstellungen();
    const a = new QuizStore({ ablage: new SpeicherAblage(), einstellungen });
    a.setLevel("abitur", "rhythm");
    a.setAdaptive(true, "chord");
    a.setTempoBPM(48);
    expect(einstellungen.lesen("niveau.rhythmus")).toBe("abitur");
    expect(einstellungen.lesen("uebetempoBPM")).toBe("48");
    const b = new QuizStore({ ablage: new SpeicherAblage(), einstellungen });
    expect(b.rhythmLevel).toBe("abitur");
    expect(b.melodyLevel).toBe("mittel");
    expect(b.isAdaptive("chord")).toBe(true);
    expect(b.tempoBPM).toBe(48);
  });
});
