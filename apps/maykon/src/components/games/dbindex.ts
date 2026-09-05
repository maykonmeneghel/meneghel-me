/**
 * What an index actually buys you, and when it buys you nothing.
 *
 * The table is a fixed, stated distribution rather than a generated array:
 * every number the panel shows is derived from it, so the claims are checkable.
 */

export const TABLE_ROWS = 240_000;
export const SENSORS = 20;
/** Cells in the heap strip; each stands for an equal slice of the table. */
export const BLOCKS = 240;

/** Cost of touching one row, in milliseconds. */
export const ROW_COST = 0.00008;
/** Fixed cost of answering at all — parse, plan, round trip. */
export const BASE_COST = 0.02;
/** Depth of the B-tree: how many pages an index lookup must read. */
export const INDEX_PROBES = Math.ceil(Math.log2(TABLE_ROWS));
/**
 * Above this share of the table, following an index costs more than just
 * reading everything in order — so a real planner declines its own index.
 */
export const SEQ_THRESHOLD = 0.25;
/** How much each extra index slows every write. */
export const WRITE_PENALTY = 0.35;

export type Column = 'reading_id' | 'sensor_id' | 'value';

export interface Query {
  id: string;
  column: Column;
  op: 'eq' | 'gt';
  operand: number;
  sql: string;
}

export const QUERIES: Query[] = [
  { id: 'point',    column: 'reading_id', op: 'eq', operand: 128374, sql: 'SELECT * FROM readings WHERE reading_id = 128374' },
  { id: 'selective', column: 'sensor_id', op: 'eq', operand: 7,      sql: 'SELECT * FROM readings WHERE sensor_id = 7' },
  { id: 'broad',    column: 'value',      op: 'gt', operand: 40,     sql: 'SELECT * FROM readings WHERE value > 40' },
];

/** How many rows a query returns, from the table's stated distribution. */
export function matchCount(q: Query): number {
  if (q.column === 'reading_id') return 1;                       // unique key
  if (q.column === 'sensor_id') return TABLE_ROWS / SENSORS;     // uniform over sensors
  return Math.round(TABLE_ROWS * ((100 - q.operand) / 100));     // value is uniform 0..100
}

export const selectivity = (q: Query) => matchCount(q) / TABLE_ROWS;

export type PlanKind = 'seq' | 'index';
export interface Plan {
  kind: PlanKind;
  /** Why the planner chose this, for the explain line. */
  reason: 'no-index' | 'index-used' | 'not-selective';
  rowsExamined: number;
  ms: number;
}

export function plan(q: Query, indexes: ReadonlySet<Column>): Plan {
  const matches = matchCount(q);
  const seq = (reason: Plan['reason']): Plan => ({
    kind: 'seq',
    reason,
    rowsExamined: TABLE_ROWS,
    ms: TABLE_ROWS * ROW_COST + BASE_COST,
  });

  if (!indexes.has(q.column)) return seq('no-index');
  // Having the index is not the same as it being worth using.
  if (selectivity(q) > SEQ_THRESHOLD) return seq('not-selective');

  const rows = INDEX_PROBES + matches;
  return { kind: 'index', reason: 'index-used', rowsExamined: rows, ms: rows * ROW_COST + BASE_COST };
}

/** How much faster than reading the whole table this plan is. */
export function speedup(p: Plan): number {
  const seqMs = TABLE_ROWS * ROW_COST + BASE_COST;
  return seqMs / p.ms;
}

/** Every index has to be kept up to date on every write. */
export function writeMs(indexCount: number): number {
  return BASE_COST * (1 + WRITE_PENALTY * indexCount);
}

/** Contiguous slice of the heap strip an index-ordered read would touch. */
export function litBlocks(q: Query, p: Plan): number {
  if (p.kind === 'seq') return BLOCKS;
  return Math.max(1, Math.round(selectivity(q) * BLOCKS));
}
