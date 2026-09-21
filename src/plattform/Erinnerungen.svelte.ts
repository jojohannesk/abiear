// Die tägliche Erinnerung ans Üben. Portierung von `System/Erinnerungen.swift`
// auf die Web-Notification-API.
//
// Drei Zustände, nicht zwei: wer die Mitteilungen im Browser abschaltet,
// darf hier nicht weiter „An" sehen. Alles Rechnende steht in
// `StatisticsInsights.erinnerungsTermine`; hier bleibt nur das Zustellen.
//
// **Die Grenze des Browsers, offen gesagt.** Es gibt keine geplanten
// lokalen Mitteilungen wie unter iOS; ohne Server kann eine Seite nur
// zustellen, solange sie läuft. Deshalb plant diese Umsetzung den nächsten
// Termin als Timer im laufenden Fenster — und die Oberfläche sagt das dazu.
// Unter Capacitor auf Android übernimmt die LocalNotifications-API, und die
// Einschränkung entfällt.

import type { Erinnerungsplaner } from "../kern/Erinnerungsplaner";
import type { StatisticsInsights } from "../kern/StatisticsInsights";
import type { Einstellungen } from "./Einstellungen";

export type ErinnerungZustand = "aus" | "an" | "vomSystemAbgelehnt";

export interface Uhrzeit { hour: number; minute: number }

const SCHLUESSEL_AN = "erinnerung.an";
const SCHLUESSEL_STUNDE = "erinnerung.stunde";
const SCHLUESSEL_MINUTE = "erinnerung.minute";
const ANZAHL = 30;

export class Erinnerungen implements Erinnerungsplaner {
  zustand = $state<ErinnerungZustand>("aus");
  uhrzeit = $state<Uhrzeit>({ hour: 17, minute: 30 });
  /** Was die Plattform kann — im Browser nur, solange die Seite offen ist. */
  readonly nurImVordergrund = true;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private planlauf = 0;

  constructor(private readonly einstellungen: Einstellungen) {
    this.zustand = einstellungen.lesen(SCHLUESSEL_AN) === "true" ? "an" : "aus";
    const stunde = Number(einstellungen.lesen(SCHLUESSEL_STUNDE));
    const minute = Number(einstellungen.lesen(SCHLUESSEL_MINUTE));
    this.uhrzeit = {
      hour: Number.isInteger(stunde) && einstellungen.lesen(SCHLUESSEL_STUNDE) !== null ? stunde : 17,
      minute: Number.isInteger(minute) && einstellungen.lesen(SCHLUESSEL_MINUTE) !== null ? minute : 30,
    };
  }

  private get api(): typeof Notification | null {
    return typeof Notification === "undefined" ? null : Notification;
  }

  /** Der Nutzer kann die Mitteilungen außerhalb der App abgeschaltet haben. */
  async statusPruefen(): Promise<void> {
    if (this.einstellungen.lesen(SCHLUESSEL_AN) !== "true") { this.zustand = "aus"; return; }
    const api = this.api;
    this.zustand = api && api.permission === "granted" ? "an" : "vomSystemAbgelehnt";
  }

  async einschalten(insights: StatisticsInsights): Promise<boolean> {
    const api = this.api;
    let erlaubt = false;
    if (api) {
      try {
        erlaubt = (await api.requestPermission()) === "granted";
      } catch {
        erlaubt = false;
      }
    }
    this.einstellungen.schreiben(SCHLUESSEL_AN, "true");
    if (!erlaubt) {
      this.zustand = "vomSystemAbgelehnt";
      return false;
    }
    this.zustand = "an";
    await this.neuPlanen(insights);
    return true;
  }

  ausschalten(): void {
    this.einstellungen.schreiben(SCHLUESSEL_AN, "false");
    this.zustand = "aus";
    this.planlauf += 1;
    this.loeschen();
  }

  setzeUhrzeit(neu: Uhrzeit, insights: StatisticsInsights): void {
    this.uhrzeit = { hour: neu.hour, minute: neu.minute };
    this.einstellungen.schreiben(SCHLUESSEL_STUNDE, String(neu.hour));
    this.einstellungen.schreiben(SCHLUESSEL_MINUTE, String(neu.minute));
    void this.neuPlanen(insights);
  }

  /** Plant den nächsten Termin als Timer — der heutige entfällt, wenn heute schon geübt wurde. */
  async neuPlanen(insights: StatisticsInsights): Promise<void> {
    if (this.zustand !== "an") return;
    this.planlauf += 1;
    const meiner = this.planlauf;
    this.loeschen();
    const termine = insights.erinnerungsTermine(this.uhrzeit, ANZAHL);
    const naechster = termine[0];
    if (!naechster) return;
    const wartezeit = Math.min(naechster.getTime() - Date.now(), 2_147_000_000);
    if (wartezeit <= 0) return;
    this.timer = setTimeout(() => {
      if (meiner !== this.planlauf || this.zustand !== "an") return;
      this.zustellen();
      void this.neuPlanen(insights);
    }, wartezeit);
  }

  private zustellen(): void {
    const api = this.api;
    if (!api || api.permission !== "granted") return;
    try {
      new api("AbiEar", { body: "Zeit für ein paar Intervalle.", tag: "abiear.uebung" });
    } catch { /* manche Browser erlauben nur Service-Worker-Mitteilungen */ }
  }

  private loeschen(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }
}
