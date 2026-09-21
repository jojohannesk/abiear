<script lang="ts">
  // Das Lernblatt: erst das Vorgehen, dann die Vokabeln. Tab (ohne onClose)
  // und Blatt (mit onClose) zugleich. Aus `Views/LernView.swift`.
  import { tick } from "svelte";
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { Kinds, type Kind } from "../../kern/QuizTask";
  import { Lernhilfen, type Lernbeispiel, type Lernhilfe } from "../../kern/Lernhilfen";
  import { MusicData, type RhythmCell, type RhythmFigure } from "../../kern/MusicData";
  import { AbcNotation } from "../../kern/AbcNotation";
  import { Performance } from "../../klang/Performance";
  import { Haptics } from "../../plattform/Haptik";
  import TopBar from "../Bausteine/TopBar.svelte";
  import SegmentedBar from "../Bausteine/SegmentedBar.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import Markiert from "../Bausteine/Markiert.svelte";
  import Notenbild from "../Bausteine/Notenbild.svelte";
  import AkkordBaum from "./AkkordBaum.svelte";

  interface Props { store: QuizStore; kinds: readonly Kind[]; fokus?: string | null; onClose?: (() => void) | null }
  let { store, kinds, fokus = null, onClose = null }: Props = $props();

  const grundton = 60;
  const klopfton = 72;

  let auswahl = $state(0);
  let scroller: HTMLDivElement;
  const offenerKind = $derived(kinds[Math.min(auswahl, kinds.length - 1)] ?? kinds[0]);
  const schritte = $derived(Lernhilfen.strategie(offenerKind));
  const vokabelKind = $derived<Kind>(offenerKind === "melody" ? "interval" : offenerKind);
  const hilfen = $derived(Lernhilfen.alle(vokabelKind));

  function ueberschrift(kind: Kind): string {
    switch (kind) {
      case "rhythm": return "Die Rhythmusvokabeln";
      case "melody": return "Dazu: die Intervalle";
      default: return "Woran du es hörst";
    }
  }

  function zelle(id: string): RhythmCell | null {
    return [...MusicData.rhythm1Beat, ...MusicData.rhythm2Beat].find((c) => c.id === id) ?? null;
  }

  function zellenTakt(z: RhythmCell): RhythmFigure[][] {
    const proTakt = Math.max(1, Math.trunc(4.0 / z.duration));
    const takt: RhythmFigure[] = [];
    for (let n = 0; n < proTakt; n++) {
      takt.push({ id: z.id, duration: z.duration, name: z.name, offsets: z.offsets, startBeat: n * z.duration, isTriplet: z.isTriplet });
    }
    return [takt];
  }

  function spiele(beispiel: Lernbeispiel) {
    const audio = store.audio;
    audio.activate();
    audio.stopAll();
    if (beispiel.art === "zusammenklang") {
      audio.play(Performance.gehoerTask(grundton, beispiel.offsets, audio.bank, audio.sampleRate));
    } else {
      const z = zelle(beispiel.id);
      if (!z) return;
      audio.play(Performance.zellenBeispiel(z, klopfton, audio.bank, audio.sampleRate));
    }
  }

  function id(h: Lernhilfe): string {
    return "hilfe-" + h.titel.replace(/[^a-zA-Z0-9]+/g, "-");
  }

  $effect(() => {
    void auswahl;
    scroller?.scrollTo({ top: 0 });
  });

  $effect(() => {
    if (!fokus) return;
    const ziel = hilfen.find((h) => h.titel === fokus);
    if (!ziel) return;
    void tick().then(() => {
      setTimeout(() => {
        document.getElementById(id(ziel))?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 150);
    });
  });
</script>

<div class="seite">
  <TopBar title="Lernen" {onClose} />
  {#if kinds.length > 1}
    <div class="segmente"><SegmentedBar titles={kinds.map(Kinds.badgeTitle)} selection={auswahl} onselect={(i) => (auswahl = i)} /></div>
  {/if}

  <div class="scroll" bind:this={scroller}>
    <div class="inhalt lernen">
      {#if schritte.length > 0}
        <section class="vorgehen">
          <div class="t-label c-accent">So gehe ich vor — {Kinds.badgeTitle(offenerKind)}</div>
          {#each schritte as schritt}
            <div class="schritt">
              <span class="symbol"><Icon name={schritt.symbol} size={18} /></span>
              <div class="text">
                <div class="t-headline c-text">{schritt.title}</div>
                <p class="t-body c-secondary"><Markiert text={schritt.text} /></p>
              </div>
            </div>
          {/each}
        </section>
      {/if}

      {#if offenerKind === "chord"}
        <section class="abschnitt">
          <div class="t-label">Terz auf Terz</div>
          <AkkordBaum />
        </section>
      {/if}

      {#if hilfen.length > 0}
        <section class="abschnitt hilfen">
          <div class="t-label">{ueberschrift(offenerKind)}</div>
          {#each hilfen as hilfe (hilfe.titel)}
            {@const z = hilfe.beispiel?.art === "zelle" ? zelle(hilfe.beispiel.id) : null}
            <div class="karte hilfe" id={id(hilfe)}>
              <div class="kopf">
                <span class="t-body-medium c-text">{hilfe.titel}</span>
                {#if hilfe.beispiel}
                  <button class="hoeren druck" onclick={() => { Haptics.tap(); spiele(hilfe.beispiel!); }}><Icon name="play.fill" size={10} />Anhören</button>
                {/if}
              </div>
              {#if z}
                {@const takt = zellenTakt(z)}
                <div class="zelle"><Notenbild abc={AbcNotation.rhythmToAbc(takt, 1)} staffWidth={200} maxHeight={130} beschreibung={AbcNotation.rhythmBeschreibung(takt)} /></div>
                <div class="t-small c-secondary ziffern">gezählt: {Lernhilfen.zaehlweise(z)}</div>
              {/if}
              {#if hilfe.klang}<p class="t-body c-secondary">{hilfe.klang}</p>{/if}
              {#if hilfe.lied.length > 0}
                <div class="beschriftet"><div class="t-label">Liedanfang</div><div class="t-small c-secondary">{hilfe.lied.join(" · ")}</div></div>
              {/if}
              {#if hilfe.verwechseltMit && hilfe.verwechslung}
                <div class="beschriftet"><div class="t-label">Verwechselt mit {hilfe.verwechseltMit}</div><div class="t-small c-secondary">{hilfe.verwechslung}</div></div>
              {/if}
            </div>
          {/each}
        </section>
      {/if}

      <p class="vorbehalt t-small c-tertiary">{Lernhilfen.vorbehalt}</p>
    </div>
  </div>
</div>

<style>
  p { margin: 0; }
  .segmente { padding: var(--space-xs) var(--space-m) 0; }
  .lernen { padding-top: var(--space-l); padding-bottom: calc(var(--space-xl) + var(--sicher-unten)); display: flex; flex-direction: column; gap: var(--space-xl); }
  .vorgehen { display: flex; flex-direction: column; gap: var(--space-l); }
  .schritt { display: flex; gap: var(--space-m); align-items: flex-start; }
  .symbol { width: 26px; display: grid; place-items: center; color: var(--accent); padding-top: 2px; flex: none; }
  .text { display: flex; flex-direction: column; gap: var(--space-xxs); }
  .abschnitt { display: flex; flex-direction: column; gap: var(--space-s); }
  .hilfen { gap: var(--space-m); }
  .hilfe { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-s); scroll-margin-top: var(--space-m); }
  .kopf { display: flex; align-items: center; gap: var(--space-s); justify-content: space-between; }
  .hoeren { display: inline-flex; align-items: center; gap: var(--space-xs); height: 30px; padding: 0 var(--space-s); border-radius: 999px; background: var(--accent-dim); color: var(--accent); font-size: var(--font-small); flex: none; }
  .hoeren:active { transform: scale(0.97); }
  .zelle :global(.papier) { border-radius: var(--radius-control); padding: var(--space-xxs) var(--space-xs); }
  .beschriftet { display: flex; flex-direction: column; gap: 1px; }
  .vorbehalt { padding-top: var(--space-s); }
</style>
