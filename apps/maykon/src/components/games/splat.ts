/**
 * Turning a mesh into a field of gaussians, which is the difference the chapter
 * is about.
 *
 * A mesh says where the surfaces are, and somebody drew it. A splat field says
 * where the light is, and nobody drew it — it was fitted, by gradient descent,
 * until renders of it matched photographs. Sampling a mesh is not how a real
 * field is produced; it is how you can put the two side by side and see what
 * changes.
 */

export interface Vec3 { x: number; y: number; z: number }

export interface Splat {
  p: Vec3;
  /** Surface normal at the sample, which stands in for the fitted orientation. */
  n: Vec3;
  /** Relative size, so a field has the varied scales a fitted one would. */
  scale: number;
}

/** Deterministic PRNG: the same part always yields the same field. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

/** Twice the area of the triangle, which is what the cross product gives. */
export function triangleArea(a: Vec3, b: Vec3, c: Vec3): number {
  return length(cross(sub(b, a), sub(c, a))) / 2;
}

/**
 * A uniform point inside a triangle. Square-rooting the first coordinate is
 * what keeps the distribution even instead of bunching towards one corner.
 */
export function pointInTriangle(a: Vec3, b: Vec3, c: Vec3, r1: number, r2: number): Vec3 {
  const s = Math.sqrt(r1);
  const u = 1 - s;
  const v = s * (1 - r2);
  const w = s * r2;
  return {
    x: a.x * u + b.x * v + c.x * w,
    y: a.y * u + b.y * v + c.y * w,
    z: a.z * u + b.z * v + c.z * w,
  };
}

/**
 * Scatter `count` gaussians over a mesh, weighted by area so a large face is
 * not represented as thinly as a sliver.
 */
export function sample(verts: Vec3[], faces: number[], count: number, seed = 1): Splat[] {
  const rand = seeded(seed);
  const areas: number[] = [];
  let total = 0;
  for (let i = 0; i < faces.length; i += 3) {
    const area = triangleArea(verts[faces[i]], verts[faces[i + 1]], verts[faces[i + 2]]);
    areas.push(area);
    total += area;
  }
  if (total === 0 || count <= 0) return [];

  // Cumulative areas, so one random draw picks a face in proportion to it.
  const cumulative: number[] = [];
  let running = 0;
  for (const a of areas) {
    running += a;
    cumulative.push(running / total);
  }

  const pick = (u: number) => {
    let lo = 0, hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < u) lo = mid + 1; else hi = mid;
    }
    return lo;
  };

  const out: Splat[] = [];
  for (let i = 0; i < count; i++) {
    const f = pick(rand()) * 3;
    const a = verts[faces[f]], b = verts[faces[f + 1]], c = verts[faces[f + 2]];
    const p = pointInTriangle(a, b, c, rand(), rand());
    const raw = cross(sub(b, a), sub(c, a));
    const len = length(raw) || 1;
    out.push({
      p,
      n: { x: raw.x / len, y: raw.y / len, z: raw.z / len },
      // Fitted fields have a spread of scales; a flat one looks synthetic.
      scale: 0.65 + rand() * 0.7,
    });
  }
  return out;
}

/**
 * How many gaussians a real fit uses per triangle of an equivalent mesh — the
 * ratio is the point: splatting spends far more primitives and asks for none of
 * them to be authored.
 */
export const splatsPerTriangle = (splats: number, triangles: number) =>
  triangles === 0 ? 0 : splats / triangles;
