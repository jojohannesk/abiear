<script lang="ts">
  // Rahmen der App: Bildschirmwechsel, Ladeanzeige, Abbruchfrage.
  // Aus `Views/ContentView.swift`. Läufe laufen außerhalb der Tabs.
  import { onMount } from "svelte";
  import type { QuizStore } from "../kern/QuizStore.svelte";
  import { TrainingModes } from "../kern/QuizTask";
  import type { Einstellungen } from "../plattform/Einstellungen";
  import type { Erinnerungen } from "../plattform/Erinnerungen.svelte";
  import TabLeiste from "./TabLeiste.svelte";
  import type { Tab } from "./Symbole";
  import Icon from "./Bausteine/Icon.svelte";
  import Alert from "./Bausteine/Alert.svelte";
  import UebenView from "./Ueben/UebenView.svelte";
  import LernView from "./Lernen/LernView.svelte";
  import StatisticsView from "./Statistik/StatisticsView.svelte";
  import MehrView from "./Mehr/MehrView.svelte";
  import PrepareView from "./Lauf/PrepareView.svelte";
  import QuizView from "./Lauf/QuizView.svelte";
  import ResultView from "./Lauf/ResultView.svelte";

  interface Props { store: QuizStore; einstellungen: Einstellungen; erinnerungen: Erinnerungen }
  let { store, einstellungen, erinnerungen }: Props = $props();

  const tabs: Tab[] = ["ueben", "lernen", "statistik", "mehr"];
  function gemerkterTab(): Tab {
    const t = einstellungen.lesen("tab") as Tab | null;
    return t && tabs.includes(t) ? t : "ueben";
  }
  let tab = $state<Tab>(gemerkterTab());
  let seiten = $state<HTMLDivElement | null>(null);
  let geladen = $state(false);

  function zeigeTab(neu: Tab, sanft = true) {
    tab = neu;
    einstellungen.schreiben("tab", neu);
    const i = tabs.indexOf(neu);
    seiten?.scrollTo({ left: i * seiten.clientWidth, behavior: sanft ? "smooth" : "auto" });
  }

  /** Wischen und Tippen schreiben dieselbe Auswahl. */
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  function gewischt() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (!seiten) return;
      const i = Math.round(seiten.scrollLeft / seiten.clientWidth);
      const neu = tabs[Math.min(tabs.length - 1, Math.max(0, i))];
      if (neu !== tab) { tab = neu; einstellungen.schreiben("tab", neu); }
    }, 80);
  }

  const lernKinds = TrainingModes.kacheln.flatMap((m) => TrainingModes.kinds(m));

  onMount(() => {
    void store.laden().then(() => {
      geladen = true;
      void erinnerungen.statusPruefen().then(() => erinnerungen.neuPlanen(store.insights));
      requestAnimationFrame(() => zeigeTab(tab, false));
    });
    // Beim Verlassen sofort sichern; bei der Rückkehr den Tag prüfen.
    const sichtbarkeit = () => {
      if (document.visibilityState === "hidden") { void store.statistics.saveNow(); return; }
      store.tagPruefen();
      void erinnerungen.statusPruefen().then(() => erinnerungen.neuPlanen(store.insights));
    };
    document.addEventListener("visibilitychange", sichtbarkeit);
    window.addEventListener("pagehide", () => { void store.statistics.saveNow(); });
    const groesse = () => { if (store.screen.art === "start") zeigeTab(tab, false); };
    window.addEventListener("resize", groesse);
    return () => { document.removeEventListener("visibilitychange", sichtbarkeit); window.removeEventListener("resize", groesse); };
  });

  $effect(() => {
    // Zurück auf den Start: die Seite muss wieder auf dem gewählten Tab stehen.
    if (store.screen.art === "start") requestAnimationFrame(() => zeigeTab(tab, false));
  });
</script>

{#if store.audio.startFehler}
  <div class="tonband">
    <div class="inhalt tonbandinhalt">
      <span class="c-negative"><Icon name="speaker.slash" size={13} weight={2.4} /></span>
      <span class="t-small-medium c-text">Ton nicht verfügbar</span>
      <button class="t-small-medium c-accent nochmal" onclick={() => store.audio.activate()}>Erneut versuchen</button>
    </div>
  </div>
{/if}

<div class="bildschirm" class:unsichtbar={!geladen}>
  {#if store.screen.art === "start"}
    <div class="tabs">
      <div class="seiten" bind:this={seiten} onscroll={gewischt}>
        <div class="tabseite"><UebenView {store} onSelect={(mode) => { store.audio.activate(); store.screen = { art: "prepare", mode }; }} onStatistik={() => zeigeTab("statistik")} /></div>
        <div class="tabseite"><LernView {store} kinds={lernKinds} /></div>
        <div class="tabseite">{#key store.statistikRevision}<StatisticsView {store} />{/key}</div>
        <div class="tabseite"><MehrView {store} {erinnerungen} /></div>
      </div>
      <TabLeiste auswahl={tab} onselect={(t) => zeigeTab(t)} />
    </div>
  {:else if store.screen.art === "prepare"}
    {#key store.screen.mode}<PrepareView {store} mode={store.screen.mode} {einstellungen} />{/key}
  {:else if store.screen.art === "quiz"}
    <QuizView {store} />
  {:else}
    <ResultView {store} />
  {/if}
</div>

{#if store.audio.isLoadingSamples}
  <div class="laden">
    <div class="karte ladekarte">
      <span class="spinner" aria-hidden="true"></span>
      <span class="t-label c-secondary">Klaviertöne werden geladen</span>
    </div>
  </div>
{/if}

<Alert offen={store.showSkipModal} titel="Diktat überspringen?"
  text="Das Diktat wird als nicht gelöst gewertet. Du siehst danach die Lösung."
  knoepfe={[
    { titel: "Weiter üben", rolle: "cancel", onclick: () => store.closeSkipModal() },
    { titel: "Überspringen", rolle: "destructive", onclick: () => store.confirmSkip() },
  ]} />

<style>
  .bildschirm { flex: 1; min-height: 0; display: flex; flex-direction: column; transition: opacity 0.22s ease-in-out; }
  .unsichtbar { opacity: 0; }
  .tabs { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .seiten {
    flex: 1; min-height: 0; display: flex; overflow-x: auto; overflow-y: hidden;
    scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch;
  }
  .seiten::-webkit-scrollbar { display: none; }
  .tabseite { flex: none; width: 100%; height: 100%; scroll-snap-align: start; scroll-snap-stop: always; display: flex; flex-direction: column; }
  .tonband { background: var(--raised); border-bottom: 1px solid var(--hairline); padding-top: var(--sicher-oben); flex: none; }
  .tonbandinhalt { display: flex; align-items: center; gap: var(--space-s); padding-top: var(--space-xxs); padding-bottom: var(--space-xxs); }
  .nochmal { margin-left: auto; min-height: var(--touch-min); }
  .laden { position: fixed; inset: 0; z-index: 60; background: rgba(21, 23, 27, 0.94); display: grid; place-items: center; }
  .ladekarte { padding: var(--space-xl); display: flex; flex-direction: column; align-items: center; gap: var(--space-l); }
  .spinner { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--hairline-strong); border-top-color: var(--accent); animation: drehen 0.8s linear infinite; }
  @keyframes drehen { to { transform: rotate(360deg); } }
</style>
