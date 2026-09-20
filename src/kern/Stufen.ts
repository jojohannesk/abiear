// Umrechnung Stufe ↔ MIDI. Aus `MelodyGenerator.swift` herausgelöst, damit
// `MelodicMove` und der Generator sie teilen, ohne sich gegenseitig zu laden.

import type { MusicKey } from "./MusicData";

export function mod7(d: number): number {
  return ((d % 7) + 7) % 7;
}

export function mod12(a: number): number {
  return ((a % 12) + 12) % 12;
}

/** MIDI-Nummer zu einer diatonischen Stufe (0 = Grundton in `key.root`). */
export function midiOfDegree(degree: number, key: MusicKey): number {
  const octave = Math.floor(degree / 7);
  const idx = degree - octave * 7;
  return key.root + key.scale[idx] + 12 * octave;
}

/** Umkehrung von `midiOfDegree`. `null` für leiterfremde Töne. */
export function degreeOfMidi(m: number, key: MusicKey): number | null {
  const offset = m - key.root;
  const octave = Math.floor(offset / 12);
  const index = key.scale.indexOf(offset - octave * 12);
  return index < 0 ? null : octave * 7 + index;
}
