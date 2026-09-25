// Die Plattformschicht, soweit sie ohne Gerät prüfbar ist: Reihenfolge der
// Zurück-Ebenen, das Planen der Erinnerung hinter einem Zusteller, und dass
// eine unlesbare Statistikdatei nie überschrieben wird.
import { describe, expect, it } from "vitest";
import { beiZurueck, zurueckAnEbene } from "../src/plattform/Zurueck";
import { Erinnerungen, type Zusteller } from "../src/plattform/Erinnerungen.svelte";
import { SpeicherEinstellungen } from "../src/plattform/Einstellungen";
import { StatisticsStore, SpeicherAblage, type Ablage } from "../src/kern/Statistics";
import type { StatisticsInsights } from "../src/kern/StatisticsInsights";

describe("Zurück", () => {
  it("schließt erst Blätter, dann den Bildschirm — auch wenn der Bildschirm sich später anmeldet", () => {
    const protokoll: string[] = [];
    const blatt = beiZurueck(() => protokoll.push("blatt"));
    const bildschirm = beiZurueck(() => protokoll.push("bildschirm"), "bildschirm");
    expect(zurueckAnEbene()).toBe(true);
    blatt();
    expect(zurueckAnEbene()).toBe(true);
    bildschirm();
    expect(zurueckAnEbene()).toBe(false);
    expect(protokoll).toEqual(["blatt", "bildschirm"]);
  });

  it("Escape (nurBlaetter) bricht keinen Lauf ab", () => {
    let abgebrochen = false;
    const ab = beiZurueck(() => { abgebrochen = true; }, "bildschirm");
    expect(zurueckAnEbene(true)).toBe(false);
    expect(abgebrochen).toBe(false);
    ab();
  });

  it("die zuletzt geöffnete Ebene kommt zuerst", () => {
    const protokoll: string[] = [];
    const a = beiZurueck(() => protokoll.push("unten"));
    const b = beiZurueck(() => protokoll.push("oben"));
    zurueckAnEbene();
    b(); zurueckAnEbene(); a();
    expect(protokoll).toEqual(["oben", "unten"]);
  });
});

class TestZusteller implements Zusteller {
  readonly nurImVordergrund = false;
  erlaubnis = true;
  geplant: Date[] = [];
  anfragen_ = 0;
  async erlaubt() { return this.erlaubnis; }
  async anfragen() { this.anfragen_++; return this.erlaubnis; }
  async planen(termine: Date[]) { this.geplant = [...this.geplant, ...termine]; }
  async loeschen() { this.geplant = []; }
}

const termine = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.UTC(2030, 0, i + 1, 16, 30)));
const insights = { erinnerungsTermine: (_u: unknown, tage: number) => termine(tage) } as unknown as StatisticsInsights;

describe("Erinnerungen", () => {
  it("plant dreißig Termine und ersetzt sie beim Neuplanen, statt sie zu verdoppeln", async () => {
    const z = new TestZusteller();
    const e = new Erinnerungen(new SpeicherEinstellungen(), z);
    expect(await e.einschalten(insights)).toBe(true);
    expect(z.geplant).toHaveLength(30);
    await e.neuPlanen(insights);
    expect(z.geplant).toHaveLength(30);
  });

  it("abgelehnt heißt „vomSystemAbgelehnt“, nicht „aus“ — und der Wunsch bleibt gespeichert", async () => {
    const z = new TestZusteller();
    z.erlaubnis = false;
    const einstellungen = new SpeicherEinstellungen();
    const e = new Erinnerungen(einstellungen, z);
    expect(await e.einschalten(insights)).toBe(false);
    expect(e.zustand).toBe("vomSystemAbgelehnt");
    expect(z.geplant).toHaveLength(0);
    // In den Systemeinstellungen erlaubt, zurück in die App:
    z.erlaubnis = true;
    await e.statusPruefen();
    expect(e.zustand).toBe("an");
  });

  it("ausschalten löscht, und ein Planlauf danach plant nichts mehr", async () => {
    const z = new TestZusteller();
    const e = new Erinnerungen(new SpeicherEinstellungen(), z);
    await e.einschalten(insights);
    e.ausschalten();
    await e.neuPlanen(insights);
    expect(z.geplant).toHaveLength(0);
    expect(e.zustand).toBe("aus");
  });
});

describe("Statistikdatei", () => {
  it("da, aber unlesbar: kein leerer Neuanfang, der die Datei überschreibt", async () => {
    const geschrieben: string[] = [];
    const ablage: Ablage = {
      lesen: async () => { throw new Error("E/A-Fehler"); },
      schreiben: async (name) => { geschrieben.push(name); },
      loeschen: async () => {},
    };
    const store = new StatisticsStore(ablage);
    await store.load();
    expect(store.isReadOnly).toBe(true);
    expect(store.lastError).toContain("unlesbar");
    await store.saveNow();
    expect(geschrieben).toEqual([]);
  });

  it("fehlend ist weiter kein Fehler", async () => {
    const store = new StatisticsStore(new SpeicherAblage());
    await store.load();
    expect(store.isReadOnly).toBe(false);
    expect(store.lastError).toBeNull();
  });
});
