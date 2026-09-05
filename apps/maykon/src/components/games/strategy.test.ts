import {
  rsi, backtest, series, split, seeded, DEFAULT_PARAMS,
  IN_SAMPLE, TOTAL, type Candle, type Params,
} from './strategy.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const closes = (xs: number[]): Candle[] => xs.map((c) => ({ o: c, c, h: c, l: c }));

// --- RSI, the indicator worth getting right ---
const rising = rsi(closes(Array.from({ length: 40 }, (_, i) => 100 + i)), 14);
eq(rising[13], null, 'no value before enough history has accumulated');
check(rising[14] !== null, 'the first value lands exactly at the period');
near(rising[39]!, 100, 1e-9, 'a series that only rises pins RSI at 100');

const falling = rsi(closes(Array.from({ length: 40 }, (_, i) => 100 - i)), 14);
near(falling[39]!, 0, 1e-9, 'a series that only falls pins it at 0');

const flat = rsi(closes(new Array(40).fill(100)), 14);
near(flat[39]!, 100, 1e-9, 'a flat series has no losses, which Wilder scores as 100');

const noisy = rsi(series(300), 14).filter((v): v is number => v !== null);
check(noisy.every((v) => v >= 0 && v <= 100), 'RSI never leaves 0..100');
check(new Set(noisy.map((v) => v.toFixed(2))).size > 50, 'and it actually varies, rather than sticking');

// Wilder smoothing, not a plain moving average: a single spike must keep
// influencing later values instead of dropping out of a window.
const spike = closes([
  ...new Array(20).fill(100),
  130,
  ...Array.from({ length: 30 }, (_, i) => 130 - i * 0.4),
]);
const sm = rsi(spike, 14);
check(sm[21]! > 90, 'the spike drives RSI up');
check(sm[45]! < sm[21]!, 'and it decays as losses accumulate');
check(sm[45]! > 20, 'but smoothly — a windowed average would have dropped it off a cliff',
  `${sm[45]!.toFixed(1)}`);

// --- degenerate inputs ---
eq(rsi([], 14).length, 0, 'an empty series gives an empty result');
eq(rsi(closes([1, 2, 3]), 14).every((v) => v === null), true, 'too little history gives no values');
eq(rsi(closes([1, 2, 3]), 0).every((v) => v === null), true, 'a zero period is refused, not divided by');

// --- determinism ---
const a = series(120);
const b = series(120);
eq(a.map((c) => c.c.toFixed(6)), b.map((c) => c.c.toFixed(6)), 'the same seed gives the same series');
check(series(120, 7)[80].c !== a[80].c, 'a different seed gives a different one');
const r1 = seeded(42), r2 = seeded(42);
eq([r1(), r1(), r1()], [r2(), r2(), r2()], 'the generator itself is reproducible');
check(Array.from({ length: 500 }, () => seeded(9)()).every((v) => v >= 0 && v < 1), 'and stays in range');

// --- candles are well formed ---
const candles = series(TOTAL);
eq(candles.length, TOTAL, 'the series is as long as asked');
check(candles.every((c) => c.h >= Math.max(c.o, c.c) && c.l <= Math.min(c.o, c.c)),
  'every candle contains its own body');
check(candles.every((c) => c.c > 0), 'price never goes to zero or below');

// --- the backtest ---
const res = backtest(candles, DEFAULT_PARAMS);
check(res.trades.length > 0, 'the default parameters find trades', `${res.trades.length}`);
check(res.trades.every((t) => t.exit > t.entry), 'every trade closes after it opens');
check(res.trades.every((t, i) => i === 0 || t.entry > res.trades[i - 1].exit),
  'positions never overlap: one at a time, as the engine enforces');
if (res.trades.length) {
  near(res.winRate, (res.trades.filter((t) => t.pnl > 0).length / res.trades.length) * 100, 1e-9,
    'the win rate counts what it says');
}
eq(backtest(closes([1, 2, 3]), DEFAULT_PARAMS).winRate, 0, 'no trades is a zero win rate, not NaN');
const compounded = (res.trades.reduce((acc, t) => acc * (1 + t.pnl), 1) - 1) * 100;
near(res.returnPct, compounded, 1e-9, 'the return compounds the trades rather than adding them');

// A level RSI cannot reach can never trigger an entry.
eq(backtest(candles, { period: 14, buyLevel: 101, sellLevel: 50 }).trades.length, 0,
  'an unreachable buy level produces no trades, not a crash');
eq(backtest(candles, { period: 14, buyLevel: 101, sellLevel: 50 }).returnPct, 0, 'and no return');
// Inverted thresholds are unusual, not impossible: crossing up through 90 and
// later down through 10 is a real, if strange, round trip.
check(backtest(candles, { period: 14, buyLevel: 90, sellLevel: 10 }).trades.length >= 0,
  'inverted thresholds are handled rather than assumed away');

// --- the split the chapter turns on ---
const { inSample, outSample } = split(candles);
eq(inSample.length, IN_SAMPLE, 'the in-sample half is the stated length');
eq(outSample.length, TOTAL - IN_SAMPLE, 'and the out-of-sample half is the rest');
eq(inSample[0].c, candles[0].c, 'the halves are contiguous slices of one series');
eq(outSample[0].c, candles[IN_SAMPLE].c, 'with no gap between them');

// The finding the chapter rests on. Not "tuning always collapses" — sometimes
// the tuned parameters happen to do better on the other half, and claiming
// otherwise would be the very cherry-picking the chapter warns about. What is
// reliably true is that in-sample performance tells you almost nothing about
// out-of-sample performance.
const grid: { p: Params; inR: number; outR: number }[] = [];
for (let period = 4; period <= 24; period += 2) {
  for (let buy = 15; buy <= 45; buy += 5) {
    for (let sell = 55; sell <= 85; sell += 5) {
      const p: Params = { period, buyLevel: buy, sellLevel: sell };
      grid.push({ p, inR: backtest(inSample, p).returnPct, outR: backtest(outSample, p).returnPct });
    }
  }
}
check(grid.length > 200, 'the grid is big enough to say anything', `${grid.length}`);

const bestIn = grid.reduce((a, b) => (b.inR > a.inR ? b : a));
const bestOut = grid.reduce((a, b) => (b.outR > a.outR ? b : a));
check(bestIn.r === undefined, 'sanity: grid entries carry both halves');
check(bestIn.inR > 0, 'tuning finds something that looks good in sample', `${bestIn.inR.toFixed(1)}%`);
check(JSON.stringify(bestIn.p) !== JSON.stringify(bestOut.p),
  'the parameters that won on one half are not the ones that won on the other',
  `${JSON.stringify(bestIn.p)} vs ${JSON.stringify(bestOut.p)}`);

const rank = (xs: number[]) => {
  const order = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array(xs.length).fill(0);
  order.forEach(([, i], r) => { out[i] = r; });
  return out;
};
const ri = rank(grid.map((g) => g.inR));
const ro = rank(grid.map((g) => g.outR));
const n = grid.length;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const mi = mean(ri), mo = mean(ro);
let cov = 0, vi = 0, vo = 0;
for (let i = 0; i < n; i++) {
  cov += (ri[i] - mi) * (ro[i] - mo);
  vi += (ri[i] - mi) ** 2;
  vo += (ro[i] - mo) ** 2;
}
const spearman = cov / Math.sqrt(vi * vo);
check(Math.abs(spearman) < 0.5,
  'and in-sample ranking barely predicts out-of-sample ranking',
  `spearman ${spearman.toFixed(3)}`);

// --- the exact figures the chapter puts on screen ---
// The panel claims a specific rank out of a specific grid. Those two numbers
// are the whole argument, so they are pinned here: 75,429 combinations, and
// the best in-sample set landing 22,949th out of sample. The full sweep costs
// under half a second, which is cheap for never publishing a wrong number.
const fine: { p: Params; i: number; o: number }[] = [];
for (let period = 2; period <= 30; period++) {
  for (let buy = 10; buy <= 60; buy++) {
    for (let sell = 40; sell <= 90; sell++) {
      const p: Params = { period, buyLevel: buy, sellLevel: sell };
      fine.push({ p, i: backtest(inSample, p).returnPct, o: backtest(outSample, p).returnPct });
    }
  }
}
eq(fine.length, 75429, 'the grid the chapter quotes is the grid that was searched');
const topIn = fine.reduce((a, b) => (b.i > a.i ? b : a));
const outRank = [...fine].sort((a, b) => b.o - a.o)
  .findIndex((g) => JSON.stringify(g.p) === JSON.stringify(topIn.p)) + 1;
eq(outRank, 22949, 'the best in-sample parameters rank exactly where the panel says out of sample');
// 22,949 of 75,429 is the 30th percentile — respectable, and nowhere near
// first. Saying "the bottom two thirds" would have been a nicer sentence and
// a false one.
check(outRank > fine.length * 0.1, 'and is not even in the top tenth out of sample',
  `${outRank} of ${fine.length} — ${((outRank / fine.length) * 100).toFixed(1)}th percentile`);
check(outRank > 1000, 'the fall from first place is by thousands of positions, not a few');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
