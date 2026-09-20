// Zufallsquelle. Portierung von `Generation/Random.swift`.
//
// Gekapselt, damit die Generatoren in den Prüfungen deterministisch laufen —
// und damit die Web-Fassung gegen die Swift-Fassung zeichengleich geprüft
// werden kann: `seeded` ist derselbe 64-Bit-LCG, hier über `BigInt`
// bitgleich nachgerechnet. `Number(state >> 11n)` ist exakt, weil der Wert
// unter 2^53 liegt.

const MASKE = (1n << 64n) - 1n;

export const Rand = {
  /** Entspricht `Math.random()`: [0, 1). Nur die Prüfungen setzen das um. */
  source: (): number => Math.random(),

  /** Feste Zufallsfolge, Zug um Zug gleich mit `Rand.seeded(_:)` in Swift. */
  seeded(seed: number | bigint): () => number {
    let state = (BigInt(seed) * 2862933555777941757n + 3037000493n) & MASKE;
    return () => {
      state = (state * 6364136223846793005n + 1442695040888963407n) & MASKE;
      return Number(state >> 11n) / 2 ** 53;
    };
  },

  next(): number {
    return Rand.source();
  },

  /** Entspricht `Math.floor(Math.random() * n)`. */
  index(count: number): number {
    if (count <= 0) return 0;
    return Math.min(count - 1, Math.floor(Rand.next() * count));
  },

  element<T>(array: readonly T[]): T {
    return array[Rand.index(array.length)];
  },
};
