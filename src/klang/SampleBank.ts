// Die Klaviersamples. Portierung von `Audio/SampleBank.swift`.
//
// Dieselben 14 Salamander-Samples wie im iOS-Bundle, in kleinen Terzen —
// der Transpositionsabstand liegt bei höchstens 1,5 Halbtönen. Dekodiert
// wird über `decodeAudioData` des Browsers; **der MP3-Decoder ist nicht der
// von AVFoundation**, der Sample-Pfad ist deshalb nicht bitgleich zur
// iOS-App (Anschlagszeiten und Hüllkurve sind es).

/** Ein dekodiertes Klaviersample. */
export interface PianoSample {
  readonly midi: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
}

export interface Dekodiert {
  readonly sampleRate: number;
  readonly channels: readonly Float32Array[];
}

/** Liest und dekodiert eine Datei — im Browser über den AudioContext. */
export type Dekodierer = (name: string) => Promise<Dekodiert | null>;

export class SampleBank {
  /** MIDI-Nummer → Dateiname (ohne Endung). C4 = MIDI 60. */
  static readonly sampleMap: ReadonlyMap<number, string> = new Map([
    [45, "A2"],
    [48, "C3"], [51, "Ds3"], [54, "Fs3"], [57, "A3"],
    [60, "C4"], [63, "Ds4"], [66, "Fs4"], [69, "A4"],
    [72, "C5"], [75, "Ds5"], [78, "Fs5"], [81, "A5"],
    [84, "C6"],
  ]);

  static readonly maxSeconds = 5.0;
  static readonly fadeSeconds = 0.1;

  private readonly sortedKeys: number[];

  private constructor(private readonly samples: Map<number, PianoSample>) {
    this.sortedKeys = [...samples.keys()].sort((a, b) => a - b);
  }

  get isEmpty(): boolean { return this.samples.size === 0; }
  get loadedCount(): number { return this.samples.size; }

  static async load(dekodierer: Dekodierer, targetSampleRate: number): Promise<SampleBank> {
    const samples = new Map<number, PianoSample>();
    for (const [midi, name] of SampleBank.sampleMap) {
      const dekodiert = await dekodierer(name);
      if (!dekodiert) continue;
      const sample = SampleBank.aufbereiten(dekodiert, midi, targetSampleRate);
      if (sample) samples.set(midi, sample);
    }
    return new SampleBank(samples);
  }

  static leer(): SampleBank {
    return new SampleBank(new Map());
  }

  /** Kürzt auf `maxSeconds` und blendet nur dann aus, wenn tatsächlich gekürzt wurde. */
  static aufbereiten(d: Dekodiert, midi: number, targetSampleRate: number): PianoSample | null {
    if (d.channels.length === 0 || d.channels[0].length === 0) return null;
    const voll = d.channels[0].length;
    const count = Math.min(voll, Math.trunc(SampleBank.maxSeconds * targetSampleRate));
    const left = new Float32Array(d.channels[0].subarray(0, count));
    const right = d.channels.length > 1 ? new Float32Array(d.channels[1].subarray(0, count)) : new Float32Array(left);

    if (count < voll) {
      const fade = Math.min(count, Math.trunc(SampleBank.fadeSeconds * targetSampleRate));
      for (let i = 0; i < fade; i++) {
        const g = (fade - i) / fade;
        left[count - fade + i] *= g;
        right[count - fade + i] *= g;
      }
    }
    return { midi, left, right };
  }

  closestSample(midi: number): PianoSample | null {
    if (this.samples.size === 0) return null;
    let best: PianoSample | null = null;
    let minDiff = Infinity;
    for (const key of this.sortedKeys) {
      const diff = Math.abs(midi - key);
      if (diff < minDiff) {
        minDiff = diff;
        best = this.samples.get(key) ?? null;
      }
    }
    return best;
  }
}
