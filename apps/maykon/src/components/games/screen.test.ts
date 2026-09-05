import {
  swiftUI, flutter, spacingOf, spacerCount, fontOf, ACCENTS, DEFAULT_STATE,
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
check(swiftUI(st({ layout: 'stacked' })).includes('VStack('), 'stacked is a VStack');
check(swiftUI(st({ layout: 'inline' })).includes('HStack('), 'inline is an HStack');
check(!swiftUI(st({ layout: 'inline' })).includes('VStack('), 'and not both at once');
check(flutter(st({ layout: 'stacked' })).includes('child: Column('), 'stacked is a Column');
check(flutter(st({ layout: 'inline' })).includes('child: Row('), 'inline is a Row');
check(!flutter(st({ layout: 'inline' })).includes('child: Column('), 'and not both at once');

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

// --- the chart is present or absent in both, together ---
check(swiftUI(st({ chart: true })).includes('MoistureChart'), 'swift draws the chart when asked');
check(!swiftUI(st({ chart: false })).includes('MoistureChart'), 'and leaves it out when not');
check(flutter(st({ chart: true })).includes('MoistureChart'), 'dart draws the chart when asked');
check(!flutter(st({ chart: false })).includes('MoistureChart'), 'and leaves it out when not');

// --- the difference the chapter is actually about ---
// SwiftUI states the gap once on the stack; Flutter spells out a spacer between
// every pair of children. That is a genuine difference, not a staged one.
const withChart = spacerCount(st({ chart: true }));
eq(withChart.swift, 1, 'SwiftUI declares spacing once, on the stack');
check(withChart.dart >= 3, 'Flutter needs an explicit spacer between each pair', `${withChart.dart}`);
check(withChart.dart > withChart.swift, 'which is more places to change when the design does');
const withoutChart = spacerCount(st({ chart: false }));
check(withoutChart.dart < withChart.dart, 'dropping the chart drops one of Flutter’s spacers too');
eq(withoutChart.swift, 1, 'while SwiftUI still says it once');

// --- neither generator emits something obviously broken ---
for (const state of [st(), st({ chart: false }), st({ layout: 'inline', accent: 'ok', radius: 0 }), st({ layout: 'inline', chart: false })]) {
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
