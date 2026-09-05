/**
 * Mesh builders for the turned and fabricated parts of the AGROM.IO mast.
 *
 * The 3D-printed parts ship as decimated STLs. Everything else — the tube, the
 * cone that drives it into the ground, the cross-arm, the panel — was turned or
 * cut, so SolidWorks only left drawings. Those parts are axisymmetric or
 * rectangular, which means a handful of dimensions off the drawing is enough to
 * rebuild them exactly rather than approximately.
 */

export interface Mesh {
  /** Flat xyz triples. */
  v: number[];
  /** Flat triangle indices. */
  f: number[];
}

const push = (m: Mesh, x: number, y: number, z: number) => {
  m.v.push(x, y, z);
  return m.v.length / 3 - 1;
};

const quad = (m: Mesh, a: number, b: number, c: number, d: number) => {
  m.f.push(a, b, c, a, c, d);
};

/** Axis-aligned box centred on the origin. */
export function box(w: number, h: number, d: number): Mesh {
  const m: Mesh = { v: [], f: [] };
  const [x, y, z] = [w / 2, d / 2, h / 2];
  const p = [
    push(m, -x, -y, -z), push(m, x, -y, -z), push(m, x, y, -z), push(m, -x, y, -z),
    push(m, -x, -y, z), push(m, x, -y, z), push(m, x, y, z), push(m, -x, y, z),
  ];
  quad(m, p[4], p[5], p[6], p[7]);   // top
  quad(m, p[3], p[2], p[1], p[0]);   // bottom
  quad(m, p[0], p[1], p[5], p[4]);
  quad(m, p[1], p[2], p[6], p[5]);
  quad(m, p[2], p[3], p[7], p[6]);
  quad(m, p[3], p[0], p[4], p[7]);
  return m;
}

/**
 * Tube or solid rod along z, centred on the origin. A top radius of zero gives
 * the cone that tips the mast.
 */
export function cylinder(rBottom: number, rTop: number, height: number, sides = 48): Mesh {
  const m: Mesh = { v: [], f: [] };
  const half = height / 2;
  const ring = (r: number, z: number) =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2;
      return push(m, Math.cos(a) * r, Math.sin(a) * r, z);
    });

  const lower = ring(rBottom, -half);
  const upper = ring(rTop, half);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    if (rTop === 0) {
      m.f.push(lower[i], lower[j], upper[i]);      // cone flank
    } else {
      quad(m, lower[i], lower[j], upper[j], upper[i]);
    }
  }

  // Caps, fanned from a centre vertex. A zero radius needs no cap.
  if (rTop > 0) {
    const c = push(m, 0, 0, half);
    for (let i = 0; i < sides; i++) m.f.push(c, upper[i], upper[(i + 1) % sides]);
  }
  if (rBottom > 0) {
    const c = push(m, 0, 0, -half);
    for (let i = 0; i < sides; i++) m.f.push(c, lower[(i + 1) % sides], lower[i]);
  }
  return m;
}

/**
 * A hollow tube along z: the drawings give Ø76.20 outside and Ø72 inside, so a
 * 2.1 mm wall. Modelling these as solid rods costs nothing when they are
 * assembled and everything the moment the view explodes and you can see down
 * the bore.
 */
export function tube(rOuter: number, rInner: number, height: number, sides = 48): Mesh {
  if (rInner <= 0) return cylinder(rOuter, rOuter, height, sides);
  const m: Mesh = { v: [], f: [] };
  const half = height / 2;
  const ring = (r: number, z: number) =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2;
      return push(m, Math.cos(a) * r, Math.sin(a) * r, z);
    });

  const ob = ring(rOuter, -half), ot = ring(rOuter, half);
  const ib = ring(rInner, -half), it = ring(rInner, half);

  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    quad(m, ob[i], ob[j], ot[j], ot[i]);   // outside wall
    quad(m, it[i], it[j], ib[j], ib[i]);   // bore, facing inward
    quad(m, ot[i], ot[j], it[j], it[i]);   // annular top
    quad(m, ib[i], ib[j], ob[j], ob[i]);   // annular bottom
  }
  return m;
}

/** Move a mesh, and optionally lay it along x or y instead of z. */
export function place(m: Mesh, x: number, y: number, z: number, axis: 'z' | 'x' | 'y' = 'z'): Mesh {
  const out: Mesh = { v: [], f: [...m.f] };
  for (let i = 0; i < m.v.length; i += 3) {
    const [a, b, c] = [m.v[i], m.v[i + 1], m.v[i + 2]];
    const r = axis === 'z' ? [a, b, c] : axis === 'x' ? [c, b, -a] : [a, c, -b];
    out.v.push(r[0] + x, r[1] + y, r[2] + z);
  }
  return out;
}

/** Combine meshes, shifting the indices of each as it is appended. */
export function merge(meshes: Mesh[]): Mesh {
  const out: Mesh = { v: [], f: [] };
  for (const m of meshes) {
    const offset = out.v.length / 3;
    out.v.push(...m.v);
    for (const i of m.f) out.f.push(i + offset);
  }
  return out;
}

export function bounds(m: Mesh) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.v.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], m.v[i + k]);
      hi[k] = Math.max(hi[k], m.v[i + k]);
    }
  }
  return { lo, hi, size: hi.map((h, k) => h - lo[k]) };
}
