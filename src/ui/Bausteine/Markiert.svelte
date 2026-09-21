<script lang="ts">
  // Text mit **fett** — die Auszeichnung, die die Texte aus Swift tragen.
  interface Props { text: string }
  let { text }: Props = $props();
  const teile = $derived(text.split(/(\*\*[^*]+\*\*)/g).filter((t) => t !== ""));
</script>

{#each teile as teil}{#if teil.startsWith("**")}<strong>{teil.slice(2, -2)}</strong>{:else}{teil}{/if}{/each}

<style>
  strong { font-weight: 600; color: var(--text); }
</style>
