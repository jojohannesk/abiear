<script lang="ts">
  // Intervall- und Akkordaufgaben. Der Klang steht oben; Rückmeldung und
  // „Weiter" liegen unten. In der Komplettprüfung gibt es keine Rückmeldung
  // je Aufgabe — nur „Weiter". Aus `Views/GehoerTaskView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { Kinds, TrainingModes, type QuizTask } from "../../kern/QuizTask";
  import { Lernhilfen } from "../../kern/Lernhilfen";
  import { Haptics } from "../../plattform/Haptik";
  import Icon from "../Bausteine/Icon.svelte";
  import PrimaryButton from "../Bausteine/PrimaryButton.svelte";
  import SecondaryButton from "../Bausteine/SecondaryButton.svelte";
  import Sheet from "../Bausteine/Sheet.svelte";
  import LernView from "../Lernen/LernView.svelte";

  interface Props { store: QuizStore; task: QuizTask }
  let { store, task }: Props = $props();

  let zeigeHilfe = $state(false);
  const aufgabe = $derived(store.currentTask ?? task);
  const verraetErgebnis = $derived(store.mode !== "mix");
  const hatHilfe = $derived(Lernhilfen.hilfe(task.kind, task.name) !== null);

  type Zustand = "idle" | "correct" | "wrong" | "dimmed" | "chosen";
  function zustand(option: string): Zustand {
    if (!store.hasAnswered) return "idle";
    if (!verraetErgebnis) return option === aufgabe.userChoice ? "chosen" : "dimmed";
    if (option === task.name) return "correct";
    if (option === aufgabe.userChoice) return "wrong";
    return "dimmed";
  }

  function submit(option: string) {
    if (store.hasAnswered) return;
    store.answer(option);
    if (!verraetErgebnis) { Haptics.select(); return; }
    if (store.currentTask?.isCorrect) Haptics.correct(); else Haptics.wrong();
  }

  function taste(e: KeyboardEvent) {
    if (store.hasAnswered) return;
    const digit = Number(e.key);
    if (!Number.isInteger(digit) || digit < 1 || digit > store.currentOptions.length) return;
    submit(store.currentOptions[digit - 1]);
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={taste} />

<div class="seite">
  <div class="scroll">
    <div class="inhalt gehoer">
      <div class="t-label c-accent">{Kinds.badgeTitle(task.kind)}</div>

      <button class="hoeren karte druck" onpointerdown={() => Haptics.tap()} onclick={() => store.playCurrentGehoerTask()} aria-label="Aufgabe nochmal anhören">
        <span class="playkreis"><Icon name="play.fill" size={13} /></span>
        <span class="hoerentext">
          <span class="t-body-medium c-text">Nochmal hören</span>
          <span class="t-tiny c-tertiary">erst einzeln, dann zusammen</span>
        </span>
      </button>

      <div class="optionen" class:gesperrt={store.hasAnswered}>
        {#each store.currentOptions as option, index}
          {@const z = zustand(option)}
          <button class="option druck zustand-{z}" onclick={() => submit(option)} disabled={store.hasAnswered}>
            <span class="optiontext t-body">{option}</span>
            {#if store.showsNumberHints && !store.hasAnswered}<span class="hinweis t-tiny ziffern">{index + 1}</span>{/if}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#if store.hasAnswered}
    <div class="feedback">
      <div class="inhalt feedbackinhalt">
        {#if verraetErgebnis}
          {@const correct = aufgabe.isCorrect}
          <div class="ergebnis">
            <span class="zeichen" class:richtig={correct} class:falsch={!correct}><Icon name={correct ? "checkmark" : "xmark"} size={11} weight={3} /></span>
            <span class="t-body-medium c-text ellipse">{correct ? "Richtig" : task.name}</span>
            {#if !correct}<span class="t-small c-tertiary ellipse">statt {aufgabe.userChoice ?? "—"}</span>{/if}
            {#if !correct && TrainingModes.allowsLearningHints(store.mode) && hatHilfe}
              <button class="erklaerung druck druck--flach" onclick={() => (zeigeHilfe = true)}>
                <span class="t-small-medium">Erklärung</span><Icon name="chevron.right" size={9} weight={3} />
              </button>
            {/if}
          </div>
          {#if !correct}
            <div class="zwei">
              <SecondaryButton title="Lösung hören" symbol="arrow.clockwise" onclick={() => store.playCurrentGehoerTask()} />
              <SecondaryButton title="Meine Antwort" symbol="waveform" onclick={() => store.playChosenAnswer()} />
            </div>
          {/if}
        {:else}
          <div class="t-small c-secondary">Antwort gespeichert — die Auswertung kommt am Ende.</div>
        {/if}
        <PrimaryButton title="Weiter" symbol="arrow.right" imageTrailing onclick={() => store.advanceQuiz()} />
      </div>
    </div>
  {/if}
</div>

<Sheet offen={zeigeHilfe} onClose={() => (zeigeHilfe = false)}>
  <LernView {store} kinds={[task.kind]} fokus={task.name} onClose={() => (zeigeHilfe = false)} />
</Sheet>

<style>
  .gehoer { padding-top: var(--space-m); padding-bottom: var(--space-l); display: flex; flex-direction: column; gap: var(--space-l); }
  .hoeren { display: flex; align-items: center; gap: var(--space-m); width: 100%; padding: var(--space-s); text-align: left; }
  .playkreis { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: var(--on-accent); display: grid; place-items: center; flex: none; }
  .hoerentext { display: flex; flex-direction: column; gap: 1px; }

  .optionen { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xs); }
  .option {
    position: relative; min-height: 54px; padding: var(--space-s) var(--space-xs);
    border-radius: var(--radius-control); border: 1px solid var(--hairline); background: var(--raised); color: var(--text);
    display: grid; place-items: center; text-align: center;
    transition: background 0.18s ease-out, border-color 0.18s ease-out, color 0.18s ease-out, transform 0.12s ease-out, opacity 0.12s ease-out;
  }
  .option:active { transform: scale(0.97); }
  .gesperrt .option:active { transform: none; opacity: 1; }
  .optiontext { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .hinweis { position: absolute; top: 5px; right: 6px; color: var(--text-tertiary); opacity: 0.55; }
  .zustand-correct { background: rgba(79, 192, 138, 0.18); border-color: rgba(79, 192, 138, 0.55); color: var(--positive); }
  .zustand-wrong { background: rgba(230, 112, 95, 0.18); border-color: rgba(230, 112, 95, 0.55); color: var(--negative); }
  .zustand-dimmed { background: var(--base); border-color: rgba(255, 255, 255, 0.04); color: var(--text-tertiary); }
  .zustand-chosen { background: var(--accent-dim); border-color: rgba(0, 209, 218, 0.7); color: var(--text); }

  .feedback { flex: none; background: var(--base); border-top: 1px solid var(--hairline); }
  .feedbackinhalt { display: flex; flex-direction: column; gap: var(--space-s); padding-top: var(--space-s); padding-bottom: calc(var(--space-xs) + var(--sicher-unten)); }
  .ergebnis { display: flex; align-items: center; gap: var(--space-s); min-height: var(--touch-min); }
  .zeichen { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex: none; }
  .zeichen.richtig { color: var(--positive); background: rgba(79, 192, 138, 0.16); }
  .zeichen.falsch { color: var(--negative); background: rgba(230, 112, 95, 0.16); }
  .ellipse { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .erklaerung { margin-left: auto; display: inline-flex; align-items: center; gap: 3px; color: var(--accent); min-height: var(--touch-min); flex: none; }
  .zwei { display: flex; gap: var(--space-xs); }
</style>
