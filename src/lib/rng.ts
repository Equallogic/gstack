/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * Shared by the evaluation engine and the test suite so that "same seed +
 * same project = same output". This is what makes preview re-rolls
 * reproducible in dev and makes engine tests deterministic.
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, max). */
  int(max: number): number;
  /** Pick an index according to weights (all >= 0, sum > 0). */
  weightedIndex(weights: number[]): number;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(max: number): number {
      if (max <= 0) return 0;
      return Math.floor(next() * max);
    },
    weightedIndex(weights: number[]): number {
      const total = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);
      if (total <= 0) return 0;
      let r = next() * total;
      for (let i = 0; i < weights.length; i++) {
        const w = weights[i] > 0 ? weights[i] : 0;
        if (r < w) return i;
        r -= w;
      }
      return weights.length - 1;
    },
  };
}

/** A non-deterministic seed for interactive use. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
