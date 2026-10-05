<script lang="ts">
  // Beschriftung der Punkt-Taste: Glyph und darunter das Wort. Das Symbol
  // allein las sich für mehrere Tester wie ein weiterer Notenwert.
  import NoteGlyph from "./NoteGlyph.svelte";
  interface Props { height?: number }
  let { height = 20 }: Props = $props();
</script>

<span class="punkt" aria-hidden="true">
  <NoteGlyph value="quarter" dotted {height} />
  <span class="wort">Punkt</span>
</span>

<style>
  .punkt { display: flex; flex-direction: column; align-items: center; gap: 1px; }
  .wort { font-size: 10px; font-weight: 600; line-height: 1; }
</style>
