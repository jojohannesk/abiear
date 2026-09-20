// Haptik. Portierung von `System/Haptik.swift`.
//
// Im Browser gibt es `navigator.vibrate` (Android), auf iOS-Safari nichts;
// unter Capacitor die Haptics-API. Stumm ist stumm — kein Ersatz durch Töne
// oder Blinken. Die Umsetzung wird beim Start eingehängt.

export interface HaptikAusgabe {
  correct(): void;
  wrong(): void;
  tap(): void;
  select(): void;
}

const stumm: HaptikAusgabe = { correct() {}, wrong() {}, tap() {}, select() {} };

let aktuell: HaptikAusgabe = stumm;

export const Haptics = {
  setze(ausgabe: HaptikAusgabe): void { aktuell = ausgabe; },
  stumm,
  correct: () => aktuell.correct(),
  wrong: () => aktuell.wrong(),
  tap: () => aktuell.tap(),
  select: () => aktuell.select(),
};

/** `navigator.vibrate`, wo es das gibt — kurze Muster wie die UIKit-Generatoren. */
export function vibrationsHaptik(): HaptikAusgabe | null {
  const nav = globalThis.navigator as Navigator | undefined;
  if (!nav || typeof nav.vibrate !== "function") return null;
  const v = (muster: number | number[]) => { try { nav.vibrate(muster); } catch { /* verweigert */ } };
  return {
    correct: () => v([12, 40, 12]),
    wrong: () => v([30, 30, 30, 30, 30]),
    tap: () => v(8),
    select: () => v(5),
  };
}
