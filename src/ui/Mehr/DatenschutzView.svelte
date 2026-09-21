<script lang="ts">
  // Datenschutzerklärung. Kurz, weil es kurz ist: kein Server, nichts wird
  // gesendet. Der Absatz zur Speicherung nennt den Browser statt iOS — das ist
  // der eine Unterschied dieser Fassung. Aus `Views/DatenschutzView.swift`.
  import TopBar from "../Bausteine/TopBar.svelte";
  import { Impressum } from "../../plattform/Rechtliches";

  interface Props { onClose: () => void }
  let { onClose }: Props = $props();

  const absaetze = [
    ["Verantwortlicher", `Verantwortlich im Sinne der DSGVO ist die im Impressum genannte Person. Kontakt: ${Impressum.email}.`],
    ["Kurz gesagt", "AbiEar erhebt keine personenbezogenen Daten, sendet nichts an einen Server und hat keinen. Es gibt kein Konto, keine Anmeldung, keine Analyse, keine Werbung und keine Weitergabe an Dritte."],
    ["Was auf dem Gerät gespeichert wird", "Die App zeichnet deine Übungsergebnisse auf — welche Intervalle, Akkorde und Takte du wann richtig oder falsch hattest — und deine Einstellungen (Niveau, Übetempo, Erinnerungszeit). Diese Daten liegen ausschließlich im Speicher deines Browsers auf deinem Gerät (Website-Daten dieser Seite). Sie verlassen es nicht; werden die Website-Daten gelöscht, sind sie weg."],
    ["Löschen", "Unter „Mehr“ → „Statistik zurücksetzen“ löschst du alle Übungsergebnisse. Mit dem Löschen der Website-Daten dieser Seite in deinem Browser werden alle Daten der App entfernt."],
    ["Mitteilungen", "Die tägliche Erinnerung ist eine Mitteilung, die die App selbst auf deinem Gerät auslöst. Es gibt keinen Push-Dienst und keinen Server, der davon erfährt. Du schaltest sie in der App oder in den Einstellungen deines Browsers ab."],
    ["Bereitstellung", "Die Seite wird über GitHub Pages ausgeliefert. Beim Laden der Seite verarbeitet GitHub technische Verbindungsdaten nach seinen eigenen Datenschutzhinweisen; darauf hat der Anbieter dieser App keinen Einfluss. Danach läuft die App vollständig auf deinem Gerät."],
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
