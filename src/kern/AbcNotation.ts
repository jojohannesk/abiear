// ABC-Notation. Portierung von `Generation/AbcNotation.swift`.
//
// Die erzeugten ABC-Texte rendert abcjs; Format und Zeilenumbrüche sind
// deshalb zeichengenau übernommen. Balken entstehen durch Leerzeichen —
// wo eines steht, bricht der Balken.

import type { MelodyDictation, MelodyNote, MusicKey, RhythmFigure } from "./MusicData";
import { DictationEntry, NoteValues, type PlacedNote } from "./DictationEntry";
import { notesPerBar } from "./MelodicMove";
import { degreeOfMidi, midiOfDegree } from "./Stufen";

function repeat(s: string, n: number): string {
  return n > 0 ? s.repeat(n) : "";
}

function lowerFirst(s: string): string {
  return s.slice(0, 1).toLowerCase() + s.slice(1);
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** Wo der Balken bricht — zwei Regeln, weil es zwei Lösungsbilder gibt. */
export type BeamRule = "afterFullBeat" | "beforeNewBeat";

/** Einheiten einer Achtel — die Grundeinheit `L:1/8` des Melodiediktats. */
const eighthUnits = DictationEntry.unitsPerBeat / 2;

export const AbcNotation = {
  /** Deutscher Tonname inkl. Oktavlage (Helmholtz): c' ist MIDI 60. */
  midiToNoteName(midi: number): string {
    const namesGer = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "B", "H"];
    const name = namesGer[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12);

    if (octave >= 4) {
      return lowerFirst(name) + repeat("'", octave - 4);
    }
    return name + repeat(",", Math.max(0, 3 - octave));
  },

  /** Deutscher Tonname einer diatonischen Stufe in ihrer Tonart. */
  germanNameOfDegree(degree: number, key: MusicKey): string {
    const index = ((degree % 7) + 7) % 7;
    const letter = key.letters[index];
    let alteration = AbcNotation.signatureAlteration(letter, key.acc);
    if (!key.isMajor && index === 6) alteration += 1;

    const midi = midiOfDegree(degree, key);
    const octave = Math.floor((midi - alteration) / 12);

    let name = letter === "B" ? "H" : letter;
    if (alteration < 0) {
      switch (name) {
        case "H": name = "B"; break;
        case "A": name = "As"; break;
        case "E": name = "Es"; break;
        default: name += "es";
      }
      for (let i = 0; i < -alteration - 1; i++) name += "es";
    } else {
      for (let i = 0; i < alteration; i++) name += "is";
    }

    if (octave >= 4) {
      return lowerFirst(name) + repeat("'", octave - 4);
    }
    return name + repeat(",", Math.max(0, 3 - octave));
  },

  /** Deutscher Tonname eines MIDI-Tons in der gegebenen Tonart. */
  germanNameOfMidi(midi: number, key: MusicKey): string {
    const degree = degreeOfMidi(midi, key);
    if (degree === null) return AbcNotation.midiToNoteName(midi);
    return AbcNotation.germanNameOfDegree(degree, key);
  },

  /** Wie die Tonart einen Stammton vorzeichnet: −1 = B, 0 = ohne, +1 = Kreuz. */
  signatureAlteration(letter: string, acc: number): number {
    const sharps = ["F", "C", "G", "D", "A", "E", "B"];
    const flats = ["B", "E", "A", "D", "G", "C", "F"];
    if (acc > 0) { const i = sharps.indexOf(letter); if (i >= 0 && i < acc) return 1; }
    if (acc < 0) { const i = flats.indexOf(letter); if (i >= 0 && i < -acc) return -1; }
    return 0;
  },

  /** Vorzeichen des erhöhten Leittons in Moll — nicht immer ein Kreuz. */
  raisedSeventhPrefix(key: MusicKey): string {
    switch (AbcNotation.signatureAlteration(key.letters[6], key.acc)) {
      case -1: return "=";
      case 1: return "^^";
      default: return "^";
    }
  },

  /** MIDI-Ton → ABC-Notenname in der gegebenen Tonart. */
  midiToAbcNote(midi: number, key: MusicKey): string {
    const scalePC = key.scale.map((s) => (s + key.root) % 12);
    const pc = midi % 12;
    let letter = "";

    const degreeIdx = scalePC.indexOf(pc);
    if (degreeIdx >= 0) {
      letter = key.letters[degreeIdx];
      if (!key.isMajor && degreeIdx === 6) letter = AbcNotation.raisedSeventhPrefix(key) + letter;
    } else {
      const raised7thPC = (key.root + 11) % 12;
      if (!key.isMajor && pc === raised7thPC) {
        letter = AbcNotation.raisedSeventhPrefix(key) + key.letters[6];
      } else {
        // Verhalten der Vorlage, unverändert: `key.root` ist der absolute
        // MIDI-Grundton, nicht seine Tonklasse. Swift-`%` ist trunkierend —
        // bei negativem Zwischenwert bleibt der Rest negativ, wie hier auch.
        const chromIdx = (pc - key.root + 12) % 12;
        if (chromIdx === 1 || chromIdx === 3 || chromIdx === 6 || chromIdx === 8 || chromIdx === 10) {
          let lookup = key.scale.indexOf((pc - 1 + 12) % 12);
          if (lookup < 0) lookup = 0;
          letter = "^" + key.letters[lookup];
        } else {
          letter = key.letters[0];
        }
      }
    }

    const oct = Math.floor(midi / 12) - 6;
    switch (oct) {
      case 2: return letter.toLowerCase() + "''";
      case 1: return letter.toLowerCase() + "'";
      case 0: return letter.toLowerCase();
      case -1: return letter.toUpperCase();
      case -2: return letter.toUpperCase() + ",";
      case -3: return letter.toUpperCase() + ",,";
      default: return letter;
    }
  },

  /** Erkennt die Dauer eines Triolenachtels (ein Drittel Viertel). */
  isTripletDuration(dur: number): boolean {
    return Math.abs(dur - 1.0 / 3.0) < 0.02;
  },

  /** Notendauer in Vierteln → ABC-Längenangabe bei Grundeinheit L:1/8. */
  durationToAbc(dur: number): string {
    if (Math.abs(dur - 0.25) < 0.01) return "/";
    if (AbcNotation.isTripletDuration(dur)) return "";
    if (Math.abs(dur - 0.5) < 0.01) return "";
    if (Math.abs(dur - 0.75) < 0.01) return "3/2";
    if (Math.abs(dur - 1.0) < 0.01) return "2";
    if (Math.abs(dur - 1.5) < 0.01) return "3";
    if (Math.abs(dur - 2.0) < 0.01) return "4";
    if (Math.abs(dur - 3.0) < 0.01) return "6";
    return "";
  },

  /** Notendauern, die sich als einzelner Notenwert schreiben lassen. */
  notatableDurations: [0.25, 1.0 / 3.0, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0] as readonly number[],

  isNotatable(dur: number): boolean {
    return AbcNotation.notatableDurations.some((d) => Math.abs(d - dur) < 0.02);
  },

  /** Indizes, an denen eine Achteltriole beginnt. */
  tripletStarts(notes: readonly MelodyNote[]): Set<number> {
    const out = new Set<number>();
    let i = 0;
    while (i + 2 < notes.length) {
      if (AbcNotation.isTripletDuration(notes[i].durationBeats)
        && AbcNotation.isTripletDuration(notes[i + 1].durationBeats)
        && AbcNotation.isTripletDuration(notes[i + 2].durationBeats)) {
        out.add(i);
        i += 3;
      } else {
        i += 1;
      }
    }
    return out;
  },

  /** Vollständiges Melodiediktat als ABC-Quelltext. */
  melodyToAbc(melody: MelodyDictation, barsPerLine = 2): string {
    const key = melody.key;
    let abc = `X:1\nM:4/4\nL:1/8\nK: ${key.abcKey}\n`;
    let currentBar = 0;
    const triplets = AbcNotation.tripletStarts(melody.notes);

    melody.notes.forEach((note, i) => {
      const barIdx = Math.floor(note.beatPosition / 4.0);
      if (barIdx !== currentBar) {
        abc += barIdx % barsPerLine === 0 ? " |\n" : " |";
        currentBar = barIdx;
      } else if (i > 0) {
        const prevNote = melody.notes[i - 1];
        if (Math.floor(note.beatPosition) > Math.floor(prevNote.beatPosition)) abc += " ";
      }
      if (triplets.has(i)) abc += "(3";
      abc += AbcNotation.midiToAbcNote(note.midiNumber, key) + AbcNotation.durationToAbc(note.durationBeats);
    });

    abc += " |]";
    return abc;
  },

  /** Notenbild der Rhythmuseingabe des Nutzers. */
  entryToAbc(entry: DictationEntry, barsPerLine = 2): string {
    let abc = "X:1\nM:4/4\nL:1/16\nK:C\nV:1 clef=perc\n";

    for (let bar = 0; bar < entry.barCount; bar++) {
      if (bar > 0) abc += bar % barsPerLine === 0 ? " |\n" : " | ";
      abc += entryBarBody(entry, bar, "afterFullBeat", () => "B", (u) => AbcNotation.lengthToAbc(u));
    }

    abc += "|]";
    return abc;
  },

  /** Notenbild der Melodieeingabe — Byte für Byte wie `melodyToAbc`, sobald vollständig. */
  entryToAbcWithKey(entry: DictationEntry, key: MusicKey, barsPerLine = 2): string {
    let abc = `X:1\nM:4/4\nL:1/8\nK: ${key.abcKey}\n`;

    for (let bar = 0; bar < entry.barCount; bar++) {
      if (bar > 0) abc += bar % barsPerLine === 0 ? " |\n" : " |";
      abc += entryBarBody(entry, bar, "beforeNewBeat",
        (n) => AbcNotation.midiToAbcNote(midiOfDegree(n.degree ?? 0, key), key),
        (u) => AbcNotation.lengthToAbc(u, eighthUnits)).trim();
    }

    abc += " |]";
    return abc;
  },

  /** Notenlänge in ABC-Schreibweise; `per` ist die Grundeinheit in Vierundzwanzigsteln. */
  lengthToAbc(units: number, per: number = DictationEntry.unitsPerBeat / 4): string {
    const teiler = gcd(units, per);
    const zaehler = units / teiler;
    const nenner = per / teiler;
    if (nenner === 1) return zaehler === 1 ? "" : String(zaehler);
    if (zaehler === 1 && nenner === 2) return "/";
    return `${zaehler}/${nenner}`;
  },

  /** Vollständiges Rhythmusdiktat als ABC-Quelltext (Perkussionssystem). */
  rhythmToAbc(data: readonly (readonly RhythmFigure[])[], barsPerLine = 2): string {
    let abc = "X:1\nM:4/4\nL:1/16\nK:C\nV:1 clef=perc\n";

    data.forEach((bar, idx) => {
      if (idx > 0) abc += idx % barsPerLine === 0 ? " |\n" : " | ";
      for (const cell of bar) {
        let cellStr = "";
        if (cell.isTriplet) {
          cellStr = "(3" + repeat("B2", cell.offsets.length);
        } else {
          const offsets = cell.offsets;
          for (let i = 0; i < offsets.length; i++) {
            const dur = i === offsets.length - 1 ? cell.duration - offsets[i] : offsets[i + 1] - offsets[i];
            const units = Math.round(dur * 4);
            cellStr += "B" + (units > 1 ? String(units) : "");
          }
        }
        abc += cellStr + " ";
      }
    });

    abc += "|]";
    return abc;
  },

  // MARK: - Beschreibung (Vorlesen)

  rhythmBeschreibung(data: readonly (readonly RhythmFigure[])[]): string {
    return data.map((takt, index) => {
      const inhalt = takt.length === 0 ? "leer" : takt.map((f) => f.name).join(", ");
      return `Takt ${index + 1}: ${inhalt}`;
    }).join(". ");
  },

  melodyBeschreibung(melody: MelodyDictation): string {
    const takte = notesPerBar(melody);
    const zeilen = takte.map((noten, index) => {
      const inhalt = noten.map((note) =>
        AbcNotation.germanNameOfMidi(note.midiNumber, melody.key) + " " + AbcNotation.dauerNameBeats(note.durationBeats),
      ).join(", ");
      return `Takt ${index + 1}: ${inhalt === "" ? "leer" : inhalt}`;
    });
    return `${melody.key.name}. ` + zeilen.join(". ");
  },

  /** Die eigene Notation — beim Rhythmus ohne Tonnamen, bei der Melodie mit. */
  entryBeschreibung(entry: DictationEntry, key: MusicKey | null): string {
    if (entry.isEmpty) return "Noch nichts notiert";
    const zeilen: string[] = [];
    for (let bar = 0; bar < entry.barCount; bar++) {
      const noten = entry.notesInBar(bar);
      const inhalt = noten.map((note) => {
        const dauer = note.isTripletMember ? "Triolenachtel" : AbcNotation.dauerNameUnits(note.units);
        if (key && note.degree !== null) {
          return AbcNotation.germanNameOfDegree(note.degree, key) + " " + dauer;
        }
        return dauer;
      }).join(", ");
      zeilen.push(`Takt ${bar + 1}: ${inhalt === "" ? "leer" : inhalt}`);
    }
    return zeilen.join(". ");
  },

  dauerNameUnits(units: number): string {
    for (const wert of NoteValues.all) {
      if (NoteValues.units(wert) === units) return NoteValues.title(wert);
      if (NoteValues.units(wert, true) === units) return `punktierte ${NoteValues.title(wert)}`;
    }
    return `${units} Vierundzwanzigstel`;
  },

  dauerNameBeats(beats: number): string {
    const units = Math.round(beats * DictationEntry.unitsPerBeat);
    return units === DictationEntry.tripletUnits ? "Triolenachtel" : AbcNotation.dauerNameUnits(units);
  },
};

/** Notentext eines Taktes der Eingabe, ohne Taktstriche. */
function entryBarBody(entry: DictationEntry, bar: number, beams: BeamRule,
                      noteText: (n: PlacedNote) => string, length: (units: number) => string): string {
  const upb = DictationEntry.unitsPerBeat;
  let abc = "";
  let position = 0;
  let index = 0;
  let letzterTonSchlag: number | null = null;
  const barNotes = entry.notesInBar(bar);

  const trenne = () => {
    if (abc !== "" && !abc.endsWith(" ")) abc += " ";
  };

  const rests = (ende: number) => {
    if (position < ende) trenne();
    while (position < ende) {
      const schlagende = (Math.floor(position / upb) + 1) * upb;
      const bis = Math.min(schlagende, ende);
      abc += "x" + length(bis - position);
      if (bis % upb === 0) trenne();
      position = bis;
    }
  };

  while (index < barNotes.length) {
    const note = barNotes[index];
    const start = note.start - bar * DictationEntry.unitsPerBar;
    rests(start);

    const schlag = Math.floor(start / upb);
    if (beams === "beforeNewBeat" && letzterTonSchlag !== null && schlag > letzterTonSchlag) {
      trenne();
    }
    letzterTonSchlag = schlag;

    if (note.isTripletMember) {
      let count = 0;
      while (index + count < barNotes.length && count < 3) {
        const kandidat = barNotes[index + count];
        const lokal = kandidat.start - bar * DictationEntry.unitsPerBar;
        if (!(kandidat.isTripletMember && Math.floor(lokal / upb) === schlag)) break;
        count += 1;
      }
      abc += "(3";
      for (let k = 0; k < count; k++) abc += noteText(barNotes[index + k]) + length(eighthUnits);
      position += count * DictationEntry.tripletUnits;
      index += count;
    } else {
      abc += noteText(note) + length(note.units);
      position += note.units;
      index += 1;
    }

    if (beams === "afterFullBeat" && position % upb === 0) trenne();
  }

  rests(DictationEntry.unitsPerBar);
  return abc;
}
