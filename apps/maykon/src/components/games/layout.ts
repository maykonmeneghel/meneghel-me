/**
 * The model behind the UI chapter.
 *
 * Anyone can build the card in the design. The job is building the one that is
 * still readable when the person holding the phone has set text to the largest
 * accessibility size, is running it in split view, in German, right to left,
 * on a connection that never delivered the image.
 *
 * A designer hands you one state. A senior engineer ships six. This file is the
 * arithmetic of which layouts survive which conditions, and it is deliberately
 * boring: widths in points, a text measurement, and a list of things that
 * broke. The interesting part is how few conditions the obvious layout survives.
 */

export type Strategy = 'fixed' | 'adaptive';

/**
 * The four views a screen owes, not the one the comp shows.
 *
 * This is the axis that separates a junior from a senior more reliably than any
 * layout trick: a designer hands over `content`, and the other three are left to
 * whoever builds it. A row built to the comp has no skeleton and no empty
 * state — it renders the same card with nothing in it and reads as a bug.
 */
export type ViewState = 'loading' | 'empty' | 'error' | 'content';

export const STATES: ViewState[] = ['loading', 'empty', 'error', 'content'];

export interface Conditions {
  /** Dynamic Type multiplier. 1 is default; 3.1 is the largest accessibility size. */
  fontScale: number;
  /** Available width in points. 320 is an iPhone SE; 240 is a narrow split view. */
  widthPt: number;
  /** Characters in the longest label, once translated. German runs ~30% longer. */
  titleChars: number;
  /** Right-to-left locale. */
  rtl: boolean;
  /** Whether the image actually arrived. */
  hasImage: boolean;
  /** Which of the four views is being rendered. */
  state: ViewState;
}

export const DEFAULTS: Conditions = {
  fontScale: 1, widthPt: 390, titleChars: 7, rtl: false, hasImage: true, state: 'content',
};

export type FailureId =
  | 'title-truncated' | 'value-collides' | 'subtitle-clipped'
  | 'mirrored-wrong' | 'image-hole' | 'error-hidden' | 'target-too-small'
  | 'no-skeleton' | 'no-empty-state';

export interface Failure {
  id: FailureId;
  /** What a person would actually see. */
  detail: string;
}

/** Base type sizes in points, before Dynamic Type scales them. */
const TYPE = { title: 17, subtitle: 13, value: 17 };
/** Average glyph advance as a fraction of point size, for a system sans. */
const GLYPH = 0.55;
const PADDING = 16 * 2;
const ICON = 40;
const CHEVRON = 12;
const GAP = 12;

const textWidth = (chars: number, sizePt: number, scale: number) =>
  chars * sizePt * scale * GLYPH;

/** Height of a tap target at a given scale, in points. */
export function targetHeight(c: Conditions, s: Strategy): number {
  const line = TYPE.title * c.fontScale * 1.3;
  // The fixed row was drawn to a comp and has a height in it.
  if (s === 'fixed') return 56;
  return Math.max(44, line * 2 + 20);
}

/**
 * Does the row keep everything on one line, or is it allowed to stack?
 *
 * The rule that matters is not "stack when the type is big". It is "stack when
 * the content does not fit", which is a different question and the one that
 * catches long translations at ordinary type sizes.
 */
export function stacks(c: Conditions, s: Strategy): boolean {
  if (s === 'fixed') return false;
  const icon = c.hasImage ? ICON : 0;
  const chrome = PADDING + icon + CHEVRON + GAP * (icon ? 2 : 1);
  const room = c.widthPt - chrome;
  const title = textWidth(c.titleChars, TYPE.title, c.fontScale);
  const value = textWidth(9, TYPE.value, c.fontScale);
  return title + GAP + value > room || c.fontScale >= 1.4 || c.widthPt < 300;
}

export function evaluate(c: Conditions, s: Strategy): Failure[] {
  const out: Failure[] = [];

  // The three states nobody draws. A layout built to the comp has one view and
  // renders it whatever the data is: empty labels while loading, an empty card
  // when there is nothing, and an error with nowhere to sit.
  if (s === 'fixed') {
    if (c.state === 'loading') {
      return [{ id: 'no-skeleton', detail: 'the same card with empty labels, which reads as a bug rather than as loading' }];
    }
    if (c.state === 'empty') {
      return [{ id: 'no-empty-state', detail: 'a blank card with a chevron that leads nowhere' }];
    }
    if (c.state === 'error') {
      return [{ id: 'error-hidden', detail: 'the error has nowhere to go and is truncated to nothing' }];
    }
  }
  // The adaptive build draws all four, so loading, empty and error are done.
  if (s === 'adaptive' && c.state !== 'content') return [];

  const stacked = stacks(c, s);

  const icon = c.hasImage || s === 'fixed' ? ICON : 0;
  const chrome = PADDING + icon + CHEVRON + GAP * (icon ? 2 : 1);
  const contentWidth = c.widthPt - chrome;

  const title = textWidth(c.titleChars, TYPE.title, c.fontScale);
  const subtitle = textWidth(c.titleChars + 9, TYPE.subtitle, c.fontScale);
  const value = textWidth(9, TYPE.value, c.fontScale);

  if (stacked) {
    // Stacked and wrapping: each label gets the full width and as many lines as
    // it needs. It only fails if a single word cannot fit, which is what a
    // minimum-width guard is for.
    const longestWord = textWidth(Math.min(c.titleChars, 12), TYPE.title, c.fontScale);
    if (longestWord > contentWidth) {
      out.push({ id: 'title-truncated', detail: 'one word is wider than the card and has nowhere to break' });
    }
    if (subtitle > contentWidth * 3) {
      out.push({ id: 'subtitle-clipped', detail: 'the subtitle runs past three lines' });
    }
  } else {
    // One row: they share it.
    if (title + GAP + value > contentWidth) {
      out.push({ id: 'value-collides', detail: 'the number runs into the title' });
    }
    if (title > contentWidth - value - GAP) {
      out.push({ id: 'title-truncated', detail: 'the title is cut off with an ellipsis' });
    }
    if (subtitle > contentWidth - value - GAP) {
      out.push({ id: 'subtitle-clipped', detail: 'the subtitle is clipped' });
    }
  }

  if (c.rtl && s === 'fixed') {
    out.push({ id: 'mirrored-wrong', detail: 'the chevron stays on the right and the number is left-aligned' });
  }
  if (!c.hasImage && s === 'fixed') {
    out.push({ id: 'image-hole', detail: 'a forty-point empty square where the image never arrived' });
  }
  if (targetHeight(c, s) < 44) {
    out.push({ id: 'target-too-small', detail: 'the row is under the 44-point minimum' });
  }

  // Failures are reported once each; a truncated title is a truncated title.
  const seen = new Set<FailureId>();
  return out.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

export const survives = (c: Conditions, s: Strategy): boolean => evaluate(c, s).length === 0;

/** The six conditions the chapter throws at the card, in order. */
export const TRIALS: { id: string; apply: (c: Conditions) => Conditions }[] = [
  { id: 'default',      apply: (c) => ({ ...c }) },
  { id: 'loading',      apply: (c) => ({ ...c, state: 'loading' }) },
  { id: 'empty',        apply: (c) => ({ ...c, state: 'empty' }) },
  { id: 'error',        apply: (c) => ({ ...c, state: 'error' }) },
  { id: 'dynamicType',  apply: (c) => ({ ...c, fontScale: 3.1 }) },
  { id: 'splitView',    apply: (c) => ({ ...c, widthPt: 240 }) },
  { id: 'longString',   apply: (c) => ({ ...c, titleChars: 22 }) },
  { id: 'rtl',          apply: (c) => ({ ...c, rtl: true }) },
  { id: 'noImage',      apply: (c) => ({ ...c, hasImage: false }) },
];

/** How many of the trials each layout gets through untouched. */
export function score(s: Strategy, base: Conditions = DEFAULTS): number {
  return TRIALS.filter((t) => survives(t.apply(base), s)).length;
}
