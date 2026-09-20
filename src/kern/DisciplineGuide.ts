// Was in der Prüfung tatsächlich verlangt wird — je Bereich. Portierung von
// `Models/DisciplineGuide.swift`. Quelle ist der „Leitfaden fachpraktisches
// Abitur Musik" des Landes Baden-Württemberg; maßgeblich ist die
// Prüfungsordnung, nicht das Verhalten dieser App.

import type { TrainingMode } from "./QuizTask";

export interface GuideSection {
  readonly title: string;
  readonly lines: readonly string[];
}

export interface DisciplineGuide {
  readonly summary: string;
  readonly sections: readonly GuideSection[];
}

const intervals: DisciplineGuide = {
  summary: "Sieben Intervalle. Jedes erst einzeln, dann zusammen — je einmal. "
    + "Ein Punkt pro Intervall.",
  sections: [
    { title: "Umfang", lines: [
      "Sieben Intervalle.",
      "Tonraum g bis g².",
      "Die Folge ergibt bewusst keine Tonart — jedes Intervall steht für sich.",
    ] },
    { title: "Was drankommt", lines: [
      "Kleine und große Sekunde",
      "Kleine und große Terz",
      "Reine Quarte",
      "Tritonus (übermäßige Quarte / verminderte Quinte)",
      "Reine Quinte",
      "Kleine und große Sexte",
      "Kleine und große Septime",
      "Reine Oktave",
    ] },
    { title: "Ablauf", lines: [
      "Beide Töne zuerst nacheinander — sie werden nicht liegen gelassen.",
      "Danach beide zusammen angeschlagen.",
      "Jeweils einmal.",
    ] },
    { title: "Bewertung", lines: [
      "Ein Verrechnungspunkt je Intervall, nur ganze Punkte.",
      "Höchstens 7 Punkte.",
    ] },
  ],
};

const chords: DisciplineGuide = {
  summary: "Sieben Akkorde, immer vierstimmig in Grundstellung und enger Lage. "
    + "Erst einzeln, dann zusammen. Ein Punkt pro Akkord.",
  sections: [
    { title: "Umfang", lines: [
      "Sieben Akkorde.",
      "Immer Grundstellung, enge Lage, stets vierstimmig.",
      "Tonraum g bis c³.",
    ] },
    { title: "Was drankommt", lines: [
      "Durdreiklang",
      "Molldreiklang",
      "Übermäßiger Dreiklang",
      "Durdreiklang mit kleiner Septime (Dominantseptakkord)",
      "Durdreiklang mit großer Septime",
      "Molldreiklang mit kleiner Septime",
      "Verminderter Dreiklang mit verminderter Septime",
      "Durdreiklang mit großer Sexte",
      "Molldreiklang mit großer Sexte",
    ] },
    { title: "Ablauf", lines: [
      "Die Töne zuerst nacheinander — sie werden nicht liegen gelassen.",
      "Danach alle zusammen angeschlagen.",
      "Jeweils einmal.",
    ] },
    { title: "Bewertung", lines: [
      "Ein Verrechnungspunkt je Akkord, nur ganze Punkte.",
      "Höchstens 7 Punkte.",
      "Andere Bezeichnungen zählen, solange sie sachlich richtig sind.",
    ] },
  ],
};

const rhythm: DisciplineGuide = {
  summary: "Vier Takte im 4/4, auf einem Ton geklopft. Elf Durchgänge. "
    + "Zwei Punkte pro Takt. Notiert wird hier im Gerät.",
  sections: [
    { title: "Die Aufgabe", lines: [
      "Vier Takte, 4/4-Takt.",
      "Notenwerte: Viertel, Achtel, Sechzehntel — keine Pausen.",
      "Synkopen, Triolen und Punktierungen kommen vor.",
    ] },
    { title: "Wie diktiert wird", lines: [
      "Klavier, auf einem einzigen Ton.",
      "Tempo: Viertel etwa 60.",
      "Ein voller Takt wird vorgezählt.",
      "Das Metrum wird nicht mitgeklopft oder mitdirigiert.",
    ] },
    { title: "Elf Durchgänge", lines: [
      "1 – 4  ·  1  ·  1  ·  1 + 2",
      "2  ·  2 + 3  ·  3  ·  3 + 4",
      "4  ·  4  ·  1 – 4",
    ] },
    { title: "Bewertung", lines: [
      "Zwei Verrechnungspunkte je Takt, nur ganze Punkte.",
      "Höchstens 8 Punkte.",
      "2 = fehlerfrei · 1 = ein Fehler · 0 = ein halber Takt oder mehr falsch.",
    ] },
  ],
};

const melody: DisciplineGuide = {
  summary: "Vier Takte im 4/4, Dur oder harmonisch Moll. Kadenz und Anfangston "
    + "vorweg. Elf Durchgänge, zwei Punkte pro Takt. Notiert wird hier "
    + "im Gerät.",
  sections: [
    { title: "Die Aufgabe", lines: [
      "Vier Takte, 4/4-Takt.",
      "Dur oder harmonisches Moll, bis zu drei Vorzeichen.",
      "Nur leitereigene Töne.",
      "Der Ambitus überschreitet eine Oktave — üblich ist genau eine None.",
    ] },
    { title: "Was vorweg genannt wird", lines: [
      "Die Tonart wird durch eine Kadenz befestigt.",
      "Tonart und Anfangston werden angesagt — mit Name und Oktavlage.",
      "Die Vorzeichen trägst du selbst ein.",
    ] },
    { title: "Elf Durchgänge", lines: [
      "1 – 4  ·  1  ·  1  ·  1 + 2",
      "2  ·  2 + 3  ·  3  ·  3 + 4",
      "4  ·  4  ·  1 – 4",
      "Ein voller Takt wird vorgezählt.",
    ] },
    { title: "Bewertung", lines: [
      "Zwei Verrechnungspunkte je Takt, nur ganze Punkte.",
      "Höchstens 8 Punkte.",
      "2 = fehlerfrei · 1 = ein Fehler · 0 = ein halber Takt oder mehr falsch.",
    ] },
  ],
};

const kurz: DisciplineGuide = {
  summary: "Drei Intervalle, drei Akkorde, ein Takt Rhythmus — die Einheit für "
    + "zwischendurch. Zählt in die Statistik wie alles andere.",
  sections: [
    { title: "Warum so kurz", lines: [
      "Ein Prüfungsdiktat dauert mit elf Durchgängen fünf bis acht Minuten. "
      + "Das hier passt in eine Bahnfahrt und fasst trotzdem alle drei "
      + "Höraufgaben einmal an.",
      "Der Takt wird dreimal vorgespielt statt in elf Durchgängen; Niveau "
      + "und Tempo gelten wie beim ganzen Diktat.",
    ] },
    { title: "Bewertung", lines: [
      "Ein Punkt je Intervall und Akkord, bis zu zwei für den Takt — "
      + "höchstens 8.",
      "Das Melodiediktat fehlt hier absichtlich: es lässt sich nicht auf "
      + "einen Takt kürzen, ohne seinen Bogen zu verlieren.",
    ] },
  ],
};

const mix: DisciplineGuide = {
  summary: "Alle vier Höraufgaben hintereinander, wie in der Prüfung. "
    + "Zusammen 30 Punkte.",
  sections: [
    { title: "Der Ablauf", lines: [
      "Rhythmusdiktat — 8 Punkte",
      "Melodiediktat — 8 Punkte",
      "Sieben Intervalle — 7 Punkte",
      "Sieben Akkorde — 7 Punkte",
    ] },
    { title: "Warum hier nichts angepasst wird", lines: [
      "Die Komplettprüfung wählt nicht nach deinen Schwächen aus.",
      "Sonst wäre die Punktzahl nicht mehr mit einer echten Prüfung "
      + "vergleichbar — sie soll den Stand zeigen, nicht schmeicheln.",
    ] },
    { title: "Bewertung", lines: [
      "Höchstens 30 Verrechnungspunkte, nur ganze Punkte.",
      "Die Diktate werden aus deiner Notation gerechnet.",
    ] },
  ],
};

export const DisciplineGuides = {
  forMode(mode: TrainingMode): DisciplineGuide {
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
