<script lang="ts">
  // Verteilt auf die beiden Aufgabenarten und liefert Kopfzeile und
  // Fortschritt. Aus `Views/QuizView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { TrainingModes } from "../../kern/QuizTask";
  import TopBar from "../Bausteine/TopBar.svelte";
  import ThinProgress from "../Bausteine/ThinProgress.svelte";
  import GehoerTaskView from "./GehoerTaskView.svelte";
  import DiktatView from "./DiktatView.svelte";

  interface Props { store: QuizStore }
  let { store }: Props = $props();

  const title = $derived(store.isRepeatRound ? "Wiederholung" : store.mode === "mix" ? "Komplettprüfung" : TrainingModes.title(store.mode));
  const task = $derived(store.currentTask);
</script>

<div class="seite">
  <TopBar {title} onClose={() => store.returnToStart()}>
    {#snippet trailing()}
      <span class="zaehler t-small-medium ziffern"><span class="c-text">{store.currentIdx + 1}</span><span class="c-tertiary"> / {store.tasks.length}</span></span>
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

<style>
  .zaehler { white-space: nowrap; }
</style>
