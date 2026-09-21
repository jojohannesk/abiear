<script lang="ts">
  // Die Tonleiter als Spalte neben dem Notensystem — dort wird die Tonhöhe
  // gewählt. Hoch ist oben, der Grundton hervorgehoben.
  import type { MusicKey } from "../../kern/MusicData";
  import { AbcNotation } from "../../kern/AbcNotation";

  interface Props {
    key: MusicKey;
    tonic: number;
    window: { lower: number; upper: number };
    rowHeight: number;
    onSelect: (degree: number) => void;
  }
  let { key, tonic, window, rowHeight, onSelect }: Props = $props();

  const degrees = $derived.by(() => {
    const out: number[] = [];
    for (let d = window.upper; d >= window.lower; d--) out.push(tonic + d);
    return out;
  });
</script>

<div class="spalte" role="group" aria-label="Tonleiter {key.name}">
  {#each degrees as degree}
    {@const istTonika = (degree - tonic) % 7 === 0}
    {@const name = AbcNotation.germanNameOfDegree(degree, key)}
    <button class="zeile druck" class:tonika={istTonika} style="height: {rowHeight}px; font-size: {Math.min(13, rowHeight * 0.62)}px"
      onclick={() => onSelect(degree)} aria-label={name + (istTonika ? ", Grundton" : "")}>{name}</button>
  {/each}
</div>

<style>
  .spalte { width: 46px; flex: none; display: flex; flex-direction: column; gap: 1px; }
  .zeile { width: 100%; border-radius: 5px; background: var(--sunken); color: var(--text); display: grid; place-items: center; font-weight: 400; }
  .zeile.tonika { background: var(--accent-dim); color: var(--accent); font-weight: 600; }
  .zeile:active { transform: scale(0.94); }
</style>
