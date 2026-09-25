// Die tägliche Erinnerung ans Üben. Portierung von `System/Erinnerungen.swift`.
//
// Drei Zustände, nicht zwei: wer die Mitteilungen im System abschaltet,
// darf hier nicht weiter „An" sehen. Alles Rechnende steht in
// `StatisticsInsights.erinnerungsTermine`; hier bleibt das Schalten, und
// das Zustellen macht ein `Zusteller` — im Browser ein Timer, unter Android
// die geplanten lokalen Mitteilungen (`AndroidZusteller`).
//
// **Die Grenze des Browsers, offen gesagt.** Es gibt keine geplanten
// lokalen Mitteilungen wie unter iOS; ohne Server kann eine Seite nur
// zustellen, solange sie läuft. Deshalb plant der Browser-Zusteller den
// nächsten Termin als Timer im laufenden Fenster — und die Oberfläche sagt
// das dazu (`nurImVordergrund`).

import type { Erinnerungsplaner } from "../kern/Erinnerungsplaner";
import type { StatisticsInsights } from "../kern/StatisticsInsights";
import type { Einstellungen } from "./Einstellungen";

export type ErinnerungZustand = "aus" | "an" | "vomSystemAbgelehnt";

export interface Uhrzeit { hour: number; minute: number }

/** Der Text enthält keine Zahl — er würde beim Planen festgeschrieben. */
export const ERINNERUNG_TITEL = "AbiEar";
export const ERINNERUNG_TEXT = "Zeit für ein paar Intervalle.";

export interface Zusteller {
  /** Nur solange die App offen ist — die Oberfläche sagt es dazu. */
  readonly nurImVordergrund: boolean;
  erlaubt(): Promise<boolean>;
  /** Fragt die Berechtigung an; `true`, wenn sie danach besteht. */
  anfragen(): Promise<boolean>;
  /** Ersetzt alle eigenen geplanten Mitteilungen durch diese Termine. */
  planen(termine: Date[]): Promise<void>;
  loeschen(): Promise<void>;
  /** Öffnet die Mitteilungseinstellungen des Systems, wo es das gibt. */
  readonly einstellungenOeffnen?: () => void;
}

const SCHLUESSEL_AN = "erinnerung.an";
const SCHLUESSEL_STUNDE = "erinnerung.stunde";
const SCHLUESSEL_MINUTE = "erinnerung.minute";
const ANZAHL = 30;

export class Erinnerungen implements Erinnerungsplaner {
  zustand = $state<ErinnerungZustand>("aus");
  uhrzeit = $state<Uhrzeit>({ hour: 17, minute: 30 });

  /** Vordergrundwechsel und Laufende treffen praktisch gleichzeitig ein.
   *  Nur der jüngste Planlauf darf nach seinem `await` noch schreiben. */
  private planlauf = 0;

  constructor(private readonly einstellungen: Einstellungen, private readonly zusteller: Zusteller) {
    this.zustand = einstellungen.lesen(SCHLUESSEL_AN) === "true" ? "an" : "aus";
    const stunde = Number(einstellungen.lesen(SCHLUESSEL_STUNDE));
    const minute = Number(einstellungen.lesen(SCHLUESSEL_MINUTE));
    this.uhrzeit = {
      hour: Number.isInteger(stunde) && einstellungen.lesen(SCHLUESSEL_STUNDE) !== null ? stunde : 17,
      minute: Number.isInteger(minute) && einstellungen.lesen(SCHLUESSEL_MINUTE) !== null ? minute : 30,
    };
  }

  get nurImVordergrund(): boolean { return this.zusteller.nurImVordergrund; }
  get einstellungenOeffnen(): (() => void) | undefined { return this.zusteller.einstellungenOeffnen; }

  /** Der Nutzer kann die Mitteilungen außerhalb der App abgeschaltet haben. */
  async statusPruefen(): Promise<void> {
    if (this.einstellungen.lesen(SCHLUESSEL_AN) !== "true") { this.zustand = "aus"; return; }
    this.zustand = (await this.zusteller.erlaubt()) ? "an" : "vomSystemAbgelehnt";
  }

  /** Gefragt wird **erst hier** — nie beim ersten Start. */
  async einschalten(insights: StatisticsInsights): Promise<boolean> {
    let erlaubt = false;
    try { erlaubt = await this.zusteller.anfragen(); } catch { erlaubt = false; }
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
    void this.zusteller.loeschen().catch(() => {});
  }

  setzeUhrzeit(neu: Uhrzeit, insights: StatisticsInsights): void {
    this.uhrzeit = { hour: neu.hour, minute: neu.minute };
    this.einstellungen.schreiben(SCHLUESSEL_STUNDE, String(neu.hour));
    this.einstellungen.schreiben(SCHLUESSEL_MINUTE, String(neu.minute));
    void this.neuPlanen(insights);
  }

  /** Löscht die eigenen Termine und plant die nächsten dreißig neu — der
   *  heutige entfällt, wenn heute schon geübt wurde. */
  async neuPlanen(insights: StatisticsInsights): Promise<void> {
    if (this.zustand !== "an") return;
    this.planlauf += 1;
    const meiner = this.planlauf;
    try {
      await this.zusteller.loeschen();
      if (meiner !== this.planlauf || this.zustand !== "an") return;
      await this.zusteller.planen(insights.erinnerungsTermine(this.uhrzeit, ANZAHL));
    } catch { /* Planen scheitert still; beim nächsten Vordergrund wieder */ }
  }
}

/** Browser: die Notification-API, der nächste Termin als Timer im offenen Fenster. */
export class BrowserZusteller implements Zusteller {
  readonly nurImVordergrund = true;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private get api(): typeof Notification | null {
    return typeof Notification === "undefined" ? null : Notification;
  }

  async erlaubt(): Promise<boolean> {
    return this.api?.permission === "granted";
  }

  async anfragen(): Promise<boolean> {
    const api = this.api;
    if (!api) return false;
    try { return (await api.requestPermission()) === "granted"; } catch { return false; }
  }

  async planen(termine: Date[]): Promise<void> {
    this.stoppen();
    const naechster = termine.findIndex((t) => t.getTime() > Date.now());
    if (naechster < 0) return;
    const wartezeit = Math.min(termine[naechster].getTime() - Date.now(), 2_147_000_000);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.zustellen();
      void this.planen(termine.slice(naechster + 1));
    }, wartezeit);
  }

  async loeschen(): Promise<void> { this.stoppen(); }

  private stoppen(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  private zustellen(): void {
    const api = this.api;
    if (!api || api.permission !== "granted") return;
    try {
      new api(ERINNERUNG_TITEL, { body: ERINNERUNG_TEXT, tag: "abiear.uebung" });
    } catch { /* manche Browser erlauben nur Service-Worker-Mitteilungen */ }
  }
}
