<script lang="ts">
  // Symbole. Die iOS-App nutzt SF Symbols; hier stehen dieselben Namen und
  // eigene Strichzeichnungen im 24er-Raster, `currentColor`, keine
  // Bibliothek. Ein unbekannter Name zeichnet einen Kreis — sichtbar,
  // nicht stumm.
  interface Props {
    name: string;
    size?: number;
    weight?: number;
  }
  let { name, size = 16, weight = 1.8 }: Props = $props();

  const pfade: Record<string, string> = {
    "xmark": "M6 6l12 12M18 6L6 18",
    "chevron.right": "M9 5l7 7-7 7",
    "arrow.right": "M4 12h16m-6-6l6 6-6 6",
    "play.fill": "M7 4.5v15l12-7.5z",
    "play.circle": "M12 3a9 9 0 110 18 9 9 0 010-18zm-2 5.5v7l6-3.5z",
    "checkmark.circle": "M12 3a9 9 0 110 18 9 9 0 010-18zm-4 9l3 3 5-6",
    "checkmark.circle.fill": "M12 3a9 9 0 110 18 9 9 0 010-18zm-4 9l3 3 5-6",
    "checkmark.seal": "M12 2.5l2.2 1.7 2.7-.4 1 2.6 2.4 1.3-.5 2.7 1.7 2.1-1.7 2.1.5 2.7-2.4 1.3-1 2.6-2.7-.4L12 21.5l-2.2-1.7-2.7.4-1-2.6-2.4-1.3.5-2.7L2.5 12l1.7-2.1-.5-2.7 2.4-1.3 1-2.6 2.7.4zM8.5 12l2.5 2.5 4.5-5",
    "questionmark.circle": "M12 3a9 9 0 110 18 9 9 0 010-18zm-2.5 6.5a2.5 2.5 0 015 0c0 1.6-2.5 2-2.5 3.5M12 16.5v.5",
    "info.circle": "M12 3a9 9 0 110 18 9 9 0 010-18zm0 5v.5m0 3v5",
    "ellipsis.circle": "M12 3a9 9 0 110 18 9 9 0 010-18zM8 12h.01M12 12h.01M16 12h.01",
    "ellipsis.circle.fill": "M12 3a9 9 0 110 18 9 9 0 010-18zM8 12h.01M12 12h.01M16 12h.01",
    "arrow.clockwise": "M19 12a7 7 0 11-2-4.9M19 4v4h-4",
    "arrow.up.arrow.down": "M8 20V5m0 0L4.5 8.5M8 5l3.5 3.5M16 4v15m0 0l3.5-3.5M16 19l-3.5-3.5",
    "arrow.up.left.and.arrow.down.right": "M4 10V4h6M4 4l6 6M20 14v6h-6m6 0l-6-6",
    "arrow.triangle.branch": "M6 20V8m0 0a3 3 0 100-6 3 3 0 000 6zm0 12a3 3 0 100 0M6 14c0-3 3-4 6-4h3m0 0l-2.5-2.5M15 10l-2.5 2.5M18 10a3 3 0 100 0",
    "waveform": "M3 12h1m2-4v8m3-11v14m3-9v4m3-8v12m3-9v6m3-3h1",
    "waveform.path": "M2 12h3l2-6 3 12 3-14 3 10 2-4h4",
    "chart.bar": "M4 20h16M6 20v-7m6 7V6m6 14v-10",
    "chart.bar.fill": "M4 20h16M6 20v-7m6 7V6m6 14v-10",
    "book": "M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zm0 0V20.5M20 18v3H6.5",
    "book.fill": "M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zm0 0V20.5M20 18v3H6.5",
    "flame.fill": "M12 3c1 3 4 5 4 9a4 4 0 01-8 0c0-1.5.6-2.5 1.5-3.5.3 1.2 1 2 2 2.3C12 8.5 11 6 12 3z",
    "circle.dashed": "M12 3a9 9 0 019 9M21 12a9 9 0 01-9 9M12 21a9 9 0 01-9-9M3 12a9 9 0 019-9",
    "delete.left": "M9 5h12v14H9l-6-7zm4.5 3.5l5 5m0-5l-5 5",
    "speaker.slash": "M4 9v6h3l5 4V5L7 9zM15 9l6 6m0-6l-6 6",
    "timer": "M12 21a8 8 0 110-16 8 8 0 010 16zm0-8V9M10 2h4M18 5l1.5 1.5",
    "target": "M12 3a9 9 0 110 18 9 9 0 010-18zm0 5a4 4 0 110 8 4 4 0 010-8zm0 4h.01",
    "location": "M12 21s-6-6-6-11a6 6 0 0112 0c0 5-6 11-6 11zm0-9a2 2 0 100-4 2 2 0 000 4z",
    "eye": "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
    "hand.tap": "M10 12V6a1.5 1.5 0 013 0v6m0-3a1.5 1.5 0 013 0v3m0-1.5a1.5 1.5 0 013 0v4a5 5 0 01-5 5h-2a5 5 0 01-4.5-2.8L6 15a1.5 1.5 0 012.5-1.6L10 15M8 4.5A4 4 0 0111 3m-4 3a5 5 0 011.5-3",
    "hand.raised": "M8 12V6a1.5 1.5 0 013 0v5m0-6.5a1.5 1.5 0 013 0V11m0-4a1.5 1.5 0 013 0v7a6 6 0 01-6 6h-1a6 6 0 01-5.2-3L3.5 13a1.5 1.5 0 012.5-1.5L8 13",
    "music.note": "M9 18a3 3 0 11-2-2.8V5l10-2v12a3 3 0 11-2-2.8V6.5l-6 1.2",
    "music.mic": "M9 4a3 3 0 016 0v6a3 3 0 01-6 0zm-3 6a6 6 0 0012 0M12 16v4m-4 0h8",
    "music.quarternote.3": "M6 17a2 2 0 11-1.5-1.9V6m6 11a2 2 0 11-1.5-1.9V6m6 11a2 2 0 11-1.5-1.9V6",
    "metronome": "M8 21h8l-2-15h-4zM12 6V3M8 21l7-14M12 16h1",
    "pianokeys": "M3 5h18v14H3zm4 0v9m5-9v9m5-9v9",
    "textformat.abc": "M3 16l2.5-8 2.5 8m-4-2.5h3M12 8v8m0-4a2 2 0 110 4h-1m5-3a2 2 0 100 3",
    "pencil.line": "M4 20h16M6 16l10-10 2 2L8 18H6z",
    "quote.bubble": "M4 5h16v11H9l-4 3zM8 9h2v2H8zm5 0h2v2h-2z",
    "face.smiling": "M12 3a9 9 0 110 18 9 9 0 010-18zM9 10h.01M15 10h.01M8.5 14a4.5 4.5 0 007 0",
    "tram.fill": "M6 5h12v11H6zM6 10h12M8 20l-1.5 2M16 20l1.5 2M8 16v2m8-2v2M9 3h6",
    "square.stack.3d.up": "M12 4l8 4-8 4-8-4zm-8 8l8 4 8-4M4 16l8 4 8-4",
    "square.grid.3x1.below.line.grid.1x2": "M4 4h16M4 9h7v11H4zm9 0h7v5h-7zm0 7h7v4h-7z",
    "list.bullet.indent": "M4 7h.01M8 7h12M6 12h.01M10 12h10M4 17h.01M8 17h12",
    "dot.square": "M4 4h16v16H4zm8 8h.01",
    "bell.fill": "M12 4a5 5 0 015 5v3l2 3H5l2-3V9a5 5 0 015-5zm-2 14a2 2 0 004 0",
    "person.text.rectangle": "M3 5h18v14H3zm3 9a2.5 2.5 0 015 0v1H6zm2.5-6a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM14 9h4m-4 4h4",
    "checkmark": "M5 12l4.5 4.5L19 7",
    "circle": "M12 3a9 9 0 110 18 9 9 0 010-18z",
  };

  const gefuellt = new Set(["play.fill", "flame.fill", "checkmark.circle.fill", "chart.bar.fill", "book.fill", "ellipsis.circle.fill", "tram.fill", "bell.fill"]);
  const d = $derived(pfade[name] ?? pfade.circle);
  const fill = $derived(gefuellt.has(name) ? (name === "play.fill" || name === "flame.fill" ? "currentColor" : "none") : "none");
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={fill}
  stroke="currentColor"
  stroke-width={weight}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
  class="icon"
><path d={d} /></svg>

<style>
  .icon { display: inline-block; vertical-align: middle; flex: none; }
</style>
