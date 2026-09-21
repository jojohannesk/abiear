<script lang="ts">
  // Ein Alert wie in SwiftUI: Titel, Text, Knöpfe — lässt sich nicht durch
  // Tippen daneben schließen; hier soll bewusst entschieden werden.
  interface Knopf { titel: string; rolle?: "cancel" | "destructive" | "normal"; onclick: () => void }
  interface Props { offen: boolean; titel: string; text: string; knoepfe: Knopf[] }
  let { offen, titel, text, knoepfe }: Props = $props();
</script>

{#if offen}
  <div class="rand" role="presentation">
    <div class="alert karte" role="alertdialog" aria-modal="true" aria-labelledby="alert-titel">
      <div class="inhalt">
        <div id="alert-titel" class="t-headline">{titel}</div>
        <p class="t-small c-secondary">{text}</p>
      </div>
      <div class="knoepfe">
        {#each knoepfe as k}
          <button class="knopf druck druck--flach t-body-medium" class:destruktiv={k.rolle === "destructive"} class:cancel={k.rolle === "cancel"} onclick={k.onclick}>{k.titel}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .rand { position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, 0.55); display: grid; place-items: center; padding: var(--space-l); }
  .alert { width: 100%; max-width: 300px; overflow: hidden; animation: auf 0.16s ease-out; }
  .inhalt { padding: var(--space-l) var(--space-l) var(--space-m); text-align: center; display: flex; flex-direction: column; gap: var(--space-xs); }
  .inhalt p { margin: 0; }
  .knoepfe { display: flex; border-top: 1px solid var(--hairline); }
  .knopf { flex: 1; height: var(--touch-min); color: var(--accent); }
  .knopf + .knopf { border-left: 1px solid var(--hairline); }
  .knopf.destruktiv { color: var(--negative); }
  .knopf.cancel { color: var(--text); }
  @keyframes auf { from { transform: scale(0.96); opacity: 0; } }
</style>
