<script lang="ts">
  // Die Achteltriole: drei gebalkte Achtel mit der 3 darüber.
  interface Props { height?: number }
  let { height = 30 }: Props = $props();
  const xs = [4, 13, 22], headY = 29, beamY = 11;
</script>

<svg width={height * 30 / 36} {height} viewBox="0 0 30 36" role="img" aria-label="Achteltriole" class="glyph">
  {#each xs as x}
    <g transform="translate({x} {headY}) rotate(-20)"><ellipse rx="4.2" ry="3" fill="currentColor" /></g>
    <line x1={x + 4.1} y1={headY - 1} x2={x + 4.1} y2={beamY} stroke="currentColor" stroke-width="1.5" />
  {/each}
  <line x1={xs[0] + 4.1} y1={beamY} x2={xs[2] + 4.1} y2={beamY} stroke="currentColor" stroke-width="2.6" />
  <text x={xs[1] + 4.1} y="8" text-anchor="middle" font-size="11" font-style="italic" font-weight="500" fill="currentColor" font-family="var(--font)">3</text>
</svg>

<style>
  .glyph { display: block; }
</style>
