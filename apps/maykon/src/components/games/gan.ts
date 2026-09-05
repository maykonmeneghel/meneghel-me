/**
 * The model behind chapter 07.
 *
 * StockGAN (2021) forecasts the next bar of a price series. Its generator is a
 * stateful LSTM(128) -> Dropout(0.3) -> Dense(n_features). Its discriminator is
 * a stateful LSTM(128) -> Dropout(0.1) -> Dense(1, sigmoid). The discriminator
 * never sees a candidate bar on its own: the candidate is concatenated onto the
 * real bars that came before it, and the question asked is whether that whole
 * window looks like one the market produced.
 *
 *     real_sequence = concat(inputs, targets)
 *     fake_sequence = concat(inputs, generated)
 *
 * The loss functions below are ports of the real ones, constants included. The
 * generator and the critic are stand-ins — they reproduce the trade-off the
 * compound loss creates, without carrying 128 LSTM units into a browser tab.
 */

/**
 * Taken from the model configuration the trainer was fed. It was trained on a
 * listed stock because that is where thirty years of clean daily history was
 * free; nothing in the architecture knows or cares what the numbers measure,
 * which is why the game runs it on the soil probe instead.
 */
export const CONFIG = {
  trainedOn: 'VALE3.SA',
  history: '30y',
  windowSize: 10,
  windowShift: 1,
  batchSize: 32,
  epochs: 20,
  trainFactor: 0.85,
  /** Weight on the adversarial half of the generator loss. */
  lambda: 0.6,
  labelSmoothing: 0.2,
  scaler: 'RobustScaler',
  learningRate: { initial: 0.00025, end: 0.0001, steps: 1000, power: 1 },
  /** Multiplicative noise put on both real and generated targets while training. */
  noise: 0.25,
  drift: 0.0004,
} as const;

/** The twelve indicators the feature pipeline computed before PCA saw them. */
export const INDICATORS = [
  'MACD 9/21', 'MACD 14/42', 'EMA 21', 'EMA 9', 'MA 9', 'MA 5',
  'Momentum', 'BB 20/2', 'ROC 20', 'RSI 14', 'Volatility 21', 'Volatility 5',
] as const;

// ---------------------------------------------------------------- randomness

/**
 * xorshift32, seeded so every round of the game replays identically.
 *
 * The warm-up is not decoration. Straight out of the seed the first value is
 * strongly correlated with it — over two thousand consecutive seeds the first
 * draw never once came out below a half, which silently truncated every normal
 * draw taken from a fresh seed. Four discarded steps and it is gone.
 */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  const step = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  step(); step(); step(); step();
  return step;
}

/** Box-Muller. u is pushed off zero so the logarithm stays finite. */
export function normal(next: () => number): number {
  const u = Math.max(next(), 1e-12);
  const v = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ------------------------------------------------------------------- series

export function logReturns(closes: number[]): number[] {
  return closes.slice(1).map((p, i) => Math.log(p / closes[i]));
}

export function stdev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length);
}

/**
 * A reading trace. The walk has clustered volatility, which is the one property
 * that makes a series read as a measurement instead of as noise — and it is the
 * property both a price and a soil probe share, which is the whole point of
 * running this network on the probe.
 *
 * Log returns make the scale irrelevant: starting at 43% moisture or at 68 reais
 * gives the same percentage error and the same spread ratio.
 */
export function series(n: number, seed: number, start = 43.2): number[] {
  const next = rng(seed);
  const base = 0.016;
  let sigma = base;
  let price = start;
  let r = 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // Today's spread remembers yesterday's move.
    sigma = 0.86 * sigma + 0.14 * (base + 0.6 * Math.abs(r));
    r = CONFIG.drift + sigma * normal(next);
    price *= Math.exp(r);
    out.push(price);
  }
  return out;
}

// ---------------------------------------------------------------- generator

/**
 * One candidate for the next close.
 *
 * lambda is the same knob as in the compound loss. At 0 the generator is scored
 * on squared error alone and returns the conditional mean: damped momentum, a
 * move far too small, right on average and never right. At 1 it is scored on
 * fooling the critic alone and returns a move drawn with the window's own
 * spread: it looks exactly like a real bar and knows nothing about tomorrow.
 */
export function generate(history: number[], lambda: number, seed: number): number {
  const r = logReturns(history);
  const sigma = Math.max(stdev(r), 1e-6);
  const last = r[r.length - 1] ?? 0;
  const mse = 0.35 * last;
  const adversarial = CONFIG.drift + sigma * normal(rng(seed));
  const move = mse + lambda * (adversarial - mse);
  return history[history.length - 1] * Math.exp(move);
}

// ------------------------------------------------------------------- critic

/**
 * The stand-in discriminator: p(this window is real), in (0, 1).
 *
 * It has two tells, both of which a squared-error forecaster walks straight
 * into. A move much smaller than the window's own spread is the first. Moving
 * in the same direction as yesterday, because that is what damped momentum
 * does, is the second.
 *
 * The constants were fitted by hand against 4,000 sampled windows: they score a
 * real bar 0.525 and a lambda = 0 bar 0.249 on average, both pinned by a test.
 */
export function critic(history: number[], candidate: number): number {
  const r = logReturns(history);
  const sigma = Math.max(stdev(r), 1e-6);
  const last = r[r.length - 1] ?? 0;
  const move = Math.log(candidate / history[history.length - 1]);
  const size = Math.min(Math.abs(move) / sigma, 3);
  const persistence = Math.max(0, (move * last) / (sigma * sigma));
  const z = 2.2 * (size - 0.72) - 0.55 * Math.min(persistence, 3);
  return 1 / (1 + Math.exp(-z));
}

// ------------------------------------------------------------------- losses

const CLIP = 1e-7;

/** Keras label smoothing: the truth stops being 1 and becomes 1 - eps/2. */
export function smooth(label: number, eps: number): number {
  return label * (1 - eps) + 0.5 * eps;
}

export function bce(target: number, p: number): number {
  const q = Math.min(1 - CLIP, Math.max(CLIP, p));
  return -(target * Math.log(q) + (1 - target) * Math.log(1 - q));
}

export function discriminatorLoss(real: number, fake: number, eps = CONFIG.labelSmoothing): number {
  return bce(smooth(1, eps), real) + bce(smooth(0, eps), fake);
}

export function generatorLoss(fake: number, eps = CONFIG.labelSmoothing): number {
  return bce(smooth(1, eps), fake);
}

/** l1 * adversarial + l2 * squared error, with l1 = lambda and l2 = 1 - lambda. */
export function compound(gLoss: number, gMse: number, lambda: number): number {
  return lambda * gLoss + (1 - lambda) * gMse;
}

/** PolynomialDecay(0.00025 -> 0.0001 over 1000 steps, power 1). */
export function polyDecay(step: number): number {
  const { initial, end, steps, power } = CONFIG.learningRate;
  const t = Math.min(Math.max(step, 0), steps) / steps;
  return (initial - end) * Math.pow(1 - t, power) + end;
}

// -------------------------------------------------------------------- rounds

export interface Round {
  /** windowSize - 1 real closes. */
  history: number[];
  /** The close that actually followed. */
  real: number;
  /** The generator's candidate for it. */
  fake: number;
  /** Whether the real one is shown in the left slot. */
  realIsA: boolean;
}

export function round(source: number[], at: number, lambda: number, seed: number): Round {
  const w = CONFIG.windowSize;
  return {
    history: source.slice(at, at + w - 1),
    real: source[at + w - 1],
    fake: generate(source.slice(at, at + w - 1), lambda, seed),
    realIsA: rng(seed ^ 0x5bf03635)() < 0.5,
  };
}

// -------------------------------------------------------------------- sweep

export interface Sweep {
  lambda: number;
  /** Mean absolute percentage error of the candidate against the truth. */
  mape: number;
  /** Candidate move spread as a fraction of the real one. 1 is a match. */
  spread: number;
  /** Share of candidates the critic scored above one half. */
  fooled: number;
}

/** What one lambda buys and what it costs, measured over a fixed sample. */
export function sweep(lambda: number, trials = 600, seed = 20210901): Sweep {
  const source = series(trials + CONFIG.windowSize + 4, seed);
  let err = 0;
  let fooled = 0;
  const fakeMoves: number[] = [];
  const realMoves: number[] = [];
  for (let i = 0; i < trials; i++) {
    const r = round(source, i, lambda, seed + i * 7919);
    const prev = r.history[r.history.length - 1];
    err += Math.abs(r.fake - r.real) / r.real;
    fakeMoves.push(Math.log(r.fake / prev));
    realMoves.push(Math.log(r.real / prev));
    if (critic(r.history, r.fake) > 0.5) fooled++;
  }
  return {
    lambda,
    mape: (err / trials) * 100,
    spread: stdev(fakeMoves) / stdev(realMoves),
    fooled: fooled / trials,
  };
}
