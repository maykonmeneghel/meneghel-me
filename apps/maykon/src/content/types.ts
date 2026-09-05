export type Locale = 'en' | 'pt' | 'es';

export interface Chapter {
  /** Two-digit index shown in the rail, e.g. "01". */
  id: string;
  /** Single-word material name: SILICON, COPPER, STEEL... the stack read bottom-up. */
  codename: string;
  slug: string;
  title: string;
  lede: string;
  /** Label shown in the instrument panel's title bar. */
  panel: string;
  /** The one sentence a visitor should walk away knowing. */
  takeaway: string;
  /** Technologies credited under the panel. */
  stack: string[];
}

export interface RecordSection {
  eyebrow: string;
  title: string;
  lede: string;
  /** Lane headings on the timeline. */
  lanes: { education: string; research: string; industry: string; venture: string };
  /** careerItem id -> role title. */
  roles: Record<string, string>;
  scrubber: {
    /** Uses {n} and {year}. */
    simultaneous: string;
    one: string;
    none: string;
    today: string;
    drag: string;
  };
  ventures: {
    title: string;
    lede: string;
    founder: string;
    coFounder: string;
    sectors: Record<string, string>;
  };
  publications: { title: string; lede: string; items: Record<string, string> };
  press: { title: string; items: Record<string, string> };
}

export interface SignalGame {
  /** Names of the four topic levels, shown above the subscription box. */
  levels: [string, string, string, string];
  anatomyLede: string;
  legendPlus: string;
  legendHash: string;
  yourToken: string;
  noToken: string;
  subLabel: string;
  placeholder: string;
  broker: string;
  inbox: string;
  delivered: string;
  dropped: string;
  missionsTitle: string;
  missionsLede: string;
  /** Ordered; ids are matched against MISSIONS in components/games/mqtt.ts */
  missions: { id: string; goal: string }[];
  solved: string;
  invalidHash: string;
  invalidPlus: string;
  invalidEmpty: string;
  emptyInbox: string;
  allSolved: string;
}

export interface SwarmGame {
  lede: string;
  traffic: string;
  replicas: string;
  latency: string;
  dropped: string;
  cost: string;
  saturation: string;
  auto: string;
  autoHint: string;
  manualHint: string;
  ready: string;
  starting: string;
  reset: string;
  spike: string;
  /** Verdicts, shown as a running assessment. */
  healthy: string;
  strained: string;
  failing: string;
  wasteful: string;
}

export interface MindGame {
  lede: string;
  axisX: string;
  axisY: string;
  healthy: string;
  failing: string;
  adding: string;
  train: string;
  pause: string;
  clear: string;
  presetSeparable: string;
  presetXor: string;
  steps: string;
  accuracy: string;
  wrong: string;
  weights: string;
  hintPlace: string;
  hintConverged: string;
  hintStuck: string;
}

export interface ServiceGame {
  lede: string;
  table: string;
  indexes: string;
  query: string;
  run: string;
  running: string;
  rows: string;
  time: string;
  speedup: string;
  writes: string;
  queryLabels: Record<string, string>;
  /** Keyed by Plan['reason']. */
  hints: Record<string, string>;
  treeLabel: string;
  heapLabel: string;
}

export interface CopperGame {
  lede: string;
  viewLabel: string;
  layersLabel: string;
  view2d: string;
  view3d: string;
  viewSolid: string;
  flip: string;
  componentsWord: string;
  underneathWord: string;
  hintSolid: string;
  explode: string;
  spin: string;
  hintStack: string;
  both: string;
  topOnly: string;
  bottomOnly: string;
  netsLabel: string;
  allNets: string;
  segments: string;
  crossings: string;
  length: string;
  legendTop: string;
  legendBottom: string;
  legendVia: string;
  hintIdle: string;
  /** Uses {net} and {n}. */
  hintCrossings: string;
  hintFlat: string;
  hintOneLayer: string;
}

export interface SteelGame {
  lede: string;
  assembly: { name: string; kind: string; blurb: string; provenance: string; sourceLabel: string };
  partsTitle: string;
  partsLede: string;
  partsLabel: string;
  loading: string;
  spin: string;
  autoSpin: string;
  triangles: string;
  sourceTris: string;
  span: string;
  processTitle: string;
  processLede: string;
  processes: { label: string; count: number; note: string }[];
  drawings: string;
  hint: string;
  /** Keyed by the part id in public/models/agrom-parts.json. */
  parts: Record<string, { kind: string; blurb: string }>;
}

export interface SystemGame {
  lede: string;
  play: string;
  running: string;
  again: string;
  repair: string;
  total: string;
  verdictArrived: string;
  /** Uses {stage}. */
  verdictFailed: string;
  breakHint: string;
  silentBadge: string;
  goto: string;
  /** Keyed by StageId. */
  stages: Record<string, { name: string; does: string; payload: string; broken: string }>;
}

export interface GlassGame {
  lede: string;
  accent: string;
  density: string;
  radius: string;
  chart: string;
  compact: string;
  comfortable: string;
  on: string;
  off: string;
  /** Card contents shown inside the phone. */
  card: { sensor: string; status: string; label: string; updated: string };
  /** Uses {n}. */
  note: string;
  noteTitle: string;
}

export interface FlowGame {
  lede: string;
  period: string;
  buyLevel: string;
  sellLevel: string;
  run: string;
  inSample: string;
  outSample: string;
  trades: string;
  returnPct: string;
  winRate: string;
  nodes: { source: string; rsi: string; crossUp: string; crossDown: string; entry: string; exit: string };
  hintIn: string;
  hintOut: string;
  reveal: string;
}

export interface Content {
  meta: { title: string; description: string };
  nav: { chapters: string; family: string; contact: string; resume: string };
  hero: {
    kicker: string;
    name: string;
    headline: string;
    sub: string;
    cta: string;
    scrollHint: string;
    /** Terminal boot lines rendered one by one. */
    boot: string[];
  };
  chapters: Chapter[];
  record: RecordSection;
  signal: SignalGame;
  swarm: SwarmGame;
  mind: MindGame;
  service: ServiceGame;
  copper: CopperGame;
  steel: SteelGame;
  system: SystemGame;
  glass: GlassGame;
  flow: FlowGame;
  ui: Record<string, string>;
}
