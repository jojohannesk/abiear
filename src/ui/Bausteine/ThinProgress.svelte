<script lang="ts">
  // Haarfeiner Fortschrittsbalken, 0 … 1.
  interface Props { fraction: number; tint?: "accent" | "tertiary" | "positive" | "negative" }
  let { fraction, tint = "accent" }: Props = $props();
  const breite = $derived(Math.min(1, Math.max(0, fraction)) * 100);
</script>

<div class="spur"><div class="fuellung tint-{tint}" style="width: {breite}%"></div></div>

<style>
  .spur { height: 2px; background: var(--hairline); position: relative; overflow: hidden; }
  .fuellung { position: absolute; left: 0; top: 0; bottom: 0; transition: width 0.3s ease-out; }
  .tint-accent { background: var(--accent); }
  .tint-tertiary { background: var(--text-tertiary); }
  .tint-positive { background: var(--positive); }
  .tint-negative { background: var(--negative); }
</style>
