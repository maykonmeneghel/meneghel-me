/**
 * One soil reading, all the way up.
 *
 * Seven of the eight stages are the seven chapters before this one, in order,
 * and the numbers are the ones those chapters already established: the same
 * MQTT topic,
 * the same row id, the same replica count, the same classifier verdict. The
 * point of the chapter is the seams, so each stage can also be broken — and
 * every stage fails in a way the others do not.
 */

export type StageId =
  | 'silicon' | 'copper' | 'steel' | 'signal'
  | 'service' | 'swarm' | 'model' | 'glass';

export interface Stage {
  id: StageId;
  /** Chapter anchor, so the finale doubles as a way back. Null for a stage
   *  that is not one of the chapters. */
  href: string | null;
  /** Milliseconds this stage adds when it works. */
  ms: number;
}

export const STAGES: Stage[] = [
  { id: 'silicon', href: '#silicon', ms: 0.12 },
  { id: 'copper',  href: '#copper',  ms: 0.01 },
  { id: 'steel',   href: '#steel',   ms: 0 },
  { id: 'signal',  href: '#signal',  ms: 34 },
  { id: 'service', href: '#service', ms: 8 },
  { id: 'swarm',   href: '#swarm',   ms: 2 },
  // Not a chapter. The probe this trace follows was built between 2016 and
  // 2019 and had no model in it; the classifier is the step the pipeline grew
  // later. Numbering it as a chapter is what made the AI work read as part of
  // the old hardware project, so it is left unnumbered and unlinked.
  { id: 'model',   href: null,       ms: 11 },
  { id: 'glass',   href: '#glass',   ms: 16 },
];

export const totalMs = (broken: ReadonlySet<StageId> = new Set()) =>
  STAGES.reduce((sum, s) => (broken.has(s.id) ? sum : sum + s.ms), 0);

export interface RunResult {
  /** How far the reading got: index of the last stage it cleared, -1 if none. */
  reached: number;
  /** The stage that stopped it, or null if it arrived. */
  failedAt: StageId | null;
  /** Milliseconds accumulated before it stopped or arrived. */
  ms: number;
  arrived: boolean;
}

/** Walk the chain, stopping at the first broken stage. */
export function run(broken: ReadonlySet<StageId>): RunResult {
  let ms = 0;
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    if (broken.has(stage.id)) {
      return { reached: i - 1, failedAt: stage.id, ms, arrived: false };
    }
    ms += stage.ms;
  }
  return { reached: STAGES.length - 1, failedAt: null, ms, arrived: true };
}

/**
 * Stages whose failure still delivers a number — just the wrong one. These are
 * the expensive ones, because nothing alerts and the dashboard looks fine.
 */
export const SILENT_FAILURES: StageId[] = ['steel', 'model'];

export const isSilent = (id: StageId) => SILENT_FAILURES.includes(id);

export const indexOf = (id: StageId) => STAGES.findIndex((s) => s.id === id);
