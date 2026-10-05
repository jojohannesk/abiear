<script lang="ts">
  // Sechzehn Schlagfelder unter der Notenzeile — das einzige Ziel für die
  // Schreibmarke. Man sieht, welche Schläge noch offen sind.
  //
  // Die ersten Tester haben die Leiste nicht als Knöpfe erkannt. Deshalb
  // tragen die Felder ihre Schlagnummer, die Takte ihre Nummer, und beim
  // ersten Mal steht ein Satz darüber, der erst nach dem ersten Tippen geht.
  import type { DictationEntry } from "../../kern/DictationEntry";
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { untrack } from "svelte";
  import Icon from "../Bausteine/Icon.svelte";

  interface Props { store: QuizStore; entry: DictationEntry; onSelect: (beat: number) => void }
  let { store, entry, onSelect }: Props = $props();

  const HINWEIS_KEY = "hinweis.schlagleiste";
  const HINWEIS = "Tippe auf einen Schlag, um dort zu schreiben oder zu löschen.";
  // Einmal beim Erscheinen gelesen; danach führt die Leiste den Zustand selbst.
  let hinweisErledigt = $state(untrack(() => store.hinweisErledigt(HINWEIS_KEY)));

  function waehle(beat: number) {
    if (!hinweisErledigt) {
      hinweisErledigt = true;
      store.hinweisErledigen(HINWEIS_KEY);
    }
    onSelect(beat);
  }
</script>

<div class="leiste-rahmen">
  {#if !hinweisErledigt}
    <p class="hinweis"><Icon name="hand.tap" size={14} /> {HINWEIS}</p>
  {/if}
  <div class="leiste" role="group" aria-label="Schläge">
    {#each Array.from({ length: entry.barCount }, (_, b) => b) as bar}
      <div class="takt">
        {#if entry.barCount > 1}
          <span class="taktnummer" aria-hidden="true">Takt {bar + 1}</span>
        {/if}
        <div class="felder">
          {#each [0, 1, 2, 3] as offset}
            {@const beat = bar * 4 + offset}
            {@const istMarke = entry.currentBeat === beat}
            {@const belegt = entry.hasNote(beat)}
            <button class="feld" class:marke={istMarke} class:belegt onclick={() => waehle(beat)}
              aria-label="Takt {bar + 1}, Schlag {offset + 1}" aria-pressed={istMarke}>
              <span class="kasten">{offset + 1}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .leiste-rahmen { display: flex; flex-direction: column; gap: var(--space-xxs); }
  .hinweis {
    margin: var(--space-xs) 0 0; display: flex; align-items: center; gap: 6px;
    font-size: var(--font-small); color: var(--accent);
  }
  .leiste { display: flex; gap: var(--space-xs); }
  .takt { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .taktnummer { font-size: 10px; font-weight: 500; color: var(--text-tertiary); padding-left: 2px; }
  .felder { display: flex; gap: 2px; }
  .feld { flex: 1; padding: 2px 0 10px; display: block; position: relative; }
  .kasten {
    display: grid; place-items: center; height: 26px; border-radius: 4px;
    border: 1px solid var(--hairline-strong); background: var(--sunken);
    font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-tertiary);
    transition: background 0.12s ease-out, border-color 0.12s ease-out, color 0.12s ease-out;
  }
  .feld.belegt .kasten { background: var(--text-secondary); color: var(--base); }
  .feld.marke .kasten { border: 2px solid var(--accent); }
  .feld.marke:not(.belegt) .kasten { background: var(--accent-dim); color: var(--accent); }
  .feld.marke::after {
    content: ""; position: absolute; left: 50%; bottom: 1px; width: 12px; height: 3px;
    margin-left: -6px; border-radius: 2px; background: var(--accent);
  }
</style>
