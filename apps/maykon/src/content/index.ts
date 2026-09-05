import type { Content, Locale } from './types';
import { en } from './en';
import { pt } from './pt';
import { es } from './es';

export const content: Record<Locale, Content> = { en, pt, es };
export const locales: Locale[] = ['en', 'pt', 'es'];
export const localeNames: Record<Locale, string> = { en: 'EN', pt: 'PT', es: 'ES' };

/** Path prefix for a locale — English lives at the root. */
export const prefix = (l: Locale) => (l === 'en' ? '' : `/${l}`);

export type { Content, Chapter, Locale } from './types';
