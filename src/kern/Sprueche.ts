// Der Satz unter der Punktzahl. Portierung von `Models/Sprueche.swift`.
//
// Kein Spruch enthält eine Zahl. Deterministisch gewählt aus Tag und
// Punktzahl — wer dieselbe Auswertung zweimal ansieht, liest denselben Satz.

import { LokalerKalender, type Kalender } from "./Kalender";

export type Stufe = "voll" | "gut" | "offen";

export const Sprueche = {
  stufe(erreicht: number, moeglich: number): Stufe {
    if (moeglich <= 0) return "offen";
    if (erreicht >= moeglich) return "voll";
    if (erreicht / moeglich >= 2.0 / 3.0) return "gut";
    return "offen";
  },

  voll: [
    "Alles getroffen. Das Ohr war heute wach.",
    "Fehlerfrei. Mehr geht nicht.",
    "Sauber durch. Das war kein Glück, das war Hören.",
    "Der lauteste Peter ist bekanntermaßen immer der Trompeter — und der war heute du.",
    "Kein einziger Ton daneben. Weitersagen.",
    "So klingt es, wenn es sitzt.",
  ] as readonly string[],

  gut: [
    "Gut gemacht. Das meiste sitzt.",
    "Solide. Die Lücken sind klein und sichtbar — genau richtig zum Üben.",
    "Ein guter Tag für die Ohren.",
    "Der lauteste Peter ist bekanntermaßen immer der Trompeter. Du warst heute mindestens Posaune.",
    "Das Meiste stimmt, der Rest kommt.",
    "Wer jeden Tag ein bisschen hört, hört irgendwann alles.",
  ] as readonly string[],

  offen: [
    "Geübt ist geübt. Morgen wieder.",
    "Das war schwer. Ehrlich falsch ist besser als gar nicht gehört.",
    "Heute noch offen — aber jedes falsche Intervall ist eines, das du jetzt kennst.",
    "Der lauteste Peter ist bekanntermaßen immer der Trompeter. Heute war eher Triangel. Passt auch.",
    "Nicht jeder Tag klingt gleich. Du warst da — das zählt.",
    "Aus Fehlern hört man. Sieh in der Statistik nach, welche.",
  ] as readonly string[],

  alle(stufe: Stufe): readonly string[] {
    switch (stufe) {
      case "voll": return Sprueche.voll;
      case "gut": return Sprueche.gut;
      case "offen": return Sprueche.offen;
    }
  },

  /** Der Satz zu diesem Ergebnis an diesem Tag. */
  spruch(erreicht: number, moeglich: number, tag: Date = new Date(), kalender: Kalender = LokalerKalender): string {
    const liste = Sprueche.alle(Sprueche.stufe(erreicht, moeglich));
    const tagesnummer = kalender.dayOrdinal(tag);
    const index = (tagesnummer + erreicht * 7 + moeglich) % liste.length;
    return liste[index];
  },
};
