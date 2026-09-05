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
  ui: Record<string, string>;
}
