// Die Einführung beim ersten Öffnen eines Bereichs — „wie bediene ich das
// hier?". Portierung von `Models/DisciplineTutorial.swift`.

import type { TrainingMode } from "./QuizTask";

export interface TutorialStep {
  readonly symbol: string;
  readonly title: string;
  readonly text: string;
}

export interface DisciplineTutorial {
  readonly format: string;
  readonly steps: readonly TutorialStep[];
}

const intervals: DisciplineTutorial = {
  format: "Sieben Intervalle wie im Abitur: jedes erst einzeln nacheinander, "
    + "dann zusammen — je einmal. Ein Punkt pro Intervall.",
  steps: [
    { symbol: "play.circle", title: "Anhören",
      text: "Die Aufgabe erklingt von selbst; mit „Nochmal hören“ so oft du "
        + "willst — in der Prüfung nicht, hier zum Üben schon." },
    { symbol: "hand.tap", title: "Antworten",
      text: "Tippe den Namen an. Richtig färbt sich grün, falsch rot, und die "
        + "richtige Antwort steht daneben." },
    { symbol: "arrow.clockwise", title: "Falsche wiederholen",
      text: "Am Ende kannst du genau die Aufgaben noch einmal machen, die "
        + "danebenlagen — so oft, bis keine mehr übrig ist. Diese Runden "
        + "zählen nicht in die Statistik: wer die Lösung eben gesehen hat, "
        + "hört nicht mehr, er erinnert sich." },
  ],
};

const chords: DisciplineTutorial = {
  format: "Sieben Akkorde, immer vierstimmig in Grundstellung und enger Lage. "
    + "Ein Punkt pro Akkord.",
  steps: [
    { symbol: "play.circle", title: "Anhören",
      text: "Jeder Akkord erklingt zweimal: erst gebrochen von unten nach oben, "
        + "dann zusammen. Beliebig oft wiederholbar." },
    { symbol: "hand.tap", title: "Antworten",
      text: "Tippe den Akkordnamen an. Richtig färbt sich grün, falsch rot." },
    { symbol: "arrow.clockwise", title: "Falsche wiederholen",
      text: "Am Ende kannst du die falschen Akkorde noch einmal durchgehen, "
        + "bis keiner mehr übrig ist." },
  ],
};

const rhythm: DisciplineTutorial = {
  format: "Vier Takte im 4/4, auf einem einzigen Ton geklopft. Elf Durchgänge "
    + "wie in der Prüfung, zwei Punkte pro Takt.",
  steps: [
    { symbol: "music.note", title: "Notenwert antippen",
      text: "Unten stehen Halbe, Viertel, Achtel und Sechzehntel. Ein Druck "
        + "setzt den Wert an die Schreibmarke und rückt sie weiter — der "
        + "nächste Ton schließt also an." },
    { symbol: "square.grid.3x1.below.line.grid.1x2", title: "Die Schlag-Leiste",
      text: "Sechzehn Felder unter der Notenzeile, vier je Takt. Gefüllt heißt "
        + "belegt, der farbige Rahmen ist die Schreibmarke. Tippe ein Feld "
        + "an, um dort weiterzuschreiben — du kannst Lücken lassen und "
        + "später füllen, genau wie auf Papier." },
    { symbol: "dot.square", title: "Punktierung und Triole",
      text: "Die Punktierung gilt für den nächsten Ton und schaltet sich danach "
        + "wieder ab. Die Triole setzt mit einem Druck alle drei Töne. Die "
        + "Rücktaste nimmt zurück, was im hervorgehobenen Schlag steht." },
    { symbol: "checkmark.circle", title: "Punkte",
      text: "Verglichen wird schlagweise mit der Lösung: kein Fehler zwei "
        + "Punkte, ein falscher Schlag einer, zwei oder mehr null. Notiert "
        + "wird schon **während** der Wiedergabe — so wie du in der Prüfung "
        + "mitschreibst." },
  ],
};

const melody: DisciplineTutorial = {
  format: "Vier Takte im 4/4, Dur oder harmonisch Moll. Kadenz und Anfangston "
    + "vorweg, elf Durchgänge, zwei Punkte pro Takt.",
  steps: [
    { symbol: "music.note", title: "Erst der Wert, dann die Tonhöhen",
      text: "Wähle unten einen Notenwert — er bleibt stehen, bis du ihn "
        + "wechselst. Danach tippst du nur noch Tonhöhen an. Eine Reihe "
        + "Achtel ist also ein Druck für den Wert und dann ein Druck je Ton. "
        + "Die Triole ist ein Wert wie jeder andere: dreimal antippen füllt "
        + "den Schlag, jeder Ton mit eigener Tonhöhe." },
    { symbol: "list.bullet.indent", title: "Die Tonleiterspalte",
      text: "Links neben dem System steht die Leiter der Tonart, der Grundton "
        + "hervorgehoben. Die Melodie ist leitereigen, es gibt also nur diese "
        + "Töne — darum lässt sich die Tonhöhe antippen, statt sie auf eine "
        + "Notenlinie zu ziehen." },
    { symbol: "square.grid.3x1.below.line.grid.1x2", title: "Die Schlag-Leiste",
      text: "Sechzehn Felder unter der Notenzeile, vier je Takt. Tippe ein Feld "
        + "an, um dort weiterzuschreiben. Du kannst Lücken lassen und später "
        + "füllen — verpasste Stellen halten dich nicht auf." },
    { symbol: "checkmark.circle", title: "Punkte",
      text: "Verglichen werden Stelle **und** Tonhöhe, Schlag für Schlag: kein "
        + "Fehler zwei Punkte, ein falscher Schlag einer, zwei oder mehr "
        + "null. Ein Takt muss dabei voll werden — eine Viertel, wo eine "
        + "Halbe steht, ist ein Fehler." },
  ],
};

const kurz: DisciplineTutorial = {
  format: "Drei Intervalle, drei Akkorde, ein Takt Rhythmus. Rund zwei Minuten.",
  steps: [
    { symbol: "tram.fill", title: "Für zwischendurch",
      text: "Alles einmal anfassen, ohne ein ganzes Diktat: erst die sechs "
        + "Höraufgaben, zum Schluss ein einzelner Takt, dreimal vorgespielt." },
    { symbol: "chart.bar", title: "Zählt wie alles",
      text: "Die Antworten landen in der Statistik und im Tagesziel — eine "
        + "S-Bahn-Einheit ist ein geübter Tag." },
  ],
};

const mix: DisciplineTutorial = {
  format: "Alle vier Höraufgaben hintereinander, in der Reihenfolge der Prüfung: "
    + "Rhythmus, Melodie, Intervalle, Akkorde. Sechzehn Aufgaben, 30 Punkte.",
  steps: [
    { symbol: "timer", title: "Am Stück",
      text: "Einmal gestartet läuft alles durch. Die Auswertung kommt erst am "
        + "Ende — wie in der Prüfung, wo du zwischendurch auch nicht erfährst, "
        + "wie du liegst." },
    { symbol: "chart.bar", title: "Ohne gezieltes Üben",
      text: "Der adaptive Modus ist hier abgeschaltet. Er legt dir sonst "
        + "häufiger vor, was du schlecht hörst — dann wäre die Punktzahl "
        + "aber nicht mehr mit einer echten Prüfung vergleichbar." },
    { symbol: "questionmark.circle", title: "Die einzelnen Bereiche",
      text: "Wie Intervalle, Akkorde und die beiden Diktate im Einzelnen "
        + "bedient werden, steht in der Einführung des jeweiligen Bereichs." },
  ],
};

export const DisciplineTutorials = {
  forMode(mode: TrainingMode): DisciplineTutorial {
    switch (mode) {
      case "intervals": return intervals;
      case "chords": return chords;
      case "rhythm": return rhythm;
      case "melody": return melody;
      case "kurz": return kurz;
      case "mix": return mix;
    }
  },
};
