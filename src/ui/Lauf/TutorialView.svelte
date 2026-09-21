<script lang="ts">
  // Die Einführung beim ersten Öffnen eines Bereichs. Zwei Knöpfe:
  // „Verstanden" schließt nur für diesmal, „Nicht mehr anzeigen" für immer.
  import { DisciplineTutorials } from "../../kern/DisciplineTutorial";
  import { TrainingModes, type TrainingMode } from "../../kern/QuizTask";
  import TopBar from "../Bausteine/TopBar.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import Markiert from "../Bausteine/Markiert.svelte";
  import PrimaryButton from "../Bausteine/PrimaryButton.svelte";
  import SecondaryButton from "../Bausteine/SecondaryButton.svelte";

  interface Props { mode: TrainingMode; onUnderstood: () => void; onNeverAgain: () => void }
  let { mode, onUnderstood, onNeverAgain }: Props = $props();
  const tutorial = $derived(DisciplineTutorials.forMode(mode));
</script>

<div class="seite">
  <TopBar title={TrainingModes.title(mode)} />
  <div class="scroll">
    <div class="inhalt tutorial">
      <div class="kopf">
        <div class="t-label c-accent">So läuft es</div>
        <p class="t-body c-text">{tutorial.format}</p>
      </div>
      {#each tutorial.steps as step}
        <div class="schritt">
          <span class="symbol"><Icon name={step.symbol} size={18} /></span>
          <div class="text">
            <div class="t-headline c-text">{step.title}</div>
            <p class="t-body c-secondary"><Markiert text={step.text} /></p>
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="inhalt fuss">
    <PrimaryButton title="Verstanden" onclick={onUnderstood} />
    <SecondaryButton title="Nicht mehr anzeigen" onclick={onNeverAgain} />
  </div>
</div>

<style>
  .tutorial { padding-top: var(--space-l); padding-bottom: var(--space-xl); display: flex; flex-direction: column; gap: var(--space-l); }
  .kopf { display: flex; flex-direction: column; gap: var(--space-s); }
  .kopf .t-label { color: var(--accent); }
  p { margin: 0; }
  .schritt { display: flex; gap: var(--space-m); align-items: flex-start; }
  .symbol { width: 26px; display: grid; place-items: center; color: var(--accent); padding-top: 2px; flex: none; }
  .text { display: flex; flex-direction: column; gap: var(--space-xxs); }
  .fuss { display: flex; flex-direction: column; gap: var(--space-s); padding-top: var(--space-s); padding-bottom: calc(var(--space-l) + var(--sicher-unten)); flex: none; }
</style>
