import {
  project, placeShape, partZ, shade, area, ensureCCW, partColour,
  viewDirection, facesCamera, edgeNormal, headlight, faceNormal,
  type Camera, type Part, type Poly,
} from './board3d.ts';
import model from '../../data/agrom-board3d.json' with { type: 'json' };

let fail = 0;
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) { console.log(`FAIL ${label}${detail ? '\n  ' + detail : ''}`); fail++; }
};
const eq = (got: unknown, want: unknown, label: string) =>
  check(JSON.stringify(got) === JSON.stringify(want), label, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (got: number, want: number, tol: number, label: string) =>
  check(Math.abs(got - want) <= tol, label, `got ${got}, want ${want} ±${tol}`);

const cam: Camera = { azimuth: 0, elevation: 90, scale: 1, cx: 0, cy: 0 };

// --- the plan view is the degenerate case, and must stay honest ---
const top = project({ x: 3, y: 4, z: 0 }, cam);
near(top.sx, 3, 1e-9, 'looking straight down, x maps through unchanged');
near(top.sy, -4, 1e-9, 'and y flips, because screen y grows downward');
near(top.depth, 0, 1e-9, 'depth on the board plane is zero from above');
check(project({ x: 0, y: 0, z: 5 }, cam).depth > project({ x: 0, y: 0, z: -5 }, cam).depth,
  'from above, a part on the top face is nearer than one underneath');

// --- edge on, depth becomes distance across the board ---
const edge: Camera = { ...cam, elevation: 0 };
near(project({ x: 0, y: 0, z: 2 }, edge).sy, -2, 1e-9, 'edge on, height becomes screen height');
// The camera sits on the -y side, so that is the edge closest to it.
check(project({ x: 0, y: -5, z: 0 }, edge).depth > project({ x: 0, y: 5, z: 0 }, edge).depth,
  'edge on, the edge facing the camera is nearer');
near(project({ x: 1, y: 0, z: 0 }, edge).sx, 1, 1e-9, 'edge on, x is still horizontal');

// --- turning the board ---
const spun = project({ x: 1, y: 0, z: 0 }, { ...cam, azimuth: 90 });
near(spun.sx, 0, 1e-9, 'a quarter turn moves +x off the horizontal axis');
near(spun.sy, -1, 1e-9, 'and onto the vertical one');
// up and view must stay perpendicular, or heights shear as the board tilts.
for (const el of [0, 23, 45, 62, 90]) {
  const c: Camera = { ...cam, elevation: el };
  const e2 = (el * Math.PI) / 180;
  const up = { x: 0, y: Math.sin(e2), z: Math.cos(e2) };
  const view = { x: 0, y: -Math.cos(e2), z: Math.sin(e2) };
  near(up.x * view.x + up.y * view.y + up.z * view.z, 0, 1e-12, `up and view stay orthogonal at ${el} degrees`);
  near(project(up, c).depth, 0, 1e-12, `the up direction has no depth at ${el} degrees`);
}

// --- placement ---
const part: Part = { ref: 'X1', geom: 'C0805', x: 10, y: -5, rot: 90, side: 'top', h: 1, shape: [[1, 0], [0, 1], [-1, 0]] };
const placed = placeShape(part);
near(placed[0][0], 10, 1e-9, 'a 90 degree rotation sends +x to +y');
near(placed[0][1], -4, 1e-9, 'about the part origin, then offset to its seat');

const flipped = placeShape({ ...part, side: 'bot' });
near(flipped[0][0], 10, 1e-9, 'a part underneath is mirrored, as it is in reality');
near(flipped[0][1], -6, 1e-9, 'which negates the rotated x contribution');

eq(partZ({ ...part, h: 6 }, 1.6), [0.8, 6.8], 'a top part sits on the top face and grows up');
eq(partZ({ ...part, side: 'bot', h: 6 }, 1.6), [-6.8, -0.8], 'a bottom part grows down');

// --- shading stays in range ---
check(shade({ x: 0, y: 0, z: 1 }) > shade({ x: 0, y: 0, z: -1 }), 'an upward face is lit more than a downward one');
for (const n of [{ x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: -1 }]) {
  const s = shade(n);
  check(s >= 0.3 && s <= 1, 'shading never leaves [ambient, 1]', `${s}`);
}

// --- which faces the camera can see ---
const UP = { x: 0, y: 0, z: 1 };
const DOWN = { x: 0, y: 0, z: -1 };
check(facesCamera(UP, cam), 'from above, the top face is visible');
check(!facesCamera(DOWN, cam), 'and the bottom face is not');
const below: Camera = { ...cam, elevation: -58 };
check(facesCamera(DOWN, below), 'from below, the bottom face is visible');
check(!facesCamera(UP, below), 'and the top face is not');

// The view direction must be a unit vector at every angle, or culling drifts.
for (const [az, el] of [[0, 90], [-18, 58], [140, 12], [37, -45], [180, 0]]) {
  const v = viewDirection({ ...cam, azimuth: az, elevation: el });
  near(Math.hypot(v.x, v.y, v.z), 1, 1e-12, `view direction is normalised at ${az}/${el}`);
}

// An outward wall normal is visible exactly when it leans towards the camera.
const n = edgeNormal(0, 0, 1, 0);
near(Math.hypot(n.x, n.y, n.z), 1, 1e-12, 'edge normals are normalised');
eq([n.x, n.y, n.z], [0, -1, 0], 'the outward normal of a CCW bottom edge points away from the interior');
check(facesCamera(n, { ...cam, azimuth: 0, elevation: 40 }), 'the wall facing the camera is drawn');
check(!facesCamera({ x: 0, y: 1, z: 0 }, { ...cam, azimuth: 0, elevation: 40 }), 'the far wall is culled');

// --- the lamp that rides with the camera ---
for (const [az, el] of [[0, 90], [-18, 58], [140, 12], [37, -45], [180, -80]]) {
  const c: Camera = { ...cam, azimuth: az, elevation: el };
  const hl = headlight(c);
  near(Math.hypot(hl.x, hl.y, hl.z), 1, 1e-12, `headlight is normalised at ${az}/${el}`);
  // Whatever face you have turned towards you must be readable.
  const facing = viewDirection(c);
  check(shade(facing, 0.34, hl) > 0.6,
    `the face turned towards the camera is lit at ${az}/${el}`,
    `${shade(facing, 0.34, hl).toFixed(2)}`);
}
// The underside was the case that failed: ambient only, almost black.
const under: Camera = { ...cam, elevation: -58 };
const downFace = { x: 0, y: 0, z: -1 };
check(shade(downFace) < 0.4, 'a fixed overhead light leaves the underside dark');
check(shade(downFace, 0.34, headlight(under)) > 0.7, 'the headlight brings it back',
  `${shade(downFace, 0.34, headlight(under)).toFixed(2)}`);
// It must not do that by washing everything out: a face turned away stays dark.
check(shade({ x: 0, y: 0, z: 1 }, 0.34, headlight(under)) < 0.45,
  'a face turned away from the camera is still dark');

// --- triangle normals, for the STL meshes ---
const up = faceNormal({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })!;
eq([up.x, up.y, up.z], [0, 0, 1], 'a CCW triangle in the xy plane faces up');
const down = faceNormal({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 })!;
eq([down.x, down.y, down.z], [0, 0, -1], 'reversing the winding flips it');
const slanted = faceNormal({ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 0, y: 2, z: 2 })!;
near(Math.hypot(slanted.x, slanted.y, slanted.z), 1, 1e-12, 'normals come back normalised');
eq(faceNormal({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 }), null,
  'a triangle collapsed to a line returns null rather than NaNs');
eq(faceNormal({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }), null,
  'so does a degenerate point');

// --- winding ---
const cw: Poly = [[0, 0], [0, 1], [1, 1], [1, 0]];
check(area(cw) < 0, 'that square is wound clockwise');
check(area(ensureCCW(cw)) > 0, 'and ensureCCW turns it around');
eq(ensureCCW([[0, 0], [1, 0], [1, 1]] as Poly), [[0, 0], [1, 0], [1, 1]], 'an already-CCW polygon is left alone');

// --- the model itself ---
eq(model.thickness, 1.6, 'standard 1.6 mm laminate');
eq(model.outline.length, 25, 'board outline points');
eq(model.parts.length, 59, '59 components placed');
eq(model.parts.filter((p) => p.side === 'bot').length, 19, '19 of them underneath');
check(model.parts.every((p) => p.shape.length >= 3), 'every part has a real footprint');
check(model.parts.every((p) => p.h > 0 && p.h <= 12), 'every assigned height is plausible');
check(model.parts.some((p) => p.geom.startsWith('ESP')), 'the ESP8266 module is on the board');
check(new Set(model.parts.map((p) => partColour(p.geom))).size > 3, 'the palette distinguishes package families');

// --- nothing hangs off the edge ---
const r = Math.max(...model.outline.map(([x, y]) => Math.hypot(x + 0.4, y + 2.3)));
const strays = model.parts.filter((p) => Math.hypot(p.x + 0.4, p.y + 2.3) > r);
eq(strays.length, 0, 'no component is placed off the board');

console.log(fail === 0 ? '\nAll assertions passed.' : `\n${fail} failing assertion(s).`);
process.exit(fail === 0 ? 0 : 1);
