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

  let papier: HTMLDivElement;
  let paper: HTMLDivElement;
  let bereit = $state(false);

  /** abcjs skaliert das Bild auf die volle Breite. Auf breiten Bildschirmen
   *  wird es dadurch höher als der Platz, den das Layout ihm lässt
   *  (`maxHeight` oder ein fester Rahmen darum), und die zweite Notenzeile
   *  läge unter dem Rand. Dann die Breite so begrenzen, dass die Höhe passt.
   *  Gemessen wird nach dem Zeichnen in voller Breite — so steht `papier`
   *  auf der Höhe, die es tatsächlich bekommt. */
  function breiteBegrenzen() {
    const svg = paper?.querySelector("svg");
    const vb = svg?.viewBox?.baseVal;
    if (!svg || !vb || vb.width <= 0 || vb.height <= 0) return;
    const stil = getComputedStyle(papier);
    const platz = Math.min(maxHeight, papier.clientHeight) - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom);
    // Unsichtbar (noch nicht im Layout) misst alles null — dann nichts tun.
    if (platz <= 0 || svg.getBoundingClientRect().height <= platz + 0.5) return;
    paper.style.maxWidth = `${Math.floor(platz * vb.width / vb.height)}px`;
  }

  interface AbcjsGlobal { renderAbc: (el: HTMLElement, abc: string, params: Record<string, unknown>) => unknown }

  function zeichne() {
    const lib = (globalThis as unknown as { ABCJS?: AbcjsGlobal }).ABCJS;
    if (!lib || !paper) return;
    paper.style.maxWidth = "";
    try {
      lib.renderAbc(paper, abc, {
        responsive: "resize", staffwidth: staffWidth, add_classes: true,
        paddingtop: 2, paddingbottom: 6, paddingleft: 0, paddingright: 0,
      });
      breiteBegrenzen();
      bereit = true;
    } catch {
      paper.textContent = "Notendarstellung nicht verfügbar.";
    }
  }

  onMount(() => { zeichne(); });
  $effect(() => { void abc; void staffWidth; void maxHeight; zeichne(); });
</script>

<div class="papier" bind:this={papier} style="max-height: {maxHeight}px" role="img" aria-label={beschreibung}>
  <div class="paper" bind:this={paper} class:bereit></div>
</div>

<style>
  .papier { background: var(--paper); border-radius: var(--radius-card); padding: var(--space-xs); overflow: hidden; width: 100%; text-align: center; }
  .paper { position: relative; color: #000; margin: 0 auto; }
  .paper :global(svg) { max-width: 100%; height: auto; display: block; }
</style>
