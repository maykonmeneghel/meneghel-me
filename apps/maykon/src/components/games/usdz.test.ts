import {
  FORMATS, SOURCES, TOLERANCES_MM, TARGET_UP, TARGET_UNITS_PER_METRE,
  PART_HEIGHT_MM, FLAT_TRIANGLES, CURVED_FEATURES, FEATURE_ROWS, MEAN_RADIUS_MM,
  BUDGET_TRIANGLES, FACETED_BELOW, BYTES_PER_TRIANGLE, CONTAINER_BYTES, TEXTURE_BYTES,
  segments, tessellate, usdzBytes, convert, isClean,
  type Options,
} from './usdz.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const clean = (toleranceMm = 0.1): Options => ({ convertAxis: true, convertUnits: true, toleranceMm });

// --- the tessellation arithmetic ---
// A flat chord across an arc of radius R spanning θ sits R(1 − cos(θ/2)) below
// the true surface. Every segment count below is that identity, solved.
for (const tol of TOLERANCES_MM) {
  const n = segments(tol);
  const sagitta = MEAN_RADIUS_MM * (1 - Math.cos(Math.PI / n));
  check(sagitta <= tol + 1e-9, `${tol} mm: the flats really do stay inside the tolerance`, `sagitta ${sagitta}`);
  // And not extravagantly inside it — one segment fewer would breach it.
  const looser = MEAN_RADIUS_MM * (1 - Math.cos(Math.PI / (n - 1)));
  check(looser > tol, `${tol} mm: and no coarser count would have done`, `sagitta ${looser}`);
}

eq(segments(1), 12, 'a millimetre of chord error on a 25 mm radius is twelve flats');
eq(segments(0.1), 36, 'a tenth of a millimetre is thirty-six');
eq(segments(0.02), 79, 'and two hundredths is seventy-nine');
eq(segments(MEAN_RADIUS_MM * 2), 3, 'a tolerance past the radius still cannot make a circle out of fewer than three');
check(segments(0.1, 50) > segments(0.1, 25), 'a bigger bore needs more flats to hold the same error');

// Halving the tolerance costs about √2, not 2 — the reason the knob is worth
// turning rather than pinning at its finest.
near(segments(0.05) / segments(0.1), Math.SQRT2, 0.06, 'halving the tolerance multiplies the flats by about root two');
near(segments(0.025) / segments(0.1), 2, 0.1, 'quartering it doubles them');

const counts = TOLERANCES_MM.map((t) => tessellate(t));
check(counts.every((v, i) => i === 0 || v > counts[i - 1]), 'a finer tolerance is always more triangles', JSON.stringify(counts));
eq(tessellate(0.1), FLAT_TRIANGLES + CURVED_FEATURES * FEATURE_ROWS * 2 * 36, 'the flats are counted once and the curves per segment');
check(tessellate(1) < BUDGET_TRIANGLES, 'the coarsest tessellation fits the budget');
check(tessellate(0.02) > BUDGET_TRIANGLES, 'the finest one blows it');

// --- what each source arrives as ---
eq(FORMATS.glb.up, TARGET_UP, 'glb is already the target up axis');
eq(FORMATS.glb.unitsPerMetre, TARGET_UNITS_PER_METRE, 'and already metric');
check(FORMATS.step.up !== TARGET_UP && FORMATS.fbx.up !== TARGET_UP, 'step and fbx are not');
check(SOURCES.every((s) => FORMATS[s].id === s), 'every source is keyed by its own id');
check(
  SOURCES.filter((s) => FORMATS[s].geometry === 'mesh').every((s) => FORMATS[s].meshTriangles! > 0),
  'a mesh source states the triangles it already carries',
);
eq(FORMATS.step.meshTriangles, undefined, 'a solid carries none — it has not been tessellated yet');

// --- the two ways to ship something that loads perfectly and is wrong ---
for (const s of SOURCES) {
  const c = convert(s, clean());
  eq(c.tiltDeg, 0, `${s}: converted properly, it lands upright`);
  eq(c.scale, 1, `${s}: and at life size`);
  eq(c.heightMm, PART_HEIGHT_MM, `${s}: which is the height it was drawn at`);
  check(!c.warnings.includes('axis') && !c.warnings.includes('units'), `${s}: with nothing to warn about on the transform`);
}

const tipped = convert('step', { ...clean(), convertAxis: false });
eq(tipped.tiltDeg, 90, 'skip the axis conversion on a Z-up source and the part lies on its side');
check(tipped.warnings.includes('axis'), 'and the conversion says so');
eq(convert('glb', { ...clean(), convertAxis: false }).tiltDeg, 0, 'a Y-up source is unharmed by the same mistake');

// The unit slip is the dangerous one: nothing errors, the file opens, and the
// part is the size of a building.
const huge = convert('step', { ...clean(), convertUnits: false });
eq(huge.scale, 1000, 'a millimetre read as a metre is a thousand times too big');
eq(huge.heightMm, PART_HEIGHT_MM * 1000, 'so a 184 mm part lands 184 metres tall');
eq(convert('fbx', { ...clean(), convertUnits: false }).scale, 100, 'a centimetre read as a metre is a hundred times');
eq(convert('glb', { ...clean(), convertUnits: false }).scale, 1, 'and a metric source is unharmed');

// --- what survives of the way it looks ---
eq(convert('glb', clean()).material, 'pbr', 'glb speaks the same shading model as the target');
eq(convert('fbx', clean()).material, 'flat', 'fbx does not');
check(convert('fbx', clean()).warnings.includes('phong'), 'and its Phong parameters are approximated, not carried');
check(convert('step', clean()).warnings.includes('faceColour'), 'a solid brings face colours at best, never maps');

// --- bytes ---
eq(usdzBytes(1_000, false), CONTAINER_BYTES + 1_000 * BYTES_PER_TRIANGLE, 'an untextured file is geometry and container');
eq(usdzBytes(1_000, true) - usdzBytes(1_000, false), TEXTURE_BYTES, 'textures are the difference, and they dominate');
check(convert('step', clean(0.02)).bytes > convert('step', clean(1)).bytes, 'a finer tessellation is a bigger file');
check(
  convert('glb', clean()).bytes > convert('step', clean(1)).bytes,
  'and a textured source outweighs a coarsely tessellated solid',
);

// --- the tolerance is only the author's to choose on a solid ---
eq(convert('step', clean()).retessellated, true, 'a solid is tessellated at conversion time');
eq(convert('glb', clean()).retessellated, false, 'a mesh arrives with that decision already made');
eq(
  convert('glb', clean(1)).triangles,
  convert('glb', clean(0.02)).triangles,
  'so moving the tolerance does nothing to a mesh source',
);
eq(convert('glb', clean()).triangles, FORMATS.glb.meshTriangles, 'it keeps exactly the triangles it came with');

// --- the warnings the panel prints ---
check(convert('step', clean(1)).warnings.includes('faceted'), 'a coarse tolerance is called out as visibly faceted');
check(segments(1) < FACETED_BELOW, 'because twelve flats is a polygon, not a circle');
check(!convert('step', clean(0.1)).warnings.includes('faceted'), 'a tenth of a millimetre is not');
check(convert('fbx', clean()).warnings.includes('overBudget'), 'a mesh source can arrive over budget with nothing to be done');
check(!convert('step', clean(0.1)).warnings.includes('overBudget'), 'while the solid can simply be tessellated to fit');

// --- the one clean path ---
check(isClean(convert('step', clean(0.1))), 'a solid, converted properly and tessellated to budget, is clean');
check(!isClean(tipped), 'a tipped part is not');
check(!isClean(huge), 'nor is one a thousand times too big');
check(!isClean(convert('step', clean(0.02))), 'nor one over the triangle budget');

if (fail === 0) console.log('All assertions passed.');
else { console.log(`${fail} assertion(s) failed.`); process.exit(1); }
