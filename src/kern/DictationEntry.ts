// Was der Nutzer im Diktat notiert — für Rhythmus und Melodie dasselbe
// Modell. Portierung von `Models/DictationEntry.swift`.
//
// Töne tragen ihre Position; gerechnet wird in Vierundzwanzigsteln eines
// Viertels, ganzzahlig — der Nenner trifft Sechzehntel (6), punktierte
// Sechzehntel (9) und Triolenachtel (8). Kein Gleitkomma.
//
// In Swift ist die Eingabe ein Struct mit Wertsemantik; hier eine Klasse,
// die an Ort und Stelle verändert wird. Wer eine Kopie braucht — der Store
// beim Zurücksetzen, eine Prüfung beim Vergleichen — nimmt `clone()`.

/** Die vier Notenwerte des Tastenfelds. */
export type NoteValue = "half" | "quarter" | "eighth" | "sixteenth";

export const NoteValues = {
  all: ["half", "quarter", "eighth", "sixteenth"] as readonly NoteValue[],

  /** Länge in Vierundzwanzigsteln eines Viertels. */
  units(value: NoteValue, dotted = false): number {
    let u: number;
    switch (value) {
      case "half": u = 48; break;
      case "quarter": u = 24; break;
      case "eighth": u = 12; break;
      case "sixteenth": u = 6; break;
    }
    return dotted ? Math.floor(u * 3 / 2) : u;
  },

  title(value: NoteValue): string {
    switch (value) {
      case "half": return "Halbe";
      case "quarter": return "Viertel";
      case "eighth": return "Achtel";
      case "sixteenth": return "Sechzehntel";
    }
  },
};

/** Ein gesetzter Ton, an seiner Stelle im Diktat. */
export interface PlacedNote {
  /** Einheiten ab Diktatbeginn (0 … 383). */
  readonly start: number;
  readonly units: number;
  /** Gehört zu einer Achteltriole. */
  readonly isTripletMember: boolean;
  /** Diatonische Stufe — nur bei der Melodie, sonst `null`. */
  readonly degree: number | null;
}

export function placedNote(start: number, units: number, isTripletMember = false,
                           degree: number | null = null): PlacedNote {
  return { start, units, isTripletMember, degree };
}

/** Erste Einheit nach diesem Ton. */
export function noteEnd(n: PlacedNote): number {
  return n.start + n.units;
}

export function noteOverlaps(n: PlacedNote, from: number, to: number): boolean {
  return n.start < to && noteEnd(n) > from;
}

export class DictationEntry {
  /** Vierundzwanzigstel je Viertel. */
  static readonly unitsPerBeat = 24;
  /** Ein 4/4-Takt. */
  static readonly unitsPerBar = DictationEntry.unitsPerBeat * 4;
  /** Das Prüfungsdiktat hat vier Takte; die S-Bahn-Einheit einen. */
  static readonly standardBarCount = 4;
  /** Ein Ton der Achteltriole: drei davon füllen genau einen Schlag. */
  static readonly tripletUnits = DictationEntry.unitsPerBeat / 3;

  readonly barCount: number;
  /** Aufsteigend nach `start`, ohne Überschneidungen. */
  private _notes: PlacedNote[];
  /** Wo der nächste Ton landet, in Einheiten ab Diktatbeginn. */
  private _cursor: number;

  constructor(notes: readonly PlacedNote[] = [], cursor = 0, barCount = DictationEntry.standardBarCount) {
    this.barCount = Math.max(1, barCount);
    this._notes = [...notes].sort((a, b) => a.start - b.start);
    this._cursor = Math.min(Math.max(0, cursor), DictationEntry.unitsPerBar * this.barCount);
  }

  clone(): DictationEntry {
    return new DictationEntry(this._notes, this._cursor, this.barCount);
  }

  equals(other: DictationEntry): boolean {
    return this.barCount === other.barCount && this._cursor === other._cursor
      && this._notes.length === other._notes.length
      && this._notes.every((n, i) => {
        const o = other._notes[i];
        return n.start === o.start && n.units === o.units && n.isTripletMember === o.isTripletMember && n.degree === o.degree;
      });
  }

  get notes(): readonly PlacedNote[] { return this._notes; }
  get cursor(): number { return this._cursor; }
  get beatCount(): number { return this.barCount * 4; }
  get totalUnits(): number { return DictationEntry.unitsPerBar * this.barCount; }

  // MARK: - Zustand

  get isEmpty(): boolean { return this._notes.length === 0; }
  get filledUnits(): number { return this._notes.reduce((s, n) => s + n.units, 0); }
  /** Lückenlos voll. Da sich Töne nie überschneiden, genügt die Summe. */
  get isComplete(): boolean { return this.filledUnits === this.totalUnits; }

  /** In welchem Takt die Marke steht, oder `null` am Ende. */
  get currentBar(): number | null {
    return this._cursor >= this.totalUnits ? null : Math.floor(this._cursor / DictationEntry.unitsPerBar);
  }

  /** Wie viel im Takt der Marke noch bis zum Taktstrich frei ist. */
  get remainingInBar(): number {
    return DictationEntry.unitsPerBar - (this._cursor % DictationEntry.unitsPerBar);
  }

  /** Schlag, in dem die Marke steht. */
  get currentBeat(): number {
    return Math.min(Math.floor(this._cursor / DictationEntry.unitsPerBeat), this.beatCount - 1);
  }

  /** Steht in diesem Schlag ein Ton? */
  hasNote(beat: number): boolean {
    const von = beat * DictationEntry.unitsPerBeat;
    return this._notes.some((n) => noteOverlaps(n, von, von + DictationEntry.unitsPerBeat));
  }

  /** Ist dieser Schlag lückenlos mit Tönen belegt? */
  fullyCovers(beat: number): boolean {
    const von = beat * DictationEntry.unitsPerBeat;
    const bis = von + DictationEntry.unitsPerBeat;
    let erreicht = von;
    for (const note of this._notes) {
      if (!noteOverlaps(note, von, bis)) continue;
      if (note.start > erreicht) return false;
      erreicht = Math.max(erreicht, noteEnd(note));
      if (erreicht >= bis) return true;
    }
    return erreicht >= bis;
  }

  // MARK: - Marke setzen

  /** Setzt die Marke auf den Anfang eines Schlags. */
  moveCursorToBeat(beat: number): void {
    this._cursor = Math.min(Math.max(0, beat), this.beatCount - 1) * DictationEntry.unitsPerBeat;
  }

  moveCursorTo(units: number): void {
    this._cursor = Math.min(Math.max(0, units), this.totalUnits);
  }

  // MARK: - Setzen

  /** Passt dieser Wert an der Marke noch in den laufenden Takt? */
  fitsUnits(units: number): boolean {
    return this._cursor < this.totalUnits && units <= this.remainingInBar;
  }

  fits(value: NoteValue, dotted: boolean): boolean {
    return this.fitsUnits(NoteValues.units(value, dotted));
  }

  get fitsTriplet(): boolean {
    return this.fitsUnits(DictationEntry.unitsPerBeat);
  }

  /** Setzt einen Ton an der Marke und rückt sie hinter ihn. Setzen überschreibt. */
  place(value: NoteValue, dotted = false, degree: number | null = null): boolean {
    return this.placeUnits(NoteValues.units(value, dotted), degree);
  }

  placeUnits(units: number, degree: number | null = null, isTripletMember = false): boolean {
    if (!this.fitsUnits(units)) return false;
    const start = this._cursor;
    this.removeOverlapping(start, start + units, isTripletMember);
    this.insert(placedNote(start, units, isTripletMember, degree));
    this._cursor = start + units;
    return true;
  }

  /** Setzt einen einzelnen Triolenton — drei davon füllen einen Schlag. */
  placeTripletMember(degree: number | null = null): boolean {
    return this.placeUnits(DictationEntry.tripletUnits, degree, true);
  }

  /** Setzt eine vollständige Achteltriole — drei Töne, zusammen ein Schlag. */
  placeTriplet(degrees: readonly (number | null)[] = [null, null, null]): boolean {
    if (!this.fitsTriplet) return false;
    const start = this._cursor;
    this.removeOverlapping(start, start + DictationEntry.unitsPerBeat);
    for (let i = 0; i < 3; i++) {
      this.insert(placedNote(start + i * DictationEntry.tripletUnits, DictationEntry.tripletUnits, true,
                             i < degrees.length ? degrees[i] : null));
    }
    this._cursor = start + DictationEntry.unitsPerBeat;
    return true;
  }

  // MARK: - Löschen

  /** Der Ton, den die Rücktaste träfe — erst unter der Marke, dann im Schlag, dann der an der Marke endende. */
  get noteAtCursor(): PlacedNote | null {
    const c = this._cursor;
    const schlagende = (Math.floor(c / DictationEntry.unitsPerBeat) + 1) * DictationEntry.unitsPerBeat;
    return this._notes.find((n) => n.start <= c && noteEnd(n) > c)
      ?? this._notes.find((n) => n.start > c && n.start < schlagende)
      ?? [...this._notes].reverse().find((n) => noteEnd(n) === c)
      ?? null;
  }

  get canRemoveAtCursor(): boolean {
    return this.noteAtCursor !== null;
  }

  /** Nimmt den Ton an der Marke zurück — eine Triole immer vollständig. */
  removeAtCursor(): void {
    const note = this.noteAtCursor;
    if (!note) return;
    const anfang = note.isTripletMember
      ? note.start - (note.start % DictationEntry.unitsPerBeat)
      : note.start;
    this.removeOverlapping(note.start, noteEnd(note));
    this._cursor = Math.min(this._cursor, anfang);
  }

  // MARK: - Intern

  private insert(note: PlacedNote): void {
    let index = this._notes.findIndex((n) => n.start > note.start);
    if (index < 0) index = this._notes.length;
    this._notes.splice(index, 0, note);
  }

  /** Entfernt alles, was in `[from, to)` hineinragt; Triolen als ganzer Schlag. */
  private removeOverlapping(from: number, to: number, keepTripletGroup = false): void {
    const tripletBeats = new Set<number>();
    if (!keepTripletGroup) {
      for (const note of this._notes) {
        if (note.isTripletMember && noteOverlaps(note, from, to)) {
          tripletBeats.add(Math.floor(note.start / DictationEntry.unitsPerBeat));
        }
      }
    }
    this._notes = this._notes.filter((note) => {
      if (note.isTripletMember && tripletBeats.has(Math.floor(note.start / DictationEntry.unitsPerBeat))) {
        return false;
      }
      return !noteOverlaps(note, from, to);
    });
  }

  // MARK: - Auswertung

  /** Anschlagspunkte eines Taktes, in Einheiten ab Taktbeginn. */
  onsets(bar: number): number[] {
    const von = bar * DictationEntry.unitsPerBar;
    return this._notes.filter((n) => n.start >= von && n.start < von + DictationEntry.unitsPerBar)
      .map((n) => n.start - von);
  }

  /** Die Töne eines Taktes, in der Reihenfolge des Notenbilds. */
  notesInBar(bar: number): PlacedNote[] {
    const von = bar * DictationEntry.unitsPerBar;
    return this._notes.filter((n) => n.start >= von && n.start < von + DictationEntry.unitsPerBar);
  }
}
