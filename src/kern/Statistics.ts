// Lokale Aufzeichnung der Übungsergebnisse. Portierung von
// `Models/Statistics.swift`.
//
// Eine Zeile je Einzelaufgabe bzw. je Takt, nicht je Lauf. Alles bleibt auf
// dem Gerät. Die Datei behält **exakt das Schema der iOS-App**: sortierte
// Schlüssel, ISO-8601 auf die Sekunde, Großbuchstaben-UUIDs, weggelassene
// Optionale — damit ein späterer Austausch zwischen Geräten eine Datei ist
// und kein Konverter. `statistics.json` aus dem Goldmaster muss sich Byte
// für Byte wieder herausschreiben lassen.
//
// Wo die Datei liegt, sagt eine `Ablage` (Browser-Speicher, Capacitor-
// Dateisystem, im Test ein Objekt) — der Speicher selbst kennt nur Text.

export const STATISTICS_FILE = "statistics.json";
export const CORRUPT_FILE = "statistics-beschaedigt.json";

/** Textablage für die Statistikdatei. Eine fehlende Datei ist `null`. */
export interface Ablage {
  lesen(name: string): Promise<string | null>;
  schreiben(name: string, inhalt: string): Promise<void>;
  loeschen(name: string): Promise<void>;
}

/** Ablage im Arbeitsspeicher — für Prüfungen und als Notbehelf. */
export class SpeicherAblage implements Ablage {
  readonly dateien = new Map<string, string>();
  async lesen(name: string) { return this.dateien.get(name) ?? null; }
  async schreiben(name: string, inhalt: string) { this.dateien.set(name, inhalt); }
  async loeschen(name: string) { this.dateien.delete(name); }
}

/** Schneidet Sekundenbruchteile ab — die Datei ist sekundengenau. */
export function toWholeSeconds(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

/** UUID in der Schreibweise von Foundation: Großbuchstaben. */
export function neueUUID(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID().toUpperCase();
  // Notbehelf ohne Web Crypto (sehr alte Browser)
  const hex = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += "-";
    else if (i === 14) s += "4";
    else if (i === 19) s += hex[8 + Math.floor(Math.random() * 4)];
    else s += hex[Math.floor(Math.random() * 16)];
  }
  return s;
}

/** ISO-8601 ohne Sekundenbruchteile, wie `JSONEncoder.dateEncodingStrategy = .iso8601`. */
export function isoSekunden(date: Date): string {
  return toWholeSeconds(date).toISOString().replace(".000Z", "Z");
}

export const DEFAULT_PROFILE = "default";

/** Eine beantwortete Intervall- oder Akkordaufgabe. */
export interface AnswerRecord {
  readonly id: string;
  readonly profile: string;
  readonly sessionId: string;
  readonly date: Date;
  /** `Kind` — "interval" oder "chord". */
  readonly kind: string;
  readonly solution: string;
  readonly answer: string;
  readonly correct: boolean;
  readonly rootNote: number;
}

export function answerRecord(f: {
  id?: string; profile?: string; sessionId: string; date?: Date; kind: string;
  solution: string; answer: string; correct: boolean; rootNote: number;
}): AnswerRecord {
  return {
    id: f.id ?? neueUUID(),
    profile: f.profile ?? DEFAULT_PROFILE,
    sessionId: f.sessionId,
    date: toWholeSeconds(f.date ?? new Date()),
    kind: f.kind,
    solution: f.solution,
    answer: f.answer,
    correct: f.correct,
    rootNote: f.rootNote,
  };
}

/** Ein bewerteter Diktattakt. Nicht bewertete Takte werden nicht aufgezeichnet. */
export interface BarRecord {
  readonly id: string;
  readonly profile: string;
  readonly sessionId: string;
  readonly date: Date;
  readonly kind: string;
  readonly bar: number;
  readonly points: number;
  readonly figures: readonly string[];
  readonly moves: readonly string[];
  readonly contour: string | null;
  readonly key: string | null;
  readonly wrongItems: readonly string[] | null;
  readonly level: string | null;
}

export function barRecord(f: {
  id?: string; profile?: string; sessionId: string; date?: Date; kind: string; bar: number; points: number;
  figures?: readonly string[]; moves?: readonly string[]; contour?: string | null; key?: string | null;
  level?: string | null; wrongItems?: readonly string[] | null;
}): BarRecord {
  return {
    id: f.id ?? neueUUID(),
    profile: f.profile ?? DEFAULT_PROFILE,
    sessionId: f.sessionId,
    date: toWholeSeconds(f.date ?? new Date()),
    kind: f.kind,
    bar: f.bar,
    points: f.points,
    figures: f.figures ?? [],
    moves: f.moves ?? [],
    contour: f.contour ?? null,
    key: f.key ?? null,
    level: f.level ?? null,
    wrongItems: f.wrongItems ?? null,
  };
}

export interface StatisticsFile {
  formatVersion: number;
  answers: AnswerRecord[];
  bars: BarRecord[];
}

export const CURRENT_VERSION = 1;

export function leereDatei(): StatisticsFile {
  return { formatVersion: CURRENT_VERSION, answers: [], bars: [] };
}

// MARK: - Codierung

function sortiert(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}

function answerJSON(a: AnswerRecord): Record<string, unknown> {
  return sortiert({
    id: a.id, profile: a.profile, sessionId: a.sessionId, date: isoSekunden(a.date), kind: a.kind,
    solution: a.solution, answer: a.answer, correct: a.correct, rootNote: a.rootNote,
  });
}

function barJSON(b: BarRecord): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: b.id, profile: b.profile, sessionId: b.sessionId, date: isoSekunden(b.date), kind: b.kind,
    bar: b.bar, points: b.points, figures: b.figures, moves: b.moves,
  };
  if (b.contour !== null) o.contour = b.contour;
  if (b.key !== null) o.key = b.key;
  if (b.wrongItems !== null) o.wrongItems = b.wrongItems;
  if (b.level !== null) o.level = b.level;
  return sortiert(o);
}

/** Schreibt die Datei genau so, wie es der Swift-Encoder tut (sortierte Schlüssel, kompakt). */
export function encodeStatistics(file: StatisticsFile): string {
  return JSON.stringify(sortiert({
    formatVersion: file.formatVersion,
    answers: file.answers.map(answerJSON),
    bars: file.bars.map(barJSON),
  }));
}

class DecodeError extends Error {}

function str(o: Record<string, unknown>, k: string): string {
  const v = o[k];
  if (typeof v !== "string") throw new DecodeError(`Feld ${k} fehlt`);
  return v;
}
function num(o: Record<string, unknown>, k: string): number {
  const v = o[k];
  if (typeof v !== "number") throw new DecodeError(`Feld ${k} fehlt`);
  return v;
}
function datum(o: Record<string, unknown>, k: string): Date {
  const d = new Date(str(o, k));
  if (Number.isNaN(d.getTime())) throw new DecodeError(`Datum ${k} unlesbar`);
  return d;
}
function optStr(o: Record<string, unknown>, k: string): string | null {
  const v = o[k];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new DecodeError(`Feld ${k} falsch`);
  return v;
}
function strListe(o: Record<string, unknown>, k: string): string[] | null {
  const v = o[k];
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) throw new DecodeError(`Feld ${k} falsch`);
  return v as string[];
}

/** Liest die Datei; wirft bei Unlesbarem. Fehlende Felder späterer Fassungen bekommen Vorgaben wie in Swift. */
export function decodeStatistics(text: string): StatisticsFile {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (typeof raw !== "object" || raw === null) throw new DecodeError("kein Objekt");
  const formatVersion = num(raw, "formatVersion");
  const answers = (raw.answers as unknown[] | undefined) ?? [];
  const bars = (raw.bars as unknown[] | undefined) ?? [];
  if (!Array.isArray(answers) || !Array.isArray(bars)) throw new DecodeError("Listen fehlen");

  return {
    formatVersion,
    answers: answers.map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: str(o, "id"),
        profile: optStr(o, "profile") ?? DEFAULT_PROFILE,
        sessionId: str(o, "sessionId"),
        date: datum(o, "date"),
        kind: str(o, "kind"),
        solution: str(o, "solution"),
        answer: str(o, "answer"),
        correct: (() => { const v = o.correct; if (typeof v !== "boolean") throw new DecodeError("correct"); return v; })(),
        rootNote: typeof o.rootNote === "number" ? o.rootNote : 0,
      };
    }),
    bars: bars.map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: str(o, "id"),
        profile: str(o, "profile"),
        sessionId: str(o, "sessionId"),
        date: datum(o, "date"),
        kind: str(o, "kind"),
        bar: num(o, "bar"),
        points: num(o, "points"),
        figures: strListe(o, "figures") ?? [],
        moves: strListe(o, "moves") ?? [],
        contour: optStr(o, "contour"),
        key: optStr(o, "key"),
        level: optStr(o, "level"),
        wrongItems: strListe(o, "wrongItems"),
      };
    }),
  };
}

// MARK: - Speicher

/**
 * Hält die Aufzeichnungen im Speicher und schreibt sie entprellt als JSON.
 * Fehler brechen nie den Übungsablauf; sie landen in `lastError`.
 */
export class StatisticsStore {
  /** Wartezeit, bis nach der letzten Änderung geschrieben wird. */
  static readonly saveDelayMs = 2000;

  private file: StatisticsFile = leereDatei();
  lastError: string | null = null;
  /** Gesetzt, wenn die Datei aus einer neueren Fassung stammt — dann wird nichts geschrieben. */
  isReadOnly = false;
  /** Zählt Änderungen, damit eine Oberfläche neu lesen kann. */
  revision = 0;

  private pendingSave: ReturnType<typeof setTimeout> | null = null;
  private schreibvorgang: Promise<void> = Promise.resolve();

  constructor(readonly ablage: Ablage) {}

  get answers(): readonly AnswerRecord[] { return this.file.answers; }
  get bars(): readonly BarRecord[] { return this.file.bars; }
  get isEmpty(): boolean { return this.file.answers.length === 0 && this.file.bars.length === 0; }
  get formatVersion(): number { return this.file.formatVersion; }

  /** Lädt die Datei: fehlend ist kein Fehler, unlesbar wird beiseitegelegt. */
  async load(): Promise<void> {
    this.lastError = null;
    this.isReadOnly = false;

    const text = await this.ablage.lesen(STATISTICS_FILE);
    if (text === null) {
      this.file = leereDatei();
      this.revision++;
      return;
    }

    try {
      const decoded = decodeStatistics(text);
      if (decoded.formatVersion > CURRENT_VERSION) {
        this.file = leereDatei();
        this.isReadOnly = true;
        this.lastError = "Die Statistikdatei stammt aus einer neueren Version der App "
          + `(Format ${decoded.formatVersion}). Sie wird nicht verändert.`;
        this.revision++;
        return;
      }
      this.file = decoded;
    } catch {
      this.file = leereDatei();
      try {
        await this.ablage.schreiben(CORRUPT_FILE, text);
        await this.ablage.loeschen(STATISTICS_FILE);
        this.lastError = "Die Statistikdatei war unlesbar und wurde als "
          + "statistics-beschaedigt.json beiseitegelegt.";
      } catch {
        this.isReadOnly = true;
        this.lastError = "Die Statistikdatei ist unlesbar und konnte nicht "
          + "beiseitegelegt werden. Es wird nichts gespeichert.";
      }
    }
    this.revision++;
  }

  /** Fügt eine beantwortete Aufgabe hinzu. */
  record(record: AnswerRecord): void {
    this.file.answers.push(record);
    this.revision++;
    this.scheduleSave();
  }

  /** Legt die Bewertung eines Taktes ab oder ersetzt sie — Schlüssel (sessionId, kind, bar). */
  upsertBar(record: BarRecord): void {
    const index = this.file.bars.findIndex((b) =>
      b.sessionId === record.sessionId && b.kind === record.kind && b.bar === record.bar);
    if (index >= 0) this.file.bars[index] = record;
    else this.file.bars.push(record);
    this.revision++;
    this.scheduleSave();
  }

  /** Löscht alle Aufzeichnungen — auch in der Ablage. */
  async reset(): Promise<void> {
    if (this.pendingSave) { clearTimeout(this.pendingSave); this.pendingSave = null; }
    await this.schreibvorgang;
    this.file = leereDatei();
    this.isReadOnly = false;
    this.lastError = null;
    this.revision++;
    try { await this.ablage.loeschen(STATISTICS_FILE); } catch { /* nichts zu löschen */ }
  }

  /** Schreibt sofort. */
  async saveNow(): Promise<void> {
    if (this.pendingSave) { clearTimeout(this.pendingSave); this.pendingSave = null; }
    if (this.isReadOnly) return;
    await this.schreibvorgang;
    await this.schreibe(encodeStatistics(this.file));
  }

  private scheduleSave(): void {
    if (this.isReadOnly) return;
    if (this.pendingSave) clearTimeout(this.pendingSave);
    this.pendingSave = setTimeout(() => {
      this.pendingSave = null;
      const snapshot = encodeStatistics(this.file);
      this.schreibvorgang = this.schreibvorgang.then(() => this.schreibe(snapshot));
    }, StatisticsStore.saveDelayMs);
  }

  private async schreibe(text: string): Promise<void> {
    try {
      await this.ablage.schreiben(STATISTICS_FILE, text);
      this.lastError = null;
    } catch (e) {
      this.lastError = `Statistik konnte nicht gespeichert werden: ${(e as Error).message ?? e}`;
    }
  }
}
