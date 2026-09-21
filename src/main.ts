// Einstieg: Plattformschicht verdrahten, Store anlegen, Oberfläche einhängen.
import { mount } from "svelte";
import "./ui/design.css";
import App from "./ui/App.svelte";
import { QuizStore } from "./kern/QuizStore.svelte";
import { AudioEngine } from "./klang/AudioEngine";
import { BrowserAblage } from "./plattform/BrowserAblage";
import { BrowserEinstellungen } from "./plattform/Einstellungen";
import { Erinnerungen } from "./plattform/Erinnerungen.svelte";
import { Haptics, vibrationsHaptik } from "./plattform/Haptik";

const basis = import.meta.env.BASE_URL;
const einstellungen = new BrowserEinstellungen();
const erinnerungen = new Erinnerungen(einstellungen);
const audio = new AudioEngine((name) => `${basis}piano/${name}.mp3`);
const store = new QuizStore({ audio, einstellungen, ablage: new BrowserAblage(), erinnerungen });

const haptik = vibrationsHaptik();
if (haptik) Haptics.setze(haptik);

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

mount(App, { target: document.getElementById("app")!, props: { store, einstellungen, erinnerungen } });
