<script lang="ts">
  // Rhythmus- und Melodiediktat. Der Abspielen-Knopf hängt am unteren Rand
  // unter dem Tastenfeld — Daumenreichweite. Aus `Views/DiktatView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { Kinds, TrainingModes, type QuizTask } from "../../kern/QuizTask";
  import { DictationEntry } from "../../kern/DictationEntry";
  import { AbcNotation } from "../../kern/AbcNotation";
  import { stepShortTitle } from "../../kern/MusicData";
  import { Haptics } from "../../plattform/Haptik";
  import Icon from "../Bausteine/Icon.svelte";
  import PrimaryButton from "../Bausteine/PrimaryButton.svelte";
  import ThinProgress from "../Bausteine/ThinProgress.svelte";
  import BarSegments from "../Bausteine/BarSegments.svelte";
  import CountInDots from "../Bausteine/CountInDots.svelte";
  import RhythmInputView from "./RhythmInputView.svelte";
  import MelodyInputView from "./MelodyInputView.svelte";

  interface Props { store: QuizStore; task: QuizTask }
  let { store, task }: Props = $props();

  const taktzahl = $derived(task.kind === "rhythm" ? task.rhythmData.length : DictationEntry.standardBarCount);
  const step = $derived(store.currentDiktatStepInfo);
  const total = $derived(store.diktatSteps.length);
  const playTitle = $derived(store.isPlayingDiktat ? "Läuft" : store.diktatFinished ? "Fertig" : "Abspielen");
  const playSymbol = $derived(store.isPlayingDiktat ? "waveform" : store.diktatFinished ? "checkmark" : "play.fill");
</script>

<div class="seite">
  <div class="scroll">
    <div class="inhalt diktat">
      {#if TrainingModes.kinds(store.mode).length > 1}
        <div class="t-label c-accent disziplin">{Kinds.badgeTitle(task.kind)}</div>
      {/if}

      {#if task.kind === "melody" && task.melodyData}
        {@const melody = task.melodyData}
        <div class="karte orientierung">
          <div class="feld"><span class="t-tiny c-tertiary">Tonart</span><span class="t-headline c-text">{melody.key.name}</span></div>
          <div class="trenner"></div>
          <div class="feld"><span class="t-tiny c-tertiary">Startton</span><span class="t-headline c-text">{AbcNotation.germanNameOfMidi(melody.notes[0].midiNumber, melody.key)}</span></div>
          <div class="trenner"></div>
          <button class="feld vorspielen druck druck--flach" onclick={() => store.playOrientation()}>
            <span class="c-accent"><Icon name="pianokeys" size={15} /></span>
            <span class="t-tiny c-secondary">Vorspielen</span>
          </button>
        </div>
      {/if}

      <div class="karte durchgang">
        <div class="kopfblock">
          <div class="kopf">
            <span class="t-label">Durchgang</span>
            <span class="t-small-medium ziffern"><span class="c-text">{store.diktatStep + 1}</span><span class="c-tertiary"> / {total}</span></span>
          </div>
          <ThinProgress fraction={total > 1 ? store.diktatStep / (total - 1) : 1} />
        </div>
        <div class="schritt">
          <div class="t-title c-text">{stepShortTitle(step)}</div>
          <BarSegments activeBars={step.bars} barCount={taktzahl} />
        </div>
        <div class="vorzaehler"><CountInDots activeBeat={store.metronomeBeat} /></div>
      </div>

      {#if task.kind === "rhythm"}
        <div class="eingabe"><RhythmInputView {store} /></div>
      {:else if task.melodyData}
        <div class="eingabe eingabe--melodie"><MelodyInputView {store} melody={task.melodyData} level={task.level ?? "mittel"} /></div>
      {/if}
    </div>
  </div>

  <div class="fuss">
    <div class="inhalt">
      <PrimaryButton title={playTitle} symbol={playSymbol} enabled={!store.isPlayingDiktat}
        onclick={() => { if (store.diktatFinished) store.advanceQuiz(); else store.playDiktatStep(); }} />
      <button class="skip druck druck--flach t-small" onclick={() => { Haptics.tap(); store.openSkipModal(); }}>Diktat überspringen</button>
    </div>
  </div>
</div>

<style>
  .diktat { padding-top: var(--space-m); padding-bottom: var(--space-m); display: flex; flex-direction: column; }
  .disziplin { margin-bottom: var(--space-l); }
  .orientierung { display: flex; align-items: center; margin-bottom: var(--space-l); }
  .feld { flex: 1; height: 62px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-xxs); min-width: 0; }
  .feld .t-headline { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .trenner { width: 1px; height: 36px; background: var(--hairline); }
  .vorspielen { color: var(--text-secondary); }
  .durchgang { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-l); }
  .kopfblock { display: flex; flex-direction: column; gap: var(--space-s); }
  .kopf { display: flex; justify-content: space-between; align-items: baseline; }
  .schritt { display: flex; flex-direction: column; align-items: center; gap: var(--space-s); }
  .schritt .t-title { letter-spacing: -0.3px; }
  .vorzaehler { height: 10px; display: flex; justify-content: center; align-items: center; }
  .eingabe { padding-top: var(--space-m); }
  .eingabe--melodie { padding-top: var(--space-s); }
  .fuss { flex: none; background: var(--base); }
  .fuss .inhalt { display: flex; flex-direction: column; padding-bottom: calc(var(--space-s) + var(--sicher-unten)); }
  .skip { width: 100%; height: var(--touch-min); color: var(--text-tertiary); }
</style>
