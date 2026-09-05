import {
  swiftUI, flutter, spacingOf, spacerCount, ACCENTS, DEFAULT_STATE,
  type ScreenState, type Accent, type Density,
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
for (const density of ['compact', 'comfortable'] as Density[]) {
  const gap = spacingOf(density);
  check(swiftUI(st({ density })).includes(`spacing: ${gap}`), `swift carries the ${density} gap`);
  check(flutter(st({ density })).includes(`SizedBox(height: ${gap})`), `dart carries the ${density} gap`);
}
for (const accent of Object.keys(ACCENTS) as Accent[]) {
  check(swiftUI(st({ accent })).includes(ACCENTS[accent].swift), `swift uses the ${accent} accent`);
  check(flutter(st({ accent })).includes(ACCENTS[accent].dart), `dart uses the ${accent} accent`);
}
check(spacingOf('compact') < spacingOf('comfortable'), 'compact is tighter than comfortable');

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
for (const state of [st(), st({ chart: false }), st({ density: 'compact', accent: 'ok', radius: 0 })]) {
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
