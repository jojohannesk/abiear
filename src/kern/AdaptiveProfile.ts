// Gewichte des adaptiven Modus. Portierung von `Models/AdaptiveProfile.swift`.
//
// Schlüssel sind durchgehend Klarnamen — dieselben wie in der Statistik.
// Ein leeres Profil bedeutet „keine Vorliebe": jede Abfrage liefert 1.

export interface AdaptiveProfile {
  intervals: Record<string, number>;
  chords: Record<string, number>;
  figures: Record<string, number>;
  moves: Record<string, number>;
  keys: Record<string, number>;
}

export function neutralProfile(): AdaptiveProfile {
  return { intervals: {}, chords: {}, figures: {}, moves: {}, keys: {} };
}

export const NEUTRAL: AdaptiveProfile = Object.freeze(neutralProfile());

function gewicht(table: Record<string, number>, name: string): number {
  const w = table[name];
  return w === undefined ? 1 : w;
}

export const Profile = {
  interval: (p: AdaptiveProfile, name: string) => gewicht(p.intervals, name),
  chord: (p: AdaptiveProfile, name: string) => gewicht(p.chords, name),
  figure: (p: AdaptiveProfile, name: string) => gewicht(p.figures, name),
  move: (p: AdaptiveProfile, title: string) => gewicht(p.moves, title),
  key: (p: AdaptiveProfile, name: string) => gewicht(p.keys, name),
};
