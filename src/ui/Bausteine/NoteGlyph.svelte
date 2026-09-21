<script lang="ts">
  // Notensymbole für das Tastenfeld — gezeichnet, nicht aus einer Schrift.
  // Alle Maße beziehen sich auf ein Feld von 22 × 36 Einheiten.
  import { NoteValues, type NoteValue } from "../../kern/DictationEntry";

  interface Props { value: NoteValue; dotted?: boolean; height?: number }
  let { value, dotted = false, height = 30 }: Props = $props();

  const hx = 6.5, hy = 29, stemX = 11.4, stemTop = 5;
  const flags = $derived(value === "eighth" ? 1 : value === "sixteenth" ? 2 : 0);
  const label = $derived(dotted ? `Punktierte ${NoteValues.title(value)}` : NoteValues.title(value));
</script>

<svg width={height * 22 / 36} {height} viewBox="0 0 22 36" role="img" aria-label={label} class="glyph">
  <g transform="translate({hx} {hy}) rotate(-20)">
    {#if value === "half"}
      <ellipse rx="5.6" ry="3.9" fill="none" stroke="currentColor" stroke-width="2.2" />
    {:else}
      <ellipse rx="5.6" ry="3.9" fill="currentColor" />
    {/if}
  </g>
  <line x1={stemX} y1={hy - 1.2} x2={stemX} y2={stemTop} stroke="currentColor" stroke-width="1.7" />
  {#each Array.from({ length: flags }, (_, i) => stemTop + i * 6.5) as y}
    <path d="M{stemX} {y} Q{stemX + 7.5} {y + 1.5} {stemX + 6.5} {y + 9}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
  {/each}
  {#if dotted}<circle cx={hx + 9.6} cy={hy} r="1.6" fill="currentColor" />{/if}
</svg>

<style>
  .glyph { display: block; }
</style>
