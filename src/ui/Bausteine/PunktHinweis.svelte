<script lang="ts">
  // Hinweis über der Notenzeile, solange die Punktierung eingeschaltet ist.
  // Liegt über dem Notenbild, damit beim Umschalten nichts springt.
  interface Props { sichtbar: boolean }
  let { sichtbar }: Props = $props();
</script>

<span class="hinweis" class:sichtbar aria-hidden={!sichtbar}>Nächster Ton punktiert</span>

<style>
  .hinweis {
    position: absolute; top: var(--space-xs); right: var(--space-xs);
    padding: var(--space-xxs) var(--space-s); border-radius: 999px;
    background: var(--accent); color: var(--on-accent);
    font-size: var(--font-small); font-weight: 500;
    opacity: 0; transition: opacity 0.12s ease-out; pointer-events: none;
  }
  .hinweis.sichtbar { opacity: 1; }
</style>
