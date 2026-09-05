import { box, cylinder, place, merge, bounds } from './solid.ts';
import { station, stationHeight, TUBE_D, CONE_LEN, HASTE_LEN, SPACER_LEN } from './assembly.ts';
import { faceNormal } from './board3d.ts';

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const vertAt = (m: { v: number[] }, i: number) => ({ x: m.v[i * 3], y: m.v[i * 3 + 1], z: m.v[i * 3 + 2] });

/** Every face should point away from the centroid of a convex solid. */
function outwardFraction(m: { v: number[]; f: number[] }) {
  const b = bounds(m);
  const c = { x: (b.lo[0] + b.hi[0]) / 2, y: (b.lo[1] + b.hi[1]) / 2, z: (b.lo[2] + b.hi[2]) / 2 };
  let good = 0, total = 0;
  for (let i = 0; i < m.f.length; i += 3) {
    const a = vertAt(m, m.f[i]), p = vertAt(m, m.f[i + 1]), q = vertAt(m, m.f[i + 2]);
    const n = faceNormal(a, p, q);
    if (!n) continue;
    const mid = { x: (a.x + p.x + q.x) / 3, y: (a.y + p.y + q.y) / 3, z: (a.z + p.z + q.z) / 3 };
    const away = { x: mid.x - c.x, y: mid.y - c.y, z: mid.z - c.z };
    total++;
    if (n.x * away.x + n.y * away.y + n.z * away.z > 0) good++;
  }
  return good / total;
}

// --- box ---
const b = box(10, 4, 6);
eq(b.v.length / 3, 8, 'a box has eight vertices');
eq(b.f.length / 3, 12, 'and twelve triangles');
eq(bounds(b).size, [10, 6, 4], 'sized as asked, with height along z');
eq(outwardFraction(b), 1, 'every box face points outward');

// --- cylinder ---
const cyl = cylinder(5, 5, 20, 24);
eq(cyl.v.length / 3, 24 * 2 + 2, 'a closed cylinder is two rings plus two cap centres');
near(bounds(cyl).size[2], 20, 1e-9, 'as tall as asked');
near(bounds(cyl).size[0], 10, 1e-9, 'and as wide as its diameter');
eq(outwardFraction(cyl), 1, 'every cylinder face points outward');

// --- cone ---
const cone = cylinder(0, 6, 15, 20);
eq(cone.v.length / 3, 20 * 2 + 1, 'a cone needs no cap at its point');
near(bounds(cone).size[2], 15, 1e-9, 'cone height');
eq(outwardFraction(cone), 1, 'every cone face points outward');

// --- placement and merging ---
const moved = place(box(2, 2, 2), 10, 0, 0);
near(bounds(moved).lo[0], 9, 1e-9, 'moving shifts the bounds with it');
const laid = place(cylinder(1, 1, 100, 12), 0, 0, 0, 'x');
near(bounds(laid).size[0], 100, 1e-9, 'laying a cylinder along x makes it long in x');
near(bounds(laid).size[2], 2, 1e-9, 'and thin in z');
const both = merge([box(2, 2, 2), place(box(2, 2, 2), 10, 0, 0)]);
eq(both.v.length / 3, 16, 'merging keeps every vertex');
eq(both.f.length / 3, 24, 'and every face');
check(Math.max(...both.f) === 15, 'indices of the second mesh were shifted', `${Math.max(...both.f)}`);

// --- the station itself ---
const pieces = station();
check(pieces.length >= 10, 'the station is built from at least ten pieces');
check(pieces.every((p) => p.mesh.f.length > 0), 'no piece is empty');
check(pieces.filter((p) => p.fromDrawing).length >= 6, 'most of it comes from the dimensioned drawings');

// Ø76.2 mm is 3 inches, which is why the tube is that size at all.
near(TUBE_D / 25.4, 3, 1e-9, 'the mast tube is 3 inches on the nose');

const mast = merge(pieces.filter((p) => ['cone', 'haste', 'coupling', 'spacer'].includes(p.id)).map((p) => p.mesh));
near(bounds(mast).size[2], CONE_LEN + HASTE_LEN + 60 + SPACER_LEN, 1e-6,
  'the mast is the drawn lengths stacked, nothing invented in between');
near(bounds(mast).lo[2], -CONE_LEN, 1e-9, 'and the tip is the only part below ground');

const h = stationHeight();
check(h > 1900 && h < 2200, 'the whole station stands about two metres', `${h.toFixed(0)} mm`);

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
