<script lang="ts">
  // Schalter und Uhrzeit der täglichen Erinnerung. Aus `Views/ErinnerungView.swift`.
  import type { StatisticsInsights } from "../../kern/StatisticsInsights";
  import type { Erinnerungen } from "../../plattform/Erinnerungen.svelte";
  import Icon from "../Bausteine/Icon.svelte";

  interface Props { erinnerungen: Erinnerungen; insights: StatisticsInsights }
  let { erinnerungen, insights }: Props = $props();
  let frageLaeuft = $state(false);

  async function schalten() {
    if (erinnerungen.zustand === "an") { erinnerungen.ausschalten(); return; }
    frageLaeuft = true;
    await erinnerungen.einschalten(insights);
    frageLaeuft = false;
  }

  const uhrzeitWert = $derived(`${String(erinnerungen.uhrzeit.hour).padStart(2, "0")}:${String(erinnerungen.uhrzeit.minute).padStart(2, "0")}`);

  function uhrzeitGeaendert(e: Event) {
    const [h, m] = (e.currentTarget as HTMLInputElement).value.split(":").map(Number);
    if (Number.isInteger(h) && Number.isInteger(m)) erinnerungen.setzeUhrzeit({ hour: h, minute: m }, insights);
  }
</script>

<section class="abschnitt">
  <div class="t-label">Tägliche Erinnerung</div>
  <div class="karte block">
    <button class="zeile" onclick={schalten} disabled={frageLaeuft}>
      <span class="glocke" class:an={erinnerungen.zustand === "an"}><Icon name="bell.fill" size={14} weight={2} /></span>
      <span class="t-body-medium c-text">Ans Üben erinnern</span>
      <span class="rechts">
        {#if erinnerungen.zustand === "vomSystemAbgelehnt"}
          <span class="t-tiny c-negative">Im Browser nicht erlaubt</span>
        {:else}
          <span class="schalter t-small-medium" class:an={erinnerungen.zustand === "an"}>{erinnerungen.zustand === "an" ? "An" : "Aus"}</span>
        {/if}
      </span>
    </button>

    {#if erinnerungen.zustand === "an"}
      <div class="uhrzeit">
        <span class="t-small c-secondary">Uhrzeit</span>
        <input type="time" value={uhrzeitWert} onchange={uhrzeitGeaendert} aria-label="Uhrzeit der Erinnerung" />
      </div>
      <p class="t-tiny c-tertiary">Wenn du an einem Tag schon geübt hast, kommt an diesem Tag keine Erinnerung mehr.</p>
      {#if erinnerungen.nurImVordergrund}
        <p class="t-tiny c-tertiary">Im Browser kann die Erinnerung nur erscheinen, solange AbiEar geöffnet ist — als installierte App auf dem Startbildschirm auch im Hintergrund, soweit das System es zulässt.</p>
      {/if}
    {/if}

    {#if erinnerungen.zustand === "vomSystemAbgelehnt"}
      <p class="t-tiny c-tertiary">Erlaube Mitteilungen für diese Seite in den Einstellungen deines Browsers und tippe dann erneut auf den Schalter.</p>
    {/if}
  </div>
</section>

<style>
  p { margin: 0; }
  .abschnitt { display: flex; flex-direction: column; gap: var(--space-s); }
  .block { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-s); }
  .zeile { display: flex; align-items: center; gap: var(--space-s); width: 100%; text-align: left; }
  .glocke { width: 20px; display: grid; place-items: center; color: var(--text-tertiary); }
  .glocke.an { color: var(--accent); }
  .rechts { margin-left: auto; display: flex; align-items: center; text-align: right; }
  .schalter { width: 48px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: var(--sunken); color: var(--text-secondary); }
  .schalter.an { background: var(--accent); color: var(--on-accent); }
  .uhrzeit { display: flex; align-items: center; justify-content: space-between; }
  input[type="time"] { font: inherit; color: var(--text); background: var(--sunken); border: 1px solid var(--hairline); border-radius: 8px; padding: 6px 10px; color-scheme: dark; }
</style>
