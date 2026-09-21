<script lang="ts">
  // Sechzehn Schlagfelder unter der Notenzeile — das einzige Ziel für die
  // Schreibmarke. Man sieht, welche Schläge noch offen sind.
  import type { DictationEntry } from "../../kern/DictationEntry";

  interface Props { entry: DictationEntry; onSelect: (beat: number) => void }
  let { entry, onSelect }: Props = $props();
</script>

<div class="leiste" role="group" aria-label="Schläge">
  {#each Array.from({ length: entry.barCount }, (_, b) => b) as bar}
    <div class="takt">
      {#each [0, 1, 2, 3] as offset}
        {@const beat = bar * 4 + offset}
        {@const istMarke = entry.currentBeat === beat}
        {@const belegt = entry.hasNote(beat)}
        <button class="feld" class:marke={istMarke} class:belegt onclick={() => onSelect(beat)}
          aria-label="Takt {bar + 1}, Schlag {offset + 1}" aria-pressed={istMarke}>
          <span class="kasten"></span>
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .leiste { display: flex; gap: var(--space-xs); }
  .takt { flex: 1; display: flex; gap: 2px; }
  .feld { flex: 1; padding: 12px 0; display: block; }
  .kasten {
    display: block; height: 16px; border-radius: 3px;
    border: 1px solid var(--hairline-strong); background: transparent;
    transition: background 0.12s ease-out, border-color 0.12s ease-out;
  }
  .feld.belegt .kasten { background: var(--text-secondary); }
  .feld.marke .kasten { border: 2px solid var(--accent); }
  .feld.marke:not(.belegt) .kasten { background: var(--accent-dim); }
</style>
