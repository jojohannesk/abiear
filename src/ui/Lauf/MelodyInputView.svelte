<script lang="ts">
  // Tonleiterspalte, Notenzeile, Schlag-Leiste und Tastenfeld für das
  // Melodiediktat. Erst der Wert, dann die Tonhöhen.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import type { MelodyDictation } from "../../kern/MusicData";
  import type { DictationLevel } from "../../kern/DictationLevel";
  import { NoteValues, type NoteValue } from "../../kern/DictationEntry";
  import { AbcNotation } from "../../kern/AbcNotation";
  import { MelodyGenerator } from "../../kern/MelodyGenerator";
  import Notenbild from "../Bausteine/Notenbild.svelte";
  import NoteGlyph from "../Bausteine/NoteGlyph.svelte";
  import TripletGlyph from "../Bausteine/TripletGlyph.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import BeatStrip from "./BeatStrip.svelte";
  import PitchColumn from "./PitchColumn.svelte";
  import Taste from "./Taste.svelte";

  interface Props { store: QuizStore; melody: MelodyDictation; level: DictationLevel }
  let { store, melody, level }: Props = $props();

  let value = $state<NoteValue>("quarter");
  let dotted = $state(false);
  let triplet = $state(false);

  const staffHeight = 196;
  const tonic = $derived(MelodyGenerator.tonicDegree(melody.notes[0]?.midiNumber ?? 60, melody.key) ?? 0);
  const window = $derived(MelodyGenerator.pitchWindow(level));
  const rowHeight = $derived.by(() => {
    const zeilen = window.upper - window.lower + 1;
    return Math.floor((staffHeight - (zeilen - 1)) / zeilen);
  });
  const entry = $derived(store.melodyEntry);

  function tonhoehe(degree: number) {
    if (triplet) store.placeMelodyTripletMember(degree);
    else store.placeMelodyNote(degree, value, dotted);
  }
</script>

<div class="eingabe">
  <div class="oben">
    <PitchColumn key={melody.key} {tonic} {window} {rowHeight} onSelect={tonhoehe} />
    <div class="staff">
      <Notenbild abc={AbcNotation.entryToAbcWithKey(entry, melody.key)} staffWidth={300} maxHeight={staffHeight - 20}
        beschreibung={AbcNotation.entryBeschreibung(entry, melody.key)} />
    </div>
  </div>
  <BeatStrip {entry} onSelect={(b) => store.moveMelodyCursor(b)} />
  <div class="reihe">
    {#each NoteValues.all as wert}
      <Taste active={!triplet && value === wert} label={NoteValues.title(wert)} onclick={() => { value = wert; triplet = false; }}>
        <NoteGlyph value={wert} height={26} />
      </Taste>
    {/each}
    <Taste active={dotted} enabled={!triplet} label="Punktierung" onclick={() => (dotted = !dotted)}>
      <NoteGlyph value="quarter" dotted height={24} />
    </Taste>
    <Taste active={triplet} label="Achteltriole" onclick={() => { triplet = !triplet; if (triplet) dotted = false; }}>
      <TripletGlyph height={24} />
    </Taste>
    <Taste enabled={entry.canRemoveAtCursor} label="Rücktaste" onclick={() => store.removeLastMelodyNote()}>
      <Icon name="delete.left" size={20} weight={1.6} />
    </Taste>
  </div>
</div>

<style>
  .eingabe { display: flex; flex-direction: column; gap: var(--space-xxs); }
  .oben { display: flex; gap: var(--space-xs); align-items: flex-start; }
  .staff { flex: 1; min-width: 0; height: 196px; display: flex; }
  .reihe { display: flex; gap: var(--space-xs); }
</style>
