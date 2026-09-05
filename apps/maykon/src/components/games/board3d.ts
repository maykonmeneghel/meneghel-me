/**
 * A very small 3D renderer for one specific shape: a flat board with things
 * standing on both faces.
 *
 * That narrowness is what lets it stay this short. There is no general depth
 * buffer and no scene graph — the board is a single slab, so the draw order is
 * decided by which face the camera is on, and only the components need sorting
 * among themselves. Painter's algorithm, flat shading, canvas 2D.
 */

export interface Vec3 { x: number; y: number; z: number }
export type Poly = [number, number][];

export interface Part {
  ref: string;
  geom: string;
  x: number;
  y: number;
  rot: number;
  side: 'top' | 'bot';
  h: number;
  shape: Poly;
}

export interface Board3D {
  thickness: number;
  outline: Poly;
  holes: { x: number; y: number; d: number }[];
  parts: Part[];
}

export interface Camera {
  /** Rotation about the board's normal, in degrees. */
  azimuth: number;
  /** 90 looks straight down at the top face; 0 is edge-on; negative sees under. */
  elevation: number;
  scale: number;
  cx: number;
  cy: number;
}

export interface Projected { sx: number; sy: number; depth: number }

/**
 * World to screen. Depth grows towards the viewer, so a larger depth is drawn
 * later. At elevation 90 this reduces to a plan view and depth becomes z.
 *
 * The camera sits on the -y side and swings up to overhead. With right = x,
 * that makes view = (0, -cos e, sin e) and up = view x right = (0, sin e, cos e),
 * which are orthogonal — the pair has to be, or heights shear as the board tilts.
 */
export function project(p: Vec3, cam: Camera): Projected {
  const a = (cam.azimuth * Math.PI) / 180;
  const e = (cam.elevation * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const ce = Math.cos(e), se = Math.sin(e);

  const X = p.x * ca - p.y * sa;
  const Y = p.x * sa + p.y * ca;

  return {
    sx: cam.cx + X * cam.scale,
    sy: cam.cy - (Y * se + p.z * ce) * cam.scale,
    depth: p.z * se - Y * ce,
  };
}

/** Rotate a footprint into place on the board. */
export function placeShape(part: Part): Poly {
  const r = (part.rot * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  // A part on the underside is seen from its back and its rotation reads the
  // other way round. Mirroring the footprint about x and rotating by -rot works
  // out to the same x as the top case with y negated.
  const mirror = part.side === 'bot' ? -1 : 1;
  return part.shape.map(([x, y]) => [
    part.x + (x * c - y * s),
    part.y + (x * s + y * c) * mirror,
  ]);
}

/** The z range a part occupies: outward from whichever face it sits on. */
export function partZ(part: Part, thickness: number): [number, number] {
  const half = thickness / 2;
  return part.side === 'top' ? [half, half + part.h] : [-half - part.h, -half];
}

/**
 * Direction from any surface towards the camera, in world coordinates.
 *
 * Culling by comparing this with a face's own normal is unambiguous. Judging it
 * from the winding of the projected polygon is not: the projection flips the y
 * axis, which reverses the sign, and it is easy to get backwards.
 */
export function viewDirection(cam: Camera): Vec3 {
  const a = (cam.azimuth * Math.PI) / 180;
  const e = (cam.elevation * Math.PI) / 180;
  const ce = Math.cos(e);
  return { x: -ce * Math.sin(a), y: -ce * Math.cos(a), z: Math.sin(e) };
}

/** A face is worth drawing when it turns towards the camera at all. */
export function facesCamera(normal: Vec3, cam: Camera): boolean {
  const v = viewDirection(cam);
  return normal.x * v.x + normal.y * v.y + normal.z * v.z > 0;
}

/**
 * Outward normal of a triangle wound counter-clockwise seen from outside,
 * which is what STL guarantees. Returns null for a degenerate face rather than
 * NaNs, so a collapsed triangle can simply be skipped.
 */
export function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 | null {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
  const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(len) || len < 1e-12) return null;
  return { x: nx / len, y: ny / len, z: nz / len };
}

/** Outward normal of the wall raised on the edge p1 to p2 of a CCW outline. */
export function edgeNormal(x1: number, y1: number, x2: number, y2: number): Vec3 {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dy / len, y: -dx / len, z: 0 };
}

export const LIGHT: Vec3 = { x: -0.34, y: -0.52, z: 0.78 };

function normalise(v: Vec3): Vec3 {
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

/**
 * A fixed light sits above the board, which leaves its underside in the dark —
 * fine for a photograph, useless for something you are meant to turn over and
 * inspect. Mixing in a lamp that rides with the camera keeps whatever you have
 * turned towards you readable, while the fixed part still gives the board a
 * consistent sense of where "up" is.
 */
export function headlight(cam: Camera): Vec3 {
  const v = viewDirection(cam);
  // Weighted towards the camera: at 0.62/0.5 the fixed lamp still won when
  // looking up from underneath, and the underside stayed unreadable.
  return normalise({
    x: v.x * 0.85 + LIGHT.x * 0.3,
    y: v.y * 0.85 + LIGHT.y * 0.3,
    z: v.z * 0.85 + LIGHT.z * 0.3,
  });
}

/** Lambert term, floored so nothing goes fully black. */
export function shade(normal: Vec3, ambient = 0.34, light: Vec3 = LIGHT): number {
  const d = normal.x * light.x + normal.y * light.y + normal.z * light.z;
  return Math.min(1, ambient + Math.max(0, d) * (1 - ambient));
}

export function mix(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * amount);
  const g = Math.round(((n >> 8) & 255) * amount);
  const b = Math.round((n & 255) * amount);
  return `rgb(${r} ${g} ${b})`;
}

/** Component colour by package family, so the board reads at a glance. */
export function partColour(geom: string): string {
  if (geom.startsWith('ESP')) return '#e8e6e1';           // the WiFi module
  if (geom.startsWith('E2_5') || geom.startsWith('153')) return '#2c3550';  // electrolytics
  if (geom.startsWith('1X') || geom.startsWith('AK300') || geom.startsWith('22-23')) return '#16181d';
  if (geom.startsWith('LED')) return '#c0392b';
  if (geom.startsWith('SO') || geom.startsWith('TO') || geom.startsWith('DIP')) return '#22262e';
  return '#3a4048';                                        // passives
}

/** Signed area, used to keep every footprint wound the same way. */
export function area(poly: Poly): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export const ensureCCW = (poly: Poly): Poly => (area(poly) < 0 ? [...poly].reverse() : poly);
