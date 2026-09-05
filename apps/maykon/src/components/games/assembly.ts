/**
 * The AGROM.IO assemblies, rebuilt as geometry.
 *
 * `Projeto Mecânico/Por Projeto` holds one folder per assembly, and the part
 * files inside each are its parts list — so the pieces below carry the names
 * SolidWorks gave them, not names I chose. The shapes come from the dimensioned
 * drawings, the printed parts are their real STLs, and the arrangement is
 * matched to the 2017 renders, because the .SLDASM files themselves cannot be
 * read: they are not OLE compound files, so there is no geometry inside them.
 */
import { box, cylinder, tube, place, merge, bounds, type Mesh } from './solid.ts';

export interface Vec3 { x: number; y: number; z: number }

/** How a part came to exist, which the panel shows beside its name. */
export type Source = 'drawing' | 'printed' | 'laser' | 'bought' | 'board';

export interface Piece {
  /** The part file's own name. */
  id: string;
  source: Source;
  mesh?: Mesh;
  /** Or the id of a printed part, whose STL is dropped in at runtime. */
  stl?: string;
  at?: Vec3;
  colour: string;
  /** Where this piece travels in an exploded view, in mm. */
  explode: Vec3;
}

/** Ø76.20 mm is 3 inches: the stock tube everything is cut from. (drawing) */
export const TUBE_D = 76.2;
export const BORE_D = 72;          // drawing: Espaçador, Conexão Tubos
export const CONE_LEN = 130;       // drawing: Cone
export const TUBE_LEN = 1000;      // drawing: Espaçador 1000
export const COUPLING_LEN = 60;    // drawing: Conexão Tubos
export const HASTE_LEN = 775;      // drawing: Haste
export const HEAD_LEN = 44;        // drawing: Suporte Cabeça
export const PANEL_W = 145;        // drawing: Suporte Painel Solar
export const PANEL_H = 85;         // drawing
export const SEGMENTS = 56;

const R = TUBE_D / 2;
const BORE = BORE_D / 2;

const BLUE = '#2323a8';
const STEEL = '#b9bec7';
const PANEL = '#2b4fd0';
const DARK = '#2a2f38';
const PRINTED = '#e6e8ec';
const ACRYLIC = '#8fa4b8';
const BOARD = '#0f5132';
const COPPER = '#c8892f';

const up = (d: number): Vec3 => ({ x: 0, y: 0, z: d });
const out = (x: number, y: number, z = 0): Vec3 => ({ x, y, z });

/** Corpo: the mast. Six part files, and the BOM says how many of each. */
export function corpo(): Piece[] {
  const pieces: Piece[] = [];
  let z = 0;
  let n = 0;
  const step = (id: string, mesh: Mesh, colour: string, height: number, source: Source = 'drawing') => {
    pieces.push({ id, source, mesh: place(mesh, 0, 0, z + height / 2), colour, explode: up(n++ * 95) });
    z += height;
  };

  step('Cone', cylinder(0, R, CONE_LEN, SEGMENTS), BLUE, CONE_LEN);
  // BOM Corpo: four couplings, and two each of the 80, 100 and 120 spacers.
  const spacers = [80, 80, 100, 100, 120, 120];
  for (let i = 0; i < spacers.length; i++) {
    if (i < 4) step(`Conexão Tubos ${i + 1}`, tube(R * 1.06, R, COUPLING_LEN, SEGMENTS), STEEL, COUPLING_LEN);
    step(`Espaçador ${spacers[i]}`, tube(R, BORE, spacers[i], SEGMENTS), BLUE, spacers[i]);
  }
  step('Espaçador 1000', tube(R, BORE, TUBE_LEN, SEGMENTS), BLUE, TUBE_LEN);
  return pieces;
}

export const corpoHeight = () => bounds(merge(corpo().map((p) => p.mesh!))).size[2];

/** Cabeça 1 — Only Soil. Six files, one of them the assembly itself. */
export function cabecaOS(): Piece[] {
  return [
    { id: 'Suporte Cabeça OS', source: 'drawing', mesh: place(tube(R * 1.05, BORE, HEAD_LEN, SEGMENTS), 0, 0, 0), colour: STEEL, explode: up(0) },
    { id: 'Barra Central_ABS', source: 'printed', stl: 'barra-central', at: { x: 0, y: 0, z: 40 }, colour: PRINTED, explode: up(96) },
    { id: 'Acrílico', source: 'laser', mesh: place(cylinder(34, 34, 3, SEGMENTS), 0, 0, 62), colour: ACRYLIC, explode: up(150) },
    { id: 'Tampa_ABS', source: 'printed', stl: 'tampa-os', at: { x: 0, y: 0, z: 86 }, colour: PRINTED, explode: up(210) },
    { id: 'Célula Fotovoltáica 1', source: 'bought', mesh: place(box(30, 3, 22), -16, 0, 96), colour: PANEL, explode: out(-90, 0, 260) },
    { id: 'Célula Fotovoltáica 2', source: 'bought', mesh: place(box(30, 3, 22), 16, 0, 96), colour: PANEL, explode: out(90, 0, 260) },
  ];
}

/** Cabeça 2 — Weather Station. The same head, with the UV sensor and TIL-78. */
export function cabecaWS(): Piece[] {
  return [
    { id: 'Suporte Cabeça WS', source: 'drawing', mesh: place(tube(R * 1.05, BORE, HEAD_LEN, SEGMENTS), 0, 0, 0), colour: STEEL, explode: up(0) },
    { id: 'Barra Central_ABS_WS', source: 'printed', stl: 'barra-central', at: { x: 0, y: 0, z: 40 }, colour: PRINTED, explode: up(96) },
    { id: 'Acrílico_WS', source: 'laser', mesh: place(cylinder(34, 34, 3, SEGMENTS), 0, 0, 62), colour: ACRYLIC, explode: up(150) },
    { id: 'Tampa_ABS_WS', source: 'printed', stl: 'tampa-ws', at: { x: 0, y: 0, z: 86 }, colour: PRINTED, explode: up(210) },
    { id: 'Sensor UV', source: 'bought', mesh: place(cylinder(7, 7, 9, 24), -14, 0, 98), colour: DARK, explode: out(-90, 0, 260) },
    { id: 'TIL-78', source: 'bought', mesh: place(cylinder(3, 3, 7, 20), 14, 0, 98), colour: DARK, explode: out(90, 0, 260) },
  ];
}

/** Painel Solar: two files, two of each. */
export function painel(): Piece[] {
  return [
    { id: 'Suporte Painel Solar 1', source: 'drawing', mesh: place(box(26, 10, 46), -70, 0, -26), colour: STEEL, explode: out(-110, 0, -60) },
    { id: 'Painel Solar 1', source: 'bought', mesh: place(box(PANEL_W, 6, PANEL_H), -70, 0, 6), colour: PANEL, explode: out(-110, 0, 80) },
    { id: 'Suporte Painel Solar 2', source: 'drawing', mesh: place(box(26, 10, 46), 70, 0, -26), colour: STEEL, explode: out(110, 0, -60) },
    { id: 'Painel Solar 2', source: 'bought', mesh: place(box(PANEL_W, 6, PANEL_H), 70, 0, 6), colour: PANEL, explode: out(110, 0, 80) },
  ];
}

/**
 * PCB. This folder holds the IDF pair EAGLE exported to the mechanical CAD —
 * the same files chapter 02 builds its assembled board from — so the laminate
 * and the two populated faces are the parts worth pulling apart here.
 */
export function pcb(): Piece[] {
  const laminate = cylinder(35, 35, 1.6, SEGMENTS);
  const side = (z: number) => merge([
    place(box(18, 12, 3), -14, 8, z), place(box(10, 8, 3), 10, -6, z),
    place(box(14, 14, 3), 4, 14, z), place(cylinder(4, 4, 6, 20), -20, -12, z),
    place(box(24, 10, 3), 16, 12, z),
  ]);
  return [
    { id: 'PCB', source: 'board', mesh: laminate, colour: BOARD, explode: up(0) },
    { id: 'Componentes · face superior', source: 'board', mesh: side(3.5), colour: COPPER, explode: up(70) },
    { id: 'Componentes · face inferior', source: 'board', mesh: side(-3.5), colour: STEEL, explode: up(-70) },
  ];
}

/** Sensor 0 — AIR: the surface unit, on its own rod. */
export function air(): Piece[] {
  return [
    { id: 'Haste', source: 'drawing', mesh: place(tube(12, 9, HASTE_LEN, 32), 0, 0, -HASTE_LEN / 2), colour: BLUE, explode: up(-260) },
    { id: 'Suporte Sperficie', source: 'drawing', mesh: place(tube(26, 12, 30, SEGMENTS), 0, 0, 20), colour: STEEL, explode: up(0) },
    { id: 'Suporte Bateria_ABS', source: 'printed', stl: 'suporte-bateria', at: { x: 0, y: 0, z: 70 }, colour: PRINTED, explode: up(150) },
    { id: 'Tampa Suporte Bateria_ABS', source: 'printed', stl: 'tampa-suporte-bateria', at: { x: 0, y: 0, z: 132 }, colour: PRINTED, explode: up(320) },
  ];
}

/** Sensor 1 — THD: the buried soil sensor, potted in epoxy. */
export function thd(): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < 5; i++) {
    const z = -18 + i * 9;
    pieces.push({
      id: i === 2 ? 'Suporte Sensor_1' : `Suporte Sensor_1 · anel ${i + 1}`,
      source: 'drawing',
      mesh: place(tube(i === 2 ? 31 : 30, 11, 7, SEGMENTS), 0, 0, z),
      colour: i === 2 ? BLUE : DARK,
      explode: up((i - 2) * 30),
    });
  }
  pieces.push(
    { id: 'Tampa Acrílico_1', source: 'laser', mesh: place(cylinder(30, 30, 3, SEGMENTS), 0, 0, 26), colour: ACRYLIC, explode: up(170) },
    { id: 'Sensor SHT_1', source: 'bought', mesh: place(box(14, 10, 4), 0, 0, -30), colour: BOARD, explode: up(-170) },
    { id: 'Conector M12_1', source: 'bought', mesh: place(tube(6, 3.2, 18, 28), 14, 0, 40), colour: STEEL, explode: out(60, 0, 240) },
    { id: 'Cabo 4 vias', source: 'bought', mesh: place(tube(3, 1.6, 90, 20), 14, 0, 92, 'z'), colour: DARK, explode: out(60, 0, 340) },
  );
  return pieces;
}

/** Sensor 5 — GAS STATION: three MQ sensors and a barometer under a cap. */
export function gas(): Piece[] {
  const mq = (x: number, id: string): Piece => ({
    id, source: 'bought',
    mesh: place(tube(9, 6.5, 14, 28), x, 0, 6), colour: STEEL, explode: up(-90),
  });
  return [
    { id: 'Suporte_ABS_5', source: 'printed', stl: 'suporte-gas', at: { x: 0, y: 0, z: 0 }, colour: PRINTED, explode: up(0) },
    mq(-26, 'MQ-2 Gas Sensor'), mq(0, 'MQ-7 Gas Sensor'), mq(26, 'MQ-8 Gas Sensor'),
    { id: 'BMP180', source: 'bought', mesh: place(box(14, 10, 3), 0, 26, 6), colour: BOARD, explode: out(0, 80, -90) },
    { id: 'Tampa_ABS_5', source: 'printed', stl: 'tampa-gas', at: { x: 0, y: 0, z: 34 }, colour: PRINTED, explode: up(150) },
  ];
}

/** Estação Meteorológica Full: the assemblies above, where the render puts them. */
export function station(): Piece[] {
  const shift = (pieces: Piece[], x: number, y: number, z: number, away: Vec3 = up(0)): Piece[] =>
    pieces.map((p) => ({
      ...p,
      mesh: p.mesh ? place(p.mesh, x, y, z) : undefined,
      at: p.at ? { x: p.at.x + x, y: p.at.y + y, z: p.at.z + z } : undefined,
      explode: { x: p.explode.x + away.x, y: p.explode.y + away.y, z: p.explode.z + away.z },
    }));

  const mastTop = corpoHeight() - CONE_LEN;
  const armZ = mastTop - 130;

  return [
    ...shift(corpo(), 0, 0, -CONE_LEN),
    ...shift(cabecaWS(), 0, 0, mastTop, up(900)),
    { id: 'Braço', source: 'drawing', mesh: place(tube(8, 6, 700, 28), 0, 0, armZ, 'x'), colour: STEEL, explode: up(560) },
    ...shift(painel(), -235, 0, armZ + 10, out(-520, 0, 340)),
    ...shift(gas(), 215, 0, armZ + 6, out(520, 0, 340)),
    ...shift(pcb(), 0, 0, mastTop + 26, up(1320)),
  ];
}

export type AssemblyId =
  | 'station' | 'cabeca-os' | 'cabeca-ws' | 'corpo'
  | 'painel' | 'pcb' | 'air' | 'thd' | 'gas';

/** In the order the folders sit in Por Projeto, with the full station first. */
export const ASSEMBLIES: { id: AssemblyId; build: () => Piece[]; bom?: string }[] = [
  { id: 'station', build: station },
  { id: 'cabeca-os', build: cabecaOS, bom: 'cabeca-os' },
  { id: 'cabeca-ws', build: cabecaWS, bom: 'cabeca-ws' },
  { id: 'corpo', build: corpo, bom: 'corpo' },
  { id: 'painel', build: painel, bom: 'painel' },
  { id: 'pcb', build: pcb },
  { id: 'air', build: air, bom: 'air' },
  { id: 'thd', build: thd, bom: 'thd' },
  { id: 'gas', build: gas, bom: 'gas' },
];

export const buildAssembly = (id: AssemblyId) => ASSEMBLIES.find((a) => a.id === id)!.build();
