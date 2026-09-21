<script lang="ts">
  // Die vier Vorzähler-Schläge als kleine Striche.
  interface Props { activeBeat: number | null }
  let { activeBeat }: Props = $props();
</script>

<div class="punkte" aria-hidden="true">
  {#each [0, 1, 2, 3] as beat}
    <div class="punkt" class:an={activeBeat === beat}></div>
  {/each}
</div>

<style>
  .punkte { display: flex; gap: var(--space-s); align-items: center; }
  .punkt { width: 12px; height: 3px; border-radius: 2px; background: var(--hairline-strong); transition: width 0.1s ease-out, background 0.1s ease-out; }
  .punkt.an { width: 18px; background: var(--accent); }
</style>
