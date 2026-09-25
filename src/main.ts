// Einstieg: Plattformschicht verdrahten, Store anlegen, Oberfläche einhängen.
//
// Browser und Android teilen alles bis auf vier Dinge: wo die Statistik
// liegt, wie die Erinnerung zugestellt wird, wie Haptik entsteht und wer
// die Zurück-Taste hat. Die Android-Umsetzungen kommen per dynamischem
// Import — im Browser-Bündel fehlen sie ganz.
import { mount } from "svelte";
import { Capacitor } from "@capacitor/core";
import "./ui/design.css";
import App from "./ui/App.svelte";
import { QuizStore } from "./kern/QuizStore.svelte";
import type { Ablage } from "./kern/Statistics";
import { AudioEngine } from "./klang/AudioEngine";
import { BrowserAblage } from "./plattform/BrowserAblage";
import { BrowserEinstellungen } from "./plattform/Einstellungen";
import { BrowserZusteller, Erinnerungen, type Zusteller } from "./plattform/Erinnerungen.svelte";
import { Haptics, vibrationsHaptik } from "./plattform/Haptik";

async function starten() {
  let ablage: Ablage = new BrowserAblage();
  let zusteller: Zusteller = new BrowserZusteller();
  let zurueckTaste: ((zurueck: () => boolean) => void) | undefined;

  if (Capacitor.isNativePlatform()) {
    const android = await import("./plattform/android");
    ablage = new android.AndroidAblage();
    zusteller = new android.AndroidZusteller();
    Haptics.setze(android.androidHaptik());
    zurueckTaste = android.zurueckTaste;
  } else {
    const haptik = vibrationsHaptik();
    if (haptik) Haptics.setze(haptik);
  }

  const basis = import.meta.env.BASE_URL;
  const einstellungen = new BrowserEinstellungen();
  const erinnerungen = new Erinnerungen(einstellungen, zusteller);
  const audio = new AudioEngine((name) => `${basis}piano/${name}.mp3`);
  const store = new QuizStore({ audio, einstellungen, ablage, erinnerungen });

  // Die erste Berührung weckt den Klang — still, ohne eigenen Knopf. Danach
  // laden die Samples im Hintergrund, damit die erste Aufgabe sofort klingt.
  const aufwecken = () => {
    audio.activate();
    void audio.loadSamples();
    window.removeEventListener("pointerdown", aufwecken, true);
    window.removeEventListener("keydown", aufwecken, true);
  };
  window.addEventListener("pointerdown", aufwecken, true);
  window.addEventListener("keydown", aufwecken, true);

  mount(App, { target: document.getElementById("app")!, props: { store, einstellungen, erinnerungen, zurueckTaste } });
}

void starten();
