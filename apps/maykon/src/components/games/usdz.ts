/**
 * What has to be true before a CAD file will open on a headset.
 *
 * USDZ is the format Apple's platforms read, and getting a part into it is not
 * a re-encode. Three things have to be decided, and every one of them is a
 * chance to ship something that loads perfectly and is wrong: which way is up,
 * how big a unit is, and — for anything that arrives as a solid rather than as
 * triangles — how much error you are willing to accept in exchange for how many
 * triangles.
 *
 * The part below is stated as constants rather than read from a file, so every
 * number the panel prints can be checked by hand.
 */

export type Source = 'step' | 'glb' | 'fbx';
export type Axis = 'y' | 'z';
export type Geometry = 'brep' | 'mesh';
export type Appearance = 'faceColour' | 'pbr' | 'phong';

export interface Format {
  id: Source;
  /** Which way is up in the file's own convention. */
  up: Axis;
  /** How many of the file's units make one metre. */
  unitsPerMetre: number;
  /** A solid has no triangles yet; a mesh arrives with them already chosen. */
  geometry: Geometry;
  /** How the file describes what a surface looks like. */
  appearance: Appearance;
  /** Triangles already in the file. Only meaningful for the mesh formats. */
  meshTriangles?: number;
}

/** USDZ is Y-up and metric. Everything else is measured against that. */
export const TARGET_UP: Axis = 'y';
export const TARGET_UNITS_PER_METRE = 1;

export const FORMATS: Record<Source, Format> = {
  // A solid model: surfaces defined analytically, in millimetres, Z up.
  step: { id: 'step', up: 'z', unitsPerMetre: 1000, geometry: 'brep', appearance: 'faceColour' },
  // glTF's binary form is specified as Y-up and metres, which is why it is the
  // one source that needs no transform at all.
  glb: { id: 'glb', up: 'y', unitsPerMetre: 1, geometry: 'mesh', appearance: 'pbr', meshTriangles: 14_820 },
  // FBX declares its own up axis in the header; exports out of the CAD tools
  // this pipeline receives are Z-up, and its default unit is the centimetre.
  fbx: { id: 'fbx', up: 'z', unitsPerMetre: 100, geometry: 'mesh', appearance: 'phong', meshTriangles: 21_460 },
};

export const SOURCES: Source[] = ['step', 'glb', 'fbx'];

// --- the part ---

/** How tall the part is, as drawn. A conversion that lands it at any other
 *  size did the unit arithmetic wrong. */
export const PART_HEIGHT_MM = 184;
/** Planar faces. Their triangle count does not move with the tolerance. */
export const FLAT_TRIANGLES = 1_240;
/** Bores, fillets and the cylindrical body — everything that has to be
 *  approximated by flats before a renderer can draw it. */
export const CURVED_FEATURES = 18;
/** Quad rows along each curved feature; two triangles to a quad. */
export const FEATURE_ROWS = 6;
/** The radius the segment count is figured on. */
export const MEAN_RADIUS_MM = 25;

/** Chord tolerances offered, in millimetres: how far the flats may sit from
 *  the true surface. */
export const TOLERANCES_MM = [1, 0.5, 0.1, 0.02] as const;
export type Tolerance = (typeof TOLERANCES_MM)[number];

/** The budget this pipeline was held to. A choice, not a platform limit. */
export const BUDGET_TRIANGLES = 12_000;
/** Below this many segments a bore reads as a polygon rather than a circle. */
export const FACETED_BELOW = 24;

// --- bytes ---

/** Vertices after welding, plus indices, in USD's binary crate encoding. */
export const BYTES_PER_TRIANGLE = 38;
/** Stage, prims, transforms and the zip container around them. */
export const CONTAINER_BYTES = 4_200;
/** One 1K base-colour, roughness and normal set, as the PBR sources carry. */
export const TEXTURE_BYTES = 210_000;

/**
 * How many flats it takes to hold a circle within a chord tolerance.
 *
 * A chord across an arc sits at its deepest `R(1 − cos(θ/2))` below the true
 * surface. Fixing that sagitta at the tolerance and solving for θ gives the
 * angle one flat may span, and the circle needs `2π/θ` of them. Halving the
 * tolerance therefore does not double the triangles — it multiplies them by
 * about √2, which is the whole reason a tolerance is worth tuning rather than
 * pinning at its finest.
 */
export function segments(toleranceMm: number, radiusMm = MEAN_RADIUS_MM): number {
  const ratio = Math.min(1, toleranceMm / radiusMm);
  const theta = 2 * Math.acos(1 - ratio);
  return Math.max(3, Math.ceil((2 * Math.PI) / theta));
}

/** Triangles a solid yields once tessellated at this tolerance. */
export function tessellate(toleranceMm: number): number {
  return FLAT_TRIANGLES + CURVED_FEATURES * FEATURE_ROWS * 2 * segments(toleranceMm);
}

export function usdzBytes(triangles: number, textured: boolean): number {
  return CONTAINER_BYTES + triangles * BYTES_PER_TRIANGLE + (textured ? TEXTURE_BYTES : 0);
}

// --- the conversion ---

export interface Options {
  /** Rotate the model into the target's up axis. */
  convertAxis: boolean;
  /** Rescale the model into the target's units. */
  convertUnits: boolean;
  toleranceMm: number;
}

export type Warning = 'axis' | 'units' | 'phong' | 'faceColour' | 'overBudget' | 'faceted';

export interface Conversion {
  source: Source;
  triangles: number;
  bytes: number;
  /** Degrees the part lands away from upright. Zero, or a quarter turn. */
  tiltDeg: number;
  /** How many times its real size the part lands at. */
  scale: number;
  /** How tall it ends up in the headset, in millimetres. */
  heightMm: number;
  /** What survived of the way the surfaces look. */
  material: 'pbr' | 'flat';
  /** Whether the tolerance was the author's choice or was already baked in. */
  retessellated: boolean;
  warnings: Warning[];
}

export function convert(source: Source, opts: Options): Conversion {
  const f = FORMATS[source];
  const warnings: Warning[] = [];

  // A file that is already in the target's convention needs no help; one that
  // is not, and is not corrected, lands on its side.
  const needsAxis = f.up !== TARGET_UP;
  const tiltDeg = needsAxis && !opts.convertAxis ? 90 : 0;
  if (tiltDeg !== 0) warnings.push('axis');

  // Skipping the unit conversion does not fail. It reads a number meant as a
  // millimetre as if it were a metre, and the part arrives the size of a
  // building — which is exactly why it is easy to ship by accident.
  const needsUnits = f.unitsPerMetre !== TARGET_UNITS_PER_METRE;
  const scale = needsUnits && !opts.convertUnits ? f.unitsPerMetre : 1;
  if (scale !== 1) warnings.push('units');

  const retessellated = f.geometry === 'brep';
  const triangles = retessellated ? tessellate(opts.toleranceMm) : f.meshTriangles!;
  if (triangles > BUDGET_TRIANGLES) warnings.push('overBudget');
  if (retessellated && segments(opts.toleranceMm) < FACETED_BELOW) warnings.push('faceted');

  // UsdPreviewSurface is a PBR shader. A source that speaks PBR maps onto it;
  // the other two do not, and no amount of care in the converter invents the
  // maps they never carried.
  const material = f.appearance === 'pbr' ? 'pbr' : 'flat';
  if (f.appearance === 'phong') warnings.push('phong');
  if (f.appearance === 'faceColour') warnings.push('faceColour');

  return {
    source,
    triangles,
    bytes: usdzBytes(triangles, material === 'pbr'),
    tiltDeg,
    scale,
    heightMm: PART_HEIGHT_MM * scale,
    material,
    retessellated,
    warnings,
  };
}

/** A conversion nobody has to apologise for: upright, life-sized, in budget. */
export function isClean(c: Conversion): boolean {
  return c.tiltDeg === 0 && c.scale === 1 && !c.warnings.includes('overBudget');
}
