// Katalog und Namen: Zellen, Tonarten, Intervalle, Akkorde, deutsche und
// ABC-Tonnamen je Tonart, Notendauern, Zellvorrat je Niveau.
import { describe, expect, it } from "vitest";
import { MusicData } from "../src/kern/MusicData";
import { AbcNotation } from "../src/kern/AbcNotation";
import { DictationLevels, type DictationLevel } from "../src/kern/DictationLevel";
import { MelodicContours, MelodicMoves } from "../src/kern/MelodicMove";
import { fixture, stabil } from "./fixtures";

interface Katalog {
  rhythm1Beat: unknown[]; rhythm2Beat: unknown[]; keys: unknown[]; intervals: unknown[]; chords: unknown[];
  moveTitles: Record<string, string>; contourTitles: Record<string, string>; figureNames: Record<string, string>;
  noteNames: string[]; germanNames: Record<string, string[]>; abcNotes: Record<string, string[]>;
  durations: Record<string, string>; levelCells: Record<string, string[]>;
}

describe("katalog.json", () => {
  const k = fixture<Katalog>("katalog.json");

  it("Zellen", () => {
    expect(stabil(MusicData.rhythm1Beat)).toBe(stabil(k.rhythm1Beat));
    expect(stabil(MusicData.rhythm2Beat)).toBe(stabil(k.rhythm2Beat));
  });
  it("Tonarten, Intervalle, Akkorde", () => {
    expect(stabil(MusicData.keyCatalog)).toBe(stabil(k.keys));
    expect(stabil(MusicData.intervals)).toBe(stabil(k.intervals));
    expect(stabil(MusicData.chords)).toBe(stabil(k.chords));
  });
  it("Klarnamen der Bewegungen und Konturen", () => {
    expect(Object.fromEntries(MelodicMoves.all.map((m) => [m, MelodicMoves.title(m)]))).toEqual(k.moveTitles);
    expect(Object.fromEntries(MelodicContours.all.map((c) => [c, MelodicContours.title(c)]))).toEqual(k.contourTitles);
  });
  it("Tonnamen 40…90", () => {
    expect(Array.from({ length: 51 }, (_, i) => AbcNotation.midiToNoteName(40 + i))).toEqual(k.noteNames);
  });
  it("deutsche und ABC-Tonnamen je Tonart, 48…84", () => {
    for (const key of MusicData.keyCatalog) {
      const midis = Array.from({ length: 37 }, (_, i) => 48 + i);
      expect(midis.map((m) => AbcNotation.germanNameOfMidi(m, key)), key.name).toEqual(k.germanNames[key.name]);
      expect(midis.map((m) => AbcNotation.midiToAbcNote(m, key)), key.name).toEqual(k.abcNotes[key.name]);
    }
  });
  it("Notendauern", () => {
    for (const [d, abc] of Object.entries(k.durations)) {
      expect(AbcNotation.durationToAbc(Number(d)), d).toBe(abc);
    }
  });
  it("Zellvorrat je Niveau", () => {
    for (const level of DictationLevels.all as DictationLevel[]) {
      const ids = [...DictationLevels.rhythmCells1Beat(level), ...DictationLevels.rhythmCells2Beat(level)].map((c) => c.id);
      expect(ids, level).toEqual(k.levelCells[level]);
    }
  });
});
