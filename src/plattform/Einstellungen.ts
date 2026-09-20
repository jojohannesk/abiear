// Persistente Einstellungen — die `UserDefaults` der iOS-App, mit denselben
// Schlüsseln (`uebetempoBPM`, `niveau.rhythmus`, …). Im Browser
// `localStorage`, im Test ein Objekt.

export interface Einstellungen {
  lesen(schluessel: string): string | null;
  schreiben(schluessel: string, wert: string): void;
  loeschen(schluessel: string): void;
}

export class SpeicherEinstellungen implements Einstellungen {
  readonly werte = new Map<string, string>();
  lesen(k: string) { return this.werte.get(k) ?? null; }
  schreiben(k: string, w: string) { this.werte.set(k, w); }
  loeschen(k: string) { this.werte.delete(k); }
}

/** `localStorage`, jeder Zugriff abgesichert: privates Fenster, gesperrte Website-Daten. */
export class BrowserEinstellungen implements Einstellungen {
  lesen(k: string): string | null {
    try { return globalThis.localStorage?.getItem(k) ?? null; } catch { return null; }
  }
  schreiben(k: string, w: string): void {
    try { globalThis.localStorage?.setItem(k, w); } catch { /* voll oder gesperrt */ }
  }
  loeschen(k: string): void {
    try { globalThis.localStorage?.removeItem(k); } catch { /* nichts */ }
  }
}
