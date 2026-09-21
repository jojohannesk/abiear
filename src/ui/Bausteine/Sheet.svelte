<script lang="ts">
  // Ein Blatt von unten, wie `.sheet` in SwiftUI: bildschirmfüllend auf dem
  // Telefon, in Inhaltsbreite auf großen Bildschirmen. Escape und ein Tipp
  // auf den Rand schließen, wenn `dismissable`.
  import type { Snippet } from "svelte";

  interface Props {
    offen: boolean;
    dismissable?: boolean;
    onClose?: () => void;
    children: Snippet;
  }
  let { offen, dismissable = true, onClose, children }: Props = $props();

  function taste(e: KeyboardEvent) {
    if (e.key === "Escape" && dismissable && offen) onClose?.();
  }
</script>

<svelte:window onkeydown={taste} />

{#if offen}
  <div class="rand" role="presentation" onclick={(e) => { if (e.target === e.currentTarget && dismissable) onClose?.(); }}>
    <div class="blatt" role="dialog" aria-modal="true">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .rand {
    position: fixed; inset: 0; z-index: 40;
    background: rgba(0, 0, 0, 0.55);
    display: flex; align-items: flex-end; justify-content: center;
    animation: einblenden 0.18s ease-out;
  }
  .blatt {
    width: 100%; max-width: var(--inhaltsbreite); height: 100%;
    background: var(--base); display: flex; flex-direction: column;
    animation: hoch 0.24s ease-out;
  }
  @media (min-width: 700px) {
    .blatt { height: 92%; border-radius: var(--radius-card) var(--radius-card) 0 0; border: 1px solid var(--hairline); border-bottom: 0; overflow: hidden; }
  }
  @keyframes einblenden { from { opacity: 0; } }
  @keyframes hoch { from { transform: translateY(24px); opacity: 0; } }
</style>
