import {
  swiftUI, flutter, spacingOf, spacerCount, fontOf, hasChart, ACCENTS, DEFAULT_STATE,
  type ScreenState, type Accent, type Layout,
} from './screen.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const st = (over: Partial<ScreenState> = {}): ScreenState => ({ ...DEFAULT_STATE, ...over });

// --- both dialects answer to the same state ---
for (const radius of [0, 8, 18, 32]) {
  check(swiftUI(st({ radius })).includes(`cornerRadius: ${radius}`), `swift carries radius ${radius}`);
  check(flutter(st({ radius })).includes(`BorderRadius.circular(${radius})`), `dart carries radius ${radius}`);
}
for (const layout of ['stacked', 'inline'] as Layout[]) {
  check(swiftUI(st({ layout })).includes(`spacing: ${spacingOf(layout)}`), `swift carries the ${layout} gap`);
}
for (const accent of Object.keys(ACCENTS) as Accent[]) {
  check(swiftUI(st({ accent })).includes(ACCENTS[accent].swift), `swift uses the ${accent} accent`);
  check(flutter(st({ accent })).includes(ACCENTS[accent].dart), `dart uses the ${accent} accent`);
}

// --- the switch that changes the shape of the screen, not just its gaps ---
// The card nests: an outer stack holds the header, and the body inside it is
// the one the arrangement switches. So neither dialect ever contains only one
// kind — what changes is the balance.
const count = (text: string, needle: RegExp) => (text.match(needle) ?? []).length;
const swStacked = swiftUI(st({ layout: 'stacked' }));
const swInline = swiftUI(st({ layout: 'inline' }));
// Header and value rows are horizontal in both, so counting HStack or Row
// distinguishes nothing. What changes is the body wrapper.
eq(count(swStacked, /VStack\(/g), 2, 'stacked nests a VStack body inside the card');
eq(count(swInline, /VStack\(/g), 1, 'inline keeps only the card, and lays its body across');
check(swInline.includes('HStack(alignment: .firstTextBaseline, spacing: 12)'),
  'the inline body is a baseline-aligned HStack');
check(swStacked.includes('VStack(alignment: .leading, spacing: 14)'),
  'the stacked body is a leading-aligned VStack');

const dtStacked = flutter(st({ layout: 'stacked' }));
const dtInline = flutter(st({ layout: 'inline' }));
check(dtInline.includes('Expanded(child:'),
  'Flutter has to wrap the value in Expanded to share a row, which SwiftUI does not');
check(!dtStacked.includes('Expanded(child:'), 'and does not need it when stacking');

// The detail worth the chapter: Flutter's spacer changes axis with the stack,
// while SwiftUI writes the same spacing: parameter either way.
check(flutter(st({ layout: 'stacked' })).includes('SizedBox(height:'), 'a Column is spaced by height');
check(flutter(st({ layout: 'inline' })).includes('SizedBox(width:'), 'a Row is spaced by width');
check(!/SizedBox\(height: \d+\)/.test(flutter(st({ layout: 'inline' }))), 'and never by the wrong one');
check(swiftUI(st({ layout: 'stacked' })).includes('spacing:') &&
      swiftUI(st({ layout: 'inline' })).includes('spacing:'),
  'while SwiftUI writes the same parameter either way');

// An inline card has to shrink the number or it wraps, and a wrapped inline
// card is a stacked card with extra steps.
check(fontOf('inline') < fontOf('stacked'), 'inline uses a smaller reading');
for (const layout of ['stacked', 'inline'] as Layout[]) {
  check(swiftUI(st({ layout })).includes(`size: ${fontOf(layout)}`), `swift sets the ${layout} type size`);
  check(flutter(st({ layout })).includes(`fontSize: ${fontOf(layout)}`), `dart sets the ${layout} type size`);
}

// Baseline alignment only means something across a row.
check(flutter(st({ layout: 'inline' })).includes('TextBaseline.alphabetic'),
  'an inline row aligns its text on the baseline');
check(flutter(st({ layout: 'stacked' })).includes('CrossAxisAlignment.start'),
  'a column aligns on the leading edge');

// --- the chart follows the arrangement, in both, together ---
// There is no room for a chart across a row, so the layout decides rather than
// a separate switch nobody could see the effect of.
check(hasChart('stacked') && !hasChart('inline'), 'only the stacked card has room for a chart');
for (const layout of ['stacked', 'inline'] as Layout[]) {
  const wanted = hasChart(layout);
  eq(swiftUI(st({ layout })).includes('MoistureChart'), wanted, `swift: chart present iff ${layout}`);
  eq(flutter(st({ layout })).includes('MoistureChart'), wanted, `dart: chart present iff ${layout}`);
  // The divider and the footer stats belong to the same taller card.
  eq(swiftUI(st({ layout })).includes('Divider'), wanted, `swift: divider present iff ${layout}`);
  eq(flutter(st({ layout })).includes('Divider'), wanted, `dart: divider present iff ${layout}`);
}

// --- everything the preview draws has to exist in both sources ---
// A gradient or a chip shown in the phone and missing from the code would make
// the whole comparison a lie.
for (const layout of ['stacked', 'inline'] as Layout[]) {
  const sw = swiftUI(st({ layout }));
  const dt = flutter(st({ layout }));
  for (const [name, inSwift, inDart] of [
    ['the sensor label', 'reading.sensor', 'reading.sensor'],
    ['the age chip', 'TimeChip', 'TimeChip'],
    ['the delta chip', 'DeltaChip', 'DeltaChip'],
    ['the status pill', 'StatusPill', 'StatusPill'],
    ['the gradient', 'LinearGradient', 'LinearGradient'],
    ['the hairline border', 'strokeBorder', 'Border.all'],
    ['the percent sign', '"%"', "'%'"],
  ] as const) {
    check(sw.includes(inSwift), `${layout} swift has ${name}`);
    check(dt.includes(inDart), `${layout} dart has ${name}`);
  }
}

// --- the difference the chapter is actually about ---
// SwiftUI states the gap once on the stack; Flutter spells out a spacer between
// every pair of children. That is a genuine difference, not a staged one.
const stacked = spacerCount(st({ layout: 'stacked' }));
check(stacked.dart > stacked.swift, 'Flutter needs more explicit spacers than SwiftUI does',
  `${stacked.dart} vs ${stacked.swift}`);
const inlined = spacerCount(st({ layout: 'inline' }));
check(inlined.dart < stacked.dart, 'the shorter inline card needs fewer of them');
// The ratio is the claim, not an arbitrary ceiling: whatever the card grows
// into, Flutter needs more explicit spacers to express the same gaps.
check(stacked.dart / Math.max(stacked.swift, 1) >= 1.5,
  'and needs meaningfully more of them, not just one more',
  `${stacked.dart} vs ${stacked.swift}`);

// --- neither generator emits something obviously broken ---
for (const state of [st(), st({ layout: 'inline' }), st({ layout: 'inline', accent: 'ok', radius: 0 }), st({ accent: 'info', radius: 32 })]) {
  for (const [name, code] of [['swift', swiftUI(state)], ['dart', flutter(state)]] as const) {
    const opens = (code.match(/\(/g) ?? []).length;
    const closes = (code.match(/\)/g) ?? []).length;
    eq(opens, closes, `${name}: parentheses balance`);
    const braceOpen = (code.match(/\{/g) ?? []).length;
    const braceClose = (code.match(/\}/g) ?? []).length;
    eq(braceOpen, braceClose, `${name}: braces balance`);
    check(!code.includes('undefined') && !code.includes('NaN'), `${name}: nothing leaked into the source`);
    check(!/\n\s*\n\s*\n/.test(code), `${name}: no triple blank line left by a removed block`);
  }
}

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
