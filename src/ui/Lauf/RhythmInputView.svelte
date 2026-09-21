<script lang="ts">
  // Notenzeile und Tastenfeld für das Rhythmusdiktat. Notiert wird während
  // der Wiedergabe; die Punktierung gilt für den nächsten Ton.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { NoteValues } from "../../kern/DictationEntry";
  import { AbcNotation } from "../../kern/AbcNotation";
  import Notenbild from "../Bausteine/Notenbild.svelte";
  import NoteGlyph from "../Bausteine/NoteGlyph.svelte";
  import TripletGlyph from "../Bausteine/TripletGlyph.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import BeatStrip from "./BeatStrip.svelte";
  import Taste from "./Taste.svelte";

  interface Props { store: QuizStore }
  let { store }: Props = $props();
  let dotted = $state(false);
  const entry = $derived(store.rhythmEntry);
</script>

<div class="eingabe">
  <div class="staff">
    <Notenbild abc={AbcNotation.entryToAbc(entry)} staffWidth={300} maxHeight={190} beschreibung={AbcNotation.entryBeschreibung(entry, null)} />
  </div>
  <BeatStrip {entry} onSelect={(b) => store.moveRhythmCursor(b)} />
  <div class="tastenfeld">
    <div class="reihe">
      {#each NoteValues.all as value}
        <Taste enabled={entry.fits(value, dotted)} height={50} label={dotted ? `Punktierte ${NoteValues.title(value)}` : NoteValues.title(value)}
          onclick={() => { store.appendRhythm(value, dotted); dotted = false; }}>
          <NoteGlyph {value} {dotted} height={28} />
        </Taste>
      {/each}
    </div>
    <div class="reihe">
      <Taste active={dotted} height={50} label="Punktierung" onclick={() => (dotted = !dotted)}>
        <NoteGlyph value="quarter" dotted height={26} />
      </Taste>
      <Taste enabled={entry.fitsTriplet} height={50} label="Achteltriole" onclick={() => { store.appendRhythmTriplet(); dotted = false; }}>
        <TripletGlyph height={26} />
      </Taste>
      <Taste enabled={entry.canRemoveAtCursor} height={50} label="Rücktaste" onclick={() => store.removeLastRhythmNote()}>
        <Icon name="delete.left" size={22} weight={1.6} />
      </Taste>
    </div>
  </div>
</div>

<style>
  .eingabe { display: flex; flex-direction: column; gap: var(--space-xxs); }
  .staff { height: 176px; display: flex; }
  .tastenfeld { display: flex; flex-direction: column; gap: var(--space-xs); }
  .reihe { display: flex; gap: var(--space-xs); }
</style>
