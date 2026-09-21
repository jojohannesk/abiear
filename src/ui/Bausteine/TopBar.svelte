<script lang="ts">
  // Schlanke Kopfzeile mit Haarlinie. Links Abbrechen, mittig der Titel,
  // rechts ein Zähler oder nichts. Aus `Components.swift`.
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  interface Props {
    title: string;
    onClose?: (() => void) | null;
    trailing?: Snippet;
  }
  let { title, onClose = null, trailing }: Props = $props();
</script>

<header class="topbar">
  <div class="links">
    {#if onClose}
      <button class="schliessen druck druck--flach" onclick={onClose} aria-label="Schließen">
        <Icon name="xmark" size={14} weight={2.2} />
      </button>
    {/if}
  </div>
  <div class="titel t-small-medium">{title}</div>
  <div class="rechts">{#if trailing}{@render trailing()}{/if}</div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: var(--space-m);
    height: 48px;
    padding: 0 var(--space-m);
    padding-top: var(--sicher-oben);
    box-sizing: content-box;
    background: var(--base);
    border-bottom: 1px solid var(--hairline);
    flex: none;
  }
  .links { width: var(--touch-min); display: flex; justify-content: flex-start; }
  .rechts { min-width: var(--touch-min); display: flex; justify-content: flex-end; }
  .titel { flex: 1; text-align: center; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .schliessen {
    width: var(--touch-min); height: var(--touch-min);
    display: grid; place-items: center;
    color: var(--text-secondary);
  }
</style>
