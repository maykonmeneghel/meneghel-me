import { STAGES, run, totalMs, isSilent, indexOf, SILENT_FAILURES, type StageId } from './system.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const none = new Set<StageId>();

// --- the chain is the eight chapters, in order ---
eq(STAGES.map((s) => s.id),
  ['silicon', 'copper', 'steel', 'signal', 'service', 'swarm', 'mind', 'glass'],
  'the stages follow the chapters bottom-up');
check(STAGES.every((s) => s.href === `#${s.id}`), 'every stage links back to its chapter');
check(STAGES.every((s) => s.ms >= 0), 'no stage takes negative time');

// --- a clean run ---
const clean = run(none);
eq(clean.arrived, true, 'with nothing broken the reading arrives');
eq(clean.failedAt, null, 'and nothing stopped it');
eq(clean.reached, STAGES.length - 1, 'it cleared every stage');
near(clean.ms, 71.13, 0.01, 'end to end in about 71 ms');
near(clean.ms, totalMs(), 1e-9, 'the run agrees with the standalone total');

// --- the network dominates, which is the honest shape ---
const byCost = [...STAGES].sort((a, b) => b.ms - a.ms);
eq(byCost[0].id, 'signal', 'the hop to the broker is the single most expensive stage');
check(byCost[0].ms > byCost[1].ms * 2, 'and costs more than twice the next one',
  `${byCost[0].ms} vs ${byCost[1].ms}`);
const hardware = STAGES.slice(0, 3).reduce((s, x) => s + x.ms, 0);
check(hardware < 1, 'everything before the radio costs under a millisecond', `${hardware}`);

// --- breaking a stage stops it there, and only there ---
for (const stage of STAGES) {
  const r = run(new Set([stage.id]));
  eq(r.arrived, false, `${stage.id}: breaking it stops the reading`);
  eq(r.failedAt, stage.id, `${stage.id}: and it is named as the cause`);
  eq(r.reached, indexOf(stage.id) - 1, `${stage.id}: nothing past it ran`);
  near(r.ms, STAGES.slice(0, indexOf(stage.id)).reduce((s, x) => s + x.ms, 0), 1e-9,
    `${stage.id}: only the stages it cleared counted towards the clock`);
}

// --- the first break is the one that matters ---
const two = run(new Set<StageId>(['swarm', 'signal']));
eq(two.failedAt, 'signal', 'with two broken, the earlier one stops it');
eq(run(new Set<StageId>(['silicon', 'glass'])).failedAt, 'silicon', 'order is by position, not by set order');

// --- breaking everything ---
eq(run(new Set(STAGES.map((s) => s.id))).reached, -1, 'with the first stage broken nothing was reached');
eq(totalMs(new Set(STAGES.map((s) => s.id))), 0, 'and no time is spent');

// --- the failures that still hand you a number ---
eq(SILENT_FAILURES, ['steel', 'mind'], 'the silent failures are the seal and the model');
check(isSilent('steel'), 'water in the connector still reports a reading');
check(isSilent('mind'), 'a model outside its training still answers');
check(!isSilent('signal'), 'an unreachable broker is loud');
check(SILENT_FAILURES.every((id) => indexOf(id) >= 0), 'every silent failure names a real stage');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
