<script lang="ts">
  // Verteilt auf die beiden Aufgabenarten und liefert Kopfzeile und
  // Fortschritt. Aus `Views/QuizView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { TrainingModes } from "../../kern/QuizTask";
  import TopBar from "../Bausteine/TopBar.svelte";
  import ThinProgress from "../Bausteine/ThinProgress.svelte";
  import GehoerTaskView from "./GehoerTaskView.svelte";
  import DiktatView from "./DiktatView.svelte";
  import HilfeView from "./HilfeView.svelte";
  import Sheet from "../Bausteine/Sheet.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import { beiZurueck } from "../../plattform/Zurueck";

  interface Props { store: QuizStore }
  let { store }: Props = $props();

  const title = $derived(store.isRepeatRound ? "Wiederholung" : store.mode === "mix" ? "Komplettprüfung" : TrainingModes.title(store.mode));
  const task = $derived(store.currentTask);

  // Das Fragezeichen hält jede Wiedergabe an. Ein Diktatdurchgang geht dabei
  // nicht verloren — er rückt erst nach vollständigem Ablauf weiter.
  let zeigeHilfe = $state(false);
  function oeffneHilfe() {
    store.stopAllAudio();
    zeigeHilfe = true;
  }

  // Android-Zurück tut, was das X tut.
  $effect(() => beiZurueck(() => store.returnToStart(), "bildschirm"));
</script>

<div class="seite">
  <TopBar {title} onClose={() => store.returnToStart()}>
    {#snippet trailing()}
      <span class="rechts">
        <span class="zaehler t-small-medium ziffern"><span class="c-text">{store.currentIdx + 1}</span><span class="c-tertiary"> / {store.tasks.length}</span></span>
        <button class="hilfe" aria-label="Hilfe" disabled={!task} onclick={oeffneHilfe}><Icon name="questionmark.circle" size={20} /></button>
      </span>
    {/snippet}
  </TopBar>
  <ThinProgress fraction={(store.currentIdx + 1) / Math.max(1, store.tasks.length)} />

  {#if task}
    {#if task.kind === "interval" || task.kind === "chord"}
      {#key task.id}<GehoerTaskView {store} {task} />{/key}
    {:else}
      {#key task.id}<DiktatView {store} {task} />{/key}
    {/if}
  {/if}
</div>

<!-- Außerhalb des {#key}, sonst würde das Blatt mit jeder Aufgabe neu aufgebaut. -->
<Sheet offen={zeigeHilfe && !!task} onClose={() => (zeigeHilfe = false)}>
  {#if task}
    <HilfeView {store} mode={store.mode} kind={task.kind} onClose={() => (zeigeHilfe = false)} />
  {/if}
</Sheet>

<style>
  .rechts { display: flex; align-items: center; gap: var(--space-xs); }
  .zaehler { white-space: nowrap; }
  .hilfe { width: 32px; height: var(--touch-min); display: grid; place-items: center; color: var(--text-secondary); }
</style>
