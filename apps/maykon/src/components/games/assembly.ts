/**
 * The AGROM.IO weather station, rebuilt as one 3D model.
 *
 * Dimensions marked "drawing" come from the dimensioned PDFs SolidWorks
 * produced for the machine shop, so those parts are the real ones. What is not
 * from a drawing is the arrangement: the SolidWorks assembly file cannot be
 * read — it is not an OLE compound file, so there is no geometry inside it to
 * recover — and the positions below are matched to the 2017 render instead.
 * They are right to a few millimetres, not to the constraint.
 */
import { box, cylinder, place, merge, type Mesh } from './solid.ts';

/** Ø76.20 mm is 3 inches: the stock tube the mast is cut from. (drawing) */
export const TUBE_D = 76.2;
export const CONE_LEN = 130;      // drawing
export const HASTE_LEN = 775;     // drawing
export const SPACER_LEN = 1000;   // drawing: "Espaçador 1000"
export const COUPLING_LEN = 60;   // drawing: "Conexão Tubos"
export const HEAD_LEN = 44;       // drawing: "Suporte Cabeça"
export const PANEL_W = 145;       // drawing: "Suporte Painel Solar"
export const PANEL_H = 85;        // drawing
export const ARM_LEN = 700;       // matched to the render
export const ARM_D = 16;          // matched to the render

export interface Piece {
  id: string;
  mesh: Mesh;
  colour: string;
  /** True when the shape comes from a dimensioned drawing rather than the render. */
  fromDrawing: boolean;
}

const BLUE = '#2323a8';
const STEEL = '#b9bec7';
const PANEL = '#2b4fd0';
const DARK = '#2a2f38';

/**
 * Built bottom-up along z, with z = 0 at ground level so the buried part of the
 * mast sits below zero exactly as it does in the field.
 */
export function station(): Piece[] {
  const r = TUBE_D / 2;
  let z = -CONE_LEN;                       // the tip is underground

  const cone = place(cylinder(0, r, CONE_LEN, 28), 0, 0, z + CONE_LEN / 2);
  z += CONE_LEN;

  const haste = place(cylinder(r, r, HASTE_LEN, 28), 0, 0, z + HASTE_LEN / 2);
  z += HASTE_LEN;

  const coupling = place(cylinder(r * 1.06, r * 1.06, COUPLING_LEN, 28), 0, 0, z + COUPLING_LEN / 2);
  z += COUPLING_LEN;

  const spacer = place(cylinder(r, r, SPACER_LEN, 28), 0, 0, z + SPACER_LEN / 2);
  z += SPACER_LEN;

  const head = place(cylinder(r * 1.05, r * 1.05, HEAD_LEN, 28), 0, 0, z + HEAD_LEN / 2);
  const topZ = z + HEAD_LEN;

  // The cross-arm sits just under the head and carries the panel and sensors.
  const armZ = z - 120;
  const arm = place(cylinder(ARM_D / 2, ARM_D / 2, ARM_LEN, 16), 0, 0, armZ, 'x');

  const panel = place(box(PANEL_W, 6, PANEL_H), -235, 0, armZ + 10);
  const sensorPlate = place(box(150, 8, 90), 215, 0, armZ + 26);
  const sensorBank = place(box(96, 34, 40), 200, 0, armZ - 6);

  // The electronics box hangs on the mast below the arm.
  const enclosure = place(box(110, 96, 128), 0, 62, armZ - 190);

  return [
    { id: 'cone', mesh: cone, colour: BLUE, fromDrawing: true },
    { id: 'haste', mesh: haste, colour: BLUE, fromDrawing: true },
    { id: 'coupling', mesh: coupling, colour: BLUE, fromDrawing: true },
    { id: 'spacer', mesh: spacer, colour: BLUE, fromDrawing: true },
    { id: 'head', mesh: head, colour: STEEL, fromDrawing: true },
    { id: 'arm', mesh: arm, colour: STEEL, fromDrawing: false },
    { id: 'panel', mesh: panel, colour: PANEL, fromDrawing: true },
    { id: 'sensorPlate', mesh: sensorPlate, colour: DARK, fromDrawing: false },
    { id: 'sensorBank', mesh: sensorBank, colour: STEEL, fromDrawing: false },
    { id: 'enclosure', mesh: enclosure, colour: '#e6e8ec', fromDrawing: false },
    { id: 'cap', mesh: place(cylinder(r * 1.05, r * 0.9, 26, 28), 0, 0, topZ + 13), colour: '#f0f2f5', fromDrawing: false },
  ];
}

/** Overall height of the station, ground-to-cap, in millimetres. */
export function stationHeight(): number {
  const all = merge(station().map((p) => p.mesh));
  let lo = Infinity, hi = -Infinity;
  for (let i = 2; i < all.v.length; i += 3) {
    lo = Math.min(lo, all.v[i]);
    hi = Math.max(hi, all.v[i]);
  }
  return hi - lo;
}
