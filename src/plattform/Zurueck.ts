// „Zurück" — die Android-Taste bzw. -Geste, im Browser Escape.
//
// iOS kennt keine Zurück-Taste; jede Ebene hat dort ihren sichtbaren
// Schließen-Knopf. Zurück tut deshalb **genau das, was der sichtbare Knopf
// der obersten Ebene tut** — nichts Eigenes. Jede Ebene meldet sich an,
// solange sie offen ist; die zuletzt geöffnete kommt zuerst dran, und ein
// Blatt immer vor einem Bildschirm — unabhängig davon, in welcher
// Reihenfolge Svelte die Effekte von Eltern und Kindern ausführt:
//
// - `blatt`: Blätter und Rückfragen. Auch Escape im Browser schließt sie.
// - `bildschirm`: Vorbereitung, Lauf, Auswertung — nur die Android-Taste.
//   Escape im Browser bricht keinen Lauf ab; dort ist die Taste zu nah an
//   allem anderen.
//
// Was darunter liegt, entscheidet `App.svelte` (Tab außer „Üben" → „Üben",
// „Üben" → App in den Hintergrund). Eine Ebene, die sich nicht wegtippen
// lässt (Einführung, Rückfrage ohne Abbrechen), schluckt Zurück, ohne
// etwas zu tun.

type Art = "blatt" | "bildschirm";
interface Ebene { art: Art; aktion: () => void }

const stapel: Ebene[] = [];

/** Meldet eine Ebene an; die Rückgabe meldet sie wieder ab. */
export function beiZurueck(aktion: () => void, art: Art = "blatt"): () => void {
  const ebene: Ebene = { art, aktion };
  stapel.push(ebene);
  return () => {
    const i = stapel.indexOf(ebene);
    if (i >= 0) stapel.splice(i, 1);
  };
}

/** Gibt Zurück an die oberste Ebene; `false`, wenn keine (passende) offen ist. */
export function zurueckAnEbene(nurBlaetter = false): boolean {
  const oberste = zuletzt("blatt") ?? (nurBlaetter ? undefined : zuletzt("bildschirm"));
  if (!oberste) return false;
  oberste.aktion();
  return true;
}

function zuletzt(art: Art): Ebene | undefined {
  for (let i = stapel.length - 1; i >= 0; i--) if (stapel[i].art === art) return stapel[i];
  return undefined;
}
