<script lang="ts">
  // Welche Takte im laufenden Durchgang erklingen — schlanke Segmente.
  interface Props { activeBars: readonly number[]; barCount?: number }
  let { activeBars, barCount = 4 }: Props = $props();
  const label = $derived(activeBars.length === 4 ? "Alle vier Takte" : "Takt " + activeBars.map((b) => String(b + 1)).join(" und "));
</script>

<div class="segmente" role="img" aria-label={label}>
  {#each Array.from({ length: barCount }, (_, b) => b) as bar}
    {@const aktiv = activeBars.includes(bar)}
    <div class="segment" class:aktiv>
      <div class="balken"></div>
      <div class="nummer t-tiny ziffern">{bar + 1}</div>
    </div>
  {/each}
</div>

<style>
  .segmente { display: flex; gap: 4px; }
  .segment { flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--space-xs); }
  .balken { width: 100%; height: 3px; border-radius: 1.5px; background: var(--hairline-strong); transition: background 0.2s ease-out; }
  .segment.aktiv .balken { background: var(--accent); }
  .nummer { color: var(--text-tertiary); opacity: 0.6; transition: color 0.2s, opacity 0.2s; }
  .segment.aktiv .nummer { color: var(--text-secondary); opacity: 1; }
</style>
