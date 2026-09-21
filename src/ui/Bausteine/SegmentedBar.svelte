<script lang="ts">
  // Segmentierte Auswahl: Beschriftungen mit Unterstrich statt Pillen.
  import { Haptics } from "../../plattform/Haptik";

  interface Props {
    titles: readonly string[];
    selection: number;
    onselect: (i: number) => void;
  }
  let { titles, selection, onselect }: Props = $props();
</script>

<div class="segmente">
  {#each titles as t, i}
    <button class="segment" class:aktiv={selection === i} onclick={() => { onselect(i); Haptics.select(); }}>
      <span class="t-small-medium">{t}</span>
      <span class="strich"></span>
    </button>
  {/each}
</div>

<style>
  .segmente { display: flex; border-bottom: 1px solid var(--hairline); }
  .segment {
    flex: 1; height: 40px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: var(--space-xs);
    color: var(--text-tertiary); transition: color 0.18s ease-out;
  }
  .segment.aktiv { color: var(--text); }
  .strich { display: block; width: 100%; height: 2px; background: transparent; transition: background 0.18s ease-out; }
  .segment.aktiv .strich { background: var(--accent); }
</style>
