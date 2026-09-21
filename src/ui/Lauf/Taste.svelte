<script lang="ts">
  // Eine Taste des Tastenfelds — vertieft, aktiv im Akzent, aus wenn der
  // Wert nicht mehr in den Takt passt.
  import type { Snippet } from "svelte";
  interface Props { enabled?: boolean; active?: boolean; height?: number; label: string; onclick: () => void; children: Snippet }
  let { enabled = true, active = false, height = 44, label, onclick, children }: Props = $props();
</script>

<button class="taste" class:aktiv={active} disabled={!enabled} style="height: {height}px" aria-label={label} aria-pressed={active} {onclick}>
  {@render children()}
</button>

<style>
  .taste {
    flex: 1; display: grid; place-items: center;
    border-radius: var(--radius-control); background: var(--sunken); border: 1px solid var(--hairline); color: var(--text);
    transition: background 0.12s ease-out, color 0.12s ease-out, transform 0.12s ease-out;
  }
  .taste:active:not(:disabled) { transform: scale(0.96); }
  .taste.aktiv { background: var(--accent); border-color: transparent; color: var(--on-accent); }
  .taste:disabled { color: rgba(143, 150, 161, 0.5); }
</style>
