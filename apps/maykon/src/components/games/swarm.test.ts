import {
  trafficAt, saturation, latencyOf, droppedRps, desiredReplicas, healthOf,
  capacityOf, monthlyCost, CYCLE, CAPACITY_PER_POD, MAX_REPLICAS, BASE_LATENCY,
} from './swarm.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

// --- traffic shape ---
const samples = Array.from({ length: CYCLE * 10 }, (_, i) => trafficAt(i / 10));
const peak = Math.max(...samples);
const trough = Math.min(...samples);
check(samples.every((v) => v >= 0), 'traffic is never negative');
// The gaussian is centred on t=18, but the sine baseline nudges the true
// maximum a little either side of it. Assert the location, not the identity.
const argmax = samples.indexOf(peak) / 10;
check(Math.abs(argmax - 18) < 1.5, 'the spike peaks around t=18', `argmax ${argmax}`);
check(peak > 600, 'peak clears 600 rps', `peak ${peak.toFixed(0)}`);
check(trough < 150, 'baseline stays under 150 rps', `trough ${trough.toFixed(0)}`);
near(trafficAt(3), trafficAt(3 + CYCLE), 0.001, 'the cycle repeats');
near(trafficAt(-1), trafficAt(CYCLE - 1), 0.001, 'negative time wraps');

// --- capacity and saturation ---
eq(capacityOf(4), 4 * CAPACITY_PER_POD, 'capacity is linear in pods');
eq(saturation(120, 4), 0.5, 'saturation is load over capacity');
eq(saturation(100, 0), Infinity, 'zero pods is infinite saturation, not a divide-by-zero');

// --- latency curve ---
near(latencyOf(0), BASE_LATENCY, 0.01, 'idle latency is the base');
check(latencyOf(0.9) > latencyOf(0.5) * 3, 'latency blows up near saturation');
eq(latencyOf(1), 2000, 'saturated latency is pinned at the ceiling');
eq(latencyOf(Infinity), 2000, 'no pods means the ceiling, not NaN');
check(latencyOf(0.985) <= 2000, 'latency never exceeds the ceiling');

// --- drops ---
eq(droppedRps(120, 4), 0, 'nothing drops below capacity');
eq(droppedRps(300, 4), 60, 'the excess over capacity is what drops');
eq(droppedRps(50, 0), 50, 'with no pods everything drops');

// --- the HPA formula ---
eq(desiredReplicas(0), 1, 'never scales below one replica');
eq(desiredReplicas(360), 10, '360 rps at 60% target needs 10 pods');
eq(desiredReplicas(1_000_000), MAX_REPLICAS, 'clamped at the ceiling');
check(desiredReplicas(peak) <= MAX_REPLICAS, 'the peak is survivable inside the cap');
check(saturation(peak, desiredReplicas(peak)) < 1, 'HPA sizing actually clears the peak',
  `rho ${saturation(peak, desiredReplicas(peak)).toFixed(2)}`);

// --- money ---
eq(monthlyCost(10), 170, 'cost is linear in replicas');

// --- health bands ---
eq(healthOf(1.4), 'failing', 'over saturation is failing');
eq(healthOf(0.85), 'strained', 'near saturation is strained');
eq(healthOf(0.5), 'healthy', 'mid range is healthy');
eq(healthOf(0.05), 'wasteful', 'nearly idle is over-provisioned');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
