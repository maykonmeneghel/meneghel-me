/**
 * A perceptron, in the form Rosenblatt published in 1958 — which is small
 * enough to hold in your head and is still the shape of every layer in every
 * network since.
 *
 * Points live in [-1, 1] on both axes: x is temperature, y is vibration, and
 * the label is whether that motor turned out healthy (+1) or failing (-1).
 */

export interface Point { x: number; y: number; label: 1 | -1 }
export interface Weights { w1: number; w2: number; b: number }

export const LEARNING_RATE = 0.06;

export const zeroWeights = (): Weights => ({ w1: 0, w2: 0, b: 0 });

/** Deterministic PRNG, so a test can pin what a "random" start does. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Real networks start from random weights, not zeros — and starting wrong is
 * what makes the search visible instead of instantaneous.
 */
export function randomWeights(rand: () => number = Math.random): Weights {
  return {
    w1: rand() * 2 - 1,
    w2: rand() * 2 - 1,
    b: rand() * 0.6 - 0.3,
  };
}

/** Distance from the boundary, signed. Zero means exactly on the line. */
export const score = (w: Weights, p: { x: number; y: number }) =>
  w.w1 * p.x + w.w2 * p.y + w.b;

/** Untrained weights are all zero, which scores zero; call that healthy. */
export const predict = (w: Weights, p: { x: number; y: number }): 1 | -1 =>
  score(w, p) >= 0 ? 1 : -1;

export const isWrong = (w: Weights, p: Point) => predict(w, p) !== p.label;

export function accuracy(w: Weights, points: Point[]): number {
  if (points.length === 0) return 1;
  return points.filter((p) => !isWrong(w, p)).length / points.length;
}

export const mistakes = (w: Weights, points: Point[]) => points.filter((p) => isWrong(w, p));

/**
 * One learning step: find a point the model currently gets wrong and lean the
 * boundary towards it. Correct points are never consulted — the model only
 * ever learns from what it got wrong, which is the entire idea.
 */
export function trainStep(
  w: Weights,
  points: Point[],
  lr = LEARNING_RATE,
): { weights: Weights; correctedIndex: number | null } {
  const wrongIndex = points.findIndex((p) => isWrong(w, p));
  if (wrongIndex === -1) return { weights: w, correctedIndex: null };

  const p = points[wrongIndex];
  return {
    weights: {
      w1: w.w1 + lr * p.label * p.x,
      w2: w.w2 + lr * p.label * p.y,
      b: w.b + lr * p.label,
    },
    correctedIndex: wrongIndex,
  };
}

/**
 * The boundary is the line where score() is zero. Returned as two endpoints
 * clipped to the [-1, 1] box, or null while the model is still blank.
 */
export function boundary(w: Weights): [[number, number], [number, number]] | null {
  const { w1, w2, b } = w;
  if (w1 === 0 && w2 === 0) return null;

  if (Math.abs(w2) < 1e-6) {
    const x = -b / w1;                    // vertical line
    return [[x, -1], [x, 1]];
  }
  const yAt = (x: number) => -(w1 * x + b) / w2;
  return [[-1, yAt(-1)], [1, yAt(1)]];
}

/**
 * Readings a single straight line can separate — but only just. The margin is
 * deliberately narrow: a wide gap converges in two corrections and there is
 * nothing to watch.
 */
export const SEPARABLE: Point[] = [
  { x: -0.85, y: -0.60, label: 1 }, { x: -0.55, y: -0.30, label: 1 },
  { x: -0.20, y: -0.35, label: 1 }, { x: -0.62, y: 0.10, label: 1 },
  { x: -0.10, y: -0.25, label: 1 }, { x: -0.35, y: 0.05, label: 1 },
  { x: 0.10, y: -0.40, label: 1 },  { x: -0.05, y: -0.18, label: 1 },
  { x: 0.25, y: -0.55, label: 1 },  { x: -0.75, y: 0.35, label: 1 },
  { x: 0.80, y: 0.55, label: -1 },  { x: 0.50, y: 0.30, label: -1 },
  { x: 0.20, y: 0.35, label: -1 },  { x: 0.62, y: -0.10, label: -1 },
  { x: 0.10, y: 0.25, label: -1 },  { x: 0.35, y: -0.05, label: -1 },
  { x: -0.10, y: 0.40, label: -1 }, { x: 0.05, y: 0.18, label: -1 },
  { x: -0.25, y: 0.55, label: -1 }, { x: 0.75, y: -0.35, label: -1 },
];

/** The classic XOR arrangement: no single straight line can ever split it. */
export const XOR: Point[] = [
  { x: -0.62, y: -0.58, label: 1 },  { x: -0.45, y: -0.72, label: 1 },
  { x: -0.75, y: -0.40, label: 1 },  { x: 0.58, y: 0.62, label: 1 },
  { x: 0.72, y: 0.44, label: 1 },    { x: 0.40, y: 0.75, label: 1 },
  { x: -0.60, y: 0.60, label: -1 },  { x: -0.44, y: 0.74, label: -1 },
  { x: -0.76, y: 0.42, label: -1 },  { x: 0.60, y: -0.60, label: -1 },
  { x: 0.74, y: -0.44, label: -1 },  { x: 0.42, y: -0.76, label: -1 },
];
