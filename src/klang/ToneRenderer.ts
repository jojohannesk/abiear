// Klangerzeugung. Portierung von `Audio/ToneRenderer.swift`.
//
// Jede Wiedergabe steht zum Zeitpunkt des Tastendrucks vollständig fest und
// wird deshalb *offline* in einen Puffer gerechnet, der dann als ein Stück
// erklingt — samplegenaues Timing, unabhängig von Timern und Tab-Drosselung.
// Das ist der Swift-Weg, nicht der der alten HTML-Vorlage mit Web-Audio-
// Knoten je Ton.
//
// Gerechnet wird in `Float32Array`, wie Swift in `Float`: die
// Synthese-Fixtures aus dem Goldmaster werden mit Toleranz verglichen.

import type { SampleBank } from "./SampleBank";

/** Stereo-Mischpuffer, in den alle Töne einer Wiedergabe gerechnet werden. */
export class ScoreBuffer {
  private _left = new Float32Array(0);
  private _right = new Float32Array(0);
  private _length = 0;

  constructor(readonly sampleRate: number) {}

  get frameCount(): number { return this._length; }
  /** Sicht auf die gültigen Frames — keine Kopie. */
  get left(): Float32Array { return this._left.subarray(0, this._length); }
  get right(): Float32Array { return this._right.subarray(0, this._length); }

  ensureLength(n: number): void {
    if (n <= this._length) return;
    if (n > this._left.length) {
      const capacity = Math.max(n, Math.floor(this._left.length * 1.5), 4096);
      const l = new Float32Array(capacity); l.set(this._left);
      const r = new Float32Array(capacity); r.set(this._right);
      this._left = l; this._right = r;
    }
    this._length = n;
  }

  mix(l: number, r: number, index: number): void {
    this._left[index] += l;
    this._right[index] += r;
  }

  /** Begrenzt auf [-1, 1] — nur noch als Sicherheitsnetz. */
  clamp(): void {
    const l = this._left, r = this._right;
    for (let i = 0; i < this._length; i++) {
      l[i] = Math.min(1, Math.max(-1, l[i]));
      r[i] = Math.min(1, Math.max(-1, r[i]));
    }
  }
}

// MARK: - Hüllkurven (Web-Audio-Semantik)

function linearRamp(t: number, t0: number, v0: number, t1: number, v1: number): number {
  if (t <= t0) return v0;
  if (t >= t1) return v1;
  return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
}

function expRamp(t: number, t0: number, v0: number, t1: number, v1: number): number {
  if (t <= t0) return v0;
  if (t >= t1) return v1;
  return v0 * Math.pow(v1 / v0, (t - t0) / (t1 - t0));
}

/** Gemeinsame Anschlagshüllkurve: Anstieg, Halten, 40 ms Ausblendung. */
function attackHoldRelease(t: number, attack: number, peak: number, microDur: number): number {
  if (t < attack) return linearRamp(t, 0, 0, attack, peak);
  const releaseStart = microDur - 0.04;
  if (t < releaseStart) return peak;
  return linearRamp(t, releaseStart, peak, microDur, 0);
}

/** Float32-Rundung, damit Zwischenwerte wie in Swift `Float` bleiben. */
const f32 = Math.fround;

/**
 * `nonLegato` trennt die Töne hörbar — richtig fürs Diktat. `connected`
 * lässt die Hüllkurve genau am nächsten Anschlag auslaufen — für Intervalle
 * und Akkorde.
 */
export type Articulation = "nonLegato" | "connected";

function shortening(a: Articulation): number {
  return a === "nonLegato" ? 0.02 : 0.0;
}

const HARMONICS: readonly { m: number; w: number }[] = [
  { m: 1.0, w: 0.55 }, { m: 2.0, w: 0.28 }, { m: 3.0, w: 0.16 }, { m: 4.0, w: 0.09 }, { m: 5.0, w: 0.04 },
];
const DETUNES: readonly number[] = [-3.5, 0, 3.5];

export const ToneRenderer = {
  midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  /** Klavierton: nächstgelegenes Sample per Resampling transponiert, sonst Synthese. */
  addPianoTone(score: ScoreBuffer, midi: number, startTime: number, duration: number,
               isHeavyBeat: boolean, bank: SampleBank | null,
               articulation: Articulation = "nonLegato", gain = 1.0): void {
    const microDur = Math.max(0.05, duration * (1.0 - shortening(articulation)));

    const sample = bank?.closestSample(midi) ?? null;
    if (!sample) {
      ToneRenderer.addSynthPianoTone(score, midi, startTime, duration, isHeavyBeat, articulation, gain);
      return;
    }

    const sr = score.sampleRate;
    const attack = isHeavyBeat ? 0.003 : 0.006;
    const playbackRate = Math.pow(2.0, (midi - sample.midi) / 12.0);

    const startFrame = Math.trunc(startTime * sr);
    const frames = Math.trunc(microDur * sr);
    score.ensureLength(startFrame + frames + 1);

    const srcL = sample.left, srcR = sample.right;
    const srcCount = srcL.length;

    for (let i = 0; i < frames; i++) {
      const t = i / sr;
      const env = f32(attackHoldRelease(t, attack, 0.5 * gain, microDur));

      const srcPos = i * playbackRate;
      const i0 = Math.trunc(srcPos);
      if (i0 + 1 >= srcCount) break;
      const frac = f32(srcPos - i0);

      const l = f32(srcL[i0] + f32(f32(srcL[i0 + 1] - srcL[i0]) * frac));
      const r = f32(srcR[i0] + f32(f32(srcR[i0 + 1] - srcR[i0]) * frac));

      score.mix(f32(l * env), f32(r * env), startFrame + i);
    }
  },

  /** Additive Synthese — Fallback ohne Samples: Hammerimpuls plus fünf Teiltöne in drei verstimmten Stimmen. */
  addSynthPianoTone(score: ScoreBuffer, midi: number, startTime: number, duration: number,
                    isHeavyBeat: boolean, articulation: Articulation = "nonLegato", gain = 1.0): void {
    const sr = score.sampleRate;
    const freq = ToneRenderer.midiToFrequency(midi);
    const microDur = Math.max(0.05, duration * (1.0 - shortening(articulation)));
    const attack = isHeavyBeat ? 0.003 : 0.006;

    const startFrame = Math.trunc(startTime * sr);
    const frames = Math.trunc(microDur * sr);
    score.ensureLength(startFrame + frames + 1);

    const partialOmegas: number[] = [];
    const partialWeights: number[] = [];
    for (const detune of DETUNES) {
      const detuneFactor = Math.pow(2.0, detune / 1200.0);
      for (const h of HARMONICS) {
        partialOmegas.push(2 * Math.PI * freq * h.m * detuneFactor);
        partialWeights.push(h.w);
      }
    }
    const hammerOmega = 2 * Math.PI * freq * 5.7;

    for (let i = 0; i < frames; i++) {
      const t = i / sr;
      const master = attackHoldRelease(t, attack, 0.35 * gain, microDur);

      let sum = 0.0;
      if (t < 0.03) {
        const hammerEnv = expRamp(t, 0, 0.15, 0.025, 0.001);
        sum += hammerEnv * Math.sin(hammerOmega * t);
      }
      for (let p = 0; p < partialOmegas.length; p++) {
        sum += partialWeights[p] * Math.sin(partialOmegas[p] * t);
      }

      const v = f32(sum * master);
      score.mix(v, v, startFrame + i);
    }
  },

  /** Metronomklick: 850 Hz auf der Eins, sonst 550 Hz, 50 ms. */
  addMetronomeClick(score: ScoreBuffer, startTime: number, isDownbeat: boolean): void {
    const sr = score.sampleRate;
    const freq = isDownbeat ? 850.0 : 550.0;
    const total = 0.05;

    const startFrame = Math.trunc(startTime * sr);
    const frames = Math.trunc(total * sr);
    score.ensureLength(startFrame + frames + 1);

    const omega = 2 * Math.PI * freq;
    for (let i = 0; i < frames; i++) {
      const t = i / sr;
      const env = expRamp(t, 0, 0.15, 0.04, 0.001);
      const v = f32(env * Math.sin(omega * t));
      score.mix(v, v, startFrame + i);
    }
  },
};
