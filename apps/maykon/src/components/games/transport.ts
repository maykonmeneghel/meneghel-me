/**
 * What a live price costs over HTTP polling and over a WebSocket.
 *
 * Both transports carry the same feed. The difference is not taste: polling
 * pays for a whole request to ask a question whose answer is usually "nothing
 * changed", and it can only ever see the value that happened to be current at
 * the moment it asked. A socket pays for one handshake and then a few bytes per
 * update, and it is told.
 *
 * Every byte figure below is a stated constant rather than a measurement, so
 * the panel's numbers can be checked by hand. They are sized after a real
 * authenticated JSON endpoint — the request headers are dominated by the cookie
 * and the bearer token, which is why asking costs more than answering.
 */

/** GET line, host, user-agent, accept, cookie and an Authorization bearer. */
export const REQUEST_HEADERS = 480;
/** Status line, date, server, content-type, CORS and cache headers. */
export const RESPONSE_HEADERS = 290;
/** `{"symbol":"BTC-USD","price":100.33,"ts":1757250000000}` and its siblings. */
export const BODY = 118;
/** Upgrade request plus the 101 response. Paid once, not per update. */
export const HANDSHAKE = 690;
/** Server-to-client frame header for a small payload: unmasked, two bytes. */
export const FRAME = 2;
/** A ping and its pong, to keep the connection alive through a proxy. */
export const KEEPALIVE = 12;
export const KEEPALIVE_EVERY_MS = 30_000;

/** Round trip to the server. One-way delivery is half of it. */
export const RTT_MS = 76;

/** The feed's average gap between price changes. */
export const MEAN_GAP_MS = 1_450;
/** How often the age of the value on screen is sampled, for the averages. */
export const SAMPLE_MS = 25;

export const POLL_INTERVALS_MS = [1_000, 5_000, 30_000] as const;
export type PollInterval = (typeof POLL_INTERVALS_MS)[number];

export interface Tick {
  /** Milliseconds from the start of the window. */
  t: number;
  price: number;
}

/** Deterministic PRNG: the same seed always yields the same session. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * The feed itself. Real quotes do not arrive on a metronome — they cluster and
 * then go quiet, which is exactly what makes a fixed poll interval a bad fit,
 * so the gaps are drawn from an exponential rather than being uniform.
 */
export function ticks(durationMs: number, seed = 7): Tick[] {
  const rnd = seeded(seed);
  const out: Tick[] = [];
  let t = 0;
  let price = 100.33;
  while (true) {
    t += Math.max(40, -Math.log(1 - rnd()) * MEAN_GAP_MS);
    if (t > durationMs) return out;
    price = Math.round((price + (rnd() - 0.5) * 0.42) * 100) / 100;
    out.push({ t, price });
  }
}

/** When the client asks, given an interval. The first request goes out at t=0. */
export function pollTimes(durationMs: number, intervalMs: number): number[] {
  const out: number[] = [];
  for (let t = 0; t <= durationMs; t += intervalMs) out.push(t);
  return out;
}

/** Index of the last tick at or before `t`, or -1 before the first one. */
export function lastTickAt(list: Tick[], t: number): number {
  let lo = 0;
  let hi = list.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t <= t) { found = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return found;
}

export interface Delivery {
  /** When the value landed on the client. */
  at: number;
  /** Index into the tick list, so repeats are detectable. */
  tick: number;
}

/**
 * What the client actually receives.
 *
 * A poll issued at `p` is answered with whatever was current at `p` and lands
 * one round trip later — so two polls in a quiet stretch deliver the same tick
 * twice, and a burst between them is never delivered at all. A socket delivers
 * every tick, one way.
 */
export function deliveries(list: Tick[], durationMs: number, intervalMs: number | null): Delivery[] {
  if (intervalMs === null) {
    return list
      .map((tk, i) => ({ at: tk.t + RTT_MS / 2, tick: i }))
      .filter((d) => d.at <= durationMs);
  }
  return pollTimes(durationMs, intervalMs)
    .map((p) => ({ at: p + RTT_MS, tick: lastTickAt(list, p) }))
    .filter((d) => d.tick >= 0 && d.at <= durationMs);
}

/** Distinct ticks the reader ever got to see. Re-delivering one does not count. */
export function seenTicks(ds: Delivery[]): number {
  return new Set(ds.map((d) => d.tick)).size;
}

export function bytesPolling(durationMs: number, intervalMs: number): number {
  return pollTimes(durationMs, intervalMs).length * (REQUEST_HEADERS + RESPONSE_HEADERS + BODY);
}

export function bytesSocket(durationMs: number, delivered: number): number {
  const pings = Math.floor(durationMs / KEEPALIVE_EVERY_MS);
  return HANDSHAKE + pings * KEEPALIVE + delivered * (FRAME + BODY);
}

/**
 * The poll interval at which polling costs the same bytes as the socket.
 *
 * This is the honest half of the argument: poll slowly enough and polling is
 * the cheaper transport. It is just no longer live.
 */
export function breakEvenIntervalMs(durationMs: number, delivered: number): number {
  const perPoll = REQUEST_HEADERS + RESPONSE_HEADERS + BODY;
  return (durationMs * perPoll) / bytesSocket(durationMs, delivered);
}

export interface Staleness {
  /** How wrong the screen was while it was wrong, in milliseconds. */
  meanWhileBehindMs: number;
  /** The longest it ever went showing a price that had been superseded. */
  worstMs: number;
  /** Share of the window it spent in that state. */
  behindShare: number;
}

/**
 * How out of date the screen was, and for how much of the window.
 *
 * Deliberately not the age of the number on display: a price that has not
 * changed in ten seconds is ten seconds old and perfectly correct, and a metric
 * that punished that would be measuring the market rather than the transport.
 * The clock starts the moment a newer tick exists and stops when the client
 * receives it — so a quiet feed scores zero under both transports.
 *
 * Nor is it the delivery latency of the ticks that arrived. That number is
 * almost identical for both, and for a flattering reason: a poll is answered
 * with the newest tick there is, so the ones it happens to carry are always
 * fresh. Polling's cost is the ticks it never carries at all, which is why the
 * average here is taken over time rather than over deliveries, and why
 * `seenTicks` is reported next to it.
 *
 * Sampled every SAMPLE_MS from the first delivery on, so an empty screen
 * waiting for its first value counts against neither side.
 */
export function staleness(list: Tick[], ds: Delivery[], durationMs: number): Staleness {
  if (ds.length === 0) return { meanWhileBehindMs: 0, worstMs: 0, behindShare: 0 };
  let sum = 0;
  let worst = 0;
  let behind = 0;
  let n = 0;
  let cursor = 0;
  for (let t = ds[0].at; t <= durationMs; t += SAMPLE_MS) {
    while (cursor + 1 < ds.length && ds[cursor + 1].at <= t) cursor++;
    const shown = ds[cursor].tick;
    if (lastTickAt(list, t) > shown) {
      // The screen stopped being right the instant the next tick was emitted.
      const wrongFor = t - list[shown + 1].t;
      sum += wrongFor;
      worst = Math.max(worst, wrongFor);
      behind++;
    }
    n++;
  }
  return {
    meanWhileBehindMs: behind === 0 ? 0 : sum / behind,
    worstMs: worst,
    behindShare: n === 0 ? 0 : behind / n,
  };
}

export interface Result {
  transport: 'poll' | 'socket';
  requests: number;
  bytes: number;
  /** Distinct ticks seen, out of every tick the feed emitted. */
  seen: number;
  emitted: number;
  /** How out of date the screen was while it was out of date. */
  staleMs: number;
  worstStaleMs: number;
  /** Fraction of the window spent showing a superseded price. */
  behindShare: number;
}

export function run(durationMs: number, intervalMs: number | null, seed = 7): Result {
  const list = ticks(durationMs, seed);
  const ds = deliveries(list, durationMs, intervalMs);
  const stale = staleness(list, ds, durationMs);
  return {
    transport: intervalMs === null ? 'socket' : 'poll',
    requests: intervalMs === null ? 1 : pollTimes(durationMs, intervalMs).length,
    bytes: intervalMs === null
      ? bytesSocket(durationMs, ds.length)
      : bytesPolling(durationMs, intervalMs),
    seen: seenTicks(ds),
    emitted: list.length,
    staleMs: stale.meanWhileBehindMs,
    worstStaleMs: stale.worstMs,
    behindShare: stale.behindShare,
  };
}
