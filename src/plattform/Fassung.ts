// Was die Browser- und die Android-Fassung unterscheidet — an einer Stelle.
//
// Die Texte hier sind die, die in der iOS-App „iOS" sagen: Datenschutz,
// Erinnerung, Version. Alles andere ist in allen Fassungen gleich.

import { Capacitor } from "@capacitor/core";

export const istAndroid = Capacitor.getPlatform() === "android";

export interface FassungsTexte {
  version: string;
  datenschutzSpeicher: string;
  datenschutzLoeschen: string;
  datenschutzMitteilungen: string;
  bereitstellungTitel: string;
  bereitstellung: string;
  /** Kurz neben dem Schalter, wenn das System die Mitteilungen ablehnt. */
  erinnerungAbgelehnt: string;
  /** Darunter: was zu tun ist. */
  erinnerungErlauben: string;
}

const browser: FassungsTexte = {
  version: "1.0 (Web)",
  datenschutzSpeicher: "Die App zeichnet deine Übungsergebnisse auf — welche Intervalle, Akkorde und Takte du wann richtig oder falsch hattest — und deine Einstellungen (Niveau, Übetempo, Erinnerungszeit). Diese Daten liegen ausschließlich im Speicher deines Browsers auf deinem Gerät (Website-Daten dieser Seite). Sie verlassen es nicht; werden die Website-Daten gelöscht, sind sie weg.",
  datenschutzLoeschen: "Unter „Mehr“ → „Statistik zurücksetzen“ löschst du alle Übungsergebnisse. Mit dem Löschen der Website-Daten dieser Seite in deinem Browser werden alle Daten der App entfernt.",
  datenschutzMitteilungen: "Die tägliche Erinnerung ist eine Mitteilung, die die App selbst auf deinem Gerät auslöst. Es gibt keinen Push-Dienst und keinen Server, der davon erfährt. Du schaltest sie in der App oder in den Einstellungen deines Browsers ab.",
  bereitstellungTitel: "Bereitstellung",
  bereitstellung: "Die Seite wird über GitHub Pages ausgeliefert. Beim Laden der Seite verarbeitet GitHub technische Verbindungsdaten nach seinen eigenen Datenschutzhinweisen; darauf hat der Anbieter dieser App keinen Einfluss. Danach läuft die App vollständig auf deinem Gerät.",
  erinnerungAbgelehnt: "Im Browser nicht erlaubt",
  erinnerungErlauben: "Erlaube Mitteilungen für diese Seite in den Einstellungen deines Browsers und tippe dann erneut auf den Schalter.",
};

/** Wortgleich mit der iOS-App, wo es geht; „iOS" wird „Android", „App Store" wird „Google Play". */
const android: FassungsTexte = {
  version: "1.0 (Android)",
  datenschutzSpeicher: "Die App zeichnet deine Übungsergebnisse auf — welche Intervalle, Akkorde und Takte du wann richtig oder falsch hattest — und deine Einstellungen (Niveau, Übetempo, Erinnerungszeit). Diese Daten liegen ausschließlich im Speicherbereich der App auf deinem Gerät. Sie verlassen es nicht, außer du hast in Android die Sicherung in dein Google-Konto eingeschaltet; dann sichert Android sie zusammen mit den übrigen App-Daten nach den Regeln, die du für deine Sicherung gewählt hast.",
  datenschutzLoeschen: "Unter „Mehr“ → „Statistik zurücksetzen“ löschst du alle Übungsergebnisse. Mit dem Löschen der App werden alle Daten der App vom Gerät entfernt.",
  datenschutzMitteilungen: "Die tägliche Erinnerung ist eine lokale Mitteilung, die die App selbst auf deinem Gerät plant. Es gibt keinen Push-Dienst und keinen Server, der davon erfährt. Du schaltest sie in der App oder in den Android-Einstellungen ab.",
  bereitstellungTitel: "Google Play",
  bereitstellung: "Die App wird über Google Play bereitgestellt. Was Google beim Laden und Aktualisieren von Apps verarbeitet, beschreibt Google in seinen eigenen Datenschutzhinweisen; darauf hat der Anbieter dieser App keinen Einfluss.",
  erinnerungAbgelehnt: "In den Einstellungen aus",
  erinnerungErlauben: "Erlaube Mitteilungen für AbiEar in den Android-Einstellungen und tippe dann erneut auf den Schalter.",
};

export const Fassung: FassungsTexte = istAndroid ? android : browser;
