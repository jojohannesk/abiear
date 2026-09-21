<script lang="ts">
  // Hauptknopf: gefüllt im Akzent, ruhige Höhe, keine Leuchteffekte.
  import Icon from "./Icon.svelte";
  import { Haptics } from "../../plattform/Haptik";

  interface Props {
    title: string;
    symbol?: string | null;
    imageTrailing?: boolean;
    enabled?: boolean;
    onclick: () => void;
  }
  let { title, symbol = null, imageTrailing = false, enabled = true, onclick }: Props = $props();
</script>

<button
  class="primary druck"
  class:aus={!enabled}
  disabled={!enabled}
  onpointerdown={() => { if (enabled) Haptics.tap(); }}
  onclick={() => { if (enabled) onclick(); }}
>
  {#if symbol && !imageTrailing}<Icon name={symbol} size={14} weight={2.4} />{/if}
  <span class="t-headline">{title}</span>
  {#if symbol && imageTrailing}<Icon name={symbol} size={14} weight={2.4} />{/if}
</button>

<style>
  .primary {
    display: flex; align-items: center; justify-content: center; gap: var(--space-xs);
    width: 100%; height: var(--touch-primary);
    border-radius: var(--radius-control);
    background: var(--accent); color: var(--on-accent);
    border: 1px solid transparent;
    transition: background 0.15s ease-out, color 0.15s ease-out, transform 0.12s ease-out, opacity 0.12s ease-out;
  }
  .primary.aus { background: var(--sunken); color: var(--text-tertiary); border-color: var(--hairline); }
  .primary.aus:active { transform: none; opacity: 1; }
</style>
