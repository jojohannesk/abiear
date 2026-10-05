<script lang="ts">
  // Das Blatt hinter dem Fragezeichen in jeder Aufgabe: Bedienung,
  // Prüfungsordnung und — beim Üben — das Lernblatt, für den Bereich der
  // aktuellen Aufgabe. Aus `Views/HilfeView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { TrainingModes, type Kind, type TrainingMode } from "../../kern/QuizTask";
  import { HilfeReiters } from "../../kern/HilfeReiter";
  import TopBar from "../Bausteine/TopBar.svelte";
  import SegmentedBar from "../Bausteine/SegmentedBar.svelte";
  import TutorialView from "./TutorialView.svelte";
  import GuideView from "./GuideView.svelte";
  import LernView from "../Lernen/LernView.svelte";

  interface Props { store: QuizStore; mode: TrainingMode; kind: Kind; onClose: () => void }
  let { store, mode, kind, onClose }: Props = $props();

  let auswahl = $state(0);
  const bereich = $derived(HilfeReiters.uebungFuer(kind));
  const reiter = $derived(HilfeReiters.reiter(mode, kind));
  const offen = $derived(reiter[auswahl] ?? "bedienung");
</script>

<div class="seite">
  <TopBar title="Hilfe · {TrainingModes.title(bereich)}" {onClose} />
  <div class="umschalter">
    <SegmentedBar titles={reiter.map(HilfeReiters.titel)} selection={auswahl} onselect={(i) => (auswahl = i)} />
  </div>
  {#if offen === "bedienung"}
    <TutorialView mode={bereich} mitKopf={false} />
  {:else if offen === "pruefung"}
    <GuideView mode={bereich} {onClose} mitKopf={false} />
  {:else}
    <LernView {store} kinds={[kind]} {onClose} mitKopf={false} />
  {/if}
</div>

<style>
  .umschalter { padding: var(--space-xs) var(--space-m) 0; }
</style>
