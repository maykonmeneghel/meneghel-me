import { box, cylinder, tube, place, merge, bounds } from './solid.ts';
import {
  station, corpo, corpoHeight, cabecaOS, cabecaWS, thd, gas, bateria, painel,
  PRODUCTS, buildProduct, TUBE_D, CONE_LEN, TUBE_LEN, COUPLING_LEN, SPACERS,
} from './assembly.ts';
import boms from '../../data/agrom-boms.json' with { type: 'json' };
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

// --- tube ---
const t = tube(10, 7, 20, 32);
eq(t.v.length / 3, 32 * 4, 'a tube is four rings and no cap centres');
near(bounds(t).size[0], 20, 1e-9, 'as wide as its outer diameter');
near(bounds(t).size[2], 20, 1e-9, 'and as tall as asked');
eq(t.f.length / 3, 32 * 8, 'four quads per segment: outside, bore, and two annuli');
// The bore faces inward, so an outward test on a hollow solid cannot be 100%.
const outward = outwardFraction(t);
check(outward > 0.4 && outward < 0.85, 'roughly half its faces point inward, being a bore', `${outward.toFixed(2)}`);
eq(tube(10, 0, 20, 16).v.length, cylinder(10, 10, 20, 16).v.length,
  'a tube with no bore is just a cylinder');
// An inscribed polygon with an even number of sides spans exactly 2r however
// many sides it has, so width proves nothing. The area is what converges.
const outerArea = (m: { v: number[] }, sides: number) => {
  let a = 0;
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    a += m.v[i * 3] * m.v[j * 3 + 1] - m.v[j * 3] * m.v[i * 3 + 1];
  }
  return Math.abs(a) / 2;
};
const circle = Math.PI * 100;
const coarse = Math.abs(outerArea(tube(10, 7, 20, 12), 12) - circle);
const fine = Math.abs(outerArea(tube(10, 7, 20, 48), 48) - circle);
check(fine < coarse, 'more segments approximate the circle more closely',
  `48 sides off by ${fine.toFixed(2)} mm², 12 sides by ${coarse.toFixed(2)}`);
check(fine / circle < 0.01, 'and 48 sides is within a percent of a true circle');

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

// --- the products ---
eq(PRODUCTS.map((p) => p.id),
  ['station', 'corpo', 'cabeca-os', 'cabeca-ws', 'thd', 'gas', 'bateria', 'painel'],
  'the viewer offers the products the CAD folder is organised by');
for (const { id, build } of PRODUCTS) {
  const pieces = build();
  check(pieces.length > 0, `${id}: has pieces`);
  check(pieces.every((p) => p.mesh || p.stl), `${id}: every piece is either geometry or a printed part`);
  check(pieces.every((p) => !p.mesh || p.mesh.f.length > 0), `${id}: no empty geometry`);
  check(pieces.every((p) => p.stl ? !!p.at : true), `${id}: every printed part is placed`);
  eq(new Set(pieces.map((p) => p.id)).size, pieces.length, `${id}: piece ids are unique`);
}
eq(buildProduct('corpo').length, corpo().length, 'buildProduct returns the product it is asked for');

// Ø76.2 mm is 3 inches, which is why the tube is that size at all.
near(TUBE_D / 25.4, 3, 1e-9, 'the mast tube is 3 inches on the nose');

// --- the body is exactly its bill of material ---
const body = corpo();
eq(body.filter((p) => p.id.startsWith('coupling')).length, 4, 'BOM Corpo lists four couplings, and there are four');
eq(body.filter((p) => p.id.startsWith('spacer')).length, 6, 'and six spacers');
eq(SPACERS.slice().sort((a, b) => a - b), [80, 80, 100, 100, 120, 120], 'two each of 80, 100 and 120 mm');
check(body.some((p) => p.id === 'cone') && body.some((p) => p.id === 'cano'), 'plus the cone and the tube');
eq(body.length, 12, 'twelve pieces, which is what the BOM adds up to');
near(corpoHeight(),
  CONE_LEN + TUBE_LEN + 4 * COUPLING_LEN + SPACERS.reduce((a, b) => a + b, 0), 1e-6,
  'the body is the drawn lengths stacked, nothing invented in between');
check(body.every((p) => p.fromDrawing), 'and every one of them comes from a drawing');

// --- exploded views actually explode ---
// Counting how many pieces move is the wrong test: a three-piece product with
// an anchor can only ever move two of them, and a symmetric one like the solar
// panel has no anchor at all. What has to be true is that pulling the pieces
// apart makes the product occupy more room than it does assembled.
// Printed parts carry no geometry here — their STL arrives at runtime — so they
// count as the point they are placed at, which is enough to measure separation.
const diagonalOf = (pieces: any[], apart: boolean) => {
  const parts: any[] = [];
  for (const p of pieces) {
    const off = apart ? p.explode : { x: 0, y: 0, z: 0 };
    if (p.mesh) parts.push(place(p.mesh, off.x, off.y, off.z));
    else if (p.at) parts.push({ v: [p.at.x + off.x, p.at.y + off.y, p.at.z + off.z], f: [] });
  }
  if (!parts.length) return 0;
  const size = bounds(merge(parts)).size;
  return Math.hypot(size[0], size[1], size[2]);
};
for (const { id, build } of PRODUCTS) {
  const pieces = build();
  const together = diagonalOf(pieces, false);
  const apart = diagonalOf(pieces, true);
  check(apart > together * 1.25,
    `${id}: exploding it takes up meaningfully more room`,
    `${together.toFixed(0)} mm -> ${apart.toFixed(0)} mm`);
}

// --- the station is the products, assembled ---
const pieces = station();
check(pieces.length > corpo().length, 'the station holds more than just the mast');
const h = bounds(merge(pieces.filter((p) => p.mesh).map((p) => p.mesh!))).size[2];
check(h > 1800 && h < 2400, 'and stands about two metres', `${h.toFixed(0)} mm`);
check(pieces.some((p) => p.stl), 'with printed parts dropped into it');

// --- every product that claims a bill of material has one ---
for (const { id, bom } of PRODUCTS) {
  if (!bom) continue;
  const list = (boms as Record<string, unknown[]>)[bom];
  check(Array.isArray(list) && list.length > 0, `${id}: its bill of material was extracted`, bom);
}
const named = Object.values(boms as Record<string, { supplier?: string }[]>)
  .flat().filter((i) => i.supplier).length;
check(named > 5, 'and the BOMs carry real suppliers, not just part names', `${named} lines name one`);

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
