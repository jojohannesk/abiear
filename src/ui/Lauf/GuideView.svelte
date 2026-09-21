<script lang="ts">
  // Die ausführliche Anleitung zu einem Bereich — die Prüfungsordnung.
  import { DisciplineGuides } from "../../kern/DisciplineGuide";
  import { TrainingModes, type TrainingMode } from "../../kern/QuizTask";
  import TopBar from "../Bausteine/TopBar.svelte";

  interface Props { mode: TrainingMode; onClose: () => void }
  let { mode, onClose }: Props = $props();
  const guide = $derived(DisciplineGuides.forMode(mode));
</script>

<div class="seite">
  <TopBar title={TrainingModes.title(mode)} {onClose} />
  <div class="scroll">
    <div class="inhalt guide">
      <p class="karte zusammenfassung t-body c-text">{guide.summary}</p>
      {#each guide.sections as section}
        <section>
          <div class="t-label">{section.title}</div>
          <ul>
            {#each section.lines as line}
              <li class="t-small c-secondary"><span class="punkt"></span><span>{line}</span></li>
            {/each}
          </ul>
        </section>
      {/each}
      <p class="t-tiny c-tertiary">Nach dem „Leitfaden fachpraktisches Abitur Musik“ des Landes Baden-Württemberg (offizielle PDF, so auch zu suchen). Die App übt darauf hin, ersetzt ihn aber nicht.</p>
    </div>
  </div>
</div>

<style>
  .guide { padding-top: var(--space-l); padding-bottom: calc(var(--space-xl) + var(--sicher-unten)); display: flex; flex-direction: column; gap: var(--space-xl); }
  p { margin: 0; }
  .zusammenfassung { padding: var(--space-m); }
  section { display: flex; flex-direction: column; gap: var(--space-s); }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
  li { display: flex; gap: var(--space-s); align-items: flex-start; }
  .punkt { width: 3px; height: 3px; border-radius: 50%; background: var(--text-tertiary); margin-top: 8px; flex: none; }
</style>
