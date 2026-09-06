/**
 * The model behind the execution chapter.
 *
 * A strategy emits orders. An engine turns some of them into trades, and the
 * gap between those two numbers is where most of the work in a trading desk
 * actually is. This file is the arithmetic of that gap.
 *
 * The whole chapter turns on one decision: what an order costs you in funds.
 * A sell against a long position does not consume buying power — it releases
 * it. An engine that checks funds against the order's notional rather than
 * against the exposure the account would end up with will refuse orders that
 * would have made the account safer. It looks like a funds problem and it is
 * a netting problem.
 */

export type Side = 'buy' | 'sell';

/** How the funds check is done before an order is allowed through. */
export type Mode = 'gross' | 'net';

export interface Order {
  /** Client order id. Repeats are the engine's problem, not the strategy's. */
  id: number;
  side: Side;
  qty: number;
}

export interface State {
  /** Cash deposited, before any profit or loss. */
  deposit: number;
  /** Signed position. Positive is long, negative is short. */
  qty: number;
  /** Average price of the open position. Zero when flat. */
  avg: number;
  /** Profit and loss already taken. */
  realised: number;
  /** Order ids already applied, so a retry cannot double-fill. */
  seen: number[];
  /** Times the position has come back to flat. */
  roundTrips: number;
}

export type Reject = 'funds' | 'duplicate';

export interface Attempt {
  accepted: boolean;
  reject: Reject | null;
  /** Funds the account would have tied up after this order, under the mode used. */
  lockedAfter: number;
  /** What the account is worth right now, marked to market. */
  equity: number;
  state: State;
}

export const START: State = {
  deposit: 5_000, qty: 0, avg: 0, realised: 0, seen: [], roundTrips: 0,
};

const signOf = (side: Side) => (side === 'buy' ? 1 : -1);

/** Profit that exists but has not been taken. */
export function unrealised(s: State, price: number): number {
  return s.qty * (price - s.avg);
}

/** What the account is worth if it closed right now. */
export function equity(s: State, price: number): number {
  return s.deposit + s.realised + unrealised(s, price);
}

/** Funds an open position ties up, marked to market. */
export function locked(s: State, price: number): number {
  return Math.abs(s.qty) * price;
}

/**
 * Funds the account would have tied up after the order.
 *
 * Under 'net' this is the honest answer: the exposure the account ends up with.
 * Under 'gross' the order's own notional is added to what is already locked,
 * which double-counts every order that closes something.
 */
export function lockedAfter(s: State, order: Order, price: number, mode: Mode): number {
  if (mode === 'net') return Math.abs(s.qty + signOf(order.side) * order.qty) * price;
  return locked(s, price) + order.qty * price;
}

/** Try one order. Returns the attempt and the state it leaves behind. */
export function submit(s: State, order: Order, price: number, mode: Mode): Attempt {
  const eq = equity(s, price);
  const after = lockedAfter(s, order, price, mode);

  if (s.seen.includes(order.id)) {
    return { accepted: false, reject: 'duplicate', lockedAfter: after, equity: eq, state: s };
  }
  if (after > eq) {
    return { accepted: false, reject: 'funds', lockedAfter: after, equity: eq, state: s };
  }

  const dir = signOf(order.side);
  const signed = dir * order.qty;
  // The part of the order that closes existing exposure is the part that takes
  // profit or loss. The rest opens new exposure at the new price.
  const closing = s.qty === 0 || Math.sign(signed) === Math.sign(s.qty)
    ? 0
    : Math.min(order.qty, Math.abs(s.qty));
  const realised = s.realised + closing * (price - s.avg) * Math.sign(s.qty);
  const qty = s.qty + signed;
  const opening = order.qty - closing;

  let avg = s.avg;
  if (qty === 0) avg = 0;
  else if (closing === 0) avg = (s.avg * Math.abs(s.qty) + price * order.qty) / Math.abs(qty);
  else if (opening > 0) avg = price; // the position flipped; only the new side is open

  return {
    accepted: true, reject: null, lockedAfter: after, equity: eq,
    state: {
      ...s, qty, avg, realised,
      seen: [...s.seen, order.id],
      roundTrips: s.roundTrips + (qty === 0 && s.qty !== 0 ? 1 : 0),
    },
  };
}

export interface RunResult {
  state: State;
  filled: number;
  rejected: number;
  byReason: Record<Reject, number>;
  /** Accepted order ids, so two modes can be compared order by order. */
  fills: number[];
}

export function run(orders: Order[], prices: number[], mode: Mode, from: State = START): RunResult {
  let s = from;
  let filled = 0, rejected = 0;
  const byReason: Record<Reject, number> = { funds: 0, duplicate: 0 };
  const fills: number[] = [];
  orders.forEach((o, i) => {
    const a = submit(s, o, prices[i % prices.length], mode);
    s = a.state;
    if (a.accepted) { filled++; fills.push(o.id); }
    else { rejected++; byReason[a.reject!]++; }
  });
  return { state: s, filled, rejected, byReason, fills };
}

// ------------------------------------------------------------------ fixtures

/** A price path, so the chapter always replays the same session. */
export function prices(n: number, seed = 7, start = 100): number[] {
  let s = seed >>> 0 || 1;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < 4; i++) next();
  const out: number[] = [];
  let p = start;
  for (let i = 0; i < n; i++) { p *= 1 + (next() - 0.5) * 0.02; out.push(Math.round(p * 100) / 100); }
  return out;
}

/**
 * A session of orders that a mean-reverting strategy would emit: it builds a
 * position, trims it, builds it back the other way. Nothing exotic — the point
 * is that most of these orders reduce exposure rather than add to it.
 */
export const LOT = 20;

export function session(n = 40, seed = 11): Order[] {
  let s = seed >>> 0 || 1;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < 4; i++) next();
  const out: Order[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: i + 1, side: next() < 0.5 ? 'buy' : 'sell', qty: LOT });
  }
  return out;
}
