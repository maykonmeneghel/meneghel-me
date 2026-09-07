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
  { id: 'fullstack',   lane: 'industry',  org: 'Eldorado · Apple',       start: [2024, 4],  end: [2026, 5] },
  { id: 'senior',      lane: 'industry',  org: 'Eldorado · Apple',       start: [2026, 6],  end: null, emphasis: true },
  { id: 'ghel',        lane: 'industry',  org: 'GHEL',                   start: [2025, 6],  end: null, emphasis: true },

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
  /** Where the paper itself is. Verified by opening it, not by guessing a URL. */
  url?: string;
  /** A repository that holds the thing the paper is about. */
  code?: string;
  /**
   * Whether this went through peer review. Three of the six did; the other
   * three are academic work — an undergraduate project, a dissertation and a
   * specialization project — which is not the same claim and should not be
   * counted as if it were.
   */
  peerReviewed: boolean;
}

export const publications: Publication[] = [
  { id: 'soilInstrument', year: 2016, venue: 'Control & Automation Engineering, PUC-PR', peerReviewed: false },
  { id: 'fesTool',        year: 2019, venue: '41st Annual International Conference of the IEEE EMBS', peerReviewed: true,
    doi: '10.1109/EMBC.2019.8857421',
    // IEEE Xplore answers HTTP 420 and never renders the page. PubMed indexes
    // the same paper, opens for everyone, and carries the DOI.
    url: 'https://pubmed.ncbi.nlm.nih.gov/31946701/',
    code: 'https://github.com/maykonmeneghel/EENM-Simulation-System' },
  { id: 'fallDetector',   year: 2019, venue: 'Advanced Materials Proceedings, 4(1), 40–45', peerReviewed: true, doi: '10.5185/amp.2019.1450',
    url: 'https://amp.iaamonline.org/article_16020.html',
    code: 'https://github.com/maykonmeneghel/PoC-Buckle-Device-ESP32' },
  // The cover states the PPGTS programme; the degree it was submitted for is
  // "Mestre em Bioengenharia", which is what the profile claims elsewhere.
  { id: 'inSilicoFes',    year: 2019, venue: "M.Sc. dissertation in Bioengineering, PUC-PR", peerReviewed: false,
    url: 'https://archivum.grupomarista.org.br/pergamumweb/vinculos/000093/00009335.pdf',
    code: 'https://github.com/maykonmeneghel/EENM-Simulation-System' },
  // The proceedings page states 19/01/2018 and ISBN 978-85-5722-065-2; the
  // year here had been 2019 and the venue was a topic rather than a venue.
  { id: 'balanceModel',   year: 2018, venue: 'V Congresso Brasileiro de Eletromiografia e Cinesiologia · X Simpósio de Engenharia Biomédica', peerReviewed: true,
    url: 'https://www.even3.com.br/anais/cobecseb/78906/' },
  { id: 'stockGan',       year: 2020, venue: 'Applied AI specialization, PUC-PR', peerReviewed: false },
];

export interface PressItem {
  id: string;
  outlet: string;
  year: number;
  /** The article itself. Verified by opening it and finding the claim inside. */
  url: string;
  /** The outlet's own headline, exactly as published. */
  headline: string;
}

/**
 * Both items are linked now, and both were checked by reading the article
 * rather than by trusting the portfolio they came from.
 *
 * The Apple piece had been looked for in the wrong place: an earlier pass
 * checked a Developer Academy story, found three apps and no Hubli, and
 * concluded the claim was unverifiable. The right article is the February 2021
 * Entrepreneur Camp announcement, which names the app and names him inside it —
 * "created by five Apple Developer Academy students in Brazil: Ailton Vieira,
 * Gabriel Taques, Maykon Meneghel, Mariana Lech, and Rodolfo Diniz". It is
 * dated 16 February 2021, not 2020.
 *
 * MacMagazine covers NeonWave — "um jogo de música inspirado na trilha sonora
 * dos filmes, videogames e desenhos animados dos anos 1980", by the Academy
 * developers in Curitiba. It does not name him; that the app is his is his own
 * statement, which is what a personal site is for.
 */
export const press: PressItem[] = [
  { id: 'hubli',    outlet: 'Apple Newsroom', year: 2021,
    headline: 'Apple launches inaugural Entrepreneur Camp for Black Founders and Developers',
    url: 'https://www.apple.com/newsroom/2021/02/apple-launches-inaugural-entrepreneur-camp-for-black-founders-and-developers/' },
  { id: 'neonWave', outlet: 'MacMagazine',    year: 2020,
    headline: 'Alunos da Apple Developer Academy criam app para ajudar comunidades carentes durante a pandemia',
    url: 'https://macmagazine.com.br/post/2020/04/07/alunos-da-apple-developer-academy-criam-app-para-ajudar-comunidades-carentes-durante-a-pandemia/' },
];

/** How many of the six went through review, so the prose cannot drift from it. */
export const peerReviewedCount = publications.filter((p) => p.peerReviewed).length;

/** Convert [year, month] to a decimal year for positioning. */
export const toDecimal = ([y, m]: [number, number]) => y + (m - 1) / 12;
export const NOW: [number, number] = [2026, 9];

/**
 * The skill list, grouped the way a recruiter scans and an ATS parses.
 *
 * Every entry is either credited by a chapter on this site or verifiable in
 * this repository — the Terraform under infra/ is AWS with GitHub OIDC, the
 * site and its game models are TypeScript, the extractors are Python, and the
 * master's simulator on GitHub is MATLAB. Nothing here is aspirational.
 */
export interface SkillGroup { id: string; items: string[] }

export const skillGroups: SkillGroup[] = [
  { id: 'ios', items: [
    'Swift', 'SwiftUI', 'UIKit', 'visionOS', 'macOS', 'Swift Concurrency', 'async/await', 'actors', 'Combine',
    'MVVM', 'Coordinators', 'Clean Architecture', 'Dependency injection',
    'SwiftData', 'Core Data', 'URLSession', 'Swift Package Manager',
    'XCTest', 'XCUITest', 'Instruments', 'Xcode', 'App Store Connect', 'TestFlight',
    'VoiceOver', 'Dynamic Type', 'Localization', 'Push notifications', 'Deep linking',
  ] },
  { id: 'cross', items: [
    'Flutter', 'Dart', 'Riverpod', 'Bloc', 'Provider', 'Kotlin', 'Jetpack Compose', 'Android',
    'Platform channels', 'Offline-first', 'State management', 'Widget testing',
  ] },
  { id: 'release', items: [
    'fastlane', 'Xcode Cloud', 'GitHub Actions', 'CI/CD', 'App Store review', 'Phased release',
    'Firebase Crashlytics', 'Crash-free rate', 'Analytics', 'Feature flags', 'Semantic versioning',
  ] },
  { id: 'languages', items: [
    'Swift', 'Dart', 'Kotlin', 'Java', 'TypeScript', 'JavaScript', 'Python', 'C', 'C++', 'MATLAB', 'SQL',
  ] },
  { id: 'backend', items: [
    'Node.js', 'NestJS', 'Express', 'Java', 'REST APIs', 'WebSockets', 'Microservices',
    'OAuth 2.0', 'JWT', 'API versioning',
    'Distributed systems', 'System design', 'Event-driven architecture', 'API design',
  ] },
  { id: 'data', items: [
    'MongoDB', 'PostgreSQL', 'Redis', 'BullMQ', 'Database design', 'Indexing and query planning',
    'Time series', 'Data pipelines',
  ] },
  { id: 'cloud', items: [
    'AWS', 'Amazon S3', 'CloudFront', 'Route 53', 'AWS IoT Core', 'IAM', 'EC2',
    'Docker', 'Kubernetes', 'Terraform', 'Infrastructure as Code', 'GitHub Actions',
    'CI/CD', 'OIDC', 'Observability', 'Scalability', 'Linux',
  ] },
  { id: 'frontend', items: [
    'Astro', 'HTML', 'CSS', 'Accessibility', 'Design systems', 'Responsive layout',
  ] },
  { id: 'ai', items: [
    'Machine learning', 'PyTorch', 'TensorFlow', 'Keras', 'GANs', 'LSTM', 'Deep learning',
    'Feature selection', 'PCA', 'XGBoost', 'Gaussian Splatting', '3DGS', 'CUDA',
    'Photogrammetry', 'Computer vision',
  ] },
  { id: 'embedded', items: [
    'Embedded C', 'ESP32', 'PIC18F4550', 'ATmega', 'PWM', 'ADC', 'MQTT', 'IoT',
    'PCB design', 'EAGLE', 'Altium', 'SolidWorks', 'CAD', '3D printing', 'Design for manufacturing',
  ] },
  { id: 'ways', items: [
    'Git', 'Code review', 'Unit testing', 'Technical leadership', 'Mentoring',
    'Product engineering', 'Backtesting', 'Paper trading',
  ] },
];

/** Flat, de-duplicated, for schema.org and the CV. */
export const allSkills = [...new Set(skillGroups.flatMap((g) => g.items))];
