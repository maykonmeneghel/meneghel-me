import {
  ticks, pollTimes, lastTickAt, deliveries, seenTicks, staleness, run,
  bytesPolling, bytesSocket, breakEvenIntervalMs,
  REQUEST_HEADERS, RESPONSE_HEADERS, BODY, HANDSHAKE, FRAME, KEEPALIVE,
  KEEPALIVE_EVERY_MS, RTT_MS, POLL_INTERVALS_MS,
} from './transport.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const MINUTE = 60_000;

// --- the feed is the same feed under both transports ---
const feed = ticks(MINUTE);
eq(JSON.stringify(ticks(MINUTE)), JSON.stringify(feed), 'the same seed replays the same session');
check(feed.length > 20, 'a minute of the feed carries more than twenty ticks');
check(feed.every((t, i) => i === 0 || t.t > feed[i - 1].t), 'ticks arrive in order');
check(feed.every((t) => t.t <= MINUTE), 'and none of them lands past the window');

// --- looking up what was current ---
eq(lastTickAt(feed, -1), -1, 'before the first tick there is nothing to show');
eq(lastTickAt(feed, MINUTE), feed.length - 1, 'at the end of the window the last tick stands');
check(
  feed.every((_, i) => lastTickAt(feed, feed[i].t) === i),
  'a lookup at a tick time finds that tick, not the one before it',
);

// --- what each transport actually delivers ---
const sock = deliveries(feed, MINUTE, null);
const poll5 = deliveries(feed, MINUTE, 5_000);

eq(seenTicks(sock), sock.length, 'the socket never delivers the same tick twice');
check(seenTicks(sock) >= feed.length - 1, 'and it delivers essentially every tick the feed emitted');
check(seenTicks(poll5) < feed.length, 'polling every five seconds misses ticks');
// Poll faster than the feed changes and the waste turns around: most requests
// come back carrying a price the client already had.
const poll1 = deliveries(feed, MINUTE, 1_000);
check(poll1.length > seenTicks(poll1), 'polling faster than the feed pays for answers it already has');

// A burst inside one poll window is invisible: only the last of it survives.
const burst = [
  { t: 100, price: 100 }, { t: 200, price: 101 }, { t: 300, price: 102 }, { t: 6_000, price: 103 },
];
eq(deliveries(burst, 12_000, 5_000).map((d) => d.tick), [2, 3], 'a poll sees only the last tick of a burst');
eq(seenTicks(deliveries(burst, 12_000, null)), 4, 'the socket sees all four');

// --- how out of date the screen runs ---
const socketStale = staleness(feed, sock, MINUTE);
const pollStale = staleness(feed, poll5, MINUTE);

// A quiet market scores zero under both: staleness starts when a newer tick
// exists, not when the price on screen was printed.
eq(staleness(burst, deliveries(burst, 12_000, null), 12_000).worstMs <= RTT_MS / 2, true,
  'a pushed screen is never wrong for longer than the flight time');
check(socketStale.worstMs <= RTT_MS / 2, 'the socket is out of date only while a tick is in flight');
check(socketStale.behindShare < 0.1, 'so it is up to date for more than ninety per cent of the window');
check(pollStale.behindShare > 0.8, 'five-second polling shows a superseded price for most of it');
// Between two polls the screen goes wrong somewhere in the middle on average,
// and stays wrong until the next answer lands.
near(pollStale.meanWhileBehindMs, 5_000 / 2, 900, 'and is about half an interval out of date when it is');
check(pollStale.worstMs > 4_500, 'at worst nearly a whole interval behind');
check(pollStale.meanWhileBehindMs > socketStale.meanWhileBehindMs * 50, 'the gap is two orders of magnitude, not a nuance');

// A slower poll is staler. Monotonically, no exceptions — and unlike the
// latency of the ticks that did arrive, this metric actually shows it.
const stale = POLL_INTERVALS_MS.map((i) => staleness(feed, deliveries(feed, MINUTE, i), MINUTE).meanWhileBehindMs);
check(
  stale.every((v, i) => i === 0 || v > stale[i - 1]),
  'every step down in poll rate is a step up in staleness',
  JSON.stringify(stale.map(Math.round)),
);

// --- the wire cost ---
eq(pollTimes(MINUTE, 5_000).length, 13, 'a minute at five seconds is thirteen requests, counting t=0');
eq(bytesPolling(MINUTE, 5_000), 13 * (REQUEST_HEADERS + RESPONSE_HEADERS + BODY), 'each of which pays full headers');
eq(
  bytesSocket(MINUTE, 40),
  HANDSHAKE + Math.floor(MINUTE / KEEPALIVE_EVERY_MS) * KEEPALIVE + 40 * (FRAME + BODY),
  'the socket pays the handshake once and two bytes a frame after that',
);
check(
  REQUEST_HEADERS + RESPONSE_HEADERS > BODY * 5,
  'asking costs more than answering — which is the whole reason polling is expensive',
);

const fast = run(MINUTE, 1_000);
const slow = run(MINUTE, 30_000);
check(fast.bytes > slow.bytes, 'polling faster costs more bytes');
check(fast.staleMs < slow.staleMs, 'and buys a fresher number, which is the trade');

// --- the honest half: polling is not always the loser ---
const socketRun = run(MINUTE, null);
const be = breakEvenIntervalMs(MINUTE, sock.length);
near(
  bytesPolling(MINUTE, be),
  bytesSocket(MINUTE, sock.length),
  2 * (REQUEST_HEADERS + RESPONSE_HEADERS + BODY),
  'at the break-even interval the two transports cost the same bytes',
);
check(be > 1_000, 'polling once a second costs more than holding the socket open');
check(
  bytesPolling(MINUTE, Math.ceil(be) * 4) < socketRun.bytes,
  'poll rarely enough and polling is genuinely the cheaper transport',
);
check(
  run(MINUTE, Math.ceil(be) * 4).staleMs > socketRun.staleMs * 20,
  'it is just no longer live',
);

// --- the headline the panel prints ---
eq(socketRun.requests, 1, 'one connection, not one request per update');
eq(socketRun.seen, socketRun.emitted, 'and it sees the whole feed');
check(run(MINUTE, 5_000).seen < socketRun.emitted / 2, 'five-second polling sees less than half of it');

if (fail === 0) console.log('All assertions passed.');
else { console.log(`${fail} assertion(s) failed.`); process.exit(1); }
