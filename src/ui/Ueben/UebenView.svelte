<script lang="ts">
  // Der Üben-Tab: Serie, Schnell üben, die vier Bereiche, Komplettprüfung.
  // Aus `Views/UebenView.swift`: erst die S-Bahn, dann die Disziplinen,
  // zuletzt die Prüfung.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { TrainingModes, type TrainingMode } from "../../kern/QuizTask";
  import Icon from "../Bausteine/Icon.svelte";
  import { modeSymbol, scopeLabel } from "../Symbole";
  import { Haptics } from "../../plattform/Haptik";

  interface Props {
    store: QuizStore;
    onSelect: (mode: TrainingMode) => void;
    onStatistik: () => void;
  }
  let { store, onSelect, onStatistik }: Props = $props();

  const areas = TrainingModes.kacheln;
  const serie = $derived(store.serie());

  /** Die Serie einer einzelnen Disziplin — nur ab zwei Tagen. */
  function serieFuer(mode: TrainingMode): number {
    const kinds = TrainingModes.kinds(mode);
    if (kinds.length !== 1) return 0;
    const tage = store.serie(kinds[0]).aktuell;
    return tage >= 2 ? tage : 0;
  }
</script>

<div class="seite">
  <div class="scroll">
    <div class="inhalt ueben">
      <header class="kopf">
        <h1 class="t-display">AbiEar</h1>
        <div class="t-label">Abitur Baden-Württemberg</div>
      </header>

      {#if !store.statistics.isReadOnly}
        <button class="serie druck druck--flach" onclick={onStatistik}
          aria-label={serie.aktuell > 0 ? `Übungsserie: ${serie.aktuell} Tage` : "Tagesziel heute noch offen"}>
          <span class="flamme" class:heute={serie.heuteGeuebt} class:laeuft={serie.aktuell > 0}>
            <Icon name={serie.aktuell > 0 ? "flame.fill" : "circle.dashed"} size={12} weight={2} />
          </span>
          {#if serie.aktuell > 0}
            <span class="t-small-medium c-text">{serie.aktuell === 1 ? "1 Tag in Folge" : `${serie.aktuell} Tage in Folge`}</span>
            <span class="t-small" class:c-positive={serie.heuteGeuebt} class:c-tertiary={!serie.heuteGeuebt}>
              {serie.heuteGeuebt ? "· Tagesziel erledigt" : "· Tagesziel offen"}
            </span>
          {:else}
            <span class="t-small c-secondary">{serie.geuebteTage === 0 ? "Noch nicht geübt — heute ist Tag 1" : "Tagesziel offen — ein Durchgang genügt"}</span>
          {/if}
        </button>
      {/if}

      <button class="block block--hervorgehoben druck" onpointerdown={() => Haptics.tap()} onclick={() => onSelect("kurz")}>
        <span class="streifen streifen--breit"></span>
        <span class="blocksymbol"><Icon name={modeSymbol("kurz")} size={22} /></span>
        <span class="blocktext">
          <span class="t-title">{TrainingModes.title("kurz")}</span>
          <span class="t-small c-secondary">{TrainingModes.subtitle("kurz")} · 2 Minuten</span>
        </span>
        <span class="pfeil"><Icon name="chevron.right" size={12} weight={2.6} /></span>
      </button>

      <div class="t-label abschnitt">Üben</div>

      <div class="kacheln">
        {#each areas as mode}
          {@const s = serieFuer(mode)}
          <button class="kachel karte druck" onpointerdown={() => Haptics.tap()} onclick={() => onSelect(mode)}>
            <span class="kachelkopf">
              <span class="kreis"><Icon name={modeSymbol(mode)} size={17} weight={2} /></span>
              {#if s >= 2}
                <span class="serienpille t-tiny ziffern"><Icon name="flame.fill" size={9} />{s}</span>
              {/if}
            </span>
            <span class="kacheltitel t-body-medium">{TrainingModes.title(mode)}</span>
            <span class="t-tiny c-tertiary">{scopeLabel(mode)}</span>
          </button>
        {/each}
      </div>

      <button class="block druck" onpointerdown={() => Haptics.tap()} onclick={() => onSelect("mix")}>
        <span class="streifen"></span>
        <span class="blocktext">
          <span class="t-title">Komplettprüfung</span>
          <span class="t-small c-secondary">16 Aufgaben · alle Bereiche</span>
        </span>
        <span class="pfeil"><Icon name="chevron.right" size={12} weight={2.6} /></span>
      </button>
    </div>
  </div>
</div>

<style>
  .ueben { padding-top: calc(var(--space-l) + var(--sicher-oben)); padding-bottom: var(--space-l); }
  .kopf { display: flex; flex-direction: column; gap: var(--space-xxs); margin-bottom: var(--space-m); }
  h1 { margin: 0; letter-spacing: -0.6px; }

  .serie {
    display: flex; align-items: center; gap: var(--space-xs); width: 100%; height: 22px;
    margin-bottom: var(--space-m); text-align: left; white-space: nowrap; overflow: hidden;
  }
  .flamme { display: inline-flex; color: var(--text-tertiary); }
  .flamme.laeuft { color: var(--accent); }
  .flamme.heute { color: var(--positive); }

  .block {
    display: flex; align-items: stretch; gap: var(--space-m); width: 100%; text-align: left;
    background: var(--raised); border: 1px solid var(--hairline); border-radius: var(--radius-card); overflow: hidden;
    margin-bottom: var(--space-xl);
  }
  .block--hervorgehoben { background: var(--accent-dim); border-color: rgba(0, 209, 218, 0.35); }
  .streifen { width: 3px; background: var(--accent); flex: none; }
  .streifen--breit { width: 4px; }
  .blocksymbol { width: 26px; display: grid; place-items: center; color: var(--accent); margin-left: var(--space-xs); }
  .blocktext { display: flex; flex-direction: column; gap: var(--space-xxs); padding: var(--space-m) 0; flex: 1; min-width: 0; }
  .blocktext .t-title { letter-spacing: -0.3px; color: var(--text); }
  .pfeil { display: grid; place-items: center; color: var(--accent); padding-right: var(--space-m); }
  .block:last-child { margin-bottom: 0; }

  .abschnitt { margin-bottom: var(--space-s); }
  .kacheln { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-s); margin-bottom: var(--space-xl); }
  .kachel {
    display: flex; flex-direction: column; align-items: flex-start; text-align: left;
    height: calc(96px + 2 * var(--space-m)); padding: var(--space-m);
  }
  .kachel:active { transform: scale(0.975); }
  .kachelkopf { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 34px; margin-bottom: auto; }
  .kreis { width: 34px; height: 34px; border-radius: 50%; background: var(--accent-dim); color: var(--accent); display: grid; place-items: center; }
  .serienpille { display: inline-flex; align-items: center; gap: 2px; color: var(--accent); background: var(--accent-dim); border-radius: 999px; padding: 2px var(--space-xs); }
  .kacheltitel { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
</style>
