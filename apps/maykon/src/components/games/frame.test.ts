import { run, rows, FRAME_BUDGET_MS, type Strategy } from './frame.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

near(FRAME_BUDGET_MS, 16.67, 0.01, 'sixty frames a second is a budget of sixteen and two thirds milliseconds');

const items = rows();
eq(rows(), rows(), 'the same rows every time, so the chapter replays identically');
check(items.every((i) => i.costMs >= 6 && i.costMs <= 18), 'every row costs a realistic decode');

const sync = run({ strategy: 'sync', items });
const awaited = run({ strategy: 'await', items });
const off = run({ strategy: 'offMain', items });

// --- all three finish the work; that is not what separates them ---
for (const [name, r] of [['sync', sync], ['await', awaited], ['offMain', off]] as const) {
  eq(r.completed, items.length, `${name} loads every row`);
  eq(r.samples.length, 120, `${name} runs the full frame loop`);
}

// --- what separates them is the worst frame ---
check(sync.worstMs > 200, 'doing it synchronously freezes the screen for a fifth of a second',
  `worst frame ${sync.worstMs} ms`);
check(sync.worstMs > FRAME_BUDGET_MS * 10, 'which is more than ten frames missed in a row');

// The lesson of the chapter. Awaiting makes the freeze smaller and does not
// make it go away, because the continuation resumes on the main actor and the
// decode still happens there.
check(awaited.worstMs < sync.worstMs / 5, 'awaiting breaks the freeze into pieces',
  `${awaited.worstMs} ms against ${sync.worstMs} ms`);
check(awaited.worstMs > FRAME_BUDGET_MS,
  'and every one of those pieces still misses the frame budget — await is not a thread',
  `worst frame ${awaited.worstMs} ms against a ${FRAME_BUDGET_MS.toFixed(2)} ms budget`);
check(awaited.janky > 0, 'so the list still janks', `${awaited.jankPercent}% of frames`);

// Only moving the work off the main actor fixes it.
eq(off.janky, 0, 'work done off the main actor drops no frames at all');
check(off.worstMs < FRAME_BUDGET_MS, 'the worst frame is inside the budget',
  `${off.worstMs} ms`);
check(off.worstMs < awaited.worstMs, 'and it is the only strategy that beats awaiting');

// --- cancellation ---
const kept = run({ strategy: 'await', items, leaveAfterFrames: 6, cancelOnLeave: false });
const dropped = run({ strategy: 'await', items, leaveAfterFrames: 6, cancelOnLeave: true });
eq(dropped.wastedMs, 0, 'cancelling on the way out stops the work immediately');
check(kept.wastedMs > 200, 'not cancelling keeps decoding rows nobody will ever see',
  `${kept.wastedMs} ms spent after the user had gone`);
check(kept.completed > dropped.completed,
  'and finishes them, which is the part that looks like progress and is not');
eq(dropped.completed, 6, 'the cancelled run stops at the rows it had already finished');

// --- the frame loop itself ---
const idle = run({ strategy: 'offMain', items: [], frames: 10 });
eq(idle.janky, 0, 'an idle screen drops nothing');
eq(idle.firstRowAtFrame, null, 'and never reports a first row it did not draw');
check(idle.samples.every((s) => s.ms > 0), 'every frame still costs its baseline');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
