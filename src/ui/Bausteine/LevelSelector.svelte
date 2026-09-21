<script lang="ts">
  // Dreistufige Auswahl des Diktatniveaus — offen, kein Dialog.
  import { DictationLevels, type DictationLevel } from "../../kern/DictationLevel";
  import type { Kind } from "../../kern/QuizTask";
  import { Haptics } from "../../plattform/Haptik";

  interface Props {
    title: string;
    kind: Kind;
    selection: DictationLevel;
    onselect: (level: DictationLevel) => void;
  }
  let { title, kind, selection, onselect }: Props = $props();
  const summary = $derived(DictationLevels.summary(selection, kind) + (selection === "abitur" ? "" : " · Prüfungsniveau: Abi"));
</script>

<div class="niveau">
  <div class="zeile">
    <span class="titel t-small">{title}</span>
    <div class="stufen" role="radiogroup" aria-label={title}>
      {#each DictationLevels.all as level}
        <button
          class="stufe druck"
          class:aktiv={selection === level}
          role="radio"
          aria-checked={selection === level}
          aria-label="{title}: {DictationLevels.title(level)}"
          onclick={() => { onselect(level); Haptics.select(); }}
        ><span class="t-small-medium">{DictationLevels.shortTitle(level)}</span></button>
      {/each}
    </div>
  </div>
  <p class="summary t-tiny">{summary}</p>
</div>

<style>
  .niveau { display: flex; flex-direction: column; gap: var(--space-xs); }
  .zeile { display: flex; align-items: center; gap: var(--space-s); }
  .titel { width: 66px; flex: none; color: var(--text-secondary); }
  .stufen { flex: 1; display: flex; gap: var(--space-xxs); }
  .stufe {
    flex: 1; height: var(--touch-min); display: grid; place-items: center;
  }
  .stufe span {
    display: grid; place-items: center; width: 100%; height: 32px; border-radius: 8px;
    background: var(--sunken); color: var(--text-secondary);
    transition: background 0.16s ease-out, color 0.16s ease-out;
    white-space: nowrap;
  }
  .stufe.aktiv span { background: var(--accent); color: var(--on-accent); }
  .stufe:active { transform: scale(0.96); }
  .summary { margin: 0; color: var(--text-tertiary); }
</style>
