<script lang="ts">
  // Der Schritt zwischen Kachel und Start: Anleitung, Niveau und Tempo,
  // adaptiver Modus, zwei Zahlen aus der eigenen Statistik. Wer gleich
  // loslegen will, tippt einmal auf „Starten". Aus `Views/PrepareView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { TrainingModes, Kinds, type Kind, type TrainingMode } from "../../kern/QuizTask";
  import { DisciplineGuides } from "../../kern/DisciplineGuide";
  import { Lernhilfen } from "../../kern/Lernhilfen";
  import { StatisticsInsights, hasEnoughData, type ItemStats } from "../../kern/StatisticsInsights";
  import { Performance } from "../../klang/Performance";
  import type { Einstellungen } from "../../plattform/Einstellungen";
  import { Haptics } from "../../plattform/Haptik";
  import TopBar from "../Bausteine/TopBar.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import PrimaryButton from "../Bausteine/PrimaryButton.svelte";
  import LevelSelector from "../Bausteine/LevelSelector.svelte";
  import ThinProgress from "../Bausteine/ThinProgress.svelte";
  import Sheet from "../Bausteine/Sheet.svelte";
  import Alert from "../Bausteine/Alert.svelte";
  import { modeSymbol } from "../Symbole";
  import TutorialView from "./TutorialView.svelte";
  import GuideView from "./GuideView.svelte";
  import LernView from "../Lernen/LernView.svelte";

  interface Props { store: QuizStore; mode: TrainingMode; einstellungen: Einstellungen }
  let { store, mode, einstellungen }: Props = $props();

  const kinds = $derived(TrainingModes.kinds(mode));
  const dictationLevels = $derived(kinds.filter((k) => k === "rhythm" || k === "melody"));
  const hatLernstoff = $derived(kinds.some((k) => Lernhilfen.strategie(k).length > 0));
  const insights = $derived.by(() => { void store.statistikRevision; return store.insights; });

  let lockedKind = $state<Kind | null>(null);
  let showGuide = $state(false);
  let showLern = $state(false);
  let startet = $state(false);

  const tutorialKey = $derived(`tutorialDone.${mode}`);
  let showTutorial = $state(false);
  $effect(() => {
    startet = false;
    showTutorial = einstellungen.lesen(tutorialKey) !== "true";
  });

  function tempoText(): string {
    return (store.aktivesTempoBPM === Performance.examBPM
      ? "So schnell wird im Abitur diktiert: Viertel etwa 60. "
      : "Zum Üben langsamer. Im Abitur wird mit Viertel etwa 60 diktiert. ")
      + (store.laufTempoBPM === null
        ? "Voreinstellung unter Mehr."
        : "Nur für diesen Lauf — die Voreinstellung steht unter Mehr.");
  }

  function adaptiveHint(kind: Kind): string {
    if (!store.isAdaptive(kind)) return "Aus: alles kommt gleich häufig dran.";
    let items: ItemStats[];
    switch (kind) {
      case "interval": case "chord": items = insights.itemStats(kind); break;
      case "rhythm": items = insights.figureStats(); break;
      case "melody": items = insights.moveStats(); break;
    }
    const weakest = items.filter(hasEnoughData).slice(0, 2).map((i) => i.name);
    if (weakest.length === 0) return "An: was dir schwerfällt, kommt häufiger.";
    return "An: gerade vor allem " + weakest.join(" und ") + ".";
  }

  const funFacts = $derived.by((): string[] => {
    if (mode === "mix") {
      const runs = insights.runCount("interval");
      return runs >= 3 ? [`Du hast die Komplettprüfung schon ${runs}-mal gemacht.`] : [];
    }
    const kind = kinds[0];
    return kind ? insights.funFacts(kind) : [];
  });

  const goal = StatisticsInsights.adaptiveThreshold;

  function starten() {
    if (startet) return;
    startet = true;
    void store.selectAndStart(mode);
  }

  function schliessen() {
    store.laufTempoBPM = null;
    store.screen = { art: "start" };
  }
</script>

<div class="seite">
  <TopBar title={TrainingModes.title(mode)} onClose={schliessen} />

  <div class="scroll">
    <div class="inhalt prepare">
      <div class="heading">
        <span class="symbol"><Icon name={modeSymbol(mode)} size={22} /></span>
        <div class="text">
          <div class="t-title c-text">{TrainingModes.title(mode)}</div>
          <div class="t-small c-tertiary">{TrainingModes.subtitle(mode)}</div>
        </div>
      </div>

      <div class="karte guide">
        <p class="t-body c-secondary">{DisciplineGuides.forMode(mode).summary}</p>
        <div class="links">
          {#if hatLernstoff}
            <button class="lernkapsel druck" onclick={() => (showLern = true)}>
              <Icon name="book.fill" size={12} weight={2.4} />
              <span class="t-small-medium">Woran du es hörst</span>
            </button>
          {/if}
          <button class="link druck druck--flach" onclick={() => (showGuide = true)}>
            <span class="t-small-medium">Zur Prüfung</span><Icon name="chevron.right" size={10} weight={3} />
          </button>
          <button class="link druck druck--flach" onclick={() => (showTutorial = true)}>
            <span class="t-small-medium">Bedienung</span><Icon name="chevron.right" size={10} weight={3} />
          </button>
        </div>
      </div>

      {#if dictationLevels.length > 0}
        <section class="abschnitt">
          <div class="t-label">Diktat</div>
          <div class="karte diktat">
            {#each dictationLevels as kind}
              <LevelSelector title={Kinds.badgeTitle(kind)} {kind} selection={store.level(kind)} onselect={(l) => store.setLevel(l, kind)} />
            {/each}
            <div class="haarlinie"></div>
            <div class="tempo">
              <div class="tempozeile">
                <span class="tempotitel t-small c-secondary">Tempo</span>
                <span><span class="t-title ziffern c-text">{store.aktivesTempoBPM}</span><span class="t-small c-tertiary"> bpm</span></span>
                {#if store.aktivesTempoBPM === Performance.examBPM}
                  <span class="pille t-tiny">Prüfungstempo</span>
                {/if}
              </div>
              <input class="slider" type="range" min={Performance.slowestBPM} max={Performance.examBPM} step="5"
                value={store.aktivesTempoBPM} aria-label="Tempo in Schlägen pro Minute"
                oninput={(e) => { store.laufTempoBPM = Number((e.currentTarget as HTMLInputElement).value); }} />
              <p class="t-tiny c-tertiary">{tempoText()}</p>
            </div>
          </div>
        </section>
      {/if}

      <section class="abschnitt">
        <div class="t-label">Übungsart</div>
        {#if !TrainingModes.allowsAdaptive(mode)}
          <div class="karte block">
            <div class="t-body-medium c-text">Gleichmäßige Auswahl</div>
            <p class="t-tiny c-tertiary">Die Komplettprüfung simuliert das Abitur. Sie wählt deshalb nicht nach deinen Schwächen aus — sonst wäre die Punktzahl nicht mehr mit einer echten Prüfung vergleichbar.</p>
          </div>
        {:else}
          <div class="adaptiv">
            {#each kinds as kind}
              {@const unlocked = insights.isAdaptiveUnlocked(kind)}
              {@const done = insights.runCount(kind)}
              {@const on = store.isAdaptive(kind)}
              <button class="karte block adaptivzeile druck" onclick={() => {
                if (unlocked) { store.setAdaptive(!on, kind); Haptics.select(); } else { lockedKind = kind; }
              }}>
                <span class="kopfzeile">
                  <span class="ziel" class:an={unlocked && on}><Icon name="target" size={14} weight={2.2} /></span>
                  <span class="t-body-medium" class:c-text={unlocked} class:c-secondary={!unlocked}>Adaptiv üben</span>
                  <span class="rechts">
                    {#if unlocked}
                      <span class="schalter t-small-medium" class:an={on}>{on ? "An" : "Aus"}</span>
                    {:else}
                      <span class="t-small c-tertiary">ab {goal} Durchgängen</span>
                    {/if}
                  </span>
                </span>
                {#if unlocked}
                  <span class="t-tiny c-tertiary">{adaptiveHint(kind)}</span>
                {:else}
                  <span class="t-tiny c-secondary">Legt dir häufiger vor, was du oft verfehlst. Bis dahin wird gleichmäßig gewählt.</span>
                  <ThinProgress fraction={done / goal} />
                  <span class="t-tiny c-tertiary">{done} von {goal} Durchgängen — noch {goal - done}.</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </section>

      {#if funFacts.length > 0}
        <section class="abschnitt">
          <div class="t-label">Dein Stand</div>
          {#each funFacts as fact}
            <div class="fakt"><span class="punkt"></span><span class="t-body c-secondary">{fact}</span></div>
          {/each}
        </section>
      {/if}
    </div>
  </div>

  <div class="inhalt fuss">
    <PrimaryButton title="Starten" symbol="play.fill" enabled={!startet} onclick={starten} />
  </div>
</div>

<Sheet offen={showGuide} onClose={() => (showGuide = false)}>
  <GuideView {mode} onClose={() => (showGuide = false)} />
</Sheet>

<Sheet offen={showLern} onClose={() => (showLern = false)}>
  <LernView {store} {kinds} onClose={() => (showLern = false)} />
</Sheet>

<Sheet offen={showTutorial} dismissable={false}>
  <TutorialView {mode} onUnderstood={() => (showTutorial = false)}
    onNeverAgain={() => { einstellungen.schreiben(tutorialKey, "true"); showTutorial = false; }} />
</Sheet>

<Alert offen={lockedKind !== null} titel="Dafür fehlen noch Daten"
  text={lockedKind ? (() => { const left = insights.runsUntilAdaptive(lockedKind); return `Adaptiv üben braucht genug Daten, sonst bevorzugt es Zufall statt Schwächen. Noch ${left} ${left === 1 ? "Durchgang" : "Durchgänge"} im Bereich ${Kinds.badgeTitle(lockedKind)}, dann schaltet es sich frei.`; })() : ""}
  knoepfe={[{ titel: "Verstanden", rolle: "cancel", onclick: () => (lockedKind = null) }]} />

<style>
  .prepare { padding-top: var(--space-l); padding-bottom: var(--space-xl); display: flex; flex-direction: column; gap: var(--space-xl); }
  p { margin: 0; }
  .heading { display: flex; align-items: center; gap: var(--space-m); }
  .heading .symbol { width: 28px; display: grid; place-items: center; color: var(--accent); }
  .heading .text { display: flex; flex-direction: column; gap: var(--space-xxs); }

  .guide { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-s); }
  .links { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-xxs) var(--space-m); }
  .lernkapsel { display: inline-flex; align-items: center; gap: var(--space-xs); height: var(--touch-min); padding: 0 var(--space-m); border-radius: var(--radius-control); background: var(--accent-dim); color: var(--accent); }
  .link { display: inline-flex; align-items: center; gap: var(--space-xs); min-height: var(--touch-min); color: var(--accent); }

  .abschnitt { display: flex; flex-direction: column; gap: var(--space-m); }
  .diktat { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-m); }
  .tempo { display: flex; flex-direction: column; gap: var(--space-xs); }
  .tempozeile { display: flex; align-items: center; gap: var(--space-s); }
  .tempotitel { width: 66px; flex: none; }
  .pille { margin-left: auto; height: 24px; display: inline-flex; align-items: center; padding: 0 var(--space-s); border-radius: 999px; background: var(--accent-dim); color: var(--accent); }
  .slider { width: 100%; accent-color: var(--accent); margin: var(--space-xs) 0; height: 28px; }

  .block { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-xs); text-align: left; }
  .adaptiv { display: flex; flex-direction: column; gap: var(--space-s); }
  .adaptivzeile { gap: var(--space-s); width: 100%; }
  .adaptivzeile:active { transform: scale(0.99); }
  .kopfzeile { display: flex; align-items: center; gap: var(--space-s); }
  .ziel { width: 20px; display: grid; place-items: center; color: var(--text-tertiary); }
  .ziel.an { color: var(--accent); }
  .rechts { margin-left: auto; display: flex; align-items: center; }
  .schalter { width: 48px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: var(--sunken); color: var(--text-secondary); }
  .schalter.an { background: var(--accent); color: var(--on-accent); }

  .fakt { display: flex; gap: var(--space-s); align-items: flex-start; }
  .punkt { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); margin-top: 7px; flex: none; }

  .fuss { padding-top: var(--space-s); padding-bottom: calc(var(--space-l) + var(--sicher-unten)); flex: none; }
</style>
