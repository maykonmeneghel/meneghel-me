import {
  DEFAULTS, TRIALS, evaluate, survives, score, stacks, targetHeight,
  type Conditions, type Strategy,
} from './layout.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const ids = (c: Conditions, s: Strategy) => evaluate(c, s).map((f) => f.id).sort();

// --- the happy path, which is the only one a comp ever shows you ---
for (const s of ['fixed', 'adaptive'] as const) {
  eq(evaluate(DEFAULTS, s), [], `${s} is fine in the state the designer drew`);
}

// --- and then the six conditions a real user arrives with ---
eq(score('fixed', DEFAULTS), 1, 'the fixed row survives exactly one of the seven — the one it was drawn for');
eq(score('adaptive', DEFAULTS), TRIALS.length, 'the adaptive one survives all seven');

for (const t of TRIALS.slice(1)) {
  const c = t.apply(DEFAULTS);
  check(!survives(c, 'fixed'), `the fixed row breaks under ${t.id}`, ids(c, 'fixed').join(', '));
  check(survives(c, 'adaptive'), `and the adaptive one does not`, `${t.id}: ${ids(c, 'adaptive').join(', ')}`);
}

// --- what breaks, specifically ---
eq(ids({ ...DEFAULTS, fontScale: 3.1 }, 'fixed'),
  ['subtitle-clipped', 'title-truncated', 'value-collides'],
  'the largest accessibility size collides the number into the title and cuts both labels');
eq(ids({ ...DEFAULTS, rtl: true }, 'fixed'), ['mirrored-wrong'],
  'a right-to-left locale leaves the chevron pointing the wrong way');
eq(ids({ ...DEFAULTS, hasImage: false }, 'fixed'), ['image-hole'],
  'an image that never arrives leaves its box behind');
eq(ids({ ...DEFAULTS, error: true }, 'fixed'), ['error-hidden'],
  'and the error state has nowhere to be shown');

// --- the rule that actually matters ---
// Stacking on font size alone is the mistake. A twenty-two character title at
// ordinary type does not fit either, and that is what a German translation is.
const longAtNormalType = { ...DEFAULTS, titleChars: 22 };
check(stacks(longAtNormalType, 'adaptive'),
  'the adaptive layout stacks because the content does not fit, not because the type is large');
check(!stacks({ ...DEFAULTS, titleChars: 22, fontScale: 1 }, 'fixed'),
  'the fixed one never stacks, whatever happens');
check(!survives(longAtNormalType, 'fixed'),
  'so a longer translation breaks it at the default type size, on a full-width phone');

// --- tap targets ---
check(targetHeight(DEFAULTS, 'adaptive') >= 44, 'the adaptive row clears the 44-point minimum');
check(targetHeight({ ...DEFAULTS, fontScale: 3.1 }, 'adaptive') > targetHeight(DEFAULTS, 'adaptive'),
  'and grows with the type rather than clipping it');
eq(targetHeight(DEFAULTS, 'fixed'), 56, 'the fixed row is the height it was drawn at, forever');

// --- the honest limit ---
// Everything at once is not a layout problem any more. It is a different
// design, and pretending otherwise is how you end up with a card nobody can read.
const everything: Conditions =
  { fontScale: 3.1, widthPt: 240, titleChars: 22, rtl: true, hasImage: false, error: true };
check(!survives(everything, 'adaptive'),
  'even the adaptive layout breaks when every condition lands at once',
  ids(everything, 'adaptive').join(', '));
check(evaluate(everything, 'fixed').length > evaluate(everything, 'adaptive').length,
  'it just breaks in three fewer ways than the fixed one',
  `${evaluate(everything, 'fixed').length} against ${evaluate(everything, 'adaptive').length}`);

// --- the report itself ---
const dup = evaluate({ ...DEFAULTS, fontScale: 3.1 }, 'fixed');
eq(dup.length, new Set(dup.map((f) => f.id)).size, 'each failure is reported once');
check(dup.every((f) => f.detail.length > 10), 'and says what a person would actually see');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
