// Wiedergabe. Portierung von `Audio/AudioEngine.swift` auf Web Audio.
//
// Dieselbe Architektur wie in Swift: der Puffer kommt fertig gerechnet an
// und wird als ein Stück abgespielt (`AudioBufferSourceNode`). Das optische
// Metronom rechnet aus `ctx.currentTime − Start`, wie `currentPlaybackTime`
// aus `playerTime`.
//
// **Tonausgabe braucht eine erste Berührung.** Browser starten einen
// `AudioContext` nur in einer Nutzeraktion; `activate()` wird deshalb aus
// dem ersten Tippen heraus aufgerufen (Kachel, Start) — still, ohne eigenen
// Freischalten-Knopf.
//
// **Unterbrechungen.** iOS-Safari setzt den Kontext bei Anruf oder Siri auf
// `interrupted`, andere Browser auf `suspended`; ein Tab im Hintergrund kann
// die Uhr anhalten. Jede dieser Meldungen löst dasselbe aus wie
// `interrupted.send()` in Swift: Wiedergabe stoppen, Anzeige zurücksetzen,
// nie mitten im Takt weiter.

import { SampleBank, type Dekodierer } from "./SampleBank";
import type { ScoreBuffer } from "./ToneRenderer";

/** Was der Store vom Klang braucht — im Test eine stumme Ausgabe. */
export interface Klangausgabe {
  readonly sampleRate: number;
  readonly bank: SampleBank | null;
  readonly samplesLoaded: boolean;
  readonly isLoadingSamples: boolean;
  /** Warum die Ausgabe nicht läuft — `null`, solange alles in Ordnung ist. */
  readonly startFehler: string | null;
  activate(): void;
  loadSamples(): Promise<void>;
  /** `false`, wenn nichts erklingen kann — der Aufrufer darf dann nichts weiterschalten. */
  play(score: ScoreBuffer): boolean;
  stopAll(): void;
  /** Verstrichene Zeit seit Beginn der laufenden Wiedergabe, in Sekunden. */
  currentPlaybackTime(): number | null;
  /** Meldet, dass eine laufende Wiedergabe von außen abgebrochen wurde. */
  onInterrupted(handler: () => void): () => void;
}

/** Ausgabe ohne Ton — für die Prüfungen und wenn kein AudioContext existiert. */
export class StummeAusgabe implements Klangausgabe {
  readonly sampleRate = 44100;
  bank: SampleBank | null = null;
  samplesLoaded = false;
  isLoadingSamples = false;
  startFehler: string | null = null;
  /** Was abgespielt wurde — die Prüfungen sehen hinein. */
  readonly gespielt: ScoreBuffer[] = [];
  /** Ob `play` gelingt. */
  spieltAb = true;
  private handlers = new Set<() => void>();

  activate(): void {}
  async loadSamples(): Promise<void> { this.samplesLoaded = true; }
  play(score: ScoreBuffer): boolean {
    if (!this.spieltAb) return false;
    this.gespielt.push(score);
    return true;
  }
  stopAll(): void {}
  currentPlaybackTime(): number | null { return null; }
  onInterrupted(handler: () => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  /** Löst eine Unterbrechung aus, wie es das System täte. */
  unterbrechen(): void { for (const h of this.handlers) h(); }
}

type ContextKonstruktor = new (options?: AudioContextOptions) => AudioContext;

function contextKonstruktor(): ContextKonstruktor | null {
  const w = globalThis as unknown as { AudioContext?: ContextKonstruktor; webkitAudioContext?: ContextKonstruktor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class AudioEngine implements Klangausgabe {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private playing = false;

  bank: SampleBank | null = null;
  samplesLoaded = false;
  isLoadingSamples = false;
  startFehler: string | null = null;

  private handlers = new Set<() => void>();
  private ladevorgang: Promise<void> | null = null;

  /** Woher die Samples kommen — relativ zur Seite, siehe `public/piano/`. */
  constructor(private readonly sampleUrl: (name: string) => string) {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && this.playing) this.handleInterruption();
      });
    }
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 44100;
  }

  /** Kontext anlegen und aufwecken. Mehrfach aufrufbar — auch nach einer Unterbrechung. */
  activate(): void {
    if (!this.ctx) {
      const Ctor = contextKonstruktor();
      if (!Ctor) {
        this.startFehler = "Dieser Browser kann keinen Ton ausgeben (kein AudioContext).";
        return;
      }
      try {
        this.ctx = new Ctor({ latencyHint: "interactive" });
      } catch (e) {
        this.startFehler = `Tonausgabe konnte nicht gestartet werden: ${(e as Error).message}`;
        return;
      }
      this.ctx.addEventListener("statechange", () => {
        const state = this.ctx?.state as string | undefined;
        if ((state === "interrupted" || state === "suspended") && this.playing) this.handleInterruption();
      });
    }
    if (this.ctx.state !== "running") {
      void this.ctx.resume().then(() => { this.startFehler = null; }).catch((e: Error) => {
        this.startFehler = `Tonausgabe konnte nicht gestartet werden: ${e.message}`;
      });
    } else {
      this.startFehler = null;
    }
  }

  private handleInterruption(): void {
    this.stopAll();
    for (const h of this.handlers) h();
  }

  /** Dekodiert die Samples im Hintergrund. Einmal; weitere Aufrufe warten auf denselben Vorgang. */
  loadSamples(): Promise<void> {
    if (this.samplesLoaded) return Promise.resolve();
    if (this.ladevorgang) return this.ladevorgang;
    this.activate();
    this.isLoadingSamples = true;

    const ctx = this.ctx;
    const dekodierer: Dekodierer = async (name) => {
      if (!ctx) return null;
      try {
        const antwort = await fetch(this.sampleUrl(name));
        if (!antwort.ok) return null;
        const daten = await antwort.arrayBuffer();
        const puffer = await ctx.decodeAudioData(daten);
        const channels: Float32Array[] = [];
        for (let c = 0; c < puffer.numberOfChannels; c++) channels.push(puffer.getChannelData(c));
        return { sampleRate: puffer.sampleRate, channels };
      } catch {
        return null;
      }
    };

    this.ladevorgang = SampleBank.load(dekodierer, this.sampleRate).then((bank) => {
      this.bank = bank.isEmpty ? null : bank;
      this.samplesLoaded = true;
      this.isLoadingSamples = false;
    });
    return this.ladevorgang;
  }

  play(score: ScoreBuffer): boolean {
    this.activate();
    const ctx = this.ctx;
    if (!ctx || score.frameCount <= 0) return false;
    if (ctx.state !== "running") {
      // Der Kontext wacht asynchron auf; ohne Nutzeraktion bleibt er stumm.
      // Lieber ehrlich `false` als ein Durchgang, den niemand hört.
      return false;
    }

    const buffer = ctx.createBuffer(2, score.frameCount, score.sampleRate);
    buffer.copyToChannel(new Float32Array(score.left), 0);
    buffer.copyToChannel(new Float32Array(score.right), 1);

    this.stopSource();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => { if (this.source === source) { this.playing = false; this.source = null; } };
    source.start();
    this.source = source;
    this.startedAt = ctx.currentTime;
    this.playing = true;
    return true;
  }

  private stopSource(): void {
    if (this.source) {
      try { this.source.onended = null; this.source.stop(); } catch { /* schon zu Ende */ }
      this.source.disconnect();
      this.source = null;
    }
    this.playing = false;
  }

  stopAll(): void {
    this.stopSource();
  }

  currentPlaybackTime(): number | null {
    if (!this.playing || !this.ctx) return null;
    return this.ctx.currentTime - this.startedAt;
  }

  onInterrupted(handler: () => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
