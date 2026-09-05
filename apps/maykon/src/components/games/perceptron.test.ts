import {
  predict, score, accuracy, mistakes, trainStep, boundary, zeroWeights,
  randomWeights, seeded, SEPARABLE, XOR, type Point, type Weights,
} from './perceptron.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

/** Run until it stops making mistakes, or give up. Returns steps taken. */
function train(points: Point[], budget: number, start: Weights = zeroWeights()): { w: Weights; steps: number } {
  let w = start;
  let steps = 0;
  for (; steps < budget; steps++) {
    const next = trainStep(w, points);
    if (next.correctedIndex === null) break;
    w = next.weights;
  }
  return { w, steps };
}

// --- the primitives ---
const w: Weights = { w1: 1, w2: 0, b: 0 };
eq(predict(w, { x: 0.5, y: 0 }), 1, 'positive score predicts healthy');
eq(predict(w, { x: -0.5, y: 0 }), -1, 'negative score predicts failing');
eq(predict(zeroWeights(), { x: 0.3, y: 0.9 }), 1, 'a blank model still answers rather than throwing');
near(score({ w1: 2, w2: -1, b: 0.5 }, { x: 1, y: 1 }), 1.5, 1e-9, 'score is the linear combination');
eq(accuracy(zeroWeights(), []), 1, 'no data is vacuously perfect, not NaN');

// --- learning only ever touches mistakes ---
const clean = trainStep({ w1: 1, w2: 0, b: 0 }, [{ x: 0.5, y: 0, label: 1 }]);
eq(clean.correctedIndex, null, 'a point already right produces no update');
eq(clean.weights, { w1: 1, w2: 0, b: 0 }, 'and leaves the weights untouched');

const wrong = trainStep(zeroWeights(), [{ x: 0.5, y: 0.5, label: -1 }]);
eq(wrong.correctedIndex, 0, 'a point it gets wrong is the one it corrects');
check(score(wrong.weights, { x: 0.5, y: 0.5 }) < score(zeroWeights(), { x: 0.5, y: 0.5 }),
  'the update moves the boundary towards the right answer');

// --- Rosenblatt's convergence theorem: separable data must converge ---
const sep = train(SEPARABLE, 5000);
eq(accuracy(sep.w, SEPARABLE), 1, 'the separable set reaches perfect accuracy');
eq(mistakes(sep.w, SEPARABLE).length, 0, 'and makes no mistakes at all');
check(sep.steps < 5000, 'it converges well inside the budget', `steps ${sep.steps}`);

// --- and XOR must not, no matter how long it runs ---
const xor = train(XOR, 20000);
eq(xor.steps, 20000, 'XOR never stops making corrections');
check(accuracy(xor.w, XOR) < 1, 'one straight line can never separate XOR',
  `accuracy ${accuracy(xor.w, XOR)}`);

// --- random starts still converge, and are worth watching ---
const starts = [1, 7, 42, 1234, 99999].map((seed) => randomWeights(seeded(seed)));
for (const [i, start] of starts.entries()) {
  const run = train(SEPARABLE, 20000, start);
  eq(accuracy(run.w, SEPARABLE), 1, `separable converges from random start ${i}`);
}
check(starts.every((w) => Math.abs(w.w1) <= 1 && Math.abs(w.w2) <= 1 && Math.abs(w.b) <= 0.3),
  'random weights stay inside their stated range');
const steps = starts.map((s) => train(SEPARABLE, 20000, s).steps);
check(Math.max(...steps) >= 8, 'the search takes enough corrections to be watchable',
  `steps ${JSON.stringify(steps)}`);

// The UI calls the data non-separable after 90 corrections. That threshold is
// only safe while a separable set reliably converges well before it.
const STUCK_AFTER = 90;
const wide = Array.from({ length: 400 }, (_, i) => train(SEPARABLE, 20000, randomWeights(seeded(i + 1))).steps);
check(Math.max(...wide) < STUCK_AFTER,
  'separable data always converges before the non-separable warning fires',
  `worst ${Math.max(...wide)} of ${STUCK_AFTER}`);

const xorRun = train(XOR, 5000, randomWeights(seeded(7)));
check(accuracy(xorRun.w, XOR) <= 0.8, 'XOR plateaus well short of perfect',
  `accuracy ${accuracy(xorRun.w, XOR)}`);

// --- boundary geometry ---
eq(boundary(zeroWeights()), null, 'a blank model has no line to draw');
const vert = boundary({ w1: 2, w2: 0, b: -1 })!;
near(vert[0][0], 0.5, 1e-9, 'a vertical boundary is handled, not divided by zero');
const line = boundary({ w1: 1, w2: 1, b: 0 })!;
for (const [x, y] of line) near(score({ w1: 1, w2: 1, b: 0 }, { x, y }), 0, 1e-9, 'boundary endpoints score zero');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
