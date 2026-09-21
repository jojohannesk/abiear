<script lang="ts">
  // Anbieterkennzeichnung nach § 5 DDG. Aus `Views/ImpressumView.swift`.
  import TopBar from "../Bausteine/TopBar.svelte";
  import { Impressum } from "../../plattform/Rechtliches";

  interface Props { onClose: () => void }
  let { onClose }: Props = $props();
</script>

<div class="seite">
  <TopBar title="Impressum" {onClose} />
  <div class="scroll">
    <div class="inhalt impressum">
      {#if !Impressum.ausgefuellt}<div class="t-small-medium c-negative">Vor der Veröffentlichung ausfüllen: plattform/Rechtliches.ts</div>{/if}
      <section>
        <div class="t-label">Angaben gemäß § 5 DDG</div>
        <div class="t-body c-text">{Impressum.name}</div>
        <div class="t-body c-text">{Impressum.strasse}</div>
        <div class="t-body c-text">{Impressum.plzOrt}</div>
        <div class="t-body c-text">{Impressum.land}</div>
      </section>
      <section>
        <div class="t-label">Kontakt</div>
        <div class="t-body c-text">E-Mail: {Impressum.email}</div>
        {#if Impressum.telefon}<div class="t-body c-text">Telefon: {Impressum.telefon}</div>{/if}
      </section>
      <section>
        <div class="t-label">Verantwortlich für den Inhalt</div>
        <div class="t-body c-text">{Impressum.name}</div>
      </section>
      <p class="t-small c-tertiary">AbiEar ist ein Übungsprogramm für die Gehörbildung im Abitur Musik Baden-Württemberg. Die Inhalte folgen dem Leitfaden fachpraktisches Abitur Musik des Landes; maßgeblich bleibt der Leitfaden, nicht diese App.</p>
    </div>
  </div>
</div>

<style>
  p { margin: 0; }
  .impressum { padding-top: var(--space-l); padding-bottom: calc(var(--space-xl) + var(--sicher-unten)); display: flex; flex-direction: column; gap: var(--space-l); }
  section { display: flex; flex-direction: column; gap: var(--space-s); }
</style>
