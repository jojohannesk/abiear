<script lang="ts">
  // Zeile mit Symbol, Titel, rechter Angabe und Pfeil — durch Haarlinien
  // getrennt statt als eigene Karte.
  import Icon from "./Icon.svelte";
  import { Haptics } from "../../plattform/Haptik";

  interface Props {
    symbol: string;
    title: string;
    detail: string;
    onclick: () => void;
  }
  let { symbol, title, detail, onclick }: Props = $props();
</script>

<button class="row druck druck--flach" onpointerdown={() => Haptics.tap()} {onclick}>
  <span class="symbol"><Icon name={symbol} size={16} /></span>
  <span class="titel t-body-medium">{title}</span>
  <span class="detail t-small">{detail}</span>
  <span class="pfeil"><Icon name="chevron.right" size={11} weight={2.6} /></span>
</button>

<style>
  .row {
    display: flex; align-items: center; gap: var(--space-m);
    width: 100%; height: 56px; padding: 0 var(--space-m);
    text-align: left;
  }
  .symbol { width: 24px; display: grid; place-items: center; color: var(--accent); }
  .titel { flex: 1; color: var(--text); min-width: 0; }
  .detail { color: var(--text-tertiary); white-space: nowrap; }
  .pfeil { color: var(--text-tertiary); opacity: 0.7; display: grid; place-items: center; }
</style>
