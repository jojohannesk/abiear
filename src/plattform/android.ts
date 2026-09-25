// Die Plattformschicht unter Android (Capacitor). Wird nur in der
// Android-Fassung geladen (`main.ts`, dynamischer Import) — der Browser
// bekommt davon nichts ins Bündel.
//
// Drei Umsetzungen hinter den Schnittstellen, die die Browser-Fassung schon
// hat, plus die Zurück-Taste:
//
// - `AndroidAblage`: `statistics.json` als echte Datei im App-Verzeichnis,
//   wie unter iOS — nicht in der WebView-Datenbank.
// - `AndroidZusteller`: geplante lokale Mitteilungen, dreißig Einzeltermine
//   wie `Erinnerungen.swift`. Bewusst **ungenau** geplant: genaue Wecker
//   verlangen unter Android eine eigene Berechtigung, die Google nur
//   Wecker- und Kalender-Apps zugesteht. Eine Übungserinnerung darf ein paar
//   Minuten später kommen.
// - `androidHaptik`: die Haptics-API statt `navigator.vibrate`.

import { App } from "@capacitor/app";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Haptics as CapHaptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { registerPlugin } from "@capacitor/core";
import type { Ablage } from "../kern/Statistics";
import type { HaptikAusgabe } from "./Haptik";
import { ERINNERUNG_TEXT, ERINNERUNG_TITEL, type Zusteller } from "./Erinnerungen.svelte";

// MARK: - Ablage

/** Dateien im App-Verzeichnis (`Context.getFilesDir()`), UTF-8. */
export class AndroidAblage implements Ablage {
  private readonly ort = Directory.Data;

  /** Fehlend ist `null`; da, aber unlesbar, wirft — sonst würde der Store
   *  mit leerem Stand weitermachen und die Datei überschreiben. */
  async lesen(name: string): Promise<string | null> {
    try {
      await Filesystem.stat({ path: name, directory: this.ort });
    } catch {
      return null;
    }
    const { data } = await Filesystem.readFile({ path: name, directory: this.ort, encoding: Encoding.UTF8 });
    return typeof data === "string" ? data : await data.text();
  }

  /** Erst in eine Nebendatei, dann umbenennen: ein Abbruch mitten im
   *  Schreiben hinterlässt die alte Datei, keine halbe. */
  async schreiben(name: string, inhalt: string): Promise<void> {
    const neben = name + ".neu";
    await Filesystem.writeFile({ path: neben, directory: this.ort, data: inhalt, encoding: Encoding.UTF8 });
    await Filesystem.rename({ from: neben, to: name, directory: this.ort, toDirectory: this.ort });
  }

  async loeschen(name: string): Promise<void> {
    try {
      await Filesystem.deleteFile({ path: name, directory: this.ort });
    } catch { /* nichts zu löschen */ }
  }
}

// MARK: - Mitteilungen

/** Öffnet die Mitteilungseinstellungen der App — `MainActivity.java`. */
interface Systemeinstellungen { mitteilungenOeffnen(): Promise<void> }
const Systemeinstellungen = registerPlugin<Systemeinstellungen>("Systemeinstellungen");

/** Kennungen der eigenen Mitteilungen: nur diese werden gelöscht. */
const ID_ANFANG = 41_000;
const ID_ENDE = 41_100;
const KANAL = "erinnerung";

export class AndroidZusteller implements Zusteller {
  readonly nurImVordergrund = false;
  private kanalAngelegt = false;

  readonly einstellungenOeffnen = () => { void Systemeinstellungen.mitteilungenOeffnen().catch(() => {}); };

  async erlaubt(): Promise<boolean> {
    return (await LocalNotifications.checkPermissions()).display === "granted";
  }

  async anfragen(): Promise<boolean> {
    if (await this.erlaubt()) return true;
    return (await LocalNotifications.requestPermissions()).display === "granted";
  }

  async planen(termine: Date[]): Promise<void> {
    await this.kanal();
    const kuenftige = termine.filter((t) => t.getTime() > Date.now());
    if (kuenftige.length === 0) return;
    await LocalNotifications.schedule({
      notifications: kuenftige.slice(0, ID_ENDE - ID_ANFANG).map((at, i) => ({
        id: ID_ANFANG + i,
        title: ERINNERUNG_TITEL,
        body: ERINNERUNG_TEXT,
        channelId: KANAL,
        schedule: { at, allowWhileIdle: true },
        isExactNotification: false,
      })),
    });
  }

  async loeschen(): Promise<void> {
    const { notifications } = await LocalNotifications.getPending();
    const eigene = notifications.filter((n) => n.id >= ID_ANFANG && n.id < ID_ENDE);
    if (eigene.length > 0) await LocalNotifications.cancel({ notifications: eigene.map((n) => ({ id: n.id })) });
  }

  /** Ab Android 8 braucht jede Mitteilung einen Kanal; sein Name steht in
   *  den Systemeinstellungen, dort schaltet man ihn einzeln ab. */
  private async kanal(): Promise<void> {
    if (this.kanalAngelegt) return;
    await LocalNotifications.createChannel({
      id: KANAL,
      name: "Tägliche Erinnerung",
      description: "Erinnert einmal am Tag ans Üben, wenn du an dem Tag noch nicht geübt hast.",
      importance: 3,
    });
    this.kanalAngelegt = true;
  }
}

// MARK: - Haptik

/** Wie `Haptik.swift`: Erfolg, Fehler, leichter Stoß, Auswahl. */
export function androidHaptik(): HaptikAusgabe {
  const still = (p: Promise<void>) => { void p.catch(() => {}); };
  // `selectionChanged` spürt man unter Android nur zwischen Start und Ende.
  still(CapHaptics.selectionStart());
  return {
    correct: () => still(CapHaptics.notification({ type: NotificationType.Success })),
    wrong: () => still(CapHaptics.notification({ type: NotificationType.Error })),
    tap: () => still(CapHaptics.impact({ style: ImpactStyle.Light })),
    select: () => still(CapHaptics.selectionChanged()),
  };
}

// MARK: - Zurück

/** Hängt die Zurück-Taste ein. `zurueck` gibt `false`, wenn die App auf
 *  der untersten Ebene steht — dann geht sie in den Hintergrund, wie jede
 *  Android-App auf ihrem Startbildschirm. */
export function zurueckTaste(zurueck: () => boolean): void {
  void App.addListener("backButton", () => {
    if (!zurueck()) void App.minimizeApp();
  });
}
