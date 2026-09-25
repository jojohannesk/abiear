<script lang="ts">
  // Datenschutzerklärung. Kurz, weil es kurz ist: kein Server, nichts wird
  // gesendet. Speicherung, Löschen, Mitteilungen und Bereitstellung hängen an
  // der Fassung (Browser oder Android) und stehen in `Fassung.ts`.
  // Aus `Views/DatenschutzView.swift`.
  import TopBar from "../Bausteine/TopBar.svelte";
  import { Impressum } from "../../plattform/Rechtliches";
  import { Fassung } from "../../plattform/Fassung";

  interface Props { onClose: () => void }
  let { onClose }: Props = $props();

  const absaetze = [
    ["Verantwortlicher", `Verantwortlich im Sinne der DSGVO ist die im Impressum genannte Person. Kontakt: ${Impressum.email}.`],
    ["Kurz gesagt", "AbiEar erhebt keine personenbezogenen Daten, sendet nichts an einen Server und hat keinen. Es gibt kein Konto, keine Anmeldung, keine Analyse, keine Werbung und keine Weitergabe an Dritte."],
    ["Was auf dem Gerät gespeichert wird", Fassung.datenschutzSpeicher],
    ["Löschen", Fassung.datenschutzLoeschen],
    ["Mitteilungen", Fassung.datenschutzMitteilungen],
    [Fassung.bereitstellungTitel, Fassung.bereitstellung],
    ["Deine Rechte", "Da die App keine personenbezogenen Daten beim Anbieter speichert, gibt es dort nichts, worüber Auskunft zu erteilen oder was zu berichtigen oder zu löschen wäre. Alle Daten stehen unter deiner Kontrolle auf deinem Gerät. Fragen beantwortet der Anbieter unter der im Impressum genannten Adresse."],
  ];
</script>

<div class="seite">
  <TopBar title="Datenschutz" {onClose} />
  <div class="scroll">
    <div class="inhalt datenschutz">
      {#each absaetze as [titel, text]}
        <section><div class="t-label">{titel}</div><p class="t-body c-secondary">{text}</p></section>
      {/each}
      <div class="t-tiny c-tertiary">Stand: {Impressum.standDatenschutz}</div>
    </div>
  </div>
</div>

<style>
  p { margin: 0; }
  .datenschutz { padding-top: var(--space-l); padding-bottom: calc(var(--space-xl) + var(--sicher-unten)); display: flex; flex-direction: column; gap: var(--space-l); }
  section { display: flex; flex-direction: column; gap: var(--space-xs); }
</style>
