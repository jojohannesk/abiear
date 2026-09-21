<script lang="ts">
  // Auswertung der eigenen Übungsergebnisse. Ehrlichkeit vor Vollständigkeit:
  // neben jeder Quote steht ihre Grundlage, dünn belegte Einträge stehen in
  // einem eigenen Abschnitt. Aus `Views/StatisticsView.swift`.
  import type { QuizStore } from "../../kern/QuizStore.svelte";
  import { Kinds, TrainingModes, type Kind } from "../../kern/QuizTask";
  import { DictationLevels, type DictationLevel } from "../../kern/DictationLevel";
  import { StatisticsInsights, hasEnoughData, KULANZ_INTERVALL, type ItemStats, type Uebungsserie, type BarStats, type TrendPoint } from "../../kern/StatisticsInsights";
  import { Lernhilfen } from "../../kern/Lernhilfen";
  import { Haptics } from "../../plattform/Haptik";
  import TopBar from "../Bausteine/TopBar.svelte";
  import SegmentedBar from "../Bausteine/SegmentedBar.svelte";
  import StatBar from "../Bausteine/StatBar.svelte";
  import Icon from "../Bausteine/Icon.svelte";
  import Sheet from "../Bausteine/Sheet.svelte";
  import LernView from "../Lernen/LernView.svelte";

  interface Props { store: QuizStore; onClose?: (() => void) | null }
  let { store, onClose = null }: Props = $props();

  const kinds: Kind[] = Kinds.all.filter((k) => TrainingModes.visible.some((m) => TrainingModes.kinds(m).includes(k)));
  let discipline = $state(0);
  let levelFilter = $state<DictationLevel | null>(null);
  let lernFokus = $state<string | null>(null);
  let scroller: HTMLDivElement;

  const kind = $derived(kinds[discipline]);
  const isDictation = $derived(Kinds.dictations.includes(kind));
  const allInsights = $derived.by(() => { void store.statistikRevision; return store.insights; });
  const insights = $derived(allInsights.filtered(levelFilter));
  const statistics = $derived(store.statistics);
  const leer = $derived.by(() => { void store.statistikRevision; return statistics.isEmpty; });

  function hatHilfe(titel: string): boolean {
    return Lernhilfen.hilfe(kind, titel) !== null;
  }

  function kulanzText(s: Uebungsserie): string {
    const verdient = `Je ${KULANZ_INTERVALL} Tage Serie bekommst du einen Kulanztag, der einen ausgelassenen Tag überbrückt. Ungenutzt verfällt er nicht.`;
    let stand = "";
    if (s.kulanzUebrig > 0) stand = s.kulanzUebrig === 1 ? " Du hast einen übrig." : ` Du hast ${s.kulanzUebrig} übrig.`;
    if (s.kulanzGenutzt > 0) stand += s.kulanzGenutzt === 1 ? " In dieser Serie steckt ein überbrückter Tag." : ` In dieser Serie stecken ${s.kulanzGenutzt} überbrückte Tage.`;
    return verdient + stand;
  }

  function runLabel(n: number): string {
    if (kind === "interval" || kind === "chord") return n === 1 ? "1 Durchgang" : `${n} Durchgänge`;
    return n === 1 ? "1 Diktat" : `${n} Diktate`;
  }
  function sampleLabel(n: number): string {
    if (kind === "interval" || kind === "chord") return n === 1 ? "aus 1 Aufgabe" : `aus ${n} Aufgaben`;
    return n === 1 ? "aus 1 Takt" : `aus ${n} bewerteten Takten`;
  }
  function tint(smoothed: number): "negative" | "accent" | "positive" {
    return smoothed < 0.5 ? "negative" : smoothed < 0.75 ? "accent" : "positive";
  }

  const P = " P";
  const levelOptions: (DictationLevel | null)[] = [null, ...DictationLevels.all];

  $effect(() => { void discipline; levelFilter = null; scroller?.scrollTo({ top: 0 }); });
  $effect(() => { void levelFilter; scroller?.scrollTo({ top: 0 }); });

  function wechsel(i: number) { discipline = i; }

  function saeulenhoehe(stat: BarStats): number { return Math.max(3, 84 * Math.min(1, stat.averagePoints / 2)); }
  function trendhoehe(p: TrendPoint): number { return p.value === null ? 3 : Math.max(3, 64 * Math.min(1, Math.max(0, p.value))); }
</script>

{#snippet lernbar(titel: string, inhalt: import("svelte").Snippet)}
  {#if hatHilfe(titel)}
    <button class="lernbar" onclick={() => (lernFokus = titel)}>{@render inhalt()}</button>
  {:else}
    {@render inhalt()}
  {/if}
{/snippet}

{#snippet sparse(items: ItemStats[], unit: string)}
  <section class="abschnitt">
    <div class="t-label">Zu wenig Daten</div>
    {#each items as item (item.name)}
      <StatBar fraction={item.accuracy} label={item.name} detail={`${item.correct}/${item.attempts}${unit}`} faded />
    {/each}
    <p class="t-tiny c-tertiary">Ab {StatisticsInsights.minimumSamples} Gelegenheiten wandern diese Einträge nach oben in die Rangliste.</p>
  </section>
{/snippet}

<div class="seite">
  <TopBar title="Statistik" {onClose} />
  <div class="segmente"><SegmentedBar titles={kinds.map(Kinds.badgeTitle)} selection={discipline} onselect={wechsel} /></div>

  {#if isDictation && !leer}
    <div class="niveaufilter" role="radiogroup" aria-label="Niveau">
      {#each levelOptions as option}
        {@const active = levelFilter === option}
        <button class="filter" class:aktiv={active} role="radio" aria-checked={active} onclick={() => { levelFilter = option; Haptics.select(); }}>
          <span class="t-small">{option ? DictationLevels.shortTitle(option) : "Alle"}</span>
        </button>
      {/each}
    </div>
  {/if}

  <div class="scroll" bind:this={scroller}>
    <div class="inhalt statistik">
      {#if leer}
        <div class="karte leer">
          <div class="t-headline c-text">Noch nichts aufgezeichnet</div>
          <p class="t-body c-secondary">Sobald du Aufgaben löst, siehst du hier, welche Intervalle und Akkorde noch nicht sitzen, welche Takte in den Diktaten die schwersten sind und wie sich das über die Wochen entwickelt.</p>
        </div>
      {:else}
        {@const s = allInsights.serie(null, undefined, store.heute)}
        {@const disziplin = allInsights.serie(kind, undefined, store.heute)}
        <div class="karte serie">
          <div class="t-label">Übungsserie</div>
          <div class="serienzahl">
            <span class="t-display ziffern" class:c-accent={s.aktuell > 0} class:c-secondary={s.aktuell === 0}>{s.aktuell}</span>
            <span class="t-small c-tertiary">{s.aktuell === 1 ? "Tag in Folge" : "Tage in Folge"}</span>
            <span class="t-tiny rechts" class:c-positive={s.heuteGeuebt} class:c-tertiary={!s.heuteGeuebt}>{s.heuteGeuebt ? "heute erledigt" : "heute noch offen"}</span>
          </div>
          <div class="zeile"><span class="t-small c-secondary">Längste Serie</span><span class="t-small-medium c-text ziffern">{s.laengste === 1 ? "1 Tag" : `${s.laengste} Tage`}</span></div>
          <div class="zeile"><span class="t-small c-secondary">Geübte Tage</span><span class="t-small-medium c-text ziffern">{s.geuebteTage === 1 ? "1 Tag" : `${s.geuebteTage} Tage`}</span></div>
          {#if disziplin.aktuell >= 2}
            <div class="zeile"><span class="t-small c-secondary">{Kinds.badgeTitle(kind)}</span><span class="t-small-medium c-text ziffern">{disziplin.aktuell} Tage in Folge</span></div>
          {/if}
          <div class="haarlinie"></div>
          <p class="t-tiny c-tertiary">{kulanzText(s)}</p>
        </div>

        {@const entry = insights.overview().find((o) => o.kind === kind)}
        {@const samples = entry?.samples ?? 0}
        {@const genug = samples >= StatisticsInsights.minimumSamples}
        <div class="summary">
          <div class="t-label">{isDictation ? "Durchschnitt" : "Trefferquote"}</div>
          {#if genug && entry?.headline !== null && entry?.headline !== undefined}
            <div class="quote"><span class="t-display c-text ziffern">{Math.round(entry.headline * 100)} %</span><span class="t-small c-tertiary">{sampleLabel(samples)}</span></div>
          {:else}
            <div class="t-title c-secondary">Noch keine Aussage</div>
            <p class="t-small c-tertiary">{samples === 0 ? "Übe einmal, dann steht hier dein Stand." : sampleLabel(samples) + " — das ist zu wenig für eine Quote."}</p>
          {/if}
          <div class="laeufe">
            <span class="t-small c-secondary">{runLabel(insights.runCount(kind))}</span>
            {#if levelFilter === null}
              {@const left = allInsights.runsUntilAdaptive(kind)}
              {#if left > 0}
                <span class="t-small c-tertiary">· noch {left} bis „Adaptiv üben“</span>
              {:else}
                <span class="t-small c-positive frei"><Icon name="target" size={12} weight={2.2} />Adaptiv üben frei</span>
              {/if}
            {/if}
          </div>
        </div>

        {#if kind === "interval" || kind === "chord"}
          {@const items = insights.itemStats(kind)}
          {@const solid = items.filter(hasEnoughData)}
          {@const duenn = items.filter((i) => !hasEnoughData(i))}
          {@const mixups = insights.confusions(kind)}
          {#if solid.length > 0}
            <section class="abschnitt">
              <div class="t-label">Schwächste zuerst</div>
              {#each solid as item (item.name)}
                {#snippet zeileInhalt()}<StatBar fraction={item.accuracy} label={item.name} detail={`${item.correct}/${item.attempts}`} tint={tint(item.smoothed)} hatHilfe={hatHilfe(item.name)} />{/snippet}
                {@render lernbar(item.name, zeileInhalt)}
              {/each}
            </section>
          {/if}
          {#if mixups.length > 0}
            <section class="abschnitt">
              <div class="t-label">Häufigste Verwechslungen</div>
              {#each mixups as m (m.solution + "→" + m.mistaken)}
                {#snippet mixInhalt()}
                  <div class="mixup">
                    <span class="t-body c-text">{m.solution}</span>
                    <span class="c-tertiary"><Icon name="arrow.right" size={10} weight={2.6} /></span>
                    <span class="t-body c-negative">{m.mistaken}</span>
                    <span class="rechts mixrechts">
                      {#if hatHilfe(m.solution)}<span class="c-accent"><Icon name="chevron.right" size={9} weight={3} /></span>{/if}
                      <span class="t-small c-tertiary ziffern">{m.count}×</span>
                    </span>
                  </div>
                {/snippet}
                {@render lernbar(m.solution, mixInhalt)}
              {/each}
            </section>
          {/if}
          {#if duenn.length > 0}{@render sparse(duenn, "")}{/if}
        {:else}
          {@const items = kind === "rhythm" ? insights.figureStats() : insights.moveStats()}
          {@const solid = items.filter(hasEnoughData)}
          {@const duenn = items.filter((i) => !hasEnoughData(i))}
          {@const breakdown = allInsights.levelBreakdown(kind)}
          {@const withoutLevel = allInsights.barsWithoutLevel(kind)}
          {#if levelFilter === null && (breakdown.length > 1 || withoutLevel > 0)}
            <section class="abschnitt">
              <div class="t-label">Nach Niveau</div>
              {#each breakdown as e (e.level)}
                <StatBar fraction={e.stats.accuracy} label={DictationLevels.title(e.level)} detail={`${e.stats.correct}/${e.stats.attempts}${P}`} tint={tint(e.stats.smoothed)} faded={!hasEnoughData(e.stats)} />
              {/each}
              {#if withoutLevel > 0}
                <p class="t-tiny c-tertiary">Dazu {withoutLevel} Takte aus der Zeit vor den Niveaus. Sie zählen in die Gesamtwerte, lassen sich aber keiner Stufe zuordnen.</p>
              {/if}
            </section>
          {/if}

          <section class="abschnitt">
            <div class="t-label">Punkte je Takt</div>
            <div class="saeulen">
              {#each insights.barStats(kind) as stat (stat.bar)}
                <div class="saeule" role="img" aria-label={stat.assessed === 0 ? `Takt ${stat.bar + 1}: keine Daten` : `Takt ${stat.bar + 1}: ${stat.averagePoints.toFixed(1)} von 2 Punkten aus ${stat.assessed} Diktaten`}>
                  <span class="t-small ziffern" class:c-tertiary={stat.assessed === 0} class:c-secondary={stat.assessed > 0}>{stat.assessed === 0 ? "–" : stat.averagePoints.toFixed(1)}</span>
                  <span class="balkenraum"><span class="balken" class:leer={stat.assessed === 0} style="height: {saeulenhoehe(stat)}px"></span></span>
                  <span class="t-tiny c-tertiary ziffern">{stat.bar + 1}</span>
                </div>
              {/each}
            </div>
          </section>

          {#if insights.bars.length === 0 && levelFilter !== null}
            <p class="t-body c-secondary">Auf der Stufe „{DictationLevels.shortTitle(levelFilter)}“ wurde noch nicht geübt.</p>
          {/if}

          {#if solid.length > 0}
            <section class="abschnitt">
              <div class="t-label">{kind === "rhythm" ? "Rhythmusvokabeln" : "Bewegungen"}</div>
              {#each solid as item (item.name)}
                {#snippet vokInhalt()}<StatBar fraction={item.accuracy} label={item.name} detail={`${item.correct}/${item.attempts}${P}`} tint={tint(item.smoothed)} hatHilfe={hatHilfe(item.name)} />{/snippet}
                {@render lernbar(item.name, vokInhalt)}
              {/each}
            </section>
          {/if}

          {#if kind === "melody"}
            {@const keys = insights.keyStats().filter(hasEnoughData)}
            {#if keys.length > 0}
              <section class="abschnitt">
                <div class="t-label">Tonarten</div>
                {#each keys as item (item.name)}
                  <StatBar fraction={item.accuracy} label={item.name} detail={`${item.correct}/${item.attempts}${P}`} tint={tint(item.smoothed)} />
                {/each}
              </section>
            {/if}
          {/if}

          {#if duenn.length > 0}{@render sparse(duenn, P)}{/if}
        {/if}

        {@const points = insights.trend(kind, 8, undefined, store.jetztDatum())}
        {#if points.some((p) => p.value !== null)}
          <section class="abschnitt">
            <div class="t-label">Letzte 8 Wochen</div>
            <div class="trend">
              {#each points as p (p.weekStart.getTime())}
                <span class="trendsaeule" role="img" aria-label={p.value === null ? "Woche ohne Übung" : `${Math.round(p.value * 100)} Prozent aus ${p.samples} Aufgaben`}>
                  <span class="trendbalken" class:leer={p.value === null} style="height: {trendhoehe(p)}px"></span>
                </span>
              {/each}
            </div>
            <div class="trendbeschriftung t-tiny c-tertiary"><span>vor 8 Wochen</span><span>diese Woche</span></div>
          </section>
        {/if}

        <div class="fussnoten">
          {#if isDictation}<p class="t-tiny c-tertiary">Diese Werte sind gerechnet: verglichen wird, was du notiert hast, Schlag für Schlag mit der Lösung.</p>{/if}
          {#if kind === "melody"}<p class="t-tiny c-tertiary">Läufe von früher, als du dich noch selbst bewertet hast, zählen unverändert weiter — dort verteilen sich die Punkte eines Taktes auf alle Bewegungen darin.</p>{/if}
          <p class="t-tiny c-tertiary">Alle Daten bleiben auf diesem Gerät.</p>
          {#if statistics.lastError}<p class="t-tiny c-negative">{statistics.lastError}</p>{/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<Sheet offen={lernFokus !== null} onClose={() => (lernFokus = null)}>
  <LernView {store} kinds={[kind]} fokus={lernFokus} onClose={() => (lernFokus = null)} />
</Sheet>

<style>
  p { margin: 0; }
  .segmente { padding: 0 var(--space-m); flex: none; }
  .niveaufilter { display: flex; gap: var(--space-xxs); padding: var(--space-s) var(--space-m) 0; flex: none; }
  .filter { flex: 1; height: var(--touch-min); display: grid; place-items: center; }
  .filter span { display: grid; place-items: center; width: 100%; height: 30px; border-radius: 8px; background: var(--sunken); color: var(--text-secondary); transition: background 0.16s, color 0.16s; }
  .filter.aktiv span { background: var(--accent); color: var(--on-accent); }
  .filter:active { transform: scale(0.96); }

  .statistik { padding: var(--space-l) var(--space-m) calc(var(--space-xl) + var(--sicher-unten)); display: flex; flex-direction: column; gap: var(--space-xl); }
  .leer { padding: var(--space-l); display: flex; flex-direction: column; gap: var(--space-s); }
  .serie { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-s); }
  .serienzahl { display: flex; align-items: baseline; gap: var(--space-s); }
  .rechts { margin-left: auto; }
  .zeile { display: flex; justify-content: space-between; gap: var(--space-s); }
  .summary { display: flex; flex-direction: column; gap: var(--space-xs); }
  .quote { display: flex; align-items: baseline; gap: var(--space-s); }
  .laeufe { display: flex; gap: var(--space-s); align-items: center; flex-wrap: wrap; }
  .frei { display: inline-flex; align-items: center; gap: 4px; }
  .abschnitt { display: flex; flex-direction: column; gap: var(--space-s); }
  .lernbar { width: 100%; text-align: left; display: block; }
  .mixup { display: flex; align-items: center; gap: var(--space-s); padding: var(--space-xs) 0; white-space: nowrap; overflow: hidden; }
  .mixrechts { display: inline-flex; align-items: center; gap: var(--space-s); }
  .saeulen { display: flex; gap: var(--space-s); height: 108px; align-items: flex-end; }
  .saeule { flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--space-xs); height: 100%; }
  .balkenraum { flex: 1; width: 100%; max-width: 34px; display: flex; align-items: flex-end; }
  .balken { display: block; width: 100%; border-radius: 3px; background: var(--accent); }
  .balken.leer { background: var(--sunken); }
  .trend { display: flex; gap: var(--space-xxs); height: 64px; align-items: flex-end; }
  .trendsaeule { flex: 1; display: flex; align-items: flex-end; height: 100%; }
  .trendbalken { display: block; width: 100%; border-radius: 2px; background: var(--accent); }
  .trendbalken.leer { background: var(--hairline); }
  .trendbeschriftung { display: flex; justify-content: space-between; }
  .fussnoten { display: flex; flex-direction: column; gap: var(--space-xs); }
</style>
