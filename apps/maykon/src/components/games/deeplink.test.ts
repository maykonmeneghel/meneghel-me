import {
  NAIVE, SHIPPED, attack, landed, isSafe, flow, reached, type Config,
} from './deeplink.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// --- the two ends ---
eq(landed(NAIVE).sort(), ['csrf', 'scheme-hijack', 'token-in-logs'],
  'the tutorial version loses the channel, the token and the request');
eq(landed(SHIPPED), [], 'the shipped version loses nothing');
check(isSafe(SHIPPED) && !isSafe(NAIVE), 'which is the whole difference');

eq(attack(NAIVE).length, 5, 'five attacks, run against every configuration');
eq(new Set(attack(NAIVE).map((a) => a.id)).size, 5, 'each one distinct');

// --- the trap in the middle ---
// Swapping the token for a code is the fix everybody reaches for first, and on
// its own it makes things worse: it closes one hole and opens two.
const codeOnly: Config = { ...NAIVE, payload: 'code' };
check(!landed(codeOnly).includes('token-in-logs'), 'a code is worthless in a log, so that one closes');
check(landed(codeOnly).includes('code-replay'), 'but a code that can be presented twice is a token with extra steps');
check(landed(codeOnly).includes('code-interception'), 'and without PKCE whoever intercepts it can spend it');
check(landed(codeOnly).length > landed(NAIVE).length - 1,
  'so switching to codes alone does not reduce the count',
  `${landed(NAIVE).length} before, ${landed(codeOnly).length} after`);

// Each remaining hole needs its own fix; neither closes the other.
const withPkce: Config = { ...codeOnly, pkce: true };
const withSingleUse: Config = { ...codeOnly, singleUse: true };
check(landed(withPkce).includes('code-replay'), 'PKCE does not stop a code being replayed');
check(landed(withSingleUse).includes('code-interception'), 'and single use does not stop it being intercepted');
check(!landed({ ...codeOnly, pkce: true, singleUse: true }).includes('code-replay'), 'both together close both');

// --- the channel ---
check(landed({ ...SHIPPED, link: 'customScheme' }).includes('scheme-hijack'),
  'a custom scheme can be claimed by any other app on the device, however good the rest is');
check(!landed({ ...NAIVE, link: 'universalLink' }).includes('scheme-hijack'),
  'and a universal link cannot, because the domain has to vouch for the app');

// --- state is orthogonal ---
for (const link of ['customScheme', 'universalLink'] as const) {
  for (const payload of ['token', 'code'] as const) {
    const c: Config = { link, payload, pkce: true, singleUse: true, stateParam: false };
    check(landed(c).includes('csrf'), `a missing state value is a hole on its own (${link}/${payload})`);
  }
}

// --- the walk ---
eq(flow(SHIPPED).length, 7, 'seven steps from tapping sign in to holding a session');
eq(reached(SHIPPED), 7, 'the shipped flow finishes');
eq(reached(NAIVE), 1, 'the naive one is stopped at the first step that can be attacked');
check(reached(codeOnly) < flow(codeOnly).length, 'and the half-fixed one is still stopped short',
  `reached ${reached(codeOnly)} of ${flow(codeOnly).length}`);

// Every attack the flow points at is one the configuration actually allows.
for (const c of [NAIVE, codeOnly, withPkce, SHIPPED]) {
  const named = flow(c).map((s) => s.attack).filter((a): a is NonNullable<typeof a> => a !== null);
  for (const a of named) {
    check(attack(c).some((x) => x.id === a), 'the walk only names attacks the model knows about');
  }
}

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
