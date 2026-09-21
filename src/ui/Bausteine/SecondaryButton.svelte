<script lang="ts">
  // Nebenknopf: nur Haarlinie, kein Füllton.
  import Icon from "./Icon.svelte";
  import { Haptics } from "../../plattform/Haptik";

  interface Props {
    title: string;
    symbol?: string | null;
    tint?: "text" | "accent" | "negative";
    onclick: () => void;
  }
  let { title, symbol = null, tint = "text", onclick }: Props = $props();
</script>

<button class="secondary karte karte--sunken karte--control druck tint-{tint}" onpointerdown={() => Haptics.tap()} {onclick}>
  {#if symbol}<Icon name={symbol} size={13} weight={2} />{/if}
  <span class="t-body-medium">{title}</span>
</button>

<style>
  .secondary {
    display: flex; align-items: center; justify-content: center; gap: var(--space-xs);
    width: 100%; height: var(--touch-min);
  }
  .tint-text { color: var(--text); }
  .tint-accent { color: var(--accent); }
  .tint-negative { color: var(--negative); }
</style>
