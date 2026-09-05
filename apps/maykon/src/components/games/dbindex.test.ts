import {
  QUERIES, matchCount, selectivity, plan, speedup, writeMs, litBlocks,
  TABLE_ROWS, SENSORS, BLOCKS, INDEX_PROBES, SEQ_THRESHOLD, BASE_COST,
  type Column,
} from './dbindex.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const q = (id: string) => QUERIES.find((x) => x.id === id)!;
const idx = (...c: Column[]) => new Set<Column>(c);
const none = new Set<Column>();

// --- the stated distribution ---
eq(matchCount(q('point')), 1, 'a unique key matches exactly one row');
eq(matchCount(q('selective')), TABLE_ROWS / SENSORS, 'one sensor is one twentieth of the table');
eq(matchCount(q('broad')), 144_000, 'value > 40 covers 60% of the table');
eq(selectivity(q('broad')), 0.6, 'and reports that selectivity');
check(selectivity(q('selective')) < SEQ_THRESHOLD, 'the selective query sits under the planner threshold');
check(selectivity(q('broad')) > SEQ_THRESHOLD, 'the broad query sits over it');

// --- with no index at all, everything is a full scan ---
for (const query of QUERIES) {
  const p = plan(query, none);
  eq(p.kind, 'seq', `${query.id}: no index means a sequential scan`);
  eq(p.reason, 'no-index', `${query.id}: and says so`);
  eq(p.rowsExamined, TABLE_ROWS, `${query.id}: reading every single row`);
  eq(speedup(p), 1, `${query.id}: which is the baseline, by definition`);
}

// --- the right index on a point lookup is the headline ---
const point = plan(q('point'), idx('reading_id'));
eq(point.kind, 'index', 'a point lookup uses the index');
eq(point.rowsExamined, INDEX_PROBES + 1, 'touching only the tree depth plus the row itself');
check(point.rowsExamined < 20, 'which is under twenty rows', `${point.rowsExamined}`);
check(speedup(point) > 800, 'and is hundreds of times faster', `${speedup(point).toFixed(0)}x`);

// --- a moderately selective query still wins, by less ---
const sel = plan(q('selective'), idx('sensor_id'));
eq(sel.kind, 'index', 'a 5% query uses the index');
check(speedup(sel) > 5 && speedup(sel) < 100, 'winning by a useful but ordinary margin',
  `${speedup(sel).toFixed(1)}x`);
check(speedup(sel) < speedup(point), 'less than the point lookup does');

// --- the index that exists and is declined anyway ---
const broad = plan(q('broad'), idx('value'));
eq(broad.kind, 'seq', 'a query covering 60% of the table gets a sequential scan');
eq(broad.reason, 'not-selective', 'and the reason is selectivity, not a missing index');
eq(speedup(broad), 1, 'so building that index bought exactly nothing here');

// --- an index on the wrong column is not an index ---
eq(plan(q('point'), idx('sensor_id', 'value')).reason, 'no-index',
  'indexes on other columns do not help this predicate');

// --- indexes are not free ---
check(writeMs(0) < writeMs(1) && writeMs(1) < writeMs(3), 'each index makes writes slower');
eq(writeMs(0), BASE_COST, 'an unindexed table writes at the base cost');

// --- the strip lights up in proportion ---
eq(litBlocks(q('point'), plan(q('point'), none)), BLOCKS, 'a full scan lights the whole strip');
eq(litBlocks(q('point'), point), 1, 'a point lookup lights a single block, never zero');
eq(litBlocks(q('selective'), sel), BLOCKS / SENSORS, 'a 5% read lights 5% of the strip');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
