/**
 * The AGROM.IO products, rebuilt as geometry.
 *
 * `Projeto Mecânico/Por Produto` says what the products are; the bills of
 * material say what each is made of, in what quantity; and the dimensioned
 * drawings say how big the turned parts are. The SolidWorks assemblies
 * themselves cannot be read — they are not OLE compound files, so there is no
 * geometry inside them to recover — which means the shapes here come from the
 * drawings and the arrangement is matched to the 2017 renders.
 *
 * Anything printed rather than turned is substituted at runtime by its real
 * STL, placed by `at` and scaled from millimetres.
 */
import { box, cylinder, tube, place, merge, bounds, type Mesh } from './solid.ts';

export interface Vec3 { x: number; y: number; z: number }

export interface Piece {
  id: string;
  /** Geometry built here, from the drawings. */
  mesh?: Mesh;
  /** Or the id of a printed part, whose STL is dropped in at runtime. */
  stl?: string;
  at?: Vec3;
  colour: string;
  /** Direction and distance this piece travels in an exploded view, in mm. */
  explode: Vec3;
  fromDrawing: boolean;
}

/** Ø76.20 mm is 3 inches: the stock tube everything is cut from. (drawing) */
export const TUBE_D = 76.2;
export const CONE_LEN = 130;       // drawing: Cone
export const TUBE_LEN = 1000;      // drawing: Espaçador 1000, the mast tube
export const COUPLING_LEN = 60;    // drawing: Conexão Tubos
export const HEAD_LEN = 44;        // drawing: Suporte Cabeça
export const PANEL_W = 145;        // drawing: Suporte Painel Solar
export const PANEL_H = 85;         // drawing
/** Ø72 inside the Ø76.20 tube: a 2.1 mm wall. (drawing: Espaçador, Conexão) */
export const BORE_D = 72;
export const SEGMENTS = 56;
/** BOM Corpo: two of each, and they set the depths the soil sensors sit at. */
export const SPACERS = [80, 80, 100, 100, 120, 120];

const BLUE = '#2323a8';
const STEEL = '#b9bec7';
const PANEL = '#2b4fd0';
const DARK = '#2a2f38';
const WHITE = '#e6e8ec';
const ACRYLIC = '#8fa4b8';
const BOARD = '#0f5132';

const R = TUBE_D / 2;
const BORE = BORE_D / 2;
const up = (d: number): Vec3 => ({ x: 0, y: 0, z: d });
const out = (x: number, y: number, z = 0): Vec3 => ({ x, y, z });

/**
 * The mast: a cone that drives it in, the tube, four couplings and six spacers.
 * Exactly the BOM, stacked, with nothing invented between the drawn lengths.
 */
export function corpo(): Piece[] {
  const pieces: Piece[] = [];
  let z = 0;
  const step = (mesh: Mesh, id: string, colour: string, height: number) => {
    pieces.push({ id, mesh: place(mesh, 0, 0, z + height / 2), colour, explode: up(pieces.length * 95), fromDrawing: true });
    z += height;
  };

  step(cylinder(0, R, CONE_LEN, SEGMENTS), 'cone', BLUE, CONE_LEN);
  // Couplings and spacers alternate up the shaft; the spacers are what set the
  // depths the buried sensors end up at.
  for (let i = 0; i < SPACERS.length; i++) {
    // Couplings slip over the tube, so their bore is the tube's outside.
    if (i < 4) step(tube(R * 1.06, R, COUPLING_LEN, SEGMENTS), `coupling-${i}`, STEEL, COUPLING_LEN);
    step(tube(R, BORE, SPACERS[i], SEGMENTS), `spacer-${SPACERS[i]}-${i}`, BLUE, SPACERS[i]);
  }
  step(tube(R, BORE, TUBE_LEN, SEGMENTS), 'cano', BLUE, TUBE_LEN);
  return pieces;
}

export const corpoHeight = () => bounds(merge(corpo().map((p) => p.mesh!))).size[2];

/** The head: the machined collar, the printed spine and cap, acrylic and the board. */
function cabeca(variant: 'os' | 'ws'): Piece[] {
  const collar = place(tube(R * 1.05, BORE, HEAD_LEN, SEGMENTS), 0, 0, 0);
  const pieces: Piece[] = [
    { id: 'suporte-cabeca', mesh: collar, colour: STEEL, explode: up(0), fromDrawing: true },
    { id: 'pci', mesh: place(cylinder(35, 35, 1.6, SEGMENTS), 0, 0, 26), colour: BOARD, explode: up(58), fromDrawing: true },
    { id: 'barra', stl: 'barra-central', at: { x: 0, y: 0, z: 40 }, colour: WHITE, explode: up(96), fromDrawing: false },
    { id: 'acrilico', mesh: place(cylinder(34, 34, 3, SEGMENTS), 0, 0, 62), colour: ACRYLIC, explode: up(134), fromDrawing: true },
    { id: 'tampa', stl: variant === 'os' ? 'tampa-os' : 'tampa-ws', at: { x: 0, y: 0, z: 86 }, colour: WHITE, explode: up(176), fromDrawing: false },
  ];
  if (variant === 'os') {
    // BOM OS: two photovoltaic cells on the cap.
    pieces.push(
      { id: 'celula-1', mesh: place(box(30, 3, 22), -16, 0, 96), colour: PANEL, explode: out(-70, 0, 200), fromDrawing: false },
      { id: 'celula-2', mesh: place(box(30, 3, 22), 16, 0, 96), colour: PANEL, explode: out(70, 0, 200), fromDrawing: false },
    );
  } else {
    // BOM WS: a UV sensor and a TIL-78 phototransistor instead.
    pieces.push(
      { id: 'sensor-uv', mesh: place(cylinder(7, 7, 9, 24), -14, 0, 96), colour: DARK, explode: out(-70, 0, 200), fromDrawing: false },
      { id: 'til-78', mesh: place(cylinder(3, 3, 7, 20), 14, 0, 96), colour: DARK, explode: out(70, 0, 200), fromDrawing: false },
    );
  }
  return pieces;
}

export const cabecaOS = () => cabeca('os');
export const cabecaWS = () => cabeca('ws');

/** The buried soil sensor: a ribbed machined body between two acrylic caps. */
export function thd(): Piece[] {
  const RIBS = 7;
  const pieces: Piece[] = [];
  for (let i = 0; i < RIBS; i++) {
    const z = -30 + i * 9;
    pieces.push({
      id: `rib-${i}`,
      mesh: place(tube(i === 3 ? 31 : 30, 11, 7, SEGMENTS), 0, 0, z),
      colour: i === 3 ? BLUE : DARK,   // the blue band in the middle
      explode: up((i - 3) * 26),
      fromDrawing: true,
    });
  }
  pieces.push(
    { id: 'tampa-acrilico-topo', mesh: place(cylinder(30, 30, 3, SEGMENTS), 0, 0, 36), colour: ACRYLIC, explode: up(130), fromDrawing: true },
    { id: 'tampa-acrilico-base', mesh: place(cylinder(30, 30, 3, SEGMENTS), 0, 0, -38), colour: ACRYLIC, explode: up(-130), fromDrawing: true },
    { id: 'conector-m12', mesh: place(tube(6, 3.2, 18, 28), 14, 0, 48), colour: STEEL, explode: up(190), fromDrawing: false },
  );
  return pieces;
}

/** The gas bank: printed mount and cap, three MQ sensors and a barometer. */
export function gas(): Piece[] {
  const mq = (x: number, id: string) => ({
    id, mesh: place(tube(9, 6.5, 14, 28), x, 0, 6), colour: STEEL,
    explode: up(-70), fromDrawing: false,
  });
  return [
    { id: 'suporte-gas', stl: 'suporte-gas', at: { x: 0, y: 0, z: 0 }, colour: WHITE, explode: up(0), fromDrawing: false },
    mq(-26, 'mq-2'), mq(0, 'mq-7'), mq(26, 'mq-8'),
    { id: 'bmp180', mesh: place(box(14, 10, 3), 0, 26, 6), colour: BOARD, explode: out(0, 60, -70), fromDrawing: false },
    { id: 'tampa-gas', stl: 'tampa-gas', at: { x: 0, y: 0, z: 34 }, colour: WHITE, explode: up(110), fromDrawing: false },
  ];
}

/** The battery cradle, printed, with its lid. */
export function bateria(): Piece[] {
  return [
    { id: 'suporte-bateria', stl: 'suporte-bateria', at: { x: 0, y: 0, z: 0 }, colour: WHITE, explode: up(0), fromDrawing: false },
    { id: 'bateria', mesh: place(box(96, 52, 68), 0, 0, 6), colour: DARK, explode: up(80), fromDrawing: false },
    { id: 'tampa-suporte', stl: 'tampa-suporte-bateria', at: { x: 0, y: 0, z: 62 }, colour: WHITE, explode: up(170), fromDrawing: false },
  ];
}

/** BOM Painel Solar: two panels on two machined brackets. */
export function painel(): Piece[] {
  return [
    { id: 'suporte-1', mesh: place(box(26, 10, 46), -70, 0, -26), colour: STEEL, explode: out(-90, 0, -40), fromDrawing: true },
    { id: 'painel-1', mesh: place(box(PANEL_W, 6, PANEL_H), -70, 0, 6), colour: PANEL, explode: out(-90, 0, 60), fromDrawing: true },
    { id: 'suporte-2', mesh: place(box(26, 10, 46), 70, 0, -26), colour: STEEL, explode: out(90, 0, -40), fromDrawing: true },
    { id: 'painel-2', mesh: place(box(PANEL_W, 6, PANEL_H), 70, 0, 6), colour: PANEL, explode: out(90, 0, 60), fromDrawing: true },
  ];
}

/** The whole station: the products above, put where the render puts them. */
export function station(): Piece[] {
  const shift = (pieces: Piece[], x: number, y: number, z: number, spread = 1, away: Vec3 = up(0)): Piece[] =>
    pieces.map((p) => ({
      ...p,
      mesh: p.mesh ? place(p.mesh, x, y, z) : undefined,
      at: p.at ? { x: p.at.x + x, y: p.at.y + y, z: p.at.z + z } : undefined,
      explode: {
        x: p.explode.x * spread + away.x,
        y: p.explode.y * spread + away.y,
        z: p.explode.z * spread + away.z,
      },
    }));

  const mastTop = corpoHeight() - CONE_LEN;
  const armZ = mastTop - 130;

  return [
    // Sub-assemblies keep their own explosion and travel outward as a group,
    // so the station comes apart into products rather than into a haze.
    ...shift(corpo(), 0, 0, -CONE_LEN, 1),
    ...shift(cabecaWS(), 0, 0, mastTop, 1, up(900)),
    { id: 'arm', mesh: place(tube(8, 6, 700, 28), 0, 0, armZ, 'x'), colour: STEEL, explode: up(560), fromDrawing: false },
    ...shift(painel(), -235, 0, armZ + 10, 1, out(-500, 0, 320)),
    ...shift(gas(), 215, 0, armZ + 6, 1, out(500, 0, 320)),
    ...shift(bateria(), 0, 66, armZ - 200, 1, out(0, 460, 0)),
  ];
}

export type ProductId = 'station' | 'corpo' | 'cabeca-os' | 'cabeca-ws' | 'thd' | 'gas' | 'bateria' | 'painel';

export const PRODUCTS: { id: ProductId; build: () => Piece[]; bom?: string }[] = [
  { id: 'station', build: station },
  { id: 'corpo', build: corpo, bom: 'corpo' },
  { id: 'cabeca-os', build: cabecaOS, bom: 'cabeca-os' },
  { id: 'cabeca-ws', build: cabecaWS, bom: 'cabeca-ws' },
  { id: 'thd', build: thd, bom: 'thd' },
  { id: 'gas', build: gas, bom: 'gas' },
  { id: 'bateria', build: bateria, bom: 'air' },
  { id: 'painel', build: painel, bom: 'painel' },
];

export const buildProduct = (id: ProductId) => PRODUCTS.find((p) => p.id === id)!.build();
