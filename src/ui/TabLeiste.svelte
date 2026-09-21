<script lang="ts">
  // Die vier Tabs unten: Üben, Lernen, Statistik, Mehr. Selbst gezeichnet.
  import Icon from "./Bausteine/Icon.svelte";
  import { Tabs, type Tab } from "./Symbole";
  import { Haptics } from "../plattform/Haptik";

  interface Props { auswahl: Tab; onselect: (tab: Tab) => void }
  let { auswahl, onselect }: Props = $props();
</script>

<nav class="leiste" aria-label="Bereiche">
  {#each Tabs.all as tab}
    {@const aktiv = tab === auswahl}
    <button class="tab" class:aktiv aria-label={Tabs.titel(tab)} aria-current={aktiv ? "page" : undefined}
      onclick={() => { if (aktiv) return; onselect(tab); Haptics.select(); }}>
      <span class="symbol"><Icon name={Tabs.symbol(tab, aktiv)} size={20} weight={aktiv ? 2.2 : 1.8} /></span>
      <span class="t-tiny">{Tabs.titel(tab)}</span>
    </button>
  {/each}
</nav>

<style>
  .leiste {
    display: flex; flex: none;
    padding-top: var(--space-xxs);
    padding-bottom: var(--sicher-unten);
    background: var(--raised);
    border-top: 1px solid var(--hairline);
  }
  .tab {
    flex: 1; min-height: var(--touch-primary);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    color: var(--text-tertiary);
  }
  .tab.aktiv { color: var(--accent); }
  .symbol { height: 24px; display: grid; place-items: center; }
</style>
