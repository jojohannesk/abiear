// Kalenderrechnung. Ersetzt `Calendar` aus Foundation an den Stellen, die
// die Statistik braucht: Tagesanfang, Tagesabstand, Wochenbeginn (Montag),
// Uhrzeit an einem Tag, Tagesnummer.
//
// Injizierbar wie `calendar:` in Swift, damit die Prüfungen mit festem
// „jetzt" laufen. Die Umsetzung rechnet in der Ortszeit der Laufzeit — im
// Browser ist das die Zeitzone des Geräts, wie `Calendar.current` in iOS;
// die Prüfungen setzen `TZ=Europe/Berlin`.

export interface Kalender {
  startOfDay(d: Date): Date;
  addDays(d: Date, n: number): Date;
  /** Montag 0:00 der Woche, in der `d` liegt. */
  weekStart(d: Date): Date;
  isSameDay(a: Date, b: Date): boolean;
  /** Kalendertage von `from` bis `to` (Tagesanfänge; Sommerzeit stört nicht). */
  daysBetween(from: Date, to: Date): number;
  /** Derselbe Kalendertag wie `d`, zur angegebenen Uhrzeit. */
  at(d: Date, hour: number, minute: number): Date;
  /**
   * Tagesnummer seit Beginn der Zeitrechnung — wie
   * `Calendar.ordinality(of: .day, in: .era)`. Foundation rechnet sie, wie
   * gemessen, auf dem UTC-Datum, nicht auf dem Ortstag: 1. Januar 2000
   * 0:30 Berlin ergibt dort 730119, 12:00 ergibt 730120. Hier genauso.
   */
  dayOrdinal(d: Date): number;
}

const TAG_MS = 86_400_000;
/** Tage vom 1. Januar 1 bis zum 1. Januar 1970, proleptisch gregorianisch, plus eins. */
const ORDINAL_1970 = 719_163;

export const LokalerKalender: Kalender = {
  startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  },
  addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n,
                    d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  },
  weekStart(d) {
    const offset = (d.getDay() + 6) % 7;   // Montag = 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  },
  isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  },
  daysBetween(from, to) {
    const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / TAG_MS);
  },
  at(d, hour, minute) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute);
  },
  dayOrdinal(d) {
    return Math.floor(d.getTime() / TAG_MS) + ORDINAL_1970;
  },
};
