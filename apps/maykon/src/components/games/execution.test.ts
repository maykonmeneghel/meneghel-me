import {
  START, LOT, run, submit, session, prices, equity, locked, lockedAfter, unrealised,
  type Order, type State,
} from './execution.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const buy = (id: number, qty: number): Order => ({ id, side: 'buy', qty });
const sell = (id: number, qty: number): Order => ({ id, side: 'sell', qty });

// --- the position arithmetic ---
let s: State = START;
s = submit(s, buy(1, 10), 100, 'net').state;
eq(s.qty, 10, 'a buy opens a long');
near(s.avg, 100, 1e-9, 'at the price it filled');

s = submit(s, buy(2, 10), 110, 'net').state;
eq(s.qty, 20, 'a second buy adds to it');
near(s.avg, 105, 1e-9, 'and the average is weighted, not replaced');

s = submit(s, sell(3, 10), 120, 'net').state;
eq(s.qty, 10, 'a sell takes half of it off');
near(s.realised, 150, 1e-9, 'and realises ten lots of the fifteen-point gain');
near(s.avg, 105, 1e-9, 'while the rest stays at the average it was opened at');

s = submit(s, sell(4, 10), 120, 'net').state;
eq(s.qty, 0, 'the last sell goes flat');
near(s.realised, 300, 1e-9, 'realising the rest');
near(s.avg, 0, 1e-9, 'and a flat position has no average price');
eq(s.roundTrips, 1, 'which is one round trip');

// A flip: sell more than is held, and only the new side stays open.
let f: State = START;
f = submit(f, buy(1, 10), 100, 'net').state;
f = submit(f, sell(2, 30), 110, 'net').state;
eq(f.qty, -20, 'selling thirty against ten leaves twenty short');
near(f.realised, 100, 1e-9, 'the ten that closed realised their gain');
near(f.avg, 110, 1e-9, 'and the twenty that opened carry the price they opened at');
eq(f.roundTrips, 0, 'passing through flat is not the same as stopping there');

// --- marking to market ---
const long: State = { ...START, qty: 10, avg: 100 };
near(unrealised(long, 130), 300, 1e-9, 'a long is worth more when the price rises');
near(unrealised({ ...long, qty: -10 }, 130), -300, 1e-9, 'and a short is worth less');
near(equity(long, 130), START.deposit + 300, 1e-9, 'equity carries the open profit');
near(locked(long, 130), 1300, 1e-9, 'and the position ties up what it is worth');

// --- the whole point of the chapter ---
// A sell against a long releases funds. Netting sees that; a gross check does
// not, because it only ever adds the order's own notional to what is locked.
const netAfter = lockedAfter(long, sell(9, 10), 130, 'net');
const grossAfter = lockedAfter(long, sell(9, 10), 130, 'gross');
near(netAfter, 0, 1e-9, 'closing a long leaves nothing tied up');
near(grossAfter, 2600, 1e-9, 'but a gross check books it as a second position');
check(grossAfter > locked(long, 130),
  'so an order that reduces risk is scored as if it doubled it',
  `${grossAfter} against ${locked(long, 130)} already locked`);
check(netAfter <= locked(long, 130), 'while netting never scores a close as an increase');

// Reducing is always free under netting, whatever the account looks like.
for (const qty of [1, 5, 10]) {
  check(lockedAfter(long, sell(99, qty), 130, 'net') < locked(long, 130),
    `selling ${qty} of a ten-lot long releases funds under netting`);
}

// --- a retry cannot double-fill ---
let d: State = START;
d = submit(d, buy(1, 10), 100, 'net').state;
const again = submit(d, buy(1, 10), 100, 'net');
eq(again.accepted, false, 'the same order id does not fill twice');
eq(again.reject, 'duplicate', 'and says why');
eq(again.state.qty, 10, 'the position is untouched by the retry');

// --- funds are never exceeded ---
const p = prices(40);
const orders = session(40);
for (const mode of ['gross', 'net'] as const) {
  const r = run(orders, p, mode);
  check(r.filled + r.rejected === orders.length, `every order is answered under ${mode}`);
  check(r.byReason.duplicate === 0, `no duplicates in a clean session under ${mode}`);
}

// --- and the headline the chapter is built on ---
const g = run(orders, p, 'gross');
const n = run(orders, p, 'net');
eq(g.filled, 2, 'forty orders through a gross funds check become two trades');
eq(n.filled, 34, 'the same forty through netting become thirty-four');
eq(n.state.roundTrips, 8, 'and the position comes back to flat eight times');
check(g.state.roundTrips < n.state.roundTrips,
  'the gross engine never finishes what it starts', `${g.state.roundTrips} against ${n.state.roundTrips}`);
// The gross run does not just trade less — it stops trading. Once locked has
// climbed past equity it can never come down, because closes add to it too.
check(g.fills.every((id) => id <= 5), 'and it stops early rather than trading thinly',
  `last fill was order ${Math.max(...g.fills)}`);
eq(LOT, 20, 'the session uses one lot size, so the counts above are about funds and nothing else');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
