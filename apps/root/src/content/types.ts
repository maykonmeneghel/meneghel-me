export type Locale = 'en' | 'pt' | 'es';

export interface Person {
  slug: string;
  name: string;
  role: string;
  /** The one thing this person handed down. */
  gift: string;
  href?: string;
}

export interface RootContent {
  meta: { title: string; description: string };
  hero: { surname: string; motto: string; intro: string; scroll: string };
  origin: { eyebrow: string; title: string; body: string[] };
  roots: { eyebrow: string; title: string; lede: string; people: Person[] };
  now: { eyebrow: string; title: string; lede: string; people: Person[] };
  values: { eyebrow: string; title: string; items: { k: string; v: string }[] };
  doors: { eyebrow: string; title: string; lede: string; soon: string };
  footer: string;
}
