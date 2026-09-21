<script lang="ts">
  // Notenanzeige über abcjs — hier direkt in der Seite, ohne den
  // WKWebView-Umweg der iOS-App. Die Bibliothek liegt als `abcjs-basic-min.js`
  // neben der Seite und wird in `index.html` geladen (global `ABCJS`).
  //
  // `staffWidth` ist die interne Bezugsbreite; das SVG wird auf die
  // Containerbreite skaliert — kleiner heißt größere Noten.
  import { onMount } from "svelte";

  interface Props {
    abc: string;
    staffWidth?: number;
    maxHeight?: number;
    /** Was ein Screenreader vorliest — aus dem Modell, nicht aus dem ABC. */
    beschreibung?: string;
  }
  let { abc, staffWidth = 260, maxHeight = 380, beschreibung = "Notenbild" }: Props = $props();

  let paper: HTMLDivElement;
  let bereit = $state(false);

  interface AbcjsGlobal { renderAbc: (el: HTMLElement, abc: string, params: Record<string, unknown>) => unknown }

  function zeichne() {
    const lib = (globalThis as unknown as { ABCJS?: AbcjsGlobal }).ABCJS;
    if (!lib || !paper) return;
    try {
      lib.renderAbc(paper, abc, {
        responsive: "resize", staffwidth: staffWidth, add_classes: true,
        paddingtop: 2, paddingbottom: 6, paddingleft: 0, paddingright: 0,
      });
      bereit = true;
    } catch {
      paper.textContent = "Notendarstellung nicht verfügbar.";
    }
  }

  onMount(() => { zeichne(); });
  $effect(() => { void abc; void staffWidth; zeichne(); });
</script>

<div class="papier" style="max-height: {maxHeight}px" role="img" aria-label={beschreibung}>
  <div class="paper" bind:this={paper} class:bereit></div>
</div>

<style>
  .papier { background: var(--paper); border-radius: var(--radius-card); padding: var(--space-xs); overflow: hidden; width: 100%; }
  .paper { position: relative; color: #000; }
  .paper :global(svg) { max-width: 100%; height: auto; display: block; }
</style>
