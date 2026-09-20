// Baut aus einer Aufgabe den fertigen Klangpuffer. Portierung von
// `Audio/Performance.swift`.
//
// Zeiteinheit ist die Sekunde; eine Zählzeit dauert `beat` Sekunden — bei
// ♩ = 60, dem Prüfungstempo, genau eine. Gedehnt wird nur das Diktat, nicht
// die Kadenz.

import { MusicData, type DictationStep, type MelodyDictation, type MusicKey, type RhythmCell } from "../kern/MusicData";
import { DictationEntry } from "../kern/DictationEntry";
import { midiOfDegree } from "../kern/Stufen";
import type { QuizTask } from "../kern/QuizTask";
import { ScoreBuffer, ToneRenderer } from "./ToneRenderer";
import type { SampleBank } from "./SampleBank";

export interface DiktatPlayback {
  readonly score: ScoreBuffer;
  readonly metronomeStart: number;
  readonly totalDuration: number;
}

const gehoerGap = 1.0;
const gehoerLastRing = 1.4;
const gehoerPause = 0.9;
const gehoerChordDur = 2.6;

/** Verhalten der Vorlage: `floor(position) % 1 == 0` — immer wahr. Unverändert übernommen. */
function isHeavyBeat(position: number): boolean {
  return Math.floor(position) % 1 === 0;
}

function addCountIn(score: ScoreBuffer, start: number, beat: number): number {
  for (let c = 0; c < 4; c++) {
    ToneRenderer.addMetronomeClick(score, start + c * beat, c === 0);
  }
  return start + 4.0 * beat;
}

export const Performance = {
  secondsPerBeat(bpm: number): number {
    return 60.0 / Math.max(1, bpm);
  },

  examBPM: 60,
  slowestBPM: 30,

  polyphonyGain(simultaneousNotes: number): number {
    return simultaneousNotes <= 1 ? 1.0 : 1.0 / simultaneousNotes;
  },

  // MARK: - Kadenz

  addCadence(score: ScoreBuffer, key: MusicKey, startTime: number, bank: SampleBank | null): number {
    const fixedSchema = [1, 4, 5, 1];
    let t = startTime;

    for (let b = 0; b < 4; b++) {
      const deg = fixedSchema[b];
      const intervals: Record<number, number[]> = key.isMajor
        ? { 1: [0, 4, 7], 4: [5, 9, 12], 5: [7, 11, 14] }
        : { 1: [0, 3, 7], 4: [5, 8, 12], 5: [7, 11, 14] };

      const chordMidiArr: number[] = [];
      for (const iv of intervals[deg] ?? []) {
        for (let oct = -1; oct <= 0; oct++) chordMidiArr.push(key.root + iv + 12 * oct);
      }

      const dur = b < 3 ? 0.7 : 0.9;
      const gain = Performance.polyphonyGain(chordMidiArr.length);
      for (const m of chordMidiArr) {
        ToneRenderer.addPianoTone(score, m, t, dur, true, bank, "nonLegato", gain);
      }
      t += b < 3 ? 0.8 : 1.2;
    }
    return t;
  },

  // MARK: - Intervall / Akkord

  gehoerTask(rootNote: number, offsets: readonly number[], bank: SampleBank | null, sampleRate: number): ScoreBuffer {
    const score = new ScoreBuffer(sampleRate);

    offsets.forEach((offset, i) => {
      const isLast = i === offsets.length - 1;
      ToneRenderer.addPianoTone(score, rootNote + offset, i * gehoerGap,
        isLast ? gehoerLastRing : gehoerGap, i === 0, bank, "connected");
    });

    const simStart = (offsets.length - 1) * gehoerGap + gehoerLastRing + gehoerPause;
    const chordGain = Performance.polyphonyGain(offsets.length);
    for (const offset of offsets) {
      ToneRenderer.addPianoTone(score, rootNote + offset, simStart, gehoerChordDur, true, bank, "connected", chordGain);
    }
    return score;
  },

  // MARK: - Lernbeispiel: eine Rhythmuszelle

  zellenBeispiel(cell: RhythmCell, midi: number, bank: SampleBank | null, sampleRate: number, beat = 1.0): ScoreBuffer {
    const score = new ScoreBuffer(sampleRate);
    const now = 0.1;
    const start = addCountIn(score, now, beat);

    for (let runde = 0; runde < 2; runde++) {
      const basis = start + runde * cell.duration * beat;
      cell.offsets.forEach((offset, i) => {
        const dauer = i === cell.offsets.length - 1 ? cell.duration - offset : cell.offsets[i + 1] - offset;
        ToneRenderer.addPianoTone(score, midi, basis + offset * beat, dauer * beat, isHeavyBeat(offset), bank);
      });
    }
    return score;
  },

  // MARK: - Orientierung Melodiediktat

  orientation(key: MusicKey, firstNote: number, bank: SampleBank | null, sampleRate: number): ScoreBuffer {
    const score = new ScoreBuffer(sampleRate);
    const tEnd = Performance.addCadence(score, key, 0.05, bank) + 0.2;
    ToneRenderer.addPianoTone(score, firstNote, tEnd, 1.5, true, bank);
    return score;
  },

  // MARK: - Diktat-Durchgang

  diktatStep(task: QuizTask, step: DictationStep, stepIndex: number,
             bank: SampleBank | null, sampleRate: number, beat = 1.0): DiktatPlayback {
    const score = new ScoreBuffer(sampleRate);
    let now = 0.05;
    let cadenceDuration = 0.0;

    if (task.kind === "melody" && stepIndex === 0 && task.melodyData) {
      const melody = task.melodyData;
      now = Performance.addCadence(score, melody.key, now, bank) + 0.2;
      ToneRenderer.addPianoTone(score, melody.notes[0].midiNumber, now, 2.0, true, bank);
      now += 2.0 + 0.3;
      cadenceDuration = 3.6 + 2.3;
    }

    for (let c = 0; c < 4; c++) {
      ToneRenderer.addMetronomeClick(score, now + c * beat, c === 0);
    }
    const metronomeStart = now;
    const startPlayback = now + 4.0 * beat;
    const activeBars = step.bars;

    if (task.kind === "rhythm") {
      activeBars.forEach((barIdx, pos) => {
        const bStart = startPlayback + pos * 4.0 * beat;
        for (const fig of task.rhythmData[barIdx]) {
          fig.offsets.forEach((off, i) => {
            const dur = i === fig.offsets.length - 1 ? fig.duration - off : fig.offsets[i + 1] - off;
            ToneRenderer.addPianoTone(score, task.playMidi, bStart + (fig.startBeat + off) * beat,
              dur * beat, isHeavyBeat(fig.startBeat + off), bank);
          });
        }
      });
    } else if (task.melodyData) {
      const melody = task.melodyData;
      const activeNotes = melody.notes.filter((n) => activeBars.includes(Math.floor(n.beatPosition / 4.0)))
        .slice().sort((a, b) => a.beatPosition - b.beatPosition);
      const firstBarOffset = activeBars[0] * 4.0;

      for (const note of activeNotes) {
        const noteStartTime = startPlayback + (note.beatPosition - firstBarOffset) * beat;
        ToneRenderer.addPianoTone(score, note.midiNumber, noteStartTime, note.durationBeats * beat,
          isHeavyBeat(note.beatPosition), bank);
      }
    }

    const barDuration = activeBars.length * 4.0 * beat;
    const totalPlaybackDuration = cadenceDuration + 4.0 * beat + barDuration;

    return { score, metronomeStart, totalDuration: totalPlaybackDuration + 0.5 };
  },

  // MARK: - Lösungswiedergabe

  solutionRhythm(task: QuizTask, bank: SampleBank | null, sampleRate: number, beat = 1.0): DiktatPlayback {
    const score = new ScoreBuffer(sampleRate);
    const now = 0.1;
    const startPlayback = addCountIn(score, now, beat);

    task.rhythmData.forEach((bar, barIdx) => {
      const bStart = startPlayback + barIdx * 4.0 * beat;
      for (const fig of bar) {
        fig.offsets.forEach((off, i) => {
          const dur = i === fig.offsets.length - 1 ? fig.duration - off : fig.offsets[i + 1] - off;
          ToneRenderer.addPianoTone(score, task.playMidi, bStart + (fig.startBeat + off) * beat,
            dur * beat, isHeavyBeat(fig.startBeat + off), bank);
        });
      }
    });

    return { score, metronomeStart: now, totalDuration: now + 20.0 * beat };
  },

  solutionMelody(melody: MelodyDictation, bank: SampleBank | null, sampleRate: number, beat = 1.0): DiktatPlayback {
    const score = new ScoreBuffer(sampleRate);
    const now = 0.1;
    const t = Performance.addCadence(score, melody.key, now, bank) + 0.3;
    const startPlayback = addCountIn(score, t, beat);

    for (const note of melody.notes) {
      ToneRenderer.addPianoTone(score, note.midiNumber, startPlayback + note.beatPosition * beat,
        note.durationBeats * beat, isHeavyBeat(note.beatPosition), bank);
    }

    return { score, metronomeStart: t, totalDuration: t + 20.0 * beat };
  },

  // MARK: - Die eigene Notation

  entryPlayback(entry: DictationEntry, key: MusicKey | null, percussionMidi: number,
                bank: SampleBank | null, sampleRate: number, beat = 1.0): DiktatPlayback {
    const score = new ScoreBuffer(sampleRate);
    let now = 0.1;
    if (key) now = Performance.addCadence(score, key, now, bank) + 0.3;
    const metronomeStart = now;
    const startPlayback = addCountIn(score, now, beat);

    const unit = beat / DictationEntry.unitsPerBeat;
    for (const note of entry.notes) {
      const midi = key ? midiOfDegree(note.degree ?? 0, key) : percussionMidi;
      const position = note.start / DictationEntry.unitsPerBeat;
      ToneRenderer.addPianoTone(score, midi, startPlayback + note.start * unit, note.units * unit,
        isHeavyBeat(position), bank);
    }

    return { score, metronomeStart, totalDuration: metronomeStart + 20.0 * beat };
  },

  // MARK: - Audiotest

  audioTest(bank: SampleBank | null, sampleRate: number): ScoreBuffer {
    const score = new ScoreBuffer(sampleRate);
    const midis = [60, 64, 67];
    for (const midi of midis) {
      ToneRenderer.addPianoTone(score, midi, 0, 0.5, true, bank, "nonLegato", Performance.polyphonyGain(midis.length));
    }
    return score;
  },
};

