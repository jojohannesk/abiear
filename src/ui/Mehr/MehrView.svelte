<script lang="ts">
  // Der vierte Tab: Erinnerung, Übetempo-Voreinstellung, Zurücksetzen, Über,
  // Impressum, Datenschutz. Aus `Views/MehrView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import type { Erinnerungen } from "../../plattform/Erinnerungen.svelte";
  import { Performance } from "../../klang/Performance";
  import { Impressum, VERSION } from "../../plattform/Rechtliches";
  import { Haptics } from "../../plattform/Haptik";
  import TopBar from "../Bausteine/TopBar.svelte";
  import SecondaryButton from "../Bausteine/SecondaryButton.svelte";
  import ListRow from "../Bausteine/ListRow.svelte";
  import Sheet from "../Bausteine/Sheet.svelte";
  import Alert from "../Bausteine/Alert.svelte";
  import ErinnerungView from "./ErinnerungView.svelte";
  import AboutView from "./AboutView.svelte";
  import ImpressumView from "./ImpressumView.svelte";
  import DatenschutzView from "./DatenschutzView.svelte";

  interface Props { store: QuizStore; erinnerungen: Erinnerungen }
  let { store, erinnerungen }: Props = $props();

  let zeigeUeber = $state(false);
  let zeigeImpressum = $state(false);
  let zeigeDatenschutz = $state(false);
  let fragtZuruecksetzen = $state(false);
  const insights = $derived.by(() => { void store.statistikRevision; return store.insights; });
  const leer = $derived.by(() => { void store.statistikRevision; return store.statistics.isEmpty; });
</script>

<div class="seite">
  <TopBar title="Mehr" />
  <div class="scroll">
    <div class="inhalt mehr">
      <ErinnerungView {erinnerungen} {insights} />

      <section class="abschnitt">
        <div class="t-label">Übetempo</div>
        <div class="karte block">
          <div class="tempozeile">
            <span><span class="t-title ziffern c-text">{store.tempoBPM}</span><span class="t-small c-tertiary"> bpm</span></span>
            {#if store.tempoBPM === Performance.examBPM}<span class="pille t-tiny">Prüfungstempo</span>{/if}
          </div>
          <input class="slider" type="range" min={Performance.slowestBPM} max={Performance.examBPM} step="5" value={store.tempoBPM}
            aria-label="Übetempo in Schlägen pro Minute" oninput={(e) => store.setTempoBPM(Number((e.currentTarget as HTMLInputElement).value))} />
          <p class="t-tiny c-tertiary">Voreinstellung für alle Diktate. In der Vorbereitung lässt sich das Tempo für einen einzelnen Lauf ändern. Im Abitur wird mit Viertel etwa 60 diktiert.</p>
        </div>
      </section>

      <section class="abschnitt">
        <div class="t-label">Daten</div>
        <div class="karte block">
          <div class:gedimmt={leer}>
            <SecondaryButton title="Statistik zurücksetzen" symbol="xmark" tint="negative" onclick={() => { if (!leer) fragtZuruecksetzen = true; }} />
          </div>
          <p class="t-tiny c-tertiary">Alle Daten bleiben auf diesem Gerät. Kein Konto, kein Netz.</p>
        </div>
      </section>

      <section class="abschnitt">
        <div class="t-label">Über</div>
        <div class="karte liste">
          <ListRow symbol="info.circle" title="Über AbiEar" detail="Lizenzen" onclick={() => (zeigeUeber = true)} />
          <div class="trenner"></div>
          <ListRow symbol="person.text.rectangle" title="Impressum" detail={Impressum.ausgefuellt ? "" : "ausfüllen"} onclick={() => (zeigeImpressum = true)} />
          <div class="trenner"></div>
          <ListRow symbol="hand.raised" title="Datenschutz" detail="" onclick={() => (zeigeDatenschutz = true)} />
        </div>
        <div class="t-tiny c-tertiary version">Version {VERSION}</div>
      </section>
    </div>
  </div>
</div>

<Sheet offen={zeigeUeber} onClose={() => (zeigeUeber = false)}><AboutView onClose={() => (zeigeUeber = false)} /></Sheet>
<Sheet offen={zeigeImpressum} onClose={() => (zeigeImpressum = false)}><ImpressumView onClose={() => (zeigeImpressum = false)} /></Sheet>
<Sheet offen={zeigeDatenschutz} onClose={() => (zeigeDatenschutz = false)}><DatenschutzView onClose={() => (zeigeDatenschutz = false)} /></Sheet>

<Alert offen={fragtZuruecksetzen} titel="Statistik zurücksetzen?"
  text="Alle aufgezeichneten Ergebnisse werden gelöscht — und damit auch deine Übungsserie. Das lässt sich nicht rückgängig machen."
  knoepfe={[
    { titel: "Abbrechen", rolle: "cancel", onclick: () => (fragtZuruecksetzen = false) },
    { titel: "Zurücksetzen", rolle: "destructive", onclick: () => { fragtZuruecksetzen = false; void store.statistikZuruecksetzen(); Haptics.select(); } },
  ]} />

<style>
  p { margin: 0; }
  .mehr { padding-top: var(--space-l); padding-bottom: calc(var(--space-xl) + var(--sicher-unten)); display: flex; flex-direction: column; gap: var(--space-xl); }
  .abschnitt { display: flex; flex-direction: column; gap: var(--space-s); }
  .block { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-xs); }
  .tempozeile { display: flex; align-items: center; justify-content: space-between; gap: var(--space-s); }
  .pille { height: 24px; display: inline-flex; align-items: center; padding: 0 var(--space-s); border-radius: 999px; background: var(--accent-dim); color: var(--accent); }
  .slider { width: 100%; accent-color: var(--accent); margin: var(--space-xs) 0; height: 28px; }
  .block > div + p { margin-top: var(--space-xs); }
  .gedimmt { opacity: 0.5; pointer-events: none; }
  .liste { display: flex; flex-direction: column; overflow: hidden; }
  .trenner { height: 1px; background: var(--hairline); margin-left: calc(var(--space-m) + 24px + var(--space-m)); }
  .version { padding-top: var(--space-xxs); }
</style>
