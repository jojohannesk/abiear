// Textablage im Browser: IndexedDB, mit `localStorage` als Notbehelf.
//
// IndexedDB statt `localStorage`, weil die Statistikdatei über Monate auf
// mehrere Megabyte wachsen kann und `localStorage` bei ~5 MB endet — und
// weil sie asynchron ist: das Schreiben blockiert die Oberfläche nicht.
// Jeder Zugriff ist abgesichert; im privaten Fenster oder bei gesperrten
// Website-Daten fällt die Ablage still auf den Arbeitsspeicher zurück und
// der Store meldet den Fehler in `lastError`.

import type { Ablage } from "../kern/Statistics";

const DB_NAME = "abiear";
const STORE = "dateien";

function oeffnen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB;
    if (!idb) { reject(new Error("IndexedDB nicht verfügbar")); return; }
    const anfrage = idb.open(DB_NAME, 1);
    anfrage.onupgradeneeded = () => { anfrage.result.createObjectStore(STORE); };
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error ?? new Error("IndexedDB"));
    anfrage.onblocked = () => reject(new Error("IndexedDB blockiert"));
  });
}

function anfrage<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("IndexedDB"));
  });
}

export class BrowserAblage implements Ablage {
  private db: Promise<IDBDatabase> | null = null;

  private verbindung(): Promise<IDBDatabase> {
    if (!this.db) this.db = oeffnen();
    return this.db;
  }

  async lesen(name: string): Promise<string | null> {
    try {
      const db = await this.verbindung();
      const wert = await anfrage(db.transaction(STORE, "readonly").objectStore(STORE).get(name));
      return typeof wert === "string" ? wert : null;
    } catch {
      try { return globalThis.localStorage?.getItem("datei." + name) ?? null; } catch { return null; }
    }
  }

  async schreiben(name: string, inhalt: string): Promise<void> {
    try {
      const db = await this.verbindung();
      await anfrage(db.transaction(STORE, "readwrite").objectStore(STORE).put(inhalt, name));
    } catch {
      globalThis.localStorage?.setItem("datei." + name, inhalt);
    }
  }

  async loeschen(name: string): Promise<void> {
    try {
      const db = await this.verbindung();
      await anfrage(db.transaction(STORE, "readwrite").objectStore(STORE).delete(name));
    } catch {
      try { globalThis.localStorage?.removeItem("datei." + name); } catch { /* nichts */ }
    }
  }
}
