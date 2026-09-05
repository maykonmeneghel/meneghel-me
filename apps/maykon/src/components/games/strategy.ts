/**
 * A strategy as a dataflow graph, which is what Tradx is: you do not write the
 * loop, you wire the logic and the engine runs it over the candles.
 *
 * Everything here is deterministic. The series comes from a seeded generator so
 * the same parameters always give the same result — which matters, because the
 * point of the chapter is what happens when you tune against one stretch of it
 * and then look at another.
 */

export interface Candle { o: number; h: number; l: number; c: number }

export interface Params {
  /** Bars of history the RSI averages over. */
  period: number;
  /** Enter when RSI crosses up through this. */
  buyLevel: number;
  /** Leave when RSI crosses down through this. */
  sellLevel: number;
}

export const DEFAULT_PARAMS: Params = { period: 14, buyLevel: 30, sellLevel: 70 };

/** Deterministic PRNG, so a chart is the same chart on every visit. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * A price series with trends, noise and regime changes.
 *
 * The momentum term matters: a pure random walk almost never strings enough
 * moves together in one direction for an oscillator to reach its extremes, so
 * an RSI strategy on one would simply never fire. Real markets trend; this one
 * has to as well, or the chapter demonstrates nothing.
 */
export function series(count: number, seed = 20260905): Candle[] {
  const rand = seeded(seed);
  const out: Candle[] = [];
  let price = 100;
  let momentum = 0;
  let regime = 0.35;
  for (let i = 0; i < count; i++) {
    // Every so often the market changes its mind about which way it is going.
    if (i > 0 && i % 70 === 0) regime = (rand() - 0.5) * 1.4;
    // Momentum persists and decays, which is what produces runs.
    momentum = momentum * 0.86 + (rand() - 0.5) * 0.9 + regime * 0.08;
    const o = price;
    price = Math.max(5, price + momentum + (rand() - 0.5) * 0.7);
    const c = price;
    out.push({ o, c, h: Math.max(o, c) + rand() * 0.6, l: Math.min(o, c) - rand() * 0.6 });
  }
  return out;
}

/**
 * Wilder's RSI. The first value is a simple average of the opening `period`
 * changes; every value after it is smoothed, which is what separates a correct
 * implementation from the one that merely looks right on a chart.
 */
export function rsi(candles: Candle[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period || period < 1) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].c - candles[i - 1].c;
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);

  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].c - candles[i - 1].c;
    const up = d > 0 ? d : 0;
    const down = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + up) / period;
    loss = (loss * (period - 1) + down) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export interface Trade { entry: number; exit: number; entryPrice: number; exitPrice: number; pnl: number }

export interface Result {
  trades: Trade[];
  /** Percent return of compounding every trade. */
  returnPct: number;
  winRate: number;
  rsi: (number | null)[];
}

/**
 * Long-only, one position at a time: enter when RSI crosses up through the buy
 * level, leave when it crosses down through the sell level.
 */
export function backtest(candles: Candle[], p: Params): Result {
  const values = rsi(candles, p.period);
  const trades: Trade[] = [];
  let entry: number | null = null;

  for (let i = 1; i < candles.length; i++) {
    const now = values[i];
    const before = values[i - 1];
    if (now === null || before === null) continue;

    if (entry === null && before <= p.buyLevel && now > p.buyLevel) {
      entry = i;
    } else if (entry !== null && before >= p.sellLevel && now < p.sellLevel) {
      const entryPrice = candles[entry].c;
      const exitPrice = candles[i].c;
      trades.push({ entry, exit: i, entryPrice, exitPrice, pnl: (exitPrice - entryPrice) / entryPrice });
      entry = null;
    }
  }

  const equity = trades.reduce((acc, t) => acc * (1 + t.pnl), 1);
  const wins = trades.filter((t) => t.pnl > 0).length;
  return {
    trades,
    returnPct: (equity - 1) * 100,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    rsi: values,
  };
}

export const IN_SAMPLE = 260;
export const TOTAL = 520;

export const split = (all: Candle[]) => ({
  inSample: all.slice(0, IN_SAMPLE),
  outSample: all.slice(IN_SAMPLE, TOTAL),
});
