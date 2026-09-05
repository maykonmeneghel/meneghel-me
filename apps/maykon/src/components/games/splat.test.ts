import { sample, triangleArea, pointInTriangle, seeded, splatsPerTriangle, type Vec3 } from './splat.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

// --- area ---
near(triangleArea(V(0, 0, 0), V(4, 0, 0), V(0, 3, 0)), 6, 1e-9, 'a 3-4 right triangle has area 6');
near(triangleArea(V(1, 1, 1), V(1, 1, 1), V(2, 2, 2)), 0, 1e-9, 'a degenerate triangle has no area');
near(triangleArea(V(0, 0, 0), V(0, 0, 5), V(0, 2, 0)), 5, 1e-9, 'area is orientation independent');

// --- barycentric sampling stays inside the triangle ---
const a = V(0, 0, 0), b = V(1, 0, 0), c = V(0, 1, 0);
const rand = seeded(3);
let inside = 0;
for (let i = 0; i < 3000; i++) {
  const p = pointInTriangle(a, b, c, rand(), rand());
  if (p.x >= -1e-12 && p.y >= -1e-12 && p.x + p.y <= 1 + 1e-12) inside++;
  near(p.z, 0, 1e-12, 'a point on a flat triangle stays in its plane');
}
eq(inside, 3000, 'every sampled point falls inside the triangle');

// Uniform, not bunched: the mean of many samples is the centroid.
const rand2 = seeded(11);
let sx = 0, sy = 0;
const N = 20000;
for (let i = 0; i < N; i++) {
  const p = pointInTriangle(a, b, c, rand2(), rand2());
  sx += p.x; sy += p.y;
}
near(sx / N, 1 / 3, 0.01, 'samples average to the centroid in x');
near(sy / N, 1 / 3, 0.01, 'and in y — square-rooting r1 is what makes that true');

// --- sampling a mesh ---
// Two triangles, one nine times the area of the other.
const verts = [V(0, 0, 0), V(3, 0, 0), V(0, 3, 0), V(10, 0, 0), V(11, 0, 0), V(10, 1, 0)];
const faces = [0, 1, 2, 3, 4, 5];
const splats = sample(verts, faces, 4000, 5);
eq(splats.length, 4000, 'it produces as many gaussians as asked');
const onBig = splats.filter((s) => s.p.x < 5).length;
near(onBig / 4000, 9 / 10, 0.02, 'and spreads them by area, not by face count');

check(splats.every((s) => Math.abs(Math.hypot(s.n.x, s.n.y, s.n.z) - 1) < 1e-9), 'every normal is a unit vector');
check(splats.every((s) => s.scale > 0.6 && s.scale < 1.4), 'scales vary, as a fitted field does');
check(new Set(splats.map((s) => s.scale.toFixed(3))).size > 100, 'and are not all the same value');

// --- determinism ---
const s1 = sample(verts, faces, 200, 42);
const s2 = sample(verts, faces, 200, 42);
eq(s1.map((s) => s.p.x.toFixed(9)), s2.map((s) => s.p.x.toFixed(9)), 'the same seed gives the same field');
check(sample(verts, faces, 200, 43)[10].p.x !== s1[10].p.x, 'a different seed gives a different one');

// --- degenerate inputs ---
eq(sample(verts, faces, 0).length, 0, 'asking for none gives none');
eq(sample(verts, faces, -5).length, 0, 'a negative count is refused, not looped forever');
eq(sample([V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)], [0, 1, 2], 100).length, 0,
  'a mesh with no area yields no gaussians rather than dividing by zero');
eq(sample([], [], 100).length, 0, 'an empty mesh is handled');

// --- the ratio the chapter quotes ---
near(splatsPerTriangle(20000, 1000), 20, 1e-9, 'the ratio is splats over triangles');
eq(splatsPerTriangle(500, 0), 0, 'and a mesh with no triangles does not divide by zero');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
