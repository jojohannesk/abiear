<script lang="ts">
  // Eine Zeile der Statistik: Beschriftung, Wert, darunter ein Balken. Die
  // Stichprobengröße steht immer daneben.
  import Icon from "./Icon.svelte";
  import ThinProgress from "./ThinProgress.svelte";

  interface Props {
    fraction: number;
    label: string;
    detail: string;
    tint?: "accent" | "positive" | "negative";
    faded?: boolean;
    hatHilfe?: boolean;
  }
  let { fraction, label, detail, tint = "accent", faded = false, hatHilfe = false }: Props = $props();
</script>

<div class="stat">
  <div class="zeile">
    <span class="label t-body" class:faded>{label}</span>
    {#if hatHilfe}<span class="hilfe"><Icon name="chevron.right" size={9} weight={3} /></span>{/if}
    <span class="detail t-small ziffern">{detail}</span>
  </div>
  <ThinProgress {fraction} tint={faded ? "tertiary" : tint} />
</div>

<style>
  .stat { padding: var(--space-xs) 0; display: flex; flex-direction: column; gap: var(--space-xs); }
  .zeile { display: flex; align-items: baseline; gap: var(--space-s); }
  .label { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label.faded { color: var(--text-secondary); }
  .hilfe { color: var(--accent); display: inline-flex; align-self: center; }
  .detail { margin-left: auto; color: var(--text-tertiary); white-space: nowrap; }
</style>
