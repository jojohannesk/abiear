<script lang="ts">
  // Auswertung. Das Ergebnis steht groß und zuerst, darunter ein Satz, der
  // zur Zahl passt; die Abschnitte liegen als Seiten nebeneinander.
  // Aus `Views/ResultView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { Kinds, type Kind } from "../../kern/QuizTask";
  import { AbcNotation } from "../../kern/AbcNotation";
  import { Sprueche } from "../../kern/Sprueche";
  import { isPerfect } from "../../kern/DictationScoring";
  import { tagesvergleichSatz, type Tagesvergleich } from "../../kern/StatisticsInsights";
  import { Haptics } from "../../plattform/Haptik";
  import TopBar from "../Bausteine/TopBar.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import PrimaryButton from "../Bausteine/PrimaryButton.svelte";
  import SecondaryButton from "../Bausteine/SecondaryButton.svelte";
  import SegmentedBar from "../Bausteine/SegmentedBar.svelte";
  import Notenbild from "../Bausteine/Notenbild.svelte";

  interface Props { store: QuizStore }
  let { store }: Props = $props();

  type Page = { art: "dictation"; kind: Kind } | { art: "tasks" };
  let page = $state(0);

  const pages = $derived.by((): Page[] => {
    const out: Page[] = [];
    if (store.tasks.some((t) => t.kind === "rhythm")) out.push({ art: "dictation", kind: "rhythm" });
    if (store.tasks.some((t) => t.kind === "melody")) out.push({ art: "dictation", kind: "melody" });
    if (store.gradedTasks.length > 0) out.push({ art: "tasks" });
    return out;
  });
  const index = $derived(Math.min(page, Math.max(0, pages.length - 1)));
  const pageTitles = $derived(pages.map((p) => (p.art === "dictation" ? Kinds.badgeTitle(p.kind) : "Aufgaben")));

  const score = $derived(store.totalScore);
  const serie = $derived(store.serie());
  const vergleiche = $derived.by((): Tagesvergleich[] => {
    void store.statistikRevision;
    const kinds = [...new Set(store.tasks.map((t) => t.kind))];
    return kinds.map((k) => store.insights.tagesvergleich(k, undefined, store.heute))
      .filter((v): v is Tagesvergleich => v !== null)
      .sort((a, b) => (a.kind < b.kind ? -1 : 1));
  });
  const repeatTitle = $derived.by(() => {
    const n = store.wrongGradedTasks.length;
    return n === 1 ? "1 Fehler wiederholen" : `${n} Fehler wiederholen`;
  });

  function loesungAbc(kind: Kind): string | null {
    if (kind === "rhythm") {
      const t = store.tasks.find((x) => x.kind === "rhythm");
      return t ? AbcNotation.rhythmToAbc(t.rhythmData) : null;
    }
    const m = store.tasks.find((x) => x.kind === "melody")?.melodyData;
    return m ? AbcNotation.melodyToAbc(m) : null;
  }
  function loesungText(kind: Kind): string {
    if (kind === "rhythm") {
      const t = store.tasks.find((x) => x.kind === "rhythm");
      return t ? "Lösung. " + AbcNotation.rhythmBeschreibung(t.rhythmData) : "Lösung";
    }
    const m = store.tasks.find((x) => x.kind === "melody")?.melodyData;
    return m ? "Lösung. " + AbcNotation.melodyBeschreibung(m) : "Lösung";
  }
  const melodyKey = $derived(store.tasks.find((x) => x.kind === "melody")?.melodyData?.key ?? null);

  function pointClass(points: number): string {
    return points === 2 ? "p2" : points === 1 ? "p1" : "p0";
  }
</script>

<div class="seite">
  <TopBar title="Auswertung" />

  <div class="scroll">
    <div class="inhalt kopf">
      <div class="zahl">
        <span class="t-display c-accent ziffern">{score.achieved}</span>
        <span class="t-title c-tertiary ziffern">/ {score.possible}</span>
      </div>
      {#if !store.isRepeatRound}
        <p class="t-body c-secondary">{Sprueche.spruch(score.achieved, score.possible, store.heute)}</p>
      {/if}
      {#if vergleiche.length > 0}
        <p class="t-small c-tertiary">{vergleiche.map(tagesvergleichSatz).join(" ")}</p>
      {/if}
      <div class="stand t-small-medium">
        <span class="etikett" class:c-positive={serie.heuteGeuebt} class:c-tertiary={!serie.heuteGeuebt}>
          <Icon name={serie.heuteGeuebt ? "checkmark.circle.fill" : "circle.dashed"} size={14} weight={2} />
          {serie.heuteGeuebt ? "Tagesziel erledigt" : "Tagesziel noch offen"}
        </span>
        {#if serie.aktuell > 1}
          <span class="etikett c-accent"><Icon name="flame.fill" size={14} />{serie.aktuell} Tage in Folge</span>
        {/if}
      </div>
    </div>

    {#if pages.length > 1}
      <SegmentedBar titles={pageTitles} selection={index} onselect={(i) => (page = i)} />
    {/if}

    {#if pages[index]?.art === "dictation"}
      {@const kind = (pages[index] as { kind: Kind }).kind}
      {@const abc = loesungAbc(kind)}
      {@const results = kind === "rhythm" ? store.rhythmResults : store.melodyResults}
      {@const entry = kind === "rhythm" ? store.rhythmEntry : store.melodyEntry}
      {@const eigenesAbc = kind === "rhythm" || !melodyKey ? AbcNotation.entryToAbc(entry) : AbcNotation.entryToAbcWithKey(entry, melodyKey)}
      {@const total = results.reduce((s, r) => s + r.points, 0)}
      <div class="inhalt diktatseite">
        {#if abc}
          <div class="loesung"><Notenbild {abc} beschreibung={loesungText(kind)} /></div>
        {/if}
        <div class="hoerzeile">
          {#if kind === "melody" && melodyKey}<span class="t-small c-secondary">{melodyKey.name}</span>{/if}
          <span class="hoerknoepfe">
            {#if !entry.isEmpty}
              <button class="hoeren druck" onclick={() => store.playOwnEntry(kind)}><Icon name="play.fill" size={10} />Meine Eingabe</button>
            {/if}
            <button class="hoeren gefuellt druck" onclick={() => { if (kind === "rhythm") store.playSolutionRhythm(); else store.playSolutionMelody(); }}><Icon name="play.fill" size={10} />Lösung</button>
          </span>
        </div>

        <div class="karte vergleich">
          <div class="vergleichkopf">
            <span class="t-label">Deine Eingabe</span>
            <span class="t-small-medium ziffern"><span class="c-accent">{total}</span><span class="c-tertiary"> / {2 * results.length}</span></span>
          </div>
          <div class="eigenes">
            <Notenbild abc={eigenesAbc} staffWidth={300} maxHeight={170} beschreibung={"Deine Eingabe. " + AbcNotation.entryBeschreibung(entry, kind === "melody" ? melodyKey : null)} />
          </div>
          <div class="takte">
            {#each results as result (result.bar)}
              <div class="takt">
                <span class="t-tiny c-tertiary">Takt {result.bar + 1}</span>
                <span class="punkte t-body-medium ziffern {pointClass(result.points)}">{result.points}</span>
                <span class="t-tiny c-tertiary ellipse">{isPerfect(result) ? "stimmt" : "Schlag " + result.wrongBeats.map((b) => String(b + 1)).join(", ")}</span>
              </div>
            {/each}
          </div>
          {#if entry.isEmpty}
            <p class="t-tiny c-tertiary">Nichts notiert — dieser Lauf zählt nicht in die Statistik.</p>
          {/if}
        </div>
      </div>
    {:else if pages[index]?.art === "tasks"}
      <div class="inhalt aufgabenseite">
        <div class="karte liste">
          {#each store.gradedTasks as task, i (task.id)}
            {#if i > 0}<div class="trennlinie"></div>{/if}
            <div class="aufgabe">
              <span class="nummer t-small c-tertiary ziffern">{i + 1}</span>
              <span class="aufgabetext">
                <span class="t-body-medium c-text ellipse">{task.name}</span>
                {#if !task.isCorrect}<span class="t-tiny c-tertiary ellipse">statt {task.userChoice ?? "—"}</span>{/if}
              </span>
              <span class="zeichen" class:c-positive={task.isCorrect} class:c-negative={!task.isCorrect}><Icon name={task.isCorrect ? "checkmark" : "xmark"} size={12} weight={3} /></span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="fuss">
    <div class="inhalt fussinhalt">
      {#if store.wrongGradedTasks.length > 0}
        <PrimaryButton title={repeatTitle} symbol="arrow.clockwise" onclick={() => store.repeatWrongTasks()} />
        <SecondaryButton title="Zurück zum Menü" onclick={() => { Haptics.tap(); store.returnToStart(); }} />
      {:else}
        <PrimaryButton title="Zurück zum Menü" onclick={() => store.returnToStart()} />
      {/if}
    </div>
  </div>
</div>

<style>
  p { margin: 0; }
  .kopf { padding-top: var(--space-m); padding-bottom: var(--space-s); display: flex; flex-direction: column; gap: var(--space-xs); }
  .zahl { display: flex; align-items: baseline; gap: var(--space-xs); }
  .stand { display: flex; gap: var(--space-s); padding-top: var(--space-xxs); flex-wrap: wrap; }
  .etikett { display: inline-flex; align-items: center; gap: 4px; }

  .diktatseite { padding-top: var(--space-m); padding-bottom: var(--space-m); display: flex; flex-direction: column; gap: var(--space-m); }
  .loesung { display: flex; }
  .loesung :global(.papier) { padding: var(--space-s); }
  .hoerzeile { display: flex; align-items: center; gap: var(--space-s); }
  .hoerknoepfe { margin-left: auto; display: flex; gap: var(--space-xs); }
  .hoeren {
    display: inline-flex; align-items: center; gap: var(--space-xs); height: 32px; padding: 0 var(--space-s);
    border-radius: 999px; border: 1px solid var(--hairline-strong); color: var(--accent); font-size: var(--font-small);
  }
  .hoeren.gefuellt { background: var(--accent-dim); border-color: transparent; }
  .hoeren:active { transform: scale(0.97); }

  .vergleich { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-s); }
  .vergleichkopf { display: flex; justify-content: space-between; align-items: baseline; }
  .eigenes :global(.papier) { border-radius: var(--radius-control); }
  .takte { display: flex; gap: var(--space-xs); }
  .takt { flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--space-xxs); min-width: 0; }
  .punkte { width: 100%; height: 30px; display: grid; place-items: center; border-radius: 8px; color: var(--on-accent); }
  .p2 { background: var(--positive); } .p1 { background: var(--accent); } .p0 { background: var(--negative); }
  .ellipse { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

  .aufgabenseite { padding-top: var(--space-m); padding-bottom: var(--space-m); }
  .liste { display: flex; flex-direction: column; }
  .trennlinie { height: 1px; background: var(--hairline); margin-left: calc(var(--space-m) + 22px + var(--space-m)); }
  .aufgabe { display: flex; align-items: center; gap: var(--space-m); min-height: 46px; padding: 0 var(--space-m); }
  .nummer { width: 22px; text-align: right; flex: none; }
  .aufgabetext { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .zeichen { width: 18px; display: grid; place-items: center; flex: none; }

  .fuss { flex: none; background: var(--base); border-top: 1px solid var(--hairline); }
  .fussinhalt { display: flex; flex-direction: column; gap: var(--space-s); padding-top: var(--space-s); padding-bottom: calc(var(--space-xs) + var(--sicher-unten)); }
</style>
