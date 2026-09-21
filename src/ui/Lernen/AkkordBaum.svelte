<script lang="ts">
  // Das Baumdiagramm der Akkorde — die Zeichnung aus dem Material, als Bild.
  // Antippen öffnet die Großansicht, in der man scrollen kann.
  import Icon from "../Bausteine/Icon.svelte";
  import Sheet from "../Bausteine/Sheet.svelte";
  import TopBar from "../Bausteine/TopBar.svelte";

  let vergroessert = $state(false);
  const bild = `${import.meta.env.BASE_URL}akkordbaum.png`;
</script>

<button class="baum druck" onclick={() => (vergroessert = true)}>
  <img src={bild} alt="Akkorde bestimmen: Terz auf Terz, als Baum" />
  <span class="hinweis t-tiny c-accent"><Icon name="arrow.up.left.and.arrow.down.right" size={10} weight={2.8} />Zum Lesen antippen</span>
</button>

<Sheet offen={vergroessert} onClose={() => (vergroessert = false)}>
  <div class="seite">
    <TopBar title="Akkorde bestimmen" onClose={() => (vergroessert = false)} />
    <div class="gross"><img src={bild} alt="Akkorde bestimmen: Terz auf Terz, als Baum" /></div>
  </div>
</Sheet>

<style>
  .baum { width: 100%; display: flex; flex-direction: column; gap: var(--space-xs); align-items: center; }
  .baum:active { transform: scale(0.99); }
  .baum img { width: 100%; height: auto; border-radius: var(--radius-control); display: block; }
  .hinweis { display: inline-flex; align-items: center; gap: var(--space-xs); }
  .gross { flex: 1; overflow: auto; padding: var(--space-m); -webkit-overflow-scrolling: touch; }
  .gross img { width: 220%; max-width: none; height: auto; display: block; }
</style>
