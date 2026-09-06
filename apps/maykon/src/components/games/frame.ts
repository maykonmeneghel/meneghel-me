/**
 * The model behind the concurrency chapter.
 *
 * A screen has 16.67 ms to produce a frame. Everything a senior mobile engineer
 * argues about — async/await, actors, isolates, cancellation — is really an
 * argument about what is allowed to happen inside that budget.
 *
 * The trap the chapter is built on: `await` does not move work off the main
 * thread. An async function called from the main actor resumes on the main
 * actor, so an expensive decode inside it janks exactly as hard as the
 * synchronous version did. It only stops janking when the work is given to
 * something that is not the main actor — an `actor`, a detached task, an
 * isolate. That distinction is the difference between a mid-level answer and a
 * senior one, and it is invisible until you watch the frame rate.
 */

/** 60 frames a second, which is the budget almost every phone still holds you to. */
export const FRAME_BUDGET_MS = 1000 / 60;

export type Strategy = 'sync' | 'await' | 'offMain';

export interface Item {
  id: number;
  /** Milliseconds of decode this row costs, wherever it is done. */
  costMs: number;
}

export interface Options {
  strategy: Strategy;
  /** Rows to load. */
  items: Item[];
  /** How long the user stays before navigating away, in frames. Infinity = stays. */
  leaveAfterFrames?: number;
  /** Whether the work is cancelled when they leave. */
  cancelOnLeave?: boolean;
  /** Frames to simulate. */
  frames?: number;
}

export interface FrameSample {
  index: number;
  /** Total time this frame took, including any work done on the main thread. */
  ms: number;
  janky: boolean;
  /** Rows finished by the end of this frame. */
  done: number;
}

export interface Result {
  samples: FrameSample[];
  /** Frames that missed the budget. */
  janky: number;
  jankPercent: number;
  worstMs: number;
  /** Frames until the first row was on screen. */
  firstRowAtFrame: number | null;
  /** Rows finished. */
  completed: number;
  /** Work the app kept doing after the user had gone. */
  wastedMs: number;
}

/** A steady background cost: layout, compositing, the things the frame owes anyway. */
const BASELINE_MS = 4.2;

/**
 * Run the frame loop.
 *
 * 'sync'    — the decode happens inside the frame. The frame takes as long as
 *             the decode does, and the screen stops moving.
 * 'await'   — the decode is awaited but still resumes on the main actor, so the
 *             cost lands in a frame anyway. Fewer rows per frame, same jank.
 * 'offMain' — the decode happens somewhere that is not the main actor. The
 *             frame pays only for handing over the finished result.
 */
export function run(o: Options): Result {
  const frames = o.frames ?? 120;
  const leaveAt = o.leaveAfterFrames ?? Infinity;
  const cancel = o.cancelOnLeave ?? true;

  const queue = [...o.items];
  const samples: FrameSample[] = [];
  let done = 0;
  let firstRowAtFrame: number | null = null;
  let wastedMs = 0;
  // Work handed to another thread finishes on its own clock, not the frame's.
  let offMainCarry = 0;

  for (let f = 0; f < frames; f++) {
    const gone = f >= leaveAt;
    if (gone && cancel) queue.length = 0;

    let ms = BASELINE_MS;

    if (o.strategy === 'sync') {
      // Everything left, right now, in this frame.
      while (queue.length) { ms += queue.shift()!.costMs; done++; }
    } else if (o.strategy === 'await') {
      // One row per frame, and its cost still lands on the main actor.
      const item = queue.shift();
      if (item) { ms += item.costMs; done++; }
    } else {
      // The work runs elsewhere; the frame pays only to receive it.
      offMainCarry += FRAME_BUDGET_MS;
      while (queue.length && offMainCarry >= queue[0].costMs) {
        offMainCarry -= queue.shift()!.costMs;
        done++;
        ms += 0.25; // handing the finished row back to the main actor
      }
    }

    if (gone) wastedMs += ms - BASELINE_MS;
    if (firstRowAtFrame === null && done > 0) firstRowAtFrame = f;

    samples.push({ index: f, ms: +ms.toFixed(2), janky: ms > FRAME_BUDGET_MS, done });
  }

  const janky = samples.filter((s) => s.janky).length;
  return {
    samples,
    janky,
    jankPercent: +((janky / samples.length) * 100).toFixed(1),
    worstMs: +Math.max(...samples.map((s) => s.ms)).toFixed(2),
    firstRowAtFrame,
    completed: done,
    wastedMs: +wastedMs.toFixed(2),
  };
}

/** A screen's worth of rows, deterministic so the chapter always replays the same. */
export function rows(n = 24, seed = 3): Item[] {
  let s = seed >>> 0 || 1;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < 4; i++) next();
  return Array.from({ length: n }, (_, i) => ({ id: i + 1, costMs: +(6 + next() * 12).toFixed(2) }));
}
