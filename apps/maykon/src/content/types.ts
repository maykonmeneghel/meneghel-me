export type Locale = 'en' | 'pt' | 'es';

/** A divider that tells the reader which era the chapters under it belong to. */
export interface Act {
  /** The slug of the chapter this act opens on. */
  before: string;
  label: string;
  title: string;
  lede: string;
}

/** 'hardware' lives on its own page; the rest are the main narrative. */
export type Track = 'mobile' | 'platform' | 'ai' | 'hardware';

export interface Chapter {
  /** Which page and which act this chapter belongs to. The number shown in the
   *  rail is derived from the order within a track, not stored, so reordering a
   *  chapter never means renumbering the ones around it. */
  track: Track;
  /** Filled in at render time from the chapter's position. */
  id?: string;
  /** What this chapter is about and when it happened, e.g. "Tradx · 2022 → today".
   *  The page reads as a timeline whether or not it is one, so every chapter says. */
  era: string;
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
  publications: { title: string; lede: string; read: string; code: string; items: Record<string, string> };
  press: { title: string; items: Record<string, string> };
  /** The line the page ends on. */
  closing: { line: string; note: string };
  /** Where a convinced reader goes next. The page had nowhere at all before. */
  contact: { title: string; lede: string; linkedin: string; github: string; email: string; cv: string };
  /** Grouped skills. Named here, listed in career.ts. */
  skills: { title: string; lede: string; groups: Record<string, string> };
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

export interface ThreadStrategy {
  name: string;
  hint: string;
  swift: string;
  dart: string;
}

export interface ThreadGame {
  lede: string;
  pickLabel: string;
  device: string;
  frozen: string;
  frameTimes: string;
  budget: string;
  onBudget: string;
  dropped: string;
  worst: string;
  droppedFrames: string;
  jank: string;
  wasted: string;
  leave: string;
  cancelOn: string;
  cancelOff: string;
  strategies: { sync: ThreadStrategy; await: ThreadStrategy; offMain: ThreadStrategy };
}

export interface LedgerGame {
  lede: string;
  modeLabel: string;
  modeGross: string;
  modeNet: string;
  price: string;
  position: string;
  equityLabel: string;
  lockedLabel: string;
  availableLabel: string;
  flat: string;
  buy: string;
  sell: string;
  reset: string;
  replay: string;
  replayTitle: string;
  grossLabel: string;
  netLabel: string;
  hintStart: string;
  hintAccepted: string;
  hintFunds: string;
  hintReplay: string;
}

export interface MindGame {
  lede: string;
  paper: string;
  reading: string;
  question: string;
  slotA: string;
  slotB: string;
  pick: string;
  real: string;
  generated: string;
  criticSays: string;
  next: string;
  reset: string;
  rounds: string;
  you: string;
  network: string;
  fooled: string;
  lambdaLabel: string;
  lambdaHis: string;
  meterTruth: string;
  meterReal: string;
  arch: string;
  archGen: string;
  archDisc: string;
  archNote: string;
  hintStart: string;
  hintRight: string;
  hintWrong: string;
  hintLow: string;
  hintHigh: string;
  hintHis: string;
  verdict: string;
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
  zoom: string;
  reset: string;
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
  productLabel: string;
  explode: string;
  zoom: string;
  reset: string;
  loading: string;
  spin: string;
  autoSpin: string;
  pieces: string;
  span: string;
  provenance: string;
  processTitle: string;
  processLede: string;
  processes: { label: string; count: number; note: string }[];
  drawings: string;
  /** Keyed by product id. */
  products: Record<string, { name: string; kind: string; blurb: string }>;
}

export interface GlassGame {
  lede: string;
  dynamicType: string;
  width: string;
  conditions: string;
  longString: string;
  rtl: string;
  noImage: string;
  error: string;
  everything: string;
  reset: string;
  errorText: string;
  variants: { fixed: string; adaptive: string };
  failures: Record<string, string>;
  swift: string;
  dart: string;
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

export interface FieldGame {
  lede: string;
  mesh: string;
  splats: string;
  count: string;
  size: string;
  spin: string;
  primitives: string;
  authored: string;
  authoredMesh: string;
  authoredSplat: string;
  hintMesh: string;
  hintSplats: string;
  loading: string;
}

export interface Content {
  meta: { title: string; description: string };
  nav: { chapters: string; family: string; contact: string; resume: string };
  hero: {
    kicker: string;
    name: string;
    headline: string;
    sub: string;
    /** Hard credentials, shown as chips under the sub. */
    proof: string[];
    /** Where a recruiter clicks next. */
    links: { label: string; href: string }[];
    /** Label on the CV download, which replaced a link back to this same domain. */
    cv: string;
    cta: string;
    scrollHint: string;
    /** Terminal boot lines rendered one by one. */
    boot: string[];
  };
  /** Copy for the hardware page, which the main narrative links out to. */
  hardwarePage: {
    title: string; description: string; back: string; kicker: string;
    heading: string; lede: string; outro: string; backCta: string;
  };
  chapters: Chapter[];
  acts: Act[];
  record: RecordSection;
  signal: SignalGame;
  swarm: SwarmGame;
  mind: MindGame;
  ledger: LedgerGame;
  thread: ThreadGame;
  service: ServiceGame;
  copper: CopperGame;
  steel: SteelGame;
  glass: GlassGame;
  flow: FlowGame;
  field: FieldGame;
  ui: Record<string, string>;
}
