/**
 * Career data, verified against Profile.pdf (LinkedIn export, Sep 2026) and
 * Portfolio-2024.pdf. Dates are locale-independent and live here once; the
 * human-readable labels are translated per locale under `content[locale].record`.
 *
 * `end: null` means still running.
 */

export type Lane = 'education' | 'research' | 'industry' | 'venture';

export interface CareerItem {
  id: string;
  lane: Lane;
  org: string;
  /** [year, month] — month is 1-12, inclusive. */
  start: [number, number];
  end: [number, number] | null;
  /** Rendered as a highlight; used for the roles that are the headline ones. */
  emphasis?: boolean;
}

export const TIMELINE_START = 2012;
export const TIMELINE_END = 2027;

export const careerItems: CareerItem[] = [
  // Education
  { id: 'grad',        lane: 'education', org: 'PUC-PR',                 start: [2012, 1],  end: [2016, 12] },
  { id: 'msc',         lane: 'education', org: 'PUC-PR',                 start: [2017, 4],  end: [2019, 4], emphasis: true },
  { id: 'academy',     lane: 'education', org: 'Apple Developer Academy', start: [2019, 2],  end: [2020, 12], emphasis: true },
  { id: 'aiSpec',      lane: 'education', org: 'PUC-PR',                 start: [2019, 4],  end: [2021, 4], emphasis: true },

  // Research
  { id: 'pucLab',      lane: 'research',  org: 'PUC-PR · LAS',           start: [2016, 10], end: [2016, 12] },
  { id: 'araucaria',   lane: 'research',  org: 'Fundação Araucária',     start: [2017, 4],  end: [2019, 3] },

  // Industry
  { id: 'freelance',   lane: 'industry',  org: 'Self-employed',          start: [2018, 1],  end: [2022, 3] },
  { id: 'residency',   lane: 'industry',  org: 'Eldorado · Apple',       start: [2022, 4],  end: [2022, 9] },
  { id: 'junior',      lane: 'industry',  org: 'Eldorado · Apple',       start: [2022, 10], end: [2024, 3] },
  { id: 'techLead',    lane: 'industry',  org: 'Eldorado · Apple',       start: [2023, 2],  end: [2023, 4] },
  { id: 'fullstack',   lane: 'industry',  org: 'Eldorado · Apple',       start: [2024, 4],  end: null, emphasis: true },
  { id: 'ghel',        lane: 'industry',  org: 'GHEL',                   start: [2025, 6],  end: null },

  // Ventures
  { id: 'holding',     lane: 'venture',   org: 'RJ Meneghel Holding',    start: [2021, 11], end: [2023, 12] },
  { id: 'tradx',       lane: 'venture',   org: 'Tradx',                  start: [2022, 7],  end: null, emphasis: true },
];

/** Startups founded or co-founded, from Portfolio-2024. No public dates. */
export const ventures = [
  { name: 'Tradx',       sector: 'fintech',    role: 'coFounder' },
  { name: 'Agrom.IO',    sector: 'agritech',   role: 'founder' },
  { name: 'Dommuz',      sector: 'smartHome',  role: 'coFounder' },
  { name: 'Psiu',        sector: 'proptech',   role: 'coFounder' },
  { name: 'Hubli',       sector: 'edtech',     role: 'coFounder' },
  { name: 'PreditChart', sector: 'fintech',    role: 'coFounder' },
];

export interface Publication {
  id: string;
  year: number;
  venue: string;
  doi?: string;
}

export const publications: Publication[] = [
  { id: 'soilInstrument', year: 2016, venue: 'Control & Automation Engineering, PUC-PR' },
  { id: 'fesTool',        year: 2019, venue: '41st Annual International Conference of the IEEE EMBS' },
  { id: 'fallDetector',   year: 2019, venue: 'Advanced Materials Proceedings, 4(1), 40–45', doi: '10.5185/amp.2019.1450' },
  { id: 'inSilicoFes',    year: 2019, venue: "Master's dissertation, PUC-PR" },
  { id: 'balanceModel',   year: 2019, venue: 'System identification / bioengineering' },
  { id: 'stockGan',       year: 2020, venue: 'Applied AI specialization, PUC-PR' },
];

export const press = [
  { id: 'hubli',    outlet: 'Apple Newsroom', year: 2020 },
  { id: 'neonWave', outlet: 'MacMagazine',    year: 2020 },
];

/** Convert [year, month] to a decimal year for positioning. */
export const toDecimal = ([y, m]: [number, number]) => y + (m - 1) / 12;
export const NOW: [number, number] = [2026, 9];
