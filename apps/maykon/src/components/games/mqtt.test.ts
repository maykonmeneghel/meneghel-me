import { matches, validate, solves, TOPICS, MISSIONS } from './mqtt.ts';

let fail = 0;
const eq = (got: unknown, want: unknown, label: string) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { console.log(`FAIL ${label}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); fail++; }
};

// --- spec examples (OASIS MQTT 3.1.1, section 4.7) ---
// MQTT 3.1.1 s4.7.1.2: "# includes the parent level", so this must match.
eq(matches('sport/tennis/player1/#', 'sport/tennis/player1'), true, '# includes its parent level');
eq(matches('sport/tennis/+', 'sport/tennis/player1'), true, '+ one level');
eq(matches('sport/tennis/+', 'sport/tennis/player1/ranking'), false, '+ does not span levels');
eq(matches('sport/+', 'sport'), false, '+ needs a level to fill');
eq(matches('#', 'anything/at/all'), true, '# alone matches all');
eq(matches('sport/#', 'sport/tennis/x'), true, '# matches deeper');

// --- validation ---
eq(validate('farm/#'), null, 'trailing # valid');
eq(validate('farm/#/x'), 'hash', '# not last');
eq(validate('farm/soil#'), 'hash', '# glued to a level');
eq(validate('farm/+/temp'), null, '+ valid');
eq(validate('farm/soil+/temp'), 'plus', '+ glued to a level');
eq(validate('farm//temp'), 'empty', 'empty level');
eq(validate(''), null, 'empty filter is not an error, just inert');

// --- missions accept every equivalent answer ---
eq(solves('farm/greenhouse/#', 'greenhouse'), true, 'greenhouse via #');
eq(solves('farm/greenhouse/+/+', 'greenhouse'), true, 'greenhouse via ++');
eq(solves('farm/#', 'greenhouse'), false, 'farm/# is too broad for greenhouse');
eq(solves('+/+/+/temp', 'temps'), true, 'all temps');
eq(solves('farm/+/+/temp', 'temps'), false, 'farm-only misses home thermostat');
eq(solves('farm/+/+/moisture', 'moisture'), true, 'farm moisture');
eq(solves('+/+/+/moisture', 'moisture'), true, 'no home moisture topic exists, so this is equivalent');

// --- mission target sets ---
eq(MISSIONS.greenhouse.length, 4, 'greenhouse topic count');
eq(MISSIONS.temps.length, 4, 'temp topic count');
eq(MISSIONS.moisture.length, 3, 'farm moisture topic count');
eq(TOPICS.length, 8, 'topic count');

console.log(fail === 0 ? `\nAll assertions passed.` : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
