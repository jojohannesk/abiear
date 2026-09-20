// Wie man es hört — die dritte Textebene der App. Portierung von
// `Models/Lernhilfen.swift`.
//
// Intervalle und Akkorde sind ein Vokabular — jedes einzelne lässt sich
// beschreiben. Rhythmus und Melodie sind ein Verfahren: dort hilft die
// Reihenfolge, in der man vorgeht. Der Titel jeder Hilfe ist **genau** der
// Klarname aus dem Katalog — derselbe Schlüssel wie in der Statistik.

import { MusicData, type RhythmCell } from "./MusicData";
import type { Kind } from "./QuizTask";
import type { TutorialStep } from "./DisciplineTutorial";

/** Was beim Antippen von „Anhören" erklingt. */
export type Lernbeispiel =
  | { readonly art: "zusammenklang"; readonly offsets: readonly number[] }
  | { readonly art: "zelle"; readonly id: string };

/** Woran man eine einzelne Vokabel erkennt. */
export interface Lernhilfe {
  readonly kind: Kind;
  readonly titel: string;
  readonly klang: string;
  readonly lied: readonly string[];
  readonly verwechseltMit: string | null;
  readonly verwechslung: string | null;
  readonly beispiel: Lernbeispiel | null;
}

export function lernhilfeId(h: Pick<Lernhilfe, "kind" | "titel">): string {
  return h.kind + "" + h.titel;
}

function intervall(name: string, klang: string, lied: string[] = [],
                   verwechseltMit: string | null = null, verwechslung: string | null = null): Lernhilfe {
  const halbtoene = MusicData.intervals.find((i) => i.name === name)?.semitones ?? 0;
  return { kind: "interval", titel: name, klang, lied, verwechseltMit, verwechslung,
           beispiel: { art: "zusammenklang", offsets: [0, halbtoene] } };
}

function akkord(name: string, klang: string): Lernhilfe {
  const offsets = MusicData.chords.find((c) => c.name === name)?.offsets ?? [];
  return { kind: "chord", titel: name, klang, lied: [], verwechseltMit: null, verwechslung: null,
           beispiel: { art: "zusammenklang", offsets } };
}

const intervalle: readonly Lernhilfe[] = [
  intervall("Kleine Sekunde",
    "Sehr dissonant und drängend — will sich sofort auflösen. "
    + "Zusammen gespielt hörst du eine schnelle Schwebung.",
    ["Mein kleiner grüner Kaktus (Refrain)"]),
  intervall("Große Sekunde",
    "Auch reibend, aber deutlich milder als die kleine. Die "
    + "Schwebung ist spürbar langsamer.",
    ["Der Mond ist aufgegangen", "Alle meine Entchen", "Happy Birthday"]),
  intervall("Kleine Terz",
    "Eher traurig — es ist der Anfang des Moll-Dreiklangs.",
    ["Greensleeves", "Die alte Moorhexe"]),
  intervall("Große Terz",
    "Eher glücklich — der Anfang des Dur-Dreiklangs.",
    ["Morning Has Broken"]),
  intervall("Reine Quarte",
    "Klingt wie eine Fanfare: offen, aufrufend, ohne Färbung "
    + "nach Dur oder Moll.",
    ["Te Deum (die Eurovisions-Titelmusik)", "O Tannenbaum", "Eine kleine Nachtmusik"]),
  intervall("Tritonus",
    "Sehr dissonant und unruhig, gehört nirgends richtig hin.",
    ["Maria (West Side Story)", "Die Simpsons — Vorspann"],
    "Große Septime",
    "Beide klingen hart. Beim Tritonus liegen die beiden "
    + "Töne aber deutlich enger beieinander."),
  intervall("Reine Quinte",
    "Vollkommen neutral. Kein Zug, keine Farbe, nichts, was sich "
    + "auflösen will — genau daran erkennt man sie.",
    ["Morgen kommt der Weihnachtsmann"]),
  intervall("Kleine Sexte",
    "Dramatisch und mit viel Emotion geladen.",
    ["When Israel Was in Egypt's Land"]),
  intervall("Große Sexte",
    "Leicht und lustig, ohne Schwere.",
    ["Jingle Bells (Strophe)", "Ein Prosit"]),
  intervall("Kleine Septime",
    "Sehnsuchtsvoll. Zieht spürbar nach unten — sie will sich zur "
    + "Sexte auflösen, zur großen, wenn man in Dur denkt.",
    ["There's a Place for Us (West Side Story)"]),
  intervall("Große Septime",
    "Zieht ganz stark nach oben zur Oktave — dieser Sog ist das "
    + "sicherste Erkennungszeichen.",
    ["Take on Me"],
    "Tritonus",
    "Beide klingen hart. Bei der großen Septime sind die "
    + "beiden Töne aber viel weiter voneinander entfernt."),
  intervall("Reine Oktave",
    "Zweimal derselbe Ton in anderer Lage. Das leichteste "
    + "Intervall überhaupt.",
    ["Somewhere Over the Rainbow", "Singin' in the Rain"]),
];

/** Ein Wort je Akkord — mehr braucht es hier nicht. */
const akkorde: readonly Lernhilfe[] = [
  akkord("Dur", "Fröhlich."),
  akkord("Moll", "Traurig."),
  akkord("Dur mit Sixte ajoutée", "Weich und entspannt."),
  akkord("Moll mit Sixte ajoutée", "Wie aus einer Fantasy-Welt."),
  akkord("Dur7 (Dominantseptakkord)", "Kennt man sofort: Spannung, die sich auflösen will."),
  akkord("Moll7", "Verträumt, vielleicht etwas melancholisch."),
  akkord("DurMaj7", "Ganz und gar verträumt — Feenland."),
  akkord("Verminderter Septakkord", "Schockiert."),
  akkord("Übermäßig", "Mysteriös."),
];

/** Ohne Text: hier sagen Notenbild, Zählweise und Klang alles. */
const rhythmusvokabeln: readonly Lernhilfe[] =
  [...MusicData.rhythm1Beat, ...MusicData.rhythm2Beat].map((c) => ({
    kind: "rhythm" as Kind, titel: c.name, klang: "", lied: [], verwechseltMit: null, verwechslung: null,
    beispiel: { art: "zelle" as const, id: c.id },
  }));

const intervallStrategie: readonly TutorialStep[] = [
  { symbol: "music.mic", title: "Liedanfänge sind der schnellste Weg",
    text: "Zu fast jedem Intervall gibt es einen Liedanfang. Das trägt aber "
      + "nur, wenn du das Lied wirklich in- und auswendig kannst — sonst "
      + "suchst du im Kopf nach der Melodie statt nach dem Intervall." },
  { symbol: "waveform", title: "Bei den engen: die Schwebung",
    text: "Kleine und große Sekunde klingen beide reibend, aber die kleine "
      + "schwebt hörbar schneller. Spiel sie einmal gleichzeitig, dann "
      + "hast du den Unterschied im Ohr." },
  { symbol: "arrow.up.arrow.down", title: "Bei den weiten: der Zug",
    text: "Die großen Intervalle wollen irgendwohin. Die kleine Septime zieht "
      + "nach unten zur Sexte (zur großen, wenn man in Dur denkt), die große "
      + "Septime ganz stark nach oben zur Oktave. Diese Richtung ist oft "
      + "deutlicher als die Weite selbst." },
];

const akkordStrategie: readonly TutorialStep[] = [
  { symbol: "face.smiling", title: "Erst Dur oder Moll",
    text: "Alles baut letztlich darauf auf. Die Terz entscheidet, und sie ist "
      + "der Ton, den man am sichersten heraushört: fröhlich oder traurig." },
  { symbol: "arrow.triangle.branch", title: "Terz auf Terz",
    text: "Hör die Abstände **zwischen** den Tönen, nicht zum Grundton. Große "
      + "Terz und dann kleine ergibt Dur, kleine und dann große Moll, zweimal "
      + "groß übermäßig, zweimal klein vermindert. Nach der ersten Terz hast "
      + "du einen Verdacht, nach der zweiten steht der Dreiklang — der vierte "
      + "Ton entscheidet den Rest. Der Baum unten zeigt alle Wege." },
  { symbol: "quote.bubble", title: "Ein Wort als Gegenprobe",
    text: "Jeder Akkord hat einen Charakter, den man in einem Wort sagen kann. "
      + "Wenn dein eingegrenztes Ergebnis und dein Bauchgefühl "
      + "auseinandergehen, hör noch einmal hin." },
];

const rhythmusStrategie: readonly TutorialStep[] = [
  { symbol: "textformat.abc", title: "Denk in Vokabeln, nicht in Noten",
    text: "Pro Schlag kommt nur eine kleine Zahl von Kombinationen vor. Wer "
      + "diese Vokabeln kennt, muss nicht mehr jeden Ton einzeln bestimmen, "
      + "sondern erkennt die Figur als Ganzes. Sie stehen alle unten." },
  { symbol: "metronome", title: "Schlagweise hören, Grundschlag mitklopfen",
    text: "Weil es schlagweise nur wenige Möglichkeiten gibt, lohnt es sich, "
      + "auch schlagweise zu hören. Klopf den Grundschlag mit Fuß oder Finger "
      + "mit — dann weißt du jederzeit, wo ein Schlag endet, und hörst die "
      + "Figur darin statt einen Strom von Anschlägen." },
  { symbol: "pencil.line", title: "Schon beim ersten Durchgang mitschreiben",
    text: "Hier gehe ich bewusst gegen das, was oft gesagt wird. Sich beim "
      + "ersten Hören nur einen Überblick zu verschaffen, ergibt beim "
      + "Melodiediktat Sinn — beim Rhythmus meiner Meinung nach nicht. "
      + "Zumindest der erste und der letzte Takt lassen sich fast immer "
      + "gleich mitnehmen, und was jetzt steht, fehlt später nicht." },
];

const melodieStrategie: readonly TutorialStep[] = [
  { symbol: "target", title: "Den Grundton im Kopf behalten",
    text: "Er wird dir am Anfang mit der Kadenz eingespielt — halt ihn fest, "
      + "das ganze Diktat lang. Jeden schweren Ton kannst du dir dann "
      + "erschließen, indem du im Kopf das Intervall zu ihm bildest. Die "
      + "Intervalle stehen unten mit dabei." },
  { symbol: "waveform.path", title: "In Bewegungen denken, nicht in Tönen",
    text: "Es gibt Skalenmelodik (Sekundschritte auf und ab), "
      + "Dreiklangsmelodik (Dreiklänge auf und ab) und Sprungmelodik. "
      + "Ein Diktat besteht meist aus Skalen- und Dreiklangsmelodik mit "
      + "wenigen Sprüngen — wer Bewegung und Richtung hört, hat schon das "
      + "meiste." },
  { symbol: "eye", title: "Erster Durchgang: Überblick",
    text: "Wo ist der Höhepunkt, wie entwickelt sich die Linie, wo sind "
      + "Sprünge, auf die du achten musst? Die ersten zwei bis drei und die "
      + "letzten zwei bis drei Töne kannst du dabei oft schon setzen — über "
      + "den Grundton." },
  { symbol: "location", title: "Faden verloren? Zurück zu Stufe 1 und 5",
    text: "Die Orientierungstöne der Tonart holen dich immer zurück. Von "
      + "Grundton und Quinte aus erreichst du jeden anderen Ton mit sehr "
      + "wenigen Schritten." },
];

const index = new Map<string, Lernhilfe>();

export const Lernhilfen = {
  /** Steht unter jedem Lernblatt. */
  vorbehalt: "Wege, keine Vorschriften. Dein Unterricht nennt vielleicht andere — "
    + "wenn einer davon bei dir funktioniert, ist er der richtige.",

  /** Disziplinen, deren Vokabular vollständig beschrieben ist. */
  abgedeckt: new Set<Kind>(["interval", "chord", "rhythm"]),

  alle(kind: Kind): readonly Lernhilfe[] {
    switch (kind) {
      case "interval": return intervalle;
      case "chord": return akkorde;
      case "rhythm": return rhythmusvokabeln;
      case "melody": return [];
    }
  },

  hilfe(kind: Kind, titel: string): Lernhilfe | null {
    return index.get(lernhilfeId({ kind, titel })) ?? null;
  },

  /** Wie man eine Rhythmuszelle zählt — gerechnet aus `offsets`, nicht geschrieben. */
  zaehlweise(cell: RhythmCell): string {
    if (cell.isTriplet) return "tri – o – le";

    const anschlaege = new Set(cell.offsets.map((o) => Math.round(o * 4)));
    if (anschlaege.size === 0) return "";
    const letzter = Math.max(...anschlaege);

    const silben: string[] = [];
    for (let viertel = 0; viertel <= letzter; viertel++) {
      const schlag = Math.floor(viertel / 4);
      const rest = viertel % 4;
      const getroffen = anschlaege.has(viertel);
      switch (rest) {
        case 0:
          silben.push(getroffen ? String(schlag + 1) : `(${schlag + 1})`);
          break;
        case 1:
          if (getroffen) silben.push("e");
          break;
        case 2:
          if (getroffen) silben.push("und");
          else if (anschlaege.has(viertel + 1)) silben.push("(und)");
          break;
        default:
          if (getroffen) silben.push("e");
      }
    }
    return silben.join(" – ");
  },

  strategie(kind: Kind): readonly TutorialStep[] {
    switch (kind) {
      case "interval": return intervallStrategie;
      case "chord": return akkordStrategie;
      case "rhythm": return rhythmusStrategie;
      case "melody": return melodieStrategie;
    }
  },
};

for (const kind of ["interval", "chord", "rhythm", "melody"] as Kind[]) {
  for (const h of Lernhilfen.alle(kind)) index.set(lernhilfeId(h), h);
}
