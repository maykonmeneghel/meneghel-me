import {
  CONFIG, rng, normal, series, logReturns, stdev, generate, critic,
  smooth, bce, discriminatorLoss, generatorLoss, compound, polyDecay,
  round, sweep,
} from './gan.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

// --- the learning rate schedule, ported constant for constant ---
near(polyDecay(0), 0.00025, 1e-12, 'the schedule starts where PolynomialDecay was told to start');
near(polyDecay(500), 0.000175, 1e-12, 'power 1 means it falls in a straight line');
near(polyDecay(1000), 0.0001, 1e-12, 'and lands on the end rate exactly at the last step');
near(polyDecay(50000), 0.0001, 1e-12, 'past the end it stays there rather than going negative');

// --- label smoothing, which is the part everybody skips ---
near(smooth(1, 0.2), 0.9, 1e-12, 'a positive label stops being 1');
near(smooth(0, 0.2), 0.1, 1e-12, 'and a negative one stops being 0');
near(smooth(1, 0), 1, 1e-12, 'with smoothing off the labels are the labels');

// The point of smoothing is not that the loss changes shape. It is that the
// prediction which minimises it is no longer 1: the discriminator is denied
// total confidence, and a generator can keep learning from its gradient.
let bestP = 0, bestLoss = Infinity;
for (let p = 0.5; p <= 0.9999; p += 0.0001) {
  const l = bce(smooth(1, CONFIG.labelSmoothing), p);
  if (l < bestLoss) { bestLoss = l; bestP = p; }
}
near(bestP, 0.9, 5e-4, 'under smoothing the best a discriminator can say is 0.9, not 1.0');
check(bce(smooth(1, 0.2), 1.0) > bce(smooth(1, 0.2), 0.9),
  'so absolute certainty is scored worse than the smoothed target itself');
near(bce(smooth(1, 0), 1.0), 0, 1e-6, 'without smoothing certainty is free');

// --- the two adversarial losses ---
check(discriminatorLoss(0.9, 0.1) < discriminatorLoss(0.5, 0.5),
  'the discriminator prefers being right to being undecided');
check(discriminatorLoss(0.9, 0.1) < discriminatorLoss(0.1, 0.9),
  'and being right beats being confidently backwards');
check(generatorLoss(0.9) < generatorLoss(0.1),
  'the generator is rewarded for the discriminator believing it');
check(discriminatorLoss(0.9, 0.1) > 0,
  'a perfect discriminator still carries loss, because the target was never 1');

// --- the compound loss: the whole reason this chapter exists ---
near(compound(2, 8, 0.6), 0.6 * 2 + 0.4 * 8, 1e-12, 'lambda splits the two halves as the paper wrote it');
near(compound(2, 8, 1), 2, 1e-12, 'at 1 only the critic is listened to');
near(compound(2, 8, 0), 8, 1e-12, 'at 0 only squared error is');

// --- the series ---
eq(series(20, 7), series(20, 7), 'the same seed replays the same path');
check(JSON.stringify(series(20, 7)) !== JSON.stringify(series(20, 8)), 'a different seed does not');
const path = series(4000, 20210901);
check(path.every((p) => p > 0), 'prices stay positive, which a log walk guarantees');
const rs = logReturns(path).map(Math.abs);
const m = rs.reduce((a, b) => a + b, 0) / rs.length;
let cov = 0;
for (let i = 1; i < rs.length; i++) cov += (rs[i] - m) * (rs[i - 1] - m);
check(cov > 0, 'big moves follow big moves — volatility clusters, as it does in a real chart',
  `lag-1 autocovariance of |returns| = ${cov.toExponential(2)}`);

near(stdev([2, 2, 2, 2]), 0, 1e-12, 'a flat series has no spread');
near(stdev([1, 3]), 1, 1e-12, 'and the population standard deviation is used, not the sample one');

// --- rounds ---
const r0 = round(path, 0, CONFIG.lambda, 42);
eq(r0.history.length, CONFIG.windowSize - 1, 'the window is nine real bars');
eq(r0.real, path[CONFIG.windowSize - 1], 'and the tenth is the one that actually happened');
eq(round(path, 0, CONFIG.lambda, 42), r0, 'a round is a pure function of its seed');
let left = 0;
for (let i = 0; i < 2000; i++) if (round(path, i, 0.6, 1000 + i).realIsA) left++;
check(left > 900 && left < 1100, 'the real bar lands on either side about half the time', `${left} of 2000`);

// --- the critic can tell ---
let scoreReal = 0, scoreFlat = 0;
const N = 3900;
for (let i = 0; i < N; i++) {
  const r = round(path, i, 0, 20210901 + i * 7919);
  scoreReal += critic(r.history, r.real);
  scoreFlat += critic(r.history, r.fake);
}
near(scoreReal / N, 0.525, 0.005, 'a real bar scores about a half');
near(scoreFlat / N, 0.249, 0.005, 'a squared-error bar scores half that, and the critic wins');

// --- and now the trade-off, which no single lambda escapes ---
const mse = sweep(0);
const adv = sweep(1);
const his = sweep(CONFIG.lambda);

check(adv.mape > mse.mape,
  'chasing the critic costs accuracy', `${adv.mape.toFixed(3)}% vs ${mse.mape.toFixed(3)}%`);
check(adv.spread > mse.spread,
  'and buys back the spread squared error throws away', `${adv.spread.toFixed(3)} vs ${mse.spread.toFixed(3)}`);
check(mse.spread < 0.5,
  'a squared-error forecaster is visibly too smooth: it moves a third as much as the market does',
  `spread ratio ${mse.spread.toFixed(3)}`);
check(adv.fooled > mse.fooled,
  'so the critic is fooled more often the further lambda goes', `${adv.fooled} vs ${mse.fooled}`);

// No lambda is best at both. That is what makes 0.6 a decision rather than a
// default — it leans toward the critic and pays 0.2 points of MAPE for it.
const grid = [0, 0.2, 0.4, 0.6, 0.8, 1].map((l) => sweep(l));
const bestMape = grid.reduce((a, b) => (b.mape < a.mape ? b : a));
const bestSpread = grid.reduce((a, b) => (Math.abs(1 - b.spread) < Math.abs(1 - a.spread) ? b : a));
check(bestMape.lambda !== bestSpread.lambda,
  'the accuracy winner and the realism winner are different settings',
  `mape best at lambda ${bestMape.lambda}, spread best at lambda ${bestSpread.lambda}`);
eq(bestSpread.lambda, 1, 'realism is won at the adversarial end');
check(bestMape.lambda <= 0.2,
  'and accuracy at the squared-error end — 0.2 rather than 0 on this sample, which is what a finite sample looks like',
  `lambda ${bestMape.lambda}`);
near(his.mape, 2.716, 0.01, 'his 0.6 costs this much accuracy');
near(his.spread, 0.546, 0.01, 'and buys this much of the spread back');

// --- generate is a pure function too ---
const w = path.slice(0, 9);
eq(generate(w, 0.6, 5), generate(w, 0.6, 5), 'the same window and seed give the same candidate');
// Per draw this need not hold — an adversarial candidate is a draw, and a draw
// can land near zero. It holds in the aggregate, which is the claim worth making.
let advMove = 0, mseMove = 0;
for (let i = 0; i < 500; i++) {
  const win = path.slice(i, i + 9);
  advMove += Math.abs(Math.log(generate(win, 1, i * 31 + 5) / win[8]));
  mseMove += Math.abs(Math.log(generate(win, 0, i * 31 + 5) / win[8]));
}
check(advMove > mseMove * 2,
  'and adversarial candidates move more than twice as far as squared-error ones',
  `${(advMove / 500).toExponential(2)} vs ${(mseMove / 500).toExponential(2)} per bar`);

// --- units, or the lack of them ---
// The chapter claims out loud that the network does not know what the numbers
// measure. That is not a flourish: the model reads log returns, so multiplying
// the whole window by any positive constant changes nothing it can see. Soil
// moisture in per cent and a share price in reais are the same input to it.
const win = path.slice(40, 49);
const scaled = win.map((v) => v * 137.4);
const candA = generate(win, 0.6, 11);
const candB = generate(scaled, 0.6, 11);
near(candB / candA, 137.4, 1e-9, 'the candidate scales exactly with the window');
near(critic(scaled, candB), critic(win, candA), 1e-12, 'and the critic scores both identically');

// --- the plumbing under all of it ---
const next = rng(12345);
const draws = Array.from({ length: 5000 }, () => next());
check(draws.every((d) => d >= 0 && d < 1), 'the generator stays inside the unit interval');
const nn = Array.from({ length: 20000 }, () => normal(rng(1)));
eq(new Set(nn).size, 1, 'a fresh seed each time gives the same draw each time');
const stream = rng(99);
const many = Array.from({ length: 20000 }, () => normal(stream));
near(many.reduce((a, b) => a + b, 0) / many.length, 0, 0.03, 'Box-Muller is centred');
near(stdev(many), 1, 0.03, 'with unit spread');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
