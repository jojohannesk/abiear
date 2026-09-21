// Ablauflogik. Portierung von `Models/QuizStore.swift`.
//
// Eine Klasse mit `$state`-Feldern — das ist hier, was `@Published` in
// Swift ist. Die Oberfläche liest den Store, alles Klingende läuft über die
// `Klangausgabe`, alles Persistente über `Einstellungen` und `Ablage`.
// So lässt sich der Ablauf ohne Ton und ohne Browser prüfen
// (`tests/ablauf.test.ts`, wie `Checks/ablauf.swift`).
//
// **Wertsemantik der Eingabe.** `DictationEntry` ist in Swift ein Struct;
// hier wird vor jeder Änderung eine Kopie angelegt und zurückgeschrieben —
// so sieht die Oberfläche jede Änderung, und der Vergleich mit einem
// früheren Stand bleibt möglich.

import { Rand } from "./Random";
import { MusicData, type DictationStep } from "./MusicData";
import { DictationLevels, type DictationLevel } from "./DictationLevel";
import { RhythmGenerator, WeightedSampler } from "./RhythmGenerator";
import { MelodyGenerator } from "./MelodyGenerator";
import { contourOfBar, movesInBar } from "./MelodicMove";
import { DictationEntry, type NoteValue, NoteValues } from "./DictationEntry";
import { DictationScoring, type BarResult } from "./DictationScoring";
import { Kinds, neueAufgabe, TrainingModes, type Kind, type QuizTask, type TrainingMode } from "./QuizTask";
import { NEUTRAL, Profile, type AdaptiveProfile } from "./AdaptiveProfile";
import { answerRecord, barRecord, neueUUID, StatisticsStore, type Ablage } from "./Statistics";
import { StatisticsInsights, type Uebungsserie } from "./StatisticsInsights";
import { LokalerKalender, type Kalender } from "./Kalender";
import type { Erinnerungsplaner } from "./Erinnerungsplaner";
import { Performance, type DiktatPlayback } from "../klang/Performance";
import type { ScoreBuffer } from "../klang/ToneRenderer";
import { StummeAusgabe, type Klangausgabe } from "../klang/AudioEngine";
import { Haptics } from "../plattform/Haptik";
import { SpeicherEinstellungen, type Einstellungen } from "../plattform/Einstellungen";

export type Screen =
  | { readonly art: "start" }
  | { readonly art: "prepare"; readonly mode: TrainingMode }
  | { readonly art: "quiz" }
  | { readonly art: "result" };

export interface StoreAbhaengigkeiten {
  audio?: Klangausgabe;
  einstellungen?: Einstellungen;
  ablage: Ablage;
  erinnerungen?: Erinnerungsplaner | null;
  kalender?: Kalender;
  jetzt?: () => Date;
}

const RHYTHM_LEVEL_KEY = "niveau.rhythmus";
const MELODY_LEVEL_KEY = "niveau.melodie";
const ADAPTIVE_KEY = "adaptiv.disziplinen";
export const TEMPO_KEY = "uebetempoBPM";

function schlafe(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class QuizStore {
  // MARK: - Veröffentlichter Zustand

  screen = $state<Screen>({ art: "start" });
  mode = $state<TrainingMode>("mix");
  tasks = $state.raw<readonly QuizTask[]>([]);
  currentIdx = $state(0);
  hasAnswered = $state(false);
  showSkipModal = $state(false);

  diktatStep = $state(0);
  diktatFinished = $state(false);
  isPlayingDiktat = $state(false);
  metronomeBeat = $state<number | null>(null);

  readonly audio: Klangausgabe;
  readonly statistics: StatisticsStore;
  private readonly einstellungen: Einstellungen;
  private readonly erinnerungen: Erinnerungsplaner | null;
  private readonly kalender: Kalender;
  private readonly jetzt: () => Date;

  private playbackAbbruch: (() => void) | null = null;
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;

  // MARK: - Niveau der Diktate

  rhythmLevel = $state<DictationLevel>(DictationLevels.standard);
  melodyLevel = $state<DictationLevel>(DictationLevels.standard);

  private loadLevel(key: string): DictationLevel {
    const raw = this.einstellungen.lesen(key);
    return (DictationLevels.all as readonly string[]).includes(raw ?? "") ? (raw as DictationLevel) : DictationLevels.standard;
  }

  level(kind: Kind): DictationLevel {
    return kind === "rhythm" ? this.rhythmLevel : this.melodyLevel;
  }

  setLevel(level: DictationLevel, kind: Kind): void {
    if (kind === "rhythm") {
      this.rhythmLevel = level;
      this.einstellungen.schreiben(RHYTHM_LEVEL_KEY, level);
    } else {
      this.melodyLevel = level;
      this.einstellungen.schreiben(MELODY_LEVEL_KEY, level);
    }
  }

  // MARK: - Adaptiver Modus

  private adaptiveKinds = $state.raw<ReadonlySet<Kind>>(new Set());

  private loadAdaptiveKinds(): Set<Kind> {
    try {
      const raw = JSON.parse(this.einstellungen.lesen(ADAPTIVE_KEY) ?? "[]") as unknown;
      if (!Array.isArray(raw)) return new Set();
      return new Set(raw.filter((k): k is Kind => (Kinds.all as readonly string[]).includes(String(k))));
    } catch {
      return new Set();
    }
  }

  isAdaptive(kind: Kind): boolean {
    return this.adaptiveKinds.has(kind);
  }

  setAdaptive(on: boolean, kind: Kind): void {
    const neu = new Set(this.adaptiveKinds);
    if (on) neu.add(kind); else neu.delete(kind);
    this.adaptiveKinds = neu;
    this.einstellungen.schreiben(ADAPTIVE_KEY, JSON.stringify([...neu].sort()));
  }

  get insights(): StatisticsInsights {
    return StatisticsInsights.fromStore(this.statistics);
  }

  // MARK: - Serien-Cache

  private serienCache = new Map<string, Uebungsserie>();

  serie(kind: Kind | null = null): Uebungsserie {
    void this.statistikRevision;
    const key = kind ?? "alle";
    const c = this.serienCache.get(key);
    if (c) return c;
    const s = this.insights.serie(kind, this.kalender, this.heute);
    this.serienCache.set(key, s);
    return s;
  }

  private statistikGeaendert(): void {
    this.serienCache.clear();
    this.statistikRevision += 1;
  }

  statistikRevision = $state(0);

  // MARK: - Der laufende Tag

  heute = $state<Date>(new Date(0));

  tagPruefen(): void {
    const jetzt = this.kalender.startOfDay(this.jetzt());
    if (jetzt.getTime() !== this.heute.getTime()) {
      this.heute = jetzt;
      this.statistikGeaendert();
    }
  }

  async statistikZuruecksetzen(): Promise<void> {
    await this.statistics.reset();
    this.statistikGeaendert();
    this.erinnerungNachziehen();
  }

  activeAdaptiveKinds(mode: TrainingMode): Set<Kind> {
    if (!TrainingModes.allowsAdaptive(mode)) return new Set();
    const stats = this.insights;
    return new Set(TrainingModes.kinds(mode).filter((k) => this.adaptiveKinds.has(k) && stats.isAdaptiveUnlocked(k)));
  }

  // MARK: - Einrichtung

  private sessionId = neueUUID();
  private isRepeatRoundInternal = $state(false);

  constructor(abh: StoreAbhaengigkeiten) {
    this.audio = abh.audio ?? new StummeAusgabe();
    this.einstellungen = abh.einstellungen ?? new SpeicherEinstellungen();
    this.statistics = new StatisticsStore(abh.ablage);
    this.erinnerungen = abh.erinnerungen ?? null;
    this.kalender = abh.kalender ?? LokalerKalender;
    this.jetzt = abh.jetzt ?? (() => new Date());
    this.heute = this.kalender.startOfDay(this.jetzt());

    this.rhythmLevel = this.loadLevel(RHYTHM_LEVEL_KEY);
    this.melodyLevel = this.loadLevel(MELODY_LEVEL_KEY);
    this.adaptiveKinds = this.loadAdaptiveKinds();
    const tempo = Number(this.einstellungen.lesen(TEMPO_KEY));
    this.tempoBPM = Number.isInteger(tempo) && tempo > 0 ? tempo : Performance.examBPM;

    this.audio.onInterrupted(() => this.stopAllAudio());
  }

  /** Lädt die Statistik — einmal beim Start, bevor die Oberfläche steht. */
  async laden(): Promise<void> {
    await this.statistics.load();
    this.statistikGeaendert();
  }

  /** Die aktuelle Zeit — injizierbar, damit die Prüfungen ein festes „jetzt" haben. */
  jetztDatum(): Date {
    return this.jetzt();
  }

  get currentTask(): QuizTask | null {
    return this.currentIdx >= 0 && this.currentIdx < this.tasks.length ? this.tasks[this.currentIdx] : null;
  }

  // MARK: - Start

  async selectAndStart(mode: TrainingMode): Promise<void> {
    this.mode = mode;
    this.audio.activate();
    await this.audio.loadSamples();
    this.generateQuizStructure(mode);
    this.screen = { art: "quiz" };
    this.prepareCurrentQuestion();
  }

  generateQuizStructure(mode: TrainingMode): void {
    const list: QuizTask[] = [];

    const adaptive = this.activeAdaptiveKinds(mode);
    const profile: AdaptiveProfile = adaptive.size === 0 ? NEUTRAL : this.insights.adaptiveProfile(adaptive);

    const rhythmus = () => {
      const rhythmMidi = Rand.index(13) + 55;
      const task = neueAufgabe("rhythm");
      task.level = this.rhythmLevel;
      task.rhythmData = RhythmGenerator.generate(this.rhythmLevel, profile).slice(0, TrainingModes.rhythmusTakte(mode));
      task.playMidi = rhythmMidi;
      list.push(task);
    };

    if (mode === "rhythm" || mode === "mix") rhythmus();

    if (mode === "melody" || mode === "mix") {
      const task = neueAufgabe("melody");
      task.level = this.melodyLevel;
      task.melodyData = MelodyGenerator.generateDictation(this.melodyLevel, profile);
      list.push(task);
    }

    if (mode === "intervals" || mode === "mix" || mode === "kurz") {
      for (let i = 0; i < TrainingModes.aufgabenJeGehoerDisziplin(mode); i++) {
        const rInt = WeightedSampler.sample(MusicData.intervals, (x) => Profile.interval(profile, x.name));
        const rRoot = Rand.index(13) + 55;
        const task = neueAufgabe("interval");
        task.name = rInt.name;
        task.rootNote = rRoot;
        task.offsets = [0, rInt.semitones];
        list.push(task);
      }
    }

    if (mode === "chords" || mode === "mix" || mode === "kurz") {
      for (let i = 0; i < TrainingModes.aufgabenJeGehoerDisziplin(mode); i++) {
        const rCho = WeightedSampler.sample(MusicData.chords, (x) => Profile.chord(profile, x.name));
        const rRoot = Rand.index(18) + 55;
        const task = neueAufgabe("chord");
        task.name = rCho.name;
        task.rootNote = rRoot;
        task.offsets = [...rCho.offsets];
        list.push(task);
      }
    }

    if (mode === "kurz") rhythmus();

    this.tasks = list;
    this.currentIdx = 0;
    this.rhythmEntry = new DictationEntry([], 0, TrainingModes.rhythmusTakte(mode));
    this.melodyEntry = new DictationEntry();
    this.sessionId = neueUUID();
    this.isRepeatRoundInternal = false;
  }

  // MARK: - Fragenwechsel

  prepareCurrentQuestion(): void {
    this.hasAnswered = false;
    this.stopAllAudio();
    this.diktatStep = 0;
    this.diktatFinished = false;

    const task = this.currentTask;
    if (!task) return;

    if (task.kind === "interval" || task.kind === "chord") {
      // 300 ms Verzögerung vor dem ersten Erklingen
      let abgebrochen = false;
      this.playbackAbbruch = () => { abgebrochen = true; };
      void schlafe(300).then(() => {
        if (abgebrochen) return;
        this.playCurrentGehoerTask();
      });
    }
  }

  advanceQuiz(): void {
    this.currentIdx += 1;
    if (this.currentIdx < this.tasks.length) {
      this.prepareCurrentQuestion();
    } else {
      this.showResults();
    }
  }

  showResults(): void {
    this.stopAllAudio();
    this.recordRhythmResults();
    this.recordMelodyResults();
    this.screen = { art: "result" };
    this.erinnerungNachziehen();
  }

  returnToStart(): void {
    this.stopAllAudio();
    // Auch beim Abbrechen aufzeichnen — `upsertBar` ersetzt über
    // (sessionId, kind, bar), doppelt wird nichts.
    this.recordRhythmResults();
    this.recordMelodyResults();
    this.screen = { art: "start" };
    this.laufTempoBPM = null;
    this.erinnerungNachziehen();
  }

  private erinnerungNachziehen(): void {
    if (!this.erinnerungen) return;
    const stand = this.insights;
    void this.erinnerungen.neuPlanen(stand);
  }

  // MARK: - Intervalle / Akkorde

  playCurrentGehoerTask(): void {
    const task = this.currentTask;
    if (!task) return;
    this.stopAllAudio();
    const bank = this.audio.bank, rate = this.audio.sampleRate;
    this.gerechnetSpielen(() => Performance.gehoerTask(task.rootNote, task.offsets, bank, rate));
  }

  playChosenAnswer(): void {
    const task = this.currentTask;
    if (!task || task.userChoice === null || task.userChoice === task.name) return;
    const wahl = task.userChoice;
    let offsets: number[];
    if (task.kind === "interval") {
      const i = MusicData.intervals.find((x) => x.name === wahl);
      if (!i) return;
      offsets = [0, i.semitones];
    } else if (task.kind === "chord") {
      const c = MusicData.chords.find((x) => x.name === wahl);
      if (!c) return;
      offsets = [...c.offsets];
    } else {
      return;
    }
    this.stopAllAudio();
    const bank = this.audio.bank, rate = this.audio.sampleRate, root = task.rootNote;
    this.gerechnetSpielen(() => Performance.gehoerTask(root, offsets, bank, rate));
  }

  // MARK: - Rendern, abgesetzt vom Tippen

  private renderlauf = 0;

  /**
   * Rechnet den Puffer nach dem nächsten Tick, damit die Oberfläche den
   * Tipp erst zeichnet, und spielt ihn nur, wenn inzwischen nichts anderes
   * angestoßen wurde.
   */
  private gerechnetSpielen(rendern: () => ScoreBuffer, danach?: (s: ScoreBuffer) => void): void {
    this.renderlauf += 1;
    const meiner = this.renderlauf;
    void schlafe(0).then(() => {
      if (meiner !== this.renderlauf) return;
      const score = rendern();
      score.clamp();
      if (meiner !== this.renderlauf) return;
      this.audio.play(score);
      danach?.(score);
    });
  }

  answer(selectedName: string): void {
    if (this.hasAnswered || this.currentIdx < 0 || this.currentIdx >= this.tasks.length) return;
    this.hasAnswered = true;
    this.stopAllAudio();
    const task = { ...this.tasks[this.currentIdx] };
    task.userChoice = selectedName;
    task.isCorrect = selectedName === task.name;
    const neu = this.tasks.slice();
    neu[this.currentIdx] = task;
    this.tasks = neu;

    if (!this.isRepeatRoundInternal) {
      this.statistics.record(answerRecord({
        sessionId: this.sessionId,
        date: this.jetzt(),
        kind: task.kind,
        solution: task.name,
        answer: selectedName,
        correct: task.isCorrect,
        rootNote: task.rootNote,
      }));
      this.statistikGeaendert();
    }
  }

  get currentOptions(): readonly string[] {
    const task = this.currentTask;
    if (!task) return [];
    switch (task.kind) {
      case "interval": return MusicData.intervals.map((i) => i.name);
      case "chord": return MusicData.chords.map((c) => c.name);
      default: return [];
    }
  }

  get showsNumberHints(): boolean {
    return this.currentOptions.length <= 9;
  }

  // MARK: - Melodie-Orientierung

  playOrientation(): void {
    const melody = this.currentTask?.melodyData;
    if (!melody) return;
    this.stopAllAudio();
    const bank = this.audio.bank, rate = this.audio.sampleRate;
    this.gerechnetSpielen(() => Performance.orientation(melody.key, melody.notes[0].midiNumber, bank, rate));
  }

  // MARK: - Diktat

  get diktatSteps(): readonly DictationStep[] {
    const task = this.currentTask;
    return MusicData.steps(task?.kind === "rhythm"
      ? (task.rhythmData.length || DictationEntry.standardBarCount)
      : DictationEntry.standardBarCount);
  }

  get currentDiktatStepInfo(): DictationStep {
    const steps = this.diktatSteps;
    return steps[Math.min(this.diktatStep, steps.length - 1)];
  }

  /** Persistierte Voreinstellung (unter „Mehr"). */
  tempoBPM = $state(Performance.examBPM);

  setTempoBPM(bpm: number): void {
    this.tempoBPM = bpm;
    this.einstellungen.schreiben(TEMPO_KEY, String(bpm));
  }

  /** Übersteuerung für einen Lauf. */
  laufTempoBPM = $state<number | null>(null);

  get aktivesTempoBPM(): number {
    return this.laufTempoBPM ?? this.tempoBPM;
  }

  get secondsPerBeat(): number {
    return Performance.secondsPerBeat(this.aktivesTempoBPM);
  }

  playDiktatStep(): void {
    const task = this.currentTask;
    if (!task || this.isPlayingDiktat) return;

    this.isPlayingDiktat = true;
    this.stopAllAudio(true);

    const step = this.currentDiktatStepInfo, index = this.diktatStep;
    const bank = this.audio.bank, rate = this.audio.sampleRate, beat = this.secondsPerBeat;
    this.renderlauf += 1;
    const meiner = this.renderlauf;

    let abgebrochen = false;
    this.playbackAbbruch = () => { abgebrochen = true; };

    void (async () => {
      await schlafe(0);
      if (abgebrochen || meiner !== this.renderlauf) return;
      const playback = Performance.diktatStep(task, step, index, bank, rate, beat);
      playback.score.clamp();
      if (abgebrochen || meiner !== this.renderlauf) return;
      if (!this.audio.play(playback.score)) {
        // Stumm weiterzuschalten hieße, einen Durchgang zu verbrauchen, den niemand gehört hat.
        this.isPlayingDiktat = false;
        return;
      }
      this.startVisualMetronome(playback.metronomeStart);

      await schlafe(playback.totalDuration * 1000);
      if (abgebrochen) return;
      this.audio.stopAll();
      this.isPlayingDiktat = false;
      if (this.diktatStep < this.diktatSteps.length - 1) {
        this.diktatStep += 1;
      } else {
        this.diktatFinished = true;
      }
    })();
  }

  private startVisualMetronome(startTime: number): void {
    if (this.metronomeTimer) clearInterval(this.metronomeTimer);
    this.metronomeBeat = null;

    let shown = -1;
    this.metronomeTimer = setInterval(() => {
      const t = this.audio.currentPlaybackTime();
      if (t === null) return;
      const elapsed = t - startTime;
      if (elapsed < 0) return;
      const beat = Math.floor(elapsed / this.secondsPerBeat);
      if (beat >= 4) {
        this.stopMetronome();
        return;
      }
      if (beat !== shown) {
        shown = beat;
        this.metronomeBeat = beat;
      }
    }, 25);
  }

  private stopMetronome(): void {
    if (this.metronomeTimer) { clearInterval(this.metronomeTimer); this.metronomeTimer = null; }
    this.metronomeBeat = null;
  }

  openSkipModal(): void {
    this.stopAllAudio();
    this.showSkipModal = true;
  }

  closeSkipModal(): void {
    this.showSkipModal = false;
  }

  confirmSkip(): void {
    this.showSkipModal = false;
    this.advanceQuiz();
  }

  // MARK: - Lösungswiedergabe

  playSolutionRhythm(): void {
    const task = this.tasks.find((t) => t.kind === "rhythm");
    if (!task) return;
    const bank = this.audio.bank, rate = this.audio.sampleRate, beat = this.secondsPerBeat;
    this.mitMetronomSpielen(() => Performance.solutionRhythm(task, bank, rate, beat));
  }

  playSolutionMelody(): void {
    const melody = this.tasks.find((t) => t.kind === "melody")?.melodyData;
    if (!melody) return;
    const bank = this.audio.bank, rate = this.audio.sampleRate, beat = this.secondsPerBeat;
    this.mitMetronomSpielen(() => Performance.solutionMelody(melody, bank, rate, beat));
  }

  playOwnEntry(kind: Kind): void {
    const entry = kind === "rhythm" ? this.rhythmEntry : this.melodyEntry;
    const task = this.tasks.find((t) => t.kind === kind);
    if (entry.isEmpty || !task) return;
    const key = kind === "melody" ? task.melodyData?.key ?? null : null;
    const bank = this.audio.bank, rate = this.audio.sampleRate, beat = this.secondsPerBeat;
    this.mitMetronomSpielen(() => Performance.entryPlayback(entry, key, task.playMidi, bank, rate, beat));
  }

  private mitMetronomSpielen(rendern: () => DiktatPlayback): void {
    this.stopAllAudio();
    this.renderlauf += 1;
    const meiner = this.renderlauf;
    void schlafe(0).then(() => {
      if (meiner !== this.renderlauf) return;
      const playback = rendern();
      playback.score.clamp();
      if (meiner !== this.renderlauf) return;
      this.audio.play(playback.score);
      this.startVisualMetronome(playback.metronomeStart);
    });
  }

  // MARK: - Rhythmuseingabe

  rhythmEntry = $state.raw(new DictationEntry());

  get rhythmResults(): BarResult[] {
    const task = this.tasks.find((t) => t.kind === "rhythm");
    if (!task) return [];
    return DictationScoring.scoreRhythm(this.rhythmEntry, task.rhythmData);
  }

  private aendereRhythm(f: (e: DictationEntry) => boolean | void): boolean {
    const e = this.rhythmEntry.clone();
    const ok = f(e);
    this.rhythmEntry = e;
    return ok !== false;
  }

  appendRhythm(value: NoteValue, dotted: boolean): void {
    if (this.aendereRhythm((e) => e.place(value, dotted))) Haptics.select();
  }

  appendRhythmTriplet(): void {
    if (this.aendereRhythm((e) => e.placeTriplet())) Haptics.select();
  }

  removeLastRhythmNote(): void {
    if (!this.rhythmEntry.canRemoveAtCursor) return;
    this.aendereRhythm((e) => e.removeAtCursor());
    Haptics.select();
  }

  moveRhythmCursor(beat: number): void {
    if (this.rhythmEntry.currentBeat === beat) return;
    this.aendereRhythm((e) => e.moveCursorToBeat(beat));
    Haptics.select();
  }

  /** Schreibt die gerechneten Takte in die Statistik — nur wenn etwas notiert wurde. */
  private recordRhythmResults(): void {
    const task = this.tasks.find((t) => t.kind === "rhythm");
    if (!task || this.rhythmEntry.isEmpty) return;

    for (const result of DictationScoring.scoreRhythm(this.rhythmEntry, task.rhythmData)) {
      const alle = result.bar >= 0 && result.bar < task.rhythmData.length
        ? task.rhythmData[result.bar].map((f) => f.id) : [];
      this.statistics.upsertBar(barRecord({
        sessionId: this.sessionId,
        date: this.jetzt(),
        kind: "rhythm",
        bar: result.bar,
        points: result.points,
        figures: alle,
        key: null,
        level: task.level,
        wrongItems: result.wrongItems,
      }));
    }
    this.statistikGeaendert();
  }

  // MARK: - Melodieeingabe

  melodyEntry = $state.raw(new DictationEntry());

  get melodyResults(): BarResult[] {
    const melody = this.tasks.find((t) => t.kind === "melody")?.melodyData;
    if (!melody) return [];
    return DictationScoring.scoreMelody(this.melodyEntry, melody);
  }

  private aendereMelody(f: (e: DictationEntry) => boolean | void): boolean {
    const e = this.melodyEntry.clone();
    const ok = f(e);
    this.melodyEntry = e;
    return ok !== false;
  }

  placeMelodyNote(degree: number, value: NoteValue, dotted: boolean): void {
    if (this.aendereMelody((e) => e.placeUnits(NoteValues.units(value, dotted), degree))) Haptics.select();
  }

  placeMelodyTripletMember(degree: number): void {
    if (this.aendereMelody((e) => e.placeTripletMember(degree))) Haptics.select();
  }

  removeLastMelodyNote(): void {
    if (!this.melodyEntry.canRemoveAtCursor) return;
    this.aendereMelody((e) => e.removeAtCursor());
    Haptics.select();
  }

  moveMelodyCursor(beat: number): void {
    if (this.melodyEntry.currentBeat === beat) return;
    this.aendereMelody((e) => e.moveCursorToBeat(beat));
    Haptics.select();
  }

  private recordMelodyResults(): void {
    const task = this.tasks.find((t) => t.kind === "melody");
    const melody = task?.melodyData;
    if (!task || !melody || this.melodyEntry.isEmpty) return;

    for (const result of DictationScoring.scoreMelody(this.melodyEntry, melody)) {
      this.statistics.upsertBar(barRecord({
        sessionId: this.sessionId,
        date: this.jetzt(),
        kind: "melody",
        bar: result.bar,
        points: result.points,
        figures: [],
        moves: movesInBar(melody, result.bar),
        contour: contourOfBar(melody, result.bar),
        key: melody.key.name,
        level: task.level,
        wrongItems: result.wrongItems,
      }));
    }
    this.statistikGeaendert();
  }

  // MARK: - Falsche wiederholen

  get isRepeatRound(): boolean {
    return this.isRepeatRoundInternal;
  }

  get wrongGradedTasks(): QuizTask[] {
    return this.gradedTasks.filter((t) => !t.isCorrect);
  }

  repeatWrongTasks(): void {
    const wrong = this.wrongGradedTasks;
    if (wrong.length === 0) return;

    this.tasks = wrong.map((old) => {
      const task = neueAufgabe(old.kind);
      task.name = old.name;
      task.rootNote = old.rootNote;
      task.offsets = [...old.offsets];
      return task;
    });
    this.currentIdx = 0;
    this.isRepeatRoundInternal = true;
    this.screen = { art: "quiz" };
    this.prepareCurrentQuestion();
  }

  // MARK: - Punkte

  dictationTotal(kind: Kind): number {
    const results = kind === "rhythm" ? this.rhythmResults : this.melodyResults;
    return results.reduce((s, r) => s + r.points, 0);
  }

  get gradedTasks(): QuizTask[] {
    return this.tasks.filter((t) => t.kind === "interval" || t.kind === "chord");
  }

  get totalScore(): { achieved: number; possible: number } {
    const graded = this.gradedTasks;
    let achieved = graded.filter((t) => t.isCorrect).length;
    let possible = graded.length;

    for (const kind of ["rhythm", "melody"] as Kind[]) {
      const task = this.tasks.find((t) => t.kind === kind);
      if (!task) continue;
      achieved += this.dictationTotal(kind);
      possible += 2 * (kind === "rhythm" ? task.rhythmData.length : DictationEntry.standardBarCount);
    }
    return { achieved, possible };
  }

  // MARK: -

  stopAllAudio(keepPlayingFlag = false): void {
    this.renderlauf += 1;
    this.audio.stopAll();
    this.playbackAbbruch?.();
    this.playbackAbbruch = null;
    this.stopMetronome();
    if (!keepPlayingFlag) this.isPlayingDiktat = false;
  }
}
